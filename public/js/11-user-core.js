/* ============================================================
   ExpertHub 2.0 — 11-user-core.js
   Learner dashboard shell, tab router, and overview panel.

   Wired to Tier 1–3 modules:
     17-quiz.js                → no direct tab
     20-study-groups.js        → 'study-groups'
     21-leaderboard.js         → 'leaderboard'
     22-ai-study-buddy.js      → no direct tab
     23-subscriptions.js       → 'subscription'
     24-referrals.js           → 'referrals'
     25-skill-map.js           → 'skill-map'
     26-srs.js                 → 'flashcards'
     27-forum.js               → 'community'
     28-digest.js              → 'digest'
   If any of those files is missing, only its tab fails; the
   rest of the dashboard keeps working.
   ============================================================ */

/* ============================================================
   USER / LEARNER DASHBOARD
   ============================================================ */
function renderUserDashboard() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const intent = S.userIntent || currentUser?.intent || 'both';
  const showLearn   = intent === 'learn'   || intent === 'both';
  const showConsult = intent === 'consult' || intent === 'both';

  const activeCons = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session'].includes(c.status)
  ).length;
  const unreadBadges = S.userBadges.length;

  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}

    ${showLearn ? sidebarItem('eschool','E-School','fa-school') : ''}
    ${showLearn ? sidebarItem('my-learning','My Learning','fa-graduation-cap') : ''}
    ${showLearn ? sidebarItem('learning-paths','Learning Paths','fa-route') : ''}
    ${showLearn ? sidebarItem('bundles','Bundles','fa-box-open') : ''}
    ${showLearn ? sidebarItem('wishlist','Wishlist','fa-heart') : ''}
    ${showLearn ? sidebarItem('certificates','Certificates','fa-certificate') : ''}
    ${showLearn ? sidebarItem('achievements','Achievements','fa-trophy', unreadBadges) : ''}
    ${showLearn ? sidebarItem('course-notes','My Notes','fa-sticky-note') : ''}

    ${/* TIER 1–3 additions — learning tools */ ''}
    ${showLearn ? sidebarItem('flashcards','Flashcards','fa-layer-group') : ''}
    ${showLearn ? sidebarItem('skill-map','Skill Map','fa-route') : ''}

    ${sidebarItem('events','Events','fa-calendar-alt')}

    ${showConsult ? sidebarItem('experts','Find Experts','fa-search') : ''}
    ${sidebarItem('consultations','My Consultations','fa-comments', activeCons)}
    ${showConsult ? sidebarItem('packages','Session Packages','fa-ticket-alt') : ''}
    ${showConsult ? sidebarItem('shortlist','Shortlist','fa-bookmark') : ''}

    ${/* TIER 1–3 additions — community + growth */ ''}
    ${sidebarItem('community','Community','fa-comments')}
    ${sidebarItem('study-groups','Study Groups','fa-users')}
    ${sidebarItem('leaderboard','Leaderboard','fa-trophy')}
    ${sidebarItem('digest','Weekly Digest','fa-calendar-week')}

    ${sidebarItem('wallet','Wallet','fa-wallet')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
    ${showLearn ? sidebarItem('refunds','Refund Requests','fa-rotate-left') : ''}

    ${/* TIER 1–3 additions — account */ ''}
    ${sidebarItem('referrals','Refer & Earn','fa-gift')}
    ${sidebarItem('subscription','Subscription','fa-star')}

    ${sidebarItem('claims','Claims','fa-gavel')}
    ${sidebarItem('support','Support','fa-headset')}
    ${sidebarItem('profile','Profile','fa-user')}
  `;

  shell({
    roleClass: 'role-user',
    brandIcon: 'fa-user-circle',
    brandTitle: 'My Panel',
    brandSubtitle: 'ExpertHub',
    nav,
    roleLabel: 'User Panel',
    content: renderUserContent(),
  });
  attachRoleEvents();
}

function renderUserContent() {
  switch (activeTab) {
    /* ---------- original tabs ---------- */
    case 'dashboard':       return userOverview();
    case 'eschool':         return userESchool();
    case 'my-learning':     return userMyLearning();
    case 'learning-paths':  return userLearningPaths();
    case 'bundles':         return userBundles();
    case 'wishlist':        return userWishlist();
    case 'certificates':    return userCertificates();
    case 'achievements':    return userAchievements();
    case 'course-notes':    return userCourseNotes();
    case 'events':          return userEvents();
    case 'experts':         return userFindExperts();
    case 'consultations':   return userConsultations();
    case 'packages':        return userPackages();
    case 'shortlist':       return userShortlist();
    case 'wallet':          return userWallet();
    case 'transactions':    return userTransactions();
    case 'refunds':         return userRefundRequests();
    case 'claims':          return userClaims();
    case 'support':         return userSupport();
    case 'profile':         return userProfile();

    /* ---------- TIER 1–3 additions ----------
       Each function lives in its own file. If that file isn't
       loaded, only this tab breaks; every other tab renders.
       ------------------------------------------------------------------ */
    case 'flashcards':      return safeTab(userSRS,           'Flashcards',     'js/26-srs.js');
    case 'community':       return safeTab(userForum,         'Community',      'js/27-forum.js');
    case 'study-groups':    return safeTab(userStudyGroups,   'Study Groups',   'js/20-study-groups.js');
    case 'leaderboard':     return safeTab(userLeaderboard,   'Leaderboard',    'js/21-leaderboard.js');
    case 'skill-map':       return safeTab(userSkillMap,      'Skill Map',      'js/25-skill-map.js');
    case 'digest':          return safeTab(userDigestTab,     'Weekly Digest',  'js/28-digest.js');
    case 'referrals':       return safeTab(userReferrals,     'Refer & Earn',   'js/24-referrals.js');
    case 'subscription':    return safeTab(userSubscription,  'Subscription',   'js/23-subscriptions.js');

    default:                return userOverview();
  }
}

/* ---------- Tab safety wrapper ----------
   Guards against a Tier file failing to load. Shows a visible
   error card for that tab only, so the sidebar and every other
   tab stay usable. */
function safeTab(fn, label, hintFile) {
  if (typeof fn !== 'function') {
    console.error('[renderUserContent] Missing renderer for "' + label + '" — expected from ' + hintFile);
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>${esc(label)}</span></div>
      <section class="panel">
        <div style="padding:20px;border-radius:12px;background:#fef2f2;
                    color:#991b1b;border:1px solid #fecaca">
          <h3 style="margin:0 0 8px;font-size:16px">
            <i class="fas fa-exclamation-triangle"></i> "${esc(label)}" module not loaded
          </h3>
          <p style="margin:6px 0;font-size:13px">
            The file <code>${esc(hintFile)}</code> was not found on this server,
            or failed to parse.
          </p>
          <p style="margin:6px 0;font-size:13px">
            Open DevTools → <strong>Network</strong> and reload; look for a 404 on
            <code>${esc(hintFile)}</code>.
          </p>
        </div>
      </section>`;
  }
  try {
    return fn();
  } catch (err) {
    console.error('[renderUserContent] "' + label + '" threw:', err);
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>${esc(label)}</span></div>
      <section class="panel">
        <div style="padding:20px;border-radius:12px;background:#fef2f2;
                    color:#991b1b;border:1px solid #fecaca">
          <h3 style="margin:0 0 8px;font-size:16px">
            <i class="fas fa-exclamation-triangle"></i> "${esc(label)}" failed to render
          </h3>
          <p style="margin:6px 0;font-size:13px">
            <strong>Error:</strong> ${esc(err && err.message ? err.message : String(err))}
          </p>
          <details style="margin-top:8px">
            <summary style="cursor:pointer;font-size:13px">Stack trace</summary>
            <pre style="white-space:pre-wrap;font-size:11px;margin-top:8px">${esc(err && err.stack ? err.stack : '')}</pre>
          </details>
        </div>
      </section>`;
  }
}

/* ============================================================
   OVERVIEW PANEL — unchanged from original
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

      ${/* TIER 1–3 quick tiles ---------------------------------- */ ''}
      ${showLearn ? `
        <article class="dashboard-card tile-card">
          <i class="fas fa-layer-group tile-icon"></i>
          <h3 class="tile-title">Flashcards</h3>
          <p class="tile-desc">Review what you learned with spaced repetition</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="flashcards">Review</button>
        </article>
      ` : ''}
      <article class="dashboard-card tile-card">
        <i class="fas fa-users tile-icon"></i>
        <h3 class="tile-title">Study Groups</h3>
        <p class="tile-desc">Learn with a cohort and share notes</p>
        <button class="btn btn-success" data-action="switch-tab" data-tab="study-groups">Open</button>
      </article>
      <article class="dashboard-card tile-card">
        <i class="fas fa-comments tile-icon"></i>
        <h3 class="tile-title">Community</h3>
        <p class="tile-desc">Ask questions, help other learners</p>
        <button class="btn btn-info" data-action="switch-tab" data-tab="community">Browse</button>
      </article>
      <article class="dashboard-card tile-card">
        <i class="fas fa-gift tile-icon"></i>
        <h3 class="tile-title">Refer &amp; Earn</h3>
        <p class="tile-desc">Get $10 for every friend who joins</p>
        <button class="btn btn-warning" data-action="switch-tab" data-tab="referrals">Share</button>
      </article>
    </section>
  `;
}