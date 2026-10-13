/* ============================================================
   router/router.js — Main hash router
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { Routes, Guards, bus, EVENTS } = EH;

  let started = false;

  async function handle() {
    const hash = location.hash || '#/';
    const cleanHash = hash.split('?')[0];

    // Try public static
    const staticPublic = (Routes.public || []).find(r => r.path === cleanHash);
    if (staticPublic) {
      EH.state.appPhase = cleanHash === '#/' ? 'landing' : cleanHash.slice(2);
      staticPublic.handler();
      scrollTop();
      EH.CanonicalURL?.update?.(hash);
      return;
    }

    // Try dynamic (public)
    for (const r of (Routes.dynamic || [])) {
      const m = cleanHash.match(r.pattern);
      if (m) {
        r.handler(m);
        scrollTop();
        return;
      }
    }

    // Try authenticated
    const staticAuth = (Routes.authenticated || []).find(r => r.path === cleanHash);
    if (staticAuth) {
      const redirect = Guards.check(staticAuth, hash);
      if (redirect) { location.hash = redirect; return; }
      ensureSessionThen(staticAuth.handler);
      scrollTop();
      return;
    }

    // Public site sub-pages
    if (EH.PublicRouter?.shouldHandle(cleanHash)) {
      const handled = await EH.PublicRouter.handle(hash);
      if (handled) { scrollTop(); return; }
    }

    // Fallback: not found
    if (typeof EH.NotFound?.render === 'function') {
      EH.NotFound.render();
    } else {
      location.hash = '#/';
    }
  }

  async function ensureSessionThen(handler) {
    try {
      if (!EH.state.currentUser) {
        EH.Loading.show();
        try { await EH.Auth.me(); } catch (_) { location.hash = '#/login'; return; }
        finally { EH.Loading.hide(); }
      }
      handler();
    } catch (err) {
      EH.Logger?.error?.('route handler failed', err);
      EH.Toast.error('Something went wrong loading this page');
    }
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener('hashchange', handle);
    handle();
    EH.Logger?.info?.('Router started');
  }

  function navigate(hash) {
    if (!hash) return;
    if (!hash.startsWith('#')) hash = '#' + (hash.startsWith('/') ? '' : '/') + hash;
    if (location.hash === hash) { handle(); return; }
    location.hash = hash;
    bus?.emit(EVENTS?.NAVIGATE || 'nav:navigate', { hash });
  }

  EH.Router = { start, navigate, handle };
})(window);
