'use strict';
const CACHE = 'vinylcurator-20260826-045231';
// Big ML assets (ORT runtime + model, ~15 MB) live in their own cache that
// survives version bumps, so an app update never re-downloads them.
const MODELCACHE = 'vinylcurator-models-v1';
const ASSETS = [
  './', './index.html', './app.js', './detect.js', './manifest.webmanifest',
  './icon.svg', './icon-192.png', './icon-512.png', './icon-512-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // No skipWaiting here: taking over mid-session leaves the open page running
  // the previous app.js against fresh assets. Wait until the user taps Update.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== MODELCACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for same-origin GETs: instant offline load — this app
// gets used in shop basements. Staleness is handled by the update prompt, not
// by making every launch wait on the network.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // ORT runtime + model: cache-first into the persistent model cache.
  if (/\/(vendor|models)\//.test(url.pathname)) {
    e.respondWith(caches.open(MODELCACHE).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res && res.ok) c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
