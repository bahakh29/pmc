/**
 * Service Worker - offline support for the Residents On-Call Dashboard.
 *
 * Strategy:
 *  - Core app files (index.html, styles.css, app.js, manifest.json, icons) are pre-cached on install.
 *  - Same-origin requests: network first, fall back to cache when offline (so updates arrive quickly).
 *  - Third-party libraries (Tailwind, Chart.js, Font Awesome, Google Fonts): cached on first use,
 *    then served from cache (stale-while-revalidate).
 *  - Google Apps Script requests (the schedule data + password) are NEVER cached or intercepted.
 *
 * When you change any of the core files, bump CACHE_VERSION so users get the new version.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = 'pmc-schedule-' + CACHE_VERSION;

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Hosts that must always go straight to the network
const NEVER_CACHE_HOSTS = ['script.google.com', 'script.googleusercontent.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // Add files one by one so a missing file (e.g. icons not uploaded yet) doesn't break the install
      Promise.all(CORE_ASSETS.map(url => cache.add(url).catch(err => console.warn('SW: could not cache', url, err))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('pmc-schedule-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (NEVER_CACHE_HOSTS.includes(url.hostname)) return; // let the browser handle it normally

  // Same-origin: network first, cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then(cached => {
            if (cached) return cached;
            if (req.mode === 'navigate') return caches.match('./index.html');
            return Response.error();
          })
        )
    );
    return;
  }

  // Cross-origin libraries/fonts: stale-while-revalidate
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
