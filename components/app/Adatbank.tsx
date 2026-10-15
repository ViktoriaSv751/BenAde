"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Driver, Snapshot, Vehicle } from "@/lib/types";
import { fmtDate, relLabel } from "@/lib/date";
import { initials, plateFmt, titleCase } from "@/lib/format";
import { useData, useMutate } from "@/lib/data";
import { Empty, Field, Icon, Panel, Seg, Skeleton, Switch, useConfirm } from "@/components/ui";
import { TopBar, useShell, useUrlState } from "./Shell";
import { CompanyList, CompanyProfile, HuPlate, firstCompanyId } from "./Customers";
import { DriverForm, VehicleForm } from "./Capture";

type View = "cegek" | "soforok" | "jarmuvek";

/** Adatbank: Cégek · Gépkocsivezetők · Járművek – egy helyen, a koncepció szerint. */
export function AdatbankView({ selectedId, forceView }: { selectedId?: string; forceView?: View }) {
  const data = useData(); const { layout, openCapture } = useShell(); const { get, set } = useUrlState();
  const view = (forceView || (get("nezet") as View) || "cegek") as View;
  if (!data) return <><TopBar title="Adatbank" /><div className="content"><Skeleton n={5} /></div></>;
  const nC = data.companies.filter(c => !c.archived_at).length, nV = data.vehicles.filter(v => !v.archived_at).length, nD = data.drivers.filter(d => !d.archived_at).length;
  const seg = <Seg ariaLabel="Adatbank nézet" value={view} onChange={v => set({ nezet: v === "cegek" ? null : v, cid: null }, true)} options={[{ value: "cegek", label: "Cégek", count: nC }, { value: "soforok", label: "Gépkocsivezetők", count: nD }, { value: "jarmuvek", label: "Járművek", count: nV }]} />;
  const action = layout === "phone" ? undefined : view === "cegek" ? <button className="btn primary sm" onClick={() => openCapture("company")}>{Icon.plus(16)} Új cég</button> : null;
  const top = <TopBar title="Adatbank" sub={layout === "desktop" ? `${nC} cég · ${nD} gépkocsivezető · ${nV} jármű` : undefined} actions={action} />;
  if (view === "cegek") {
    if (layout === "phone") return <>{top}<div className="content dbank">{seg}<CompanyList /></div></>;
    const sel = selectedId || firstCompanyId(data);
    return <>{top}<div className="split"><div className="pane"><div className="content dbank">{seg}<CompanyList selectedId={sel} /></div></div><div className="pane detail">{sel ? <CompanyProfile id={sel} embedded /> : <div className="placeholder"><div>{Icon.db(40)}<p style={{ marginTop: 10 }}>Rögzítse az első céget.</p></div></div>}</div></div></>;
  }
  return <>{top}<div className="content dbank">{seg}<SubjectBank kind={view === "soforok" ? "driver" : "vehicle"} /></div></>;
}

