const CACHE = "caraka-shell-v1";
const STATIC = new Set([
  "/",
  "/app.css",
  "/app.js",
  "/icon.svg",
  "/icon-512.png",
  "/icon-192.png",
  "/manifest.webmanifest",
  "/fonts/public-sans.woff2",
  "/fonts/jetbrains-mono.woff2",
]);
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const path of STATIC) {
        const response = await fetch(path, { credentials: "omit", cache: "reload" });
        if (!response.ok) throw new Error("Static asset unavailable");
        await cache.put(path, response);
      }
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("caraka-shell-") && name !== CACHE) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.search ||
    !STATIC.has(url.pathname)
  )
    return;
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request, { credentials: "omit" });
        if (response.ok) await (await caches.open(CACHE)).put(url.pathname, response.clone());
        return response;
      } catch (error) {
        const cached = await (await caches.open(CACHE)).match(url.pathname);
        if (cached) return cached;
        throw error;
      }
    })(),
  );
});
self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("Caraka", {
      body: "Task activity needs your attention.",
      data: { url: self.location.origin + "/" },
      tag: "caraka-activity",
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const target = self.location.origin + "/";
      for (const client of await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })) {
        if (client.url.startsWith(self.location.origin)) return client.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
