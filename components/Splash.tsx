"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** The BenAde truck, drawn in the theme's text colour through a mask: black on white, white on black. */
export function LogoMark() {
  return <span className="logo-truck" role="img" aria-label="BenAde" />;
}

/** Full-screen logo on the theme's plain background, shown between login, app and logout. */
export function SplashScreen({ leaving = false }: { leaving?: boolean }) {
  return (
    <div className={`splash ${leaving ? "leaving" : ""}`} role="status" aria-label="Betöltés">
      <div className="splash-in"><LogoMark /></div>
    </div>
  );
}

const EV = "benade:splash";
const MIN_MS = 2000, FADE_MS = 900, MAX_MS = 12_000;
type Cmd = { on: boolean; until?: string };

/** Show the splash now; it stays until hideSplash() (the app is ready) or, with `until`, until that page has opened. */
export function showSplash(until?: string) { window.dispatchEvent(new CustomEvent<Cmd>(EV, { detail: { on: true, until } })); }
export function hideSplash() { window.dispatchEvent(new CustomEvent<Cmd>(EV, { detail: { on: false } })); }

/** Lives in the root layout, so it survives the route change it covers. */
export function SplashHost() {
  const [state, setState] = useState<"off" | "on" | "leaving">("off");
  const since = useRef(0); const until = useRef<string | undefined>(undefined); const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const path = usePathname();
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const close = () => {
    clear(); const wait = Math.max(0, MIN_MS - (Date.now() - since.current));
    timers.current.push(setTimeout(() => { setState(s => s === "off" ? s : "leaving"); timers.current.push(setTimeout(() => setState("off"), FADE_MS)); }, wait));
  };
  const closeRef = useRef(close); closeRef.current = close;
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent<Cmd>).detail;
      if (d.on) { clear(); since.current = Date.now(); until.current = d.until; setState("on"); timers.current.push(setTimeout(() => closeRef.current(), MAX_MS)); }
      else closeRef.current(); };
    window.addEventListener(EV, on); return () => { window.removeEventListener(EV, on); clear(); };
  }, []);
  // logout: the login page has rendered underneath – let it appear out of the splash
  useEffect(() => { if (state === "on" && until.current && path === until.current) { until.current = undefined; requestAnimationFrame(() => closeRef.current()); } }, [path, state]);
  if (state === "off") return null;
  return <SplashScreen leaving={state === "leaving"} />;
}
