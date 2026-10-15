/* ============================================================
   ExpertHub 2.0 — 20-transactions.js
   Learner transactions table.
   ============================================================ */

/* ============================================================
   USER — TRANSACTIONS
   ============================================================ */
function userTransactions() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
    <section class="page-header"><h1 class="page-title">Transactions</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Reference</th><th>Description</th><th>Amount</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${S.transactions.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.description || '')}</td>
                <td>${fmtCur(t.amount || 0)}</td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td>${fmtDT(t.created_at)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty-row">No transactions yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
