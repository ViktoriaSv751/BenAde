"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import SocialAuth from "@/components/SocialAuth";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-errors";

/** Rejtett tartalék: /login?mod=email – csak a régi, e-mailes fiókoknak (nem jelenik meg a felületen). */
function EmailFallback({ next }: { next: string }) {
  const router = useRouter(); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({ email: String(fd.get("email")).trim(), password: String(fd.get("password")) });
    setBusy(false);
    if (error) { setErr(authMessage(error.message)); return; }
    router.replace(next.startsWith("/") ? next : "/app"); router.refresh();
  }
  return (
    <form onSubmit={onSubmit} noValidate>
      <input className="ctl" name="email" type="email" autoComplete="email" placeholder="E-mail-cím" aria-label="E-mail-cím" required />
      <input className="ctl" name="password" type="password" autoComplete="current-password" placeholder="Jelszó" aria-label="Jelszó" required />
      {err && <div className="ferr" role="alert">{err}</div>}
      <button className="btn primary block" type="submit" disabled={busy}>{busy ? "Belépés…" : "Belépés"}</button>
    </form>
  );
}

function Login() {
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const linkErr = params.get("error") === "link";
  return (
    <AuthShell title="Üdv újra" lead="Lépjen be, és nézze meg, mi esedékes ma." footer={<div className="auth-links"><span>Még nincs fiókja?</span><Link href="/register">Fiók létrehozása</Link></div>}>
      {linkErr && <div className="ferr" role="alert">A belépés nem sikerült vagy a hivatkozás lejárt. Próbálja újra.</div>}
      {params.get("mod") === "email" ? <EmailFallback next={next} /> : <SocialAuth next={next} />}
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><Login /></Suspense>;
}
