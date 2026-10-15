/* Read-only customer portal (server component – no client JS needed). */
import { Icon } from "@/components/icons";

export interface PortalFeed {
  company: { name: string };
  workspace: { name: string; phone?: string | null; email?: string | null; address?: string | null };
  generated_at: string;
  vehicles: { plate: string; make?: string | null; next_vu?: string | null; next_calibration?: string | null; last_vu?: string | null }[];
  drivers: { name: string; next_card?: string | null; card_expiry?: string | null; last_card?: string | null }[];
  trainings: { due_at: string; topic?: string | null; address?: string | null; participants?: number | null }[];
  invoices: { invoice_no?: string | null; issue_date?: string | null; due_at: string; gross_amount?: number | null }[];
}

const TZ = "Europe/Budapest";
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hm = new Intl.DateTimeFormat("hu-HU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayOf = (v: string) => (v.length <= 10 ? v : ymd.format(new Date(v)));
const fmtD = (v?: string | null) => (v ? dayOf(v).replace(/-/g, ". ") + "." : "–");
const daysUntil = (v: string, today: string) => Math.round((Date.parse(dayOf(v)) - Date.parse(today)) / 86400000);
const ft = (n?: number | null) => (Number(n) || 0).toLocaleString("hu-HU", { maximumFractionDigits: 0 }) + " Ft";
const tel = (p: string) => "tel:" + p.replace(/[^+\d]/g, "");

type Tone = "over" | "soon" | "ok";
const toneOf = (d: number): Tone => (d < 0 ? "over" : d <= 7 ? "soon" : "ok");
const rel = (d: number) => (d < 0 ? `${-d} napja lejárt` : d === 0 ? "Ma" : d === 1 ? "Holnap" : `${d} nap múlva`);

interface Row { what: string; subject: string; plate?: boolean; due: string; days: number; time?: string }

function Wordmark() { return <span className="pt-wm" aria-label="BenAde">Ben<b>Ade</b></span>; }

export function PortalMissing({ reason }: { reason: "notfound" | "unavailable" }) {
  return <div className="portal">
    <header className="pt-top"><Wordmark /></header>
    <main className="pt-main">
      <div className="pt-card pt-missing">
        <span className="pt-ic">{Icon.shield(26)}</span>
        <h1>{reason === "notfound" ? "Ez a link nem érvényes" : "Az ügyfélportál most nem érhető el"}</h1>
        <p>{reason === "notfound" ? "Lehet, hogy a szerviz visszavonta vagy újat küldött helyette. Kérjük, kérjen új linket a tachográf-szerviztől." : "Kérjük, próbálja újra néhány perc múlva."}</p>
      </div>
    </main>
  </div>;
}

export function PortalView({ feed }: { feed: PortalFeed }) {
  const today = ymd.format(new Date());
  const rows: Row[] = [];
  for (const v of feed.vehicles) {
    if (v.next_vu) rows.push({ what: "Fedélzeti egység letöltés", subject: v.plate, plate: true, due: v.next_vu, days: daysUntil(v.next_vu, today) });
    if (v.next_calibration) rows.push({ what: "Tachográf kalibráció", subject: v.plate, plate: true, due: v.next_calibration, days: daysUntil(v.next_calibration, today) });
  }
  for (const d of feed.drivers) {
    if (d.next_card) rows.push({ what: "Vezetői kártya letöltés", subject: d.name, due: d.next_card, days: daysUntil(d.next_card, today) });
    if (d.card_expiry) rows.push({ what: "Vezetői kártya lejárat", subject: d.name, due: d.card_expiry, days: daysUntil(d.card_expiry, today) });
  }
  for (const t of feed.trainings) rows.push({ what: "Oktatás", subject: t.topic || "Oktatás", due: t.due_at, days: daysUntil(t.due_at, today), time: hm.format(new Date(t.due_at)) });
  rows.sort((a, b) => a.due.localeCompare(b.due));
  const invs = feed.invoices.map(i => ({ ...i, days: daysUntil(i.due_at, today) }));
  const over = rows.filter(r => r.days < 0).length + invs.filter(i => i.days < 0).length;
  const soon = rows.filter(r => r.days >= 0 && r.days <= 7).length + invs.filter(i => i.days >= 0 && i.days <= 7).length;
  const status: Tone = over ? "over" : soon ? "soon" : "ok";
  const total = invs.reduce((s, i) => s + Number(i.gross_amount || 0), 0);
  const ws = feed.workspace;
  const headline = status === "over" ? `${over} lejárt tétel` : status === "soon" ? `${soon} tétel esedékes 7 napon belül` : "Minden rendben";
  const lead = status === "ok" ? "Jelenleg nincs lejárt vagy egy héten belül esedékes teendő." : "Kérjük, egyeztessen időpontot a szervizzel az alábbi elérhetőségek egyikén.";

  return <div className="portal">
    <header className="pt-top"><Wordmark /><span className="pt-ro">{Icon.shield(14)} Csak olvasható</span></header>
    <main className="pt-main">
      <section className="pt-hero">
        <div className="pt-kicker">Ügyfélportál · {ws.name}</div>
        <h1>{feed.company.name}</h1>
        <div className={`pt-status s-${status}`}>
          <span className="dot" aria-hidden />
          <div><b>{headline}</b><p>{lead}</p></div>
        </div>
        <div className="pt-stats">
          <div><b className="mono">{feed.vehicles.length}</b><span>jármű</span></div>
          <div><b className="mono">{feed.drivers.length}</b><span>gépkocsivezető</span></div>
          <div className={over ? "over" : ""}><b className="mono">{over}</b><span>lejárt</span></div>
          <div className={soon ? "soon" : ""}><b className="mono">{soon}</b><span>7 napon belül</span></div>
        </div>
      </section>

      <section className="pt-sec">
        <h2>Közelgő határidők</h2>
        {rows.length === 0 ? <div className="pt-empty">Nincs ütemezett határidő.</div> :
          <table className="pt-table">
            <thead><tr><th>Teendő</th><th>Jármű / gépkocsivezető</th><th>Határidő</th><th>Állapot</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className={`r-${toneOf(r.days)}`}>
              <td className="what">{r.what}</td>
              <td className="subj">{r.plate ? <span className="pt-plate"><span className="eu" aria-hidden>H</span><span className="tx">{r.subject}</span></span> : r.subject}</td>
              <td className="mono due">{fmtD(r.due)}{r.time ? ` ${r.time}` : ""}</td>
              <td className="st"><span className={`pt-badge ${toneOf(r.days)}`}>{rel(r.days)}</span></td>
            </tr>)}</tbody>
          </table>}
      </section>

      <section className="pt-sec">
        <h2>Nyitott számlák</h2>
        {invs.length === 0 ? <div className="pt-empty">Nincs kifizetetlen számla. Köszönjük!</div> : <>
          <table className="pt-table inv">
            <thead><tr><th>Számlaszám</th><th>Kiállítva</th><th>Fizetési határidő</th><th className="num">Összeg</th></tr></thead>
            <tbody>{invs.map((i, k) => <tr key={k} className={`r-${toneOf(i.days)}`}>
              <td className="mono what">{i.invoice_no || "–"}</td>
              <td className="mono subj"><span className="lbl">Kiállítva: </span>{fmtD(i.issue_date)}</td>
              <td className="mono due">{fmtD(i.due_at)} {i.days < 0 && <span className="pt-badge over">{rel(i.days)}</span>}</td>
              <td className="mono num st">{ft(i.gross_amount)}</td>
            </tr>)}</tbody>
          </table>
          <div className="pt-total"><span>Összesen</span><b className="mono">{ft(total)}</b></div>
        </>}
      </section>

      <section className="pt-sec">
        <h2>Kapcsolat</h2>
        <div className="pt-card pt-contact">
          <div><b>{ws.name}</b>{ws.address && <p>{ws.address}</p>}</div>
          <div className="acts">
            {ws.phone && <a className="pt-btn primary" href={tel(ws.phone)}>{Icon.phone(18)} {ws.phone}</a>}
            {ws.email && <a className="pt-btn" href={`mailto:${ws.email}?subject=${encodeURIComponent(`Időpont-egyeztetés – ${feed.company.name}`)}`}>{Icon.mail(18)} {ws.email}</a>}
          </div>
        </div>
      </section>
    </main>
    <footer className="pt-foot">
      <p>Adatok frissítve: <span className="mono">{fmtD(feed.generated_at)} {hm.format(new Date(feed.generated_at))}</span>. Az oldal csak olvasható; a linket a(z) {ws.name} osztotta meg Önnel.</p>
      <p><Wordmark /> · tachográf-emlékeztető</p>
    </footer>
  </div>;
}
