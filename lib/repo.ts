/* Data access. Two implementations behind one interface:
   - SupabaseRepo: the real thing (RLS-scoped tables, realtime invalidation)
   - DemoRepo: in-memory + localStorage, same business rules, used for the demo mode and screenshots */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity, Company, Contact, Driver, Invite, Membership, Notification, Profile, Role, Schedule, SearchHit, Snapshot, Task, TaskType, Vehicle, Workspace, WorkspaceDefaults } from "./types";
import { TASK_META } from "./types";
import { addDays, dateOf, isoDate, reminderTimes, toTS, todayISO } from "./date";

export type NewTask = Omit<Task, "id" | "workspace_id" | "status" | "created_at" | "updated_at" | "done_at" | "done_by" | "created_by">;

export interface Repo {
  readonly mode: "supabase" | "demo";
  load(): Promise<Snapshot>;
  subscribe(onChange: () => void): () => void;
  company: { create(d: Partial<Company> & { name: string }): Promise<Company>; update(id: string, p: Partial<Company>): Promise<void>; remove(id: string): Promise<void> };
  contact: { create(d: Partial<Contact> & { company_id: string; name: string }): Promise<Contact>; update(id: string, p: Partial<Contact>): Promise<void>; remove(id: string): Promise<void> };
  vehicle: { create(d: Partial<Vehicle> & { company_id: string; plate: string }): Promise<Vehicle>; update(id: string, p: Partial<Vehicle>): Promise<void>; remove(id: string): Promise<void> };
  driver: { create(d: Partial<Driver> & { company_id: string; name: string }): Promise<Driver>; update(id: string, p: Partial<Driver>): Promise<void>; remove(id: string): Promise<void> };
  task: {
    create(d: NewTask, opts?: { recurring?: boolean }): Promise<Task>;
    update(id: string, p: Partial<Task>): Promise<void>;
    remove(id: string): Promise<void>;
    complete(id: string, doneDate?: string): Promise<void>;
    reopen(id: string): Promise<void>;
    snooze(id: string, days: number): Promise<void>;
  };
  notification: { markOpened(id: string): Promise<void>; markAllOpened(): Promise<void> };
  workspace: { update(p: Partial<Workspace>): Promise<void>; invite(email: string, role: Role): Promise<Invite>; revokeInvite(id: string): Promise<void>; removeMember(userId: string): Promise<void>; setRole(userId: string, role: Role): Promise<void> };
  profile: { update(p: Partial<Profile>): Promise<void> };
  search(q: string): Promise<SearchHit[]>;
  activity(limit?: number, entityId?: string): Promise<Activity[]>;
  importRows(rows: ImportRow[]): Promise<{ companies: number; vehicles: number; drivers: number; tasks: number }>;
}

export interface ImportRow { company: string; taxId?: string; plate?: string; driver?: string; lastVu?: string; lastCard?: string; phone?: string; }

/* ---------------- shared business helpers ---------------- */
export function computeDue(type: TaskType, baseISO: string, defaults: WorkspaceDefaults): string {
  const key = TASK_META[type].cycleKey; const days = key ? (defaults[key] as number) : 0; return addDays(baseISO, days);
}
export function defaultReminders(dueISO: string, defaults: WorkspaceDefaults, type: TaskType): string[] {
  if (type === "training") {
    return (defaults.trainingTimes || ["-1T16:00", "0T06:00"]).map(s => { const [d, t] = s.split("T"); return toTS(addDays(dueISO, Number(d)), t); }).filter(ts => new Date(ts).getTime() > Date.now() - 3600_000);
  }
  return reminderTimes(dueISO, defaults.remindDaysBefore || [7, 1, 0], defaults.remindTime || "08:00");
}

/* ---------------- Supabase ---------------- */
export class SupabaseRepo implements Repo {
  readonly mode = "supabase" as const;
  constructor(private sb: SupabaseClient, private wsId: string, private userId: string) {}
  private ws = () => ({ workspace_id: this.wsId });

