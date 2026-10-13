/* ============================================================
   services/auth-service.js — Session, login, register, logout
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { API, Store, State, bus, EVENTS } = EH;

  const Auth = {
    async login(email, password) {
      const data = await API.post('/api/auth/login', { email, password });
      State.authToken = data.token;
      State.refreshToken = data.refresh;
      State.currentUser = data.user;
      State.currentUserRole = data.user.role;
      State.userIntent = data.user.intent || 'both';

      Store.setToken(data.token);
      Store.setRefresh(data.refresh);
      Store.setUser(data.user);

      if (data.user.theme) {
        EH.Theme?.apply?.(data.user.theme);
      }

      if (data.user.role === 'institution') {
        try {
          const b = await API.get('/api/institution/branding');
          EH.Theme?.applyBranding?.(b?.branding);
        } catch (_) {}
      }

      EH.Socket?.connect?.();
      bus?.emit(EVENTS?.AUTH_LOGIN || 'auth:login', data.user);
      return data.user;
    },

    async register(payload) {
      const data = await API.post('/api/auth/register', payload);
      return data;
    },

    async logout() {
      try {
        if (State.refreshToken) {
          await API.post('/api/auth/logout', { refresh: State.refreshToken });
        }
      } catch (_) {}
      EH.Socket?.disconnect?.();
      State.socket = null;
      State.authToken = null;
      State.refreshToken = null;
      State.currentUser = null;
      State.currentUserRole = null;
      State.userIntent = 'both';
      Store.clearAuth();
      bus?.emit(EVENTS?.AUTH_LOGOUT || 'auth:logout');
      location.hash = '#/';
    },

    async me() {
      const data = await API.get('/api/auth/me');
      State.currentUser = data.user;
      State.currentUserRole = data.user.role;
      Store.setUser(data.user);
      return data.user;
    },

    async forgot(email) {
      return API.post('/api/auth/forgot', { email });
    },

    async reset(token, password) {
      return API.post('/api/auth/reset', { token, password });
    },

    async changePassword(oldPassword, newPassword) {
      return API.put('/api/auth/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
    },

    async setupAccount(email, password, token) {
      return API.post('/api/auth/setup-account', { email, password, token });
    },

    isAuthenticated() {
      return !!State.authToken;
    },

    hasRole(role) {
      return State.currentUserRole === role;
    },

    hasAnyRole(roles = []) {
      return roles.includes(State.currentUserRole);
    },
  };

  EH.Auth = Auth;
  // Legacy aliases
  global.login = (e, p) => Auth.login(e, p);
  global.register = (payload) => Auth.register(payload);
  global.logout = () => Auth.logout();
})(window);
