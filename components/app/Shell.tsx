"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLayout, type Layout } from "@/lib/layout";
import { useData, useTheme } from "@/lib/data";
import { Icon } from "@/components/ui";
import { todayISO } from "@/lib/date";
import type { Role } from "@/lib/types";
import { CapturePanel } from "./Capture";
import { TaskDetailPanel } from "./TaskDetail";
import { SearchPalette } from "./Search";
import { initials } from "@/lib/format";

/* ---------- URL state ---------- */
export function useUrlState() {
  const router = useRouter(); const sp = useSearchParams(); const path = usePathname();
  const get = useCallback((k: string) => sp.get(k), [sp]);
  const set = useCallback((patch: Record<string, string | null | undefined>, replace = false) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v == null || v === "") p.delete(k); else p.set(k, v); }
    const q = p.toString(); const url = q ? `${path}?${q}` : path;
    if (replace) router.replace(url, { scroll: false }); else router.push(url, { scroll: false });
  }, [sp, path, router]);
  return { get, set, path };
}

/* ---------- shell context ---------- */
export interface ShellCtx { layout: Layout; touch: boolean; role: Role; email: string; name: string; demo: boolean; signOut: () => void; openCapture: (type?: string, prefill?: Record<string, string>) => void; openTask: (id: string) => void; openSearch: () => void; }
const Ctx = createContext<ShellCtx | null>(null);
export const useShell = () => { const c = useContext(Ctx); if (!c) throw new Error("no shell"); return c; };

// phone tab bar: Teendő · Emlékeztető · [+] · Számla · Adatbank (a koncepció szerinti négy fül)
const TABS = [
  { href: "/app", label: "Teendő", icon: Icon.todo, also: [] as string[] },
  { href: "/app/emlekeztetok", label: "Emlékeztető", icon: Icon.bell, also: ["/app/naptar"] },
  { href: "/app/szamlak", label: "Számla", icon: Icon.invoice, also: [] },
  { href: "/app/adatbank", label: "Adatbank", icon: Icon.db, also: ["/app/ugyfelek"] },
];
// tablet / desktop side navigation
const SIDE = [
  { href: "/app", label: "Teendő", icon: Icon.todo, also: [] as string[] },
  { href: "/app/emlekeztetok", label: "Emlékeztetők", icon: Icon.bell, also: [] },
  { href: "/app/naptar", label: "Naptár", icon: Icon.calendar, also: [] },
  { href: "/app/szamlak", label: "Számlák", icon: Icon.invoice, also: [] },
  { href: "/app/adatbank", label: "Adatbank", icon: Icon.db, also: ["/app/ugyfelek"] },
];

