/* ============================================================
   ExpertHub 2.0 — 15-router.js
   Router + hashchange listener + keyboard shortcuts + init().
   MUST load LAST.
   ============================================================ */

/* ============================================================
   PUBLIC FRONT DOOR — routePublic()
   ------------------------------------------------------------
   Dispatches to js/public/pages/* before any auth or dashboard
   logic runs. Returns true when a public page handled the hash,
   so the caller can `return` immediately.

   Public routes owned by this function:
     #/courses          → PublicUI.pages.courses.render()
     #/courses/:id      → PublicUI.pages.courseDetail.render({ id })
     #/experts          → PublicUI.pages.experts.render()
     #/experts/:id      → PublicUI.pages.expertDetail.render({ id })
     #/events           → PublicUI.pages.events.render()
     #/events/:id       → PublicUI.pages.eventDetail.render({ id })
     #/resources        → PublicUI.pages.resources.render()
     #/about            → PublicUI.pages.about.render()
     #/contact          → PublicUI.pages.contact.render()
     #/institutions     → PublicUI.pages.institutions.render()

   Deliberately NOT handled here:
     #/                 → falls through so that:
                            • guests        → renderLanding()
                            • authenticated → dashboard
     #/login, #/register, #/forgot, #/reset, #/verify/*,
     #/setup-account    → still handled by the auth block below.

   If PublicUI is unavailable (script error), this returns false
   and everything degrades to the original 15-file behaviour.
   ============================================================ */
function routePublic(hash) {
  var P = window.PublicUI;
  if (!P || !P.pages) return false;

  var raw = String(hash || '').replace(/^#/, '');

  /* Support #/#anchor links (e.g. #/#pricing from the footer).
     Split off the trailing anchor before parsing the route. */
  var anchor = null;
  var innerHash = raw.indexOf('#', 1);
  if (innerHash !== -1) {
    anchor = raw.slice(innerHash + 1);
    raw = raw.slice(0, innerHash);
  }

  var path = raw.split('?')[0] || '/';
  var qs   = new URLSearchParams(raw.split('?')[1] || '');
  var seg  = path.split('/').filter(Boolean);
  var key  = seg[0] || '';
  var id   = seg[1] ? decodeURIComponent(seg[1]) : null;

  var handled = false;

  switch (key) {
    case 'courses':
      if (id && P.pages.courseDetail)      { P.pages.courseDetail.render({ id: id }); handled = true; }
      else if (P.pages.courses)            { P.pages.courses.render({ query: qs });  handled = true; }
      break;

    case 'experts':
      if (id && P.pages.expertDetail)      { P.pages.expertDetail.render({ id: id }); handled = true; }
      else if (P.pages.experts)            { P.pages.experts.render();                handled = true; }
      break;

    case 'events':
      if (id && P.pages.eventDetail)       { P.pages.eventDetail.render({ id: id });  handled = true; }
      else if (P.pages.events)             { P.pages.events.render();                 handled = true; }
      break;

    case 'resources':
      if (P.pages.resources)               { P.pages.resources.render();              handled = true; }
      break;

    case 'about':
      if (P.pages.about)                   { P.pages.about.render();                  handled = true; }
      break;

    case 'contact':
      if (P.pages.contact)                 { P.pages.contact.render();                handled = true; }
      break;

    case 'institutions':
      if (P.pages.institutions)            { P.pages.institutions.render();           handled = true; }
      break;

    default:
      return false;
  }

  if (!handled) return false;

  /* Scroll behaviour after a public route change. */
  if (anchor) {
    setTimeout(function () {
      var el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  } else {
    try { window.scrollTo({ top: 0, behavior: 'auto' }); }
    catch (_) { window.scrollTo(0, 0); }
  }

  /* Fire analytics if the public layer exposes it. */
  if (P.analytics && typeof P.analytics.track === 'function') {
    try { P.analytics.track('page_view', { path: path }); } catch (_) {}
  }

  return true;
}

/* ============================================================
   ROUTER
   ============================================================ */
async function route() {
  const hash = location.hash || '#/';

  /* ---- Public front door takes priority --------------------- */
  if (routePublic(hash)) return;

  /* ---- Auth pages ------------------------------------------- */
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

  /* ---- Landing (guests) or Dashboard (authenticated) -------- */
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