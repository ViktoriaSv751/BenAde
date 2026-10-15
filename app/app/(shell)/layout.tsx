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
  let [{ data: ms }, { data: prof }] = await Promise.all([
    sb.from("memberships").select("workspace_id, role, created_at").eq("user_id", user.id).order("created_at"),
    sb.from("profiles").select("full_name, last_workspace_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!ms || ms.length === 0) {
    // new account: create the workspace silently and go straight to the app (no onboarding questions)
    const display = (prof?.full_name || (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "").trim();
    const { error } = await sb.rpc("ensure_workspace", { p_name: display ? `${display.split(" ")[0]} szervize` : "Saját szerviz" });
    if (error) redirect("/app/bevezetes");
    ({ data: ms } = await sb.from("memberships").select("workspace_id, role, created_at").eq("user_id", user.id).order("created_at"));
    ({ data: prof } = await sb.from("profiles").select("full_name, last_workspace_id").eq("user_id", user.id).maybeSingle());
    if (!ms || ms.length === 0) redirect("/app/bevezetes");
  }
  const wsId = ms.find(m => m.workspace_id === prof?.last_workspace_id)?.workspace_id || ms[0].workspace_id;
  const name = prof?.full_name || (user.user_metadata?.full_name as string) || "";
  return <AppRoot userId={user.id} email={user.email || ""} name={name} wsId={wsId}>{children}</AppRoot>;
}
