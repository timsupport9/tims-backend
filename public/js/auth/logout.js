/* ============================================================
   auth/logout.js — Logout handler
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  async function performLogout() {
    try {
      await EH.Auth.logout();
    } catch (_) {}
    EH.Polling?.stop?.();
    EH.state.appPhase = 'landing';
    location.hash = '#/';
    if (typeof renderLanding === 'function') renderLanding();
    EH.Toast.info('Signed out');
  }

  EH.Logout = { perform: performLogout };
  global.logout = performLogout;
})(window);
