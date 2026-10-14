import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function POST(req: Request) {
  const sb = await createClient(); const { data: { user } } = await sb.auth.getUser(); if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { email, link, workspace } = await req.json(); const key = process.env.RESEND_API_KEY; const from = process.env.EMAIL_FROM || "BenAde <onboarding@resend.dev>";
  if (!key || !email || !link) return NextResponse.json({ ok: false, sent: false });
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="margin:0 0 8px">Meghívó – ${esc(workspace || "BenAde")}</h2><p>${esc(user.email || "Egy kollégája")} meghívta Önt a <b>${esc(workspace || "BenAde")}</b> munkaterületre a BenAde tachográf-emlékeztetőben.</p><p style="margin:24px 0"><a href="${link}" style="background:#2F6BFF;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Meghívó elfogadása</a></p><p style="color:#6b7280;font-size:13px">Ha a gomb nem működik: ${link}</p></div>`;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [email], subject: `Meghívó: ${workspace || "BenAde"}`, html }) });
  return NextResponse.json({ ok: r.ok, sent: r.ok });
}
const esc = (s: string) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
