/* ============================================================
   auth/refresh-token.js — Token refresh scheduler
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  let timer = null;

  function schedule() {
    clear();
    const token = EH.state.authToken;
    if (!token) return;
    const exp = EH.Session?.expiresAt(token);
    if (!exp) return;
    const refreshAt = exp - Date.now() - 60000;
    if (refreshAt <= 0) return;
    timer = setTimeout(refresh, Math.min(refreshAt, 15 * 60 * 1000));
  }

  async function refresh() {
    try {
      const refreshToken = EH.state.refreshToken || EH.Store?.getRefresh?.();
      if (!refreshToken) return;
      const r = await fetch((EH.CONFIG.API_BASE || '') + '/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!r.ok) throw new Error('refresh failed');
      const data = await r.json();
      EH.state.authToken = data.token;
      EH.Store.setToken(data.token);
      EH.bus?.emit(EH.EVENTS?.AUTH_REFRESH || 'auth:refresh', data);
      schedule();
    } catch (_) {
      EH.Logger?.warn?.('Token refresh failed');
    }
  }

  function clear() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  EH.TokenRefresh = { schedule, refresh, clear };
})(window);
