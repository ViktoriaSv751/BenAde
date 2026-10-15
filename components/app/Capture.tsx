"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Company, Task, TaskType } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import { addDays, dateOf, fmtDate, relLabel, timeOf, toTS, todayISO } from "@/lib/date";
import { companyName, fmtFt, plateFmt, titleCase } from "@/lib/format";
import { computeDue, defaultReminders, type NewTask } from "@/lib/repo";
import { useData, useMutate } from "@/lib/data";
import { Field, Icon, Panel, Switch, TypeIcon, useConfirm } from "@/components/ui";
import { DateField, TimeField, fmtDateDay, isWeekendOrHoliday, prevWorkingDay, workdayShift } from "@/components/DateTime";
import { useShell, useUrlState } from "./Shell";

type Kind = TaskType | "company" | "vehicle" | "driver" | "menu";
const KINDS: { k: Kind; label: string; desc: string; cls: string; icon: React.ReactNode }[] = [
  { k: "vu_download", label: "Fedélzeti egység", desc: "Letöltés rögzítése · +90 nap", cls: "t-vu", icon: Icon.truck(22) },
  { k: "card_download", label: "Vezetői kártya", desc: "Letöltés rögzítése · +28 nap", cls: "t-card", icon: Icon.card(22) },
  { k: "training", label: "Oktatás", desc: "Helyszín, kapcsolattartó, időpont", cls: "t-training", icon: Icon.grad(22) },
  { k: "invoice", label: "Számla", desc: "Fizetési határidő · +30 nap", cls: "t-invoice", icon: Icon.invoice(22) },
  { k: "calibration", label: "Kalibráció", desc: "Tachográf illesztés · 2 év", cls: "t-cal", icon: Icon.gauge(22) },
  { k: "card_expiry", label: "Kártya lejárat", desc: "Vezetői kártya · 5 év", cls: "t-exp", icon: Icon.idcard(22) },
  { k: "company", label: "Új cég", desc: "Ügyfél az adatbankba", cls: "t-cal", icon: Icon.users(22) },
  { k: "vehicle", label: "Új jármű", desc: "Rendszám egy céghez", cls: "t-vu", icon: Icon.truck(22) },
  { k: "driver", label: "Új gépkocsivezető", desc: "Gépkocsivezető egy céghez", cls: "t-card", icon: Icon.user(22) },
];

export function CapturePanel({ open, type, onClose }: { open: boolean; type?: string; onClose: () => void }) {
  const { set, get } = useUrlState(); const { layout } = useShell(); const loaded = !!useData();
  const kind = (type || "menu") as Kind; const editId = get("edit");
  const title = kind === "menu" ? "Új rögzítés" : editId ? "Szerkesztés" : KINDS.find(k => k.k === kind)?.label || "Rögzítés";
  return (
    <Panel open={open} onClose={onClose} title={title} wide={layout !== "phone"} back={kind !== "menu" && !editId ? () => set({ uj: "menu" }) : undefined}>
      {!loaded ? <div className="cap-loading" aria-busy="true"><span /><span /><span /></div> : kind === "menu" ? <Menu onPick={k => set({ uj: k })} /> : kind === "company" ? <CompanyForm onDone={onClose} /> : kind === "vehicle" ? <VehicleForm onDone={onClose} /> : kind === "driver" ? <DriverForm onDone={onClose} /> : <TaskForm key={`${kind}:${editId || ""}`} type={kind as TaskType} editId={editId} onDone={onClose} />}
    </Panel>
  );
}

function Menu({ onPick }: { onPick: (k: Kind) => void }) {
  const data = useData()!; const { layout } = useShell(); const d = data.workspace.defaults;
  const today = todayISO();
  const stat = (t: TaskType) => { const open = data.tasks.filter(x => x.type === t && x.status === "open"); return { open: open.length, over: open.filter(x => x.due_at.slice(0, 10) < today).length }; };
  const cycle: Partial<Record<Kind, string>> = { vu_download: `+${d.vuDays ?? 90} nap`, card_download: `+${d.cardDays ?? 28} nap`, training: "06:00", invoice: `+${d.invoiceDays ?? 30} nap`, calibration: "2 év", card_expiry: "5 év" };
  const sub: Partial<Record<Kind, string>> = { vu_download: "Letöltés rögzítése", card_download: "Letöltés rögzítése", training: "Értesítés a napján", invoice: "Fizetési határidő" };
  const hero = KINDS.slice(0, 4), more = KINDS.slice(4, 6), bank = KINDS.slice(6);
  const counts: Record<string, number> = { company: data.companies.filter(c => !c.archived_at).length, vehicle: data.vehicles.filter(v => !v.archived_at).length, driver: data.drivers.filter(x => !x.archived_at).length };
  // 1–9 keyboard shortcuts on desktop
  useEffect(() => { if (layout === "phone") return; const all = [...hero, ...more, ...bank]; const k = (e: KeyboardEvent) => { const tag = (e.target as HTMLElement)?.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey) return; const n = Number(e.key); if (n >= 1 && n <= all.length) { e.preventDefault(); onPick(all[n - 1].k); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }); // eslint-disable-line react-hooks/exhaustive-deps
  const desk = layout !== "phone";
  return <div className="cm">
    <header className="cm-head">
      <span className="cm-eyebrow">{fmtDateDay(today)}</span>
      <h2 className="cm-title">Mit <em>rögzítünk</em>?</h2>
    </header>
    <div className="cm-hero">{hero.map((k, i) => { const st = stat(k.k as TaskType); return (
      <button key={k.k} type="button" className={`cm-card ${k.cls}`} onClick={() => onPick(k.k)} style={{ animationDelay: `${i * 45}ms` }}>
        <span className="cm-glow" aria-hidden />
        <span className="cm-top"><span className="cm-ico">{k.icon}</span><span className="cm-cycle">{cycle[k.k]}</span></span>
        <span className="cm-name">{k.label}</span>
        <span className="cm-sub">{sub[k.k]}</span>
        <span className="cm-foot">{st.open > 0 ? <><span className="cm-dot" />{st.open} nyitott{st.over > 0 && <b> · {st.over} lejárt</b>}</> : <span className="cm-muted">Nincs nyitott tétel</span>}{desk && <kbd>{i + 1}</kbd>}</span>
      </button>); })}</div>
    <div className="cm-label">További határidők</div>
    <div className="cm-pair">{more.map((k, i) => <button key={k.k} type="button" className={`cm-row ${k.cls}`} onClick={() => onPick(k.k)}>
      <span className="cm-rico">{k.icon}</span><span className="cm-rt"><b>{k.label}</b><small>{k.desc.split(" · ")[0]}</small></span><span className="cm-pill">{cycle[k.k]}</span>{desk && <kbd>{i + 5}</kbd>}</button>)}</div>
    <div className="cm-label">Adatbank</div>
    <div className="cm-list">{bank.map((k, i) => <button key={k.k} type="button" className="cm-li" onClick={() => onPick(k.k)}>
      <span className="cm-lico">{k.icon}</span><span className="cm-rt"><b>{k.label}</b><small>{k.desc}</small></span><span className="cm-count">{counts[k.k]}</span>{desk ? <kbd>{i + 7}</kbd> : <span className="cm-chev">{Icon.chev(18)}</span>}</button>)}</div>
    {desk && <div className="cm-keys"><span><kbd>1</kbd>–<kbd>9</kbd> gyors választás</span><span><kbd>N</kbd> új rögzítés</span><span><kbd>Esc</kbd> bezárás</span></div>}
  </div>;
}

/* ---------- small helpers ---------- */
const norm = (s: string) => String(s || "").toLocaleLowerCase("hu-HU").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
/** Capitalise word starts while typing, without trimming (so spaces can be typed). */
const liveTitle = (s: string) => s.replace(/(^|[\s-])([a-záéíóöőúüű])/g, (_m, a: string, b: string) => a + b.toLocaleUpperCase("hu-HU"));
const livePlate = (s: string) => { const p = plateFmt(s); return /\s$/.test(s) && p && !p.endsWith(" ") ? p + " " : p; };
/** 12345678-2-42 while typing (EU VAT numbers starting with letters are left alone). */
export function taxLive(raw: string): string {
  if (/^\s*[A-Za-z]/.test(raw)) return raw.toUpperCase().replace(/\s+/g, "");
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 8) return d; if (d.length === 9) return `${d.slice(0, 8)}-${d[8]}`; return `${d.slice(0, 8)}-${d[8]}-${d.slice(9)}`;
}
/** +36 30 123 4567 / +36 1 234 5678 / +36 22 123 456 while typing; other input is left as typed. */
export function phoneLive(raw: string): string {
  const t = raw.replace(/^\s+/, ""); if (!t) return "";
  let d = t.replace(/\D/g, "");
  if (t.startsWith("+")) { if (!d.startsWith("36")) return t; }
  else if (d.startsWith("06")) d = "36" + d.slice(2);
  else if (!d.startsWith("36")) return t;
  let n = d.slice(2); if (!n) return "+36";
  const areaLen = n[0] === "1" ? 1 : 2; const mobile = /^(20|30|31|50|70)/.test(n);
  n = n.slice(0, areaLen + (areaLen === 1 || mobile ? 7 : 6));
  const area = n.slice(0, areaLen), rest = n.slice(areaLen);
  const g1 = rest.slice(0, 3), g2 = rest.slice(3);
  return ["+36", area, g1, g2].filter(Boolean).join(" ");
}
const digitsGroup = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

