/* ============================================================
   ExpertHub 2.0 — Institution Analytics Command Center
   Historical comparisons, retention curve, completion funnel,
   instructor effectiveness, department comparison, budget
   efficiency, and explainable risk indicators.
   ============================================================ */

function instAnalyticsCenter() {
  const a = S.institutionAnalytics || {};
  const overview      = a.overview || {};
  const cohortPerf    = a.cohortPerformance || [];
  const instructorPerf= a.instructorPerformance || [];
  const campusPerf    = a.campusPerformance || [];
  const deptPerf      = a.departmentPerformance || [];
  const retention     = a.retentionCurve || [];
  const funnel        = a.completionFunnel || {};
  const risks         = a.riskIndicators || [];

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

    <!-- KPI cards with trend deltas -->
    <section class="stat-grid">
      ${statCardWithDelta(
        'Active Trainees',
        overview.activeTrainees || 0,
        'vs prior period',
        overview.activeTraineesChange,
        'fa-users', 'blue'
      )}
      ${statCardWithDelta(
        'Completion Rate',
        (overview.completionRate || 0) + '%',
        `Target: ${overview.completionTarget || 80}%`,
        overview.completionRateChange,
        'fa-check-circle', 'green'
      )}
      ${statCardWithDelta(
        'Avg. Assessment Score',
        (overview.avgScore || 0) + '%',
        'vs prior period',
        overview.avgScoreChange,
        'fa-star', 'purple'
      )}
      ${statCardWithDelta(
        'Certificates Issued',
        overview.certificatesIssued || 0,
        `${overview.certificatesExpiring || 0} expiring soon`,
        overview.certificatesChange,
        'fa-award', 'yellow'
      )}
      ${statCardWithDelta(
        'Budget Utilisation',
        (overview.budgetUtilisation || 0) + '%',
        'of allocated',
        overview.budgetChange,
        'fa-coins', 'red'
      )}
      ${statCardWithDelta(
        'At-Risk Trainees',
        overview.atRiskTrainees || 0,
        'requiring intervention',
        overview.atRiskChange,
        'fa-exclamation-triangle', 'red',
        true /* inverted: down is good */
      )}
    </section>

    <!-- Completion funnel + retention curve side-by-side -->
    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Completion Funnel</h3>
        ${renderCompletionFunnel(funnel)}
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Cohort Retention Curve</h3>
        <canvas id="chartRetention" height="200"></canvas>
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

    <!-- Explainable risk indicators -->
    ${risks.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-triangle-exclamation"></i> Explainable Risk Indicators</h3>
        <p class="form-hint" style="margin-bottom:12px">
          Each risk is derived from verifiable data. Expand for the reasoning and recommended action.
        </p>
        <ul class="list-stack">
          ${risks.map(r => `
            <li class="list-row" style="border-left:3px solid ${riskLevelColour(r.severity)}">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.label)}</span>
                <span class="list-row-sub">${esc(r.explanation || '')}</span>
                ${r.recommendation ? `
                  <span class="list-row-sub" style="color:var(--accent);margin-top:2px">
                    <i class="fas fa-lightbulb"></i> ${esc(r.recommendation)}
                  </span>` : ''}
              </div>
              <span class="chip" style="background:${riskLevelColour(r.severity)}20;color:${riskLevelColour(r.severity)};border:1px solid ${riskLevelColour(r.severity)}50">
                ${esc(r.severity)}
              </span>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <!-- Cohort leaderboard -->
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

    <!-- Instructor effectiveness -->
    <section class="panel">
      <h3 class="panel-title">Instructor Effectiveness</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Instructor</th><th>Programmes</th><th>Sessions</th>
            <th>Avg. Rating</th><th>Attendance Impact</th>
            <th>Completion Impact</th><th>Utilisation</th>
          </tr></thead>
          <tbody>
            ${instructorPerf.map(i => `
              <tr>
                <td>${esc(i.name)}</td>
                <td>${i.programmes || 0}</td>
                <td>${i.sessions || 0}</td>
                <td>${Number(i.avg_rating || 0).toFixed(1)} / 5</td>
                <td>${formatDelta(i.attendance_delta)}</td>
                <td>${formatDelta(i.completion_delta)}</td>
                <td>${renderMiniBar(i.utilisation || 0, '#7c3aed')} ${i.utilisation || 0}%</td>
              </tr>`).join('') ||
              '<tr><td colspan="7" class="empty-row">No instructor data</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Department comparison (cost-efficiency) -->
    ${deptPerf.length ? `
      <section class="panel">
        <h3 class="panel-title">Department Comparison</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Department</th><th>Trainees</th><th>Avg. Progress</th>
              <th>Completion Rate</th><th>Cost per Trainee</th><th>Cost per Completion</th>
            </tr></thead>
            <tbody>
              ${deptPerf.map(d => `
                <tr>
                  <td>${esc(d.department)}</td>
                  <td>${d.trainees || 0}</td>
                  <td>${d.avg_progress || 0}%</td>
                  <td>${d.completion_rate || 0}%</td>
                  <td>${d.cost_per_trainee != null ? fmtCur(d.cost_per_trainee) : '—'}</td>
                  <td>${d.cost_per_completion != null ? fmtCur(d.cost_per_completion) : '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}

    <!-- Campus comparison -->
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

/* ── KPI card with trend delta ────────────────────────────── */
function statCardWithDelta(label, value, sub, delta, icon, colour, inverted = false) {
  const n = Number(delta);
  let deltaEl = '';
  if (Number.isFinite(n) && n !== 0) {
    const positiveIsGood = !inverted;
    const isPositive = n > 0;
    const isGood = isPositive === positiveIsGood;
    const cls = isGood ? 'delta-positive' : 'delta-negative';
    const sign = isPositive ? '+' : '';
    deltaEl = `<span class="delta ${cls}" style="font-size:.75rem">${sign}${n}%</span>`;
  }
  return `
    <div class="dashboard-card stat-card">
      <div class="stat-info">
        <p class="stat-label">${esc(label)}</p>
        <p class="stat-value">${value} ${deltaEl}</p>
        ${sub ? `<p class="stat-sub">${esc(sub)}</p>` : ''}
      </div>
      <div class="stat-icon stat-icon-${colour}"><i class="fas ${icon}"></i></div>
    </div>`;
}

/* ── Completion funnel visualization ──────────────────────── */
function renderCompletionFunnel(f) {
  const stages = [
    { key: 'applied',   label: 'Applied',   colour: '#94a3b8' },
    { key: 'enrolled',  label: 'Enrolled',  colour: '#0ea5e9' },
    { key: 'active',    label: 'Active',    colour: '#7c3aed' },
    { key: 'completed', label: 'Completed', colour: '#059669' },
    { key: 'certified', label: 'Certified', colour: '#22c55e' },
  ];
  const top = safeNum(f.applied) || safeNum(f.enrolled) || 1;

  return `
    <div class="funnel" style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${stages.map(s => {
        const count = safeNum(f[s.key]);
        const width = Math.max(6, (count / top) * 100);
        return `
          <div class="funnel-stage" style="display:flex;align-items:center;gap:10px">
            <span style="width:80px;font-size:.8rem;color:var(--text-muted)">${s.label}</span>
            <div style="flex:1;background:var(--surface-3);height:22px;border-radius:6px;overflow:hidden">
              <div style="height:100%;width:${width}%;background:${s.colour};transition:width .3s"></div>
            </div>
            <span style="width:70px;text-align:right;font-weight:600">${count}</span>
            <span style="width:50px;text-align:right;font-size:.75rem;color:var(--text-muted)">
              ${count ? pctOf(count, top) + '%' : '—'}
            </span>
          </div>`;
      }).join('')}
    </div>`;
}
