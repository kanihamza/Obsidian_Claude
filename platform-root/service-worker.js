/** OBSIDIAN v4.0 — service-worker.js · offline app-shell cache.
 *  NETWORK-FIRST for same-origin GETs: always fetch the latest module/asset when online (so pushed
 *  code reaches the browser immediately), updating the cache copy; fall back to cache only when the
 *  network is unavailable (offline shell). Power Automate POSTs and all cross-origin requests bypass
 *  the worker entirely. Bump VERSION to purge the prior cache on activate.
 *
 *  History: was cache-first with a frozen VERSION, which permanently served stale modules and
 *  prevented pushed fixes (e.g. endpoints.config.js) from ever loading. Rewritten 2026-06-10. */
const VERSION = 'obsidian-v4-2-netfirst';
const SHELL = [
  '/', '/index.html',
  '/styles/layers.css', '/styles/reset.css', '/styles/primitives.css',
  '/styles/shell.css', '/styles/components.css', '/styles/utilities.css',
  '/themes/tokens.css', '/themes/theme.light.css', '/themes/theme.dark.css',
  '/themes/theme.high-contrast.css', '/themes/subbrand.dgo.css',
  '/config/i18n/en.json',
  '/core/boot.js', '/core/platform.js',
  '/shared/components/index.js', '/modules/index.js'
];

self.addEventListener('install', (e) => {
  // Pre-warm the shell, then take over immediately so the network-first strategy applies on next load.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  // Delete every prior cache (including the old cache-first 'obsidian-v4-0') so no stale module survives.
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // bypass API + cross-origin
  // Network-first: fresh code wins when online; cache is the offline fallback only.
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error()))));
});
