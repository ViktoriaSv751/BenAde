"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { allowDemo } from "@/components/DemoGuard";

const Play = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M10 8.8v6.4l5.2-3.2z" fill="currentColor" /></svg>;
const G = <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>;
const A = <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.5 0 2 .8 3.3.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.8-1.1-2.8-4.3zM13.9 5.2c.7-.8 1.2-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1.1 3.1 1.1.1 2.3-.6 3-1.4z"/></svg>;

/** Apple / Google bejelentkezés + tesztfiók (jelszó nélkül, bemutató adatokkal). */
export default function SocialAuth({ next = "/app", verb = "Folytatás" }: { next?: string; verb?: string; emailHref?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // only show providers that are switched on in Supabase (public auth settings endpoint)
  const [prov, setProv] = useState<{ apple: boolean; google: boolean } | null>(null);
  useEffect(() => { const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !key) { setProv({ apple: false, google: false }); return; }
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then(r => r.json()).then(j => setProv({ apple: !!j?.external?.apple, google: !!j?.external?.google })).catch(() => setProv({ apple: false, google: false })); }, []);
  async function go(provider: "google" | "apple") {
    setErr(null);
    if (prov && !prov[provider]) { setErr(`A ${provider === "apple" ? "Apple" : "Google"}-belépés néhány napon belül indul.`); return; }
    setBusy(provider);
    const sb = createClient();
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (error) { setBusy(null); setErr(/not enabled|Unsupported provider|provider is not/i.test(error.message) ? `A ${provider === "apple" ? "Apple" : "Google"}-bejelentkezés bekapcsolása folyamatban van.` : error.message); }
  }
  return (
    <div className="social">
      <button type="button" className="btn apple" onClick={() => go("apple")} disabled={!!busy}>{A}<span>{busy === "apple" ? "Átirányítás…" : `${verb} Apple-lel`}</span></button>
      <button type="button" className="btn google" onClick={() => go("google")} disabled={!!busy}>{G}<span>{busy === "google" ? "Átirányítás…" : `${verb} Google-lel`}</span></button>
      {err && <div className="ferr" role="alert">{err}</div>}
      <div className="or">vagy</div>
      <Link className="btn test" href="/demo" onClick={allowDemo}>{Play}<span>Belépés tesztfiókkal</span></Link>
    </div>
  );
}
