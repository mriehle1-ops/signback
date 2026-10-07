// SignBack service worker: app shell stays fresh, sign videos stay on the phone.
const VERSION = "v1-20261006235306";
const SHELL = `signback-shell-${VERSION}`;
const VIDEOS = "signback-videos-v1";
const SHELL_FILES = ["./", "index.html", "app.css", "app.js", "data/app-data.json", "fonts/bricolage.woff2", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("signback-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  if (url.pathname.includes("/videos/")) {
    // Videos never change: cache first, network once.
    e.respondWith(
      caches.open(VIDEOS).then(async (c) => {
        const hit = await c.match(url.href);
        if (hit) return hit;
        const res = await fetch(url.href);
        if (res.ok && res.status === 200) c.put(url.href, res.clone());
        return res;
      })
    );
    return;
  }

  if (url.pathname.endsWith(".ics")) return;

  // App shell: network first so updates land, cache as fallback for offline.
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
