import Link from "next/link";
import { Wordmark } from "./Brand";

export default function AuthShell({ title, lead, children, footer }: { title: string; lead: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="stage">
      <div className="bgimg" style={{ backgroundImage: "url(/img/road.jpg)" }} aria-hidden />
      <div className="bgveil" aria-hidden />
      <main className="auth">
        <div className="head"><Wordmark /></div>
        <div className="box">
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
          {children}
          {footer}
        </div>
        <p className="legal">A folytatással elfogadja a <Link href="/terms">felhasználási feltételeket</Link> és az <Link href="/privacy">adatkezelési tájékoztatót</Link>.</p>
      </main>
    </div>
  );
}
