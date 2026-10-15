"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-errors";

export default function ResetPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password")), again = String(fd.get("again"));
    if (password.length < 8) { setErr("A jelszó legalább 8 karakter legyen."); return; }
    if (password !== again) { setErr("A két jelszó nem egyezik."); return; }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setErr(authMessage(error.message)); return; }
    router.replace("/app?pw=ok"); router.refresh();
  }

  return (
    <AuthShell title="Új jelszó" lead="Adjon meg egy új jelszót a fiókjához.">
      {ready === false ? (
        <>
          <div className="ferr">A hivatkozás lejárt vagy már felhasználták. Kérjen újat.</div>
          <div className="auth-links"><Link href="/forgot">Új hivatkozás kérése</Link></div>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className="field"><label htmlFor="password">Új jelszó</label><PasswordInput id="password" autoComplete="new-password" placeholder="Legalább 8 karakter" minLength={8} required /></div>
          <div className="field"><label htmlFor="again">Új jelszó még egyszer</label><PasswordInput id="again" autoComplete="new-password" placeholder="••••••••" minLength={8} required /></div>
          {err && <div className="ferr" role="alert">{err}</div>}
          <button className="btn primary block" type="submit" disabled={busy || ready === null}>{busy ? "Mentés…" : "Jelszó mentése"}</button>
        </form>
      )}
    </AuthShell>
  );
}
