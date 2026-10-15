import Link from "next/link";
import { Wordmark } from "./Brand";

export default function AuthShell({ title, lead, children, footer, claim }: { title: string; lead: string; children: React.ReactNode; footer?: React.ReactNode; claim?: { h: string; p: string } }) {
  const c = claim || { h: "Egyetlen határidő sem csúszik el többé.", p: "Fedélzeti egység és vezetői kártya letöltések, oktatások, számlák – automatikus ciklusokkal, időben érkező emlékeztetőkkel." };
  return (
    <div className="auth-page">
      <aside className="auth-side" aria-hidden>
        <img src="/img/truck.jpg" alt="" />
        <Wordmark />
        <div className="claim"><h2>{c.h}</h2><p>{c.p}</p></div>
      </aside>
      <div className="auth-hero">
        <img src="/img/truck.jpg" alt="" fetchPriority="high" />
        <Wordmark />
      </div>
      <main className="auth-body">
        <div><h1>{title}</h1><p className="lead">{lead}</p></div>
        {children}
        {footer}
        <p className="auth-legal">A folytatással elfogadja a <Link href="/terms">felhasználási feltételeket</Link> és az <Link href="/privacy">adatkezelési tájékoztatót</Link>.</p>
      </main>
    </div>
  );
}
