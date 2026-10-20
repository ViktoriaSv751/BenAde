"use client";
import { useMemo, useState } from "react";
import type { Task, TaskType } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import { DAYS_SHORT, MONTHS, addDays, addMonths, dayDiff, fmtLong, isoWeek, monthGrid, parseISODate, startOfWeek, timeOf, todayISO } from "@/lib/date";
import { useData, useMutate, useSubject, useSubjectParts } from "@/lib/data";
import { ActionSheet, Empty, Icon, Seg, Skeleton, TypeIcon } from "@/components/ui";
import { TaskRow } from "./TaskRow";
import { TaskDetail } from "./TaskDetail";
import { TopBar, useShell, useUrlState } from "./Shell";
import { isLocked, lockedBlock, rotaActive, setDays } from "@/lib/rota";
import { shortDay } from "@/components/DateTime";
import { gcalSubscribeUrl } from "@/lib/gcal";
import Link from "next/link";

type Mode = "month" | "week" | "day";
const TYPES: { v: TaskType | "all"; l: string }[] = [{ v: "all", l: "Mind" }, { v: "vu_download", l: "Fedélzeti" }, { v: "card_download", l: "Kártya" }, { v: "training", l: "Oktatás" }, { v: "invoice", l: "Számla" }, { v: "calibration", l: "Kalibráció" }, { v: "card_expiry", l: "Kártya lej." }];

