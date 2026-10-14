import Link from "next/link";
import { Wordmark } from "./Brand";

export default function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="site">
      <header className="topbar"><Wordmark /><nav><Link className="btn ghost sm" href="/login">Bejelentkezés</Link></nav></header>
      <main className="doc">
        <h1>{title}</h1>
        <p className="meta">Hatályos: {updated}</p>
        {children}
      </main>
      <footer className="site-foot"><div className="inner"><span>© {new Date().getFullYear()} BenAde</span><span><Link href="/terms">Felhasználási feltételek</Link><Link href="/privacy">Adatkezelés</Link></span></div></footer>
    </div>
  );
}
