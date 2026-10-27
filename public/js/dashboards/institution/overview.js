/* ============================================================
   ExpertHub 2.0 — Institution Overview
   Widget-based dashboard with task center, KPIs, deadlines,
   alerts, and training targets. All values from API state.
   ============================================================ */

function instOverview() {
  const st = S.institutionStats || {};
  const activeProgrammes = (S.programmes || []).filter(p => p.status === 'active').length;
  const activeCohorts    = (S.cohorts || []).filter(c => c.status === 'active').length;
  const completion       = safeNum(st.avgCompletionRate ?? st.avg_completion_rate);
  const attendance       = safeNum(st.attendanceRate);
  const avgScore         = safeNum(st.avgScore ?? st.avg_score);
  const pendingApprovals = safeNum(st.pendingApprovals);
  const expiringCerts    = safeNum(st.expiringCertificates);
  const upcomingSessions = (st.upcomingSessions || []).slice(0, 5);

  const tasks   = buildPendingTasks();
  const alerts  = buildOperationalAlerts();
  const targets = buildTrainingTargets();

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

    <!-- KPI grid -->
    <section class="stat-grid">
      ${statCard('Active Programmes', activeProgrammes, `of ${(S.programmes || []).length} total`, 'fa-diagram-project', 'blue')}
      ${statCard('Active Cohorts', activeCohorts, '', 'fa-layer-group', 'green')}
      ${statCard('Total Trainees', st.totalTrainees || (S.trainees || []).length, '', 'fa-users', 'purple')}
      ${statCard('Attendance Rate', attendance + '%', '', 'fa-user-check', 'yellow')}
      ${statCard('Avg. Completion', completion + '%', '', 'fa-chart-line', 'blue')}
      ${statCard('Avg. Score', avgScore + '%', '', 'fa-star', 'green')}
    </section>

    ${(pendingApprovals || expiringCerts) ? `
      <section class="dashboard-columns">
        ${pendingApprovals ? `
          <div class="alert alert-warning">
            <i class="fas fa-clock"></i>
            <div>
              <strong>${pluralize(pendingApprovals, 'pending approval')}</strong>
              <p style="margin:4px 0 0;font-size:.85rem">
                <a href="#" data-action="switch-tab" data-tab="operations">Review now</a>
              </p>
            </div>
          </div>` : ''}
        ${expiringCerts ? `
          <div class="alert alert-info">
            <i class="fas fa-certificate"></i>
            <div>
              <strong>${pluralize(expiringCerts, 'certificate')} expiring within 90 days</strong>
              <p style="margin:4px 0 0;font-size:.85rem">
                <a href="#" data-action="switch-tab" data-tab="certifications">View register</a>
              </p>
            </div>
          </div>` : ''}
      </section>` : ''}

    <section class="dashboard-columns">
      <!-- Quick Actions -->
      <div class="panel panel-quick-actions">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="create-programme"><i class="fas fa-plus"></i> New Programme</button>
        <button class="btn btn-info btn-block" data-action="create-cohort"><i class="fas fa-layer-group"></i> Create Cohort</button>
        <button class="btn btn-success btn-block" data-action="invite-trainee"><i class="fas fa-user-plus"></i> Import Trainees</button>
        <button class="btn btn-warning btn-block" data-action="schedule-session"><i class="fas fa-calendar-plus"></i> Schedule Session</button>
        <button class="btn btn-secondary btn-block" data-action="issue-certificate"><i class="fas fa-award"></i> Issue Certificate</button>
      </div>

      <!-- Pending Task Center -->
      <div class="panel">
        <h3 class="panel-title">
          <i class="fas fa-list-check"></i> Pending Tasks
          ${tasks.length ? `<span class="chip chip-yellow" style="margin-left:6px">${tasks.length}</span>` : ''}
        </h3>
        ${tasks.length ? `
          <ul class="list-stack">
            ${tasks.slice(0, 8).map(t => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(t.title)}</span>
                  <span class="list-row-sub">${esc(t.subtitle || '')}</span>
                </div>
                <button class="btn ${t.variant || 'btn-secondary'} btn-xs"
                        data-action="${esc(t.action)}"
                        ${t.actionId ? `data-id="${esc(t.actionId)}"` : ''}>
                  ${esc(t.actionLabel || 'Open')}
                </button>
              </li>`).join('')}
          </ul>` : renderEmptyState({
                icon: 'fa-check-circle',
                title: 'All caught up',
                description: 'No outstanding tasks right now.',
                compact: true,
              })}
      </div>
    </section>

    <!-- Operational alerts -->
    ${alerts.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-bell"></i> Operational Alerts</h3>
        <ul class="list-stack">
          ${alerts.slice(0, 6).map(a => `
            <li class="list-row" style="border-left:3px solid ${riskLevelColour(a.severity)}">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.title)}</span>
                <span class="list-row-sub">${esc(a.subtitle || '')}</span>
              </div>
              <button class="btn btn-secondary btn-xs"
                      data-action="${esc(a.action)}"
                      ${a.actionId ? `data-id="${esc(a.actionId)}"` : ''}>
                View
              </button>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <!-- Training targets -->
    <section class="panel">
      <h3 class="panel-title">Training Targets</h3>
      ${targets.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Metric</th><th>Target</th><th>Actual</th><th>Progress</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${targets.map(t => {
                const pct = t.target ? pctOf(t.actual, t.target) : 0;
                const cls = pct >= 100 ? 'status-active'
                          : pct >= 75  ? 'status-pending'
                          : 'status-rejected';
                return `<tr>
                  <td>${esc(t.label)}</td>
                  <td>${t.target}${t.suffix || ''}</td>
                  <td>${t.actual}${t.suffix || ''}</td>
                  <td>${renderMiniBar(pct, pct >= 100 ? '#22c55e' : pct >= 75 ? '#eab308' : '#dc2626')} ${pct}%</td>
                  <td><span class="${cls}">${pct >= 100 ? 'Met' : pct >= 75 ? 'On track' : 'Behind'}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : renderEmptyState({
              icon: 'fa-bullseye',
              title: 'No training targets configured',
              description: 'Set quarterly training targets in Operations Control.',
              compact: true,
            })}
    </section>

    <!-- Upcoming sessions -->
    ${upcomingSessions.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Sessions</h3>
        <ul class="list-stack">
          ${upcomingSessions.map(s => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(s.title)}</span>
                <span class="list-row-sub">${esc(s.cohort_name || '')} · ${fmtDT(s.scheduled_at)}</span>
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

    <!-- Charts -->
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

/* ── Pending task center data ──────────────────────────────── */
function buildPendingTasks() {
  const tasks = [];

  (S.institutionApprovals || [])
    .filter(a => a.status === 'pending')
    .slice(0, 5)
    .forEach(a => tasks.push({
      title: `Approve ${(a.request_type || '').replace(/_/g, ' ')}`,
      subtitle: `Requested by ${a.requested_by_name || 'user'} · ${fmtDT(a.created_at)}`,
      action: 'approve-request',
      actionId: a.id,
      actionLabel: 'Review',
      variant: 'btn-success',
      priority: a.total_steps > 1 ? 2 : 1,
    }));

  (S.institutionEnrollments || [])
    .filter(e => (e.status || e.lifecycle_status) === 'pending_approval')
    .slice(0, 5)
    .forEach(e => tasks.push({
      title: `Approve enrolment — ${e.trainee_name || e.name || 'Trainee'}`,
      subtitle: `Programme: ${e.programme_title || '—'}`,
      action: 'approve-enrolment',
      actionId: e.id,
      actionLabel: 'Approve',
      variant: 'btn-primary',
      priority: 1,
    }));

  (S.wellnessAlerts || [])
    .filter(a => a.severity === 'critical' && !a.dismissed)
    .slice(0, 3)
    .forEach(a => tasks.push({
      title: `Critical wellness alert — ${a.trainee_name || 'Trainee'}`,
      subtitle: a.reason || '',
      action: 'wellness-intervene',
      actionId: a.id,
      actionLabel: 'Intervene',
      variant: 'btn-danger',
      priority: 3,
    }));

  return tasks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/* ── Operational alerts ────────────────────────────────────── */
function buildOperationalAlerts() {
  const alerts = [];

  (S.budgetAllocations || []).forEach(b => {
    const util = b.allocated ? (b.spent / b.allocated) * 100 : 0;
    if (util >= 95) {
      alerts.push({
        severity: 'critical',
        title: `Budget at ${util.toFixed(0)}% — ${b.department}`,
        subtitle: `${fmtCur(b.spent)} of ${fmtCur(b.allocated)} spent`,
        action: 'edit-budget',
        actionId: b.id,
      });
    } else if (util >= 80) {
      alerts.push({
        severity: 'high',
        title: `Budget approaching limit — ${b.department}`,
        subtitle: `${util.toFixed(0)}% utilised`,
        action: 'edit-budget',
        actionId: b.id,
      });
    }
  });

  (S.institutionCertificates || []).forEach(c => {
    if (!c.expires_at || c.revoked) return;
    const days = (new Date(c.expires_at) - Date.now()) / 86400000;
    if (days > 0 && days < 30) {
      alerts.push({
        severity: 'high',
        title: `Certificate expires in ${Math.ceil(days)} days`,
        subtitle: `${c.trainee_name || 'Trainee'} — ${c.programme_title || c.serial}`,
        action: 'switch-tab',
        actionId: 'certifications',
      });
    }
  });

  return alerts.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] || 9) - (order[b.severity] || 9);
  });
}

/* ── Training targets (vs. configured goals) ───────────────── */
function buildTrainingTargets() {
  const st = S.institutionStats || {};
  const targets = st.targets || {};
  const out = [];

  const addTarget = (label, actual, target, suffix = '%') => {
    if (target == null) return;
    out.push({ label, actual: safeNum(actual), target: safeNum(target), suffix });
  };

  addTarget('Completion rate', st.avgCompletionRate ?? st.avg_completion_rate, targets.completionRate, '%');
  addTarget('Attendance rate', st.attendanceRate, targets.attendanceRate, '%');
  addTarget('Average score',   st.avgScore ?? st.avg_score,           targets.avgScore,       '%');
  addTarget('Certificates issued', (S.institutionCertificates || []).length, targets.certificatesIssued, '');

  return out;
}

/* ── Stat card helper (unchanged public API) ───────────────── */
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
