"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { pushSupport, sendTestPush, subscribeWebPush } from "@/lib/push";
import { useData, useToast } from "@/lib/data";
import { Icon } from "@/components/ui";
import { useShell } from "./Shell";

type State = "unknown" | "unsupported" | "denied" | "off" | "on";
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function env() {
  if (typeof window === "undefined") return { ios: false, standalone: false, native: false };
  const ua = navigator.userAgent; const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  const native = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  return { ios, standalone, native };
}

/** Guides the user to working notifications on this device: install (iPhone), allow, test. */
export function PushSetup({ variant = "card" }: { variant?: "card" | "banner" }) {
  const data = useData(); const { demo, layout } = useShell(); const toast = useToast();
  const [st, setSt] = useState<State>("unknown"); const [e, setE] = useState({ ios: false, standalone: false, native: false });
  const [bip, setBip] = useState<BIP | null>(null); const [hidden, setHidden] = useState(true); const [busy, setBusy] = useState(false);
  useEffect(() => { setE(env()); pushSupport().then(setSt); try { setHidden(localStorage.getItem("benade.pushbanner") === "off"); } catch { setHidden(false); }
    const h = (ev: Event) => { ev.preventDefault(); setBip(ev as BIP); }; window.addEventListener("beforeinstallprompt", h); return () => window.removeEventListener("beforeinstallprompt", h); }, []);
  const base = demo ? "/demo" : "/app";
  const needInstall = e.ios && !e.standalone && !e.native;
  const enable = async () => { if (demo) { toast("A tesztfiókban nincs valódi értesítés – saját fiókkal kapcsolható be."); return; } setBusy(true); const r = await subscribeWebPush().catch(() => "off" as State); setSt(r); setBusy(false);
    if (r === "on" && data) { const err = await sendTestPush(data.workspace.id); toast(err ? "Bekapcsolva, de a teszt nem ment ki: " + err : "Bekapcsolva! Egy percen belül érkezik egy teszt értesítés.", err ? "err" : "ok"); }
    else if (r === "denied") toast("A telefon letiltotta az értesítéseket – engedélyezze a beállításokban.", "err"); };
  const test = async () => { if (!data || demo) return; const err = await sendTestPush(data.workspace.id); toast(err ? "Nem sikerült: " + err : "Teszt elküldve – egy percen belül megérkezik.", err ? "err" : "ok"); };

  if (variant === "banner") {
    if (st === "unknown" || st === "on" || hidden || demo) return null;
    return <div className="pushban">
      <span className="pi">{Icon.bell(20)}</span>
      <span className="tx"><b>Kapcsolja be az értesítéseket</b><span>{needInstall ? "iPhone-on előbb tegye a kezdőképernyőre – megmutatjuk, hogyan." : st === "denied" ? "A telefon most letiltja – a beállításokban engedélyezhető." : "Csak így tudunk időben szólni a határidőkről."}</span></span>
      <Link className="btn primary sm" href={`${base}/ertesitesek`}>Beállítás</Link>
      <button className="x" aria-label="Most nem" onClick={() => { setHidden(true); try { localStorage.setItem("benade.pushbanner", "off"); } catch {} }}>{Icon.x(16)}</button>
    </div>;
  }
  return <section className="pushsetup">
    <div className="hd"><span className={`dot ${st === "on" ? "on" : ""}`} /><b>{st === "on" ? "Ezen az eszközön az értesítések be vannak kapcsolva" : "Értesítések beállítása ezen az eszközön"}</b></div>
    {st === "on" ? <>
      <p>Időben szólunk a határidőkről. Ha nem biztos benne, küldjön egy próbát.</p>
      <button className="btn ghost sm" onClick={test}>{Icon.bell(15)} Teszt értesítés küldése</button>
    </> : needInstall ? <>
      <p>iPhone-on az értesítés csak a kezdőképernyőre tett appból működik. Három lépés:</p>
      <ol className="steps"><li>Koppintson alul a Safari <b>Megosztás</b> ikonjára ({Icon.upload(14)}).</li><li>Válassza a <b>Főképernyőhöz adás</b> lehetőséget, majd a <b>Hozzáadás</b> gombot.</li><li>Nyissa meg a BenAde-ot a kezdőképernyőről, és itt nyomja meg a <b>Bekapcsolás</b> gombot.</li></ol>
    </> : st === "denied" ? <>
      <p>A telefon vagy a böngésző jelenleg letiltja a BenAde értesítéseit.</p>
      <ol className="steps"><li>{e.ios ? "Beállítások → Értesítések → BenAde → Értesítések engedélyezése." : "Koppintson a címsorban a lakat ikonra → Engedélyek → Értesítések → Engedélyezés."}</li><li>Térjen vissza ide, és frissítse az oldalt.</li></ol>
    </> : st === "unsupported" ? <>
      <p>Ez a böngésző nem tud értesítést fogadni. Használja a Chrome-ot (Android, számítógép) vagy iPhone-on a kezdőképernyőre tett appot.</p>
    </> : <>
      <p>Egy koppintás: a telefon megkérdezi, engedélyezi-e az értesítéseket – válassza az <b>Engedélyezés</b> gombot. Utána küldünk egy próbát.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn primary" onClick={enable} disabled={busy}>{Icon.bell(16)} {busy ? "Bekapcsolás…" : "Bekapcsolás"}</button>{bip && layout === "phone" && <button className="btn ghost" onClick={async () => { await bip.prompt(); setBip(null); }}>{Icon.dl(16)} Telepítés a telefonra</button>}</div>
    </>}
    <p className="fine">Tipp: az értesítés minden eszközön külön kapcsolható be – telefonon és számítógépen is érdemes.</p>
  </section>;
}
