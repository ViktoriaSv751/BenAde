"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Activity, Company, Contact, Driver, Vehicle } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import { fmtDT, fmtDate, relLabel, todayISO } from "@/lib/date";
import { fmtFt, initials, phoneHref, titleCase } from "@/lib/format";
import { useData, useMutate, useRepo } from "@/lib/data";
import { Empty, Field, Icon, Panel, Seg, Skeleton, Tabs, useConfirm } from "@/components/ui";
import { TaskRow } from "./TaskRow";
import { TopBar, useShell, useUrlState } from "./Shell";
import { CompanyForm, DriverForm, VehicleForm } from "./Capture";

type Sort = "name" | "due" | "money";

export function CustomersView({ selectedId }: { selectedId?: string }) {
  const data = useData(); const { layout, openCapture, demo } = useShell(); const router = useRouter();
  const [q, setQ] = useState(""); const [sort, setSort] = useState<Sort>("due"); const [arch, setArch] = useState(false);
  const base = demo ? "/demo" : "/app";
  const rows = useMemo(() => {
    if (!data) return [];
    const Q = q.trim().toLocaleLowerCase("hu");
    return data.companies.filter(c => (arch ? !!c.archived_at : !c.archived_at) && (!Q || c.name.toLocaleLowerCase("hu").includes(Q) || (c.tax_id || "").includes(Q))).map(c => {
      const open = data.tasks.filter(t => t.company_id === c.id && t.status === "open");
      const next = open.map(t => t.due_at).sort()[0]; const overdue = open.filter(t => t.due_at.slice(0, 10) < todayISO()).length;
      const money = open.filter(t => t.type === "invoice").reduce((s, t) => s + Number(t.gross_amount || 0), 0);
      return { c, next, overdue, money, vehicles: data.vehicles.filter(v => v.company_id === c.id && !v.archived_at).length, drivers: data.drivers.filter(d => d.company_id === c.id && !d.archived_at).length };
    }).sort((a, b) => sort === "name" ? a.c.name.localeCompare(b.c.name, "hu") : sort === "money" ? b.money - a.money : (a.next || "9").localeCompare(b.next || "9"));
  }, [data, q, sort, arch]);
  if (!data) return <><TopBar title="Ügyfelek" /><div className="content"><Skeleton n={5} /></div></>;
  const list = (
    <div className="content">
      <div style={{ position: "relative" }}><input className="ctl" style={{ paddingLeft: 42, borderRadius: 999 }} placeholder="Keresés név vagy adószám szerint…" value={q} onChange={e => setQ(e.target.value)} /><span style={{ position: "absolute", left: 15, top: 14, color: "var(--faint)" }}>{Icon.search(18)}</span></div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Seg value={sort} onChange={setSort} options={[{ value: "due", label: "Határidő" }, { value: "name", label: "Név" }, { value: "money", label: "Kintlévőség" }]} /><button className="chip" aria-pressed={arch} onClick={() => setArch(a => !a)} style={{ marginLeft: "auto" }}>Archivált</button></div>
      {rows.length === 0 ? <Empty icon={Icon.users(26)} title={q ? "Nincs találat" : arch ? "Nincs archivált cég" : "Még nincs ügyfél"} text={q ? "Próbáljon más keresőszót." : "Rögzítse az első céget, utána jöhetnek a járművek és a sofőrök."} action={!q && !arch ? <button className="btn primary sm" onClick={() => openCapture("company")}>{Icon.plus(16)} Új cég</button> : undefined} />
        : <div className="list">{rows.map(r => <button key={r.c.id} className="crow" aria-selected={(selectedId || rows[0]?.c.id) === r.c.id} onClick={() => router.push(`${base}/ugyfelek/${r.c.id}`)}>
          <span className="avatar">{initials(r.c.name)}</span>
          <span style={{ minWidth: 0 }}><div className="n">{r.c.name}</div><div className="m" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.vehicles} jármű · {r.drivers} sofőr{r.c.tax_id ? <span className="mono"> · {r.c.tax_id}</span> : null}</div></span>
          <span className="r">{r.next ? <span className={`badge ${relLabel(r.next).tone}`}>{r.overdue ? `${r.overdue} lejárt` : relLabel(r.next).text}</span> : <span className="badge plain">nincs teendő</span>}{r.money > 0 && <span className="mono" style={{ color: "var(--danger-fg)" }}>{fmtFt(r.money)}</span>}</span>
        </button>)}</div>}
    </div>
  );
  return <>
    <TopBar title="Ügyfelek" sub={layout === "desktop" ? `${data.companies.filter(c => !c.archived_at).length} aktív cég` : undefined} actions={layout !== "phone" ? <button className="btn primary sm" onClick={() => openCapture("company")}>{Icon.plus(16)} Új cég</button> : <button className="ibtn" onClick={() => openCapture("company")} aria-label="Új cég">{Icon.plus(20)}</button>} />
    {layout === "phone" ? list : <div className="split"><div className="pane">{list}</div><div className="pane detail">{(selectedId || rows[0]?.c.id) ? <CompanyProfile id={(selectedId || rows[0]!.c.id) as string} embedded /> : <div className="placeholder"><div>{Icon.users(40)}<p style={{ marginTop: 10 }}>Válasszon egy céget a részletekhez,<br />vagy keressen ⌘K-val.</p></div></div>}</div></div>}
  </>;
}

