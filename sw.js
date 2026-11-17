// Service Worker — cache-first for static assets, network-first for navigation
const CACHE_NAME = "lc-patterns-v2";

const PRECACHE_URLS = [
  "./404.html",
  "./__next.__PAGE__.txt",
  "./__next._full.txt",
  "./__next._head.txt",
  "./__next._index.txt",
  "./__next._tree.txt",
  "./_next/static/7ZPfLeMS0LhEtRGFuUCay/_buildManifest.js",
  "./_next/static/7ZPfLeMS0LhEtRGFuUCay/_clientMiddlewareManifest.js",
  "./_next/static/7ZPfLeMS0LhEtRGFuUCay/_ssgManifest.js",
  "./_next/static/chunks/05-c3ty_6dwfk.js",
  "./_next/static/chunks/0b54-a1m62sm3.js",
  "./_next/static/chunks/0cz1d0mv5g_q7.js",
  "./_next/static/chunks/14mrh2-p_w84d.js",
  "./_next/static/chunks/1ix_ma6xsgqjj.js",
  "./_next/static/chunks/1lgx67kiub3bo.css",
  "./_next/static/chunks/1lnuuxmghjz5o.js",
  "./_next/static/chunks/1rxncug86bump.js",
  "./_next/static/chunks/27jktro2p5rq9.js",
  "./_next/static/chunks/310vm2bl3xxpt.js",
  "./_next/static/chunks/3am-oyl_vgqfg.js",
  "./_next/static/chunks/3hvxb27wgqc5m.js",
  "./_next/static/chunks/3ij9wpu0w5suv.js",
  "./_next/static/chunks/turbopack-1litqvivoeowj.js",
  "./_next/static/media/02263ebadd758ea4-s.1iu7q7yw-zhgt.woff2",
  "./_next/static/media/150f724d70372c02-s.1ljbalzvxyif7.woff2",
  "./_next/static/media/2fe89d53234c61d4-s.1h7k3aqd68qji.woff2",
  "./_next/static/media/59b15b4bcd7b1eb5-s.0g4pmka8j2u20.woff2",
  "./_next/static/media/5e05ae5b48faa55e-s.1yd4_i3e35931.woff2",
  "./_next/static/media/5f402bd2d8eef81a-s.p.40bho2kviej2o.woff2",
  "./_next/static/media/68757d6cddeff913-s.07-q_h5lq3omo.woff2",
  "./_next/static/media/750c737482d9de2f-s.3ex3j6ahhvjry.woff2",
  "./_next/static/media/77ce6907447ba740-s.1thpl3j71vtxe.woff2",
  "./_next/static/media/79e9e0e3b9220e46-s.3a-pd9010p_dh.woff2",
  "./_next/static/media/8b4ed0a90d903ab5-s.44dak0sams9f0.woff2",
  "./_next/static/media/91bd2e40df15814e-s.19s5evoqhirey.woff2",
  "./_next/static/media/9433d1a810498265-s.p.1hij5ex6k3v9q.woff2",
  "./_next/static/media/99e609270109b47d-s.p.30xqm3yldpj47.woff2",
  "./_next/static/media/a63431c4ac64ea8b-s.386o_ri1vb0yv.woff2",
  "./_next/static/media/a7afbb44bec2bb18-s.42z9vm7u0i9n-.woff2",
  "./_next/static/media/bfc9b7e66b1caeca-s.3hdclex1x_th1.woff2",
  "./_next/static/media/c47649aa31f9e140-s.p.3lxpqujs87tck.woff2",
  "./_next/static/media/e390973e931a41c5-s.0rgnxg2b64rzs.woff2",
  "./_next/static/media/e532fa1b9921e1cd-s.1v7x_qdpnbwoz.woff2",
  "./_next/static/media/e62850744c7f266e-s.0n7ulcr4ivksg.woff2",
  "./_next/static/media/effe91970fc4db64-s.p.27korwsf9c79u.woff2",
  "./_not-found/__next._full.txt",
  "./_not-found/__next._head.txt",
  "./_not-found/__next._index.txt",
  "./_not-found/__next._not-found.__PAGE__.txt",
  "./_not-found/__next._not-found.txt",
  "./_not-found/__next._tree.txt",
  "./_not-found.html",
  "./_not-found.txt",
  "./index.html",
  "./index.txt",
  "./manifest.json",
  "./robots.txt"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET" || !request.url.startsWith("http")) return;

  // Skip analytics and external API calls
  if (
    request.url.includes("google-analytics.com") ||
    request.url.includes("googletagmanager.com") ||
    request.url.includes("s2/favicons")
  ) return;

  // Navigation requests: network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./")))
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          // Only cache successful same-origin responses
          if (response.ok && request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
    )
  );
});
