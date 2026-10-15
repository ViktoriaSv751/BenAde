"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { initials } from "@/lib/format";
import { useData, useMutate, useTheme } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { Icon, Seg } from "@/components/ui";
import { TopBar, useShell } from "./Shell";

const ROLE = { owner: "Tulajdonos", member: "Munkatárs", viewer: "Megtekintő" } as const;

/** Profil: fiók, munkaterület, megjelenés, minden további menüpont egy helyen. */
export function ProfileView() {
  const data = useData(); const mutate = useMutate(); const { email, name: sname, demo, signOut, role, layout } = useShell(); const { theme, setTheme } = useTheme();
  const base = demo ? "/demo" : "/app";
  const name = data?.profile.full_name || sname || "";
  const [size, setSizeState] = useState<"md" | "lg">("md");
  useEffect(() => { try { if (localStorage.getItem("benade.textsize") === "lg") setSizeState("lg"); } catch {} }, []);
  const setSize = (v: "md" | "lg") => { setSizeState(v); try { localStorage.setItem("benade.textsize", v); } catch {} if (v === "lg") document.documentElement.setAttribute("data-textsize", "lg"); else document.documentElement.removeAttribute("data-textsize"); };
  const [editing, setEditing] = useState(false); const [n, setN] = useState(name);
  const unread = data ? data.notifications.filter(x => x.status !== "opened").length : 0;
  const open = data ? data.tasks.filter(t => t.status === "open") : [];
  const over = open.filter(t => t.due_at.slice(0, 10) < new Date().toISOString().slice(0, 10)).length;
  const saveName = async (e: React.FormEvent) => { e.preventDefault(); const v = n.trim(); await mutate(r => r.profile.update({ full_name: v }), { success: "Név mentve" }); if (!demo) await createClient().auth.updateUser({ data: { full_name: v } }); setEditing(false); };
  const stat = (v: number | string, l: string, href: string, tone = "") => <Link className={`stat ${tone}`} href={href}><div className="v">{v}</div><div className="l">{l}</div></Link>;
  const row = (href: string, icon: React.ReactNode, t: string, s: string, badge?: number, ext?: boolean) => {
    const inner = <><span className="pi">{icon}</span><span style={{ minWidth: 0 }}><div className="n">{t}</div><div className="m">{s}</div></span><span className="pr">{!!badge && <span className="badge today">{badge}</span>}{ext ? Icon.external(16) : Icon.chev(18)}</span></>;
    return ext ? <a key={t} className="prow" href={href} target={href.startsWith("mailto") ? undefined : "_blank"} rel="noopener">{inner}</a> : <Link key={t} className="prow" href={href}>{inner}</Link>;
  };
  const parts = { hero: <><section className="phero">
        <span className="pav">{initials(name || email || "B")}</span>
        <div className="pid">
          {editing ? <form onSubmit={saveName} className="pname-edit"><input className="ctl" value={n} onChange={e => setN(e.target.value)} autoFocus placeholder="Teljes név" /><button className="btn primary sm" type="submit">Mentés</button><button className="btn quiet sm" type="button" onClick={() => { setEditing(false); setN(name); }}>Mégse</button></form>
            : <h2>{name || "Névtelen felhasználó"} <button className="ibtn sm" onClick={() => setEditing(true)} aria-label="Név szerkesztése">{Icon.pen(15)}</button></h2>}
          <div className="pm">{email}</div>
          {data && <div className="pws">{Icon.users(15)} {data.workspace.name}<span className="badge plain">{ROLE[role] || role}</span></div>}
        </div>
      </section>
      </>, stats: <>{data && <div className="stats pstats">
        {stat(data.companies.filter(c => !c.archived_at).length, "Cég", `${base}/adatbank`)}
        {stat(data.drivers.filter(d => !d.archived_at).length, "Sofőr", `${base}/adatbank?nezet=soforok`)}
        {stat(data.vehicles.filter(v => !v.archived_at).length, "Jármű", `${base}/adatbank?nezet=jarmuvek`)}
        {stat(over, "Lejárt", base, over ? "danger" : "")}
      </div>}
      </>, work: <><div className="pgroup"><div className="ph">Munkaterület</div>
        {row(`${base}/ertesitesek`, Icon.alarm(20), "Értesítések", unread ? `${unread} olvasatlan · push` : "Push, összefoglalók", unread)}
        {row(`${base}/naptar`, Icon.calendar(20), "Naptár", "Havi, heti és napi nézet")}
        {row(`${base}/csapat`, Icon.team(20), "Csapat", data ? `${data.members.length} tag · meghívás, szerepek` : "Munkatársak, szerepek")}
        {row(`${base}/import`, Icon.upload(20), "Excel import", "Cégek, rendszámok, sofőrök egy táblázatból")}
        {row(`${base}/beallitasok`, Icon.gear(20), "Beállítások", "Ciklusok, emlékeztetők, vállalkozás adatai")}
      </div>
      </>, look: <><div className="pgroup"><div className="ph">Megjelenés</div>
        <div className="prow static"><span className="pi">{theme === "dark" ? Icon.moon(20) : Icon.sun(20)}</span><span style={{ minWidth: 0 }}><div className="n">Téma</div><div className="m">Világos: fehér háttér · Sötét: fekete háttér</div></span></div>
        <div style={{ padding: "0 14px 14px" }}><Seg value={theme} onChange={setTheme} options={[{ value: "light", label: "Világos" }, { value: "dark", label: "Sötét" }, { value: "system", label: "Rendszer" }]} /></div>
        <div className="prow static"><span className="pi">{Icon.file(20)}</span><span style={{ minWidth: 0 }}><div className="n">Betűméret</div><div className="m">Nagyobb szöveg és gombok minden oldalon</div></span></div>
        <div style={{ padding: "0 14px 14px" }}><Seg value={size} onChange={setSize} options={[{ value: "md", label: "Normál" }, { value: "lg", label: "Nagy" }]} /></div>
      </div>
      </>, legal: <><div className="pgroup"><div className="ph">Jogi és súgó</div>
        {row("/privacy", Icon.shield(20), "Adatkezelési tájékoztató", "Milyen adatot és miért kezelünk", 0, true)}
        {row("/terms", Icon.file(20), "Felhasználási feltételek", "A szolgáltatás szabályai", 0, true)}
        {row(`${base}/sugo`, Icon.info(20), "Súgó", "Gyakori kérdések, gyorsbillentyűk")}
        {row(`mailto:hello@benade.hu?subject=${encodeURIComponent("BenAde visszajelzés")}&body=${encodeURIComponent(`\n\n---\nEszköz: ${typeof navigator !== "undefined" ? navigator.userAgent : ""}\nFiók: ${email}`)}`, Icon.mail(20), "Írjon nekünk", "Hiba, ötlet, kérdés – az eszköz adataival", 0, true)}
      </div>
      </>, tail: <><button className="btn ghost block" onClick={signOut}>{Icon.logout(17)} {demo ? "Kilépés a tesztfiókból" : "Kijelentkezés"}</button>
      {!demo && <Link className="pdel" href={`${base}/beallitasok#fiok`}>Fiók végleges törlése</Link>}
      <div className="pver">BenAde 2.0</div></> };
  const wide = layout === "desktop";
  return <>
    <TopBar title="Profil" />
    {wide ? <div className="content profile pdesk">
      <div className="pd-left">{parts.hero}{parts.stats}{parts.look}{parts.tail}</div>
      <div className="pd-right">{parts.work}{parts.legal}</div>
    </div> : <div className="content profile">{parts.hero}{parts.stats}{parts.work}{parts.look}{parts.legal}{parts.tail}</div>}
  </>;
}
