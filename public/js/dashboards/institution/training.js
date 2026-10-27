/* ============================================================
   Institution — Training Delivery
   ============================================================ */
function instTraining() {
  const sessions = S.institutionSessions || [];
  const upcoming = sessions.filter(s => new Date(s.scheduled_at) > new Date() && s.status === 'scheduled');
  const past     = sessions.filter(s => new Date(s.scheduled_at) <= new Date() && s.status !== 'cancelled');

  let avgAttendance = 0;
  if (past.length) {
    const sum = past.reduce((acc, s) => {
      const total = Number(s.total_count) || 0;
      return acc + (total ? (Number(s.present_count) / total) * 100 : 0);
    }, 0);
    avgAttendance = Math.round(sum / past.length);
  }

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Training Delivery</span></div>
    <section class="page-header">
      <h1 class="page-title">Training Delivery</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="view-calendar">
          <i class="fas fa-calendar"></i> Calendar View</button>
        <button class="btn btn-primary" data-action="schedule-session">
          <i class="fas fa-calendar-plus"></i> Schedule Session</button>
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Upcoming', upcoming.length, '', 'fa-clock', 'blue')}
      ${statCard('Completed', past.filter(s => s.status === 'completed').length, '', 'fa-check', 'green')}
      ${statCard('Avg. Attendance', avgAttendance + '%', '', 'fa-user-check', 'purple')}
      ${statCard('Total Sessions', sessions.length, '', 'fa-chalkboard-user', 'yellow')}
    </section>

    <section class="panel">
      <h3 class="panel-title">Upcoming Sessions</h3>
      <ul class="list-stack">
        ${upcoming.map(s => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(s.title)}</span>
              <span class="list-row-sub">
                ${esc(s.cohort_name || '')} - ${fmtDT(s.scheduled_at)} -
                ${esc(s.instructor_name || 'Unassigned')} - ${s.duration_minutes} min
              </span>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              <span class="chip chip-neutral">${esc((s.mode || '').replace('_', ' '))}</span>
              ${s.meeting_url ? `<a class="btn btn-primary btn-xs" href="${esc(s.meeting_url)}" target="_blank" rel="noopener">
                <i class="fas fa-video"></i> Join</a>` : ''}
              <a class="btn btn-secondary btn-xs" href="/api/institution/sessions/${s.id}/ics">
                <i class="fas fa-calendar-plus"></i> ICS</a>
              <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
                <i class="fas fa-clipboard-check"></i> Attendance</button>
              <button class="btn btn-secondary btn-xs" data-action="edit-session" data-id="${s.id}">
                <i class="fas fa-pen"></i></button>
              <button class="btn btn-danger btn-xs" data-action="delete-session" data-id="${s.id}">
                <i class="fas fa-trash"></i></button>
            </div>
          </li>`).join('') || '<li class="empty-row">No upcoming sessions scheduled</li>'}
      </ul>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Sessions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Session</th><th>Cohort</th><th>Date</th>
            <th>Attendance</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${past.slice(0, 20).map(s => {
              const pct = Number(s.total_count)
                ? Math.round((Number(s.present_count) / Number(s.total_count)) * 100)
                : 0;
              return `<tr>
                <td>${esc(s.title)}</td>
                <td>${esc(s.cohort_name || '-')}</td>
                <td>${fmtDT(s.scheduled_at)}</td>
                <td>${s.present_count} of ${s.total_count} (${pct}%)</td>
                <td><span class="${statusClass(s.status)}">${esc(s.status)}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
                    View Attendance</button>
                </td>
              </tr>`;
            }).join('') || '<tr><td colspan="6" class="empty-row">No sessions recorded</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Training Materials</h3>
      ${S.institutionMaterials.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Title</th><th>Uploaded By</th><th>Date</th><th>Size</th><th>Actions</th></tr></thead>
            <tbody>
              ${S.institutionMaterials.map(m => `
                <tr>
                  <td>${esc(m.title)}</td>
                  <td>${esc(m.uploaded_by_name || '-')}</td>
                  <td>${fmtDate(m.created_at)}</td>
                  <td>${formatBytes(m.file_size)}</td>
                  <td class="actions-cell">
                    <a class="btn btn-secondary btn-xs" href="${esc(m.file_url)}" target="_blank" rel="noopener">
                      <i class="fas fa-download"></i> Download</a>
                    <button class="btn btn-danger btn-xs" data-action="delete-material" data-id="${m.id}">
                      <i class="fas fa-trash"></i></button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}

      <div class="form-inline" style="margin-top:14px">
        <input id="matTitle" class="form-input" placeholder="Material title" />
        <select id="matCohort" class="form-select">
          <option value="">Any cohort</option>
          ${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
        </select>
        <input type="file" id="matFile" class="form-input" />
        <button class="btn btn-primary" data-action="upload-material">
          <i class="fas fa-upload"></i> Upload</button>
      </div>
    </section>
  `;
}
