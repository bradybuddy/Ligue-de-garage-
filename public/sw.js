// Service worker : affiche les notifs push et ouvre le bon écran au toucher.
self.addEventListener("push", (event) => {
  let data = { title: "Buddy & Beer", body: "", url: "/" };
  try { data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, data: { url: data.url }, lang: "fr-CA", icon: "/icon-192.png" }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) { c.navigate(url); return c.focus(); }
    return clients.openWindow(url);
  }));
});
