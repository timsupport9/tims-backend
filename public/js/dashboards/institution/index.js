/* ============================================================
   ExpertHub 2.0 — Institution Dashboard Entry
   Dispatcher, chart rendering, permission-filtered nav,
   keyboard shortcuts, global search, refresh coordination.
   Must load AFTER helpers.js.
   ============================================================ */

/* ── Navigation metadata (id, label, icon, badgeKey, permission) ── */
const INSTITUTION_NAV = [
  { id: 'dashboard',       label: 'Dashboard',              icon: 'fa-chart-line',    perm: 'programmes:read' },
  { id: 'analytics',       label: 'Analytics Center',       icon: 'fa-chart-pie',     perm: 'reports:read' },
  { id: 'programmes',      label: 'Programmes',             icon: 'fa-diagram-project',perm: 'programmes:read' },
  { id: 'learning-paths',  label: 'Learning Paths',         icon: 'fa-route',          perm: 'programmes:read' },
  { id: 'cohorts',         label: 'Cohorts and Batches',    icon: 'fa-layer-group',    perm: 'cohorts:read',   badgeKey: 'upcomingSessions' },
  { id: 'training',        label: 'Training Delivery',      icon: 'fa-chalkboard-user',perm: 'training:read' },
  { id: 'assessments',     label: 'Assessments',            icon: 'fa-clipboard-check',perm: 'assessments:read' },
  { id: 'proctor',         label: 'Proctored Exams',        icon: 'fa-shield-halved',  perm: 'assessments:read' },
  { id: 'question-bank',   label: 'Question Bank',          icon: 'fa-database',       perm: 'assessments:read' },
  { id: 'projects',        label: 'Capstone Projects',      icon: 'fa-briefcase',      perm: 'assessments:read' },
  { id: 'trainees',        label: 'Trainees',               icon: 'fa-users',          perm: 'trainees:read' },
  { id: 'wellness',        label: 'Wellness & Engagement',  icon: 'fa-heart-pulse',    perm: 'trainees:read',  badgeKey: 'wellnessAlerts' },
  { id: 'certifications',  label: 'Certifications',         icon: 'fa-award',          perm: 'certifications:read', badgeKey: 'expiringCerts' },
  { id: 'skills',          label: 'Skills Matrix',          icon: 'fa-puzzle-piece',   perm: 'trainees:read' },
  { id: 'skills-gap',      label: 'Skills Gap',             icon: 'fa-chart-simple',   perm: 'reports:read' },
  { id: 'compliance',      label: 'Compliance',             icon: 'fa-file-shield',    perm: 'compliance:read' },
  { id: 'succession',      label: 'Succession Planning',    icon: 'fa-sitemap',        perm: 'trainees:read' },
  { id: 'instructors',     label: 'Instructors',            icon: 'fa-user-tie',       perm: 'instructors:read' },
  { id: 'marketplace',     label: 'Instructor Market',      icon: 'fa-people-arrows',  perm: 'marketplace:read' },
  { id: 'budgets',         label: 'Budgets',                icon: 'fa-coins',          perm: 'budgets:read',   badgeKey: 'budgetAlerts' },
  { id: 'campuses',        label: 'Campuses & Branches',    icon: 'fa-building',       perm: 'campuses:read' },
  { id: 'reports',         label: 'Reports',                icon: 'fa-file-lines',     perm: 'reports:read' },
  { id: 'report-builder',  label: 'Report Builder',         icon: 'fa-table-columns',  perm: 'reports:read' },
  { id: 'announcements',   label: 'Announcements',          icon: 'fa-bullhorn',       perm: 'announcements:read' },
  { id: 'integrations',    label: 'Integrations & API',     icon: 'fa-plug',           perm: 'integrations:read' },
  { id: 'security',        label: 'SSO & Security',         icon: 'fa-lock',           perm: 'security:read' },
  { id: 'operations',      label: 'Operations Control',     icon: 'fa-sliders',        perm: 'operations:*',   badgeKey: 'pendingApprovals', opsOnly: true },
  { id: 'branding',        label: 'Custom Branding',        icon: 'fa-palette',        perm: 'operations:*',   opsOnly: true },
  { id: 'profile',         label: 'Institution Profile',    icon: 'fa-building-columns',perm: 'programmes:read' },
];

