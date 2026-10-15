"use client";
import { useEffect, useState } from "react";
import { fmtDT } from "@/lib/date";
import { useData, useMutate, useToast } from "@/lib/data";
import { Chips, Empty, Icon, PagedList, Skeleton, Switch } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { TopBar, useShell } from "./Shell";
import { PushSetup } from "./PushSetup";
import { subscribeWebPush, pushSupport } from "@/lib/push";

export function NotificationsView() {
  const data = useData(); const mutate = useMutate(); const { openTask, demo, layout } = useShell(); const toast = useToast();
  const [push, setPush] = useState<"unknown" | "unsupported" | "denied" | "off" | "on">("unknown");
  const [flt, setFlt] = useState<"all" | "unread" | "today" | "inv">("all");
  useEffect(() => { pushSupport().then(setPush); }, []);
  if (!data) return <><TopBar title="Értesítések" /><div className="content"><Skeleton /></div></>;
  const nowIso = new Date().toISOString(); const all = data.notifications.filter(n => n.scheduled_at <= nowIso); const unread = all.filter(n => n.status !== "opened");
  const today = new Date().toISOString().slice(0, 10);
  const list = all.filter(n => flt === "unread" ? n.status !== "opened" : flt === "today" ? n.scheduled_at.slice(0, 10) === today : flt === "inv" ? (n.task_id && data.tasks.find(t => t.id === n.task_id)?.type === "invoice") : true);
  const sendTest = async () => {
    if (demo) { toast("A tesztfiókban nincs valódi push."); return; }
    const sb = createClient(); const { data: u } = await sb.auth.getUser();
    const { error } = await sb.from("notifications").insert({ workspace_id: data.workspace.id, user_id: u.user?.id, channel: "push", scheduled_at: new Date().toISOString(), status: "scheduled", title: "BenAde teszt", body: "Ha ezt látja, az értesítések működnek ezen az eszközön." });
    toast(error ? "Nem sikerült: " + error.message : "Teszt értesítés elküldve – egy percen belül megérkezik.", error ? "err" : "ok");
  };
  const prefs = data.profile.notif_prefs;
  const setPref = (k: keyof typeof prefs, v: boolean) => mutate(r => r.profile.update({ notif_prefs: { ...prefs, [k]: v } }), { optimistic: s => ({ ...s, profile: { ...s.profile, notif_prefs: { ...s.profile.notif_prefs, [k]: v } } }) });
  const enablePush = async () => { if (demo) { toast("A tesztfiókban nincs valódi push – Apple- vagy Google-belépés után bekapcsolható."); return; } const r = await subscribeWebPush(); setPush(r); toast(r === "on" ? "Push értesítés bekapcsolva ezen az eszközön." : r === "denied" ? "A böngésző letiltotta az értesítéseket – engedélyezze a címsorban." : "Nem sikerült bekapcsolni.", r === "on" ? "ok" : "err"); };
  const prefsEl = (
    <><PushSetup />
    <div className="card" style={{ padding: "4px 16px" }}>
      <div className="srow"><div><div className="k">Push értesítések</div><div className="d">Határidők és oktatás-emlékeztetők</div></div><Switch checked={prefs.push} onChange={v => setPref("push", v)} label="Push" /></div>
      <div className="srow"><div><div className="k">E-mail</div><div className="d">Ugyanazok e-mailben is – a levélküldő beállítása után indul</div></div><Switch checked={prefs.email} onChange={v => setPref("email", v)} label="E-mail" /></div>
      <div className="srow"><div><div className="k">Reggeli összefoglaló</div><div className="d">Minden nap 07:00 – a nap teendői</div></div><Switch checked={prefs.dailyDigest} onChange={v => setPref("dailyDigest", v)} label="Napi" /></div>
      <div className="srow"><div><div className="k">Heti előretekintés</div><div className="d">Hétfő 07:00 – a hét letöltései és számlái</div></div><Switch checked={prefs.weeklyDigest} onChange={v => setPref("weeklyDigest", v)} label="Heti" /></div>
      <div className="srow"><div><div className="k">Csendes időszak</div><div className="d">{data.workspace.defaults.quietFrom}–{data.workspace.defaults.quietTo} között nem jön push (beállításokban módosítható)</div></div></div>
    </div></>
  );
  const feed = (
    <>
      <div className="sec" style={{ marginTop: 32 }}><h2>Előzmények</h2>{unread.length > 0 && <button className="btn quiet sm" onClick={() => mutate(r => r.notification.markAllOpened())}>Mind olvasott</button>}</div>
      <Chips value={flt} onChange={setFlt} options={[{ value: "all", label: "Mind", count: all.length }, { value: "unread", label: "Olvasatlan", count: unread.length }, { value: "today", label: "Ma" }, { value: "inv", label: "Számlák" }]} />
      {list.length === 0 ? <Empty icon={Icon.bell(26)} title="Még nincs értesítés" text="Itt jelennek meg az elküldött emlékeztetők. Az első a következő határidő előtt 7 nappal érkezik." />
        : <PagedList items={list} resetKey={flt} render={n => <button key={n.id} className="trow" style={{ opacity: n.status === "opened" ? .72 : 1 }} onClick={() => { if (n.status !== "opened") mutate(r => r.notification.markOpened(n.id)); if (n.task_id) openTask(n.task_id); }}>
          <span className="ico" style={{ background: n.status === "opened" ? "var(--surface-3)" : "var(--accent-soft)", color: n.status === "opened" ? "var(--muted)" : "var(--accent)" }}>{Icon.bell(18)}</span>
          <span className="body"><div className="name">{n.title}</div><div className="meta">{n.body}</div><div className="note" style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="mono">{fmtDT(n.scheduled_at)}</span>{n.status !== "opened" && <span className="badge today">új</span>}</div></span>
        </button>} />}
    </>
  );
  return <>
    <TopBar title="Értesítések" back={layout === "phone" ? `${demo ? "/demo" : "/app"}/profil` : undefined} sub={unread.length ? `${unread.length} olvasatlan` : undefined} />
    {layout === "phone" ? <div className="content"><div className="sec" style={{ marginTop: 0 }}><h2>Csatornák</h2></div>{prefsEl}{feed}</div>
      : <div className="split"><div className="pane"><div className="content">{feed}</div></div><div className="pane detail"><div className="inner"><div className="sec" style={{ marginTop: 0 }}><h2>Csatornák</h2></div>{prefsEl}<div className="info" style={{ marginTop: 14 }}>{Icon.info()}<span>Natív iOS/Android alkalmazásban a push a rendszeren keresztül érkezik; weben a böngésző kéri az engedélyt. Az emlékeztetők időpontja a tételnél állítható.</span></div></div></div></div>}
  </>;
}
