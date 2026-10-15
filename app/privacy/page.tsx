import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
export const metadata: Metadata = { title: "Adatkezelési tájékoztató" };

const toc = [
  { id: "mit", label: "Milyen adatokat kezelünk" }, { id: "miert", label: "Mire használjuk" }, { id: "hol", label: "Hol és meddig tároljuk" }, { id: "ertesites", label: "Értesítések és eszközök" },
  { id: "kik", label: "Kik férnek hozzá" }, { id: "jogok", label: "Az Ön jogai" }, { id: "sutik", label: "Sütik" }, { id: "gyerek", label: "Életkor" },
];

export default function Privacy() {
  return (
    <LegalShell kicker="Adatkezelési tájékoztató" title="Az Ön adatai az Önéi." updated="2026. október 15." toc={toc}
      summary={["Nem adjuk el és nem használjuk hirdetésre az adatait.", "Minden adat az EU-ban, titkosított kapcsolaton keresztül tárolódik.", "Export és végleges törlés egy koppintással, az alkalmazásból."]}>
      <h2 id="mit">1. Milyen adatokat kezelünk</h2>
      <h3>Fiókadatok</h3>
      <p>E-mail-cím, jelszó (titkosítva, visszafejthetetlen formában), megadott név. Apple- vagy Google-bejelentkezésnél a szolgáltatótól kapott azonosító és e-mail-cím.</p>
      <h3>Az Ön által rögzített üzleti adatok</h3>
      <p>Ügyfél cégek neve és adószáma, kapcsolattartók neve és telefonszáma, rendszámok, gépkocsivezetők neve és kártyaszáma, határidők, oktatások helyszíne, számlaadatok, megjegyzések és csatolmányok.</p>
      <h3>Technikai adatok</h3>
      <p>A bejelentkezéshez szükséges munkamenet-azonosító; push-értesítéshez az eszköz értesítési címe (token); a naplóban, hogy ki és mikor módosított egy tételt. Az eszközön helyi másolat készül az offline működéshez.</p>
      <h2 id="miert">2. Mire használjuk</h2>
      <p>Kizárólag az alkalmazás működtetésére: a fiók azonosítására, az adatok eszközök közötti szinkronizálására, az emlékeztetők kiszámítására és elküldésére, a csapattagok közötti megosztásra. <strong>Nem adjuk el, nem használjuk hirdetésre, nem építünk belőle profilt.</strong></p>
      <h2 id="hol">3. Hol és meddig tároljuk</h2>
      <p>Az adatok a Supabase Inc. által üzemeltetett, az Európai Unióban található adatközpontban tárolódnak; a webalkalmazást a Vercel Inc. szolgáltatja. Mindkét szolgáltató adatfeldolgozóként jár el. Az átvitel minden esetben titkosított (HTTPS). Az adatokhoz csak a munkaterület tagjai férnek hozzá; ezt adatbázis-szintű jogosultságkezelés biztosítja.</p>
      <p>Az adatokat a fiók, illetve a munkaterület fennállásáig őrizzük. Archivált tételek 30 nap után véglegesen törlődnek. A fiók törlésekor minden hozzá tartozó adat azonnal és véglegesen törlődik.</p>
      <h2 id="ertesites">4. Értesítések és eszközök</h2>
      <p>A push-értesítésekhez az eszköz által kiadott értesítési címet tároljuk, és csak az emlékeztetők kézbesítésére használjuk. Az e-mail-értesítéseket a Resend Inc. szolgáltatásán keresztül küldjük. Minden csatorna külön kikapcsolható az Értesítések képernyőn; az engedély az eszköz beállításaiban is visszavonható.</p>
      <h2 id="kik">5. Kik férnek hozzá</h2>
      <p>A munkaterület tagjai a szerepkörüknek megfelelő mértékben; az üzemeltető kizárólag hibaelhárítás céljából, a feltétlenül szükséges mértékben. Harmadik félnek adatot nem adunk át, kivéve ha jogszabály kötelez rá.</p>
      <h2 id="jogok">6. Az Ön jogai</h2>
      <p>Az adataihoz az alkalmazásban bármikor hozzáfér, azokat módosíthatja, biztonsági mentésként letöltheti (JSON, CSV, PDF) és törölheti. Kérheti továbbá a kezelés korlátozását és tiltakozhat ellene. Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (naih.hu) fordulhat.</p>
      <h2 id="sutik">7. Sütik</h2>
      <p>Kizárólag a bejelentkezés fenntartásához feltétlenül szükséges sütit használunk. Követő, elemző vagy marketing célú sütit nem alkalmazunk.</p>
      <h2 id="gyerek">8. Életkor</h2>
      <p>Az alkalmazás üzleti használatra készült; 16 év alatti személy nem hozhat létre fiókot.</p>
    </LegalShell>
  );
}
