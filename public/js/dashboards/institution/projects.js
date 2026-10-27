/* ============================================================
   ExpertHub 2.0 — Capstone Projects
   Adds: milestones, supervisor assignment, team submissions,
   evidence uploads, assessment rubrics, peer evaluations,
   deadlines, portfolio publication.
   ============================================================ */

function instProjects() {
  const f = S.filters.projects = S.filters.projects || {};
  const statusFilter = f.status || '';
  const cohortFilter = f.cohort || '';

  let list = (S.projects || []).slice();
  if (statusFilter) list = list.filter(p => p.status === statusFilter);
  if (cohortFilter) list = list.filter(p => String(p.cohort_id) === String(cohortFilter));

  list = sortBy(list, p => p.deadline || '', 'asc');
  const { rows, total, currentPage, perPage } = paginateList(list, 'institutionProjects');

  const canWrite = hasInstitutionPermission('assessments:write');

  const all = S.projects || [];
  const published = all.filter(p => p.portfolio_published).length;
  const awaitingGrade = all.filter(p => safeNum(p.submissions_count) > safeNum(p.graded_count)).length;
  const overdue = all.filter(p =>
    p.deadline && new Date(p.deadline) < new Date() && p.status !== 'completed' && p.status !== 'archived'
  ).length;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Capstone Projects</span></div>
    <section class="page-header">
      <h1 class="page-title">Capstone Projects</h1>
      <div class="page-actions">
        <select id="projects-status" class="form-select" style="max-width:160px">
          <option value="">All statuses</option>
          ${['draft','active','in_review','completed','archived'].map(s =>
            `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${capitalize(s.replace(/_/g, ' '))}</option>`).join('')}
        </select>
        <select id="projects-cohort" class="form-select" style="max-width:200px">
          <option value="">All cohorts</option>
          ${(S.cohorts || []).map(c =>
            `<option value="${c.id}" ${String(cohortFilter) === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" data-action="export-projects">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="create-project">
            <i class="fas fa-plus"></i> New Project</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Total Projects', all.length, '', 'fa-briefcase', 'blue')}
      ${statCard('Awaiting Grading', awaitingGrade, '', 'fa-hourglass-half', 'yellow')}
      ${statCard('Overdue', overdue, '', 'fa-triangle-exclamation', overdue > 0 ? 'red' : 'green')}
      ${statCard('Portfolio Published', published, '', 'fa-globe', 'purple')}
    </section>

    <section class="card-grid">
      ${rows.map(p => renderProjectCard(p, canWrite)).join('') ||
        renderEmptyState({
          icon: 'fa-briefcase',
          title: 'No capstone projects match your filters',
          description: 'Create your first capstone project to get started.',
          actionLabel: canWrite ? '+ New Project' : '',
          actionAttrs: canWrite ? 'data-action="create-project"' : '',
        })}
    </section>

    ${rows.length ? paginationBar('institutionProjects', currentPage, perPage, total) : ''}
  `;
}

/* ── Single project card ──────────────────────────────────── */
function renderProjectCard(p, canWrite) {
  const subs = safeNum(p.submissions_count);
  const graded = safeNum(p.graded_count);
  const gradedPct = subs ? Math.round((graded / subs) * 100) : 0;

  const milestones = Array.isArray(p.milestones) ? p.milestones : [];
  const milestonesDone = milestones.filter(m => m.completed || m.status === 'completed').length;
  const milestonesPct = milestones.length ? Math.round((milestonesDone / milestones.length) * 100) : 0;

  const overdue = p.deadline && new Date(p.deadline) < new Date()
    && p.status !== 'completed' && p.status !== 'archived';

  const rubricCount = Array.isArray(p.rubrics) ? p.rubrics.length : safeNum(p.rubric_count);
  const teamCount = safeNum(p.team_count);
  const evidenceCount = safeNum(p.evidence_count);

  return `
    <article class="program-card">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center">
        <span class="chip chip-blue">${esc(p.category || 'Project')}</span>
        <span class="${statusClass(p.status)}">${esc((p.status || '').replace(/_/g, ' '))}</span>
        ${overdue ? `<span class="chip chip-red"><i class="fas fa-triangle-exclamation"></i> Overdue</span>` : ''}
        ${p.portfolio_published ? `<span class="chip chip-green"><i class="fas fa-globe"></i> Portfolio live</span>` : ''}
      </div>

      <h4 class="program-title">${esc(p.title || '')}</h4>
      <p class="program-desc">${esc(truncate(p.description || '', 130))}</p>

      ${p.cohort_name ? `
        <p class="program-meta"><i class="fas fa-layer-group"></i> ${esc(p.cohort_name)}</p>` : ''}
      ${p.supervisor_name ? `
        <p class="program-meta"><i class="fas fa-user-tie"></i> Supervisor: ${esc(p.supervisor_name)}</p>` : ''}
      ${teamCount ? `
        <p class="program-meta"><i class="fas fa-users"></i> ${teamCount} team${teamCount > 1 ? 's' : ''}</p>` : ''}
      ${rubricCount ? `
        <p class="program-meta"><i class="fas fa-table-list"></i> ${rubricCount} rubric${rubricCount > 1 ? 's' : ''}</p>` : ''}
      ${evidenceCount ? `
        <p class="program-meta"><i class="fas fa-paperclip"></i> ${evidenceCount} evidence file${evidenceCount > 1 ? 's' : ''}</p>` : ''}
      ${p.peer_evaluation_status ? `
        <p class="program-meta">
          <i class="fas fa-user-group"></i>
          Peer evaluation: <span class="${p.peer_evaluation_status === 'completed' ? 'status-active' : 'status-pending'}">
            ${esc(p.peer_evaluation_status)}
          </span>
        </p>` : ''}

      ${milestones.length ? `
        <div style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--text-muted)">
            <span>Milestones</span><span>${milestonesDone}/${milestones.length}</span>
          </div>
          <div class="progress-bar" style="margin-top:4px">
            <span style="width:${milestonesPct}%"></span>
          </div>
        </div>` : ''}

      <footer class="program-footer">
        <span class="program-meta">Deadline: ${fmtDate(p.deadline)}</span>
        <span class="program-meta">${graded}/${subs} graded</span>
      </footer>

      ${subs ? `
        <div class="progress-bar" style="margin-top:4px">
          <span style="width:${gradedPct}%"></span>
        </div>` : ''}

      <div class="panel-actions" style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" data-action="view-project" data-id="${p.id}">
          <i class="fas fa-eye"></i> View</button>
        ${canWrite ? `
          <button class="btn btn-info btn-sm" data-action="grade-project" data-id="${p.id}">
            <i class="fas fa-check"></i> Grade</button>
          <button class="btn btn-secondary btn-sm" data-action="manage-milestones" data-id="${p.id}"
                  title="Manage milestones"><i class="fas fa-flag"></i></button>
          <button class="btn btn-secondary btn-sm" data-action="manage-project-teams" data-id="${p.id}"
                  title="Manage teams"><i class="fas fa-users"></i></button>
          <button class="btn btn-secondary btn-sm" data-action="upload-project-evidence" data-id="${p.id}"
                  title="Upload evidence"><i class="fas fa-paperclip"></i></button>
          <button class="btn btn-secondary btn-sm" data-action="manage-project-rubrics" data-id="${p.id}"
                  title="Manage rubrics"><i class="fas fa-table-list"></i></button>
          <button class="btn btn-secondary btn-sm" data-action="peer-evaluations" data-id="${p.id}"
                  title="Peer evaluations"><i class="fas fa-user-group"></i></button>
          ${!p.portfolio_published ? `
            <button class="btn btn-secondary btn-sm" data-action="publish-portfolio" data-id="${p.id}"
                    title="Publish portfolio"><i class="fas fa-globe"></i></button>` : ''}
          <button class="btn btn-secondary btn-sm" data-action="edit-project" data-id="${p.id}"
                  title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn btn-danger btn-sm" data-action="delete-project" data-id="${p.id}"
                  title="Delete"><i class="fas fa-trash"></i></button>
        ` : ''}
      </div>
    </article>`;
}
