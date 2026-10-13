/* ============================================================
   core/state.js — Global reactive application state
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const state = {
    // Auth
    socket: null,
    authToken: null,
    refreshToken: null,
    currentUser: null,
    currentUserRole: null,

    // Phase & navigation
    appPhase: 'landing',        // landing | login | register | forgot | reset | setup | verify | dashboard
    activeTab: 'dashboard',
    activeESchoolTab: 'courses',
    activeInstTab: 'overview',

    // Chat
    currentChatId: null,
    chatTypingTimer: null,
    chatMessages: {},

    // UI state
    pollTimer: null,
    notificationsPanelOpen: false,
    selectedRows: {
      users: new Set(),
      trainees: new Set(),
      certificates: new Set(),
    },

    // Domain collections
    users: [],
    experts: [],
    events: [],
    consultations: [],
    courses: [],
    notifications: [],
    reviews: [],
    transactions: [],
    payouts: [],
    enrollments: [],
    auditLogs: [],
    claims: [],
    tickets: [],
    coupons: [],
    certificates: [],
    wallet: { balance: 0, ledger: [] },
    earnings: null,
    analytics: null,
    eventRegistrations: [],
    availability: [],
    timeOff: [],
    expertStats: null,
    expertPortfolio: [],
    wishlist: [],

    // Institutions (admin list)
    institutions: [],

    // Institution dashboard
    programmes: [],
    cohorts: [],
    assessments: [],
    projects: [],
    trainees: [],
    instructors: [],
    myInstitution: null,
    institutionStats: null,
    institutionTeam: [],
    institutionEnrollments: [],
    institutionSessions: [],
    institutionCertificates: [],
    institutionSkills: [],
    institutionSkillsMatrix: { skills: [], matrix: [] },
    institutionApprovals: [],
    institutionBranding: null,
    institutionImports: [],
    institutionOrgUnits: [],
    institutionLearningPaths: [],
    institutionQuestions: [],
    institutionMaterials: [],
    institutionComplianceRules: [],
    institutionReportTemplates: [],
    institutionScheduledReports: [],
    institutionTraineeTotal: 0,
    institutionEnrollmentTotal: 0,

    // User preferences
    userIntent: 'both',

    // Pagination
    page: {
      users: 1,
      experts: 1,
      courses: 1,
      consultations: 1,
      transactions: 1,
      institutionTrainees: 1,
      institutionEnrollments: 1,
      institutionCertificates: 1,
      institutionSessions: 1,
      institutionProgrammes: 1,
      institutionCohorts: 1,
    },
  };

  /**
   * Retrieve a top-level state property.
   */
  function get(key) {
    return key ? state[key] : state;
  }

  /**
   * Set a top-level state property and emit change.
   */
  function set(key, value) {
    const prev = state[key];
    state[key] = value;
    EH.bus?.emit('state:change', { key, value, prev });
    return value;
  }

  /**
   * Bulk merge into state.
   */
  function merge(patch = {}) {
    Object.keys(patch).forEach(k => { state[k] = patch[k]; });
    EH.bus?.emit('state:change', { keys: Object.keys(patch) });
    return state;
  }

  /**
   * Reset transient (non-auth) collections. Useful on logout.
   */
  function resetCollections() {
    const keep = ['authToken', 'refreshToken', 'currentUser', 'currentUserRole', 'socket', 'appPhase'];
    Object.keys(state).forEach(k => {
      if (keep.includes(k)) return;
      if (Array.isArray(state[k])) state[k] = [];
      else if (state[k] instanceof Set) state[k] = new Set();
      else if (state[k] && typeof state[k] === 'object' && k !== 'page') state[k] = {};
      else if (k === 'page') state.page = { users: 1, experts: 1, courses: 1, consultations: 1, transactions: 1 };
    });
  }

  EH.state = state;
  EH.State = { get, set, merge, resetCollections };
})(window);
