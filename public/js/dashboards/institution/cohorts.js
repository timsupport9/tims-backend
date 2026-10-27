/* ============================================================
   ExpertHub 2.0 — Cohort Lifecycle Management
   Adds: bulk trainee assignment, automated waitlist promotion,
   attendance monitoring, cohort transfers, timetable conflict
   detection, resource allocation, group messaging, completion
   /closure workflows.
   ============================================================ */

function instCohorts() {
  const f = S.filters.cohorts = S.filters.cohorts || {};
  const q = (f.q || '').trim().toLowerCase();
  const statusFilter = f.status || '';
  const programmeFilter = f.programme || '';
  const instructorFilter = f.instructor || '';

  let list = (S.cohorts || []).slice();
  if (q) {
    list = list.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.programme_title || '').toLowerCase().includes(q)
    );
  }
  if (statusFilter) list = list.filter(c => c.status === statusFilter);
  if (programmeFilter) list = list.filter(c => String(c.programme_id) === String(programmeFilter));
  if (instructorFilter) list = list.filter(c => String(c.instructor_id) === String(instructorFilter));

  list = sortBy(list, c => c.start_date || '', 'desc');
  const { rows, total, currentPage, perPage } = paginateList(list, 'institutionCohorts');

  /* ── Summary ───────────────────────────────────────────── */
  const totals = {
    active:   (S.cohorts || []).filter(c => c.status === 'active').length,
    waitlist: (S.cohorts || []).reduce((s, c) => s + safeNum(c.waitlist_count), 0),
    capacity: (S.cohorts || []).reduce((s, c) => s + safeNum(c.capacity), 0),
    enrolled: (S.cohorts || []).reduce((s, c) => s + safeNum(c.trainee_count), 0),
  };

  const canWrite = hasInstitutionPermission('cohorts:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Cohorts</span></div>
    <section class="page-header">
      <h1 class="page-title">Cohorts and Batches</h1>
      <div class="page-actions">
        <input type="search" id="cohorts-q" class="form-input"
               placeholder="Search cohorts..." value="${esc(f.q || '')}" style="max-width:220px" />
        <select id="cohorts-status" class="form-select" style="max-width:150px">
          <option value="">All statuses</option>
          ${CONFIG.COHORT_STATUSES.map(s =>
            `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${capitalize(s)}</option>`).join('')}
        </select>
        <select id="cohorts-programme" class="form-select" style="max-width:200px">
          <option value="">All programmes</option>
          ${(S.programmes || []).map(p =>
            `<option value="${p.id}" ${String(programmeFilter) === String(p.id) ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}
        </select>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="create-cohort">
            <i class="fas fa-plus"></i> New Cohort</button>` : ''}
      </div>
    </section>

    <!-- Summary cards -->
    <section class="stat-grid">
      ${statCard('Active Cohorts', totals.active, '', 'fa-layer-group', 'blue')}
      ${statCard('Total Enrolled', totals.enrolled, `of ${totals.capacity} seats`, 'fa-users', 'green')}
      ${statCard('On Waitlists', totals.waitlist, 'across all cohorts', 'fa-hourglass-half', 'yellow')}
      ${statCard('Capacity Utilisation', pctOf(totals.enrolled, totals.capacity || 1) + '%', '', 'fa-gauge', 'purple')}
    </section>

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 class="panel-title" style="margin:0">Cohorts</h3>
        ${canWrite ? `
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" data-action="bulk-assign-trainees">
              <i class="fas fa-user-plus"></i> Bulk Assign Trainees</button>
            <button class="btn btn-secondary btn-sm" data-action="auto-promote-waitlists">
              <i class="fas fa-arrow-up-from-bracket"></i> Auto-Promote Waitlists</button>
          </div>` : ''}
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th style="width:36px">
              <input type="checkbox" data-action="cohorts-select-all"
                     title="Select all" />
            </th>
            <th>Cohort</th>
            <th>Programme</th>
            <th>Instructor</th>
            <th>Dates</th>
            <th>Capacity</th>
            <th>Attendance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            ${rows.map(c => renderCohortRow(c, canWrite)).join('') ||
              '<tr><td colspan="9" class="empty-row">No cohorts created yet</td></tr>'}
          </tbody>
        </table>
      </div>

      ${paginationBar('institutionCohorts', currentPage, perPage, total)}
    </section>
  `;
}

/* ── Individual cohort row ────────────────────────────────── */
function renderCohortRow(c, canWrite) {
  const enrolled = safeNum(c.trainee_count);
  const capacity = safeNum(c.capacity);
  const waitlist = safeNum(c.waitlist_count);
  const utilPct  = capacity ? Math.min(100, (enrolled / capacity) * 100) : 0;
  const attendance = safeNum(c.attendance_rate);
  const conflicts = Array.isArray(c.conflicts) ? c.conflicts : [];
  const resourceCount = Array.isArray(c.resources) ? c.resources.length : safeNum(c.resource_count);

  return `
    <tr data-cohort-id="${c.id}">
      <td>
        ${canWrite ? `<input type="checkbox" class="cohort-select" value="${c.id}" />` : ''}
      </td>
      <td>
        <div class="user-name">${esc(c.name || '')}</div>
        ${c.location ? `<div class="user-email">${esc(c.location)}</div>` : ''}
        ${conflicts.length ? `
          <div style="margin-top:4px">
            <span class="chip chip-red" title="${esc(conflicts.map(x => x.message || 'Conflict').join('; '))}">
              <i class="fas fa-triangle-exclamation"></i> ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''}
            </span>
          </div>` : ''}
      </td>
      <td>${esc(c.programme_title || '—')}</td>
      <td>${esc(c.instructor_name || 'Unassigned')}</td>
      <td>${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}</td>
      <td>
        <div class="progress-bar" style="width:100px">
          <span style="width:${utilPct}%;background:${utilPct >= 95 ? '#dc2626' : utilPct >= 80 ? '#f59e0b' : 'var(--accent)'}"></span>
        </div>
        <small>${enrolled}/${capacity || '—'}</small>
        ${waitlist ? `<small style="color:var(--warning-dark);display:block">${waitlist} waitlisted</small>` : ''}
      </td>
      <td>
        ${attendance ? `${attendance}%` : '—'}
        ${resourceCount ? `
          <br><small style="color:var(--text-muted)">
            <i class="fas fa-chair"></i> ${resourceCount} resource${resourceCount > 1 ? 's' : ''}
          </small>` : ''}
      </td>
      <td><span class="${statusClass(c.status)}">${esc((c.status || '').replace(/_/g, ' '))}</span></td>
      <td class="actions-cell" style="white-space:nowrap">
        <button class="btn btn-secondary btn-xs" data-action="view-cohort" data-id="${c.id}">View</button>
        ${canWrite ? `
          <button class="btn btn-info btn-xs" data-action="edit-cohort" data-id="${c.id}">Edit</button>
          <button class="btn btn-primary btn-xs" data-action="cohort-waitlist" data-id="${c.id}" title="Manage waitlist">
            Waitlist${waitlist ? ` (${waitlist})` : ''}
          </button>
          <button class="btn btn-secondary btn-xs" data-action="cohort-transfer" data-id="${c.id}" title="Transfer trainees">
            <i class="fas fa-arrow-right-arrow-left"></i>
          </button>
          <button class="btn btn-secondary btn-xs" data-action="cohort-message" data-id="${c.id}" title="Group message">
            <i class="fas fa-envelope"></i>
          </button>
          <button class="btn btn-secondary btn-xs" data-action="cohort-attendance" data-id="${c.id}" title="Attendance monitoring">
            <i class="fas fa-clipboard-check"></i>
          </button>
          ${c.status === 'active' ? `
            <button class="btn btn-success btn-xs" data-action="complete-cohort" data-id="${c.id}" title="Complete / close">
              <i class="fas fa-check"></i>
            </button>` : ''}
          <button class="btn btn-danger btn-xs" data-action="delete-cohort" data-id="${c.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        ` : ''}
      </td>
    </tr>`;
}
