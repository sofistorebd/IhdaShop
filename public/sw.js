// IHDA Shop service worker — offline shell + static caching
const CACHE = "ihda-cache-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // admin/api কখনো cache হবে না
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;

  // পেজ navigation → network-first, ব্যর্থ হলে cache
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/")))
    );
    return;
  }

  // static assets → cache-first
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/products") ||
    url.pathname.startsWith("/reviews") ||
    url.pathname.startsWith("/icon-") ||
    /\.(png|jpg|jpeg|svg|webp|gif|woff2?)$/.test(url.pathname)
  ) {
    e.respondWith(
      caches.match(req).then(
        (m) =>
          m ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});
