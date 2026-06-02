/** OBSIDIAN v4.0 — service-worker.js · offline app-shell cache (Advanced tier).
 *  Cache-first for same-origin static assets; network-first for navigations;
 *  Power Automate POSTs and all cross-origin requests bypass the cache entirely. */
const VERSION = 'obsidian-v4-0';
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
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // bypass API + cross-origin
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
  }).catch(() => hit)));
});
