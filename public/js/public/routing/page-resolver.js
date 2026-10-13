/* ============================================================
   public/routing/page-resolver.js — Resolve hash to page handler
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function resolve(hash) {
    const cleanHash = hash.split('?')[0];
    const { PublicRoutes, DynamicRoutes } = EH.PublicRoutes || {};

    const staticMatch = (PublicRoutes || []).find(r => r.path === cleanHash);
    if (staticMatch) return staticMatch.handler;

    for (const r of (DynamicRoutes || [])) {
      const m = cleanHash.match(r.pattern);
      if (m) return () => r.handler(m);
    }

    return null;
  }

  EH.PageResolver = { resolve };
})(window);