  async load(): Promise<Snapshot> {
    const sb = this.sb, ws = this.wsId;
    const [w, m, p, c, ct, v, d, s, t, n, i] = await Promise.all([
      sb.from("workspaces").select("*").eq("id", ws).single(),
      sb.from("memberships").select("*").eq("workspace_id", ws),
      sb.from("profiles").select("*").eq("user_id", this.userId).maybeSingle(),
      sb.from("companies").select("*").eq("workspace_id", ws).order("name"),
      sb.from("contacts").select("*").eq("workspace_id", ws),
      sb.from("vehicles").select("*").eq("workspace_id", ws).order("plate"),
      sb.from("drivers").select("*").eq("workspace_id", ws).order("name"),
      sb.from("schedules").select("*").eq("workspace_id", ws),
      sb.from("tasks").select("*").eq("workspace_id", ws).order("due_at"),
      sb.from("notifications").select("*").eq("workspace_id", ws).eq("channel", "inapp").lte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: false }).limit(200),
      sb.from("invites").select("*").eq("workspace_id", ws).is("accepted_at", null),
    ]);
    const first = [w, m, c, ct, v, d, s, t, n, i].find(r => r.error); if (first?.error) throw first.error;
    const members = (m.data || []) as Membership[];
    const role = (members.find(x => x.user_id === this.userId)?.role || "viewer") as Role;
    const profile: Profile = (p.data as Profile) || { user_id: this.userId, theme: "system", notif_prefs: { push: true, email: true, sms: false, weeklyDigest: true, dailyDigest: true } };
    return { workspace: w.data as Workspace, role, profile, members, invites: (i.data || []) as Invite[],
      companies: c.data as Company[], contacts: ct.data as Contact[], vehicles: v.data as Vehicle[], drivers: d.data as Driver[], schedules: s.data as Schedule[], tasks: t.data as Task[], notifications: n.data as Notification[] };
  }
  subscribe(onChange: () => void) {
    const ch = this.sb.channel("ws-" + this.wsId);
    for (const t of ["companies", "contacts", "vehicles", "drivers", "schedules", "tasks", "notifications"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t, filter: `workspace_id=eq.${this.wsId}` }, () => onChange());
    }
    ch.subscribe();
    return () => { this.sb.removeChannel(ch); };
  }
  private async ins<T>(table: string, row: Record<string, unknown>): Promise<T> { const { data, error } = await this.sb.from(table).insert({ ...row, ...this.ws() }).select("*").single(); if (error) throw error; return data as T; }
  private async upd(table: string, id: string, p: Record<string, unknown>) { const { error } = await this.sb.from(table).update(p).eq("id", id); if (error) throw error; }
  private async del(table: string, id: string) { const { error } = await this.sb.from(table).delete().eq("id", id); if (error) throw error; }

  company = { create: (d: Partial<Company> & { name: string }) => this.ins<Company>("companies", d), update: (id: string, p: Partial<Company>) => this.upd("companies", id, p), remove: (id: string) => this.del("companies", id) };
  contact = { create: (d: Partial<Contact> & { company_id: string; name: string }) => this.ins<Contact>("contacts", d), update: (id: string, p: Partial<Contact>) => this.upd("contacts", id, p), remove: (id: string) => this.del("contacts", id) };
  vehicle = { create: (d: Partial<Vehicle> & { company_id: string; plate: string }) => this.ins<Vehicle>("vehicles", d), update: (id: string, p: Partial<Vehicle>) => this.upd("vehicles", id, p), remove: (id: string) => this.del("vehicles", id) };
  driver = { create: (d: Partial<Driver> & { company_id: string; name: string }) => this.ins<Driver>("drivers", d), update: (id: string, p: Partial<Driver>) => this.upd("drivers", id, p), remove: (id: string) => this.del("drivers", id) };
  task = {
    create: async (d: NewTask, opts?: { recurring?: boolean }) => {
      let schedule_id = d.schedule_id || null;
      if (opts?.recurring && TASK_META[d.type].cycleKey) {
        // reuse an existing schedule for the same subject/type, else create one
        const q = this.sb.from("schedules").select("id").eq("workspace_id", this.wsId).eq("type", d.type).eq("active", true);
        const { data: ex } = await (d.vehicle_id ? q.eq("vehicle_id", d.vehicle_id) : q.eq("driver_id", d.driver_id!)).maybeSingle();
        if (ex) schedule_id = ex.id; else {
          const cyc = Math.max(1, Math.round((new Date(d.due_at).getTime() - new Date(d.base_date || todayISO()).getTime()) / 86400000));
          const s = await this.ins<Schedule>("schedules", { type: d.type, vehicle_id: d.vehicle_id || null, driver_id: d.driver_id || null, cycle_days: cyc });
          schedule_id = s.id;
        }
      }
      return this.ins<Task>("tasks", { ...d, schedule_id, created_by: this.userId });
    },
    update: (id: string, p: Partial<Task>) => this.upd("tasks", id, p),
    remove: (id: string) => this.del("tasks", id),
    complete: (id: string, doneDate?: string) => this.upd("tasks", id, { status: "done", done_at: doneDate ? toTS(doneDate, "12:00") : new Date().toISOString(), done_by: this.userId }),
    reopen: (id: string) => this.upd("tasks", id, { status: "open", done_at: null, done_by: null }),
    snooze: async (id: string, days: number) => {
      const { data } = await this.sb.from("tasks").select("remind_at,due_at,workspace_id").eq("id", id).single(); if (!data) return;
      const next = addDays(todayISO(), days);
      const rem = [toTS(next, "08:00"), ...((data.remind_at as string[]) || []).filter(r => new Date(r).getTime() > Date.now() && dateOf(r) > next)];
      await this.upd("tasks", id, { remind_at: rem });
    },
  };
  notification = {
    markOpened: (id: string) => this.upd("notifications", id, { status: "opened", opened_at: new Date().toISOString() }),
    markAllOpened: async () => { const { error } = await this.sb.from("notifications").update({ status: "opened", opened_at: new Date().toISOString() }).eq("workspace_id", this.wsId).eq("channel", "inapp").neq("status", "opened").lte("scheduled_at", new Date().toISOString()); if (error) throw error; },
  };
  workspace = {
    update: (p: Partial<Workspace>) => this.upd("workspaces", this.wsId, p),
    invite: async (email: string, role: Role) => { const inv = await this.ins<Invite>("invites", { email: email.trim().toLowerCase(), role, created_by: this.userId }); fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inv.id }) }).catch(() => {}); return inv; },
    revokeInvite: (id: string) => this.del("invites", id),
    removeMember: async (userId: string) => { const { error } = await this.sb.from("memberships").delete().eq("workspace_id", this.wsId).eq("user_id", userId); if (error) throw error; },
    setRole: async (userId: string, role: Role) => { const { error } = await this.sb.from("memberships").update({ role }).eq("workspace_id", this.wsId).eq("user_id", userId); if (error) throw error; },
  };
  profile = { update: async (p: Partial<Profile>) => { const { error } = await this.sb.from("profiles").upsert({ user_id: this.userId, ...p }, { onConflict: "user_id" }); if (error) throw error; } };
  async search(q: string) { const { data, error } = await this.sb.rpc("search_all", { ws: this.wsId, q }); if (error) throw error; return (data || []) as SearchHit[]; }
  async activity(limit = 100, entityId?: string) { let q = this.sb.from("activity_log").select("*").eq("workspace_id", this.wsId).order("created_at", { ascending: false }).limit(limit); if (entityId) q = q.eq("entity_id", entityId); const { data, error } = await q; if (error) throw error; return (data || []) as Activity[]; }
  async importRows(rows: ImportRow[]) { return importGeneric(this, rows); }
}