type Tab = "overview" | "vehicles" | "drivers" | "tasks" | "invoices" | "log";
export function CompanyProfile({ id, embedded }: { id: string; embedded?: boolean }) {
  const data = useData(); const repo = useRepo(); const mutate = useMutate(); const { layout, openCapture, demo, role } = useShell(); const { get, set } = useUrlState(); const router = useRouter();
  const [tab, setTab] = useState<Tab>((get("tab") as Tab) || "overview"); const [edit, setEdit] = useState<null | { kind: "company" } | { kind: "vehicle"; id?: string } | { kind: "driver"; id?: string } | { kind: "contact"; c?: Contact }>(null);
  const [act, setAct] = useState<Activity[]>([]); const { confirm, confirmEl } = useConfirm();
  const base = demo ? "/demo" : "/app";
  useEffect(() => { setTab((get("tab") as Tab) || "overview"); }, [id, get]);
  const c = data?.companies.find(x => x.id === id);
  useEffect(() => { if (!c) return; repo.activity(50).then(a => setAct(a.filter(x => x.entity_id === c.id || data!.tasks.some(t => t.id === x.entity_id && t.company_id === c.id) || data!.vehicles.some(v => v.id === x.entity_id && v.company_id === c.id) || data!.drivers.some(d => d.id === x.entity_id && d.company_id === c.id)))).catch(() => {}); }, [repo, c, data, tab]);
  if (!data) return <div className="content"><Skeleton /></div>;
  if (!c) return <>{!embedded && <TopBar title="Ügyfél" back={`${base}/ugyfelek`} />}<div className="content"><Empty title="Ez a cég nem található" /></div></>;
  const vehicles = data.vehicles.filter(v => v.company_id === id && !v.archived_at), drivers = data.drivers.filter(d => d.company_id === id && !d.archived_at), contacts = data.contacts.filter(x => x.company_id === id);
  const tasks = data.tasks.filter(t => t.company_id === id); const open = tasks.filter(t => t.status === "open").sort((a, b) => a.due_at.localeCompare(b.due_at)); const invoices = tasks.filter(t => t.type === "invoice").sort((a, b) => b.due_at.localeCompare(a.due_at));
  const outstanding = invoices.filter(i => !i.paid_at).reduce((s, i) => s + Number(i.gross_amount || 0), 0);
  const lastFor = (kind: "vehicle" | "driver", xid: string, type: "vu_download" | "card_download") => tasks.filter(t => t.type === type && (kind === "vehicle" ? t.vehicle_id === xid : t.driver_id === xid)).sort((a, b) => b.due_at.localeCompare(a.due_at));
  const archive = async () => { if (await confirm({ title: c.archived_at ? "Visszaállítás" : "Cég archiválása", text: c.archived_at ? "A cég újra megjelenik az aktív listában." : "A cég és adatai megmaradnak, de eltűnnek az aktív listákból. Bármikor visszaállítható.", okLabel: c.archived_at ? "Visszaállítás" : "Archiválás" })) await mutate(r => r.company.update(c.id, { archived_at: c.archived_at ? null : new Date().toISOString() }), { success: c.archived_at ? "Visszaállítva" : "Archiválva" }); };
  const remove = async () => { if (await confirm({ title: "Cég végleges törlése", text: `${c.name}: ${vehicles.length} jármű, ${drivers.length} sofőr és ${tasks.length} tétel törlődik. Nem vonható vissza. Írja be: TÖRLÉS`, okLabel: "Törlés", danger: true, confirmWord: "TÖRLÉS" })) { await mutate(r => r.company.remove(c.id), { success: "Cég törölve" }); router.push(`${base}/ugyfelek`); } };
  const header = (
    <div className="card pad" style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 14, alignItems: "start" }}>
      <span className="avatar" style={{ width: 56, height: 56, borderRadius: 16, fontSize: 18 }}>{initials(c.name)}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><h2 style={{ fontSize: 20 }}>{c.name}</h2>{c.tags.map(t => <span key={t} className="badge plain">{t}</span>)}{c.archived_at && <span className="badge plain">archivált</span>}</div>
        <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 2 }}>{c.tax_id && <span className="mono">{c.tax_id}</span>}{c.address && <> · {c.address}</>}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {c.phone && <a className="btn secondary sm" href={phoneHref(c.phone)}>{Icon.phone(14)} {c.phone}</a>}
          {c.email && <a className="btn secondary sm" href={`mailto:${c.email}`}>{Icon.mail(14)} E-mail</a>}
          <button className="btn secondary sm" onClick={() => setEdit({ kind: "company" })}>{Icon.pen(14)} Szerkesztés</button>
          {!demo && <a className="btn secondary sm" href={`/api/pdf/company/${c.id}`} target="_blank" rel="noopener">{Icon.file(14)} Flotta-naptár PDF</a>}
        </div>
      </div>
    </div>
  );
  const body = (
    <>
      {header}
      <Tabs value={tab} onChange={v => { setTab(v); set({ tab: v }, true); }} options={[{ value: "overview", label: "Áttekintés" }, { value: "vehicles", label: "Járművek", count: vehicles.length }, { value: "drivers", label: "Sofőrök", count: drivers.length }, { value: "tasks", label: "Teendők", count: open.length }, { value: "invoices", label: "Számlák", count: invoices.filter(i => !i.paid_at).length }, { value: "log", label: "Napló" }]} />
      {tab === "overview" && <>
        <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="stat"><div className="v">{open.length}</div><div className="l">Nyitott teendő</div></div>
          <div className={`stat ${open.some(t => t.due_at.slice(0, 10) < todayISO()) ? "danger" : ""}`}><div className="v">{open.filter(t => t.due_at.slice(0, 10) < todayISO()).length}</div><div className="l">Lejárt</div></div>
          <div className="stat"><div className="v" style={{ fontSize: 18 }}>{fmtFt(outstanding)}</div><div className="l">Kintlévőség</div></div>
        </div>
        <div className="sec"><h2>Következő határidők</h2><button className="btn quiet sm" onClick={() => openCapture("vu_download", { cid: c.id })}>{Icon.plus(14)} Letöltés rögzítése</button></div>
        {open.length ? <div className="list">{open.slice(0, 5).map(t => <TaskRow key={t.id} t={t} compact swipe={false} />)}</div> : <div className="info">{Icon.info()}<span>Nincs nyitott teendő ennél a cégnél.</span></div>}
        <div className="sec"><h2>Kapcsolattartók</h2><button className="btn quiet sm" onClick={() => setEdit({ kind: "contact" })}>{Icon.plus(14)} Új</button></div>
        <div className="card" style={{ padding: "0 14px" }}><div className="rows">{contacts.length === 0 && <div className="rowi" style={{ gridTemplateColumns: "1fr", color: "var(--muted)", fontSize: 13.5 }}>Még nincs kapcsolattartó.</div>}{contacts.map(k => <div className="rowi" key={k.id}><span className="avatar" style={{ width: 36, height: 36, borderRadius: 10 }}>{initials(k.name)}</span><span style={{ minWidth: 0 }}><div className="n">{k.name}{k.is_primary && <span className="badge plain" style={{ marginLeft: 8 }}>elsődleges</span>}</div><div className="m">{k.role || ""}{k.phone && <> · <a href={phoneHref(k.phone)} className="mono">{k.phone}</a></>}{k.email && <> · {k.email}</>}</div></span><span className="ops"><button onClick={() => setEdit({ kind: "contact", c: k })} aria-label="Szerkesztés">{Icon.pen(16)}</button><button onClick={async () => { if (await confirm({ title: "Kapcsolattartó törlése", text: k.name, okLabel: "Törlés", danger: true })) mutate(r => r.contact.remove(k.id)); }} aria-label="Törlés">{Icon.trash(16)}</button></span></div>)}</div></div>
        {c.notes && <div className="card pad"><div className="sec" style={{ margin: "0 0 8px" }}><h2>Jegyzet</h2></div><p style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{c.notes}</p></div>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn ghost sm" onClick={archive}>{c.archived_at ? Icon.refresh(14) : Icon.history(14)} {c.archived_at ? "Visszaállítás" : "Archiválás"}</button>{role === "owner" && <button className="btn danger sm" onClick={remove}>{Icon.trash(14)} Végleges törlés</button>}</div>
      </>}
      {tab === "vehicles" && <>
        <div className="sec" style={{ marginTop: 6 }}><h2>Járművek</h2><button className="btn primary sm" onClick={() => setEdit({ kind: "vehicle" })}>{Icon.plus(14)} Új jármű</button></div>
        {vehicles.length === 0 ? <Empty icon={Icon.truck(26)} title="Még nincs jármű" text="Rögzítse a rendszámokat; utána egy koppintás a letöltés." />
          : <div className="card" style={{ padding: "0 14px" }}><div className="rows">{vehicles.map(v => { const last = lastFor("vehicle", v.id, "vu_download"); const nxt = last.find(t => t.status === "open"); const prev = last.find(t => t.status === "done"); return <div className="rowi" key={v.id} style={{ gridTemplateColumns: "1fr auto" }}>
            <span style={{ minWidth: 0 }}><div className="n"><span className="plate">{v.plate}</span> <span style={{ fontWeight: 600, color: "var(--muted)", fontSize: 13 }}>{v.make || ""}{v.vu_type ? ` · ${v.vu_type}` : ""}</span></div><div className="m">{prev ? `Utolsó letöltés: ${fmtDate(prev.done_at || prev.due_at)}` : "Még nincs letöltés"}{nxt && <> · <span className={`badge ${relLabel(nxt.due_at).tone}`} style={{ verticalAlign: "middle" }}>köv. {fmtDate(nxt.due_at)}</span></>}</div></span>
            <span className="ops"><button title="Letöltés rögzítése" onClick={() => openCapture("vu_download", { cid: c.id, vid: v.id })}>{Icon.dl(16)}</button><button onClick={() => setEdit({ kind: "vehicle", id: v.id })} aria-label="Szerkesztés">{Icon.pen(16)}</button><button onClick={async () => { if (await confirm({ title: "Jármű törlése", text: `${v.plate} és a hozzá tartozó teendők törlődnek.`, okLabel: "Törlés", danger: true })) mutate(r => r.vehicle.remove(v.id), { success: "Törölve" }); }} aria-label="Törlés">{Icon.trash(16)}</button></span>
          </div>; })}</div></div>}
      </>}
      {tab === "drivers" && <>
        <div className="sec" style={{ marginTop: 6 }}><h2>Gépkocsivezetők</h2><button className="btn primary sm" onClick={() => setEdit({ kind: "driver" })}>{Icon.plus(14)} Új sofőr</button></div>
        {drivers.length === 0 ? <Empty icon={Icon.user(26)} title="Még nincs gépkocsivezető" />
          : <div className="card" style={{ padding: "0 14px" }}><div className="rows">{drivers.map(d => { const last = lastFor("driver", d.id, "card_download"); const nxt = last.find(t => t.status === "open"); const prev = last.find(t => t.status === "done"); return <div className="rowi" key={d.id}>
            <span className="avatar" style={{ width: 36, height: 36, borderRadius: 10 }}>{initials(d.name)}</span>
            <span style={{ minWidth: 0 }}><div className="n">{d.name}</div><div className="m">{d.card_number && <span className="mono">{d.card_number} · </span>}{prev ? `Utolsó letöltés: ${fmtDate(prev.done_at || prev.due_at)}` : "Még nincs letöltés"}{nxt && <> · <span className={`badge ${relLabel(nxt.due_at).tone}`} style={{ verticalAlign: "middle" }}>köv. {fmtDate(nxt.due_at)}</span></>}</div></span>
            <span className="ops"><button title="Letöltés rögzítése" onClick={() => openCapture("card_download", { cid: c.id, did: d.id })}>{Icon.dl(16)}</button><button onClick={() => setEdit({ kind: "driver", id: d.id })} aria-label="Szerkesztés">{Icon.pen(16)}</button><button onClick={async () => { if (await confirm({ title: "Sofőr törlése", text: `${d.name} és a hozzá tartozó teendők törlődnek.`, okLabel: "Törlés", danger: true })) mutate(r => r.driver.remove(d.id), { success: "Törölve" }); }} aria-label="Törlés">{Icon.trash(16)}</button></span>
          </div>; })}</div></div>}
      </>}
      {tab === "tasks" && <>
        <div className="sec" style={{ marginTop: 6 }}><h2>Nyitott teendők</h2><span className="n">{open.length}</span></div>
        {open.length ? <div className="list">{open.map(t => <TaskRow key={t.id} t={t} compact={layout === "desktop"} swipe={false} />)}</div> : <Empty title="Nincs nyitott teendő" />}
        {tasks.some(t => t.status !== "open" && t.type !== "invoice") && <><div className="sec"><h2>Elvégzett</h2></div><div className="list">{tasks.filter(t => t.status !== "open" && t.type !== "invoice").sort((a, b) => (b.done_at || "").localeCompare(a.done_at || "")).slice(0, 20).map(t => <TaskRow key={t.id} t={t} compact swipe={false} />)}</div></>}
      </>}
      {tab === "invoices" && <>
        <div className="sec" style={{ marginTop: 6 }}><h2>Számlák</h2><button className="btn primary sm" onClick={() => openCapture("invoice", { cid: c.id })}>{Icon.plus(14)} Új számla</button></div>
        {invoices.length ? <div className="list">{invoices.map(t => <TaskRow key={t.id} t={t} compact swipe={false} />)}</div> : <Empty title="Nincs számla" />}
      </>}
      {tab === "log" && <div className="card pad"><div className="timeline">{act.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Még nincs naplóbejegyzés.</div>}{act.map(a => <div className="ev" key={a.id}><i /><div><b>{labelAct(a)}</b><div><span>{fmtDT(a.created_at)}</span></div></div></div>)}</div></div>}
      {confirmEl}
      <Panel open={!!edit} onClose={() => setEdit(null)} title={edit?.kind === "company" ? "Cég szerkesztése" : edit?.kind === "vehicle" ? (edit.id ? "Jármű szerkesztése" : "Új jármű") : edit?.kind === "driver" ? (edit.id ? "Sofőr szerkesztése" : "Új gépkocsivezető") : edit?.kind === "contact" ? (edit.c ? "Kapcsolattartó" : "Új kapcsolattartó") : ""}>
        {edit?.kind === "company" && <CompanyForm editId={c.id} onDone={() => setEdit(null)} />}
        {edit?.kind === "vehicle" && <VehicleForm editId={edit.id} companyId={c.id} onDone={() => setEdit(null)} />}
        {edit?.kind === "driver" && <DriverForm editId={edit.id} companyId={c.id} onDone={() => setEdit(null)} />}
        {edit?.kind === "contact" && <ContactForm companyId={c.id} contact={edit.c} onDone={() => setEdit(null)} />}
      </Panel>
    </>
  );
  if (embedded) return <div className="inner" style={{ display: "flex", flexDirection: "column", gap: 14 }}>{body}</div>;
  return <><TopBar title={c.name} back={`${base}/ugyfelek`} /><div className="content">{body}</div></>;
}
function labelAct(a: Activity) { const e = { companies: "Cég", vehicles: "Jármű", drivers: "Sofőr", tasks: "Teendő", contacts: "Kapcsolattartó" }[a.entity] || a.entity; const act = { insert: "létrehozva", update: "módosítva", delete: "törölve", done: "elvégezve" }[a.action] || a.action; const after = a.after as Record<string, unknown> | undefined; const name = (after?.name || after?.plate || (after?.type && TASK_META[after.type as keyof typeof TASK_META]?.short)) as string | undefined; return `${e} ${act}${name ? ` · ${name}` : ""}`; }

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
