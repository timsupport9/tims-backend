/* ============================================================
   admin/claims.js — Claims management
   ============================================================ */
(function () {
  AdminDash.reg('claims', {
    nav: { label: 'Claims', icon: 'fa-scale-balanced' },
    render() {
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Claims</span></div>
        <section class="page-header"><h1 class="page-title">Client Claims</h1></section>
        <section class="panel">
          ${S.claims.length ? S.claims.map(c => `
            <article class="claim-card">
              <header class="claim-header">
                <span class="claim-title">${esc(c.claim_title||'')}</span>
                <span class="${statusClass(c.status)}">${esc(c.status||'')}</span>
              </header>
              <p class="claim-desc">${esc(c.claim_description||'')}</p>
              ${c.claim_amount ? `<p class="claim-amount">Amount: ${fmtCur(c.claim_amount)}</p>` : ''}
              <footer class="claim-actions">
                ${c.status === 'open' ? `
                  <button class="btn btn-info btn-sm" data-action="claim-investigate" data-id="${c.id}">Investigate</button>
                  <button class="btn btn-success btn-sm" data-action="claim-resolve" data-id="${c.id}">Resolve</button>
                  <button class="btn btn-danger btn-sm" data-action="claim-reject" data-id="${c.id}">Reject</button>
                ` : ''}
              </footer>
            </article>
          `).join('') : '<p class="empty-row">No claims</p>'}
        </section>`;
    },
    actions: {
      'claim-investigate': async ({ id }) => {
        await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'investigating' });
        await loadAllData(); showToast('Investigating','info'); rerenderRoleContent();
      },
      'claim-resolve': async ({ id }) => {
        const r = prompt('Resolution:') || '';
        await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'resolved', resolution: r });
        await loadAllData(); showToast('Resolved','success'); rerenderRoleContent();
      },
      'claim-reject': async ({ id }) => {
        const r = prompt('Reason:') || '';
        await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'rejected', resolution: r });
        await loadAllData(); showToast('Rejected','warning'); rerenderRoleContent();
      },
    },
  });
})();
