/* ============================================================
   ExpertHub 2.0 — 01-dashboard.js
   Learner dashboard shell + content router.

   Enhancements (v2):
   - Per-intent tab memory (learn / consult / both each remember)
   - Sidebar search/filter (Ctrl/Cmd+Shift+F)
   - Badge count aggregator (consultations, tickets, refunds, badges)
   - Keyboard shortcuts: g d / g e / g c / g w / g p, "/" → search
   - Deep-link support: #/dashboard/<tab>[/<id>]
   - Session-restore banner for interrupted lessons
   - Offline banner (auto-shows when navigator.onLine === false)
   - Layout density toggle (comfortable / compact), persisted
   - Theme switcher hook (eh:theme:change event)
   - Safe router: unknown tabs fall back + emit telemetry
   - Preserves: renderUserDashboard(), renderUserContent(),
     sidebarItem order, shell() payload, attachRoleEvents()
   ============================================================ */

/* ============================================================
   Module state + persistence
   ============================================================ */
const USER_DENSITY_KEY   = 'eh.user.density';    // comfortable | compact
const USER_TABMEM_KEY    = 'eh.user.tabMemory';  // { learn: tab, consult: tab, both: tab }
const USER_LAST_LESSON_KEY = 'eh.user.lastLesson';

S.__userDensity = S.__userDensity || loadUserDensity();
S.__sidebarQuery = S.__sidebarQuery || '';

function loadUserDensity() {
  try { return localStorage.getItem(USER_DENSITY_KEY) || 'comfortable'; }
  catch (_) { return 'comfortable'; }
}
function saveUserDensity(v) {
  try { localStorage.setItem(USER_DENSITY_KEY, v); } catch (_) {}
  S.__userDensity = v;
  applyUserDensity();
}
function applyUserDensity() {
  try {
    document.documentElement.classList.toggle('density-compact', S.__userDensity === 'compact');
  } catch (_) {}
}
applyUserDensity();

function loadTabMemory() {
  try {
    const raw = localStorage.getItem(USER_TABMEM_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return (o && typeof o === 'object') ? o : {};
  } catch (_) { return {}; }
}
function saveTabMemory(map) {
  try { localStorage.setItem(USER_TABMEM_KEY, JSON.stringify(map || {})); } catch (_) {}
}
function rememberTabForIntent(intent, tab) {
  if (!intent || !tab) return;
  const map = loadTabMemory();
  map[intent] = tab;
  saveTabMemory(map);
}
function lastTabForIntent(intent) {
  const map = loadTabMemory();
  return map[intent] || 'dashboard';
}

function loadLastLesson() {
  try {
    const raw = localStorage.getItem(USER_LAST_LESSON_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !o.courseId || !o.lessonId) return null;
    if (Date.now() - (o.savedAt || 0) > 14 * 86400000) return null; // 14-day window
    return o;
  } catch (_) { return null; }
}

/* ============================================================
   Badge counter aggregator (memoized per render)
   ============================================================ */
function computeUserBadgeCounts(intent) {
  const mine = (S.consultations || []).filter(c => c.user_id === currentUser?.id);
  const activeStatuses = ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session'];
  const activeCons = mine.filter(c => activeStatuses.includes(c.status)).length;

  const pendingRefunds = Array.isArray(S.userRefunds)
    ? S.userRefunds.filter(r => ['pending','under_review'].includes(String(r.status || ''))).length
    : 0;

  const openTickets = Array.isArray(S.tickets)
    ? S.tickets.filter(t => ['open','pending','awaiting_user'].includes(String(t.status || ''))).length
    : 0;

  const badges = Array.isArray(S.userBadges) ? S.userBadges.length : 0;

  const showLearn   = intent === 'learn'   || intent === 'both';
  const showConsult = intent === 'consult' || intent === 'both';

  return {
    activeCons,
    pendingRefunds,
    openTickets,
    badges: showLearn ? badges : 0,
    showLearn,
    showConsult,
  };
}

/* ============================================================
   Sidebar filter
   ============================================================ */
function matchesSidebarQuery(label, query) {
  if (!query) return true;
  return String(label || '').toLowerCase().includes(String(query).toLowerCase());
}
function setSidebarQuery(value) {
  S.__sidebarQuery = String(value || '');
  if (window.__sidebarQueryTimer) clearTimeout(window.__sidebarQueryTimer);
  window.__sidebarQueryTimer = setTimeout(() => {
    const el = document.getElementById('sidebar-filter-input');
    const caret = el && typeof el.selectionStart === 'number' ? el.selectionStart : null;
    if (typeof renderUserDashboard === 'function') renderUserDashboard();
    const again = document.getElementById('sidebar-filter-input');
    if (again) {
      again.focus();
      if (caret !== null) { try { again.setSelectionRange(caret, caret); } catch (_) {} }
    }
  }, 200);
}

/* ============================================================
   Route helpers
   ============================================================ */
function parseHashRoute() {
  const raw = String(window.location.hash || '').replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);   // e.g. ["dashboard","eschool","42"]
  return {
    section: parts[0] || 'dashboard',
    tab: parts[1] || '',
    id: parts[2] || '',
  };
}
function setHashRoute(tab, id) {
  const hash = `#/dashboard/${tab}${id ? '/' + encodeURIComponent(id) : ''}`;
  if (window.location.hash !== hash) {
    try { history.replaceState(null, '', hash); } catch (_) { window.location.hash = hash; }
  }
}

