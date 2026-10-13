/* ============================================================
   dashboards/learner/transactions.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const rows = (S.transactions || []).map(t => `
      <tr>
        <td><code class="code">${EH.Fmt.esc(t.reference || t.id)}</code></td>
        <td>${EH.Fmt.esc(t.description || '')}</td>
        <td>${EH.Fmt.cur(t.amount || 0)}</td>
        <td><span class="${EH.Fmt.statusClass(t.status)}">${EH.Fmt.esc(t.status || '')}</span></td>
        <td>${EH.Dates.fmtDateTime(t.created_at)}</td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Transactions' }])}
      ${EH.Layout.pageHeader('Transactions')}
      <section class="panel">
        ${EH.Layout.table(['Reference', 'Description', 'Amount', 'Status', 'Date'], rows)}
      </section>`;
  }

  EH.LearnerTransactions = { render };
})(window);
