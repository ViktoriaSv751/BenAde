"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import SocialAuth from "@/components/SocialAuth";
import PasswordInput from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-errors";

function EmailRegister() {
  const router = useRouter(); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [done, setDone] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name")).trim(), email = String(fd.get("email")).trim(), password = String(fd.get("password"));
    if (!email.includes("@")) return setErr("Adjon meg egy érvényes e-mail-címet.");
    if (password.length < 8) return setErr("A jelszó legalább 8 karakter legyen.");
    setBusy(true);
    const { data, error } = await createClient().auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/app` } });
    setBusy(false);
    if (error) return setErr(authMessage(error.message));
    if (data.session) { router.replace("/app"); router.refresh(); return; }
    setDone(email);
  }
  if (done) return <div className="fok">Küldtünk egy megerősítő levelet ide: {done}. Nyissa meg, és koppintson a benne lévő gombra. Ha nem találja, nézze meg a Spam mappát is.</div>;
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field"><label htmlFor="name">Név</label><input className="ctl" id="name" name="name" autoComplete="name" placeholder="Pl. Kovács János" /></div>
      <div className="field"><label htmlFor="email">E-mail-cím</label><input className="ctl" id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nev@ceg.hu" required /></div>
      <div className="field"><label htmlFor="password">Jelszó</label><PasswordInput id="password" autoComplete="new-password" placeholder="Legalább 8 karakter" minLength={8} required /></div>
      {err && <div className="ferr" role="alert">{err}</div>}
      <button className="btn primary block" type="submit" disabled={busy}>{busy ? "Létrehozás…" : "Fiók létrehozása"}</button>
    </form>
  );
}

function Register() {
  const params = useSearchParams();
  return (
    <AuthShell title="Fiók létrehozása" lead="Egy perc, és indulhat az első emlékeztető." footer={<div className="auth-links"><span>Van már fiókja?</span><Link href="/login">Bejelentkezés</Link></div>}>
      {params.get("mod") === "email" ? <EmailRegister /> : <SocialAuth verb="Regisztráció" emailHref="/register?mod=email" />}
    </AuthShell>
  );
}
export default function RegisterPage() { return <Suspense fallback={null}><Register /></Suspense>; }