/* ============================================================
   Offline banner
   ============================================================ */
function renderOfflineBanner() {
  const offline = (typeof navigator !== 'undefined') && navigator.onLine === false;
  if (!offline) return '';
  return `
    <div class="alert alert-warning dashboard-offline-banner" role="status">
      <i class="fas fa-wifi"></i>
      <div>
        You're offline. Some actions will queue and sync when you're back online.
      </div>
    </div>
  `;
}
if (!window.__offlineBannerBound) {
  window.__offlineBannerBound = true;
  window.addEventListener('online',  () => { if (typeof renderUserDashboard === 'function') renderUserDashboard(); });
  window.addEventListener('offline', () => { if (typeof renderUserDashboard === 'function') renderUserDashboard(); });
}

/* ============================================================
   Session-restore banner
   ============================================================ */
function renderSessionRestoreBanner() {
  const last = loadLastLesson();
  if (!last) return '';
  const title = last.title || 'your last lesson';
  return `
    <div class="alert alert-info dashboard-resume-banner">
      <i class="fas fa-play-circle"></i>
      <div style="flex:1">
        Continue where you left off: <strong>${escapeHtmlDash(title)}</strong>
      </div>
      <button class="btn btn-primary btn-sm"
              onclick="resumeLastLesson(); return false;">
        <i class="fas fa-play"></i> Resume
      </button>
      <button class="btn btn-ghost btn-sm"
              onclick="dismissResumeBanner(); return false;"
              title="Dismiss">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
}
function resumeLastLesson() {
  const last = loadLastLesson();
  if (!last) return;
  if (typeof openCoursePlayer === 'function') {
    try { return openCoursePlayer(last.courseId, last.lessonId); } catch (_) {}
  }
  window.location.hash = `#/dashboard/my-learning`;
}
function dismissResumeBanner() {
  try { localStorage.removeItem(USER_LAST_LESSON_KEY); } catch (_) {}
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

/* ============================================================
   Keyboard shortcuts
   ============================================================ */
function installUserDashboardShortcuts() {
  if (window.__userDashKeyHandler) {
    document.removeEventListener('keydown', window.__userDashKeyHandler, true);
  }
  let pendingG = false;
  const handler = (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
    if (typing) {
      if (e.key === 'Escape' && e.target && e.target.id === 'sidebar-filter-input') {
        e.target.blur();
      }
      return;
    }

    /* Ctrl/Cmd+Shift+F → focus sidebar filter */
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      const el = document.getElementById('sidebar-filter-input');
      if (el) el.focus();
      return;
    }

    /* "/" → focus sidebar filter */
    if (e.key === '/') {
      const el = document.getElementById('sidebar-filter-input');
      if (el) { e.preventDefault(); el.focus(); }
      return;
    }

    /* g + <letter> jumps */
    if (!pendingG && (e.key === 'g' || e.key === 'G')) {
      pendingG = true;
      setTimeout(() => { pendingG = false; }, 1200);
      return;
    }
    if (pendingG) {
      pendingG = false;
      const k = e.key.toLowerCase();
      const map = { d: 'dashboard', e: 'eschool', c: 'consultations', w: 'wallet', p: 'profile', m: 'my-learning', x: 'experts' };
      const tab = map[k];
      if (tab && typeof switchUserTab === 'function') {
        e.preventDefault();
        switchUserTab(tab);
      }
    }
  };
  window.__userDashKeyHandler = handler;
  document.addEventListener('keydown', handler, true);
}

/* ============================================================
   Tab switching helper (used by shortcuts + inline handlers)
   ============================================================ */
