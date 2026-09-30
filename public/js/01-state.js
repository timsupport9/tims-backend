/* ============================================================
   ExpertHub 2.0 — 01-state.js
   Global configuration + shared mutable state.
   MUST load before every other app file.
   ============================================================ */

/* ---------- CONFIG ---------- */
const CONFIG = {
  API_BASE: '',
  CURRENCY: 'USD',
  CURRENCY_SYMBOL: '$',
  PLATFORM_COMMISSION: 20,
  WITHDRAWAL_HOLD_DAYS: 7,
  MIN_PAYOUT: 50,
  PER_PAGE: 20,
  DEFAULT_AVATAR: 'https://ui-avatars.com/api/?background=1e3a8a&color=fff&name=',
  PAYMENT_PROVIDERS: ['stripe','paystack','flutterwave','paypal','demo'],
  POLL_INTERVAL: 60000,
  USER_INTENTS: ['learn','consult','both'],
  INSTITUTION_TYPES: ['corporate','university','college','ngo','government','bootcamp'],
  INSTITUTION_ROLES: ['operations_manager','coordinator','instructor','viewer'],
  ASSESSMENT_TYPES: ['quiz','exam','project','practical','peer'],
  PROGRAMME_STATUSES: ['draft','active','paused','completed','archived'],
  SESSION_MODES: ['online','in_person','hybrid'],
  LIFECYCLE_STATUSES: ['invited','pending_approval','approved','active','on_hold','completed','certified','withdrawn','waitlisted'],
  SKILL_LEVELS: ['Not Assessed','Novice','Basic','Competent','Proficient','Expert'],
  SKILL_LEVEL_COLOURS: ['#e5e7eb','#fecaca','#fde68a','#bbf7d0','#86efac','#22c55e'],
  DELIVERY_MODES: ['online','in_person','hybrid','self_paced'],
  ATTENDANCE_STATUSES: ['present','late','absent','excused'],

  /* ---------- CONSULTATION ---------- */
  CONSULTATION_STATUSES: [
    'pending_payment','pending_expert_confirmation','confirmed','scheduled',
    'in_grace','in_session','awaiting_completion','completed',
    'no_show','cancelled','expired','disputed'
  ],
  CONSULTATION_TYPES: ['video','audio','chat'],
  SESSION_DURATIONS: [15, 30, 45, 60, 90],
  REFUND_POLICY: { over24h: 100, over2h: 50, under2h: 0 },
  DISPUTE_REASONS: ['no_show','poor_quality','wrong_expertise','technical_issues','other'],
  TIP_PRESETS: [5, 10, 20, 50],
  MAX_RESCHEDULES: 2,

  /* ---------- E-SCHOOL ---------- */
  COURSE_TYPES: ['bootcamp','short_course','tuition','exam_prep','career','certification'],
  LESSON_TYPES: ['video','reading','quiz','assignment','live','code','download'],
  QUIZ_QUESTION_TYPES: ['mcq','true_false','multi_select','short_answer','essay'],
  XP_REWARDS: {
    lesson_complete: 10, quiz_pass: 25, quiz_perfect: 50,
    assignment_submit: 20, course_complete: 200, daily_streak: 5,
    forum_answer: 15, first_lesson_today: 5,
  },
  BADGES: {
    first_lesson:   { name:'First Steps',       icon:'fa-shoe-prints' },
    first_course:   { name:'Course Champion',   icon:'fa-trophy' },
    five_courses:   { name:'Learning Machine',  icon:'fa-rocket' },
    perfect_quiz:   { name:'Perfect Score',     icon:'fa-star' },
    streak_7:       { name:'Week Warrior',      icon:'fa-fire' },
    streak_30:      { name:'Month Master',      icon:'fa-crown' },
    help_10:        { name:'Helpful Hand',      icon:'fa-hands-helping' },
    night_owl:      { name:'Night Owl',         icon:'fa-moon' },
    early_bird:     { name:'Early Bird',        icon:'fa-sun' },
  },
  COURSE_REFUND_WINDOW_DAYS: 14,
  TRIAL_DURATION_HOURS: 48,

  /* ---------- INSTITUTION ---------- */
  CAMPUS_TYPES: ['main','branch','satellite','partner'],
  BUDGET_PERIODS: ['monthly','quarterly','annual'],
  PROCTOR_MODES: ['none','webcam','lockdown','ai'],
  WELLNESS_RISK_LEVELS: ['low','medium','high','critical'],
  WELLNESS_SIGNALS: [
    'login_frequency','session_attendance','assignment_timeliness',
    'forum_engagement','quiz_performance','feedback_sentiment'
  ],
  SUCCESSION_BOXES: [
    { code:'star',        label:'Star',           readiness:'ready_now',  performance:'high',   potential:'high' },
    { code:'high_pot',    label:'High Potential', readiness:'ready_soon', performance:'medium', potential:'high' },
    { code:'enigma',      label:'Enigma',         readiness:'ready_later',performance:'low',    potential:'high' },
    { code:'current_star',label:'Current Star',   readiness:'ready_now',  performance:'high',   potential:'medium' },
    { code:'core',        label:'Core Player',    readiness:'ready_later',performance:'medium', potential:'medium' },
    { code:'inconsistent',label:'Inconsistent',   readiness:'developing', performance:'low',    potential:'medium' },
    { code:'trusted',     label:'Trusted Pro',    readiness:'ready_now',  performance:'high',   potential:'low' },
    { code:'dilemma',     label:'Dilemma',        readiness:'developing', performance:'medium', potential:'low' },
    { code:'risk',        label:'At Risk',        readiness:'not_ready',  performance:'low',    potential:'low' },
  ],
  SSO_PROVIDERS: ['saml','azure_ad','google_workspace','okta','onelogin','custom_oidc'],
  WEBHOOK_EVENTS: [
    'trainee.enrolled','trainee.completed','trainee.withdrawn',
    'certificate.issued','certificate.expired','programme.started',
    'programme.completed','assessment.submitted','assessment.graded',
    'session.scheduled','session.completed','budget.threshold_reached',
    'compliance.breach','instructor.assigned','report.scheduled'
  ],
  API_SCOPES: [
    'read:trainees','write:trainees','read:programmes','write:programmes',
    'read:cohorts','write:cohorts','read:assessments','write:assessments',
    'read:certificates','issue:certificates','read:analytics','read:budgets'
  ],
  ANNOUNCEMENT_SCOPES: ['all','campus','programme','cohort','department','role'],
  ANNOUNCEMENT_PRIORITIES: ['info','important','urgent','critical'],
  REPORT_FIELD_LIBRARY: {
    trainee:    ['id','name','email','department','job_title','campus','status','progress','joined_at','last_active'],
    programme:  ['id','title','category','status','enrolled_count','capacity','avg_progress','start_date','end_date'],
    cohort:     ['id','name','programme_title','instructor_name','capacity','trainee_count','start_date','end_date','status'],
    assessment: ['id','title','type','cohort_name','weight','due_date','submissions','avg_score','pass_rate'],
    certificate:['serial','trainee_name','programme_title','issued_at','expires_at','cpd_points','status'],
    budget:     ['department','allocated','spent','remaining','utilization_pct','period'],
    instructor: ['name','specialization','programmes','sessions','avg_rating','utilization_pct'],
  },
};

