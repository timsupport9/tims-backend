/* ============================================================
   Institution — Cohorts
   ============================================================ */
function instCohorts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Cohorts</span></div>
    <section class="page-header">
      <h1 class="page-title">Cohorts and Batches</h1>
      <button class="btn btn-primary" data-action="create-cohort">
        <i class="fas fa-plus"></i> New Cohort</button>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Cohort</th><th>Programme</th><th>Instructor</th>
            <th>Dates</th><th>Capacity</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${S.cohorts.map(c => `
              <tr>
                <td>
                  <div class="user-name">${esc(c.name || '')}</div>
                  ${c.location ? `<div class="user-email">${esc(c.location)}</div>` : ''}
                </td>
                <td>${esc(c.programme_title || '-')}</td>
                <td>${esc(c.instructor_name || 'Unassigned')}</td>
                <td>${fmtDate(c.start_date)} to ${fmtDate(c.end_date)}</td>
                <td>
                  <div class="progress-bar" style="width:100px">
                    <span style="width:${c.capacity ? Math.min(100, (c.trainee_count / c.capacity) * 100) : 0}%"></span>
                  </div>
                  <small>${c.trainee_count || 0} of ${c.capacity || 0}</small>
                </td>
                <td><span class="${statusClass(c.status)}">${esc(c.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-cohort" data-id="${c.id}">View</button>
                  <button class="btn btn-info btn-xs" data-action="edit-cohort" data-id="${c.id}">Edit</button>
                  <button class="btn btn-primary btn-xs" data-action="cohort-waitlist" data-id="${c.id}">Waitlist</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-cohort" data-id="${c.id}">Delete</button>
                </td>
              </tr>`).join('') ||
              '<tr><td colspan="7" class="empty-row">No cohorts created yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
