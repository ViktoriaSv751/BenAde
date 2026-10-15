"use client";
import { createClient } from "@/lib/supabase/client";

type PushState = "unsupported" | "denied" | "off" | "on";
const isNative = () => typeof window !== "undefined" && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

export async function pushSupport(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (isNative()) { try { const { PushNotifications } = await import("@capacitor/push-notifications"); const p = await PushNotifications.checkPermissions(); return p.receive === "granted" ? "on" : p.receive === "denied" ? "denied" : "off"; } catch { return "unsupported"; } }
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription(); return sub ? "on" : "off"; } catch { return "off"; }
}

async function saveDevice(platform: string, token: string) {
  const sb = createClient(); const { data: { user } } = await sb.auth.getUser(); if (!user) return;
  await sb.from("devices").upsert({ user_id: user.id, platform, token, last_seen: new Date().toISOString() }, { onConflict: "user_id,token" });
}

/** The one and only VAPID public key: always the server's (the sender signs with the matching private key). */
async function serverKey(): Promise<string> {
  const { data } = await createClient().rpc("vapid_public_key"); const k = (data as string) || "";
  return !k || /PLACEHOLDER/.test(k) ? "" : k;
}
const sameKey = (sub: PushSubscription, key: string) => {
  const a = sub.options?.applicationServerKey; if (!a) return false;
  const x = new Uint8Array(a as ArrayBuffer), y = urlB64(key); return x.length === y.length && x.every((v, i) => v === y[i]);
};
async function webSubscribe(key: string): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready;
  const old = await reg.pushManager.getSubscription();
  if (old && sameKey(old, key)) return old;
  if (old) { try { await old.unsubscribe(); } catch { /* ignore */ } }
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(key) });
}

export async function subscribeWebPush(): Promise<PushState> {
  if (isNative()) return registerNativePush();
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  const perm = await Notification.requestPermission(); if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const key = await serverKey(); if (!key) return "off";
  const sub = await webSubscribe(key);
  await saveDevice("web", JSON.stringify(sub.toJSON()));
  return "on";
}

/** Runs on every app start: if notifications are allowed, make sure this device's subscription uses the
 *  current server key and is saved for the signed-in user (fixes stale / mismatched subscriptions silently). */
export async function syncWebPush(): Promise<void> {
  try {
    if (isNative() || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const key = await serverKey(); if (!key) return;
    const sub = await webSubscribe(key);
    await saveDevice("web", JSON.stringify(sub.toJSON()));
  } catch { /* best effort */ }
}

export async function registerNativePush(): Promise<PushState> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const p = await PushNotifications.requestPermissions(); if (p.receive !== "granted") return "denied";
    return await new Promise<PushState>(resolve => {
      PushNotifications.addListener("registration", async t => { const platform = /iPhone|iPad/i.test(navigator.userAgent) ? "ios" : "android"; await saveDevice(platform, t.value); resolve("on"); });
      PushNotifications.addListener("registrationError", () => resolve("off"));
      PushNotifications.register();
    });
  } catch { return "unsupported"; }
}

function urlB64(s: string) { const pad = "=".repeat((4 - (s.length % 4)) % 4); const b = (s + pad).replace(/-/g, "+").replace(/_/g, "/"); const raw = atob(b); return Uint8Array.from([...raw].map(c => c.charCodeAt(0))); }

/** Sends a test push to the signed-in user's devices (delivered by the minute-cron sender). */
export async function sendTestPush(workspaceId: string): Promise<string | null> {
  const sb = createClient(); const { data: { user } } = await sb.auth.getUser(); if (!user) return "Nincs bejelentkezve.";
  const { error } = await sb.from("notifications").insert({ workspace_id: workspaceId, user_id: user.id, channel: "push", scheduled_at: new Date().toISOString(), status: "scheduled", title: "BenAde teszt", body: "Ha ezt látja, az értesítések működnek ezen az eszközön." });
  return error ? error.message : null;
}
