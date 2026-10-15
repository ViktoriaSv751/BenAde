"use client";
import { useMemo, useState } from "react";
import type { Task } from "@/lib/types";
import { fmtDate, relLabel, todayISO } from "@/lib/date";
import { fmtFt } from "@/lib/format";
import { companyNameOf } from "@/lib/repo";
import { useData, useMutate } from "@/lib/data";
import { Empty, Icon, Seg, Skeleton, useConfirm } from "@/components/ui";
import { TaskRow } from "./TaskRow";
import { TaskDetail } from "./TaskDetail";
import { TopBar, useShell, useUrlState } from "./Shell";

type F = "open" | "overdue" | "paid" | "all";
type S = "due" | "amount" | "company";

export function InvoicesView() {
  const data = useData(); const mutate = useMutate(); const { layout, openCapture } = useShell(); const { get, set } = useUrlState(); const { confirm, confirmEl } = useConfirm();
  const [f, setF] = useState<F>("open"); const [s, setS] = useState<S>("due"); const [cid, setCid] = useState(""); const [sel, setSel] = useState<Set<string>>(new Set());
  const t = todayISO();
  const all = useMemo(() => (data?.tasks || []).filter(x => x.type === "invoice"), [data]);
  const rows = useMemo(() => {
    const r = all.filter(x => (!cid || x.company_id === cid) && (f === "all" || (f === "paid" ? !!x.paid_at : f === "overdue" ? !x.paid_at && x.due_at.slice(0, 10) < t : !x.paid_at)));
    return r.sort((a, b) => s === "amount" ? Number(b.gross_amount || 0) - Number(a.gross_amount || 0) : s === "company" ? companyNameOf(data!, a.company_id).localeCompare(companyNameOf(data!, b.company_id), "hu") : a.due_at.localeCompare(b.due_at));
  }, [all, f, s, cid, data, t]);
  if (!data) return <><TopBar title="Számlák" /><div className="content"><Skeleton n={4} /></div></>;
  const open = all.filter(x => !x.paid_at), overdue = open.filter(x => x.due_at.slice(0, 10) < t), week = open.filter(x => { const d = x.due_at.slice(0, 10); return d >= t && d <= addDaysStr(t, 7); });
  const sum = (a: Task[]) => a.reduce((z, x) => z + Number(x.gross_amount || 0), 0);
  const month = all.filter(x => x.paid_at && x.paid_at.slice(0, 7) === t.slice(0, 7));
  const toggle = (id: string) => setSel(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const payAll = async () => { if (await confirm({ title: `${sel.size} számla fizetettre állítása`, text: `Összesen ${fmtFt(sum(rows.filter(x => sel.has(x.id))))}.`, okLabel: "Fizetve" })) { for (const id of sel) await mutate(r => r.task.complete(id)); setSel(new Set()); } };
  const csv = () => { const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`; const lines = [["Cég", "Számlaszám", "Kiállítás", "Fizetési határidő", "Nettó", "ÁFA %", "Bruttó", "Fizetve", "Megjegyzés"].join(";"), ...rows.map(x => [companyNameOf(data, x.company_id), x.invoice_no, x.issue_date, x.due_at.slice(0, 10), x.net_amount, x.vat_percent, x.gross_amount, x.paid_at ? x.paid_at.slice(0, 10) : "", x.note].map(esc).join(";"))]; const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `benade-szamlak-${t}.csv`; a.click(); };
  const selTask = get("t") ? data.tasks.find(x => x.id === get("t")) : undefined;
  const main = (
    <div className="content">
      <div className="stats money">
        <div className={`stat ${overdue.length ? "danger" : ""}`}><div className="v" style={{ fontSize: 18 }}>{fmtFt(sum(overdue))}</div><div className="l">Lejárt · {overdue.length} db</div></div>
        <div className="stat"><div className="v" style={{ fontSize: 18 }}>{fmtFt(sum(week))}</div><div className="l">7 napon belül · {week.length} db</div></div>
        <div className="stat"><div className="v" style={{ fontSize: 18 }}>{fmtFt(sum(open))}</div><div className="l">Teljes kintlévőség</div></div>
        {layout === "desktop" && <div className="stat ok"><div className="v" style={{ fontSize: 18 }}>{fmtFt(sum(month))}</div><div className="l">Beérkezett e hónapban</div></div>}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Seg value={f} onChange={v => { setF(v); setSel(new Set()); }} options={[{ value: "open", label: "Nyitott", count: open.length }, { value: "overdue", label: "Lejárt", count: overdue.length }, { value: "paid", label: "Fizetett" }, { value: "all", label: "Mind" }]} />
        <select className="ctl" style={{ width: "auto", minHeight: 36, padding: "4px 34px 4px 12px", fontSize: 13 }} value={cid} onChange={e => setCid(e.target.value)}><option value="">Minden cég</option>{data.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="ctl" style={{ width: "auto", minHeight: 36, padding: "4px 34px 4px 12px", fontSize: 13 }} value={s} onChange={e => setS(e.target.value as S)}><option value="due">Határidő szerint</option><option value="amount">Összeg szerint</option><option value="company">Cég szerint</option></select>
        <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={csv} disabled={!rows.length}>{Icon.dl(14)} CSV</button>
      </div>
      {sel.size > 0 && <div className="info" style={{ borderColor: "var(--accent)" }}>{Icon.check()}<span style={{ flex: 1 }}>{sel.size} kijelölve · {fmtFt(sum(rows.filter(x => sel.has(x.id))))}</span><button className="btn primary sm" onClick={payAll}>Fizetve</button><button className="btn ghost sm" onClick={() => setSel(new Set())}>Mégse</button></div>}
      {rows.length === 0 ? <Empty icon={Icon.invoice(26)} title={f === "overdue" ? "Nincs lejárt számla" : f === "paid" ? "Még nincs fizetett számla" : "Nincs számla"} text={f === "open" ? "Rögzítse a kiállított számlákat – a fizetési határidő alapértelmezés szerint 30 nap." : undefined} action={f === "open" ? <button className="btn primary sm" onClick={() => openCapture("invoice")}>{Icon.plus(16)} Új számla</button> : undefined} />
        : layout === "desktop" && !selTask ? (
          <div className="card" style={{ overflow: "auto" }}><table className="table">
            <thead><tr><th style={{ width: 36 }}></th><th>Cég</th><th>Számlaszám</th><th>Kiállítva</th><th>Határidő</th><th style={{ textAlign: "right" }}>Bruttó</th><th>Állapot</th><th></th></tr></thead>
            <tbody>{rows.map(x => { const rl = relLabel(x.due_at); return <tr key={x.id} onClick={() => set({ t: x.id })} style={{ cursor: "pointer" }}>
              <td onClick={e => e.stopPropagation()}>{!x.paid_at && <input type="checkbox" checked={sel.has(x.id)} onChange={() => toggle(x.id)} aria-label="Kijelölés" />}</td>
              <td style={{ fontWeight: 700 }}>{companyNameOf(data, x.company_id)}</td><td className="mono">{x.invoice_no || "–"}</td><td className="mono">{fmtDate(x.issue_date)}</td><td className="mono">{fmtDate(x.due_at)}</td>
              <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{fmtFt(x.gross_amount)}</td>
              <td>{x.paid_at ? <span className="badge done">fizetve {fmtDate(x.paid_at)}</span> : <span className={`badge ${rl.tone}`}>{rl.text}</span>}</td>
              <td onClick={e => e.stopPropagation()}>{!x.paid_at && <button className="btn quiet sm" onClick={() => mutate(r => r.task.complete(x.id), { success: "Fizetve" })}>{Icon.check(14)} Fizetve</button>}</td>
            </tr>; })}</tbody>
            <tfoot><tr><td colSpan={5} style={{ textAlign: "right", color: "var(--muted)" }}>Összesen</td><td className="mono" style={{ textAlign: "right", fontWeight: 800 }}>{fmtFt(sum(rows))}</td><td colSpan={2}></td></tr></tfoot>
          </table></div>
        ) : <div className="list">{rows.map(x => <TaskRow key={x.id} t={x} selected={selTask?.id === x.id} compact={layout !== "phone"} swipe={false} />)}</div>}
      {confirmEl}
    </div>
  );
  return <>
    <TopBar title="Számlák" sub={layout === "desktop" ? `${open.length} nyitott · ${fmtFt(sum(open))}` : undefined} actions={layout !== "phone" ? <button className="btn primary sm" onClick={() => openCapture("invoice")}>{Icon.plus(16)} Új számla</button> : <button className="ibtn" onClick={() => openCapture("invoice")} aria-label="Új számla">{Icon.plus(20)}</button>} />
    {layout === "phone" || (layout === "desktop" && !selTask) ? main : <div className="split"><div className="pane">{main}</div><div className="pane detail">{selTask ? <div className="inner"><TaskDetail t={selTask} onDone={() => set({ t: null })} /></div> : <div className="placeholder"><div>{Icon.invoice(40)}<p style={{ marginTop: 10 }}>Válasszon egy számlát.</p></div></div>}</div></div>}
  </>;
}
function addDaysStr(iso: string, n: number) { const d = new Date(`${iso}T00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
