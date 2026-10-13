/* ============================================================
   dashboards/learner/overview.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const intent = S.userIntent || S.currentUser?.intent || 'both';
    const mine = S.consultations.filter(c => c.user_id === S.currentUser?.id);
    const activeCons = mine.filter(c => ['pending', 'assigned', 'in_progress'].includes(c.status)).length;

    const inProgress = S.enrollments.filter(e =>
      Number(e.progress || 0) > 0 && Number(e.progress || 0) < 100).slice(0, 3);
    const completedCount = S.enrollments.filter(e => Number(e.progress || 0) >= 100).length;
    const totalProgress = S.enrollments.length
      ? Math.round(S.enrollments.reduce((s, e) => s + Number(e.progress || 0), 0) / S.enrollments.length)
      : 0;

    const intentLabel = intent === 'both' ? 'Learning & Consulting'
      : intent === 'learn' ? 'Learning' : 'Consulting';

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Dashboard' }])}
      ${EH.Layout.pageHeader(`Welcome, ${EH.Fmt.esc(S.currentUser?.name || 'User')}`, {
        actions: `
          <span class="chip chip-neutral">Mode: ${EH.Fmt.esc(intentLabel)}</span>
          <button class="btn btn-secondary btn-sm" data-action="change-intent">
            <i class="fas fa-sliders"></i> Change Mode</button>`,
      })}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({
          label: 'Enrollments', value: S.enrollments.length,
          sub: `${completedCount} completed`, icon: 'fa-graduation-cap', tone: 'blue',
        }),
        EH.Layout.statCard({
          label: 'Active Consultations', value: activeCons,
          icon: 'fa-comments', tone: 'green',
        }),
        EH.Layout.statCard({
          label: 'Wallet Balance', value: EH.Fmt.cur(S.wallet.balance || 0),
          icon: 'fa-wallet', tone: 'yellow',
        }),
        EH.Layout.statCard({
          label: 'Avg. Progress', value: `${totalProgress}%`,
          icon: 'fa-chart-line', tone: 'purple',
        }),
      ])}

      ${inProgress.length ? `
        <section class="panel">
          <h3 class="panel-title">Continue Learning</h3>
          ${inProgress.map(e => `
            <div class="enrollment-card">
              <h3 class="enrollment-title">${EH.Fmt.esc(e.title || '')}</h3>
              <p class="enrollment-type">${EH.Fmt.esc(e.enrollment_type || '')}</p>
              <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
              <p class="enrollment-progress">${e.progress || 0}% complete</p>
              <button class="btn btn-primary btn-sm" data-action="update-progress"
                      data-id="${e.id}" data-current="${e.progress || 0}">
                <i class="fas fa-play"></i> Resume</button>
            </div>`).join('')}
        </section>` : ''}

      <section class="dashboard-columns">
        ${intent !== 'consult' ? `
          <article class="dashboard-card tile-card">
            <i class="fas fa-school tile-icon"></i>
            <h3 class="tile-title">E-School</h3>
            <p class="tile-desc">Bootcamps, courses, tuition and exam prep</p>
            <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">Explore</button>
          </article>
          <article class="dashboard-card tile-card">
            <i class="fas fa-graduation-cap tile-icon"></i>
            <h3 class="tile-title">My Learning</h3>
            <p class="tile-desc">Continue where you left off</p>
            <button class="btn btn-info" data-action="switch-tab" data-tab="my-learning">Open</button>
          </article>` : ''}
        ${intent !== 'learn' ? `
          <article class="dashboard-card tile-card">
            <i class="fas fa-user-tie tile-icon"></i>
            <h3 class="tile-title">Find Experts</h3>
            <p class="tile-desc">Book 1-on-1 consultations</p>
            <button class="btn btn-success" data-action="switch-tab" data-tab="experts">Browse</button>
          </article>
          <article class="dashboard-card tile-card">
            <i class="fas fa-comments tile-icon"></i>
            <h3 class="tile-title">Consultations</h3>
            <p class="tile-desc">${activeCons} active request${activeCons === 1 ? '' : 's'}</p>
            <button class="btn btn-purple" data-action="switch-tab" data-tab="consultations">Open</button>
          </article>` : ''}
        <article class="dashboard-card tile-card">
          <i class="fas fa-wallet tile-icon"></i>
          <h3 class="tile-title">Wallet</h3>
          <p class="tile-desc">Balance: ${EH.Fmt.cur(S.wallet.balance || 0)}</p>
          <button class="btn btn-warning" data-action="switch-tab" data-tab="wallet">Manage</button>
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-certificate tile-icon"></i>
          <h3 class="tile-title">Certificates</h3>
          <p class="tile-desc">${S.certificates.length} earned</p>
          <button class="btn btn-info" data-action="switch-tab" data-tab="certificates">View</button>
        </article>
      </section>

      ${activeCons ? `
        <section class="panel">
          <h3 class="panel-title">Active Consultations</h3>
          <ul class="list-stack">
            ${mine
              .filter(c => ['pending', 'assigned', 'in_progress'].includes(c.status))
              .slice(0, 5)
              .map(c => `
                <li class="list-row">
                  <div class="list-row-main">
                    <span class="list-row-title">${EH.Fmt.esc(c.title || '')}</span>
                    <span class="list-row-sub">Expert: ${EH.Fmt.esc(c.expert_name || 'Unassigned')}</span>
                  </div>
                  <span class="${EH.Fmt.statusClass(c.status)}">${EH.Fmt.esc(c.status)}</span>
                </li>`).join('')}
          </ul>
        </section>` : ''}`;
  }

  EH.LearnerOverview = { render };
})(window);
