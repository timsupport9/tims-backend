/* ============================================================
   dashboards/institution/reports.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const st = S.institutionStats || {};

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Reports' }])}
      ${EH.Layout.pageHeader('Reports & Insights', {
        actions: `
          <button class="btn btn-secondary" data-action="export-institution-report">
            <i class="fas fa-download"></i> Export CSV</button>
          <button class="btn btn-primary" data-action="schedule-report">
            <i class="fas fa-calendar-plus"></i> Schedule Report</button>`,
      })}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'Completion Rate',
          value: `${st.avgCompletionRate || st.avg_completion_rate || 0}%`,
          icon: 'fa-check-circle', tone: 'green' }),
        EH.Layout.statCard({ label: 'Avg. Score',
          value: `${st.avgScore || st.avg_score || 0}%`,
          icon: 'fa-star', tone: 'blue' }),
        EH.Layout.statCard({ label: 'Attendance Rate',
          value: `${st.attendanceRate || 0}%`,
          icon: 'fa-user-check', tone: 'purple' }),
        EH.Layout.statCard({ label: 'Certificates Issued',
          value: S.institutionCertificates.length,
          icon: 'fa-award', tone: 'yellow' }),
      ])}

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
                    <span class="list-row-title">${EH.Fmt.esc(r.template_name || 'Report')}</span>
                    <span class="list-row-sub">
                      ${EH.Fmt.esc(r.frequency)} - Next: ${EH.Dates.fmtDate(r.next_run_at)}
                    </span>
                  </div>
                  <span class="${r.active ? 'status-active' : 'status-archived'}">
                    ${r.active ? 'Active' : 'Paused'}</span>
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

      <section class="panel-charts">
        <div class="chart-card">
          <h3 class="panel-title">Cohort Completion Trend</h3>
          <canvas id="chartInstProgress" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h3 class="panel-title">Assessment Distribution</h3>
          <canvas id="chartInstAssess" height="200"></canvas>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">Report Templates</h3>
        ${S.institutionReportTemplates.length ? `
          <ul class="list-stack">
            ${S.institutionReportTemplates.map(t => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${EH.Fmt.esc(t.name)}</span>
                  <span class="list-row-sub">
                    ${EH.Fmt.esc(t.report_type)} - created ${EH.Dates.fmtDate(t.created_at)}
                  </span>
                </div>
                <button class="btn btn-secondary btn-xs" data-action="run-report-template" data-id="${t.id}">
                  <i class="fas fa-play"></i> Run</button>
              </li>`).join('')}
          </ul>` : '<p class="empty-row">No report templates saved</p>'}
      </section>`;
  }

  EH.InstReports = { render };
})(window);
