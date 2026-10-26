/* ============================================================
   admin/finance.js — Financial Operations Center
   ============================================================ */
(function () {
  AdminDash.reg('finance', {
    nav: { label: 'Finance', icon: 'fa-coins' },
    render() {
      const t = S.analytics?.totals || {};
      const pendingPayouts = S.payouts.filter(p => p.status === 'pending').length;
      const requestedRefunds = (S.userRefunds || []).filter(r => r.status === 'requested').length;

      const commission = (S.transactions || []).reduce((s, x) => s + Number(x.amount || 0), 0) * (CONFIG.PLATFORM_COMMISSION / 100);
      const grossRevenue = (S.transactions || []).reduce((s, x) => s + Number(x.amount || 0), 0);

      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Finance</span></div>
        <section class="page-header"><h1 class="page-title">Financial Operations Center</h1></section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Gross Revenue</p><p class="stat-value">${fmtCur(grossRevenue)}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Platform Commission</p><p class="stat-value">${fmtCur(commission)}</p><p class="stat-sub">${CONFIG.PLATFORM_COMMISSION}%</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-percentage"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Pending Payouts</p><p class="stat-value">${pendingPayouts}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-money-check-dollar"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Refund Requests</p><p class="stat-value">${requestedRefunds}</p></div><div class="stat-icon stat-icon-red"><i class="fas fa-rotate-left"></i></div></div>
        </section>

        <section class="dashboard-columns">
          <div class="panel panel-quick-actions">
            <h3 class="panel-title">Jump to</h3>
            <button class="btn btn-primary btn-block" data-action="switch-tab" data-tab="transactions"><i class="fas fa-receipt"></i> Transactions</button>
            <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="payouts"><i class="fas fa-money-bill-transfer"></i> Payouts</button>
            <button class="btn btn-warning btn-block" data-action="switch-tab" data-tab="refunds"><i class="fas fa-rotate-left"></i> Refunds</button>
            <button class="btn btn-secondary btn-block" data-action="switch-tab" data-tab="analytics"><i class="fas fa-chart-bar"></i> Analytics</button>
          </div>
          <div class="panel">
            <h3 class="panel-title">Revenue Split</h3>
            <ul class="list-stack">
              <li class="list-row"><div class="list-row-main"><span class="list-row-title">Gross</span></div><span class="list-row-price">${fmtCur(grossRevenue)}</span></li>
              <li class="list-row"><div class="list-row-main"><span class="list-row-title">Platform</span></div><span class="list-row-price">${fmtCur(commission)}</span></li>
              <li class="list-row"><div class="list-row-main"><span class="list-row-title">Expert Payouts</span></div><span class="list-row-price">${fmtCur(grossRevenue - commission)}</span></li>
            </ul>
          </div>
        </section>

        <section class="panel-charts">
          <div class="chart-card"><h3 class="panel-title">Revenue Trend</h3><canvas id="chartRevenue" height="200"></canvas></div>
          <div class="chart-card"><h3 class="panel-title">Commission Breakdown</h3><canvas id="chartFinanceCommission" height="200"></canvas></div>
        </section>`;
    },
    actions: {},
  });
})();
