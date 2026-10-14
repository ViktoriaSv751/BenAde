import Link from "next/link";
import RoadArt from "./RoadArt";
import { Wordmark } from "./Brand";

export default function AuthShell({ title, lead, children, footer }: { title: string; lead: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="side">
        <Wordmark light />
        <div>
          <h2>Határidők <em>biztonságban</em>, minden nap.</h2>
          <p>Fedélzeti egység és vezetői kártya letöltések, oktatások, számlák – egy időrendi listában, értesítéssel.</p>
          <div className="art"><RoadArt /></div>
        </div>
        <div className="quote">Időben szólunk. Ön nyugodtan vezethet.</div>
      </aside>
      <main className="pane">
        <div className="box">
          <div className="mobile-brand"><Wordmark /></div>
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
          {children}
          {footer}
          <p className="legal">A folytatással elfogadja a <Link href="/terms">felhasználási feltételeket</Link> és az <Link href="/privacy">adatkezelési tájékoztatót</Link>.</p>
        </div>
      </main>
    </div>
  );
}
