"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Task, TaskType } from "@/lib/types";
import { MONTHS, todayISO } from "@/lib/date";
import { useData } from "@/lib/data";
import { Chips, Empty, Icon, Pager, Seg, Skeleton, TypeIcon, usePaged } from "@/components/ui";
import { TaskRow } from "./TaskRow";
import { TaskDetail } from "./TaskDetail";
import { TopBar, useShell, useUrlState } from "./Shell";

type TypeF = "all" | "vu_download" | "card_download" | "training" | "other";
type StatusF = "upcoming" | "over" | "done";
const PICK: { k: TaskType; t: string; s: string; cls: string }[] = [
  { k: "vu_download", t: "Fedélzeti egység letöltés", s: "Következő: +90 nap", cls: "t-vu" },
  { k: "card_download", t: "Vezetői kártya letöltés", s: "Következő: +28 nap", cls: "t-card" },
  { k: "training", t: "Oktatás", s: "Értesítés a napján 06:00", cls: "t-training" },
];

/** Emlékeztetők: új emlékeztető (3 fő típus) + minden emlékeztető időrendben, típus- és állapotszűrővel. */
export function RemindersView() {
  const data = useData(); const { layout, openCapture, demo } = useShell(); const { get, set } = useUrlState();
  const [type, setType] = useState<TypeF>("all"); const [status, setStatus] = useState<StatusF>("upcoming");
  const base = demo ? "/demo" : "/app"; const sel = get("t"); const t = todayISO();
  const all = useMemo(() => (data?.tasks || []).filter(x => x.type !== "invoice"), [data]);
  const byType = (x: Task) => type === "all" || (type === "other" ? (x.type === "calibration" || x.type === "card_expiry") : x.type === type);
  const counts = useMemo(() => ({
    upcoming: all.filter(x => x.status === "open" && x.due_at.slice(0, 10) >= t && byType(x)).length,
    over: all.filter(x => x.status === "open" && x.due_at.slice(0, 10) < t && byType(x)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [all, t, type]);
  const list = useMemo(() => {
    const l = all.filter(byType).filter(x => status === "done" ? x.status !== "open" : x.status === "open" && (status === "over" ? x.due_at.slice(0, 10) < t : x.due_at.slice(0, 10) >= t));
    return status === "done" ? l.sort((a, b) => (b.done_at || b.due_at).localeCompare(a.done_at || a.due_at)).slice(0, 80) : l.sort((a, b) => a.due_at.localeCompare(b.due_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, type, status, t]);
  const pg = usePaged(list, 10, `${type}|${status}`); const anchor = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => { const g: { k: string; label: string; items: Task[] }[] = []; for (const x of pg.slice) { const d = new Date(status === "done" ? (x.done_at || x.due_at) : x.due_at); const k = `${d.getFullYear()}-${d.getMonth()}`; let grp = g.find(y => y.k === k); if (!grp) { grp = { k, label: `${d.getFullYear()}. ${MONTHS[d.getMonth()]}`, items: [] }; g.push(grp); } grp.items.push(x); } return g; }, [pg.slice, status]);

  if (!data) return <><TopBar title="Emlékeztetők" /><div className="content"><Skeleton n={4} h={72} /></div></>;
  const typeCount = (k: TypeF) => all.filter(x => x.status === "open" && (k === "all" || (k === "other" ? (x.type === "calibration" || x.type === "card_expiry") : x.type === k))).length;
  const pane = (
    <div className="content">
      <div className="sec" style={{ marginTop: 0 }}><h2>Új emlékeztető</h2></div>
      <div className="pick3">{PICK.map(p => <button key={p.k} className={`rpick ${p.cls}`} onClick={() => openCapture(p.k)}><span className="ico"><TypeIcon type={p.k} size={26} /></span><span className="tx"><b>{p.t}</b><span>{p.s}</span></span><span className="go">{Icon.chev(18)}</span></button>)}</div>
      <div className="minor"><button className="chip" onClick={() => openCapture("calibration")}>{Icon.gauge(15)} Kalibráció</button><button className="chip" onClick={() => openCapture("card_expiry")}>{Icon.idcard(15)} Kártya lejárat</button>{layout === "phone" && <Link className="chip" href={`${base}/naptar`}>{Icon.calendar(15)} Naptár nézet</Link>}</div>
      <div className="sec"><h2>Emlékeztetők időrendben</h2><span className="n">{list.length}</span></div>
      <Seg value={status} onChange={setStatus} options={[{ value: "upcoming", label: "Közelgő", count: counts.upcoming }, { value: "over", label: "Lejárt", count: counts.over }, { value: "done", label: "Elvégzett" }]} />
      <div className="filterrow"><Chips value={type} onChange={setType} options={[{ value: "all", label: "Összes", count: typeCount("all") }, { value: "vu_download", label: "Fedélzeti egység", count: typeCount("vu_download") }, { value: "card_download", label: "Vezetői kártya", count: typeCount("card_download") }, { value: "training", label: "Oktatás", count: typeCount("training") }, { value: "other", label: "Egyéb", count: typeCount("other") }]} /></div>
      <div ref={anchor} style={{ scrollMarginTop: 12 }} />
      {groups.length === 0 ? <Empty icon={Icon.bell(26)} title={status === "over" ? "Nincs lejárt emlékeztető" : status === "done" ? "Még nincs elvégzett tétel" : "Nincs közelgő emlékeztető"} text={status === "upcoming" ? "Válasszon fent egy típust, és rögzítse az elsőt." : undefined} />
        : groups.map(g => <div key={g.k}><div className="sec" style={{ marginTop: 6 }}><h2 className="month">{g.label}</h2><span className="n">{g.items.length}</span></div><div className="list" style={{ marginTop: 8 }}>{g.items.map(x => <TaskRow key={x.id} t={x} selected={sel === x.id} />)}</div></div>)}
      <Pager {...pg} anchor={anchor} />
    </div>
  );
  const detail = sel ? data.tasks.find(x => x.id === sel) : undefined;
  return <>
    <TopBar title="Emlékeztetők" sub={layout === "desktop" ? `${typeCount("all")} nyitott emlékeztető` : undefined} actions={layout !== "phone" ? <button className="btn primary sm" onClick={() => openCapture("menu")}>{Icon.plus(16)} Új emlékeztető</button> : <Link className="ibtn" href={`${base}/naptar`} aria-label="Naptár">{Icon.calendar(19)}</Link>} />
    {layout === "phone" ? pane : <div className="split"><div className="pane">{pane}</div><div className="pane detail">{detail ? <div className="inner"><TaskDetail t={detail} onDone={() => set({ t: null })} /></div> : <div className="placeholder"><div>{Icon.bell(40)}<p style={{ marginTop: 10 }}>Válasszon egy emlékeztetőt a részletekhez.</p></div></div>}</div></div>}
  </>;
}
