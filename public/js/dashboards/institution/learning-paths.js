/* ============================================================
   ExpertHub 2.0 — Learning Path Builder
   Adds: visual builder, conditional progression, competency-based
   pathways, milestone assessments, elective modules, prerequisite
   enforcement, automated enrolment, progress tracking.
   ============================================================ */

function instLearningPaths() {
  const f = S.filters.learningPaths = S.filters.learningPaths || {};
  const q = (f.q || '').trim().toLowerCase();
  const activeOnly = f.activeOnly !== false;   // default true

  let paths = (S.institutionLearningPaths || []).slice();
  if (activeOnly) paths = paths.filter(p => p.active !== false);
  if (q) {
    paths = paths.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }
  paths = sortBy(paths, p => p.title || '', 'asc');
  const { rows, total, currentPage, perPage } = paginateList(paths, 'institutionLearningPaths');

  const canWrite = hasInstitutionPermission('programmes:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Learning Paths</span></div>
    <section class="page-header">
      <h1 class="page-title">Learning Path Builder</h1>
      <div class="page-actions">
        <input type="search" id="learning-paths-q" class="form-input"
               placeholder="Search paths..." value="${esc(f.q || '')}" style="max-width:220px" />
        <label class="checkbox-row" style="font-size:.85rem">
          <input type="checkbox" id="learning-paths-active" ${activeOnly ? 'checked' : ''} />
          Show only active
        </label>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="create-learning-path">
            <i class="fas fa-plus"></i> New Path</button>` : ''}
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        <strong>Learning paths sequence multiple programmes into a guided curriculum.</strong>
        Trainees advance step-by-step, unlocking milestones and certificates at completion.
        Use the visual builder to configure conditional progression, electives and automated enrolment.
      </div>
    </div>

    ${rows.length ? `
      <section class="card-grid">
        ${rows.map(lp => renderLearningPathCard(lp, canWrite)).join('')}
      </section>

      ${paginationBar('institutionLearningPaths', currentPage, perPage, total)}
    ` : renderEmptyState({
          icon: 'fa-route',
          title: activeOnly ? 'No active learning paths' : 'No learning paths yet',
          description: 'Bundle programmes into a guided curriculum with automatic unlocking and milestones.',
          actionLabel: canWrite ? '+ Create First Path' : '',
          actionAttrs: canWrite ? 'data-action="create-learning-path"' : '',
        })}
  `;
}

/* ── Single path card ─────────────────────────────────────── */
function renderLearningPathCard(lp, canWrite) {
  const steps = Array.isArray(lp.steps) ? lp.steps : [];
  const stepCount = safeNum(lp.step_count, steps.length);
  const electives = steps.filter(s => s.is_elective);
  const milestones = steps.filter(s => s.is_milestone);
  const hasPrereq = steps.some(s => s.requires_completion);
  const hasConditional = steps.some(s => s.condition);
  const completionPct = safeNum(lp.completion_rate);
  const enrolled = safeNum(lp.enrolled_count);
  const autoEnrol = !!lp.auto_enroll;

  const competencyFramework = lp.competency_framework_title || lp.competency_framework;

  return `
    <article class="program-card">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:6px">
        <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
          <span class="chip chip-blue">
            ${stepCount} step${stepCount === 1 ? '' : 's'}
          </span>
          ${milestones.length ? `<span class="chip chip-neutral" title="Milestone assessments">
            <i class="fas fa-flag-checkered"></i> ${milestones.length}</span>` : ''}
          ${electives.length ? `<span class="chip chip-neutral" title="Elective modules">
            <i class="fas fa-shuffle"></i> ${electives.length}</span>` : ''}
          ${hasConditional ? `<span class="chip chip-neutral" title="Conditional progression">
            <i class="fas fa-code-branch"></i></span>` : ''}
          ${hasPrereq ? `<span class="chip chip-neutral" title="Prerequisite enforcement">
            <i class="fas fa-lock"></i></span>` : ''}
        </div>
        <span class="${lp.active !== false ? 'status-active' : 'status-archived'}">
          ${lp.active !== false ? 'Active' : 'Inactive'}
        </span>
      </div>

      <h4 class="program-title">${esc(lp.title || 'Untitled path')}</h4>
      <p class="program-desc">${esc(truncate(lp.description || '', 140))}</p>

      ${competencyFramework ? `
        <p class="program-meta">
          <i class="fas fa-puzzle-piece"></i> Competency framework: ${esc(competencyFramework)}
        </p>` : ''}

      ${autoEnrol ? `
        <p class="program-meta" style="color:var(--accent)">
          <i class="fas fa-bolt"></i> Auto-enrolment enabled
        </p>` : ''}

      ${lp.badge_icon ? `
        <p class="program-meta">
          <i class="fas ${esc(lp.badge_icon)}"></i> Badge awarded at completion
        </p>` : ''}

      <footer class="program-footer">
        <span class="program-meta">${enrolled} enrolled</span>
        <span class="program-meta">${completionPct}% completion</span>
      </footer>

      ${enrolled ? `
        <div class="progress-bar" style="margin-top:6px">
          <span style="width:${completionPct}%"></span>
        </div>` : ''}

      <!-- Step preview (first 3) -->
      ${steps.length ? `
        <ul class="list-stack" style="margin-top:10px;font-size:.82rem">
          ${steps.slice(0, 3).map((s, i) => `
            <li class="list-row" style="padding:6px 0">
              <span class="chip chip-neutral">${i + 1}</span>
              <div class="list-row-main" style="margin-left:8px">
                <span class="list-row-title" style="font-size:.85rem">
                  ${esc(s.programme_title || s.title || 'Programme')}
                  ${s.is_milestone ? '<span class="chip chip-yellow" style="margin-left:4px;font-size:.65rem">Milestone</span>' : ''}
                  ${s.is_elective ? '<span class="chip chip-neutral" style="margin-left:4px;font-size:.65rem">Elective</span>' : ''}
                </span>
                ${s.condition ? `<span class="list-row-sub" style="font-size:.75rem">If: ${esc(s.condition)}</span>` : ''}
              </div>
            </li>`).join('')}
          ${steps.length > 3 ? `
            <li class="list-row" style="padding:4px 0">
              <span class="list-row-sub">+ ${steps.length - 3} more step${steps.length - 3 > 1 ? 's' : ''}…</span>
            </li>` : ''}
        </ul>` : ''}

      <div class="panel-actions" style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
        ${canWrite ? `
          <button class="btn btn-primary btn-sm" data-action="open-path-builder" data-id="${lp.id}">
            <i class="fas fa-sitemap"></i> Builder</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-action="view-learning-path" data-id="${lp.id}">
          <i class="fas fa-eye"></i> View</button>
        ${canWrite ? `
          <button class="btn btn-info btn-sm" data-action="edit-learning-path" data-id="${lp.id}">
            <i class="fas fa-pen"></i> Edit</button>
          <button class="btn btn-secondary btn-sm" data-action="duplicate-learning-path" data-id="${lp.id}"
                  title="Duplicate path">
            <i class="fas fa-copy"></i></button>
          <button class="btn btn-danger btn-sm" data-action="delete-learning-path" data-id="${lp.id}"
                  title="Delete path">
            <i class="fas fa-trash"></i></button>
        ` : ''}
      </div>
    </article>`;
}
