/* ============================================================
   dashboards/institution/overview.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;
  const CONFIG = EH.CONFIG;

  function render() {
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
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Institution Dashboard' }])}
      ${EH.Layout.pageHeader(`${EH.Fmt.esc(S.myInstitution?.name || 'Institution')} Overview`, {
        actions: `
          <button class="btn btn-secondary" data-action="export-institution-report">
            <i class="fas fa-download"></i> Export Report</button>
          <button class="btn btn-primary" data-action="refresh-all">
            <i class="fas fa-rotate"></i> Refresh</button>`,
      })}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({
          label: 'Active Programmes', value: activeProgrammes,
          sub: `of ${S.programmes.length} total`, icon: 'fa-diagram-project', tone: 'blue',
        }),
        EH.Layout.statCard({ label: 'Active Cohorts', value: activeCohorts,
          icon: 'fa-layer-group', tone: 'green' }),
        EH.Layout.statCard({ label: 'Total Trainees',
          value: st.totalTrainees || S.trainees.length, icon: 'fa-users', tone: 'purple' }),
        EH.Layout.statCard({ label: 'Attendance Rate', value: `${attendance}%`,
          icon: 'fa-user-check', tone: 'yellow' }),
        EH.Layout.statCard({ label: 'Avg. Completion', value: `${completion}%`,
          icon: 'fa-chart-line', tone: 'blue' }),
        EH.Layout.statCard({ label: 'Avg. Assessment Score', value: `${avgScore}%`,
          icon: 'fa-star', tone: 'green' }),
      ])}

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
            </div>` : ''}
          ${expiringCerts ? `
            <div class="alert alert-info">
              <i class="fas fa-certificate"></i>
              <div>
                <strong>${expiringCerts} certificate${expiringCerts > 1 ? 's' : ''} expiring within 90 days</strong>
                <p style="margin:4px 0 0;font-size:.85rem">
                  <a href="#" data-action="switch-tab" data-tab="certifications">View register</a>
                </p>
              </div>
            </div>` : ''}
        </section>` : ''}

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
            ${(CONFIG.PROGRAMME_STATUSES || []).map(s => {
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
                  <span class="list-row-title">${EH.Fmt.esc(s.title)}</span>
                  <span class="list-row-sub">
                    ${EH.Fmt.esc(s.cohort_name || '')} - ${EH.Dates.fmtDateTime(s.scheduled_at)}
                  </span>
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
        <div class="chart-card">
          <h3 class="panel-title">Trainee Progress Trend</h3>
          <canvas id="chartInstProgress" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h3 class="panel-title">Assessment Score Distribution</h3>
          <canvas id="chartInstAssess" height="200"></canvas>
        </div>
      </section>`;
  }

  EH.InstOverview = { render };
})(window);
