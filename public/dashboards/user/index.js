/* ============================================================
   ExpertHub 2.0 — dashboards/user/index.js
   Namespace bootstrap + module/action registry + lifecycle.
   Loaded BEFORE 11-user.js and BEFORE any dashboards/user/*.js.
   ============================================================ */

(function () {
  const ns = window.ExpertHubUser = window.ExpertHubUser || {};

  /* ---------------- Registries ---------------- */
  ns.modules       = ns.modules       || {};   // tab-id -> renderFn
  ns.actions       = ns.actions       || {};   // action-name -> async (id, el) => void
  ns.moduleMeta    = ns.moduleMeta    || {};   // tab-id -> { init, cleanup, label }
  ns.permissions   = ns.permissions   || {};   // action-name -> bool|fn
  ns.errors        = ns.errors        || [];   // last N module render errors
  ns.notifications = ns.notifications || [];   // lightweight in-app event log

  /* Canonical tab list — used by sidebar validation in 11-user.js */
  ns.knownTabs = new Set([
    'dashboard','overview',
    'eschool','my-learning','learning-paths','bundles','wishlist','certificates',
    'achievements','course-notes','lesson-notes',
    'academic','skills',
    'career','mentorship',
    'personal-development','productivity',
    'community','resources',
    'experts','consultations','packages','shortlist',
    'events',
    'wallet','transactions','refunds','claims',
    'support','profile','assessments',
  ]);

  /* ---------------- State bucket ----------------
     Populated by loadUserExtendedData() in 11-user.js and kept
     in sync with the global `S` object via syncStateFromS(). */
  ns.state = ns.state || {
    wishlist: [], wishlistIds: new Set(),
    enrolledCourseIds: new Set(),
    userXP: 0, userLevel: 1, userBadges: [], userStreak: { current: 0, longest: 0 },
    packages: [], shortlist: [], refunds: [],
    paths: [], bundles: [], discussions: [],
    lessonNotes: [], lessonQuestions: [],
    goals: [], habits: [], journal: [], milestones: [],
    academicSubjects: [], academicTimetable: [], academicAssignments: [], revision: [],
    careerPathways: [], cv: null, interviewPrep: [], skillGaps: [],
    mentorships: [],
    skillAssessments: [],
    tasks: [], reminders: [],
    studyGroups: [], communityChallenges: [], discussionsCommunity: [],
    resources: [],
    loaded: false,
    loadingState: 'idle',     // 'idle' | 'loading' | 'ok' | 'partial' | 'failed'
    lastError: null,
    lastLoadedAt: 0,
  };

  /* ---------------- Registration helpers ---------------- */
  ns.registerModule = function (tab, renderFn, meta = {}) {
    if (typeof tab !== 'string' || typeof renderFn !== 'function') return false;
    if (ns.modules[tab]) {
      console.warn(`[ExpertHubUser] Module "${tab}" registered twice — last wins.`);
    }
    ns.modules[tab] = renderFn;
    ns.moduleMeta[tab] = meta || {};
    return true;
  };

  ns.registerAction = function (name, fn, { replace = true } = {}) {
    if (typeof name !== 'string' || typeof fn !== 'function') return false;
    if (ns.actions[name] && !replace) {
      console.warn(`[ExpertHubUser] Action "${name}" already registered — skipped.`);
      return false;
    }
    ns.actions[name] = fn;
    return true;
  };

  ns.registerPermission = function (name, check) {
    if (typeof name !== 'string' || (typeof check !== 'function' && typeof check !== 'boolean')) return false;
    ns.permissions[name] = check;
    return true;
  };

  ns.hasModule = (tab) => typeof ns.modules[tab] === 'function';
  ns.hasAction = (name) => typeof ns.actions[name] === 'function';

  ns.canDo = function (name) {
    const p = ns.permissions[name];
    if (p === undefined) return true;
    try { return typeof p === 'function' ? !!p() : !!p; }
    catch { return false; }
  };

  /* ---------------- Module lifecycle ---------------- */
  /** Called after a module's HTML has been attached to the DOM. */
  ns.initModule = function (tab, container) {
    const meta = ns.moduleMeta[tab];
    if (!meta) return;
    try { meta.init?.(container); }
    catch (e) { ns.reportError(tab, e); }
  };

  /** Called before switching away from a module. */
  ns.cleanupModule = function (tab) {
    const meta = ns.moduleMeta[tab];
    if (!meta) return;
    try { meta.cleanup?.(); }
    catch (e) { ns.reportError(tab, e); }
  };

  /** Central error report — stores last N errors and notifies UI. */
  ns.reportError = function (source, err) {
    const entry = { source, at: Date.now(), message: err?.message || String(err) };
    ns.errors.push(entry);
    if (ns.errors.length > 25) ns.errors.shift();
    console.error(`[ExpertHubUser:${source}]`, err);
    if (typeof showToast === 'function') {
      try { showToast(err?.message || 'Something went wrong', 'error'); } catch {}
    }
  };

  /** Very small event registry so modules can announce changes. */
  ns.emit = function (event, payload) {
    const entry = { event, payload, at: Date.now() };
    ns.notifications.push(entry);
    if (ns.notifications.length > 50) ns.notifications.shift();
    try { window.dispatchEvent(new CustomEvent(`userns:${event}`, { detail: payload })); } catch {}
  };

  /* ---------------- State synchronization ---------------- */
  /* Bridge between ns.state and the global S. Called after loads. */
  ns.syncStateFromS = function () {
    if (typeof S !== 'object') return;
    const st = ns.state;
    st.wishlist           = S.wishlist || [];
    st.wishlistIds        = S.wishlistIds || new Set();
    st.enrolledCourseIds  = S.enrolledCourseIds || new Set();
    st.userXP             = S.userXP || 0;
    st.userLevel          = S.userLevel || 1;
    st.userBadges         = S.userBadges || [];
    st.userStreak         = S.userStreak || { current: 0, longest: 0 };
    st.packages           = S.userPackages || [];
    st.shortlist          = S.userShortlist || [];
    st.refunds            = S.userRefunds || [];
    st.paths              = S.coursePaths || [];
    st.bundles            = S.courseBundles || [];
    st.lessonNotes        = S.lessonNotes || [];
    st.lessonQuestions    = S.lessonQuestions || [];
    st.goals              = S.personalGoals || [];
    st.habits             = S.habits || [];
    st.journal            = S.journalEntries || [];
    st.academicSubjects   = S.academicSubjects || [];
    st.academicTimetable  = S.studyTimetable || [];
    st.academicAssignments= S.academicAssignments || [];
    st.careerPathways     = S.careerPathways || [];
    st.cv                 = S.userCv || null;
    st.mentorships        = S.mentorships || [];
    st.skillAssessments   = S.skillAssessments || [];
    st.tasks              = S.tasks || [];
    st.studyGroups        = S.studyGroups || [];
    st.resources          = S.resources || [];
    st.loaded             = !!S.userExtLoaded;
  };
})();