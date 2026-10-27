/* ============================================================
   Institution — Capstone Projects
   ============================================================ */
function instProjects() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Capstone Projects</span></div>
    <section class="page-header">
      <h1 class="page-title">Capstone Projects</h1>
      <button class="btn btn-primary" data-action="create-project">
        <i class="fas fa-plus"></i> New Project</button>
    </section>

    <section class="card-grid">
      ${S.projects.map(p => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(p.category || 'Project')}</span>
          <span class="${statusClass(p.status)}" style="margin-left:6px">${esc(p.status)}</span>
          <h4 class="program-title">${esc(p.title || '')}</h4>
          <p class="program-desc">${esc((p.description || '').slice(0, 130))}</p>
          <footer class="program-footer">
            <span class="program-meta">Deadline: ${fmtDate(p.deadline)}</span>
            <span class="program-meta">${p.submissions_count || 0} submissions</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-secondary btn-sm" data-action="view-project" data-id="${p.id}">View</button>
            <button class="btn btn-info btn-sm" data-action="grade-project" data-id="${p.id}">Grade</button>
          </div>
        </article>`).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-briefcase"></i>
          <h3>No projects yet</h3>
          <p>Create your first capstone project for a cohort.</p>
        </div>`}
    </section>
  `;
}
