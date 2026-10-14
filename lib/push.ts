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

export async function subscribeWebPush(): Promise<PushState> {
  if (isNative()) return registerNativePush();
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  const perm = await Notification.requestPermission(); if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; if (!key) return "off";
  const reg = await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(key) });
  await saveDevice("web", JSON.stringify(sub.toJSON()));
  return "on";
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
