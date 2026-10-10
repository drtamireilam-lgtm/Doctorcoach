/* DoctorCoach PWA: cache only this explicit set of non-personal assets. */
const CACHE = 'doctorcoach-static-v3';
const OFFLINE = '/offline.html';
const STATIC = [OFFLINE, '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png', '/icons/favicon-32.png', '/icons/favicon-64.png', '/branding/doctorcoach-logo.webp'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const path of STATIC) {
      const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' });
      // Never cache redirects to an authentication page as static assets.
      if (!response.ok || response.redirected) throw new Error('Static asset unavailable');
      await cache.put(path, response);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('doctorcoach-static-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Account, API and auth requests go directly to the server, never to CacheStorage.
  if (url.pathname.startsWith('/api/') || ['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback'].includes(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return await cache.match(OFFLINE) || new Response('DoctorCoach: נדרש חיבור לאינטרנט', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
    return;
  }
  if (STATIC.includes(url.pathname) && !url.search) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return await cache.match(url.pathname) || fetch(request);
    })());
  }
});
