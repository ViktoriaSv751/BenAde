"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Activity, Task } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import { dayDiff, fmtDate, fmtDT, relLabel, timeOf, todayISO } from "@/lib/date";
import { fmtFt, phoneHref } from "@/lib/format";
import { useData, useMutate, useRepo, useToast, useUndoableRemove } from "@/lib/data";
import { Icon, Panel, Ring, TypeIcon, useConfirm } from "@/components/ui";
import { ActionSheet } from "@/components/ui";
import { useShell, useUrlState } from "./Shell";
import { gcalEventUrl } from "@/lib/gcal";

export function TaskDetailPanel({ id, onClose }: { id: string | null; onClose: () => void }) {
  const data = useData(); const { layout, demo } = useShell(); const path = usePathname();
  const t = id ? data?.tasks.find(x => x.id === id) : undefined;
  const base = demo ? "/demo" : "/app";
  const inlinePages = [base, `${base}/naptar`, `${base}/szamlak`, `${base}/emlekeztetok`];
  // tablet/desktop pages with an inline detail pane render the detail themselves
  if (!id || (layout !== "phone" && inlinePages.includes(path))) return null;
  return <Panel open={!!id} onClose={onClose} title={t ? TASK_META[t.type].short : "Tétel"} wide={layout !== "phone"}>{t ? <TaskDetail t={t} onDone={onClose} /> : <div className="empty"><h3>Ez a tétel már nem létezik.</h3></div>}</Panel>;
}

