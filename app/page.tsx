import Link from "next/link";
import RoadArt from "@/components/RoadArt";
import { Wordmark } from "@/components/Brand";

const features = [
  { cls: "t-vu", rule: "+90 nap", title: "Fedélzeti egység letöltés", text: "Céget és rendszámot választ, a letöltés napja a mai dátum, a következő határidőt az app számolja. Az emlékeztetőt óra:perc pontossággal kéri.", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg> },
  { cls: "t-card", rule: "+28 nap", title: "Vezetői kártya letöltés", text: "Csak az adott cég gépkocsivezetői jelennek meg. A következő letöltés automatikusan 28 naptári nap múlva esedékes.", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.6 1.7-2.3 3-2.3s2.4.7 3 2.3M14 10h4M14 13.5h4"/></svg> },
  { cls: "t-training", rule: "06:00", title: "Oktatás", text: "Kapcsolattartó, telefonszám, cím és időpont. Az értesítés az oktatás napján reggel 6-kor érkezik, külön beállítás nélkül.", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.5M21.5 9.5V15"/></svg> },
  { cls: "t-invoice", rule: "+30 nap", title: "Számla határidő", text: "A fizetési határidő a kiállítástól számított 30 nap. Ha lejár és nincs kifizetve, piros jelzést és értesítést kap.", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg> },
];

export default function Home() {
  return (
    <div className="site">
      <header className="topbar">
        <Wordmark />
        <nav>
          <Link className="btn ghost sm" href="/login">Bejelentkezés</Link>
          <Link className="btn primary sm" href="/register">Fiók létrehozása</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="inner">
          <div>
            <span className="eyebrow"><span aria-hidden>●</span> Tachográf-határidők, egy helyen</span>
            <h1>Minden letöltés, oktatás és számla <em>időben.</em></h1>
            <p className="lead">A BenAde a tachográf-szerviz mindennapi adminisztrációját váltja ki: cégek, sofőrök és járművek egy adatbankban, a határidőket az app számolja, és szól, mielőtt lejárnának.</p>
            <div className="cta">
              <Link className="btn light" href="/register">Kezdjük el</Link>
              <Link className="btn ghost" href="/login" style={{ color: "#fff", borderColor: "rgba(255,255,255,.3)" }}>Már van fiókom</Link>
            </div>
            <div className="proof">
              <div><b>90</b>nap a fedélzeti egységnél</div>
              <div><b>28</b>nap a vezetői kártyánál</div>
              <div><b>30</b>nap a számla határidejéig</div>
            </div>
          </div>
          <div className="art"><RoadArt /></div>
        </div>
      </section>

      <section className="features">
        <h2>Négy teendőtípus, egyetlen időrendi lista</h2>
        <p className="sub">Minden tétel dátum és idő szerint sorakozik a kezdőképernyőn, színnel jelölve, hogy mi micsoda. Koppintásra ott a részlet, a szerkesztés és a lezárás.</p>
        <div className="fgrid">
          {features.map(f => (
            <article key={f.title} className={`fcard ${f.cls}`}>
              <span className="ico">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <span className="rule">{f.rule}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="steps">
        <div className="inner">
          <div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,36px)", fontWeight: 700, letterSpacing: "-.025em" }}>Így működik</h2>
            <ol>
              <li><div><b>Rögzítse a cégeket az Adatbankban</b><span>Névvel és adószámmal. Minden céghez saját sofőr- és járműlista tartozik.</span></div></li>
              <li><div><b>Vegye fel a gépkocsivezetőket és a rendszámokat</b><span>A nevek minden szava nagybetűvel kezdődik, a rendszám mindig nagybetűs – az app javítja.</span></div></li>
              <li><div><b>Rögzítsen emlékeztetőt</b><span>Cég → jármű vagy sofőr → letöltés napja. A következő határidőt az app számolja ki.</span></div></li>
              <li><div><b>Hagyja, hogy az app szóljon</b><span>Értesítés a megadott időpontban, a Teendő listán pedig mindig látszik, mi jön.</span></div></li>
            </ol>
          </div>
          <div className="phone" aria-hidden>
            <div className="scr">
              <div style={{ background: "linear-gradient(160deg,#0B1530,#122250)", color: "#fff", padding: "22px 18px 16px" }}>
                <div style={{ fontSize: 11, letterSpacing: ".1em", fontWeight: 800, color: "#AFBCDD" }}>SZERDA, OKTÓBER 14.</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, marginTop: 4 }}>Következő teendők</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                  {[["1", "Lejárt", "#FF6B7D"], ["2", "Ma", "#FFB020"], ["5", "7 nap", "#8FB0FF"]].map(([n, l, c]) => (
                    <div key={l} style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: "8px 10px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: c as string }}>{n}</div>
                      <div style={{ fontSize: 10.5, color: "#C9D3EC", fontWeight: 700 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: 12, display: "grid", gap: 8 }}>
                {[["#1E5EFF", "Fedélzeti egység", "Példa Kft. · ABC-123", "Ma 08:00"], ["#0F9D58", "Vezetői kártya", "Példa Kft. · Példa Péter", "2 nap"], ["#E07B00", "Oktatás", "Budapest, Fő utca 1.", "11 nap"], ["#E0243A", "Számla 2026/001", "35 700 Ft · Nincs kifizetve", "Lejárt"]].map(([c, t, m, r]) => (
                  <div key={t} style={{ display: "grid", gridTemplateColumns: "4px 1fr auto", gap: 10, alignItems: "center", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "9px 10px 9px 0", overflow: "hidden" }}>
                    <span style={{ background: c, alignSelf: "stretch", borderRadius: "0 3px 3px 0" }} />
                    <span><div style={{ fontWeight: 800, fontSize: 12.5 }}>{t}</div><div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{m}</div></span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: c, background: "var(--surface-2)", padding: "3px 7px", borderRadius: 99 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="box">
          <div>
            <h2>Holnaptól Excel nélkül.</h2>
            <p>Fiók egy perc alatt, az adatok minden eszközén ugyanazok: telefonon, tableten és gépen.</p>
          </div>
          <Link className="btn light" href="/register">Fiók létrehozása</Link>
        </div>
      </section>

      <footer className="site-foot">
        <div className="inner">
          <span>© {new Date().getFullYear()} BenAde · Tachográf Emlékeztető</span>
          <span><Link href="/terms">Felhasználási feltételek</Link><Link href="/privacy">Adatkezelés</Link></span>
        </div>
      </footer>
    </div>
  );
}
