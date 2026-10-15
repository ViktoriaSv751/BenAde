import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TASK_META } from "@/lib/types";
export const dynamic = "force-dynamic";

const esc = (s: string) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const day = (iso: string) => iso.slice(0, 10).replace(/-/g, "");

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; if (!/^[a-f0-9]{24,64}$/i.test(token)) return new NextResponse("Not found", { status: 404 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: feed } = await sb.rpc("ics_feed", { p_token: token });
  if (!feed) return new NextResponse("Not found", { status: 404 });
  type Row = { id: string; type: string; status: string; company_id: string; vehicle_id: string | null; driver_id: string | null; invoice_no: string | null; topic: string | null; due_at: string; all_day: boolean; updated_at: string; created_at: string; note: string | null; address: string | null; contact_name: string | null; contact_phone: string | null; gross_amount: number | null; remind_at: string[] };
  const f = feed as { workspace: { id: string; name: string }; tasks: Row[]; companies: { id: string; name: string }[]; vehicles: { id: string; plate: string }[]; drivers: { id: string; name: string }[] };
  const ws = f.workspace, tasks = f.tasks, comps = f.companies, veh = f.vehicles, drv = f.drivers;
  const cn = new Map((comps || []).map(c => [c.id, c.name])), vn = new Map((veh || []).map(v => [v.id, v.plate])), dn = new Map((drv || []).map(d => [d.id, d.name]));
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BenAde//Tachograf//HU", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc("BenAde – " + ws.name)}`, "X-WR-TIMEZONE:Europe/Budapest", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"];
  for (const t of tasks || []) {
    const meta = TASK_META[t.type as keyof typeof TASK_META]; const subj = t.vehicle_id ? vn.get(t.vehicle_id) : t.driver_id ? dn.get(t.driver_id) : t.type === "invoice" ? t.invoice_no : t.topic;
    const title = `${t.status !== "open" ? "✓ " : ""}${meta?.short || t.type}: ${cn.get(t.company_id) || ""}${subj ? " · " + subj : ""}`;
    const due = new Date(t.due_at);
    lines.push("BEGIN:VEVENT", `UID:${t.id}@benade`, `DTSTAMP:${stamp(new Date(t.updated_at || t.created_at))}`,
      ...(t.all_day ? [`DTSTART;VALUE=DATE:${day(t.due_at)}`, `DTEND;VALUE=DATE:${day(new Date(due.getTime() + 86400000).toISOString())}`] : [`DTSTART:${stamp(due)}`, `DTEND:${stamp(new Date(due.getTime() + 3600000))}`]),
      `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc([t.note, t.address, t.contact_name && `Kapcsolat: ${t.contact_name} ${t.contact_phone || ""}`, t.gross_amount && `Bruttó: ${Number(t.gross_amount).toLocaleString("hu-HU")} Ft`].filter(Boolean).join("\n"))}`,
      ...(t.address ? [`LOCATION:${esc(t.address)}`] : []), `STATUS:${t.status === "open" ? "CONFIRMED" : "COMPLETED"}`, `CATEGORIES:${esc(meta?.short || "")}`,
      ...(t.status === "open" ? (t.remind_at as string[] || []).slice(0, 3).map(r => `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${esc(title)}\r\nTRIGGER;VALUE=DATE-TIME:${stamp(new Date(r))}\r\nEND:VALARM`) : []), "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new NextResponse(lines.join("\r\n") + "\r\n", { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300", "content-disposition": `inline; filename="benade.ics"` } });
}
