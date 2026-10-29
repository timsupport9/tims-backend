/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/achievements.js */
/* Achievements: server-validated XP/badges/streaks. */
/* No client-triggerable awards. */
/* ============================================================ */

let __achievementsRefreshing = false;

async function _refreshAchievements() {
  if (__achievementsRefreshing) return;
  __achievementsRefreshing = true;
  try {
    const d = await apiCall('/api/user/achievements');
    if (d) {
      S.userXP     = d.xp || 0;
      S.userLevel  = d.level || UserHelpers.levelFromXP(S.userXP);
      S.userBadges = d.badges || [];
      S.userStreak = d.streak || S.userStreak;
    }
  } catch {}
  finally { __achievementsRefreshing = false; }
}

function renderUserAchievements() {
  const xp     = S.userXP || 0;
  const level  = S.userLevel || UserHelpers.levelFromXP(xp);
  const streak = S.userStreak || { current: 0, longest: 0 };
  const badges = S.userBadges || [];
  const allBadges = Object.entries(CONFIG.BADGES || {}).map(([code, b]) => ({ code, ...b }));

  const sortedBadges = allBadges.slice().sort((a, b) => {
    const ea = badges.some(x => x.badge_code === a.code) ? 0 : 1;
    const eb = badges.some(x => x.badge_code === b.code) ? 0 : 1;
    return ea - eb;
  });

  const nextLevelXP = UserHelpers.xpForLevel(level + 1);
  const earnedAtMap = new Map(badges.map(b => [b.badge_code, b.awarded_at]));

  return UserUI.page({
    title: 'Achievements',
    breadcrumb: 'Achievements',
    actions: `<button class="btn btn-secondary" data-action="refresh-achievements">
                <i class="fas fa-rotate-right"></i> Refresh</button>`,
    content: `
      ${UserUI.stats([
        { label: 'Current Level',  value: level,        sub: `${xp} XP total`,            icon: 'fa-medal', tone: 'purple' },
        { label: 'Current Streak', value: `${streak.current} days`, sub: `Best ${streak.longest} days`, icon: 'fa-fire', tone: 'red' },
        { label: 'Badges Earned',  value: badges.length, sub: `of ${allBadges.length}`,   icon: 'fa-trophy', tone: 'yellow' },
        { label: 'Courses Done',   value: (S.enrollments || []).filter(e => e.progress >= 100).length, icon: 'fa-check-circle', tone: 'green' },
      ])}

      <section class="panel">
        <h3 class="panel-title">Level Progress</h3>
        <div class="level-progress-wrap">
          <div class="level-badge"><i class="fas fa-medal"></i><span>Level ${level}</span></div>
          <div class="progress-bar"><span style="width:${UserHelpers.xpProgressPercent(xp)}%"></span></div>
          <p class="form-hint">${xp} / ${nextLevelXP} XP to next level</p>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">Badges</h3>
        <div class="badge-grid">
          ${sortedBadges.map(b => {
            const earned = badges.some(x => x.badge_code === b.code);
            const at = earnedAtMap.get(b.code);
            return `
              <div class="badge-card ${earned ? 'badge-earned' : 'badge-locked'}"
                   title="${esc(b.desc || '')}">
                <i class="fas ${b.icon}"></i>
                <span class="badge-name">${esc(b.name)}</span>
                <span class="badge-label">
                  ${earned ? (at ? `Earned ${fmtDate(at)}` : 'Earned') : 'Locked'}
                </span>
                ${!earned ? `<span class="badge-hint">${esc(b.desc || '')}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('achievements', renderUserAchievements);

window.ExpertHubUser.registerAction('refresh-achievements', async () => {
  await _refreshAchievements();
  rerenderRoleContent();
  showToast('Achievements refreshed', 'success');
});
