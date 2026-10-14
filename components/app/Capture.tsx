"use client";
import { useEffect, useMemo, useState } from "react";
import type { Task, TaskType } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import { addDays, dateOf, fmtDate, timeOf, toTS, todayISO } from "@/lib/date";
import { companyName, fmtFt, plateFmt, titleCase } from "@/lib/format";
import { computeDue, defaultReminders, type NewTask } from "@/lib/repo";
import { useData, useMutate } from "@/lib/data";
import { Field, Icon, Panel, Switch, TypeIcon } from "@/components/ui";
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
  { k: "driver", label: "Új gépkocsivezető", desc: "Sofőr egy céghez", cls: "t-card", icon: Icon.user(22) },
];

export function CapturePanel({ open, type, onClose }: { open: boolean; type?: string; onClose: () => void }) {
  const { set, get } = useUrlState(); const { layout } = useShell();
  const kind = (type || "menu") as Kind; const editId = get("edit");
  const title = kind === "menu" ? "Új rögzítés" : editId ? "Szerkesztés" : KINDS.find(k => k.k === kind)?.label || "Rögzítés";
  return (
    <Panel open={open} onClose={onClose} title={title} wide={layout !== "phone"} back={kind !== "menu" && !editId ? () => set({ uj: "menu" }) : undefined}>
      {kind === "menu" ? <Menu onPick={k => set({ uj: k })} /> : kind === "company" ? <CompanyForm onDone={onClose} /> : kind === "vehicle" ? <VehicleForm onDone={onClose} /> : kind === "driver" ? <DriverForm onDone={onClose} /> : <TaskForm type={kind as TaskType} editId={editId} onDone={onClose} />}
    </Panel>
  );
}

function Menu({ onPick }: { onPick: (k: Kind) => void }) {
  return <>
    <div className="sec" style={{ marginTop: 0 }}><h2>Emlékeztető</h2></div>
    <div className="tiles">{KINDS.slice(0, 6).map(k => <button key={k.k} className={`tile-btn ${k.cls}`} onClick={() => onPick(k.k)}><span className="ico">{k.icon}</span><b>{k.label}</b><span>{k.desc}</span></button>)}</div>
    <div className="sec"><h2>Adatbank</h2></div>
    <div className="tiles">{KINDS.slice(6).map(k => <button key={k.k} className={`tile-btn ${k.cls}`} style={{ minHeight: 96 }} onClick={() => onPick(k.k)}><span className="ico">{k.icon}</span><b>{k.label}</b><span>{k.desc}</span></button>)}</div>
    <div className="info">{Icon.info()}<span>Gyorsbillentyűk gépen: <b>N</b> új rögzítés, <b>/</b> vagy <b>⌘K</b> keresés, <b>Esc</b> bezárás.</span></div>
  </>;
}

/* ---------- shared selectors ---------- */
function CompanySelect({ value, onChange, id = "f-company" }: { value: string; onChange: (v: string) => void; id?: string }) {
  const data = useData()!; const list = useMemo(() => data.companies.filter(c => !c.archived_at).sort((a, b) => a.name.localeCompare(b.name, "hu")), [data.companies]);
  const recent = useMemo(() => { const seen = new Set<string>(); const out: typeof list = []; for (const t of [...data.tasks].sort((a, b) => b.created_at.localeCompare(a.created_at))) { if (!seen.has(t.company_id)) { seen.add(t.company_id); const c = list.find(x => x.id === t.company_id); if (c) out.push(c); } if (out.length >= 3) break; } return out; }, [data.tasks, list]);
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <select className="ctl" id={id} value={value} onChange={e => onChange(e.target.value)}><option value="">Válasszon céget…</option>{list.map(c => <option key={c.id} value={c.id}>{c.name}{c.tax_id ? ` · ${c.tax_id}` : ""}</option>)}</select>
    {recent.length > 0 && !value && <div className="chips">{recent.map(c => <button key={c.id} type="button" className="chip" onClick={() => onChange(c.id)}>{Icon.history(14)} {c.name}</button>)}</div>}
  </div>;
}

