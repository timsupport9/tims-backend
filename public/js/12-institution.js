/* ============================================================
   ExpertHub 2.0 — 12-institution.js
   Institution dashboard — programmes, cohorts, trainees, certs,
   analytics, campuses, wellness, succession, marketplace, budgets,
   reports, integrations, security, branding.
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
  const atRiskCount = S.wellnessAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;
  const budgetAlerts = S.budgetAllocations.filter(b => (b.allocated ? (b.spent / b.allocated) * 100 : 0) >= 80).length;

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

function instOverview() {
  const st = S.institutionStats || {};
  const activeProgrammes = S.programmes.filter(p => p.status === 'active').length;
  const activeCohorts = S.cohorts.filter(c => c.status === 'active').length;
  const completion = st.avgCompletionRate || st.avg_completion_rate || 0;
  const attendance = st.attendanceRate || 0;
  const avgScore = st.avgScore || st.avg_score || 0;
  const pendingApprovals = st.pendingApprovals || 0;
  const expiringCerts = st.expiringCertificates || 0;
  const upcoming = (st.upcomingSessions || []).slice(0, 5);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Institution Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">${esc(S.myInstitution?.name || 'Institution')} Overview</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-institution-report">
          <i class="fas fa-download"></i> Export Report</button>
        <button class="btn btn-primary" data-action="refresh-all">
          <i class="fas fa-rotate"></i> Refresh</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Programmes</p>
          <p class="stat-value">${activeProgrammes}</p>
          <p class="stat-sub">of ${S.programmes.length} total</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-diagram-project"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Cohorts</p>
          <p class="stat-value">${activeCohorts}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-layer-group"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Trainees</p>
          <p class="stat-value">${st.totalTrainees || S.trainees.length}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Attendance Rate</p>
          <p class="stat-value">${attendance}%</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Completion</p>
          <p class="stat-value">${completion}%</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-chart-line"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Assessment Score</p>
          <p class="stat-value">${avgScore}%</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-star"></i></div>
      </div>
    </section>

    ${(pendingApprovals || expiringCerts) ? `
      <section class="dashboard-columns">
        ${pendingApprovals ? `
          <div class="alert alert-warning">
            <i class="fas fa-clock"></i>
            <div>
              <strong>${pendingApprovals} pending approval${pendingApprovals > 1 ? 's' : ''}</strong>
              <p style="margin:4px 0 0;font-size:.85rem">
                <a href="#" data-action="switch-tab" data-tab="operations">Review now</a>
              </p>
            </div>
          </div>
        ` : ''}
        ${expiringCerts ? `
          <div class="alert alert-info">
            <i class="fas fa-certificate"></i>
            <div>
              <strong>${expiringCerts} certificate${expiringCerts > 1 ? 's' : ''} expiring within 90 days</strong>
              <p style="margin:4px 0 0;font-size:.85rem">
                <a href="#" data-action="switch-tab" data-tab="certifications">View register</a>
              </p>
            </div>
          </div>
        ` : ''}
      </section>
    ` : ''}

    <section class="dashboard-columns">
      <div class="panel panel-quick-actions">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="create-programme">
          <i class="fas fa-plus"></i> New Programme</button>
        <button class="btn btn-info btn-block" data-action="create-cohort">
          <i class="fas fa-layer-group"></i> Create Cohort</button>
        <button class="btn btn-success btn-block" data-action="invite-trainee">
          <i class="fas fa-user-plus"></i> Import Trainees</button>
        <button class="btn btn-warning btn-block" data-action="schedule-session">
          <i class="fas fa-calendar-plus"></i> Schedule Session</button>
        <button class="btn btn-secondary btn-block" data-action="issue-certificate">
          <i class="fas fa-award"></i> Issue Certificate</button>
      </div>

      <div class="panel">
        <h3 class="panel-title">Programme Status Breakdown</h3>
        <ul class="list-stack">
          ${CONFIG.PROGRAMME_STATUSES.map(s => {
            const n = S.programmes.filter(p => p.status === s).length;
            return `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${s.charAt(0).toUpperCase() + s.slice(1)}</span>
                </div>
                <span class="status status-${s}">${n}</span>
              </li>`;
          }).join('')}
        </ul>
      </div>
    </section>

    ${upcoming.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Sessions</h3>
        <ul class="list-stack">
          ${upcoming.map(s => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(s.title)}</span>
                <span class="list-row-sub">${esc(s.cohort_name || '')} - ${fmtDT(s.scheduled_at)}</span>
              </div>
              <div style="display:flex;gap:6px">
                <a class="btn btn-secondary btn-xs" href="/api/institution/sessions/${s.id}/ics">
                  <i class="fas fa-calendar-plus"></i> ICS</a>
                <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
                  <i class="fas fa-clipboard-check"></i> Attendance</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Trainee Progress Trend</h3>
        <canvas id="chartInstProgress" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Assessment Score Distribution</h3>
        <canvas id="chartInstAssess" height="200"></canvas>
      </div>
    </section>
  `;
}

/* ============================================================
   ANALYTICS COMMAND CENTER
   ============================================================ */
