/* ============================================================
   ExpertHub 2.0 — dashboards/user/index.js
   Namespace bootstrap + module/action registry for the
   User / Learner dashboard. Loaded BEFORE 11-user.js and
   BEFORE any dashboards/user/*.js module.
   ============================================================ */

(function () {
  const ns = window.ExpertHubUser = window.ExpertHubUser || {};

  /* Module registry: tab-id -> () => HTML string */
  ns.modules = ns.modules || {};

  /* Action registry: action-name -> async (id, el) => void */
  ns.actions = ns.actions || {};

  /* Extended state bucket (populated by 11-user.js loader) */
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
  };

  ns.registerModule = function (tab, renderFn) {
    if (typeof tab !== 'string' || typeof renderFn !== 'function') return;
    ns.modules[tab] = renderFn;
  };

  ns.registerAction = function (name, fn) {
    if (typeof name !== 'string' || typeof fn !== 'function') return;
    ns.actions[name] = fn;
  };

  ns.hasModule = function (tab) {
    return typeof ns.modules[tab] === 'function';
  };

  ns.hasAction = function (action) {
    return typeof ns.actions[action] === 'function';
  };
})();
