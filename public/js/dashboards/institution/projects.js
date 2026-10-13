/* ============================================================
   dashboards/institution/projects.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Capstone Projects' }])}
      ${EH.Layout.pageHeader('Capstone Projects', {
        actions: `<button class="btn btn-primary" data-action="create-project">
          <i class="fas fa-plus"></i> New Project</button>`,
      })}

      <section class="card-grid">
        ${(S.projects || []).map(p => `
          <article class="program-card">
            <span class="chip chip-blue">${EH.Fmt.esc(p.category || 'Project')}</span>
            <span class="${EH.Fmt.statusClass(p.status)}" style="margin-left:6px">${EH.Fmt.esc(p.status)}</span>
            <h4 class="program-title">${EH.Fmt.esc(p.title || '')}</h4>
            <p class="program-desc">${EH.Fmt.esc(EH.Fmt.truncate(p.description, 130))}</p>
            <footer class="program-footer">
              <span class="program-meta">Deadline: ${EH.Dates.fmtDate(p.deadline)}</span>
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
      </section>`;
  }

  EH.InstProjects = { render };
})(window);
