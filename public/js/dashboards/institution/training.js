/* ============================================================
   ExpertHub 2.0 — Training Delivery Center
   Adds: live-class integrations, session recordings, instructor
   attendance, QR attendance verification, training evaluations,
   session rescheduling, material access controls, hybrid support.
   ============================================================ */

function instTraining() {
  const sessions = S.institutionSessions || [];
  const materials = S.institutionMaterials || [];

  const f = S.filters.training = S.filters.training || {};
  const modeFilter = f.mode || '';
  const upcomingOnly = f.upcomingOnly !== false;

  const now = new Date();
  const upcoming = sessions
    .filter(s => s.status === 'scheduled' && new Date(s.scheduled_at) > now)
    .filter(s => !modeFilter || s.mode === modeFilter)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const past = sessions
    .filter(s => new Date(s.scheduled_at) <= now && s.status !== 'cancelled')
    .filter(s => !modeFilter || s.mode === modeFilter)
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  /* ── Summary ───────────────────────────────────────────── */
  let avgAttendance = 0;
  if (past.length) {
    const sum = past.reduce((acc, s) => {
      const total = safeNum(s.total_count);
      return acc + (total ? (safeNum(s.present_count) / total) * 100 : 0);
    }, 0);
    avgAttendance = Math.round(sum / past.length);
  }

  const recordedCount = past.filter(s => s.recording_url).length;
  const evaluationCount = past.filter(s => s.evaluations_submitted).length;

  const canWrite = hasInstitutionPermission('training:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Training Delivery</span></div>
    <section class="page-header">
      <h1 class="page-title">Training Delivery</h1>
      <div class="page-actions">
        <select id="training-mode" class="form-select" style="max-width:160px">
          <option value="">All modes</option>
          ${CONFIG.SESSION_MODES.map(m =>
            `<option value="${m}" ${modeFilter === m ? 'selected' : ''}>${capitalize(m.replace(/_/g, ' '))}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" data-action="view-calendar">
          <i class="fas fa-calendar"></i> Calendar View</button>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="schedule-session">
            <i class="fas fa-calendar-plus"></i> Schedule Session</button>` : ''}
      </div>
    </section>

    <!-- Live / hybrid summary -->
    <section class="stat-grid">
      ${statCard('Upcoming', upcoming.length, '', 'fa-clock', 'blue')}
      ${statCard('Completed', past.filter(s => s.status === 'completed').length, '', 'fa-check', 'green')}
      ${statCard('Avg. Attendance', avgAttendance + '%', '', 'fa-user-check', 'purple')}
      ${statCard('Recordings Available', recordedCount, '', 'fa-video', 'yellow')}
    </section>

    <!-- Upcoming sessions -->
    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 class="panel-title" style="margin:0">Upcoming Sessions</h3>
        ${upcoming.length ? `
          <span class="chip chip-blue">${upcoming.length} scheduled</span>` : ''}
      </div>
      ${upcoming.length ? `
        <ul class="list-stack">
          ${upcoming.map(s => renderUpcomingSession(s, canWrite)).join('')}
        </ul>` : renderEmptyState({
              icon: 'fa-calendar',
              title: 'No upcoming sessions',
              description: 'Schedule your next training session to see it here.',
              actionLabel: canWrite ? 'Schedule Session' : '',
              actionAttrs: canWrite ? 'data-action="schedule-session"' : '',
              compact: true,
            })}
    </section>

    <!-- Recent sessions table -->
    <section class="panel">
      <h3 class="panel-title">Recent Sessions</h3>
      ${past.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Session</th><th>Cohort</th><th>Date</th>
              <th>Mode</th><th>Attendance</th>
              <th>Recording</th><th>Evaluation</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${past.slice(0, 30).map(s => {
                const pct = safeNum(s.total_count)
                  ? Math.round((safeNum(s.present_count) / safeNum(s.total_count)) * 100)
                  : 0;
                return `<tr>
                  <td>${esc(s.title)}</td>
                  <td>${esc(s.cohort_name || '—')}</td>
                  <td>${fmtDT(s.scheduled_at)}</td>
                  <td><span class="chip chip-neutral">${esc((s.mode || '').replace(/_/g, ' '))}</span></td>
                  <td>
                    ${s.present_count} of ${s.total_count} (${pct}%)
                    ${renderMiniBar(pct, pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#dc2626')}
                  </td>
                  <td>${s.recording_url
                    ? `<a class="btn btn-secondary btn-xs" href="${esc(s.recording_url)}" target="_blank" rel="noopener">
                        <i class="fas fa-play"></i> Watch</a>`
                    : '<span class="text-muted">—</span>'}</td>
                  <td>${s.evaluations_submitted
                    ? `<span class="chip chip-green">${s.evaluations_submitted} in</span>`
                    : '<span class="text-muted">—</span>'}</td>
                  <td><span class="${statusClass(s.status)}">${esc(s.status)}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
                      View</button>
                    ${s.evaluation_open ? `
                      <button class="btn btn-secondary btn-xs" data-action="view-evaluations" data-id="${s.id}">
                        Evals</button>` : ''}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : renderEmptyState({
              icon: 'fa-chalkboard-user',
              title: 'No completed sessions yet',
              description: 'Completed and past sessions will appear here.',
              compact: true,
            })}
    </section>

    <!-- Materials with access control -->
    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 class="panel-title" style="margin:0">Training Materials</h3>
        ${materials.length ? `
          <span class="chip chip-neutral">${materials.length} file${materials.length === 1 ? '' : 's'}</span>` : ''}
      </div>
      ${materials.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Title</th><th>Scope</th><th>Uploaded By</th>
              <th>Date</th><th>Size</th><th>Access</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${materials.map(m => `
                <tr>
                  <td>${esc(m.title)}</td>
                  <td>${m.cohort_name
                    ? `<span class="chip chip-neutral">${esc(m.cohort_name)}</span>`
                    : '<span class="chip chip-neutral">All cohorts</span>'}</td>
                  <td>${esc(m.uploaded_by_name || '—')}</td>
                  <td>${fmtDate(m.created_at)}</td>
                  <td>${formatBytes(m.file_size)}</td>
                  <td>${m.restricted
                    ? `<span class="chip chip-yellow" title="${m.access_rule || 'Restricted'}">
                        <i class="fas fa-lock"></i> Restricted</span>`
                    : `<span class="chip chip-green"><i class="fas fa-unlock"></i> Open</span>`}</td>
                  <td class="actions-cell">
                    <a class="btn btn-secondary btn-xs" href="${esc(m.file_url)}" target="_blank" rel="noopener">
                      <i class="fas fa-download"></i></a>
                    ${canWrite ? `
                      <button class="btn btn-info btn-xs" data-action="edit-material-access" data-id="${m.id}"
                              title="Change access rules">
                        <i class="fas fa-shield-halved"></i></button>
                      <button class="btn btn-danger btn-xs" data-action="delete-material" data-id="${m.id}">
                        <i class="fas fa-trash"></i></button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No training materials uploaded yet</p>'}

      ${canWrite ? `
        <div class="form-inline" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <input id="matTitle" class="form-input" placeholder="Material title" style="flex:1;min-width:180px" />
          <select id="matCohort" class="form-select" style="flex:1;min-width:160px">
            <option value="">All cohorts</option>
            ${(S.cohorts || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
          </select>
          <input type="file" id="matFile" class="form-input" style="flex:1;min-width:180px" />
          <button class="btn btn-primary" data-action="upload-material">
            <i class="fas fa-upload"></i> Upload</button>
        </div>` : ''}
    </section>
  `;
}

/* ── Upcoming session row (rich) ──────────────────────────── */
function renderUpcomingSession(s, canWrite) {
  const modeLabel = (s.mode || '').replace(/_/g, ' ');
  const isLive = s.mode === 'online_live' || s.mode === 'hybrid' || s.mode === 'blended';

  return `
    <li class="list-row" style="flex-wrap:wrap">
      <div class="list-row-main">
        <span class="list-row-title">
          ${esc(s.title)}
          <span class="chip chip-neutral" style="margin-left:6px;font-size:.7rem">
            ${esc(modeLabel)}
          </span>
          ${s.qr_checkin_enabled ? `
            <span class="chip chip-blue" style="margin-left:4px;font-size:.7rem" title="QR attendance enabled">
              <i class="fas fa-qrcode"></i> QR
            </span>` : ''}
        </span>
        <span class="list-row-sub">
          ${esc(s.cohort_name || '')} · ${fmtDT(s.scheduled_at)} ·
          ${esc(s.instructor_name || 'Unassigned')} · ${s.duration_minutes} min
        </span>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${isLive && s.meeting_url ? `
          <a class="btn btn-primary btn-xs" href="${esc(s.meeting_url)}" target="_blank" rel="noopener">
            <i class="fas fa-video"></i> Join Live</a>` : ''}
        <a class="btn btn-secondary btn-xs" href="/api/institution/sessions/${s.id}/ics">
          <i class="fas fa-calendar-plus"></i> ICS</a>
        <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
          <i class="fas fa-clipboard-check"></i> Attendance</button>
        ${s.qr_checkin_enabled ? `
          <button class="btn btn-secondary btn-xs" data-action="show-session-qr" data-id="${s.id}"
                  title="Display QR for attendance">
            <i class="fas fa-qrcode"></i></button>` : ''}
        ${canWrite ? `
          <button class="btn btn-secondary btn-xs" data-action="edit-session" data-id="${s.id}"
                  title="Edit session">
            <i class="fas fa-pen"></i></button>
          <button class="btn btn-secondary btn-xs" data-action="reschedule-session" data-id="${s.id}"
                  title="Reschedule">
            <i class="fas fa-clock-rotate-left"></i></button>
          <button class="btn btn-danger btn-xs" data-action="delete-session" data-id="${s.id}"
                  title="Cancel session">
            <i class="fas fa-trash"></i></button>
        ` : ''}
      </div>
    </li>`;
}