function renderInstitutionDashboard() {
  if (!currentUser) return renderLogin();

  /* ── Guard: ensure institution context exists ───────────── */
  if (currentUserRole !== 'institution') {
    return renderErrorState({
      title: 'Institution access required',
      description: 'This dashboard is only available to institution accounts.',
    });
  }

  const inst = S.myInstitution || {};
  const isOpsManager = currentUser.institution_role === 'operations_manager';

  /* ── Compute live badges ────────────────────────────────── */
  const pendingApprovals = (S.institutionApprovals || []).filter(a => a.status === 'pending').length;

  const expiringCerts = (S.institutionCertificates || []).filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - Date.now()) / 86400000;
    return days > 0 && days < 90;
  }).length;

  const upcomingSessions = (S.institutionSessions || []).filter(s =>
    s.status === 'scheduled' && new Date(s.scheduled_at) > new Date()
  ).length;

  const atRiskCount = (S.wellnessAlerts || []).filter(a =>
    a.severity === 'high' || a.severity === 'critical'
  ).length;

  const budgetAlerts = (S.budgetAllocations || []).filter(b =>
    (b.allocated ? (b.spent / b.allocated) * 100 : 0) >= 80
  ).length;

  const badges = {
    pendingApprovals, expiringCerts, upcomingSessions,
    wellnessAlerts: atRiskCount, budgetAlerts,
  };

  /* ── Build nav, filtered by permission + ops-only ───────── */
  const nav = INSTITUTION_NAV
    .filter(item => {
      if (item.opsOnly && !isOpsManager) return false;
      if (item.perm === 'operations:*') return isOpsManager;
      return hasInstitutionPermission(item.perm);
    })
    .map(item => {
      const badge = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
      return sidebarItem(item.id, item.label, item.icon, badge);
    })
    .join('');

  /* ── Notification center / search bar ───────────────────── */
  const topBarExtras = buildInstitutionTopBar(isOpsManager);

  shell({
    roleClass: 'role-institution',
    brandIcon: 'fa-building-columns',
    brandTitle: esc(inst.name || currentUser.institution_name || 'Institution'),
    brandSubtitle: 'Corporate Training Hub',
    nav,
    roleLabel: isOpsManager ? 'Operations Manager' : 'Institution Panel',
    content: `
      ${topBarExtras}
      <div id="institutionViewRoot">
        ${safeRender(() => renderInstitutionContent())}
      </div>`,
  });

  attachRoleEvents();
  renderInstitutionCharts();
  attachInstitutionInteractions();
  attachInstitutionKeyboardShortcuts();
}

/* ── Top bar (search + notifications + refresh) ─────────────── */
function buildInstitutionTopBar(isOpsManager) {
  const unread = S.unreadNotifications || 0;
  return `
    <div class="institution-topbar" style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm" data-action="open-global-search" title="Search (press /)">
        <i class="fas fa-search"></i> Search
      </button>
      <button class="btn btn-secondary btn-sm" data-action="open-notification-center">
        <i class="fas fa-bell"></i>
        ${unread ? `<span class="chip chip-red" style="margin-left:4px">${unread}</span>` : ''}
      </button>
      <button class="btn btn-primary btn-sm" data-action="refresh-all" title="Refresh data">
        <i class="fas fa-rotate"></i> Refresh
      </button>
      ${isOpsManager ? `<span class="chip chip-blue" title="Operations privileges active">Ops</span>` : ''}
    </div>`;
}

/* ── Content dispatcher (unchanged signature) ───────────────── */
function renderInstitutionContent() {
  switch (activeTab) {
    case 'dashboard':       return instOverview();
    case 'analytics':       return instAnalyticsCenter();
    case 'programmes':      return instProgrammes();
    case 'learning-paths':  return instLearningPaths();
    case 'cohorts':         return instCohorts();
    case 'training':        return instTraining();
    case 'assessments':     return instAssessments();
    case 'proctor':         return instProctorSessions();
    case 'question-bank':   return instQuestionBank();
    case 'projects':        return instProjects();
    case 'trainees':        return instTrainees();
    case 'wellness':        return instWellness();
    case 'certifications':  return instCertifications();
    case 'skills':          return instSkills();
    case 'skills-gap':      return instSkillsGap();
    case 'compliance':      return instCompliance();
    case 'succession':      return instSuccession();
    case 'instructors':     return instInstructors();
    case 'marketplace':     return instMarketplace();
    case 'budgets':         return instBudgets();
    case 'campuses':        return instCampuses();
    case 'reports':         return instReports();
    case 'report-builder':  return instReportBuilder();
    case 'announcements':   return instAnnouncements();
    case 'integrations':    return instIntegrations();
    case 'security':        return instSecurity();
    case 'operations':      return instOperations();
    case 'branding':        return instBranding();
    case 'profile':         return instProfile();
    default:                return instOverview();
  }
}

