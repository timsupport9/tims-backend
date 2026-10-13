/* ============================================================
   auth/session.js — Session helpers
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const Session = {
    isExpired(token) {
      if (!token) return true;
      try {
        const [, payload] = token.split('.');
        if (!payload) return false;
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        if (!decoded.exp) return false;
        return Date.now() >= decoded.exp * 1000;
      } catch (_) {
        return false;
      }
    },

    expiresAt(token) {
      try {
        const [, payload] = token.split('.');
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return decoded.exp ? decoded.exp * 1000 : null;
      } catch (_) { return null; }
    },

    async hydrateFromStorage() {
      const token = EH.Store.getToken();
      if (!token) return false;
      EH.state.authToken = token;
      EH.state.refreshToken = EH.Store.getRefresh();
      EH.state.currentUser = EH.Store.getUser();
      EH.state.currentUserRole = EH.state.currentUser?.role || null;
      EH.state.userIntent = EH.state.currentUser?.intent || 'both';
      return true;
    },

    async ensure() {
      if (!EH.state.authToken) return false;
      if (this.isExpired(EH.state.authToken)) {
        try { await EH.Auth.me(); return true; }
        catch (_) { await EH.Auth.logout(); return false; }
      }
      return true;
    },
  };

  EH.Session = Session;
})(window);
