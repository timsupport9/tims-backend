/* ============================================================
   auth/route-guards.js — Route access control
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const RouteGuards = {
    requireAuth() {
      if (!EH.state.authToken) {
        location.hash = '#/login';
        return false;
      }
      return true;
    },

    requireRole(role) {
      if (!this.requireAuth()) return false;
      if (EH.state.currentUserRole !== role) {
        EH.Toast.error('Access denied');
        location.hash = '#/dashboard';
        return false;
      }
      return true;
    },

    requireAnyRole(roles = []) {
      if (!this.requireAuth()) return false;
      if (!roles.includes(EH.state.currentUserRole)) {
        EH.Toast.error('Access denied');
        location.hash = '#/dashboard';
        return false;
      }
      return true;
    },

    requireAdmin()       { return this.requireRole('admin'); },
    requireExpert()      { return this.requireRole('expert'); },
    requireInstitution() { return this.requireRole('institution'); },

    isPublicRoute(hash) {
      const publicRoutes = ['#/', '#/login', '#/register', '#/forgot', '#/reset', '#/verify'];
      return publicRoutes.some(r => hash === r || hash.startsWith(r + '/'));
    },

    isOpsManager() {
      return EH.state.currentUser?.institution_role === 'operations_manager';
    },
  };

  EH.RouteGuards = RouteGuards;
  global.routeGuards = RouteGuards;
})(window);
