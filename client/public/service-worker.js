const CACHE_NAME = "roni-planner-pwa-v2";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/roni-icon-192.png",
  "/roni-icon-512.png",
  "/pwa-screenshot-narrow.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match("/")))
  );
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() || "لديك تذكير من RONI Planner" }; }
  event.waitUntil(self.registration.showNotification(data.title || "تذكير من RONI Planner", {
    body: data.body || data.message || "حان وقت المهمة",
    icon: "/roni-icon-192.png",
    badge: "/roni-icon-192.png",
    tag: data.tag || "roni-planner-reminder",
    renotify: true,
    data: { url: data.url || "/", ...(data.data || {}) }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const existing = list.find(client => "focus" in client);
    if (existing) { existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});
