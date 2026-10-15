import type { PortalFeed } from "@/components/portal/PortalView";
import type { Snapshot } from "./types";

/** Same shape as the portal_feed RPC, built from a local snapshot (test account). */
export function buildPortalFeed(s: Snapshot, companyId: string): PortalFeed | null {
  const c = s.companies.find(x => x.id === companyId && !x.archived_at); if (!c) return null;
  const t = s.tasks.filter(x => x.company_id === companyId);
  const min = (a: (string | null | undefined)[]) => a.filter(Boolean).sort()[0] || null;
  const max = (a: (string | null | undefined)[]) => a.filter(Boolean).sort().slice(-1)[0] || null;
  return {
    company: { name: c.name },
    workspace: { name: s.workspace.name, phone: s.workspace.phone, email: s.workspace.email, address: s.workspace.address },
    generated_at: new Date().toISOString(),
    vehicles: s.vehicles.filter(v => v.company_id === companyId && !v.archived_at).map(v => ({ plate: v.plate, make: v.make,
      next_vu: min(t.filter(x => x.vehicle_id === v.id && x.type === "vu_download" && x.status === "open").map(x => x.due_at)),
      next_calibration: min(t.filter(x => x.vehicle_id === v.id && x.type === "calibration" && x.status === "open").map(x => x.due_at)),
      last_vu: max(t.filter(x => x.vehicle_id === v.id && x.type === "vu_download" && x.status === "done").map(x => x.done_at)) })),
    drivers: s.drivers.filter(d => d.company_id === companyId && !d.archived_at).map(d => ({ name: d.name,
      next_card: min(t.filter(x => x.driver_id === d.id && x.type === "card_download" && x.status === "open").map(x => x.due_at)),
      card_expiry: min(t.filter(x => x.driver_id === d.id && x.type === "card_expiry" && x.status === "open").map(x => x.due_at)),
      last_card: max(t.filter(x => x.driver_id === d.id && x.type === "card_download" && x.status === "done").map(x => x.done_at)) })),
    trainings: t.filter(x => x.type === "training" && x.status === "open").sort((a, b) => a.due_at.localeCompare(b.due_at)).map(x => ({ due_at: x.due_at, topic: x.topic, address: x.address, participants: x.participants })),
    invoices: t.filter(x => x.type === "invoice" && !x.paid_at && x.status !== "skipped").sort((a, b) => a.due_at.localeCompare(b.due_at)).map(x => ({ invoice_no: x.invoice_no, issue_date: x.issue_date, due_at: x.due_at, gross_amount: x.gross_amount })),
  };
}