export function CalendarView() {
  const data = useData(); const { layout, openCapture } = useShell(); const { get, set } = useUrlState(); const subject = useSubject(); const parts = useSubjectParts(); const mutate = useMutate();
  const t = todayISO();
  const [cursor, setCursor] = useState(get("d") || t); const [mode, setMode] = useState<Mode>(layout === "phone" ? "week" : "month");
  const [type, setType] = useState<TaskType | "all">("all"); const [cid, setCid] = useState(""); const [showDone, setShowDone] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const sel = get("t");
  const tasks = useMemo(() => (data?.tasks || []).filter(x => (showDone || x.status === "open") && (type === "all" || x.type === type) && (!cid || x.company_id === cid)), [data, type, cid, showDone]);
  const byDay = useMemo(() => { const m = new Map<string, Task[]>(); for (const x of tasks) { const k = x.due_at.slice(0, 10); m.set(k, [...(m.get(k) || []), x]); } for (const v of m.values()) v.sort((a, b) => a.due_at.localeCompare(b.due_at)); return m; }, [tasks]);
  const cd = parseISODate(cursor);
  const grid = useMemo(() => monthGrid(cd.getFullYear(), cd.getMonth()), [cd]);
  const weekDays = useMemo(() => { const s = startOfWeek(cursor); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }, [cursor]);
  const title = mode === "month" ? `${cd.getFullYear()}. ${MONTHS[cd.getMonth()]}` : mode === "week" ? `${cd.getFullYear()}. ${MONTHS[parseISODate(weekDays[0]).getMonth()]} · ${isoWeek(cursor)}. hét` : fmtLong(cd);
  const nav = (n: number) => setCursor(mode === "month" ? addMonths(cursor, n) : addDays(cursor, mode === "week" ? 7 * n : n));
  const dayList = byDay.get(cursor) || [];
  const onDrop = async (day: string) => { if (!drag) return; const x = data!.tasks.find(y => y.id === drag); setDrag(null); if (!x || x.due_at.slice(0, 10) === day) return; const tm = timeOf(x.due_at); const shift = (new Date(`${day}T00:00`).getTime() - new Date(`${x.due_at.slice(0, 10)}T00:00`).getTime()); await mutate(r => r.task.update(x.id, { due_at: new Date(`${day}T${tm}`).toISOString(), remind_at: x.remind_at.map(rr => new Date(new Date(rr).getTime() + shift).toISOString()) }), { success: "Átütemezve" }); };

  if (!data) return <><TopBar title="Naptár" /><div className="content"><Skeleton n={3} h={120} /></div></>;

  const monthGridEl = (
    <div className={`cal ${layout === "phone" ? "compact" : ""}`}>
      <div className="head">{["H", "K", "Sze", "Cs", "P", "Szo", "V"].map(d => <div key={d}>{d}</div>)}</div>
      <div className="grid">{grid.map(d => { const dd = parseISODate(d); const items = byDay.get(d) || []; const out = dd.getMonth() !== cd.getMonth(); const max = layout === "phone" ? 0 : 3;
        const open = items.filter(x => x.status === "open").length; const heat = out ? 0 : open >= 6 ? 3 : open >= 3 ? 2 : open >= 1 ? 1 : 0; const wk = dd.getDay() === 0 || dd.getDay() === 6;
        return <button key={d} data-heat={heat || undefined} className={`cell ${out ? "out" : ""} ${d === t ? "today" : ""} ${wk ? "wkend" : ""} ${isLocked(d) ? "locked" : ""}`} aria-selected={cursor === d} onClick={() => setCursor(d)} onDragOver={e => { if (drag) e.preventDefault(); }} onDrop={() => onDrop(d)}>
          <span className="d">{dd.getDate()}</span>
          {max > 0 && items.slice(0, max).map(x => <span key={x.id} className={`ev ${TASK_META[x.type].cls} ${x.status === "open" && x.due_at.slice(0, 10) < t ? "over" : ""}`} draggable onDragStart={e => { setDrag(x.id); e.stopPropagation(); }} onClick={e => { e.stopPropagation(); set({ t: x.id }); }}>{!x.all_day && <span className="tm">{timeOf(x.due_at)}</span>}<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{subject(x).split(" · ").pop()}</span></span>)}
          {max > 0 && items.length > max && <span className="more">+{items.length - max} további</span>}
          {max === 0 && items.length > 0 && <span className="dots">{items.slice(0, 4).map(x => <i key={x.id} className={TASK_META[x.type].cls} />)}</span>}
        </button>; })}</div>
    </div>
  );
  const weekEl = (
    <div className="cal">
      <div className="head">{weekDays.map(d => { const dd = parseISODate(d); return <div key={d} style={{ color: d === t ? "var(--accent)" : undefined }}>{DAYS_SHORT[dd.getDay()]} <b className="mono">{dd.getDate()}</b></div>; })}</div>
      <div className="grid">{weekDays.map(d => { const items = byDay.get(d) || []; return <div key={d} className={`cell ${d === t ? "today" : ""} ${isLocked(d) ? "locked" : ""}`} style={{ minHeight: 220 }} onDragOver={e => { if (drag) e.preventDefault(); }} onDrop={() => onDrop(d)}>
        {items.length === 0 && <span style={{ color: "var(--faint)", fontSize: 12 }}>–</span>}
        {items.map(x => <button key={x.id} className={`ev ${TASK_META[x.type].cls} ${x.status === "open" && d < t ? "over" : ""}`} style={{ whiteSpace: "normal", textAlign: "left", alignItems: "flex-start", flexDirection: "column", gap: 1, padding: "5px 7px" }} draggable onDragStart={() => setDrag(x.id)} onClick={() => set({ t: x.id })}><span className="tm">{x.all_day ? "egész nap" : timeOf(x.due_at)} · {TASK_META[x.type].short}</span>{parts(x).map((p, i) => <span key={i}>{p}</span>)}</button>)}
      </div>; })}</div>
    </div>
  );
  const stops = [...new Set(dayList.filter(x => x.status === "open").map(x => x.type === "training" && x.address ? x.address : data?.companies.find(c => c.id === x.company_id)?.address).filter(Boolean) as string[])];
  const routeUrl = stops.length ? `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(stops[stops.length - 1])}${stops.length > 1 ? `&waypoints=${encodeURIComponent(stops.slice(0, -1).join("|"))}` : ""}` : null;
  const dayEl = <div className="list">{routeUrl && <a className="btn ghost sm" style={{ alignSelf: "flex-start" }} href={routeUrl} target="_blank" rel="noopener">{Icon.pin(15)} Útvonal a nap címeihez ({stops.length})</a>}{dayList.length ? dayList.map(x => <TaskRow key={x.id} t={x} selected={sel === x.id} compact={layout === "desktop"} />) : <Empty icon={Icon.calendar(26)} title="Ezen a napon nincs teendő" action={<button className="btn primary sm" onClick={() => openCapture()}>{Icon.plus(16)} Rögzítés erre a napra</button>} />}</div>;

  const shortTitle = mode === "month" ? `${cd.getFullYear()}. ${MONTHS[cd.getMonth()]}` : mode === "week" ? `${MONTHS[parseISODate(weekDays[0]).getMonth()].slice(0, 3)}. ${parseISODate(weekDays[0]).getDate()}–${parseISODate(weekDays[6]).getDate()}. · ${isoWeek(cursor)}. hét` : fmtLong(cd);
  const phoneWeek = (
    <div className="weekstrip cal-week">{weekDays.map(d => { const dd = parseISODate(d); const items = byDay.get(d) || []; return <button key={d} aria-pressed={cursor === d} className={`${d === t ? "today" : ""} ${isLocked(d) ? "locked" : ""}`} onClick={() => setCursor(d)}><span>{DAYS_SHORT[dd.getDay()]}</span><b>{dd.getDate()}</b><span className="dots">{items.slice(0, 3).map(x => <i key={x.id} className={TASK_META[x.type].cls} />)}</span></button>; })}</div>
  );
  const filters = (
    <div className={layout === "phone" ? "filterrow" : "chips"} style={layout === "phone" ? undefined : { flex: 1 }}>
      {TYPES.map(x => <button key={x.v} className="chip" aria-pressed={type === x.v} onClick={() => setType(x.v)}>{x.v !== "all" && <TypeIcon type={x.v} size={14} />}{x.l}</button>)}
      <select className="ctl" style={layout === "phone" ? undefined : { width: "auto", minHeight: 36, padding: "4px 34px 4px 12px", fontSize: 13 }} value={cid} onChange={e => setCid(e.target.value)}><option value="">Minden cég</option>{data.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="chip" aria-pressed={showDone} onClick={() => setShowDone(s => !s)}>Elvégzettek is</button>
    </div>
  );
  const main = layout === "phone" ? (
    <div className="content">
      <div className="calbar">
        <h2>{shortTitle}</h2>
        {cursor !== t && <button className="today-btn" onClick={() => setCursor(t)}>Ma</button>}
        <button className="ibtn" onClick={() => nav(-1)} aria-label="Előző">{Icon.chevL()}</button>
        <button className="ibtn" onClick={() => nav(1)} aria-label="Következő">{Icon.chev()}</button>
      </div>
      <Seg value={mode} onChange={setMode} options={[{ value: "month", label: "Hónap" }, { value: "week", label: "Hét" }, { value: "day", label: "Nap" }]} />
      {filters}
      {mode === "month" && monthGridEl}
      {mode === "week" && phoneWeek}
      <div className="sec" style={{ marginTop: mode === "day" ? 4 : 14 }}><h2>{fmtLong(cd)}</h2><span className="n">{dayList.length}</span></div>
      <DayLock day={cursor} />
      {dayEl}
      <CalTools />
    </div>
  ) : (
    <div className="content">
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button className="ibtn" onClick={() => nav(-1)} aria-label="Előző">{Icon.chevL()}</button>
        <button className="ibtn" onClick={() => nav(1)} aria-label="Következő">{Icon.chev()}</button>
        <h2 style={{ fontSize: 18, flex: 1, minWidth: 0 }}>{title}</h2>
        <button className="btn ghost sm" onClick={() => setCursor(t)}>Ma</button>
        <Seg value={mode} onChange={setMode} options={[{ value: "month", label: "Hónap" }, { value: "week", label: "Hét" }, { value: "day", label: "Nap" }]} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{filters}</div>
      {mode === "month" ? monthGridEl : mode === "week" ? weekEl : <><div className="sec" style={{ marginTop: 4 }}><h2>{fmtLong(cd)}</h2><span className="n">{dayList.length}</span></div><DayLock day={cursor} />{dayEl}</>}
      <CalTools />
      <div className="info">{Icon.info()}<span>Húzással áthelyezheti a tételeket másik napra (az emlékeztetők is eltolódnak). A jogi határidőt a lezáráskor számolt ciklus adja – azt a tétel részleteiben lehet felülírni.</span></div>
    </div>
  );
  const detail = sel ? data.tasks.find(x => x.id === sel) : undefined;
  return <>
    <TopBar title="Naptár" sub={layout === "desktop" ? `${tasks.filter(x => x.status === "open").length} nyitott tétel` : undefined} actions={layout !== "phone" ? <button className="btn primary sm" onClick={() => openCapture()}>{Icon.plus(16)} Új</button> : undefined} />
    {layout === "phone" ? main : <div className="split wide"><div className="pane">{main}</div><div className="pane detail">{detail ? <div className="inner"><TaskDetail t={detail} onDone={() => set({ t: null })} /></div> : <div className="inner"><div className="sec" style={{ marginTop: 0 }}><h2>{fmtLong(cd)}</h2><span className="n">{dayList.length}</span></div><div style={{ marginTop: 10 }}><DayLock day={cursor} />{dayEl}</div></div>}</div></div>}
  </>;
}

/** Locked-day bar under the selected day: shows why it is locked; the owner can lock it, or mark it as a work day and lock
 *  the next few days in one go ("ezen a napon dolgozom, utána 3 nap lezárva"), and free a day or the whole locked run. */
function DayLock({ day }: { day: string }) {
  const data = useData(); const { role } = useShell(); const mutate = useMutate(); const [sheet, setSheet] = useState(false);
  if (!data) return null;
  const def = data.workspace.defaults; const locked = isLocked(day, def); const canEdit = role === "owner"; const manual = def.dayOverrides?.[day];
  if (!locked && !canEdit) return null;
  const save = (days: string[], lock: boolean, msg: string) => mutate(async r => { await r.workspace.update({ defaults: { ...def, dayOverrides: setDays(def, days, lock, todayISO()) } }); return r.workspace.reapplyLocks(); }, { success: msg });
  const range = (from: string, n: number) => Array.from({ length: n }, (_, k) => addDays(from, k));
  const span = (days: string[]) => { const a = days[0], b = days[days.length - 1]; return days.length === 1 ? shortDay(a) : a.slice(0, 7) === b.slice(0, 7) ? `${shortDay(a).slice(0, -1)}–${parseISODate(b).getDate()}.` : `${shortDay(a)} – ${shortDay(b)}`; };
  const block = locked ? lockedBlock(day, def) : [];
  const options = locked ? [
    { label: "Csak ezt a napot oldom fel", hint: shortDay(day), onPick: () => save([day], false, "Nap feloldva") },
    ...(block.length > 1 ? [{ label: `Az egész lezárt szakasz feloldása (${block.length} nap)`, hint: span(block), onPick: () => save(block, false, `Feloldva: ${span(block)}`) }] : []),
  ] : [
    ...[1, 2, 3, 4, 5, 6, 7].map(n => { const days = range(addDays(day, 1), n);
      return { label: `Utána ${n} nap lezárva`, hint: span(days), onPick: () => save(days, true, `Lezárva: ${span(days)}`) }; }),
    { label: "Csak ezt a napot zárom le", hint: "pl. szabadság", onPick: () => save([day], true, "Nap lezárva – erre a napra nem küldünk emlékeztetőt") },
  ];
  const why = manual === "lock" ? "kézzel lezárva" : rotaActive(def.workRota) ? "munkarend szerint" : "";
  return <div className={`daylock ${locked ? "on" : ""}`}>
    <span className="ic">{locked ? Icon.lock(18) : Icon.unlock(18)}</span>
    <span className="tx">{locked ? <><b>Lezárt nap</b>{why && <small>{why} · az emlékeztetők előtte jönnek</small>}</> : <><b>Munkanap</b>{manual === "free" ? <small>kézzel feloldva</small> : <small>dolgozik ezen a napon? Utána lezárhat pár napot</small>}</>}</span>
    {canEdit && <button type="button" className="btn sm secondary" onClick={() => setSheet(true)}>{locked ? "Feloldás" : "Lezárás"}</button>}
    <ActionSheet open={sheet} onClose={() => setSheet(false)} title={locked ? "Feloldás" : `${shortDay(day)} dolgozom – utána hány nap legyen lezárva?`} sub={locked ? "A feloldott napokra ismét jönnek az emlékeztetők." : "Lezárt napra nem küldünk emlékeztetőt – előtte, munkanapon szólunk."} options={options} />
  </div>;
}

/** Calendar footer: where to set the work pattern, and one-tap Google Calendar sync of every deadline. */
function CalTools() {
  const data = useData(); const { demo, role } = useShell(); const base = demo ? "/demo" : "/app";
  if (!data) return null; const rota = data.workspace.defaults.workRota;
  return <div className="caltools">
    <Link className="btn secondary sm" href={`${base}/beallitasok#munkarend`}>{Icon.lock(16)} {rotaActive(rota) ? `Munkarend: ${rota!.on} nap munka, ${rota!.off} nap lezárva` : role === "owner" ? "Munkarend beállítása (első munkanap)" : "Munkarend"}</Link>
    {!demo && <a className="btn secondary sm" href={gcalSubscribeUrl(data.workspace.ics_token)} target="_blank" rel="noopener">{Icon.calendar(16)} Összes a Google Naptárba</a>}
  </div>;
}
