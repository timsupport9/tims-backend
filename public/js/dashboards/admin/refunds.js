/* ============================================================
   admin/refunds.js — Refund requests
   ============================================================ */
(function () {
  AdminDash.reg('refunds', {
    nav: { label: 'Refunds', icon: 'fa-rotate-left' },
    render() {
      const refunds = S.userRefunds || [];
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Refunds</span></div>
        <section class="page-header"><h1 class="page-title">Course Refund Requests</h1></section>
        <section class="panel">
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>User</th><th>Course</th><th>Amount</th><th>Reason</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${refunds.map(r => `
                  <tr>
                    <td>${esc(r.user_name||'—')}</td>
                    <td>${esc(r.course_title||'—')}</td>
                    <td>${fmtCur(r.amount||0)}</td>
                    <td>${esc((r.reason||'').slice(0,80))}</td>
                    <td>${fmtDate(r.requested_at)}</td>
                    <td><span class="${statusClass(r.status)}">${esc(r.status)}</span></td>
                    <td class="actions-cell">
                      ${r.status === 'requested' ? `
                        <button class="btn btn-success btn-xs" data-action="refund-approve" data-id="${r.id}">Approve</button>
                        <button class="btn btn-danger btn-xs" data-action="refund-reject" data-id="${r.id}">Reject</button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="7" class="empty-row">No refund requests</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>`;
    },
    actions: {
      'refund-approve': async ({ id }) => {
        await apiCall(`/api/admin/refunds/${id}`, 'PUT', { status: 'approved' });
        await loadAllData(); showToast('Refund approved','success'); rerenderRoleContent();
      },
      'refund-reject': async ({ id }) => {
        const r = prompt('Reason:') || '';
        await apiCall(`/api/admin/refunds/${id}`, 'PUT', { status: 'rejected', reason: r });
        await loadAllData(); showToast('Refund rejected','warning'); rerenderRoleContent();
      },
    },
  });
})();
