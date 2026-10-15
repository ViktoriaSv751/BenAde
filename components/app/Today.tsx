"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Task } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import { DAYS_SHORT, addDays, dayDiff, fmtDate, fmtLong, parseISODate, startOfWeek, timeOf, todayISO } from "@/lib/date";
import { fmtFt, initials, phoneHref } from "@/lib/format";
import { useData, useMutate, useSubject, useToast } from "@/lib/data";
import { Chips, CountUp, Empty, Icon, Ring, Skeleton } from "@/components/ui";
import { TaskRow, haptic } from "./TaskRow";
import { TaskDetail } from "./TaskDetail";
import { TopBar, useShell, useUrlState } from "./Shell";

type Filter = "open" | "over" | "today" | "week" | "done";

export function TodayView() {
  const data = useData(); const { layout, openCapture, demo } = useShell(); const { get, set } = useUrlState();
  const subject = useSubject(); const mutate = useMutate(); const toast = useToast();
  const [filter, setFilter] = useState<Filter>("open"); const [day, setDay] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string> | null>(null); const [closed, setClosed] = useState<Set<string>>(new Set());
  const t = todayISO(); const selId = get("t");
  const open = useMemo(() => (data?.tasks || []).filter(x => x.status === "open").sort((a, b) => a.due_at.localeCompare(b.due_at)), [data]);
  const over = open.filter(x => x.due_at.slice(0, 10) < t), today = open.filter(x => x.due_at.slice(0, 10) === t), week = open.filter(x => { const d = dayDiff(x.due_at); return d > 0 && d <= 7; });
  const tomorrow = open.filter(x => dayDiff(x.due_at) === 1);
  const doneToday = useMemo(() => (data?.tasks || []).filter(x => x.status !== "open" && (x.done_at || "").slice(0, 10) === t), [data, t]);
  const done = useMemo(() => (data?.tasks || []).filter(x => x.status !== "open").sort((a, b) => (b.done_at || b.due_at).localeCompare(a.done_at || a.due_at)).slice(0, 50), [data]);
  const overdueMoney = useMemo(() => over.filter(x => x.type === "invoice").reduce((s, x) => s + Number(x.gross_amount || 0), 0), [over]);
  const outstanding = useMemo(() => open.filter(x => x.type === "invoice").reduce((s, x) => s + Number(x.gross_amount || 0), 0), [open]);
  const next = open[0];
  const weekStart = startOfWeek(t); const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const list = day ? open.filter(x => x.due_at.slice(0, 10) === day) : filter === "over" ? over : filter === "today" ? today : filter === "week" ? week : filter === "done" ? done : open;
  const groups = useMemo(() => { if (filter !== "open" || day) return null; const g: { key: string; label: string; items: Task[] }[] = []; const later = open.filter(x => dayDiff(x.due_at) > 7); if (over.length) g.push({ key: "over", label: "Lejárt", items: over }); if (today.length) g.push({ key: "today", label: "Ma", items: today }); const rest = week.filter(x => dayDiff(x.due_at) > 1); if (tomorrow.length) g.push({ key: "tom", label: "Holnap", items: tomorrow }); if (rest.length) g.push({ key: "week", label: "Ezen a héten", items: rest }); if (later.length) g.push({ key: "later", label: "Később", items: later }); return g; }, [filter, day, open, over, today, week, tomorrow]);
  const calls = useMemo(() => { const m = new Map<string, Task[]>(); [...over, ...today].filter(x => x.type !== "invoice" || true).forEach(x => m.set(x.company_id, [...(m.get(x.company_id) || []), x])); return [...m.entries()].map(([cid, items]) => { const c = data?.companies.find(y => y.id === cid); const k = data?.contacts.find(y => y.company_id === cid && y.is_primary); return { c, phone: k?.phone || c?.phone, who: k?.name, items }; }).filter(x => x.c); }, [over, today, data]);
  const base = demo ? "/demo" : "/app";
  const toggle = (id: string) => setSel(s => { const n = new Set(s || []); if (n.has(id)) n.delete(id); else n.add(id); return n.size ? n : null; });
  const bulk = async (kind: "done" | "snooze") => {
    if (!sel) return; const ids = [...sel]; setSel(null); haptic(kind === "done" ? "ok" : "tap");
    for (const id of ids) { const x = data?.tasks.find(y => y.id === id); if (!x) continue; if (kind === "done") await mutate(r => x.type === "invoice" ? r.task.update(id, { paid_at: t, status: "done", done_at: new Date().toISOString() }) : r.task.complete(id)); else await mutate(r => r.task.snooze(id, 1)); }
    toast(kind === "done" ? `${ids.length} tétel elvégezve` : `${ids.length} tétel holnapra halasztva`, "ok", kind === "done" ? { label: "Visszavonás", fn: () => ids.forEach(id => mutate(r => r.task.reopen(id))) } : undefined);
  };
  const complete = (x: Task) => { haptic("ok"); mutate(r => r.task.complete(x.id), { optimistic: s => { const y = s.tasks.find(z => z.id === x.id); if (y) y.status = "done"; return s; } }).then(() => toast("Elvégezve", "ok", { label: "Visszavonás", fn: () => mutate(r => r.task.reopen(x.id)) })); };

  if (!data) return <><TopBar title="Teendő" /><div className="content"><Skeleton n={4} h={72} /></div></>;
  const onboarding = data.companies.length === 0 && data.tasks.length === 0;
  const dueToday = today.length + over.length; const progress = doneToday.length + dueToday ? Math.round(100 * doneToday.length / (doneToday.length + dueToday)) : 0;
  const first = data.profile.full_name?.split(" ")[0] || "";
  const row = (x: Task) => <TaskRow key={x.id} t={x} selected={selId === x.id} compact={layout === "desktop"} selectMode={!!sel} checked={!!sel?.has(x.id)} onToggle={() => toggle(x.id)} onLongPress={() => toggle(x.id)} />;
  const sumParts = [today.length && <span key="a"><b>{today.length}</b> mai teendő</span>, over.length && <span key="b" className="r"><b>{over.length}</b> lejárt</span>, overdueMoney > 0 && <span key="c" className="r"><b>{fmtFt(overdueMoney)}</b> lejárt számla</span>].filter(Boolean);

  const listPane = (
    <div className="content">
      {!onboarding && layout !== "desktop" && (
        <section className="daycard">
          <div><div className="dt">{fmtLong(new Date())}</div><h2>{greet()}{first ? `, ${first}` : ""}</h2></div>
          <div className="sum">{sumParts.length ? sumParts.reduce<React.ReactNode[]>((a, p, i) => i ? [...a, " · ", p] : [p], []) : <>Mára nincs nyitott teendő.{tomorrow.length ? ` Holnap ${tomorrow.length} tétel jön.` : ""}</>}</div>
          {(doneToday.length + dueToday) > 0 && <><div className="bar" aria-hidden><i style={{ width: `${progress}%` }} /></div><div className="pr"><span>Mai haladás</span><span className="mono">{doneToday.length} / {doneToday.length + dueToday}</span></div></>}
        </section>
      )}
      {onboarding && <Onboard />}
      {!onboarding && dueToday === 0 && doneToday.length > 0 && filter === "open" && !day && <div className="alldone"><span className="ck">{Icon.check(28)}</span><h3>Ma minden kész</h3><p>{tomorrow.length ? `Holnap ${tomorrow.length} tétel vár: ${tomorrow.slice(0, 2).map(x => TASK_META[x.type].short).join(", ")}${tomorrow.length > 2 ? "…" : ""}` : "Holnapra sincs határidő."}</p></div>}
      {next && !onboarding && dueToday > 0 && (
        <button className={`nextup ${TASK_META[next.type].cls} ${dayDiff(next.due_at) < 0 ? "over" : ""}`} onClick={() => set({ t: next.id })}>
          <span>
            <span className="k">Következő teendő</span>
            <span className="when" style={{ display: "block" }}>{(() => { const d = dayDiff(next.due_at); return d < 0 ? <><em>{-d} napja</em> lejárt</> : d === 0 ? <>Ma {!next.all_day && <em>{timeOf(next.due_at)}</em>}</> : d === 1 ? <>Holnap {!next.all_day && <em>{timeOf(next.due_at)}</em>}</> : <><em>{d}</em> nap múlva</>; })()}</span>
            <span className="t" style={{ display: "block" }}>{TASK_META[next.type].name}</span>
            <span className="m" style={{ display: "block" }}>{subject(next)} · {fmtDate(next.due_at)}</span>
            <span className="acts"><span className="btn ok sm" role="button" tabIndex={0} onClick={e => { e.stopPropagation(); complete(next); }} onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); complete(next); } }}>{Icon.check(16)} {next.type === "invoice" ? "Kifizetve" : "Elvégezve"}</span><span className="btn secondary sm">Megnyitás</span></span>
          </span>
          <Ring pct={ringPct(next)} size={72} tone={dayDiff(next.due_at) < 0 ? "over" : undefined} cls={TASK_META[next.type].cls}><div style={{ textAlign: "center" }}><div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{dayDiff(next.due_at) < 0 ? "!" : Math.abs(dayDiff(next.due_at))}</div><div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800 }}>{dayDiff(next.due_at) < 0 ? "lejárt" : "nap"}</div></div></Ring>
        </button>
      )}
      {!onboarding && <div className="stats">
        <button className="stat danger" onClick={() => { setDay(null); setFilter("over"); }}><div className="v"><CountUp value={over.length} /></div><div className="l">Lejárt</div></button>
        <button className="stat time" onClick={() => { setDay(null); setFilter("today"); }}><div className="v"><CountUp value={today.length} /></div><div className="l">Ma esedékes</div></button>
        <button className="stat accent" onClick={() => { setDay(null); setFilter("week"); }}><div className="v"><CountUp value={week.length} /></div><div className="l">7 napon belül</div></button>
        {layout === "desktop" && <Link className="stat" href={`${base}/szamlak`}><div className="v" style={{ fontSize: 20 }}>{fmtFt(outstanding)}</div><div className="l">Kintlévőség</div></Link>}
      </div>}
      {!onboarding && <div className="weekstrip">{days.map(d => { const items = open.filter(x => x.due_at.slice(0, 10) === d); const dd = parseISODate(d); const hasOver = d < t && items.length > 0; return <button key={d} aria-pressed={day === d} className={`${d === t ? "today" : ""} ${hasOver ? "hasover" : ""}`} onClick={() => { setDay(day === d ? null : d); setFilter("open"); }} aria-label={`${fmtLong(dd)}: ${items.length} tétel`}><span>{DAYS_SHORT[dd.getDay()]}</span><b>{dd.getDate()}</b><span className="cn">{items.length || ""}</span></button>; })}</div>}
      {!onboarding && layout !== "desktop" && calls.length > 0 && filter === "open" && !day && <>
        <div className="sec"><h2>Kit hívjak ma?</h2><span className="n">{calls.length}</span></div>
        <div className="calls">{calls.slice(0, 4).map(({ c, phone, who, items }) => <div key={c!.id} className="callrow">
          <span className="avatar">{initials(c!.name)}</span>
          <Link href={`${base}/ugyfelek/${c!.id}`} style={{ minWidth: 0, textDecoration: "none", color: "inherit" }}><div className="n">{c!.name}</div><div className="m">{who ? `${who} · ` : ""}{items.length} tétel: {[...new Set(items.map(i => TASK_META[i.type].short))].join(", ")}</div></Link>
          {phone ? <span className="acts"><a className="sms" href={`sms:${phone.replace(/[^+\d]/g, "")}?body=${encodeURIComponent(smsText(c!.name, items, data.workspace.name, subject))}`} aria-label="SMS">{Icon.mail(17)}</a><a href={phoneHref(phone)} aria-label="Hívás">{Icon.phone(17)}</a></span> : <span />}
        </div>)}</div>
      </>}
      {!onboarding && <Chips value={day ? "open" : filter} onChange={f => { setDay(null); setFilter(f); }} options={[{ value: "open", label: "Összes", count: open.length }, { value: "over", label: "Lejárt", count: over.length }, { value: "today", label: "Ma", count: today.length }, { value: "week", label: "7 nap", count: week.length }, { value: "done", label: "Elvégzett" }]} />}
      {day && <div className="sec" style={{ marginTop: 4 }}><h2>{fmtLong(parseISODate(day))}</h2><button className="btn quiet sm" onClick={() => setDay(null)}>Összes</button></div>}
      {groups ? groups.map(g => { const isClosed = g.key !== "over" && closed.has(g.key); return <div key={g.key}>
          <button className={`grp-h ${g.key === "over" ? "over" : ""}`} aria-expanded={!isClosed} disabled={g.key === "over"} onClick={() => setClosed(s => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}><h2>{g.label} <span className="k">{g.items.length}</span></h2>{g.key !== "over" && Icon.chevD(16)}</button>
          {!isClosed && <div className="list" style={{ marginTop: 8 }}>{g.items.map(row)}</div>}
        </div>; })
        : list.length ? <div className="list">{list.map(row)}</div>
        : !onboarding && <Empty icon={Icon.check(28)} title={filter === "over" ? "Nincs lejárt tétel" : filter === "today" ? "Ma nincs teendő" : filter === "done" ? "Még nincs elvégzett tétel" : day ? "Ezen a napon nincs teendő" : "Nincs nyitott teendő"} text={filter === "open" && !day ? "Rögzítsen egy letöltést, oktatást vagy számlát a + gombbal." : undefined} action={filter === "open" && !day ? <button className="btn primary sm" onClick={() => openCapture()}>{Icon.plus(16)} Új rögzítés</button> : undefined} />}
      {!onboarding && !sel && layout !== "desktop" && open.length > 1 && <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--faint)" }}>Tipp: tartsa nyomva egy tételt, és többet is lezárhat egyszerre.</p>}
      {sel && <div className="selbar" role="toolbar"><b>{sel.size} kijelölve</b><button className="btn on" onClick={() => bulk("done")}>{Icon.check(16)} Kész</button><button className="btn secondary" onClick={() => bulk("snooze")}>Holnapra</button><button className="btn tr" onClick={() => setSel(null)} aria-label="Mégse">{Icon.x(16)}</button></div>}
    </div>
  );
  const detail = selId ? data.tasks.find(x => x.id === selId) : undefined;
  return <>
    <TopBar title={layout === "desktop" ? `${greet()}${first ? `, ${first}` : ""}` : "Teendő"} sub={layout === "desktop" ? `${fmtLong(new Date())} · ${dueToday ? `${dueToday} mai vagy lejárt tétel` : "mára minden kész"}` : undefined} actions={layout !== "phone" ? <button className="btn primary sm" onClick={() => openCapture()}>{Icon.plus(16)} Új</button> : undefined} />
    {layout === "phone" ? listPane : (
      <div className="split">
        <div className="pane">{listPane}</div>
        <div className="pane detail">{detail ? <div className="inner"><TaskDetail t={detail} onDone={() => set({ t: null })} /></div> : <SidePlaceholder calls={calls} progress={progress} doneToday={doneToday.length} dueToday={dueToday} />}</div>
      </div>
    )}
  </>;
}
function smsText(company: string, items: Task[], ws: string, subject: (t: Task) => string) {
  const lines = items.slice(0, 4).map(i => `${TASK_META[i.type].short}: ${subject(i).split(" · ").slice(1).join(" · ") || fmtDate(i.due_at)} (${fmtDate(i.due_at)})`);
  return `Tisztelt ${company}! Emlékeztetjük az esedékes tételekre: ${lines.join("; ")}. Kérjük, egyeztessünk időpontot. Üdvözlettel: ${ws}`;
}
function ringPct(t: Task) { const base = t.base_date ? parseISODate(t.base_date).getTime() : new Date(t.created_at).getTime(); const end = new Date(t.due_at).getTime(); return Math.max(4, Math.min(100, Math.round(100 * (Date.now() - base) / Math.max(1, end - base)))); }
function greet() { const h = new Date().getHours(); return h < 5 ? "Jó éjszakát" : h < 10 ? "Jó reggelt" : h < 18 ? "Jó napot" : "Jó estét"; }

