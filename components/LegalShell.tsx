import Link from "next/link";

const Check = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export default function LegalShell({ kicker, title, updated, summary, toc, children }: { kicker: string; title: string; updated: string; summary: string[]; toc: { id: string; label: string }[]; children: React.ReactNode }) {
  return (
    <div className="legal-page">
      <header className="legal-top">
        <Link className="ibtn" href="/login" aria-label="Vissza"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg></Link>
        <Link href="/login" className="w">Ben<b>Ade</b></Link>
        <span className="sp" />
        <Link className="btn ghost sm" href={kicker === "Felhasználási feltételek" ? "/privacy" : "/terms"}>{kicker === "Felhasználási feltételek" ? "Adatkezelés" : "Feltételek"}</Link>
      </header>
      <main className="doc">
        <div className="kicker">{kicker}</div>
        <h1>{title}</h1>
        <div className="meta"><span>Hatályos: {updated}</span><span>·</span><span>BenAde – Tachográf Emlékeztető</span></div>
        <div className="summary">{summary.map(s => <div key={s}>{Check}<span>{s}</span></div>)}</div>
        <nav className="toc" aria-label="Tartalom">{toc.map((t, i) => <a key={t.id} href={`#${t.id}`}>{t.label}<span>{String(i + 1).padStart(2, "0")}</span></a>)}</nav>
        {children}
        <div className="foot-cta"><Link className="btn primary" href="/register">Elfogadom és folytatom</Link></div>
      </main>
    </div>
  );
}
