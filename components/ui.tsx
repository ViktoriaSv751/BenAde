"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TaskType } from "@/lib/types";
import { Icon } from "@/components/icons";

export { Icon } from "@/components/icons";
export function TypeIcon({ type, size = 22 }: { type: TaskType; size?: number }) {
  switch (type) { case "vu_download": return Icon.truck(size); case "card_download": return Icon.card(size); case "calibration": return Icon.gauge(size); case "card_expiry": return Icon.idcard(size); case "training": return Icon.grad(size); case "invoice": return Icon.invoice(size); }
}

/* ---------- primitives ---------- */
export function Field({ label, hint, error, children, required, id }: { label: string; hint?: string; error?: string; required?: boolean; id?: string; children: React.ReactNode }) {
  return <div className="field"><label htmlFor={id}>{label}{required && <span style={{ color: "var(--danger)" }}> *</span>}</label>{children}{error ? <div className="err">{error}</div> : hint ? <div className="hint">{hint}</div> : null}</div>;
}
export function Seg<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; ariaLabel?: string }) {
  return <div className="seg" role="tablist" aria-label={ariaLabel}>{options.map(o => <button key={o.value} role="tab" aria-pressed={value === o.value} aria-selected={value === o.value} onClick={() => onChange(o.value)}>{o.label}{o.count != null && <span className="k" style={{ marginLeft: 6, opacity: .7 }}>{o.count}</span>}</button>)}</div>;
}
export function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return <div className="chips" role="tablist">{options.map(o => <button key={o.value} className="chip" role="tab" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}{o.count != null && <span className="k">{o.count}</span>}</button>)}</div>;
}
export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return <div className="tabs" role="tablist">{options.map(o => <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}>{o.label}{o.count != null && <span className="k">{o.count}</span>}</button>)}</div>;
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}
export function Ring({ pct, size = 56, tone, children, cls }: { pct: number; size?: number; tone?: "over" | "done"; children?: React.ReactNode; cls?: string }) {
  return <div className={`ring ${tone || ""} ${cls || ""}`} style={{ width: size, height: size, ["--p" as string]: Math.max(0, Math.min(100, pct)) }}>{children}</div>;
}
export function Empty({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return <div className="empty">{icon && <div className="ico">{icon}</div>}<h3>{title}</h3>{text && <p>{text}</p>}{action}</div>;
}
export function Skeleton({ h = 64, n = 3 }: { h?: number; n?: number }) { return <div className="list">{Array.from({ length: n }).map((_, i) => <div key={i} className="skel" style={{ height: h }} />)}</div>; }

/* ---------- panel (side panel / bottom sheet) ---------- */
export function Panel({ open, onClose, title, children, footer, wide, back }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean; back?: () => void }) {
  const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; }; }, [open, onClose]);
  if (!mounted || !open) return null;
  return createPortal(
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`panel ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
        <div className="phead">{back ? <button className="ibtn" onClick={back} aria-label="Vissza">{Icon.back()}</button> : null}<h2>{title}</h2><button className="ibtn" onClick={onClose} aria-label="Bezárás">{Icon.x()}</button></div>
        <div className="pbody">{children}</div>
        {footer && <div className="pfoot">{footer}</div>}
      </div>
    </div>, document.body);
}
export function Confirm({ open, title, text, okLabel = "Rendben", danger, onOk, onCancel, confirmWord }: { open: boolean; title: string; text: string; okLabel?: string; danger?: boolean; onOk: () => void; onCancel: () => void; confirmWord?: string }) {
  const [w, setW] = useState(""); const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) { setW(""); setTimeout(() => ref.current?.focus(), 30); } }, [open]);
  if (!open) return null;
  return createPortal(<div className="dialog" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}><div className="box" role="alertdialog" aria-modal="true"><h3>{title}</h3><p>{text}</p>{confirmWord && <input className="ctl" style={{ marginTop: 14 }} placeholder={confirmWord} value={w} onChange={e => setW(e.target.value)} />}<div className="acts"><button className="btn ghost" onClick={onCancel}>Mégse</button><button ref={ref} className={`btn ${danger ? "danger" : "primary"}`} disabled={!!confirmWord && w.trim().toUpperCase() !== confirmWord} onClick={onOk}>{okLabel}</button></div></div></div>, document.body);
}
export function useConfirm() {
  const [st, setSt] = useState<{ title: string; text: string; okLabel?: string; danger?: boolean; confirmWord?: string; resolve: (v: boolean) => void } | null>(null);
  const confirm = (o: { title: string; text: string; okLabel?: string; danger?: boolean; confirmWord?: string }) => new Promise<boolean>(resolve => setSt({ ...o, resolve }));
  const el = <Confirm open={!!st} title={st?.title || ""} text={st?.text || ""} okLabel={st?.okLabel} danger={st?.danger} confirmWord={st?.confirmWord} onOk={() => { st?.resolve(true); setSt(null); }} onCancel={() => { st?.resolve(false); setSt(null); }} />;
  return { confirm, confirmEl: el };
}
export function Copyable({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return <button className="btn quiet sm" style={{ gap: 6, fontFamily: "var(--font-mono)" }} onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); } catch {} }}>{text} {ok ? Icon.check(14) : Icon.copy(14)}</button>;
}
