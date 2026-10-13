/* ============================================================
   dashboards/institution/programmes.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Programmes' }])}
      ${EH.Layout.pageHeader('Training Programmes', {
        actions: `<button class="btn btn-primary" data-action="create-programme">
          <i class="fas fa-plus"></i> New Programme</button>`,
      })}

      <section class="card-grid">
        ${S.programmes.map(p => `
          <article class="program-card">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
              <span class="chip chip-blue">${EH.Fmt.esc(p.category || 'General')}</span>
              <span class="${EH.Fmt.statusClass(p.status)}">${EH.Fmt.esc(p.status)}</span>
            </div>
            <h4 class="program-title">${EH.Fmt.esc(p.title || '')}</h4>
            <p class="program-desc">${EH.Fmt.esc(EH.Fmt.truncate(p.description, 130))}</p>
            ${p.prerequisite_title ? `
              <p class="program-meta" style="color:var(--warning-dark)">
                <i class="fas fa-lock"></i> Requires: ${EH.Fmt.esc(p.prerequisite_title)}
              </p>` : ''}
            <footer class="program-footer">
              <span class="program-meta">
                ${EH.Dates.fmtDate(p.start_date)} to ${EH.Dates.fmtDate(p.end_date)}
              </span>
              <span class="program-meta">${p.enrolled_count || 0} of ${p.capacity || 0} enrolled</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" data-action="view-programme" data-id="${p.id}">
                <i class="fas fa-eye"></i> View</button>
              <button class="btn btn-info btn-sm" data-action="edit-programme" data-id="${p.id}">
                <i class="fas fa-pen"></i> Edit</button>
              <button class="btn btn-primary btn-sm" data-action="programme-curriculum" data-id="${p.id}">
                <i class="fas fa-list"></i> Curriculum</button>
              <button class="btn btn-danger btn-sm" data-action="delete-programme" data-id="${p.id}">
                <i class="fas fa-trash"></i></button>
            </div>
          </article>`).join('') || `
            <div class="empty-state" style="grid-column:1/-1">
              <i class="fas fa-diagram-project"></i>
              <h3>No programmes yet</h3>
              <p>Create your first training programme to get started.</p>
              <button class="btn btn-primary" data-action="create-programme">
                <i class="fas fa-plus"></i> Create Programme</button>
            </div>`}
      </section>`;
  }

  EH.InstProgrammes = { render };
})(window);
