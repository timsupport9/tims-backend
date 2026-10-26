/* ============================================================
   ExpertHub 2.0 — dashboards/user/overview.js
   Overview / dashboard landing page.
   ============================================================ */

function renderUserOverview() {
  const intent = S.userIntent || currentUser?.intent || 'both';
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const activeCons = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session']
      .includes(c.status)
  ).length;

  const inProgress = S.enrollments.filter(e => e.progress > 0 && e.progress < 100).slice(0, 3);
  const completedCount = S.enrollments.filter(e => Number(e.progress) >= 100).length;
  const xp     = S.userXP || 0;
  const level  = S.userLevel || levelFromXP(xp);
  const streak = S.userStreak?.current || 0;
  const upcoming = mine
    .filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date()
      && !['cancelled','expired','no_show'].includes(c.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 3);
  const recommended = S.courses.filter(c => !S.enrolledCourseIds.has(String(c.id))).slice(0, 3);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Welcome, ${esc(currentUser?.name || 'User')}</h1>
      <div class="page-actions">
        <span class="chip chip-neutral">
          Mode: ${intent === 'both' ? 'Learning + Consulting' : intent === 'learn' ? 'Learning' : 'Consulting'}
        </span>
        <button class="btn btn-secondary btn-sm" data-action="change-intent">
          <i class="fas fa-sliders"></i> Change Mode</button>
      </div>
    </section>

    ${UserUI.stats([
      { label: 'Level',              value: level,         sub: `${xp} XP`,               icon: 'fa-medal',           tone: 'purple' },
      { label: 'Current Streak',     value: `${streak}d`,  sub: `Longest ${S.userStreak?.longest || 0}d`, icon: 'fa-fire', tone: 'red' },
      { label: 'Enrollments',        value: S.enrollments.length, sub: `${completedCount} completed`, icon: 'fa-graduation-cap', tone: 'blue' },
      { label: 'Active Consultations', value: activeCons,  icon: 'fa-comments',           tone: 'green' },
      { label: 'Wallet Balance',     value: fmtCur(S.wallet.balance || 0), icon: 'fa-wallet', tone: 'yellow' },
      { label: 'Badges Earned',      value: S.userBadges.length, icon: 'fa-award',       tone: 'purple' },
    ])}

    ${inProgress.length ? `
      <section class="panel">
        <h3 class="panel-title">Continue Learning</h3>
        ${inProgress.map(e => `
          <div class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
            <p class="enrollment-progress">${e.progress || 0}% complete</p>
            <button class="btn btn-primary btn-sm" data-action="open-course-player" data-id="${e.course_id}">
              <i class="fas fa-play"></i> Resume</button>
          </div>
        `).join('')}
      </section>
    ` : ''}

    ${upcoming.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Sessions</h3>
        ${upcoming.map(c => `
          <div class="consultation-card">
            <header class="consultation-card-header">
              <div>
                <h4 class="consultation-card-title">${esc(c.title)}</h4>
                <p class="consultation-card-meta">${UserUI.statusPill(c.status)}</p>
              </div>
              <div class="consultation-card-price">${fmtCur(c.price || 0)}</div>
            </header>
            <div class="consultation-card-body">
              <div class="consultation-card-expert">
                <img class="user-avatar" src="${avatar({ name: c.expert_name })}" alt="" />
                <div>
                  <div class="user-name">${esc(c.expert_name || 'Expert')}</div>
                  <div class="user-email">${esc(c.expert_specialization || '')}</div>
                </div>
              </div>
              <div class="consultation-card-time">
                <i class="fas fa-calendar"></i>
                <strong>${UserHelpers.fmtInTz(c.scheduled_at, currentUser?.timezone)}</strong>
                <span class="consultation-card-countdown">${UserHelpers.timeUntil(c.scheduled_at)}</span>
              </div>
            </div>
            <footer class="consultation-card-actions">
              <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}">
                <i class="fas fa-video"></i> Join</button>
              <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
                <i class="fas fa-comments"></i> Chat</button>
            </footer>
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

    <section class="panel">
      <h3 class="panel-title">Recommended For You</h3>
      ${recommended.length ? `
        <div class="card-grid">
          ${recommended.map(c => `
            <article class="program-card">
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <h4 class="program-title">${esc(c.title || '')}</h4>
              <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
              <footer class="program-footer">
                <span class="program-price">${fmtCur(c.price || 0)}</span>
                <span class="program-meta">${esc(c.level || '')}</span>
              </footer>
              <div class="panel-actions" style="margin-top:10px">
                <button class="btn btn-primary btn-sm" data-action="view-course-detail" data-id="${c.id}">
                  <i class="fas fa-eye"></i> View</button>
              </div>
            </article>
          `).join('')}
        </div>
      ` : '<p class="empty-row">No recommendations yet — browse the E-School.</p>'}
    </section>
  `;
}

window.ExpertHubUser.registerModule('overview', renderUserOverview);
window.ExpertHubUser.registerModule('dashboard', renderUserOverview);

/* Actions */
window.ExpertHubUser.registerAction('change-intent', async () => {
  UserUI.formModal({
    title: 'Choose your mode',
    fields: [{
      name: 'intent', label: 'Mode', type: 'select',
      value: S.userIntent || 'both',
      options: [
        { value: 'both',    label: 'Both — Learning and Consulting' },
        { value: 'learn',   label: 'Learning only' },
        { value: 'consult', label: 'Consulting only' },
      ],
      hint: 'This controls what appears on your dashboard. You can change it anytime.',
    }],
    submitLabel: 'Save',
    onSubmit: async (v) => {
      S.userIntent = v.intent;
      try { await apiCall('/api/user/preferences', 'PUT', { intent: S.userIntent }); } catch {}
      closeModal();
      rerenderRoleContent();
      showToast('Mode updated', 'success');
    },
  });
});
