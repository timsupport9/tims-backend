/* ============================================================
   ExpertHub 2.0 — 19-pwa.js
   Service worker registration, install prompt, online badge,
   and offline mutation queue bridge (IndexedDB → bg sync).
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHPWA = window.EHPWA || {};

  /* ---------- register SW ---------- */
  async function registerSW() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return reg;
    } catch (err) {
      console.warn('[PWA] SW registration failed', err);
      return null;
    }
  }

  /* ---------- install prompt ---------- */
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  function showInstallButton() {
    if (document.getElementById('eh-install-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'eh-install-btn';
    btn.className = 'eh-install-btn';
    btn.innerHTML = '<i class="fas fa-download"></i> Install App';
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted' && typeof window.showToast === 'function') {
        window.showToast('Installing ExpertHub…', 'success');
      }
      deferredPrompt = null;
      btn.remove();
    });
    document.body.appendChild(btn);
  }

  /* ---------- online/offline badge ---------- */
  function mountNetBadge() {
    let badge = document.getElementById('eh-net-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'eh-net-badge';
      badge.className = 'eh-net-badge';
      badge.setAttribute('role', 'status');
      badge.setAttribute('aria-live', 'polite');
      document.body.appendChild(badge);
    }
    const update = () => {
      const offline = !navigator.onLine;
      badge.classList.toggle('is-offline', offline);
      badge.textContent = offline ? 'Offline — changes will sync' : '';
      badge.hidden = !offline;
    };
    window.addEventListener('online', () => { update(); flushQueue(); });
    window.addEventListener('offline', update);
    update();
  }

  /* ---------- offline mutation queue ---------- */
  const DB_NAME = 'eh';
  const STORE = 'queue';

  function openDB() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async function enqueue(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function flushQueue() {
    if (!navigator.onLine) return;
    try {
      const db = await openDB();
      const items = await new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
      for (const item of items) {
        try {
          await fetch(item.url, {
            method: item.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.body || {}),
          });
          await new Promise((res, rej) => {
            const tx = db.transaction(STORE, 'readwrite');
            const r = tx.objectStore(STORE).delete(item.id);
            r.onsuccess = () => res();
            r.onerror = () => rej(r.error);
          });
        } catch (_) { /* retry next time */ }
      }
    } catch (_) {}
  }

  /* ---------- init ---------- */
  async function init() {
    await registerSW();
    mountNetBadge();
    // Attempt a background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.sync?.register('eh-sync-progress').catch(() => {});
      } catch (_) {}
    }
  }

  NS.enqueue = enqueue;
  NS.flush = flushQueue;
  NS.register = registerSW;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }