import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const sb = await createClient(); const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/register?next=${encodeURIComponent(`/app/bevezetes?meghivo=${token}`)}`);
  redirect(`/app/bevezetes?meghivo=${token}`);
}
