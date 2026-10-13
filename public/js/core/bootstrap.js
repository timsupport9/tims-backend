/* ============================================================
   core/bootstrap.js — Final boot sequence
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { CONFIG, Store, State, Lifecycle, DI } = EH;

  function wireDependencies() {
    DI.register('config', CONFIG);
    DI.register('store', Store);
    DI.register('state', State);
    DI.register('bus', EH.bus);
    if (EH.API)     DI.register('api', EH.API);
    if (EH.Auth)    DI.register('auth', EH.Auth);
    if (EH.Socket)  DI.register('socket', EH.Socket);
    if (EH.Data)    DI.register('data', EH.Data);
    if (EH.Toast)   DI.register('toast', EH.Toast);
    if (EH.Theme)   DI.register('theme', EH.Theme);
  }

  function hydrateAuth() {
    const token   = Store.getToken();
    const refresh = Store.getRefresh();
    const user    = Store.getUser();
    if (token) {
      State.set('authToken', token);
      State.set('refreshToken', refresh);
      if (user) {
        State.set('currentUser', user);
        State.set('currentUserRole', user.role || null);
        State.set('userIntent', user.intent || 'both');
      }
    }
  }

  function attachGlobalHandlers() {
    global.addEventListener('error', (e) => {
      EH.Logger?.error?.('Unhandled error', { message: e.message });
    });
    global.addEventListener('unhandledrejection', (e) => {
      EH.Logger?.error?.('Unhandled rejection', { reason: String(e.reason) });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && typeof EH.Modal?.close === 'function') {
        EH.Modal.close();
      }
    });

    Lifecycle.onOnline(() => EH.Toast?.show?.('Back online', 'success', 2000));
    Lifecycle.onOffline(() => EH.Toast?.show?.('You are offline', 'warning', 3000));
  }

  function boot() {
    try {
      EH.Logger?.info?.('Booting ExpertHub', CONFIG.APP_VERSION);
      EH.Theme?.init?.();
      hydrateAuth();
      wireDependencies();
      attachGlobalHandlers();

      const hasRouter = typeof EH.Router?.start === 'function';
      if (hasRouter) {
        EH.Router.start();
      } else if (typeof route === 'function') {
        // Fallback to global route() from legacy app.js
        global.addEventListener('hashchange', route);
        route();
      }

      if (State.get('authToken') && EH.Socket?.connect) {
        EH.Socket.connect();
      }

      EH.bus?.emit('app:ready');
      EH.Logger?.info?.('Boot complete');
    } catch (err) {
      EH.Logger?.error?.('Boot failed', err);
      const root = document.getElementById('app-root');
      if (root) {
        root.innerHTML = `
          <div style="padding:48px;text-align:center;font-family:system-ui">
            <h1 style="color:#dc2626">Application Error</h1>
            <p>Something went wrong during startup.</p>
            <pre style="background:#f5f5f5;padding:16px;border-radius:8px;text-align:left;max-width:640px;margin:20px auto">${err.message}</pre>
          </div>`;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
