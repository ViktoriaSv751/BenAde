import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { TASK_META } from "@/lib/types";
export const dynamic = "force-dynamic";

const esc = (s: string) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const day = (iso: string) => iso.slice(0, 10).replace(/-/g, "");

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; if (!/^[a-f0-9]{24,64}$/i.test(token)) return new NextResponse("Not found", { status: 404 });
  let sb; try { sb = adminClient(); } catch { return new NextResponse("ICS feed nincs konfigurálva", { status: 503 }); }
  const { data: ws } = await sb.from("workspaces").select("id,name").eq("ics_token", token).maybeSingle();
  if (!ws) return new NextResponse("Not found", { status: 404 });
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const [{ data: tasks }, { data: comps }, { data: veh }, { data: drv }] = await Promise.all([
    sb.from("tasks").select("*").eq("workspace_id", ws.id).gte("due_at", since).order("due_at"),
    sb.from("companies").select("id,name").eq("workspace_id", ws.id), sb.from("vehicles").select("id,plate").eq("workspace_id", ws.id), sb.from("drivers").select("id,name").eq("workspace_id", ws.id)]);
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
