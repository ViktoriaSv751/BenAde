"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { SearchHit } from "@/lib/types";
import { useRepo } from "@/lib/data";
import { Icon } from "@/components/ui";
import { useShell, useUrlState } from "./Shell";

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const repo = useRepo(); const router = useRouter(); const { set } = useUrlState(); const { demo } = useShell();
  const [q, setQ] = useState(""); const [hits, setHits] = useState<SearchHit[]>([]); const [i, setI] = useState(0); const ref = useRef<HTMLInputElement>(null);
  const base = demo ? "/demo" : "/app";
  useEffect(() => { if (open) { setQ(""); setHits([]); setI(0); setTimeout(() => ref.current?.focus(), 20); } }, [open]);
  useEffect(() => { if (!open || q.trim().length < 2) { setHits([]); return; } const h = setTimeout(() => repo.search(q.trim()).then(r => { setHits(r); setI(0); }).catch(() => setHits([])), 150); return () => clearTimeout(h); }, [q, open, repo]);
  if (!open) return null;
  const go = (h: SearchHit) => { onClose(); if (h.kind === "task") set({ t: h.id }); else if (h.kind === "company") router.push(`${base}/ugyfelek/${h.id}`); else router.push(`${base}/ugyfelek/${h.company_id}?tab=${h.kind === "vehicle" ? "vehicles" : "drivers"}`); };
  const groups: { k: SearchHit["kind"]; label: string }[] = [{ k: "company", label: "Cégek" }, { k: "vehicle", label: "Járművek" }, { k: "driver", label: "Gépkocsivezetők" }, { k: "task", label: "Teendők és számlák" }];
  const flat = groups.flatMap(g => hits.filter(h => h.kind === g.k));
  return createPortal(
    <div className="palette" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="box" role="dialog" aria-modal="true" aria-label="Keresés">
        <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Rendszám, cég, sofőr, számlaszám…" onKeyDown={e => { if (e.key === "Escape") onClose(); if (e.key === "ArrowDown") { e.preventDefault(); setI(x => Math.min(flat.length - 1, x + 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setI(x => Math.max(0, x - 1)); } if (e.key === "Enter" && flat[i]) go(flat[i]); }} />
        <div className="res">
          {q.trim().length < 2 ? <div className="grp" style={{ padding: 16 }}>Írjon be legalább 2 karaktert. Tipp: a rendszám kötőjel nélkül is találat.</div>
            : flat.length === 0 ? <div className="grp" style={{ padding: 16 }}>Nincs találat erre: „{q}”.</div>
            : groups.map(g => { const list = hits.filter(h => h.kind === g.k); if (!list.length) return null; return <div key={g.k}><div className="grp">{g.label}</div>{list.map(h => { const idx = flat.indexOf(h); return <button key={h.kind + h.id} className="hit" aria-selected={idx === i} onMouseEnter={() => setI(idx)} onClick={() => go(h)}><span className="avatar" style={{ width: 34, height: 34, borderRadius: 10 }}>{h.kind === "company" ? Icon.users(16) : h.kind === "vehicle" ? Icon.truck(16) : h.kind === "driver" ? Icon.user(16) : Icon.file(16)}</span><span style={{ minWidth: 0 }}><div className={`t ${h.kind === "vehicle" ? "mono" : ""}`}>{h.title}</div><div className="s">{h.subtitle}</div></span><span style={{ marginLeft: "auto", color: "var(--faint)" }}>{Icon.chev(16)}</span></button>; })}</div>; })}
        </div>
      </div>
    </div>, document.body);
}
