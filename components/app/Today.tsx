"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Task } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import { DAYS_SHORT, addDays, dayDiff, fmtDate, fmtLong, parseISODate, startOfWeek, timeOf, todayISO } from "@/lib/date";
import { fmtFt, phoneHref } from "@/lib/format";
import { useData, useMutate, useSubject, useToast } from "@/lib/data";
import { Chips, Empty, Icon, Ring, Skeleton, TypeIcon } from "@/components/ui";
import { TaskRow } from "./TaskRow";
import { TaskDetail } from "./TaskDetail";
import { TopBar, useShell, useUrlState } from "./Shell";

type Filter = "open" | "over" | "today" | "week" | "done";

export function TodayView() {
  const data = useData(); const { layout, openCapture, demo } = useShell(); const { get, set } = useUrlState();
  const subject = useSubject(); const mutate = useMutate(); const toast = useToast();
  const [filter, setFilter] = useState<Filter>("open"); const [day, setDay] = useState<string | null>(null);
  const t = todayISO(); const sel = get("t");
  const open = useMemo(() => (data?.tasks || []).filter(x => x.status === "open").sort((a, b) => a.due_at.localeCompare(b.due_at)), [data]);
  const over = open.filter(x => x.due_at.slice(0, 10) < t), today = open.filter(x => x.due_at.slice(0, 10) === t), week = open.filter(x => { const d = dayDiff(x.due_at); return d > 0 && d <= 7; });
  const done = useMemo(() => (data?.tasks || []).filter(x => x.status !== "open").sort((a, b) => (b.done_at || b.due_at).localeCompare(a.done_at || a.due_at)).slice(0, 50), [data]);
  const outstanding = useMemo(() => open.filter(x => x.type === "invoice").reduce((s, x) => s + Number(x.gross_amount || 0), 0), [open]);
  const next = open[0];
  const weekStart = startOfWeek(t); const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const list = day ? open.filter(x => x.due_at.slice(0, 10) === day) : filter === "over" ? over : filter === "today" ? today : filter === "week" ? week : filter === "done" ? done : open;
  const groups = useMemo(() => { if (filter !== "open" || day) return null; const g: { label: string; items: Task[] }[] = []; const later = open.filter(x => dayDiff(x.due_at) > 7); if (over.length) g.push({ label: "Lejárt", items: over }); if (today.length) g.push({ label: "Ma", items: today }); const tom = week.filter(x => dayDiff(x.due_at) === 1), rest = week.filter(x => dayDiff(x.due_at) > 1); if (tom.length) g.push({ label: "Holnap", items: tom }); if (rest.length) g.push({ label: "Ezen a héten", items: rest }); if (later.length) g.push({ label: "Később", items: later }); return g; }, [filter, day, open, over, today, week]);
  const calls = useMemo(() => { const m = new Map<string, Task[]>(); [...over, ...today].forEach(x => m.set(x.company_id, [...(m.get(x.company_id) || []), x])); return [...m.entries()].map(([cid, items]) => ({ c: data!.companies.find(c => c.id === cid), items })).filter(x => x.c); }, [over, today, data]);
  const base = demo ? "/demo" : "/app";
  const complete = (x: Task) => mutate(r => r.task.complete(x.id), { optimistic: s => { const y = s.tasks.find(z => z.id === x.id); if (y) y.status = "done"; return s; } }).then(() => toast("Elvégezve", "ok", { label: "Visszavonás", fn: () => mutate(r => r.task.reopen(x.id)) }));

  if (!data) return <><TopBar title="Teendő" /><div className="content"><Skeleton n={4} h={72} /></div></>;
  const onboarding = data.companies.length === 0 && data.tasks.length === 0;

  const listPane = (
    <div className="content">
      {layout !== "desktop" && <div><div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--muted)", letterSpacing: ".14em", textTransform: "uppercase" }}>{fmtLong(new Date())}</div><h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.025em", marginTop: 2 }}>{greet()}, {data.profile.full_name?.split(" ")[0] || ""}</h2></div>}
      {onboarding && <Onboard />}
      {next && !onboarding && (
        <button className={`nextup ${TASK_META[next.type].cls} ${dayDiff(next.due_at) < 0 ? "over" : ""}`} onClick={() => set({ t: next.id })}>
          <span>
            <span className="k">Következő teendő</span>
            <span className="when" style={{ display: "block" }}>{(() => { const d = dayDiff(next.due_at); return d < 0 ? <><em>{-d} napja</em> lejárt</> : d === 0 ? <>Ma {!next.all_day && <em>{timeOf(next.due_at)}</em>}</> : d === 1 ? <>Holnap {!next.all_day && <em>{timeOf(next.due_at)}</em>}</> : <><em>{d}</em> nap múlva</>; })()}</span>
            <span className="t" style={{ display: "block" }}>{TASK_META[next.type].name}</span>
            <span className="m" style={{ display: "block" }}>{subject(next)} · {fmtDate(next.due_at)}</span>
            <span className="acts"><span className="btn ok sm" role="button" tabIndex={0} onClick={e => { e.stopPropagation(); complete(next); }} onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); complete(next); } }}>{Icon.check(16)} Elvégezve</span><span className="btn secondary sm">Megnyitás</span></span>
          </span>
          <Ring pct={ringPct(next)} size={72} tone={dayDiff(next.due_at) < 0 ? "over" : undefined} cls={TASK_META[next.type].cls}><div style={{ textAlign: "center" }}><div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{dayDiff(next.due_at) < 0 ? "!" : Math.abs(dayDiff(next.due_at))}</div><div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800 }}>{dayDiff(next.due_at) < 0 ? "lejárt" : "nap"}</div></div></Ring>
        </button>
      )}
      {!onboarding && <div className="stats">
        <button className="stat danger" onClick={() => { setDay(null); setFilter("over"); }}><div className="v">{over.length}</div><div className="l">Lejárt</div></button>
        <button className="stat time" onClick={() => { setDay(null); setFilter("today"); }}><div className="v">{today.length}</div><div className="l">Ma esedékes</div></button>
        <button className="stat accent" onClick={() => { setDay(null); setFilter("week"); }}><div className="v">{week.length}</div><div className="l">7 napon belül</div></button>
        {layout === "desktop" && <Link className="stat" href={`${base}/szamlak`}><div className="v" style={{ fontSize: 20 }}>{fmtFt(outstanding)}</div><div className="l">Kintlévőség</div></Link>}
      </div>}
      {!onboarding && <div className="weekstrip">{days.map(d => { const items = open.filter(x => x.due_at.slice(0, 10) === d); const dd = parseISODate(d); return <button key={d} aria-pressed={day === d} className={d === t ? "today" : ""} onClick={() => { setDay(day === d ? null : d); setFilter("open"); }}><span>{DAYS_SHORT[dd.getDay()]}</span><b>{dd.getDate()}</b><span className="dots">{items.slice(0, 3).map(x => <i key={x.id} className={TASK_META[x.type].cls} />)}</span></button>; })}</div>}
      {!onboarding && <Chips value={day ? "open" : filter} onChange={f => { setDay(null); setFilter(f); }} options={[{ value: "open", label: "Összes", count: open.length }, { value: "over", label: "Lejárt", count: over.length }, { value: "today", label: "Ma", count: today.length }, { value: "week", label: "7 nap", count: week.length }, { value: "done", label: "Elvégzett" }]} />}
      {day && <div className="sec" style={{ marginTop: 4 }}><h2>{fmtLong(parseISODate(day))}</h2><button className="btn quiet sm" onClick={() => setDay(null)}>Összes</button></div>}
      {groups ? groups.map(g => <div key={g.label}><div className="sec" style={{ marginTop: 10 }}><h2>{g.label}</h2><span className="n">{g.items.length}</span></div><div className="list" style={{ marginTop: 8 }}>{g.items.map(x => <TaskRow key={x.id} t={x} selected={sel === x.id} compact={layout === "desktop"} />)}</div></div>)
        : list.length ? <div className="list">{list.map(x => <TaskRow key={x.id} t={x} selected={sel === x.id} compact={layout === "desktop"} />)}</div>
        : !onboarding && <Empty icon={Icon.check(28)} title={filter === "over" ? "Nincs lejárt tétel" : filter === "today" ? "Ma nincs teendő" : filter === "done" ? "Még nincs elvégzett tétel" : day ? "Ezen a napon nincs teendő" : "Nincs nyitott teendő"} text={filter === "open" && !day ? "Rögzítsen egy letöltést, oktatást vagy számlát a + gombbal." : undefined} action={filter === "open" && !day ? <button className="btn primary sm" onClick={() => openCapture()}>{Icon.plus(16)} Új rögzítés</button> : undefined} />}
    </div>
  );
  const detail = sel ? data.tasks.find(x => x.id === sel) : undefined;
  return <>
    <TopBar title={layout === "desktop" ? `${greet()}, ${data.profile.full_name?.split(" ")[0] || ""}` : "Teendő"} sub={layout === "desktop" ? fmtLong(new Date()) : undefined} actions={layout !== "phone" ? <button className="btn primary sm" onClick={() => openCapture()}>{Icon.plus(16)} Új</button> : undefined} />
    {layout === "phone" ? listPane : (
      <div className="split">
        <div className="pane">{listPane}</div>
        <div className="pane detail">{detail ? <div className="inner"><TaskDetail t={detail} onDone={() => set({ t: null })} /></div> : <SidePlaceholder calls={calls} />}</div>
      </div>
    )}
  </>;
}
function ringPct(t: Task) { const base = t.base_date ? parseISODate(t.base_date).getTime() : new Date(t.created_at).getTime(); const end = new Date(t.due_at).getTime(); return Math.max(4, Math.min(100, Math.round(100 * (Date.now() - base) / Math.max(1, end - base)))); }
function greet() { const h = new Date().getHours(); return h < 5 ? "Jó éjszakát" : h < 10 ? "Jó reggelt" : h < 18 ? "Jó napot" : "Jó estét"; }

