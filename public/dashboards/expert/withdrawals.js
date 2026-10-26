/* ============================================================
   dashboards/expert/withdrawals.js
   ============================================================ */

function renderExpertWithdrawals() {
  const payouts = S.payouts || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Withdrawals</span></div>
    <section class="page-header"><h1 class="page-title">Withdrawals</h1></section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${payouts.map(w => `
              <tr>
                <td>${fmtDate(w.created_at)}</td>
                <td>${fmtCur(w.amount || 0)}</td>
                <td>${esc(w.method || '')}</td>
                <td><span class="${statusClass(w.status)}">${esc(w.status || '')}</span></td>
                <td>
                  ${w.status === 'pending' ? `
                    <button class="btn btn-danger btn-xs" data-expert-action="cancel-withdrawal" data-id="${w.id}">
                      Cancel</button>
                  ` : '—'}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty-row">No withdrawals yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
