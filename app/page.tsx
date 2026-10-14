import Link from "next/link";
import { Wordmark, TruckIcon } from "@/components/Brand";

const ico = {
  vu: <TruckIcon size={26} />,
  card: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.6 1.7-2.3 3-2.3s2.4.7 3 2.3M14 10h4M14 13.5h4"/></svg>,
  training: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.5M21.5 9.5V15"/></svg>,
  invoice: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>,
};

export default function Home() {
  return (
    <div className="stage">
      <div className="bgimg" style={{ backgroundImage: "url(/img/road.jpg)" }} aria-hidden />
      <div className="bgveil" aria-hidden />

      <header className="topbar">
        <Wordmark />
        <nav>
          <Link className="btn ghost sm" href="/login">Bejelentkezés</Link>
          <Link className="btn primary sm" href="/register">Fiók létrehozása</Link>
        </nav>
      </header>

      <main className="start">
        <span className="pill"><i aria-hidden /> Tachográf emlékeztető</span>

        <div className="hero-img">
          <img src="/img/truck.jpg" alt="Kamion éjszakai autópályán" fetchPriority="high" />
          <span className="tag">Következő letöltés <b>+90 nap</b></span>
        </div>

        <h1 className="big">Ben<b>Ade</b><small>Időben. Biztonságban.</small></h1>

        <div className="glowcard">
          <div className="stats3">
            <div><b>+<em>90</em></b><span>nap · fedélzeti egység</span></div>
            <div><b>+<em>28</em></b><span>nap · vezetői kártya</span></div>
            <div><b><em>06</em>:00</b><span>oktatás napján</span></div>
          </div>
          <h2>Minden letöltés, oktatás és számla időben.</h2>
          <p>Az app számolja a határidőt, és szól, mielőtt lejár.</p>
        </div>

        <div className="cta">
          <Link className="btn light block" href="/register">Kezdjük</Link>
          <Link className="btn ghost block" href="/login">Már van fiókom</Link>
        </div>
        <p className="legal">A folytatással elfogadja a <Link href="/terms">felhasználási feltételeket</Link> és az <Link href="/privacy">adatkezelési tájékoztatót</Link>.</p>

        <a className="more" href="#funkciok">Nézd meg, mit tud<span aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg></span></a>
      </main>

      <div className="marquee" aria-hidden>
        <div className="track">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>Fedélzeti egység +90 nap <i>•</i> Vezetői kártya +28 nap <i>•</i> Oktatás 06:00 <i>•</i> Számla +30 nap <i>•</i> Telefon · tablet · gép <i>•</i> Felhőszinkron <i>•</i> </span>
          ))}
        </div>
      </div>

      <section className="section" id="funkciok">
        <div className="kicker">Négy teendőtípus</div>
        <h2>Egyetlen időrendi lista, <b>semmi nem csúszik el.</b></h2>
        <p className="sub">Céget választ, az app csak az ő járműveit és sofőrjeit mutatja. A letöltés napja a mai dátum, a következő határidőt az app számolja ki – Önnek csak az emlékeztető időpontját kell megadnia.</p>

        <div className="bento">
          <article className="tile img col-6">
            <img src="/img/tacho.jpg" alt="Digitális tachográf vezetői kártyával" loading="lazy" />
            <div className="cap"><h3>Fedélzeti egység és vezetői kártya</h3><p style={{ color: "#C9D2E6", marginTop: 6 }}>Letöltés rögzítése 10 másodperc alatt, határidő automatikusan.</p></div>
          </article>
          <article className="tile t-vu col-3"><span className="ico">{ico.vu}</span><h3>Fedélzeti egység</h3><p>Rendszám a cég járművei közül, emlékeztető óra:perc pontossággal.</p><span className="rule">+90<small>nap</small></span></article>
          <article className="tile t-card col-3"><span className="ico">{ico.card}</span><h3>Vezetői kártya</h3><p>Gépkocsivezető a cég sofőrjei közül, a név mindig helyesen írva.</p><span className="rule">+28<small>nap</small></span></article>
          <article className="tile t-training col-4"><span className="ico">{ico.training}</span><h3>Oktatás</h3><p>Kapcsolattartó, telefonszám, cím, időpont. Az értesítés a napján reggel hatkor jön, külön beállítás nélkül.</p><span className="rule">06:00<small>a napján</small></span></article>
          <article className="tile t-invoice col-4"><span className="ico">{ico.invoice}</span><h3>Számla</h3><p>Fizetési határidő a kiállítástól számítva. Ha lejár és nincs kifizetve, piros jelzést és értesítést kap.</p><span className="rule">+30<small>nap</small></span></article>
          <article className="tile col-4" style={{ background: "linear-gradient(160deg, rgba(61,123,255,.35), rgba(61,123,255,.06))" }}>
            <span className="ico" style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg></span>
            <h3>Adatbank</h3><p>Cégek adószámmal, hozzájuk kötött sofőrök és rendszámok. Minden eszközén ugyanaz, azonnal.</p>
            <span className="rule" style={{ color: "#fff" }}>∞<small>szinkron</small></span>
          </article>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="steps">
          <div>
            <div className="kicker">Így működik</div>
            <h2>Holnaptól <b>Excel nélkül.</b></h2>
            <ol style={{ marginTop: 28 }}>
              <li><div><b>Rögzítse a cégeket</b><span>Névvel és adószámmal az Adatbankban.</span></div></li>
              <li><div><b>Sofőrök és rendszámok</b><span>Céghez kötve. A nevek és rendszámok formátumát az app javítja.</span></div></li>
              <li><div><b>Emlékeztető három koppintással</b><span>Cég → jármű vagy sofőr → mentés. A határidőt az app számolja.</span></div></li>
              <li><div><b>Az app szól</b><span>Értesítés a megadott időpontban, a Teendő listán mindig látszik, mi jön.</span></div></li>
            </ol>
          </div>
          <div className="phone" aria-hidden>
            <div className="scr">
              <div style={{ padding: "26px 18px 16px", background: "radial-gradient(400px 200px at 80% -20%, rgba(61,123,255,.5), transparent 60%)" }}>
                <div style={{ fontSize: 10.5, letterSpacing: ".18em", fontWeight: 800, color: "var(--muted)" }}>SZERDA, OKTÓBER 14.</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21, marginTop: 6, letterSpacing: "-.02em" }}>Következő teendők</div>
                <div style={{ marginTop: 14, borderRadius: 20, padding: 14, background: "linear-gradient(160deg, rgba(77,134,255,.35), rgba(77,134,255,.08))", border: "1px solid rgba(134,179,255,.3)" }}>
                  <div style={{ fontSize: 10.5, letterSpacing: ".16em", fontWeight: 800, color: "var(--brand-soft-fg)" }}>KÖVETKEZŐ</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, letterSpacing: "-.03em", marginTop: 4 }}>Ma <span style={{ color: "var(--amber)" }}>08:00</span></div>
                  <div style={{ fontWeight: 800, fontSize: 13, marginTop: 2 }}>Fedélzeti egység letöltés</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Példa Kft. · ABC-123</div>
                </div>
              </div>
              <div style={{ padding: "0 12px 16px", display: "grid", gap: 8 }}>
                {[["var(--card)", "Vezetői kártya", "Példa Péter", "2 nap"], ["var(--train)", "Oktatás 10:00", "Budapest, Fő utca 1.", "11 nap"], ["var(--inv)", "Számla 2026/001", "35 700 Ft · Nincs kifizetve", "Lejárt"]].map(([c, t, m, r]) => (
                  <div key={t} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: "10px 12px", boxShadow: `inset 3px 0 0 ${c}` }}>
                    <span><div style={{ fontWeight: 800, fontSize: 12.5 }}>{t}</div><div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{m}</div></span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: c, background: "rgba(255,255,255,.06)", padding: "4px 8px", borderRadius: 99 }}>{r}</span>
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
            <h2>Kezdje el ma. Ingyenes.</h2>
            <p>Fiók egy perc alatt, az adatok minden eszközén ugyanazok.</p>
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
