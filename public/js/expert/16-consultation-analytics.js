/* ============================================================
   ExpertHub 2.0 — js/expert/16-consultation-analytics.js
   Expert consultation statistics.
   ============================================================ */

function expertConsultationAnalytics() {
  const a = S.expertConsultationAnalytics || { stats: {}, peak_hours: [] };
  const s = a.stats || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Stats</span></div>
    <section class="page-header"><h1 class="page-title">Consultation Statistics</h1></section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed Sessions</p><p class="stat-value">${s.completed_sessions || 0}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Unique Clients</p><p class="stat-value">${s.unique_clients || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Duration</p><p class="stat-value">${Math.round(s.avg_duration || 0)}m</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Cancellations</p><p class="stat-value">${s.cancelled || 0}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-times"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Peak Booking Hours</h3>
      <ul class="list-stack">
        ${(a.peak_hours || []).map(h => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${String(h.hr).padStart(2, '0')}:00</span>
            </div>
            <span class="chip chip-neutral">${h.c} booking${h.c === 1 ? '' : 's'}</span>
          </li>
        `).join('') || '<li class="empty-row">No booking data</li>'}
      </ul>
    </section>
  `;
}
