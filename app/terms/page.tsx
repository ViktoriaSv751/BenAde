import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
export const metadata: Metadata = { title: "Felhasználási feltételek" };

const toc = [
  { id: "szolg", label: "Mire való az alkalmazás" }, { id: "fiok", label: "Fiók és munkaterület" }, { id: "felelosseg", label: "Határidők és felelősség" },
  { id: "adatok", label: "Az Ön adatai" }, { id: "elerhetoseg", label: "Elérhetőség és változtatások" }, { id: "dijak", label: "Díjak" }, { id: "megszunes", label: "Megszűnés" }, { id: "kapcsolat", label: "Kapcsolat" },
];

export default function Terms() {
  return (
    <LegalShell kicker="Felhasználási feltételek" title="Világos szabályok, meglepetések nélkül." updated="2026. október 15." toc={toc}
      summary={["Az Ön által rögzített adatok az Önéi – bármikor exportálhatók és törölhetők.", "Az app segédeszköz: a jogszabályi határidők betartása a felhasználó felelőssége.", "Nincs rejtett díj, nincs hirdetés, nincs adatértékesítés."]}>
      <h2 id="szolg">1. Mire való az alkalmazás</h2>
      <p>A BenAde – Tachográf Emlékeztető (a továbbiakban: <strong>alkalmazás</strong>) tachográf-szervizek és fuvarozó vállalkozások határidő-nyilvántartó eszköze. A felhasználó által rögzített adatok alapján kiszámolja a fedélzeti egység és a vezetői kártya letöltési, a kalibrációs, a kártyalejárati, az oktatási és a számlafizetési határidőket, és ezekről emlékeztetőt küld az alkalmazásban, push-üzenetben és – beállítás esetén – e-mailben.</p>
      <h2 id="fiok">2. Fiók és munkaterület</h2>
      <p>Az alkalmazás használatához fiók szükséges (e-mail-cím és jelszó, vagy Apple-, illetve Google-fiók). Egy fiók egy vagy több <strong>munkaterülethez</strong> tartozhat; a munkaterület tulajdonosa hívhat meg munkatársakat, és ő dönt a szerepkörökről (tulajdonos, munkatárs, csak olvasó).</p>
      <p>A fiók adatainak titokban tartásáért és a fiókkal végzett tevékenységért a felhasználó felel. A fiók az alkalmazáson belül, a Beállítások képernyőn bármikor véglegesen törölhető; ha a felhasználó a munkaterület egyedüli tulajdonosa, a munkaterület minden adata is törlődik.</p>
      <h2 id="felelosseg">3. Határidők és felelősség</h2>
      <p>Az alkalmazás <strong>segédeszköz</strong>. A jogszabályi határidők (így különösen a 165/2014/EU rendelet szerinti letöltési és kalibrálási kötelezettségek) betartásáért, a rögzített adatok helyességéért és az értesítések figyeléséért a felhasználó felel.</p>
      <p>Az üzemeltető nem vállal felelősséget az értesítés elmaradásából vagy késéséből, az eszköz beállításaiból (például kikapcsolt értesítések), internetkapcsolat hiányából vagy téves adatrögzítésből eredő károkért. Az alapértelmezett ciklusnapok (90, 28, 730, 1825, 30) a Beállításokban módosíthatók, ha a jogszabály változik.</p>
      <h2 id="adatok">4. Az Ön adatai</h2>
      <p>A rögzített cégek, járművek, sofőrök, határidők és számlák a felhasználó, illetve a munkaterület tulajdonát képezik. Az üzemeltető ezekhez csak az alkalmazás működtetéséhez szükséges mértékben fér hozzá, azokat nem adja tovább és nem használja fel más célra. A részleteket az <a href="/privacy">adatkezelési tájékoztató</a> tartalmazza.</p>
      <h2 id="elerhetoseg">5. Elérhetőség és változtatások</h2>
      <p>Az üzemeltető folyamatos elérhetőségre törekszik, de karbantartás vagy üzemzavar miatt a szolgáltatás átmenetileg szünetelhet. A funkciók és a jelen feltételek változhatnak; a lényeges változásokról az alkalmazásban vagy e-mailben adunk tájékoztatást.</p>
      <h2 id="dijak">6. Díjak</h2>
      <p>Az alkalmazás jelenleg díjmentesen használható. Esetleges későbbi díjköteles funkciók csak előzetes tájékoztatás és kifejezett elfogadás után válnak elérhetővé.</p>
      <h2 id="megszunes">7. Megszűnés</h2>
      <p>A felhasználó bármikor törölheti fiókját. Az üzemeltető megszüntetheti a hozzáférést a feltételek súlyos megsértése (például más felhasználók adatainak jogosulatlan elérésére irányuló kísérlet) esetén; ilyenkor a felhasználó adatait kérésre exportáljuk.</p>
      <h2 id="kapcsolat">8. Kapcsolat</h2>
      <p>Kérdés vagy észrevétel esetén az alkalmazás Beállítások → Súgó és visszajelzés menüpontján, vagy az áruházi oldalon megadott e-mail-címen érhet el minket.</p>
    </LegalShell>
  );
}
