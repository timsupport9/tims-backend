/* ============================================================
   admin/overview.js — Platform overview / command center
   ============================================================ */
(function () {
  AdminDash.reg('overview', {
    nav: { label: 'Overview', icon: 'fa-chart-line' },
    render() {
      const pending = S.users.filter(u => u.status === 'pending').length;
      const activeExperts = S.experts.filter(e => e.status === 'active').length;
      const activeCons = S.consultations.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length;
      const openDisputes = (S.consultationDisputes || []).filter(d => ['open','investigating'].includes(d.status)).length;
      const t = S.analytics?.totals || {};
      const newThisMonth = S.users.filter(u => {
        const d = new Date(u.created_at), now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Overview</span></div>
        <section class="page-header">
          <h1 class="page-title">Platform Overview</h1>
          <div class="page-actions">
            <button class="btn btn-secondary" data-action="export-dashboard"><i class="fas fa-download"></i> Export</button>
            <button class="btn btn-primary" data-action="refresh-all"><i class="fas fa-rotate"></i> Refresh</button>
          </div>
        </section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Total Users</p><p class="stat-value">${t.total_users ?? S.users.length}</p><p class="stat-sub">${newThisMonth} new this month</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Active Experts</p><p class="stat-value">${activeExperts}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-user-tie"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Active Consultations</p><p class="stat-value">${activeCons}</p></div><div class="stat-icon stat-icon-purple"><i class="fas fa-comments"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Open Disputes</p><p class="stat-value">${openDisputes}</p></div><div class="stat-icon stat-icon-red"><i class="fas fa-gavel"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Revenue</p><p class="stat-value">${fmtCur(t.total_revenue || 0)}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Pending Approvals</p><p class="stat-value">${pending}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div></div>
        </section>

        ${pending || openDisputes ? `
          <section class="dashboard-columns">
            ${pending ? `<div class="alert alert-warning"><i class="fas fa-exclamation-circle"></i><div><strong>${pending} user(s) awaiting approval.</strong><a href="#" data-action="switch-tab" data-tab="users" style="margin-left:8px">Review now</a></div></div>` : ''}
            ${openDisputes ? `<div class="alert alert-error"><i class="fas fa-gavel"></i><div><strong>${openDisputes} open dispute(s).</strong><a href="#" data-action="switch-tab" data-tab="disputes" style="margin-left:8px">Investigate</a></div></div>` : ''}
          </section>
        ` : ''}

        <section class="dashboard-columns">
          <div class="panel panel-quick-actions">
            <h3 class="panel-title">Quick Actions</h3>
            <button class="btn btn-primary btn-block" data-action="switch-tab" data-tab="experts"><i class="fas fa-user-plus"></i> Create Expert</button>
            <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="events"><i class="fas fa-calendar-plus"></i> Manage Events</button>
            <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="users"><i class="fas fa-user-check"></i> Approve Users</button>
            <button class="btn btn-warning btn-block" data-action="switch-tab" data-tab="verification"><i class="fas fa-shield-halved"></i> Verify Accounts</button>
            <button class="btn btn-secondary btn-block" data-action="switch-tab" data-tab="finance"><i class="fas fa-coins"></i> Finance Center</button>
          </div>
          <div class="panel">
            <h3 class="panel-title">Recent Notifications</h3>
            <ul class="notif-list">
              ${S.notifications.slice(0,5).map(n => `
                <li class="notif-item"><i class="fas fa-bell"></i>
                  <div class="notif-info"><p class="notif-title">${esc(n.title || '')}</p><p class="notif-message">${esc(n.message || '')}</p></div>
                  <span class="notif-date">${timeAgo(n.created_at)}</span>
                </li>
              `).join('') || '<li class="empty-row">No notifications</li>'}
            </ul>
          </div>
        </section>

        <section class="panel-charts">
          <div class="chart-card"><h3 class="panel-title">User Growth</h3><canvas id="chartUserGrowth" height="200"></canvas></div>
          <div class="chart-card"><h3 class="panel-title">Revenue Overview</h3><canvas id="chartRevenue" height="200"></canvas></div>
        </section>
      `;
    },
    actions: {
      'export-dashboard': () => downloadCsv('dashboard-overview.csv', [{
        users: S.users.length,
        experts: S.experts.length,
        consultations: S.consultations.length,
        revenue: S.analytics?.totals?.total_revenue || 0,
      }]),
    },
  });
})();
