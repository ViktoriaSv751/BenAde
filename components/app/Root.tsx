"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataProvider, ThemeProvider, ToastProvider, clearCachedSnapshot } from "@/lib/data";
import { DemoRepo, SupabaseRepo, type Repo } from "@/lib/repo";
import { createClient } from "@/lib/supabase/client";
import { Shell } from "./Shell";
import { SplashScreen, showSplash } from "@/components/Splash";

export function AppRoot({ children, userId, email, name, wsId }: { children: React.ReactNode; userId: string; email: string; name: string; wsId: string }) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const repo = useMemo<Repo>(() => new SupabaseRepo(sb, wsId, userId), [sb, wsId, userId]);
  const signOut = useCallback(async () => { showSplash("/login"); clearCachedSnapshot(); await sb.auth.signOut(); router.replace("/login"); router.refresh(); }, [sb, router]);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); import("@/lib/push").then(m => m.syncWebPush()).catch(() => {}); }, [userId]);
  useEffect(() => { // native: status bar + register push when already permitted
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (!w.Capacitor?.isNativePlatform?.()) return;
    import("@/lib/push").then(m => m.pushSupport().then(s => { if (s === "on") m.registerNativePush(); })).catch(() => {});
  }, []);
  return <ThemeProvider><ToastProvider><DataProvider repo={repo}><Shell email={email} name={name} demo={false} signOut={signOut}>{children}</Shell></DataProvider></ToastProvider></ThemeProvider>;
}

export function DemoRoot({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [repo, setRepo] = useState<Repo | null>(null);
  useEffect(() => { setRepo(new DemoRepo()); }, []);
  const signOut = useCallback(() => { showSplash("/login"); router.push("/login"); }, [router]);
  if (!repo) return <SplashScreen />;
  return <ThemeProvider><ToastProvider><DataProvider repo={repo}><Shell email="teszt@benade.hu" name="Tesztfiók" demo signOut={signOut}>{children}</Shell></DataProvider></ToastProvider></ThemeProvider>;
}
