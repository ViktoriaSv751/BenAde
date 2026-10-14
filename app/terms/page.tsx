import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
export const metadata: Metadata = { title: "Felhasználási feltételek" };

export default function Terms() {
  return (
    <LegalShell title="Felhasználási feltételek" updated="2026. október 14.">
      <h2>1. A szolgáltatás</h2>
      <p>A BenAde – Tachográf Emlékeztető (a továbbiakban: alkalmazás) egy határidő-nyilvántartó eszköz tachográf-szervizek és fuvarozó vállalkozások számára. Az alkalmazás a felhasználó által rögzített adatok alapján számolja ki a fedélzeti egység és a vezetői kártya letöltési, az oktatási és a számlafizetési határidőket, és ezekről emlékeztetőt jelenít meg.</p>
      <h2>2. Fiók</h2>
      <p>Az alkalmazás használatához e-mail-címmel és jelszóval létrehozott fiók szükséges. A fiók adatainak titokban tartásáért és a fiókkal végzett tevékenységért a felhasználó felel. A fiók az alkalmazáson belül, a Beállítások képernyőn bármikor véglegesen törölhető; ezzel minden rögzített adat törlődik.</p>
      <h2>3. Felelősség</h2>
      <p>Az alkalmazás segédeszköz. A jogszabályi határidők (így különösen a 165/2014/EU rendelet szerinti letöltési kötelezettségek) betartásáért, a rögzített adatok helyességéért és az értesítések figyeléséért a felhasználó felel. Az üzemeltető nem vállal felelősséget az értesítés elmaradásából, késéséből, az eszköz beállításaiból vagy internetkapcsolat hiányából eredő károkért.</p>
      <h2>4. Elérhetőség és változtatás</h2>
      <p>Az üzemeltető törekszik a folyamatos elérhetőségre, de karbantartás vagy üzemzavar miatt a szolgáltatás átmenetileg szünetelhet. Az üzemeltető a funkciókat és a jelen feltételeket módosíthatja; a módosításról az alkalmazásban vagy e-mailben tájékoztat.</p>
      <h2>5. Díjak</h2>
      <p>Az alkalmazás jelenleg díjmentesen használható. Esetleges későbbi díjköteles funkciók bevezetéséről előzetes tájékoztatás történik, és azok csak kifejezett elfogadás után válnak elérhetővé.</p>
      <h2>6. Kapcsolat</h2>
      <p>Kérdés vagy észrevétel esetén írjon az alkalmazás üzemeltetőjének a letöltési oldalon megadott e-mail-címre.</p>
    </LegalShell>
  );
}
