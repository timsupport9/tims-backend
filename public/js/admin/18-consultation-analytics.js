/* ============================================================
   ExpertHub 2.0 — js/admin/18-consultation-analytics.js
   Admin consultation analytics.
   ============================================================ */

function adminConsultationAnalytics() {
  const a = S.adminConsultationAnalytics || { totals: {}, cancellation_reasons: [] };
  const t = a.totals || {};
  const byExpert = a.topExperts || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Analytics</span></div>
    <section class="page-header"><h1 class="page-title">Consultation Analytics</h1></section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Consultations</p><p class="stat-value">${t.total || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${t.completed || 0}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Price</p><p class="stat-value">${fmtCur(t.avg_price || 0)}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">No-Shows</p><p class="stat-value">${t.no_shows || 0}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-user-slash"></i></div>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Consultations by Status</h3>
        <canvas id="chartConsultationsByStatus" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Top Experts by Revenue</h3>
        <canvas id="chartTopExpertsRevenue" height="200"></canvas>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Top Experts</h3>
      <ul class="list-stack">
        ${byExpert.map(e => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(e.name)}</span>
              <span class="list-row-sub">${e.consultations || 0} consults · ${e.avg_rating || 0} rating</span>
            </div>
            <span class="list-row-price">${fmtCur(e.total_earnings || 0)}</span>
          </li>
        `).join('') || '<li class="empty-row">No data</li>'}
      </ul>
    </section>
  `;
}