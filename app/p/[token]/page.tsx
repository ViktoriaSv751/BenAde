import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { PortalMissing, PortalView, type PortalFeed } from "@/components/portal/PortalView";
import "@/app/styles/customers.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ügyfélportál",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

/** Public, read-only customer portal: /p/<token>. No login; data comes from the portal_feed RPC (security definer, anon). */
export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{32,64}$/i.test(token)) return <PortalMissing reason="notfound" />;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return <PortalMissing reason="unavailable" />;
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.rpc("portal_feed", { p_token: token });
  if (error) return <PortalMissing reason="unavailable" />;
  if (!data) return <PortalMissing reason="notfound" />;
  return <PortalView feed={data as PortalFeed} />;
}
