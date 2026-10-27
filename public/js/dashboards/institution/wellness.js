/* ============================================================
   Institution — Wellness & Engagement
   ============================================================ */
function instWellness() {
  const scores = S.wellnessScores || [];
  const alerts = S.wellnessAlerts || [];
  const critical = alerts.filter(a => a.severity === 'critical');
  const high     = alerts.filter(a => a.severity === 'high');
  const medium   = alerts.filter(a => a.severity === 'medium');

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
      <div>Wellness scores are computed from login frequency, attendance, assignment timeliness,
        forum engagement, quiz performance and feedback sentiment.</div>
    </div>

    <section class="stat-grid">
      ${statCard('Critical Alerts', critical.length, '', 'fa-exclamation-circle', 'red')}
      ${statCard('High Risk', high.length, '', 'fa-exclamation-triangle', 'yellow')}
      ${statCard('Medium Risk', medium.length, '', 'fa-info-circle', 'yellow')}
      ${statCard('Avg. Wellness Score',
        scores.length ? Math.round(scores.reduce((s, x) => s + Number(x.score || 0), 0) / scores.length) : 0,
        '', 'fa-heart', 'green')}
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
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="panel">
      <h3 class="panel-title">Trainee Wellness Scores</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Trainee</th><th>Score</th><th>Risk</th>
            <th>Login Frequency</th><th>Attendance</th>
            <th>Timeliness</th><th>Engagement</th>
          </tr></thead>
          <tbody>
            ${scores.map(s => `
              <tr>
                <td>${esc(s.trainee_name || 'Trainee')}</td>
                <td><strong>${s.score || 0}</strong>
                  ${renderMiniBar(s.score || 0, riskLevelColour(s.risk_level))}</td>
                <td><span class="chip"
                  style="background:${riskLevelColour(s.risk_level)}20;color:${riskLevelColour(s.risk_level)};border:1px solid ${riskLevelColour(s.risk_level)}50">
                  ${esc(s.risk_level || 'low')}</span></td>
                <td>${s.login_frequency || 0}%</td>
                <td>${s.attendance_score || 0}%</td>
                <td>${s.timeliness_score || 0}%</td>
                <td>${s.engagement_score || 0}%</td>
              </tr>`).join('') ||
              '<tr><td colspan="7" class="empty-row">No wellness data computed yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