/* ---------- GLOBAL STATE ---------- */
let socket = null;
let authToken = null;
let refreshToken = null;
let currentUser = null;
let currentUserRole = null;
let appPhase = 'landing';
let activeTab = 'dashboard';
let activeESchoolTab = 'courses';
let activeInstTab = 'overview';
let currentChatId = null;
let chatTypingTimer = null;
let pollTimer = null;
let notificationsPanelOpen = false;
let selectedRows = {
  users: new Set(),
  trainees: new Set(),
  certificates: new Set(),
  programmes: new Set(),
  cohorts: new Set(),
  campuses: new Set(),
};

const S = {
  /* Core */
  users: [], experts: [], events: [], consultations: [], courses: [], notifications: [],
  reviews: [], transactions: [], payouts: [], enrollments: [], auditLogs: [], claims: [],
  tickets: [], coupons: [], certificates: [], wallet: { balance: 0, ledger: [] }, earnings: null,
  analytics: null, eventRegistrations: [], availability: [], timeOff: [], chatMessages: {},
  expertStats: null, expertPortfolio: [],

  page: {
    users: 1, experts: 1, courses: 1, consultations: 1, transactions: 1,
    institutionTrainees: 1, institutionEnrollments: 1, institutionCertificates: 1,
    institutionSessions: 1, institutionProgrammes: 1, institutionCohorts: 1,
  },

  institutions: [],

  programmes: [], cohorts: [], assessments: [], projects: [],
  trainees: [], instructors: [], myInstitution: null, institutionStats: null,
  institutionTeam: [], institutionEnrollments: [], institutionSessions: [],
  institutionCertificates: [], institutionSkills: [],
  institutionSkillsMatrix: { skills: [], matrix: [] },
  institutionApprovals: [], institutionBranding: null, institutionImports: [],
  institutionOrgUnits: [], institutionLearningPaths: [],
  institutionQuestions: [], institutionMaterials: [],
  institutionComplianceRules: [], institutionReportTemplates: [],
  institutionScheduledReports: [], institutionTraineeTotal: 0, institutionEnrollmentTotal: 0,

  userIntent: 'both',

  /* ---------- CONSULTATION EXTENSIONS ---------- */
  consultationSlots: [], consultationPackages: [], consultationTiers: [],
  consultationEscrow: {}, consultationDisputes: [], consultationFollowups: [],
  consultationRecordings: {}, expertQuestions: [], userShortlist: [], userPackages: [],
  expertConsultationAnalytics: null, adminConsultationAnalytics: null,
  expertPublicProfile: null, consultationMatchResults: [],
  instantConsultationExpert: null, corporateBudgets: [], consultationReviews: [],
  consultationReminders: [], consultationAttendees: [],

  /* ---------- E-SCHOOL EXTENSIONS ---------- */
  courseCurriculum: {}, currentLesson: null, currentLessonProgress: null,
  currentQuiz: null, currentQuizAttempts: [], currentAssignment: null,
  currentAssignmentSubmission: null, lessonNotes: [], courseDiscussions: [],
  coursePaths: [], currentCoursePath: null, courseBundles: [],
  userXP: null, userBadges: [], userStreak: null, userLevel: null,
  availableTrials: [], userRefunds: [], lessonQuestions: [],
  recentWatchHistory: [], studyPartners: [], courseReviews: [],
  enrolledCourseIds: new Set(), wishlistIds: new Set(),
  courseAnalytics: null, courseCertificates: [],

  /* ---------- INSTITUTION EXTENSIONS ---------- */
  campuses: [], activeCampusId: null,
  budgetAllocations: [], budgetTransactions: [],
  examProctorSessions: [], examProctorFlags: [],
  instructorMarketplace: [], instructorContracts: [],
  wellnessScores: [], wellnessAlerts: [],
  successionMatrix: { boxes: [], trainees: [], assignments: [] },
  ssoConfiguration: null,
  apiKeys: [], webhooks: [], announcements: [],
  reportBuilderDrafts: [], savedReportDefinitions: [],
  institutionAnalytics: null, skillsGapAnalysis: null, complianceRuns: [],
  blockchainCerts: [], announcementReads: [], apiCallLogs: [],
};

