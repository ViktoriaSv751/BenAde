import { NextResponse } from "next/server";
import webpush from "web-push";
import { adminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic"; export const maxDuration = 60;

/** Cron target (pg_cron → net.http_post every minute). Sends due push/email notifications. */
export async function POST(req: Request) {
  const secret = process.env.NOTIFY_SECRET; const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  let sb; try { sb = adminClient(); } catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 503 }); }
  const now = new Date().toISOString();
  const { data: due, error } = await sb.from("notifications").select("*").in("channel", ["push", "email"]).eq("status", "scheduled").lte("scheduled_at", now).order("scheduled_at").limit(100);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ ok: true, sent: 0 });
  const wsIds = [...new Set(due.map(n => n.workspace_id))];
  const { data: members } = await sb.from("memberships").select("workspace_id,user_id").in("workspace_id", wsIds);
  const userIds = [...new Set((members || []).map(m => m.user_id))];
  const [{ data: devices }, { data: profiles }, { data: ws }] = await Promise.all([
    sb.from("devices").select("*").in("user_id", userIds), sb.from("profiles").select("user_id,notif_prefs").in("user_id", userIds), sb.from("workspaces").select("id,defaults").in("id", wsIds)]);
  const emails = new Map<string, string>(); for (const uid of userIds) { const { data } = await sb.auth.admin.getUserById(uid); if (data.user?.email) emails.set(uid, data.user.email); }
  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, vapidPriv = process.env.VAPID_PRIVATE_KEY;
  if (vapidPub && vapidPriv) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@benade.hu", vapidPub, vapidPriv);
  const resend = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM || "BenAde <onboarding@resend.dev>";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://benade.vercel.app";
  let sent = 0, failed = 0;
  for (const n of due) {
    const targets = (members || []).filter(m => m.workspace_id === n.workspace_id && (!n.user_id || m.user_id === n.user_id)).map(m => m.user_id);
    const defaults = (ws || []).find(w => w.id === n.workspace_id)?.defaults as { quietFrom?: string; quietTo?: string } | undefined;
    if (n.channel === "push" && inQuiet(defaults?.quietFrom, defaults?.quietTo)) { // defer to end of quiet hours
      await sb.from("notifications").update({ scheduled_at: nextQuietEnd(defaults?.quietTo || "06:00") }).eq("id", n.id); continue;
    }
    const url = n.task_id ? `${site}/app?t=${n.task_id}` : `${site}/app`;
    let ok = 0, err = "";
    for (const uid of targets) {
      const prefs = ((profiles || []).find(p => p.user_id === uid)?.notif_prefs || {}) as { push?: boolean; email?: boolean };
      if (n.channel === "push") {
        if (prefs.push === false) continue;
        for (const d of (devices || []).filter(x => x.user_id === uid)) {
          try {
            if (d.platform === "web" && vapidPub && vapidPriv) { await webpush.sendNotification(JSON.parse(d.token), JSON.stringify({ title: n.title, body: n.body, url, tag: n.task_id || n.id })); ok++; }
            else if (d.platform !== "web" && process.env.FCM_SERVER_KEY) { const r = await fetch("https://fcm.googleapis.com/fcm/send", { method: "POST", headers: { authorization: `key=${process.env.FCM_SERVER_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ to: d.token, notification: { title: n.title, body: n.body }, data: { url } }) }); if (r.ok) ok++; }
          } catch (e) { const msg = String((e as { statusCode?: number }).statusCode || e); if (/410|404/.test(msg)) await sb.from("devices").delete().eq("id", d.id); err = msg; }
        }
      } else if (n.channel === "email" && resend) {
        if (prefs.email === false) continue; const to = emails.get(uid); if (!to) continue;
        try { const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${resend}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [to], subject: n.title, html: `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="margin:0 0 8px">${esc(n.title)}</h2><p style="font-size:16px">${esc(n.body)}</p><p style="margin:24px 0"><a href="${url}" style="background:#2F6BFF;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Megnyitás a BenAde-ban</a></p><p style="color:#6b7280;font-size:12px">Beállítások → Értesítések alatt kapcsolhatja ki az e-maileket.</p></div>` }) }); if (r.ok) ok++; else err = `resend ${r.status}`; } catch (e) { err = String(e); }
      }
    }
    const configured = n.channel === "push" ? !!(vapidPub && vapidPriv) || !!process.env.FCM_SERVER_KEY : !!resend;
    await sb.from("notifications").update(ok || !configured ? { status: "sent", sent_at: now, error: configured ? null : "channel not configured" } : { status: "failed", error: err || "no recipient" }).eq("id", n.id);
    if (ok) sent++; else if (configured) failed++;
  }
  return NextResponse.json({ ok: true, processed: due.length, sent, failed });
}
export async function GET() { return NextResponse.json({ ok: true, hint: "POST with Authorization: Bearer NOTIFY_SECRET" }); }

function inQuiet(from?: string, to?: string) { if (!from || !to) return false; const bud = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Budapest" })); const cur = bud.getHours() * 60 + bud.getMinutes(); const [fh, fm] = from.split(":").map(Number), [th, tm] = to.split(":").map(Number); const f = fh * 60 + fm, t = th * 60 + tm; return f > t ? (cur >= f || cur < t) : (cur >= f && cur < t); }
function nextQuietEnd(to: string) { const [h, m] = to.split(":").map(Number); const bud = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Budapest" })); const target = new Date(bud); target.setHours(h, m, 0, 0); if (target <= bud) target.setDate(target.getDate() + 1); const offset = new Date().getTime() - bud.getTime(); return new Date(target.getTime() + offset).toISOString(); }
const esc = (s: string) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
