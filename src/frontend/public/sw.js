// Service Worker for CasaControl PWA Tablet Dashboard
const CACHE_NAME = 'casacontrol-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/home',
  '/manifest.json',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy for dynamic API calls, cache-first for static build assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass service worker cache for dynamic live LAN APIs
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/healthz')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Fetch in background to update cache
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request);
    })
  );
});
