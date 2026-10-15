/* DoctorCoach PWA: cache only this explicit set of non-personal assets. */
const CACHE = 'doctorcoach-static-v5';
const OFFLINE = '/offline.html';
const STATIC = [OFFLINE, '/icons/icon-192-drc-v1.png', '/icons/icon-512-drc-v1.png', '/icons/maskable-512-drc-v1.png', '/icons/apple-touch-icon-drc-v1.png', '/icons/favicon-32-drc-v1.png', '/icons/favicon-64-drc-v1.png', '/branding/doctorcoach-drc-v1.webp'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // Offline assets are optional. A redirect, failed icon or unavailable cache
    // must not abort this worker's installation and disable device Push.
    try {
      const cache = await caches.open(CACHE);
      await Promise.all(STATIC.map(async (path) => {
        try {
          const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(5000) });
          // Never cache redirects to an authentication page as static assets.
          if (!response.ok || response.redirected) return;
          await cache.put(path, response);
        } catch { /* The online path remains available. */ }
      }));
    } catch { /* Push can operate when offline caching is unavailable. */ }
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
      try { const cache = await caches.open(CACHE);const offline = await cache.match(OFFLINE);if(offline)return offline; } catch { /* No offline cache. */ }
      return new Response('DoctorCoach: נדרש חיבור לאינטרנט', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
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

// Push payloads are deliberately empty: no patient or message data is shown.
self.addEventListener('push', (event) => {
  event.waitUntil(self.registration.showNotification('DoctorCoach', {
    body: 'יש עדכון חדש באפליקציה / You have an update in the app',
    icon: '/icons/icon-192-drc-v1.png', badge: '/icons/icon-192-drc-v1.png',
    tag: 'doctorcoach-update', renotify: false, data: { path: '/' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) { await client.focus(); return; }
    }
    await self.clients.openWindow('/');
  })());
});
