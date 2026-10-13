/* ============================================================
   dashboards/admin/experts.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const rows = S.experts.map(e => `
      <tr>
        <td>
          <div class="user-cell">
            <img class="user-avatar" src="${EH.Fmt.esc(e.avatar || EH.PublicFormat.avatar(e.name))}" alt="" />
            <div>
              <div class="user-name">${EH.Fmt.esc(e.name || '')}</div>
              <div class="user-email">${EH.Fmt.esc(e.email || '')}</div>
            </div>
          </div>
        </td>
        <td>${EH.Fmt.esc(e.specialization || '—')}</td>
        <td>${EH.Fmt.cur(e.hourly_rate || 0)}</td>
        <td>${e.average_rating ? Number(e.average_rating).toFixed(1) + ' / 5' : '—'}</td>
        <td>${EH.Fmt.cur(e.total_earnings || 0)}</td>
        <td><span class="${EH.Fmt.statusClass(e.status || 'active')}">${EH.Fmt.esc(e.status || '')}</span></td>
        <td class="actions-cell">
          ${e.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${e.id}">Suspend</button>` : ''}
          ${e.status === 'suspended' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${e.id}">Reactivate</button>` : ''}
          <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${e.id}">Delete</button>
        </td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Experts' }])}
      ${EH.Layout.pageHeader('Expert Management', {
        actions: `<button class="btn btn-primary" data-action="show-create-expert">
          <i class="fas fa-plus"></i> Create Expert</button>`,
      })}

      <section class="panel hidden" id="createExpertPanel">
        <h3 class="panel-title">Create New Expert</h3>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Full name</span>
            <input id="newExpertName" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Email</span>
            <input id="newExpertEmail" type="email" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Phone</span>
            <input id="newExpertPhone" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Specialization</span>
            <input id="newExpertSpec" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Hourly rate ($)</span>
            <input id="newExpertRate" type="number" class="form-input" /></label>
          <label class="form-group form-group-full"><span class="form-label">Bio</span>
            <input id="newExpertBio" class="form-input" /></label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="submit-create-expert">Create</button>
          <button class="btn btn-secondary" data-action="hide-create-expert">Cancel</button>
        </div>
      </section>

      <section class="panel">
        ${EH.Layout.table(
          ['Expert', 'Specialization', 'Rate', 'Rating', 'Earnings', 'Status', 'Actions'],
          rows,
        )}
      </section>`;
  }

  EH.AdminExperts = { render };
})(window);