/* ── Error boundary for individual view renderers ───────────── */
function safeRender(renderFn) {
  try {
    return renderFn();
  } catch (err) {
    console.error('View render failed:', err);
    return renderErrorState({
      title: 'Unable to load this view',
      description: err.message || 'An unexpected error occurred.',
      onRetry: 'data-action="refresh-all"',
    });
  }
}

/* ── Chart rendering — only draws when data is present ──────── */
function renderInstitutionCharts() {
  if (!window.Chart) return;

  const rootStyle = getComputedStyle(document.documentElement);
  const primary = rootStyle.getPropertyValue('--brand').trim() || '#1e3a8a';
  const accent  = rootStyle.getPropertyValue('--accent').trim() || '#059669';

  const trends = S.institutionAnalytics?.trends || {};

  /* Trainee progress trend */
  renderSafeChart('chartInstProgress', {
    type: 'line',
    data: {
      labels: (trends.progress || []).map(x => x.label),
      datasets: [{
        label: 'Average Progress',
        data: (trends.progress || []).map(x => x.value),
        borderColor: primary,
        backgroundColor: hexToRgba(primary, 0.15),
        tension: 0.3, fill: true,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  }, 'Progress data will appear once trainees begin their programmes.');

  /* Assessment score distribution */
  renderSafeChart('chartInstAssess', {
    type: 'bar',
    data: {
      labels: ['0-59', '60-69', '70-79', '80-89', '90-100'],
      datasets: [{
        label: 'Trainees',
        data: S.institutionAnalytics?.scoreDistribution || [],
        backgroundColor: accent, borderRadius: 6,
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  }, 'Score distribution will appear once assessments are graded.');

  /* Enrollment trend */
  renderSafeChart('chartEnrollmentTrend', {
    type: 'line',
    data: {
      labels: (trends.enrollment || []).map(x => x.label),
      datasets: [{
        label: 'Enrollments',
        data: (trends.enrollment || []).map(x => x.value),
        borderColor: primary,
        backgroundColor: hexToRgba(primary, 0.15),
        tension: 0.3, fill: true,
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  }, 'Enrollment data will appear once trainees register.');

  /* Completion trend */
  renderSafeChart('chartCompletionTrend', {
    type: 'line',
    data: {
      labels: (trends.completion || []).map(x => x.label),
      datasets: [{
        label: 'Completed',
        data: (trends.completion || []).map(x => x.value),
        borderColor: accent,
        backgroundColor: hexToRgba(accent, 0.15),
        tension: 0.3, fill: true,
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  }, 'Completion data will appear once trainees finish programmes.');

  /* Revenue */
  renderSafeChart('chartRevenueTrend', {
    type: 'bar',
    data: {
      labels: (trends.revenue || []).map(x => x.label),
      datasets: [{
        label: 'Revenue',
        data: (trends.revenue || []).map(x => x.value),
        backgroundColor: primary, borderRadius: 6,
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  }, 'Revenue data will appear once billing is configured.');

  /* Programme mix */
  renderSafeChart('chartProgrammeMix', {
    type: 'doughnut',
    data: {
      labels: (S.institutionAnalytics?.programmeMix || []).map(x => x.label),
      datasets: [{
        data: (S.institutionAnalytics?.programmeMix || []).map(x => x.value),
        backgroundColor: ['#1e3a8a','#059669','#7c3aed','#f59e0b','#dc2626'],
      }],
    },
    options: { responsive: true },
  }, 'Programme mix will appear once programmes are created.');
}

/* ── Interaction wiring ─────────────────────────────────────── */
function attachInstitutionInteractions() {
  /* Skills matrix click-cycle */
  document.querySelectorAll('.skills-cell').forEach(cell => {
    cell.onclick = async () => {
      const cur  = Number(cell.dataset.level);
      const next = (cur + 1) % 6;
      const colours = CONFIG.SKILL_LEVEL_COLOURS;
      const dot = cell.querySelector('.skill-level-dot');

      cell.dataset.level = next;
      dot.style.background = colours[next];
      dot.style.color = next >= 4 ? '#fff' : '#374151';
      dot.textContent = next;

      try {
        await apiCall('/api/institution/skills/assess', 'PUT', {
          trainee_id: Number(cell.dataset.trainee),
          skill_id:   Number(cell.dataset.skill),
          level: next,
        });
      } catch (e) {
        showToast(e.message, 'error');
        cell.dataset.level = cur;
        dot.style.background = colours[cur];
        dot.style.color = cur >= 4 ? '#fff' : '#374151';
        dot.textContent = cur;
      }
    };
  });

  /* Filter binding (debounced text + immediate select) */
  const bind = (sel, handler) => { const el = $(sel); if (el) el.oninput = handler; };
  const bindChange = (sel, handler) => { const el = $(sel); if (el) el.onchange = handler; };

  bindChange('#trainee-status-filter', () => rerenderRoleContent());
  bind('#trainee-search',    debounce(() => rerenderRoleContent(), 300));
  bind('#programmes-q',      debounce(() => rerenderRoleContent(), 300));
  bindChange('#programmes-status', () => rerenderRoleContent());
  bind('#qb-search',         debounce(() => rerenderRoleContent(), 300));
  bind('#market-search',     debounce(() => rerenderRoleContent(), 300));
  bind('#global-search-input', debounce(e => runGlobalSearch(e.target.value), 250));
}

/* ── Keyboard shortcuts ─────────────────────────────────────── */
function attachInstitutionKeyboardShortcuts() {
  if (window.__instKeyboardAttached) return;
  window.__instKeyboardAttached = true;

  document.addEventListener('keydown', e => {
    /* '/' focuses search unless in an input */
    if (e.key === '/' && !isTypingTarget(e.target)) {
      e.preventDefault();
      handleAction('open-global-search');
    }
    /* Esc closes modals (delegated to foundation) */
    /* Ctrl/Cmd+R triggers refresh */
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r' && !e.shiftKey) {
      e.preventDefault();
      handleAction('refresh-all');
    }
  });
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

/* ── Global search (dashboard-wide) ─────────────────────────── */
async function runGlobalSearch(query) {
  S.globalSearch.query = query || '';
  if (!S.globalSearch.query) {
    S.globalSearch.results = [];
    renderGlobalSearchResults();
    return;
  }
  S.globalSearch.loading = true;
  renderGlobalSearchResults();
  try {
    const d = await apiCall(`/api/institution/search?q=${encodeURIComponent(query)}`);
    S.globalSearch.results = d.results || [];
  } catch {
    S.globalSearch.results = [];
  } finally {
    S.globalSearch.loading = false;
    renderGlobalSearchResults();
  }
}

function renderGlobalSearchResults() {
  const container = document.getElementById('globalSearchResults');
  if (!container) return;
  const { loading, results, query } = S.globalSearch;
  if (!query) {
    container.innerHTML = `<p class="form-hint" style="padding:12px">Type to search across trainees, programmes, cohorts, certificates…</p>`;
    return;
  }
  if (loading) {
    container.innerHTML = renderSkeleton(4);
    return;
  }
  if (!results.length) {
    container.innerHTML = renderEmptyState({
      icon: 'fa-search',
      title: 'No matches',
      description: `No results for “${esc(query)}”`,
      compact: true,
    });
    return;
  }
  container.innerHTML = `
    <ul class="list-stack">
      ${results.map(r => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">
              <span class="chip chip-neutral">${esc(r.type)}</span>
              ${esc(r.title)}
            </span>
            <span class="list-row-sub">${esc(r.subtitle || '')}</span>
          </div>
          <button class="btn btn-secondary btn-xs" data-action="open-search-result"
                  data-type="${esc(r.type)}" data-id="${esc(r.id)}">Open</button>
        </li>`).join('')}
    </ul>`;
}

/* ── Refresh coordination (prevents concurrent refreshes) ───── */
let _refreshPromise = null;
async function refreshInstitutionData() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      showLoading(true);
      await loadAllData();
      rerenderRoleContent();
      renderInstitutionCharts();
      showToast('Dashboard refreshed', 'success', 2000);
    } catch (e) {
      showToast(e.message || 'Refresh failed', 'error');
    } finally {
      showLoading(false);
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}