/* ---------- task form (all types) ---------- */
function TaskForm({ type, editId, onDone }: { type: TaskType; editId: string | null; onDone: () => void }) {
  const data = useData()!; const mutate = useMutate(); const { get, set } = useUrlState(); const meta = TASK_META[type]; const d = data.workspace.defaults;
  const edit = editId ? data.tasks.find(t => t.id === editId) : undefined;
  const [companyId, setCompanyId] = useState(edit?.company_id || get("cid") || "");
  const [vehicleId, setVehicleId] = useState(edit?.vehicle_id || get("vid") || "");
  const [driverId, setDriverId] = useState(edit?.driver_id || get("did") || "");
  const [base, setBase] = useState(edit?.base_date || todayISO());
  const [dueDate, setDueDate] = useState(edit ? dateOf(edit.due_at) : computeDue(type, todayISO(), d));
  const [dueTime, setDueTime] = useState(edit ? timeOf(edit.due_at) : type === "training" ? "10:00" : d.remindTime || "08:00");
  const [dueTouched, setDueTouched] = useState(!!edit);
  const [remDays, setRemDays] = useState<number[]>(d.remindDaysBefore || [7, 1, 0]);
  const [remTime, setRemTime] = useState(d.remindTime || "08:00");
  const [customRem, setCustomRem] = useState<string[]>(edit ? edit.remind_at.map(r => r.slice(0, 16)) : []);
  const [useCustom, setUseCustom] = useState(!!edit);
  const [recurring, setRecurring] = useState(!edit && !!meta.cycleKey);
  const [note, setNote] = useState(edit?.note || "");
  const [address, setAddress] = useState(edit?.address || ""); const [contactName, setContactName] = useState(edit?.contact_name || ""); const [contactPhone, setContactPhone] = useState(edit?.contact_phone || ""); const [participants, setParticipants] = useState(edit?.participants?.toString() || ""); const [topic, setTopic] = useState(edit?.topic || "");
  const [invoiceNo, setInvoiceNo] = useState(edit?.invoice_no || ""); const [issue, setIssue] = useState(edit?.issue_date || todayISO()); const [gross, setGross] = useState(edit?.gross_amount?.toString() || ""); const [vat, setVat] = useState(edit?.vat_percent?.toString() || String(d.vatPercent ?? 27)); const [paid, setPaid] = useState(edit?.paid_at || "");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState<Task | null>(null);
  const [newSub, setNewSub] = useState("");
  const company = data.companies.find(c => c.id === companyId);
  const vehicles = data.vehicles.filter(v => v.company_id === companyId && !v.archived_at); const drivers = data.drivers.filter(x => x.company_id === companyId && !x.archived_at);
  const contacts = data.contacts.filter(c => c.company_id === companyId);
  const lastOf = (kind: "vehicle" | "driver", id: string) => data.tasks.filter(t => t.type === type && (kind === "vehicle" ? t.vehicle_id === id : t.driver_id === id) && t.status === "done").sort((a, b) => (b.done_at || "").localeCompare(a.done_at || ""))[0];

  // auto compute due from base (unless touched)
  useEffect(() => { if (!dueTouched && meta.cycleKey) setDueDate(computeDue(type, base, d)); }, [base, dueTouched, meta.cycleKey, type, d]);
  useEffect(() => { if (type === "invoice" && !dueTouched) setDueDate(addDays(issue, company?.invoice_days || d.invoiceDays || 30)); }, [issue, company, type, dueTouched, d.invoiceDays]);
  useEffect(() => { if (contacts.length && !contactName && type === "training") { const p = contacts.find(c => c.is_primary) || contacts[0]; setContactName(p.name); setContactPhone(p.phone || ""); } }, [contacts, contactName, type]);

  const reminders = useMemo(() => {
    if (useCustom) return customRem.filter(Boolean).map(s => new Date(s).toISOString());
    if (type === "training") return defaultReminders(dueDate, d, "training");
    if (type === "invoice") return [toTS(dueDate, remTime)];
    return remDays.map(n => toTS(addDays(dueDate, -n), remTime)).filter(ts => new Date(ts).getTime() > Date.now() - 3600_000).sort();
  }, [useCustom, customRem, type, dueDate, d, remDays, remTime]);

  async function addSubject() {
    if (!newSub.trim() || !companyId) return;
    if (meta.subject === "vehicle") { const v = await mutate(r => r.vehicle.create({ company_id: companyId, plate: plateFmt(newSub) })); setVehicleId(v.id); }
    else { const x = await mutate(r => r.driver.create({ company_id: companyId, name: titleCase(newSub) })); setDriverId(x.id); }
    setNewSub("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!companyId) return setErr("Válassza ki a céget.");
    if (meta.subject === "vehicle" && !vehicleId) return setErr("Válassza ki a rendszámot.");
    if (meta.subject === "driver" && !driverId) return setErr("Válassza ki a gépkocsivezetőt.");
    if (type === "training" && !address.trim()) return setErr("Adja meg az oktatás címét.");
    if (type === "invoice" && !invoiceNo.trim()) return setErr("Adja meg a számla számát.");
    if (type === "invoice" && (gross === "" || Number(gross) < 0)) return setErr("Adja meg a bruttó összeget.");
    if (!dueDate) return setErr("Adja meg a dátumot.");
    const vatN = Number(vat) || 0; const grossN = Math.round(Number(gross) || 0);
    const payload: NewTask = {
      company_id: companyId, type, vehicle_id: meta.subject === "vehicle" ? vehicleId : null, driver_id: meta.subject === "driver" ? driverId : null,
      base_date: type === "invoice" ? issue : type === "training" ? null : base,
      due_at: toTS(dueDate, type === "invoice" ? "08:00" : dueTime), all_day: type === "invoice", remind_at: reminders, note: note.trim() || null,
      address: type === "training" ? address.trim() : null, contact_name: type === "training" ? titleCase(contactName) || null : null, contact_phone: type === "training" ? contactPhone.trim() || null : null, participants: type === "training" && participants ? Number(participants) : null, topic: type === "training" ? topic.trim() || null : null,
      invoice_no: type === "invoice" ? invoiceNo.trim() : null, issue_date: type === "invoice" ? issue : null, gross_amount: type === "invoice" ? grossN : null, vat_percent: type === "invoice" ? vatN : null, net_amount: type === "invoice" ? Math.round(grossN / (1 + vatN / 100)) : null, paid_at: type === "invoice" ? paid || null : null,
      schedule_id: edit?.schedule_id || null, attachment_path: edit?.attachment_path || null,
    };
    setBusy(true);
    try {
      if (edit) { await mutate(r => r.task.update(edit.id, { ...payload, status: type === "invoice" && paid ? "done" : edit.status }), { success: "Módosítva" }); onDone(); }
      else { const t = await mutate(r => r.task.create(payload, { recurring }), { success: type === "invoice" ? "Számla rögzítve" : "Emlékeztető mentve" }); if (meta.cycleKey) setSaved(t); else onDone(); }
    } catch { /* toast shown */ } finally { setBusy(false); }
  }
  if (saved) {
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center", padding: "12px 0" }}>
      <div className={`ring done`} style={{ width: 84, height: 84 }}><span style={{ color: "#fff" }}>{Icon.check(34)}</span></div>
      <h3 style={{ fontSize: 20 }}>Rögzítve</h3>
      <p style={{ color: "var(--muted)" }}>{meta.name} · {company?.name}<br /><span className="mono">Következő határidő: {fmtDate(saved.due_at)}</span>{recurring && <><br />A sorozat aktív: lezáráskor automatikusan jön a következő.</>}</p>
      <div style={{ display: "flex", gap: 10, width: "100%", flexDirection: "column" }}>
        <button className="btn primary block" onClick={() => { setSaved(null); setVehicleId(""); setDriverId(""); setNote(""); setBase(todayISO()); setDueTouched(false); }}>{Icon.plus(18)} Még egy ehhez a céghez</button>
        <button className="btn ghost block" onClick={() => { set({ uj: null, t: saved.id }); }}>Részletek megnyitása</button>
        <button className="btn quiet block" onClick={onDone}>Kész</button>
      </div>
    </div>;
  }
  const subjectSel = meta.subject !== "none" && (
    <Field label={meta.subject === "vehicle" ? "Rendszám" : "Gépkocsivezető"} required id="f-sub" hint={companyId ? (meta.subject === "vehicle" ? (vehicles.length ? "Csak a kiválasztott cég járművei." : "Ehhez a céghez még nincs jármű – írja be lent.") : (drivers.length ? "Csak a kiválasztott cég sofőrjei." : "Ehhez a céghez még nincs sofőr – írja be lent.")) : "Előbb válasszon céget."}>
      <select className="ctl" id="f-sub" disabled={!companyId} value={meta.subject === "vehicle" ? vehicleId : driverId} onChange={e => meta.subject === "vehicle" ? setVehicleId(e.target.value) : setDriverId(e.target.value)}>
        <option value="">{meta.subject === "vehicle" ? "Válasszon rendszámot…" : "Válasszon gépkocsivezetőt…"}</option>
        {meta.subject === "vehicle" ? vehicles.map(v => { const l = lastOf("vehicle", v.id); return <option key={v.id} value={v.id}>{v.plate}{l ? ` · utoljára ${fmtDate(l.done_at || l.due_at)}` : ""}</option>; }) : drivers.map(x => { const l = lastOf("driver", x.id); return <option key={x.id} value={x.id}>{x.name}{l ? ` · utoljára ${fmtDate(l.done_at || l.due_at)}` : ""}</option>; })}
      </select>
      {companyId && <div style={{ display: "flex", gap: 8, marginTop: 6 }}><input className={`ctl ${meta.subject === "vehicle" ? "mono" : ""}`} placeholder={meta.subject === "vehicle" ? "Új rendszám, pl. ABC-123" : "Új sofőr neve"} value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }} /><button type="button" className="btn secondary" onClick={addSubject} disabled={!newSub.trim()}>{Icon.plus(18)}</button></div>}
    </Field>
  );
  return (
    <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className={`nextup ${meta.cls}`} style={{ padding: 14, gridTemplateColumns: "44px 1fr" }}><span className="ico" style={{ width: 44, height: 44, borderRadius: 13, background: "var(--cs)", color: "var(--c)", display: "grid", placeItems: "center" }}><TypeIcon type={type} /></span><div><div className="t" style={{ margin: 0 }}>{meta.name}</div><div className="m">{edit ? "Meglévő tétel szerkesztése" : meta.cycleKey ? `A következő határidő automatikusan +${d[meta.cycleKey]} nap.` : type === "invoice" ? `Fizetési határidő automatikusan +${d.invoiceDays} nap.` : "Értesítés az oktatás előtti nap és a napján reggel."}</div></div></div>
      {data.companies.length === 0 && <div className="ferr">Még nincs rögzített cég. <button type="button" className="btn sm ghost" style={{ marginLeft: 8 }} onClick={() => set({ uj: "company" })}>Új cég</button></div>}
      <Field label="Cég" required id="f-company"><CompanySelect value={companyId} onChange={v => { setCompanyId(v); setVehicleId(""); setDriverId(""); }} /></Field>
      {subjectSel}

      {meta.cycleKey && <>
        <Field label={type === "calibration" ? "Kalibráció dátuma" : type === "card_expiry" ? "Kártya kiállításának dátuma" : "Letöltés ideje"} id="f-base" hint="Alapértelmezetten a mai nap. Ebből számoljuk a következő határidőt."><input className="ctl mono" id="f-base" type="date" value={base} onChange={e => setBase(e.target.value)} /></Field>
        <div className="autobox"><span>Következő határidő<br /><span style={{ fontWeight: 600, opacity: .8 }}>automatikusan +{d[meta.cycleKey]} naptári nap</span></span><span className="big">{fmtDate(dueDate)}</span></div>
        <details><summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Határidő felülírása</summary><div className="row2" style={{ marginTop: 10 }}><input className="ctl mono" type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); setDueTouched(true); }} /><input className="ctl mono" type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} /></div></details>
      </>}
      {type === "training" && <>
        <Field label="Oktatás ideje" required><div className="row2"><input className="ctl mono" type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); setDueTouched(true); }} /><input className="ctl mono" type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} /></div></Field>
        <Field label="Cím" required id="f-addr"><input className="ctl" id="f-addr" value={address} onChange={e => setAddress(e.target.value)} placeholder="Pl. Budapest, Fő utca 1." /></Field>
        <div className="row2">
          <Field label="Kapcsolattartó" id="f-cn">{contacts.length > 0 ? <input className="ctl" id="f-cn" list="contacts-dl" value={contactName} onChange={e => { setContactName(e.target.value); const c = contacts.find(x => x.name === e.target.value); if (c) setContactPhone(c.phone || ""); }} /> : <input className="ctl" id="f-cn" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Pl. Kovács Anna" />}<datalist id="contacts-dl">{contacts.map(c => <option key={c.id} value={c.name} />)}</datalist></Field>
          <Field label="Telefon" id="f-cp"><input className="ctl mono" id="f-cp" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+36 30 123 4567" /></Field>
        </div>
        <div className="row2">
          <Field label="Résztvevők" id="f-pn"><input className="ctl mono" id="f-pn" type="number" min={1} value={participants} onChange={e => setParticipants(e.target.value)} placeholder="fő" /></Field>
          <Field label="Téma" id="f-topic"><input className="ctl" id="f-topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Pl. vezetési és pihenőidő" /></Field>
        </div>
        <div className="info">{Icon.clock()}<span>Értesítés automatikusan: előző nap 16:00 és az oktatás napján 06:00 – a cég nevével, a címmel és a kapcsolattartó telefonszámával.</span></div>
      </>}
      {type === "invoice" && <>
        <div className="row2">
          <Field label="Számlaszám" required id="f-no"><input className="ctl mono" id="f-no" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="2026/001" /></Field>
          <Field label="Kiállítás dátuma" id="f-issue"><input className="ctl mono" id="f-issue" type="date" value={issue} onChange={e => setIssue(e.target.value)} /></Field>
        </div>
        <div className="row2">
          <Field label="Bruttó összeg (Ft)" required id="f-gross" hint={gross ? `Nettó ${fmtFt(Math.round(Number(gross) / (1 + (Number(vat) || 0) / 100)))}` : undefined}><input className="ctl mono" id="f-gross" type="number" inputMode="numeric" min={0} value={gross} onChange={e => setGross(e.target.value)} placeholder="35 700" /></Field>
          <Field label="ÁFA %" id="f-vat"><select className="ctl" id="f-vat" value={vat} onChange={e => setVat(e.target.value)}><option value="27">27%</option><option value="5">5%</option><option value="0">0% / AAM</option></select></Field>
        </div>
        <div className="row2">
          <Field label="Fizetési határidő" id="f-due" hint={`Automatikusan +${company?.invoice_days || d.invoiceDays} nap.`}><input className="ctl mono" id="f-due" type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); setDueTouched(true); }} /></Field>
          <Field label="Kifizetés dátuma" id="f-paid" hint="Ha már kifizették."><input className="ctl mono" id="f-paid" type="date" value={paid} onChange={e => setPaid(e.target.value)} /></Field>
        </div>
      </>}

      {type !== "training" && type !== "invoice" && <div className="field"><label>Emlékeztetők</label>
        {!useCustom ? <>
          <div className="chips">{[14, 7, 3, 1, 0].map(n => <button key={n} type="button" className="chip" aria-pressed={remDays.includes(n)} onClick={() => setRemDays(r => r.includes(n) ? r.filter(x => x !== n) : [...r, n].sort((a, b) => b - a))}>{n === 0 ? "A napján" : `${n} nappal előtte`}</button>)}</div>
          <div className="row2" style={{ marginTop: 8, alignItems: "end" }}><Field label="Időpont"><input className="ctl mono" type="time" value={remTime} onChange={e => setRemTime(e.target.value)} /></Field><button type="button" className="btn quiet sm" onClick={() => { setCustomRem(reminders.map(r => r.slice(0, 16))); setUseCustom(true); }}>Egyedi időpontok…</button></div>
        </> : <>
          {customRem.map((r, i) => <div key={i} style={{ display: "flex", gap: 8 }}><input className="ctl mono" type="datetime-local" value={r} onChange={e => setCustomRem(a => a.map((x, j) => j === i ? e.target.value : x))} /><button type="button" className="btn secondary" onClick={() => setCustomRem(a => a.filter((_, j) => j !== i))}>{Icon.x(16)}</button></div>)}
          <div style={{ display: "flex", gap: 8 }}><button type="button" className="btn ghost sm" onClick={() => setCustomRem(a => [...a, `${dueDate}T${remTime}`])}>{Icon.plus(16)} Időpont</button><button type="button" className="btn quiet sm" onClick={() => setUseCustom(false)}>Vissza az alapértékekhez</button></div>
        </>}
        <div className="hint">{reminders.length ? reminders.map(r => `${fmtDate(r)} ${timeOf(r)}`).join(" · ") : "Nincs jövőbeli emlékeztető."}</div>
      </div>}

      {meta.cycleKey && !edit && <div className="srow" style={{ border: 0, padding: "4px 0" }}><div><div className="k">Sorozat</div><div className="d">Lezáráskor automatikusan létrejön a következő ciklus (+{d[meta.cycleKey]} nap).</div></div><Switch checked={recurring} onChange={setRecurring} label="Sorozat" /></div>}
      <Field label="Megjegyzés" id="f-note" hint="A listában a tétel alatt, az értesítésben is megjelenik."><textarea className="ctl" id="f-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Pl. telephelyen letölteni" /></Field>
      {err && <div className="ferr">{err}</div>}
      <div style={{ display: "flex", gap: 10 }}><button type="button" className="btn ghost" style={{ flex: 1 }} onClick={onDone}>Mégse</button><button type="submit" className="btn primary" style={{ flex: 2 }} disabled={busy}>{Icon.check(18)} {edit ? "Mentés" : "Rögzítés"}</button></div>
    </form>
  );
}

