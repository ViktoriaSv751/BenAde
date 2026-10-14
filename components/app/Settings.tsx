"use client";
import { useState } from "react";
import Link from "next/link";
import type { Snapshot, WorkspaceDefaults } from "@/lib/types";
import { useData, useMutate, useRepo, useToast } from "@/lib/data";
import { DemoRepo, companyNameOf } from "@/lib/repo";
import { createClient } from "@/lib/supabase/client";
import { Copyable, Field, Icon, Skeleton, useConfirm } from "@/components/ui";
import { ThemeToggle, TopBar, useShell } from "./Shell";

export function SettingsView() {
  const data = useData(); const mutate = useMutate(); const repo = useRepo(); const toast = useToast(); const { role, demo, signOut, email, layout } = useShell(); const { confirm, confirmEl } = useConfirm();
  if (!data) return <><TopBar title="Beállítások" /><div className="content"><Skeleton /></div></>;
  const w = data.workspace; const canEdit = role === "owner";
  const base = demo ? "/demo" : "/app";
  const grid = layout === "desktop" ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" } : { display: "flex", flexDirection: "column" as const, gap: 16 };
  return <>
    <TopBar title="Beállítások" back={layout === "phone" ? `${base}/tobb` : undefined} />
    <div className="content">
      <div style={grid}>
        <section className="card pad"><Head icon={Icon.gear(18)} title="Vállalkozás adatai" sub="Megjelenik a PDF-eken és az e-mailekben" />
          <WorkspaceForm disabled={!canEdit} />
        </section>
        <section className="card pad"><Head icon={Icon.clock(18)} title="Ciklusok és emlékeztetők" sub="A jogszabályi alapértékek – csak indokolt esetben módosítsa" />
          <DefaultsForm disabled={!canEdit} />
        </section>
        <section className="card pad"><Head icon={Icon.user(18)} title="Fiók" sub={email} />
          <AccountForm />
        </section>
        <section className="card pad"><Head icon={Icon.sun(18)} title="Megjelenés" />
          <div className="srow"><div><div className="k">Téma</div><div className="d">Rendszer, világos vagy sötét</div></div><ThemeToggle /></div>
          <div className="srow"><div><div className="k">Billentyűk</div><div className="d">N – új rögzítés · / vagy ⌘K – keresés · Esc – bezárás</div></div></div>
        </section>
        <section className="card pad"><Head icon={Icon.calendar(18)} title="Naptár-előfizetés (ICS)" sub="Google/Apple/Outlook naptárba húzható élő feed" />
          {demo ? <div className="info">{Icon.info()}<span>Bemutató módban nincs ICS feed. Regisztráció után a saját munkaterület kap egy titkos linket.</span></div>
            : <><Copyable text={`${typeof location !== "undefined" ? location.origin : ""}/api/ics/${w.ics_token}`} /><p className="hint" style={{ marginTop: 8, fontSize: 12.5, color: "var(--muted)" }}>Apple Naptár: Fájl → Új naptár-előfizetés. Google: Egyéb naptárak → URL-ről. Aki ismeri a linket, látja a határidőket – szükség esetén új linket kérhet.</p>{canEdit && <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={async () => { if (await confirm({ title: "Új ICS link", text: "A régi link azonnal megszűnik; a már feliratkozott naptárakat újra kell kötni.", okLabel: "Új link" })) mutate(r => r.workspace.update({ ics_token: cryptoToken() }), { success: "Új link kész" }); }}>{Icon.refresh(14)} Új link</button>}</>}
        </section>
        <section className="card pad"><Head icon={Icon.dl(18)} title="Adatok" sub="Export, import, biztonsági mentés" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn secondary sm" onClick={() => exportJson(data)}>{Icon.dl(14)} Teljes mentés (JSON)</button>
            <button className="btn secondary sm" onClick={() => exportCsv(data)}>{Icon.dl(14)} Teendők (CSV)</button>
            <Link className="btn secondary sm" href={`${base}/import`}>{Icon.upload(14)} Excel import</Link>
          </div>
          {demo && <div style={{ marginTop: 12 }}><button className="btn ghost sm" onClick={async () => { if (await confirm({ title: "Bemutató adatok visszaállítása", text: "A módosításai elvesznek, a példaadatok újratöltődnek.", okLabel: "Visszaállítás" })) { (repo as DemoRepo).reset(); location.reload(); } }}>{Icon.refresh(14)} Példaadatok visszaállítása</button></div>}
        </section>
        <section className="card pad" style={{ borderColor: "var(--danger-soft)" }}><Head icon={Icon.warn(18)} title="Veszélyzóna" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn ghost sm" onClick={signOut}>{Icon.logout(14)} Kijelentkezés</button>
            {!demo && <button className="btn danger sm" onClick={async () => { if (await confirm({ title: "Fiók törlése", text: "A fiókja és – ha Ön az egyedüli tulajdonos – a munkaterület minden adata végleg törlődik. Írja be: TÖRLÉS", okLabel: "Fiók törlése", danger: true, confirmWord: "TÖRLÉS" })) { const sb = createClient(); const { error } = await sb.rpc("delete_my_account"); if (error) { toast("Hiba: " + error.message, "err"); return; } await sb.auth.signOut(); location.href = "/"; } }}>{Icon.trash(14)} Fiók végleges törlése</button>}
          </div>
        </section>
      </div>
      {confirmEl}
    </div>
  </>;
}
function Head({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) { return <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}><span className="avatar" style={{ width: 34, height: 34, borderRadius: 10 }}>{icon}</span><div><h2 style={{ fontSize: 16 }}>{title}</h2>{sub && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{sub}</div>}</div></div>; }
function cryptoToken() { const a = new Uint8Array(18); crypto.getRandomValues(a); return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join(""); }

