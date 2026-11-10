/* ============================================================
   ExpertHub 2.0 — 01-state.js
   Global configuration + shared mutable state + runtime UI state.
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
  ESCROW_HOLD_HOURS: 24,
  GRACE_PERIOD_MINUTES: 10,

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
  XP_LEVEL_THRESHOLDS: [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 17000, 23000, 30000],

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
  REPORT_FORMATS: ['csv','xlsx','pdf','json'],
  REPORT_CADENCES: ['once','daily','weekly','monthly','quarterly'],
  COMPLIANCE_OPERATORS: ['lt','lte','gt','gte','eq','neq'],
  ORG_UNIT_TYPES: ['division','department','team','branch'],
  LEARNING_PATH_STATUSES: ['draft','published','archived'],
  INSTRUCTOR_CONTRACT_STATUSES: ['draft','pending_signature','active','completed','terminated'],
  ASSESSMENT_GRADING_MODES: ['manual','auto','hybrid','peer'],

  /* ---------- FEATURE FLAGS ---------- */
  FEATURES: {
    instantConsultation: true,
    videoCalls: true,
    screenShare: true,
    sessionRecording: true,
    aiMatchmaking: true,
    sessionPackages: true,
    tipsAndFollowups: true,
    courseBundles: true,
    learningPaths: true,
    studyPartners: true,
    blockchainCertificates: true,
    wellnessTracking: true,
    successionPlanning: true,
    instructorMarketplace: true,
    examProctoring: true,
    institutionApi: true,
    institutionWebhooks: true,
    institutionSso: true,
    whiteLabelBranding: true,
    scheduledReports: true,
    budgetEnforcement: true,
    commandPalette: true,
    keyboardShortcuts: true,
    offlineQueue: true,
  },

  /* ---------- RUNTIME TUNING ---------- */
  API_TIMEOUT_MS: 30000,
  API_RETRY: { attempts: 2, backoffMs: 800, statuses: [408, 429, 500, 502, 503, 504] },
  UPLOAD_MAX_MB: 25,
  SOCKET_RECONNECT: { attempts: 8, delayMs: 1000, delayMaxMs: 15000 },
  TOAST_DURATION_MS: 4200,
  DEBOUNCE_SEARCH_MS: 300,
  POLL_INTERVAL_MS: 60000,
  COMMAND_PALETTE_LIMIT: 12,
  NOTIFICATION_GROUP_LIMIT: 50,

  /* ---------- KEYBOARD SHORTCUTS ---------- */
  SHORTCUTS: {
    'mod+k': 'command-palette',
    'mod+/': 'shortcuts-help',
    'mod+n': 'new-create',
    'mod+j': 'toggle-notifications',
    'mod+b': 'toggle-sidebar',
    'mod+shift+t': 'toggle-theme',
    'escape': 'close-overlay',
  },

  /* ---------- NOTIFICATION GROUPS ---------- */
  NOTIFICATION_GROUPS: ['all','unread','consultations','courses','institution','system'],
};

/* ---------- GLOBAL STATE ---------- */
let socket = null;
let socketConnected = false;
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
let commandPaletteOpen = false;
let userMenuOpen = false;
let shortcutsHelpOpen = false;
let globalSearchQuery = '';
let globalSearchResults = [];
let globalSearchTimer = null;
let connectionStatus = navigator.onLine ? 'online' : 'offline';
let activeVideoSession = null;
let localMediaStream = null;
let remoteMediaStream = null;
let screenShareStream = null;
let sessionRecorder = null;
let sessionRecordingChunks = [];
let announceBannerDismissed = localStorage.getItem('announce_dismissed') || '';

const selectedRows = {
  users: new Set(), trainees: new Set(), certificates: new Set(),
  programmes: new Set(), cohorts: new Set(), campuses: new Set(),
  assessments: new Set(), instructors: new Set(), announcements: new Set(),
  webhooks: new Set(), apiKeys: new Set(), reports: new Set(),
  enrollments: new Set(), sessions: new Set(),
};