function instAnalyticsCenter() {
  const a = S.institutionAnalytics || {};
  const overview = a.overview || {};
  const cohortPerf = a.cohortPerformance || [];
  const instructorPerf = a.instructorPerformance || [];
  const campusPerf = a.campusPerformance || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Analytics Center</span></div>
    <section class="page-header">
      <h1 class="page-title">Analytics Command Center</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-analytics-snapshot">
          <i class="fas fa-download"></i> Snapshot</button>
        <button class="btn btn-primary" data-action="refresh-all">
          <i class="fas fa-rotate"></i> Refresh</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Trainees</p>
          <p class="stat-value">${overview.activeTrainees || 0}</p>
          <p class="stat-sub">${overview.activeTraineesChange >= 0 ? '+' : ''}${overview.activeTraineesChange || 0}% vs prior</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Completion Rate</p>
          <p class="stat-value">${overview.completionRate || 0}%</p>
          <p class="stat-sub">Target: ${overview.completionTarget || 80}%</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Assessment Score</p>
          <p class="stat-value">${overview.avgScore || 0}%</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Certificate Issuance</p>
          <p class="stat-value">${overview.certificatesIssued || 0}</p>
          <p class="stat-sub">${overview.certificatesExpiring || 0} expiring soon</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-award"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Budget Utilisation</p>
          <p class="stat-value">${overview.budgetUtilisation || 0}%</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-coins"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">At-Risk Trainees</p>
          <p class="stat-value">${overview.atRiskTrainees || 0}</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Enrollment Trend</h3>
        <canvas id="chartEnrollmentTrend" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Completion Trend</h3>
        <canvas id="chartCompletionTrend" height="200"></canvas>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Revenue by Month</h3>
        <canvas id="chartRevenueTrend" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Programme Type Mix</h3>
        <canvas id="chartProgrammeMix" height="200"></canvas>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Cohort Performance Leaderboard</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cohort</th><th>Programme</th><th>Enrolled</th>
              <th>Avg. Progress</th><th>Avg. Score</th>
              <th>Attendance</th><th>Completion</th>
            </tr>
          </thead>
          <tbody>
            ${cohortPerf.map(c => `
              <tr>
                <td>${esc(c.name)}</td>
                <td>${esc(c.programme_title || '—')}</td>
                <td>${c.enrolled || 0}</td>
                <td>${renderMiniBar(c.avg_progress, '#1e3a8a')} ${c.avg_progress || 0}%</td>
                <td>${renderMiniBar(c.avg_score, '#059669')} ${c.avg_score || 0}%</td>
                <td>${c.attendance_pct || 0}%</td>
                <td>${c.completion_pct || 0}%</td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No cohort data available</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Instructor Performance</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Instructor</th><th>Programmes</th><th>Sessions</th>
              <th>Avg. Rating</th><th>Attendance Impact</th><th>Utilisation</th>
            </tr>
          </thead>
          <tbody>
            ${instructorPerf.map(i => `
              <tr>
                <td>${esc(i.name)}</td>
                <td>${i.programmes || 0}</td>
                <td>${i.sessions || 0}</td>
                <td>${Number(i.avg_rating || 0).toFixed(1)} / 5</td>
                <td>+${i.attendance_delta || 0}%</td>
                <td>${renderMiniBar(i.utilisation || 0, '#7c3aed')} ${i.utilisation || 0}%</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No instructor data</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    ${campusPerf.length ? `
      <section class="panel">
        <h3 class="panel-title">Campus Comparison</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Campus</th><th>Active Trainees</th><th>Programmes</th><th>Avg. Progress</th><th>Completion Rate</th></tr>
            </thead>
            <tbody>
              ${campusPerf.map(c => `
                <tr>
                  <td>${esc(c.campus_name)}</td>
                  <td>${c.active_trainees || 0}</td>
                  <td>${c.programmes || 0}</td>
                  <td>${c.avg_progress || 0}%</td>
                  <td>${c.completion_rate || 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   CAMPUSES
   ============================================================ */
function instCampuses() {
  const campuses = S.campuses || [];
  const activeCampus = S.activeCampusId ? campuses.find(c => c.id === S.activeCampusId) : null;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Campuses & Branches</span></div>
    <section class="page-header">
      <h1 class="page-title">Campuses & Branches</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-campus">
          <i class="fas fa-plus"></i> New Campus</button>
      </div>
    </section>

    ${activeCampus ? `
      <div class="alert alert-info" style="justify-content:space-between">
        <span>Filtering by: <strong>${esc(activeCampus.name)}</strong></span>
        <button class="btn btn-secondary btn-sm" data-action="clear-campus-filter">Clear Filter</button>
      </div>
    ` : ''}

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Campuses</p><p class="stat-value">${campuses.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-building"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active</p>
          <p class="stat-value">${campuses.filter(c => c.status === 'active').length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Trainees Across All</p>
          <p class="stat-value">${campuses.reduce((s, c) => s + Number(c.trainee_count || 0), 0)}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Headcount Capacity</p>
          <p class="stat-value">${campuses.reduce((s, c) => s + Number(c.capacity || 0), 0)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-chair"></i></div>
      </div>
    </section>

    <section class="card-grid">
      ${campuses.map(c => {
        const util = pctOf(c.trainee_count || 0, c.capacity || 1);
        return `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
              <div>
                <span class="chip chip-neutral">${esc(c.type || 'main')}</span>
                <span class="${statusClass(c.status || 'active')}" style="margin-left:6px">${esc(c.status || 'active')}</span>
              </div>
              ${c.is_main ? '<span class="chip chip-blue">Main</span>' : ''}
            </div>
            <h4 class="program-title">${esc(c.name)}</h4>
            <p class="program-desc">${esc(c.address || 'No address on file')}</p>
            <p class="program-meta">
              <i class="fas fa-user-tie"></i> ${esc(c.manager_name || 'Unassigned')} ·
              ${esc(c.contact_phone || 'No phone')}
            </p>
            <div class="program-footer" style="flex-direction:column;align-items:stretch;gap:6px">
              <div>
                <div class="progress-bar"><span style="width:${util}%"></span></div>
                <small>${c.trainee_count || 0} of ${c.capacity || 0} seats filled (${util}%)</small>
              </div>
              <div class="panel-actions" style="display:flex;gap:6px;margin-top:8px">
                <button class="btn btn-secondary btn-sm" data-action="edit-campus" data-id="${c.id}">
                  <i class="fas fa-pen"></i> Edit</button>
                <button class="btn btn-info btn-sm" data-action="view-campus-trainees" data-id="${c.id}">
                  <i class="fas fa-users"></i> Trainees</button>
                <button class="btn btn-danger btn-sm" data-action="delete-campus" data-id="${c.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </div>
          </article>
        `;
      }).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-building"></i>
          <h3>No campuses configured</h3>
          <p>Add your first campus or branch to organize trainees geographically.</p>
          <button class="btn btn-primary" data-action="create-campus">
            <i class="fas fa-plus"></i> Create Campus</button>
        </div>
      `}
    </section>

    <section class="panel">
      <h3 class="panel-title">Campus Comparison</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Campus</th><th>Type</th><th>Manager</th>
              <th>Trainees</th><th>Programmes</th><th>Sessions/Month</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${campuses.map(c => `
              <tr>
                <td>${esc(c.name)}</td>
                <td><span class="chip chip-neutral">${esc(c.type || 'main')}</span></td>
                <td>${esc(c.manager_name || '—')}</td>
                <td>${c.trainee_count || 0}</td>
                <td>${c.programme_count || 0}</td>
                <td>${c.sessions_per_month || 0}</td>
                <td><span class="${statusClass(c.status || 'active')}">${esc(c.status || 'active')}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No campuses registered</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   PROGRAMMES
   ============================================================ */
function instProgrammes() {
  const q = ($('#programmes-q')?.value || '').toLowerCase();
  const statusFilter = $('#programmes-status')?.value || '';
  let list = S.programmes.slice();
  if (q) list = list.filter(p => (p.title || '').toLowerCase().includes(q));
  if (statusFilter) list = list.filter(p => p.status === statusFilter);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Programmes</span></div>
    <section class="page-header">
      <h1 class="page-title">Training Programmes</h1>
      <div class="page-actions">
        <input type="search" id="programmes-q" class="form-input" placeholder="Search..." value="${esc(q)}" style="max-width:200px" />
        <select id="programmes-status" class="form-select" style="max-width:150px">
          <option value="">All statuses</option>
          ${CONFIG.PROGRAMME_STATUSES.map(s => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button class="btn btn-primary" data-action="create-programme">
          <i class="fas fa-plus"></i> New Programme</button>
      </div>
    </section>

    <section class="card-grid">
      ${list.map(p => `
        <article class="program-card">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
            <span class="chip chip-blue">${esc(p.category || 'General')}</span>
            <span class="${statusClass(p.status)}">${esc(p.status)}</span>
          </div>
          <h4 class="program-title">${esc(p.title || '')}</h4>
          <p class="program-desc">${esc((p.description || '').slice(0, 130))}</p>
          ${p.prerequisite_title ? `
            <p class="program-meta" style="color:var(--warning-dark)">
              <i class="fas fa-lock"></i> Requires: ${esc(p.prerequisite_title)}
            </p>
          ` : ''}
          <footer class="program-footer">
            <span class="program-meta">${fmtDate(p.start_date)} to ${fmtDate(p.end_date)}</span>
            <span class="program-meta">${p.enrolled_count || 0} of ${p.capacity || 0} enrolled</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" data-action="view-programme" data-id="${p.id}">
              <i class="fas fa-eye"></i> View</button>
            <button class="btn btn-info btn-sm" data-action="edit-programme" data-id="${p.id}">
              <i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-primary btn-sm" data-action="programme-curriculum" data-id="${p.id}">
              <i class="fas fa-list"></i> Curriculum</button>
            <button class="btn btn-danger btn-sm" data-action="delete-programme" data-id="${p.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-diagram-project"></i>
          <h3>No programmes yet</h3>
          <p>Create your first training programme to get started.</p>
          <button class="btn btn-primary" data-action="create-programme">
            <i class="fas fa-plus"></i> Create Programme</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   LEARNING PATHS (BUILDER)
   ============================================================ */
function instLearningPaths() {
  const paths = S.institutionLearningPaths || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Learning Paths</span></div>
    <section class="page-header">
      <h1 class="page-title">Learning Path Builder</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-learning-path">
          <i class="fas fa-plus"></i> New Path</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Learning paths sequence multiple programmes into a guided curriculum.
        Trainees advance step by step, unlocking certificates at completion.
      </div>
    </div>

    ${paths.length ? `
      <section class="card-grid">
        ${paths.map(lp => `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
              <span class="chip chip-blue">${lp.step_count || 0} step${(lp.step_count || 0) === 1 ? '' : 's'}</span>
              <span class="${lp.active ? 'status-active' : 'status-archived'}">${lp.active ? 'Active' : 'Inactive'}</span>
            </div>
            <h4 class="program-title">${esc(lp.title)}</h4>
            <p class="program-desc">${esc((lp.description || '').slice(0, 140))}</p>
            ${lp.badge_icon ? `<p class="program-meta"><i class="fas ${esc(lp.badge_icon)}"></i> Badge awarded at completion</p>` : ''}
            <footer class="program-footer">
              <span class="program-meta">${lp.enrolled_count || 0} enrolled</span>
              <span class="program-meta">${lp.completion_rate || 0}% completion</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" data-action="open-path-builder" data-id="${lp.id}">
                <i class="fas fa-sitemap"></i> Builder</button>
              <button class="btn btn-secondary btn-sm" data-action="edit-learning-path" data-id="${lp.id}">
                <i class="fas fa-pen"></i> Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete-learning-path" data-id="${lp.id}">
                <i class="fas fa-trash"></i></button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-route"></i>
          <h3>No learning paths yet</h3>
          <p>Bundle programmes into a guided curriculum with automatic unlocking.</p>
          <button class="btn btn-primary" data-action="create-learning-path">
            <i class="fas fa-plus"></i> Create First Path</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   COHORTS
   ============================================================ */
function instCohorts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Cohorts</span></div>
    <section class="page-header">
      <h1 class="page-title">Cohorts and Batches</h1>
      <button class="btn btn-primary" data-action="create-cohort">
        <i class="fas fa-plus"></i> New Cohort</button>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cohort</th><th>Programme</th><th>Instructor</th>
              <th>Dates</th><th>Capacity</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${S.cohorts.map(c => `
              <tr>
                <td>
                  <div class="user-name">${esc(c.name || '')}</div>
                  ${c.location ? `<div class="user-email">${esc(c.location)}</div>` : ''}
                </td>
                <td>${esc(c.programme_title || '-')}</td>
                <td>${esc(c.instructor_name || 'Unassigned')}</td>
                <td>${fmtDate(c.start_date)} to ${fmtDate(c.end_date)}</td>
                <td>
                  <div class="progress-bar" style="width:100px">
                    <span style="width:${c.capacity ? Math.min(100, (c.trainee_count / c.capacity) * 100) : 0}%"></span>
                  </div>
                  <small>${c.trainee_count || 0} of ${c.capacity || 0}</small>
                </td>
                <td><span class="${statusClass(c.status)}">${esc(c.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-cohort" data-id="${c.id}">View</button>
                  <button class="btn btn-info btn-xs" data-action="edit-cohort" data-id="${c.id}">Edit</button>
                  <button class="btn btn-primary btn-xs" data-action="cohort-waitlist" data-id="${c.id}">Waitlist</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-cohort" data-id="${c.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No cohorts created yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   TRAINING DELIVERY
   ============================================================ */
function instTraining() {
  const sessions = S.institutionSessions || [];
  const upcoming = sessions.filter(s => new Date(s.scheduled_at) > new Date() && s.status === 'scheduled');
  const past = sessions.filter(s => new Date(s.scheduled_at) <= new Date() && s.status !== 'cancelled');

  let avgAttendance = 0;
  if (past.length) {
    const sum = past.reduce((acc, s) => {
      const total = Number(s.total_count) || 0;
      return acc + (total ? (Number(s.present_count) / total) * 100 : 0);
    }, 0);
    avgAttendance = Math.round(sum / past.length);
  }

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Training Delivery</span></div>
    <section class="page-header">
      <h1 class="page-title">Training Delivery</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="view-calendar">
          <i class="fas fa-calendar"></i> Calendar View</button>
        <button class="btn btn-primary" data-action="schedule-session">
          <i class="fas fa-calendar-plus"></i> Schedule Session</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Upcoming</p><p class="stat-value">${upcoming.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${past.filter(s => s.status === 'completed').length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Attendance</p><p class="stat-value">${avgAttendance}%</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Sessions</p><p class="stat-value">${sessions.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-chalkboard-user"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Upcoming Sessions</h3>
      <ul class="list-stack">
        ${upcoming.map(s => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(s.title)}</span>
              <span class="list-row-sub">
                ${esc(s.cohort_name || '')} - ${fmtDT(s.scheduled_at)} -
                ${esc(s.instructor_name || 'Unassigned')} - ${s.duration_minutes} min
              </span>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              <span class="chip chip-neutral">${esc((s.mode || '').replace('_', ' '))}</span>
              ${s.meeting_url ? `
                <a class="btn btn-primary btn-xs" href="${esc(s.meeting_url)}" target="_blank" rel="noopener">
                  <i class="fas fa-video"></i> Join</a>
              ` : ''}
              <a class="btn btn-secondary btn-xs" href="/api/institution/sessions/${s.id}/ics">
                <i class="fas fa-calendar-plus"></i> ICS</a>
              <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
                <i class="fas fa-clipboard-check"></i> Attendance</button>
              <button class="btn btn-secondary btn-xs" data-action="edit-session" data-id="${s.id}">
                <i class="fas fa-pen"></i></button>
              <button class="btn btn-danger btn-xs" data-action="delete-session" data-id="${s.id}">
                <i class="fas fa-trash"></i></button>
            </div>
          </li>
        `).join('') || '<li class="empty-row">No upcoming sessions scheduled</li>'}
      </ul>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Sessions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Session</th><th>Cohort</th><th>Date</th>
              <th>Attendance</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${past.slice(0, 20).map(s => {
              const pct = Number(s.total_count)
                ? Math.round((Number(s.present_count) / Number(s.total_count)) * 100)
                : 0;
              return `
                <tr>
                  <td>${esc(s.title)}</td>
                  <td>${esc(s.cohort_name || '-')}</td>
                  <td>${fmtDT(s.scheduled_at)}</td>
                  <td>${s.present_count} of ${s.total_count} (${pct}%)</td>
                  <td><span class="${statusClass(s.status)}">${esc(s.status)}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
                      View Attendance</button>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6" class="empty-row">No sessions recorded</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Training Materials</h3>
      ${S.institutionMaterials.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Title</th><th>Uploaded By</th><th>Date</th><th>Size</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${S.institutionMaterials.map(m => `
                <tr>
                  <td>${esc(m.title)}</td>
                  <td>${esc(m.uploaded_by_name || '-')}</td>
                  <td>${fmtDate(m.created_at)}</td>
                  <td>${formatBytes(m.file_size)}</td>
                  <td class="actions-cell">
                    <a class="btn btn-secondary btn-xs" href="${esc(m.file_url)}" target="_blank" rel="noopener">
                      <i class="fas fa-download"></i> Download</a>
                    <button class="btn btn-danger btn-xs" data-action="delete-material" data-id="${m.id}">
                      <i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="form-inline" style="margin-top:14px">
        <input id="matTitle" class="form-input" placeholder="Material title" />
        <select id="matCohort" class="form-select">
          <option value="">Any cohort</option>
          ${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
        </select>
        <input type="file" id="matFile" class="form-input" />
        <button class="btn btn-primary" data-action="upload-material">
          <i class="fas fa-upload"></i> Upload</button>
      </div>
    </section>
  `;
}

/* ============================================================
   ASSESSMENTS
   ============================================================ */
function instAssessments() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Assessments</span></div>
    <section class="page-header">
      <h1 class="page-title">Assessments</h1>
      <button class="btn btn-primary" data-action="schedule-assessment">
        <i class="fas fa-plus"></i> New Assessment</button>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th><th>Type</th><th>Cohort</th><th>Weight</th>
              <th>Due</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${S.assessments.map(a => `
              <tr>
                <td>${esc(a.title || '')}</td>
                <td><span class="chip chip-neutral">${esc(a.type || '')}</span></td>
                <td>${esc(a.cohort_name || '-')}</td>
                <td>${a.weight || 0}%</td>
                <td>${fmtDate(a.due_date)}</td>
                <td><span class="${statusClass(a.status)}">${esc(a.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-assessment" data-id="${a.id}">View</button>
                  <button class="btn btn-info btn-xs" data-action="grade-assessment" data-id="${a.id}">Grade</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-assessment" data-id="${a.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No assessments yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   PROCTORED EXAMS
   ============================================================ */
function instProctorSessions() {
  const sessions = S.examProctorSessions || [];
  const flags = S.examProctorFlags || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Proctored Exams</span></div>
    <section class="page-header">
      <h1 class="page-title">Proctored Exam Sessions</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="schedule-proctor-session">
          <i class="fas fa-plus"></i> Schedule Proctored Exam</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-shield-halved"></i>
      <div>
        Proctored exams use webcam monitoring, browser lockdown and AI flagging to ensure integrity.
        Recordings are retained for 90 days unless a dispute is raised.
      </div>
    </div>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Sessions</p><p class="stat-value">${sessions.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-shield-halved"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${sessions.filter(s => s.status === 'completed').length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Flagged</p><p class="stat-value">${sessions.filter(s => s.integrity_score != null && s.integrity_score < 70).length}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-flag"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Live Now</p><p class="stat-value">${sessions.filter(s => s.status === 'in_progress').length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-video"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">All Sessions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Exam</th><th>Trainee</th><th>Scheduled</th>
              <th>Mode</th><th>Integrity</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(s => {
              const score = s.integrity_score;
              const scoreClass = score == null ? '' : score >= 90 ? 'status-active' : score >= 70 ? 'status-pending' : 'status-rejected';
              return `
                <tr>
                  <td>${esc(s.exam_title || '-')}</td>
                  <td>${esc(s.trainee_name || '-')}</td>
                  <td>${fmtDT(s.scheduled_at)}</td>
                  <td><span class="chip chip-neutral">${esc(s.proctor_mode || 'webcam')}</span></td>
                  <td>
                    ${score != null
                      ? `<span class="${scoreClass}">${examIntegrityLabel(score)} (${score})</span>`
                      : '—'}
                  </td>
                  <td><span class="${statusClass(s.status)}">${esc(s.status)}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-action="view-proctor-session" data-id="${s.id}">
                      View</button>
                    ${s.status === 'completed' && score != null && score < 70 ? `
                      <button class="btn btn-danger btn-xs" data-action="invalidate-exam" data-id="${s.id}">
                        Invalidate</button>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="7" class="empty-row">No proctored sessions yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    ${flags.length ? `
      <section class="panel">
        <h3 class="panel-title">Integrity Flags</h3>
        <ul class="list-stack">
          ${flags.map(f => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(f.trainee_name || '-')} — ${esc(f.flag_type)}</span>
                <span class="list-row-sub">${fmtDT(f.flagged_at)} · ${esc(f.description || '')}</span>
              </div>
              <button class="btn btn-secondary btn-xs" data-action="review-flag" data-id="${f.id}">
                Review</button>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   QUESTION BANK
   ============================================================ */
function instQuestionBank() {
  const q = ($('#qb-search')?.value || '').toLowerCase();
  let questions = S.institutionQuestions || [];
  if (q) questions = questions.filter(x => (x.question_text || '').toLowerCase().includes(q));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Question Bank</span></div>
    <section class="page-header">
      <h1 class="page-title">Question Bank</h1>
      <div class="page-actions">
        <input type="search" id="qb-search" class="form-input" placeholder="Search questions..."
               value="${esc(q)}" style="max-width:240px" />
        <button class="btn btn-primary" data-action="create-question">
          <i class="fas fa-plus"></i> New Question</button>
      </div>
    </section>

    <section class="panel">
      ${questions.length ? `
        <ul class="list-stack">
          ${questions.map(x => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc((x.question_text || '').slice(0, 100))}</span>
                <span class="list-row-sub">
                  ${esc(x.question_type)} - ${esc(x.difficulty)} -
                  ${x.category ? esc(x.category) : 'Uncategorised'} - ${x.points} point${x.points === 1 ? '' : 's'}
                </span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-xs" data-action="edit-question" data-id="${x.id}">Edit</button>
                <button class="btn btn-danger btn-xs" data-action="delete-question" data-id="${x.id}">Delete</button>
              </div>
            </li>
          `).join('')}
        </ul>
      ` : `
        <div class="empty-state">
          <i class="fas fa-database"></i>
          <h3>No questions yet</h3>
          <p>Build a reusable bank of questions for your assessments.</p>
          <button class="btn btn-primary" data-action="create-question">
            <i class="fas fa-plus"></i> Create First Question</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   PROJECTS
   ============================================================ */
function instProjects() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Capstone Projects</span></div>
    <section class="page-header">
      <h1 class="page-title">Capstone Projects</h1>
      <button class="btn btn-primary" data-action="create-project">
        <i class="fas fa-plus"></i> New Project</button>
    </section>

    <section class="card-grid">
      ${S.projects.map(p => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(p.category || 'Project')}</span>
          <span class="${statusClass(p.status)}" style="margin-left:6px">${esc(p.status)}</span>
          <h4 class="program-title">${esc(p.title || '')}</h4>
          <p class="program-desc">${esc((p.description || '').slice(0, 130))}</p>
          <footer class="program-footer">
            <span class="program-meta">Deadline: ${fmtDate(p.deadline)}</span>
            <span class="program-meta">${p.submissions_count || 0} submissions</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-secondary btn-sm" data-action="view-project" data-id="${p.id}">View</button>
            <button class="btn btn-info btn-sm" data-action="grade-project" data-id="${p.id}">Grade</button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-briefcase"></i>
          <h3>No projects yet</h3>
          <p>Create your first capstone project for a cohort.</p>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   TRAINEES
   ============================================================ */
function instTrainees() {
  const filterStatus = ($('#trainee-status-filter') || {}).value || '';
  const searchQuery = (($('#trainee-search') || {}).value || '').toLowerCase();
  const source = S.institutionEnrollments.length ? S.institutionEnrollments : S.trainees;

  let list = source.slice();
  if (filterStatus) list = list.filter(t => (t.status || t.lifecycle_status) === filterStatus);
  if (searchQuery) {
    list = list.filter(t =>
      (t.trainee_name || t.name || '').toLowerCase().includes(searchQuery) ||
      (t.email || '').toLowerCase().includes(searchQuery) ||
      (t.department || '').toLowerCase().includes(searchQuery)
    );
  }

  const counts = {
    total: source.length,
    active: source.filter(t => ['active','approved'].includes(t.status || t.lifecycle_status)).length,
    pending: source.filter(t => (t.status || t.lifecycle_status) === 'pending_approval').length,
    completed: source.filter(t => ['completed','certified'].includes(t.status || t.lifecycle_status)).length,
  };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Trainees</span></div>
    <section class="page-header">
      <h1 class="page-title">Trainee Management</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="import-trainees-history">
          <i class="fas fa-history"></i> Import History</button>
        <button class="btn btn-primary" data-action="invite-trainee">
          <i class="fas fa-user-plus"></i> Import Trainees</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Enrolled</p><p class="stat-value">${counts.total}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active</p><p class="stat-value">${counts.active}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Pending Approval</p><p class="stat-value">${counts.pending}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${counts.completed}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-award"></i></div>
      </div>
    </section>

    <section class="panel">
      <div class="page-actions" style="margin-bottom:14px">
        <input type="search" id="trainee-search" class="form-input"
               placeholder="Search by name, email, or department"
               value="${esc(searchQuery)}" style="max-width:300px" />
        <select id="trainee-status-filter" class="form-select" style="max-width:200px">
          <option value="">All statuses</option>
          ${CONFIG.LIFECYCLE_STATUSES.map(s => `
            <option value="${s}" ${filterStatus === s ? 'selected' : ''}>
              ${s.replace('_',' ')}</option>
          `).join('')}
        </select>
        <button class="btn btn-secondary" data-action="export-trainees">
          <i class="fas fa-download"></i> Export</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Trainee</th><th>Department</th><th>Programme</th>
              <th>Progress</th><th>Lifecycle</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(t => {
              const traineeId = t.user_id || t.id;
              const name = t.trainee_name || t.name || '';
              const email = t.email || '';
              const status = t.status || t.lifecycle_status || 'active';
              const progress = t.progress || 0;
              return `
                <tr>
                  <td>
                    <div class="user-cell">
                      <img class="user-avatar" src="${avatar({ name, email, avatar: t.avatar })}" alt="" />
                      <div>
                        <div class="user-name">
                          ${esc(name)}
                          ${t.at_risk ? '<span class="chip chip-red" style="margin-left:6px;font-size:.65rem">At Risk</span>' : ''}
                        </div>
                        <div class="user-email">${esc(email)}</div>
                      </div>
                    </div>
                  </td>
                  <td>${esc(t.department || '-')}</td>
                  <td>${esc(t.programme_title || '-')}</td>
                  <td>
                    <div class="progress-bar" style="width:80px"><span style="width:${progress}%"></span></div>
                    <small>${progress}%</small>
                  </td>
                  <td><span class="${statusClass(status)}">${esc(status.replace('_',' '))}</span></td>
                  <td class="actions-cell">
                    ${status === 'pending_approval' ? `
                      <button class="btn btn-success btn-xs" data-action="approve-enrolment" data-id="${t.id}">Approve</button>
                      <button class="btn btn-danger btn-xs" data-action="reject-enrolment" data-id="${t.id}">Reject</button>
                    ` : ''}
                    <button class="btn btn-secondary btn-xs" data-action="trainee-detail" data-id="${traineeId}">View</button>
                    ${t.id ? `<button class="btn btn-info btn-xs" data-action="trainee-transfer" data-id="${t.id}">Transfer</button>` : ''}
                    <button class="btn btn-warning btn-xs" data-action="trainee-notes" data-id="${t.id || traineeId}">Notes</button>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6" class="empty-row">No trainees found</td></tr>'}
          </tbody>
        </table>
      </div>

      ${paginationBar('institutionTrainees', S.page.institutionTrainees || 1, 50, S.institutionTraineeTotal || list.length)}
    </section>
  `;
}

/* ============================================================
   WELLNESS & ENGAGEMENT
   ============================================================ */
function instWellness() {
  const scores = S.wellnessScores || [];
  const alerts = S.wellnessAlerts || [];
  const critical = alerts.filter(a => a.severity === 'critical');
  const high = alerts.filter(a => a.severity === 'high');
  const medium = alerts.filter(a => a.severity === 'medium');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wellness & Engagement</span></div>
    <section class="page-header">
      <h1 class="page-title">Trainee Wellness & Engagement</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-wellness">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="recompute-wellness">
          <i class="fas fa-rotate"></i> Recompute Scores</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-heart-pulse"></i>
      <div>
        Wellness scores are computed from login frequency, attendance, assignment timeliness,
        forum engagement, quiz performance and feedback sentiment.
      </div>
    </div>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Critical Alerts</p><p class="stat-value" style="color:#dc2626">${critical.length}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">High Risk</p><p class="stat-value" style="color:#f97316">${high.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Medium Risk</p><p class="stat-value" style="color:#eab308">${medium.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-info-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Wellness Score</p>
          <p class="stat-value">${scores.length ? Math.round(scores.reduce((s, x) => s + Number(x.score || 0), 0) / scores.length) : 0}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-heart"></i></div>
      </div>
    </section>

    ${alerts.length ? `
      <section class="panel">
        <h3 class="panel-title">Active Alerts</h3>
        <ul class="list-stack">
          ${alerts.map(a => `
            <li class="list-row" style="border-left:3px solid ${riskLevelColour(a.severity)}">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.trainee_name || 'Trainee')} — ${esc(a.reason)}</span>
                <span class="list-row-sub">${fmtDT(a.created_at)} · Score: ${a.score || 0}</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-info btn-xs" data-action="wellness-intervene" data-id="${a.id}">
                  Intervene</button>
                <button class="btn btn-secondary btn-xs" data-action="wellness-dismiss" data-id="${a.id}">
                  Dismiss</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    <section class="panel">
      <h3 class="panel-title">Trainee Wellness Scores</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Trainee</th><th>Score</th><th>Risk</th>
              <th>Login Frequency</th><th>Attendance</th>
              <th>Timeliness</th><th>Engagement</th>
            </tr>
          </thead>
          <tbody>
            ${scores.map(s => `
              <tr>
                <td>${esc(s.trainee_name || 'Trainee')}</td>
                <td>
                  <strong>${s.score || 0}</strong>
                  ${renderMiniBar(s.score || 0, riskLevelColour(s.risk_level))}
                </td>
                <td><span class="chip" style="background:${riskLevelColour(s.risk_level)}20;color:${riskLevelColour(s.risk_level)};border:1px solid ${riskLevelColour(s.risk_level)}50">
                  ${esc(s.risk_level || 'low')}
                </span></td>
                <td>${s.login_frequency || 0}%</td>
                <td>${s.attendance_score || 0}%</td>
                <td>${s.timeliness_score || 0}%</td>
                <td>${s.engagement_score || 0}%</td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No wellness data computed yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   CERTIFICATIONS
   ============================================================ */
function instCertifications() {
  const certs = S.institutionCertificates || [];
  const expiring = certs.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - Date.now()) / 86400000;
    return days > 0 && days < 90;
  });
  const expired = certs.filter(c => c.expires_at && new Date(c.expires_at) < new Date() && !c.revoked);
  const active = certs.filter(c => !c.revoked && (!c.expires_at || new Date(c.expires_at) > new Date()));
  const totalCpd = certs.reduce((s, c) => s + Number(c.cpd_points || 0), 0);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Certifications</span></div>
    <section class="page-header">
      <h1 class="page-title">Certification Register</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-certificates">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="issue-certificate">
          <i class="fas fa-plus"></i> Issue Certificate</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active</p><p class="stat-value">${active.length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-award"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expiring (90 days)</p><p class="stat-value">${expiring.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expired</p><p class="stat-value">${expired.length}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total CPD Points</p><p class="stat-value">${totalCpd.toFixed(0)}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-star"></i></div>
      </div>
    </section>

    ${expiring.length ? `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-circle"></i>
        <div>
          <strong>${expiring.length} certificate${expiring.length > 1 ? 's' : ''} expire within 90 days.</strong>
          Schedule refresher training to maintain compliance.
        </div>
      </div>
    ` : ''}

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Serial</th><th>Trainee</th><th>Programme</th>
              <th>Issued</th><th>Expires</th><th>CPD</th><th>Blockchain</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${certs.map(c => {
              const expDays = c.expires_at ? Math.ceil((new Date(c.expires_at) - Date.now()) / 86400000) : null;
              let statusLabel = 'Valid';
              let statusCss = 'status-active';
              if (c.revoked) { statusLabel = 'Revoked'; statusCss = 'status-rejected'; }
              else if (expDays !== null && expDays < 0) { statusLabel = 'Expired'; statusCss = 'status-rejected'; }
              else if (expDays !== null && expDays < 30) { statusLabel = 'Expiring Soon'; statusCss = 'status-pending'; }

              return `
                <tr>
                  <td><code class="code">${esc(c.serial)}</code></td>
                  <td>${esc(c.trainee_name || '-')}</td>
                  <td>${esc(c.programme_title || '-')}</td>
                  <td>${fmtDate(c.issued_at)}</td>
                  <td>${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
                  <td>${c.cpd_points || 0}</td>
                  <td>
                    ${c.blockchain_hash
                      ? `<span class="chip chip-green" title="${esc(c.blockchain_hash)}">
                          <i class="fas fa-cube"></i> On-chain</span>`
                      : '<span class="chip chip-neutral">Off-chain</span>'}
                  </td>
                  <td><span class="${statusCss}">${statusLabel}</span></td>
                  <td class="actions-cell">
                    <a class="btn btn-secondary btn-xs" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener">
                      <i class="fas fa-external-link-alt"></i> Verify</a>
                    <a class="btn btn-secondary btn-xs" href="/api/institution/certificates/${c.id}/pdf" target="_blank">
                      <i class="fas fa-file-pdf"></i> PDF</a>
                    <button class="btn btn-info btn-xs" data-action="renew-certificate" data-id="${c.id}">Renew</button>
                    ${!c.revoked ? `<button class="btn btn-danger btn-xs" data-action="revoke-certificate" data-id="${c.id}">Revoke</button>` : ''}
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="9" class="empty-row">No certificates issued yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   SKILLS MATRIX
   ============================================================ */
function instSkills() {
  const m = S.institutionSkillsMatrix || { skills: [], matrix: [] };
  const levelColours = CONFIG.SKILL_LEVEL_COLOURS;
  const levelText = CONFIG.SKILL_LEVELS;

  if (!m.skills.length) {
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Matrix</span></div>
      <section class="page-header">
        <h1 class="page-title">Skills and Competencies</h1>
        <button class="btn btn-primary" data-action="manage-skills">
          <i class="fas fa-plus"></i> Add First Skill</button>
      </section>
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-puzzle-piece"></i>
          <h3>No skills defined yet</h3>
          <p>Start by adding the competencies you want to track across your workforce.</p>
          <button class="btn btn-primary" data-action="manage-skills">
            <i class="fas fa-plus"></i> Add First Skill</button>
        </div>
      </section>
    `;
  }

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Matrix</span></div>
    <section class="page-header">
      <h1 class="page-title">Skills and Competencies</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="manage-skills">
          <i class="fas fa-cog"></i> Manage Skills</button>
        <button class="btn btn-primary" data-action="export-skills-matrix">
          <i class="fas fa-download"></i> Export Matrix</button>
      </div>
    </section>

    <section class="panel">
      <p class="form-hint" style="margin-bottom:16px">
        Click any cell to cycle through proficiency levels 0 to 5. Changes save automatically.
      </p>

      <div style="overflow-x:auto">
        <table class="skills-matrix">
          <thead>
            <tr>
              <th style="min-width:200px;position:sticky;left:0;background:var(--surface);z-index:2">
                Trainee
              </th>
              ${m.skills.map(s => `
                <th style="min-width:100px;text-align:center" title="${esc(s.description || '')}">
                  <div style="font-size:.7rem;color:var(--text-muted)">${esc(s.category || '')}</div>
                  <div style="font-weight:600">${esc(s.name)}</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${m.matrix.map(row => `
              <tr>
                <td style="position:sticky;left:0;background:var(--surface);z-index:1">
                  <div class="user-name">${esc(row.trainee.name)}</div>
                  <div class="user-email">${esc(row.trainee.department || '')}</div>
                </td>
                ${m.skills.map(s => {
                  const lvl = row.levels[s.id] || 0;
                  return `
                    <td class="skills-cell"
                        data-trainee="${row.trainee.id}"
                        data-skill="${s.id}"
                        data-level="${lvl}"
                        title="${levelText[lvl]}">
                      <span class="skill-level-dot"
                            style="background:${levelColours[lvl]};color:${lvl >= 4 ? '#fff' : '#374151'}">
                        ${lvl}
                      </span>
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="skills-legend">
        <strong>Legend:</strong>
        ${levelColours.map((c, i) => `
          <span class="skills-legend-item">
            <span class="skills-legend-swatch" style="background:${c}"></span>
            ${i} - ${levelText[i]}
          </span>
        `).join('')}
      </div>
    </section>
  `;
}

/* ============================================================
   SKILLS GAP
   ============================================================ */
function instSkillsGap() {
  const gap = S.skillsGapAnalysis || {};
  const categories = gap.categories || [];
  const topGaps = gap.topGaps || [];
  const deptGaps = gap.departmentGaps || [];
  const summary = gap.summary || {};

  const cellColour = (current, target) => {
    const diff = target - current;
    if (diff <= 0) return 'gap-ok';
    if (diff === 1) return 'gap-minor';
    if (diff === 2) return 'gap-moderate';
    return 'gap-severe';
  };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Gap</span></div>
    <section class="page-header">
      <h1 class="page-title">Skills Gap Analysis</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-skills-gap">
          <i class="fas fa-download"></i> Export Gaps</button>
        <button class="btn btn-primary" data-action="recompute-skills-gap">
          <i class="fas fa-rotate"></i> Recompute</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Skills Tracked</p><p class="stat-value">${summary.totalSkills || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-list-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Skills at Target</p><p class="stat-value">${summary.skillsAtTarget || 0}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Skills Below Target</p><p class="stat-value">${summary.skillsBelowTarget || 0}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-exclamation-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Critical Gaps</p><p class="stat-value">${summary.criticalGaps || 0}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-fire"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Skill Coverage Heatmap</h3>
      <p class="form-hint" style="margin-bottom:12px">
        Cells show average proficiency vs. target. Red = largest gap, green = target met.
      </p>
      <div class="gap-heatmap-wrapper">
        <table class="gap-heatmap">
          <thead>
            <tr>
              <th>Department</th>
              ${categories.map(c => `<th>${esc(c.name)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${deptGaps.map(row => `
              <tr>
                <td class="gap-dept-name">${esc(row.department || 'Unassigned')}</td>
                ${categories.map(cat => {
                  const cell = row.skills?.[cat.id] || { avg: 0, target: 3 };
                  return `
                    <td class="${cellColour(cell.avg, cell.target)}" title="Avg ${cell.avg} / Target ${cell.target}">
                      ${cell.avg.toFixed ? cell.avg.toFixed(1) : cell.avg}
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('') || '<tr><td colspan="100%" class="empty-row">No department data yet</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="gap-legend">
        <span><span class="gap-swatch gap-ok"></span> At target</span>
        <span><span class="gap-swatch gap-minor"></span> 1 below</span>
        <span><span class="gap-swatch gap-moderate"></span> 2 below</span>
        <span><span class="gap-swatch gap-severe"></span> 3+ below</span>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Top Skill Gaps</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Skill</th><th>Category</th><th>Avg. Level</th>
              <th>Target</th><th>Gap</th><th>Affected Trainees</th><th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            ${topGaps.map(g => `
              <tr>
                <td>${esc(g.skill_name)}</td>
                <td><span class="chip chip-neutral">${esc(g.category || '—')}</span></td>
                <td>${Number(g.avg_level || 0).toFixed(1)}</td>
                <td>${g.target_level || 3}</td>
                <td>
                  <span class="${g.gap >= 2 ? 'status-rejected' : g.gap >= 1 ? 'status-pending' : 'status-active'}">
                    ${g.gap > 0 ? `-${g.gap}` : 'At target'}
                  </span>
                </td>
                <td>${g.affected_trainees || 0}</td>
                <td>${esc(g.recommendation || 'Add targeted programme')}</td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No gaps identified</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   COMPLIANCE
   ============================================================ */
function instCompliance() {
  const rules = S.institutionComplianceRules || [];
  const certs = S.institutionCertificates || [];
  const runs = S.complianceRuns || [];
  const now = new Date();
  const expired = certs.filter(c => c.expires_at && new Date(c.expires_at) < now && !c.revoked);
  const expiring30 = certs.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - now) / 86400000;
    return days > 0 && days < 30;
  });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Compliance</span></div>
    <section class="page-header">
      <h1 class="page-title">Compliance Reporting Suite</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-compliance-report">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="run-compliance-check">
          <i class="fas fa-play"></i> Run Compliance Check</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active Rules</p><p class="stat-value">${rules.filter(r => r.active).length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-shield-halved"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expired Certificates</p><p class="stat-value" style="color:#dc2626">${expired.length}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expiring in 30 Days</p><p class="stat-value" style="color:#f97316">${expiring30.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Compliant</p>
          <p class="stat-value">${certs.filter(c => !c.revoked && (!c.expires_at || new Date(c.expires_at) > now)).length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Compliance Rules</h3>
      ${rules.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Title</th><th>Programme</th><th>Target</th><th>Recurrence</th><th>Mandatory</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${rules.map(r => `
                <tr>
                  <td>${esc(r.title)}</td>
                  <td>${esc(r.programme_title || '-')}</td>
                  <td>${esc(r.target_role || r.target_department || 'All')}</td>
                  <td>Every ${r.recurrence_months} month${r.recurrence_months === 1 ? '' : 's'}</td>
                  <td>${r.mandatory ? '<span class="chip chip-blue">Mandatory</span>' : 'Optional'}</td>
                  <td><span class="${r.active ? 'status-active' : 'status-archived'}">${r.active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No compliance rules defined yet</p>'}
    </section>

    ${runs.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Compliance Runs</h3>
        <ul class="list-stack">
          ${runs.slice(0, 10).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.run_name)}</span>
                <span class="list-row-sub">${fmtDT(r.started_at)} · ${r.findings_count || 0} findings</span>
              </div>
              <span class="${r.status === 'passed' ? 'status-active' : 'status-rejected'}">
                ${esc(r.status)}
              </span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   SUCCESSION PLANNING
   ============================================================ */
function instSuccession() {
  const m = S.successionMatrix || { boxes: CONFIG.SUCCESSION_BOXES, trainees: [], assignments: [] };
  const boxes = CONFIG.SUCCESSION_BOXES;
  const assignmentMap = {};
  (m.assignments || []).forEach(a => {
    const key = `${a.performance}-${a.potential}`;
    (assignmentMap[key] = assignmentMap[key] || []).push(a);
  });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Succession Planning</span></div>
    <section class="page-header">
      <h1 class="page-title">Succession Planning (9-Box Grid)</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-succession">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="assign-succession">
          <i class="fas fa-plus"></i> Assign Trainee</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-sitemap"></i>
      <div>
        Map high-performers and high-potentials to prioritize development, retention and promotion.
        Drag trainees between boxes to update their placement.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">9-Box Grid</h3>
      <div class="nine-box-grid">
        ${['high', 'medium', 'low'].map(perf => `
          ${['low', 'medium', 'high'].map(pot => {
            const box = boxes.find(b => b.performance === perf && b.potential === pot);
            const people = assignmentMap[`${perf}-${pot}`] || [];
            return `
              <div class="nine-box-cell nine-box-${box?.code || 'unknown'}"
                   data-perf="${perf}" data-pot="${pot}">
                <div class="nine-box-label">${esc(box?.label || '')}</div>
                <div class="nine-box-people">
                  ${people.map(p => `
                    <div class="nine-box-person" draggable="true" data-trainee="${p.trainee_id}">
                      <img class="user-avatar-sm" src="${avatar({ name: p.trainee_name })}" alt="" />
                      <span>${esc(p.trainee_name)}</span>
                    </div>
                  `).join('') || '<span class="nine-box-empty">No one</span>'}
                </div>
              </div>
            `;
          }).join('')}
        `).join('')}
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Box Descriptions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Box</th><th>Performance</th><th>Potential</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${boxes.map(b => `
              <tr>
                <td><strong>${esc(b.label)}</strong></td>
                <td>${esc(b.performance)}</td>
                <td>${esc(b.potential)}</td>
                <td>${
                  b.code === 'star' ? 'Promote / retain aggressively'
                  : b.code === 'high_pot' ? 'Accelerated development track'
                  : b.code === 'current_star' ? 'Stretch assignments'
                  : b.code === 'core' ? 'Maintain and grow'
                  : b.code === 'risk' ? 'PIP or exit plan'
                  : 'Tailored development'
                }</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   INSTRUCTORS
   ============================================================ */
function instInstructors() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Instructors</span></div>
    <section class="page-header">
      <h1 class="page-title">Instructors</h1>
      <button class="btn btn-primary" data-action="assign-instructor">
        <i class="fas fa-plus"></i> Assign Instructor</button>
    </section>

    <section class="card-grid">
      ${S.instructors.map(i => `
        <article class="expert-card">
          <img class="expert-avatar" src="${avatar(i)}" alt="" />
          <h4 class="expert-name">${esc(i.name || '')}</h4>
          <p class="expert-expertise">${esc(i.specialization || '-')}</p>
          <p class="expert-rate">${i.programme_count || 0} programme${(i.programme_count || 0) === 1 ? '' : 's'}</p>
          <button class="btn btn-secondary btn-block" data-action="view-instructor" data-id="${i.id}">
            View Profile</button>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-user-tie"></i>
          <h3>No instructors assigned</h3>
          <p>Assign expert instructors to your programmes and cohorts.</p>
          <button class="btn btn-primary" data-action="assign-instructor">
            <i class="fas fa-plus"></i> Assign Instructor</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   INSTRUCTOR MARKETPLACE
   ============================================================ */
function instMarketplace() {
  const list = S.instructorMarketplace || [];
  const contracts = S.instructorContracts || [];
  const q = ($('#market-search')?.value || '').toLowerCase();
  const filtered = q
    ? list.filter(x =>
        (x.name || '').toLowerCase().includes(q) ||
        (x.specialization || '').toLowerCase().includes(q))
    : list;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Instructor Marketplace</span></div>
    <section class="page-header">
      <h1 class="page-title">Instructor Marketplace</h1>
      <div class="page-actions">
        <input type="search" id="market-search" class="form-input" placeholder="Search instructors..."
               value="${esc(q)}" style="max-width:260px" />
        <button class="btn btn-primary" data-action="post-instructor-request">
          <i class="fas fa-plus"></i> Post Requirement</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-people-arrows"></i>
      <div>
        Browse verified instructors, filter by specialization and availability,
        and hire directly with one click. Contracts include automatic rate cards and NDA templates.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Available Instructors</h3>
      <section class="card-grid">
        ${filtered.map(i => `
          <article class="expert-card">
            <img class="expert-avatar" src="${avatar(i)}" alt="" />
            <h4 class="expert-name">
              ${esc(i.name || '')}
              ${i.verified ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
            </h4>
            <p class="expert-expertise">${esc(i.specialization || '')}</p>
            <p class="expert-rate">${fmtCur(i.hourly_rate || 0)}/hr</p>
            <p class="expert-rating">
              <i class="fas fa-star" style="color:#f59e0b"></i>
              ${Number(i.average_rating || 0).toFixed(1)}
            </p>
            <p class="program-meta">${i.programmes_completed || 0} programmes delivered</p>
            <button class="btn btn-primary btn-block" data-action="hire-instructor"
                    data-id="${i.id}" data-name="${esc(i.name || '')}">
              <i class="fas fa-handshake"></i> Hire</button>
          </article>
        `).join('') || `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-search"></i>
            <h3>No instructors found</h3>
          </div>
        `}
      </section>
    </section>

    ${contracts.length ? `
      <section class="panel">
        <h3 class="panel-title">Active Contracts</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Instructor</th><th>Programme</th><th>Rate</th>
                <th>Start</th><th>End</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${contracts.map(c => `
                <tr>
                  <td>${esc(c.instructor_name)}</td>
                  <td>${esc(c.programme_title || '-')}</td>
                  <td>${fmtCur(c.rate)}</td>
                  <td>${fmtDate(c.start_date)}</td>
                  <td>${fmtDate(c.end_date)}</td>
                  <td><span class="${statusClass(c.status)}">${esc(c.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   BUDGETS
   ============================================================ */
function instBudgets() {
  const budgets = S.budgetAllocations || [];
  const transactions = S.budgetTransactions || [];
  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const util = pctOf(totalSpent, totalAllocated || 1);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Budgets</span></div>
    <section class="page-header">
      <h1 class="page-title">Budget & Cost Allocation</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-budgets">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="create-budget">
          <i class="fas fa-plus"></i> New Budget</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Allocated</p><p class="stat-value">${fmtCur(totalAllocated)}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-coins"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Spent</p><p class="stat-value">${fmtCur(totalSpent)}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Remaining</p><p class="stat-value">${fmtCur(totalRemaining)}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-piggy-bank"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Overall Utilisation</p><p class="stat-value">${util}%</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-chart-pie"></i></div>
      </div>
    </section>

    ${budgets.length ? `
      <section class="panel">
        <h3 class="panel-title">Departmental Budgets</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Department</th><th>Period</th>
                <th>Allocated</th><th>Spent</th><th>Remaining</th>
                <th>Utilisation</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${budgets.map(b => {
                const utilPct = pctOf(b.spent, b.allocated || 1);
                return `
                  <tr>
                    <td>${esc(b.department)}</td>
                    <td>${esc(b.period || 'monthly')}</td>
                    <td>${fmtCur(b.allocated)}</td>
                    <td>${fmtCur(b.spent)}</td>
                    <td>${fmtCur(b.allocated - b.spent)}</td>
                    <td>
                      <div class="${budgetUtilClass(utilPct)}">
                        ${renderMiniBar(utilPct, utilPct >= 95 ? '#dc2626' : utilPct >= 80 ? '#f59e0b' : '#22c55e')}
                        ${utilPct}%
                      </div>
                    </td>
                    <td class="actions-cell">
                      <button class="btn btn-secondary btn-xs" data-action="edit-budget" data-id="${b.id}">
                        Edit</button>
                      <button class="btn btn-info btn-xs" data-action="view-budget-transactions" data-id="${b.id}">
                        Transactions</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-coins"></i>
          <h3>No budgets configured</h3>
          <p>Set up departmental budgets to track training spend.</p>
          <button class="btn btn-primary" data-action="create-budget">
            <i class="fas fa-plus"></i> Create First Budget</button>
        </div>
      </section>
    `}

    ${transactions.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Budget Transactions</h3>
        <ul class="list-stack">
          ${transactions.slice(0, 20).map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.description || 'Transaction')}</span>
                <span class="list-row-sub">${esc(t.department || '')} · ${fmtDT(t.created_at)}</span>
              </div>
              <span class="list-row-price" style="color:${t.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                ${t.amount >= 0 ? '+' : ''}${fmtCur(t.amount)}
              </span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   BLOCKCHAIN CERTS SECTION (shared)
   ============================================================ */
function renderBlockchainSection() {
  const certs = S.blockchainCerts || [];
  return `
    <section class="panel">
      <h3 class="panel-title">
        <i class="fas fa-cube"></i> Blockchain-Verified Certificates</h3>
      <p class="form-hint">
        Certificates issued with blockchain anchoring provide permanent, tamper-proof verification.
      </p>
      ${certs.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Serial</th><th>Trainee</th><th>Blockchain Hash</th><th>Issued</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${certs.map(c => `
                <tr>
                  <td><code class="code">${esc(c.serial)}</code></td>
                  <td>${esc(c.trainee_name)}</td>
                  <td><code class="code" title="${esc(c.blockchain_hash)}">${truncateHash(c.blockchain_hash, 10)}</code></td>
                  <td>${fmtDate(c.issued_at)}</td>
                  <td><a class="btn btn-info btn-xs" href="/verify/${esc(c.serial)}" target="_blank">Verify</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No blockchain-verified certificates yet</p>'}
    </section>
  `;
}

/* ============================================================
   REPORTS
   ============================================================ */
function instReports() {
  const st = S.institutionStats || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reports</span></div>
    <section class="page-header">
      <h1 class="page-title">Reports and Insights</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-institution-report">
          <i class="fas fa-download"></i> Export CSV</button>
        <button class="btn btn-primary" data-action="schedule-report">
          <i class="fas fa-calendar-plus"></i> Schedule Report</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completion Rate</p>
          <p class="stat-value">${st.avgCompletionRate || st.avg_completion_rate || 0}%</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Score</p>
          <p class="stat-value">${st.avgScore || st.avg_score || 0}%</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Attendance Rate</p><p class="stat-value">${st.attendanceRate || 0}%</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Certificates Issued</p>
          <p class="stat-value">${S.institutionCertificates.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-award"></i></div>
      </div>
    </section>

    <section class="dashboard-columns">
      <div class="panel">
        <h3 class="panel-title">Quick Reports</h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-secondary btn-block" data-action="report-programme-scorecard">
            <i class="fas fa-chart-bar"></i> Programme Scorecard</button>
          <button class="btn btn-secondary btn-block" data-action="report-cohort-comparison">
            <i class="fas fa-chart-line"></i> Cohort Comparison</button>
          <button class="btn btn-secondary btn-block" data-action="report-trainee-progress">
            <i class="fas fa-users"></i> Trainee Progress Heatmap</button>
          <button class="btn btn-secondary btn-block" data-action="report-compliance">
            <i class="fas fa-shield-halved"></i> Compliance Report</button>
          <button class="btn btn-secondary btn-block" data-action="report-cost">
            <i class="fas fa-dollar-sign"></i> Cost Analysis</button>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel-title">Scheduled Reports</h3>
        ${S.institutionScheduledReports.length ? `
          <ul class="list-stack">
            ${S.institutionScheduledReports.map(r => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(r.template_name || 'Report')}</span>
                  <span class="list-row-sub">${esc(r.frequency)} - Next: ${fmtDate(r.next_run_at)}</span>
                </div>
                <span class="${r.active ? 'status-active' : 'status-archived'}">${r.active ? 'Active' : 'Paused'}</span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <div class="empty-state" style="padding:24px 12px">
            <i class="fas fa-calendar"></i>
            <p>No scheduled reports</p>
            <button class="btn btn-primary btn-sm" data-action="schedule-report">
              <i class="fas fa-plus"></i> Schedule One</button>
          </div>
        `}
      </div>
    </section>

    <section class="panel">
      ${renderBlockchainSection()}
    </section>
  `;
}

/* ============================================================
   REPORT BUILDER
   ============================================================ */
function instReportBuilder() {
  const defs = S.savedReportDefinitions || [];
  const fieldLib = CONFIG.REPORT_FIELD_LIBRARY;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Report Builder</span></div>
    <section class="page-header">
      <h1 class="page-title">Custom Report Builder</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="new-report-definition">
          <i class="fas fa-plus"></i> New Report</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-table-columns"></i>
      <div>
        Build custom reports by picking data sources, filtering, choosing columns
        and selecting aggregations. Save them for one-click reuse.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Saved Report Definitions</h3>
      ${defs.length ? `
        <ul class="list-stack">
          ${defs.map(d => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(d.name)}</span>
                <span class="list-row-sub">${esc(d.data_source)} · ${(d.columns || []).length} columns · ${fmtDate(d.created_at)}</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-primary btn-xs" data-action="run-saved-report" data-id="${d.id}">
                  <i class="fas fa-play"></i> Run</button>
                <button class="btn btn-secondary btn-xs" data-action="edit-report-definition" data-id="${d.id}">
                  <i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-xs" data-action="delete-report-definition" data-id="${d.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No custom reports saved yet</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Available Fields</h3>
      <div class="field-library">
        ${Object.entries(fieldLib).map(([source, fields]) => `
          <div class="field-library-group">
            <h5>${esc(source)}</h5>
            <ul>
              ${fields.map(f => `<li><code class="code">${esc(f)}</code></li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

/* ============================================================
   ANNOUNCEMENTS
   ============================================================ */
function instAnnouncements() {
  const list = S.announcements || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Announcements</span></div>
    <section class="page-header">
      <h1 class="page-title">Institution Announcements</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-announcement">
          <i class="fas fa-plus"></i> New Announcement</button>
      </div>
    </section>

    ${list.length ? `
      <section class="panel">
        <ul class="list-stack">
          ${list.map(a => `
            <li class="list-row" style="border-left:4px solid ${
              a.priority === 'critical' ? '#dc2626'
              : a.priority === 'urgent' ? '#f97316'
              : a.priority === 'important' ? '#eab308'
              : '#0ea5e9'
            }">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.title)}</span>
                <span class="list-row-sub">
                  Scope: ${esc(a.scope)} · Priority: ${esc(a.priority)} ·
                  ${fmtDT(a.created_at)} · Views: ${a.view_count || 0}
                </span>
                <p style="margin-top:6px;color:var(--text-soft)">${esc(a.body?.slice(0, 160))}</p>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px">
                <button class="btn btn-secondary btn-xs" data-action="edit-announcement" data-id="${a.id}">
                  Edit</button>
                <button class="btn btn-danger btn-xs" data-action="delete-announcement" data-id="${a.id}">
                  Delete</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-bullhorn"></i>
          <h3>No announcements yet</h3>
          <p>Broadcast important updates to your teams, cohorts or departments.</p>
          <button class="btn btn-primary" data-action="create-announcement">
            <i class="fas fa-plus"></i> Create First Announcement</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   INTEGRATIONS
   ============================================================ */
function instIntegrations() {
  const keys = S.apiKeys || [];
  const hooks = S.webhooks || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Integrations & API</span></div>
    <section class="page-header">
      <h1 class="page-title">Integrations & API</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-plug"></i>
      <div>
        Build integrations with your HRIS, LMS or custom apps.
        API keys and webhooks are scoped to your institution.
      </div>
    </div>

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 class="panel-title">API Keys</h3>
        <button class="btn btn-primary btn-sm" data-action="create-api-key">
          <i class="fas fa-plus"></i> New API Key</button>
      </div>
      ${keys.length ? `
        <div class="table-wrapper" style="margin-top:12px">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last Used</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${keys.map(k => `
                <tr>
                  <td>${esc(k.name)}</td>
                  <td><code class="code">${esc(k.prefix)}...</code></td>
                  <td>
                    ${(k.scopes || []).map(s => `<span class="chip chip-neutral" style="margin:2px">${esc(s)}</span>`).join('')}
                  </td>
                  <td>${k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}</td>
                  <td>${k.revoked ? '<span class="status-rejected">Revoked</span>' : '<span class="status-active">Active</span>'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="copy-api-key" data-id="${k.id}">
                      <i class="fas fa-copy"></i> Copy</button>
                    ${!k.revoked ? `<button class="btn btn-danger btn-xs" data-action="revoke-api-key" data-id="${k.id}">
                      Revoke</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No API keys yet</p>'}
    </section>

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 class="panel-title">Webhooks</h3>
        <button class="btn btn-primary btn-sm" data-action="create-webhook">
          <i class="fas fa-plus"></i> New Webhook</button>
      </div>
      ${hooks.length ? `
        <div class="table-wrapper" style="margin-top:12px">
          <table class="data-table">
            <thead>
              <tr><th>URL</th><th>Events</th><th>Status</th><th>Last Fired</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${hooks.map(h => `
                <tr>
                  <td><code class="code">${esc(h.url)}</code></td>
                  <td>
                    ${(h.events || []).slice(0, 3).map(e => `<span class="chip chip-neutral" style="margin:2px">${esc(e)}</span>`).join('')}
                    ${(h.events || []).length > 3 ? `<span class="chip chip-neutral">+${h.events.length - 3}</span>` : ''}
                  </td>
                  <td>${h.active ? '<span class="status-active">Active</span>' : '<span class="status-archived">Inactive</span>'}</td>
                  <td>${h.last_fired_at ? timeAgo(h.last_fired_at) : 'Never'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-action="test-webhook" data-id="${h.id}">Test</button>
                    <button class="btn btn-secondary btn-xs" data-action="edit-webhook" data-id="${h.id}">Edit</button>
                    <button class="btn btn-danger btn-xs" data-action="delete-webhook" data-id="${h.id}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No webhooks configured</p>'}
    </section>
  `;
}

/* ============================================================
   SSO / SECURITY
   ============================================================ */
function instSecurity() {
  const sso = S.ssoConfiguration || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>SSO & Security</span></div>
    <section class="page-header">
      <h1 class="page-title">SSO & Security</h1>
    </section>

    <section class="panel">
      <h3 class="panel-title">Single Sign-On (SSO)</h3>
      <p class="form-hint" style="margin-bottom:14px">
        Connect your identity provider to enable seamless login for trainees and staff.
      </p>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">SSO Provider</span>
          <select id="sso-provider" class="form-select">
            <option value="">— Disabled —</option>
            ${CONFIG.SSO_PROVIDERS.map(p => `
              <option value="${p}" ${sso.provider === p ? 'selected' : ''}>${p.replace(/_/g, ' ')}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Entity ID / Issuer</span>
          <input id="sso-entity" class="form-input" value="${esc(sso.entity_id || '')}" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Metadata URL</span>
          <input id="sso-metadata-url" class="form-input" value="${esc(sso.metadata_url || '')}" placeholder="https://idp.example.com/metadata" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Certificate (X.509)</span>
          <textarea id="sso-cert" class="form-textarea" rows="4">${esc(sso.certificate || '')}</textarea>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-sso">
          <i class="fas fa-save"></i> Save SSO Configuration</button>
        <button class="btn btn-secondary" data-action="test-sso">
          <i class="fas fa-check"></i> Test Connection</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Security Policies</h3>
      <div class="form-grid">
        <label class="checkbox-row">
          <input type="checkbox" id="sec-force-mfa" ${sso.force_mfa ? 'checked' : ''} />
          Force multi-factor authentication for all users
        </label>
        <label class="checkbox-row">
          <input type="checkbox" id="sec-ip-whitelist" ${sso.ip_whitelist_enabled ? 'checked' : ''} />
          Enable IP whitelist for admin access
        </label>
        <label class="checkbox-row">
          <input type="checkbox" id="sec-session-timeout" ${sso.session_timeout ? 'checked' : ''} />
          Auto-logout inactive sessions after 8 hours
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-security-policy">
          <i class="fas fa-save"></i> Save Policies</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Login Activity</h3>
      <ul class="list-stack">
        ${(sso.recent_logins || []).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.user_name || 'User')} signed in</span>
              <span class="list-row-sub">${esc(l.ip || '—')} · ${fmtDT(l.timestamp)}</span>
            </div>
            <span class="${statusClass(l.status || 'success')}">${esc(l.status || 'success')}</span>
          </li>
        `).join('') || '<li class="empty-row">No recent logins</li>'}
      </ul>
    </section>
  `;
}

/* ============================================================
   OPERATIONS CONTROL
   ============================================================ */
function instOperations() {
  const isOps = currentUser && currentUser.institution_role === 'operations_manager';
  if (!isOps) {
    return `
      <div class="empty-state">
        <i class="fas fa-lock"></i>
        <h3>Access Restricted</h3>
        <p>Only the Operations Manager can access this area.</p>
      </div>`;
  }

  const pendingApprovals = S.institutionApprovals.filter(a => a.status === 'pending');
  const inst = S.myInstitution || {};

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Operations Control</span></div>
    <section class="page-header"><h1 class="page-title">Operations Control</h1></section>

    <section class="panel">
      <h3 class="panel-title">Institution Settings</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Display name</span>
          <input id="instSetName" class="form-input" value="${esc(inst.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Contact email</span>
          <input id="instSetEmail" class="form-input" value="${esc(inst.contact_email || '')}" /></label>
        <label class="form-group"><span class="form-label">Default programme capacity</span>
          <input id="instSetCap" type="number" class="form-input" value="${inst.default_capacity || 30}" /></label>
        <label class="form-group"><span class="form-label">Assessment pass mark (%)</span>
          <input id="instSetPass" type="number" class="form-input" value="${inst.pass_mark || 70}" /></label>
        <label class="form-group"><span class="form-label">Seat allocation</span>
          <input id="instSetSeats" type="number" class="form-input" value="${inst.seat_allocation || 0}" /></label>
        <label class="form-group">
          <span class="form-label">Billing cycle</span>
          <select id="instSetBilling" class="form-select">
            <option value="monthly" ${inst.billing_cycle === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="quarterly" ${inst.billing_cycle === 'quarterly' ? 'selected' : ''}>Quarterly</option>
            <option value="annual" ${inst.billing_cycle === 'annual' ? 'selected' : ''}>Annual</option>
          </select>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-institution-settings">
          <i class="fas fa-save"></i> Save Settings</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Approval Queue ${pendingApprovals.length ? `(${pendingApprovals.length})` : ''}</h3>
      <ul class="list-stack">
        ${pendingApprovals.map(a => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">
                ${esc((a.request_type || '').replace('_',' '))}
                ${a.total_steps > 1 ? `<span class="chip chip-neutral" style="margin-left:6px">Step ${a.current_step} of ${a.total_steps}</span>` : ''}
              </span>
              <span class="list-row-sub">
                Requested by ${esc(a.requested_by_name || 'Unknown')} - ${fmtDT(a.created_at)}
              </span>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-success btn-xs" data-action="approve-request" data-id="${a.id}">Approve</button>
              <button class="btn btn-danger btn-xs" data-action="reject-request" data-id="${a.id}">Reject</button>
            </div>
          </li>
        `).join('') || '<li class="empty-row">No pending approvals</li>'}
      </ul>
    </section>

    <section class="panel">
      <h3 class="panel-title">Team and Roles</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Member</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.institutionTeam.map(t => `
              <tr>
                <td>
                  <div class="user-cell">
                    <img class="user-avatar" src="${avatar(t)}" alt="" />
                    <div class="user-name">${esc(t.name || '')}</div>
                  </div>
                </td>
                <td><span class="chip chip-neutral">${esc((t.institution_role || '').replace('_',' '))}</span></td>
                <td>${esc(t.email || '')}</td>
                <td><span class="${statusClass(t.status || 'active')}">${esc(t.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-info btn-xs" data-action="change-team-role" data-id="${t.id}">Change Role</button>
                  <button class="btn btn-secondary btn-xs" data-action="manage-team-permissions" data-id="${t.id}">Permissions</button>
                  <button class="btn btn-danger btn-xs" data-action="remove-team-member" data-id="${t.id}">Remove</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty-row">No team members yet</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="invite-team-member">
          <i class="fas fa-user-plus"></i> Invite Team Member</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Institution Audit Log</h3>
      <ul class="list-stack">
        ${((S.institutionStats || {}).auditLog || []).slice(0, 20).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.action || '')}</span>
              <span class="list-row-sub">by ${esc(l.actor_name || 'System')}</span>
            </div>
            <span class="list-row-meta">${fmtDT(l.created_at)}</span>
          </li>
        `).join('') || '<li class="empty-row">No entries</li>'}
      </ul>
    </section>
  `;
}

/* ============================================================
   BRANDING
   ============================================================ */
function instBranding() {
  const inst = S.institutionBranding || S.myInstitution || {};
  const primary = inst.primary_color || '#1e3a8a';
  const accent = inst.accent_color || '#059669';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Custom Branding</span></div>
    <section class="page-header"><h1 class="page-title">Custom Branding</h1></section>

    <section class="panel">
      <h3 class="panel-title">Logo and Colours</h3>
      <div class="form-grid">
        <label class="form-group form-group-full">
          <span class="form-label">Institution logo</span>
          <input type="file" id="brandLogo" class="form-input" accept="image/*" />
          ${inst.logo_url ? `<img src="${esc(inst.logo_url)}" alt="Current logo" style="max-height:60px;margin-top:8px" />` : ''}
        </label>
        <label class="form-group"><span class="form-label">Primary colour</span>
          <input type="color" id="brandPrimary" class="form-input" value="${esc(primary)}" /></label>
        <label class="form-group"><span class="form-label">Accent colour</span>
          <input type="color" id="brandAccent" class="form-input" value="${esc(accent)}" /></label>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Email and Welcome</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Sender name</span>
          <input id="brandEmailName" class="form-input"
                 value="${esc(inst.email_sender_name || '')}" placeholder="ACME Academy" /></label>
        <label class="form-group"><span class="form-label">Reply-to address</span>
          <input id="brandEmailAddr" type="email" class="form-input"
                 value="${esc(inst.email_sender_address || '')}" /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Welcome message</span>
          <textarea id="brandWelcome" class="form-textarea" rows="3">${esc(inst.welcome_message || '')}</textarea>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-branding">
          <i class="fas fa-save"></i> Save Branding</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Preview</h3>
      <div class="brand-preview" style="
        background: linear-gradient(135deg, ${esc(primary)}, ${esc(accent)});
        color: #fff; padding: 32px; border-radius: var(--r-lg); text-align: center;">
        ${inst.logo_url ? `<img src="${esc(inst.logo_url)}" alt=""
                style="height:56px;margin:0 auto 16px;filter:brightness(0) invert(1)" />` : ''}
        <h2 style="margin:0;color:#fff;font-size:1.5rem">${esc(inst.name || 'Your Institution')}</h2>
        <p style="margin:8px 0 0;opacity:.9;font-size:.9rem">Training Portal</p>
      </div>
    </section>
  `;
}

/* ============================================================
   INSTITUTION PROFILE
   ============================================================ */
function instProfile() {
  const inst = S.myInstitution || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Institution Profile</span></div>
    <section class="page-header"><h1 class="page-title">Institution Profile</h1></section>

    <section class="panel">
      <div class="profile-header">
        <div class="profile-avatar" style="
          background: linear-gradient(135deg, var(--brand), var(--accent));
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1.6rem">
          <i class="fas fa-building"></i>
        </div>
        <div>
          <h2 class="profile-name">${esc(inst.name || 'Institution')}</h2>
          <p class="profile-email">
            ${esc(inst.contact_email || '')} -
            <span class="${statusClass(inst.status || 'active')}">${esc(inst.status || 'active')}</span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Institution name</span>
          <input id="instProfileName" class="form-input" value="${esc(inst.name || '')}" /></label>
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="instProfileType" class="form-select">
            ${CONFIG.INSTITUTION_TYPES.map(t => `
              <option value="${t}" ${inst.type === t ? 'selected' : ''}>${t}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Industry</span>
          <input id="instProfileIndustry" class="form-input" value="${esc(inst.industry || '')}" /></label>
        <label class="form-group"><span class="form-label">Contact phone</span>
          <input id="instProfilePhone" class="form-input" value="${esc(inst.contact_phone || '')}" /></label>
        <label class="form-group form-group-full"><span class="form-label">Address</span>
          <input id="instProfileAddress" class="form-input" value="${esc(inst.address || '')}" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-institution-profile">
          <i class="fas fa-save"></i> Save Changes</button>
      </div>
    </section>
  `;
}

/* ============================================================
   INSTITUTION CHARTS
   ============================================================ */
function renderInstitutionCharts() {
  if (!window.Chart) return;
  const rootStyle = getComputedStyle(document.documentElement);
  const primary = rootStyle.getPropertyValue('--brand').trim() || '#1e3a8a';
  const accent = rootStyle.getPropertyValue('--accent').trim() || '#059669';

  const p = document.getElementById('chartInstProgress');
  if (p && !p.dataset.rendered) {
    new Chart(p, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
        datasets: [{
          label: 'Average Progress',
          data: [10, 25, 42, 58, 74, 88],
          borderColor: primary,
          backgroundColor: hexToRgba(primary, 0.15),
          tension: 0.3, fill: true,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } },
    });
    p.dataset.rendered = '1';
  }

  const a = document.getElementById('chartInstAssess');
  if (a && !a.dataset.rendered) {
    new Chart(a, {
      type: 'bar',
      data: {
        labels: ['0-59', '60-69', '70-79', '80-89', '90-100'],
        datasets: [{
          label: 'Trainees',
          data: [3, 7, 15, 22, 11],
          backgroundColor: accent, borderRadius: 6,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    a.dataset.rendered = '1';
  }

  const enrollCanvas = document.getElementById('chartEnrollmentTrend');
  if (enrollCanvas && !enrollCanvas.dataset.rendered) {
    const series = S.institutionAnalytics?.trends?.enrollment || [
      { label: 'W1', value: 24 }, { label: 'W2', value: 38 },
      { label: 'W3', value: 52 }, { label: 'W4', value: 71 },
    ];
    new Chart(enrollCanvas, {
      type: 'line',
      data: {
        labels: series.map(x => x.label),
        datasets: [{ label: 'Enrollments', data: series.map(x => x.value),
          borderColor: primary, backgroundColor: hexToRgba(primary, 0.15), tension: 0.3, fill: true }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    enrollCanvas.dataset.rendered = '1';
  }

  const completionCanvas = document.getElementById('chartCompletionTrend');
  if (completionCanvas && !completionCanvas.dataset.rendered) {
    const series = S.institutionAnalytics?.trends?.completion || [
      { label: 'W1', value: 12 }, { label: 'W2', value: 22 },
      { label: 'W3', value: 38 }, { label: 'W4', value: 55 },
    ];
    new Chart(completionCanvas, {
      type: 'line',
      data: {
        labels: series.map(x => x.label),
        datasets: [{ label: 'Completed', data: series.map(x => x.value),
          borderColor: accent, backgroundColor: hexToRgba(accent, 0.15), tension: 0.3, fill: true }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    completionCanvas.dataset.rendered = '1';
  }

  const revenueCanvas = document.getElementById('chartRevenueTrend');
  if (revenueCanvas && !revenueCanvas.dataset.rendered) {
    const series = S.institutionAnalytics?.trends?.revenue || [
      { label: 'M1', value: 5000 }, { label: 'M2', value: 8200 },
      { label: 'M3', value: 7400 }, { label: 'M4', value: 9600 },
    ];
    new Chart(revenueCanvas, {
      type: 'bar',
      data: {
        labels: series.map(x => x.label),
        datasets: [{ label: 'Revenue', data: series.map(x => x.value), backgroundColor: primary, borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    revenueCanvas.dataset.rendered = '1';
  }

  const mixCanvas = document.getElementById('chartProgrammeMix');
  if (mixCanvas && !mixCanvas.dataset.rendered) {
    const mix = S.institutionAnalytics?.programmeMix || [
      { label: 'Bootcamp', value: 12 }, { label: 'Short Course', value: 8 },
      { label: 'Certification', value: 6 }, { label: 'Compliance', value: 4 },
    ];
    new Chart(mixCanvas, {
      type: 'doughnut',
      data: {
        labels: mix.map(x => x.label),
        datasets: [{ data: mix.map(x => x.value),
          backgroundColor: ['#1e3a8a', '#059669', '#7c3aed', '#f59e0b', '#dc2626'] }],
      },
      options: { responsive: true },
    });
    mixCanvas.dataset.rendered = '1';
  }
}

function attachInstitutionInteractions() {
  document.querySelectorAll('.skills-cell').forEach(cell => {
    cell.onclick = async () => {
      const cur = Number(cell.dataset.level);
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
          skill_id: Number(cell.dataset.skill),
          level: next,
        });
      } catch (e) {
        showToast(e.message, 'error');
        cell.dataset.level = cur;
        dot.style.background = colours[cur];
        dot.textContent = cur;
      }
    };
  });

  const statusFilter = $('#trainee-status-filter');
  if (statusFilter) statusFilter.onchange = () => rerenderRoleContent();

  const traineeSearch = $('#trainee-search');
  if (traineeSearch) traineeSearch.oninput = debounce(() => rerenderRoleContent(), 300);

  const expertSearch = $('#expert-search');
  if (expertSearch) expertSearch.oninput = debounce(() => rerenderRoleContent(), 250);
}
