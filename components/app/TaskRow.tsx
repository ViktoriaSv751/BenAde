"use client";
import { useRef, useState } from "react";
import type { Task } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import { fmtDate, relLabel, timeOf, todayISO } from "@/lib/date";
import { phoneHref } from "@/lib/format";
import { useData, useMutate, useSubject, useToast } from "@/lib/data";
import { Icon, TypeIcon } from "@/components/ui";
import { useShell } from "./Shell";

export function haptic(kind: "ok" | "tap" | "warn" = "tap") {
  try {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (w.Capacitor?.isNativePlatform?.()) { import("@capacitor/haptics").then(m => kind === "ok" ? m.Haptics.notification({ type: m.NotificationType.Success }) : kind === "warn" ? m.Haptics.notification({ type: m.NotificationType.Warning }) : m.Haptics.impact({ style: m.ImpactStyle.Light })).catch(() => {}); return; }
    navigator.vibrate?.(kind === "ok" ? [12, 40, 18] : 10);
  } catch { /* ignore */ }
}

/** One reminder row: tap opens, quick buttons complete / call / snooze, long-press selects. */
export function TaskRow({ t, selected, compact, onOpen, selectMode, checked, onToggle, onLongPress, actions = true }: {
  t: Task; selected?: boolean; compact?: boolean; onOpen?: () => void; swipe?: boolean;
  selectMode?: boolean; checked?: boolean; onToggle?: () => void; onLongPress?: () => void; actions?: boolean;
}) {
  const data = useData(); const subject = useSubject(); const meta = TASK_META[t.type]; const rel = relLabel(t.due_at); const done = t.status !== "open";
  const { openTask } = useShell(); const mutate = useMutate(); const toast = useToast();
  const [leaving, setLeaving] = useState(false); const [menu, setMenu] = useState(false);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null); const long = useRef(false);
  const company = data?.companies.find(c => c.id === t.company_id);
  const phone = t.type === "training" ? (t.contact_phone || company?.phone) : (data?.contacts.find(c => c.company_id === t.company_id && c.is_primary)?.phone || company?.phone);
  const overdue = !done && t.due_at.slice(0, 10) < todayISO();
  const open = () => { if (long.current) { long.current = false; return; } if (selectMode) onToggle?.(); else (onOpen || (() => openTask(t.id)))(); };
  const complete = (e: React.MouseEvent) => {
    e.stopPropagation(); haptic("ok"); setLeaving(true);
    setTimeout(() => {
      const isInv = t.type === "invoice";
      mutate(r => isInv ? r.task.update(t.id, { paid_at: todayISO(), status: "done", done_at: new Date().toISOString() }) : r.task.complete(t.id), { optimistic: s => { const x = s.tasks.find(y => y.id === t.id); if (x) { x.status = "done"; x.done_at = new Date().toISOString(); if (isInv) x.paid_at = todayISO(); } return s; } })
        .then(() => toast(isInv ? "Kifizetve" : meta.cycleKey ? "Elvégezve · új ciklus létrehozva" : "Elvégezve", "ok", { label: "Visszavonás", fn: () => mutate(r => isInv ? r.task.update(t.id, { paid_at: null, status: "open", done_at: null }) : r.task.reopen(t.id)) }))
        .catch(() => setLeaving(false));
    }, 260);
  };
  const snooze = (days: number) => { setMenu(false); haptic(); mutate(r => r.task.snooze(t.id, days), { success: days === 1 ? "Holnapra halasztva" : `${days} nappal halasztva` }); };
  const startPress = () => { if (!onLongPress) return; long.current = false; press.current = setTimeout(() => { long.current = true; haptic(); onLongPress(); }, 480); };
  const endPress = () => { if (press.current) clearTimeout(press.current); };
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div role="button" tabIndex={0} aria-pressed={selectMode ? !!checked : undefined}
      className={`trow ${meta.cls} ${done ? "done" : ""} ${compact ? "compact" : ""} ${overdue ? "is-over" : ""} ${leaving ? "leaving" : ""} ${selectMode ? "selecting" : ""} ${checked ? "checked" : ""}`}
      aria-selected={selected} onClick={open} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
      onTouchStart={startPress} onTouchEnd={endPress} onTouchMove={endPress} onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress} onContextMenu={e => { if (onLongPress) e.preventDefault(); }}>
      {selectMode ? <span className="sel" aria-hidden>{checked ? Icon.check(16) : null}</span> : <span className="ico"><TypeIcon type={t.type} size={compact ? 18 : 22} /></span>}
      <span className="body">
        <span className="when"><span>{fmtDate(t.due_at)}</span>{!t.all_day && <span className="t">{timeOf(t.due_at)}</span>}{done ? <span className="st ok">{t.type === "invoice" ? "Kifizetve" : "Kész"}</span> : <span className={`st ${rel.tone}`}>{rel.text}</span>}</span>
        <span className="name">{meta.name}</span>
        <span className="meta">{subject(t)}</span>
        {t.note && !compact && <span className="note">Megj.: {t.note}</span>}
        {t.type === "invoice" && !done && !compact && <span className="unpaid">Nincs kifizetve</span>}
      </span>
      {actions && !done && !selectMode && (
        <span className="qa" onClick={stop} onMouseDown={stop} onTouchStart={stop}>
          {phone && !compact && <a className="qb" href={phoneHref(phone)} aria-label="Hívás" title="Hívás">{Icon.phone(17)}</a>}
          {!compact && <span className="qwrap"><button type="button" className="qb" aria-label="Halasztás" title="Halasztás" onClick={() => setMenu(m => !m)}>{Icon.snooze(17)}</button>
            {menu && <span className="qmenu" role="menu"><button role="menuitem" onClick={() => snooze(1)}>Holnapra</button><button role="menuitem" onClick={() => snooze(3)}>3 nappal</button><button role="menuitem" onClick={() => snooze(7)}>1 héttel</button></span>}</span>}
          <button type="button" className="qb done" aria-label={t.type === "invoice" ? "Kifizetve" : "Elvégezve"} title={t.type === "invoice" ? "Kifizetve" : "Elvégezve"} onClick={complete}>{Icon.check(18)}</button>
        </span>
      )}
    </div>
  );
}
