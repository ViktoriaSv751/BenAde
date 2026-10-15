"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ImportRow } from "@/lib/repo";
import { useMutate } from "@/lib/data";
import { plateFmt, titleCase } from "@/lib/format";
import { Field, Icon } from "@/components/ui";
import { TopBar, useShell } from "./Shell";

type Col = keyof ImportRow | "";
const FIELDS: { k: keyof ImportRow; l: string; hint: string }[] = [
  { k: "company", l: "Cég neve", hint: "kötelező" }, { k: "taxId", l: "Adószám", hint: "" }, { k: "phone", l: "Telefon", hint: "" },
  { k: "plate", l: "Rendszám", hint: "járművet hoz létre" }, { k: "lastVu", l: "Utolsó fedélzeti letöltés", hint: "dátum → következő határidő +90 nap" },
  { k: "driver", l: "Gépkocsivezető neve", hint: "sofőrt hoz létre" }, { k: "lastCard", l: "Utolsó kártyaletöltés", hint: "dátum → +28 nap" },
];
const GUESS: Record<keyof ImportRow, RegExp> = { company: /c[ée]g|n[ée]v|partner|ügyf|v[aá]llal/i, taxId: /ad[oó]sz/i, phone: /tel/i, plate: /rendsz|frsz|plate/i, lastVu: /fed[ée]lzeti|vu|tachogr|j[aá]rm[uű]|let[oö]lt/i, driver: /sof[oő]r|vezet|driver|g[ée]pkocsi/i, lastCard: /k[aá]rtya|card/i };

