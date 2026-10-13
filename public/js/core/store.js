/* ============================================================
   core/store.js — Persistence-backed key/value store
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const memoryFallback = new Map();
  let lsAvailable = true;

  try {
    const probeKey = '__eh_probe__';
    global.localStorage.setItem(probeKey, '1');
    global.localStorage.removeItem(probeKey);
  } catch (_) {
    lsAvailable = false;
  }

  function safeGet(key) {
    if (lsAvailable) {
      try { return global.localStorage.getItem(key); } catch (_) { /* fallthrough */ }
    }
    return memoryFallback.has(key) ? memoryFallback.get(key) : null;
  }

  function safeSet(key, value) {
    if (lsAvailable) {
      try { global.localStorage.setItem(key, value); return; } catch (_) { /* fallthrough */ }
    }
    memoryFallback.set(key, value);
  }

  function safeRemove(key) {
    if (lsAvailable) {
      try { global.localStorage.removeItem(key); } catch (_) { /* fallthrough */ }
    }
    memoryFallback.delete(key);
  }

  const Store = {
    get(key, defaultValue = null) {
      const raw = safeGet(key);
      if (raw === null) return defaultValue;
      try { return JSON.parse(raw); }
      catch (_) { return raw; }
    },

    set(key, value) {
      const raw = typeof value === 'string' ? value : JSON.stringify(value);
      safeSet(key, raw);
      return value;
    },

    remove(key) {
      safeRemove(key);
    },

    has(key) {
      return safeGet(key) !== null;
    },

    clear() {
      if (lsAvailable) {
        try {
          Object.keys(global.localStorage).forEach(k => {
            if (k.startsWith('eh_') || k === 'token' || k === 'refresh' || k === 'user' || k === 'theme') {
              global.localStorage.removeItem(k);
            }
          });
        } catch (_) {}
      }
      memoryFallback.clear();
    },

    // Convenience accessors
    getToken() { return safeGet('token'); },
    setToken(t) { safeSet('token', t || ''); },
    getRefresh() { return safeGet('refresh'); },
    setRefresh(r) { safeSet('refresh', r || ''); },
    getUser() {
      try { return JSON.parse(safeGet('user') || 'null'); }
      catch (_) { return null; }
    },
    setUser(u) { safeSet('user', JSON.stringify(u || null)); },
    clearAuth() {
      safeRemove('token');
      safeRemove('refresh');
      safeRemove('user');
    },
  };

  EH.Store = Store;
})(window);
