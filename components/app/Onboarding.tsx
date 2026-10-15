"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Icon } from "@/components/ui";
import { titleCase, plateFmt, companyName } from "@/lib/format";
import { addDays, todayISO, toTS } from "@/lib/date";
import { reminderTimes } from "@/lib/date";

export function Onboarding({ email, name, inviteToken }: { email: string; name: string; inviteToken?: string }) {
  const router = useRouter(); const sb = createClient();
  const [step, setStep] = useState(inviteToken ? 9 : 0); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [ws, setWs] = useState(""); const [wsId, setWsId] = useState<string | null>(null);
  const [c, setC] = useState({ name: "", plate: "", lastVu: "", driver: "", lastCard: "" });
  const createWs = async () => { setBusy(true); setErr(""); const { data, error } = await sb.rpc("create_workspace", { p_name: ws.trim() || "Szervizem" }); setBusy(false); if (error) { setErr(error.message); return; } setWsId(data as string); await sb.from("profiles").upsert({ user_id: (await sb.auth.getUser()).data.user!.id, full_name: name || null, last_workspace_id: data }); setStep(1); };
  const createFirst = async () => {
    if (!wsId) return; setBusy(true); setErr("");
    try {
      const { data: comp, error } = await sb.from("companies").insert({ workspace_id: wsId, name: companyName(c.name) }).select().single(); if (error) throw error;
      const t = todayISO();
      if (c.plate.trim()) { const { data: v, error: e2 } = await sb.from("vehicles").insert({ workspace_id: wsId, company_id: comp.id, plate: plateFmt(c.plate) }).select().single(); if (e2) throw e2; const base = c.lastVu || t; const due = addDays(base, 90); const { data: sch } = await sb.from("schedules").insert({ workspace_id: wsId, type: "vu_download", vehicle_id: v.id, cycle_days: 90 }).select().single(); await sb.from("tasks").insert({ workspace_id: wsId, company_id: comp.id, type: "vu_download", vehicle_id: v.id, schedule_id: sch?.id, base_date: base, due_at: toTS(due, "08:00"), all_day: true, remind_at: reminderTimes(due, [7, 1, 0], "08:00") }); }
      if (c.driver.trim()) { const { data: d, error: e3 } = await sb.from("drivers").insert({ workspace_id: wsId, company_id: comp.id, name: titleCase(c.driver) }).select().single(); if (e3) throw e3; const base = c.lastCard || t; const due = addDays(base, 28); const { data: sch } = await sb.from("schedules").insert({ workspace_id: wsId, type: "card_download", driver_id: d.id, cycle_days: 28 }).select().single(); await sb.from("tasks").insert({ workspace_id: wsId, company_id: comp.id, type: "card_download", driver_id: d.id, schedule_id: sch?.id, base_date: base, due_at: toTS(due, "08:00"), all_day: true, remind_at: reminderTimes(due, [7, 1, 0], "08:00") }); }
      setStep(2);
    } catch (e) { setErr((e as { message?: string }).message || "Hiba"); } finally { setBusy(false); }
  };
  const accept = async () => { setBusy(true); setErr(""); const { error } = await sb.rpc("accept_invite", { p_token: inviteToken }); setBusy(false); if (error) { setErr(error.message.includes("invalid") ? "A meghívó érvénytelen vagy már felhasználták." : error.message); return; } router.replace("/app"); router.refresh(); };
  const finish = () => { router.replace("/app"); router.refresh(); };
  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden><picture><source media="(min-width: 900px)" srcSet="/img/road.jpg" /><img src="/img/truck.jpg" alt="" /></picture></div>
      <div className="auth-wrap">
      <header className="auth-mark"><a href="/app" className="wm" aria-label="BenAde">Ben<b>Ade</b></a><p className="claim">Három perc, és minden<br />határidő a helyén.</p></header>
      <main className="auth-card">
        <div className="ob">
          {step !== 9 && <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>{[0, 1, 2].map(i => <span key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? "var(--accent)" : "rgba(255,255,255,.14)" }} />)}</div>}
          {step === 0 && <>
            <h1>Üdv, {name || email}!</h1><p className="lead">Először adjon nevet a munkaterületnek – általában ez a tachográf-szerviz neve. Később bármikor módosítható.</p>
            <form onSubmit={e => { e.preventDefault(); createWs(); }}>
              <Field label="Vállalkozás neve" id="ws"><input className="ctl" id="ws" value={ws} onChange={e => setWs(e.target.value)} placeholder="pl. BenAde Tachográf Szerviz" autoFocus /></Field>
              {err && <div className="ferr" role="alert">{err}</div>}
              <button className="btn primary block" disabled={busy} type="submit">{busy ? "Létrehozás…" : <>Tovább {Icon.chev(16)}</>}</button>
            </form>
          </>}
          {step === 1 && <>
            <h1>Az első ügyfél</h1><p className="lead">Egy cég, egy rendszám, egy sofőr – a következő határidőket mi számoljuk (+90 és +28 nap). Ki is hagyhatja, és importálhat Excelből.</p>
            <form onSubmit={e => { e.preventDefault(); if (c.name.trim()) createFirst(); else setStep(2); }}>
              <Field label="Cég neve" id="c-n"><input className="ctl" id="c-n" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} placeholder="Kovács Trans Kft." autoFocus /></Field>
              <div className="row2"><Field label="Rendszám" id="c-p"><input className="ctl mono" id="c-p" value={c.plate} onChange={e => setC({ ...c, plate: e.target.value.toUpperCase() })} placeholder="ABC-123" /></Field><Field label="Utolsó fedélzeti letöltés" id="c-v"><input className="ctl mono" id="c-v" type="date" value={c.lastVu} onChange={e => setC({ ...c, lastVu: e.target.value })} /></Field></div>
              <div className="row2"><Field label="Gépkocsivezető" id="c-d"><input className="ctl" id="c-d" value={c.driver} onChange={e => setC({ ...c, driver: e.target.value })} placeholder="Kovács Béla" /></Field><Field label="Utolsó kártyaletöltés" id="c-c"><input className="ctl mono" id="c-c" type="date" value={c.lastCard} onChange={e => setC({ ...c, lastCard: e.target.value })} /></Field></div>
              {err && <div className="ferr" role="alert">{err}</div>}
              <button className="btn primary block" disabled={busy} type="submit">{busy ? "Mentés…" : c.name.trim() ? "Rögzítés és tovább" : "Kihagyom most"}</button>
            </form>
          </>}
          {step === 2 && <>
            <h1>Készen áll.</h1><p className="lead">A Teendő képernyőn mindig a következő határidő van legfelül. Emlékeztetőt a határidő előtt 7, 1 és 0 nappal 08:00-kor küldünk – ezt a beállításokban finomhangolhatja.</p>
            <div style={{ display: "grid", gap: 10, margin: "18px 0" }}>
              {[["Rögzítés 3 koppintással", "Nagy + gomb → típus → cég és rendszám. A határidő automatikus."], ["Letöltés lezárása", "Pipa a tételen → azonnal létrejön a következő ciklus."], ["Excel import", "Profil → Excel import: cégek, rendszámok, sofőrök egyben."]].map(([t, s]) => <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><span style={{ color: "#FFB224", marginTop: 2 }}>{Icon.check(18)}</span><div><b style={{ color: "#fff" }}>{t}</b><div style={{ color: "#9AA5BC", fontSize: 13.5 }}>{s}</div></div></div>)}
            </div>
            <button className="btn primary block" onClick={finish}>Irány az alkalmazás {Icon.chev(16)}</button>
          </>}
          {step === 9 && <>
            <h1>Meghívó</h1><p className="lead">Meghívást kapott egy BenAde munkaterületre. Elfogadás után ugyanazt látja, mint a csapat többi tagja.</p>
            {err && <div className="ferr" role="alert">{err}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}><button className="btn ghost" style={{ flex: 1 }} onClick={() => setStep(0)}>Inkább sajátot hozok létre</button><button className="btn primary" style={{ flex: 2 }} disabled={busy} onClick={accept}>{busy ? "…" : "Meghívó elfogadása"}</button></div>
          </>}
        </div>
        <p className="auth-legal">Bejelentkezve: {email} · <a href="/auth/signout">Kijelentkezés</a></p>
      </main>
      </div>
    </div>
  );
}