function WorkspaceForm({ disabled }: { disabled: boolean }) {
  const data = useData()!; const mutate = useMutate(); const w = data.workspace;
  const [f, setF] = useState({ name: w.name, phone: w.phone || "", email: w.email || "", address: w.address || "", tax_id: w.tax_id || "" }); const [dirty, setDirty] = useState(false);
  const up = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setDirty(true); };
  return <form onSubmit={async e => { e.preventDefault(); await mutate(r => r.workspace.update({ ...f, name: f.name.trim() || w.name }), { success: "Mentve" }); setDirty(false); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <Field label="Vállalkozás neve" id="w-n"><input className="ctl" id="w-n" value={f.name} disabled={disabled} onChange={e => up("name", e.target.value)} /></Field>
    <div className="row2"><Field label="Telefon" id="w-p"><input className="ctl mono" id="w-p" value={f.phone} disabled={disabled} onChange={e => up("phone", e.target.value)} /></Field><Field label="Adószám" id="w-t"><input className="ctl mono" id="w-t" value={f.tax_id} disabled={disabled} onChange={e => up("tax_id", e.target.value)} /></Field></div>
    <Field label="E-mail" id="w-e"><input className="ctl" id="w-e" type="email" value={f.email} disabled={disabled} onChange={e => up("email", e.target.value)} /></Field>
    <Field label="Cím" id="w-a"><input className="ctl" id="w-a" value={f.address} disabled={disabled} onChange={e => up("address", e.target.value)} /></Field>
    {!disabled && <button className="btn primary sm" type="submit" disabled={!dirty} style={{ alignSelf: "flex-start" }}>{Icon.check(14)} Mentés</button>}
    {disabled && <div className="hint" style={{ fontSize: 12.5, color: "var(--muted)" }}>Csak a tulajdonos módosíthatja.</div>}
  </form>;
}

function DefaultsForm({ disabled }: { disabled: boolean }) {
  const data = useData()!; const mutate = useMutate(); const d = data.workspace.defaults;
  const [f, setF] = useState<WorkspaceDefaults>({ ...d }); const [dirty, setDirty] = useState(false);
  const num = (k: keyof WorkspaceDefaults) => <input className="ctl mono" type="number" min={1} value={f[k] as number} disabled={disabled} onChange={e => { setF({ ...f, [k]: Number(e.target.value) }); setDirty(true); }} />;
  const days = [14, 7, 3, 1, 0];
  return <form onSubmit={async e => { e.preventDefault(); await mutate(r => r.workspace.update({ defaults: f }), { success: "Alapértékek mentve" }); setDirty(false); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div className="row2"><Field label="Fedélzeti egység (nap)" id="d1" hint="Jogszabály: 90">{num("vuDays")}</Field><Field label="Vezetői kártya (nap)" id="d2" hint="Jogszabály: 28">{num("cardDays")}</Field></div>
    <div className="row2"><Field label="Kalibráció (nap)" id="d3" hint="2 év = 730">{num("calibrationDays")}</Field><Field label="Kártya lejárat (nap)" id="d4" hint="5 év = 1825">{num("cardExpiryDays")}</Field></div>
    <div className="row2"><Field label="Számla fizetési határidő (nap)" id="d5">{num("invoiceDays")}</Field><Field label="ÁFA %" id="d6">{num("vatPercent")}</Field></div>
    <Field label="Emlékeztetők a határidő előtt (nap)"><div className="chips">{days.map(n => <button type="button" key={n} className="chip" disabled={disabled} aria-pressed={f.remindDaysBefore.includes(n)} onClick={() => { const s = new Set(f.remindDaysBefore); if (s.has(n)) s.delete(n); else s.add(n); setF({ ...f, remindDaysBefore: [...s].sort((a, b) => b - a) }); setDirty(true); }}>{n === 0 ? "aznap" : `${n} nap`}</button>)}</div></Field>
    <div className="row2"><Field label="Emlékeztető időpontja" id="d7"><input className="ctl mono" id="d7" type="time" value={f.remindTime} disabled={disabled} onChange={e => { setF({ ...f, remindTime: e.target.value }); setDirty(true); }} /></Field>
      <Field label="Csendes időszak" id="d8"><div style={{ display: "flex", gap: 6, alignItems: "center" }}><input className="ctl mono" style={{ minWidth: 0 }} type="time" value={f.quietFrom} disabled={disabled} onChange={e => { setF({ ...f, quietFrom: e.target.value }); setDirty(true); }} /><span>–</span><input className="ctl mono" style={{ minWidth: 0 }} type="time" value={f.quietTo} disabled={disabled} onChange={e => { setF({ ...f, quietTo: e.target.value }); setDirty(true); }} /></div></Field></div>
    <Field label="Oktatás-emlékeztetők" hint="Előző nap 16:00 és aznap 06:00 az alapértelmezés"><div className="chips">{[["-1T16:00", "előző nap 16:00"], ["-1T18:00", "előző nap 18:00"], ["0T06:00", "aznap 06:00"], ["0T07:00", "aznap 07:00"]].map(([v, l]) => <button type="button" key={v} className="chip" disabled={disabled} aria-pressed={f.trainingTimes.includes(v)} onClick={() => { const s = new Set(f.trainingTimes); if (s.has(v)) s.delete(v); else s.add(v); setF({ ...f, trainingTimes: [...s] }); setDirty(true); }}>{l}</button>)}</div></Field>
    {!disabled && <button className="btn primary sm" type="submit" disabled={!dirty} style={{ alignSelf: "flex-start" }}>{Icon.check(14)} Mentés</button>}
  </form>;
}

function AccountForm() {
  const data = useData()!; const mutate = useMutate(); const toast = useToast(); const { demo } = useShell();
  const [name, setName] = useState(data.profile.full_name || ""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [busy, setBusy] = useState(false);
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <form onSubmit={async e => { e.preventDefault(); await mutate(r => r.profile.update({ full_name: name.trim() }), { success: "Név mentve" }); if (!demo) { await createClient().auth.updateUser({ data: { full_name: name.trim() } }); } }} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
      <div style={{ flex: 1 }}><Field label="Megjelenített név" id="a-n"><input className="ctl" id="a-n" value={name} onChange={e => setName(e.target.value)} /></Field></div><button className="btn secondary" type="submit">Mentés</button>
    </form>
    {!demo && <form onSubmit={async e => { e.preventDefault(); if (pw.length < 8) { toast("Legalább 8 karakter.", "err"); return; } if (pw !== pw2) { toast("A két jelszó nem egyezik.", "err"); return; } setBusy(true); const { error } = await createClient().auth.updateUser({ password: pw }); setBusy(false); if (error) toast("Hiba: " + error.message, "err"); else { toast("Jelszó módosítva", "ok"); setPw(""); setPw2(""); } }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row2"><Field label="Új jelszó" id="a-p"><input className="ctl" id="a-p" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></Field><Field label="Még egyszer" id="a-p2"><input className="ctl" id="a-p2" type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></Field></div>
      <button className="btn secondary sm" type="submit" disabled={busy || !pw} style={{ alignSelf: "flex-start" }}>Jelszó módosítása</button>
    </form>}
  </div>;
}

function download(name: string, blob: Blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
export function exportJson(s: Snapshot) { const { workspace, companies, contacts, vehicles, drivers, schedules, tasks } = s; download(`benade-mentes-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify({ version: 2, exported_at: new Date().toISOString(), workspace: { name: workspace.name, defaults: workspace.defaults }, companies, contacts, vehicles, drivers, schedules, tasks }, null, 2)], { type: "application/json" })); }
export function exportCsv(s: Snapshot) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Típus", "Cég", "Tárgy", "Határidő", "Állapot", "Elvégezve", "Megjegyzés"].join(";"), ...s.tasks.map(t => { const subj = t.vehicle_id ? s.vehicles.find(v => v.id === t.vehicle_id)?.plate : t.driver_id ? s.drivers.find(d => d.id === t.driver_id)?.name : t.type === "invoice" ? t.invoice_no : t.topic; return [t.type, companyNameOf(s, t.company_id), subj, t.due_at.slice(0, 16).replace("T", " "), t.status, t.done_at ? t.done_at.slice(0, 10) : "", t.note].map(esc).join(";"); })];
  download(`benade-teendok-${new Date().toISOString().slice(0, 10)}.csv`, new Blob(["﻿" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
}

