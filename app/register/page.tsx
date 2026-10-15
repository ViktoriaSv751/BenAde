"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import SocialAuth from "@/components/SocialAuth";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-errors";

export default function RegisterPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim(), password = String(fd.get("password")), again = String(fd.get("again"));
    const name = String(fd.get("name")).trim();
    if (password.length < 8) { setErr("A jelszó legalább 8 karakter legyen."); setBusy(false); return; }
    if (password !== again) { setErr("A két jelszó nem egyezik."); setBusy(false); return; }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/app` } });
    setBusy(false);
    if (error) { setErr(authMessage(error.message)); return; }
    if (data.session) { router.replace("/app"); router.refresh(); return; }
    setDone(email);
  }

  if (done) {
    return (
      <AuthShell title="Még egy lépés" lead={`Küldtünk egy megerősítő levelet ide: ${done}. Nyissa meg, és koppintson a benne lévő gombra – utána máris használhatja az appot.`}>
        <div className="fok">Nem találja? Nézze meg a Spam vagy Promóciók mappát is. A levél feladója a BenAde rendszere.</div>
        <div className="auth-links"><Link href="/login">Vissza a bejelentkezéshez</Link></div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Fiók létrehozása" lead="Egy perc, és indulhat az első emlékeztető." claim={{ h: "Holnap reggel már ez ébreszt.", p: "Fiók, első cég, első rendszám – három perc. A többit a BenAde számolja és jelzi." }}>
      <SocialAuth onError={setErr} />
      <div className="or">vagy e-maillel</div>
      <form onSubmit={onSubmit} noValidate>
        <div className="field"><label htmlFor="name">Név vagy cégnév</label><input className="ctl" id="name" name="name" autoComplete="name" placeholder="Pl. BenAde Kft." /></div>
        <div className="field"><label htmlFor="email">E-mail-cím</label><input className="ctl" id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nev@ceg.hu" required /></div>
        <div className="field"><label htmlFor="password">Jelszó</label><PasswordInput id="password" autoComplete="new-password" placeholder="Legalább 8 karakter" minLength={8} required /></div>
        <div className="field"><label htmlFor="again">Jelszó még egyszer</label><PasswordInput id="again" autoComplete="new-password" placeholder="••••••••" minLength={8} required /></div>
        {err && <div className="ferr" role="alert">{err}</div>}
        <button className="btn primary block" type="submit" disabled={busy}>{busy ? "Létrehozás…" : "Fiók létrehozása"}</button>
      </form>
      <div className="auth-links"><span>Van már fiókja? <Link href="/login">Bejelentkezés</Link></span></div>
    </AuthShell>
  );
}
