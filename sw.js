// PerfECT PWA Service Worker — High-Performance & Seamless Auto-Update
const CACHE_NAME = 'perfect-pwa-v1.0.0';

// Critical shell assets to pre-cache on install
// NOTE: Only list assets that actually exist at their paths.
// Vendor scripts (chart.js, confetti) are loaded via <script> tags in index.html;
// the sw.js does not pre-cache them since they live at a CDN / are inlined.
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/style.css',
  './src/main.js',
  './src/assets/logo.png',
  './src/assets/icon-192.png',
  './src/assets/icon-512.png',
  './src/assets/apple-touch-icon.png'
];

// Install Event: Cache essential shell assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-cache item warning:', err);
      });
    })
  );
});

// Activate Event: Purge old cache versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Removing outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first for dynamic code & HTML, Cache-first for images/fonts
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Bypass Firebase SDK endpoints, Google APIs, and non-GET requests.
  //    IMPORTANT: We do NOT bypass all of *.firebaseapp.com because Firebase Hosting
  //    may serve the app itself from a firebaseapp.com subdomain (e.g. perfect-net.firebaseapp.com).
  //    We only bypass the specific Firebase SDK domains used for Auth & Firestore.
  if (request.method !== 'GET') return;

  const isBypassedHost =
    url.hostname === 'www.googleapis.com' ||
    url.hostname.endsWith('.googleapis.com') ||
    url.hostname.endsWith('.firebaseio.com') ||
    url.hostname.endsWith('.gstatic.com') ||
    // Firebase Auth emulator & identity platform (not the hosting domain)
    url.hostname === 'identitytoolkit.googleapis.com' ||
    url.hostname === 'securetoken.googleapis.com';

  if (isBypassedHost) return;

  // 2. HTML navigation or app scripts -> Network First (with cache fallback)
  // Ensures updates are picked up immediately when you push new code!
  if (request.mode === 'navigate' || request.destination === 'document' || request.destination === 'script') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  // 3. Static assets (CSS, Images, Fonts) -> Stale-while-revalidate / Cache First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
