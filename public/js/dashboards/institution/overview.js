/* ============================================================
   Institution — Overview
   ============================================================ */
function instOverview() {
  const st = S.institutionStats || {};
  const activeProgrammes = S.programmes.filter(p => p.status === 'active').length;
  const activeCohorts    = S.cohorts.filter(c => c.status === 'active').length;
  const completion = st.avgCompletionRate || st.avg_completion_rate || 0;
  const attendance = st.attendanceRate || 0;
  const avgScore   = st.avgScore || st.avg_score || 0;
  const pendingApprovals = st.pendingApprovals || 0;
  const expiringCerts    = st.expiringCertificates || 0;
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
      ${statCard('Active Programmes', activeProgrammes, `of ${S.programmes.length} total`, 'fa-diagram-project', 'blue')}
      ${statCard('Active Cohorts', activeCohorts, '', 'fa-layer-group', 'green')}
      ${statCard('Total Trainees', st.totalTrainees || S.trainees.length, '', 'fa-users', 'purple')}
      ${statCard('Attendance Rate', attendance + '%', '', 'fa-user-check', 'yellow')}
      ${statCard('Avg. Completion', completion + '%', '', 'fa-chart-line', 'blue')}
      ${statCard('Avg. Assessment Score', avgScore + '%', '', 'fa-star', 'green')}
    </section>

    ${(pendingApprovals || expiringCerts) ? `
      <section class="dashboard-columns">
        ${pendingApprovals ? `
          <div class="alert alert-warning">
            <i class="fas fa-clock"></i>
            <div><strong>${pendingApprovals} pending approval${pendingApprovals > 1 ? 's' : ''}</strong>
              <p style="margin:4px 0 0;font-size:.85rem">
                <a href="#" data-action="switch-tab" data-tab="operations">Review now</a></p></div>
          </div>` : ''}
        ${expiringCerts ? `
          <div class="alert alert-info">
            <i class="fas fa-certificate"></i>
            <div><strong>${expiringCerts} certificate${expiringCerts > 1 ? 's' : ''} expiring within 90 days</strong>
              <p style="margin:4px 0 0;font-size:.85rem">
                <a href="#" data-action="switch-tab" data-tab="certifications">View register</a></p></div>
          </div>` : ''}
      </section>` : ''}

    <section class="dashboard-columns">
      <div class="panel panel-quick-actions">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="create-programme"><i class="fas fa-plus"></i> New Programme</button>
        <button class="btn btn-info btn-block" data-action="create-cohort"><i class="fas fa-layer-group"></i> Create Cohort</button>
        <button class="btn btn-success btn-block" data-action="invite-trainee"><i class="fas fa-user-plus"></i> Import Trainees</button>
        <button class="btn btn-warning btn-block" data-action="schedule-session"><i class="fas fa-calendar-plus"></i> Schedule Session</button>
        <button class="btn btn-secondary btn-block" data-action="issue-certificate"><i class="fas fa-award"></i> Issue Certificate</button>
      </div>

      <div class="panel">
        <h3 class="panel-title">Programme Status Breakdown</h3>
        <ul class="list-stack">
          ${CONFIG.PROGRAMME_STATUSES.map(s => {
            const n = S.programmes.filter(p => p.status === s).length;
            return `<li class="list-row">
              <div class="list-row-main"><span class="list-row-title">${s.charAt(0).toUpperCase() + s.slice(1)}</span></div>
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
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">Trainee Progress Trend</h3>
        <canvas id="chartInstProgress" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Assessment Score Distribution</h3>
        <canvas id="chartInstAssess" height="200"></canvas></div>
    </section>
  `;
}

function statCard(label, value, sub, icon, colour) {
  return `
    <div class="dashboard-card stat-card">
      <div class="stat-info">
        <p class="stat-label">${esc(label)}</p>
        <p class="stat-value">${value}</p>
        ${sub ? `<p class="stat-sub">${esc(sub)}</p>` : ''}
      </div>
      <div class="stat-icon stat-icon-${colour}"><i class="fas ${icon}"></i></div>
    </div>`;
}
