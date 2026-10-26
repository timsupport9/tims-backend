/* ============================================================
   admin/governance.js — Data Governance & Compliance
   ============================================================ */
(function () {
  AdminDash.reg('governance', {
    nav: { label: 'Governance', icon: 'fa-file-shield' },
    render() {
      const requests = S.privacyRequests || [];
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Governance</span></div>
        <section class="page-header"><h1 class="page-title">Data Governance & Compliance</h1></section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Privacy Requests</p><p class="stat-value">${requests.filter(r => r.status === 'open').length}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-envelope-open-text"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Data Exports</p><p class="stat-value">${(S.dataExports||[]).length}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-file-export"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Last Backup</p><p class="stat-value" style="font-size:1rem">${S.lastBackupAt ? fmtDT(S.lastBackupAt) : '—'}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-database"></i></div></div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Privacy & Export Requests</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Type</th><th>Requester</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
              <tbody>
                ${requests.map(r => `
                  <tr>
                    <td><span class="chip chip-neutral">${esc(r.request_type||'')}</span></td>
                    <td>${esc(r.user_name||'—')}</td>
                    <td><span class="${statusClass(r.status)}">${esc(r.status||'')}</span></td>
                    <td>${fmtDate(r.created_at)}</td>
                    <td class="actions-cell">
                      <button class="btn btn-success btn-xs" data-action="gov-approve" data-id="${r.id}">Approve</button>
                      <button class="btn btn-danger btn-xs" data-action="gov-reject" data-id="${r.id}">Reject</button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="5" class="empty-row">No requests</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Retention Policies</h3>
          <ul class="list-stack">
            ${(S.retentionPolicies||[]).map(p => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(p.name||'')}</span>
                  <span class="list-row-sub">Retain ${esc(p.target||'')} for ${p.retention_days} days</span>
                </div>
                <span class="${p.active ? 'status-active' : 'status-archived'}">${p.active?'Active':'Inactive'}</span>
              </li>
            `).join('') || '<li class="empty-row">No policies</li>'}
          </ul>
        </section>`;
    },
    actions: {
      'gov-approve': async ({ id }) => {
        await apiCall(`/api/admin/governance/${id}/approve`, 'PUT');
        await loadAllData(); showToast('Approved','success'); rerenderRoleContent();
      },
      'gov-reject': async ({ id }) => {
        await apiCall(`/api/admin/governance/${id}/reject`, 'PUT');
        await loadAllData(); showToast('Rejected','warning'); rerenderRoleContent();
      },
    },
  });
})();