/* ---------- company / vehicle / driver forms ---------- */
export function CompanyForm({ onDone, editId }: { onDone: (id?: string) => void; editId?: string }) {
  const data = useData()!; const mutate = useMutate(); const edit = editId ? data.companies.find(c => c.id === editId) : undefined;
  const [f, setF] = useState({ name: edit?.name || "", tax_id: edit?.tax_id || "", address: edit?.address || "", phone: edit?.phone || "", email: edit?.email || "", notes: edit?.notes || "", invoice_days: edit?.invoice_days?.toString() || "", contactName: "", contactPhone: "" });
  const [err, setErr] = useState<string | null>(null);
  const u = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(s => ({ ...s, [k]: e.target.value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); const name = companyName(f.name); if (!name) return setErr("Adja meg a cég nevét.");
    if (!edit && data.companies.some(c => c.name.toLocaleLowerCase("hu") === name.toLocaleLowerCase("hu"))) return setErr("Ilyen nevű cég már szerepel.");
    const payload = { name, tax_id: f.tax_id.trim() || null, address: f.address.trim() || null, phone: f.phone.trim() || null, email: f.email.trim() || null, notes: f.notes.trim() || null, invoice_days: f.invoice_days ? Number(f.invoice_days) : null };
    if (edit) { await mutate(r => r.company.update(edit.id, payload), { success: "Mentve" }); onDone(edit.id); return; }
    const c = await mutate(r => r.company.create(payload), { success: "Cég rögzítve" });
    if (f.contactName.trim()) await mutate(r => r.contact.create({ company_id: c.id, name: titleCase(f.contactName), phone: f.contactPhone.trim() || null, is_primary: true }));
    onDone(c.id);
  }
  return <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <Field label="Cég neve" required id="c-name"><input className="ctl" id="c-name" value={f.name} onChange={u("name")} placeholder="Pl. Példa Kft." autoFocus /></Field>
    <div className="row2"><Field label="Adószám" id="c-tax"><input className="ctl mono" id="c-tax" value={f.tax_id} onChange={u("tax_id")} placeholder="12345678-2-42" /></Field><Field label="Telefon" id="c-phone"><input className="ctl mono" id="c-phone" type="tel" value={f.phone} onChange={u("phone")} placeholder="+36 1 234 5678" /></Field></div>
    <Field label="Cím" id="c-addr"><input className="ctl" id="c-addr" value={f.address} onChange={u("address")} placeholder="Irányítószám, település, utca" /></Field>
    <div className="row2"><Field label="E-mail" id="c-email"><input className="ctl" id="c-email" type="email" value={f.email} onChange={u("email")} /></Field><Field label="Fizetési határidő (nap)" id="c-inv" hint="Üresen az alapértelmezett."><input className="ctl mono" id="c-inv" type="number" min={0} value={f.invoice_days} onChange={u("invoice_days")} placeholder={String(data.workspace.defaults.invoiceDays)} /></Field></div>
    {!edit && <div className="row2"><Field label="Kapcsolattartó" id="c-cn"><input className="ctl" id="c-cn" value={f.contactName} onChange={u("contactName")} placeholder="Név" /></Field><Field label="Kapcsolattartó telefon" id="c-cp"><input className="ctl mono" id="c-cp" type="tel" value={f.contactPhone} onChange={u("contactPhone")} /></Field></div>}
    <Field label="Jegyzet" id="c-notes"><textarea className="ctl" id="c-notes" value={f.notes} onChange={u("notes")} /></Field>
    {err && <div className="ferr">{err}</div>}
    <div style={{ display: "flex", gap: 10 }}><button type="button" className="btn ghost" style={{ flex: 1 }} onClick={() => onDone()}>Mégse</button><button type="submit" className="btn primary" style={{ flex: 2 }}>{Icon.check(18)} {edit ? "Mentés" : "Cég rögzítése"}</button></div>
  </form>;
}
export function VehicleForm({ onDone, editId, companyId: cidProp }: { onDone: () => void; editId?: string; companyId?: string }) {
  const data = useData()!; const mutate = useMutate(); const { get } = useUrlState(); const edit = editId ? data.vehicles.find(v => v.id === editId) : undefined;
  const [cid, setCid] = useState(edit?.company_id || cidProp || get("cid") || ""); const [plate, setPlate] = useState(edit?.plate || ""); const [make, setMake] = useState(edit?.make || ""); const [vu, setVu] = useState(edit?.vu_type || ""); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) { e.preventDefault(); const p = plateFmt(plate); if (!cid) return setErr("Válasszon céget."); if (!p) return setErr("Adja meg a rendszámot."); const key = p.replace(/[^A-Z0-9]/g, ""); const dup = data.vehicles.find(v => v.plate.replace(/[^A-Z0-9]/g, "") === key && v.id !== edit?.id); if (dup) return setErr(`Ez a rendszám már szerepel (${data.companies.find(c => c.id === dup.company_id)?.name}).`);
    const payload = { company_id: cid, plate: p, make: make.trim() || null, vu_type: vu || null }; if (edit) await mutate(r => r.vehicle.update(edit.id, payload), { success: "Mentve" }); else await mutate(r => r.vehicle.create(payload), { success: "Jármű rögzítve" }); onDone(); }
  return <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <Field label="Cég" required id="v-c"><CompanySelect id="v-c" value={cid} onChange={setCid} /></Field>
    <Field label="Rendszám" required id="v-p" hint="Mindig nagybetűvel, kötőjellel: ABC-123 vagy AA BB-123."><input className="ctl mono" id="v-p" value={plate} onChange={e => setPlate(e.target.value)} onBlur={() => setPlate(plateFmt(plate))} placeholder="ABC-123" autoFocus style={{ textTransform: "uppercase", letterSpacing: ".08em" }} /></Field>
    <div className="row2"><Field label="Gyártmány / típus" id="v-m"><input className="ctl" id="v-m" value={make} onChange={e => setMake(e.target.value)} placeholder="Pl. Volvo FH" /></Field><Field label="Tachográf" id="v-vu"><select className="ctl" id="v-vu" value={vu} onChange={e => setVu(e.target.value)}><option value="">–</option><option>Smart tachográf G2 v2</option><option>Smart tachográf G2</option><option>Smart tachográf G1</option><option>Digitális tachográf</option><option>Analóg</option></select></Field></div>
    {err && <div className="ferr">{err}</div>}
    <div style={{ display: "flex", gap: 10 }}><button type="button" className="btn ghost" style={{ flex: 1 }} onClick={onDone}>Mégse</button><button type="submit" className="btn primary" style={{ flex: 2 }}>{Icon.check(18)} {edit ? "Mentés" : "Jármű rögzítése"}</button></div>
  </form>;
}
export function DriverForm({ onDone, editId, companyId: cidProp }: { onDone: () => void; editId?: string; companyId?: string }) {
  const data = useData()!; const mutate = useMutate(); const { get } = useUrlState(); const edit = editId ? data.drivers.find(v => v.id === editId) : undefined;
  const [cid, setCid] = useState(edit?.company_id || cidProp || get("cid") || ""); const [name, setName] = useState(edit?.name || ""); const [card, setCard] = useState(edit?.card_number || ""); const [phone, setPhone] = useState(edit?.phone || ""); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) { e.preventDefault(); const n = titleCase(name); if (!cid) return setErr("Válasszon céget."); if (!n) return setErr("Adja meg a nevet."); if (data.drivers.some(x => x.company_id === cid && x.name === n && x.id !== edit?.id)) return setErr("Ez a sofőr már szerepel ennél a cégnél.");
    const payload = { company_id: cid, name: n, card_number: card.trim() || null, phone: phone.trim() || null }; if (edit) await mutate(r => r.driver.update(edit.id, payload), { success: "Mentve" }); else await mutate(r => r.driver.create(payload), { success: "Gépkocsivezető rögzítve" }); onDone(); }
  return <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <Field label="Cég" required id="d-c"><CompanySelect id="d-c" value={cid} onChange={setCid} /></Field>
    <Field label="Név" required id="d-n" hint="Minden szó nagybetűvel kezdődik – az app javítja."><input className="ctl" id="d-n" value={name} onChange={e => setName(e.target.value)} onBlur={() => setName(titleCase(name))} placeholder="Pl. Kovács János" autoFocus autoCapitalize="words" /></Field>
    <div className="row2"><Field label="Kártyaszám" id="d-k"><input className="ctl mono" id="d-k" value={card} onChange={e => setCard(e.target.value)} placeholder="HU…" /></Field><Field label="Telefon" id="d-p"><input className="ctl mono" id="d-p" type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></Field></div>
    {err && <div className="ferr">{err}</div>}
    <div style={{ display: "flex", gap: 10 }}><button type="button" className="btn ghost" style={{ flex: 1 }} onClick={onDone}>Mégse</button><button type="submit" className="btn primary" style={{ flex: 2 }}>{Icon.check(18)} {edit ? "Mentés" : "Rögzítés"}</button></div>
  </form>;
}
