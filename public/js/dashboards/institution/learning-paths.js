/* ============================================================
   Institution — Learning Paths
   ============================================================ */
function instLearningPaths() {
  const paths = S.institutionLearningPaths || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Learning Paths</span></div>
    <section class="page-header">
      <h1 class="page-title">Learning Path Builder</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-learning-path">
          <i class="fas fa-plus"></i> New Path</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>Learning paths sequence multiple programmes into a guided curriculum.
        Trainees advance step by step, unlocking certificates at completion.</div>
    </div>

    ${paths.length ? `
      <section class="card-grid">
        ${paths.map(lp => `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
              <span class="chip chip-blue">${lp.step_count || 0} step${(lp.step_count || 0) === 1 ? '' : 's'}</span>
              <span class="${lp.active ? 'status-active' : 'status-archived'}">
                ${lp.active ? 'Active' : 'Inactive'}</span>
            </div>
            <h4 class="program-title">${esc(lp.title)}</h4>
            <p class="program-desc">${esc((lp.description || '').slice(0, 140))}</p>
            ${lp.badge_icon ? `<p class="program-meta"><i class="fas ${esc(lp.badge_icon)}"></i> Badge awarded at completion</p>` : ''}
            <footer class="program-footer">
              <span class="program-meta">${lp.enrolled_count || 0} enrolled</span>
              <span class="program-meta">${lp.completion_rate || 0}% completion</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" data-action="open-path-builder" data-id="${lp.id}">
                <i class="fas fa-sitemap"></i> Builder</button>
              <button class="btn btn-secondary btn-sm" data-action="edit-learning-path" data-id="${lp.id}">
                <i class="fas fa-pen"></i> Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete-learning-path" data-id="${lp.id}">
                <i class="fas fa-trash"></i></button>
            </div>
          </article>`).join('')}
      </section>` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-route"></i>
          <h3>No learning paths yet</h3>
          <p>Bundle programmes into a guided curriculum with automatic unlocking.</p>
          <button class="btn btn-primary" data-action="create-learning-path">
            <i class="fas fa-plus"></i> Create First Path</button>
        </div>
      </section>`}
  `;
}
