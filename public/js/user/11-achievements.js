/* ============================================================
   ExpertHub 2.0 — 11-achievements.js
   XP, levels, streaks and badges.
   ============================================================ */

/* ============================================================
   E-SCHOOL — ACHIEVEMENTS
   ============================================================ */
function userAchievements() {
  const xp = S.userXP || 0;
  const level = S.userLevel || levelFromXP(xp);
  const streak = S.userStreak || { current: 0, longest: 0 };
  const badges = S.userBadges || [];
  const allBadges = Object.entries(CONFIG.BADGES).map(([code, b]) => ({ code, ...b }));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Achievements</span></div>
    <section class="page-header"><h1 class="page-title">Achievements</h1></section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Current Level</p>
          <p class="stat-value">${level}</p>
          <p class="stat-sub">${xp} XP total</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-medal"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Current Streak</p>
          <p class="stat-value">${streak.current} days</p>
          <p class="stat-sub">Best: ${streak.longest} days</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-fire"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Badges Earned</p>
          <p class="stat-value">${badges.length}</p>
          <p class="stat-sub">of ${allBadges.length} available</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-trophy"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Courses Completed</p>
          <p class="stat-value">${S.enrollments.filter(e => e.progress >= 100).length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Level Progress</h3>
      <div class="level-progress-wrap">
        <div class="level-badge">
          <i class="fas fa-medal"></i>
          <span>Level ${level}</span>
        </div>
        <div class="progress-bar">
          <span style="width:${xpProgressPercent(xp)}%"></span>
        </div>
        <p class="form-hint">
          ${xp} / ${xpForLevel(level + 1)} XP to next level
        </p>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Badges</h3>
      <div class="badge-grid">
        ${allBadges.map(b => {
          const earned = badges.some(x => x.badge_code === b.code);
          return `
            <div class="badge-card ${earned ? 'badge-earned' : 'badge-locked'}">
              <i class="fas ${b.icon}"></i>
              <span class="badge-name">${b.name}</span>
              ${earned
                ? '<span class="badge-label">Earned</span>'
                : '<span class="badge-label">Locked</span>'}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}