export function TaskDetail({ t, onDone }: { t: Task; onDone?: () => void }) {
  const data = useData()!; const mutate = useMutate(); const removeLater = useUndoableRemove(); const toast = useToast(); const repo = useRepo(); const { set } = useUrlState(); const { demo } = useShell();
  const { confirmEl } = useConfirm();
  const meta = TASK_META[t.type]; const rel = relLabel(t.due_at); const done = t.status !== "open"; const d = dayDiff(t.due_at);
  const company = data.companies.find(c => c.id === t.company_id); const vehicle = data.vehicles.find(v => v.id === t.vehicle_id); const driver = data.drivers.find(x => x.id === t.driver_id);
  const base = t.base_date ? new Date(t.base_date).getTime() : new Date(t.created_at).getTime(); const end = new Date(t.due_at).getTime();
  const pct = done ? 100 : Math.max(4, Math.min(100, Math.round(100 * (Date.now() - base) / Math.max(1, end - base))));
  const [act, setAct] = useState<Activity[]>([]);
  useEffect(() => { repo.activity(20, t.id).then(setAct).catch(() => {}); }, [repo, t.id, t.updated_at]);
  const prefix = demo ? "/demo" : "/app";
  const schedule = data.schedules.find(s => s.id === t.schedule_id);
  const history = data.tasks.filter(x => x.schedule_id && x.schedule_id === t.schedule_id && x.id !== t.id).sort((a, b) => b.due_at.localeCompare(a.due_at)).slice(0, 5);

  const complete = async () => {
    await mutate(r => r.task.complete(t.id), { optimistic: s => { const x = s.tasks.find(y => y.id === t.id); if (x) { x.status = "done"; x.done_at = new Date().toISOString(); } return s; } });
    toast(schedule ? "Elvégezve – a következő ciklus létrejött" : "Elvégezve", "ok", { label: "Visszavonás", fn: () => mutate(r => r.task.reopen(t.id)) });
    onDone?.();
  };
  const pay = async () => { await mutate(r => r.task.update(t.id, { paid_at: todayISO(), status: "done", done_at: new Date().toISOString() }), { success: "Számla kifizetve" }); onDone?.(); };
  const unpay = () => mutate(r => r.task.update(t.id, { paid_at: null, status: "open", done_at: null }));
  const snooze = (days: number) => mutate(r => r.task.snooze(t.id, days), { success: `Emlékeztető ${days === 1 ? "holnapra" : days + " nappal"} halasztva` });
  const remove = () => { removeLater(`${meta.short} törölve`, s => { s.tasks = s.tasks.filter(x => x.id !== t.id); return s; }, r => r.task.remove(t.id)); onDone?.(); };
  const edit = () => set({ uj: t.type, edit: t.id, t: null });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {confirmEl}
      <div className={`nextup ${meta.cls} ${!done && d < 0 ? "over" : ""}`} style={{ cursor: "default" }}>
        <div>
          <div className="k">{meta.name}</div>
          <div className="when">{done ? "Elvégezve" : d < 0 ? <><em>{-d} napja</em> lejárt</> : d === 0 ? <>Ma {!t.all_day && <em>{timeOf(t.due_at)}</em>}</> : d === 1 ? <>Holnap {!t.all_day && <em>{timeOf(t.due_at)}</em>}</> : <><em>{d}</em> nap múlva</>}</div>
          <div className="t">{company?.name}</div>
          <div className="m">{fmtDT(t.due_at, t.all_day)}{vehicle ? ` · ${vehicle.plate}` : ""}{driver ? ` · ${driver.name}` : ""}</div>
        </div>
        <Ring pct={pct} size={78} tone={done ? "done" : d < 0 ? "over" : undefined} cls={meta.cls}><div style={{ textAlign: "center" }}><div className="mono" style={{ fontSize: 20, fontWeight: 700, color: done ? "#fff" : undefined }}>{done ? Icon.check(26) : d < 0 ? "!" : Math.abs(d)}</div>{!done && <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800 }}>{d < 0 ? "lejárt" : "nap"}</div>}</div></Ring>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {t.type === "invoice" ? (done ? <button className="btn secondary" onClick={unpay}>{Icon.refresh()} Mégsem fizetve</button> : <button className="btn ok" onClick={pay}>{Icon.check()} Kifizetve (ma)</button>)
          : (done ? <button className="btn secondary" onClick={() => mutate(r => r.task.reopen(t.id))}>{Icon.refresh()} Újranyitás</button> : <button className="btn ok" onClick={complete}>{Icon.check()} Elvégezve{schedule ? " + új ciklus" : ""}</button>)}
        {!done && <SnoozeMenu onPick={snooze} />}
        <button className="btn secondary" onClick={edit}>{Icon.pen()} Szerkesztés</button>
        {!done && <a className="btn secondary" href={gcalEventUrl(data, t)} target="_blank" rel="noopener" title="Új esemény a saját Google Naptárában, kitöltve">{Icon.calendar(18)} Google Naptárba</a>}
      </div>

      <div className="card pad">
        <dl className="kv">
          <dt>Cég</dt><dd><Link href={`${prefix}/ugyfelek/${t.company_id}`} style={{ color: "var(--accent-soft-fg)" }}>{company?.name || "–"}</Link>{company?.phone && <> · <a href={phoneHref(company.phone)} className="mono">{company.phone}</a></>}</dd>
          {vehicle && <><dt>Rendszám</dt><dd><span className="plate">{vehicle.plate}</span>{vehicle.vu_type ? <span style={{ color: "var(--muted)", fontWeight: 600 }}> · {vehicle.vu_type}</span> : null}</dd></>}
          {driver && <><dt>Gépkocsivezető</dt><dd>{driver.name}{driver.card_number ? <span className="mono" style={{ color: "var(--muted)", fontWeight: 600 }}> · {driver.card_number}</span> : null}</dd></>}
          {t.base_date && <><dt>{t.type === "invoice" ? "Kiállítás" : t.type === "calibration" ? "Utolsó kalibráció" : t.type === "card_expiry" ? "Kártya kiállítása" : "Letöltés ideje"}</dt><dd className="mono">{fmtDate(t.base_date)}</dd></>}
          <dt>{t.type === "invoice" ? "Fizetési határidő" : t.type === "training" ? "Oktatás ideje" : "Következő határidő"}</dt><dd className="mono">{fmtDT(t.due_at, t.all_day)}{schedule && <span className="badge plain" style={{ marginLeft: 8 }}>+{schedule.cycle_days} nap</span>}</dd>
          {!done && t.remind_at.length > 0 && <><dt>Emlékeztetők</dt><dd>{t.remind_at.map(r => <div key={r} className="mono" style={{ fontWeight: 600 }}>{fmtDT(r)}{new Date(r).getTime() < Date.now() ? <span style={{ color: "var(--faint)" }}> · elküldve</span> : null}</div>)}</dd></>}
          {t.type === "training" && <>
            <dt>Cím</dt><dd>{t.address} {t.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(t.address)}`} target="_blank" rel="noopener" className="btn quiet sm" style={{ marginLeft: 6 }}>{Icon.pin(14)} Térkép</a>}</dd>
            <dt>Kapcsolattartó</dt><dd>{t.contact_name || "–"}{t.contact_phone && <> · <a href={phoneHref(t.contact_phone)} className="mono">{t.contact_phone}</a></>}</dd>
            {t.participants ? <><dt>Résztvevők</dt><dd className="mono">{t.participants} fő</dd></> : null}
            {t.topic && <><dt>Téma</dt><dd>{t.topic}</dd></>}
          </>}
          {t.type === "invoice" && <>
            <dt>Számlaszám</dt><dd className="mono">{t.invoice_no}</dd>
            <dt>Összeg</dt><dd className="mono">{fmtFt(t.gross_amount)}{t.net_amount != null && <span style={{ color: "var(--muted)", fontWeight: 600 }}> (nettó {fmtFt(t.net_amount)} + {t.vat_percent ?? 27}% ÁFA)</span>}</dd>
            <dt>Kifizetve</dt><dd>{t.paid_at ? <span className="mono">{fmtDate(t.paid_at)}</span> : <span className="badge over">Nincs kifizetve</span>}</dd>
          </>}
          {t.note && <><dt>Megjegyzés</dt><dd style={{ fontWeight: 500 }}>{t.note}</dd></>}
          {done && t.done_at && <><dt>Elvégezve</dt><dd className="mono">{fmtDT(t.done_at)}</dd></>}
        </dl>
      </div>

      {history.length > 0 && <div className="card pad"><div className="sec" style={{ margin: "0 0 10px" }}><h2>Előző ciklusok</h2><span className="n">{history.length}</span></div><div className="timeline">{history.map(h => <div className="ev" key={h.id}><i style={{ background: h.status === "done" ? "var(--ok)" : "var(--line-strong)" }} /><div><b>{h.status === "done" ? "Elvégezve" : "Nyitott"} · {fmtDate(h.done_at || h.due_at)}</b><div><span>határidő {fmtDate(h.due_at)}</span></div></div></div>)}</div></div>}

      {act.length > 0 && <div className="card pad"><div className="sec" style={{ margin: "0 0 10px" }}><h2>Napló</h2></div><div className="timeline">{act.map(a => <div className="ev" key={a.id}><i /><div><b>{{ insert: "Létrehozva", update: "Módosítva", delete: "Törölve", done: "Elvégezve" }[a.action] || a.action}</b><div><span>{fmtDT(a.created_at)}</span></div></div></div>)}</div></div>}

      <button className="btn danger block" onClick={remove}>{Icon.trash()} Törlés</button>
      <div style={{ textAlign: "center", color: "var(--faint)", fontSize: 12 }}>{rel.text} · létrehozva {fmtDate(t.created_at)}</div>
    </div>
  );
}

function SnoozeMenu({ onPick }: { onPick: (d: number) => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn secondary" onClick={() => setOpen(true)}>{Icon.snooze()} Halasztás</button>
    <ActionSheet open={open} onClose={() => setOpen(false)} title="Mikor emlékeztessünk újra?" options={[[1, "Holnap"], [3, "3 nap múlva"], [7, "1 hét múlva"], [14, "2 hét múlva"]].map(([d, l]) => ({ label: l as string, hint: "08:00", onPick: () => onPick(d as number) }))} />
  </>;
}
