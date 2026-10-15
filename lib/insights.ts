/* Invoice insights — pure helpers (no React, no I/O).
   Dates: due_at is a timestamptz (local midnight), issue_date / paid_at are "YYYY-MM-DD".
   Always compare wall-clock dates via dateOf() for timestamps, never ts.slice(0, 10). */
import type { Task, Workspace } from "./types";
import { MONTHS_SHORT, addDays, dateOf, fmtDate, parseISODate } from "./date";
import { fmtFt } from "./format";

/* ---------- basic invoice state ---------- */
export const isPaid = (t: Task) => !!t.paid_at || t.status !== "open";
/** Wall-clock date the invoice was paid ("YYYY-MM-DD"), or null. */
export const paidDate = (t: Task): string | null => t.paid_at ? t.paid_at.slice(0, 10) : t.status !== "open" && t.done_at ? dateOf(t.done_at) : null;
export const dueDate = (t: Task) => dateOf(t.due_at);
export const gross = (t: Task) => Number(t.gross_amount) || 0;
export const sumGross = (a: Task[]) => a.reduce((z, x) => z + gross(x), 0);
/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number { return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000); }
/** Days past due for an unpaid invoice (0 when not overdue). */
export function daysOverdue(t: Task, today: string): number { return isPaid(t) ? 0 : Math.max(0, daysBetween(dueDate(t), today)); }
/** "okt. 3." — adds the year when it differs from `today`. */
export function shortDate(iso: string, today?: string): string {
  const d = parseISODate(iso); const y = today ? parseISODate(today).getFullYear() : d.getFullYear();
  return `${d.getFullYear() !== y ? `${d.getFullYear()}. ` : ""}${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}.`;
}

export type InvoiceTone = "over" | "today" | "soon" | "later" | "paid";
/** Status pill text and tone: "23 napja lejárt" / "Ma esedékes" / "Kifizetve okt. 3." */
export function invoiceStatus(t: Task, today: string): { text: string; tone: InvoiceTone } {
  const p = paidDate(t);
  if (isPaid(t)) return { text: p ? `Kifizetve ${shortDate(p, today)}` : "Kifizetve", tone: "paid" };
  const n = daysBetween(today, dueDate(t));
  if (n < 0) return { text: `${-n} napja lejárt`, tone: "over" };
  if (n === 0) return { text: "Ma esedékes", tone: "today" };
  if (n === 1) return { text: "Holnap esedékes", tone: "soon" };
  if (n <= 7) return { text: `${n} nap múlva esedékes`, tone: "soon" };
  return { text: `${n} nap múlva esedékes`, tone: "later" };
}

/* ---------- outstanding buckets ---------- */
export type Bucket = "overdue" | "week" | "later";
export function bucketOf(t: Task, today: string): Bucket | null {
  if (isPaid(t)) return null; const d = dueDate(t);
  if (d < today) return "overdue"; if (d <= addDays(today, 7)) return "week"; return "later";
}
export interface Outstanding { total: number; count: number; buckets: Record<Bucket, { sum: number; count: number }>; }
export function outstanding(invoices: Task[], today: string): Outstanding {
  const o: Outstanding = { total: 0, count: 0, buckets: { overdue: { sum: 0, count: 0 }, week: { sum: 0, count: 0 }, later: { sum: 0, count: 0 } } };
  for (const t of invoices) { const b = bucketOf(t, today); if (!b) continue; const g = gross(t); o.total += g; o.count++; o.buckets[b].sum += g; o.buckets[b].count++; }
  return o;
}

/* ---------- payment habit per company ---------- */
export interface PayStats { paidCount: number; avgDaysLate: number; onTimeShare: number; maxDaysLate: number; }
/** Per company: average days late (paid − due, min 0) and share paid on time, over paid invoices. */
export function paymentStats(invoices: Task[]): Map<string, PayStats> {
  const acc = new Map<string, number[]>();
  for (const t of invoices) { const p = paidDate(t); if (!p) continue; const late = Math.max(0, daysBetween(dueDate(t), p)); const a = acc.get(t.company_id) || []; a.push(late); acc.set(t.company_id, a); }
  const out = new Map<string, PayStats>();
  for (const [cid, a] of acc) out.set(cid, { paidCount: a.length, avgDaysLate: a.reduce((z, x) => z + x, 0) / a.length, onTimeShare: a.filter(x => x === 0).length / a.length, maxDaysLate: Math.max(...a) });
  return out;
}
/** Short Hungarian label ("Átlagosan 6 napot késik" / "Mindig időben fizet"); null when there is too little history. */
export function habitLabel(s: PayStats | undefined, minCount = 1): { text: string; tone: "ok" | "late" | "bad" } | null {
  if (!s || s.paidCount < minCount) return null;
  if (s.onTimeShare === 1) return { text: "Mindig időben fizet", tone: "ok" };
  const d = Math.round(s.avgDaysLate);
  if (d < 1) return { text: "Általában időben fizet", tone: "ok" };
  return { text: `Átlagosan ${d} napot késik`, tone: d >= 10 ? "bad" : "late" };
}

