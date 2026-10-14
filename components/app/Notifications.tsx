"use client";
import { useEffect, useState } from "react";
import { fmtDT } from "@/lib/date";
import { useData, useMutate, useToast } from "@/lib/data";
import { Empty, Icon, Skeleton, Switch } from "@/components/ui";
import { TopBar, useShell } from "./Shell";
import { subscribeWebPush, pushSupport } from "@/lib/push";

export function NotificationsView() {
  const data = useData(); const mutate = useMutate(); const { openTask, demo, layout } = useShell(); const toast = useToast();
  const [push, setPush] = useState<"unknown" | "unsupported" | "denied" | "off" | "on">("unknown");
  useEffect(() => { pushSupport().then(setPush); }, []);
  if (!data) return <><TopBar title="Értesítések" /><div className="content"><Skeleton /></div></>;
  const list = data.notifications; const unread = list.filter(n => n.status !== "opened");
  const prefs = data.profile.notif_prefs;
  const setPref = (k: keyof typeof prefs, v: boolean) => mutate(r => r.profile.update({ notif_prefs: { ...prefs, [k]: v } }), { optimistic: s => ({ ...s, profile: { ...s.profile, notif_prefs: { ...s.profile.notif_prefs, [k]: v } } }) });
  const enablePush = async () => { if (demo) { toast("Bemutató módban nincs valódi push."); return; } const r = await subscribeWebPush(); setPush(r); toast(r === "on" ? "Push értesítés bekapcsolva ezen az eszközön." : r === "denied" ? "A böngésző letiltotta az értesítéseket – engedélyezze a címsorban." : "Nem sikerült bekapcsolni.", r === "on" ? "ok" : "err"); };
  const prefsEl = (
    <div className="card" style={{ padding: "4px 16px" }}>
      <div className="srow"><div><div className="k">Push ezen az eszközön</div><div className="d">{push === "on" ? "Bekapcsolva" : push === "unsupported" ? "Ez a böngésző nem támogatja (iPhone-on: Főképernyőhöz adás után)" : push === "denied" ? "Letiltva a böngészőben" : "Kikapcsolva"}</div></div>{push === "on" ? <span className="pill ok">aktív</span> : <button className="btn secondary sm" onClick={enablePush} disabled={push === "unsupported"}>Bekapcsolás</button>}</div>
      <div className="srow"><div><div className="k">Push értesítések</div><div className="d">Határidők és oktatás-emlékeztetők</div></div><Switch checked={prefs.push} onChange={v => setPref("push", v)} label="Push" /></div>
      <div className="srow"><div><div className="k">E-mail</div><div className="d">Ugyanazok e-mailben is</div></div><Switch checked={prefs.email} onChange={v => setPref("email", v)} label="E-mail" /></div>
      <div className="srow"><div><div className="k">Reggeli összefoglaló</div><div className="d">Minden nap 07:00 – a nap teendői</div></div><Switch checked={prefs.dailyDigest} onChange={v => setPref("dailyDigest", v)} label="Napi" /></div>
      <div className="srow"><div><div className="k">Heti előretekintés</div><div className="d">Hétfő 07:00 – a hét letöltései és számlái</div></div><Switch checked={prefs.weeklyDigest} onChange={v => setPref("weeklyDigest", v)} label="Heti" /></div>
      <div className="srow"><div><div className="k">Csendes időszak</div><div className="d">{data.workspace.defaults.quietFrom}–{data.workspace.defaults.quietTo} között nem jön push (beállításokban módosítható)</div></div></div>
    </div>
  );
  const feed = (
    <>
      <div className="sec" style={{ marginTop: 0 }}><h2>Előzmények</h2>{unread.length > 0 && <button className="btn quiet sm" onClick={() => mutate(r => r.notification.markAllOpened())}>Mind olvasott</button>}</div>
      {list.length === 0 ? <Empty icon={Icon.bell(26)} title="Még nincs értesítés" text="Itt jelennek meg az elküldött emlékeztetők. Az első a következő határidő előtt 7 nappal érkezik." />
        : <div className="list">{list.map(n => <button key={n.id} className="trow" style={{ opacity: n.status === "opened" ? .72 : 1 }} onClick={() => { if (n.status !== "opened") mutate(r => r.notification.markOpened(n.id)); if (n.task_id) openTask(n.task_id); }}>
          <span className="ico" style={{ background: n.status === "opened" ? "var(--surface-3)" : "var(--accent-soft)", color: n.status === "opened" ? "var(--muted)" : "var(--accent)" }}>{Icon.bell(18)}</span>
          <span className="body"><div className="name">{n.title}</div><div className="meta">{n.body}</div><div className="note" style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="mono">{fmtDT(n.scheduled_at)}</span>{n.status !== "opened" && <span className="badge today">új</span>}</div></span>
        </button>)}</div>}
    </>
  );
  return <>
    <TopBar title="Értesítések" sub={unread.length ? `${unread.length} olvasatlan` : undefined} />
    {layout === "phone" ? <div className="content"><div className="sec" style={{ marginTop: 0 }}><h2>Csatornák</h2></div>{prefsEl}{feed}</div>
      : <div className="split"><div className="pane"><div className="content">{feed}</div></div><div className="pane detail"><div className="inner"><div className="sec" style={{ marginTop: 0 }}><h2>Csatornák</h2></div>{prefsEl}<div className="info" style={{ marginTop: 14 }}>{Icon.info()}<span>Natív iOS/Android alkalmazásban a push a rendszeren keresztül érkezik; weben a böngésző kéri az engedélyt. Az emlékeztetők időpontja a tételnél állítható.</span></div></div></div></div>}
  </>;
}
