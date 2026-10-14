import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createClient } from "@/lib/supabase/server";
import { TASK_META } from "@/lib/types";
export const dynamic = "force-dynamic";

const fmt = (iso?: string | null) => { if (!iso) return "–"; const d = new Date(iso); return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`; };
const ft = (n?: number | null) => (Number(n) || 0).toLocaleString("hu-HU") + " Ft";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const sb = await createClient(); const { data: { user } } = await sb.auth.getUser(); if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: c } = await sb.from("companies").select("*").eq("id", id).maybeSingle(); if (!c) return new NextResponse("Not found", { status: 404 });
  const [{ data: ws }, { data: vehicles }, { data: drivers }, { data: tasks }] = await Promise.all([
    sb.from("workspaces").select("*").eq("id", c.workspace_id).single(), sb.from("vehicles").select("*").eq("company_id", id).is("archived_at", null).order("plate"),
    sb.from("drivers").select("*").eq("company_id", id).is("archived_at", null).order("name"), sb.from("tasks").select("*").eq("company_id", id).order("due_at")]);
  const [reg, bold] = await Promise.all([readFile(path.join(process.cwd(), "public/fonts/DejaVuSans.ttf")), readFile(path.join(process.cwd(), "public/fonts/DejaVuSans-Bold.ttf"))]);
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const F = await pdf.embedFont(reg, { subset: true }), B = await pdf.embedFont(bold, { subset: true });
  pdf.setTitle(`Flotta-naptár – ${c.name}`); pdf.setAuthor(ws?.name || "BenAde"); pdf.setProducer("BenAde 2.0");
  const W = 595.28, H = 841.89, M = 44; let page = pdf.addPage([W, H]); let y = H - M;
  const ink = rgb(.07, .09, .14), mut = rgb(.42, .47, .56), line = rgb(.88, .9, .93), acc = rgb(.18, .42, 1), red = rgb(.85, .18, .2);
  const text = (p: PDFPage, s: string, x: number, yy: number, size: number, f: PDFFont = F, color = ink) => p.drawText(s, { x, y: yy, size, font: f, color });
  const ensure = (need: number) => { if (y - need < M + 30) { footer(page); page = pdf.addPage([W, H]); y = H - M; } };
  const footer = (p: PDFPage) => { p.drawLine({ start: { x: M, y: M - 6 }, end: { x: W - M, y: M - 6 }, color: line, thickness: .6 }); text(p, `${ws?.name || "BenAde"}${ws?.phone ? " · " + ws.phone : ""}${ws?.email ? " · " + ws.email : ""}`, M, M - 20, 8, F, mut); const pn = `${pdf.getPageCount()}. oldal`; text(p, pn, W - M - F.widthOfTextAtSize(pn, 8), M - 20, 8, F, mut); };
  // header
  page.drawRectangle({ x: M, y: y - 6, width: 6, height: 26, color: acc });
  text(page, "FLOTTA-NAPTÁR", M + 14, y + 8, 9, B, acc); text(page, c.name, M + 14, y - 10, 20, B);
  const today = fmt(new Date().toISOString()); text(page, `Készült: ${today}`, W - M - F.widthOfTextAtSize(`Készült: ${today}`, 9), y + 8, 9, F, mut);
  y -= 34; text(page, [c.tax_id && `Adószám: ${c.tax_id}`, c.address, c.phone, c.email].filter(Boolean).join("   ·   "), M, y, 9.5, F, mut); y -= 26;
  const open = (tasks || []).filter(t => t.status === "open"); const todayISO = new Date().toISOString().slice(0, 10);
  // summary chips
  const chips = [[`${open.length}`, "nyitott teendő"], [`${open.filter(t => t.due_at.slice(0, 10) < todayISO).length}`, "lejárt"], [`${(vehicles || []).length}`, "jármű"], [`${(drivers || []).length}`, "sofőr"], [ft(open.filter(t => t.type === "invoice").reduce((s, t) => s + Number(t.gross_amount || 0), 0)), "kintlévőség"]];
  let x = M; for (const [v, l] of chips) { const w = Math.max(70, B.widthOfTextAtSize(v, 14) + 24); page.drawRectangle({ x, y: y - 30, width: w, height: 42, color: rgb(.96, .97, .99), borderColor: line, borderWidth: .6 }); text(page, v, x + 12, y - 8, 14, B); text(page, l, x + 12, y - 22, 7.5, F, mut); x += w + 8; } y -= 56;
  const section = (title: string) => { ensure(40); text(page, title.toUpperCase(), M, y, 8.5, B, mut); y -= 6; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, color: line, thickness: .8 }); y -= 16; };
  const row = (cols: { s: string; x: number; w: number; f?: PDFFont; c?: ReturnType<typeof rgb>; right?: boolean }[], h = 16) => { ensure(h); for (const col of cols) { let s = col.s; const f = col.f || F; while (f.widthOfTextAtSize(s, 9) > col.w - 4 && s.length > 2) s = s.slice(0, -2) + "…"; const tx = col.right ? col.x + col.w - f.widthOfTextAtSize(s, 9) : col.x; text(page, s, tx, y, 9, f, col.c || ink); } y -= h; };
  const lastOf = (type: string, key: "vehicle_id" | "driver_id", id: string) => { const l = (tasks || []).filter(t => t.type === type && t[key] === id); return { prev: l.filter(t => t.status === "done").sort((a, b) => (b.done_at || "").localeCompare(a.done_at || ""))[0], next: l.filter(t => t.status === "open").sort((a, b) => a.due_at.localeCompare(b.due_at))[0] }; };
  // vehicles
  section("Járművek – fedélzeti egység letöltés (90 nap)");
  row([{ s: "Rendszám", x: M, w: 110, f: B, c: mut }, { s: "Gyártmány / VU", x: M + 110, w: 150, f: B, c: mut }, { s: "Utolsó letöltés", x: M + 260, w: 110, f: B, c: mut }, { s: "Következő határidő", x: M + 370, w: 140, f: B, c: mut }], 18);
  if (!(vehicles || []).length) row([{ s: "Nincs rögzített jármű.", x: M, w: 400, c: mut }]);
  for (const v of vehicles || []) { const { prev, next } = lastOf("vu_download", "vehicle_id", v.id); const over = next && next.due_at.slice(0, 10) < todayISO; row([{ s: v.plate, x: M, w: 110, f: B }, { s: [v.make, v.vu_type].filter(Boolean).join(" · ") || "–", x: M + 110, w: 150 }, { s: fmt(prev?.done_at || prev?.due_at), x: M + 260, w: 110 }, { s: next ? fmt(next.due_at) + (over ? "  LEJÁRT" : "") : "–", x: M + 370, w: 140, f: over ? B : F, c: over ? red : ink }]); }
  y -= 10;
  section("Gépkocsivezetők – kártyaletöltés (28 nap)");
  row([{ s: "Név", x: M, w: 170, f: B, c: mut }, { s: "Kártyaszám", x: M + 170, w: 120, f: B, c: mut }, { s: "Utolsó letöltés", x: M + 290, w: 100, f: B, c: mut }, { s: "Következő határidő", x: M + 390, w: 120, f: B, c: mut }], 18);
  if (!(drivers || []).length) row([{ s: "Nincs rögzített gépkocsivezető.", x: M, w: 400, c: mut }]);
  for (const d of drivers || []) { const { prev, next } = lastOf("card_download", "driver_id", d.id); const over = next && next.due_at.slice(0, 10) < todayISO; row([{ s: d.name, x: M, w: 170, f: B }, { s: d.card_number || "–", x: M + 170, w: 120 }, { s: fmt(prev?.done_at || prev?.due_at), x: M + 290, w: 100 }, { s: next ? fmt(next.due_at) + (over ? "  LEJÁRT" : "") : "–", x: M + 390, w: 120, f: over ? B : F, c: over ? red : ink }]); }
  y -= 10;
  section("Következő 12 hónap – minden határidő");
  const horizon = new Date(); horizon.setFullYear(horizon.getFullYear() + 1);
  const upcoming = open.filter(t => new Date(t.due_at) <= horizon);
  row([{ s: "Dátum", x: M, w: 90, f: B, c: mut }, { s: "Típus", x: M + 90, w: 130, f: B, c: mut }, { s: "Tárgy", x: M + 220, w: 190, f: B, c: mut }, { s: "Megjegyzés", x: M + 410, w: 100, f: B, c: mut }], 18);
  if (!upcoming.length) row([{ s: "Nincs nyitott határidő.", x: M, w: 400, c: mut }]);
  for (const t of upcoming) { const meta = TASK_META[t.type as keyof typeof TASK_META]; const subj = t.vehicle_id ? (vehicles || []).find(v => v.id === t.vehicle_id)?.plate : t.driver_id ? (drivers || []).find(d => d.id === t.driver_id)?.name : t.type === "invoice" ? `${t.invoice_no || ""} ${ft(t.gross_amount)}` : t.topic || t.address; const over = t.due_at.slice(0, 10) < todayISO; row([{ s: fmt(t.due_at), x: M, w: 90, f: over ? B : F, c: over ? red : ink }, { s: meta?.short || t.type, x: M + 90, w: 130 }, { s: subj || "–", x: M + 220, w: 190 }, { s: t.note || "", x: M + 410, w: 100, c: mut }]); }
  footer(page);
  const bytes = await pdf.save();
  const safe = c.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return new NextResponse(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="benade-${safe}.pdf"` } });
}
