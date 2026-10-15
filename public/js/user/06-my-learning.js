/* ============================================================
   ExpertHub 2.0 — 06-my-learning.js
   Learner's enrollments: in-progress, not started, completed.
   ============================================================ */

/* ============================================================
   E-SCHOOL — MY LEARNING
   ============================================================ */
function userMyLearning() {
  const enrollments = S.enrollments || [];
  const inProgress = enrollments.filter(e => Number(e.progress || 0) > 0 && Number(e.progress || 0) < 100);
  const notStarted = enrollments.filter(e => Number(e.progress || 0) === 0);
  const completed = enrollments.filter(e => Number(e.progress || 0) >= 100);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Learning</span></div>
    <section class="page-header">
      <h1 class="page-title">My Learning</h1>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">In Progress</p><p class="stat-value">${inProgress.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-play-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Not Started</p><p class="stat-value">${notStarted.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-hourglass-start"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${completed.length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Certificates</p><p class="stat-value">${S.certificates.length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-award"></i></div>
      </div>
    </section>

    ${inProgress.length ? `
      <section class="panel">
        <h3 class="panel-title">In Progress</h3>
        ${inProgress.map(e => `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
            <p class="enrollment-progress">${e.progress || 0}% complete</p>
            <div class="panel-actions" style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" data-action="open-course-player" data-id="${e.course_id}">
                <i class="fas fa-play"></i> Resume</button>
              <button class="btn btn-secondary btn-sm" data-action="request-refund" data-id="${e.id}">
                <i class="fas fa-rotate-left"></i> Request Refund</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${notStarted.length ? `
      <section class="panel">
        <h3 class="panel-title">Not Started</h3>
        ${notStarted.map(e => `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <button class="btn btn-success btn-sm" data-action="open-course-player" data-id="${e.course_id}">
              <i class="fas fa-play"></i> Start Learning</button>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${completed.length ? `
      <section class="panel">
        <h3 class="panel-title">Completed</h3>
        ${completed.map(e => `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:100%;background:var(--accent)"></span></div>
            <p class="enrollment-progress">Completed ${e.completed_at ? 'on ' + fmtDate(e.completed_at) : ''}</p>
            <div class="panel-actions" style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-sm" data-action="review-course" data-id="${e.course_id}">
                <i class="fas fa-star"></i> Review Course</button>
              <button class="btn btn-info btn-sm" data-action="view-certificate" data-course="${e.course_id}">
                <i class="fas fa-certificate"></i> Certificate</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${!enrollments.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-graduation-cap"></i>
          <h3>No enrollments yet</h3>
          <p>Explore the E-School to start learning.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">
            <i class="fas fa-search"></i> Explore Courses</button>
        </div>
      </section>
    ` : ''}
  `;
}
