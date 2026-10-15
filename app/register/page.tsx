import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import SocialAuth from "@/components/SocialAuth";

export default function RegisterPage() {
  return (
    <AuthShell title="Fiók létrehozása" lead="Egy koppintás, és indulhat az első emlékeztető." footer={<div className="auth-links"><span>Van már fiókja?</span><Link href="/login">Bejelentkezés</Link></div>}>
      <SocialAuth verb="Regisztráció" />
    </AuthShell>
  );
}
