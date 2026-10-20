"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLayout, type Layout } from "@/lib/layout";
import { useData, useMutate, useOnline, useSnapshot, useTheme, useToast } from "@/lib/data";
import { SplashScreen, hideSplash } from "@/components/Splash";
import { setDayRules } from "@/lib/rota";
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
  const snap = useSnapshot(); const data = snap.data; const [search, setSearch] = useState(false);
  setDayRules(data?.workspace.defaults); // Munkarend: the date helpers read the locked days from here
  // brand screen until the first data is in, then the app fades in from it (no skeleton flash after login)
  const ready = !!data || snap.isError; const [boot, setBoot] = useState<"on" | "leaving" | "off">("on");
  const bootAt = useRef(Date.now());
  useEffect(() => { if (!ready) return; hideSplash(); const t = setTimeout(() => setBoot(b => b === "on" ? "leaving" : b), Math.max(0, 1600 - (Date.now() - bootAt.current))); return () => clearTimeout(t); }, [ready]);
  useEffect(() => { if (boot !== "leaving") return; const t = setTimeout(() => setBoot("off"), 900); return () => clearTimeout(t); }, [boot]);
  const base = demo ? "/demo" : "/app";
  const openCapture = useCallback((type?: string, prefill?: Record<string, string>) => set({ uj: type || "menu", ...(prefill || {}) }), [set]);
  const openTask = useCallback((id: string) => set({ t: id }), [set]);
  const openSearch = useCallback(() => setSearch(true), []);
  useEffect(() => { document.body.dataset.layout = layout; return () => { delete document.body.dataset.layout; }; }, [layout]);
  // every new page opens at its top
  // wheel / trackpad over a non-scrolling part of the page (header, margins, side column) scrolls the main list instead of doing nothing
  useEffect(() => {
    const main = document.querySelector<HTMLElement>(".shell .main"); const root = document.querySelector<HTMLElement>(".shell"); if (!main || !root) return;
    const scrollable = (e: HTMLElement) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2; };
    let cache: { t: number; el?: HTMLElement } | null = null;
    const onWheel = (ev: WheelEvent) => {
      if (ev.ctrlKey || Math.abs(ev.deltaY) < Math.abs(ev.deltaX)) return;
      const dy = ev.deltaY * (ev.deltaMode === 1 ? 32 : ev.deltaMode === 2 ? 600 : 1);
      let hx = false; // passed over a sideways-scrolling chip/tab row – Chrome latches the wheel onto it, so we scroll ourselves
      for (let n = ev.target as HTMLElement | null; n && n !== root; n = n.parentElement) {
        if (n.closest(".panel, .asheet, .modal, [role=dialog]")) return;
        const st = getComputedStyle(n);
        if (/(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth + 1) hx = true;
        if (scrollable(n)) { const atTop = n.scrollTop <= 0, atEnd = n.scrollTop + n.clientHeight >= n.scrollHeight - 1; if ((dy < 0 && !atTop) || (dy > 0 && !atEnd)) { if (hx) { n.scrollBy({ top: dy }); ev.preventDefault(); } return; } }
      }
      if (!cache || Date.now() - cache.t > 800) { const cands = Array.from(main.querySelectorAll<HTMLElement>(".content, .pane, .content > *, .content > * > *")).filter(scrollable); cache = { t: Date.now(), el: cands.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] }; }
      const best = cache.el; if (!best) return;
      best.scrollBy({ top: dy }); ev.preventDefault();
    };
    root.addEventListener("wheel", onWheel, { passive: false }); return () => root.removeEventListener("wheel", onWheel);
  }, [path, layout]);
  useEffect(() => { window.scrollTo(0, 0);document.querySelectorAll<HTMLElement>(".main .content, .main .pane").forEach(el => { el.scrollTop = 0; }); }, [path]);
  const online = useOnline(); const mutate = useMutate(); const toast = useToast(); const router = useRouter();
  const [plusMenu, setPlusMenu] = useState(false); const plusTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const plusLong = useRef(false);
  // actions coming from a notification button: ?t=<id>&do=done|tomorrow
  useEffect(() => { const act = get("do"), id = get("t"); if (!act || !id || !data) return; const x = data.tasks.find(y => y.id === id); set({ do: null, t: act === "open" ? id : null }, true); if (!x || x.status !== "open") return;
    if (act === "done") mutate(r => x.type === "invoice" ? r.task.update(id, { paid_at: todayISO(), status: "done", done_at: new Date().toISOString() }) : r.task.complete(id)).then(() => toast("Elvégezve az értesítésből", "ok", { label: "Visszavonás", fn: () => mutate(r => r.task.reopen(id)) }));
    if (act === "tomorrow") mutate(r => r.task.snooze(id, 1), { success: "Holnapra halasztva" }); }, [get, set, data, mutate, toast]);

  useEffect(() => { const k = (e: KeyboardEvent) => { const tag = (e.target as HTMLElement)?.tagName; const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(s => !s); } if (!typing && !e.metaKey && !e.ctrlKey) { if (e.key === "n" || e.key === "N") { e.preventDefault(); openCapture(); } if (e.key === "/") { e.preventDefault(); setSearch(true); } } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [openCapture]);
  const due = useMemo(() => data ? data.tasks.filter(t => t.status === "open" && t.due_at.slice(0, 10) <= todayISO()).length : 0, [data]);
  const unread = useMemo(() => data ? data.notifications.filter(n => n.status !== "opened").length : 0, [data]);
  useEffect(() => { const n = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }; try { if (due > 0) n.setAppBadge?.(due).catch(() => {}); else n.clearAppBadge?.().catch(() => {}); } catch {} }, [due]);
  // desktop keyboard: J/K move between rows, E completes the focused row, ? opens help
  useEffect(() => { const k = (e: KeyboardEvent) => { const el = e.target as HTMLElement; if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.tagName === "SELECT" || el?.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      const rows = [...document.querySelectorAll<HTMLElement>(".main .trow")]; const i = rows.indexOf(document.activeElement as HTMLElement);
      if (e.key === "j" || e.key === "J") { e.preventDefault(); rows[Math.min(rows.length - 1, i + 1)]?.focus(); }
      else if (e.key === "k" || e.key === "K") { e.preventDefault(); rows[Math.max(0, i - 1)]?.focus(); }
      else if ((e.key === "e" || e.key === "E") && i >= 0) { e.preventDefault(); rows[i].querySelector<HTMLButtonElement>(".qb.done")?.click(); }
      else if (e.key === "?") { e.preventDefault(); router.push(`${base}/sugo`); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [router, base]);
  const ctx: ShellCtx = useMemo(() => ({ layout, touch, role: data?.role || "viewer", email, name, demo, signOut, openCapture, openTask, openSearch }), [layout, touch, data?.role, email, name, demo, signOut, openCapture, openTask, openSearch]);
  const isActive = (href: string, also: string[] = []) => { const h = href.replace("/app", base); if (href === "/app") return path === base; return path.startsWith(h) || also.some(a => path.startsWith(a.replace("/app", base))); };
  const hrefOf = (href: string) => href.replace("/app", base);
  const scrollTop = (href: string, also: string[] = []) => { if (!isActive(href, also)) return; document.querySelectorAll<HTMLElement>(".main .content, .main .pane").forEach(el => el.scrollTo({ top: 0, behavior: "smooth" })); };
  const plusDown = () => { plusLong.current = false; plusTimer.current = setTimeout(() => { plusLong.current = true; navigator.vibrate?.(10); setPlusMenu(true); }, 420); };
  const plusUp = () => { if (plusTimer.current) clearTimeout(plusTimer.current); };
  const quick = (k: string) => { setPlusMenu(false); openCapture(k); };

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
                <Link href={hrefOf("/app/sugo")} aria-current={isActive("/app/sugo") ? "page" : undefined}>{Icon.info(20)}<span>Súgó</span></Link>
              </nav>
              <ThemeToggle />
              <Link href={hrefOf("/app/profil")} className="user" aria-current={isActive("/app/profil") ? "page" : undefined} title="Profil"><span className="avatar" style={{ width: 34, height: 34, borderRadius: 11 }}>{initials(name || email)}</span><div style={{ minWidth: 0 }}><div className="nm">{name || "Profil"}</div><div className="em">{data?.workspace.name || email}</div></div>{layout === "desktop" && <span style={{ marginLeft: "auto", color: "var(--faint)" }}>{Icon.chev(16)}</span>}</Link>
            </div>
          </aside>
        )}
        <div className="main">{children}</div>
        {layout === "phone" && (
          <nav className="tabbar" aria-label="Fő menü">
            {TABS.slice(0, 2).map(n => <Link key={n.href} href={hrefOf(n.href)} onClick={() => scrollTop(n.href, n.also)} aria-current={isActive(n.href, n.also) ? "page" : undefined}>{n.icon(23)}{n.label}{n.href === "/app" && due > 0 && <span className="cnt">{due}</span>}</Link>)}
            <button className="plus" onClick={() => { if (plusLong.current) { plusLong.current = false; return; } setPlusMenu(false); openCapture(); }} onTouchStart={plusDown} onTouchEnd={plusUp} onMouseDown={plusDown} onMouseUp={plusUp} onMouseLeave={plusUp} onContextMenu={e => e.preventDefault()} aria-label="Új rögzítés (nyomva tartva gyorsmenü)">{Icon.plus(26)}</button>
            {TABS.slice(2).map(n => <Link key={n.href} href={hrefOf(n.href)} onClick={() => scrollTop(n.href, n.also)} aria-current={isActive(n.href, n.also) ? "page" : undefined}>{n.icon(23)}{n.label}</Link>)}
          </nav>
        )}
        {plusMenu && <><div className="plusmenu-scrim" onClick={() => setPlusMenu(false)} /><div className="plusmenu" role="menu">
          {[["vu_download", "Fedélzeti egység", "t-vu", Icon.truck(20)], ["card_download", "Vezetői kártya", "t-card", Icon.card(20)], ["training", "Oktatás", "t-training", Icon.grad(20)], ["invoice", "Számla", "t-invoice", Icon.invoice(20)]].map(([k, l, c, ic]) => <button key={k as string} role="menuitem" className={c as string} onClick={() => quick(k as string)}><span>{ic}</span>{l}</button>)}
        </div></>}
        {!online && <div className="netbar" role="status"><i />Offline – a legutóbbi adatokat látja</div>}
        <CapturePanel open={!!get("uj")} type={get("uj") || undefined} onClose={() => set({ uj: null, cid: null, vid: null, did: null, edit: null })} />
        <TaskDetailPanel id={get("t")} onClose={() => set({ t: null })} />
        <SearchPalette open={search} onClose={() => setSearch(false)} />
        {boot !== "off" && <SplashScreen leaving={boot === "leaving"} />}
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
  const ref = useRef<HTMLElement>(null); const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const main = ref.current?.parentElement; if (!main) return; let els: HTMLElement[] = []; const on = () => setScrolled(els.some(e => e.scrollTop > 8));
    const bind = () => { els.forEach(e => e.removeEventListener("scroll", on)); els = [...main.querySelectorAll<HTMLElement>(":scope > .content, :scope > .split > .pane:first-child")]; els.forEach(e => e.addEventListener("scroll", on, { passive: true })); on(); };
    bind(); const mo = new MutationObserver(bind); mo.observe(main, { childList: true }); return () => { mo.disconnect(); els.forEach(e => e.removeEventListener("scroll", on)); }; }, []);
  return (
    <header className={`topbar ${scrolled ? "scrolled" : ""}`} ref={ref}>
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
