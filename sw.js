// Bantay Benta Service Worker
// Caches everything on first load → 100% offline after

const CACHE = 'bantaybenta-v21';
const ASSETS = [
  '/',
  '/index.html',
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
];

// Install: cache all assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      console.log('[SW] Caching app for offline use...');
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.log('[SW] Failed to cache:', url, err))
        )
      );
    }).then(function() {
      console.log('[SW] All assets cached!');
      return self.skipWaiting();
    })
  );
});

// Activate: delete old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', function(e) {
  // Skip non-GET and chrome-extension requests
  if(e.request.method !== 'GET') return;
  if(e.request.url.startsWith('chrome-extension://')) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if(cached) {
        // Serve from cache (works offline!)
        return cached;
      }
      // Not in cache - try network
      return fetch(e.request).then(function(response) {
        // Cache successful responses for future offline use
        if(response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Network failed + not cached = show offline page
        if(e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
