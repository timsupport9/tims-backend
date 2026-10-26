/* ============================================================
   admin/fraud.js — Trust, Safety & Fraud Center
   ============================================================ */
(function () {
  AdminDash.reg('fraud', {
    nav: { label: 'Fraud Center', icon: 'fa-shield-halved' },
    render() {
      const alerts = S.fraudAlerts || [];
      const risky = alerts.filter(a => a.severity === 'high' || a.severity === 'critical');
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Fraud Center</span></div>
        <section class="page-header"><h1 class="page-title">Trust, Safety & Fraud Center</h1></section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Total Alerts</p><p class="stat-value">${alerts.length}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-triangle-exclamation"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">High / Critical</p><p class="stat-value">${risky.length}</p></div><div class="stat-icon stat-icon-red"><i class="fas fa-fire"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Investigated</p><p class="stat-value">${alerts.filter(a => a.status === 'investigated').length}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div></div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Risk Alerts</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Type</th><th>Account</th><th>Severity</th><th>Details</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${alerts.map(a => `
                  <tr>
                    <td><span class="chip chip-neutral">${esc(a.type||'')}</span></td>
                    <td>${esc(a.account_name||'—')}</td>
                    <td><span class="${statusClass(a.severity==='critical'?'rejected':a.severity==='high'?'pending':'active')}">${esc(a.severity||'')}</span></td>
                    <td>${esc((a.details||'').slice(0,80))}</td>
                    <td><span class="${statusClass(a.status)}">${esc(a.status||'')}</span></td>
                    <td class="actions-cell">
                      <button class="btn btn-info btn-xs" data-action="fraud-investigate" data-id="${a.id}">Investigate</button>
                      <button class="btn btn-success btn-xs" data-action="fraud-clear" data-id="${a.id}">Clear</button>
                      <button class="btn btn-danger btn-xs" data-action="fraud-suspend" data-id="${a.id}">Suspend</button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6" class="empty-row">No alerts</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Anomaly Detection</h3>
          <p class="form-hint">Patterns automatically detected across accounts, transactions, and expert activity.</p>
          <ul class="list-stack">
            ${(S.anomalies || []).map(a => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(a.title||'')}</span>
                  <span class="list-row-sub">${esc(a.description||'')}</span>
                </div>
                <span class="chip chip-neutral">${esc(a.severity||'info')}</span>
              </li>
            `).join('') || '<li class="empty-row">No anomalies detected</li>'}
          </ul>
        </section>`;
    },
    actions: {
      'fraud-investigate': async ({ id }) => {
        await apiCall(`/api/admin/fraud/${id}`, 'PUT', { status: 'investigating' });
        await loadAllData(); showToast('Investigating','info'); rerenderRoleContent();
      },
      'fraud-clear': async ({ id }) => {
        await apiCall(`/api/admin/fraud/${id}`, 'PUT', { status: 'cleared' });
        await loadAllData(); showToast('Cleared','success'); rerenderRoleContent();
      },
      'fraud-suspend': async ({ id }) => {
        if (!await confirmDialog('Suspend this account?')) return;
        await apiCall(`/api/admin/fraud/${id}`, 'PUT', { status: 'suspended' });
        await loadAllData(); showToast('Suspended','warning'); rerenderRoleContent();
      },
    },
  });
})();
