"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Snapshot, Task } from "@/lib/types";
import { addDays, fmtDate, toTS, todayISO } from "@/lib/date";
import { fmtFt } from "@/lib/format";
import { companyNameOf } from "@/lib/repo";
import { useData, useMutate, useToast } from "@/lib/data";
import {
  DUNNING_NAME, appendReminder, bucketOf, daysOverdue, dueDate, dunningLevel, dunningText, fmtCompact, gross, habitLabel, invoiceStatus, isPaid,
  lastReminder, mailtoHref, monthlySeries, niceMax, outstanding, paidDate, paymentStats, reminderLine, shortDate, smsHref, sumGross,
  type Bucket, type DunningLevel, type MonthPoint, type Outstanding, type PayStats, type ReminderChannel,
} from "@/lib/insights";
import { Empty, Icon, Panel, Seg, Skeleton, useConfirm } from "@/components/ui";
import { TaskDetail } from "./TaskDetail";
import { TopBar, useShell, useUrlState } from "./Shell";

type F = "open" | "overdue" | "paid" | "all" | "week" | "later";
type S = "due" | "amount" | "company" | "no" | "issue";
const DEFAULT_DIR: Record<S, 1 | -1> = { due: 1, amount: -1, company: 1, no: 1, issue: -1 };
const BUCKET_LABEL: Record<Bucket, string> = { overdue: "Lejárt", week: "7 napon belül", later: "Később" };

