// sw.js — the static demo's service worker (static.py copies ui/demo-sw.js to the demo folder's root as sw.js).
//
// Its scope is the demo's own folder, and it answers only four sub-folders of it: pv/ (the preview the site's own
// build made in this browser), rf/ (the records' pictures), up/ (a picture just uploaded) and live/. Everything comes
// from one Cache Storage cache the demo page fills and empties itself; nothing is fetched from anywhere else, nothing
// outside the folder is ever touched. The page deletes the cache when it loads and when it is left, and unregisters
// this worker when it is left; if the folder is removed from the site, the browser drops the worker at its next check.
const SCOPE = new URL(self.registration.scope);
const CACHE = "mw-demo:" + SCOPE.pathname;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== SCOPE.origin || !u.pathname.startsWith(SCOPE.pathname)) return;
  const rel = u.pathname.slice(SCOPE.pathname.length);
  if (!/^(pv|rf|up|live)\//.test(rel)) return;                      // the rest of the folder: the network, as usual
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const key = u.origin + u.pathname;
    const hit = (await c.match(key)) || (u.pathname.endsWith("/") ? await c.match(key + "index.html") : null)
      || (!/\.[a-z0-9]+$/i.test(u.pathname) ? await c.match(key.replace(/\/?$/, "/index.html")) : null);
    if (hit) return hit;
    if (rel.startsWith("rf/")) return fetch(e.request);              // a picture static.py laid out with the demo
    return new Response("<!doctype html><meta charset=utf-8><p style='font:15px system-ui;padding:2em'>This preview has been replaced.</p>",
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
  })());
});
