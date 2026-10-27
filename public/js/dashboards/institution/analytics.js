/* ============================================================
   Institution — Analytics Command Center
   ============================================================ */
function instAnalyticsCenter() {
  const a = S.institutionAnalytics || {};
  const overview      = a.overview || {};
  const cohortPerf    = a.cohortPerformance || [];
  const instructorPerf= a.instructorPerformance || [];
  const campusPerf    = a.campusPerformance || [];

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
      ${statCard('Active Trainees', overview.activeTrainees || 0,
        `${overview.activeTraineesChange >= 0 ? '+' : ''}${overview.activeTraineesChange || 0}% vs prior`,
        'fa-users', 'blue')}
      ${statCard('Completion Rate', (overview.completionRate || 0) + '%',
        `Target: ${overview.completionTarget || 80}%`, 'fa-check-circle', 'green')}
      ${statCard('Avg. Assessment Score', (overview.avgScore || 0) + '%', '',
        'fa-star', 'purple')}
      ${statCard('Certificate Issuance', overview.certificatesIssued || 0,
        `${overview.certificatesExpiring || 0} expiring soon`, 'fa-award', 'yellow')}
      ${statCard('Budget Utilisation', (overview.budgetUtilisation || 0) + '%', '',
        'fa-coins', 'red')}
      ${statCard('At-Risk Trainees', overview.atRiskTrainees || 0, '',
        'fa-exclamation-triangle', 'red')}
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">Enrollment Trend</h3>
        <canvas id="chartEnrollmentTrend" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Completion Trend</h3>
        <canvas id="chartCompletionTrend" height="200"></canvas></div>
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">Revenue by Month</h3>
        <canvas id="chartRevenueTrend" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Programme Type Mix</h3>
        <canvas id="chartProgrammeMix" height="200"></canvas></div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Cohort Performance Leaderboard</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Cohort</th><th>Programme</th><th>Enrolled</th>
            <th>Avg. Progress</th><th>Avg. Score</th>
            <th>Attendance</th><th>Completion</th>
          </tr></thead>
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
              </tr>`).join('') ||
              '<tr><td colspan="7" class="empty-row">No cohort data available</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Instructor Performance</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Instructor</th><th>Programmes</th><th>Sessions</th>
            <th>Avg. Rating</th><th>Attendance Impact</th><th>Utilisation</th>
          </tr></thead>
          <tbody>
            ${instructorPerf.map(i => `
              <tr>
                <td>${esc(i.name)}</td>
                <td>${i.programmes || 0}</td>
                <td>${i.sessions || 0}</td>
                <td>${Number(i.avg_rating || 0).toFixed(1)} / 5</td>
                <td>+${i.attendance_delta || 0}%</td>
                <td>${renderMiniBar(i.utilisation || 0, '#7c3aed')} ${i.utilisation || 0}%</td>
              </tr>`).join('') ||
              '<tr><td colspan="6" class="empty-row">No instructor data</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    ${campusPerf.length ? `
      <section class="panel">
        <h3 class="panel-title">Campus Comparison</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Campus</th><th>Active Trainees</th><th>Programmes</th>
              <th>Avg. Progress</th><th>Completion Rate</th>
            </tr></thead>
            <tbody>
              ${campusPerf.map(c => `
                <tr>
                  <td>${esc(c.campus_name)}</td>
                  <td>${c.active_trainees || 0}</td>
                  <td>${c.programmes || 0}</td>
                  <td>${c.avg_progress || 0}%</td>
                  <td>${c.completion_rate || 0}%</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}
  `;
}