export function Shell({ children, email, name, demo, signOut }: { children: React.ReactNode; email: string; name: string; demo: boolean; signOut: () => void }) {
  const { layout, touch } = useLayout(); const path = usePathname(); const { get, set } = useUrlState();
  const data = useData(); const [search, setSearch] = useState(false);
  const base = demo ? "/demo" : "/app";
  const openCapture = useCallback((type?: string, prefill?: Record<string, string>) => set({ uj: type || "menu", ...(prefill || {}) }), [set]);
  const openTask = useCallback((id: string) => set({ t: id }), [set]);
  const openSearch = useCallback(() => setSearch(true), []);
  useEffect(() => { document.body.dataset.layout = layout; return () => { delete document.body.dataset.layout; }; }, [layout]);
  useEffect(() => { const k = (e: KeyboardEvent) => { const tag = (e.target as HTMLElement)?.tagName; const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(s => !s); } if (!typing && !e.metaKey && !e.ctrlKey) { if (e.key === "n" || e.key === "N") { e.preventDefault(); openCapture(); } if (e.key === "/") { e.preventDefault(); setSearch(true); } } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [openCapture]);
  const due = useMemo(() => data ? data.tasks.filter(t => t.status === "open" && t.due_at.slice(0, 10) <= todayISO()).length : 0, [data]);
  const unread = useMemo(() => data ? data.notifications.filter(n => n.status !== "opened").length : 0, [data]);
  const ctx: ShellCtx = useMemo(() => ({ layout, touch, role: data?.role || "viewer", email, name, demo, signOut, openCapture, openTask, openSearch }), [layout, touch, data?.role, email, name, demo, signOut, openCapture, openTask, openSearch]);
  const isActive = (href: string, also: string[] = []) => { const h = href.replace("/app", base); if (href === "/app") return path === base; return path.startsWith(h) || also.some(a => path.startsWith(a.replace("/app", base))); };
  const hrefOf = (href: string) => href.replace("/app", base);

  return (
    <Ctx.Provider value={ctx}>
      <div className="shell" data-layout={layout}>
        {layout !== "phone" && (
          <aside className="side">
            <Link href={base} className="brand"><span className="w">Ben<b>Ade</b></span></Link>
            <button className="btn primary new" onClick={() => openCapture()} title="Új rögzítés (N)">{Icon.plus(20)}<span>Új rögzítés</span></button>
            <nav className="nav">{SIDE.map(n => <Link key={n.href} href={hrefOf(n.href)} aria-current={isActive(n.href, n.also) ? "page" : undefined}>{n.icon(20)}<span>{n.label}</span>{n.href === "/app" && due > 0 && <span className="cnt">{due}</span>}</Link>)}
              <Link href={hrefOf("/app/ertesitesek")} aria-current={isActive("/app/ertesitesek") ? "page" : undefined}>{Icon.alarm(20)}<span>Értesítések</span>{unread > 0 && <span className="cnt">{unread}</span>}</Link>
            </nav>
            <div className="foot">
              <nav className="nav">
                {layout === "desktop" && <Link href={hrefOf("/app/csapat")} aria-current={isActive("/app/csapat") ? "page" : undefined}>{Icon.team(20)}<span>Csapat</span></Link>}
                <Link href={hrefOf("/app/beallitasok")} aria-current={isActive("/app/beallitasok") ? "page" : undefined}>{Icon.gear(20)}<span>Beállítások</span></Link>
              </nav>
              <ThemeToggle />
              <Link href={hrefOf("/app/profil")} className="user" aria-current={isActive("/app/profil") ? "page" : undefined} title="Profil"><span className="avatar" style={{ width: 34, height: 34, borderRadius: 11 }}>{initials(name || email)}</span><div style={{ minWidth: 0 }}><div className="nm">{name || "Profil"}</div><div className="em">{data?.workspace.name || email}</div></div>{layout === "desktop" && <span style={{ marginLeft: "auto", color: "var(--faint)" }}>{Icon.chev(16)}</span>}</Link>
            </div>
          </aside>
        )}
        <div className="main">{children}</div>
        {layout === "phone" && (
          <nav className="tabbar" aria-label="Fő menü">
            {TABS.slice(0, 2).map(n => <Link key={n.href} href={hrefOf(n.href)} aria-current={isActive(n.href, n.also) ? "page" : undefined}>{n.icon(23)}{n.label}{n.href === "/app" && due > 0 && <span className="cnt">{due}</span>}</Link>)}
            <button className="plus" onClick={() => openCapture()} aria-label="Új rögzítés">{Icon.plus(26)}</button>
            {TABS.slice(2).map(n => <Link key={n.href} href={hrefOf(n.href)} aria-current={isActive(n.href, n.also) ? "page" : undefined}>{n.icon(23)}{n.label}</Link>)}
          </nav>
        )}
        <CapturePanel open={!!get("uj")} type={get("uj") || undefined} onClose={() => set({ uj: null, cid: null, vid: null, did: null, edit: null })} />
        <TaskDetailPanel id={get("t")} onClose={() => set({ t: null })} />
        <SearchPalette open={search} onClose={() => setSearch(false)} />
      </div>
    </Ctx.Provider>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label = theme === "light" ? "Nappali" : theme === "dark" ? "Éjszakai" : "Rendszer";
  return <button className="btn quiet sm" style={{ justifyContent: "flex-start", gap: 12, padding: "0 12px", minHeight: 40 }} onClick={() => setTheme(next)} title="Téma váltása">{theme === "dark" ? Icon.moon(18) : Icon.sun(18)}<span>{label} mód</span></button>;
}

/* top bar used by pages */
export function TopBar({ title, sub, actions, back }: { title: string; sub?: string; actions?: React.ReactNode; back?: string }) {
  const { layout, openSearch, name, email } = useShell(); const data = useData();
  const unread = data ? data.notifications.filter(n => n.status !== "opened").length : 0;
  const base = useShell().demo ? "/demo" : "/app";
  return (
    <header className="topbar">
      {back && <Link className="ibtn" href={back} aria-label="Vissza">{Icon.back()}</Link>}
      <div className="grow"><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div>
      <div className="acts">
        {layout === "desktop" ? <button className="searchbtn" onClick={openSearch}>{Icon.search(16)} Keresés… <kbd>⌘K</kbd></button> : <button className="ibtn" onClick={openSearch} aria-label="Keresés">{Icon.search(18)}</button>}
        {layout === "phone" && <Link className="ibtn" href={`${base}/ertesitesek`} aria-label="Értesítések">{Icon.alarm(20)}{unread > 0 && <span className="dot">{unread}</span>}</Link>}
        {actions}
        {layout === "phone" && !back && <Link className="me" href={`${base}/profil`} aria-label="Profil">{initials(name || email || "B")}</Link>}
      </div>
    </header>
  );
}