function SubjectBank({ kind }: { kind: "driver" | "vehicle" }) {
  const data = useData()!; const mutate = useMutate(); const { get, set } = useUrlState(); const { openCapture, layout, demo } = useShell(); const { confirm, confirmEl } = useConfirm();
  const base = demo ? "/demo" : "/app";
  const companies = useMemo(() => data.companies.filter(c => !c.archived_at).sort((a, b) => a.name.localeCompare(b.name, "hu")), [data.companies]);
  const cid = get("cid") || "";
  const company = companies.find(c => c.id === cid);
  const [val, setVal] = useState(""); const [extra, setExtra] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [q, setQ] = useState(""); const [edit, setEdit] = useState<string | null>(null);
  const isV = kind === "vehicle";
  const cname = (id: string) => data.companies.find(c => c.id === id)?.name || "";
  const items = useMemo(() => {
    const Q = q.trim().toLocaleLowerCase("hu").replace(/[\s-]/g, "");
    const list = (isV ? data.vehicles : data.drivers).filter(x => !x.archived_at && (!cid || x.company_id === cid)) as (Vehicle | Driver)[];
    return list.filter(x => { if (!Q) return true; const t = (isV ? (x as Vehicle).plate : (x as Driver).name).toLocaleLowerCase("hu").replace(/[\s-]/g, ""); return t.includes(Q) || cname(x.company_id).toLocaleLowerCase("hu").includes(Q); })
      .sort((a, b) => (cid ? 0 : cname(a.company_id).localeCompare(cname(b.company_id), "hu")) || (isV ? (a as Vehicle).plate.localeCompare((b as Vehicle).plate) : (a as Driver).name.localeCompare((b as Driver).name, "hu")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, cid, q, isV]);
  const nextFor = (id: string) => data.tasks.filter(t => t.status === "open" && (isV ? t.vehicle_id === id && t.type === "vu_download" : t.driver_id === id && t.type === "card_download")).sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
  const lastFor = (id: string) => data.tasks.filter(t => t.status === "done" && (isV ? t.vehicle_id === id && t.type === "vu_download" : t.driver_id === id && t.type === "card_download")).sort((a, b) => (b.done_at || "").localeCompare(a.done_at || ""))[0];
  const preview = isV ? plateFmt(val) : titleCase(val);
  const [bulk, setBulk] = useState(false); const [bulkText, setBulkText] = useState("");
  const bulkItems = useMemo(() => parseBulk(bulkText, isV, data, cid), [bulkText, isV, data, cid]);
  const bulkOk = bulkItems.filter(b => b.st === "ok");
  const noun = isV ? "jármű" : "gépkocsivezető";

  async function addBulk(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!cid) return setErr("Előbb válassza ki a céget.");
    if (!bulkOk.length) return setErr(isV ? "Nincs új, érvényes rendszám a listában." : "Nincs új, érvényes név a listában.");
    setBusy(true);
    try {
      const rows = bulkOk.map(b => b.val);
      await mutate(async r => { for (const v of rows) { if (isV) await r.vehicle.create({ company_id: cid, plate: v }); else await r.driver.create({ company_id: cid, name: v }); } }, { success: `${rows.length} ${noun} rögzítve` });
      setBulkText("");
    } finally { setBusy(false); }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!cid) return setErr("Előbb válassza ki a céget.");
    if (!preview) return setErr(isV ? "Adja meg a rendszámot." : "Adja meg a gépkocsivezető nevét.");
    if (isV) { const key = preview.replace(/[^A-Z0-9]/g, ""); const dup = data.vehicles.find(v => v.plate.replace(/[^A-Z0-9]/g, "") === key); if (dup) return setErr(`Ez a rendszám már szerepel (${cname(dup.company_id)}).`); }
    else if (data.drivers.some(d => d.company_id === cid && d.name === preview)) return setErr("Ez a gépkocsivezető már szerepel ennél a cégnél.");
    setBusy(true);
    try {
      if (isV) await mutate(r => r.vehicle.create({ company_id: cid, plate: preview, make: extra.trim() || null }), { success: `${preview} rögzítve` });
      else await mutate(r => r.driver.create({ company_id: cid, name: preview, card_number: extra.trim() || null }), { success: `${preview} rögzítve` });
      setVal(""); setExtra("");
    } finally { setBusy(false); }
  }
  const remove = async (x: Vehicle | Driver) => {
    const label = isV ? (x as Vehicle).plate : (x as Driver).name;
    if (await confirm({ title: isV ? "Jármű törlése" : "Gépkocsivezető törlése", text: `${label} és a hozzá tartozó emlékeztetők törlődnek. Nem vonható vissza.`, okLabel: "Törlés", danger: true }))
      await mutate(r => isV ? r.vehicle.remove(x.id) : r.driver.remove(x.id), { success: "Törölve" });
  };

  const form = (
    <form className="card pad dbform" onSubmit={bulk ? addBulk : add} noValidate>
      <Field label="Cég kiválasztása" id="db-c">
        <select className="ctl" id="db-c" value={cid} onChange={e => { set({ cid: e.target.value || null }, true); setErr(null); }}>
          <option value="">Minden cég</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {companies.length === 0 ? <div className="info">{Icon.info()}<span>Még nincs cég. <button type="button" className="btn quiet sm" onClick={() => openCapture("company")}>Új cég rögzítése</button></span></div> : <>
        <label className="bulktoggle"><span><b>Több egyszerre</b><i>{isV ? "Rendszámok listája beillesztéssel" : "Nevek listája beillesztéssel"}</i></span><Switch checked={bulk} onChange={v => { setBulk(v); setErr(null); }} label="Több egyszerre" /></label>
        {bulk ? <>
          <Field label={isV ? "Rendszámok" : "Gépkocsivezetők nevei"} id="db-bulk" hint="Vesszővel, pontosvesszővel vagy új sorral elválasztva.">
            <textarea className={`ctl bulkta ${isV ? "mono" : ""}`} id="db-bulk" rows={5} value={bulkText} disabled={!cid} onChange={e => setBulkText(e.target.value)} placeholder={cid ? (isV ? "ABC-123, DEF-456\nAA BC-789" : "Kovács János\nNagy Péter, Szabó Anna") : "Előbb válasszon céget"} autoCapitalize={isV ? "characters" : "words"} spellCheck={false} />
          </Field>
          {bulkItems.length > 0 && <div className="bulkprev" aria-live="polite">
            <div className="sum"><span className="ok">{bulkOk.length} új</span>{bulkItems.some(b => b.st === "dup") && <span className="warn">{bulkItems.filter(b => b.st === "dup").length} ismétlődik</span>}{bulkItems.some(b => b.st === "exists") && <span className="warn">{bulkItems.filter(b => b.st === "exists").length} már szerepel</span>}{bulkItems.some(b => b.st === "invalid") && <span className="bad">{bulkItems.filter(b => b.st === "invalid").length} érvénytelen</span>}</div>
            <ul>{bulkItems.map((b, i) => <li key={i} className={`st-${b.st}`}>
              {isV && b.st !== "invalid" ? <HuPlate plate={b.val} size="sm" /> : <span className={`nm ${isV ? "mono" : ""}`}>{b.val || b.raw}</span>}
              <span className="tag">{b.note}</span>
            </li>)}</ul>
          </div>}
          {err && <div className="ferr" role="alert">{err}</div>}
          <button className="btn primary block" type="submit" disabled={busy || !cid || !bulkOk.length}>{Icon.plus(18)} {bulkOk.length ? `${bulkOk.length} ${noun} rögzítése` : isV ? "Járművek rögzítése" : "Gépkocsivezetők rögzítése"}</button>
        </> : <>
        <Field label={isV ? "Rendszám" : "Gépkocsivezető neve"} id="db-v" hint={isV ? "Mindig nagybetűvel kerül rögzítésre (pl. ABC-123)." : "Minden szó nagybetűvel kezdődik (pl. Példa Péter)."}>
          <input className={`ctl ${isV ? "mono plate-in" : ""}`} id="db-v" value={val} disabled={!cid} onChange={e => setVal(isV ? e.target.value.toUpperCase() : e.target.value)} onBlur={() => val && setVal(preview)} placeholder={cid ? (isV ? "Pl. ABC-123" : "Pl. Kovács János") : "Előbb válasszon céget"} autoCapitalize={isV ? "characters" : "words"} autoComplete="off" />
        </Field>
        <Field label={isV ? "Gyártmány / típus (nem kötelező)" : "Kártyaszám (nem kötelező)"} id="db-x">
          <input className={`ctl ${isV ? "" : "mono"}`} id="db-x" value={extra} disabled={!cid} onChange={e => setExtra(e.target.value)} placeholder={isV ? "Pl. Volvo FH" : "HUN…"} />
        </Field>
        {err && <div className="ferr" role="alert">{err}</div>}
        <button className="btn primary block" type="submit" disabled={busy || !cid}>{Icon.plus(18)} {isV ? "Jármű rögzítése" : "Gépkocsivezető rögzítése"}</button>
        </>}
      </>}
    </form>
  );
  const list = (
    <div className="dblist">
      <div className="sec" style={{ marginTop: 0 }}><h2>{isV ? "Rögzített járművek" : "Rögzített gépkocsivezetők"}{company ? <span className="ofc"> ({company.name})</span> : null}</h2><span className="n">{items.length}</span></div>
      <div className="searchin">{Icon.search(18)}<input className="ctl" placeholder={isV ? "Keresés rendszámra vagy cégre…" : "Keresés névre vagy cégre…"} value={q} onChange={e => setQ(e.target.value)} /></div>
      {items.length === 0 ? <Empty icon={isV ? Icon.truck(26) : Icon.user(26)} title={q ? "Nincs találat" : isV ? "Még nincs jármű" : "Még nincs gépkocsivezető"} text={!q && cid ? (isV ? "Írja be a rendszámot fent, és rögzítse." : "Írja be a nevet fent, és rögzítse.") : undefined} />
        : <div className="card" style={{ padding: "0 14px" }}><div className="rows">{items.map(x => { const nx = nextFor(x.id), last = lastFor(x.id); const v = x as Vehicle, d = x as Driver; return (
          <div className="rowi dbrow" key={x.id}>
            <span className={`avatar ${isV ? "t-vu" : "t-card"}`}>{isV ? Icon.truck(18) : initials(d.name)}</span>
            <span style={{ minWidth: 0 }}>
              <div className="n">{isV ? <span className="plate">{v.plate}</span> : d.name}{isV && v.make && <span className="mk"> {v.make}</span>}</div>
              <div className="m">{!cid && <Link href={`${base}/ugyfelek/${x.company_id}`} className="cl">{cname(x.company_id)}</Link>}{!cid && " · "}{last ? `Utolsó letöltés: ${fmtDate(last.done_at || last.due_at)}` : "Még nincs letöltés"}{nx && <> · <span className={`badge ${relLabel(nx.due_at).tone}`}>köv. {fmtDate(nx.due_at)}</span></>}</div>
            </span>
            <span className="ops">
              <button type="button" title="Letöltés rögzítése" aria-label="Letöltés rögzítése" onClick={() => openCapture(isV ? "vu_download" : "card_download", { cid: x.company_id, ...(isV ? { vid: x.id } : { did: x.id }) })}>{Icon.dl(17)}</button>
              <button type="button" aria-label="Szerkesztés" className="pen" onClick={() => setEdit(x.id)}>{Icon.pen(17)}</button>
              <button type="button" aria-label="Törlés" className="del" onClick={() => remove(x)}>{Icon.trash(17)}</button>
            </span>
          </div>); })}</div></div>}
    </div>
  );
  return <>
    <div className={layout === "phone" ? "dbstack" : "dbgrid"}>{form}{list}</div>
    {confirmEl}
    <Panel open={!!edit} onClose={() => setEdit(null)} title={isV ? "Jármű szerkesztése" : "Gépkocsivezető szerkesztése"}>
      {edit && (isV ? <VehicleForm editId={edit} onDone={() => setEdit(null)} /> : <DriverForm editId={edit} onDone={() => setEdit(null)} />)}
    </Panel>
  </>;
}

