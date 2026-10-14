import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Onboarding } from "@/components/app/Onboarding";
export const metadata: Metadata = { title: "Bevezetés · BenAde", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ meghivo?: string }> }) {
  const sb = await createClient(); const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/app/bevezetes");
  const { meghivo } = await searchParams;
  const { data: ms } = await sb.from("memberships").select("workspace_id").eq("user_id", user.id).limit(1);
  if (ms && ms.length && !meghivo) redirect("/app");
  return <Onboarding email={user.email || ""} name={(user.user_metadata?.full_name as string) || ""} inviteToken={meghivo} />;
}
