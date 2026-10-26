/* ============================================================
   ExpertHub 2.0 — dashboards/user/achievements.js
   XP, level, streak, badges.
   ============================================================ */

function renderUserAchievements() {
  const xp     = S.userXP || 0;
  const level  = S.userLevel || UserHelpers.levelFromXP(xp);
  const streak = S.userStreak || { current: 0, longest: 0 };
  const badges = S.userBadges || [];
  const allBadges = Object.entries(CONFIG.BADGES).map(([code, b]) => ({ code, ...b }));

  return UserUI.page({
    title: 'Achievements',
    breadcrumb: 'Achievements',
    content: `
      ${UserUI.stats([
        { label: 'Current Level',  value: level,        sub: `${xp} XP total`,            icon: 'fa-medal', tone: 'purple' },
        { label: 'Current Streak', value: `${streak.current} days`, sub: `Best ${streak.longest} days`, icon: 'fa-fire', tone: 'red' },
        { label: 'Badges Earned',  value: badges.length, sub: `of ${allBadges.length}`,   icon: 'fa-trophy', tone: 'yellow' },
        { label: 'Courses Done',   value: S.enrollments.filter(e => e.progress >= 100).length, icon: 'fa-check-circle', tone: 'green' },
      ])}

      <section class="panel">
        <h3 class="panel-title">Level Progress</h3>
        <div class="level-progress-wrap">
          <div class="level-badge"><i class="fas fa-medal"></i><span>Level ${level}</span></div>
          <div class="progress-bar"><span style="width:${UserHelpers.xpProgressPercent(xp)}%"></span></div>
          <p class="form-hint">${xp} / ${UserHelpers.xpForLevel(level + 1)} XP to next level</p>
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
                <span class="badge-name">${esc(b.name)}</span>
                <span class="badge-label">${earned ? 'Earned' : 'Locked'}</span>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('achievements', renderUserAchievements);