/* UI-level state (non-persisted, controller layer). */
const UI = {
  modal: null, modalData: null,
  drawer: null, drawerData: null,
  loading: {},              // per-section loading flags
  search: {},               // per-section search terms
  filters: {},              // per-section filter objects
  sort: {},                 // per-section sort state {key, dir}
  subTab: {},               // per-section active sub-tab
  drafts: {},               // keyed form-drafts
  toasts: [],               // queue of active toasts
  sidebarCollapsed: localStorage.getItem('sidebar_collapsed') === '1',
  notifGroup: 'all',
  theme: localStorage.getItem('theme') || 'dark',
  commandQuery: '',
  commandCursor: 0,
  paletteOpen: false,
  onlineUserIds: new Set(),
  typingIn: {},             // { [chatId]: [userId, ...] }
  unreadByGroup: { consultations: 0, courses: 0, institution: 0, system: 0 },
  wsBackoff: 0,
  lastPing: null,
  featureBanner: null,
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
    institutionInstructors: 1, institutionAssessments: 1, institutionAnnouncements: 1,
    institutionWebhooks: 1, institutionApiKeys: 1, institutionReports: 1,
  },
  pageTotals: {
    users: 0, experts: 0, courses: 0, consultations: 0, transactions: 0,
    institutionTrainees: 0, institutionEnrollments: 0, institutionCertificates: 0,
    institutionSessions: 0, institutionProgrammes: 0, institutionCohorts: 0,
    institutionInstructors: 0, institutionAssessments: 0,
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
  consultationAvailabilityRules: [], consultationNoShows: [],
  consultationRescheduleRequests: [], consultationWaitlist: [],

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
  quizBank: [], assignmentRubrics: [], peerReviewAssignments: [],
  codePlaygroundState: {}, downloadedMaterials: [],

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
  instructorRatings: [], cohortFeedback: [],
  complianceViolations: [], orgUnitsTree: [],
};

/* ---------- Persisted prefs hydration ---------- */
if (!['light','dark'].includes(UI.theme)) UI.theme = 'dark';
document.documentElement.dataset.theme = UI.theme;

/* ---------- Small memo cache for paginated GETs ---------- */
const API_CACHE = {
  store: new Map(),
  set(key, value, ttlMs = 30000) {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  },
  get(key) {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expires < Date.now()) { this.store.delete(key); return null; }
    return e.value;
  },
  invalidate(prefix = '') {
    if (!prefix) return this.store.clear();
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  },
};

/* ---------- Offline mutation queue ---------- */
const OFFLINE_QUEUE = {
  items: [],
  push(req) { this.items.push({ ...req, ts: Date.now() }); this._persist(); },
  async flush() {
    if (!navigator.onLine || !this.items.length) return;
    const pending = [...this.items];
    this.items = [];
    this._persist();
    for (const req of pending) {
      try {
        await apiCall(req.endpoint, req.method, req.body, req.isFormData);
        showToast(`Synced queued ${req.method} ${req.endpoint}`, 'success');
      } catch (e) {
        this.items.push(req);
        this._persist();
        showToast(`Sync failed: ${e.message}`, 'error');
        break;
      }
    }
  },
  _persist() {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(
        this.items.map(i => ({ ...i, body: i.isFormData ? null : i.body }))
      ));
    } catch (_) {}
  },
  _hydrate() {
    try {
      const raw = localStorage.getItem('offline_queue');
      if (raw) this.items = JSON.parse(raw).filter(r => !r.isFormData);
    } catch (_) {}
  },
};
OFFLINE_QUEUE._hydrate();

window.addEventListener('online',  () => { connectionStatus = 'online';  OFFLINE_QUEUE.flush(); });
window.addEventListener('offline', () => { connectionStatus = 'offline'; });