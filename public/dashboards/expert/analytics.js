/* ============================================================
   dashboards/expert/analytics.js
   ============================================================ */

function renderExpertAnalytics() {
  const a = S.expertAnalytics || {};

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Business Intelligence</span></div>
    <section class="page-header">
      <h1 class="page-title">Business Intelligence</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-expert-action="export-analytics">
          <i class="fas fa-download"></i> Export</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Profile Views (30d)</p>
          <p class="stat-value">${a.profile_views || 0}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-eye"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Bookings (30d)</p>
          <p class="stat-value">${a.bookings_month || 0}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-calendar-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Rating</p>
          <p class="stat-value">${a.avg_rating || '0.0'}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Repeat Clients</p>
          <p class="stat-value">${a.repeat_clients || 0}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Revenue (30d)</p>
          <p class="stat-value">${fmtCur(a.revenue_30d || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Booking Conversion</p>
          <p class="stat-value">${a.conversion_rate || 0}%</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-funnel-dollar"></i></div>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Utilisation</h3>
        <canvas id="expertUtilChart" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Demand by Day</h3>
        <canvas id="expertDemandChart" height="200"></canvas>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Service Demand</h3>
      <ul class="list-stack">
        ${(a.service_demand || []).map(s => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(s.name || '')}</span>
              <span class="list-row-sub">${s.bookings || 0} bookings</span>
            </div>
            <span class="chip chip-blue">${fmtCur(s.revenue || 0)}</span>
          </li>
        `).join('') || '<li class="empty-row">No service data yet</li>'}
      </ul>
    </section>

    <section class="panel">
      <h3 class="panel-title">Smart Recommendations</h3>
      <div class="alert alert-info">
        <i class="fas fa-lightbulb"></i>
        <div>
          ${a.recommendations?.length
            ? a.recommendations.map(r => `<p>${esc(r)}</p>`).join('')
            : 'No recommendations at this time — keep publishing and engaging clients.'}
        </div>
      </div>
    </section>
  `;
}