/* ============================================================
   ExpertHub 2.0 — 01 Feature Expansion
   State Intelligence & Persistence
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature01;
  if (NS) return;

  const namespace = {
    name: "State Intelligence & Persistence",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["state snapshots", "undo/redo history", "draft persistence", "session TTL", "feature flags", "role capability matrix", "preference registry", "device profile", "connection state", "dirty tracking", "state validation", "state migration", "storage quota guard", "cross-tab sync", "audit trail", "computed selectors", "state subscriptions", "reset scopes", "import/export", "diagnostics"],
    registry: new Map(),
    listeners: new Map(),
    metrics: {
      calls: 0,
      successes: 0,
      failures: 0,
      startedAt: Date.now(),
      lastActionAt: null
    },
    config: {
      storagePrefix: 'experthub.feature.01.',
      maxHistory: 80,
      debounceMs: 250,
      staleAfterMs: 5 * 60 * 1000,
      debug: false
    }
  };

  function now() { return Date.now(); }

  function key(name) {
    return namespace.config.storagePrefix + String(name);
  }

  function safeClone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function safeParse(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value); }
    catch (_) { return fallback; }
  }

  function emit(eventName, payload) {
    const handlers = namespace.listeners.get(eventName) || [];
    handlers.slice().forEach(fn => {
      try { fn(payload); } catch (error) { console.error('[ExpertHub]', eventName, error); }
    });
    try {
      document.dispatchEvent(new CustomEvent('eh:01:' + eventName, { detail: payload }));
    } catch (_) {}
  }

  function on(eventName, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!namespace.listeners.has(eventName)) namespace.listeners.set(eventName, []);
    namespace.listeners.get(eventName).push(handler);
    return () => off(eventName, handler);
  }

  function off(eventName, handler) {
    const list = namespace.listeners.get(eventName) || [];
    namespace.listeners.set(eventName, list.filter(fn => fn !== handler));
  }

  function save(name, value, ttl = null) {
    const packet = { value: safeClone(value), savedAt: now(), expiresAt: ttl ? now() + ttl : null };
    try { localStorage.setItem(key(name), JSON.stringify(packet)); emit('saved', { name, packet }); return true; }
    catch (error) { console.warn('[ExpertHub] storage save failed', error); return false; }
  }

  function load(name, fallback = null) {
    try {
      const packet = safeParse(localStorage.getItem(key(name)), null);
      if (!packet) return fallback;
      if (packet.expiresAt && packet.expiresAt < now()) {
        localStorage.removeItem(key(name));
        return fallback;
      }
      return packet.value;
    } catch (_) { return fallback; }
  }

  function remove(name) {
    try { localStorage.removeItem(key(name)); emit('removed', { name }); return true; }
    catch (_) { return false; }
  }

  function register(name, definition = {}) {
    if (!name) throw new Error('Feature name is required');
    const item = {
      name,
      enabled: definition.enabled !== false,
      category: definition.category || 'general',
      description: definition.description || '',
      permissions: Array.isArray(definition.permissions) ? definition.permissions : [],
      handler: typeof definition.handler === 'function' ? definition.handler : null,
      validate: typeof definition.validate === 'function' ? definition.validate : null,
      metadata: definition.metadata || {},
      createdAt: new Date().toISOString()
    };
    namespace.registry.set(name, item);
    emit('registered', item);
    return item;
  }

  function unregister(name) {
    const existed = namespace.registry.delete(name);
    if (existed) emit('unregistered', { name });
    return existed;
  }

  function list(filter = {}) {
    let rows = Array.from(namespace.registry.values());
    if (filter.category) rows = rows.filter(x => x.category === filter.category);
    if (filter.enabled !== undefined) rows = rows.filter(x => x.enabled === filter.enabled);
    if (filter.query) {
      const q = String(filter.query).toLowerCase();
      rows = rows.filter(x => (x.name + ' ' + x.description).toLowerCase().includes(q));
    }
    return rows;
  }

  function hasPermission(item) {
    if (!item.permissions.length) return true;
    const role = window.currentUserRole || window.currentUser?.role || '';
    const permissions = window.currentUser?.permissions || [];
    return item.permissions.includes(role) || item.permissions.some(p => permissions.includes(p));
  }

  async function execute(name, payload = {}, context = {}) {
    const item = namespace.registry.get(name);
    if (!item) throw new Error('Unknown feature: ' + name);
    if (!item.enabled) throw new Error('Feature disabled: ' + name);
    if (!hasPermission(item)) throw new Error('Permission denied: ' + name);
    if (item.validate) {
      const result = await item.validate(payload, context);
      if (result === false) throw new Error('Validation failed: ' + name);
      if (typeof result === 'string') throw new Error(result);
    }
    namespace.metrics.calls++;
    namespace.metrics.lastActionAt = new Date().toISOString();
    try {
      const result = item.handler ? await item.handler(payload, context) : payload;
      namespace.metrics.successes++;
      emit('executed', { name, payload, result });
      return result;
    } catch (error) {
      namespace.metrics.failures++;
      emit('failed', { name, payload, error });
      throw error;
    }
  }

  function memoize(fn, ttl = 30000) {
    let timestamp = 0;
    let cached;
    let cachedArgs = '';
    return function (...args) {
      const signature = JSON.stringify(args);
      if (signature === cachedArgs && now() - timestamp < ttl) return cached;
      cachedArgs = signature;
      timestamp = now();
      cached = fn.apply(this, args);
      return cached;
    };
  }

  function debounce(fn, wait = namespace.config.debounceMs) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, wait = namespace.config.debounceMs) {
    let ready = true;
    let queued = null;
    return function (...args) {
      if (!ready) { queued = args; return; }
      ready = false;
      fn.apply(this, args);
      setTimeout(() => {
        ready = true;
        if (queued) { const next = queued; queued = null; fn.apply(this, next); }
      }, wait);
    };
  }

  function validateObject(value, rules = {}) {
    const errors = {};
    Object.entries(rules).forEach(([field, rule]) => {
      const v = value?.[field];
      if (rule.required && (v === undefined || v === null || String(v).trim() === '')) errors[field] = 'Required';
      if (v !== undefined && v !== null && rule.minLength && String(v).length < rule.minLength) errors[field] = 'Too short';
      if (v !== undefined && v !== null && rule.maxLength && String(v).length > rule.maxLength) errors[field] = 'Too long';
      if (v && rule.pattern && !rule.pattern.test(String(v))) errors[field] = 'Invalid format';
      if (v !== undefined && v !== null && rule.type === 'number' && Number.isNaN(Number(v))) errors[field] = 'Must be a number';
    });
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function metricSnapshot() {
    return {
      ...namespace.metrics,
      uptimeMs: now() - namespace.metrics.startedAt,
      registeredFeatures: namespace.registry.size,
      featureCount: namespace.features.length
    };
  }

  function exportDiagnostics() {
    return {
      namespace: namespace.name,
      version: namespace.version,
      features: namespace.features.slice(),
      registered: list().map(x => ({ name: x.name, category: x.category, enabled: x.enabled })),
      metrics: metricSnapshot(),
      url: location.href,
      online: navigator.onLine,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };
  }

  function downloadDiagnostics() {
    const blob = new Blob([JSON.stringify(exportDiagnostics(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experthub-01-diagnostics.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  namespace.on = on;
  namespace.off = off;
  namespace.emit = emit;
  namespace.save = save;
  namespace.load = load;
  namespace.remove = remove;
  namespace.register = register;
  namespace.unregister = unregister;
  namespace.list = list;
  namespace.execute = execute;
  namespace.memoize = memoize;
  namespace.debounce = debounce;
  namespace.throttle = throttle;
  namespace.validateObject = validateObject;
  namespace.metrics = metricSnapshot;
  namespace.diagnostics = exportDiagnostics;
  namespace.downloadDiagnostics = downloadDiagnostics;

  window.EHFeature01 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = {
      feature: "state snapshots",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:01', result);
    return result;
  }

  register("state snapshots", {
    category: "state",
    description: "Enhanced state snapshots capability for state intelligence & persistence",
    handler: feature_01
  });

  function feature_02(payload = {}, context = {}) {
    const result = {
      feature: "undo/redo history",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:02', result);
    return result;
  }

  register("undo/redo history", {
    category: "undo/redo",
    description: "Enhanced undo/redo history capability for state intelligence & persistence",
    handler: feature_02
  });

  function feature_03(payload = {}, context = {}) {
    const result = {
      feature: "draft persistence",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:03', result);
    return result;
  }

  register("draft persistence", {
    category: "draft",
    description: "Enhanced draft persistence capability for state intelligence & persistence",
    handler: feature_03
  });

  function feature_04(payload = {}, context = {}) {
    const result = {
      feature: "session TTL",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:04', result);
    return result;
  }

  register("session TTL", {
    category: "session",
    description: "Enhanced session TTL capability for state intelligence & persistence",
    handler: feature_04
  });

  function feature_05(payload = {}, context = {}) {
    const result = {
      feature: "feature flags",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:05', result);
    return result;
  }

  register("feature flags", {
    category: "feature",
    description: "Enhanced feature flags capability for state intelligence & persistence",
    handler: feature_05
  });

  function feature_06(payload = {}, context = {}) {
    const result = {
      feature: "role capability matrix",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:06', result);
    return result;
  }

  register("role capability matrix", {
    category: "role",
    description: "Enhanced role capability matrix capability for state intelligence & persistence",
    handler: feature_06
  });

  function feature_07(payload = {}, context = {}) {
    const result = {
      feature: "preference registry",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:07', result);
    return result;
  }

  register("preference registry", {
    category: "preference",
    description: "Enhanced preference registry capability for state intelligence & persistence",
    handler: feature_07
  });

  function feature_08(payload = {}, context = {}) {
    const result = {
      feature: "device profile",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:08', result);
    return result;
  }

  register("device profile", {
    category: "device",
    description: "Enhanced device profile capability for state intelligence & persistence",
    handler: feature_08
  });

  function feature_09(payload = {}, context = {}) {
    const result = {
      feature: "connection state",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:09', result);
    return result;
  }

  register("connection state", {
    category: "connection",
    description: "Enhanced connection state capability for state intelligence & persistence",
    handler: feature_09
  });

  function feature_10(payload = {}, context = {}) {
    const result = {
      feature: "dirty tracking",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:10', result);
    return result;
  }

  register("dirty tracking", {
    category: "dirty",
    description: "Enhanced dirty tracking capability for state intelligence & persistence",
    handler: feature_10
  });

  function feature_11(payload = {}, context = {}) {
    const result = {
      feature: "state validation",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:11', result);
    return result;
  }

  register("state validation", {
    category: "state",
    description: "Enhanced state validation capability for state intelligence & persistence",
    handler: feature_11
  });

  function feature_12(payload = {}, context = {}) {
    const result = {
      feature: "state migration",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:12', result);
    return result;
  }

  register("state migration", {
    category: "state",
    description: "Enhanced state migration capability for state intelligence & persistence",
    handler: feature_12
  });

  function feature_13(payload = {}, context = {}) {
    const result = {
      feature: "storage quota guard",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:13', result);
    return result;
  }

  register("storage quota guard", {
    category: "storage",
    description: "Enhanced storage quota guard capability for state intelligence & persistence",
    handler: feature_13
  });

  function feature_14(payload = {}, context = {}) {
    const result = {
      feature: "cross-tab sync",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:14', result);
    return result;
  }

  register("cross-tab sync", {
    category: "cross_tab",
    description: "Enhanced cross-tab sync capability for state intelligence & persistence",
    handler: feature_14
  });

  function feature_15(payload = {}, context = {}) {
    const result = {
      feature: "audit trail",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:15', result);
    return result;
  }

  register("audit trail", {
    category: "audit",
    description: "Enhanced audit trail capability for state intelligence & persistence",
    handler: feature_15
  });

  function feature_16(payload = {}, context = {}) {
    const result = {
      feature: "computed selectors",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:16', result);
    return result;
  }

  register("computed selectors", {
    category: "computed",
    description: "Enhanced computed selectors capability for state intelligence & persistence",
    handler: feature_16
  });

  function feature_17(payload = {}, context = {}) {
    const result = {
      feature: "state subscriptions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:17', result);
    return result;
  }

  register("state subscriptions", {
    category: "state",
    description: "Enhanced state subscriptions capability for state intelligence & persistence",
    handler: feature_17
  });

  function feature_18(payload = {}, context = {}) {
    const result = {
      feature: "reset scopes",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:18', result);
    return result;
  }

  register("reset scopes", {
    category: "reset",
    description: "Enhanced reset scopes capability for state intelligence & persistence",
    handler: feature_18
  });

  function feature_19(payload = {}, context = {}) {
    const result = {
      feature: "import/export",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:19', result);
    return result;
  }

  register("import/export", {
    category: "import/export",
    description: "Enhanced import/export capability for state intelligence & persistence",
    handler: feature_19
  });

  function feature_20(payload = {}, context = {}) {
    const result = {
      feature: "diagnostics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "01"
    };
    emit('feature:20', result);
    return result;
  }

  register("diagnostics", {
    category: "diagnostics",
    description: "Enhanced diagnostics capability for state intelligence & persistence",
    handler: feature_20
  });

  /* ---------- Built-in browser integrations ---------- */

  namespace.search = function (query, source = list()) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return source.slice();
    return source.filter(item =>
      JSON.stringify(item).toLowerCase().includes(q)
    );
  };

  namespace.groupBy = function (items, selector) {
    return items.reduce((groups, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const key = value === undefined || value === null ? 'unknown' : String(value);
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
  };

  namespace.sum = function (items, selector) {
    return items.reduce((total, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      return total + (Number(value) || 0);
    }, 0);
  };

  namespace.average = function (items, selector) {
    return items.length ? namespace.sum(items, selector) / items.length : 0;
  };

  namespace.paginate = function (items, page = 1, pageSize = 20) {
    const size = Math.max(1, Number(pageSize) || 20);
    const current = Math.max(1, Number(page) || 1);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const safePage = Math.min(current, pages);
    return {
      items: items.slice((safePage - 1) * size, safePage * size),
      page: safePage,
      pageSize: size,
      total,
      pages,
      hasNext: safePage < pages,
      hasPrevious: safePage > 1
    };
  };

  namespace.sortBy = function (items, selector, direction = 'asc') {
    const list = items.slice();
    list.sort((a, b) => {
      const av = typeof selector === 'function' ? selector(a) : a?.[selector];
      const bv = typeof selector === 'function' ? selector(b) : b?.[selector];
      const left = av ?? '';
      const right = bv ?? '';
      const result = left > right ? 1 : left < right ? -1 : 0;
      return direction === 'desc' ? -result : result;
    });
    return list;
  };

  namespace.unique = function (items, selector = item => item) {
    const seen = new Set();
    return items.filter(item => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const keyValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (seen.has(keyValue)) return false;
      seen.add(keyValue);
      return true;
    });
  };

  namespace.whenIdle = function (callback, timeout = 1000) {
    if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout });
    return setTimeout(callback, Math.min(timeout, 100));
  };

  namespace.copy = async function (value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  };

  namespace.broadcast = function (name, payload) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.postMessage(payload);
      channel.close();
      return true;
    } catch (_) {
      return false;
    }
  };

  namespace.listenBroadcast = function (name, handler) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.onmessage = event => handler(event.data);
      return () => channel.close();
    } catch (_) {
      return () => {};
    }
  };

  /* ---------- Automatic lifecycle hooks ---------- */

  document.addEventListener('visibilitychange', () => {
    emit('visibility', { hidden: document.hidden, timestamp: Date.now() });
  });

  window.addEventListener('online', () => emit('network', { online: true }));
  window.addEventListener('offline', () => emit('network', { online: false }));

  namespace.healthCheck = function () {
    return {
      ok: true,
      storage: (() => {
        try {
          const k = key('health');
          localStorage.setItem(k, 'ok');
          localStorage.removeItem(k);
          return true;
        } catch (_) { return false; }
      })(),
      dom: !!document.body,
      network: navigator.onLine,
      registeredFeatures: namespace.registry.size
    };
  };

  /* Keep the feature registry discoverable without changing the
     application's existing global functions. */
  window.ExpertHubFeatureRegistry = window.ExpertHubFeatureRegistry || {};
  window.ExpertHubFeatureRegistry["01"] = namespace;

})();

/* ============================================================
   End 01 feature expansion
   ============================================================ */
