"use client";
import { useEffect, useState } from "react";

const MINE = process.env.NEXT_PUBLIC_BUILD || "";

/** Keeps every open copy of the app on the latest release: reloads silently when the user comes back
 *  to the app, and shows a small "Frissítés" bar if a new version ships while it is on screen. */
export default function VersionWatch() {
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (!MINE) return;
    let stop = false; const opened = Date.now();
    const check = async (reloadIfHidden: boolean) => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" }); if (!r.ok) return;
        const { v } = await r.json() as { v?: string };
        if (stop || !v || v === MINE) return;
        let last = 0; try { last = Number(sessionStorage.getItem("benade.vreload") || 0); } catch { /* ignore */ }
        const canReload = Date.now() - last > 120_000; // never loop
        if (canReload && (reloadIfHidden || Date.now() - opened < 4000)) { try { sessionStorage.setItem("benade.vreload", String(Date.now())); } catch { /* ignore */ } location.reload(); return; }
        setFresh(true);
      } catch { /* offline */ }
    };
    check(false);
    const onVis = () => { if (document.visibilityState === "visible") check(true); };
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(() => check(false), 5 * 60_000);
    return () => { stop = true; document.removeEventListener("visibilitychange", onVis); clearInterval(t); };
  }, []);
  if (!fresh) return null;
  return <div className="vbar" role="status"><span>Elérhető a BenAde új verziója.</span><button type="button" onClick={() => location.reload()}>Frissítés</button></div>;
}
