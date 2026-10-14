/* Date helpers — all "wall clock" values are in the workspace time zone (Europe/Budapest by default).
   ISO date = "YYYY-MM-DD"; we build timestamps with the browser's local zone, which for the
   Hungarian user is the workspace zone. Server-side scheduling uses the stored timestamptz. */
export const pad = (n: number) => String(n).padStart(2, "0");
export const DAYS = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
export const DAYS_SHORT = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
export const MONTHS = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
export const MONTHS_SHORT = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => isoDate(new Date());
export function parseISODate(s: string): Date { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); }
export function addDays(iso: string, n: number): string { const d = parseISODate(iso); d.setDate(d.getDate() + n); return isoDate(d); }
export function addMonths(iso: string, n: number): string { const d = parseISODate(iso); d.setMonth(d.getMonth() + n); return isoDate(d); }
export function localDateTime(iso: string, time: string): Date { const d = parseISODate(iso); const [h, m] = time.split(":").map(Number); d.setHours(h || 0, m || 0, 0, 0); return d; }
export const toTS = (iso: string, time: string) => localDateTime(iso, time).toISOString();
export function dateOf(ts: string): string { return isoDate(new Date(ts)); }
export function timeOf(ts: string): string { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function fmtDate(v: string | Date | null | undefined): string { if (!v) return "–"; const d = typeof v === "string" ? (v.length <= 10 ? parseISODate(v) : new Date(v)) : v; return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}.`; }
export function fmtDT(ts: string | null | undefined, allDay = false): string { if (!ts) return "–"; return allDay ? fmtDate(ts) : `${fmtDate(ts)} ${timeOf(ts)}`; }
export function fmtLong(d: Date): string { return `${DAYS[d.getDay()]}, ${d.getFullYear()}. ${MONTHS[d.getMonth()]} ${d.getDate()}.`; }
export function fmtShort(ts: string): string { const d = new Date(ts); return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}.`; }
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
