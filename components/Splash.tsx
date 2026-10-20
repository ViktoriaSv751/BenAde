"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** The BenAde mark (tachograph gauge with a truck) in currentColor: black on light, white on dark. */
export function LogoMark({ size = 96 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="180 208 664 664" fill="none" stroke="currentColor" aria-hidden focusable="false">
      <circle cx="512" cy="540" r="300" strokeWidth="44" opacity=".16" />
      <circle cx="512" cy="540" r="300" strokeWidth="44" strokeLinecap="round" strokeDasharray="1300 1885" transform="rotate(135 512 540)" />
      <g strokeWidth="16" strokeLinecap="round"><line x1="512" y1="296" x2="512" y2="252" /><line x1="268" y1="540" x2="224" y2="540" /><line x1="756" y1="540" x2="800" y2="540" /></g>
      <path d="M512 540 L690 362" strokeWidth="38" strokeLinecap="round" />
      <circle cx="512" cy="540" r="36" strokeWidth="30" />
      <g fill="currentColor" stroke="none"><rect x="400" y="684" width="142" height="76" rx="16" /><rect x="550" y="706" width="62" height="54" rx="13" /><circle cx="440" cy="776" r="17" /><circle cx="574" cy="776" r="17" /></g>
    </svg>
  );
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
const MIN_MS = 900, FADE_MS = 700, MAX_MS = 12_000;
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
