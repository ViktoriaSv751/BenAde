/** Supabase auth error messages in Hungarian, worded for the person at the screen. */
export function authMessage(msg: string | undefined): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Hibás e-mail-cím vagy jelszó.";
  if (m.includes("email not confirmed")) return "Az e-mail-cím még nincs megerősítve. Nyissa meg a regisztrációkor kapott levelet.";
  if (m.includes("user already registered") || m.includes("already been registered")) return "Ezzel az e-mail-címmel már van fiók. Jelentkezzen be, vagy kérjen új jelszót.";
  if (m.includes("password should be at least")) return "A jelszó legalább 8 karakter legyen.";
  if (m.includes("rate limit") || m.includes("too many")) return "Túl sok próbálkozás. Várjon egy percet, majd próbálja újra.";
  if (m.includes("invalid email") || m.includes("unable to validate email")) return "Az e-mail-cím formátuma nem megfelelő.";
  if (m.includes("same password") || m.includes("different from the old")) return "Az új jelszó nem egyezhet a régivel.";
  if (m.includes("session") || m.includes("expired") || m.includes("otp")) return "A hivatkozás lejárt vagy már felhasználták. Kérjen újat.";
  if (m.includes("fetch") || m.includes("network")) return "Nincs kapcsolat a szerverrel. Ellenőrizze az internetet.";
  return msg ? "Hiba történt: " + msg : "Ismeretlen hiba történt.";
}
