/* ============================================================
   admin/monitoring.js — System Health & Monitoring
   ============================================================ */
(function () {
  AdminDash.reg('monitoring', {
    nav: { label: 'Monitoring', icon: 'fa-heart-pulse' },
    render() {
      const health = S.systemHealth || {};
      const services = health.services || [];
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Monitoring</span></div>
        <section class="page-header">
          <h1 class="page-title">System Health & Monitoring</h1>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="monitoring-refresh"><i class="fas fa-rotate"></i> Refresh</button>
          </div>
        </section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">API Status</p><p class="stat-value">${esc(health.api_status||'unknown')}</p></div><div class="stat-icon stat-icon-${health.api_status==='healthy'?'green':'red'}"><i class="fas fa-server"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Database</p><p class="stat-value">${esc(health.db_status||'unknown')}</p></div><div class="stat-icon stat-icon-${health.db_status==='healthy'?'green':'red'}"><i class="fas fa-database"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Failed Jobs (24h)</p><p class="stat-value">${health.failed_jobs_24h||0}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-clock-rotate-left"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Uptime</p><p class="stat-value">${health.uptime||'—'}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-activity"></i></div></div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Services</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Service</th><th>Status</th><th>Response Time</th><th>Last Check</th></tr></thead>
              <tbody>
                ${services.map(s => `
                  <tr>
                    <td>${esc(s.name||'')}</td>
                    <td><span class="${statusClass(s.status==='up'?'active':s.status==='degraded'?'pending':'rejected')}">${esc(s.status||'')}</span></td>
                    <td>${s.response_ms||0}ms</td>
                    <td>${s.checked_at ? timeAgo(s.checked_at) : '—'}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4" class="empty-row">No services registered</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Recent Errors</h3>
          <ul class="list-stack">
            ${(health.recent_errors || []).map(e => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(e.message||'')}</span>
                  <span class="list-row-sub">${esc(e.path||'')}</span>
                </div>
                <span class="list-row-meta">${timeAgo(e.created_at)}</span>
              </li>
            `).join('') || '<li class="empty-row">No errors</li>'}
          </ul>
        </section>`;
    },
    actions: {
      'monitoring-refresh': async () => {
        try { const d = await apiCall('/api/admin/health'); S.systemHealth = d; } catch (_) {}
        rerenderRoleContent(); showToast('Refreshed','success');
      },
    },
  });
})();
