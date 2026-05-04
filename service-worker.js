// service-worker.js
const CACHE_NAME = 'pos-cache-v1';

// ไฟล์หลักที่ต้องการ Cache ไว้ใช้ Offline
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon.png'
];

// ===== INSTALL: Pre-cache ไฟล์หลัก =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE: ลบ Cache เก่าที่ไม่ใช้แล้ว =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH: กลยุทธ์การดึงข้อมูล =====
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ข้ามคำขอที่ไม่ใช่ HTTP/HTTPS (เช่น chrome-extension)
  if (!request.url.startsWith('http')) return;

  // ข้ามคำขอของ Supabase / API ภายนอก (ไม่ Cache)
  if (url.hostname !== self.location.hostname) return;

  // Navigation (HTML) → Network First, fallback to Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Assets (CSS, JS, images, fonts) → Cache First, fallback to Network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});
