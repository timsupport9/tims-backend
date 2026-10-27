/* ============================================================
   ExpertHub 2.0 — Proctored Exams
   Adds: identity verification, candidate consent, incident
   timeline, evidence review, appeals, configurable retention,
   human-reviewed integrity flags, accessibility accommodations.
   ============================================================ */

function instProctorSessions() {
  const sessions = S.examProctorSessions || [];
  const flags    = S.examProctorFlags || [];
  const appeals  = S.proctorAppeals || [];

  const f = S.filters.proctor = S.filters.proctor || {};
  const statusFilter = f.status || '';
  const integrityFilter = f.integrity || '';   // clean | review | flagged

  let filtered = sessions.slice();
  if (statusFilter) filtered = filtered.filter(s => s.status === statusFilter);
  if (integrityFilter === 'clean') {
    filtered = filtered.filter(s => s.integrity_score != null && s.integrity_score >= 90);
  }
  if (integrityFilter === 'review') {
    filtered = filtered.filter(s => s.integrity_score != null && s.integrity_score >= 70 && s.integrity_score < 90);
  }
  if (integrityFilter === 'flagged') {
    filtered = filtered.filter(s => s.integrity_score != null && s.integrity_score < 70);
  }
  filtered = sortBy(filtered, s => s.scheduled_at || '', 'desc');

  const retentionDays = CONFIG.RETENTION_POLICIES.exam_recordings_days;
  const flaggedCount = sessions.filter(s => s.integrity_score != null && s.integrity_score < 70).length;
  const reviewedCount = sessions.filter(s => s.human_reviewed).length;

  const canWrite = hasInstitutionPermission('assessments:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Proctored Exams</span></div>
    <section class="page-header">
      <h1 class="page-title">Proctored Exam Sessions</h1>
      <div class="page-actions">
        <select id="proctor-status" class="form-select" style="max-width:160px">
          <option value="">All statuses</option>
          ${CONFIG.SESSION_STATUSES.map(s =>
            `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${capitalize(s.replace(/_/g, ' '))}</option>`).join('')}
        </select>
        <select id="proctor-integrity" class="form-select" style="max-width:160px">
          <option value="">All integrity</option>
          <option value="clean" ${integrityFilter === 'clean' ? 'selected' : ''}>Clean (≥90)</option>
          <option value="review" ${integrityFilter === 'review' ? 'selected' : ''}>Review (70-89)</option>
          <option value="flagged" ${integrityFilter === 'flagged' ? 'selected' : ''}>Flagged (&lt;70)</option>
        </select>
        <button class="btn btn-secondary" data-action="export-proctor-sessions">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="schedule-proctor-session">
            <i class="fas fa-plus"></i> Schedule Exam</button>` : ''}
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-shield-halved"></i>
      <div>
        <strong>Retention policy:</strong> Exam recordings and evidence are retained for
        ${retentionDays} days unless a dispute is filed.
        Integrity flags are always <strong>human-reviewed</strong> before any adverse action.
        ${canWrite ? `
          <button class="btn btn-secondary btn-xs" style="margin-left:8px" data-action="retention-settings">
            <i class="fas fa-cog"></i> Configure</button>` : ''}
      </div>
    </div>

    <section class="stat-grid">
      ${statCard('Total Sessions', sessions.length, '', 'fa-shield-halved', 'blue')}
      ${statCard('Completed', sessions.filter(s => s.status === 'completed').length, '', 'fa-check', 'green')}
      ${statCard('Flagged', flaggedCount, `${reviewedCount} human-reviewed`, 'fa-flag', 'red')}
      ${statCard('Live Now', sessions.filter(s => s.status === 'in_progress').length, '', 'fa-video', 'yellow')}
    </section>

    <section class="panel">
      <h3 class="panel-title">All Sessions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Exam</th><th>Trainee</th><th>Scheduled</th>
            <th>Mode</th><th>Identity</th><th>Consent</th>
            <th>Integrity</th><th>Accessibility</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${filtered.map(s => renderProctorRow(s, canWrite)).join('') ||
              '<tr><td colspan="10" class="empty-row">No proctored sessions yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    ${flags.length ? renderIntegrityFlags(flags, canWrite) : ''}
    ${appeals.length ? renderProctorAppeals(appeals, canWrite) : ''}
  `;
}

/* ── Row renderer ─────────────────────────────────────────── */
function renderProctorRow(s, canWrite) {
  const score = s.integrity_score;
  const scoreClass = score == null ? ''
    : score >= 90 ? 'status-active'
    : score >= 70 ? 'status-pending'
    : 'status-rejected';
  const reviewedChip = s.human_reviewed
    ? `<span class="chip chip-green" style="margin-left:4px;font-size:.65rem"><i class="fas fa-user-check"></i> Reviewed</span>`
    : (score != null && score < 90 ? `<span class="chip chip-yellow" style="margin-left:4px;font-size:.65rem">Awaiting review</span>` : '');

  const accommodations = Array.isArray(s.accessibility_accommodations) ? s.accessibility_accommodations : [];

  return `
    <tr>
      <td>${esc(s.exam_title || '—')}</td>
      <td>${esc(s.trainee_name || '—')}</td>
      <td>${fmtDT(s.scheduled_at)}</td>
      <td><span class="chip chip-neutral">${esc(s.proctor_mode || 'webcam')}</span></td>
      <td>${s.identity_verified
        ? `<span class="chip chip-green"><i class="fas fa-check"></i> Verified</span>`
        : `<span class="chip chip-yellow"><i class="fas fa-clock"></i> Pending</span>`}</td>
      <td>${s.consent_signed
        ? `<span class="chip chip-green"><i class="fas fa-file-signature"></i> Signed</span>`
        : `<span class="chip chip-red"><i class="fas fa-xmark"></i> Missing</span>`}</td>
      <td>${score != null
        ? `<span class="${scoreClass}">${examIntegrityLabel(score)} (${score})</span>${reviewedChip}`
        : '—'}</td>
      <td>${accommodations.length
        ? `<span class="chip chip-blue" title="${esc(accommodations.join(', '))}">
            <i class="fas fa-universal-access"></i> ${accommodations.length}</span>`
        : '<span class="text-muted">—</span>'}</td>
      <td><span class="${statusClass(s.status)}">${esc(s.status)}</span></td>
      <td class="actions-cell" style="white-space:nowrap">
        <button class="btn btn-info btn-xs" data-action="view-proctor-session" data-id="${s.id}">View</button>
        ${canWrite ? `
          ${!s.identity_verified ? `
            <button class="btn btn-secondary btn-xs" data-action="verify-identity" data-id="${s.id}"
                    title="Verify identity"><i class="fas fa-id-card"></i></button>` : ''}
          <button class="btn btn-secondary btn-xs" data-action="manage-accessibility" data-id="${s.id}"
                  title="Accessibility accommodations">
            <i class="fas fa-universal-access"></i></button>
          <button class="btn btn-secondary btn-xs" data-action="view-incident-timeline" data-id="${s.id}"
                  title="Incident timeline"><i class="fas fa-timeline"></i></button>
          ${score != null && !s.human_reviewed ? `
            <button class="btn btn-warning btn-xs" data-action="mark-human-reviewed" data-id="${s.id}"
                    title="Mark human-reviewed"><i class="fas fa-user-check"></i></button>` : ''}
          ${s.status === 'completed' && score != null && score < 70 && !s.invalidated ? `
            <button class="btn btn-danger btn-xs" data-action="invalidate-exam" data-id="${s.id}">Invalidate</button>` : ''}
        ` : ''}
      </td>
    </tr>`;
}

/* ── Integrity flags section ─────────────────────────────── */
function renderIntegrityFlags(flags, canWrite) {
  const open = flags.filter(f => !f.human_reviewed);
  return `
    <section class="panel">
      <h3 class="panel-title">
        <i class="fas fa-flag"></i> Integrity Flags
        ${open.length ? `<span class="chip chip-red" style="margin-left:6px">${open.length} open</span>` : ''}
      </h3>
      <p class="form-hint" style="margin-bottom:12px">
        Flags are raised by automated monitoring but require human review before any action.
      </p>
      <ul class="list-stack">
        ${flags.map(f => `
          <li class="list-row" style="border-left:3px solid ${riskLevelColour(f.severity || 'medium')}">
            <div class="list-row-main">
              <span class="list-row-title">
                ${esc(f.trainee_name || '—')} · ${esc(f.flag_type)}
                ${f.human_reviewed
                  ? `<span class="chip chip-green" style="margin-left:6px;font-size:.65rem">Reviewed</span>`
                  : `<span class="chip chip-yellow" style="margin-left:6px;font-size:.65rem">Pending review</span>`}
              </span>
              <span class="list-row-sub">
                ${fmtDT(f.flagged_at)} · ${esc(f.description || '')}
                ${f.retention_until ? ` · Evidence retained until ${fmtDate(f.retention_until)}` : ''}
              </span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-xs" data-action="review-evidence" data-id="${f.id}">
                <i class="fas fa-eye"></i> Evidence</button>
              ${canWrite && !f.human_reviewed ? `
                <button class="btn btn-primary btn-xs" data-action="review-flag" data-id="${f.id}">
                  Review</button>` : ''}
              ${f.appeal_filed ? `
                <span class="chip chip-blue"><i class="fas fa-gavel"></i> Appeal filed</span>` : ''}
            </div>
          </li>`).join('')}
      </ul>
    </section>`;
}

/* ── Appeals section ──────────────────────────────────────── */
function renderProctorAppeals(appeals, canWrite) {
  return `
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-gavel"></i> Exam Appeals</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Trainee</th><th>Exam</th><th>Filed</th>
            <th>Reason</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${appeals.map(a => `
              <tr>
                <td>${esc(a.trainee_name || '—')}</td>
                <td>${esc(a.exam_title || '—')}</td>
                <td>${fmtDate(a.filed_at)}</td>
                <td>${esc(truncate(a.reason || '', 80))}</td>
                <td><span class="${statusClass(a.status || 'pending')}">${esc(a.status || 'pending')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-appeal" data-id="${a.id}">
                    View</button>
                  ${canWrite && a.status === 'pending' ? `
                    <button class="btn btn-success btn-xs" data-action="resolve-appeal" data-id="${a.id}">
                      Resolve</button>` : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
}
