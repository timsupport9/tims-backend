/* ============================================================
   dashboards/admin/analytics.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const t = S.analytics?.totals || {};
    const top = S.analytics?.topExperts || [];

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Analytics' }])}
      ${EH.Layout.pageHeader('Platform Analytics')}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'Total Users', value: t.total_users || 0,
          icon: 'fa-users', tone: 'blue' }),
        EH.Layout.statCard({ label: 'Total Revenue', value: EH.Fmt.cur(t.total_revenue || 0),
          icon: 'fa-dollar-sign', tone: 'green' }),
        EH.Layout.statCard({ label: 'Published Courses', value: t.published_courses || 0,
          icon: 'fa-book', tone: 'purple' }),
        EH.Layout.statCard({ label: 'Published Events', value: t.published_events || 0,
          icon: 'fa-calendar', tone: 'yellow' }),
      ])}

      <section class="panel-charts">
        <div class="chart-card">
          <h3 class="panel-title">User Growth</h3>
          <canvas id="userGrowthChart" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h3 class="panel-title">Revenue</h3>
          <canvas id="revenueChart" height="200"></canvas>
        </div>
      </section>

      <section class="panel-charts">
        <div class="chart-card">
          <h3 class="panel-title">Users by Role</h3>
          <canvas id="roleChart" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h3 class="panel-title">Top Experts</h3>
          <ul class="list-stack" style="margin-top:10px">
            ${top.map(e => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${EH.Fmt.esc(e.name)}</span>
                  <span class="list-row-sub">${e.average_rating || 0} / 5</span>
                </div>
                <span class="list-row-price">${EH.Fmt.cur(e.total_earnings)}</span>
              </li>`).join('') || '<li class="empty-row">No data</li>'}
          </ul>
        </div>
      </section>`;
  }

  EH.AdminAnalytics = { render };
})(window);
