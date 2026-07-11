/**
 * Rhyschwumm service worker — keeps the app shell working at the river,
 * where reception is famously wet. Hashed Next assets are cache-first
 * (immutable); everything else is network-first with cache fallback, so
 * the last flow reading and the page survive offline.
 */
const CACHE = "rhyschwumm-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(event.request);
        return hit ?? Response.error();
      })
  );
});
