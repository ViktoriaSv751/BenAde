"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Repo } from "./repo";
import type { Snapshot, Task } from "./types";
import { taskSubject } from "./repo";

const RepoCtx = createContext<Repo | null>(null);
export const useRepo = () => { const r = useContext(RepoCtx); if (!r) throw new Error("no repo"); return r; };

export function DataProvider({ repo, children }: { repo: Repo; children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } } }));
  return <QueryClientProvider client={qc}><RepoCtx.Provider value={repo}><Realtime repo={repo} />{children}</RepoCtx.Provider></QueryClientProvider>;
}
function Realtime({ repo }: { repo: Repo }) {
  const qc = useQueryClient();
  useEffect(() => { const t: { id?: ReturnType<typeof setTimeout> } = {}; const off = repo.subscribe(() => { clearTimeout(t.id); t.id = setTimeout(() => qc.invalidateQueries({ queryKey: ["snapshot"] }), 250); }); return () => { off(); clearTimeout(t.id); }; }, [repo, qc]);
  return null;
}

export function useSnapshot() {
  const repo = useRepo();
  return useQuery({ queryKey: ["snapshot"], queryFn: () => repo.load() });
}
export function useData(): Snapshot | undefined { return useSnapshot().data; }

/** Run a repo mutation with optimistic patch + invalidate + toast on error. */
export function useMutate() {
  const qc = useQueryClient(); const repo = useRepo(); const toast = useToast();
  return useCallback(async <T,>(fn: (r: Repo) => Promise<T>, opts?: { optimistic?: (s: Snapshot) => Snapshot; success?: string }) => {
    const prev = qc.getQueryData<Snapshot>(["snapshot"]);
    if (opts?.optimistic && prev) qc.setQueryData(["snapshot"], opts.optimistic(structuredClone(prev)));
    try { const r = await fn(repo); if (opts?.success) toast(opts.success, "ok"); await qc.invalidateQueries({ queryKey: ["snapshot"] }); return r; }
    catch (e) { if (prev) qc.setQueryData(["snapshot"], prev); const msg = (e as { message?: string })?.message || "Ismeretlen hiba"; toast(/network|fetch/i.test(msg) ? "Nincs kapcsolat – a módosítás nem mentődött." : "Hiba: " + msg, "err"); throw e; }
  }, [qc, repo, toast]);
}

/* ---------- derived selectors ---------- */
export const openTasks = (s: Snapshot) => s.tasks.filter(t => t.status === "open");
export const isDone = (t: Task) => t.status !== "open";
export const subjectOf = (s: Snapshot, t: Task) => taskSubject(s, t);
export function useSubject() { const s = useData(); return useCallback((t: Task) => (s ? taskSubject(s, t) : ""), [s]); }

/* ---------- toasts ---------- */
type Toast = { id: number; msg: string; kind: "ok" | "err" | ""; action?: { label: string; fn: () => void } };
const ToastCtx = createContext<(msg: string, kind?: Toast["kind"], action?: Toast["action"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([]); const n = useRef(0);
  const push = useCallback((msg: string, kind: Toast["kind"] = "", action?: Toast["action"]) => { const id = ++n.current; setList(l => [...l.slice(-2), { id, msg, kind, action }]); setTimeout(() => setList(l => l.filter(t => t.id !== id)), action ? 6000 : 2800); }, []);
  return <ToastCtx.Provider value={push}>{children}<div className="toasts" aria-live="polite">{list.map(t => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}{t.action && <button onClick={() => { t.action!.fn(); setList(l => l.filter(x => x.id !== t.id)); }}>{t.action.label}</button>}</div>)}</div></ToastCtx.Provider>;
}

/* ---------- theme ---------- */
export type Theme = "system" | "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: "system", setTheme: () => {} });
export const useTheme = () => useContext(ThemeCtx);
export function ThemeProvider({ initial = "system", children }: { initial?: Theme; children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initial);
  useEffect(() => { try { const t = localStorage.getItem("benade.theme") as Theme | null; if (t) setThemeState(t); } catch {} }, []);
  useEffect(() => { const root = document.documentElement; if (theme === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", theme); try { localStorage.setItem("benade.theme", theme); } catch {} }, [theme]);
  const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
