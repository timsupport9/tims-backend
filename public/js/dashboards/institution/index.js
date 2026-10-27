/* ============================================================
   ExpertHub 2.0 — Institution Dashboard Entry
   Dispatcher, charts, interactions.
   ============================================================ */

function renderInstitutionDashboard() {
  if (!currentUser) return renderLogin();
  const inst = S.myInstitution || {};
  const isOpsManager = currentUser.institution_role === 'operations_manager';
  const pendingApprovals = S.institutionApprovals.filter(a => a.status === 'pending').length;
  const expiringCerts = S.institutionCertificates.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - Date.now()) / 86400000;
    return days > 0 && days < 90;
  }).length;
  const upcomingSessions = S.institutionSessions.filter(s =>
    s.status === 'scheduled' && new Date(s.scheduled_at) > new Date()
  ).length;
  const atRiskCount = (S.wellnessAlerts || []).filter(a =>
    a.severity === 'high' || a.severity === 'critical').length;
  const budgetAlerts = (S.budgetAllocations || []).filter(b =>
    (b.allocated ? (b.spent / b.allocated) * 100 : 0) >= 80).length;

  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('analytics','Analytics Center','fa-chart-pie')}
    ${sidebarItem('programmes','Programmes','fa-diagram-project')}
    ${sidebarItem('learning-paths','Learning Paths','fa-route')}
    ${sidebarItem('cohorts','Cohorts and Batches','fa-layer-group', upcomingSessions)}
    ${sidebarItem('training','Training Delivery','fa-chalkboard-user')}
    ${sidebarItem('assessments','Assessments','fa-clipboard-check')}
    ${sidebarItem('proctor','Proctored Exams','fa-shield-halved')}
    ${sidebarItem('question-bank','Question Bank','fa-database')}
    ${sidebarItem('projects','Capstone Projects','fa-briefcase')}
    ${sidebarItem('trainees','Trainees','fa-users')}
    ${sidebarItem('wellness','Wellness & Engagement','fa-heart-pulse', atRiskCount)}
    ${sidebarItem('certifications','Certifications','fa-award', expiringCerts)}
    ${sidebarItem('skills','Skills Matrix','fa-puzzle-piece')}
    ${sidebarItem('skills-gap','Skills Gap','fa-chart-simple')}
    ${sidebarItem('compliance','Compliance','fa-file-shield')}
    ${sidebarItem('succession','Succession Planning','fa-sitemap')}
    ${sidebarItem('instructors','Instructors','fa-user-tie')}
    ${sidebarItem('marketplace','Instructor Market','fa-people-arrows')}
    ${sidebarItem('budgets','Budgets','fa-coins', budgetAlerts)}
    ${sidebarItem('campuses','Campuses & Branches','fa-building')}
    ${sidebarItem('reports','Reports','fa-file-lines')}
    ${sidebarItem('report-builder','Report Builder','fa-table-columns')}
    ${sidebarItem('announcements','Announcements','fa-bullhorn')}
    ${sidebarItem('integrations','Integrations & API','fa-plug')}
    ${sidebarItem('security','SSO & Security','fa-lock')}
    ${isOpsManager ? sidebarItem('operations','Operations Control','fa-sliders', pendingApprovals) : ''}
    ${isOpsManager ? sidebarItem('branding','Custom Branding','fa-palette') : ''}
    ${sidebarItem('profile','Institution Profile','fa-building-columns')}
  `;

  shell({
    roleClass: 'role-institution',
    brandIcon: 'fa-building-columns',
    brandTitle: esc(inst.name || currentUser.institution_name || 'Institution'),
    brandSubtitle: 'Corporate Training Hub',
    nav,
    roleLabel: isOpsManager ? 'Operations Manager' : 'Institution Panel',
    content: renderInstitutionContent(),
  });
  attachRoleEvents();
  renderInstitutionCharts();
  attachInstitutionInteractions();
}

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

function renderInstitutionCharts() {
  if (!window.Chart) return;
  const rootStyle = getComputedStyle(document.documentElement);
  const primary = rootStyle.getPropertyValue('--brand').trim() || '#1e3a8a';
  const accent  = rootStyle.getPropertyValue('--accent').trim() || '#059669';

  const safeChart = (canvasId, config, dependency) => {
    const el = document.getElementById(canvasId);
    if (!el || el.dataset.rendered) return;
    new Chart(el, config);
    el.dataset.rendered = '1';
  };

  safeChart('chartInstProgress', {
    type: 'line',
    data: {
      labels: ['Week 1','Week 2','Week 3','Week 4','Week 5','Week 6'],
      datasets: [{
        label: 'Average Progress',
        data: [10, 25, 42, 58, 74, 88],
        borderColor: primary,
        backgroundColor: hexToRgba(primary, 0.15),
        tension: 0.3, fill: true,
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 100 } } },
  });

  safeChart('chartInstAssess', {
    type: 'bar',
    data: {
      labels: ['0-59','60-69','70-79','80-89','90-100'],
      datasets: [{ label: 'Trainees', data: [3,7,15,22,11],
        backgroundColor: accent, borderRadius: 6 }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });

  safeChart('chartEnrollmentTrend', {
    type: 'line',
    data: {
      labels: (S.institutionAnalytics?.trends?.enrollment || []).map(x => x.label) || ['W1','W2','W3','W4'],
      datasets: [{
        label: 'Enrollments',
        data: (S.institutionAnalytics?.trends?.enrollment || []).map(x => x.value) || [24,38,52,71],
        borderColor: primary,
        backgroundColor: hexToRgba(primary, 0.15),
        tension: 0.3, fill: true,
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });

  safeChart('chartCompletionTrend', {
    type: 'line',
    data: {
      labels: (S.institutionAnalytics?.trends?.completion || []).map(x => x.label) || ['W1','W2','W3','W4'],
      datasets: [{
        label: 'Completed',
        data: (S.institutionAnalytics?.trends?.completion || []).map(x => x.value) || [12,22,38,55],
        borderColor: accent,
        backgroundColor: hexToRgba(accent, 0.15),
        tension: 0.3, fill: true,
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });

  safeChart('chartRevenueTrend', {
    type: 'bar',
    data: {
      labels: (S.institutionAnalytics?.trends?.revenue || []).map(x => x.label) || ['M1','M2','M3','M4'],
      datasets: [{
        label: 'Revenue',
        data: (S.institutionAnalytics?.trends?.revenue || []).map(x => x.value) || [5000,8200,7400,9600],
        backgroundColor: primary, borderRadius: 6,
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });

  safeChart('chartProgrammeMix', {
    type: 'doughnut',
    data: {
      labels: (S.institutionAnalytics?.programmeMix || []).map(x => x.label) ||
        ['Bootcamp','Short Course','Certification','Compliance'],
      datasets: [{
        data: (S.institutionAnalytics?.programmeMix || []).map(x => x.value) || [12,8,6,4],
        backgroundColor: ['#1e3a8a','#059669','#7c3aed','#f59e0b','#dc2626'],
      }],
    },
    options: { responsive: true },
  });
}

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

  /* Live-filter inputs */
  const bind = (sel, handler) => { const el = $(sel); if (el) el.oninput = handler; };
  const bindChange = (sel, handler) => { const el = $(sel); if (el) el.onchange = handler; };

  bindChange('#trainee-status-filter', () => rerenderRoleContent());
  bind('#trainee-search', debounce(() => rerenderRoleContent(), 300));
  bind('#programmes-q',   debounce(() => rerenderRoleContent(), 300));
  bindChange('#programmes-status', () => rerenderRoleContent());
  bind('#qb-search',      debounce(() => rerenderRoleContent(), 300));
  bind('#market-search',  debounce(() => rerenderRoleContent(), 300));
}