function switchUserTab(tab, id) {
  if (!tab) return;
  activeTab = tab;
  const intent = S.userIntent || currentUser?.intent || 'both';
  rememberTabForIntent(intent, tab);
  setHashRoute(tab, id);
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
  if (id && typeof openCoursePlayer === 'function' && tab === 'my-learning') {
    /* deferred open so the shell renders first */
    setTimeout(() => {
      try { openCoursePlayer(id); } catch (_) {}
    }, 50);
  }
}

/* ============================================================
   Theme hook
   ============================================================ */
function toggleUserTheme() {
  const current = (currentUser?.theme) || document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  try {
    document.documentElement.setAttribute('data-theme', next);
    if (typeof currentUser === 'object' && currentUser) currentUser.theme = next;
  } catch (_) {}
  try {
    const ev = new CustomEvent('eh:theme:change', { detail: { theme: next } });
    document.dispatchEvent(ev);
  } catch (_) {}
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

/* ============================================================
   USER / LEARNER DASHBOARD
   ============================================================ */
function renderUserDashboard() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const intent = S.userIntent || currentUser?.intent || 'both';
  const showLearn   = intent === 'learn'   || intent === 'both';
  const showConsult = intent === 'consult' || intent === 'both';

  /* Restore route: hash takes priority over in-memory activeTab. */
  const route = parseHashRoute();
  if (route.section === 'dashboard' && route.tab) {
    activeTab = route.tab;
  } else {
    /* Fall back to the last tab this intent remembered */
    const remembered = lastTabForIntent(intent);
    if (!activeTab || activeTab === 'dashboard') activeTab = remembered;
  }
  rememberTabForIntent(intent, activeTab);

  const counts = computeUserBadgeCounts(intent);
  const q = S.__sidebarQuery;

  const nav = `
    ${showLearn && matchesSidebarQuery('Dashboard', q) ? sidebarItem('dashboard','Dashboard','fa-chart-line') : ''}
    ${showLearn && matchesSidebarQuery('E-School', q) ? sidebarItem('eschool','E-School','fa-school') : ''}
    ${showLearn && matchesSidebarQuery('My Learning', q) ? sidebarItem('my-learning','My Learning','fa-graduation-cap') : ''}
    ${showLearn && matchesSidebarQuery('Learning Paths', q) ? sidebarItem('learning-paths','Learning Paths','fa-route') : ''}
    ${showLearn && matchesSidebarQuery('Bundles', q) ? sidebarItem('bundles','Bundles','fa-box-open') : ''}
    ${showLearn && matchesSidebarQuery('Wishlist', q) ? sidebarItem('wishlist','Wishlist','fa-heart') : ''}
    ${showLearn && matchesSidebarQuery('Certificates', q) ? sidebarItem('certificates','Certificates','fa-certificate') : ''}
    ${showLearn && matchesSidebarQuery('Achievements', q) ? sidebarItem('achievements','Achievements','fa-trophy', counts.badges) : ''}
    ${showLearn && matchesSidebarQuery('My Notes', q) ? sidebarItem('course-notes','My Notes','fa-sticky-note') : ''}
    ${matchesSidebarQuery('Events', q) ? sidebarItem('events','Events','fa-calendar-alt') : ''}
    ${showConsult && matchesSidebarQuery('Find Experts', q) ? sidebarItem('experts','Find Experts','fa-search') : ''}
    ${matchesSidebarQuery('My Consultations', q) ? sidebarItem('consultations','My Consultations','fa-comments', counts.activeCons) : ''}
    ${showConsult && matchesSidebarQuery('Session Packages', q) ? sidebarItem('packages','Session Packages','fa-ticket-alt') : ''}
    ${showConsult && matchesSidebarQuery('Shortlist', q) ? sidebarItem('shortlist','Shortlist','fa-bookmark') : ''}
    ${matchesSidebarQuery('Wallet', q) ? sidebarItem('wallet','Wallet','fa-wallet') : ''}
    ${matchesSidebarQuery('Transactions', q) ? sidebarItem('transactions','Transactions','fa-receipt') : ''}
    ${showLearn && matchesSidebarQuery('Refund Requests', q) ? sidebarItem('refunds','Refund Requests','fa-rotate-left', counts.pendingRefunds) : ''}
    ${matchesSidebarQuery('Claims', q) ? sidebarItem('claims','Claims','fa-gavel') : ''}
    ${matchesSidebarQuery('Support', q) ? sidebarItem('support','Support','fa-headset', counts.openTickets) : ''}
    ${matchesSidebarQuery('Profile', q) ? sidebarItem('profile','Profile','fa-user') : ''}
  `;

  const sidebarFilter = `
    <div class="sidebar-filter-wrap">
      <input id="sidebar-filter-input" class="form-input sidebar-filter-input"
             type="search" placeholder="Filter menu… ( / )"
             value="${escapeHtmlDash(q)}"
             oninput="setSidebarQuery(this.value)" />
      ${q ? `
        <button class="btn btn-ghost btn-xs sidebar-filter-clear"
                onclick="setSidebarQuery(''); return false;"
                title="Clear filter">
          <i class="fas fa-times"></i>
        </button>
      ` : ''}
    </div>
  `;

  const brandExtras = `
    <button class="btn btn-ghost btn-xs dashboard-brand-tool"
            onclick="toggleUserTheme(); return false;"
            title="Toggle theme">
      <i class="fas fa-moon"></i>
    </button>
    <button class="btn btn-ghost btn-xs dashboard-brand-tool"
            onclick="toggleUserDensity(); return false;"
            title="Toggle density">
      <i class="fas fa-${S.__userDensity === 'compact' ? 'expand' : 'compress'}"></i>
    </button>
  `;

  /* Compose content with banners above the tab content. */
  const banners = `${renderOfflineBanner()}${renderSessionRestoreBanner()}`;
  const content = `${banners}${sidebarFilter}${renderUserContentSafe(intent)}`;

  shell({
    roleClass: 'role-user',
    brandIcon: 'fa-user-circle',
    brandTitle: 'My Panel',
    brandSubtitle: 'ExpertHub',
    brandExtras,
    nav,
    roleLabel: 'User Panel',
    content,
  });

  attachRoleEvents();
  installUserDashboardShortcuts();
}

