import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

/** No marketing page: signed-in users go to the app, everyone else to the login screen. */
export default async function Home() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  redirect(user ? "/app" : "/login");
}
