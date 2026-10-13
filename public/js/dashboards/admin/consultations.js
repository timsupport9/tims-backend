/* ============================================================
   dashboards/admin/consultations.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const rows = S.consultations.map(c => `
      <tr>
        <td>${EH.Fmt.esc(c.title || '')}</td>
        <td>${EH.Fmt.esc(c.client_name || '—')}</td>
        <td>${EH.Fmt.esc(c.expert_name || '—')}</td>
        <td><span class="chip chip-neutral">${EH.Fmt.esc(c.consultation_type || '')}</span></td>
        <td><span class="${EH.Fmt.statusClass(c.status)}">${EH.Fmt.esc(c.status || '')}</span></td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-xs" data-action="view-consultation" data-id="${c.id}">View</button>
          ${!c.expert_id ? `<button class="btn btn-primary btn-xs" data-action="assign-consultation" data-id="${c.id}">Assign</button>` : ''}
        </td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Consultations' }])}
      ${EH.Layout.pageHeader('All Consultations')}
      <section class="panel">
        ${EH.Layout.table(['Title', 'Client', 'Expert', 'Type', 'Status', 'Actions'], rows)}
      </section>`;
  }

  EH.AdminConsultations = { render };
})(window);
