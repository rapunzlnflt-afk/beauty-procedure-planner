const CACHE_NAME = 'beauty-planner-v7';
// Only this app's own caches. Every CleartrackApps app shares cleartrackapps.com, so they all share one cache store.
const isOwnCache = k => k.startsWith('beauty-planner-') && !k.startsWith('beauty-planner-demo');
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    // cache: 'reload' skips the browser's HTTP cache so a new version never stores an old copy
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => isOwnCache(k) && k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Pages: network first, so an online launch always shows the latest version.
  // Falls back to the saved copy when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' }).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then(r => r || caches.match('./index.html'))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Return cached version, but also fetch updated version in background
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
