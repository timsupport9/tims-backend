/* ============================================================
   ExpertHub 2.0 — 11-user.js (entry)
   Learner dashboard entry. Shell, sidebar, dispatcher, action
   routing, shared UI helpers, and extended data loader.
   Module pages live in /dashboards/user/*.js
   ============================================================ */

/* ============================================================
   CONFIG EXTENSIONS
   ============================================================ */
CONFIG.COURSE_REFUND_WINDOW_DAYS = CONFIG.COURSE_REFUND_WINDOW_DAYS || 14;
CONFIG.REFUND_MAX_PROGRESS_PCT   = CONFIG.REFUND_MAX_PROGRESS_PCT   || 30;
CONFIG.MAX_RESCHEDULES           = CONFIG.MAX_RESCHEDULES           || 2;
CONFIG.CANCEL_FREE_HOURS         = CONFIG.CANCEL_FREE_HOURS         || 24;
CONFIG.INSTANT_RESPONSE_MINS     = CONFIG.INSTANT_RESPONSE_MINS     || 15;

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

/* ============================================================
   STATE MIRRORS (mirror the ns.state bucket onto S for
   backwards compatibility with code that reads S.wishlist etc.)
   ============================================================ */
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
});

/* ============================================================
   SHARED UI HELPERS  (UserUI.*)
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
    <nav class="tab-bar">
      ${list.map(t => `
        <button class="tab-btn ${active === t.id ? 'tab-btn-active' : ''}"
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
            ${extra} ${disabled ? 'disabled' : ''}>
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
    };
    return `<span class="${map[s] || statusClass(s)}">${esc(s.replace(/_/g, ' '))}</span>`;
  };

  /**
   * Generic form modal. fields: [{ name, label, type, options, value, required, placeholder, hint }]
   * onSubmit(values) may be async.
   */
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

    document.getElementById('fm_submit').onclick = async () => {
      const values = {};
      for (const f of fields) {
        const el = document.getElementById(`fm_${f.name}`);
        if (!el) continue;
        let v = el.value;
        if (f.type === 'number') v = v === '' ? null : Number(v);
        values[f.name] = v;
      }
      try { await onSubmit(values); }
      catch (e) { showToast(e.message || 'Save failed', 'error'); }
    };
  }

  return { page, empty, stats, tabs, table, cardGrid, btn, statusPill, formModal };
})();

window.UserUI = UserUI;

/* ============================================================
   EXTENDED DATA LOADER
   ============================================================ */
async function loadUserExtendedData() {
  if (S.userExtLoaded) return;
  const tasks = [
    apiCall('/api/user/wishlist').then(d => {
      S.wishlist = d.items || [];
      S.wishlistIds = new Set(S.wishlist.map(w => String(w.course_id)));
    }).catch(() => {}),
    apiCall('/api/user/enrollments').then(d => {
      S.enrollments = d.enrollments || [];
      S.enrolledCourseIds = new Set(S.enrollments.map(e => String(e.course_id)));
    }).catch(() => {}),
    apiCall('/api/user/achievements').then(d => {
      S.userXP = d.xp || 0;
      S.userLevel = d.level || (Math.floor(S.userXP / 500) + 1);
      S.userBadges = d.badges || [];
      S.userStreak = d.streak || S.userStreak;
    }).catch(() => {}),
    apiCall('/api/user/packages').then(d => { S.userPackages = d.packages || []; }).catch(() => {}),
    apiCall('/api/user/shortlist').then(d => { S.userShortlist = d.items || []; }).catch(() => {}),
    apiCall('/api/user/refunds').then(d => { S.userRefunds = d.refunds || []; }).catch(() => {}),
    apiCall('/api/eschool/learning-paths').then(d => { S.coursePaths = d.paths || []; }).catch(() => {}),
    apiCall('/api/eschool/bundles').then(d => { S.courseBundles = d.bundles || []; }).catch(() => {}),
    apiCall('/api/user/goals').then(d => { S.personalGoals = d.goals || []; }).catch(() => {}),
    apiCall('/api/user/habits').then(d => { S.habits = d.habits || []; }).catch(() => {}),
    apiCall('/api/user/journal').then(d => { S.journalEntries = d.entries || []; }).catch(() => {}),
    apiCall('/api/user/academic').then(d => {
      S.academicSubjects    = d.subjects || [];
      S.studyTimetable      = d.timetable || [];
      S.academicAssignments = d.assignments || [];
      S.revisionMaterials   = d.revision || [];
    }).catch(() => {}),
    apiCall('/api/user/career').then(d => { S.careerPathways = d.pathways || []; }).catch(() => {}),
    apiCall('/api/user/mentorships').then(d => { S.mentorships = d.mentorships || []; }).catch(() => {}),
    apiCall('/api/user/skills').then(d => { S.skillAssessments = d.assessments || []; }).catch(() => {}),
    apiCall('/api/user/tasks').then(d => { S.tasks = d.tasks || []; }).catch(() => {}),
    apiCall('/api/user/study-groups').then(d => { S.studyGroups = d.groups || []; }).catch(() => {}),
    apiCall('/api/user/resources').then(d => { S.resources = d.resources || []; }).catch(() => {}),
  ];
  await Promise.allSettled(tasks);
  S.userExtLoaded = true;
}

