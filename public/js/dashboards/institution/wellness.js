/* ============================================================
   ExpertHub 2.0 — Wellness & Engagement
   Voluntary check-ins, confidential support referrals, engagement
   surveys, workload monitoring, consent controls, restricted
   access to sensitive records.
   ============================================================ */

function instWellness() {
  const scores = S.wellnessScores || [];
  const alerts = S.wellnessAlerts || [];
  const interventions = S.wellnessInterventions || [];
  const surveys = S.engagementSurveys || [];

  const f = S.filters.wellness = S.filters.wellness || {};
  const severityFilter = f.severity || '';
  const statusFilter   = f.status || '';   // open | dismissed | intervened

  const filtered = alerts
    .filter(a => !severityFilter || a.severity === severityFilter)
    .filter(a => {
      if (statusFilter === 'open') return !a.dismissed && !a.intervened_at;
      if (statusFilter === 'dismissed') return a.dismissed;
      if (statusFilter === 'intervened') return !!a.intervened_at;
      return true;
    });
  const filteredSorted = sortBy(filtered, a => a.created_at || '', 'desc');

  const critical = alerts.filter(a => a.severity === 'critical' && !a.dismissed).length;
  const high     = alerts.filter(a => a.severity === 'high' && !a.dismissed).length;
  const medium   = alerts.filter(a => a.severity === 'medium' && !a.dismissed).length;

  const avgScore = scores.length
    ? Math.round(scores.reduce((s, x) => s + safeNum(x.score), 0) / scores.length)
    : 0;

  /* Explicit consent state — sensitive wellness data is only ever
     exposed to users with explicit consent + a role-based permission. */
  const hasSensitiveAccess = hasInstitutionPermission('trainees:write') &&
                              hasInstitutionPermission('wellness:read');

  const canWrite = hasInstitutionPermission('trainees:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wellness & Engagement</span></div>
    <section class="page-header">
      <h1 class="page-title">Trainee Wellness & Engagement</h1>
      <div class="page-actions">
        <select id="wellness-severity" class="form-select" style="max-width:160px">
          <option value="">All severities</option>
          <option value="critical" ${severityFilter === 'critical' ? 'selected' : ''}>Critical</option>
          <option value="high" ${severityFilter === 'high' ? 'selected' : ''}>High</option>
          <option value="medium" ${severityFilter === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="low" ${severityFilter === 'low' ? 'selected' : ''}>Low</option>
        </select>
        <select id="wellness-status" class="form-select" style="max-width:180px">
          <option value="">All alert states</option>
          <option value="open" ${statusFilter === 'open' ? 'selected' : ''}>Open</option>
          <option value="intervened" ${statusFilter === 'intervened' ? 'selected' : ''}>Intervened</option>
          <option value="dismissed" ${statusFilter === 'dismissed' ? 'selected' : ''}>Dismissed</option>
        </select>
        <button class="btn btn-secondary" data-action="export-wellness">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="recompute-wellness">
            <i class="fas fa-rotate"></i> Recompute Scores</button>` : ''}
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-heart-pulse"></i>
      <div>
        <strong>Consent-controlled access.</strong>
        Wellness data is aggregated from opt-in check-ins, engagement signals and self-reported sentiment.
        Only users with both <code>trainees:write</code> and <code>wellness:read</code> permissions see individual records.
        ${!hasSensitiveAccess ? '<br><em>You currently have aggregate-only access.</em>' : ''}
      </div>
    </div>

    <section class="stat-grid">
      ${statCard('Critical Alerts', critical, '', 'fa-exclamation-circle', critical > 0 ? 'red' : 'green')}
      ${statCard('High Risk', high, '', 'fa-exclamation-triangle', 'yellow')}
      ${statCard('Medium Risk', medium, '', 'fa-info-circle', 'yellow')}
      ${statCard('Avg. Wellness Score', avgScore, '', 'fa-heart', 'green')}
    </section>

    <!-- Active alerts -->
    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 class="panel-title" style="margin:0">Active Alerts</h3>
        ${canWrite ? `
          <button class="btn btn-secondary btn-sm" data-action="wellness-referral"
                  title="Create a confidential support referral">
            <i class="fas fa-user-shield"></i> Refer Support</button>` : ''}
      </div>

      ${filteredSorted.length ? `
        <ul class="list-stack">
          ${filteredSorted.map(a => renderWellnessAlert(a, canWrite)).join('')}
        </ul>` : renderEmptyState({
              icon: 'fa-heart',
              title: 'No active wellness alerts',
              description: 'All trainees are within their wellness thresholds.',
              compact: true,
            })}
    </section>

    <!-- Interventions log -->
    ${interventions.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-hand-holding-heart"></i> Recent Interventions</h3>
        <ul class="list-stack">
          ${interventions.slice(0, 10).map(i => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(i.trainee_name || 'Trainee')} · ${esc(i.type || 'Intervention')}</span>
                <span class="list-row-sub">
                  ${fmtDT(i.created_at)}
                  ${i.follow_up ? ` · Follow-up ${fmtDate(i.follow_up)}` : ''}
                  ${i.confidential ? ' · <span class="chip chip-neutral" style="font-size:.65rem">Confidential</span>' : ''}
                </span>
              </div>
              <button class="btn btn-secondary btn-xs" data-action="view-intervention" data-id="${i.id}">
                View</button>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <!-- Engagement surveys -->
    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 class="panel-title" style="margin:0"><i class="fas fa-clipboard-question"></i> Engagement Surveys</h3>
        ${canWrite ? `
          <button class="btn btn-secondary btn-sm" data-action="create-survey">
            <i class="fas fa-plus"></i> New Survey</button>` : ''}
      </div>
      ${surveys.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Survey</th><th>Status</th><th>Responses</th><th>Avg. Score</th><th>Window</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${surveys.map(s => `
                <tr>
                  <td>${esc(s.title)}</td>
                  <td><span class="${statusClass(s.status || 'active')}">${esc(s.status || 'active')}</span></td>
                  <td>${s.responses || 0} of ${s.invited || 0}</td>
                  <td>${s.avg_score != null ? Number(s.avg_score).toFixed(1) : '—'}</td>
                  <td>${fmtDate(s.starts_at)} → ${fmtDate(s.ends_at)}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="view-survey" data-id="${s.id}">View</button>
                    ${canWrite && s.status === 'draft' ? `
                      <button class="btn btn-primary btn-xs" data-action="launch-survey" data-id="${s.id}">Launch</button>` : ''}
                    ${canWrite && s.status === 'active' ? `
                      <button class="btn btn-secondary btn-xs" data-action="close-survey" data-id="${s.id}">Close</button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No engagement surveys configured yet</p>'}
    </section>

    <!-- Scores table (sensitive — access-controlled) -->
    <section class="panel">
      <h3 class="panel-title">Trainee Wellness Scores</h3>
      ${hasSensitiveAccess ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Trainee</th><th>Score</th><th>Risk</th>
              <th>Login Frequency</th><th>Attendance</th>
              <th>Timeliness</th><th>Engagement</th><th>Consent</th>
            </tr></thead>
            <tbody>
              ${scores.map(s => `
                <tr>
                  <td>${esc(s.trainee_name || 'Trainee')}</td>
                  <td>
                    <strong>${s.score || 0}</strong>
                    ${renderMiniBar(s.score || 0, riskLevelColour(s.risk_level))}
                  </td>
                  <td><span class="chip"
                    style="background:${riskLevelColour(s.risk_level)}20;color:${riskLevelColour(s.risk_level)};border:1px solid ${riskLevelColour(s.risk_level)}50">
                    ${esc(s.risk_level || 'low')}
                  </span></td>
                  <td>${s.login_frequency || 0}%</td>
                  <td>${s.attendance_score || 0}%</td>
                  <td>${s.timeliness_score || 0}%</td>
                  <td>${s.engagement_score || 0}%</td>
                  <td>${s.consent_given
                    ? `<span class="chip chip-green" title="Trainee opted in"><i class="fas fa-check"></i></span>`
                    : `<span class="chip chip-yellow" title="No consent — data aggregated only"><i class="fas fa-lock"></i></span>`}</td>
                </tr>`).join('') ||
                '<tr><td colspan="8" class="empty-row">No wellness data computed yet</td></tr>'}
            </tbody>
          </table>
        </div>` : renderEmptyState({
              icon: 'fa-lock',
              title: 'Restricted access',
              description: 'Individual wellness scores require both trainees:write and wellness:read permissions.',
              compact: true,
            })}
    </section>
  `;
}

/* ── Alert row (individual, consent-controlled) ───────────── */
function renderWellnessAlert(a, canWrite) {
  const dismissed = !!a.dismissed;
  const intervened = !!a.intervened_at;

  const consentChip = a.consent_given
    ? `<span class="chip chip-green" style="font-size:.65rem"><i class="fas fa-check"></i> Consented</span>`
    : `<span class="chip chip-yellow" style="font-size:.65rem" title="Anonymous / no consent for individual contact">
        <i class="fas fa-lock"></i> Restricted</span>`;

  return `
    <li class="list-row" style="border-left:3px solid ${riskLevelColour(a.severity)};flex-wrap:wrap">
      <div class="list-row-main">
        <span class="list-row-title">
          ${a.consent_given ? esc(a.trainee_name || 'Trainee') : 'Anonymous trainee'}
          — ${esc(a.reason || 'Wellness threshold')}
          ${consentChip}
          ${dismissed ? '<span class="chip chip-neutral" style="font-size:.65rem">Dismissed</span>' : ''}
          ${intervened ? '<span class="chip chip-green" style="font-size:.65rem">Intervened</span>' : ''}
        </span>
        <span class="list-row-sub">
          ${fmtDT(a.created_at)} · Score: ${a.score || 0}
          ${a.follow_up ? ` · Follow-up: ${fmtDate(a.follow_up)}` : ''}
        </span>
        ${a.intervention_summary ? `
          <span class="list-row-sub" style="color:var(--text-muted);margin-top:2px">
            <i class="fas fa-note-sticky"></i> ${esc(truncate(a.intervention_summary, 120))}
          </span>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${canWrite && !intervened && !dismissed ? `
          <button class="btn btn-info btn-xs" data-action="wellness-intervene" data-id="${a.id}">
            <i class="fas fa-hand-holding-heart"></i> Intervene</button>` : ''}
        ${canWrite && intervened ? `
          <button class="btn btn-secondary btn-xs" data-action="wellness-followup" data-id="${a.id}">
            Follow-up</button>` : ''}
        ${canWrite && !dismissed ? `
          <button class="btn btn-secondary btn-xs" data-action="wellness-dismiss" data-id="${a.id}">
            Dismiss</button>` : ''}
      </div>
    </li>`;
}
