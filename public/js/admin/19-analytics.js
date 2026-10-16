/* ============================================================
   ExpertHub 2.0 — js/admin/19-analytics.js
   Admin platform analytics.
   ============================================================ */

function adminAnalytics() {
  const t = S.analytics?.totals || {};
  const top = S.analytics?.topExperts || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Analytics</span></div>
    <section class="page-header"><h1 class="page-title">Platform Analytics</h1></section>

    <section class="stat-grid">
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Total Users</p><p class="stat-value">${t.total_users || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Total Revenue</p><p class="stat-value">${fmtCur(t.total_revenue || 0)}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Published Courses</p><p class="stat-value">${t.published_courses || 0}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-book"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Published Events</p><p class="stat-value">${t.published_events || 0}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-calendar"></i></div>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">User Growth</h3><canvas id="userGrowthChart" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Revenue</h3><canvas id="revenueChart" height="200"></canvas></div>
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">Users by Role</h3><canvas id="roleChart" height="200"></canvas></div>
      <div class="chart-card">
        <h3 class="panel-title">Top Experts</h3>
        <ul class="list-stack" style="margin-top:10px">
          ${top.map(e => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(e.name)}</span>
                <span class="list-row-sub">${e.average_rating || 0} / 5</span>
              </div>
              <span class="list-row-price">${fmtCur(e.total_earnings)}</span>
            </li>
          `).join('') || '<li class="empty-row">No data</li>'}
        </ul>
      </div>
    </section>
  `;
}