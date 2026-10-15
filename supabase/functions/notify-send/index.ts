// BenAde – értesítésküldő. pg_cron hívja percenként. Push (web, VAPID) + e-mail (Resend, ha van kulcs).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const SITE = Deno.env.get("SITE_URL") || "https://benade.vercel.app";
const esc = (s: string) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

function budapest() { return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Budapest" })); }
function inQuiet(from?: string, to?: string) { if (!from || !to) return false; const b = budapest(); const cur = b.getHours() * 60 + b.getMinutes(); const [fh, fm] = from.split(":").map(Number), [th, tm] = to.split(":").map(Number); const f = fh * 60 + fm, t = th * 60 + tm; return f > t ? (cur >= f || cur < t) : (cur >= f && cur < t); }
function nextQuietEnd(to: string) { const [h, m] = to.split(":").map(Number); const b = budapest(); const target = new Date(b); target.setHours(h, m, 0, 0); if (target <= b) target.setDate(target.getDate() + 1); const offset = Date.now() - b.getTime(); return new Date(target.getTime() + offset).toISOString(); }

Deno.serve(async (req: Request) => {
  if (req.method === "GET") return Response.json({ ok: true, hint: "POST with Authorization: Bearer NOTIFY_SECRET" });
  const { data: cfg } = await sb.rpc("get_app_config");
  const conf = (cfg || {}) as Record<string, string>;
  const auth = req.headers.get("authorization") || "";
  if (!conf.notify_secret || auth !== `Bearer ${conf.notify_secret}`) return Response.json({ ok: false }, { status: 401 });

  const now = new Date().toISOString();
  const { data: due, error } = await sb.from("notifications").select("*").in("channel", ["push", "email"]).eq("status", "scheduled").lte("scheduled_at", now).order("scheduled_at").limit(100);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  if (!due?.length) return Response.json({ ok: true, sent: 0 });

  const wsIds = [...new Set(due.map(n => n.workspace_id))];
  const { data: members } = await sb.from("memberships").select("workspace_id,user_id").in("workspace_id", wsIds);
  const userIds = [...new Set((members || []).map(m => m.user_id))];
  const [{ data: devices }, { data: profiles }, { data: ws }] = await Promise.all([
    sb.from("devices").select("*").in("user_id", userIds), sb.from("profiles").select("user_id,notif_prefs").in("user_id", userIds), sb.from("workspaces").select("id,defaults").in("id", wsIds)]);
  const emails = new Map<string, string>();
  for (const uid of userIds) { const { data } = await sb.auth.admin.getUserById(uid); if (data.user?.email) emails.set(uid, data.user.email); }

  const vapidOk = !!(conf.vapid_public && conf.vapid_private && !/PLACEHOLDER/.test(conf.vapid_private));
  if (vapidOk) webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:hello@benade.hu", conf.vapid_public, conf.vapid_private);
  const resend = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM") || "BenAde <onboarding@resend.dev>";
  const fcm = Deno.env.get("FCM_SERVER_KEY");
  let sent = 0, failed = 0;

  for (const n of due) {
    const targets = (members || []).filter(m => m.workspace_id === n.workspace_id && (!n.user_id || m.user_id === n.user_id)).map(m => m.user_id);
    const defaults = (ws || []).find(w => w.id === n.workspace_id)?.defaults as { quietFrom?: string; quietTo?: string } | undefined;
    if (n.channel === "push" && inQuiet(defaults?.quietFrom, defaults?.quietTo)) { await sb.from("notifications").update({ scheduled_at: nextQuietEnd(defaults?.quietTo || "06:00") }).eq("id", n.id); continue; }
    const url = n.task_id ? `${SITE}/app?t=${n.task_id}` : `${SITE}/app`;
    let ok = 0, err = "";
    for (const uid of targets) {
      const prefs = ((profiles || []).find(p => p.user_id === uid)?.notif_prefs || {}) as { push?: boolean; email?: boolean };
      if (n.channel === "push") {
        if (prefs.push === false) continue;
        for (const d of (devices || []).filter(x => x.user_id === uid)) {
          try {
            if (d.platform === "web" && vapidOk) { await webpush.sendNotification(JSON.parse(d.token), JSON.stringify({ title: n.title, body: n.body, url, tag: n.task_id || n.id })); ok++; }
            else if (d.platform !== "web" && fcm) { const r = await fetch("https://fcm.googleapis.com/fcm/send", { method: "POST", headers: { authorization: `key=${fcm}`, "content-type": "application/json" }, body: JSON.stringify({ to: d.token, notification: { title: n.title, body: n.body }, data: { url } }) }); if (r.ok) ok++; else err = `fcm ${r.status}`; }
          } catch (e) { const x = e as { statusCode?: number; body?: string; message?: string }; const msg = `${x.statusCode || ""} ${String(x.body || x.message || e).slice(0, 300)}`.trim(); if (/^(410|404)|VapidPkHashMismatch|BadDeviceToken/.test(msg)) await sb.from("devices").delete().eq("id", d.id); err = msg; }
        }
      } else if (n.channel === "email" && resend) {
        if (prefs.email === false) continue; const to = emails.get(uid); if (!to) continue;
        try {
          const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="margin:0 0 8px">${esc(n.title)}</h2><p style="font-size:16px">${esc(n.body)}</p><p style="margin:24px 0"><a href="${url}" style="background:#1F5BFF;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Megnyitás a BenAde-ban</a></p><p style="color:#6b7280;font-size:12px">Beállítások → Értesítések alatt kapcsolhatja ki az e-maileket.</p></div>`;
          const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${resend}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [to], subject: n.title, html }) });
          if (r.ok) ok++; else err = `resend ${r.status}`;
        } catch (e) { err = String(e); }
      }
    }
    const configured = n.channel === "push" ? (vapidOk || !!fcm) : !!resend;
    await sb.from("notifications").update(ok || !configured ? { status: "sent", sent_at: now, error: configured ? null : "channel not configured" } : { status: "failed", error: err || "no recipient" }).eq("id", n.id);
    if (ok) sent++; else if (configured) failed++;
  }
  return Response.json({ ok: true, processed: due.length, sent, failed });
});
