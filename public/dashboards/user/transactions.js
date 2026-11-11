/* ============================================================
   ExpertHub 2.0 — dashboards/user/transactions.js
   Transaction list.
   ============================================================ */

function renderUserTransactions() {
  return UserUI.page({
    title: 'Transactions',
    breadcrumb: 'Transactions',
    content: `
      <section class="panel">
        ${UserUI.table(
          ['Reference', 'Description', 'Amount', 'Status', 'Date'],
          (S.transactions || []).map(t => `
            <tr>
              <td><code class="code">${esc(t.reference || t.id)}</code></td>
              <td>${esc(t.description || '')}</td>
              <td>${fmtCur(t.amount || 0)}</td>
              <td>${UserUI.statusPill(t.status || '')}</td>
              <td>${fmtDT(t.created_at)}</td>
            </tr>
          `),
          'No transactions yet'
        )}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('transactions', renderUserTransactions);
