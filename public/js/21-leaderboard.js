/* ============================================================
   ExpertHub 2.0 — 21-leaderboard.js
   Leaderboards (friends / cohort / global / institution),
   weekly challenges, XP decay anti-abuse.
   ============================================================ */

/* ============================================================
   DASHBOARD TAB
   ============================================================ */
function userLeaderboard() {
  const scope = S.__leaderboardScope || 'cohort';
  const data = getLeaderboard(scope);
  const challenges = getWeeklyChallenges();

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Leaderboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Leaderboard &amp; Challenges</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="refresh-leaderboard">
          <i class="fas fa-sync"></i> Refresh</button>
      </div>
    </section>

    <section class="panel">
      <nav class="tab-bar">
        ${['friends','cohort','institution','global'].map(s => `
          <button class="tab-btn ${scope === s ? 'tab-btn-active' : ''}"
                  data-lb-scope="${s}">
            <i class="fas ${s === 'friends' ? 'fa-user-friends' : s === 'cohort' ? 'fa-users' : s === 'institution' ? 'fa-university' : 'fa-globe'}"></i>
            ${s[0].toUpperCase() + s.slice(1)}
          </button>
        `).join('')}
      </nav>

      <div class="leaderboard" style="margin-top:14px">
        ${data.map((r, i) => renderLeaderboardRow(r, i)).join('') ||
          '<div class="empty-state"><i class="fas fa-trophy"></i><h3>No data yet</h3><p>Earn XP to appear here.</p></div>'}
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Weekly Challenges</h3>
      ${challenges.map(c => renderChallengeCard(c)).join('')}
    </section>

    <section class="panel">
      <h3 class="panel-title">XP Insights</h3>
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>XP earned more than 30 days ago is decayed by 5%/week, so recent work counts most.
        This keeps the leaderboard fresh and rewards consistent effort.</div>
      </div>
      <div class="stat-grid">
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Lifetime XP</p>
            <p class="stat-value">${S.userXP || 0}</p>
          </div>
          <div class="stat-icon stat-icon-purple"><i class="fas fa-star"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Decayed (effective)</p>
            <p class="stat-value">${computeEffectiveXP(S.userXP || 0, S.userXPHistory || [])}</p>
          </div>
          <div class="stat-icon stat-icon-yellow"><i class="fas fa-hourglass-half"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">This week</p>
            <p class="stat-value">${computeWeeklyXP(S.userXPHistory || [])}</p>
          </div>
          <div class="stat-icon stat-icon-green"><i class="fas fa-calendar-week"></i></div>
        </div>
      </div>
    </section>
  `;
}

/* ============================================================
   SCOPES
   ============================================================ */
function getLeaderboard(scope) {
  // Prefer server data, fall back to local mock derived from S
  if (S.leaderboards && S.leaderboards[scope]) return S.leaderboards[scope].slice(0, 50);

  // Fallback: synthesize from group members + current user
  const rows = [];
  const me = currentUser || { id: 'me', name: 'You' };

  const push = (u) => {
    if (!u) return;
    rows.push({
      id: u.id,
      name: u.name || 'Learner',
      xp: computeEffectiveXP(u.xp || 0, u.xpHistory || []),
      level: u.level || levelFromXP(u.xp || 0),
      streak: u.streak || 0,
      avatar_url: u.avatar_url || null,
    });
  };

  push({ ...me, xp: S.userXP, level: S.userLevel, streak: S.userStreak?.current });

  const groups = S.studyGroups || [];
  groups.forEach(g => (g.members || []).forEach(m => push(m)));

  const unique = Array.from(new Map(rows.map(r => [r.id, r])).values());
  unique.sort((a, b) => b.xp - a.xp);
  return unique;
}

function renderLeaderboardRow(r, idx) {
  const rank = idx + 1;
  const isMe = r.id === currentUser?.id;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;
  return `
    <div class="leaderboard-row ${isMe ? 'is-me' : ''}">
      <span class="leaderboard-rank">${medal}</span>
      <img class="user-avatar" src="${avatar(r)}" alt="" />
      <div class="leaderboard-name">
        <div class="user-name">${esc(r.name)}${isMe ? ' (you)' : ''}</div>
        <div class="user-email">Level ${r.level || 1}${r.streak ? ' · ' + r.streak + '🔥' : ''}</div>
      </div>
      <span class="leaderboard-xp">${r.xp || 0} XP</span>
    </div>`;
}

/* ============================================================
   WEEKLY CHALLENGES
   ============================================================ */
function getWeeklyChallenges() {
  if (S.weeklyChallenges && S.weeklyChallenges.length) return S.weeklyChallenges;
  return [
    { id: 'wc-1', title: 'Complete 3 lessons', target: 3,  current: countLessonsThisWeek(), reward_xp: 150, icon: 'fa-book-open' },
    { id: 'wc-2', title: 'Pass 1 quiz',         target: 1,  current: countQuizzesThisWeek(),  reward_xp: 200, icon: 'fa-question-circle' },
    { id: 'wc-3', title: 'Study 5 days in a row', target: 5, current: S.userStreak?.current || 0, reward_xp: 300, icon: 'fa-fire' },
    { id: 'wc-4', title: 'Book a consultation', target: 1,  current: countConsultationsThisWeek(), reward_xp: 250, icon: 'fa-comments' },
  ];
}

function renderChallengeCard(c) {
  const pct = Math.min(100, Math.round((c.current / c.target) * 100));
  const done = c.current >= c.target;
  return `
    <article class="challenge-card ${done ? 'is-done' : ''}">
      <div class="challenge-icon"><i class="fas ${c.icon}"></i></div>
      <div class="challenge-body">
        <div class="challenge-head">
          <strong>${esc(c.title)}</strong>
          <span class="chip chip-green">+${c.reward_xp} XP</span>
        </div>
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
        <div class="challenge-meta">${c.current} / ${c.target} ${done ? '· Complete ✓' : ''}</div>
      </div>
    </article>`;
}

function countLessonsThisWeek() {
  if (typeof window.EHFeature11?.load === 'function') {
    const hist = window.EHFeature11.load('lesson.history') || [];
    const cutoff = Date.now() - 7 * 86400000;
    return hist.filter(x => new Date(x.at || 0).getTime() > cutoff).length;
  }
  return 0;
}
function countQuizzesThisWeek() {
  return (S.quizAttempts || []).filter(a => {
    const t = new Date(a.submitted_at || a.started_at || 0).getTime();
    return t > Date.now() - 7 * 86400000;
  }).length;
}
function countConsultationsThisWeek() {
  return (S.consultations || []).filter(c => {
    const t = new Date(c.created_at || c.scheduled_at || 0).getTime();
    return t > Date.now() - 7 * 86400000 && c.user_id === currentUser?.id;
  }).length;
}

/* ============================================================
   XP DECAY
   ============================================================ */
function computeEffectiveXP(lifetime, history) {
  if (!Array.isArray(history) || !history.length) return lifetime;
  const now = Date.now();
  const STALE_AFTER = 30 * 86400000;
  const DECAY_PER_WEEK = 0.05;

  return Math.round(history.reduce((sum, h) => {
    const age = now - new Date(h.at || h.timestamp || 0).getTime();
    if (age <= STALE_AFTER) return sum + (h.amount || 0);
    const weeksStale = Math.floor((age - STALE_AFTER) / (7 * 86400000));
    const factor = Math.pow(1 - DECAY_PER_WEEK, weeksStale);
    return sum + (h.amount || 0) * factor;
  }, 0));
}

function computeWeeklyXP(history) {
  if (!Array.isArray(history)) return 0;
  const cutoff = Date.now() - 7 * 86400000;
  return history
    .filter(h => new Date(h.at || h.timestamp || 0).getTime() > cutoff)
    .reduce((s, h) => s + (h.amount || 0), 0);
}

/* ============================================================
   DELEGATED HANDLERS
   ============================================================ */
document.addEventListener('click', e => {
  const tab = e.target.closest('[data-lb-scope]');
  if (tab) {
    S.__leaderboardScope = tab.dataset.lbScope;
    if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
    return;
  }
  const refresh = e.target.closest('[data-action="refresh-leaderboard"]');
  if (refresh) {
    apiCall('/api/leaderboard')
      .then(d => { S.leaderboards = d.leaderboards || S.leaderboards; rerenderCurrentTab(); })
      .catch(() => showToast('Refresh failed', 'error'));
  }
});

function rerenderCurrentTab() {
  if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();