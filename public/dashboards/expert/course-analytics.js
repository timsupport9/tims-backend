/* ============================================================
   dashboards/expert/course-analytics.js
   ============================================================ */

function renderExpertCourseAnalytics() {
  const a = S.courseAnalytics || {};
  const courses = a.courses || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Analytics</span></div>
    <section class="page-header">
      <h1 class="page-title">Course Analytics</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-expert-action="export-course-analytics">
          <i class="fas fa-download"></i> Export</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Enrollments</p>
          <p class="stat-value">${a.totalEnrollments || 0}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Completion Rate</p>
          <p class="stat-value">${a.avgCompletion || 0}%</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Rating</p>
          <p class="stat-value">${a.avgRating || 0}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Revenue (30d)</p>
          <p class="stat-value">${fmtCur(a.revenue30d || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-dollar-sign"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Course Performance</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Course</th><th>Enrolled</th><th>Completed</th>
              <th>Avg. Progress</th><th>Rating</th><th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${courses.map(c => `
              <tr>
                <td>${esc(c.title || '')}</td>
                <td>${c.enrolled || 0}</td>
                <td>${c.completed || 0}</td>
                <td>${c.avg_progress || 0}%</td>
                <td>${Number(c.avg_rating || 0).toFixed(1)} / 5</td>
                <td>${fmtCur(c.revenue || 0)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No course data</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Completion by Course</h3>
        <canvas id="expertCourseCompletionChart" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Enrollment Trend</h3>
        <canvas id="expertCourseEnrollChart" height="200"></canvas>
      </div>
    </section>
  `;
}
