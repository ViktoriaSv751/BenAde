import { createClient } from "@supabase/supabase-js";
/** Service-role client – server only (cron sender, ICS feed, PDF). Never import in client code. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY hiányzik");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
