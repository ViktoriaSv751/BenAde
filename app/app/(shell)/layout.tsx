import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppRoot } from "@/components/app/Root";

export const metadata: Metadata = { title: { default: "BenAde", template: "%s · BenAde" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/app");
  const [{ data: ms }, { data: prof }] = await Promise.all([
    sb.from("memberships").select("workspace_id, role, created_at").eq("user_id", user.id).order("created_at"),
    sb.from("profiles").select("full_name, last_workspace_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!ms || ms.length === 0) redirect("/app/bevezetes");
  const wsId = ms.find(m => m.workspace_id === prof?.last_workspace_id)?.workspace_id || ms[0].workspace_id;
  const name = prof?.full_name || (user.user_metadata?.full_name as string) || "";
  return <AppRoot userId={user.id} email={user.email || ""} name={name} wsId={wsId}>{children}</AppRoot>;
}