export function ImportWizard() {
  const mutate = useMutate(); const { layout, demo } = useShell(); const base = demo ? "/demo" : "/app";
  const [rows, setRows] = useState<string[][]>([]); const [header, setHeader] = useState<string[]>([]); const [map, setMap] = useState<Col[]>([]); const [sheetNames, setSheetNames] = useState<string[]>([]); const [wb, setWb] = useState<unknown>(null);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState<{ companies: number; vehicles: number; drivers: number; tasks: number } | null>(null); const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const loadSheet = async (book: unknown, name: string) => {
    const XLSX = await import("xlsx"); const ws = (book as { Sheets: Record<string, unknown> }).Sheets[name];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws as never, { header: 1, raw: false, dateNF: "yyyy-mm-dd", defval: "" }) as unknown[][];
    const nonEmpty = aoa.filter(r => r.some(c => String(c ?? "").trim()));
    if (nonEmpty.length < 2) { setErr("Ez a munkalap üres vagy csak fejlécet tartalmaz."); return; }
    const h = nonEmpty[0].map(c => String(c ?? "").trim()); const body = nonEmpty.slice(1).map(r => h.map((_, i) => String(r[i] ?? "").trim()));
    setHeader(h); setRows(body); setErr("");
    setMap(h.map(c => { const hit = (Object.keys(GUESS) as (keyof ImportRow)[]).find(k => GUESS[k].test(c)); return hit || ""; }));
  };
  const onFile = async (f: File) => {
    setDone(null); setErr("");
    try { const XLSX = await import("xlsx"); const buf = await f.arrayBuffer(); const book = XLSX.read(buf, { type: "array", cellDates: false }); setWb(book); setSheetNames(book.SheetNames); await loadSheet(book, book.SheetNames[0]); }
    catch { setErr("Nem sikerült beolvasni a fájlt. Támogatott: .xlsx, .xls, .csv"); }
  };
  const mapped: ImportRow[] = useMemo(() => rows.map(r => { const o: Record<string, string> = {}; map.forEach((k, i) => { if (k && r[i]) o[k] = r[i]; }); return o as unknown as ImportRow; }).filter(r => r.company), [rows, map]);
  const dup = (k: Col) => k && map.filter(x => x === k).length > 1;
  const normDate = (v?: string) => { if (!v) return undefined; const s = v.trim().replace(/\./g, "-").replace(/\s/g, "").replace(/-+$/, ""); const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) || s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); if (!m) return undefined; const [y, mo, d] = m[1].length === 4 ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]]; return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`; };
  const run = async () => { setBusy(true); try { const clean = mapped.map(r => ({ ...r, company: titleCase(r.company), plate: r.plate ? plateFmt(r.plate) : undefined, driver: r.driver ? titleCase(r.driver) : undefined, lastVu: normDate(r.lastVu), lastCard: normDate(r.lastCard) })); const res = await mutate(rp => rp.importRows(clean), { success: "Import kész" }); setDone(res); } catch { /* toast shown */ } finally { setBusy(false); } };

  return <>
    <TopBar title="Excel import" back={layout === "phone" ? `${base}/profil` : undefined} />
    <div className="content" style={{ maxWidth: 980 }}>
      {!rows.length && <>
        <div className="card pad" style={{ textAlign: "center", padding: 36, borderStyle: "dashed", cursor: "pointer" }} onClick={() => file.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}>
          <div className="avatar" style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 12px" }}>{Icon.upload(24)}</div>
          <h2 style={{ fontSize: 18 }}>Húzza ide az Excel-táblát</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>vagy kattintson a kiválasztáshoz · .xlsx, .xls, .csv</p>
          <input ref={file} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </div>
        <div className="info">{Icon.info()}<span>A tábla első sora a fejléc. Egy sor = egy cég és opcionálisan egy jármű / sofőr és az utolsó letöltés dátuma. A következő határidőket a rendszer számolja (+90 / +28 nap). Ugyanaz a cég több sorban is szerepelhet.</span></div>
        <div className="card pad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}><h3 style={{ fontSize: 14 }}>Példa – soronként egy jármű vagy gépkocsivezető</h3><button className="btn secondary sm" onClick={downloadTemplate}>{Icon.dl(14)} Kitölthető sablon (.xlsx)</button></div><div style={{ overflow: "auto" }}><table className="table"><thead><tr><th>Cég</th><th>Adószám</th><th>Rendszám</th><th>Utolsó fedélzeti letöltés</th><th>Sofőr</th><th>Utolsó kártyaletöltés</th></tr></thead><tbody><tr><td>Kovács Trans Kft.</td><td className="mono">12345678-2-42</td><td className="mono">ABC-123</td><td className="mono">2026-09-14</td><td>Kovács Béla</td><td className="mono">2026-10-01</td></tr></tbody></table></div></div>
        {err && <div className="info" style={{ borderColor: "var(--danger)" }}>{Icon.warn()}<span>{err}</span></div>}
      </>}
      {rows.length > 0 && !done && <>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 17, flex: 1 }}>Oszlopok párosítása</h2>
          {sheetNames.length > 1 && <select className="ctl" style={{ width: "auto", minHeight: 36 }} onChange={e => loadSheet(wb, e.target.value)}>{sheetNames.map(n => <option key={n}>{n}</option>)}</select>}
          <button className="btn ghost sm" onClick={() => { setRows([]); setHeader([]); }}>Másik fájl</button>
        </div>
        <div className="card" style={{ overflow: "auto" }}><table className="table"><thead><tr><th>Excel oszlop</th><th>Minta</th><th>BenAde mező</th></tr></thead><tbody>{header.map((h, i) => <tr key={i}><td style={{ fontWeight: 700 }}>{h || <i style={{ color: "var(--faint)" }}>(üres fejléc)</i>}</td><td className="mono" style={{ color: "var(--muted)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rows.slice(0, 2).map(r => r[i]).filter(Boolean).join(" · ")}</td><td><select className="ctl" style={{ minHeight: 36, borderColor: dup(map[i]) ? "var(--danger)" : undefined }} value={map[i]} onChange={e => { const m = [...map]; m[i] = e.target.value as Col; setMap(m); }}><option value="">— kihagy —</option>{FIELDS.map(f => <option key={f.k} value={f.k}>{f.l}</option>)}</select></td></tr>)}</tbody></table></div>
        {!map.includes("company") && <div className="info" style={{ borderColor: "var(--danger)" }}>{Icon.warn()}<span>A „Cég neve” mező párosítása kötelező.</span></div>}
        <div className="card pad"><h3 style={{ fontSize: 14, marginBottom: 8 }}>Előnézet · {mapped.length} sor importálható{rows.length - mapped.length ? ` (${rows.length - mapped.length} sor cégnév nélkül kimarad)` : ""}</h3>
          <div style={{ overflow: "auto" }}><table className="table"><thead><tr>{FIELDS.filter(f => map.includes(f.k)).map(f => <th key={f.k}>{f.l}</th>)}</tr></thead><tbody>{mapped.slice(0, 8).map((r, i) => <tr key={i}>{FIELDS.filter(f => map.includes(f.k)).map(f => <td key={f.k} className={/plate|taxId|last|phone/.test(f.k) ? "mono" : ""}>{f.k === "company" ? titleCase(r.company) : f.k === "plate" ? plateFmt(r.plate || "") : f.k === "driver" ? titleCase(r.driver || "") : (f.k === "lastVu" || f.k === "lastCard") ? (normDate(r[f.k]) || <span style={{ color: "var(--danger-fg)" }}>{r[f.k] || "–"}</span>) : r[f.k]}</td>)}</tr>)}</tbody></table></div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Link className="btn ghost" href={`${base}/profil`}>Mégse</Link><button className="btn primary" disabled={busy || !map.includes("company") || mapped.length === 0 || map.some(dup)} onClick={run}>{busy ? "Importálás…" : <>{Icon.upload(16)} {mapped.length} sor importálása</>}</button></div>
      </>}
      {done && <div className="card pad" style={{ textAlign: "center", padding: 32 }}>
        <div className="avatar" style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 12px", background: "var(--ok-soft)", color: "var(--ok-fg)" }}>{Icon.check(26)}</div>
        <h2 style={{ fontSize: 20 }}>Import kész</h2>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>{done.companies} cég · {done.vehicles} jármű · {done.drivers} sofőr · {done.tasks} teendő létrehozva</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}><Link className="btn primary" href={`${base}/adatbank`}>Ügyfelek megtekintése</Link><button className="btn ghost" onClick={() => { setDone(null); setRows([]); }}>Újabb fájl</button></div>
      </div>}
    </div>
  </>;
}

/** Ready-to-fill Excel template with the exact column names the import recognises. */
async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const rows = [
    ["Cég neve", "Adószám", "Telefon", "Rendszám", "Utolsó fedélzeti letöltés", "Gépkocsivezető neve", "Utolsó kártyaletöltés"],
    ["Kovács Trans Kft.", "12345678-2-42", "+36 30 123 4567", "ABC-123", "2026-09-14", "Kovács Béla", "2026-10-01"],
    ["Kovács Trans Kft.", "", "", "DEF-456", "2026-08-30", "Nagy Péter", "2026-09-28"],
    ["Példa Fuvar Bt.", "87654321-1-13", "+36 20 555 1234", "AA BB-123", "2026-07-21", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows); (ws as unknown as { ["!cols"]: { wch: number }[] })["!cols"] = [26, 16, 18, 12, 24, 22, 22].map(wch => ({ wch }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Ügyfelek"); XLSX.writeFile(wb, "BenAde-import-sablon.xlsx");
}
