/* ============================================================
   dashboards/institution/learning-paths.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const paths = S.institutionLearningPaths || [];

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Learning Paths' }])}
      ${EH.Layout.pageHeader('Learning Paths', {
        actions: `<button class="btn btn-primary" data-action="create-learning-path">
          <i class="fas fa-plus"></i> New Path</button>`,
      })}

      ${paths.length ? `
        <section class="card-grid">
          ${paths.map(lp => `
            <article class="program-card">
              <span class="chip chip-blue">
                ${lp.step_count || 0} step${(lp.step_count || 0) === 1 ? '' : 's'}
              </span>
              <h4 class="program-title">${EH.Fmt.esc(lp.title)}</h4>
              <p class="program-desc">${EH.Fmt.esc(EH.Fmt.truncate(lp.description, 130))}</p>
              <footer class="program-footer">
                <span class="status ${lp.active ? 'status-active' : 'status-archived'}">
                  ${lp.active ? 'Active' : 'Inactive'}
                </span>
              </footer>
              <div class="panel-actions" style="margin-top:10px">
                <button class="btn btn-secondary btn-sm" data-action="view-learning-path" data-id="${lp.id}">
                  <i class="fas fa-eye"></i> View</button>
                <button class="btn btn-info btn-sm" data-action="edit-learning-path" data-id="${lp.id}">
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
            <p>Bundle multiple programmes into a sequenced path with badges.</p>
            <button class="btn btn-primary" data-action="create-learning-path">
              <i class="fas fa-plus"></i> Create Path</button>
          </div>
        </section>`}`;
  }

  EH.InstLearningPaths = { render };
})(window);
