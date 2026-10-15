"use client";
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

export function HelpView() {
  const { layout, demo } = useShell(); const base = demo ? "/demo" : "/app";
  return <>
    <TopBar title="Súgó" back={layout === "phone" ? `${base}/profil` : undefined} />
    <div className="content profile">
      <div className="faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}{Icon.chev(16)}</summary><p>{a}</p></details>)}</div>
      <div className="sec"><h2>Gyorsbillentyűk gépen</h2></div>
      <div className="card pad"><div className="kbd-help">
        <kbd>N</kbd><span>Új rögzítés</span><kbd>/</kbd><span>Keresés</span><kbd>⌘K</kbd><span>Keresőpaletta</span>
        <kbd>J</kbd><span>Következő tétel</span><kbd>K</kbd><span>Előző tétel</span><kbd>E</kbd><span>A kijelölt tétel elvégzése</span>
        <kbd>Esc</kbd><span>Ablak bezárása</span><kbd>?</kbd><span>Ez a súgó</span>
      </div></div>
      <a className="btn primary block" href="mailto:hello@benade.hu?subject=BenAde%20k%C3%A9rd%C3%A9s">{Icon.mail(18)} Nem találja a választ? Írjon nekünk</a>
    </div>
  </>;
}
