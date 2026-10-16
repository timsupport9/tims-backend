/* ============================================================
   ExpertHub 2.0 — js/admin/09-transactions.js
   Admin transactions table.
   ============================================================ */

function adminTransactions() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
    <section class="page-header"><h1 class="page-title">Transactions</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Reference</th><th>User</th><th>Description</th><th>Amount</th><th>Provider</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${S.transactions.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.user_name || '—')}</td>
                <td>${esc(t.description || '')}</td>
                <td>${fmtCur(t.amount || 0)}</td>
                <td><span class="chip chip-neutral">${esc(t.provider || '')}</span></td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td>${fmtDT(t.created_at)}</td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No transactions</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}