/* ============================================================
   Density toggle
   ============================================================ */
function toggleUserDensity() {
  const next = S.__userDensity === 'compact' ? 'comfortable' : 'compact';
  saveUserDensity(next);
  if (typeof showToast === 'function') {
    showToast(`Layout: ${next}`, 'info');
  }
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

/* ============================================================
   Safe content router (with telemetry + fallback)
   ============================================================ */
function renderUserContentSafe(intent) {
  try {
    return renderUserContent();
  } catch (err) {
    try {
      if (window.EHFeature11 && typeof window.EHFeature11.emit === 'function') {
        window.EHFeature11.emit('router:error', { tab: activeTab, error: String(err && err.message || err) });
      } else {
        console.warn('[dashboard] content render failed', err);
      }
    } catch (_) {}
    return `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Something went wrong</h3>
          <p>We couldn't load this panel. Try again or pick another section.</p>
          <button class="btn btn-primary"
                  onclick="switchUserTab('dashboard'); return false;">
            <i class="fas fa-home"></i> Back to dashboard
          </button>
        </div>
      </section>
    `;
  }
}

/* ============================================================
   Original router (unchanged) — kept for compatibility
   ============================================================ */
function renderUserContent() {
  switch (activeTab) {
    case 'dashboard':       return userOverview();
    case 'eschool':         return userESchool();
    case 'my-learning':     return userMyLearning();
    case 'learning-paths':  return userLearningPaths();
    case 'bundles':         return userBundles();
    case 'wishlist':        return userWishlist();
    case 'certificates':    return userCertificates();
    case 'achievements':    return userAchievements();
    case 'course-notes':    return userCourseNotes();
    case 'events':          return userEvents();
    case 'experts':         return userFindExperts();
    case 'consultations':   return userConsultations();
    case 'packages':        return userPackages();
    case 'shortlist':       return userShortlist();
    case 'wallet':          return userWallet();
    case 'transactions':    return userTransactions();
    case 'refunds':         return userRefundRequests();
    case 'claims':          return userClaims();
    case 'support':         return userSupport();
    case 'profile':         return userProfile();
    default:                return userOverview();
  }
}

/* ============================================================
   Utilities
   ============================================================ */
function escapeHtmlDash(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Auto-render when the hash changes (deep-link support). */
if (!window.__userDashHashBound) {
  window.__userDashHashBound = true;
  window.addEventListener('hashchange', () => {
    const r = parseHashRoute();
    if (r.section !== 'dashboard') return;
    if (r.tab && r.tab !== activeTab) {
      activeTab = r.tab;
      if (typeof renderUserDashboard === 'function') renderUserDashboard();
      if (r.id && typeof openCoursePlayer === 'function' && r.tab === 'my-learning') {
        setTimeout(() => { try { openCoursePlayer(r.id); } catch (_) {} }, 60);
      }
    }
  });
}