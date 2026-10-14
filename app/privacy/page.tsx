import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
export const metadata: Metadata = { title: "Adatkezelési tájékoztató" };

export default function Privacy() {
  return (
    <LegalShell title="Adatkezelési tájékoztató" updated="2026. október 14.">
      <h2>1. Milyen adatokat kezelünk?</h2>
      <ul>
        <li><b>Fiókadatok:</b> e-mail-cím, jelszó (titkosítva, visszafejthetetlen formában), megadott név vagy cégnév.</li>
        <li><b>Az Ön által rögzített üzleti adatok:</b> cégnevek, adószámok, gépkocsivezetők nevei, rendszámok, oktatási kapcsolattartók neve és telefonszáma, címek, számlaadatok, határidők és megjegyzések.</li>
        <li><b>Technikai adatok:</b> a bejelentkezéshez szükséges munkamenet-azonosító; az eszközön tárolt helyi másolat az offline működéshez.</li>
      </ul>
      <h2>2. Mire használjuk?</h2>
      <p>Kizárólag az alkalmazás működtetésére: a fiók azonosítására, az adatok eszközök közötti szinkronizálására és az emlékeztetők megjelenítésére. Az adatokat nem adjuk el, nem használjuk hirdetésre és nem építünk belőlük profilt.</p>
      <h2>3. Hol tároljuk?</h2>
      <p>Az adatok a Supabase (Supabase Inc.) európai uniós adatközpontjában tárolt adatbázisban találhatók, a webalkalmazást a Vercel Inc. szolgáltatja. Mindkét szolgáltató adatfeldolgozóként jár el. Az adatokhoz csak az Ön fiókja fér hozzá; a hozzáférést adatbázis-szintű jogosultságkezelés biztosítja.</p>
      <h2>4. Értesítések</h2>
      <p>A mobilalkalmazás helyi értesítéseket ütemez az eszközön; ezek az eszközt nem hagyják el. A böngészős változat a böngésző értesítési engedélyével jelenít meg emlékeztetőt. Az engedély bármikor visszavonható.</p>
      <h2>5. Meddig őrizzük?</h2>
      <p>A fiók fennállásáig. A fiók törlésekor (Beállítások → Fiók végleges törlése) minden hozzá tartozó adat azonnal és véglegesen törlődik az adatbázisból.</p>
      <h2>6. Az Ön jogai</h2>
      <p>Az adataihoz az alkalmazásban bármikor hozzáfér, azokat módosíthatja, biztonsági mentésként letöltheti (JSON, CSV) és törölheti. Az adatkezeléssel kapcsolatos kérdéseivel az üzemeltetőhöz, panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (naih.hu) fordulhat.</p>
      <h2>7. Sütik</h2>
      <p>Kizárólag a bejelentkezés fenntartásához feltétlenül szükséges sütit használunk. Követő vagy marketing célú sütit nem alkalmazunk.</p>
    </LegalShell>
  );
}
