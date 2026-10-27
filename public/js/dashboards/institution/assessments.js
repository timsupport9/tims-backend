/* ============================================================
   ExpertHub 2.0 — Institution Assessments
   Adds: rubrics, submissions, marking workflows, moderation,
   resits, grading scales, appeals, automated results publication.
   ============================================================ */

function instAssessments() {
  const f = S.filters.assessments = S.filters.assessments || {};
  const q            = (f.q || '').trim().toLowerCase();
  const statusFilter = f.status || '';
  const typeFilter   = f.type || '';
  const cohortFilter = f.cohort || '';
  const tab          = f.tab || 'all';   // all | pending_grading | moderated | published | appeals

  /* ── Source ─────────────────────────────────────────────── */
  let list = (S.assessments || []).slice();
  if (tab === 'pending_grading') {
    list = list.filter(a => safeNum(a.submissions_count) > safeNum(a.graded_count));
  }
  if (tab === 'moderated') {
    list = list.filter(a => a.moderation_status === 'moderated');
  }
  if (tab === 'published') {
    list = list.filter(a => a.publish_status === 'published');
  }
  if (tab === 'appeals') {
    list = list.filter(a => safeNum(a.appeals_count) > 0);
  }
  if (q) {
    list = list.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.cohort_name || '').toLowerCase().includes(q)
    );
  }
  if (statusFilter) list = list.filter(a => a.status === statusFilter);
  if (typeFilter) list = list.filter(a => a.type === typeFilter);
  if (cohortFilter) list = list.filter(a => String(a.cohort_id) === String(cohortFilter));

  list = sortBy(list, a => a.due_date || '', 'desc');
  const { rows, total, currentPage, perPage } = paginateList(list, 'institutionAssessments');

  /* ── Summary counts ────────────────────────────────────── */
  const all = S.assessments || [];
  const awaitingGrading = all.reduce(
    (s, a) => s + Math.max(0, safeNum(a.submissions_count) - safeNum(a.graded_count)), 0
  );
  const pendingModeration = all.filter(a =>
    a.moderation_status === 'pending' || a.moderation_status === 'in_review'
  ).length;
  const appealCount = all.reduce((s, a) => s + safeNum(a.appeals_count), 0);
  const publishedCount = all.filter(a => a.publish_status === 'published').length;

  const canWrite = hasInstitutionPermission('assessments:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Assessments</span></div>
    <section class="page-header">
      <h1 class="page-title">Assessments</h1>
      <div class="page-actions">
        <input type="search" id="assessments-q" class="form-input"
               placeholder="Search assessments..." value="${esc(f.q || '')}" style="max-width:200px" />
        <select id="assessments-type" class="form-select" style="max-width:160px">
          <option value="">All types</option>
          ${CONFIG.ASSESSMENT_TYPES.map(t =>
            `<option value="${t}" ${typeFilter === t ? 'selected' : ''}>${capitalize(t)}</option>`).join('')}
        </select>
        <select id="assessments-cohort" class="form-select" style="max-width:200px">
          <option value="">All cohorts</option>
          ${(S.cohorts || []).map(c =>
            `<option value="${c.id}" ${String(cohortFilter) === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" data-action="export-assessments">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="schedule-assessment">
            <i class="fas fa-plus"></i> New Assessment</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Total Assessments', all.length, '', 'fa-clipboard-check', 'blue')}
      ${statCard('Awaiting Grading', awaitingGrading, '', 'fa-hourglass-half', 'yellow')}
      ${statCard('Pending Moderation', pendingModeration, '', 'fa-scale-balanced', 'purple')}
      ${statCard('Open Appeals', appealCount, '', 'fa-gavel', appealCount > 0 ? 'red' : 'green')}
    </section>

    <!-- Tabs -->
    <section class="panel" style="padding:0;border:none;background:transparent">
      <nav style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:16px;flex-wrap:wrap">
        ${[
          ['all',              'All',              'fa-list'],
          ['pending_grading',  'To Grade',         'fa-pen-to-square'],
          ['moderated',        'Moderated',        'fa-check-double'],
          ['published',        'Published',        'fa-paper-plane'],
          ['appeals',          'Appeals',          'fa-gavel'],
        ].map(([key, label, icon]) => `
          <button class="tab-btn" data-action="assessments-set-tab" data-tab="${key}"
                  style="padding:8px 14px;background:none;border:none;border-bottom:2px solid ${tab === key ? 'var(--brand)' : 'transparent'};cursor:pointer;font-weight:${tab === key ? 600 : 400};color:${tab === key ? 'var(--brand)' : 'var(--text-soft)'}">
            <i class="fas ${icon}"></i> ${label}
          </button>
        `).join('')}
      </nav>
    </section>

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 class="panel-title" style="margin:0">Assessment Register</h3>
        ${canWrite ? `
          <button class="btn btn-secondary btn-sm" data-action="bulk-publish-results">
            <i class="fas fa-paper-plane"></i> Bulk Publish Results</button>` : ''}
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Title</th><th>Type</th><th>Cohort</th>
            <th>Weight</th><th>Due</th>
            <th>Submissions</th><th>Grading Scale</th>
            <th>Moderation</th><th>Publication</th>
            <th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${rows.map(a => renderAssessmentRow(a, canWrite)).join('') ||
              '<tr><td colspan="11" class="empty-row">No assessments match your filters</td></tr>'}
          </tbody>
        </table>
      </div>

      ${paginationBar('institutionAssessments', currentPage, perPage, total)}
    </section>
  `;
}

/* ── Row renderer ─────────────────────────────────────────── */
function renderAssessmentRow(a, canWrite) {
  const subs   = safeNum(a.submissions_count);
  const graded = safeNum(a.graded_count);
  const gradedPct = subs ? Math.round((graded / subs) * 100) : 0;
  const hasAppeals = safeNum(a.appeals_count) > 0;
  const hasResits  = safeNum(a.resits_count) > 0;
  const canPublish = subs > 0 && graded >= subs && a.publish_status !== 'published';

  const scale = CONFIG.GRADING_POLICIES[a.grading_scale];
  const scaleLabel = scale ? scale.label : '—';

  const moderationLabel = {
    pending:   'Pending',
    in_review: 'In review',
    moderated: 'Moderated',
    rejected:  'Rejected',
  }[a.moderation_status] || '—';

  const moderationClass = {
    pending:   'status-pending',
    in_review: 'status-pending',
    moderated: 'status-active',
    rejected:  'status-rejected',
  }[a.moderation_status] || '';

  const publishClass = a.publish_status === 'published' ? 'status-active'
    : a.publish_status === 'scheduled' ? 'status-pending'
    : 'status-archived';
  const publishLabel = a.publish_status === 'published' ? 'Published'
    : a.publish_status === 'scheduled' ? 'Scheduled'
    : 'Unpublished';

  return `
    <tr>
      <td>
        <div class="user-name">${esc(a.title || '')}</div>
        ${hasResits ? `<div class="chip chip-neutral" style="font-size:.65rem;margin-top:2px">${safeNum(a.resits_count)} resit${safeNum(a.resits_count) > 1 ? 's' : ''}</div>` : ''}
      </td>
      <td><span class="chip chip-neutral">${esc(a.type || '')}</span></td>
      <td>${esc(a.cohort_name || '—')}</td>
      <td>${a.weight || 0}%</td>
      <td>${fmtDate(a.due_date)}</td>
      <td>
        <div>${graded} / ${subs} graded</div>
        <div class="progress-bar" style="width:80px;margin-top:2px">
          <span style="width:${gradedPct}%"></span>
        </div>
      </td>
      <td><span class="chip chip-neutral" title="${esc(scaleLabel)}">${esc(truncate(scaleLabel, 18))}</span></td>
      <td>${a.moderation_status
        ? `<span class="${moderationClass}">${esc(moderationLabel)}</span>`
        : '<span class="text-muted">—</span>'}</td>
      <td><span class="${publishClass}">${esc(publishLabel)}</span></td>
      <td><span class="${statusClass(a.status)}">${esc((a.status || '').replace(/_/g, ' '))}</span></td>
      <td class="actions-cell" style="white-space:nowrap">
        <button class="btn btn-secondary btn-xs" data-action="view-assessment" data-id="${a.id}"
                title="View">View</button>
        ${canWrite ? `
          <button class="btn btn-info btn-xs" data-action="grade-assessment" data-id="${a.id}"
                  title="Grade submissions">Grade</button>
          <button class="btn btn-secondary btn-xs" data-action="manage-rubrics" data-id="${a.id}"
                  title="Manage rubrics"><i class="fas fa-table-list"></i></button>
          <button class="btn btn-secondary btn-xs" data-action="moderate-assessment" data-id="${a.id}"
                  title="Moderate"><i class="fas fa-scale-balanced"></i></button>
          ${canPublish ? `
            <button class="btn btn-success btn-xs" data-action="publish-results" data-id="${a.id}"
                    title="Publish results"><i class="fas fa-paper-plane"></i></button>` : ''}
          ${hasResits ? `
            <button class="btn btn-warning btn-xs" data-action="create-resit" data-id="${a.id}"
                    title="Manage resits">Resit</button>` : ''}
          ${hasAppeals ? `
            <button class="btn btn-danger btn-xs" data-action="view-appeals" data-id="${a.id}"
                    title="View appeals">Appeals</button>` : ''}
          <button class="btn btn-secondary btn-xs" data-action="edit-assessment" data-id="${a.id}"
                  title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn btn-danger btn-xs" data-action="delete-assessment" data-id="${a.id}"
                  title="Delete"><i class="fas fa-trash"></i></button>
        ` : ''}
      </td>
    </tr>`;
}
