/* ============================================================
   admin/transactions.js — Transactions ledger
   ============================================================ */
(function () {
  AdminDash.reg('transactions', {
    nav: { label: 'Transactions', icon: 'fa-receipt' },
    render() {
      const q = ($('#tx-q')?.value || '').toLowerCase();
      let list = S.transactions.slice();
      if (q) list = list.filter(t =>
        (t.reference||'').toLowerCase().includes(q) ||
        (t.user_name||'').toLowerCase().includes(q) ||
        (t.description||'').toLowerCase().includes(q)
      );
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
        <section class="page-header">
          <h1 class="page-title">Transactions</h1>
          <div class="page-actions">
            <input type="search" id="tx-q" class="form-input" placeholder="Search transactions..." value="${esc(q)}" />
            <button class="btn btn-secondary" data-action="export-transactions"><i class="fas fa-download"></i> Export</button>
          </div>
        </section>
        <section class="panel">
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Reference</th><th>User</th><th>Description</th><th>Amount</th><th>Provider</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${list.map(t => `
                  <tr>
                    <td><code class="code">${esc(t.reference||t.id)}</code></td>
                    <td>${esc(t.user_name||'—')}</td>
                    <td>${esc(t.description||'')}</td>
                    <td>${fmtCur(t.amount||0)}</td>
                    <td><span class="chip chip-neutral">${esc(t.provider||'')}</span></td>
                    <td><span class="${statusClass(t.status)}">${esc(t.status||'')}</span></td>
                    <td>${fmtDT(t.created_at)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="7" class="empty-row">No transactions</td></tr>'}
              </tbody>
            </table>
          </div>
          <div class="table-footer"><span>Showing ${list.length} transactions</span></div>
        </section>`;
    },
    actions: {
      'export-transactions': () => downloadCsv('transactions.csv', S.transactions.map(t => ({
        reference: t.reference, user: t.user_name, description: t.description,
        amount: t.amount, provider: t.provider, status: t.status, date: t.created_at,
      }))),
    },
  });
})();
