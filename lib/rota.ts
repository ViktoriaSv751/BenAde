/* Munkarend: locked days from a repeating pattern (n work days, then m locked days) plus manual per-day overrides.
   Stored in workspace.defaults (workRota, dayOverrides); the same rule runs in SQL (supabase/migration_work_rota.sql),
   which moves reminders off locked days for every task, including the ones the database creates itself. */
import type { WorkRota, WorkspaceDefaults } from "./types";
import { addDays, dateOf, parseISODate, timeOf, toTS } from "./date";

type Rules = { rota?: WorkRota | null; ov?: Record<string, "lock" | "free"> };
let rules: Rules = {};
/** The shell keeps the current workspace's rules here, so the date helpers can use them anywhere. */
export function setDayRules(d: WorkspaceDefaults | undefined) { rules = { rota: d?.workRota, ov: d?.dayOverrides }; }
export const rotaActive = (r: WorkRota | null | undefined = rules.rota): r is WorkRota => !!r && r.enabled && !!r.start && r.on >= 1 && r.off >= 1;

/** Is the day locked by the pattern alone (ignoring manual changes)? */
export function rotaLocked(iso: string, r: WorkRota | null | undefined = rules.rota): boolean {
  if (!rotaActive(r)) return false;
  const n = r.on + r.off; const k = Math.round((parseISODate(iso).getTime() - parseISODate(r.start).getTime()) / 86400000);
  return ((k % n) + n) % n >= r.on;
}
export const dayOverride = (iso: string) => rules.ov?.[iso.slice(0, 10)] || null;
/** Locked = manually locked, or locked by the pattern and not manually freed. */
export function isLocked(iso: string, def?: WorkspaceDefaults): boolean {
  const ov = def ? def.dayOverrides?.[iso.slice(0, 10)] : dayOverride(iso);
  if (ov) return ov === "lock";
  return rotaLocked(iso.slice(0, 10), def ? def.workRota : rules.rota);
}
export function prevFreeDay(iso: string): string { let d = addDays(iso, -1); for (let i = 0; i < 60 && isLocked(d); i++) d = addDays(d, -1); return d; }

/** Reminders that fall on a locked day move to the last free day before it, same time (as the database does). */
export function shiftLocked(list: string[]): string[] {
  const now = Date.now(); const out = new Set<string>();
  for (const r of list) {
    if (new Date(r).getTime() <= now || !isLocked(dateOf(r))) { out.add(r); continue; }
    let d = dateOf(r); for (let i = 0; i < 60 && isLocked(d); i++) d = addDays(d, -1);
    const nr = toTS(d, timeOf(r)); if (new Date(nr).getTime() > now) out.add(nr);
  }
  return [...out].sort();
}

/** New overrides after setting several days to locked (true) or open (false); overrides equal to the pattern are dropped. */
export function setDays(def: WorkspaceDefaults, days: string[], lock: boolean, today: string): Record<string, "lock" | "free"> {
  const ov: Record<string, "lock" | "free"> = {};
  for (const [k, v] of Object.entries(def.dayOverrides || {})) if (k >= addDays(today, -30)) ov[k] = v;
  for (const d of days) { if (lock === rotaLocked(d, def.workRota)) delete ov[d]; else ov[d] = lock ? "lock" : "free"; }
  return ov;
}
/** The run of consecutive locked days that contains `iso` (at most a month each way). */
export function lockedBlock(iso: string, def: WorkspaceDefaults): string[] {
  if (!isLocked(iso, def)) return [];
  let a = iso, b = iso;
  for (let i = 0; i < 31 && isLocked(addDays(a, -1), def); i++) a = addDays(a, -1);
  for (let i = 0; i < 31 && isLocked(addDays(b, 1), def); i++) b = addDays(b, 1);
  const out: string[] = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out;
}
