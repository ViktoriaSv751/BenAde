"use client";
import { use, useEffect, useState } from "react";
import { PortalMissing, PortalView, type PortalFeed } from "@/components/portal/PortalView";
import { buildPortalFeed } from "@/lib/portalFeed";
import type { Snapshot } from "@/lib/types";
import "@/app/styles/customers.css";

/** Test-account version of the customer portal: reads the locally stored demo data. */
export default function DemoPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [feed, setFeed] = useState<PortalFeed | null | undefined>(undefined);
  useEffect(() => { try { const raw = localStorage.getItem("benade.demo.v3"); const s = raw ? JSON.parse(raw) as Snapshot : null; const c = s?.companies.find(x => (x as { portal_token?: string | null }).portal_token === token); setFeed(s && c ? buildPortalFeed(s, c.id) : null); } catch { setFeed(null); } }, [token]);
  if (feed === undefined) return null;
  return feed ? <PortalView feed={feed} /> : <PortalMissing reason="notfound" />;
}
