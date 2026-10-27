/* ============================================================
   Institution — Trainees
   ============================================================ */
function instTrainees() {
  const filterStatus  = ($('#trainee-status-filter') || {}).value || '';
  const searchQuery   = (($('#trainee-search') || {}).value || '').toLowerCase();
  const source = S.institutionEnrollments.length ? S.institutionEnrollments : S.trainees;

  let list = source.slice();
  if (filterStatus) list = list.filter(t => (t.status || t.lifecycle_status) === filterStatus);
  if (searchQuery) {
    list = list.filter(t =>
      (t.trainee_name || t.name || '').toLowerCase().includes(searchQuery) ||
      (t.email || '').toLowerCase().includes(searchQuery) ||
      (t.department || '').toLowerCase().includes(searchQuery));
  }

  const counts = {
    total: source.length,
    active: source.filter(t => ['active','approved'].includes(t.status || t.lifecycle_status)).length,
    pending: source.filter(t => (t.status || t.lifecycle_status) === 'pending_approval').length,
    completed: source.filter(t => ['completed','certified'].includes(t.status || t.lifecycle_status)).length,
  };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Trainees</span></div>
    <section class="page-header">
      <h1 class="page-title">Trainee Management</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="import-trainees-history">
          <i class="fas fa-history"></i> Import History</button>
        <button class="btn btn-primary" data-action="invite-trainee">
          <i class="fas fa-user-plus"></i> Import Trainees</button>
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Total Enrolled', counts.total, '', 'fa-users', 'blue')}
      ${statCard('Active', counts.active, '', 'fa-check', 'green')}
      ${statCard('Pending Approval', counts.pending, '', 'fa-clock', 'yellow')}
      ${statCard('Completed', counts.completed, '', 'fa-award', 'purple')}
    </section>

    <section class="panel">
      <div class="page-actions" style="margin-bottom:14px">
        <input type="search" id="trainee-search" class="form-input"
               placeholder="Search by name, email, or department"
               value="${esc(searchQuery)}" style="max-width:300px" />
        <select id="trainee-status-filter" class="form-select" style="max-width:200px">
          <option value="">All statuses</option>
          ${CONFIG.LIFECYCLE_STATUSES.map(s => `
            <option value="${s}" ${filterStatus === s ? 'selected' : ''}>${s.replace('_',' ')}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" data-action="export-trainees">
          <i class="fas fa-download"></i> Export</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Trainee</th><th>Department</th><th>Programme</th>
            <th>Progress</th><th>Lifecycle</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${list.map(t => {
              const traineeId = t.user_id || t.id;
              const name = t.trainee_name || t.name || '';
              const email = t.email || '';
              const status = t.status || t.lifecycle_status || 'active';
              const progress = t.progress || 0;
              return `<tr>
                <td>
                  <div class="user-cell">
                    <img class="user-avatar" src="${avatar({ name, email, avatar: t.avatar })}" alt="" />
                    <div>
                      <div class="user-name">
                        ${esc(name)}
                        ${t.at_risk ? '<span class="chip chip-red" style="margin-left:6px;font-size:.65rem">At Risk</span>' : ''}
                      </div>
                      <div class="user-email">${esc(email)}</div>
                    </div>
                  </div>
                </td>
                <td>${esc(t.department || '-')}</td>
                <td>${esc(t.programme_title || '-')}</td>
                <td>
                  <div class="progress-bar" style="width:80px"><span style="width:${progress}%"></span></div>
                  <small>${progress}%</small>
                </td>
                <td><span class="${statusClass(status)}">${esc(status.replace('_',' '))}</span></td>
                <td class="actions-cell">
                  ${status === 'pending_approval' ? `
                    <button class="btn btn-success btn-xs" data-action="approve-enrolment" data-id="${t.id}">Approve</button>
                    <button class="btn btn-danger btn-xs" data-action="reject-enrolment" data-id="${t.id}">Reject</button>` : ''}
                  <button class="btn btn-secondary btn-xs" data-action="trainee-detail" data-id="${traineeId}">View</button>
                  ${t.id ? `<button class="btn btn-info btn-xs" data-action="trainee-transfer" data-id="${t.id}">Transfer</button>` : ''}
                  <button class="btn btn-warning btn-xs" data-action="trainee-notes" data-id="${t.id || traineeId}">Notes</button>
                </td>
              </tr>`;
            }).join('') || '<tr><td colspan="6" class="empty-row">No trainees found</td></tr>'}
          </tbody>
        </table>
      </div>

      ${paginationBar('institutionTrainees', S.page.institutionTrainees || 1, 50,
        S.institutionTraineeTotal || list.length)}
    </section>
  `;
}
