"use client";
import { useRef, useState } from "react";
import type { Task } from "@/lib/types";
import { TASK_META } from "@/lib/types";
import { fmtDate, relLabel, timeOf } from "@/lib/date";
import { useSubject, useMutate, useToast } from "@/lib/data";
import { Icon, TypeIcon } from "@/components/ui";
import { useShell } from "./Shell";

export function TaskRow({ t, selected, compact, onOpen, swipe = false }: { t: Task; selected?: boolean; compact?: boolean; onOpen?: () => void; swipe?: boolean }) {
  const subject = useSubject(); const meta = TASK_META[t.type]; const rel = relLabel(t.due_at); const done = t.status !== "open";
  const { openTask, touch } = useShell(); const mutate = useMutate(); const toast = useToast();
  const [dx, setDx] = useState(0); const start = useRef<{ x: number; y: number } | null>(null); const [drag, setDrag] = useState(false);
  const open = onOpen || (() => openTask(t.id));
  const complete = () => mutate(r => r.task.complete(t.id), { optimistic: s => { const x = s.tasks.find(y => y.id === t.id); if (x) x.status = "done"; return s; } }).then(() => toast("Elvégezve", "ok", { label: "Visszavonás", fn: () => mutate(r => r.task.reopen(t.id)) }));
  const snooze = () => mutate(r => r.task.snooze(t.id, 1), { success: "Emlékeztető holnapra halasztva" });
  const onTS = (e: React.TouchEvent) => { if (!swipe || !touch || done) return; start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; setDrag(true); };
  const onTM = (e: React.TouchEvent) => { if (!start.current) return; const dx = e.touches[0].clientX - start.current.x; const dy = e.touches[0].clientY - start.current.y; if (Math.abs(dy) > Math.abs(dx)) { start.current = null; setDx(0); return; } setDx(Math.max(-120, Math.min(120, dx))); };
  const onTE = () => { if (!start.current) { setDrag(false); return; } const v = dx; start.current = null; setDrag(false); setDx(0); if (v < -80) complete(); else if (v > 80) snooze(); };
  const body = (
    <button className={`trow ${meta.cls} ${done ? "done" : ""} ${compact ? "compact" : ""}`} aria-selected={selected} onClick={open} style={dx ? { transform: `translateX(${dx}px)`, transition: drag ? "none" : "transform .2s" } : undefined} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
      <span className="ico"><TypeIcon type={t.type} size={compact ? 18 : 22} /></span>
      <span className="body">
        <span className="when"><span>{fmtDate(t.due_at)}</span>{!t.all_day && <span className="t">{timeOf(t.due_at)}</span>}</span>
        <span className="name" style={{ display: "block" }}>{meta.name}</span>
        <span className="meta" style={{ display: "block" }}>{subject(t)}</span>
        {t.note && !compact && <span className="note" style={{ display: "block" }}>Megj.: {t.note}</span>}
      </span>
      <span className="right">
        {done ? <span className="badge ok">{t.type === "invoice" ? "Kifizetve" : "Kész"}</span> : <span className={`badge ${rel.tone}`}>{rel.text}</span>}
        {t.type === "invoice" && !done && !compact && <span className="badge plain" style={{ fontSize: 10.5 }}>nincs kifizetve</span>}
      </span>
    </button>
  );
  if (!swipe || !touch || done) return body;
  return <div className="swipe"><div className="under" style={{ background: dx < 0 ? "var(--ok)" : dx > 0 ? "var(--time)" : "transparent" }}><span className="l">{Icon.snooze(18)} Holnap</span><span className="r">Elvégezve {Icon.check(18)}</span></div>{body}</div>;
}
