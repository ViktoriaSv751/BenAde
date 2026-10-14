import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BenAdeApp from "@/components/BenAdeApp";
import "../benade.css";

export const metadata: Metadata = { title: "Teendők", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app");
  return <BenAdeApp userId={user.id} email={user.email ?? ""} fullName={(user.user_metadata?.full_name as string) || ""} />;
}
