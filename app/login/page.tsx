"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import SocialAuth from "@/components/SocialAuth";
import PasswordInput from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-errors";
import { showSplash } from "@/components/Splash";

/** E-mail + jelszó belépés (ideiglenes, amíg az Apple/Google-belépés nincs bekapcsolva). */
function EmailFallback({ next }: { next: string }) {
  const router = useRouter(); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({ email: String(fd.get("email")).trim(), password: String(fd.get("password")) });
    if (error) { setBusy(false); setErr(authMessage(error.message)); return; }
    showSplash(); // stays until the app has its data, then the Teendő page fades in from it
    router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/app"); router.refresh();
  }
  return (
    <>
    <form onSubmit={onSubmit} noValidate>
      <div className="field"><label htmlFor="email">E-mail-cím</label><input className="ctl" id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nev@ceg.hu" required /></div>
      <div className="field"><label htmlFor="password">Jelszó</label><PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" required /></div>
      {err && <div className="ferr" role="alert">{err}</div>}
      <button className="btn primary block" type="submit" disabled={busy}>{busy ? "Belépés…" : "Belépés"}</button>
    </form>
    <div className="auth-links"><Link href="/forgot">Elfelejtett jelszó</Link><span>·</span><Link href="/login">Vissza</Link></div>
    </>
  );
}

function Login() {
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const linkErr = params.get("error") === "link";
  return (
    <AuthShell title="Üdv újra" lead="Lépjen be, és nézze meg, mi esedékes ma." footer={<div className="auth-links"><span>Még nincs fiókja?</span><Link href="/register">Fiók létrehozása</Link></div>}>
      {linkErr && <div className="ferr" role="alert">A hivatkozás lejárt vagy másik böngészőben nyílt meg. Ha most erősítette meg a fiókját, egyszerűen jelentkezzen be e-mail-címmel és jelszóval.</div>}
      {params.get("mod") === "email" ? <EmailFallback next={next} /> : <SocialAuth next={next} emailHref={`/login?mod=email${next !== "/app" ? `&next=${encodeURIComponent(next)}` : ""}`} />}
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><Login /></Suspense>;
}