/* ---------- tömeges rögzítés: beillesztett lista elemzése ---------- */
type BulkItem = { raw: string; val: string; st: "ok" | "dup" | "exists" | "invalid"; note: string };
const PLATE_RUN = /^([A-Z]{3}-?\d{3})(\s+[A-Z]{3}-?\d{3})+$/i;
function parseBulk(text: string, isV: boolean, data: Snapshot, cid: string): BulkItem[] {
  let parts = text.split(/[\n,;\t]+/).map(s => s.trim()).filter(Boolean);
  if (isV) parts = parts.flatMap(p => (PLATE_RUN.test(p) ? p.split(/\s+/) : [p]));
  const seen = new Set<string>();
  const plates = new Map(data.vehicles.map(v => [v.plate.toUpperCase().replace(/[^A-Z0-9]/g, ""), v]));
  const cname = (id: string) => data.companies.find(c => c.id === id)?.name || "másik cég";
  return parts.slice(0, 200).map(raw => {
    if (isV) {
      const val = plateFmt(raw); const key = val.replace(/[^A-Z0-9]/g, "");
      const valid = key.length >= 4 && key.length <= 10 && /[A-Z]/.test(key) && /\d/.test(key) && key.length === val.replace(/[\s-]/g, "").length;
      if (!valid) return { raw, val, st: "invalid", note: "érvénytelen rendszám" };
      if (seen.has(key)) return { raw, val, st: "dup", note: "ismétlődik" };
      seen.add(key);
      const ex = plates.get(key); if (ex) return { raw, val, st: "exists", note: `már szerepel (${cname(ex.company_id)})` };
      return { raw, val, st: "ok", note: "új" };
    }
    const val = titleCase(raw); const key = val.toLocaleLowerCase("hu");
    const valid = /^[\p{L}][\p{L} .'-]*[\p{L}.]$/u.test(val) && val.replace(/[^\p{L}]/gu, "").length >= 3 && val.length <= 80;
    if (!valid) return { raw, val, st: "invalid", note: "érvénytelen név" };
    if (seen.has(key)) return { raw, val, st: "dup", note: "ismétlődik" };
    seen.add(key);
    if (cid && data.drivers.some(d => d.company_id === cid && d.name.toLocaleLowerCase("hu") === key)) return { raw, val, st: "exists", note: "már szerepel ennél a cégnél" };
    return { raw, val, st: "ok", note: "új" };
  });
}
