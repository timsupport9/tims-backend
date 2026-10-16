/* ============================================================
   ExpertHub 2.0 — js/admin/10-payouts.js
   Admin payouts table.
   ============================================================ */

function adminPayouts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Payouts</span></div>
    <section class="page-header"><h1 class="page-title">Payouts</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Expert</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.payouts.map(p => `
              <tr>
                <td>${esc(p.expert_name || '—')}</td>
                <td>${fmtCur(p.amount || 0)}</td>
                <td><span class="chip chip-neutral">${esc(p.method || '')}</span></td>
                <td><span class="${statusClass(p.status)}">${esc(p.status || '')}</span></td>
                <td>${fmtDate(p.created_at)}</td>
                <td class="actions-cell">
                  ${p.status === 'pending' ? `
                    <button class="btn btn-success btn-xs" data-action="payout-approve" data-id="${p.id}">Approve</button>
                    <button class="btn btn-info btn-xs" data-action="payout-process" data-id="${p.id}">Process</button>
                    <button class="btn btn-danger btn-xs" data-action="payout-reject" data-id="${p.id}">Reject</button>
                  ` : ''}
                  ${p.status === 'processing' ? `<button class="btn btn-success btn-xs" data-action="payout-paid" data-id="${p.id}">Mark Paid</button>` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No payouts</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}