export function InvoicesView() {
  const data = useData(); const mutate = useMutate(); const toast = useToast(); const { layout, openCapture } = useShell(); const { get, set } = useUrlState(); const { confirm, confirmEl } = useConfirm();
  const [f, setF] = useState<F>("open"); const [s, setS] = useState<S>("due"); const [dir, setDir] = useState<1 | -1>(1); const [cid, setCid] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [payFor, setPayFor] = useState<string[] | null>(null); const [dunFor, setDunFor] = useState<string | null>(null);
  const t = todayISO();
  const all = useMemo(() => (data?.tasks || []).filter(x => x.type === "invoice"), [data]);
  const stats = useMemo(() => paymentStats(all), [all]);
  const series = useMemo(() => monthlySeries(all, t), [all, t]);
  const scoped = useMemo(() => all.filter(x => !cid || x.company_id === cid), [all, cid]);
  const out = useMemo(() => outstanding(scoped, t), [scoped, t]);
  const rows = useMemo(() => {
    const r = scoped.filter(x => {
      if (f === "all") return true; if (f === "paid") return isPaid(x);
      const b = bucketOf(x, t); if (f === "open") return !!b; return b === f;
    });
    const name = (x: Task) => data ? companyNameOf(data, x.company_id) : "";
    const cmp = (a: Task, b: Task) => s === "amount" ? gross(a) - gross(b) : s === "company" ? name(a).localeCompare(name(b), "hu") : s === "no" ? String(a.invoice_no || "").localeCompare(String(b.invoice_no || ""), "hu", { numeric: true }) : s === "issue" ? String(a.issue_date || "").localeCompare(String(b.issue_date || "")) : a.due_at.localeCompare(b.due_at);
    return r.sort((a, b) => dir * cmp(a, b) || a.due_at.localeCompare(b.due_at));
  }, [scoped, f, s, dir, data, t]);
  // drop selections that are no longer visible / unpaid
  useEffect(() => { setSel(p => { const vis = new Set(rows.filter(x => !isPaid(x)).map(x => x.id)); const n = new Set([...p].filter(id => vis.has(id))); return n.size === p.size ? p : n; }); }, [rows]);

  const pay = useCallback(async (ids: string[], date: string) => {
    const ts = toTS(date, "12:00"); const set0 = new Set(ids);
    const prev = new Map((data?.tasks || []).filter(x => set0.has(x.id)).map(x => [x.id, { paid_at: x.paid_at ?? null, status: x.status, done_at: x.done_at ?? null }]));
    try {
      await mutate(async r => { for (const id of ids) await r.task.update(id, { paid_at: date, status: "done", done_at: ts }); }, { optimistic: sn => { for (const x of sn.tasks) if (set0.has(x.id)) { x.paid_at = date; x.status = "done"; x.done_at = ts; } return sn; } });
    } catch { return; }
    const undo = () => { mutate(async r => { for (const id of ids) { const p = prev.get(id); await r.task.update(id, p && p.status !== "open" && !p.paid_at ? p : { paid_at: null, status: "open", done_at: null }); } }, { optimistic: sn => { for (const x of sn.tasks) if (set0.has(x.id)) { x.paid_at = null; x.status = "open"; x.done_at = null; } return sn; } }).catch(() => {}); };
    const when = date === todayISO() ? "" : ` · ${shortDate(date)}`;
    toast(ids.length > 1 ? `${ids.length} számla fizetve${when}` : `Fizetve${when}`, "ok", { label: "Visszavonás", fn: undo });
  }, [data, mutate, toast]);

  if (!data) return <><TopBar title="Számlák" /><div className="content"><Skeleton n={4} /></div></>;
  const openCount = all.filter(x => !isPaid(x)).length; const openSum = sumGross(all.filter(x => !isPaid(x)));
  const toggle = (id: string) => setSel(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const unpaidRows = rows.filter(x => !isPaid(x));
  const allSel = unpaidRows.length > 0 && unpaidRows.every(x => sel.has(x.id));
  const selSum = sumGross(rows.filter(x => sel.has(x.id)));
  const payAll = async () => { const ids = [...sel]; if (await confirm({ title: `${ids.length} számla fizetettre állítása`, text: `Összesen ${fmtFt(selSum)}, fizetés dátuma: ma (${fmtDate(t)}).`, okLabel: "Fizetve" })) { setSel(new Set()); await pay(ids, t); } };
  const csv = () => { const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`; const lines = [["Cég", "Számlaszám", "Kiállítás", "Fizetési határidő", "Nettó", "ÁFA %", "Bruttó", "Fizetve", "Megjegyzés"].join(";"), ...rows.map(x => [companyNameOf(data, x.company_id), x.invoice_no, x.issue_date, dueDate(x), x.net_amount, x.vat_percent, x.gross_amount, paidDate(x) || "", x.note].map(esc).join(";"))]; const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `benade-szamlak-${t}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const sortBy = (k: S) => { if (k === s) setDir(d => (d === 1 ? -1 : 1)); else { setS(k); setDir(DEFAULT_DIR[k]); } };
  const pickBucket = (b: Bucket) => { setF(p => (p === b ? "open" : b)); setSel(new Set()); };
  const selTask = get("t") ? data.tasks.find(x => x.id === get("t")) : undefined;
  const open = (id: string) => set({ t: id });
  const newInvoice = () => openCapture("invoice", cid ? { cid } : undefined);
  const company = cid ? data.companies.find(c => c.id === cid) : undefined;
  const cStats = cid ? stats.get(cid) : undefined; const cHabit = habitLabel(cStats);
  const table = layout === "desktop" && !selTask;
  const actions = { onPay: (x: Task) => pay([x.id], todayISO()), onPickDate: (x: Task) => setPayFor([x.id]), onDun: (x: Task) => setDunFor(x.id) };

  const empty = (() => {
    const btn = <button className="btn primary" onClick={newInvoice}>{Icon.plus(16)} Új számla</button>;
    if (!all.length) return <Empty icon={Icon.invoice(26)} title="Még nincs számla" text="Rögzítse az első kiállított számlát – a fizetési határidőre a BenAde emlékezteti." action={btn} />;
    if (cid && !scoped.length) return <Empty icon={Icon.invoice(26)} title="Ennek a cégnek nincs számlája" text="Rögzítse a cégnek kiállított számlát, vagy válasszon másik céget." action={btn} />;
    const m: Record<F, [string, string]> = {
      open: ["Nincs nyitott számla", "Minden számla ki van egyenlítve. Rögzítse a következő kiállított számlát."],
      overdue: ["Nincs lejárt számla", "Minden ügyfél határidőben fizetett. Rögzítse az új számlákat, hogy ez így is maradjon."],
      week: ["A következő 7 napban nem jár le számla", "Rögzítse a frissen kiállított számlákat, hogy időben szólhassunk."],
      later: ["Nincs később esedékes számla", "Rögzítse a frissen kiállított számlákat a fizetési határidővel együtt."],
      paid: ["Még nincs fizetett számla", "A beérkezett utalásokat a számla „Fizetve” gombjával rögzítheti."],
      all: ["Nincs számla", "Rögzítse az első kiállított számlát."],
    };
    return <Empty icon={Icon.invoice(26)} title={m[f][0]} text={m[f][1]} action={btn} />;
  })();

  const main = (
    <div className="content inv">
      <div className="inv-top">
        <OutstandingCard o={out} active={f} onPick={pickBucket} company={company?.name} />
        <MonthChart series={series} />
      </div>

      <div className="inv-filters">
        <Seg ariaLabel="Számlák szűrése" value={f} onChange={v => { setF(v); setSel(new Set()); }} options={[{ value: "open", label: "Nyitott", count: out.count }, { value: "overdue", label: "Lejárt", count: out.buckets.overdue.count }, { value: "paid", label: "Fizetett" }, { value: "all", label: "Mind" }]} />
        <div className="inv-ctl">
          {(f === "week" || f === "later") && <button className="chip" aria-pressed="true" onClick={() => setF("open")} aria-label="Szűrő törlése">{BUCKET_LABEL[f]} {Icon.x(14)}</button>}
          <select className="ctl" aria-label="Cég" value={cid} onChange={e => { setCid(e.target.value); setSel(new Set()); }}><option value="">Minden cég</option>{[...data.companies].sort((a, b) => a.name.localeCompare(b.name, "hu")).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {!table && <select className="ctl" aria-label="Rendezés" value={`${s}:${dir}`} onChange={e => { const [k, d] = e.target.value.split(":"); setS(k as S); setDir(Number(d) as 1 | -1); }}><option value="due:1">Határidő szerint</option><option value="amount:-1">Összeg szerint</option><option value="company:1">Cég szerint</option><option value="issue:-1">Legújabb elöl</option></select>}
          <button className="btn ghost sm inv-csv" onClick={csv} disabled={!rows.length} title="Exportálás CSV-be">{Icon.dl(14)} CSV</button>
        </div>
      </div>

      {(company || rows.length > 0) && <div className="inv-head">
        <div className="l">
          {company && <b>{company.name}</b>}
          <span className="mono">{rows.length} számla · {fmtFt(sumGross(rows))}</span>
        </div>
        {company && <div className="r">{cHabit ? <span className={`inv-habit ${cHabit.tone}`}>{Icon.clock(14)} {cHabit.text}</span> : <span className="inv-habit">{Icon.clock(14)} Még nincs fizetési előzmény</span>}{cStats && <span className="inv-basis">{Math.round(cStats.onTimeShare * 100)}% időben · {cStats.paidCount} fizetett számla alapján</span>}</div>}
      </div>}

      {sel.size > 0 && <div className="inv-bulk" role="region" aria-label="Kijelölt számlák">{Icon.check(18)}<span className="tx"><b className="mono">{sel.size}</b> kijelölve · <span className="mono">{fmtFt(selSum)}</span></span><button className="btn primary sm" onClick={payAll}>Fizetve</button><button className="btn ghost sm" onClick={() => setPayFor([...sel])}>{Icon.calendar(14)} Más dátummal</button><button className="btn quiet sm" onClick={() => setSel(new Set())}>Mégse</button></div>}

      {rows.length === 0 ? empty
        : table ? (
          <div className="card inv-tablewrap"><table className="table inv-table">
            <thead><tr>
              <th className="cb"><input type="checkbox" checked={allSel} disabled={!unpaidRows.length} onChange={() => setSel(allSel ? new Set() : new Set(unpaidRows.map(x => x.id)))} aria-label="Összes kijelölése" /></th>
              <Th k="company" s={s} dir={dir} onSort={sortBy}>Cég</Th><Th k="no" s={s} dir={dir} onSort={sortBy}>Számlaszám</Th><Th k="issue" s={s} dir={dir} onSort={sortBy}>Kiállítva</Th><Th k="due" s={s} dir={dir} onSort={sortBy}>Határidő</Th><Th k="amount" s={s} dir={dir} onSort={sortBy} right>Bruttó</Th><th>Állapot</th><th className="r"><span className="sr">Műveletek</span></th>
            </tr></thead>
            <tbody>{rows.map(x => { const st = invoiceStatus(x, t); const paid = isPaid(x); const rem = !paid ? lastReminder(x.note) : null; const h = !cid && !paid ? habitLabel(stats.get(x.company_id), 2) : null; const od = daysOverdue(x, t);
              return <tr key={x.id} onClick={() => open(x.id)} aria-selected={sel.has(x.id)} className={st.tone === "over" ? "over" : ""}>
                <td className="cb" onClick={e => e.stopPropagation()}>{!paid && <input type="checkbox" checked={sel.has(x.id)} onChange={() => toggle(x.id)} aria-label={`${x.invoice_no || "Számla"} kijelölése`} />}</td>
                <td><div className="co">{companyNameOf(data, x.company_id)}</div>{h && <div className={`inv-habit sm ${h.tone}`}>{h.text}</div>}</td>
                <td className="mono">{x.invoice_no || "–"}</td><td className="mono">{fmtDate(x.issue_date)}</td><td className="mono">{fmtDate(dueDate(x))}</td>
                <td className="mono r amt">{fmtFt(x.gross_amount)}</td>
                <td><StatusPill text={st.text} tone={st.tone} />{rem && <div className="inv-rem">{Icon.mail(12)} Emlékeztető: {shortDate(rem.date, t)}</div>}</td>
                <td className="r" onClick={e => e.stopPropagation()}>{!paid && <div className="inv-acts">
                  {od > 0 && <button className="btn quiet sm" onClick={() => actions.onDun(x)} title="Emlékeztető küldése">{Icon.mail(14)} Emlékeztető</button>}
                  <PayButtons onPay={() => actions.onPay(x)} onPick={() => actions.onPickDate(x)} />
                </div>}</td>
              </tr>; })}</tbody>
            <tfoot><tr><td colSpan={5} className="r" style={{ color: "var(--muted)" }}>Összesen</td><td className="mono r amt">{fmtFt(sumGross(rows))}</td><td colSpan={2}></td></tr></tfoot>
          </table></div>
        ) : <div className="inv-list">{rows.map(x => <InvoiceCard key={x.id} t={x} data={data} today={t} stats={!cid ? stats.get(x.company_id) : undefined} selected={selTask?.id === x.id} onOpen={() => open(x.id)} {...actions} />)}</div>}
      {confirmEl}
    </div>
  );
  const payTasks = payFor ? data.tasks.filter(x => payFor.includes(x.id)) : [];
  const dunTask = dunFor ? data.tasks.find(x => x.id === dunFor) : undefined;
  return <>
    <TopBar title="Számlák" sub={layout === "desktop" ? `${openCount} nyitott · ${fmtFt(openSum)}` : undefined} actions={layout !== "phone" ? <button className="btn primary sm" onClick={newInvoice}>{Icon.plus(16)} Új számla</button> : <button className="ibtn" onClick={newInvoice} aria-label="Új számla">{Icon.plus(20)}</button>} />
    {layout === "phone" || table ? main : <div className="split"><div className="pane">{main}</div><div className="pane detail">{selTask ? <div className="inner"><TaskDetail t={selTask} onDone={() => set({ t: null })} /></div> : <div className="placeholder"><div>{Icon.invoice(40)}<p style={{ marginTop: 10 }}>Válasszon egy számlát.</p></div></div>}</div></div>}
    <PayDatePanel tasks={payTasks} onClose={() => setPayFor(null)} onPay={async d => { const ids = payTasks.map(x => x.id); setPayFor(null); setSel(new Set()); await pay(ids, d); }} />
    <DunningPanel t={dunTask} data={data} onClose={() => setDunFor(null)} />
  </>;
}

/* ---------- small pieces ---------- */
function Th({ k, s, dir, onSort, right, children }: { k: S; s: S; dir: 1 | -1; onSort: (k: S) => void; right?: boolean; children: React.ReactNode }) {
  const on = k === s;
  return <th className={right ? "r" : ""} aria-sort={on ? (dir === 1 ? "ascending" : "descending") : "none"}><button className={`inv-sort ${on ? "on" : ""}`} onClick={() => onSort(k)}>{children}<span className="ar" aria-hidden>{on ? (dir === 1 ? "↑" : "↓") : "↕"}</span></button></th>;
}
function StatusPill({ text, tone }: { text: string; tone: string }) { return <span className={`inv-pill ${tone}`}>{text}</span>; }
function PayButtons({ onPay, onPick, big }: { onPay: () => void; onPick: () => void; big?: boolean }) {
  return <span className={`inv-pay ${big ? "big" : ""}`}>
    <button className="pay" onClick={onPay}>{Icon.check(big ? 18 : 15)} Fizetve</button>
    <button className="pick" onClick={onPick} aria-label="Más fizetési dátum választása" title="Más fizetési dátum">{Icon.calendar(big ? 18 : 15)}</button>
  </span>;
}

/* ---------- Kintlévőség ---------- */
function OutstandingCard({ o, active, onPick, company }: { o: Outstanding; active: F; onPick: (b: Bucket) => void; company?: string }) {
  const order: Bucket[] = ["overdue", "week", "later"];
  return (
    <section className="card inv-out" aria-label="Kintlévőség">
      <div className="k">Kintlévőség{company ? ` · ${company}` : ""}</div>
      <div className="total mono">{fmtFt(o.total)}</div>
      <div className="sub">{o.count ? `${o.count} kifizetetlen számla, bruttó` : "Minden számla ki van egyenlítve."}</div>
      <div className="inv-bar" role="group" aria-label="Kintlévőség megoszlása">
        {o.total > 0 ? order.filter(b => o.buckets[b].sum > 0).map(b => <button key={b} className={`seg-${b}`} style={{ flexGrow: o.buckets[b].sum, flexBasis: 0 }} aria-pressed={active === b} onClick={() => onPick(b)} aria-label={`${BUCKET_LABEL[b]}: ${fmtFt(o.buckets[b].sum)} – szűrés`} title={`${BUCKET_LABEL[b]}: ${fmtFt(o.buckets[b].sum)}`} />) : <span className="none" />}
      </div>
      <div className="inv-legend">
        {order.map(b => <button key={b} className={`lg-${b}`} aria-pressed={active === b} onClick={() => onPick(b)} disabled={!o.buckets[b].count && active !== b}>
          <span className="lbl"><i />{BUCKET_LABEL[b]}</span>
          <span className="amt mono">{fmtFt(o.buckets[b].sum)}</span>
          <span className="cnt mono">{o.buckets[b].count} db</span>
        </button>)}
      </div>
    </section>
  );
}

/* ---------- 12-month chart ---------- */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null); const [w, setW] = useState(0);
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(e => setW(Math.floor(e[0].contentRect.width))); ro.observe(el); setW(Math.floor(el.getBoundingClientRect().width)); return () => ro.disconnect(); }, []);
  return [ref, w] as const;
}
function MonthChart({ series }: { series: MonthPoint[] }) {
  const [ref, W] = useWidth<HTMLDivElement>(); const last = series.length - 1; const [idx, setIdx] = useState(last);
  const cur = series[last]; const p = series[Math.min(idx, last)];
  const H = W < 520 ? 140 : 184; const padL = 38, padT = 10, padB = 24; const ih = H - padT - padB; const iw = Math.max(0, W - padL);
  const max = niceMax(Math.max(...series.map(x => Math.max(x.billed, x.paid)))); const y = (v: number) => padT + ih - (v / max) * ih;
  const cw = iw / series.length; const bw = Math.max(6, Math.min(26, cw * 0.5)); const cx = (i: number) => padL + cw * i + cw / 2;
  const showLabel = (i: number) => cw >= 34 || (last - i) % 2 === 0;
  const line = series.map((x, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${y(x.paid).toFixed(1)}`).join(" ");
  const bar = (i: number, v: number) => { const h = (v / max) * ih; if (h <= 0) return ""; const x0 = cx(i) - bw / 2, y0 = padT + ih - h, r = Math.min(4, h, bw / 2); return `M${x0},${padT + ih}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${padT + ih}Z`; };
  const yearLbl = (x: MonthPoint) => `${x.year}. ${x.label}`;
  return (
    <section className="card inv-chart" aria-label="Elmúlt 12 hónap">
      <div className="hd">
        <div><div className="k">Elmúlt 12 hónap</div><div className="lg"><span className="b"><i />Számlázva</span><span className="p"><i />Beérkezett</span></div></div>
        <div className="in"><div className="k">Beérkezett e hónapban</div><div className="v mono">{fmtFt(cur?.paid)}</div></div>
      </div>
      <div className="readout" aria-live="polite"><b>{p ? yearLbl(p) : ""}</b><span>Számlázva <b className="mono">{fmtFt(p?.billed)}</b></span><span>Beérkezett <b className="mono ok">{fmtFt(p?.paid)}</b></span></div>
      <div ref={ref} className="plot" style={{ height: H }}>
        {W > 0 && <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Havi számlázott és beérkezett bruttó összeg az elmúlt 12 hónapban" onPointerLeave={e => { if (e.pointerType === "mouse") setIdx(last); }}>
          {[0, 0.5, 1].map(g => <g key={g}><line x1={padL} x2={W} y1={y(max * g)} y2={y(max * g)} className={g ? "grid" : "base"} /><text x={padL - 6} y={y(max * g) + 3.5} className="yl" textAnchor="end">{g ? fmtCompact(max * g) : "0"}</text></g>)}
          {series.map((x, i) => <g key={x.key}>
            {i === idx && <rect x={cx(i) - cw / 2 + 1} y={padT - 4} width={cw - 2} height={ih + 4} rx={6} className="hl" />}
            <path d={bar(i, x.billed)} className={`bar ${i === idx ? "on" : ""}`} />
            {showLabel(i) && <text x={cx(i)} y={H - 7} textAnchor="middle" className={`xl ${i === idx ? "on" : ""}`}>{x.label}</text>}
          </g>)}
          <path d={line} className="pline" />
          {series.map((x, i) => <circle key={x.key} cx={cx(i)} cy={y(x.paid)} r={i === idx ? 4.5 : 3} className={`pdot ${i === idx ? "on" : ""}`} />)}
          {series.map((x, i) => <rect key={x.key} x={padL + cw * i} y={0} width={cw} height={H} fill="transparent" onPointerEnter={() => setIdx(i)} onClick={() => setIdx(i)}><title>{`${yearLbl(x)} – számlázva ${fmtFt(x.billed)}, beérkezett ${fmtFt(x.paid)}`}</title></rect>)}
        </svg>}
      </div>
    </section>
  );
}

/* ---------- phone / list card ---------- */
function InvoiceCard({ t, data, today, stats, selected, onOpen, onPay, onPickDate, onDun }: { t: Task; data: Snapshot; today: string; stats?: PayStats; selected?: boolean; onOpen: () => void; onPay: (t: Task) => void; onPickDate: (t: Task) => void; onDun: (t: Task) => void }) {
  const st = invoiceStatus(t, today); const paid = isPaid(t); const od = daysOverdue(t, today);
  const rem = !paid ? lastReminder(t.note) : null; const h = !paid ? habitLabel(stats, 2) : null;
  return (
    <article className={`inv-card ${st.tone === "over" ? "over" : ""} ${paid ? "paid" : ""}`} aria-selected={selected}>
      <button className="main" onClick={onOpen}>
        <span className="co">{companyNameOf(data, t.company_id)}</span>
        <span className="amt mono">{fmtFt(t.gross_amount)}</span>
        <span className="meta mono">{t.invoice_no || "Számlaszám nélkül"}{t.issue_date ? ` · ${fmtDate(t.issue_date)}` : ""}</span>
        <span className="tags"><StatusPill text={st.text} tone={st.tone} />{h && <span className={`inv-habit sm ${h.tone}`}>{h.text}</span>}{rem && <span className="inv-rem">{Icon.mail(12)} Emlékeztető: {shortDate(rem.date, today)}</span>}</span>
      </button>
      {!paid && <div className="acts">
        {od > 0 && <button className="dun" onClick={() => onDun(t)}>{Icon.mail(16)} Emlékeztető küldése</button>}
        <PayButtons big onPay={() => onPay(t)} onPick={() => onPickDate(t)} />
      </div>}
    </article>
  );
}

/* ---------- pay with another date ---------- */
function PayDatePanel({ tasks, onClose, onPay }: { tasks: Task[]; onClose: () => void; onPay: (date: string) => void }) {
  const open = tasks.length > 0; const today = todayISO(); const [d, setD] = useState(today);
  useEffect(() => { if (open) setD(todayISO()); }, [open]);
  const minIssue = tasks.map(x => x.issue_date).filter(Boolean).sort()[0] || undefined;
  const quick: [string, string][] = [["Ma", today], ["Tegnap", addDays(today, -1)], ["Határidő napja", tasks.length === 1 ? dueDate(tasks[0]) : ""]];
  return <Panel open={open} onClose={onClose} title="Fizetés dátuma" footer={<><button className="btn ghost" onClick={onClose}>Mégse</button><button className="btn primary" disabled={!d || d > today} onClick={() => onPay(d)}>{Icon.check(18)} Fizetve rögzítése</button></>}>
    <p className="inv-note">{tasks.length === 1 ? <>A(z) <b className="mono">{tasks[0].invoice_no || "számla"}</b> · <b className="mono">{fmtFt(tasks[0].gross_amount)}</b> mikor érkezett meg?</> : <><b className="mono">{tasks.length}</b> számla · <b className="mono">{fmtFt(sumGross(tasks))}</b> – adja meg a beérkezés napját.</>}</p>
    <div className="chips inv-quick">{quick.filter(q => q[1] && q[1] <= today).map(([l, v]) => <button key={l} className="chip" aria-pressed={d === v} onClick={() => setD(v)}>{l}<span className="k">{shortDate(v, today)}</span></button>)}</div>
    <div className="field"><label htmlFor="inv-paydate">Beérkezés napja</label><input id="inv-paydate" type="date" className="ctl mono" value={d} max={today} min={minIssue} onChange={e => setD(e.target.value)} /></div>
  </Panel>;
}

/* ---------- dunning ---------- */
function DunningPanel({ t, data, onClose }: { t?: Task; data: Snapshot; onClose: () => void }) {
  const mutate = useMutate(); const toast = useToast(); const today = todayISO();
  const od = t ? daysOverdue(t, today) : 0; const auto = dunningLevel(od) || "friendly";
  const [level, setLevel] = useState<DunningLevel>(auto); const [subject, setSubject] = useState(""); const [body, setBody] = useState(""); const [sms, setSms] = useState(""); const [copied, setCopied] = useState(false);
  const company = t ? data.companies.find(c => c.id === t.company_id) : undefined;
  const contacts = t ? data.contacts.filter(c => c.company_id === t.company_id) : [];
  const primary = contacts.find(c => c.is_primary) || contacts[0];
  const email = (company?.email || primary?.email || contacts.find(c => c.email)?.email || "").trim();
  const phone = (primary?.phone || contacts.find(c => c.phone)?.phone || company?.phone || "").trim();
  const phoneWho = primary?.phone ? primary.name : contacts.find(c => c.phone) ? contacts.find(c => c.phone)!.name : company?.phone ? "cég" : "";
  useEffect(() => { setLevel(auto); setCopied(false); }, [t?.id]);
  useEffect(() => {
    if (!t) return;
    const x = dunningText({ level, company: company?.name || "Partnerünk", invoiceNo: t.invoice_no, amount: gross(t), dueISO: dueDate(t), daysOverdue: od, today, workspace: data.workspace });
    setSubject(x.subject); setBody(x.body); setSms(x.sms);
  }, [t?.id, level]);
  if (!t) return null;
  const rem = lastReminder(t.note);
  const log = async (ch: ReminderChannel) => {
    const line = reminderLine(today, ch, level); const note = appendReminder(t.note, line);
    try { await mutate(r => r.task.update(t.id, { note }), { optimistic: s => { const y = s.tasks.find(z => z.id === t.id); if (y) y.note = note; return s; } }); toast("Emlékeztető rögzítve a számla megjegyzésében", "ok"); } catch { /* toast shown by useMutate */ }
  };
  const after = (ch: ReminderChannel) => { setTimeout(() => { onClose(); log(ch); }, 150); };
  const copy = async () => { try { await navigator.clipboard.writeText(`${subject}\n\n${body}`); setCopied(true); } catch { toast("A másolás nem sikerült – jelölje ki a szöveget kézzel.", "err"); } };
  return (
    <Panel open onClose={onClose} title="Emlékeztető küldése" footer={<>
      {email ? <a className="btn primary" href={mailtoHref(email, subject, body)} onClick={() => after("e-mail")}>{Icon.mail(18)} E-mail</a> : <button className="btn primary" disabled title="A cégnél nincs e-mail-cím">{Icon.mail(18)} E-mail</button>}
      {phone ? <a className="btn secondary" href={smsHref(phone, sms)} onClick={() => after("SMS")}>{Icon.phone(18)} SMS</a> : <button className="btn secondary" disabled title="Nincs telefonszám">{Icon.phone(18)} SMS</button>}
      <button className="btn ghost" onClick={copy}>{copied ? Icon.check(18) : Icon.copy(18)} Másolás</button>
    </>}>
      <div className="inv-dun-sum">
        <div><div className="co">{company?.name || "Ismeretlen cég"}</div><div className="m mono">{t.invoice_no || "Számlaszám nélkül"} · határidő {fmtDate(dueDate(t))}</div></div>
        <div className="r"><div className="amt mono">{fmtFt(t.gross_amount)}</div><StatusPill text={`${od} napja lejárt`} tone="over" /></div>
      </div>
      {rem && <div className="info">{Icon.history(16)}<span>Legutóbbi emlékeztető: <b className="mono">{fmtDate(rem.date)}</b>{rem.detail ? ` (${rem.detail})` : ""}{rem.count > 1 ? ` · összesen ${rem.count} alkalommal` : ""}.</span></div>}
      <div className="field"><label>Hangnem</label>
        <Seg ariaLabel="Hangnem" value={level} onChange={setLevel} options={[{ value: "friendly", label: "Barátságos" }, { value: "firm", label: "Határozott" }, { value: "final", label: "Utolsó" }]} />
        <div className="hint">{level === auto ? `Javasolt ${od} nap késés esetén.` : `${od} nap késésnél a(z) ${DUNNING_NAME[auto]} hangnemet javasoljuk.`}</div>
      </div>
      <div className="field"><label htmlFor="inv-dsub">Tárgy</label><input id="inv-dsub" className="ctl" value={subject} onChange={e => setSubject(e.target.value)} /></div>
      <div className="field"><label htmlFor="inv-dbody">Levél szövege</label><textarea id="inv-dbody" className="ctl inv-dbody" value={body} onChange={e => setBody(e.target.value)} rows={12} /></div>
      <div className="field"><label htmlFor="inv-dsms">SMS szövege</label><textarea id="inv-dsms" className="ctl" value={sms} onChange={e => setSms(e.target.value)} rows={4} /><div className="hint mono">{sms.length} karakter</div></div>
      <div className="inv-to">
        <div>{Icon.mail(16)}<span>{email ? <>E-mail: <b>{email}</b></> : "A cégnél nincs megadott e-mail-cím."}</span></div>
        <div>{Icon.phone(16)}<span>{phone ? <>SMS: <b className="mono">{phone}</b>{phoneWho && phoneWho !== "cég" ? ` (${phoneWho})` : ""}</> : "Nincs telefonszám a cégnél vagy a kapcsolattartónál."}</span></div>
      </div>
      {copied && <div className="info inv-copied">{Icon.check(16)}<span style={{ flex: 1 }}>A szöveg a vágólapra került. Ha elküldte, rögzítse a számlánál.</span><button className="btn primary sm" onClick={() => { onClose(); log("egyéb"); }}>Elküldés rögzítése</button></div>}
    </Panel>
  );
}

