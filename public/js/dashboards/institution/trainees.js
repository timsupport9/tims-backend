/* ============================================================
   ExpertHub 2.0 — Trainees
   Full profiles, enrolment history, IDP, bulk import validation,
   guardian/employer contacts, transfers, achievements,
   intervention records.
   ============================================================ */

function instTrainees() {
  const f = S.filters.trainees = S.filters.trainees || {};
  const filterStatus  = f.status || '';
  const searchQuery   = (f.q || '').trim().toLowerCase();
  const campusFilter  = f.campus || '';
  const departmentFilter = f.department || '';
  const riskFilter    = f.risk || '';   // at_risk | wellness | attendance

  const source = (S.institutionEnrollments && S.institutionEnrollments.length)
    ? S.institutionEnrollments
    : (S.trainees || []);

  let list = source.slice();

  if (filterStatus) {
    list = list.filter(t => (t.status || t.lifecycle_status) === filterStatus);
  }
  if (searchQuery) {
    list = list.filter(t =>
      (t.trainee_name || t.name || '').toLowerCase().includes(searchQuery) ||
      (t.email || '').toLowerCase().includes(searchQuery) ||
      (t.department || '').toLowerCase().includes(searchQuery) ||
      (t.employee_id || '').toLowerCase().includes(searchQuery)
    );
  }
  if (campusFilter) {
    list = list.filter(t => String(t.campus_id) === String(campusFilter));
  }
  if (departmentFilter) {
    list = list.filter(t => t.department === departmentFilter);
  }
  if (riskFilter === 'at_risk') {
    list = list.filter(t => t.at_risk);
  }
  if (riskFilter === 'wellness') {
    list = list.filter(t =>
      (S.wellnessAlerts || []).some(a => a.trainee_id === t.user_id || a.trainee_id === t.id)
    );
  }
  if (riskFilter === 'attendance') {
    list = list.filter(t => safeNum(t.attendance_rate) < 70);
  }

  list = sortBy(list, t => (t.trainee_name || t.name || ''), 'asc');
  const { rows, total, currentPage, perPage } = paginateList(list, 'institutionTrainees');

  /* ── Counts ───────────────────────────────────────────── */
  const counts = {
    total: source.length,
    active: source.filter(t => ['active','approved','enrolled'].includes(t.status || t.lifecycle_status)).length,
    pending: source.filter(t => (t.status || t.lifecycle_status) === 'pending_approval').length,
    completed: source.filter(t => ['completed','certified'].includes(t.status || t.lifecycle_status)).length,
    atRisk: source.filter(t => t.at_risk).length,
  };

  /* ── Departments for filter ───────────────────────────── */
  const departments = uniqueBy(
    source.map(t => t.department).filter(Boolean).map(d => ({ id: d, label: d })),
    'id'
  );

  const canWrite = hasInstitutionPermission('trainees:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Trainees</span></div>
    <section class="page-header">
      <h1 class="page-title">Trainee Management</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="import-trainees-history">
          <i class="fas fa-history"></i> Import History</button>
        ${canWrite ? `
          <button class="btn btn-secondary" data-action="validate-bulk-import">
            <i class="fas fa-file-csv"></i> Validate CSV</button>
          <button class="btn btn-primary" data-action="invite-trainee">
            <i class="fas fa-user-plus"></i> Import Trainees</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Total Enrolled', counts.total, '', 'fa-users', 'blue')}
      ${statCard('Active', counts.active, '', 'fa-check', 'green')}
      ${statCard('Pending Approval', counts.pending, '', 'fa-clock', 'yellow')}
      ${statCard('At Risk', counts.atRisk, '', 'fa-triangle-exclamation', counts.atRisk > 0 ? 'red' : 'green')}
    </section>

    <!-- Filters -->
    <section class="panel">
      <div class="page-actions" style="margin-bottom:14px;flex-wrap:wrap">
        <input type="search" id="trainee-search" class="form-input"
               placeholder="Search by name, email, department or employee ID"
               value="${esc(f.q || '')}" style="max-width:320px" />
        <select id="trainee-status-filter" class="form-select" style="max-width:180px">
          <option value="">All statuses</option>
          ${CONFIG.LIFECYCLE_STATUSES.map(s =>
            `<option value="${s}" ${filterStatus === s ? 'selected' : ''}>${capitalize(s.replace(/_/g, ' '))}</option>`).join('')}
        </select>
        ${(S.campuses || []).length ? `
          <select id="trainee-campus-filter" class="form-select" style="max-width:180px">
            <option value="">All campuses</option>
            ${S.campuses.map(c =>
              `<option value="${c.id}" ${String(campusFilter) === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>` : ''}
        ${departments.length ? `
          <select id="trainee-dept-filter" class="form-select" style="max-width:180px">
            <option value="">All departments</option>
            ${departments.map(d =>
              `<option value="${d.id}" ${departmentFilter === d.id ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
          </select>` : ''}
        <select id="trainee-risk-filter" class="form-select" style="max-width:180px">
          <option value="">Any risk level</option>
          <option value="at_risk" ${riskFilter === 'at_risk' ? 'selected' : ''}>At risk</option>
          <option value="wellness" ${riskFilter === 'wellness' ? 'selected' : ''}>Wellness alert</option>
          <option value="attendance" ${riskFilter === 'attendance' ? 'selected' : ''}>Attendance &lt; 70%</option>
        </select>
        <button class="btn btn-secondary" data-action="export-trainees">
          <i class="fas fa-download"></i> Export</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Trainee</th>
            <th>Department</th>
            <th>Programme</th>
            <th>Progress</th>
            <th>Attendance</th>
            <th>IDP</th>
            <th>Lifecycle</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            ${rows.map(t => renderTraineeRow(t, canWrite)).join('') ||
              '<tr><td colspan="8" class="empty-row">No trainees match your filters</td></tr>'}
          </tbody>
        </table>
      </div>

      ${paginationBar('institutionTrainees', currentPage, perPage, total)}
    </section>
  `;
}

/* ── Row renderer ─────────────────────────────────────────── */
function renderTraineeRow(t, canWrite) {
  const traineeId = t.user_id || t.id;
  const name  = t.trainee_name || t.name || '';
  const email = t.email || '';
  const status = t.status || t.lifecycle_status || 'active';
  const progress = safeNum(t.progress);
  const attendance = safeNum(t.attendance_rate);
  const hasIdp = !!(t.idp_id || (t.idp && t.idp.id));
  const idpStatus = t.idp_status || (hasIdp ? (t.idp?.status || 'active') : null);
  const enrollmentId = t.enrollment_id || t.id;   // for approve/reject actions

  const progressBar = `
    <div class="progress-bar" style="width:80px">
      <span style="width:${progress}%"></span>
    </div>
    <small>${progress}%</small>`;

  return `
    <tr>
      <td>
        <div class="user-cell">
          <img class="user-avatar" src="${avatar({ name, email, avatar: t.avatar })}" alt="" />
          <div>
            <div class="user-name">
              ${esc(name)}
              ${t.at_risk ? '<span class="chip chip-red" style="margin-left:6px;font-size:.65rem">At Risk</span>' : ''}
              ${t.guardian_name ? '<span class="chip chip-neutral" style="margin-left:4px;font-size:.65rem" title="Guardian contact on file"><i class="fas fa-user-shield"></i></span>' : ''}
              ${t.employer_name ? '<span class="chip chip-neutral" style="margin-left:4px;font-size:.65rem" title="Employer linked"><i class="fas fa-briefcase"></i></span>' : ''}
            </div>
            <div class="user-email">${esc(email)}</div>
          </div>
        </div>
      </td>
      <td>${esc(t.department || '—')}</td>
      <td>${esc(t.programme_title || '—')}</td>
      <td>${progressBar}</td>
      <td>${attendance ? `${attendance}%` : '—'}</td>
      <td>${hasIdp
        ? `<span class="chip chip-${idpStatus === 'completed' ? 'green' : idpStatus === 'overdue' ? 'red' : 'blue'}"
                 data-action="open-idp" data-id="${esc(traineeId)}"
                 style="cursor:pointer" title="Open Individual Development Plan">
            <i class="fas fa-bullseye"></i> ${esc(capitalize(idpStatus || 'active'))}
          </span>`
        : (canWrite
            ? `<button class="btn btn-secondary btn-xs" data-action="create-idp" data-id="${esc(traineeId)}">
                Create IDP</button>`
            : '<span class="text-muted">—</span>')}</td>
      <td><span class="${statusClass(status)}">${esc(capitalize(status.replace(/_/g, ' ')))}</span></td>
      <td class="actions-cell" style="white-space:nowrap">
        ${status === 'pending_approval' && canWrite ? `
          <button class="btn btn-success btn-xs" data-action="approve-enrolment" data-id="${enrollmentId}">Approve</button>
          <button class="btn btn-danger btn-xs" data-action="reject-enrolment" data-id="${enrollmentId}">Reject</button>
        ` : ''}
        <button class="btn btn-secondary btn-xs" data-action="trainee-detail" data-id="${traineeId}">View</button>
        <button class="btn btn-secondary btn-xs" data-action="trainee-achievements" data-id="${traineeId}"
                title="Achievements"><i class="fas fa-trophy"></i></button>
        ${canWrite ? `
          <button class="btn btn-info btn-xs" data-action="trainee-transfer" data-id="${traineeId}"
                  title="Transfer">Transfer</button>
          <button class="btn btn-warning btn-xs" data-action="trainee-notes" data-id="${traineeId}"
                  title="Intervention notes">Notes</button>
          <button class="btn btn-secondary btn-xs" data-action="trainee-history" data-id="${traineeId}"
                  title="Enrolment history"><i class="fas fa-clock-rotate-left"></i></button>
          <button class="btn btn-secondary btn-xs" data-action="trainee-contacts" data-id="${traineeId}"
                  title="Guardian / employer contacts"><i class="fas fa-address-book"></i></button>
        ` : ''}
      </td>
    </tr>`;
}
