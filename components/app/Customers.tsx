"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Activity, Company, Contact, Driver, Snapshot, Task, Vehicle } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import type { PortalCompany } from "@/lib/repo";
import { MONTHS, addDays, dateOf, dayDiff, fmtDT, fmtDate, relLabel, toTS, todayISO } from "@/lib/date";
import { fmtFt, initials, phoneHref, titleCase } from "@/lib/format";
import { useData, useMutate, useRepo, useToast } from "@/lib/data";
import { Chips, Empty, Field, Icon, PagedList, Pager, Panel, Seg, Skeleton, Tabs, useConfirm, usePaged } from "@/components/ui";
import { TaskRow } from "./TaskRow";
import { TopBar, useShell, useUrlState } from "./Shell";
import { CompanyForm, DriverForm, VehicleForm } from "./Capture";

type Sort = "name" | "due" | "money";

/* ======================================================================
   Shared helpers: company health, duplicates, licence plate, days ring
   ====================================================================== */

export type Health = "over" | "soon" | "ok";
export const HEALTH_LABEL: Record<Health, string> = { over: "Lejárt", soon: "Hamarosan", ok: "Rendben" };
const HEALTH_TITLE: Record<Health, string> = { over: "Lejárt teendő vagy lejárt, kifizetetlen számla", soon: "7 napon belül esedékes teendő", ok: "Minden rendben" };

/** Local calendar date of a task's due moment (all-day items are stored as local midnight). */
const dueDay = (t: Task) => dateOf(t.due_at);
const isUnpaidInvoice = (t: Task) => t.type === "invoice" && !t.paid_at && t.status !== "skipped";

/** Piros: lejárt teendő vagy lejárt kifizetetlen számla · Sárga: 7 napon belül esedékes · Zöld: minden rendben. */
export function companyHealth(s: Snapshot, cid: string): Health {
  const today = todayISO(), lim = addDays(today, 7); let soon = false;
  for (const t of s.tasks) {
    if (t.company_id !== cid) continue;
    const relevant = t.type === "invoice" ? isUnpaidInvoice(t) : t.status === "open";
    if (!relevant) continue;
    const d = dueDay(t);
    if (d < today) return "over";
    if (d <= lim) soon = true;
  }
  return soon ? "soon" : "ok";
}

export function HealthAvatar({ name, health, size = 40 }: { name: string; health: Health; size?: number }) {
  return <span className={`avatar hring h-${health}`} style={size !== 40 ? { width: size, height: size, borderRadius: size * 0.29, fontSize: size >= 52 ? 18 : 13 } : undefined} title={HEALTH_TITLE[health]}>{initials(name)}</span>;
}
export function HealthWord({ health }: { health: Health }) { return <span className={`hword h-${health}`} title={HEALTH_TITLE[health]}>{HEALTH_LABEL[health]}</span>; }

const LEGAL = new Set(["kft", "zrt", "nyrt", "bt", "kkt", "ev", "kht", "rt", "nonprofit", "ltd", "gmbh", "kozhasznu"]);
export function normCompanyName(s: string) {
  return s.toLocaleLowerCase("hu").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").split(" ").filter(w => w && !LEGAL.has(w)).join("");
}
const taxKey = (s?: string | null) => { const d = String(s || "").replace(/\D/g, ""); return d.length >= 8 ? d.slice(0, 8) : ""; };
function lev1(a: string, b: string) { // true if edit distance <= 1
  if (a === b) return true; if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
  return e + (a.length - i) + (b.length - j) <= 1;
}
export interface DupPair { a: Company; b: Company; reason: "tax" | "name"; key: string }
export function findDuplicates(companies: Company[]): DupPair[] {
  const list = companies.filter(c => !c.archived_at).map(c => ({ c, n: normCompanyName(c.name), t: taxKey(c.tax_id) }));
  const out: DupPair[] = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const x = list[i], y = list[j];
    const reason = x.t && x.t === y.t ? "tax" : x.n && (x.n === y.n || (x.n.length >= 6 && y.n.length >= 6 && lev1(x.n, y.n))) ? "name" : null;
    if (reason) out.push({ a: x.c, b: y.c, reason, key: [x.c.id, y.c.id].sort().join("|") });
  }
  return out;
}

/** Magyar rendszámtábla-stílus: vékony keret, bal oldalon kék EU-sáv. */
const STARS = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [5 + Math.cos(a) * 3.6, 5 + Math.sin(a) * 3.6]; });
export function HuPlate({ plate, size = "md" }: { plate: string; size?: "sm" | "md" }) {
  return <span className={`huplate ${size}`} aria-label={`Rendszám: ${plate}`}><span className="eu" aria-hidden><svg width="10" height="10" viewBox="0 0 10 10">{STARS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".75" />)}</svg><b>H</b></span><span className="tx">{plate}</span></span>;
}

