/* ============================================================
   ExpertHub 2.0 — js/expert/14-withdrawals.js
   Expert withdrawals history.
   ============================================================ */

function expertWithdrawals() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Withdrawals</span></div>
    <section class="page-header"><h1 class="page-title">Withdrawals</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${S.payouts.map(w => `
              <tr>
                <td>${fmtDate(w.created_at)}</td>
                <td>${fmtCur(w.amount || 0)}</td>
                <td>${esc(w.method || '')}</td>
                <td><span class="${statusClass(w.status)}">${esc(w.status || '')}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="4" class="empty-row">No withdrawals yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
