/* ============================================================
   services/cache-service.js — In-memory TTL cache
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const CONFIG = EH.CONFIG || { CACHE_TTL_MS: 5 * 60 * 1000 };

  const store = new Map();

  function key(namespace, k) {
    return `${namespace || 'default'}::${k}`;
  }

  const Cache = {
    set(namespace, k, value, ttlMs = CONFIG.CACHE_TTL_MS) {
      const expires = ttlMs > 0 ? Date.now() + ttlMs : 0;
      store.set(key(namespace, k), { value, expires });
      return value;
    },

    get(namespace, k, defaultValue = null) {
      const entry = store.get(key(namespace, k));
      if (!entry) return defaultValue;
      if (entry.expires && Date.now() > entry.expires) {
        store.delete(key(namespace, k));
        return defaultValue;
      }
      return entry.value;
    },

    has(namespace, k) {
      const entry = store.get(key(namespace, k));
      if (!entry) return false;
      if (entry.expires && Date.now() > entry.expires) {
        store.delete(key(namespace, k));
        return false;
      }
      return true;
    },

    invalidate(namespace, k) {
      if (k !== undefined) store.delete(key(namespace, k));
      else {
        for (const kk of Array.from(store.keys())) {
          if (kk.startsWith(`${namespace}::`)) store.delete(kk);
        }
      }
    },

    clear() { store.clear(); },

    /**
     * Wrap a function with cache-aside semantics.
     *   const user = await Cache.wrap('users', id, () => API.get('/users/' + id));
     */
    async wrap(namespace, k, producer, ttlMs = CONFIG.CACHE_TTL_MS) {
      if (this.has(namespace, k)) return this.get(namespace, k);
      const value = await producer();
      this.set(namespace, k, value, ttlMs);
      return value;
    },

    size() { return store.size; },
  };

  EH.Cache = Cache;
})(window);
