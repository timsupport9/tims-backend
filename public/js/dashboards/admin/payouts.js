/* ============================================================
   admin/payouts.js — Expert payouts
   ============================================================ */
(function () {
  AdminDash.reg('payouts', {
    nav: { label: 'Payouts', icon: 'fa-money-check-dollar' },
    render() {
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Payouts</span></div>
        <section class="page-header"><h1 class="page-title">Payouts</h1></section>
        <section class="panel">
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Expert</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                ${S.payouts.map(p => `
                  <tr>
                    <td>${esc(p.expert_name||'—')}</td>
                    <td>${fmtCur(p.amount||0)}</td>
                    <td><span class="chip chip-neutral">${esc(p.method||'')}</span></td>
                    <td><span class="${statusClass(p.status)}">${esc(p.status||'')}</span></td>
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
        </section>`;
    },
    actions: {
      'payout-approve': async ({ id }) => { await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'approved' }); await reloadPayouts(); showToast('Approved','success'); rerenderRoleContent(); },
      'payout-process': async ({ id }) => { await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'processing' }); await reloadPayouts(); showToast('Processing','info'); rerenderRoleContent(); },
      'payout-paid':    async ({ id }) => { await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'paid' }); await reloadPayouts(); showToast('Paid','success'); rerenderRoleContent(); },
      'payout-reject':  async ({ id }) => { const r = prompt('Reason:')||''; await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'rejected', reason: r }); await reloadPayouts(); showToast('Rejected','warning'); rerenderRoleContent(); },
    },
  });

  async function reloadPayouts() {
    try { const d = await apiCall('/api/admin/payouts'); S.payouts = d.payouts || []; } catch (_) {}
  }
})();
