/* ============================================================
   ExpertHub 2.0 — 11-user.js (entry)
   Learner dashboard entry. Shell, sidebar, dispatcher, action
   routing, shared UI helpers, extended data loader with retry,
   filter-state persistence, and lifecycle hooks.
   ============================================================ */

/* ---------------- CONFIG EXTENSIONS ---------------- */
CONFIG.COURSE_REFUND_WINDOW_DAYS = CONFIG.COURSE_REFUND_WINDOW_DAYS || 14;
CONFIG.REFUND_MAX_PROGRESS_PCT   = CONFIG.REFUND_MAX_PROGRESS_PCT   || 30;
CONFIG.MAX_RESCHEDULES           = CONFIG.MAX_RESCHEDULES           || 2;
CONFIG.CANCEL_FREE_HOURS         = CONFIG.CANCEL_FREE_HOURS         || 24;
CONFIG.INSTANT_RESPONSE_MINS     = CONFIG.INSTANT_RESPONSE_MINS     || 15;
CONFIG.USER_EXPANDED_RETRY_MS    = CONFIG.USER_EXPANDED_RETRY_MS    || 8000;
CONFIG.USER_EXPANDED_MAX_TRIES   = CONFIG.USER_EXPANDED_MAX_TRIES   || 3;

CONFIG.BADGES = CONFIG.BADGES || {
  first_course:       { name: 'First Steps',      icon: 'fa-shoe-prints',       desc: 'Enrolled in your first course' },
  first_completion:   { name: 'Course Complete',  icon: 'fa-graduation-cap',    desc: 'Completed your first course' },
  three_courses:      { name: 'Knowledge Seeker', icon: 'fa-book-open',         desc: 'Completed 3 courses' },
  five_courses:       { name: 'Scholar',          icon: 'fa-graduation-cap',    desc: 'Completed 5 courses' },
  ten_courses:        { name: 'Lifelong Learner', icon: 'fa-brain',             desc: 'Completed 10 courses' },
  first_consultation: { name: 'First Session',    icon: 'fa-comments',          desc: 'Completed your first consultation' },
  five_consultations: { name: 'Consultation Pro', icon: 'fa-user-tie',          desc: 'Completed 5 consultations' },
  streak_7:           { name: 'Week Warrior',     icon: 'fa-fire',              desc: '7-day learning streak' },
  streak_30:          { name: 'Monthly Master',   icon: 'fa-fire-flame-curved', desc: '30-day learning streak' },
  perfect_score:      { name: 'Perfect Score',    icon: 'fa-star',              desc: 'Scored 100% on an assessment' },
  first_certificate:  { name: 'Certified',        icon: 'fa-certificate',       desc: 'Earned your first certificate' },
  path_complete:      { name: 'Path Master',      icon: 'fa-route',             desc: 'Completed a full learning path' },
};

/* ---------------- STATE MIRRORS ---------------- */
Object.assign(S, {
  wishlist: S.wishlist || [], wishlistIds: S.wishlistIds || new Set(),
  enrolledCourseIds: S.enrolledCourseIds || new Set(),
  userXP: S.userXP || 0, userLevel: S.userLevel || 1,
  userBadges: S.userBadges || [],
  userStreak: S.userStreak || { current: 0, longest: 0, last_active: null },
  userPackages: S.userPackages || [],
  userShortlist: S.userShortlist || [],
  userRefunds: S.userRefunds || [],
  coursePaths: S.coursePaths || [], courseBundles: S.courseBundles || [],
  courseDiscussions: S.courseDiscussions || [],
  lessonNotes: S.lessonNotes || [], lessonQuestions: S.lessonQuestions || [],
  personalGoals: S.personalGoals || [], habits: S.habits || [], journalEntries: S.journalEntries || [],
  academicSubjects: S.academicSubjects || [], studyTimetable: S.studyTimetable || [],
  careerPathways: S.careerPathways || [], mentorships: S.mentorships || [],
  skillAssessments: S.skillAssessments || [], tasks: S.tasks || [],
  studyGroups: S.studyGroups || [], resources: S.resources || [],
  userExtLoaded: S.userExtLoaded || false,
  userExtErrors: S.userExtErrors || [],
});

