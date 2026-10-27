/* ============================================================
   Institution — Assessments
   ============================================================ */
function instAssessments() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Assessments</span></div>
    <section class="page-header">
      <h1 class="page-title">Assessments</h1>
      <button class="btn btn-primary" data-action="schedule-assessment">
        <i class="fas fa-plus"></i> New Assessment</button>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Title</th><th>Type</th><th>Cohort</th><th>Weight</th>
            <th>Due</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${S.assessments.map(a => `
              <tr>
                <td>${esc(a.title || '')}</td>
                <td><span class="chip chip-neutral">${esc(a.type || '')}</span></td>
                <td>${esc(a.cohort_name || '-')}</td>
                <td>${a.weight || 0}%</td>
                <td>${fmtDate(a.due_date)}</td>
                <td><span class="${statusClass(a.status)}">${esc(a.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-assessment" data-id="${a.id}">View</button>
                  <button class="btn btn-info btn-xs" data-action="grade-assessment" data-id="${a.id}">Grade</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-assessment" data-id="${a.id}">Delete</button>
                </td>
              </tr>`).join('') ||
              '<tr><td colspan="7" class="empty-row">No assessments yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
