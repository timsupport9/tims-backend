/* ============================================================
   public/services/public-cache.js — Cached public fetches
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const TTL_MS = 5 * 60 * 1000;

  const PublicCache = {
    async get(key, fetcher, ttlMs = TTL_MS) {
      return EH.Cache.wrap('public', key, fetcher, ttlMs);
    },
    invalidate(key) { EH.Cache.invalidate('public', key); },
    invalidateAll() { EH.Cache.invalidate('public'); },
  };

  EH.PublicCache = PublicCache;
})(window);
