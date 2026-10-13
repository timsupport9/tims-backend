/* ============================================================
   dashboards/expert/withdrawals.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const rows = (S.payouts || []).map(w => `
      <tr>
        <td>${EH.Dates.fmtDate(w.created_at)}</td>
        <td>${EH.Fmt.cur(w.amount || 0)}</td>
        <td>${EH.Fmt.esc(w.method || '')}</td>
        <td><span class="${EH.Fmt.statusClass(w.status)}">${EH.Fmt.esc(w.status || '')}</span></td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Withdrawals' }])}
      ${EH.Layout.pageHeader('Withdrawals')}
      <section class="panel">
        ${EH.Layout.table(['Date', 'Amount', 'Method', 'Status'], rows)}
      </section>`;
  }

  EH.ExpertWithdrawals = { render };
})(window);
