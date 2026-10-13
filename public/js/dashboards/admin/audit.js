/* ============================================================
   dashboards/admin/audit.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const logs = S.auditLogs.length ? S.auditLogs.map(l => `
      <li class="list-row">
        <div class="list-row-main">
          <span class="list-row-title">${EH.Fmt.esc(l.action || '')}</span>
          <span class="list-row-sub">
            target ${EH.Fmt.esc(l.target || '')}${l.target_id ? ' #' + l.target_id : ''} by ${EH.Fmt.esc(l.actor_name || 'system')}
          </span>
        </div>
        <span class="list-row-meta">${EH.Dates.fmtDateTime(l.created_at)}</span>
      </li>`).join('') : '<li class="empty-row">No entries</li>';

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Audit' }])}
      ${EH.Layout.pageHeader('Audit Log')}
      <section class="panel"><ul class="list-stack">${logs}</ul></section>`;
  }

  EH.AdminAudit = { render };
})(window);
