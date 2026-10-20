"use client";
/* Hungarian date + time pickers.
   DateField: shows "2026. 12. 01., kedd", opens a month grid (Monday first) – bottom sheet on phone, popover on tablet/desktop.
   TimeField: hour + minute columns (5-minute steps) with quick chips.
   Helpers: huHolidays, isWeekendOrHoliday, prevWorkingDay, fmtDateDay, workdayShift. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui";
import { DAYS, MONTHS, MONTHS_SHORT, addDays, addMonths, fmtDate, monthGrid, pad, parseISODate, todayISO } from "@/lib/date";
import { dayOverride, isLocked, rotaActive } from "@/lib/rota";

/* ---------------- holidays ---------------- */
/** Easter Sunday (anonymous Gregorian algorithm). */
function easter(y: number): string {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${pad(month)}-${pad(day)}`;
}
const holCache = new Map<number, Map<string, string>>();
/** Hungarian public holidays of a year: ISO date → name. */
export function huHolidays(y: number): Map<string, string> {
  const hit = holCache.get(y); if (hit) return hit;
  const e = easter(y); const m = new Map<string, string>();
  const add = (iso: string, name: string) => m.set(iso, name);
  add(`${y}-01-01`, "Újév"); add(`${y}-03-15`, "Nemzeti ünnep"); add(addDays(e, -2), "Nagypéntek"); add(addDays(e, 1), "Húsvéthétfő");
  add(`${y}-05-01`, "A munka ünnepe"); add(addDays(e, 50), "Pünkösdhétfő"); add(`${y}-08-20`, "Államalapítás ünnepe"); add(`${y}-10-23`, "Nemzeti ünnep");
  add(`${y}-11-01`, "Mindenszentek"); add(`${y}-12-24`, "Szenteste"); add(`${y}-12-25`, "Karácsony"); add(`${y}-12-26`, "Karácsony másnapja");
  holCache.set(y, m); return m;
}
/** Áthelyezett munkanapok (NGM-rendeletek). "work" = munkanappá váló szombat, "rest" = pihenőnappá váló hétköznap.
 *  2026: 10/2025. (IV. 30.) NGM rendelet. A 2027-es rendelet megjelenésekor ide kell felvenni a napokat. */
export const MOVED_DAYS: Record<string, "work" | "rest"> = {
  "2026-01-02": "rest", "2026-01-10": "work",
  "2026-08-21": "rest", "2026-08-08": "work",
  "2026-12-24": "rest", "2026-12-12": "work",
};
export const shortDay = (iso: string) => { const d = parseISODate(iso); return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}.`; };
export function holidayName(iso: string): string | null { if (!iso) return null; return huHolidays(Number(iso.slice(0, 4))).get(iso.slice(0, 10)) || null; }
/** "szombat" / "vasárnap" / "Nemzeti ünnep (okt. 23.)" – or null on a working day. */
export function isWeekendOrHoliday(iso: string): string | null {
  if (!iso || iso.length < 10) return null;
  if (dayOverride(iso) === "free") return null;
  if (isLocked(iso)) return `lezárt nap (${shortDay(iso)})`;
  const h = holidayName(iso); if (h) return `${h} (${shortDay(iso)})`;
  if (rotaActive()) return null; // with a work pattern the pattern decides, not the weekend
  const mv = MOVED_DAYS[iso.slice(0, 10)];
  if (mv === "work") return null;
  if (mv === "rest") return `áthelyezett pihenőnap (${shortDay(iso)})`;
  const dow = parseISODate(iso).getDay();
  return dow === 6 ? "szombat" : dow === 0 ? "vasárnap" : null;
}
export function prevWorkingDay(iso: string): string { let d = addDays(iso, -1); for (let i = 0; i < 60 && isWeekendOrHoliday(d); i++) d = addDays(d, -1); return d; }
const ONTO = ["vasárnapra", "hétfőre", "keddre", "szerdára", "csütörtökre", "péntekre", "szombatra"];
const ON = ["vasárnap", "hétfőn", "kedden", "szerdán", "csütörtökön", "pénteken", "szombaton"];
/** Human phrasing for moving a weekend/holiday date to the previous working day. */
export function workdayShift(iso: string): { onto: string; prev: string; prevOn: string } | null {
  const lbl = isWeekendOrHoliday(iso); if (!lbl) return null;
  const h = holidayName(iso); const prev = prevWorkingDay(iso); const pd = parseISODate(prev).getDay();
  const far = Math.round((parseISODate(iso).getTime() - parseISODate(prev).getTime()) / 86400000) > 3;
  const mvRest = MOVED_DAYS[iso.slice(0, 10)] === "rest";
  return { onto: isLocked(iso) ? `lezárt napra (${shortDay(iso)})` : h ? `ünnepnapra (${h}, ${shortDay(iso)})` : mvRest ? `áthelyezett pihenőnapra (${shortDay(iso)})` : ONTO[parseISODate(iso).getDay()], prev, prevOn: far ? `${ON[pd]} (${shortDay(prev)})` : ON[pd] };
}
/** "2026. 12. 01., kedd" */
export function fmtDateDay(iso: string | null | undefined): string { if (!iso) return ""; const d = parseISODate(iso); return `${fmtDate(iso)}, ${DAYS[d.getDay()].toLocaleLowerCase("hu-HU")}`; }
function relWord(iso: string): string | null {
  const n = Math.round((parseISODate(iso).getTime() - parseISODate(todayISO()).getTime()) / 86400000);
  if (n === 0) return "ma"; if (n === 1) return "holnap"; if (n === -1) return "tegnap";
  if (n > 1 && n <= 60) return `${n} nap múlva`; if (n < -1 && n >= -60) return `${-n} napja`; return null;
}