function SidePlaceholder({ calls, progress, doneToday, dueToday }: { calls: { c: { id: string; name: string } | undefined; phone?: string | null; who?: string; items: Task[] }[]; progress: number; doneToday: number; dueToday: number }) {
  const { demo } = useShell(); const base = demo ? "/demo" : "/app"; const subject = useSubject();
  return <div className="inner" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <section className="daycard"><div className="dt">Mai haladás</div><div className="bar"><i style={{ width: `${progress}%` }} /></div><div className="pr"><span>{doneToday} kész</span><span>{dueToday} hátra</span></div></section>
    <div className="sec" style={{ marginTop: 6 }}><h2>Kit kell ma felhívni</h2><span className="n">{calls.length}</span></div>
    {calls.length === 0 ? <div className="info">{Icon.check()}<span>Nincs lejárt vagy mai határidő. Válasszon egy tételt balról a részletekhez.</span></div>
      : <div className="calls">{calls.map(({ c, phone, who, items }) => <div key={c!.id} className="callrow">
        <span className="avatar">{initials(c!.name)}</span>
        <div style={{ minWidth: 0 }}><Link href={`${base}/ugyfelek/${c!.id}`} className="n" style={{ textDecoration: "none", color: "inherit", display: "block" }}>{c!.name}</Link><div className="m">{who ? `${who} · ` : ""}{items.map(i => `${TASK_META[i.type].short} · ${subject(i).split(" · ").slice(1).join(" · ") || fmtDate(i.due_at)}`).join(" · ")}</div></div>
        {phone ? <span className="acts"><a href={phoneHref(phone)} aria-label="Hívás">{Icon.phone(17)}</a></span> : <span />}
      </div>)}</div>}
    <div className="info">{Icon.info()}<span><b>Gyorsbillentyűk:</b> N új rögzítés · / keresés · J/K lépkedés · E elvégezve · ? súgó.</span></div>
  </div>;
}

function Onboard() {
  const { openCapture, demo } = useShell(); const base = demo ? "/demo" : "/app";
  return <div className="card pad" style={{ background: "linear-gradient(160deg, var(--accent-soft), var(--surface))" }}>
    <h3 style={{ fontSize: 18 }}>Kezdjük el három lépésben</h3>
    <ol style={{ margin: "12px 0 16px", paddingLeft: 20, display: "grid", gap: 8, color: "var(--muted)", fontSize: 14 }}>
      <li><b style={{ color: "var(--fg)" }}>Cég rögzítése</b> – név és adószám.</li>
      <li><b style={{ color: "var(--fg)" }}>Gépkocsivezetők és járművek</b> – a céghez tartozó nevek és rendszámok.</li>
      <li><b style={{ color: "var(--fg)" }}>Első emlékeztető</b> – letöltés, oktatás vagy számla; a határidőt az app számolja.</li>
    </ol>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn primary" onClick={() => openCapture("company")}>{Icon.plus(18)} Első cég</button><Link className="btn ghost" href={`${base}/import`}>{Icon.upload(18)} Excel importálása</Link></div>
  </div>;
}
