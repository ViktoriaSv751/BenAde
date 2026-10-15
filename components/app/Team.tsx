"use client";
import { useState } from "react";
import type { Role } from "@/lib/types";
import { fmtDate } from "@/lib/date";
import { initials } from "@/lib/format";
import { useData, useMutate, useToast } from "@/lib/data";
import { Copyable, Field, Icon, Skeleton, useConfirm } from "@/components/ui";
import { TopBar, useShell } from "./Shell";

const ROLE: Record<Role, { l: string; d: string }> = { owner: { l: "Tulajdonos", d: "Minden jog, beállítások, csapat" }, member: { l: "Munkatárs", d: "Rögzít, lezár, szerkeszt" }, viewer: { l: "Megtekintő", d: "Csak olvas" } };

export function TeamView() {
  const data = useData(); const mutate = useMutate(); const toast = useToast(); const { role, demo, layout, email: me } = useShell(); const { confirm, confirmEl } = useConfirm();
  const [email, setEmail] = useState(""); const [r, setR] = useState<Role>("member"); const [last, setLast] = useState<string | null>(null);
  if (!data) return <><TopBar title="Csapat" /><div className="content"><Skeleton /></div></>;
  const owner = role === "owner"; const base = demo ? "/demo" : "/app";
  const invite = async (e: React.FormEvent) => { e.preventDefault(); const em = email.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast("Érvénytelen e-mail cím.", "err"); return; } const inv = await mutate(rp => rp.workspace.invite(em, r), { success: "Meghívó létrehozva" }); setEmail(""); const link = `${location.origin}/meghivo/${inv.token}`; setLast(link); if (!demo) { try { await fetch("/api/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: em, link, workspace: data.workspace.name }) }); } catch {} } };
  return <>
    <TopBar title="Csapat" back={layout === "phone" ? `${base}/profil` : undefined} sub={layout === "desktop" ? `${data.members.length} tag` : undefined} />
    <div className="content">
      <div style={layout === "desktop" ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" } : { display: "flex", flexDirection: "column", gap: 16 }}>
        <section className="card" style={{ padding: "4px 16px" }}>
          {data.members.map(m => <div className="srow" key={m.user_id} style={{ alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}><span className="avatar">{initials(m.full_name || m.email || "?")}</span><div style={{ minWidth: 0 }}><div className="k" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.full_name || m.email || "Felhasználó"}{m.email === me && <span className="badge plain" style={{ marginLeft: 8 }}>Ön</span>}</div><div className="d">{m.email}{" · "}csatlakozott {fmtDate(m.created_at)}</div></div></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {owner && m.email !== me ? <select className="ctl" style={{ width: "auto", minHeight: 34, padding: "4px 30px 4px 10px", fontSize: 13 }} value={m.role} onChange={e => mutate(rp => rp.workspace.setRole(m.user_id, e.target.value as Role), { success: "Szerep módosítva" })}>{(Object.keys(ROLE) as Role[]).map(k => <option key={k} value={k}>{ROLE[k].l}</option>)}</select> : <span className="pill">{ROLE[m.role].l}</span>}
              {owner && m.email !== me && <button className="ibtn" aria-label="Eltávolítás" onClick={async () => { if (await confirm({ title: "Tag eltávolítása", text: `${m.email} nem fér hozzá többé a munkaterülethez.`, okLabel: "Eltávolítás", danger: true })) mutate(rp => rp.workspace.removeMember(m.user_id), { success: "Eltávolítva" }); }}>{Icon.x(16)}</button>}
            </div>
          </div>)}
          {data.invites.map(i => <div className="srow" key={i.id} style={{ alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="avatar" style={{ opacity: .6 }}>{Icon.mail(16)}</span><div><div className="k">{i.email}</div><div className="d">Meghívó függőben · {ROLE[i.role].l} · {fmtDate(i.created_at)}</div></div></div>
            <div style={{ display: "flex", gap: 6 }}><Copyable text={`${typeof location !== "undefined" ? location.origin : ""}/meghivo/${i.token}`} />{owner && <button className="ibtn" aria-label="Visszavonás" onClick={() => mutate(rp => rp.workspace.revokeInvite(i.id), { success: "Meghívó visszavonva" })}>{Icon.x(16)}</button>}</div>
          </div>)}
        </section>
        <section className="card pad">
          <h2 style={{ fontSize: 16, marginBottom: 4 }}>Munkatárs meghívása</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 12 }}>A meghívott ugyanazt a munkaterületet látja: ugyanazok a cégek, teendők és számlák, valós időben.</p>
          {owner ? <form onSubmit={invite} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="E-mail cím" id="inv-e"><input className="ctl" id="inv-e" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="kolléga@ceg.hu" /></Field>
            <Field label="Szerep"><div className="chips">{(Object.keys(ROLE) as Role[]).map(k => <button type="button" key={k} className="chip" aria-pressed={r === k} onClick={() => setR(k)} title={ROLE[k].d}>{ROLE[k].l}</button>)}</div><div className="hint" style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{ROLE[r].d}</div></Field>
            <button className="btn primary" type="submit" disabled={!email}>{Icon.mail(16)} Meghívó küldése</button>
            {last && <div className="info">{Icon.info()}<span style={{ wordBreak: "break-all" }}>Meghívó link (ha az e-mail nem érkezne meg, küldje el így): <br /><Copyable text={last} /></span></div>}
          </form> : <div className="info">{Icon.info()}<span>Csak a tulajdonos hívhat meg új tagot.</span></div>}
        </section>
      </div>
      {confirmEl}
    </div>
  </>;
}
