/** OBSIDIAN v4.0 — service worker · cache static assets for offline use.
 *  Strategy:
 *   - On install: pre-cache the app shell (index.html, core JS, CSS, theme tokens, i18n)
 *   - On activate: purge old caches
 *   - On fetch:
 *      * Same-origin GET → cache-first with network-update (stale-while-revalidate)
 *      * Cross-origin (PA flow URLs) → network-only (no caching of dynamic data)
 *
 *  Does NOT cache PA flow responses — those are dynamic operational data and stale results
 *  could mislead operators. Only the static shell + i18n + config gets offline support. */
const CACHE_NAME = 'obsidian-v4-shell-2026-05-30';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/boot.js',
  '/styles/reset.css',
  '/styles/primitives.css',
  '/styles/shell.css',
  '/styles/components.css',
  '/styles/utilities.css',
  '/styles/layers.css',
  '/themes/tokens.css',
  '/themes/theme.light.css',
  '/themes/subbrand.dgo.css',
  '/config/i18n/en.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Skip cross-origin requests (PA flows etc.) — let them go straight to network
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip the API namespace if any (defensive — currently the platform calls PA directly)
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      // Stale-while-revalidate: return cached immediately if present, update in background
      return cached || fetchPromise;
    })
  );
});

// Allow page to trigger immediate update / cache wipe via postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'OBSIDIAN_SW_PURGE') {
    caches.delete(CACHE_NAME).then(() => event.source && event.source.postMessage({ type: 'OBSIDIAN_SW_PURGED' }));
  }
  if (event.data && event.data.type === 'OBSIDIAN_SW_SKIP_WAITING') {
    self.skipWaiting();
  }
});
