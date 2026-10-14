"use client";
import Link from "next/link";
import { initials } from "@/lib/format";
import { useData } from "@/lib/data";
import { Icon } from "@/components/ui";
import { ThemeToggle, TopBar, useShell } from "./Shell";

export function MoreView() {
  const data = useData(); const { email, name, demo, signOut } = useShell(); const base = demo ? "/demo" : "/app";
  const unread = data ? data.notifications.filter(n => n.status !== "opened").length : 0;
  const items = [
    { href: `${base}/ertesitesek`, icon: Icon.bell(20), t: "Értesítések", s: unread ? `${unread} olvasatlan` : "Push, e-mail, összefoglalók", n: unread },
    { href: `${base}/csapat`, icon: Icon.team(20), t: "Csapat", s: data ? `${data.members.length} tag` : "Munkatársak, szerepek" },
    { href: `${base}/import`, icon: Icon.upload(20), t: "Excel import", s: "Cégek, rendszámok, sofőrök egy táblázatból" },
    { href: `${base}/beallitasok`, icon: Icon.gear(20), t: "Beállítások", s: "Ciklusok, emlékeztetők, vállalkozás, fiók" },
  ];
  return <>
    <TopBar title="Több" />
    <div className="content">
      <div className="card pad" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span className="avatar" style={{ width: 52, height: 52, borderRadius: 16, fontSize: 17 }}>{initials(name || email || "B")}</span>
        <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 800, fontSize: 16 }}>{name || "BenAde"}</div><div style={{ fontSize: 13, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>{data && <div style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 2 }}>{data.workspace.name}</div>}</div>
        <ThemeToggle />
      </div>
      <div className="card" style={{ padding: "0 14px" }}><div className="rows">{items.map(i => <Link key={i.href} href={i.href} className="rowi" style={{ gridTemplateColumns: "40px 1fr auto", textDecoration: "none", color: "inherit" }}><span className="avatar" style={{ width: 40, height: 40, borderRadius: 12 }}>{i.icon}</span><span style={{ minWidth: 0 }}><div className="n">{i.t}</div><div className="m">{i.s}</div></span><span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--faint)" }}>{!!i.n && <span className="badge today">{i.n}</span>}{Icon.chev(18)}</span></Link>)}</div></div>
      <div className="card" style={{ padding: "0 14px" }}><div className="rows">
        <a className="rowi" href="/privacy" target="_blank" rel="noopener" style={{ gridTemplateColumns: "1fr auto", textDecoration: "none", color: "inherit" }}><span className="n">Adatkezelési tájékoztató</span><span style={{ color: "var(--faint)" }}>{Icon.external(16)}</span></a>
        <a className="rowi" href="/terms" target="_blank" rel="noopener" style={{ gridTemplateColumns: "1fr auto", textDecoration: "none", color: "inherit" }}><span className="n">Felhasználási feltételek</span><span style={{ color: "var(--faint)" }}>{Icon.external(16)}</span></a>
        <a className="rowi" href="mailto:hello@benade.hu" style={{ gridTemplateColumns: "1fr auto", textDecoration: "none", color: "inherit" }}><span className="n">Súgó és visszajelzés</span><span style={{ color: "var(--faint)" }}>{Icon.mail(16)}</span></a>
      </div></div>
      <button className="btn ghost" onClick={signOut}>{Icon.logout(16)} {demo ? "Kilépés a bemutatóból" : "Kijelentkezés"}</button>
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--faint)" }}>BenAde 2.0 · Tachográf emlékeztető</div>
    </div>
  </>;
}
