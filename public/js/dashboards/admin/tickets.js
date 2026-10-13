/* ============================================================
   dashboards/admin/tickets.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const rows = S.tickets.map(t => `
      <tr>
        <td><code class="code">${EH.Fmt.esc(t.reference || t.id)}</code></td>
        <td>${EH.Fmt.esc(t.user_name || '—')}</td>
        <td>${EH.Fmt.esc(t.subject || '')}</td>
        <td><span class="${EH.Fmt.statusClass(t.priority || 'normal')}">${EH.Fmt.esc(t.priority || '')}</span></td>
        <td><span class="${EH.Fmt.statusClass(t.status)}">${EH.Fmt.esc(t.status || '')}</span></td>
        <td class="actions-cell">
          <button class="btn btn-info btn-xs" data-action="ticket-view" data-id="${t.id}">View</button>
          <button class="btn btn-success btn-xs" data-action="ticket-resolve" data-id="${t.id}">Resolve</button>
        </td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Support' }])}
      ${EH.Layout.pageHeader('Support Tickets')}
      <section class="panel">
        ${EH.Layout.table(['Ref', 'User', 'Subject', 'Priority', 'Status', 'Actions'], rows)}
      </section>`;
  }

  EH.AdminTickets = { render };
})(window);
