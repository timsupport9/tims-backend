/* ============================================================
   dashboards/admin/overview.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const pending = S.users.filter(u => u.status === 'pending').length;
    const activeExperts = S.experts.filter(e => e.status === 'active').length;
    const activeCons = S.consultations.filter(c =>
      ['pending', 'assigned', 'in_progress'].includes(c.status)).length;
    const t = S.analytics?.totals || {};
    const now = new Date();
    const newThisMonth = S.users.filter(u => {
      const d = new Date(u.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Dashboard' }])}
      ${EH.Layout.pageHeader('Platform Overview', {
        actions: `
          <button class="btn btn-secondary" data-action="export-dashboard"><i class="fas fa-download"></i> Export</button>
          <button class="btn btn-primary" data-action="refresh-all"><i class="fas fa-rotate"></i> Refresh</button>`,
      })}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'Total Users', value: t.total_users ?? S.users.length,
          sub: `${newThisMonth} new this month`, icon: 'fa-users', tone: 'blue' }),
        EH.Layout.statCard({ label: 'Active Experts', value: activeExperts,
          icon: 'fa-user-tie', tone: 'green' }),
        EH.Layout.statCard({ label: 'Active Consultations', value: activeCons,
          icon: 'fa-comments', tone: 'purple' }),
        EH.Layout.statCard({ label: 'Institutions', value: S.institutions.length,
          icon: 'fa-building-columns', tone: 'yellow' }),
        EH.Layout.statCard({ label: 'Revenue', value: EH.Fmt.cur(t.total_revenue || 0),
          icon: 'fa-dollar-sign', tone: 'green' }),
        EH.Layout.statCard({ label: 'Pending Approvals', value: pending,
          icon: 'fa-clock', tone: 'red' }),
      ])}

      ${pending ? `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-circle"></i>
          <div>
            <strong>${pending} user${pending === 1 ? '' : 's'} awaiting approval.</strong>
            <a href="#" data-action="switch-tab" data-tab="users" style="margin-left:8px">Review now</a>
          </div>
        </div>` : ''}

      <section class="dashboard-columns">
        <div class="panel panel-quick-actions">
          <h3 class="panel-title">Quick Actions</h3>
          <button class="btn btn-primary btn-block" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-user-plus"></i> Create Expert</button>
          <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="events">
            <i class="fas fa-calendar-plus"></i> Manage Events</button>
          <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="users">
            <i class="fas fa-user-check"></i> Approve Users</button>
          <button class="btn btn-warning btn-block" data-action="switch-tab" data-tab="institutions">
            <i class="fas fa-building"></i> Review Institutions</button>
          <button class="btn btn-secondary btn-block" data-action="switch-tab" data-tab="coupons">
            <i class="fas fa-tag"></i> Manage Coupons</button>
        </div>

        <div class="panel">
          <h3 class="panel-title">Recent Notifications</h3>
          <ul class="notif-list">
            ${(S.notifications.slice(0, 5).map(n => `
              <li class="notif-item">
                <i class="fas fa-bell"></i>
                <div class="notif-info">
                  <p class="notif-title">${EH.Fmt.esc(n.title || '')}</p>
                  <p class="notif-message">${EH.Fmt.esc(n.message || '')}</p>
                </div>
                <span class="notif-date">${EH.Dates.timeAgo(n.created_at)}</span>
              </li>`).join('') || '<li class="empty-row">No notifications</li>')}
          </ul>
        </div>
      </section>

      <section class="panel-charts">
        <div class="chart-card">
          <h3 class="panel-title">User Growth</h3>
          <canvas id="chartUserGrowth" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h3 class="panel-title">Revenue Overview</h3>
          <canvas id="chartRevenue" height="200"></canvas>
        </div>
      </section>`;
  }

  EH.AdminOverview = { render };
})(window);
