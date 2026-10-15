"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Driver, Vehicle } from "@/lib/types";
import { fmtDate, relLabel } from "@/lib/date";
import { initials, plateFmt, titleCase } from "@/lib/format";
import { useData, useMutate } from "@/lib/data";
import { Empty, Field, Icon, Panel, Seg, Skeleton, useConfirm } from "@/components/ui";
import { TopBar, useShell, useUrlState } from "./Shell";
import { CompanyList, CompanyProfile, firstCompanyId } from "./Customers";
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
    <form className="card pad dbform" onSubmit={add} noValidate>
      <Field label="Cég kiválasztása" id="db-c">
        <select className="ctl" id="db-c" value={cid} onChange={e => { set({ cid: e.target.value || null }, true); setErr(null); }}>
          <option value="">Minden cég</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {companies.length === 0 ? <div className="info">{Icon.info()}<span>Még nincs cég. <button type="button" className="btn quiet sm" onClick={() => openCapture("company")}>Új cég rögzítése</button></span></div> : <>
        <Field label={isV ? "Rendszám" : "Gépkocsivezető neve"} id="db-v" hint={isV ? "Mindig nagybetűvel kerül rögzítésre (pl. ABC-123)." : "Minden szó nagybetűvel kezdődik (pl. Példa Péter)."}>
          <input className={`ctl ${isV ? "mono plate-in" : ""}`} id="db-v" value={val} disabled={!cid} onChange={e => setVal(isV ? e.target.value.toUpperCase() : e.target.value)} onBlur={() => val && setVal(preview)} placeholder={cid ? (isV ? "Pl. ABC-123" : "Pl. Kovács János") : "Előbb válasszon céget"} autoCapitalize={isV ? "characters" : "words"} autoComplete="off" />
        </Field>
        <Field label={isV ? "Gyártmány / típus (nem kötelező)" : "Kártyaszám (nem kötelező)"} id="db-x">
          <input className={`ctl ${isV ? "" : "mono"}`} id="db-x" value={extra} disabled={!cid} onChange={e => setExtra(e.target.value)} placeholder={isV ? "Pl. Volvo FH" : "HUN…"} />
        </Field>
        {err && <div className="ferr" role="alert">{err}</div>}
        <button className="btn primary block" type="submit" disabled={busy || !cid}>{Icon.plus(18)} {isV ? "Jármű rögzítése" : "Gépkocsivezető rögzítése"}</button>
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