/* ---------- 12-month series ---------- */
export interface MonthPoint { key: string; label: string; year: number; month0: number; billed: number; billedCount: number; paid: number; paidCount: number; }
/** Last `n` calendar months ending with the month of `today`: billed gross (by issue date) and paid gross (by payment date). */
export function monthlySeries(invoices: Task[], today: string, n = 12): MonthPoint[] {
  const t = parseISODate(today); const out: MonthPoint[] = []; const idx = new Map<string, MonthPoint>();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const p: MonthPoint = { key, label: MONTHS_SHORT[d.getMonth()], year: d.getFullYear(), month0: d.getMonth(), billed: 0, billedCount: 0, paid: 0, paidCount: 0 };
    out.push(p); idx.set(key, p);
  }
  for (const x of invoices) {
    const issued = (x.issue_date || x.base_date || dateOf(x.created_at)).slice(0, 7); const b = idx.get(issued); if (b) { b.billed += gross(x); b.billedCount++; }
    const pd = paidDate(x); const p = pd ? idx.get(pd.slice(0, 7)) : undefined; if (p) { p.paid += gross(x); p.paidCount++; }
  }
  return out;
}
/** Round up to a "nice" axis maximum (1, 2, 2.5, 5 × 10^k). */
export function niceMax(v: number): number { if (!(v > 0)) return 100000; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return 10 * p; }
/** Compact Ft for axis labels: "250 e", "1,2 M". */
export function fmtCompact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3).toLocaleString("hu-HU")} e`;
  return String(Math.round(n));
}

/* ---------- dunning ---------- */
export type DunningLevel = "friendly" | "firm" | "final";
export const DUNNING_NAME: Record<DunningLevel, string> = { friendly: "barátságos", firm: "határozott", final: "utolsó felszólítás" };
/** 1–9 days overdue: friendly · 10–29: firm · 30+: final. Null when not overdue. */
export function dunningLevel(days: number): DunningLevel | null { if (days < 1) return null; if (days < 10) return "friendly"; if (days < 30) return "firm"; return "final"; }

export interface DunningInput { level: DunningLevel; company: string; invoiceNo?: string | null; amount: number; dueISO: string; daysOverdue: number; today: string; workspace: Pick<Workspace, "name" | "phone" | "email">; }
export interface DunningText { subject: string; body: string; sms: string; }
export function dunningText(i: DunningInput): DunningText {
  const no = i.invoiceNo?.trim() ? `${i.invoiceNo.trim()} számú` : "alábbi"; const noShort = i.invoiceNo?.trim() || "";
  const amt = fmtFt(i.amount); const due = fmtDate(i.dueISO);
  const deadline = fmtDate(addDays(i.today, i.level === "final" ? 5 : 8));
  const ws = i.workspace; const sig = [ws.name, ws.phone, ws.email].filter(Boolean).join("\n");
  const sigShort = [ws.name, ws.phone].filter(Boolean).join(", ");
  const ignore = "Amennyiben az összeget időközben átutalta, kérjük, tekintse levelünket tárgytalannak.";
  const hello = `Tisztelt ${i.company}!`;
  let subject: string; let lines: string[]; let sms: string;
  if (i.level === "friendly") {
    subject = `Fizetési emlékeztető${noShort ? ` – ${noShort} számú számla` : ""}`;
    lines = [hello, "",
      `Szeretnénk szíves figyelmébe ajánlani, hogy a(z) ${no}, ${amt} összegű számlánk fizetési határideje ${due} volt. Feltehetően csak a figyelmét kerülte el.`, "",
      "Kérjük, szíveskedjen a kiegyenlítésről a közeljövőben gondoskodni.", ignore, "",
      "Köszönjük együttműködését!", "", "Üdvözlettel:", sig];
    sms = `${hello} Emlékeztetjük, hogy a(z) ${noShort ? noShort + " sz." : ""} ${amt} összegű számlánk ${due} napon lejárt. Kérjük, szíveskedjen rendezni; ha már utalt, tekintse tárgytalannak. Köszönettel: ${sigShort}`;
  } else if (i.level === "firm") {
    subject = `Fizetési felszólítás${noShort ? ` – ${noShort} számú számla` : ""}`;
    lines = [hello, "",
      `Nyilvántartásunk szerint a(z) ${no}, ${amt} összegű számlánk, amelynek fizetési határideje ${due} volt, ${i.daysOverdue} napja kiegyenlítetlen.`, "",
      `Kérjük, hogy a tartozást legkésőbb ${deadline} napjáig szíveskedjen rendezni. Ha a fizetéssel kapcsolatban kérdése vagy akadálya van, kérjük, jelezze felénk, hogy közösen megoldást találjunk.`, "",
      ignore, "", "Tisztelettel:", sig];
    sms = `${hello} A(z) ${noShort ? noShort + " sz." : ""} ${amt} összegű számlánk ${i.daysOverdue} napja lejárt (határidő: ${due}). Kérjük, ${deadline} napjáig szíveskedjen rendezni. Ha már utalt, tekintse tárgytalannak. ${sigShort}`;
  } else {
    subject = `Utolsó fizetési felszólítás${noShort ? ` – ${noShort} számú számla` : ""}`;
    lines = [hello, "",
      `A(z) ${no}, ${amt} összegű számlánk fizetési határideje ${due} volt. A tartozás ${i.daysOverdue} napja lejárt, és korábbi megkereséseink ellenére sem került kiegyenlítésre.`, "",
      `Ezúton utoljára kérjük, hogy a teljes összeget legkésőbb ${deadline} napjáig egyenlítse ki. Amennyiben eddig a fizetés nem történik meg, kénytelenek leszünk további szolgáltatásainkat felfüggeszteni, és a követelés érvényesítése érdekében további lépéseket tenni.`, "",
      ignore, "", "Tisztelettel:", sig];
    sms = `${hello} Utolsó felszólítás: a(z) ${noShort ? noShort + " sz." : ""} ${amt} összegű számlánk ${i.daysOverdue} napja lejárt. Kérjük, ${deadline} napjáig egyenlítse ki, ellenkező esetben további lépéseket teszünk. ${sigShort}`;
  }
  return { subject, body: lines.join("\n").trim(), sms: sms.replace(/\s+/g, " ").trim() };
}

/* ---------- reminder log in the invoice note ---------- */
export type ReminderChannel = "e-mail" | "SMS" | "egyéb";
const REM_RE = /Fizetési emlékeztető elküldve: (\d{4})\. (\d{2})\. (\d{2})\.(?: \(([^)]*)\))?/g;
/** "Fizetési emlékeztető elküldve: 2026. 10. 15. (e-mail, határozott)" */
export function reminderLine(dateISO: string, channel: ReminderChannel, level: DunningLevel): string { return `Fizetési emlékeztető elküldve: ${fmtDate(dateISO)} (${channel}, ${DUNNING_NAME[level]})`; }
export function appendReminder(note: string | null | undefined, line: string): string { const n = (note || "").trimEnd(); return n ? `${n}\n${line}` : line; }
/** Most recent reminder logged in the note, or null. */
export function lastReminder(note: string | null | undefined): { date: string; detail: string; count: number } | null {
  if (!note) return null; let last: { date: string; detail: string } | null = null; let count = 0;
  for (const m of note.matchAll(REM_RE)) { count++; const date = `${m[1]}-${m[2]}-${m[3]}`; if (!last || date >= last.date) last = { date, detail: m[4] || "" }; }
  return last ? { ...last, count } : null;
}

/* ---------- link builders ---------- */
const enc = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, "\r\n"));
export function mailtoHref(to: string, subject: string, body: string): string { return `mailto:${to.trim()}?subject=${enc(subject)}&body=${enc(body)}`; }
export function smsHref(phone: string, body: string): string { return `sms:${phone.replace(/[^+\d]/g, "")}?&body=${enc(body)}`; }
