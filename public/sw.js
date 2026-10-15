/* BenAde service worker: web push with quick actions + notification click */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: "BenAde", body: e.data && e.data.text() }; }
  const url = d.url || "/app"; const isTask = /[?&]t=/.test(url);
  e.waitUntil(self.registration.showNotification(d.title || "BenAde emlékeztető", {
    body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", tag: d.tag || url || "benade", renotify: true,
    data: { url }, actions: isTask ? [{ action: "done", title: "Kész" }, { action: "tomorrow", title: "Holnap" }] : [],
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  let url = (e.notification.data && e.notification.data.url) || "/app";
  if (e.action === "done" || e.action === "tomorrow") url += (url.includes("?") ? "&" : "?") + "do=" + e.action;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => { for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } } return self.clients.openWindow(url); }));
});