/* ============================================================
   DASHBOARD ENTRY
   ============================================================ */
function renderUserDashboard() {
  const intent = S.userIntent || currentUser?.intent || 'both';
  const showLearn   = intent === 'learn'   || intent === 'both';
  const showConsult = intent === 'consult' || intent === 'both';

  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
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

  shell({
    roleClass: 'role-user',
    brandIcon: 'fa-user-circle',
    brandTitle: 'My Panel',
    brandSubtitle: 'ExpertHub',
    nav,
    roleLabel: 'User Panel',
    content: renderUserContent(),
  });

  attachRoleEvents();
  attachUserActionListener();

  if (!S.userExtLoaded) {
    loadUserExtendedData().then(() => rerenderRoleContent()).catch(() => {});
  }
}

/* ============================================================
   CONTENT DISPATCHER
   ============================================================ */
function renderUserContent() {
  const ns = window.ExpertHubUser;
  const tab = activeTab || 'dashboard';

  // Aliases: some tabs share a module renderer
  const aliases = {
    'dashboard': 'overview',
    'eschool': 'learning',
    'my-learning': 'learning',
    'course-notes': 'lesson-notes',
  };
  const key = aliases[tab] || tab;

  if (ns && ns.hasModule(key)) return ns.modules[key](tab);
  if (ns && ns.hasModule(tab)) return ns.modules[tab](tab);

  return UserUI.page({
    title: 'Module unavailable',
    content: `<div class="alert alert-warning">
      <i class="fas fa-exclamation-triangle"></i>
      <div>The <strong>${esc(tab)}</strong> module is not yet loaded.
      Ensure the corresponding file in <code>/dashboards/user/</code> is included in <code>index.html</code>.</div>
    </div>`,
  });
}

/* ============================================================
   ACTION DISPATCHER
   ============================================================ */
async function dispatchUserAction(action, id, el) {
  const ns = window.ExpertHubUser;
  if (!ns || !ns.hasAction(action)) {
    // Fall through to the global handler if 14-actions.js already defines it
    if (typeof handleAction === 'function') {
      return handleAction(action, id, el);
    }
    showToast(`Action not implemented: ${action}`, 'warning');
    return;
  }
  return ns.actions[action](id, el);
}

window.dispatchUserAction = dispatchUserAction;

/**
 * Delegated click listener scoped to the user shell.
 * Fires ONLY for actions registered in ExpertHubUser.actions, so it never
 * interferes with admin/expert/institution actions handled by 14-actions.js.
 */
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

    // Avoid double-handling if 14-actions.js already swallowed the event
    if (e.defaultPrevented) return;

    e.preventDefault();
    try {
      await dispatchUserAction(action, target.dataset.id, target);
    } catch (ex) {
      showToast(ex.message || 'Action failed', 'error');
    }
  });
}

/* ============================================================
   SHARED CONSULTATION / XP HELPERS
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

function xpForLevel(level) {
  return Math.max(0, (Number(level) - 1) * 500);
}

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

/* Expose so modules can use them without duplicating */
window.UserHelpers = {
  fmtInTz, timeUntil, levelFromXP, xpForLevel, xpProgressPercent, truncateHash,
};
