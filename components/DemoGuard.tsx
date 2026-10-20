"use client";
import { useEffect, useState } from "react";
import { SplashScreen } from "./Splash";

const KEY = "benade.demo.ok";
/** Called from the "Belépés tesztfiókkal" button – the only way into the test account. */
export function allowDemo() { try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ } }

/** The test account opens only when it was chosen on the login screen in this browser session.
 *  A copied /demo link or a home-screen icon saved inside the test account goes to the login page. */
export default function DemoGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let pass = false; try { pass = sessionStorage.getItem(KEY) === "1"; } catch { pass = true; }
    if (pass) setOk(true); else window.location.replace("/login");
  }, []);
  return ok ? <>{children}</> : <SplashScreen />;
}
