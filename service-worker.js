const CACHE_NAME = 'tauromaquia-pwa-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const EXTERNAL_LIBRARIES = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);

    // Pre-cache external libraries. If the network is unavailable during
    // first installation, the app still installs; libraries will be cached
    // automatically the first time they are successfully loaded online.
    await Promise.allSettled(EXTERNAL_LIBRARIES.map(async url => {
      try {
        const response = await fetch(url, {mode: 'cors', cache: 'no-cache'});
        if (response.ok) await cache.put(url, response.clone());
      } catch (e) {}
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);

      // Cache same-origin application files and the two known libraries.
      const url = event.request.url;
      if (url.startsWith(self.location.origin) || EXTERNAL_LIBRARIES.includes(url)) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone()).catch(() => {});
      }

      return response;
    } catch (e) {
      // If navigation fails, return the application shell.
      if (event.request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw e;
    }
  })());
});
