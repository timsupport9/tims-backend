/* ============================================================
   ExpertHub 2.0 — 15-router.js
   Router + hashchange listener + keyboard shortcuts + init().
   MUST load LAST.
   ============================================================ */

/* ============================================================
   ROUTER
   ============================================================ */
async function route() {
  const hash = location.hash || '#/';

  if (hash === '#/login') return renderLogin();
  if (hash === '#/register') return renderRegister();
  if (hash.startsWith('#/forgot')) return renderForgot();
  if (hash.startsWith('#/reset')) {
    const params = new URLSearchParams(hash.split('?')[1]);
    return renderReset(params.get('token'));
  }
  if (hash.startsWith('#/verify/')) return renderVerify(hash.split('/')[2]);
  if (hash.startsWith('#/setup-account')) {
    const params = new URLSearchParams(hash.split('?')[1]);
    return renderSetupAccount(params.get('email'), params.get('token'));
  }

  if (!authToken) return renderLanding();

  appPhase = 'dashboard';
  if (!currentUser) {
    try {
      const me = await apiCall('/api/auth/me');
      currentUser = me.user;
      currentUserRole = me.user.role;
      S.userIntent = me.user.intent || 'both';
    } catch (_) { return logout(); }
  }

  const needLoad = !S.users.length && !S.consultations.length && !S.courses.length
    && !S.programmes.length && !S.institutions.length;
  if (needLoad) {
    showLoading(true);
    try { await loadAllData(); } finally { showLoading(false); }
  }

  const seg = hash.replace('#/', '').split('/');
  if (seg[1]) activeTab = seg[1];
  renderDashboard();
  startPolling();
}

window.addEventListener('hashchange', route);

/* Keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' && appPhase === 'dashboard') {
    e.preventDefault();
    document.querySelector('input[type=search]')?.focus();
  }
});

/* ---------- Bootstrap ---------- */
(function init() {
  initTheme();
  const savedToken = localStorage.getItem('token');
  const savedRefresh = localStorage.getItem('refresh');
  const savedUser = localStorage.getItem('user');

  if (savedToken) {
    authToken = savedToken;
    refreshToken = savedRefresh;
    try { currentUser = JSON.parse(savedUser); } catch (_) { currentUser = null; }
    currentUserRole = currentUser?.role || null;
    S.userIntent = currentUser?.intent || 'both';
    initializeSocket();
  }
  route();
})();

/* ============================================================
   END OF FILE
   ============================================================ */
