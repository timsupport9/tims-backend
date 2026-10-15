/* ============================================================
   ExpertHub 2.0 — 02-overview.js
   Learner dashboard overview panel.
   ============================================================ */

function userOverview() {
  const intent = S.userIntent || currentUser?.intent || 'both';
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const activeCons = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session'].includes(c.status)
  ).length;

  const inProgress = S.enrollments.filter(e => e.progress > 0 && e.progress < 100).slice(0, 3);
  const completedCount = S.enrollments.filter(e => Number(e.progress) >= 100).length;
  const totalProgress = S.enrollments.length
    ? Math.round(S.enrollments.reduce((s, e) => s + Number(e.progress || 0), 0) / S.enrollments.length)
    : 0;

  const xp = S.userXP || 0;
  const level = S.userLevel || levelFromXP(xp);
  const streak = S.userStreak?.current || 0;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Welcome, ${esc(currentUser?.name || 'User')}</h1>
      <div class="page-actions">
        <span class="chip chip-neutral">
          Mode: ${intent === 'both' ? 'Learning and Consulting' : intent === 'learn' ? 'Learning' : 'Consulting'}
        </span>
        <button class="btn btn-secondary btn-sm" data-action="change-intent">
          <i class="fas fa-sliders"></i> Change Mode</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Level</p>
          <p class="stat-value">${level}</p>
          <p class="stat-sub">${xp} XP total</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-medal"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Current Streak</p>
          <p class="stat-value">${streak}</p>
          <p class="stat-sub">Longest: ${S.userStreak?.longest || 0} days</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-fire"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Enrollments</p>
          <p class="stat-value">${S.enrollments.length}</p>
          <p class="stat-sub">${completedCount} completed</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-graduation-cap"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Consultations</p>
          <p class="stat-value">${activeCons}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Wallet Balance</p>
          <p class="stat-value">${fmtCur(S.wallet.balance || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-wallet"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Badges Earned</p>
          <p class="stat-value">${S.userBadges.length}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-award"></i></div>
      </div>
    </section>

    ${inProgress.length ? `
      <section class="panel">
        <h3 class="panel-title">Continue Learning</h3>
        ${inProgress.map(e => `
          <div class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
            <p class="enrollment-progress">${e.progress || 0}% complete</p>
            <button class="btn btn-primary btn-sm" data-action="resume-course" data-id="${e.id}">
              <i class="fas fa-play"></i> Resume</button>
          </div>
        `).join('')}
      </section>
    ` : ''}

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
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-trophy tile-icon"></i>
          <h3 class="tile-title">Achievements</h3>
          <p class="tile-desc">${S.userBadges.length} badge${S.userBadges.length === 1 ? '' : 's'} earned</p>
          <button class="btn btn-warning" data-action="switch-tab" data-tab="achievements">View</button>
        </article>
      ` : ''}
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
        </article>
      ` : ''}
      <article class="dashboard-card tile-card">
        <i class="fas fa-certificate tile-icon"></i>
        <h3 class="tile-title">Certificates</h3>
        <p class="tile-desc">${S.certificates.length} earned</p>
        <button class="btn btn-info" data-action="switch-tab" data-tab="certificates">View</button>
      </article>
    </section>
  `;
}