/** Kör alakú visszaszámláló: hány nap van hátra a következő letöltésig. */
export function DaysRing({ days, cycle, size = 56 }: { days: number | null; cycle: number; size?: number }) {
  const r = (size - 6) / 2, C = 2 * Math.PI * r;
  const tone = days == null ? "none" : days < 0 ? "over" : days <= 7 ? "soon" : "ok";
  const pct = days == null ? 0 : days < 0 ? 1 : Math.max(0.04, Math.min(1, days / Math.max(1, cycle)));
  const label = days == null ? "Nincs ütemezett letöltés" : days < 0 ? `${-days} napja lejárt` : days === 0 ? "Ma esedékes" : `${days} nap van hátra`;
  return <span className={`dring ${tone}`} style={{ width: size, height: size }} role="img" aria-label={label} title={label}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle className="trk" cx={size / 2} cy={size / 2} r={r} /><circle className="val" cx={size / 2} cy={size / 2} r={r} strokeDasharray={`${C * pct} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} /></svg>
    <span className="in"><b>{days == null ? "–" : Math.abs(days)}</b><i>{days == null ? "" : days < 0 ? "késés" : "nap"}</i></span>
  </span>;
}

const newToken = () => { const b = new Uint8Array(24); crypto.getRandomValues(b); return Array.from(b, x => x.toString(16).padStart(2, "0")).join(""); };
const asTS = (v: string) => (v.length <= 10 ? toTS(v, "12:00") : v);

/* ======================================================================
   Cégek listája (Adatbank → Cégek)
   ====================================================================== */
type HFilter = "all" | Health;
const DISMISS_KEY = "benade.dupdismiss";

export function CompanyList({ selectedId }: { selectedId?: string }) {
  const data = useData(); const { openCapture, demo, layout } = useShell(); const router = useRouter();
  const [q, setQ] = useState(""); const [sort, setSort] = useState<Sort>("due"); const [arch, setArch] = useState(false); const [hf, setHf] = useState<HFilter>("all");
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => { try { setDismissed(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]")); } catch { /* storage unavailable */ } }, []);
  const base = demo ? "/demo" : "/app";
  const all = useMemo(() => {
    if (!data) return [];
    const Q = q.trim().toLocaleLowerCase("hu");
    return data.companies.filter(c => (arch ? !!c.archived_at : !c.archived_at) && (!Q || c.name.toLocaleLowerCase("hu").includes(Q) || (c.tax_id || "").includes(Q))).map(c => {
      const open = data.tasks.filter(t => t.company_id === c.id && t.status === "open");
      const next = open.map(t => t.due_at).sort()[0]; const overdue = open.filter(t => dueDay(t) < todayISO()).length;
      const money = open.filter(t => t.type === "invoice").reduce((s, t) => s + Number(t.gross_amount || 0), 0);
      return { c, next, overdue, money, h: companyHealth(data, c.id), vehicles: data.vehicles.filter(v => v.company_id === c.id && !v.archived_at).length, drivers: data.drivers.filter(d => d.company_id === c.id && !d.archived_at).length };
    }).sort((a, b) => sort === "name" ? a.c.name.localeCompare(b.c.name, "hu") : sort === "money" ? b.money - a.money : (a.next || "9").localeCompare(b.next || "9"));
  }, [data, q, sort, arch]);
  const rows = hf === "all" ? all : all.filter(r => r.h === hf);
  const pg = usePaged(rows, 10, `${q}|${sort}|${arch}|${hf}`); const anchor = useRef<HTMLDivElement>(null);
  const dups = useMemo(() => (data ? findDuplicates(data.companies) : []).filter(d => !dismissed.includes(d.key)), [data, dismissed]);
  if (!data) return <Skeleton n={5} />;
  const sel = layout === "phone" ? undefined : (selectedId || rows[0]?.c.id);
  const cnt = (h: Health) => all.filter(r => r.h === h).length;
  const dismiss = (keys: string[]) => { const next = [...dismissed, ...keys]; setDismissed(next); try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* ignore */ } };
  const d0 = dups[0];
  return <>
    <button className="btn primary block addbtn" onClick={() => openCapture("company")}>{Icon.plus(18)} Új cég rögzítése</button>
    {d0 && !arch && <div className="dupbar" role="status">
      <span className="ic">{Icon.warn(18)}</span>
      <div className="tx">
        <b>Lehetséges duplikáció</b>
        <span><Link href={`${base}/ugyfelek/${d0.a.id}`}>{d0.a.name}</Link> és <Link href={`${base}/ugyfelek/${d0.b.id}`}>{d0.b.name}</Link> – {d0.reason === "tax" ? "azonos adószám" : "nagyon hasonló név"}.{dups.length > 1 && <> További {dups.length - 1} pár.</>}</span>
      </div>
      <button className="x" onClick={() => dismiss([d0.key])} aria-label="Figyelmeztetés elrejtése" title="Elrejtés">{Icon.x(18)}</button>
    </div>}
    <div className="searchin">{Icon.search(18)}<input className="ctl" placeholder="Keresés a cégek között…" value={q} onChange={e => setQ(e.target.value)} /></div>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Seg value={sort} onChange={setSort} options={[{ value: "due", label: "Határidő" }, { value: "name", label: "Név" }, { value: "money", label: "Kintlévőség" }]} /><button className="chip" aria-pressed={arch} onClick={() => setArch(a => !a)} style={{ marginLeft: "auto" }}>Archivált</button></div>
    <div className="hchips"><Chips value={hf} onChange={setHf} options={[{ value: "all", label: "Mind", count: all.length }, { value: "over", label: "Lejárt", count: cnt("over") }, { value: "soon", label: "Hamarosan", count: cnt("soon") }, { value: "ok", label: "Rendben", count: cnt("ok") }]} /></div>
    {rows.length === 0 ? <Empty icon={Icon.users(26)} title={q || hf !== "all" ? "Nincs találat" : arch ? "Nincs archivált cég" : "Még nincs ügyfél"} text={hf !== "all" ? "Ebben a kategóriában nincs cég." : q ? "Próbáljon más keresőszót." : "Rögzítse az első céget, utána jöhetnek a járművek és a sofőrök."} action={hf !== "all" ? <button className="btn ghost sm" onClick={() => setHf("all")}>Összes cég mutatása</button> : undefined} />
      : <><div ref={anchor} className="list" style={{ scrollMarginTop: 12 }}>{pg.slice.map(r => <button key={r.c.id} className="crow" aria-selected={sel === r.c.id} onClick={() => router.push(`${base}/ugyfelek/${r.c.id}`)}>
        <HealthAvatar name={r.c.name} health={r.h} />
        <span style={{ minWidth: 0 }}><div className="n">{r.c.name}</div><div className="m" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><HealthWord health={r.h} /> · {r.drivers} sofőr · {r.vehicles} jármű{r.c.tax_id ? <span className="mono"> · {r.c.tax_id}</span> : null}</div></span>
        <span className="r">{r.next ? <span className={`badge ${relLabel(r.next).tone}`}>{r.overdue ? `${r.overdue} lejárt` : relLabel(r.next).text}</span> : <span className="badge plain">nincs teendő</span>}{r.money > 0 && <span className="mono" style={{ color: "var(--danger-fg)" }}>{fmtFt(r.money)}</span>}</span>
        {layout === "phone" && <span style={{ color: "var(--faint)" }}>{Icon.chev(18)}</span>}
      </button>)}</div><Pager {...pg} anchor={anchor} /></>}
  </>;
}
/** Ugyanaz a sorrend, mint a lista alapnézete (legközelebbi határidő elöl). */
export function firstCompanyId(data: ReturnType<typeof useData>) { if (!data) return undefined; const next = (id: string) => data.tasks.filter(t => t.company_id === id && t.status === "open").map(t => t.due_at).sort()[0] || "9"; return data.companies.filter(c => !c.archived_at).sort((a, b) => next(a.id).localeCompare(next(b.id)))[0]?.id; }

/* ======================================================================
   Cégprofil
   ====================================================================== */
type Tab = "overview" | "vehicles" | "drivers" | "tasks" | "invoices" | "log";
type Edit = null | { kind: "company" } | { kind: "vehicle"; id?: string } | { kind: "driver"; id?: string } | { kind: "contact"; c?: Contact };

export function CompanyProfile({ id, embedded }: { id: string; embedded?: boolean }) {
  const data = useData(); const repo = useRepo(); const mutate = useMutate(); const { layout, openCapture, demo, role } = useShell(); const { get, set } = useUrlState(); const router = useRouter();
  const [tab, setTab] = useState<Tab>((get("tab") as Tab) || "overview"); const [edit, setEdit] = useState<Edit>(null); const [msg, setMsg] = useState(false);
  const [act, setAct] = useState<Activity[]>([]); const { confirm, confirmEl } = useConfirm();
  const base = demo ? "/demo" : "/app";
  useEffect(() => { setTab((get("tab") as Tab) || "overview"); }, [id, get]);
  const c = data?.companies.find(x => x.id === id);
  useEffect(() => { if (!c) return; repo.activity(100).then(a => setAct(a.filter(x => x.entity_id === c.id || data!.tasks.some(t => t.id === x.entity_id && t.company_id === c.id) || data!.vehicles.some(v => v.id === x.entity_id && v.company_id === c.id) || data!.drivers.some(d => d.id === x.entity_id && d.company_id === c.id) || data!.contacts.some(k => k.id === x.entity_id && k.company_id === c.id)))).catch(() => {}); }, [repo, c, data, tab]);
  if (!data) return <div className="content"><Skeleton /></div>;
  if (!c) return <>{!embedded && <TopBar title="Ügyfél" back={`${base}/adatbank`} />}<div className="content"><Empty title="Ez a cég nem található" /></div></>;
  const vehicles = data.vehicles.filter(v => v.company_id === id && !v.archived_at), drivers = data.drivers.filter(d => d.company_id === id && !d.archived_at), contacts = data.contacts.filter(x => x.company_id === id);
  const tasks = data.tasks.filter(t => t.company_id === id); const open = tasks.filter(t => t.status === "open").sort((a, b) => a.due_at.localeCompare(b.due_at)); const invoices = tasks.filter(t => t.type === "invoice").sort((a, b) => b.due_at.localeCompare(a.due_at));
  const health = companyHealth(data, c.id);
  const canEdit = role !== "viewer";
  const archive = async () => { if (await confirm({ title: c.archived_at ? "Visszaállítás" : "Cég archiválása", text: c.archived_at ? "A cég újra megjelenik az aktív listában." : "A cég és adatai megmaradnak, de eltűnnek az aktív listákból. Bármikor visszaállítható.", okLabel: c.archived_at ? "Visszaállítás" : "Archiválás" })) await mutate(r => r.company.update(c.id, { archived_at: c.archived_at ? null : new Date().toISOString() }), { success: c.archived_at ? "Visszaállítva" : "Archiválva" }); };
  const remove = async () => { if (await confirm({ title: "Cég végleges törlése", text: `${c.name}: ${vehicles.length} jármű, ${drivers.length} sofőr és ${tasks.length} tétel törlődik. Nem vonható vissza. Írja be: TÖRLÉS`, okLabel: "Törlés", danger: true, confirmWord: "TÖRLÉS" })) { await mutate(r => r.company.remove(c.id), { success: "Cég törölve" }); router.push(`${base}/adatbank`); } };
  const removeVehicle = async (v: Vehicle) => { if (await confirm({ title: "Jármű törlése", text: `${v.plate} és a hozzá tartozó teendők törlődnek.`, okLabel: "Törlés", danger: true })) mutate(r => r.vehicle.remove(v.id), { success: "Törölve" }); };
  const removeDriver = async (d: Driver) => { if (await confirm({ title: "Sofőr törlése", text: `${d.name} és a hozzá tartozó teendők törlődnek.`, okLabel: "Törlés", danger: true })) mutate(r => r.driver.remove(d.id), { success: "Törölve" }); };
  const header = (
    <div className="card pad phead-c">
      <HealthAvatar name={c.name} health={health} size={56} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><h2 style={{ fontSize: 20 }}>{c.name}</h2><HealthWord health={health} />{c.tags.map(t => <span key={t} className="badge plain">{t}</span>)}{c.archived_at && <span className="badge plain">archivált</span>}</div>
        <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 2 }}>{c.tax_id && <span className="mono">{c.tax_id}</span>}{c.address && <> · {c.address}</>}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {c.phone && <a className="btn secondary sm" href={phoneHref(c.phone)}>{Icon.phone(14)} {c.phone}</a>}
          {c.email && <a className="btn secondary sm" href={`mailto:${c.email}`}>{Icon.mail(14)} E-mail</a>}
          <button className="btn secondary sm" onClick={() => setMsg(true)}>{Icon.mail(14)} Üzenet az ügyfélnek</button>
          <button className="btn secondary sm" onClick={() => setEdit({ kind: "company" })}>{Icon.pen(14)} Szerkesztés</button>
          {!demo && <a className="btn secondary sm" href={`/api/pdf/company/${c.id}`} target="_blank" rel="noopener">{Icon.file(14)} Flotta-naptár PDF</a>}
        </div>
      </div>
    </div>
  );
  const soonCount = open.filter(t => { const d = dueDay(t); return d >= todayISO() && d <= addDays(todayISO(), 7); }).length;
  const overdueCount = open.filter(t => dueDay(t) < todayISO()).length;
  const body = (
    <>
      {header}
      <SummaryTiles c={c} data={data} act={act} onAddContact={() => setEdit({ kind: "contact" })} />
      <Tabs value={tab} onChange={v => { setTab(v); set({ tab: v }, true); }} options={[{ value: "overview", label: "Áttekintés" }, { value: "vehicles", label: "Járművek", count: vehicles.length }, { value: "drivers", label: "Sofőrök", count: drivers.length }, { value: "tasks", label: "Teendők", count: open.length }, { value: "invoices", label: "Számlák", count: invoices.filter(i => !i.paid_at).length }, { value: "log", label: "Idővonal" }]} />
      {tab === "overview" && <>
        <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="stat"><div className="v">{open.length}</div><div className="l">Nyitott teendő</div></div>
          <div className={`stat ${overdueCount ? "danger" : ""}`}><div className="v">{overdueCount}</div><div className="l">Lejárt</div></div>
          <div className={`stat ${soonCount ? "time" : ""}`}><div className="v">{soonCount}</div><div className="l">7 napon belül</div></div>
        </div>
        <div className="sec"><h2>Következő határidők</h2><button className="btn quiet sm" onClick={() => openCapture("vu_download", { cid: c.id })}>{Icon.plus(14)} Letöltés rögzítése</button></div>
        {open.length ? <div className="list">{open.slice(0, 5).map(t => <TaskRow key={t.id} t={t} compact swipe={false} />)}</div> : <div className="info">{Icon.info()}<span>Nincs nyitott teendő ennél a cégnél.</span></div>}
        <div className="sec"><h2>Kapcsolattartók</h2><button className="btn quiet sm" onClick={() => setEdit({ kind: "contact" })}>{Icon.plus(14)} Új</button></div>
        <div className="card" style={{ padding: "0 14px" }}><div className="rows">{contacts.length === 0 && <div className="rowi" style={{ gridTemplateColumns: "1fr", color: "var(--muted)", fontSize: 13.5 }}>Még nincs kapcsolattartó.</div>}{contacts.map(k => <div className="rowi" key={k.id}><span className="avatar" style={{ width: 36, height: 36, borderRadius: 10 }}>{initials(k.name)}</span><span style={{ minWidth: 0 }}><div className="n">{k.name}{k.is_primary && <span className="badge plain" style={{ marginLeft: 8 }}>elsődleges</span>}</div><div className="m">{k.role || ""}{k.phone && <> · <a href={phoneHref(k.phone)} className="mono">{k.phone}</a></>}{k.email && <> · {k.email}</>}</div></span><span className="ops"><button onClick={() => setEdit({ kind: "contact", c: k })} aria-label="Szerkesztés">{Icon.pen(16)}</button><button onClick={async () => { if (await confirm({ title: "Kapcsolattartó törlése", text: k.name, okLabel: "Törlés", danger: true })) mutate(r => r.contact.remove(k.id)); }} aria-label="Törlés">{Icon.trash(16)}</button></span></div>)}</div></div>
        {c.notes && <div className="card pad"><div className="sec" style={{ margin: "0 0 8px" }}><h2>Jegyzet</h2></div><p style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{c.notes}</p></div>}
        <PortalCard c={c as PortalCompany} demo={demo} canEdit={canEdit} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn ghost sm" onClick={archive}>{c.archived_at ? Icon.refresh(14) : Icon.history(14)} {c.archived_at ? "Visszaállítás" : "Archiválás"}</button>{role === "owner" && <button className="btn danger sm" onClick={remove}>{Icon.trash(14)} Végleges törlés</button>}</div>
      </>}
      {tab === "vehicles" && <>
        <div className="sec" style={{ marginTop: 6 }}><h2>Járművek</h2><button className="btn primary sm" onClick={() => setEdit({ kind: "vehicle" })}>{Icon.plus(14)} Új jármű</button></div>
        {vehicles.length === 0 ? <Empty icon={Icon.truck(26)} title="Még nincs jármű" text="Rögzítse a rendszámokat; utána egy koppintás a letöltés." />
          : <FleetGrid kind="vehicle" items={vehicles} data={data} onCapture={x => openCapture("vu_download", { cid: c.id, vid: x.id })} onEdit={x => setEdit({ kind: "vehicle", id: x.id })} onRemove={x => removeVehicle(x as Vehicle)} />}
      </>}
      {tab === "drivers" && <>
        <div className="sec" style={{ marginTop: 6 }}><h2>Gépkocsivezetők</h2><button className="btn primary sm" onClick={() => setEdit({ kind: "driver" })}>{Icon.plus(14)} Új sofőr</button></div>
        {drivers.length === 0 ? <Empty icon={Icon.user(26)} title="Még nincs gépkocsivezető" />
          : <FleetGrid kind="driver" items={drivers} data={data} onCapture={x => openCapture("card_download", { cid: c.id, did: x.id })} onEdit={x => setEdit({ kind: "driver", id: x.id })} onRemove={x => removeDriver(x as Driver)} />}
      </>}
      {tab === "tasks" && <>
        <div className="sec" style={{ marginTop: 6 }}><h2>Nyitott teendők</h2><span className="n">{open.length}</span></div>
        {open.length ? <PagedList items={open} resetKey={id} render={t => <TaskRow key={t.id} t={t} compact={layout === "desktop"} swipe={false} />} /> : <Empty title="Nincs nyitott teendő" />}
        {tasks.some(t => t.status !== "open" && t.type !== "invoice") && <><div className="sec"><h2>Elvégzett</h2></div><div className="list">{tasks.filter(t => t.status !== "open" && t.type !== "invoice").sort((a, b) => (b.done_at || "").localeCompare(a.done_at || "")).slice(0, 20).map(t => <TaskRow key={t.id} t={t} compact swipe={false} />)}</div></>}
      </>}
      {tab === "invoices" && <>
        <div className="sec" style={{ marginTop: 6 }}><h2>Számlák</h2><button className="btn primary sm" onClick={() => openCapture("invoice", { cid: c.id })}>{Icon.plus(14)} Új számla</button></div>
        {invoices.length ? <PagedList items={invoices} resetKey={id} render={t => <TaskRow key={t.id} t={t} compact swipe={false} />} /> : <Empty title="Nincs számla" />}
      </>}
      {tab === "log" && <CompanyTimeline c={c} data={data} act={act} />}
      {confirmEl}
      <Panel open={!!edit} onClose={() => setEdit(null)} title={edit?.kind === "company" ? "Cég szerkesztése" : edit?.kind === "vehicle" ? (edit.id ? "Jármű szerkesztése" : "Új jármű") : edit?.kind === "driver" ? (edit.id ? "Sofőr szerkesztése" : "Új gépkocsivezető") : edit?.kind === "contact" ? (edit.c ? "Kapcsolattartó" : "Új kapcsolattartó") : ""}>
        {edit?.kind === "company" && <CompanyForm editId={c.id} onDone={() => setEdit(null)} />}
        {edit?.kind === "vehicle" && <VehicleForm editId={edit.id} companyId={c.id} onDone={() => setEdit(null)} />}
        {edit?.kind === "driver" && <DriverForm editId={edit.id} companyId={c.id} onDone={() => setEdit(null)} />}
        {edit?.kind === "contact" && <ContactForm companyId={c.id} contact={edit.c} onDone={() => setEdit(null)} />}
      </Panel>
      <MessagePanel open={msg} onClose={() => setMsg(false)} c={c} data={data} />
    </>
  );
  if (embedded) return <div className="inner" style={{ display: "flex", flexDirection: "column", gap: 14 }}>{body}</div>;
  return <><TopBar title={c.name} back={`${base}/adatbank`} /><div className="content">{body}</div></>;
}

/* ---------- időkapszula: négy összefoglaló csempe ---------- */
function subjectName(s: Snapshot, t: Task) {
  if (t.vehicle_id) return s.vehicles.find(v => v.id === t.vehicle_id)?.plate || "";
  if (t.driver_id) return s.drivers.find(d => d.id === t.driver_id)?.name || "";
  if (t.type === "invoice") return t.invoice_no || "";
  if (t.type === "training") return t.topic || "";
  return "";
}
function primaryContact(s: Snapshot, cid: string) { const ks = s.contacts.filter(k => k.company_id === cid); return ks.find(k => k.is_primary) || ks[0]; }

function SummaryTiles({ c, data, act, onAddContact }: { c: Company; data: Snapshot; act: Activity[]; onAddContact: () => void }) {
  const tasks = data.tasks.filter(t => t.company_id === c.id);
  const next = tasks.filter(t => t.status === "open" && t.type !== "invoice").sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
  const unpaid = tasks.filter(isUnpaidInvoice); const outstanding = unpaid.reduce((s, t) => s + Number(t.gross_amount || 0), 0); const overdueInv = unpaid.filter(t => dueDay(t) < todayISO());
  const nowIso = new Date().toISOString();
  const lastCandidates = [
    ...tasks.filter(t => t.status === "done" && t.done_at).map(t => t.done_at!),
    ...data.contacts.filter(k => k.company_id === c.id).map(k => k.created_at),
    ...act.map(a => a.created_at),
  ].filter(x => x <= nowIso).sort();
  const last = lastCandidates[lastCandidates.length - 1];
  const pc = primaryContact(data, c.id); const phone = pc?.phone || c.phone;
  const nextRel = next ? relLabel(next.due_at) : null;
  return <div className="capsule" aria-label="Összefoglaló">
    <div className={`ctile ${nextRel ? "t-" + nextRel.tone : ""}`}>
      <div className="k">{Icon.clock(14)} Következő határidő</div>
      {next ? <><div className="v">{TASK_META[next.type].short}{subjectName(data, next) && <span className={next.vehicle_id ? "mono" : ""}> · {subjectName(data, next)}</span>}</div><div className="s"><span className="mono">{fmtDate(next.due_at)}</span> · {nextRel!.text}</div></> : <><div className="v">Nincs nyitott teendő</div><div className="s">Minden letöltés rendben.</div></>}
    </div>
    <div className={`ctile ${overdueInv.length ? "t-over" : ""}`}>
      <div className="k">{Icon.invoice(14)} Kintlévőség</div>
      <div className="v mono">{fmtFt(outstanding)}</div>
      <div className="s">{unpaid.length ? `${unpaid.length} nyitott számla${overdueInv.length ? `, ebből ${overdueInv.length} lejárt` : ""}` : "Nincs kifizetetlen számla"}</div>
    </div>
    <div className="ctile">
      <div className="k">{Icon.history(14)} Utolsó kapcsolat</div>
      {last ? <><div className="v mono">{fmtDate(last)}</div><div className="s">{(() => { const n = -dayDiff(last); return n <= 0 ? "Ma" : n === 1 ? "Tegnap" : `${n} napja`; })()}</div></> : <><div className="v">Még nincs</div><div className="s">Nincs elvégzett tétel.</div></>}
    </div>
    <div className="ctile contact">
      <div className="k">{Icon.user(14)} Elsődleges kapcsolattartó</div>
      {pc || phone ? <div className="crow2">
        <span style={{ minWidth: 0 }}><div className="v">{pc?.name || c.name}</div><div className="s mono">{phone || pc?.email || "Nincs telefonszám"}</div></span>
        {phone && <a className="callbtn" href={phoneHref(phone)} aria-label={`Hívás: ${pc?.name || c.name}`} title="Hívás">{Icon.phone(18)}</a>}
      </div> : <><div className="v">Nincs megadva</div><button className="btn quiet sm" style={{ marginTop: 4, paddingLeft: 0 }} onClick={onAddContact}>{Icon.plus(14)} Kapcsolattartó hozzáadása</button></>}
    </div>
  </div>;
}

/* ---------- flotta rács (járművek / gépkocsivezetők) ---------- */
function FleetGrid({ kind, items, data, onCapture, onEdit, onRemove }: { kind: "vehicle" | "driver"; items: (Vehicle | Driver)[]; data: Snapshot; onCapture: (x: Vehicle | Driver) => void; onEdit: (x: Vehicle | Driver) => void; onRemove: (x: Vehicle | Driver) => void }) {
  const isV = kind === "vehicle"; const type = isV ? "vu_download" : "card_download";
  const cycle = isV ? (data.workspace.defaults.vuDays || 90) : (data.workspace.defaults.cardDays || 28);
  const rows = items.map(x => {
    const ts = data.tasks.filter(t => t.type === type && (isV ? t.vehicle_id === x.id : t.driver_id === x.id));
    const nxt = ts.filter(t => t.status === "open").sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
    const prev = ts.filter(t => t.status === "done").sort((a, b) => (b.done_at || "").localeCompare(a.done_at || ""))[0];
    return { x, nxt, prev, days: nxt ? dayDiff(nxt.due_at) : null };
  }).sort((a, b) => (a.days ?? 1e6) - (b.days ?? 1e6));
  return <div className="fleet">{rows.map(({ x, nxt, prev, days }) => { const v = x as Vehicle, d = x as Driver; return (
    <div className="fcard" key={x.id}>
      <div className="top">
        <div style={{ minWidth: 0 }}>
          {isV ? <HuPlate plate={v.plate} /> : <div className="dname"><span className="avatar" style={{ width: 32, height: 32, borderRadius: 10, fontSize: 12 }}>{initials(d.name)}</span><b>{d.name}</b></div>}
          <div className="mk">{isV ? (v.make || "Gyártmány nincs megadva") + (v.vu_type ? ` · ${v.vu_type}` : "") : (d.card_number ? <span className="mono">{d.card_number}</span> : "Kártyaszám nincs megadva")}</div>
          <div className="lst">{prev ? <>Utolsó: <span className="mono">{fmtDate(prev.done_at || prev.due_at)}</span></> : "Még nincs letöltés"}{nxt && <><br />Következő: <span className="mono">{fmtDate(nxt.due_at)}</span></>}</div>
        </div>
        <DaysRing days={days} cycle={cycle} />
      </div>
      <div className="acts">
        <button className="btn secondary sm" onClick={() => onCapture(x)}>{Icon.dl(15)} Letöltés rögzítése</button>
        <button className="sq" onClick={() => onEdit(x)} aria-label="Szerkesztés" title="Szerkesztés">{Icon.pen(17)}</button>
        <button className="sq del" onClick={() => onRemove(x)} aria-label="Törlés" title="Törlés">{Icon.trash(17)}</button>
      </div>
    </div>); })}</div>;
}

/* ---------- idővonal ---------- */
type EvKind = "download" | "training" | "invoice" | "created" | "note";
interface Ev { id: string; at: string; kind: EvKind; title: string; sub?: string; amount?: number; tone?: "ok" | "over" }
const EV_LABEL: Record<EvKind, string> = { download: "Letöltések", training: "Oktatások", invoice: "Számlák", created: "Rögzítések", note: "Jegyzetek" };

function buildTimeline(c: Company, s: Snapshot, act: Activity[]): Ev[] {
  const out: Ev[] = []; const vById = new Map(s.vehicles.map(v => [v.id, v])); const dById = new Map(s.drivers.map(d => [d.id, d]));
  const subj = (t: Task) => (t.vehicle_id ? vById.get(t.vehicle_id)?.plate : t.driver_id ? dById.get(t.driver_id)?.name : "") || "";
  out.push({ id: "c-" + c.id, at: c.created_at, kind: "created", title: "Cég rögzítve", sub: c.name });
  if (c.notes) out.push({ id: "cn-" + c.id, at: c.updated_at, kind: "note", title: "Cégjegyzet", sub: c.notes });
  for (const v of s.vehicles) if (v.company_id === c.id) out.push({ id: "v-" + v.id, at: v.created_at, kind: "created", title: "Jármű rögzítve", sub: v.plate + (v.make ? ` · ${v.make}` : "") });
  for (const d of s.drivers) if (d.company_id === c.id) out.push({ id: "d-" + d.id, at: d.created_at, kind: "created", title: "Gépkocsivezető rögzítve", sub: d.name });
  for (const k of s.contacts) if (k.company_id === c.id) out.push({ id: "k-" + k.id, at: k.created_at, kind: "created", title: "Kapcsolattartó rögzítve", sub: k.name + (k.role ? ` · ${k.role}` : "") });
  for (const t of s.tasks) {
    if (t.company_id !== c.id) continue;
    if (t.type === "invoice") {
      const amt = Number(t.gross_amount || 0);
      out.push({ id: "ii-" + t.id, at: asTS(t.issue_date || t.created_at), kind: "invoice", title: "Számla kiállítva", sub: t.invoice_no || "", amount: amt });
      if (t.paid_at) out.push({ id: "ip-" + t.id, at: asTS(t.paid_at), kind: "invoice", title: "Számla kifizetve", sub: t.invoice_no || "", amount: amt, tone: "ok" });
      else if (t.status !== "skipped" && dueDay(t) < todayISO()) out.push({ id: "io-" + t.id, at: toTS(addDays(dueDay(t), 1), "00:00"), kind: "invoice", title: "Fizetési határidő lejárt", sub: t.invoice_no || "", amount: amt, tone: "over" });
    } else if (t.type === "training") {
      if (t.status === "done" && t.done_at) out.push({ id: "td-" + t.id, at: t.done_at, kind: "training", title: "Oktatás megtartva", sub: [t.topic, t.participants ? `${t.participants} fő` : ""].filter(Boolean).join(" · ") });
      else if (t.status === "open") out.push({ id: "tc-" + t.id, at: t.created_at, kind: "training", title: "Oktatás ütemezve", sub: `${fmtDT(t.due_at, t.all_day)}${t.topic ? ` · ${t.topic}` : ""}` });
    } else if (t.status === "done" && t.done_at) {
      out.push({ id: "dd-" + t.id, at: t.done_at, kind: "download", title: `${TASK_META[t.type].name} elvégezve`, sub: subj(t), tone: "ok" });
    }
    if (t.note) out.push({ id: "tn-" + t.id, at: t.done_at || t.updated_at || t.created_at, kind: "note", title: `Jegyzet · ${TASK_META[t.type].short}${subj(t) ? ` · ${subj(t)}` : ""}`, sub: t.note });
  }
  for (const a of act) if (a.action === "update" && ["companies", "vehicles", "drivers", "contacts"].includes(a.entity)) out.push({ id: "a-" + a.id, at: a.created_at, kind: "created", title: labelAct(a) });
  const now = new Date().toISOString();
  return out.filter(e => e.at && e.at <= now).sort((a, b) => b.at.localeCompare(a.at));
}

function CompanyTimeline({ c, data, act }: { c: Company; data: Snapshot; act: Activity[] }) {
  const [f, setF] = useState<"all" | EvKind>("all"); const [lim, setLim] = useState(60);
  const all = useMemo(() => buildTimeline(c, data, act), [c, data, act]);
  const list = (f === "all" ? all : all.filter(e => e.kind === f)).slice(0, lim);
  const groups: { key: string; label: string; items: Ev[] }[] = [];
  for (const e of list) { const d = new Date(e.at); const key = `${d.getFullYear()}-${d.getMonth()}`; let g = groups[groups.length - 1]; if (!g || g.key !== key) { g = { key, label: `${d.getFullYear()}. ${MONTHS[d.getMonth()]}`, items: [] }; groups.push(g); } g.items.push(e); }
  const count = (k: EvKind) => all.filter(e => e.kind === k).length;
  const total = f === "all" ? all.length : count(f);
  return <>
    <Chips value={f} onChange={v => { setF(v); setLim(60); }} options={[{ value: "all", label: "Mind", count: all.length }, ...(Object.keys(EV_LABEL) as EvKind[]).map(k => ({ value: k, label: EV_LABEL[k], count: count(k) }))]} />
    {groups.length === 0 ? <Empty icon={Icon.history(26)} title="Nincs esemény" text="Ebben a kategóriában még nem történt semmi." />
      : groups.map(g => <section key={g.key} className="tlgroup">
        <div className="sec" style={{ marginTop: 8 }}><h2 className="month">{g.label}</h2><span className="n">{g.items.length}</span></div>
        <div className="card tl">{g.items.map(e => <div key={e.id} className={`tlev k-${e.kind} ${e.tone ? "tone-" + e.tone : ""}`}>
          <i aria-hidden />
          <div className="b"><div className="t">{e.title}</div>{e.sub && <div className="s">{e.sub}</div>}</div>
          <div className="r">{e.amount != null && <div className="mono amt">{fmtFt(e.amount)}</div>}<div className="mono dt">{fmtDate(e.at)}</div></div>
        </div>)}</div>
      </section>)}
    {list.length < total && <button className="btn ghost block" onClick={() => setLim(l => l + 60)}>További események betöltése</button>}
  </>;
}
function labelAct(a: Activity) { const e = { companies: "Cég", vehicles: "Jármű", drivers: "Sofőr", tasks: "Teendő", contacts: "Kapcsolattartó" }[a.entity] || a.entity; const act = { insert: "létrehozva", update: "módosítva", delete: "törölve", done: "elvégezve" }[a.action] || a.action; const after = a.after as Record<string, unknown> | undefined; const name = (after?.name || after?.plate || (after?.type && TASK_META[after.type as keyof typeof TASK_META]?.short)) as string | undefined; return `${e} ${act}${name ? ` · ${name}` : ""}`; }

/* ---------- ügyfélportál link ---------- */
function PortalCard({ c, demo, canEdit }: { c: PortalCompany; demo: boolean; canEdit: boolean }) {
  const mutate = useMutate(); const toast = useToast(); const { confirm, confirmEl } = useConfirm();
  const [origin, setOrigin] = useState(""); useEffect(() => setOrigin(window.location.origin), []);
  const token = c.portal_token || null; const url = token ? `${origin}${demo ? "/demo" : ""}/p/${token}` : "";
  const create = () => mutate(r => r.company.setPortalToken(c.id, newToken()), { success: "Ügyfélportál link létrehozva" });
  const revoke = async () => { if (await confirm({ title: "Link visszavonása", text: "A jelenlegi link azonnal érvénytelenné válik; aki megkapta, többé nem látja az adatokat. Később új linket hozhat létre.", okLabel: "Visszavonás", danger: true })) await mutate(r => r.company.setPortalToken(c.id, null), { success: "Link visszavonva" }); };
  const exp = c.portal_expires_at || null; const expDays = exp ? Math.round((new Date(exp).getTime() - Date.now()) / 86400000) : null;
  const renew = () => mutate(r => r.company.update(c.id, { portal_expires_at: new Date(Date.now() + 365 * 86400000).toISOString() } as Partial<PortalCompany>), { success: "A link még egy évig érvényes" });
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast("Link a vágólapon", "ok"); } catch { toast("A másolás nem sikerült", "err"); } };
  return <div className="card pad portalcard">
    <div className="hd"><span className="ic">{Icon.external(18)}</span><div><h3>Ügyfélportál</h3><p>Csak olvasható oldal az ügyfélnek: határidők, oktatások és nyitott számlák – bejelentkezés nélkül.</p></div></div>
    {token ? <>
      <div className="url mono" title={url}>{url || "…"}</div>
      {exp && <div className={`pexp ${expDays !== null && expDays <= 30 ? "warn" : ""}`}>{expDays !== null && expDays < 0 ? "A link lejárt – az ügyfél már nem látja az adatokat." : `Érvényes: ${fmtDate(exp)}-ig${expDays !== null && expDays <= 30 ? ` (${expDays} nap)` : ""}`}{canEdit && <button type="button" className="btn quiet sm" onClick={renew}>Meghosszabbítás 1 évvel</button>}</div>}
      <div className="acts">
        <button className="btn secondary sm" onClick={copy}>{Icon.copy(14)} Link másolása</button>
        {<a className="btn secondary sm" href={url} target="_blank" rel="noopener">{Icon.external(14)} Megnyitás</a>}
        {canEdit && <button className="btn danger sm" onClick={revoke}>{Icon.x(14)} Visszavonás</button>}
      </div>
    </> : canEdit ? <button className="btn primary sm" onClick={create}>{Icon.plus(14)} Link létrehozása</button> : <div className="s">Még nincs ügyfélportál link.</div>}
    {demo && <div className="info" style={{ marginTop: 10 }}>{Icon.info()}<span>A tesztfiókban a link ezen az eszközön nyitható meg (a tesztadatok csak itt vannak). Saját fiókban a link bárkinek elküldhető.</span></div>}
    {confirmEl}
  </div>;
}

/* ---------- üzenet az ügyfélnek ---------- */
export function customerMessage(c: Company, s: Snapshot, days = 14): string {
  const lim = addDays(todayISO(), days); const today = todayISO();
  const due = s.tasks.filter(t => t.company_id === c.id && t.status === "open" && (t.vehicle_id || t.driver_id) && dueDay(t) <= lim).sort((a, b) => a.due_at.localeCompare(b.due_at));
  const pc = primaryContact(s, c.id); const ws = s.workspace;
  const lines: string[] = [`Tisztelt ${pc?.name || c.name}!`, ""];
  if (due.length) {
    lines.push(`Tájékoztatjuk, hogy a következő ${days} napban az alábbi tachográf-teendők esedékesek a(z) ${c.name} járművein és gépkocsivezetőinél:`, "");
    const byType = new Map<string, Task[]>(); for (const t of due) { const k = TASK_META[t.type].name; byType.set(k, [...(byType.get(k) || []), t]); }
    for (const [name, ts] of byType) {
      lines.push(`${name}:`);
      for (const t of ts) { const sub = subjectName(s, t); const d = dueDay(t); lines.push(`• ${sub} – ${d < today ? `lejárt: ${fmtDate(d)}` : fmtDate(d)}`); }
      lines.push("");
    }
    lines.push(`Kérjük, egyeztessen velünk időpontot${ws.phone ? ` a ${ws.phone} telefonszámon` : ""}, vagy válaszoljon erre az üzenetre.`);
  } else {
    lines.push(`Örömmel tájékoztatjuk, hogy a következő ${days} napban nincs esedékes letöltés vagy egyéb tachográf-teendő a(z) ${c.name} járműveinél és gépkocsivezetőinél.`, "", "A következő határidő előtt időben jelentkezünk.");
  }
  lines.push("", "Üdvözlettel:", ws.name); if (ws.phone) lines.push(ws.phone); if (ws.email) lines.push(ws.email);
  return lines.join("\n");
}

function MessagePanel({ open, onClose, c, data }: { open: boolean; onClose: () => void; c: Company; data: Snapshot }) {
  const toast = useToast(); const [text, setText] = useState("");
  useEffect(() => { if (open) setText(customerMessage(c, data)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, c.id]);
  const pc = primaryContact(data, c.id); const email = c.email || pc?.email || ""; const phone = pc?.phone || c.phone || "";
  const subject = `Esedékes tachográf-teendők – ${c.name}`;
  const mailto = email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : "";
  const sms = phone ? `sms:${phone.replace(/[^+\d]/g, "")}?body=${encodeURIComponent(text)}` : "";
  const copy = async () => { try { await navigator.clipboard.writeText(text); toast("Üzenet a vágólapon", "ok"); } catch { toast("A másolás nem sikerült", "err"); } };
  return <Panel open={open} onClose={onClose} title="Üzenet az ügyfélnek" footer={<>
    {mailto ? <a className="btn secondary" href={mailto}>{Icon.mail(16)} E-mail</a> : <button className="btn secondary" disabled title="Nincs e-mail cím megadva">{Icon.mail(16)} E-mail</button>}
    {sms ? <a className="btn secondary" href={sms}>{Icon.phone(16)} SMS</a> : <button className="btn secondary" disabled title="Nincs telefonszám megadva">{Icon.phone(16)} SMS</button>}
    <button className="btn primary" onClick={copy}>{Icon.copy(16)} Másolás</button>
  </>}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="msgto"><span>Címzett</span><b>{pc?.name || c.name}</b><span className="mono">{[email, phone].filter(Boolean).join(" · ") || "Nincs elérhetőség megadva"}</span></div>
      <Field label="Üzenet" id="msg-t" hint="A következő 14 napban esedékes rendszámok és gépkocsivezetők. Küldés előtt szabadon módosítható.">
        <textarea className="ctl msgtext" id="msg-t" value={text} onChange={e => setText(e.target.value)} rows={14} />
      </Field>
      <button className="btn quiet sm" style={{ alignSelf: "flex-start" }} onClick={() => setText(customerMessage(c, data))}>{Icon.refresh(14)} Sablon visszaállítása</button>
    </div>
  </Panel>;
}

/* ---------- kapcsolattartó űrlap ---------- */
function ContactForm({ companyId, contact, onDone }: { companyId: string; contact?: Contact; onDone: () => void }) {
  const mutate = useMutate(); const [f, setF] = useState({ name: contact?.name || "", phone: contact?.phone || "", email: contact?.email || "", role: contact?.role || "", is_primary: contact?.is_primary || false });
  return <form onSubmit={async e => { e.preventDefault(); if (!f.name.trim()) return; const p = { ...f, name: titleCase(f.name) }; if (contact) await mutate(r => r.contact.update(contact.id, p), { success: "Mentve" }); else await mutate(r => r.contact.create({ company_id: companyId, ...p }), { success: "Kapcsolattartó rögzítve" }); onDone(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <Field label="Név" required id="k-n"><input className="ctl" id="k-n" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoFocus /></Field>
    <div className="row2"><Field label="Telefon" id="k-p"><input className="ctl mono" id="k-p" type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field><Field label="Szerep" id="k-r"><input className="ctl" id="k-r" value={f.role} onChange={e => setF({ ...f, role: e.target.value })} placeholder="pl. flottavezető" /></Field></div>
    <Field label="E-mail" id="k-e"><input className="ctl" id="k-e" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
    <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 700, fontSize: 14 }}><input type="checkbox" checked={f.is_primary} onChange={e => setF({ ...f, is_primary: e.target.checked })} /> Elsődleges kapcsolattartó</label>
    <div style={{ display: "flex", gap: 10 }}><button type="button" className="btn ghost" style={{ flex: 1 }} onClick={onDone}>Mégse</button><button type="submit" className="btn primary" style={{ flex: 2 }}>{Icon.check(18)} Mentés</button></div>
  </form>;
}
