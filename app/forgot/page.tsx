"use client";
import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-errors";

export default function ForgotPage() {
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setBusy(true);
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset` });
    setBusy(false);
    if (error) { setErr(authMessage(error.message)); return; }
    setSent(true);
  }

  return (
    <AuthShell title="Elfelejtett jelszó" lead="Adja meg az e-mail-címét, és küldünk egy hivatkozást, amivel új jelszót állíthat be.">
      {sent ? <div className="fok" style={{ marginTop: 24 }}>Ha ezzel a címmel van fiók, pár percen belül megérkezik a levél. Nyissa meg, és kövesse a hivatkozást.</div> : (
        <form onSubmit={onSubmit} noValidate>
          <div className="field"><label htmlFor="email">E-mail-cím</label><input className="ctl" id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nev@ceg.hu" required /></div>
          {err && <div className="ferr" role="alert">{err}</div>}
          <button className="btn primary block" type="submit" disabled={busy}>{busy ? "Küldés…" : "Hivatkozás küldése"}</button>
        </form>
      )}
      <div className="links"><Link href="/login">Vissza a bejelentkezéshez</Link></div>
    </AuthShell>
  );
}
