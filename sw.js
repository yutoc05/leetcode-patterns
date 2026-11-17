// Service Worker — cache-first for static assets, network-first for navigation
const CACHE_NAME = "lc-patterns-v2";

const PRECACHE_URLS = [
  "./404.html",
  "./__next.__PAGE__.txt",
  "./__next._full.txt",
  "./__next._head.txt",
  "./__next._index.txt",
  "./__next._tree.txt",
  "./_next/static/QGXIKTC2vSK35qQs_eQdl/_buildManifest.js",
  "./_next/static/QGXIKTC2vSK35qQs_eQdl/_clientMiddlewareManifest.js",
  "./_next/static/QGXIKTC2vSK35qQs_eQdl/_ssgManifest.js",
  "./_next/static/chunks/05-c3ty_6dwfk.js",
  "./_next/static/chunks/0b54-a1m62sm3.js",
  "./_next/static/chunks/0cz1d0mv5g_q7.js",
  "./_next/static/chunks/14mrh2-p_w84d.js",
  "./_next/static/chunks/1ix_ma6xsgqjj.js",
  "./_next/static/chunks/1lnuuxmghjz5o.js",
  "./_next/static/chunks/1rxncug86bump.js",
  "./_next/static/chunks/27jktro2p5rq9.js",
  "./_next/static/chunks/2zpfoska3q3fx.css",
  "./_next/static/chunks/310vm2bl3xxpt.js",
  "./_next/static/chunks/3hvxb27wgqc5m.js",
  "./_next/static/chunks/3ij9wpu0w5suv.js",
  "./_next/static/chunks/3uln52nxqdzr7.js",
  "./_next/static/chunks/turbopack-1litqvivoeowj.js",
  "./_next/static/media/14d4d63e19d804c8-s.0s5t8-c2jtqkg.woff2",
  "./_next/static/media/1956c96e3faab800-s.3j-kyp9rcqvw_.woff2",
  "./_next/static/media/379f3281d04263ba-s.0w0hl63zazyk0.woff2",
  "./_next/static/media/4fa387ec64143e14-s.2tuy5pz7dlieh.woff2",
  "./_next/static/media/5ce348bf30bf5439-s.31988l_ccedte.woff2",
  "./_next/static/media/6306c77e7c8268e4-s.2dbetqa9o8jxf.woff2",
  "./_next/static/media/76e5a9d7303a8632-s.0cf7jynm8tda6.woff2",
  "./_next/static/media/797e433ab948586e-s.p.0r6juujl39pe6.woff2",
  "./_next/static/media/7d817b4c03b0c5f1-s.1uyisp29ctx0d.woff2",
  "./_next/static/media/8b4ed0a90d903ab5-s.44dak0sams9f0.woff2",
  "./_next/static/media/91bd2e40df15814e-s.19s5evoqhirey.woff2",
  "./_next/static/media/a63431c4ac64ea8b-s.386o_ri1vb0yv.woff2",
  "./_next/static/media/bbc41e54d2fcbd21-s.1rgnod-3esatf.woff2",
  "./_next/static/media/c47649aa31f9e140-s.p.3lxpqujs87tck.woff2",
  "./_next/static/media/c6c1a0748af42b20-s.2uuywlasdmkpq.woff2",
  "./_next/static/media/cc2b2ba9b11d3453-s.p.3mm4bn5tfabgi.woff2",
  "./_next/static/media/dd6ffff77ca3306f-s.p.2jzsgj8n6g-5b.woff2",
  "./_next/static/media/f9796a0a2d7214e5-s.1x1y7jiuqp3re.woff2",
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
