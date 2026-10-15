import Link from "next/link";

/** Belépés / regisztráció – mindig sötét, teljes képes megjelenés. */
export default function AuthShell({ title, lead, children, footer }: { title: string; lead?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden>
        <picture>
          <source media="(min-width: 900px)" srcSet="/img/road.jpg" />
          <img src="/img/tacho.jpg" alt="" fetchPriority="high" />
        </picture>
      </div>
      <div className="auth-wrap">
        <header className="auth-mark">
          <Link href="/login" className="wm" aria-label="BenAde">Ben<b>Ade</b></Link>
          <p className="claim desk">Minden tachográf-határidő.<br />Pontosan időben.</p>
        </header>
        <main className="auth-card">
          <div className="auth-head"><h1>{title}</h1>{lead && <p className="lead desk">{lead}</p>}</div>
          {children}
          {footer}
          <p className="auth-legal">A folytatással elfogadja a <Link href="/terms">felhasználási feltételeket</Link> és az <Link href="/privacy">adatkezelési tájékoztatót</Link>.</p>
        </main>
      </div>
    </div>
  );
}
