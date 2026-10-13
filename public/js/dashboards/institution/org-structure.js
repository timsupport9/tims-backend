/* ============================================================
   dashboards/institution/org-structure.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const units = S.institutionOrgUnits || [];
    const rows = units.map(u => `
      <tr>
        <td>${EH.Fmt.esc(u.name)}</td>
        <td><span class="chip chip-neutral">${EH.Fmt.esc((u.unit_type || '').replace('_',' '))}</span></td>
        <td>${EH.Fmt.esc(u.code || '-')}</td>
        <td>${EH.Fmt.esc(u.manager_name || '-')}</td>
        <td>${EH.Fmt.cur(u.budget_amount || 0)}</td>
        <td>${u.active
          ? '<span class="status-active">Active</span>'
          : '<span class="status-archived">Inactive</span>'}</td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-xs" data-action="edit-org-unit" data-id="${u.id}">Edit</button>
          <button class="btn btn-danger btn-xs" data-action="delete-org-unit" data-id="${u.id}">Delete</button>
        </td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Org Structure' }])}
      ${EH.Layout.pageHeader('Organisational Structure', {
        actions: `<button class="btn btn-primary" data-action="create-org-unit">
          <i class="fas fa-plus"></i> New Unit</button>`,
      })}

      <section class="panel">
        ${units.length
          ? EH.Layout.table(
              ['Name','Type','Code','Manager','Budget','Status','Actions'], rows)
          : `
            <div class="empty-state">
              <i class="fas fa-sitemap"></i>
              <h3>No organisational units yet</h3>
              <p>Model your departments, branches, and cost centres.</p>
              <button class="btn btn-primary" data-action="create-org-unit">
                <i class="fas fa-plus"></i> Create First Unit</button>
            </div>`}
      </section>`;
  }

  EH.InstOrgStructure = { render };
})(window);
