/* ============================================================
   ExpertHub 2.0 — Service Worker
   Precache shell + Cache-first for lessons, network-first for API.
   ============================================================ */

const VERSION = 'v1.0.0';
const SHELL   = `eh-shell-${VERSION}`;
const LESSONS = `eh-lessons-${VERSION}`;
const IMAGES  = `eh-images-${VERSION}`;
const API     = `eh-api-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/js/00-command-palette.js',
  '/js/01-state.js',
  '/js/02-utils.js',
  '/js/03-ui.js',
  '/js/04-api.js',
  '/js/05-auth.js',
  '/js/06-data.js',
  '/js/08-shell.js',
  '/js/09-admin.js',
  '/js/10-expert.js',
  '/js/11-user-core.js',
  '/js/11-user-eschool.js',
  '/js/11-user-learning.js',
  '/js/11-user-consulting.js',
  '/js/11-user-account.js',
  '/js/11-user-features.js',
  '/js/11-user-catalog.js',
  '/js/12-institution.js',
  '/js/13-modals.js',
  '/js/14-actions.js',
  '/js/15-router.js',
  '/js/16-notifications.js',
  '/js/17-quiz.js',
  '/js/18-calendar-sync.js',
  '/js/19-pwa.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL).then(c => c.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![SHELL, LESSONS, IMAGES, API].includes(k))
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (url.origin !== location.origin && !isFontOrCdn(url)) return;

  // API: network-first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Never cache mutation-adjacent GETs for user data
    event.respondWith(networkFirst(req, API, 3 * 60 * 1000));
    return;
  }

  // Lessons & curriculum: cache-first
  if (url.pathname.startsWith('/api/eschool/lessons/') ||
      url.pathname.startsWith('/api/eschool/courses/')) {
    event.respondWith(cacheFirst(req, LESSONS));
    return;
  }

  // Images & fonts: cache-first
  if (req.destination === 'image' || isFontOrCdn(url)) {
    event.respondWith(cacheFirst(req, IMAGES));
    return;
  }

  // HTML navigation: network-first, shell fallback
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL, 60 * 1000).catch(() => caches.match('/index.html')));
    return;
  }

  // JS/CSS: stale-while-revalidate
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(staleWhileRevalidate(req, SHELL));
    return;
  }

  // Default: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req, SHELL));
});

function isFontOrCdn(url) {
  return url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('fonts.gstatic.com') ||
         url.hostname.includes('cdnjs.cloudflare.com') ||
         url.hostname.includes('cdn.jsdelivr.net');
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return hit || Response.error();
  }
}

async function networkFirst(req, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || fetchPromise;
}

/* ---- background sync: flush queued mutations ---- */
self.addEventListener('sync', event => {
  if (event.tag === 'eh-sync-progress') {
    event.waitUntil(flushProgressQueue());
  }
});

async function flushProgressQueue() {
  // App writes to IndexedDB `eh.queue` when offline; we push on reconnect.
  try {
    const db = await openDB();
    const items = await readAll(db, 'queue');
    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body || {}),
        });
        await deleteOne(db, 'queue', item.id);
      } catch (_) { /* retry next sync */ }
    }
  } catch (_) {}
}

function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('eh', 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function readAll(db, store) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}
function deleteOne(db, store, id) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });