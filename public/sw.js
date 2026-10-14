/* BenAde service worker: web push + notification click */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: "BenAde", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "BenAde emlékeztető", { body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", tag: d.tag || d.url || "benade", data: { url: d.url || "/app" }, renotify: true }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || "/app";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => { for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } } return self.clients.openWindow(url); }));
});
