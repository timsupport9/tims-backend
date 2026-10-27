/* ============================================================
   Institution — Proctored Exams
   ============================================================ */
function instProctorSessions() {
  const sessions = S.examProctorSessions || [];
  const flags    = S.examProctorFlags || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Proctored Exams</span></div>
    <section class="page-header">
      <h1 class="page-title">Proctored Exam Sessions</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="schedule-proctor-session">
          <i class="fas fa-plus"></i> Schedule Proctored Exam</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-shield-halved"></i>
      <div>Proctored exams use webcam monitoring, browser lockdown and AI flagging to ensure integrity.
        Recordings are retained for 90 days unless a dispute is raised.</div>
    </div>

    <section class="stat-grid">
      ${statCard('Total Sessions', sessions.length, '', 'fa-shield-halved', 'blue')}
      ${statCard('Completed', sessions.filter(s => s.status === 'completed').length, '', 'fa-check', 'green')}
      ${statCard('Flagged', sessions.filter(s => s.integrity_score != null && s.integrity_score < 70).length, '', 'fa-flag', 'red')}
      ${statCard('Live Now', sessions.filter(s => s.status === 'in_progress').length, '', 'fa-video', 'yellow')}
    </section>

    <section class="panel">
      <h3 class="panel-title">All Sessions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Exam</th><th>Trainee</th><th>Scheduled</th>
            <th>Mode</th><th>Integrity</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${sessions.map(s => {
              const score = s.integrity_score;
              const scoreClass = score == null ? '' :
                score >= 90 ? 'status-active' :
                score >= 70 ? 'status-pending' : 'status-rejected';
              return `<tr>
                <td>${esc(s.exam_title || '-')}</td>
                <td>${esc(s.trainee_name || '-')}</td>
                <td>${fmtDT(s.scheduled_at)}</td>
                <td><span class="chip chip-neutral">${esc(s.proctor_mode || 'webcam')}</span></td>
                <td>${score != null
                  ? `<span class="${scoreClass}">${examIntegrityLabel(score)} (${score})</span>`
                  : '—'}</td>
                <td><span class="${statusClass(s.status)}">${esc(s.status)}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-info btn-xs" data-action="view-proctor-session" data-id="${s.id}">
                    View</button>
                  ${s.status === 'completed' && score != null && score < 70 ? `
                    <button class="btn btn-danger btn-xs" data-action="invalidate-exam" data-id="${s.id}">
                      Invalidate</button>` : ''}
                </td>
              </tr>`;
            }).join('') ||
            '<tr><td colspan="7" class="empty-row">No proctored sessions yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    ${flags.length ? `
      <section class="panel">
        <h3 class="panel-title">Integrity Flags</h3>
        <ul class="list-stack">
          ${flags.map(f => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(f.trainee_name || '-')} — ${esc(f.flag_type)}</span>
                <span class="list-row-sub">${fmtDT(f.flagged_at)} · ${esc(f.description || '')}</span>
              </div>
              <button class="btn btn-secondary btn-xs" data-action="review-flag" data-id="${f.id}">
                Review</button>
            </li>`).join('')}
        </ul>
      </section>` : ''}
  `;
}
