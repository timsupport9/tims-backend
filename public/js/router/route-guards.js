/* ============================================================
   router/route-guards.js — Route-level access control
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const Guards = {
    isAuthenticated() {
      return !!EH.state.authToken;
    },

    hasRole(role) {
      return EH.state.currentUserRole === role;
    },

    hasAnyRole(roles = []) {
      return roles.includes(EH.state.currentUserRole);
    },

    isPublic(hash) {
      const publicPaths = ['#/', '#', '#/login', '#/register', '#/forgot'];
      return publicPaths.includes(hash)
        || hash.startsWith('#/reset')
        || hash.startsWith('#/verify/')
        || hash.startsWith('#/setup-account');
    },

    /**
     * Check route guard.
     * Return null if allowed, otherwise a redirect hash.
     */
    check(route, hash) {
      if (this.isPublic(hash)) return null;

      if (!this.isAuthenticated()) {
        return '#/login';
      }

      if (route.guard && !this.hasRole(route.guard)) {
        EH.Toast.error('Access denied');
        return '#/dashboard';
      }

      return null;
    },

    guardByRole(role) {
      if (!this.isAuthenticated()) {
        location.hash = '#/login';
        return false;
      }
      if (this.hasRole(role)) return true;

      if (role === 'admin')       location.hash = '#/dashboard';
      else if (role === 'expert') location.hash = '#/dashboard';
      else                        location.hash = '#/dashboard';

      EH.Toast.error('Access denied');
      return false;
    },
  };

  EH.Guards = Guards;
})(window);
