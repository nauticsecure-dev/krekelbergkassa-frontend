// Krekelberg PWA service worker
const VERSION = 'krek-v1';
const APP_SHELL = '/offline';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.svg',
  APP_SHELL,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML navigation, fall back to cached app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => null);
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(APP_SHELL)))
    );
    return;
  }

  // Stale-while-revalidate for static assets
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => null);
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
