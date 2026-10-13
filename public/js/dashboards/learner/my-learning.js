/* ============================================================
   dashboards/learner/my-learning.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const enrollments = S.enrollments || [];
    const inProgress = enrollments.filter(e => Number(e.progress || 0) > 0 && Number(e.progress || 0) < 100);
    const notStarted = enrollments.filter(e => Number(e.progress || 0) === 0);
    const completed  = enrollments.filter(e => Number(e.progress || 0) >= 100);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'My Learning' }])}
      ${EH.Layout.pageHeader('My Learning')}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'In Progress', value: inProgress.length,
          icon: 'fa-play-circle', tone: 'blue' }),
        EH.Layout.statCard({ label: 'Not Started', value: notStarted.length,
          icon: 'fa-hourglass-start', tone: 'yellow' }),
        EH.Layout.statCard({ label: 'Completed', value: completed.length,
          icon: 'fa-check-circle', tone: 'green' }),
        EH.Layout.statCard({ label: 'Certificates', value: S.certificates.length,
          icon: 'fa-award', tone: 'purple' }),
      ])}

      ${inProgress.length ? `
        <section class="panel">
          <h3 class="panel-title">In Progress</h3>
          ${inProgress.map(e => `
            <article class="enrollment-card">
              <h3 class="enrollment-title">${EH.Fmt.esc(e.title || '')}</h3>
              <p class="enrollment-type">${EH.Fmt.esc(e.enrollment_type || '')}</p>
              <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
              <p class="enrollment-progress">${e.progress || 0}% complete</p>
              <button class="btn btn-primary btn-sm" data-action="update-progress"
                      data-id="${e.id}" data-current="${e.progress || 0}">
                <i class="fas fa-play"></i> Update Progress</button>
            </article>`).join('')}
        </section>` : ''}

      ${notStarted.length ? `
        <section class="panel">
          <h3 class="panel-title">Not Started</h3>
          ${notStarted.map(e => `
            <article class="enrollment-card">
              <h3 class="enrollment-title">${EH.Fmt.esc(e.title || '')}</h3>
              <p class="enrollment-type">${EH.Fmt.esc(e.enrollment_type || '')}</p>
              <button class="btn btn-success btn-sm" data-action="update-progress"
                      data-id="${e.id}" data-current="0">
                <i class="fas fa-play"></i> Start Learning</button>
            </article>`).join('')}
        </section>` : ''}

      ${completed.length ? `
        <section class="panel">
          <h3 class="panel-title">Completed</h3>
          ${completed.map(e => `
            <article class="enrollment-card">
              <h3 class="enrollment-title">${EH.Fmt.esc(e.title || '')}</h3>
              <p class="enrollment-type">${EH.Fmt.esc(e.enrollment_type || '')}</p>
              <div class="progress-bar"><span style="width:100%;background:var(--accent)"></span></div>
              <p class="enrollment-progress">Completed</p>
            </article>`).join('')}
        </section>` : ''}

      ${!enrollments.length ? `
        <section class="panel">
          <div class="empty-state">
            <i class="fas fa-graduation-cap"></i>
            <h3>No enrollments yet</h3>
            <p>Explore the E-School to start learning.</p>
            <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">
              <i class="fas fa-search"></i> Explore Courses</button>
          </div>
        </section>` : ''}`;
  }

  EH.LearnerMyLearning = { render };
})(window);