/* ---------------- overlay plumbing ---------------- */
const isPhone = () => typeof document !== "undefined" && (document.body.dataset.layout ? document.body.dataset.layout === "phone" : window.innerWidth < 900);

function Overlay({ anchor, onClose, title, children, width = 336 }: { anchor: React.RefObject<HTMLElement | null>; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  const [phone] = useState(isPhone); const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const place = useCallback(() => {
    const a = anchor.current, p = pop.current; if (!a || !p || phone) return;
    const r = a.getBoundingClientRect(); const h = p.offsetHeight; const w = p.offsetWidth;
    let top = r.bottom + 8; if (top + h > window.innerHeight - 8 && r.top - h - 8 > 8) top = r.top - h - 8;
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    setPos(s => (s && s.top === top && s.left === left ? s : { top, left }));
  }, [anchor, phone]);
  useLayoutEffect(() => { place(); });
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); onClose(); } };
    const down = (e: MouseEvent | TouchEvent) => { const t = e.target as Node; if (pop.current?.contains(t) || anchor.current?.contains(t)) return; if (!phone) onClose(); };
    window.addEventListener("keydown", key, true); document.addEventListener("mousedown", down, true); document.addEventListener("touchstart", down, true);
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("keydown", key, true); document.removeEventListener("mousedown", down, true); document.removeEventListener("touchstart", down, true); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [onClose, anchor, phone, place]);
  // return focus to the trigger when closed
  useEffect(() => { const a = anchor.current; return () => { setTimeout(() => a?.focus({ preventScroll: true }), 0); }; }, [anchor]);
  if (phone) return createPortal(
    <div className="dt-sheet-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dt-sheet" role="dialog" aria-modal="true" aria-label={title} ref={pop}>
        <div className="dt-sheet-head"><span className="dt-grab" aria-hidden /><b>{title}</b><button type="button" className="ibtn" onClick={onClose} aria-label="Bezárás">{Icon.x(20)}</button></div>
        {children}
      </div>
    </div>, document.body);
  return createPortal(<div className="dt-pop" role="dialog" aria-label={title} ref={pop} style={{ width, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>{children}</div>, document.body);
}

/* ---------------- calendar ---------------- */
const WEEK = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
type Quick = "today" | "yesterday" | "week" | "month";
const QUICK: Record<Quick, { label: string; iso: () => string }> = {
  today: { label: "Ma", iso: () => todayISO() }, yesterday: { label: "Tegnap", iso: () => addDays(todayISO(), -1) },
  week: { label: "+1 hét", iso: () => addDays(todayISO(), 7) }, month: { label: "+1 hónap", iso: () => addMonths(todayISO(), 1) },
};

function Calendar({ value, min, max, onPick, quick, onClear, clearLabel }: { value: string; min?: string; max?: string; onPick: (iso: string) => void; quick: Quick[]; onClear?: () => void; clearLabel?: string }) {
  const start = value || (max && todayISO() > max ? max : min && todayISO() < min ? min : todayISO());
  const [focus, setFocus] = useState(start);
  const [ym, setYm] = useState(() => ({ y: parseISODate(start).getFullYear(), m: parseISODate(start).getMonth() }));
  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const today = todayISO(); const ref = useRef<HTMLDivElement>(null);
  const off = (iso: string) => (!!min && iso < min) || (!!max && iso > max);
  const mKey = (iso: string) => iso.slice(0, 7); const cur = `${ym.y}-${pad(ym.m + 1)}`;
  const prevOk = !min || mKey(min) < cur; const nextOk = !max || mKey(max) > cur;
  const shift = (n: number) => setYm(s => { const d = new Date(s.y, s.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const moveFocus = (iso: string) => { setFocus(iso); const d = parseISODate(iso); setYm({ y: d.getFullYear(), m: d.getMonth() }); };
  useEffect(() => { ref.current?.querySelector<HTMLButtonElement>(`[data-iso="${focus}"]`)?.focus({ preventScroll: true }); }, [focus, ym]);
  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (map[e.key] != null) { e.preventDefault(); moveFocus(addDays(focus, map[e.key])); }
    else if (e.key === "PageUp" || e.key === "PageDown") { e.preventDefault(); moveFocus(addMonths(focus, e.key === "PageUp" ? -1 : 1)); }
    else if (e.key === "Home" || e.key === "End") { e.preventDefault(); const d = parseISODate(focus); const dow = (d.getDay() + 6) % 7; moveFocus(addDays(focus, e.key === "Home" ? -dow : 6 - dow)); }
  };
  const hols = useMemo(() => grid.filter(iso => iso.slice(0, 7) === cur && (holidayName(iso) || MOVED_DAYS[iso])), [grid, cur]);
  const quicks = quick.map(q => ({ ...QUICK[q], v: QUICK[q].iso() })).filter(q => !off(q.v));
  return <div className="dt-cal">
    <div className="dt-cal-head">
      <button type="button" className="dt-nav" onClick={() => shift(-1)} disabled={!prevOk} aria-label="Előző hónap">{Icon.chevL(18)}</button>
      <b aria-live="polite">{ym.y}. {MONTHS[ym.m]}</b>
      <button type="button" className="dt-nav" onClick={() => shift(1)} disabled={!nextOk} aria-label="Következő hónap">{Icon.chev(18)}</button>
    </div>
    <div className="dt-week" aria-hidden>{WEEK.map((w, i) => <span key={w} className={i > 4 ? "we" : ""}>{w}</span>)}</div>
    <div className="dt-grid" role="grid" ref={ref} onKeyDown={onKey}>
      {grid.map(iso => {
        const d = parseISODate(iso); const dow = d.getDay(); const mv = MOVED_DAYS[iso]; const hol = holidayName(iso) || (mv === "rest" ? "Áthelyezett pihenőnap" : mv === "work" ? "Áthelyezett munkanap" : null); const dis = off(iso);
        const cls = ["dt-day", iso.slice(0, 7) !== cur && "out", (dow === 0 || dow === 6) && mv !== "work" && "we", mv === "work" && "mvwork", (holidayName(iso) || mv === "rest") && "hol", isLocked(iso) && "locked", iso === today && "today", iso === value && "sel"].filter(Boolean).join(" ");
        return <button key={iso} type="button" role="gridcell" data-iso={iso} className={cls} disabled={dis} tabIndex={iso === focus ? 0 : -1} aria-selected={iso === value}
          aria-label={`${d.getFullYear()}. ${MONTHS[d.getMonth()]} ${d.getDate()}., ${DAYS[dow].toLocaleLowerCase("hu-HU")}${hol ? ` – ${hol}` : ""}${isLocked(iso) ? " – lezárt nap" : ""}${iso === today ? " (ma)" : ""}`} title={hol || undefined}
          onClick={() => onPick(iso)}>{d.getDate()}</button>;
      })}
    </div>
    {hols.length > 0 && <div className="dt-hols">{hols.map(h => <span key={h}><i aria-hidden />{shortDay(h)} {holidayName(h) || (MOVED_DAYS[h] === "work" ? "munkanap (áthelyezett)" : "pihenőnap (áthelyezett)")}</span>)}</div>}
    {(quicks.length > 0 || onClear) && <div className="dt-quick">
      {quicks.map(q => <button key={q.label} type="button" className="chip" aria-pressed={q.v === value} onClick={() => onPick(q.v)}>{q.label}</button>)}
      {onClear && <button type="button" className="chip" onClick={onClear}>{clearLabel || "Törlés"}</button>}
    </div>}
  </div>;
}

/* ---------------- DateField ---------------- */
export function DateField({ value, onChange, min, max, label = "Dátum", id, quick, placeholder = "Válasszon dátumot…", allowEmpty, clearLabel, mono = true }: {
  value: string; onChange: (iso: string) => void; min?: string; max?: string; label?: string; id?: string; quick?: Quick[]; placeholder?: string; allowEmpty?: boolean; clearLabel?: string; mono?: boolean;
}) {
  const [open, setOpen] = useState(false); const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const q = quick ?? (["today", "yesterday", "week", "month"] as Quick[]);
  const special = value ? isWeekendOrHoliday(value) : null; const rel = value ? relWord(value) : null;
  return <>
    <button ref={btn} type="button" id={id} className={`ctl dt-trigger ${mono ? "" : "sans"}`} aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${value ? fmtDateDay(value) : "nincs megadva"}`} onClick={() => setOpen(o => !o)}>
      <span className={value ? "v" : "ph"}>{value ? fmtDateDay(value) : placeholder}</span>
      {value && (special || rel) && <span className={`dt-tag ${special ? "warn" : ""}`}>{special && isLocked(value) ? "lezárt nap" : special && holidayName(value) ? "ünnep" : special || rel}</span>}
      <span className="dt-ico" aria-hidden>{Icon.calendar(18)}</span>
    </button>
    {open && <Overlay anchor={btn} onClose={close} title={label}>
      <Calendar value={value} min={min} max={max} quick={q} onPick={iso => { onChange(iso); setOpen(false); }} onClear={allowEmpty && value ? () => { onChange(""); setOpen(false); } : undefined} clearLabel={clearLabel} />
    </Overlay>}
  </>;
}

/* ---------------- TimeField ---------------- */
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const QUICK_TIMES = ["06:00", "08:00", "10:00", "14:00"];
export function TimeField({ value, onChange, id, label = "Időpont", quick = QUICK_TIMES }: { value: string; onChange: (hhmm: string) => void; id?: string; label?: string; quick?: string[] }) {
  const [open, setOpen] = useState(false); const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const [h, m] = (value || "08:00").split(":");
  const mins = useMemo(() => { const base = Array.from({ length: 12 }, (_, i) => pad(i * 5)); return base.includes(m) ? base : [...base, m].sort(); }, [m]);
  const hRef = useRef<HTMLDivElement>(null); const mRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    for (const col of [hRef.current, mRef.current]) { const s = col?.querySelector<HTMLElement>("[aria-pressed='true']"); if (col && s) col.scrollTop = s.offsetTop - col.clientHeight / 2 + s.offsetHeight / 2; }
  }, [open, h, m]);
  useEffect(() => { if (open) setTimeout(() => hRef.current?.querySelector<HTMLElement>("[aria-pressed='true']")?.focus({ preventScroll: true }), 0); }, [open]);
  const colKey = (e: React.KeyboardEvent, list: string[], cur: string, set: (v: string) => void) => {
    const i = list.indexOf(cur); const n = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0; if (!n) return;
    e.preventDefault(); const nx = list[(i + n + list.length) % list.length]; set(nx);
    setTimeout(() => (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(`[data-v="${nx}"]`)?.focus({ preventScroll: true }), 0);
  };
  const setH = (v: string) => onChange(`${v}:${m}`); const setM = (v: string) => onChange(`${h}:${v}`);
  return <>
    <button ref={btn} type="button" id={id} className="ctl dt-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${value || "nincs megadva"}`} onClick={() => setOpen(o => !o)}>
      <span className="v">{value || "--:--"}</span><span className="dt-ico" aria-hidden>{Icon.clock(18)}</span>
    </button>
    {open && <Overlay anchor={btn} onClose={close} title={label} width={260}>
      <div className="dt-time">
        <div className="dt-quick">{quick.map(t => <button key={t} type="button" className="chip" aria-pressed={t === value} onClick={() => { onChange(t); setOpen(false); }}>{t}</button>)}</div>
        <div className="dt-cols">
          <div className="dt-col" ref={hRef} role="listbox" aria-label="Óra" onKeyDown={e => colKey(e, HOURS, h, setH)}>{HOURS.map(x => <button key={x} type="button" data-v={x} role="option" aria-selected={x === h} aria-pressed={x === h} tabIndex={x === h ? 0 : -1} onClick={() => setH(x)}>{x}</button>)}</div>
          <span className="dt-colon" aria-hidden>:</span>
          <div className="dt-col" ref={mRef} role="listbox" aria-label="Perc" onKeyDown={e => colKey(e, mins, m, setM)}>{mins.map(x => <button key={x} type="button" data-v={x} role="option" aria-selected={x === m} aria-pressed={x === m} tabIndex={x === m ? 0 : -1} onClick={() => setM(x)}>{x}</button>)}</div>
        </div>
        <button type="button" className="btn secondary block" onClick={close}>{Icon.check(18)} Kész · {value}</button>
      </div>
    </Overlay>}
  </>;
}