async function haptic() {
  try {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (w.Capacitor?.isNativePlatform?.()) { const m = await import("@capacitor/haptics"); await m.Haptics.notification({ type: m.NotificationType.Success }); return; }
    navigator.vibrate?.(20);
  } catch { /* no haptics */ }
}

/** Default "Mikor szóljunk?": 7 days before due at the reminder time, never in the past, never after the due day. */
function defaultRemind(due: string, time: string): { d: string; t: string } {
  const today = todayISO(); let d = addDays(due, -7); if (d < today) d = today; if (d > due && due >= today) d = due;
  if (new Date(toTS(d, time)).getTime() > Date.now() + 60_000) return { d, t: time };
  const tm = addDays(today, 1); if (tm <= due) return { d: tm, t: time };
  const n = new Date(Date.now() + 10 * 60_000); let hh = n.getHours(), mm = Math.ceil(n.getMinutes() / 5) * 5; if (mm === 60) { hh++; mm = 0; }
  if (hh > 23) return { d: tm, t: time };
  return { d: today, t: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` };
}

function WorkdayNote({ iso, what, onFix }: { iso: string; what: "due" | "rem"; onFix?: (prev: string) => void }) {
  const s = iso ? workdayShift(iso) : null; if (!s) return null;
  const fixable = !!onFix && s.prev >= todayISO();
  const head = what === "due" ? `A határidő ${s.onto} esik` : `Ez ${s.onto} esik`;
  return <div className="cap-warn" role="status">{Icon.warn(18)}<span>{fixable ? `${head} – ${s.prevOn} szóljunk?` : `${head}.`}</span>{fixable && <button type="button" className="btn sm secondary" onClick={() => onFix!(s.prev)}>Igen, {s.prevOn}</button>}</div>;
}

function SuccessView({ title, lines, onAnother, anotherLabel, onDone, onOpen }: { title: string; lines: React.ReactNode; onAnother?: () => void; anotherLabel?: string; onDone: () => void; onOpen?: () => void }) {
  useEffect(() => { haptic(); }, []);
  return <div className="cap-success" role="status" aria-live="polite">
    <svg className="cap-check" viewBox="0 0 96 96" width="96" height="96" aria-hidden><circle className="c" cx="48" cy="48" r="44" /><path className="p" d="M28 50 l13 13 l27 -29" /></svg>
    <h3>{title}</h3>
    <p>{lines}</p>
    <div className="cap-success-acts">
      {onAnother && <button className="btn primary block lg" onClick={onAnother}>{Icon.plus(18)} {anotherLabel || "Még egy ehhez a céghez"}</button>}
      <button className={`btn ${onAnother ? "ghost" : "primary"} block lg`} onClick={onDone}>Kész</button>
      {onOpen && <button className="btn quiet block" onClick={onOpen}>Részletek megnyitása</button>}
    </div>
  </div>;
}

/* ---------- drafts (per type, localStorage) ---------- */
function useDraft<T>(key: string | null, value: T, dirty: boolean, apply: (v: T) => void) {
  const [pending, setPending] = useState<{ at: number; v: T } | null>(null);
  const [decided, setDecided] = useState(false);
  const off = useRef(false);
  useEffect(() => {
    if (!key) { setDecided(true); return; }
    try { const raw = localStorage.getItem(key); if (raw) { const p = JSON.parse(raw) as { at: number; v: T }; if (p?.v && Date.now() - p.at < 14 * 86400_000) { setPending(p); return; } localStorage.removeItem(key); } } catch { /* storage blocked */ }
    setDecided(true);
  }, [key]);
  useEffect(() => {
    if (!key || !decided || off.current) return;
    const t = setTimeout(() => { try { if (dirty) localStorage.setItem(key, JSON.stringify({ at: Date.now(), v: value })); else localStorage.removeItem(key); } catch { /* ignore */ } }, 350);
    return () => clearTimeout(t);
  }, [key, value, dirty, decided]);
  return {
    pending,
    resume: () => { if (pending) apply(pending.v); setPending(null); setDecided(true); },
    discard: () => { try { if (key) localStorage.removeItem(key); } catch { /* ignore */ } setPending(null); setDecided(true); },
    clear: () => { try { if (key) localStorage.removeItem(key); } catch { /* ignore */ } },
    pause: (p: boolean) => { off.current = p; },
  };
}
function DraftBanner({ at, onResume, onDiscard }: { at: number; onResume: () => void; onDiscard: () => void }) {
  return <div className="cap-draft" role="status">{Icon.history(18)}<span><b>Folytatja a piszkozatot?</b><br />{fmtDate(new Date(at))} {timeOf(new Date(at).toISOString())} – nem mentett adatok</span><button type="button" className="btn sm secondary" onClick={onResume}>Folytatás</button><button type="button" className="btn sm quiet" onClick={onDiscard}>Elvetés</button></div>;
}

/* ---------- shared selectors ---------- */
function useRecentCompanies(n = 3) {
  const data = useData()!;
  return useMemo(() => {
    const live = new Map(data.companies.filter(c => !c.archived_at).map(c => [c.id, c]));
    const seen = new Set<string>(); const out: Company[] = [];
    for (const t of [...data.tasks].sort((a, b) => b.created_at.localeCompare(a.created_at))) { if (!seen.has(t.company_id)) { seen.add(t.company_id); const c = live.get(t.company_id); if (c) out.push(c); } if (out.length >= n) break; }
    return out;
  }, [data.tasks, data.companies, n]);
}
function CompanySelect({ value, onChange, id = "f-company" }: { value: string; onChange: (v: string) => void; id?: string }) {
  const data = useData()!; const list = useMemo(() => data.companies.filter(c => !c.archived_at).sort((a, b) => a.name.localeCompare(b.name, "hu")), [data.companies]);
  const recent = useRecentCompanies(3);
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <select className="ctl" id={id} value={value} onChange={e => onChange(e.target.value)}><option value="">Válasszon céget…</option>{list.map(c => <option key={c.id} value={c.id}>{c.name}{c.tax_id ? ` · ${c.tax_id}` : ""}</option>)}</select>
    {recent.length > 0 && !value && <div className="chips">{recent.map(c => <button key={c.id} type="button" className="chip" onClick={() => onChange(c.id)}>{Icon.history(14)} {c.name}</button>)}</div>}
  </div>;
}

/* ---------- task form state ---------- */
type RemSlot = { d: string; t: string };
type F = {
  companyId: string; vehicleId: string; driverId: string;
  base: string; dueDate: string; dueTime: string; dueTouched: boolean;
  remDays: number[]; remTime: string; customRem: RemSlot[]; useCustom: boolean; recurring: boolean;
  qRemDate: string; qRemTime: string; qRemTouched: boolean; dueRemShift: boolean;
  note: string; address: string; contactName: string; contactPhone: string; participants: string; topic: string;
  invoiceNo: string; issue: string; gross: string; vat: string; paid: string;
};
type Draft = { f: F; step: 1 | 2 | 3; full: boolean };
const MEANINGFUL: (keyof F)[] = ["companyId", "vehicleId", "driverId", "note", "address", "topic", "participants", "invoiceNo", "gross"];

function TaskForm({ type, editId, onDone }: { type: TaskType; editId: string | null; onDone: () => void }) {
  const data = useData()!; const mutate = useMutate(); const { get, set } = useUrlState(); const { layout } = useShell(); const meta = TASK_META[type]; const d = data.workspace.defaults;
  const { confirm, confirmEl } = useConfirm();
  const edit = editId ? data.tasks.find(t => t.id === editId) : undefined;
  const invDays = (cid: string) => data.companies.find(c => c.id === cid)?.invoice_days || d.invoiceDays || 30;

  const init = useMemo<F>(() => {
    const today = todayISO(); const cid = edit?.company_id || get("cid") || "";
    const due = edit ? dateOf(edit.due_at) : type === "invoice" ? addDays(today, invDays(cid)) : computeDue(type, today, d);
    const remTime = d.remindTime || "08:00"; const q = defaultRemind(due, remTime);
    return {
      companyId: cid, vehicleId: edit?.vehicle_id || get("vid") || "", driverId: edit?.driver_id || get("did") || "",
      base: edit?.base_date || today, dueDate: due, dueTime: edit ? timeOf(edit.due_at) : type === "training" ? "10:00" : remTime, dueTouched: !!edit,
      remDays: d.remindDaysBefore || [7, 1, 0], remTime, customRem: edit ? edit.remind_at.map(r => ({ d: dateOf(r), t: timeOf(r) })) : [], useCustom: !!edit, recurring: !edit && !!meta.cycleKey,
      qRemDate: q.d, qRemTime: q.t, qRemTouched: false, dueRemShift: false,
      note: edit?.note || "", address: edit?.address || "", contactName: edit?.contact_name || "", contactPhone: edit?.contact_phone || "", participants: edit?.participants?.toString() || "", topic: edit?.topic || "",
      invoiceNo: edit?.invoice_no || "", issue: edit?.issue_date || today, gross: edit?.gross_amount != null ? String(Math.round(edit.gross_amount)) : "", vat: edit?.vat_percent?.toString() || String(d.vatPercent ?? 27), paid: edit?.paid_at ? edit.paid_at.slice(0, 10) : "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [f, setF] = useState<F>(init);
  const up = useCallback((p: Partial<F>) => setF(s => ({ ...s, ...p })), []);
  const quickable = !edit && layout === "phone" && (type === "vu_download" || type === "card_download");
  const [full, setFull] = useState(false); const [step, setStep] = useState<1 | 2 | 3>(() => (init.companyId ? ((init.vehicleId || init.driverId) ? 3 : 2) : 1));
  const quick = quickable && !full;
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState<{ task: Task; updated: boolean } | null>(null);
  const [newSub, setNewSub] = useState("");

  // drafts
  const [pristine, setPristine] = useState(() => JSON.stringify(init));
  const dirty = !edit && JSON.stringify(f) !== pristine && MEANINGFUL.some(k => !!f[k] && f[k] !== (JSON.parse(pristine) as F)[k]);
  const draftVal = useMemo<Draft>(() => ({ f, step, full }), [f, step, full]);
  const draft = useDraft<Draft>(edit ? null : `benade.draft.${type}`, draftVal, dirty && !saved, v => {
    const ok = (id: string, list: { id: string }[]) => (id && list.some(x => x.id === id) ? id : "");
    const nf = { ...init, ...v.f }; nf.companyId = ok(nf.companyId, data.companies); nf.vehicleId = ok(nf.vehicleId, data.vehicles); nf.driverId = ok(nf.driverId, data.drivers);
    if (nf.qRemDate && new Date(toTS(nf.qRemDate, nf.qRemTime)).getTime() < Date.now()) { const q = defaultRemind(nf.dueDate, nf.remTime); nf.qRemDate = q.d; nf.qRemTime = q.t; nf.qRemTouched = false; }
    setF(nf); setFull(!!v.full); setStep(!nf.companyId ? 1 : v.step === 3 && !(nf.vehicleId || nf.driverId) ? 2 : v.step);
  });

  const company = data.companies.find(c => c.id === f.companyId);
  const contacts = useMemo(() => data.contacts.filter(c => c.company_id === f.companyId), [data.contacts, f.companyId]);
  const vehicles = data.vehicles.filter(v => v.company_id === f.companyId && !v.archived_at); const drivers = data.drivers.filter(x => x.company_id === f.companyId && !x.archived_at);
  const subjectId = meta.subject === "vehicle" ? f.vehicleId : meta.subject === "driver" ? f.driverId : "";
  const subjectName = meta.subject === "vehicle" ? data.vehicles.find(v => v.id === f.vehicleId)?.plate : meta.subject === "driver" ? data.drivers.find(x => x.id === f.driverId)?.name : undefined;
  const dup = useMemo(() => (edit || !subjectId ? undefined : data.tasks.filter(t => t.status === "open" && t.type === type && (meta.subject === "vehicle" ? t.vehicle_id === subjectId : t.driver_id === subjectId)).sort((a, b) => a.due_at.localeCompare(b.due_at))[0]), [edit, subjectId, data.tasks, type, meta.subject]);

  // derived dates
  useEffect(() => { if (!f.dueTouched && meta.cycleKey) { const due = computeDue(type, f.base, d); if (due !== f.dueDate) up({ dueDate: due }); } }, [f.base, f.dueTouched, f.dueDate, meta.cycleKey, type, d, up]);
  useEffect(() => { if (type === "invoice" && !f.dueTouched) { const due = addDays(f.issue, invDays(f.companyId)); if (due !== f.dueDate) up({ dueDate: due }); } }, [f.issue, f.companyId, f.dueTouched, f.dueDate, type]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!f.qRemTouched && f.dueDate) { const q = defaultRemind(f.dueDate, f.remTime); if (q.d !== f.qRemDate || q.t !== f.qRemTime) up({ qRemDate: q.d, qRemTime: q.t }); } }, [f.dueDate, f.qRemTouched, f.remTime, f.qRemDate, f.qRemTime, up]);
  useEffect(() => { if (contacts.length && !f.contactName && type === "training" && !edit) { const p = contacts.find(c => c.is_primary) || contacts[0]; up({ contactName: p.name, contactPhone: p.phone || "" }); } }, [contacts]); // eslint-disable-line react-hooks/exhaustive-deps

  const future = (ts: string) => new Date(ts).getTime() > Date.now() - 60_000;
  const dueShifted = f.dueRemShift && !!isWeekendOrHoliday(f.dueDate);
  const dueRemDate = dueShifted ? prevWorkingDay(f.dueDate) : f.dueDate;
  const reminders = useMemo(() => {
    if (quick) { const a = toTS(f.qRemDate, f.qRemTime); const b = toTS(dueRemDate, f.remTime); return [...new Set([a, b])].filter(future).sort(); }
    if (f.useCustom) return f.customRem.filter(r => r.d && r.t).map(r => toTS(r.d, r.t)).filter(ts => edit ? true : future(ts)).sort();
    if (type === "training") return defaultReminders(f.dueDate, d, "training");
    if (type === "invoice") return [toTS(dueRemDate, f.remTime)].filter(future);
    return f.remDays.map(n => toTS(addDays(f.dueDate, -n), f.remTime)).filter(future).sort();
  }, [quick, f.qRemDate, f.qRemTime, dueRemDate, f.remTime, f.useCustom, f.customRem, type, f.dueDate, d, f.remDays, edit]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addSubject(raw = newSub): Promise<string | null> {
    const q = raw.trim(); if (!q || !f.companyId) return null; setErr(null);
    if (meta.subject === "vehicle") {
      const p = plateFmt(q); const key = p.replace(/[^A-Z0-9]/g, "");
      const ex = data.vehicles.find(v => v.plate.replace(/[^A-Z0-9]/g, "") === key);
      if (ex && ex.company_id === f.companyId) { up({ vehicleId: ex.id }); setNewSub(""); return ex.id; }
      if (ex) { setErr(`Ez a rendszám már szerepel (${data.companies.find(c => c.id === ex.company_id)?.name || "másik cég"}).`); return null; }
      const v = await mutate(r => r.vehicle.create({ company_id: f.companyId, plate: p }), { success: "Jármű rögzítve" }); up({ vehicleId: v.id }); setNewSub(""); return v.id;
    }
    const n = titleCase(q); const ex = drivers.find(x => norm(x.name) === norm(n));
    if (ex) { up({ driverId: ex.id }); setNewSub(""); return ex.id; }
    const x = await mutate(r => r.driver.create({ company_id: f.companyId, name: n }), { success: "Gépkocsivezető rögzítve" }); up({ driverId: x.id }); setNewSub(""); return x.id;
  }

  function validate(): string | null {
    if (!f.companyId) return "Válassza ki a céget.";
    if (meta.subject === "vehicle" && !f.vehicleId) return "Válassza ki a rendszámot.";
    if (meta.subject === "driver" && !f.driverId) return "Válassza ki a gépkocsivezetőt.";
    if (type === "training" && !f.address.trim()) return "Adja meg az oktatás címét.";
    if (type === "invoice" && !f.invoiceNo.trim()) return "Adja meg a számla számát.";
    if (type === "invoice" && f.gross === "") return "Adja meg a bruttó összeget.";
    if (!f.dueDate) return "Adja meg a dátumot.";
    if (meta.cycleKey && f.base > todayISO() && (type === "vu_download" || type === "card_download")) return "A letöltés dátuma nem lehet a jövőben.";
    if (quick) {
      if (!f.qRemDate) return "Adja meg, mikor szóljunk.";
      if (new Date(toTS(f.qRemDate, f.qRemTime)).getTime() <= Date.now()) return "Az emlékeztető időpontja már elmúlt – válasszon későbbit.";
      if (f.qRemDate > f.dueDate) return "Az emlékeztető ne legyen a határidő után.";
    }
    return null;
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault(); setErr(null);
    const v = validate(); if (v) return setErr(v);
    const vatN = Number(f.vat) || 0; const grossN = Math.round(Number(f.gross) || 0);
    const payload: NewTask = {
      company_id: f.companyId, type, vehicle_id: meta.subject === "vehicle" ? f.vehicleId : null, driver_id: meta.subject === "driver" ? f.driverId : null,
      base_date: type === "invoice" ? f.issue : type === "training" ? null : f.base,
      due_at: toTS(f.dueDate, type === "invoice" ? "08:00" : f.dueTime), all_day: type === "invoice", remind_at: reminders, note: f.note.trim() || null,
      address: type === "training" ? f.address.trim() : null, contact_name: type === "training" ? titleCase(f.contactName) || null : null, contact_phone: type === "training" ? f.contactPhone.trim() || null : null, participants: type === "training" && f.participants ? Number(f.participants) : null, topic: type === "training" ? f.topic.trim() || null : null,
      invoice_no: type === "invoice" ? f.invoiceNo.trim() : null, issue_date: type === "invoice" ? f.issue : null, gross_amount: type === "invoice" ? grossN : null, vat_percent: type === "invoice" ? vatN : null, net_amount: type === "invoice" ? Math.round(grossN / (1 + vatN / 100)) : null, paid_at: type === "invoice" ? f.paid || null : null,
      schedule_id: edit?.schedule_id || null, attachment_path: edit?.attachment_path || null,
    };
    setBusy(true);
    try {
      if (edit) { await mutate(r => r.task.update(edit.id, { ...payload, status: type === "invoice" && f.paid ? "done" : edit.status }), { success: "Módosítva" }); onDone(); return; }
      if (dup) {
        const ok = await confirm({ title: "Már van nyitott emlékeztető", text: `Erre már van nyitott emlékeztető (${fmtDate(dup.due_at)}). Frissítsük az újjal?`, okLabel: "Frissítés" });
        if (!ok) return;
        const patch: Partial<Task> = { base_date: payload.base_date, due_at: payload.due_at, remind_at: payload.remind_at, note: payload.note ?? dup.note ?? null };
        await mutate(r => r.task.update(dup.id, patch));
        draft.clear(); draft.pause(true); setSaved({ task: { ...dup, ...patch } as Task, updated: true }); return;
      }
      const t = await mutate(r => r.task.create(payload, { recurring: f.recurring }));
      draft.clear(); draft.pause(true); setSaved({ task: t, updated: false });
    } catch { /* toast shown */ } finally { setBusy(false); }
  }

  function another() {
    const today = todayISO(); const base: F = { ...init, companyId: f.companyId, recurring: f.recurring, remDays: f.remDays, remTime: f.remTime, vat: f.vat, address: type === "training" ? f.address : "", contactName: f.contactName, contactPhone: f.contactPhone, issue: today, base: today };
    const due = type === "invoice" ? addDays(today, invDays(f.companyId)) : computeDue(type, today, d); const q = defaultRemind(due, base.remTime);
    const nf = { ...base, dueDate: due, qRemDate: q.d, qRemTime: q.t, vehicleId: "", driverId: "" };
    setF(nf); setPristine(JSON.stringify(nf)); setSaved(null); setErr(null); setStep(2); draft.pause(false);
  }

  if (saved) {
    const t = saved.task;
    return <>{confirmEl}<SuccessView
      title={saved.updated ? "Frissítve" : "Rögzítve"}
      lines={<>{meta.name} · {company?.name}{subjectName ? ` · ${subjectName}` : ""}<br /><span className="mono">{type === "invoice" ? "Fizetési határidő" : type === "training" ? "Időpont" : "Következő határidő"}: {fmtDateDay(dateOf(t.due_at))}</span>
        {t.remind_at.length > 0 && <><br /><span className="mono" style={{ fontSize: 13 }}>Szólunk: {t.remind_at.map(r => `${fmtDate(r)} ${timeOf(r)}`).join(" · ")}</span></>}
        {f.recurring && meta.cycleKey && !saved.updated && <><br />A sorozat aktív: lezáráskor automatikusan jön a következő.</>}</>}
      onAnother={another} onDone={onDone} onOpen={() => set({ uj: null, t: t.id })} /></>;
  }

  const banner = draft.pending && <DraftBanner at={draft.pending.at} onResume={draft.resume} onDiscard={draft.discard} />;
  const dupNote = dup && <div className="cap-warn" role="status">{Icon.info(18)}<span>{meta.subject === "vehicle" ? "Erre a járműre" : "Erre a gépkocsivezetőre"} már van nyitott emlékeztető: <b className="mono">{fmtDate(dup.due_at)}</b>. Rögzítéskor rákérdezünk, hogy frissítsük-e.</span></div>;

  if (quick) return <>{confirmEl}<QuickSteps type={type} f={f} up={up} step={step} setStep={setStep} onFull={() => setFull(true)} banner={banner} dupNote={dupNote} err={err} setErr={setErr} busy={busy} onSubmit={() => submit()} addSubject={addSubject} reminders={reminders} dueRemDate={dueRemDate} /></>;

  const subjectSel = meta.subject !== "none" && (
    <Field label={meta.subject === "vehicle" ? "Melyik jármű?" : "Melyik gépkocsivezető?"} required id="f-sub" hint={f.companyId ? (meta.subject === "vehicle" ? (vehicles.length ? "Csak a kiválasztott cég járművei." : "Ehhez a céghez még nincs jármű – írja be lent.") : (drivers.length ? "Csak a kiválasztott cég gépkocsivezetői." : "Ehhez a céghez még nincs gépkocsivezető – írja be lent.")) : "Előbb válasszon céget."}>
      <select className="ctl" id="f-sub" disabled={!f.companyId} value={subjectId} onChange={e => up(meta.subject === "vehicle" ? { vehicleId: e.target.value } : { driverId: e.target.value })}>
        <option value="">{meta.subject === "vehicle" ? "Válasszon rendszámot…" : "Válasszon gépkocsivezetőt…"}</option>
        {(meta.subject === "vehicle" ? vehicles.map(v => ({ id: v.id, name: v.plate })) : drivers.map(x => ({ id: x.id, name: x.name }))).map(o => { const l = lastInfo(data.tasks, type, meta.subject as "vehicle" | "driver", o.id); return <option key={o.id} value={o.id}>{o.name}{l.last ? ` · utoljára ${fmtDate(l.last)}` : ""}</option>; })}
      </select>
      {f.companyId && <div style={{ display: "flex", gap: 8, marginTop: 6 }}><input className={`ctl ${meta.subject === "vehicle" ? "mono" : ""}`} aria-label={meta.subject === "vehicle" ? "Új rendszám" : "Új gépkocsivezető neve"} placeholder={meta.subject === "vehicle" ? "Új rendszám, pl. ABC-123" : "Új gépkocsivezető neve"} value={newSub} onChange={e => setNewSub(meta.subject === "vehicle" ? livePlate(e.target.value) : liveTitle(e.target.value))} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }} /><button type="button" className="btn secondary" onClick={() => addSubject()} disabled={!newSub.trim()} aria-label="Hozzáadás">{Icon.plus(18)}</button></div>}
    </Field>
  );
  const offending = reminders.filter(r => isWeekendOrHoliday(dateOf(r)));
  const fixReminders = () => { const list = reminders.map(r => { const dd = dateOf(r); return isWeekendOrHoliday(dd) ? { d: prevWorkingDay(dd), t: timeOf(r) } : { d: dd, t: timeOf(r) }; }).filter(r => future(toTS(r.d, r.t))); up({ customRem: list, useCustom: true }); };
  const baseLabel = type === "calibration" ? "Mikor volt a kalibráció?" : type === "card_expiry" ? "Mikor állították ki a kártyát?" : "Mikor töltötte le?";

  return (
    <form onSubmit={submit} noValidate className="cap-form">
      {confirmEl}
      {banner}
      {quickable && <button type="button" className="btn quiet sm cap-switch" onClick={() => setFull(false)}>{Icon.back(16)} Vissza a lépésenkénti rögzítéshez</button>}
      <div className={`cm-fhead ${meta.cls}`}><span className="cm-glow" aria-hidden /><span className="cm-ico"><TypeIcon type={type} /></span><div className="cm-fht"><b>{meta.name}</b><small>{edit ? "Meglévő tétel szerkesztése" : meta.cycleKey ? `A következő határidőt automatikusan kiszámoljuk.` : type === "invoice" ? `A fizetési határidő automatikusan kiszámolva.` : "Értesítés előző nap és a napján reggel 06:00-kor."}</small></div><span className="cm-cycle">{meta.cycleKey ? `+${d[meta.cycleKey]} nap` : type === "invoice" ? `+${invDays(f.companyId)} nap` : "06:00"}</span></div>
      {data.companies.length === 0 && <div className="ferr">Még nincs rögzített cég. <button type="button" className="btn sm ghost" style={{ marginLeft: 8 }} onClick={() => set({ uj: "company" })}>Új cég</button></div>}
      <Field label="Melyik cég?" required id="f-company"><CompanySelect value={f.companyId} onChange={v => up({ companyId: v, vehicleId: "", driverId: "" })} /></Field>
      {subjectSel}
      {dupNote}

      {meta.cycleKey && <>
        <Field label={baseLabel} id="f-base" hint="Alapértelmezetten a mai nap. Ebből számoljuk a következő határidőt.">
          <DateField id="f-base" label={baseLabel} value={f.base} onChange={v => up({ base: v })} max={type === "vu_download" || type === "card_download" ? todayISO() : undefined} quick={["today", "yesterday"]} />
        </Field>
        <div className="autobox cap-due"><span>Következő határidő<br /><span style={{ fontWeight: 600, opacity: .8 }}>{f.dueTouched ? "egyedileg megadva" : `automatikusan +${d[meta.cycleKey]} naptári nap`}</span></span><span className="big">{fmtDateDay(f.dueDate)}</span></div>
        <details open={f.dueTouched && !edit}><summary className="cap-summary">Határidő felülírása</summary>
          <div className="row2" style={{ marginTop: 10 }}>
            <DateField label="Következő határidő" value={f.dueDate} onChange={v => up({ dueDate: v, dueTouched: true })} min={f.base} quick={[]} />
            <TimeField label="Határidő időpontja" value={f.dueTime} onChange={v => up({ dueTime: v })} />
          </div>
          {f.dueTouched && !edit && <button type="button" className="btn quiet sm" style={{ marginTop: 8 }} onClick={() => up({ dueTouched: false })}>Vissza az automatikusra</button>}
        </details>
      </>}
      {type === "training" && <>
        <Field label="Mikor lesz az oktatás?" required id="f-tdate">
          <div className="row2"><DateField id="f-tdate" label="Oktatás napja" value={f.dueDate} onChange={v => up({ dueDate: v, dueTouched: true })} min={edit ? undefined : todayISO()} quick={["today", "week", "month"]} /><TimeField label="Oktatás kezdete" value={f.dueTime} onChange={v => up({ dueTime: v })} /></div>
        </Field>
        <Field label="Hol lesz?" required id="f-addr"><input className="ctl" id="f-addr" value={f.address} onChange={e => up({ address: e.target.value })} placeholder="Pl. Budapest, Fő utca 1." /></Field>
        <div className="row2">
          <Field label="Kapcsolattartó" id="f-cn">{contacts.length > 0 ? <input className="ctl" id="f-cn" list="contacts-dl" value={f.contactName} onChange={e => { const c = contacts.find(x => x.name === e.target.value); up(c ? { contactName: c.name, contactPhone: c.phone || "" } : { contactName: liveTitle(e.target.value) }); }} /> : <input className="ctl" id="f-cn" value={f.contactName} onChange={e => up({ contactName: liveTitle(e.target.value) })} placeholder="Pl. Kovács Anna" />}<datalist id="contacts-dl">{contacts.map(c => <option key={c.id} value={c.name} />)}</datalist></Field>
          <Field label="Telefon" id="f-cp"><input className="ctl mono" id="f-cp" type="tel" inputMode="tel" value={f.contactPhone} onChange={e => up({ contactPhone: phoneLive(e.target.value) })} placeholder="+36 30 123 4567" /></Field>
        </div>
        <div className="row2">
          <Field label="Hány résztvevő?" id="f-pn"><input className="ctl mono" id="f-pn" inputMode="numeric" value={f.participants} onChange={e => up({ participants: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="fő" /></Field>
          <Field label="Téma" id="f-topic"><input className="ctl" id="f-topic" value={f.topic} onChange={e => up({ topic: e.target.value })} placeholder="Pl. vezetési és pihenőidő" /></Field>
        </div>
        <div className="info">{Icon.clock()}<span>Értesítés automatikusan: előző nap 16:00-kor és az oktatás napján 06:00-kor – a cég nevével, a címmel és a kapcsolattartó telefonszámával.</span></div>
      </>}
      {type === "invoice" && <>
        <div className="row2">
          <Field label="Számlaszám" required id="f-no"><input className="ctl mono" id="f-no" value={f.invoiceNo} onChange={e => up({ invoiceNo: e.target.value })} placeholder="2026/001" /></Field>
          <Field label="Mikor állította ki?" id="f-issue"><DateField id="f-issue" label="Kiállítás dátuma" value={f.issue} onChange={v => up({ issue: v })} quick={["today", "yesterday"]} /></Field>
        </div>
        <div className="row2">
          <Field label="Bruttó összeg (Ft)" required id="f-gross" hint={f.gross ? `Nettó ${fmtFt(Math.round(Number(f.gross) / (1 + (Number(f.vat) || 0) / 100)))}` : undefined}><MoneyInput id="f-gross" value={f.gross} onChange={v => up({ gross: v })} /></Field>
          <Field label="ÁFA" id="f-vat"><select className="ctl" id="f-vat" value={f.vat} onChange={e => up({ vat: e.target.value })}><option value="27">27%</option><option value="5">5%</option><option value="0">0% / AAM</option></select></Field>
        </div>
        <div className="row2">
          <Field label="Fizetési határidő" id="f-due" hint={f.dueTouched ? "Egyedileg megadva." : `Automatikusan +${invDays(f.companyId)} nap a kiállítástól.`}><DateField id="f-due" label="Fizetési határidő" value={f.dueDate} onChange={v => up({ dueDate: v, dueTouched: true })} min={f.issue} quick={[]} /></Field>
          <Field label="Kifizetés dátuma" id="f-paid" hint="Ha már kifizették."><DateField id="f-paid" label="Kifizetés dátuma" value={f.paid} onChange={v => up({ paid: v })} max={todayISO()} min={f.issue} allowEmpty clearLabel="Még nincs kifizetve" placeholder="Még nincs kifizetve" quick={["today", "yesterday"]} /></Field>
        </div>
        {!f.paid && (dueShifted
          ? <div className="cap-ok">{Icon.check(18)}<span>A határidő előtti munkanapon szólunk: {fmtDateDay(dueRemDate)} {f.remTime}.</span><button type="button" className="btn sm quiet" onClick={() => up({ dueRemShift: false })}>Visszaállítás</button></div>
          : <WorkdayNote iso={f.dueDate} what="due" onFix={() => up({ dueRemShift: true })} />)}
      </>}

      {type !== "training" && type !== "invoice" && <div className="field"><label>Mikor szóljunk?</label>
        {!f.useCustom ? <>
          <div className="chips cap-wrap">{[14, 7, 3, 1, 0].map(n => <button key={n} type="button" className="chip" aria-pressed={f.remDays.includes(n)} onClick={() => up({ remDays: f.remDays.includes(n) ? f.remDays.filter(x => x !== n) : [...f.remDays, n].sort((a, b) => b - a) })}>{n === 0 ? "A határidő napján" : `${n} nappal előtte`}</button>)}</div>
          <div className="row2" style={{ marginTop: 8, alignItems: "end" }}><Field label="Hány órakor?"><TimeField label="Emlékeztető időpontja" value={f.remTime} onChange={v => up({ remTime: v })} /></Field><button type="button" className="btn quiet sm" onClick={() => up({ customRem: reminders.map(r => ({ d: dateOf(r), t: timeOf(r) })), useCustom: true })}>Egyedi időpontok…</button></div>
        </> : <>
          {f.customRem.map((r, i) => <div key={i} className="cap-remrow">
            <DateField label={`${i + 1}. emlékeztető napja`} value={r.d} onChange={v => up({ customRem: f.customRem.map((x, j) => j === i ? { ...x, d: v } : x) })} min={edit ? undefined : todayISO()} max={f.dueDate} quick={["today"]} />
            <TimeField label={`${i + 1}. emlékeztető időpontja`} value={r.t} onChange={v => up({ customRem: f.customRem.map((x, j) => j === i ? { ...x, t: v } : x) })} />
            <button type="button" className="btn secondary cap-x" aria-label="Időpont törlése" onClick={() => up({ customRem: f.customRem.filter((_, j) => j !== i) })}>{Icon.x(16)}</button>
          </div>)}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="btn ghost sm" onClick={() => up({ customRem: [...f.customRem, { d: f.dueDate, t: f.remTime }] })}>{Icon.plus(16)} Időpont</button><button type="button" className="btn quiet sm" onClick={() => up({ useCustom: false })}>Vissza az alapértékekhez</button></div>
        </>}
        <div className="hint">{reminders.length ? reminders.map(r => `${fmtDate(r)} ${timeOf(r)}`).join(" · ") : "Nincs jövőbeli emlékeztető."}</div>
        {offending.length > 0 ? <WorkdayNote iso={dateOf(offending[0])} what={dateOf(offending[0]) === f.dueDate ? "due" : "rem"} onFix={fixReminders} /> : <WorkdayNote iso={f.dueDate} what="due" />}
      </div>}

      {meta.cycleKey && !edit && <div className="srow" style={{ border: 0, padding: "4px 0" }}><div><div className="k">Sorozat</div><div className="d">Lezáráskor automatikusan létrejön a következő ciklus (+{d[meta.cycleKey]} nap).</div></div><Switch checked={f.recurring} onChange={v => up({ recurring: v })} label="Sorozat" /></div>}
      <Field label="Megjegyzés" id="f-note" hint="Nem kötelező. A listában és az értesítésben is megjelenik."><textarea className="ctl" id="f-note" value={f.note} onChange={e => up({ note: e.target.value })} placeholder="Pl. telephelyen letölteni" /></Field>
      {err && <div className="ferr" role="alert">{err}</div>}
      <div className="cap-foot"><button type="button" className="btn ghost" onClick={onDone}>Mégse</button><button type="submit" className="btn primary grow" disabled={busy}>{Icon.check(18)} {edit ? "Mentés" : "Rögzítés"}</button></div>
    </form>
  );
}

/** last download date + open (next) task for a subject */
function lastInfo(tasks: Task[], type: TaskType, kind: "vehicle" | "driver", id: string): { last?: string; open?: Task } {
  const mine = tasks.filter(t => t.type === type && (kind === "vehicle" ? t.vehicle_id === id : t.driver_id === id));
  const open = mine.filter(t => t.status === "open").sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
  const done = mine.filter(t => t.status === "done").sort((a, b) => (b.done_at || "").localeCompare(a.done_at || ""))[0];
  const cands = [open?.base_date, done?.done_at ? dateOf(done.done_at) : undefined].filter(Boolean) as string[];
  return { last: cands.sort().pop(), open };
}

/* ---------- money input with live thousands separator ---------- */
function MoneyInput({ id, value, onChange }: { id?: string; value: string; onChange: (digits: string) => void }) {
  const ref = useRef<HTMLInputElement>(null); const caret = useRef<number | null>(null);
  const shown = digitsGroup(value);
  useLayoutEffect(() => {
    const el = ref.current; const n = caret.current; if (!el || n == null || document.activeElement !== el) return;
    let pos = 0, seen = 0; while (pos < shown.length && seen < n) { if (/\d/.test(shown[pos])) seen++; pos++; }
    el.setSelectionRange(pos, pos); caret.current = null;
  }, [shown]);
  return <div className="cap-money"><input ref={ref} className="ctl mono" id={id} inputMode="numeric" autoComplete="off" value={shown} placeholder="35 700" onChange={e => {
    const raw = e.target.value; const c = e.target.selectionStart ?? raw.length;
    caret.current = raw.slice(0, c).replace(/\D/g, "").length;
    const dg = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12); if (caret.current > dg.length) caret.current = dg.length;
    onChange(dg);
  }} /><span className="cap-unit" aria-hidden>Ft</span></div>;
}

/* ---------- phone stepper for VU / driver card downloads ---------- */
function QuickSteps({ type, f, up, step, setStep, onFull, banner, dupNote, err, setErr, busy, onSubmit, addSubject, reminders, dueRemDate }: {
  type: TaskType; f: F; up: (p: Partial<F>) => void; step: 1 | 2 | 3; setStep: (s: 1 | 2 | 3) => void; onFull: () => void; banner: React.ReactNode; dupNote: React.ReactNode;
  err: string | null; setErr: (e: string | null) => void; busy: boolean; onSubmit: () => void; addSubject: (raw: string) => Promise<string | null>; reminders: string[]; dueRemDate: string;
}) {
  const data = useData()!; const mutate = useMutate(); const meta = TASK_META[type]; const d = data.workspace.defaults; const isV = meta.subject === "vehicle";
  const [q, setQ] = useState(""); const [q2, setQ2] = useState(""); const [creating, setCreating] = useState(false); const [editDue, setEditDue] = useState(f.dueTouched);
  const company = data.companies.find(c => c.id === f.companyId);
  const recent = useRecentCompanies(5);
  const companies = useMemo(() => data.companies.filter(c => !c.archived_at).sort((a, b) => a.name.localeCompare(b.name, "hu")), [data.companies]);
  const nq = norm(q);
  const hits = useMemo(() => !nq ? null : companies.filter(c => norm(c.name).includes(nq) || (c.tax_id || "").replace(/\D/g, "").includes(nq.replace(/\D/g, "") || "\u0000")), [companies, nq]);
  const exact = hits?.find(c => norm(c.name) === nq);
  const subjects = useMemo(() => {
    const list = isV ? data.vehicles.filter(v => v.company_id === f.companyId && !v.archived_at).map(v => ({ id: v.id, name: v.plate })) : data.drivers.filter(x => x.company_id === f.companyId && !x.archived_at).map(x => ({ id: x.id, name: x.name }));
    return list.map(s => ({ ...s, ...lastInfo(data.tasks, type, isV ? "vehicle" : "driver", s.id) })).sort((a, b) => (a.open?.due_at || "9999").localeCompare(b.open?.due_at || "9999") || a.name.localeCompare(b.name, "hu"));
  }, [isV, data.vehicles, data.drivers, data.tasks, f.companyId, type]);
  const nq2 = isV ? q2.replace(/[^A-Z0-9]/gi, "").toUpperCase() : norm(q2);
  const subHits = !nq2 ? subjects : subjects.filter(s => (isV ? s.name.replace(/[^A-Z0-9]/gi, "").toUpperCase() : norm(s.name)).includes(nq2));
  const subExact = subjects.find(s => (isV ? s.name.replace(/[^A-Z0-9]/gi, "").toUpperCase() : norm(s.name)) === nq2);
  const subject = subjects.find(s => s.id === (isV ? f.vehicleId : f.driverId));

  const pickCompany = (id: string) => { up({ companyId: id, vehicleId: "", driverId: "" }); setQ(""); setQ2(""); setErr(null); setStep(2); };
  async function newCompany() {
    const name = companyName(q); if (!name) return; if (exact) return pickCompany(exact.id);
    setCreating(true); try { const c = await mutate(r => r.company.create({ name }), { success: "Cég rögzítve" }); pickCompany(c.id); } catch { /* toast */ } finally { setCreating(false); }
  }
  const pickSubject = (id: string) => { up(isV ? { vehicleId: id } : { driverId: id }); setQ2(""); setErr(null); setStep(3); };
  async function newSubject() { setCreating(true); try { const id = await addSubject(q2); if (id) { setQ2(""); setStep(3); } } catch { /* toast */ } finally { setCreating(false); } }

  const labels = ["Cég", isV ? "Rendszám" : "Gépkocsivezető", "Összegzés"];
  const head = <div className="cap-steps">
    <div className="cap-steps-row">
      {step > 1 ? <button type="button" className="btn quiet sm" onClick={() => { setErr(null); setStep((step - 1) as 1 | 2); }}>{Icon.back(16)} Vissza</button> : <span />}
      <span className="cap-steps-n mono" aria-live="polite">{step}/3 · {labels[step - 1]}</span>
      <button type="button" className="btn quiet sm" onClick={onFull}>Részletes űrlap</button>
    </div>
    <div className="cap-progress" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label={`${step}. lépés a 3-ból`}>{[1, 2, 3].map(i => <i key={i} className={i <= step ? "on" : ""} />)}</div>
  </div>;

  if (step === 1) return <div className="cap-form">
    {banner}{head}
    <h3 className="cap-q">Melyik cégnél töltötte le?</h3>
    <div className="cap-search">{Icon.search(18)}<input className="ctl" type="search" enterKeyHint="go" autoFocus aria-label="Cég keresése" placeholder="Cég neve vagy adószáma…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (hits?.length === 1) pickCompany(hits[0].id); else if (q.trim() && !exact) newCompany(); else if (exact) pickCompany(exact.id); } }} /></div>
    {q.trim() && !exact && <button type="button" className="cap-row cap-new" onClick={newCompany} disabled={creating}><span className="cap-ico">{Icon.plus(20)}</span><span><b>Új cég: {companyName(q)}</b><small>Rögzítjük az adatbankba, a többi adat később is pótolható.</small></span></button>}
    {!hits && recent.length > 0 && <><div className="sec" style={{ marginTop: 4 }}><h2>Legutóbb</h2></div><div className="cap-list">{recent.map(c => <CompanyRow key={c.id} c={c} onPick={pickCompany} recent />)}</div></>}
    <div className="sec" style={{ marginTop: 4 }}><h2>{hits ? "Találatok" : "Összes cég"}</h2><span className="n">{(hits || companies).length}</span></div>
    <div className="cap-list">{(hits || companies).slice(0, 80).map(c => <CompanyRow key={c.id} c={c} onPick={pickCompany} />)}</div>
    {(hits || companies).length > 80 && <div className="hint" style={{ textAlign: "center" }}>Írjon a keresőbe a további cégekhez.</div>}
    {hits && hits.length === 0 && <div className="hint" style={{ textAlign: "center" }}>Nincs ilyen cég – rögzítse újként a fenti gombbal.</div>}
  </div>;

  if (step === 2) return <div className="cap-form">
    {banner}{head}
    <div className="cap-chosen"><span>{Icon.users(18)}</span><b>{company?.name || "–"}</b><button type="button" className="btn quiet sm" onClick={() => setStep(1)}>Másik cég</button></div>
    <h3 className="cap-q">{isV ? "Melyik jármű egységét töltötte le?" : "Kinek a kártyáját töltötte le?"}</h3>
    <div className="cap-search">{isV ? Icon.truck(18) : Icon.user(18)}<input className={`ctl ${isV ? "mono cap-plate-in" : ""}`} type="text" enterKeyHint="go" autoCapitalize={isV ? "characters" : "words"} autoComplete="off" aria-label={isV ? "Rendszám keresése vagy új rendszám" : "Gépkocsivezető keresése vagy új név"} placeholder={isV ? "Rendszám, pl. ABC-123" : "Név, pl. Kovács János"} value={q2} onChange={e => { setErr(null); setQ2(isV ? livePlate(e.target.value) : liveTitle(e.target.value)); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (subExact) pickSubject(subExact.id); else if (subHits.length === 1 && q2) pickSubject(subHits[0].id); else if (q2.trim()) newSubject(); } }} /></div>
    {err && <div className="ferr" role="alert">{err}</div>}
    <div className="cap-tiles">
      {q2.trim() && !subExact && <button type="button" className={`cap-tile cap-new ${meta.cls}`} onClick={newSubject} disabled={creating}><span className="cap-ico">{Icon.plus(20)}</span><b className={isV ? "mono plate" : ""}>{isV ? plateFmt(q2) : titleCase(q2)}</b><small>{isV ? "+ Új rendszám" : "+ Új gépkocsivezető"}</small></button>}
      {subHits.map(s => { const rl = s.open ? relLabel(s.open.due_at) : null; return <button key={s.id} type="button" className={`cap-tile ${meta.cls}`} aria-pressed={s.id === (isV ? f.vehicleId : f.driverId)} onClick={() => pickSubject(s.id)}>
        <b className={isV ? "mono plate" : ""}>{s.name}</b>
        <small>utoljára: <span className="mono">{s.last ? fmtDate(s.last) : "–"}</span></small>
        {s.open ? <small className={`cap-due-${rl!.tone}`}>következő: <span className="mono">{fmtDate(s.open.due_at)}</span> · {rl!.text}</small> : <small>nincs nyitott emlékeztető</small>}
      </button>; })}
    </div>
    {subjects.length === 0 && !q2 && <div className="info">{Icon.info()}<span>Ehhez a céghez még nincs {isV ? "jármű" : "gépkocsivezető"}. Írja be {isV ? "a rendszámot" : "a nevet"} fent – rögtön rögzítjük.</span></div>}
  </div>;

  // step 3 – summary
  const today = todayISO();
  return <div className="cap-form">
    {banner}{head}
    <div className={`cap-sum ${meta.cls}`}>
      <span className="cap-ico"><TypeIcon type={type} /></span>
      <div><b className={isV ? "mono" : ""}>{subject?.name || "–"}</b><small>{company?.name}</small></div>
      <button type="button" className="btn quiet sm" onClick={() => setStep(2)}>Módosítás</button>
    </div>
    {dupNote}
    <Field label="Mikor töltötte le?" id="q-base"><DateField id="q-base" label="Mikor töltötte le?" value={f.base} onChange={v => up({ base: v })} max={today} quick={["today", "yesterday"]} /></Field>
    <div className="cap-next">
      <span className="k">Következő határidő</span>
      <span className="v mono">{fmtDateDay(f.dueDate)}</span>
      <span className="s">{f.dueTouched ? "Egyedileg megadva." : `Automatikusan +${d[meta.cycleKey!]} nap a letöltéstől.`} {relLabel(toTS(f.dueDate, "12:00")).text}.</span>
      {!editDue ? <button type="button" className="btn quiet sm" onClick={() => setEditDue(true)}>Módosítás</button> : <div className="cap-next-edit">
        <DateField label="Következő határidő" value={f.dueDate} onChange={v => up({ dueDate: v, dueTouched: true })} min={f.base} quick={[]} />
        {f.dueTouched && <button type="button" className="btn quiet sm" onClick={() => { up({ dueTouched: false }); setEditDue(false); }}>Vissza az automatikusra</button>}
      </div>}
    </div>
    {f.dueRemShift && isWeekendOrHoliday(f.dueDate)
      ? <div className="cap-ok">{Icon.check(18)}<span>A határidő napja helyett {fmtDateDay(dueRemDate)} {f.remTime}-kor szólunk.</span><button type="button" className="btn sm quiet" onClick={() => up({ dueRemShift: false })}>Visszaállítás</button></div>
      : <WorkdayNote iso={f.dueDate} what="due" onFix={() => up({ dueRemShift: true })} />}
    <Field label="Mikor szóljunk?" id="q-rem" hint={reminders.length > 1 ? `Emellett ${dueRemDate === f.dueDate ? "a határidő napján" : `${fmtDateDay(dueRemDate)}`} ${f.remTime}-kor is szólunk.` : undefined}>
      <div className="row2 cap-keep2">
        <DateField id="q-rem" label="Mikor szóljunk?" value={f.qRemDate} onChange={v => up({ qRemDate: v, qRemTouched: true })} min={today} max={f.dueDate} quick={["today"]} />
        <TimeField label="Hány órakor szóljunk?" value={f.qRemTime} onChange={v => up({ qRemTime: v, qRemTouched: true })} />
      </div>
    </Field>
    <WorkdayNote iso={f.qRemDate} what="rem" onFix={prev => up({ qRemDate: prev, qRemTouched: true })} />
    <Field label="Megjegyzés" id="q-note" hint="Nem kötelező."><textarea className="ctl" id="q-note" rows={2} value={f.note} onChange={e => up({ note: e.target.value })} placeholder="Pl. telephelyen letölteni" /></Field>
    {err && <div className="ferr" role="alert">{err}</div>}
    <div className="cap-foot"><button type="button" className="btn primary lg grow" disabled={busy} onClick={onSubmit}>{Icon.check(18)} Rögzítés</button></div>
  </div>;
}
function CompanyRow({ c, onPick, recent }: { c: Company; onPick: (id: string) => void; recent?: boolean }) {
  return <button type="button" className="cap-row" onClick={() => onPick(c.id)}><span className="cap-ico">{recent ? Icon.history(18) : Icon.users(18)}</span><span><b>{c.name}</b>{(c.tax_id || c.address) && <small>{[c.tax_id, c.address].filter(Boolean).join(" · ")}</small>}</span><span className="cap-chev">{Icon.chev(16)}</span></button>;
}

/* ---------- company / vehicle / driver forms ---------- */
const LEGAL = /\b(kft|bt|zrt|nyrt|kkt|rt|kht|ev|nonprofit|egyeni vallalkozo|korlatolt felelossegu tarsasag)\b/g;
const coKey = (s: string) => norm(s).replace(/[.,&()/-]/g, " ").replace(LEGAL, " ").replace(/[^a-z0-9]/g, "");
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3; const p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let prev = p[0]; p[0] = i; for (let j = 1; j <= b.length; j++) { const t = p[j]; p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } }
  return p[b.length];
}
function similarCompanies(list: Company[], name: string, tax: string, selfId?: string): { c: Company; why: string }[] {
  const k = coKey(name); const t8 = tax.replace(/\D/g, "").slice(0, 8); const out: { c: Company; why: string }[] = [];
  for (const c of list) {
    if (c.id === selfId) continue;
    if (t8.length === 8 && (c.tax_id || "").replace(/\D/g, "").slice(0, 8) === t8) { out.push({ c, why: "azonos adószám" }); continue; }
    if (k.length < 3) continue; const ck = coKey(c.name); if (!ck) continue;
    const short = Math.min(k.length, ck.length);
    if (ck === k || (short >= 5 && lev(ck, k) <= (short >= 10 ? 2 : 1)) || (short >= 5 && (ck.includes(k) || k.includes(ck)))) out.push({ c, why: "hasonló név" });
  }
  return out.slice(0, 3);
}

export function CompanyForm({ onDone, editId }: { onDone: (id?: string) => void; editId?: string }) {
  const data = useData()!; const mutate = useMutate(); const edit = editId ? data.companies.find(c => c.id === editId) : undefined;
  const [f, setF] = useState({ name: edit?.name || "", tax_id: edit?.tax_id || "", address: edit?.address || "", phone: edit?.phone || "", email: edit?.email || "", notes: edit?.notes || "", invoice_days: edit?.invoice_days?.toString() || "", contactName: "", contactPhone: "" });
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const u = (k: keyof typeof f, fmt?: (s: string) => string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const v = fmt ? fmt(e.target.value) : e.target.value; setF(s => ({ ...s, [k]: v })); };
  const similar = useMemo(() => similarCompanies(data.companies, f.name, f.tax_id, edit?.id), [data.companies, f.name, f.tax_id, edit?.id]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); const name = companyName(f.name); if (!name) return setErr("Adja meg a cég nevét.");
    if (!edit && data.companies.some(c => c.name.toLocaleLowerCase("hu") === name.toLocaleLowerCase("hu"))) return setErr("Ilyen nevű cég már szerepel.");
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setErr("Az e-mail-cím formátuma nem megfelelő.");
    const payload = { name, tax_id: f.tax_id.trim() || null, address: f.address.trim() || null, phone: f.phone.trim() || null, email: f.email.trim() || null, notes: f.notes.trim() || null, invoice_days: f.invoice_days ? Number(f.invoice_days) : null };
    setBusy(true);
    try {
      if (edit) { await mutate(r => r.company.update(edit.id, payload), { success: "Mentve" }); onDone(edit.id); return; }
      const c = await mutate(r => r.company.create(payload), { success: "Cég rögzítve" });
      if (f.contactName.trim()) await mutate(r => r.contact.create({ company_id: c.id, name: titleCase(f.contactName), phone: f.contactPhone.trim() || null, is_primary: true }));
      onDone(c.id);
    } catch { /* toast shown */ } finally { setBusy(false); }
  }
  return <form onSubmit={submit} noValidate className="cap-form">
    <Field label="Cég neve" required id="c-name"><input className="ctl" id="c-name" value={f.name} onChange={u("name")} placeholder="Pl. Példa Kft." autoFocus autoComplete="organization" /></Field>
    {similar.length > 0 && <div className="cap-warn" role="status">{Icon.warn(18)}<span>Hasonló cég már szerepel: {similar.map((s, i) => <span key={s.c.id}>{i > 0 && ", "}<b>{s.c.name}</b>{s.c.tax_id ? <span className="mono"> ({s.c.tax_id})</span> : null} – {s.why}</span>)}. Ha mégis új cég, nyugodtan rögzítse.</span></div>}
    <div className="row2"><Field label="Adószám" id="c-tax" hint="Formátum: 12345678-2-42"><input className="ctl mono" id="c-tax" inputMode="numeric" value={f.tax_id} onChange={u("tax_id", taxLive)} placeholder="12345678-2-42" /></Field><Field label="Telefon" id="c-phone"><input className="ctl mono" id="c-phone" type="tel" inputMode="tel" value={f.phone} onChange={u("phone", phoneLive)} placeholder="+36 1 234 5678" /></Field></div>
    <Field label="Cím" id="c-addr"><input className="ctl" id="c-addr" value={f.address} onChange={u("address")} placeholder="Irányítószám, település, utca" autoComplete="street-address" /></Field>
    <div className="row2"><Field label="E-mail" id="c-email"><input className="ctl" id="c-email" type="email" inputMode="email" value={f.email} onChange={u("email")} placeholder="info@pelda.hu" /></Field><Field label="Fizetési határidő (nap)" id="c-inv" hint="Üresen az alapértelmezett."><input className="ctl mono" id="c-inv" inputMode="numeric" value={f.invoice_days} onChange={u("invoice_days", s => s.replace(/\D/g, "").slice(0, 3))} placeholder={String(data.workspace.defaults.invoiceDays)} /></Field></div>
    {!edit && <div className="row2"><Field label="Kapcsolattartó" id="c-cn"><input className="ctl" id="c-cn" value={f.contactName} onChange={u("contactName", liveTitle)} placeholder="Pl. Kovács Anna" /></Field><Field label="Kapcsolattartó telefonja" id="c-cp"><input className="ctl mono" id="c-cp" type="tel" inputMode="tel" value={f.contactPhone} onChange={u("contactPhone", phoneLive)} placeholder="+36 30 123 4567" /></Field></div>}
    <Field label="Jegyzet" id="c-notes"><textarea className="ctl" id="c-notes" value={f.notes} onChange={u("notes")} /></Field>
    {err && <div className="ferr" role="alert">{err}</div>}
    <div className="cap-foot"><button type="button" className="btn ghost" onClick={() => onDone()}>Mégse</button><button type="submit" className="btn primary grow" disabled={busy}>{Icon.check(18)} {edit ? "Mentés" : "Cég rögzítése"}</button></div>
  </form>;
}
export function VehicleForm({ onDone, editId, companyId: cidProp }: { onDone: () => void; editId?: string; companyId?: string }) {
  const data = useData()!; const mutate = useMutate(); const { get } = useUrlState(); const edit = editId ? data.vehicles.find(v => v.id === editId) : undefined;
  const [cid, setCid] = useState(edit?.company_id || cidProp || get("cid") || ""); const [plate, setPlate] = useState(edit?.plate || ""); const [make, setMake] = useState(edit?.make || ""); const [vu, setVu] = useState(edit?.vu_type || ""); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) { e.preventDefault(); const p = plateFmt(plate); if (!cid) return setErr("Válasszon céget."); if (!p) return setErr("Adja meg a rendszámot."); const key = p.replace(/[^A-Z0-9]/g, ""); const dup = data.vehicles.find(v => v.plate.replace(/[^A-Z0-9]/g, "") === key && v.id !== edit?.id); if (dup) return setErr(`Ez a rendszám már szerepel (${data.companies.find(c => c.id === dup.company_id)?.name}).`);
    const payload = { company_id: cid, plate: p, make: make.trim() || null, vu_type: vu || null }; try { if (edit) await mutate(r => r.vehicle.update(edit.id, payload), { success: "Mentve" }); else await mutate(r => r.vehicle.create(payload), { success: "Jármű rögzítve" }); onDone(); } catch { /* toast shown */ } }
  return <form onSubmit={submit} noValidate className="cap-form">
    <Field label="Melyik cég járműve?" required id="v-c"><CompanySelect id="v-c" value={cid} onChange={setCid} /></Field>
    <Field label="Rendszám" required id="v-p" hint="Mindig nagybetűvel, kötőjellel: ABC-123 vagy AA BB-123."><input className="ctl mono cap-plate-in" id="v-p" value={plate} onChange={e => setPlate(livePlate(e.target.value))} onBlur={() => setPlate(plateFmt(plate))} placeholder="ABC-123" autoFocus autoCapitalize="characters" autoComplete="off" /></Field>
    <div className="row2"><Field label="Gyártmány / típus" id="v-m"><input className="ctl" id="v-m" value={make} onChange={e => setMake(e.target.value)} placeholder="Pl. Volvo FH" /></Field><Field label="Tachográf" id="v-vu"><select className="ctl" id="v-vu" value={vu} onChange={e => setVu(e.target.value)}><option value="">–</option><option>Smart tachográf G2 v2</option><option>Smart tachográf G2</option><option>Smart tachográf G1</option><option>Digitális tachográf</option><option>Analóg</option></select></Field></div>
    {err && <div className="ferr" role="alert">{err}</div>}
    <div className="cap-foot"><button type="button" className="btn ghost" onClick={onDone}>Mégse</button><button type="submit" className="btn primary grow">{Icon.check(18)} {edit ? "Mentés" : "Jármű rögzítése"}</button></div>
  </form>;
}
export function DriverForm({ onDone, editId, companyId: cidProp }: { onDone: () => void; editId?: string; companyId?: string }) {
  const data = useData()!; const mutate = useMutate(); const { get } = useUrlState(); const edit = editId ? data.drivers.find(v => v.id === editId) : undefined;
  const [cid, setCid] = useState(edit?.company_id || cidProp || get("cid") || ""); const [name, setName] = useState(edit?.name || ""); const [card, setCard] = useState(edit?.card_number || ""); const [phone, setPhone] = useState(edit?.phone || ""); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) { e.preventDefault(); const n = titleCase(name); if (!cid) return setErr("Válasszon céget."); if (!n) return setErr("Adja meg a nevet."); if (data.drivers.some(x => x.company_id === cid && x.name === n && x.id !== edit?.id)) return setErr("Ez a gépkocsivezető már szerepel ennél a cégnél.");
    const payload = { company_id: cid, name: n, card_number: card.trim().toUpperCase() || null, phone: phone.trim() || null }; try { if (edit) await mutate(r => r.driver.update(edit.id, payload), { success: "Mentve" }); else await mutate(r => r.driver.create(payload), { success: "Gépkocsivezető rögzítve" }); onDone(); } catch { /* toast shown */ } }
  return <form onSubmit={submit} noValidate className="cap-form">
    <Field label="Melyik cég gépkocsivezetője?" required id="d-c"><CompanySelect id="d-c" value={cid} onChange={setCid} /></Field>
    <Field label="Név" required id="d-n" hint="Minden szó nagybetűvel kezdődik – az app javítja."><input className="ctl" id="d-n" value={name} onChange={e => setName(liveTitle(e.target.value))} onBlur={() => setName(titleCase(name))} placeholder="Pl. Kovács János" autoFocus autoCapitalize="words" /></Field>
    <div className="row2"><Field label="Vezetői kártya száma" id="d-k"><input className="ctl mono" id="d-k" value={card} onChange={e => setCard(e.target.value.toUpperCase())} placeholder="HU…" autoCapitalize="characters" /></Field><Field label="Telefon" id="d-p"><input className="ctl mono" id="d-p" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(phoneLive(e.target.value))} placeholder="+36 30 123 4567" /></Field></div>
    {err && <div className="ferr" role="alert">{err}</div>}
    <div className="cap-foot"><button type="button" className="btn ghost" onClick={onDone}>Mégse</button><button type="submit" className="btn primary grow">{Icon.check(18)} {edit ? "Mentés" : "Rögzítés"}</button></div>
  </form>;
}