/* ============================================================
   FILTER-STATE STORE (persists across rerenders for the session)
   ============================================================ */
const UserFilters = (function () {
  const store = new Map();
  const KEY = (tab, name) => `${tab}::${name}`;
  return {
    get(tab, name, fallback = '') { return store.has(KEY(tab, name)) ? store.get(KEY(tab, name)) : fallback; },
    set(tab, name, value) { store.set(KEY(tab, name), value); },
    clear(tab) {
      for (const k of Array.from(store.keys())) if (k.startsWith(tab + '::')) store.delete(k);
    },
    clearAll() { store.clear(); },
  };
})();
window.UserFilters = UserFilters;

/* ============================================================
   SHARED UI HELPERS
   ============================================================ */
const UserUI = (function () {
  const page = ({ title, breadcrumb, actions = '', content }) => `
    <div class="breadcrumbs">
      <a href="#/dashboard">Home</a>
      <span>${esc(breadcrumb || title || '')}</span>
    </div>
    <section class="page-header">
      <h1 class="page-title">${esc(title || '')}</h1>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </section>
    ${content}
  `;

  const empty = ({ icon = 'fa-inbox', title = 'Nothing here yet', desc = '', actionTab = '', actionLabel = 'Browse', primary = true }) => `
    <div class="empty-state">
      <i class="fas ${icon}"></i>
      <h3>${esc(title)}</h3>
      ${desc ? `<p>${esc(desc)}</p>` : ''}
      ${actionTab ? `
        <button class="btn ${primary ? 'btn-primary' : 'btn-secondary'}"
                data-action="switch-tab" data-tab="${esc(actionTab)}">
          <i class="fas fa-arrow-right"></i> ${esc(actionLabel)}</button>
      ` : ''}
    </div>
  `;

  const loading = (label = 'Loading…') => `
    <div class="loading-state" role="status" aria-live="polite">
      <i class="fas fa-circle-notch fa-spin"></i>
      <span>${esc(label)}</span>
    </div>
  `;

  const errorState = ({ title = 'Could not load', message = '', retryAction = '', retryLabel = 'Retry' }) => `
    <div class="error-state" role="alert">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>${esc(title)}</h3>
      ${message ? `<p>${esc(message)}</p>` : ''}
      ${retryAction ? `
        <button class="btn btn-primary" data-action="${esc(retryAction)}">
          <i class="fas fa-rotate-right"></i> ${esc(retryLabel)}</button>
      ` : ''}
    </div>
  `;

  const stats = (items = []) => `
    <section class="stat-grid">
      ${items.map(i => `
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">${esc(i.label || '')}</p>
            <p class="stat-value">${i.value ?? 0}</p>
            ${i.sub ? `<p class="stat-sub">${esc(i.sub)}</p>` : ''}
          </div>
          <div class="stat-icon stat-icon-${i.tone || 'blue'}"><i class="fas ${i.icon || 'fa-chart-line'}"></i></div>
        </div>
      `).join('')}
    </section>
  `;

  const tabs = (list = [], active = '', attr = 'data-user-tab') => `
    <nav class="tab-bar" role="tablist">
      ${list.map(t => `
        <button class="tab-btn ${active === t.id ? 'tab-btn-active' : ''}"
                role="tab" aria-selected="${active === t.id}"
                ${attr}="${esc(t.id)}">
          ${t.icon ? `<i class="fas ${t.icon}"></i>` : ''} ${esc(t.label || t.id)}
        </button>
      `).join('')}
    </nav>
  `;

  const table = (headers = [], rows = [], emptyMsg = 'No records') => `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="empty-row">${esc(emptyMsg)}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  const cardGrid = (cards = []) => cards.length
    ? `<section class="card-grid">${cards.join('')}</section>`
    : '';

  const btn = ({ action, id, label, icon, tone = 'primary', size = 'sm', extra = '', disabled = false }) => `
    <button class="btn btn-${tone} btn-${size}"
            data-action="${esc(action)}"
            ${id !== undefined && id !== null ? `data-id="${esc(id)}"` : ''}
            ${extra} ${disabled ? 'disabled aria-disabled="true"' : ''}>
      ${icon ? `<i class="fas ${icon}"></i>` : ''} ${esc(label || '')}
    </button>
  `;

  const statusPill = (status) => {
    const s = String(status || '').toLowerCase();
    const map = {
      pending_payment: 'status-pending', pending_expert_confirmation: 'status-pending',
      confirmed: 'status-active', scheduled: 'status-active', in_grace: 'status-active',
      in_session: 'status-active', awaiting_completion: 'status-pending',
      completed: 'status-active', cancelled: 'status-rejected',
      expired: 'status-rejected', no_show: 'status-rejected', disputed: 'status-pending',
      refunded: 'status-active', pending: 'status-pending', approved: 'status-active',
      rejected: 'status-rejected', draft: 'status-archived', published: 'status-active',
      active: 'status-active', archived: 'status-archived',
      failed: 'status-rejected', reversed: 'status-rejected',
    };
    return `<span class="${map[s] || statusClass(s)}">${esc(s.replace(/_/g, ' '))}</span>`;
  };

  const pagination = ({ page: p = 1, pageSize = 12, total = 0, action = 'user-paginate', key = '' }) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return '';
    return `
      <nav class="pagination" aria-label="Pagination">
        <button class="btn btn-secondary btn-xs" data-action="${action}" data-page="${p - 1}" data-key="${esc(key)}"
                ${p <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
        <span class="pagination-label">Page ${p} of ${totalPages}</span>
        <button class="btn btn-secondary btn-xs" data-action="${action}" data-page="${p + 1}" data-key="${esc(key)}"
                ${p >= totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
      </nav>
    `;
  };

  function formModal({ title, fields = [], submitLabel = 'Save', onSubmit, width = '' }) {
    const body = fields.map(f => {
      const type = f.type || 'text';
      if (type === 'textarea') {
        return `<label class="form-group">
          <span class="form-label">${esc(f.label)}</span>
          <textarea id="fm_${esc(f.name)}" class="form-textarea" rows="${f.rows || 3}" ${f.required ? 'required' : ''}>${esc(f.value || '')}</textarea>
          ${f.hint ? `<p class="form-hint">${esc(f.hint)}</p>` : ''}
        </label>`;
      }
      if (type === 'select') {
        return `<label class="form-group">
          <span class="form-label">${esc(f.label)}</span>
          <select id="fm_${esc(f.name)}" class="form-select" ${f.required ? 'required' : ''}>
            ${(f.options || []).map(o => {
              const v = typeof o === 'string' ? o : o.value;
              const l = typeof o === 'string' ? o : (o.label || o.value);
              return `<option value="${esc(v)}" ${String(f.value) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
            }).join('')}
          </select>
          ${f.hint ? `<p class="form-hint">${esc(f.hint)}</p>` : ''}
        </label>`;
      }
      return `<label class="form-group">
        <span class="form-label">${esc(f.label)}</span>
        <input id="fm_${esc(f.name)}" type="${esc(type)}" class="form-input"
               placeholder="${esc(f.placeholder || '')}"
               value="${esc(f.value ?? '')}"
               ${f.required ? 'required' : ''} ${f.min !== undefined ? `min="${esc(f.min)}"` : ''}
               ${f.max !== undefined ? `max="${esc(f.max)}"` : ''} ${f.step !== undefined ? `step="${esc(f.step)}"` : ''} />
        ${f.hint ? `<p class="form-hint">${esc(f.hint)}</p>` : ''}
      </label>`;
    }).join('');

    openModal({
      title,
      className: width,
      body,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="fm_submit" class="btn btn-primary">${esc(submitLabel)}</button>
      `,
    });

    const submit = async () => {
      const values = {};
      let invalid = null;
      for (const f of fields) {
        const el = document.getElementById(`fm_${f.name}`);
        if (!el) continue;
        let v = el.value;
        if (f.type === 'number') v = v === '' ? null : Number(v);
        if (f.required && (v === '' || v === null)) { invalid = f.label; break; }
        values[f.name] = v;
      }
      if (invalid) return showToast(`${invalid} is required`, 'error');
      const submitBtn = document.getElementById('fm_submit');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving…'; }
      try { await onSubmit(values); }
      catch (e) { showToast(e.message || 'Save failed', 'error'); }
      finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
      }
    };

    const btnEl = document.getElementById('fm_submit');
    if (btnEl) btnEl.onclick = submit;
  }

  return { page, empty, loading, errorState, stats, tabs, table, cardGrid, btn, statusPill, formModal, pagination };
})();
window.UserUI = UserUI;

/* ============================================================
   EXTENDED DATA LOADER (retry-aware, partial-aware)
   ============================================================ */
let __userExtLoadingPromise = null;

async function loadUserExtendedData({ force = false } = {}) {
  if (__userExtLoadingPromise) return __userExtLoadingPromise;
  if (S.userExtLoaded && !force) return;

  S.userExtErrors = [];
  window.ExpertHubUser.state.loadingState = 'loading';

  const attempts = [];
  const add = (name, promise, setter) => {
    attempts.push(
      promise.then(v => { try { setter(v); } catch (e) { S.userExtErrors.push({ name, error: e.message }); } })
             .catch(e => { S.userExtErrors.push({ name, error: e.message || 'failed' }); })
    );
  };

  add('wishlist', apiCall('/api/user/wishlist'), d => {
    S.wishlist = d.items || [];
    S.wishlistIds = new Set(S.wishlist.map(w => String(w.course_id)));
  });
  add('enrollments', apiCall('/api/user/enrollments'), d => {
    S.enrollments = d.enrollments || [];
    S.enrolledCourseIds = new Set(S.enrollments.map(e => String(e.course_id)));
  });
  add('achievements', apiCall('/api/user/achievements'), d => {
    S.userXP = d.xp || 0;
    S.userLevel = d.level || (Math.floor(S.userXP / 500) + 1);
    S.userBadges = d.badges || [];
    S.userStreak = d.streak || S.userStreak;
  });
  add('packages',   apiCall('/api/user/packages'),        d => { S.userPackages = d.packages || []; });
  add('shortlist',  apiCall('/api/user/shortlist'),       d => { S.userShortlist = d.items || []; });
  add('refunds',    apiCall('/api/user/refunds'),         d => { S.userRefunds = d.refunds || []; });
  add('paths',      apiCall('/api/eschool/learning-paths'), d => { S.coursePaths = d.paths || []; });
  add('bundles',    apiCall('/api/eschool/bundles'),      d => { S.courseBundles = d.bundles || []; });
  add('goals',      apiCall('/api/user/goals'),           d => { S.personalGoals = d.goals || []; });
  add('habits',     apiCall('/api/user/habits'),          d => { S.habits = d.habits || []; });
  add('journal',    apiCall('/api/user/journal'),         d => { S.journalEntries = d.entries || []; });
  add('academic',   apiCall('/api/user/academic'), d => {
    S.academicSubjects    = d.subjects || [];
    S.studyTimetable      = d.timetable || [];
    S.academicAssignments = d.assignments || [];
    S.revisionMaterials   = d.revision || [];
  });
  add('career',     apiCall('/api/user/career'),          d => { S.careerPathways = d.pathways || []; });
  add('mentorships',apiCall('/api/user/mentorships'),     d => { S.mentorships = d.mentorships || []; });
  add('skills',     apiCall('/api/user/skills'),          d => { S.skillAssessments = d.assessments || []; });
  add('tasks',      apiCall('/api/user/tasks'),           d => { S.tasks = d.tasks || []; });
  add('studyGroups',apiCall('/api/user/study-groups'),    d => { S.studyGroups = d.groups || []; });
  add('resources',  apiCall('/api/user/resources'),       d => { S.resources = d.resources || []; });

  __userExtLoadingPromise = Promise.allSettled(attempts)
    .then(() => {
      const failed = S.userExtErrors.length;
      const total = attempts.length;
      if (failed === 0) {
        S.userExtLoaded = true;
        window.ExpertHubUser.state.loadingState = 'ok';
      } else if (failed < total) {
        // Partial: keep usable but do not mark fully loaded, so retry can run
        window.ExpertHubUser.state.loadingState = 'partial';
      } else {
        window.ExpertHubUser.state.loadingState = 'failed';
      }
      window.ExpertHubUser.state.lastLoadedAt = Date.now();
      window.ExpertHubUser.state.lastError = failed
        ? `Failed to load ${failed} section${failed === 1 ? '' : 's'}`
        : null;
      window.ExpertHubUser.syncStateFromS();
    })
    .finally(() => { __userExtLoadingPromise = null; });

  return __userExtLoadingPromise;
}

/** Retry with exponential backoff if partial/failed (opt-in). */
async function retryUserExtendedDataIfNeeded() {
  const state = window.ExpertHubUser.state;
  if (state.loadingState === 'ok' || state.loadingState === 'loading') return;
  for (let i = 0; i < CONFIG.USER_EXPANDED_MAX_TRIES; i++) {
    await loadUserExtendedData({ force: true });
    if (window.ExpertHubUser.state.loadingState === 'ok') return;
    await new Promise(r => setTimeout(r, CONFIG.USER_EXPANDED_RETRY_MS * (i + 1)));
  }
}

/* ============================================================
   DASHBOARD ENTRY
   ============================================================ */
function renderUserDashboard() {
  if (!currentUser) {
    return shell({
      roleClass: 'role-user', brandIcon: 'fa-user-circle',
      brandTitle: 'My Panel', brandSubtitle: 'ExpertHub',
      nav: '', roleLabel: 'User Panel',
      content: UserUI.errorState({ title: 'Session expired', message: 'Please sign in again.' }),
    });
  }

  const intent = S.userIntent || currentUser?.intent || 'both';
  const showLearn   = intent === 'learn'   || intent === 'both';
  const showConsult = intent === 'consult' || intent === 'both';

  const mine = (S.consultations || []).filter(c => c.user_id === currentUser?.id);
  const activeCons = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session']
      .includes(c.status)
  ).length;
  const unreadBadges = (S.userBadges || []).filter(b => !b.seen).length;

  const nav = `
    <div class="sidebar-section-title">Overview</div>
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}

    ${showLearn ? '<div class="sidebar-section-title">Learning</div>' : ''}
    ${showLearn ? sidebarItem('eschool','E-School','fa-school') : ''}
    ${showLearn ? sidebarItem('my-learning','My Learning','fa-graduation-cap') : ''}
    ${showLearn ? sidebarItem('learning-paths','Learning Paths','fa-route') : ''}
    ${showLearn ? sidebarItem('bundles','Bundles','fa-box-open') : ''}
    ${showLearn ? sidebarItem('wishlist','Wishlist','fa-heart') : ''}
    ${showLearn ? sidebarItem('certificates','Certificates','fa-certificate') : ''}
    ${showLearn ? sidebarItem('achievements','Achievements','fa-trophy', unreadBadges) : ''}
    ${showLearn ? sidebarItem('course-notes','My Notes','fa-sticky-note') : ''}

    ${showLearn ? '<div class="sidebar-section-title">Academic</div>' : ''}
    ${showLearn ? sidebarItem('academic','Academic Support','fa-graduation-cap') : ''}
    ${showLearn ? sidebarItem('skills','Skills & Competency','fa-puzzle-piece') : ''}

    <div class="sidebar-section-title">Career</div>
    ${sidebarItem('career','Career Center','fa-briefcase')}
    ${sidebarItem('mentorship','Mentorship','fa-user-friends')}

    <div class="sidebar-section-title">Growth</div>
    ${sidebarItem('personal-development','Personal Development','fa-seedling')}
    ${sidebarItem('productivity','Productivity','fa-list-check')}

    <div class="sidebar-section-title">Community</div>
    ${sidebarItem('community','Learning Community','fa-users-rectangle')}
    ${sidebarItem('resources','Resource Library','fa-folder-open')}

    ${showConsult ? '<div class="sidebar-section-title">Sessions</div>' : ''}
    ${showConsult ? sidebarItem('experts','Find Experts','fa-search') : ''}
    ${sidebarItem('consultations','My Consultations','fa-comments', activeCons)}
    ${showConsult ? sidebarItem('packages','Session Packages','fa-ticket-alt') : ''}
    ${showConsult ? sidebarItem('shortlist','Shortlist','fa-bookmark') : ''}

    <div class="sidebar-section-title">Events</div>
    ${sidebarItem('events','Events','fa-calendar-alt')}

    <div class="sidebar-section-title">Finance</div>
    ${sidebarItem('wallet','Wallet','fa-wallet')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
    ${showLearn ? sidebarItem('refunds','Refund Requests','fa-rotate-left') : ''}
    ${sidebarItem('claims','Claims','fa-gavel')}

    <div class="sidebar-section-title">Support</div>
    ${sidebarItem('support','Support','fa-headset')}

    <div class="sidebar-section-title">Account</div>
    ${sidebarItem('profile','Profile','fa-user')}
  `;

  const content = renderUserContent();

  shell({
    roleClass: 'role-user',
    brandIcon: 'fa-user-circle',
    brandTitle: 'My Panel',
    brandSubtitle: 'ExpertHub',
    nav,
    roleLabel: 'User Panel',
    content,
  });

  attachRoleEvents();
  attachUserActionListener();
  initActiveUserModule();

  if (!S.userExtLoaded || window.ExpertHubUser.state.loadingState === 'partial') {
    loadUserExtendedData().then(() => rerenderRoleContent()).catch(() => {});
  }
}

/* ============================================================
   CONTENT DISPATCHER (with module lifecycle)
   ============================================================ */
let __lastUserTab = null;

function renderUserContent() {
  const ns = window.ExpertHubUser;
  const tab = activeTab || 'dashboard';

  // Cleanup previous module
  if (__lastUserTab && __lastUserTab !== tab) {
    ns.cleanupModule?.(__lastUserTab);
  }
  __lastUserTab = tab;

  const aliases = {
    'dashboard': 'overview',
    'eschool': 'learning',
    'my-learning': 'learning',
    'course-notes': 'lesson-notes',
  };
  const key = aliases[tab] || tab;

  try {
    if (ns?.hasModule(key)) return ns.modules[key](tab);
    if (ns?.hasModule(tab)) return ns.modules[tab](tab);
  } catch (e) {
    ns.reportError(tab, e);
    return UserUI.errorState({
      title: 'Module failed to render',
      message: e.message || 'Unknown error',
      retryAction: 'switch-tab', retryLabel: 'Reload',
    });
  }

  return UserUI.page({
    title: 'Module unavailable',
    content: `<div class="alert alert-warning">
      <i class="fas fa-exclamation-triangle"></i>
      <div>The <strong>${esc(tab)}</strong> module is not yet loaded.
      Ensure the corresponding file in <code>/dashboards/user/</code> is included in <code>index.html</code>.</div>
    </div>`,
  });
}

/** Called after shell attaches — lets modules wire DOM (event helpers etc). */
function initActiveUserModule() {
  const ns = window.ExpertHubUser;
  const tab = activeTab || 'dashboard';
  const aliases = { 'dashboard': 'overview', 'eschool': 'learning', 'my-learning': 'learning', 'course-notes': 'lesson-notes' };
  const key = aliases[tab] || tab;
  const host = document.getElementById('role-content') || document.body;
  ns.initModule?.(key, host);
}

/* ============================================================
   ACTION DISPATCHER
   ============================================================ */
async function dispatchUserAction(action, id, el) {
  const ns = window.ExpertHubUser;
  if (!ns || !ns.hasAction(action)) {
    if (typeof handleAction === 'function') return handleAction(action, id, el);
    showToast(`Action not implemented: ${action}`, 'warning');
    return;
  }
  if (!ns.canDo(action)) {
    showToast('You do not have permission to do that', 'warning');
    return;
  }
  // Disable button while running to prevent double-submit
  let restore = null;
  if (el && el.tagName === 'BUTTON' && !el.disabled) {
    const originalHTML = el.innerHTML;
    el.disabled = true;
    restore = () => { el.disabled = false; el.innerHTML = originalHTML; };
  }
  try {
    return await ns.actions[action](id, el);
  } finally {
    if (restore) restore();
  }
}
window.dispatchUserAction = dispatchUserAction;

/* Session expiry check invoked after any action failure. */
function handleUserActionFailure(err) {
  const msg = String(err?.message || '');
  if (/401|unauthori[sz]ed|session expired|token expired/i.test(msg)) {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    currentUser = null;
    showToast('Session expired — please sign in again', 'warning', 6000);
    setTimeout(() => { location.hash = '#/login'; }, 800);
    return true;
  }
  return false;
}

/* Delegated click listener — scoped to .role-user and registered actions only. */
let __userActionListenerInstalled = false;
function attachUserActionListener() {
  if (__userActionListenerInstalled) return;
  __userActionListenerInstalled = true;

  document.addEventListener('click', async (e) => {
    const target = e.target.closest('.role-user [data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const ns = window.ExpertHubUser;
    if (!ns || !ns.hasAction(action)) return;
    if (e.defaultPrevented) return;

    e.preventDefault();
    try {
      await dispatchUserAction(action, target.dataset.id, target);
    } catch (ex) {
      if (handleUserActionFailure(ex)) return;
      showToast(ex.message || 'Action failed', 'error');
    }
  });
}

/* ============================================================
   SHARED HELPERS
   ============================================================ */
function fmtInTz(d, tz) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-US', {
      timeZone: tz || 'UTC',
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return fmtDT(d); }
}

function timeUntil(d) {
  if (!d) return '';
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return 'starting now';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  const dd = Math.floor(h / 24);
  return `in ${dd}d ${h % 24}h`;
}

function levelFromXP(xp) {
  const x = Number(xp) || 0;
  return Math.max(1, Math.floor(x / 500) + 1);
}
function xpForLevel(level) { return Math.max(0, (Number(level) - 1) * 500); }
function xpProgressPercent(xp) {
  const lvl = levelFromXP(xp);
  const start = xpForLevel(lvl);
  const end = xpForLevel(lvl + 1);
  return pct(end === start ? 0 : ((xp - start) / (end - start)) * 100);
}
function truncateHash(h, n = 8) {
  if (!h) return '';
  return h.length <= n * 2 ? h : `${h.slice(0, n)}…${h.slice(-n)}`;
}

/** True if a session is currently joinable (server authoritatively confirms at join time). */
function canJoinSessionNow(c) {
  if (!c) return false;
  if (!['confirmed','in_grace','in_session'].includes(c.status)) return false;
  if (!c.scheduled_at) return false;
  const start = new Date(c.scheduled_at).getTime();
  const dur   = (Number(c.duration_minutes) || 30) * 60000;
  const grace = 15 * 60000;
  const now   = Date.now();
  return now >= start - 5 * 60000 && now <= start + dur + grace;
}

/** Client-side hint; server remains authoritative. */
function canCancelSession(c) {
  if (!c) return false;
  if (!['pending_expert_confirmation','confirmed','scheduled'].includes(c.status)) return false;
  if (!c.scheduled_at) return true;
  const hrs = (new Date(c.scheduled_at).getTime() - Date.now()) / 3600000;
  return hrs >= CONFIG.CANCEL_FREE_HOURS || c.status === 'pending_expert_confirmation';
}

function canRescheduleSession(c) {
  if (!c) return false;
  if (!['confirmed','scheduled'].includes(c.status)) return false;
  if ((c.reschedule_count || 0) >= CONFIG.MAX_RESCHEDULES) return false;
  if (!c.scheduled_at) return true;
  const hrs = (new Date(c.scheduled_at).getTime() - Date.now()) / 3600000;
  return hrs >= CONFIG.CANCEL_FREE_HOURS;
}

/** refreshUserSnapshot — pull fresh user + wallet + consultations after a mutation. */
async function refreshUserSnapshot() {
  try {
    const me = await apiCall('/api/auth/me');
    if (me?.user) currentUser = me.user;
  } catch {}
  try { await reloadWallet?.(); } catch {}
  try { await reloadConsultations?.(); } catch {}
}

window.UserHelpers = {
  fmtInTz, timeUntil, levelFromXP, xpForLevel, xpProgressPercent, truncateHash,
  canJoinSessionNow, canCancelSession, canRescheduleSession, refreshUserSnapshot,
};

/* Refresh user state on cross-tab changes */
window.addEventListener('storage', (e) => {
  if (e.key === 'user' || e.key === 'token') {
    if (!e.newValue) { location.hash = '#/login'; return; }
    try { currentUser = JSON.parse(localStorage.getItem('user')); } catch {}
    rerenderRoleContent?.();
  }
});