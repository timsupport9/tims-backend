/* ============================================================
   ExpertHub 2.0 — dashboards/user/index.js
   Namespace bootstrap + module/action registry + lifecycle.
   Loaded BEFORE 11-user.js and BEFORE any dashboards/user/*.js.

   Responsibilities:
   - Create/own the window.ExpertHubUser namespace
   - Provide module registry (with metadata, deps, permissions)
   - Provide action registry (with permissions, stats, error tracking)
   - Provide a state bucket that stays in sync with S
   - Provide lifecycle hooks (init/cleanup) for modules
   - Provide error reporting and event emission
   ============================================================ */

(function () {
  const ns = window.ExpertHubUser = window.ExpertHubUser || {};

  /* ---------------- Dashboard Configuration ----------------
     Note: this is Dashboard-scoped, not the global CONFIG object. */
  ns.config = ns.config || {
    version: '2.0.0',
    defaultLandingTab: 'dashboard',
    defaultIntent: 'both',
    debug: false,
    capabilities: {
      retryDataLoading: true,
      moduleLifecycle: true,
      actionTracking: true,
      notifications: true,
    },
  };

  /* ---------------- Registries ---------------- */
  ns.modules       = ns.modules       || {};   // tab-id -> renderFn
  ns.actions       = ns.actions       || {};   // action-name -> async (id, el) => void
  ns.moduleMeta    = ns.moduleMeta    || {};   // tab-id -> { init, cleanup, label, ... }
  ns.permissions   = ns.permissions   || {};   // action-name -> bool|fn
  ns.errors        = ns.errors        || [];   // last N module render errors
  ns.notifications = ns.notifications || [];   // lightweight in-app event log
  ns.actionStats   = ns.actionStats   || {};   // action-name -> { calls, errors, lastError }

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
    'ai-assistant','opportunities',
  ]);

  /* ---------------- State bucket ----------------
     Canonical (long-form) property names used internally by modules.
     ns.syncStateFromS() and ns.syncStateToS() bridge these to the
     legacy short names on the global S object. */
  ns.state = ns.state || {
    // Learning
    wishlist: [], wishlistIds: new Set(),
    enrolledCourseIds: new Set(),
    enrollments: [],

    // Achievements
    userXP: 0, userLevel: 1, userBadges: [],
    userStreak: { current: 0, longest: 0, last_active: null },

    // Sessions
    packages: [], shortlist: [], refunds: [],

    // Learning content
    paths: [], bundles: [],
    lessonNotes: [], lessonQuestions: [], courseDiscussions: [],

    // Personal development
    goals: [], habits: [], journal: [], milestones: [],

    // Academic
    academicSubjects: [], academicTimetable: [], academicAssignments: [], revision: [],

    // Career
    careerPathways: [], cv: null, interviewPrep: [], skillGaps: [],

    // Mentorship
    mentorships: [],

    // Skills
    skillAssessments: [],

    // Productivity
    tasks: [], reminders: [],

    // Community
    studyGroups: [], communityChallenges: [], discussionsCommunity: [],
    resources: [],

    // Per-dataset load status: name -> 'idle'|'loading'|'ok'|'failed'
    datasetStatus: {},

    // Overall
    loaded: false,
    loadingState: 'idle',   // 'idle' | 'loading' | 'ok' | 'partial' | 'failed'
    lastError: null,
    lastLoadedAt: 0,
  };

  /* ---------------- Registration helpers ---------------- */
  ns.registerModule = function (tab, renderFn, meta = {}) {
    if (typeof tab !== 'string' || typeof renderFn !== 'function') {
      console.warn('[ExpertHubUser] registerModule: invalid arguments', { tab, renderFn });
      return false;
    }
    if (ns.modules[tab]) {
      console.warn(`[ExpertHubUser] Module "${tab}" registered twice — last wins.`);
    }
    ns.modules[tab] = renderFn;
    ns.moduleMeta[tab] = {
      id: tab,
      displayName: meta.displayName || meta.label || tab,
      category: meta.category || 'general',
      permissions: meta.permissions || null,
      dependencies: Array.isArray(meta.dependencies) ? meta.dependencies : [],
      availability: meta.availability !== false,
      version: meta.version || '1.0.0',
      init: typeof meta.init === 'function' ? meta.init : null,
      cleanup: typeof meta.cleanup === 'function' ? meta.cleanup : null,
      description: meta.description || '',
      icon: meta.icon || null,
    };
    return true;
  };

  ns.registerAction = function (name, fn, opts = {}) {
    if (typeof name !== 'string' || typeof fn !== 'function') {
      console.warn('[ExpertHubUser] registerAction: invalid arguments', { name, fn });
      return false;
    }
    const { replace = true, permissions = null } = opts;
    if (ns.actions[name] && !replace) {
      console.warn(`[ExpertHubUser] Action "${name}" already registered — skipped.`);
      return false;
    }
    if (ns.actions[name]) {
      console.warn(`[ExpertHubUser] Action "${name}" replaced.`);
    }
    ns.actions[name] = fn;
    ns.actionStats[name] = ns.actionStats[name] || { calls: 0, errors: 0, lastError: null };
    if (permissions !== null) ns.permissions[name] = permissions;
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

  /* ---------------- Module availability ---------------- */
  ns.isModuleAvailable = function (tab) {
    const meta = ns.moduleMeta[tab];
    if (!meta) return true;
    if (meta.availability === false) return false;
    if (meta.permissions) {
      try {
        if (typeof meta.permissions === 'function' && !meta.permissions()) return false;
        if (typeof meta.permissions === 'boolean' && !meta.permissions) return false;
      } catch { return false; }
    }
    if (Array.isArray(meta.dependencies)) {
      for (const dep of meta.dependencies) {
        if (typeof dep === 'string' && !ns.hasModule(dep)) return false;
      }
    }
    return true;
  };

  ns.getModulesByCategory = function (category) {
    return Object.keys(ns.modules).filter(tab => {
      const meta = ns.moduleMeta[tab];
      return meta && meta.category === category;
    });
  };

  ns.listModules = function () {
    return Object.keys(ns.modules).map(tab => ({
      tab,
      meta: ns.moduleMeta[tab] || { id: tab, displayName: tab },
      available: ns.isModuleAvailable(tab),
    }));
  };

  /* ---------------- Module lifecycle ---------------- */
  ns.initModule = function (tab, container) {
    const meta = ns.moduleMeta[tab];
    if (!meta || typeof meta.init !== 'function') return;
    try { meta.init(container); }
    catch (e) { ns.reportError(tab, e); }
  };

  ns.cleanupModule = function (tab) {
    const meta = ns.moduleMeta[tab];
    if (!meta || typeof meta.cleanup !== 'function') return;
    try { meta.cleanup(); }
    catch (e) { ns.reportError(tab, e); }
  };

  /* ---------------- Central error reporting ---------------- */
  ns.reportError = function (source, err) {
    const entry = { source, at: Date.now(), message: err?.message || String(err) };
    ns.errors.push(entry);
    if (ns.errors.length > 25) ns.errors.shift();
    console.error(`[ExpertHubUser:${source}]`, err);
    if (typeof showToast === 'function') {
      try { showToast(err?.message || 'Something went wrong', 'error'); } catch {}
    }
  };

  ns.emit = function (event, payload) {
    const entry = { event, payload, at: Date.now() };
    ns.notifications.push(entry);
    if (ns.notifications.length > 50) ns.notifications.shift();
    try {
      window.dispatchEvent(new CustomEvent(`userns:${event}`, { detail: payload }));
    } catch {}
  };

  /* ---------------- State synchronization ----------------
     ns.state uses canonical names; S uses legacy names.
     These two helpers keep both sides consistent. */

  ns.syncStateFromS = function () {
    if (typeof S !== 'object' || S === null) return;
    const st = ns.state;

    st.wishlist            = Array.isArray(S.wishlist) ? S.wishlist : [];
    st.wishlistIds         = (S.wishlistIds instanceof Set)
      ? S.wishlistIds
      : new Set(st.wishlist.map(w => String(w.course_id)));
    st.enrolledCourseIds   = (S.enrolledCourseIds instanceof Set)
      ? S.enrolledCourseIds
      : new Set();
    st.enrollments         = Array.isArray(S.enrollments) ? S.enrollments : [];

    st.userXP              = Number(S.userXP) || 0;
    st.userLevel           = Number(S.userLevel) || 1;
    st.userBadges          = Array.isArray(S.userBadges) ? S.userBadges : [];
    st.userStreak          = S.userStreak || { current: 0, longest: 0, last_active: null };

    st.packages            = Array.isArray(S.userPackages) ? S.userPackages : [];
    st.shortlist           = Array.isArray(S.userShortlist) ? S.userShortlist : [];
    st.refunds             = Array.isArray(S.userRefunds) ? S.userRefunds : [];

    st.paths               = Array.isArray(S.coursePaths) ? S.coursePaths : [];
    st.bundles             = Array.isArray(S.courseBundles) ? S.courseBundles : [];
    st.lessonNotes         = Array.isArray(S.lessonNotes) ? S.lessonNotes : [];
    st.lessonQuestions     = Array.isArray(S.lessonQuestions) ? S.lessonQuestions : [];
    st.courseDiscussions   = Array.isArray(S.courseDiscussions) ? S.courseDiscussions : [];

    st.goals               = Array.isArray(S.personalGoals) ? S.personalGoals : [];
    st.habits              = Array.isArray(S.habits) ? S.habits : [];
    st.journal             = Array.isArray(S.journalEntries) ? S.journalEntries : [];
    st.milestones          = Array.isArray(S.milestones) ? S.milestones : [];

    st.academicSubjects    = Array.isArray(S.academicSubjects) ? S.academicSubjects : [];
    st.academicTimetable   = Array.isArray(S.studyTimetable) ? S.studyTimetable : [];
    st.academicAssignments = Array.isArray(S.academicAssignments) ? S.academicAssignments : [];
    st.revision            = Array.isArray(S.revisionMaterials) ? S.revisionMaterials : [];

    st.careerPathways      = Array.isArray(S.careerPathways) ? S.careerPathways : [];
    st.cv                  = S.userCv || null;
    st.interviewPrep       = Array.isArray(S.interviewPrep) ? S.interviewPrep : [];
    st.skillGaps           = Array.isArray(S.skillGaps) ? S.skillGaps : [];

    st.mentorships         = Array.isArray(S.mentorships) ? S.mentorships : [];
    st.skillAssessments    = Array.isArray(S.skillAssessments) ? S.skillAssessments : [];

    st.tasks               = Array.isArray(S.tasks) ? S.tasks : [];
    st.reminders           = Array.isArray(S.reminders) ? S.reminders : [];

    st.studyGroups         = Array.isArray(S.studyGroups) ? S.studyGroups : [];
    st.communityChallenges = Array.isArray(S.communityChallenges) ? S.communityChallenges : [];
    st.discussionsCommunity= Array.isArray(S.discussionsCommunity) ? S.discussionsCommunity : [];
    st.resources           = Array.isArray(S.resources) ? S.resources : [];

    st.loaded              = !!S.userExtLoaded;
    st.loadingState        = S.userExtLoadingState || (S.userExtLoaded ? 'ok' : 'idle');
    st.lastError           = S.userExtLastError || null;
    st.lastLoadedAt        = Number(S.userExtLastLoadedAt) || 0;
    st.datasetStatus       = (S.userExtDatasetStatus && typeof S.userExtDatasetStatus === 'object')
      ? S.userExtDatasetStatus
      : {};
  };

  ns.syncStateToS = function () {
    if (typeof S !== 'object' || S === null) return;
    const st = ns.state;

    S.wishlist            = st.wishlist;
    S.wishlistIds         = st.wishlistIds;
    S.enrolledCourseIds   = st.enrolledCourseIds;
    S.enrollments         = st.enrollments;
    S.userXP              = st.userXP;
    S.userLevel           = st.userLevel;
    S.userBadges          = st.userBadges;
    S.userStreak          = st.userStreak;
    S.userPackages        = st.packages;
    S.userShortlist       = st.shortlist;
    S.userRefunds         = st.refunds;
    S.coursePaths         = st.paths;
    S.courseBundles       = st.bundles;
    S.lessonNotes         = st.lessonNotes;
    S.lessonQuestions     = st.lessonQuestions;
    S.courseDiscussions   = st.courseDiscussions;
    S.personalGoals       = st.goals;
    S.habits              = st.habits;
    S.journalEntries      = st.journal;
    S.milestones          = st.milestones;
    S.academicSubjects    = st.academicSubjects;
    S.studyTimetable      = st.academicTimetable;
    S.academicAssignments = st.academicAssignments;
    S.revisionMaterials   = st.revision;
    S.careerPathways      = st.careerPathways;
    S.userCv              = st.cv;
    S.interviewPrep       = st.interviewPrep;
    S.skillGaps           = st.skillGaps;
    S.mentorships         = st.mentorships;
    S.skillAssessments    = st.skillAssessments;
    S.tasks               = st.tasks;
    S.reminders           = st.reminders;
    S.studyGroups         = st.studyGroups;
    S.communityChallenges = st.communityChallenges;
    S.discussionsCommunity= st.discussionsCommunity;
    S.resources           = st.resources;
    S.userExtLoaded       = st.loaded;
    S.userExtDatasetStatus = st.datasetStatus;
    S.userExtLoadingState  = st.loadingState;
    S.userExtLastError     = st.lastError;
    S.userExtLastLoadedAt  = st.lastLoadedAt;
  };

  /* ---------------- Debug helper (call window.ExpertHubUser.debug()) ---------------- */
  ns.debug = function () {
    try {
      console.group('[ExpertHubUser] Debug');
      console.log('Version:', ns.config.version);
      console.log('Modules:', Object.keys(ns.modules).length, ns.listModules());
      console.log('Actions:', Object.keys(ns.actions).length);
      console.log('Recent errors:', ns.errors.slice(-5));
      console.log('State:', ns.state);
      console.log('Loading state:', ns.state.loadingState);
      console.groupEnd();
    } catch (e) {
      console.warn('Debug failed', e);
    }
  };
})();