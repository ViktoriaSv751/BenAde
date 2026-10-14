"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-errors";

export default function BenAdeApp({ userId, email, fullName }: { userId: string; email: string; fullName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    document.documentElement.classList.add("app-page");
    const supabase = createClient();
    let app: { destroy(): void } | null = null;
    let cancelled = false;

    import("@/src/engine/app.js").then(({ mountApp }) => {
      if (cancelled) return;
      app = mountApp(root, {
        supabase,
        user: { id: userId, email, user_metadata: { full_name: fullName } },
        signOut: async () => { await supabase.auth.signOut(); router.replace("/login"); router.refresh(); },
        changePassword: async (password: string) => { const { error } = await supabase.auth.updateUser({ password }); return error ? authMessage(error.message) : null; },
        deleteAccount: async () => {
          const { error } = await supabase.rpc("delete_my_account");
          if (error) return authMessage(error.message);
          try { localStorage.removeItem("benade." + userId); localStorage.removeItem("benade." + userId + ".ui"); } catch {}
          await supabase.auth.signOut();
          router.replace("/?deleted=1"); router.refresh();
          return null;
        },
      });
    });

    // keep the server session cookie fresh while the app is open
    const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") { router.replace("/login"); } });

    return () => { cancelled = true; app?.destroy(); sub.subscription.unsubscribe(); document.documentElement.classList.remove("app-page"); };
  }, [userId, email, fullName, router]);

  return (
    <div id="benade" role="application" ref={ref}>
      <div id="screen" style={{ display: "contents" }} />
      <nav className="tabs" id="tabs" aria-label="Fő menü" />
      <div id="overlay" />
    </div>
  );
}
