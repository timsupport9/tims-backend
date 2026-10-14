/* ============================================================
   ExpertHub 2.0 — 28-digest.js
   Weekly reflection digest: study time, lessons, streaks,
   XP earned, recommended next steps. Auto-scheduled Sunday.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHDigest = window.EHDigest || {};
  const STORAGE = 'eh.digest.v1';
  const SEEN_KEY = 'eh.digest.seen';

  /* ---------- state ---------- */
  function getDigestState() {
    try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); }
    catch (_) { return {}; }
  }
  function saveDigestState(s) {
    try { localStorage.setItem(STORAGE, JSON.stringify(s)); } catch (_) {}
  }

  /* ---------- computation ---------- */
  function buildWeekDigest(weekOffset = 0) {
    const end = new Date();
    end.setDate(end.getDate() - weekOffset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);

    const inRange = (iso) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= start.getTime() && t <= end.getTime();
    };

    // Lessons completed
    const lessonHistory = (window.EHFeature11?.load('lesson.history') || [])
      .filter(x => inRange(x.at));
    const lessonsCompleted = lessonHistory.filter(x => x.completed).length;

    // Study time
    const studyMinutes = lessonHistory.reduce((s, x) => s + (x.minutes || 0), 0);

    // Quizzes
    const quizAttempts = (S.quizAttempts || []).filter(a => inRange(a.submitted_at || a.started_at));
    const quizzesPassed = quizAttempts.filter(a => a.passed).length;
    const quizAvg = quizAttempts.length
      ? Math.round(quizAttempts.reduce((s, a) => s + (a.score || 0), 0) / quizAttempts.length)
      : 0;

    // XP earned this week
    const xpEvents = (S.userXPHistory || []).filter(h => inRange(h.at || h.timestamp));
    const xpEarned = xpEvents.reduce((s, h) => s + (h.amount || 0), 0);

    // Streak
    const streak = S.userStreak?.current || 0;

    // Consultations
    const consultations = (S.consultations || [])
      .filter(c => c.user_id === currentUser?.id && inRange(c.scheduled_at || c.created_at));

    // Badges
    const newBadges = (S.userBadges || []).filter(b => inRange(b.earned_at));

    // Courses progressed
    const enrollments = (S.enrollments || []).filter(e => {
      const lastActive = e.updated_at || e.started_at;
      return inRange(lastActive);
    });

    // Recommended next steps
    const recommendations = buildRecommendations({ lessonsCompleted, streak, xpEarned });

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      lessonsCompleted,
      studyMinutes,
      quizzesPassed,
      quizAttempts: quizAttempts.length,
      quizAvg,
      xpEarned,
      streak,
      consultations: consultations.length,
      newBadges: newBadges.length,
      coursesTouched: enrollments.length,
      recommendations,
    };
  }

  function buildRecommendations({ lessonsCompleted, streak, xpEarned }) {
    const out = [];
    if (lessonsCompleted === 0) {
      out.push({ icon: 'fa-play', text: 'Even 10 minutes of learning counts — pick up where you left off.' });
    } else if (lessonsCompleted < 3) {
      out.push({ icon: 'fa-arrow-up', text: 'Aim for 3 lessons next week — that\'s the sweet spot for retention.' });
    } else {
      out.push({ icon: 'fa-fire', text: 'Great pace — try a mock quiz to lock in what you learned.' });
    }
    if (streak >= 7) {
      out.push({ icon: 'fa-trophy', text: `Your ${streak}-day streak is impressive. Consider a study group for accountability.` });
    }
    if (xpEarned > 200) {
      out.push({ icon: 'fa-star', text: 'You are on track for the next level. Take a peek at the leaderboard.' });
    }
    return out;
  }

  /* ---------- rendering ---------- */
  function renderDigestModal(digest) {
    const prettyRange = `${shortDate(digest.start)} — ${shortDate(digest.end)}`;
    openModal({
      title: 'Your weekly reflection',
      className: 'modal-lg',
      body: `
        <p class="muted">${esc(prettyRange)}</p>
        <div class="digest-hero">
          <div class="digest-hero-title">
            ${digest.lessonsCompleted > 0
              ? `You completed <strong>${digest.lessonsCompleted}</strong> lesson${digest.lessonsCompleted === 1 ? '' : 's'}`
              : 'A quiet week — let\'s pick it up'}
          </div>
          <div class="digest-hero-sub">
            ${digest.studyMinutes} minutes of learning · ${digest.xpEarned} XP earned
            ${digest.streak ? `· ${digest.streak}🔥 streak` : ''}
          </div>
        </div>

        <div class="stat-grid" style="margin:20px 0">
          <div class="dashboard-card stat-card">
            <div class="stat-info">
              <p class="stat-label">Study time</p>
              <p class="stat-value">${digest.studyMinutes}m</p>
            </div>
            <div class="stat-icon stat-icon-blue"><i class="fas fa-clock"></i></div>
          </div>
          <div class="dashboard-card stat-card">
            <div class="stat-info">
              <p class="stat-label">Quizzes</p>
              <p class="stat-value">${digest.quizzesPassed}/${digest.quizAttempts}</p>
              <p class="stat-sub">avg ${digest.quizAvg}%</p>
            </div>
            <div class="stat-icon stat-icon-green"><i class="fas fa-question"></i></div>
          </div>
          <div class="dashboard-card stat-card">
            <div class="stat-info">
              <p class="stat-label">New badges</p>
              <p class="stat-value">${digest.newBadges}</p>
            </div>
            <div class="stat-icon stat-icon-yellow"><i class="fas fa-trophy"></i></div>
          </div>
          <div class="dashboard-card stat-card">
            <div class="stat-info">
              <p class="stat-label">Consultations</p>
              <p class="stat-value">${digest.consultations}</p>
            </div>
            <div class="stat-icon stat-icon-purple"><i class="fas fa-comments"></i></div>
          </div>
        </div>

        ${digest.recommendations.length ? `
          <h4 class="panel-title">Focus for next week</h4>
          <ul class="digest-recs">
            ${digest.recommendations.map(r => `
              <li><i class="fas ${r.icon}"></i> ${esc(r.text)}</li>`).join('')}
          </ul>` : ''}
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-primary" id="digest-share">
          <i class="fas fa-share"></i> Share progress</button>`,
    });

    document.getElementById('digest-share').onclick = () => shareDigest(digest);
  }

  function shareDigest(digest) {
    const text = `This week on ExpertHub: ${digest.lessonsCompleted} lessons, ${digest.studyMinutes} minutes, ${digest.xpEarned} XP${digest.streak ? `, ${digest.streak}🔥 streak` : ''}.`;
    if (navigator.share) {
      navigator.share({ title: 'My week on ExpertHub', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => showToast('Copied to clipboard', 'success'));
    }
  }

  function shortDate(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(iso));
    } catch (_) { return new Date(iso).toDateString(); }
  }

  /* ---------- dashboard tab ---------- */
  function userDigest() {
    const current = buildWeekDigest(0);
    const previous = buildWeekDigest(1);
    const delta = current.lessonsCompleted - previous.lessonsCompleted;

    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Weekly Digest</span></div>
      <section class="page-header">
        <h1 class="page-title">Weekly Reflection</h1>
        <div class="page-actions">
          <button class="btn btn-secondary" data-action="digest-share">
            <i class="fas fa-share"></i> Share</button>
        </div>
      </section>

      <div class="alert alert-info">
        <i class="fas fa-calendar-week"></i>
        <div>
          ${esc(shortDate(current.start))} — ${esc(shortDate(current.end))}.
          ${delta >= 0
            ? `<strong>${delta > 0 ? 'Up by ' + delta : 'Holding steady'}</strong> vs. last week.`
            : `<strong>Down ${Math.abs(delta)}</strong> vs. last week — a small push this week goes a long way.`}
        </div>
      </div>

      <section class="stat-grid">
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Lessons</p>
            <p class="stat-value">${current.lessonsCompleted}</p>
            <p class="stat-sub">last week: ${previous.lessonsCompleted}</p>
          </div>
          <div class="stat-icon stat-icon-blue"><i class="fas fa-book-open"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Study time</p>
            <p class="stat-value">${current.studyMinutes}m</p>
            <p class="stat-sub">last week: ${previous.studyMinutes}m</p>
          </div>
          <div class="stat-icon stat-icon-purple"><i class="fas fa-clock"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">XP</p>
            <p class="stat-value">${current.xpEarned}</p>
            <p class="stat-sub">last week: ${previous.xpEarned}</p>
          </div>
          <div class="stat-icon stat-icon-yellow"><i class="fas fa-star"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Quiz accuracy</p>
            <p class="stat-value">${current.quizAvg}%</p>
            <p class="stat-sub">${current.quizzesPassed}/${current.quizAttempts} passed</p>
          </div>
          <div class="stat-icon stat-icon-green"><i class="fas fa-bullseye"></i></div>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">Focus for next week</h3>
        <ul class="digest-recs">
          ${current.recommendations.map(r => `
            <li><i class="fas ${r.icon}"></i> ${esc(r.text)}</li>`).join('')}
        </ul>
      </section>

      <section class="panel">
        <h3 class="panel-title">How it works</h3>
        <p class="muted">
          Every Sunday, ExpertHub emails a summary of your week: what you learned, how your
          quiz scores trended, which skills you grew, and one small nudge to help you keep going.
          You can disable this in <a href="#/dashboard" data-action="switch-tab" data-tab="profile">Profile</a>.
        </p>
      </section>
    `;
  }

  /* ---------- scheduled trigger ---------- */
  function shouldShowDigest() {
    const state = getDigestState();
    const lastShown = state.lastShown ? new Date(state.lastShown) : null;
    const now = new Date();
    const day = now.getDay();      // 0 = Sunday
    if (day !== 0 && day !== 1) return false;  // Sunday or Monday
    if (lastShown && (now - lastShown) < 6 * 86400000) return false;
    return true;
  }

  function maybeAutoShow() {
    if (!shouldShowDigest()) return;
    const digest = buildWeekDigest(0);
    if (digest.lessonsCompleted === 0 && digest.quizAttempts === 0) return;

    // Fire a notification instead of an intrusive modal
    window.EHNotifications?.push({
      kind: 'achievement',
      title: 'Your weekly reflection is ready',
      body: `${digest.lessonsCompleted} lessons · ${digest.studyMinutes}m · ${digest.xpEarned} XP`,
      action: { href: '#/dashboard' },
    });
    // Belt-and-braces: open the modal after a short delay (only if the tab is visible)
    if (!document.hidden) {
      setTimeout(() => {
        try { renderDigestModal(digest); } catch (_) {}
      }, 3000);
    }
    const state = getDigestState();
    state.lastShown = new Date().toISOString();
    saveDigestState(state);
  }

  /* ---------- public ---------- */
  NS.build = buildWeekDigest;
  NS.render = userDigest;
  NS.open = () => renderDigestModal(buildWeekDigest(0));
  NS.maybeAutoShow = maybeAutoShow;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(maybeAutoShow, 4000), { once: true });
  } else {
    setTimeout(maybeAutoShow, 4000);
  }
})();

/* dashboard tab router entry */
function userDigestTab() {
  return window.EHDigest ? window.EHDigest.render() : '<p>Loading digest…</p>';
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action="digest-share"]');
  if (el) {
    e.preventDefault();
    const d = window.EHDigest?.build(0);
    if (d && window.EHDigest) window.EHDigest.open();
  }