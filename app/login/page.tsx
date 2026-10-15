"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import SocialAuth from "@/components/SocialAuth";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-errors";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [err, setErr] = useState<string | null>(params.get("error") === "link" ? "A hivatkozás lejárt vagy érvénytelen. Jelentkezzen be, vagy kérjen újat." : null);
  const [busy, setBusy] = useState(false);
  const next = params.get("next") || "/app";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: String(fd.get("email")).trim(), password: String(fd.get("password")) });
    setBusy(false);
    if (error) { setErr(authMessage(error.message)); return; }
    router.replace(next.startsWith("/") ? next : "/app"); router.refresh();
  }

  return (
    <>
      <SocialAuth next={next} onError={setErr} />
      <div className="or">vagy e-maillel</div>
      <form onSubmit={onSubmit} noValidate>
        <div className="field"><label htmlFor="email">E-mail-cím</label><input className="ctl" id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nev@ceg.hu" required /></div>
        <div className="field"><label htmlFor="password">Jelszó</label><PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" required /></div>
        {err && <div className="ferr" role="alert">{err}</div>}
        <button className="btn primary block" type="submit" disabled={busy}>{busy ? "Bejelentkezés…" : "Bejelentkezés"}</button>
      </form>
      <div className="auth-links"><Link href="/forgot">Elfelejtett jelszó</Link><span>Új itt? <Link href="/register">Fiók létrehozása</Link></span></div>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell title="Bejelentkezés" lead="Folytassa ott, ahol abbahagyta.">
      <Suspense fallback={null}><LoginForm /></Suspense>
    </AuthShell>
  );
}