function SidePlaceholder({ calls }: { calls: { c: { id: string; name: string; phone?: string | null } | undefined; items: Task[] }[] }) {
  const { demo } = useShell(); const base = demo ? "/demo" : "/app"; const subject = useSubject();
  return <div className="inner" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div className="sec" style={{ marginTop: 0 }}><h2>Kit kell ma felhívni</h2><span className="n">{calls.length}</span></div>
    {calls.length === 0 ? <div className="info">{Icon.check()}<span>Nincs lejárt vagy mai határidő. Válasszon egy tételt balról a részletekhez.</span></div>
      : calls.map(({ c, items }) => <div key={c!.id} className="card pad" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span className="avatar">{c!.name.slice(0, 2).toUpperCase()}</span>
        <div style={{ minWidth: 0, flex: 1 }}><Link href={`${base}/ugyfelek/${c!.id}`} style={{ fontWeight: 800, textDecoration: "none" }}>{c!.name}</Link><div style={{ fontSize: 12.5, color: "var(--muted)" }}>{items.map(i => `${TASK_META[i.type].short} · ${subject(i).split(" · ").slice(1).join(" · ") || fmtDate(i.due_at)}`).join(" · ")}</div></div>
        {c!.phone && <a className="btn secondary sm" href={phoneHref(c!.phone)}>{Icon.phone(14)} Hívás</a>}
      </div>)}
    <div className="info">{Icon.info()}<span><b>Gyorsbillentyűk:</b> N új rögzítés · / keresés · Esc bezárás. Telefonon a tételeket balra húzva elvégzettnek, jobbra húzva holnapra halaszthatja.</span></div>
  </div>;
}

function Onboard() {
  const { openCapture, demo } = useShell(); const base = demo ? "/demo" : "/app";
  return <div className="card pad" style={{ background: "linear-gradient(160deg, var(--accent-soft), var(--surface))" }}>
    <h3 style={{ fontSize: 18 }}>Kezdjük el három lépésben</h3>
    <ol style={{ margin: "12px 0 16px", paddingLeft: 20, display: "grid", gap: 8, color: "var(--muted)", fontSize: 14 }}>
      <li><b style={{ color: "var(--fg)" }}>Cég rögzítése</b> – név és adószám.</li>
      <li><b style={{ color: "var(--fg)" }}>Sofőrök és járművek</b> – a céghez tartozó nevek és rendszámok.</li>
      <li><b style={{ color: "var(--fg)" }}>Első emlékeztető</b> – letöltés, oktatás vagy számla; a határidőt az app számolja.</li>
    </ol>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn primary" onClick={() => openCapture("company")}>{Icon.plus(18)} Első cég</button><Link className="btn ghost" href={`${base}/import`}>{Icon.upload(18)} Excel importálása</Link></div>
  </div>;
}
