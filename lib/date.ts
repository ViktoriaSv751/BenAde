/* Date helpers — every "wall clock" value is Budapest time, whatever time zone the phone is set to.
   ISO date = "YYYY-MM-DD"; timestamps are built and read in Europe/Budapest via Intl. */
export const pad = (n: number) => String(n).padStart(2, "0");
export const DAYS = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
export const DAYS_SHORT = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
export const MONTHS = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
export const MONTHS_SHORT = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

export const TZ = "Europe/Budapest";
const fmtParts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
/** Wall-clock parts of an instant in Budapest – independent of the phone's own time zone. */
export function budParts(v: Date | string | number) {
  const d = v instanceof Date ? v : new Date(v); const o: Record<string, number> = {};
  for (const p of fmtParts.formatToParts(d)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour === 24 ? 0 : o.hour, mi: o.minute, s: o.second };
}
/** Calendar arithmetic on plain dates (noon avoids any DST edge). */
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => { const p = budParts(new Date()); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export function parseISODate(s: string): Date { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(iso: string, n: number): string { const d = parseISODate(iso); d.setDate(d.getDate() + n); return isoDate(d); }
export function addMonths(iso: string, n: number): string { const d = parseISODate(iso); d.setMonth(d.getMonth() + n); return isoDate(d); }
/** The instant when Budapest clocks show `iso time`. */
export function localDateTime(iso: string, time: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number); const [h, mi] = time.split(":").map(Number);
  const want = Date.UTC(y, m - 1, d, h || 0, mi || 0); let t = want;
  for (let i = 0; i < 3; i++) { const p = budParts(t); const seen = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi); const diff = want - seen; if (!diff) break; t += diff; }
  return new Date(t);
}
export const toTS = (iso: string, time: string) => localDateTime(iso, time).toISOString();
export function dateOf(ts: string): string { const p = budParts(ts); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; }
export function timeOf(ts: string): string { const p = budParts(ts); return `${pad(p.h)}:${pad(p.mi)}`; }
/** Current Budapest hour/minute. */
export function nowHM(offsetMs = 0): { h: number; m: number } { const p = budParts(Date.now() + offsetMs); return { h: p.h, m: p.mi }; }
export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return "–";
  if (typeof v === "string" && v.length <= 10) { const [y, m, d] = v.split("-"); return `${y}. ${m}. ${d}.`; }
  const p = budParts(v); return `${p.y}. ${pad(p.m)}. ${pad(p.d)}.`;
}
export function fmtDT(ts: string | null | undefined, allDay = false): string { if (!ts) return "–"; return allDay ? fmtDate(ts) : `${fmtDate(ts)} ${timeOf(ts)}`; }
export function fmtLong(d: Date): string { return `${DAYS[d.getDay()]}, ${d.getFullYear()}. ${MONTHS[d.getMonth()]} ${d.getDate()}.`; }
export function fmtShort(ts: string): string { const p = budParts(ts); return `${MONTHS_SHORT[p.m - 1]} ${p.d}.`; }
export function dayDiff(ts: string): number { const a = parseISODate(todayISO()).getTime(); const b = parseISODate(dateOf(ts)).getTime(); return Math.round((b - a) / 86400000); }
export function relLabel(ts: string): { text: string; tone: "over" | "today" | "soon" | "ok" } {
  const n = dayDiff(ts);
  if (n === 0) return { text: "Ma", tone: "today" };
  if (n === 1) return { text: "Holnap", tone: "soon" };
  if (n < 0) return { text: `${-n} napja lejárt`, tone: "over" };
  if (n <= 7) return { text: `${n} nap múlva`, tone: "soon" };
  return { text: `${n} nap múlva`, tone: "ok" };
}
export function startOfWeek(iso: string): string { const d = parseISODate(iso); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return isoDate(d); }
export function monthGrid(year: number, month0: number): string[] { // 6 weeks, Monday first
  const first = new Date(year, month0, 1); const start = startOfWeek(isoDate(first)); const out: string[] = [];
  for (let i = 0; i < 42; i++) out.push(addDays(start, i)); return out;
}
export function isoWeek(iso: string): number { const d = parseISODate(iso); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dayNum = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7); }
/** Reminder timestamps for a due date from workspace defaults (days before + time). */
export function reminderTimes(dueISO: string, daysBefore: number[], time: string): string[] {
  const now = Date.now();
  return daysBefore.map(d => toTS(addDays(dueISO, -d), time)).filter(ts => new Date(ts).getTime() > now - 3600_000).sort();
}
