/* ============================================================
   public/routing/public-router.js — Public route handler
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function shouldHandle(hash) {
    if (!hash || hash === '#/' || hash === '#' || hash === '') return true;
    const publicPrefixes = ['#/courses', '#/experts', '#/events', '#/resources',
                            '#/institutions', '#/about', '#/contact',
                            '#/course/', '#/expert/', '#/event/'];
    return publicPrefixes.some(p => hash.startsWith(p));
  }

  async function handle(hash) {
    if (!shouldHandle(hash)) return false;
    const handler = EH.PageResolver.resolve(hash);
    if (!handler) return false;
    window.scrollTo(0, 0);
    await handler();
    return true;
  }

  EH.PublicRouter = { handle, shouldHandle };
})(window);
