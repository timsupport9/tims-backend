/* ============================================================
   Institution — Reports
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
      ${statCard('Completion Rate', (st.avgCompletionRate || st.avg_completion_rate || 0) + '%', '', 'fa-check-circle', 'green')}
      ${statCard('Avg. Score', (st.avgScore || st.avg_score || 0) + '%', '', 'fa-star', 'blue')}
      ${statCard('Attendance Rate', (st.attendanceRate || 0) + '%', '', 'fa-user-check', 'purple')}
      ${statCard('Certificates Issued', S.institutionCertificates.length, '', 'fa-award', 'yellow')}
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
              </li>`).join('')}
          </ul>` : `
          <div class="empty-state" style="padding:24px 12px">
            <i class="fas fa-calendar"></i>
            <p>No scheduled reports</p>
            <button class="btn btn-primary btn-sm" data-action="schedule-report">
              <i class="fas fa-plus"></i> Schedule One</button>
          </div>`}
      </div>
    </section>

    <section class="panel">${renderBlockchainSection()}</section>
  `;
}
