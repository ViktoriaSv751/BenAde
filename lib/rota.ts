/* Munkarend: locked days = the days the user works elsewhere (no reminders then). A repeating pattern – from the first
   work day, `work` locked days, then `free` open days – plus manual per-day overrides.
   Stored in workspace.defaults (workRota, dayOverrides); the same rule runs in SQL (supabase/migration_work_rota.sql),
   which moves reminders off locked days for every task, including the ones the database creates itself. */
import type { WorkRota, WorkspaceDefaults } from "./types";
import { addDays, dateOf, parseISODate, timeOf, toTS } from "./date";

type Rules = { rota?: WorkRota | null; ov?: Record<string, "lock" | "free"> };
let rules: Rules = {};
/** The shell keeps the current workspace's rules here, so the date helpers can use them anywhere. */
export function setDayRules(d: WorkspaceDefaults | undefined) { rules = { rota: d?.workRota, ov: d?.dayOverrides }; }
/** The pattern as { start = first work day, work, free }; the legacy { on, off } shape is converted. Null when off / incomplete. */
export function rotaPattern(r: WorkRota | null | undefined = rules.rota): { start: string; work: number; free: number } | null {
  if (!r || !r.enabled || !r.start) return null;
  if (r.work != null) return r.work >= 1 && (r.free ?? 0) >= 1 ? { start: r.start, work: r.work, free: r.free! } : null;
  return (r.on ?? 0) >= 1 && (r.off ?? 0) >= 1 ? { start: addDays(r.start, r.on!), work: r.off!, free: r.on! } : null;
}
export const rotaActive = (r: WorkRota | null | undefined = rules.rota) => !!rotaPattern(r);

/** Is the day locked by the pattern alone (ignoring manual changes)? */
export function rotaLocked(iso: string, r: WorkRota | null | undefined = rules.rota): boolean {
  const p = rotaPattern(r); if (!p) return false;
  const k = Math.round((parseISODate(iso).getTime() - parseISODate(p.start).getTime()) / 86400000);
  return k >= 0 && k % (p.work + p.free) < p.work; // only from the first work day on
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