/* ---------------- Demo (local) ---------------- */
const LS = "benade.demo.v3";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const nowIso = () => new Date().toISOString();

export class DemoRepo implements Repo {
  readonly mode = "demo" as const;
  private s: Snapshot;
  private listeners = new Set<() => void>();
  constructor() { this.s = this.loadLocal() || demoSeed(); this.save(); }
  private loadLocal(): Snapshot | null { try { const raw = typeof localStorage !== "undefined" && localStorage.getItem(LS); return raw ? JSON.parse(raw) : null; } catch { return null; } }
  private save() { try { localStorage.setItem(LS, JSON.stringify(this.s)); } catch {} this.listeners.forEach(l => l()); }
  reset() { this.s = demoSeed(); this.save(); }
  async load() { return structuredClone(this.s); }
  subscribe(cb: () => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  private rowBase() { return { id: uid(), workspace_id: this.s.workspace.id, created_at: nowIso(), updated_at: nowIso() }; }
  private log(entity: string, entity_id: string, action: string) { /* demo: no audit persisted beyond a short list */ this.act.unshift({ id: Date.now(), workspace_id: this.s.workspace.id, user_id: "demo", entity, entity_id, action, created_at: nowIso() }); this.act = this.act.slice(0, 200); }
  private act: Activity[] = [];

  company = {
    create: async (d: Partial<Company> & { name: string }) => { const c = { ...this.rowBase(), tags: [], ...d } as Company; this.s.companies.push(c); this.log("companies", c.id, "insert"); this.save(); return c; },
    update: async (id: string, p: Partial<Company>) => { Object.assign(this.s.companies.find(x => x.id === id)!, p, { updated_at: nowIso() }); this.log("companies", id, "update"); this.save(); },
    remove: async (id: string) => { this.s.companies = this.s.companies.filter(x => x.id !== id); this.s.vehicles = this.s.vehicles.filter(x => x.company_id !== id); this.s.drivers = this.s.drivers.filter(x => x.company_id !== id); this.s.tasks = this.s.tasks.filter(x => x.company_id !== id); this.s.contacts = this.s.contacts.filter(x => x.company_id !== id); this.save(); },
  };
  contact = {
    create: async (d: Partial<Contact> & { company_id: string; name: string }) => { const c = { ...this.rowBase(), is_primary: false, ...d } as Contact; this.s.contacts.push(c); this.save(); return c; },
    update: async (id: string, p: Partial<Contact>) => { Object.assign(this.s.contacts.find(x => x.id === id)!, p); this.save(); },
    remove: async (id: string) => { this.s.contacts = this.s.contacts.filter(x => x.id !== id); this.save(); },
  };
  vehicle = {
    create: async (d: Partial<Vehicle> & { company_id: string; plate: string }) => { const v = { ...this.rowBase(), ...d } as Vehicle; this.s.vehicles.push(v); this.log("vehicles", v.id, "insert"); this.save(); return v; },
    update: async (id: string, p: Partial<Vehicle>) => { Object.assign(this.s.vehicles.find(x => x.id === id)!, p, { updated_at: nowIso() }); this.save(); },
    remove: async (id: string) => { this.s.vehicles = this.s.vehicles.filter(x => x.id !== id); this.s.tasks = this.s.tasks.filter(x => x.vehicle_id !== id); this.save(); },
  };
  driver = {
    create: async (d: Partial<Driver> & { company_id: string; name: string }) => { const v = { ...this.rowBase(), ...d } as Driver; this.s.drivers.push(v); this.log("drivers", v.id, "insert"); this.save(); return v; },
    update: async (id: string, p: Partial<Driver>) => { Object.assign(this.s.drivers.find(x => x.id === id)!, p, { updated_at: nowIso() }); this.save(); },
    remove: async (id: string) => { this.s.drivers = this.s.drivers.filter(x => x.id !== id); this.s.tasks = this.s.tasks.filter(x => x.driver_id !== id); this.save(); },
  };
  private scheduleNotifs(t: Task) {
    this.s.notifications = this.s.notifications.filter(n => n.task_id !== t.id || n.status === "opened");
    if (t.status !== "open") return;
    const title = TASK_META[t.type].name; const subj = taskSubject(this.s, t);
    for (const r of t.remind_at) this.s.notifications.push({ id: uid(), workspace_id: t.workspace_id, task_id: t.id, channel: "inapp", scheduled_at: r, status: "scheduled", title, body: subj, created_at: nowIso() });
  }
  task = {
    create: async (d: NewTask, opts?: { recurring?: boolean }) => {
      let schedule_id = d.schedule_id || null;
      if (opts?.recurring && TASK_META[d.type].cycleKey) {
        const ex = this.s.schedules.find(s => s.type === d.type && s.active && (d.vehicle_id ? s.vehicle_id === d.vehicle_id : s.driver_id === d.driver_id));
        if (ex) schedule_id = ex.id; else { const cyc = Math.max(1, Math.round((new Date(d.due_at).getTime() - new Date(d.base_date || todayISO()).getTime()) / 86400000)); const s: Schedule = { id: uid(), workspace_id: this.s.workspace.id, type: d.type, vehicle_id: d.vehicle_id || null, driver_id: d.driver_id || null, cycle_days: cyc, active: true, created_at: nowIso() }; this.s.schedules.push(s); schedule_id = s.id; }
      }
      const t = { ...this.rowBase(), status: "open", ...d, schedule_id } as Task; this.s.tasks.push(t); this.scheduleNotifs(t); this.log("tasks", t.id, "insert"); this.save(); return t;
    },
    update: async (id: string, p: Partial<Task>) => { const t = this.s.tasks.find(x => x.id === id)!; Object.assign(t, p, { updated_at: nowIso() }); this.scheduleNotifs(t); this.log("tasks", id, "update"); this.save(); },
    remove: async (id: string) => { this.s.tasks = this.s.tasks.filter(x => x.id !== id); this.s.notifications = this.s.notifications.filter(n => n.task_id !== id); this.save(); },
    complete: async (id: string, doneDate?: string) => {
      const t = this.s.tasks.find(x => x.id === id)!; t.status = "done"; t.done_at = doneDate ? toTS(doneDate, "12:00") : nowIso(); t.done_by = "demo"; t.updated_at = nowIso(); this.scheduleNotifs(t); this.log("tasks", id, "done");
      const sch = t.schedule_id ? this.s.schedules.find(s => s.id === t.schedule_id && s.active) : null;
      if (sch && !this.s.tasks.some(x => x.schedule_id === sch.id && x.status === "open")) {
        const base = dateOf(t.done_at!); const due = addDays(base, sch.cycle_days);
        const n = { ...this.rowBase(), company_id: t.company_id, type: t.type, vehicle_id: t.vehicle_id, driver_id: t.driver_id, schedule_id: sch.id, base_date: base, due_at: toTS(due, "08:00"), all_day: false, remind_at: defaultReminders(due, this.s.workspace.defaults, t.type), status: "open" } as Task;
        this.s.tasks.push(n); this.scheduleNotifs(n);
      }
      this.save();
    },
    reopen: async (id: string) => { const t = this.s.tasks.find(x => x.id === id)!; t.status = "open"; t.done_at = null; this.scheduleNotifs(t); this.save(); },
    snooze: async (id: string, days: number) => { const t = this.s.tasks.find(x => x.id === id)!; const next = addDays(todayISO(), days); t.remind_at = [toTS(next, "08:00"), ...t.remind_at.filter(r => new Date(r).getTime() > Date.now() && dateOf(r) > next)]; this.scheduleNotifs(t); this.save(); },
  };
  notification = {
    markOpened: async (id: string) => { const n = this.s.notifications.find(x => x.id === id); if (n) { n.status = "opened"; n.opened_at = nowIso(); } this.save(); },
    markAllOpened: async () => { this.s.notifications.forEach(n => { if (new Date(n.scheduled_at).getTime() <= Date.now()) { n.status = "opened"; n.opened_at = nowIso(); } }); this.save(); },
  };
  workspace = {
    update: async (p: Partial<Workspace>) => { Object.assign(this.s.workspace, p); this.save(); },
    invite: async (email: string, role: Role) => { const inv: Invite = { id: uid(), workspace_id: this.s.workspace.id, email, role, token: uid(), created_at: nowIso() }; this.s.invites.push(inv); this.save(); return inv; },
    revokeInvite: async (id: string) => { this.s.invites = this.s.invites.filter(i => i.id !== id); this.save(); },
    removeMember: async (userId: string) => { this.s.members = this.s.members.filter(m => m.user_id !== userId); this.save(); },
    setRole: async (userId: string, role: Role) => { const m = this.s.members.find(m => m.user_id === userId); if (m) m.role = role; this.save(); },
  };
  profile = { update: async (p: Partial<Profile>) => { Object.assign(this.s.profile, p); this.save(); } };
  async search(q: string): Promise<SearchHit[]> {
    const Q = q.toLocaleLowerCase("hu"); const key = q.toUpperCase().replace(/[^A-Z0-9]/g, ""); const out: SearchHit[] = [];
    for (const c of this.s.companies) if (!c.archived_at && (c.name.toLocaleLowerCase("hu").includes(Q) || (c.tax_id || "").includes(Q))) out.push({ kind: "company", id: c.id, title: c.name, subtitle: c.tax_id || "", company_id: c.id });
    for (const v of this.s.vehicles) if (!v.archived_at && (v.plate.toLocaleLowerCase("hu").includes(Q) || (key && v.plate.replace(/[^A-Z0-9]/g, "").includes(key)))) out.push({ kind: "vehicle", id: v.id, title: v.plate, subtitle: companyNameOf(this.s, v.company_id), company_id: v.company_id });
    for (const d of this.s.drivers) if (!d.archived_at && d.name.toLocaleLowerCase("hu").includes(Q)) out.push({ kind: "driver", id: d.id, title: d.name, subtitle: companyNameOf(this.s, d.company_id), company_id: d.company_id });
    for (const t of this.s.tasks) if ((t.invoice_no || "").toLocaleLowerCase("hu").includes(Q) || (t.note || "").toLocaleLowerCase("hu").includes(Q) || (t.address || "").toLocaleLowerCase("hu").includes(Q)) out.push({ kind: "task", id: t.id, title: TASK_META[t.type].name, subtitle: taskSubject(this.s, t), company_id: t.company_id });
    return out.slice(0, 40);
  }
  async activity(limit = 100, entityId?: string) { return this.act.filter(a => !entityId || a.entity_id === entityId).slice(0, limit); }
  async importRows(rows: ImportRow[]) { return importGeneric(this, rows); }
}

/* ---------------- shared ---------------- */
export function companyNameOf(s: Snapshot, id: string) { return s.companies.find(c => c.id === id)?.name || "Ismeretlen cég"; }
export function taskSubject(s: Snapshot, t: Task): string {
  const c = companyNameOf(s, t.company_id);
  let sub = "";
  if (t.vehicle_id) sub = s.vehicles.find(v => v.id === t.vehicle_id)?.plate || "";
  if (t.driver_id) sub = s.drivers.find(d => d.id === t.driver_id)?.name || "";
  if (t.type === "invoice") sub = `${t.invoice_no || ""}${t.gross_amount != null ? " · " + Number(t.gross_amount).toLocaleString("hu-HU") + " Ft" : ""}`;
  if (t.type === "training") sub = t.address || "";
  return sub ? `${c} · ${sub}` : c;
}

async function importGeneric(repo: Repo, rows: ImportRow[]) {
  const snap = await repo.load(); const d = snap.workspace.defaults;
  const companies = new Map(snap.companies.map(c => [c.name.toLocaleLowerCase("hu"), c]));
  const vehicles = new Map(snap.vehicles.map(v => [v.plate.replace(/[^A-Z0-9]/g, ""), v]));
  const drivers = new Map(snap.drivers.map(x => [x.company_id + "|" + x.name.toLocaleLowerCase("hu"), x]));
  const n = { companies: 0, vehicles: 0, drivers: 0, tasks: 0 };
  for (const r of rows) {
    const name = (r.company || "").trim(); if (!name) continue;
    let c = companies.get(name.toLocaleLowerCase("hu"));
    if (!c) { c = await repo.company.create({ name, tax_id: r.taxId || null, phone: r.phone || null }); companies.set(name.toLocaleLowerCase("hu"), c); n.companies++; }
    if (r.plate) {
      const key = r.plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
      let v = vehicles.get(key);
      if (!v) { v = await repo.vehicle.create({ company_id: c.id, plate: r.plate }); vehicles.set(key, v); n.vehicles++; }
      if (r.lastVu) { const due = computeDue("vu_download", r.lastVu, d); await repo.task.create({ company_id: c.id, type: "vu_download", vehicle_id: v.id, driver_id: null, base_date: r.lastVu, due_at: toTS(due, "08:00"), all_day: false, remind_at: defaultReminders(due, d, "vu_download"), note: null }, { recurring: true }); n.tasks++; }
    }
    if (r.driver) {
      const k = c.id + "|" + r.driver.toLocaleLowerCase("hu");
      let dr = drivers.get(k);
      if (!dr) { dr = await repo.driver.create({ company_id: c.id, name: r.driver }); drivers.set(k, dr); n.drivers++; }
      if (r.lastCard) { const due = computeDue("card_download", r.lastCard, d); await repo.task.create({ company_id: c.id, type: "card_download", vehicle_id: null, driver_id: dr.id, base_date: r.lastCard, due_at: toTS(due, "08:00"), all_day: false, remind_at: defaultReminders(due, d, "card_download"), note: null }, { recurring: true }); n.tasks++; }
    }
  }
  return n;
}

/* ---------------- demo seed (tesztfiók: ~3 hónapnyi, valósághű adat) ---------------- */
export function demoSeed(): Snapshot {
  const wsId = "demo-ws"; const t = todayISO(); const now = nowIso();
  let seed = 4242; const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1)); const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const defaults: WorkspaceDefaults = { vuDays: 90, cardDays: 28, calibrationDays: 730, cardExpiryDays: 1825, invoiceDays: 30, remindDaysBefore: [7, 1, 0], remindTime: "08:00", trainingTimes: ["-1T16:00", "0T06:00"], quietFrom: "21:00", quietTo: "06:00", vatPercent: 27 };
  const workspace: Workspace = { id: wsId, name: "Sóti Tachográf Szerviz", phone: "+36 30 555 1234", email: "info@sotitacho.hu", address: "Budapest, Fő utca 1.", tax_id: "12345678-2-42", timezone: "Europe/Budapest", defaults, ics_token: "demo", created_at: now };
  const C: [string, string, string, string, string, string][] = [
    ["Horváth Trans Kft.", "12345678-2-13", "2600 Vác, Ipari park 4.", "Horváth Zoltán", "+36 30 211 4567", "kiemelt"],
    ["Duna Logisztika Zrt.", "23456789-2-41", "1239 Budapest, Grassalkovich út 112.", "Kiss Andrea", "+36 20 345 7788", ""],
    ["Alföld Fuvar Bt.", "34567890-1-03", "6000 Kecskemét, Halasi út 22.", "Szabó Gábor", "+36 70 556 1212", ""],
    ["Pannon Spedit Kft.", "45678901-2-18", "8200 Veszprém, Házgyári út 7.", "Tóth Mária", "+36 30 777 9901", "problémás fizető"],
    ["Kovács és Fia Szállítás", "56789012-1-15", "3300 Eger, Kistályai út 18.", "Kovács István", "+36 20 998 2233", ""],
    ["Tisza Cargo Kft.", "67890123-2-16", "6726 Szeged, Fő fasor 101.", "Nagy Péter", "+36 30 123 8899", "kiemelt"],
    ["Balaton Busz Kft.", "78901234-2-14", "8600 Siófok, Vak Bottyán u. 9.", "Varga Eszter", "+36 70 334 5566", ""],
    ["Mátra Transz Kft.", "89012345-2-10", "3200 Gyöngyös, Pesti út 65.", "Molnár Attila", "+36 20 445 6677", ""],
    ["Rába Fuvarozó Zrt.", "90123456-2-08", "9027 Győr, Budai út 3.", "Farkas Judit", "+36 30 889 0011", ""],
    ["Sárköz Agrár Kft.", "01234567-2-17", "7100 Szekszárd, Keselyűsi út 14.", "Papp László", "+36 70 222 3344", ""],
    ["Zemplén Expressz Bt.", "11223344-1-05", "3900 Szerencs, Rákóczi út 80.", "Lakatos Tibor", "+36 20 667 7788", ""],
    ["Fehérvár Food Logistic Kft.", "22334455-2-07", "8000 Székesfehérvár, Seregélyesi út 96.", "Balogh Nóra", "+36 30 456 7890", ""],
  ];
  const PL = ["KLM-204", "RTB-118", "HGF-771", "NJD-305", "PXA-942", "AA CD-114", "LKJ-558", "VBN-023", "AA FG-631", "TRW-410", "QSE-287", "AB CD-901", "MNB-662", "ZXC-349", "AA HJ-227", "PLK-806", "FDS-133", "AA KL-470", "GHT-595", "BNM-718", "AA MN-052", "JKL-364", "YUI-889", "AA PR-143", "CVB-511", "AA ST-608", "WER-276", "AA UV-390", "TYU-845", "OIP-137", "AA WX-724", "ASD-962", "AA YZ-281", "DFG-405", "AA BC-559", "HJK-093", "AA DE-816", "LZX-347", "AA FH-672", "CXZ-120"];
  const MK = ["Mercedes-Benz Actros", "MAN TGX", "Scania R450", "Volvo FH", "DAF XF", "Iveco S-Way", "Renault T", "Mercedes-Benz Atego", "MAN TGS", "Scania S500"];
  const DN = ["Kovács Béla", "Nagy Zoltán", "Szabó Ferenc", "Tóth Gábor", "Horváth János", "Varga Sándor", "Kiss László", "Molnár Péter", "Németh Attila", "Farkas Tamás", "Balogh Zsolt", "Papp Csaba", "Lakatos Gábor", "Juhász István", "Takács Norbert", "Mészáros Ádám", "Oláh Tibor", "Simon Krisztián", "Rácz Dániel", "Fekete Márton", "Szilágyi Imre", "Török Levente", "Fehér Balázs", "Balázs Róbert", "Gál Ákos", "Kis Bence", "Szűcs Viktor", "Kocsis Gergő", "Pintér Miklós", "Fodor Zoltán"];
  const TOP = ["Vezetési és pihenőidő szabályok (561/2006/EK)", "Digitális tachográf kezelése – kézi bejegyzés", "Okos tachográf 2. generáció – újdonságok", "Rakományrögzítés és ellenőrzés", "Éves szabályzati frissítés"];
  const NOTES = ["Telephelyen, reggel 7 előtt", "Sofőr hozza a szervizbe", "Szervizben lesz a jármű", null, null, null, null];
  const cos: Company[] = [], contacts: Contact[] = [], vehicles: Vehicle[] = [], drivers: Driver[] = [], schedules: Schedule[] = [], tasks: Task[] = [];
  let pi = 0, di = 0, n = 0; const id = (p: string) => `${p}${++n}`;
  const task = (o: Partial<Task> & Pick<Task, "company_id" | "type" | "due_at">): Task => ({ id: id("t"), workspace_id: wsId, vehicle_id: null, driver_id: null, all_day: false, remind_at: [], status: "open", created_at: now, updated_at: now, ...o });
  C.forEach(([name, tax, addr, contact, phone, tag], i) => {
    const cid = `c${i + 1}`; const created = toTS(addDays(t, -(95 - i * 2)), "09:00");
    cos.push({ id: cid, workspace_id: wsId, name, tax_id: tax, address: addr, phone, email: `info@${name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}.hu`, tags: tag ? [tag] : [], created_at: created, updated_at: created });
    contacts.push({ id: id("k"), workspace_id: wsId, company_id: cid, name: contact, phone, role: "ügyvezető", is_primary: true, created_at: created });
    for (let j = 0, nv = ri(2, 5); j < nv && pi < PL.length; j++) {
      const vid = id("v"); vehicles.push({ id: vid, workspace_id: wsId, company_id: cid, plate: PL[pi++], make: pick(MK), vu_type: pick(["Smart tachográf G2", "Smart tachográf G1", "Digitális tachográf"]), created_at: created, updated_at: created });
      const sid = id("s"); schedules.push({ id: sid, workspace_id: wsId, type: "vu_download", vehicle_id: vid, driver_id: null, cycle_days: 90, active: true, created_at: created });
      const base = addDays(t, -ri(0, 92)), due = addDays(base, 90);
      tasks.push(task({ company_id: cid, type: "vu_download", vehicle_id: vid, schedule_id: sid, base_date: addDays(base, -90), due_at: toTS(base, "08:00"), status: "done", done_at: toTS(base, `${ri(8, 15)}:${String(ri(0, 59)).padStart(2, "0")}`) }));
      tasks.push(task({ company_id: cid, type: "vu_download", vehicle_id: vid, schedule_id: sid, base_date: base, due_at: toTS(due, "08:00"), remind_at: reminderTimes(due, [7, 1, 0], "08:00"), note: pick(NOTES) }));
      if (rnd() < .3) { const sc = id("s"); schedules.push({ id: sc, workspace_id: wsId, type: "calibration", vehicle_id: vid, driver_id: null, cycle_days: 730, active: true, created_at: created }); const dd = addDays(t, ri(20, 400)); tasks.push(task({ company_id: cid, type: "calibration", vehicle_id: vid, schedule_id: sc, base_date: addDays(dd, -730), due_at: toTS(dd, "09:00"), remind_at: reminderTimes(dd, [14, 1], "08:00") })); }
    }
    for (let j = 0, nd = ri(1, 4); j < nd && di < DN.length; j++) {
      const did = id("d"); drivers.push({ id: did, workspace_id: wsId, company_id: cid, name: DN[di++], card_number: `HUN${String(ri(100000000, 999999999)).padStart(12, "0")}0${String(di).padStart(2, "0")}`, phone: `+36 ${pick(["20", "30", "70"])} ${ri(100, 999)} ${String(ri(0, 9999)).padStart(4, "0")}`, created_at: created, updated_at: created });
      const sid = id("s"); schedules.push({ id: sid, workspace_id: wsId, type: "card_download", vehicle_id: null, driver_id: did, cycle_days: 28, active: true, created_at: created });
      let base = addDays(t, -ri(84, 90));
      for (let k = 0; k < 3; k++) { const due = addDays(base, 28); tasks.push(task({ company_id: cid, type: "card_download", driver_id: did, schedule_id: sid, base_date: base, due_at: toTS(due, "08:00"), status: "done", done_at: toTS(addDays(due, -ri(0, 2)), `${ri(8, 16)}:${String(ri(0, 59)).padStart(2, "0")}`) })); base = addDays(due, -ri(0, 2)); }
      const due = addDays(base, 28); tasks.push(task({ company_id: cid, type: "card_download", driver_id: did, schedule_id: sid, base_date: base, due_at: toTS(due, "08:00"), remind_at: reminderTimes(due, [7, 1, 0], "08:00") }));
      if (rnd() < .25) { const dd = addDays(t, ri(10, 300)); tasks.push(task({ company_id: cid, type: "card_expiry", driver_id: did, base_date: addDays(dd, -1825), due_at: toTS(dd, "00:00"), all_day: true, remind_at: reminderTimes(dd, [30, 7], "08:00") })); }
    }
    if ([0, 2, 5, 8, 11].includes(i)) { const dd = addDays(t, -ri(10, 80)); tasks.push(task({ company_id: cid, type: "training", due_at: toTS(dd, "10:00"), status: "done", done_at: toTS(dd, "12:30"), address: addr, contact_name: contact, contact_phone: phone, participants: ri(4, 15), topic: pick(TOP) })); }
    if ([1, 3, 6, 9].includes(i)) { const dd = addDays(t, ri(3, 40)); tasks.push(task({ company_id: cid, type: "training", due_at: toTS(dd, i === 3 ? "09:00" : "10:00"), remind_at: defaultReminders(dd, defaults, "training"), address: addr, contact_name: contact, contact_phone: phone, participants: ri(5, 14), topic: pick(TOP), note: i === 6 ? "Parkolás a hátsó udvarban. Projektor van, laptop kell." : null })); }
    for (let k = 0, ni = ri(1, 3); k < ni; k++) {
      let issue = addDays(t, -ri(5, 89)), gross = pick([18500, 24900, 35700, 42000, 58900, 67500, 89000, 124000, 156000, 228000]);
      let due = addDays(issue, 30); let paid: string | null = due < addDays(t, -3) && (rnd() < .8 || due < addDays(t, -20)) ? addDays(due, -ri(0, 19)) : null;
      if (i === 3 && k === 0) { due = addDays(t, -23); issue = addDays(due, -30); gross = 128000; paid = null; }
      if (i === 0 && k === 0) { due = t; issue = addDays(t, -30); paid = null; }
      if (i === 5 && k === 0) { due = addDays(t, 2); issue = addDays(t, -28); paid = null; }
      tasks.push(task({ company_id: cid, type: "invoice", issue_date: issue, base_date: issue, due_at: toTS(due, "00:00"), all_day: true, remind_at: paid ? [] : reminderTimes(due, [0], "08:00"), status: paid ? "done" : "open", done_at: paid ? toTS(paid, "09:00") : null, invoice_no: `2026/${String(100 + ((i * 7 + k * 3) % 80)).padStart(3, "0")}`, net_amount: Math.round(gross / 1.27), vat_percent: 27, gross_amount: gross, paid_at: paid }));
    }
  });
  const snap: Snapshot = { workspace, role: "owner", profile: { user_id: "demo", full_name: "Tesztfiók", theme: "system", notif_prefs: { push: true, email: true, sms: false, weeklyDigest: true, dailyDigest: true } }, companies: cos, contacts, vehicles, drivers, schedules, tasks, notifications: [], members: [{ workspace_id: wsId, user_id: "demo", role: "owner", created_at: now, email: "teszt@benade.hu", full_name: "Tesztfiók" }], invites: [] };
  snap.notifications = tasks.filter(x => x.status === "open").flatMap(x => x.remind_at.filter(r => new Date(r).getTime() <= Date.now()).map(r => ({ id: uid(), workspace_id: wsId, task_id: x.id, channel: "inapp" as const, scheduled_at: r, status: "sent", title: TASK_META[x.type].name, body: taskSubject(snap, x), created_at: now })));
  return snap;
}
