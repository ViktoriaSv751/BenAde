import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Brand";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "BenAde – Tachográf Emlékeztető", alternates: { canonical: "/" } };

const PILLARS = [
  { cls: "t-vu", icon: Icon.truck(24), h: "Fedélzeti egység", p: "Minden rendszámhoz a letöltés napja és a következő határidő. Lezárás egy koppintás – a +90 nap magától jön.", rule: "90", unit: "nap" },
  { cls: "t-card", icon: Icon.card(24), h: "Vezetői kártya", p: "Sofőrönként külön ciklus. A rendszer számol, Ön csak pipál.", rule: "28", unit: "nap" },
  { cls: "t-training", icon: Icon.grad(24), h: "Oktatás", p: "Helyszín, kapcsolattartó, létszám. Előző nap 16:00 és aznap 06:00 – kétszer szólunk.", rule: "06:00", unit: "aznap" },
  { cls: "t-invoice", icon: Icon.invoice(24), h: "Számlák", p: "Kiállítás + 30 nap. Lejárt tételek pirosan, kintlévőség egy számban, fizetés egy gombbal.", rule: "30", unit: "nap" },
];

export default function Landing() {
  return (
    <div className="stage">
      <div className="bgimg" style={{ backgroundImage: "url(/img/road.jpg)" }} aria-hidden />
      <div className="bgveil" aria-hidden />
      <header className="mtop">
        <Wordmark />
        <nav>
          <Link className="btn ghost sm" href="/demo">Bemutató</Link>
          <Link className="btn ghost sm" href="/login">Belépés</Link>
          <Link className="btn primary sm" href="/register">Fiók létrehozása</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <span className="pill"><i />Tachográf-szervizeknek · Magyarország</span>
          <h1>Egyetlen határidő <em>sem csúszik el</em> többé.</h1>
          <p className="lead">A BenAde a szerviz fejében tartott Excel helyett dolgozik: fedélzeti egység és kártyaletöltések, oktatások, számlák – automatikus ciklusokkal, időben érkező emlékeztetőkkel, telefonon és gépen egyformán.</p>
          <div className="cta">
            <Link className="btn primary lg" href="/register">Kezdjük el {Icon.chev(18)}</Link>
            <Link className="btn ghost lg" href="/demo">Kipróbálom példaadatokkal</Link>
          </div>
          <div className="proof"><div><b>3</b>koppintás egy rögzítés</div><div><b>7 · 1 · 0</b>nap előre szólunk</div><div><b>iOS · Android · web</b>egy fiók, minden eszköz</div></div>
        </div>
        <figure className="shot"><img src="/shots/desktop-light.jpg" alt="A BenAde Ma képernyője asztali nézetben" width={1440} height={900} /></figure>
      </section>

      <div className="marquee" aria-hidden><div className="track">{Array.from({ length: 2 }).flatMap((_, i) => ["Fedélzeti egység letöltés", "Vezetői kártya letöltés", "Kalibráció", "Kártya lejárat", "Oktatás", "Számla fizetési határidő"].map(s => <span key={i + s}><i>●</i> {s}</span>))}</div></div>

      <section className="msec" id="miert">
        <div className="kicker">Miért BenAde</div>
        <h2>Négy határidőtípus. <b>Nulla fejben tartott dátum.</b></h2>
        <p className="sub">Minden tétel egy céghez, egy rendszámhoz vagy egy sofőrhöz tartozik. A ciklus a lezárás pillanatában újraindul, az emlékeztető magától ütemeződik.</p>
        <div className="bento">
          {PILLARS.map(p => <article key={p.h} className={`tile ${p.cls} col-3`}><span className="ico">{p.icon}</span><h3>{p.h}</h3><p>{p.p}</p><div className="rule">{p.rule}<small>{p.unit}</small></div></article>)}
          <article className="tile img col-6"><img src="/shots/phone-dark.jpg" alt="A BenAde telefonon, sötét módban" width={390} height={844} style={{ objectPosition: "top" }} /><div className="cap"><h3>Telefonon is teljes értékű</h3><p>Hüvelykujjal elérhető + gomb, lapozható hét, húzás a lezáráshoz – és sötét mód a reggeli indulásnál.</p></div></article>
          <article className="tile col-6"><span className="ico" style={{ background: "rgba(255,178,36,.14)", color: "#FFB224" }}>{Icon.bell(24)}</span><h3>Időben, több csatornán</h3><p>Push az alkalmazásból, e-mail a gépre, naptár-előfizetés a Google/Apple naptárba. Csendes időszak éjjel, reggeli összefoglaló 07:00-kor.</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>{["Push", "E-mail", "ICS naptár", "Napi összefoglaló", "Heti előretekintés"].map(s => <span key={s} className="badge plain" style={{ background: "rgba(255,255,255,.08)", color: "#D6DEEC" }}>{s}</span>)}</div></article>
        </div>
      </section>

      <section className="msec" id="hogyan">
        <div className="kicker">Hogyan működik</div>
        <h2>Reggel megnézi, <b>mi a következő.</b> Ennyi.</h2>
        <div className="bento">
          {[["01", "Rögzít", "Új letöltés: cég → rendszám → dátum. A határidőt és az emlékeztetőket a rendszer adja, Ön csak ellenőrzi."], ["02", "Értesül", "7, 1 és 0 nappal előre, reggel 08:00-kor. Oktatás előtt kétszer. Lejárt tétel pirosan, legfelül."], ["03", "Lezár", "Egy pipa. Az új ciklus azonnal létrejön, a cég naplójában ott marad, hogy ki és mikor végezte el."]].map(([n, h, p]) => <article key={n} className="tile col-4"><div className="rule" style={{ marginTop: 0, color: "#86B0FF" }}>{n}</div><h3>{h}</h3><p>{p}</p></article>)}
        </div>
        <div className="devices">
          <figure><img src="/shots/tablet-light.jpg" alt="BenAde tableten: lista és részletek egymás mellett" width={1024} height={768} /><figcaption>Tablet · lista + részlet egy képernyőn</figcaption></figure>
          <figure><img src="/shots/desktop-dark.jpg" alt="BenAde asztali gépen sötét módban, naptár nézet" width={1440} height={900} /><figcaption>Asztali · naptár, húzással átütemezés</figcaption></figure>
        </div>
      </section>

      <section className="msec" id="csapat">
        <div className="kicker">Ügyfelek, csapat, adatok</div>
        <h2>A cég a középpont – <b>nem a táblázat sora.</b></h2>
        <div className="bento">
          <article className="tile col-4"><span className="ico" style={{ background: "rgba(134,176,255,.14)", color: "#86B0FF" }}>{Icon.users(24)}</span><h3>Cégprofil</h3><p>Járművek, sofőrök, kapcsolattartók, számlák és napló egy helyen. Hívás egy koppintással, flotta-naptár PDF-ben az ügyfélnek.</p></article>
          <article className="tile col-4"><span className="ico" style={{ background: "rgba(134,176,255,.14)", color: "#86B0FF" }}>{Icon.team(24)}</span><h3>Közös munkaterület</h3><p>Kolléga meghívása e-mailben; tulajdonos, munkatárs és megtekintő szerepek. Mindenki ugyanazt látja, azonnal.</p></article>
          <article className="tile col-4"><span className="ico" style={{ background: "rgba(134,176,255,.14)", color: "#86B0FF" }}>{Icon.upload(24)}</span><h3>Excel import és export</h3><p>A meglévő táblázatot egy perc alatt behozza, oszloppárosítással. Mentés JSON-ban, teendők CSV-ben – az adat az Öné.</p></article>
        </div>
      </section>

      <section className="cta-band">
        <div className="box">
          <div><h2>Holnap reggel már ez ébreszt.</h2><p>Fiók, első cég, első rendszám – három perc. Importálja a táblázatát, és a BenAde átveszi a figyelést.</p></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className="btn lg" href="/register" style={{ background: "#fff", color: "#0B1A44" }}>Fiók létrehozása</Link><Link className="btn ghost lg" href="/demo" style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}>Bemutató</Link></div>
        </div>
      </section>

      <footer className="mfoot"><div className="inner"><span>© {new Date().getFullYear()} BenAde · Tachográf emlékeztető</span><span><Link href="/privacy">Adatkezelés</Link><Link href="/terms">Feltételek</Link><a href="mailto:hello@benade.hu">Kapcsolat</a></span></div></footer>
    </div>
  );
}
