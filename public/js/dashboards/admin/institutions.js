/* ============================================================
   dashboards/admin/institutions.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const list = S.institutions || [];
    const rows = list.map(i => `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar avatar-brand"><i class="fas fa-building"></i></div>
            <div>
              <div class="user-name">${EH.Fmt.esc(i.name || '')}</div>
              <div class="user-email">${EH.Fmt.esc(i.contact_email || '')}</div>
            </div>
          </div>
        </td>
        <td><span class="chip chip-neutral">${EH.Fmt.esc(i.type || 'corporate')}</span></td>
        <td>${EH.Fmt.esc(i.industry || '—')}</td>
        <td>
          ${EH.Fmt.esc(i.ops_manager_name || '—')}<br>
          <small class="user-email">${EH.Fmt.esc(i.ops_manager_email || '')}</small>
        </td>
        <td>${i.programme_count || 0}</td>
        <td><span class="${EH.Fmt.statusClass(i.status || 'pending')}">${EH.Fmt.esc(i.status || '')}</span></td>
        <td class="actions-cell">
          ${i.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-institution" data-id="${i.id}">Verify</button>` : ''}
          ${i.status === 'pending' ? `<button class="btn btn-danger btn-xs" data-action="reject-institution" data-id="${i.id}">Reject</button>` : ''}
          ${i.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-institution" data-id="${i.id}">Suspend</button>` : ''}
          <button class="btn btn-info btn-xs" data-action="assign-ops-manager" data-id="${i.id}">Assign Ops</button>
          <button class="btn btn-secondary btn-xs" data-action="edit-institution" data-id="${i.id}">Edit</button>
          <button class="btn btn-danger btn-xs" data-action="delete-institution" data-id="${i.id}">Delete</button>
        </td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Institutions' }])}
      ${EH.Layout.pageHeader('Institutional & Corporate Accounts', {
        actions: `<button class="btn btn-primary" data-action="create-institution">
          <i class="fas fa-plus"></i> New Institution</button>`,
      })}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'Institutions', value: list.length,
          icon: 'fa-building', tone: 'blue' }),
        EH.Layout.statCard({ label: 'Active Programmes',
          value: S.programmes.filter(p => p.status === 'active').length,
          icon: 'fa-diagram-project', tone: 'green' }),
        EH.Layout.statCard({ label: 'Total Trainees', value: S.trainees.length,
          icon: 'fa-user-graduate', tone: 'purple' }),
        EH.Layout.statCard({ label: 'Pending Verification',
          value: list.filter(i => i.status === 'pending').length,
          icon: 'fa-clock', tone: 'yellow' }),
      ])}

      <section class="panel">
        ${EH.Layout.table(
          ['Institution', 'Type', 'Industry', 'Ops Manager', 'Programmes', 'Status', 'Actions'],
          rows,
        )}
      </section>`;
  }

  EH.AdminInstitutions = { render };
})(window);
