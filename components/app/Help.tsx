"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { TopBar, useShell } from "./Shell";

const FAQ: [string, string][] = [
  ["Hogyan rögzítek egy fedélzeti egység letöltést?", "Koppintson az alsó sáv közepén lévő + gombra, válassza a „Fedélzeti egység” lehetőséget, majd a céget és a rendszámot. A letöltés ideje alapból a mai nap, a következő határidőt (+90 nap) és az emlékeztetőt az app számolja ki. Nyomva tartva a + gombot gyorsmenü nyílik."],
  ["Mi történik, ha egy tételt elvégzettnek jelölök?", "A tétel lezárul, és ha ciklusos (fedélzeti egység +90 nap, vezetői kártya +28 nap), azonnal létrejön a következő emlékeztető. Az alul megjelenő „Visszavonás” gombbal 6 másodpercig visszacsinálhatja."],
  ["Hogyan zárok le több tételt egyszerre?", "A Teendő listán tartson nyomva egy tételt – kijelölő mód indul. Jelölje ki a többit is, majd alul válassza a „Kész” vagy a „Holnapra” gombot."],
  ["Mikor kapok értesítést?", "Alapból a határidő előtt 7 nappal, 1 nappal és a napján 08:00-kor; oktatásnál előző nap 16:00-kor és a napján 06:00-kor. Minden reggel 07:00-kor összefoglalót is küldünk. Az értesítésben a „Kész” és „Holnap” gombbal az app megnyitása nélkül is intézkedhet."],
  ["Nem jön értesítés. Mit tegyek?", "Profil → Értesítések → „Push ezen az eszközön” legyen bekapcsolva, majd nyomja meg a „Teszt értesítés” gombot. iPhone-on weben csak a Főképernyőhöz adott appból működik a push; az App Store-os alkalmazásban mindig."],
  ["Hogyan küldök fizetési emlékeztetőt?", "A Számla oldalon a lejárt számlánál koppintson az „Emlékeztető küldése” gombra. A szöveg a késés hossza szerint készül el; e-mailben, SMS-ben vagy másolva küldheti, és a küldés a számla megjegyzésébe kerül."],
  ["Hogyan adok hozzá sok rendszámot egyszerre?", "Adatbank → Járművek → válassza ki a céget, majd a „Több egyszerre” módban illessze be a rendszámokat vesszővel vagy soronként elválasztva. Az app nagybetűsíti és ellenőrzi őket."],
  ["Megoszthatom az ügyféllel a flottája állapotát?", "Igen: a cég adatlapján az „Ügyfélportál” résznél hozzon létre egy linket. Az ügyfél bejelentkezés nélkül, csak olvasva látja a saját járműveinek határidőit és nyitott számláit. A link bármikor visszavonható."],
  ["Kitörlődik valami véletlenül?", "Törlés után 6 másodpercig visszavonható. Cég törlésénél az app pontosan leírja, mi törlődik, és megerősítést kér; archiválással pedig adatvesztés nélkül tüntethet el egy céget a listákból."],
  ["Működik internet nélkül?", "A legutóbb betöltött adatokat kapcsolat nélkül is látja – ilyenkor felül „Offline” jelzés látható. Módosítani kapcsolat birtokában lehet."],
];

const norm = (x: string) => x.toLocaleLowerCase("hu-HU").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function HelpView() {
  const { layout, demo } = useShell(); const base = demo ? "/demo" : "/app";
  const [q, setQ] = useState(""); const nq = norm(q.trim());
  const list = useMemo(() => !nq ? FAQ : FAQ.filter(([a, b]) => norm(a + " " + b).includes(nq)), [nq]);
  const wide = layout === "desktop";
  const faq = <div className="faq">{list.map(([qq, a], i) => <details key={qq} open={wide && i === 0 && !nq ? true : undefined}><summary>{qq}{Icon.chev(16)}</summary><p>{a}</p></details>)}{list.length === 0 && <div className="help-empty">Nincs találat erre: „{q}”. Írjon nekünk, és segítünk.</div>}</div>;
  const keys = <div className="card pad help-card"><div className="help-h">{Icon.info(18)}<b>Gyorsbillentyűk gépen</b></div><div className="kbd-help">
    <kbd>N</kbd><span>Új rögzítés</span><kbd>/</kbd><span>Keresés</span><kbd>⌘K</kbd><span>Keresőpaletta</span>
    <kbd>J</kbd><span>Következő tétel</span><kbd>K</kbd><span>Előző tétel</span><kbd>E</kbd><span>A kijelölt tétel elvégzése</span>
    <kbd>1–9</kbd><span>Választás az Új rögzítésben</span><kbd>Esc</kbd><span>Ablak bezárása</span><kbd>?</kbd><span>Ez a súgó</span>
  </div></div>;
  const links = <div className="card help-links">
    <Link href={`${base}/ertesitesek`}><span className="pi">{Icon.alarm(18)}</span><span><b>Értesítések beállítása</b><small>Push bekapcsolása, teszt értesítés</small></span>{Icon.chev(16)}</Link>
    <Link href={`${base}/import`}><span className="pi">{Icon.upload(18)}</span><span><b>Excel import</b><small>Cégek, rendszámok egy táblázatból</small></span>{Icon.chev(16)}</Link>
    <Link href={`${base}/beallitasok`}><span className="pi">{Icon.gear(18)}</span><span><b>Beállítások</b><small>Ciklusok, emlékeztetők</small></span>{Icon.chev(16)}</Link>
  </div>;
  const contact = <div className="help-contact"><b>Nem találja a választ?</b><span>Írjon nekünk, általában még aznap válaszolunk.</span><a className="btn primary block" href="mailto:hello@benade.hu?subject=BenAde%20k%C3%A9rd%C3%A9s">{Icon.mail(18)} Írjon nekünk</a></div>;
  const search = <div className="help-search">{Icon.search(18)}<input className="ctl" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés a súgóban… (pl. értesítés, számla)" aria-label="Keresés a súgóban" /></div>;
  return <>
    <TopBar title="Súgó" back={layout === "phone" ? `${base}/profil` : undefined} />
    {wide ? <div className="content profile pdesk help-desk">
      <div className="pd-main"><div className="help-hero"><h2>Miben segíthetünk?</h2><p>A leggyakoribb kérdések a BenAde használatáról.</p>{search}</div>{faq}</div>
      <div className="pd-right">{contact}{keys}{links}</div>
    </div> : <div className="content profile">
      {search}{faq}
      <div className="sec"><h2>Gyorsbillentyűk gépen</h2></div>{keys}
      <a className="btn primary block" href="mailto:hello@benade.hu?subject=BenAde%20k%C3%A9rd%C3%A9s">{Icon.mail(18)} Nem találja a választ? Írjon nekünk</a>
    </div>}
  </>;
}
