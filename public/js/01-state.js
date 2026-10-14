/* ============================================================
   ExpertHub 2.0 — 01-state.js
   Global configuration + shared mutable state.
   MUST load before every other app file.
   ============================================================ */

'use strict';

/* ============================================================
   APP META
   ============================================================ */
const APP = Object.freeze({
  NAME: 'ExpertHub',
  VERSION: '2.0.0',
  BUILD: 'dev',
  ENV: (typeof window !== 'undefined' && window.__ENV__) || 'development',
  LOCALE: 'en-US',
  TIMEZONE: 'UTC',
  SUPPORT_EMAIL: 'support@experthub.io',
  LEGAL_URL: '/legal',
  TERMS_URL: '/legal/terms',
  PRIVACY_URL: '/legal/privacy',
});

/* ============================================================
   CONFIG
   ============================================================ */
const CONFIG = Object.freeze({
  /* ---------- API ---------- */
  API_BASE: '',
  API_VERSION: 'v1',
  API_TIMEOUT_MS: 30000,
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_BACKOFF_MS: 500,
  POLL_INTERVAL: 60000,
  SOCKET_PATH: '/socket.io',
  SOCKET_RECONNECT_ATTEMPTS: 10,
  SOCKET_RECONNECT_DELAY_MS: 2000,

  /* ---------- STORAGE KEYS ---------- */
  STORAGE_KEYS: Object.freeze({
    AUTH_TOKEN:    'eh.auth.token',
    REFRESH_TOKEN: 'eh.auth.refresh',
    USER:          'eh.auth.user',
    THEME:         'eh.ui.theme',
    LOCALE:        'eh.ui.locale',
    SIDEBAR:       'eh.ui.sidebar',
    ONBOARDING:    'eh.onboarding',
    DRAFT_PREFIX:  'eh.draft.',
    LAST_ROUTE:    'eh.route.last',
    CONSENT:       'eh.consent',
  }),

  /* ---------- CURRENCY ---------- */
  CURRENCY: 'USD',
  CURRENCY_SYMBOL: '$',
  CURRENCIES: Object.freeze({
    USD: { symbol: '$',  decimals: 2, locale: 'en-US' },
    EUR: { symbol: '€',  decimals: 2, locale: 'de-DE' },
    GBP: { symbol: '£',  decimals: 2, locale: 'en-GB' },
    NGN: { symbol: '₦',  decimals: 2, locale: 'en-NG' },
    KES: { symbol: 'KSh',decimals: 2, locale: 'en-KE' },
    ZAR: { symbol: 'R',  decimals: 2, locale: 'en-ZA' },
    INR: { symbol: '₹',  decimals: 2, locale: 'en-IN' },
    CAD: { symbol: 'C$', decimals: 2, locale: 'en-CA' },
    AUD: { symbol: 'A$', decimals: 2, locale: 'en-AU' },
  }),
  TAX_RATES: Object.freeze({ default: 0, vat_uk: 0.20, gst_au: 0.10, vat_ng: 0.075 }),

  /* ---------- PLATFORM FEES ---------- */
  PLATFORM_COMMISSION: 20,
  WITHDRAWAL_HOLD_DAYS: 7,
  MIN_PAYOUT: 50,
  MAX_PAYOUT: 50000,
  PAYOUT_SCHEDULE: 'weekly',
  PER_PAGE: 20,
  PAGINATION_SIZES: Object.freeze([10, 20, 50, 100]),

  /* ---------- MEDIA ---------- */
  DEFAULT_AVATAR: 'https://ui-avatars.com/api/?background=1e3a8a&color=fff&name=',
  PLACEHOLDER_IMAGE: '/assets/img/placeholder.svg',
  PLACEHOLDER_COVER: '/assets/img/cover-placeholder.jpg',
  MAX_UPLOAD_MB: 25,
  MAX_VIDEO_UPLOAD_MB: 500,
  ALLOWED_IMAGE_TYPES: Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']),
  ALLOWED_DOC_TYPES: Object.freeze(['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv', 'application/json']),
  ALLOWED_MEDIA_TYPES: Object.freeze(['video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav']),

  /* ---------- PAYMENTS ---------- */
  PAYMENT_PROVIDERS: Object.freeze(['stripe', 'paystack', 'flutterwave', 'paypal', 'demo']),
  PAYMENT_METHODS: Object.freeze(['card', 'bank_transfer', 'mobile_money', 'wallet', 'paypal']),
  PAYMENT_CURRENCIES: Object.freeze(['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'INR']),

  /* ---------- USER ---------- */
  USER_INTENTS: Object.freeze(['learn', 'consult', 'both']),
  USER_ROLES: Object.freeze(['guest', 'user', 'expert', 'institution_admin', 'institution_staff', 'admin', 'super_admin']),
  USER_STATUSES: Object.freeze(['pending', 'active', 'suspended', 'banned', 'deactivated']),
  GENDERS: Object.freeze(['male', 'female', 'non_binary', 'prefer_not_to_say']),
  ONBOARDING_STEPS: Object.freeze(['profile', 'intent', 'interests', 'availability', 'payment', 'complete']),

  /* ---------- VALIDATION ---------- */
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[0-9\s\-()]{7,20}$/,
  URL_REGEX: /^https?:\/\/[^\s]+$/i,
  USERNAME_REGEX: /^[a-zA-Z0-9_\.]{3,30}$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  OTP_LENGTH: 6,
  TIME_REGEX: /^([01]\d|2[0-3]):([0-5]\d)$/,
  DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,

  /* ---------- RATE LIMITS ---------- */
  RATE_LIMITS: Object.freeze({
    login: { max: 5, windowMs: 60000 },
    register: { max: 3, windowMs: 3600000 },
    password_reset: { max: 3, windowMs: 3600000 },
    message_send: { max: 30, windowMs: 60000 },
    review_submit: { max: 5, windowMs: 86400000 },
    api_call: { max: 600, windowMs: 60000 },
  }),

  /* ---------- INSTITUTION ---------- */
  INSTITUTION_TYPES: Object.freeze(['corporate', 'university', 'college', 'ngo', 'government', 'bootcamp']),
  INSTITUTION_ROLES: Object.freeze(['operations_manager', 'coordinator', 'instructor', 'viewer']),
  INSTITUTION_PLANS: Object.freeze(['starter', 'growth', 'enterprise']),
  CAMPUS_TYPES: Object.freeze(['main', 'branch', 'satellite', 'partner']),
  BUDGET_PERIODS: Object.freeze(['monthly', 'quarterly', 'annual']),
  PROCTOR_MODES: Object.freeze(['none', 'webcam', 'lockdown', 'ai']),
  WELLNESS_RISK_LEVELS: Object.freeze(['low', 'medium', 'high', 'critical']),
  WELLNESS_SIGNALS: Object.freeze([
    'login_frequency', 'session_attendance', 'assignment_timeliness',
    'forum_engagement', 'quiz_performance', 'feedback_sentiment',
  ]),
  SUCCESSION_BOXES: Object.freeze([
    { code: 'star',         label: 'Star',           readiness: 'ready_now',  performance: 'high',   potential: 'high'   },
    { code: 'high_pot',     label: 'High Potential', readiness: 'ready_soon', performance: 'medium', potential: 'high'   },
    { code: 'enigma',       label: 'Enigma',         readiness: 'ready_later',performance: 'low',    potential: 'high'   },
    { code: 'current_star', label: 'Current Star',   readiness: 'ready_now',  performance: 'high',   potential: 'medium' },
    { code: 'core',         label: 'Core Player',    readiness: 'ready_later',performance: 'medium', potential: 'medium' },
    { code: 'inconsistent', label: 'Inconsistent',   readiness: 'developing', performance: 'low',    potential: 'medium' },
    { code: 'trusted',      label: 'Trusted Pro',    readiness: 'ready_now',  performance: 'high',   potential: 'low'    },
    { code: 'dilemma',      label: 'Dilemma',        readiness: 'developing', performance: 'medium', potential: 'low'    },
    { code: 'risk',         label: 'At Risk',        readiness: 'not_ready',  performance: 'low',    potential: 'low'    },
  ]),
  SSO_PROVIDERS: Object.freeze(['saml', 'azure_ad', 'google_workspace', 'okta', 'onelogin', 'custom_oidc']),
  WEBHOOK_EVENTS: Object.freeze([
    'trainee.enrolled', 'trainee.completed', 'trainee.withdrawn',
    'certificate.issued', 'certificate.expired', 'programme.started',
    'programme.completed', 'assessment.submitted', 'assessment.graded',
    'session.scheduled', 'session.completed', 'budget.threshold_reached',
    'compliance.breach', 'instructor.assigned', 'report.scheduled',
  ]),
  WEBHOOK_MAX_RETRIES: 5,
  API_SCOPES: Object.freeze([
    'read:trainees', 'write:trainees', 'read:programmes', 'write:programmes',
    'read:cohorts', 'write:cohorts', 'read:assessments', 'write:assessments',
    'read:certificates', 'issue:certificates', 'read:analytics', 'read:budgets',
  ]),
  API_KEY_PREFIX: 'ehk_',
  ANNOUNCEMENT_SCOPES: Object.freeze(['all', 'campus', 'programme', 'cohort', 'department', 'role']),
  ANNOUNCEMENT_PRIORITIES: Object.freeze(['info', 'important', 'urgent', 'critical']),
  REPORT_FIELD_LIBRARY: Object.freeze({
    trainee:     ['id', 'name', 'email', 'department', 'job_title', 'campus', 'status', 'progress', 'joined_at', 'last_active'],
    programme:   ['id', 'title', 'category', 'status', 'enrolled_count', 'capacity', 'avg_progress', 'start_date', 'end_date'],
    cohort:      ['id', 'name', 'programme_title', 'instructor_name', 'capacity', 'trainee_count', 'start_date', 'end_date', 'status'],
    assessment:  ['id', 'title', 'type', 'cohort_name', 'weight', 'due_date', 'submissions', 'avg_score', 'pass_rate'],
    certificate: ['serial', 'trainee_name', 'programme_title', 'issued_at', 'expires_at', 'cpd_points', 'status'],
    budget:      ['department', 'allocated', 'spent', 'remaining', 'utilization_pct', 'period'],
    instructor:  ['name', 'specialization', 'programmes', 'sessions', 'avg_rating', 'utilization_pct'],
  }),
  REPORT_FORMATS: Object.freeze(['csv', 'xlsx', 'pdf', 'json']),
  REPORT_SCHEDULES: Object.freeze(['once', 'daily', 'weekly', 'monthly', 'quarterly']),

  /* ---------- CONSULTATION ---------- */
  CONSULTATION_STATUSES: Object.freeze([
    'pending_payment', 'pending_expert_confirmation', 'confirmed', 'scheduled',
    'in_grace', 'in_session', 'awaiting_completion', 'completed',
    'no_show', 'cancelled', 'expired', 'disputed',
  ]),
  CONSULTATION_TYPES: Object.freeze(['video', 'audio', 'chat']),
  SESSION_DURATIONS: Object.freeze([15, 30, 45, 60, 90]),
  SESSION_GRACE_MINUTES: 10,
  SESSION_REMINDER_MINUTES: Object.freeze([1440, 60, 15]),
  REFUND_POLICY: Object.freeze({ over24h: 100, over2h: 50, under2h: 0 }),
  DISPUTE_REASONS: Object.freeze(['no_show', 'poor_quality', 'wrong_expertise', 'technical_issues', 'other']),
  DISPUTE_WINDOW_DAYS: 7,
  TIP_PRESETS: Object.freeze([5, 10, 20, 50]),
  MAX_RESCHEDULES: 2,
  EXPERT_QUESTION_STATUSES: Object.freeze(['open', 'answered', 'closed']),
  CONSULTATION_TIERS: Object.freeze(['standard', 'priority', 'vip']),
  CONSULTATION_PACKAGE_SIZES: Object.freeze([1, 3, 5, 10]),

  /* ---------- E-SCHOOL ---------- */
  COURSE_TYPES: Object.freeze(['bootcamp', 'short_course', 'tuition', 'exam_prep', 'career', 'certification']),
  COURSE_LEVELS: Object.freeze(['beginner', 'intermediate', 'advanced', 'all_levels']),
  COURSE_VISIBILITY: Object.freeze(['public', 'private', 'unlisted', 'institution_only']),
  LESSON_TYPES: Object.freeze(['video', 'reading', 'quiz', 'assignment', 'live', 'code', 'download']),
  QUIZ_QUESTION_TYPES: Object.freeze(['mcq', 'true_false', 'multi_select', 'short_answer', 'essay']),
  ENROLLMENT_STATUSES: Object.freeze(['enrolled', 'in_progress', 'completed', 'dropped', 'expired']),
  XP_REWARDS: Object.freeze({
    lesson_complete: 10, quiz_pass: 25, quiz_perfect: 50,
    assignment_submit: 20, course_complete: 200, daily_streak: 5,
    forum_answer: 15, first_lesson_today: 5,
  }),
  XP_LEVELS: Object.freeze([
    { level: 1, title: 'Novice',        min: 0 },
    { level: 2, title: 'Apprentice',    min: 100 },
    { level: 3, title: 'Learner',       min: 300 },
    { level: 4, title: 'Achiever',      min: 700 },
    { level: 5, title: 'Scholar',       min: 1500 },
    { level: 6, title: 'Expert',        min: 3000 },
    { level: 7, title: 'Master',        min: 6000 },
    { level: 8, title: 'Grandmaster',   min: 12000 },
  ]),
  BADGES: Object.freeze({
    first_lesson:   { name: 'First Steps',      icon: 'fa-shoe-prints' },
    first_course:   { name: 'Course Champion',  icon: 'fa-trophy' },
    five_courses:   { name: 'Learning Machine', icon: 'fa-rocket' },
    perfect_quiz:   { name: 'Perfect Score',    icon: 'fa-star' },
    streak_7:       { name: 'Week Warrior',     icon: 'fa-fire' },
    streak_30:      { name: 'Month Master',     icon: 'fa-crown' },
    help_10:        { name: 'Helpful Hand',     icon: 'fa-hands-helping' },
    night_owl:      { name: 'Night Owl',        icon: 'fa-moon' },
    early_bird:     { name: 'Early Bird',       icon: 'fa-sun' },
  }),
  COURSE_REFUND_WINDOW_DAYS: 14,
  TRIAL_DURATION_HOURS: 48,
  COURSE_REVIEW_MIN_RATING: 1,
  COURSE_REVIEW_MAX_RATING: 5,
  CERTIFICATE_PREFIX: 'EH-CERT-',
  CERTIFICATE_VALIDITY_YEARS: 3,
  ASSESSMENT_TYPES: Object.freeze(['quiz', 'exam', 'project', 'practical', 'peer']),
  ASSESSMENT_STATUSES: Object.freeze(['draft', 'published', 'in_progress', 'submitted', 'graded', 'returned']),
  DELIVERY_MODES: Object.freeze(['online', 'in_person', 'hybrid', 'self_paced']),
  SESSION_MODES: Object.freeze(['online', 'in_person', 'hybrid']),
  ATTENDANCE_STATUSES: Object.freeze(['present', 'late', 'absent', 'excused']),

  /* ---------- PROGRAMME / COHORT ---------- */
  PROGRAMME_STATUSES: Object.freeze(['draft', 'active', 'paused', 'completed', 'archived']),
  COHORT_STATUSES: Object.freeze(['draft', 'scheduled', 'active', 'completed', 'cancelled']),
  LIFECYCLE_STATUSES: Object.freeze([
    'invited', 'pending_approval', 'approved', 'active', 'on_hold',
    'completed', 'certified', 'withdrawn', 'waitlisted',
  ]),
  SKILL_LEVELS: Object.freeze(['Not Assessed', 'Novice', 'Basic', 'Competent', 'Proficient', 'Expert']),
  SKILL_LEVEL_COLOURS: Object.freeze(['#e5e7eb', '#fecaca', '#fde68a', '#bbf7d0', '#86efac', '#22c55e']),

  /* ---------- STATUS COLOUR MAPS ---------- */
  STATUS_COLOURS: Object.freeze({
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
    info: '#3b82f6', neutral: '#6b7280', muted: '#9ca3af',
    pending: '#f59e0b', active: '#22c55e', inactive: '#6b7280',
  }),

  /* ---------- NOTIFICATIONS ---------- */
  NOTIFICATION_TYPES: Object.freeze([
    'system', 'message', 'booking', 'payment', 'payout', 'course',
    'certificate', 'assessment', 'announcement', 'reminder', 'alert',
  ]),
  NOTIFICATION_CHANNELS: Object.freeze(['in_app', 'email', 'push', 'sms']),
  TOAST_DURATION_MS: 4000,
  TOAST_MAX_VISIBLE: 3,

  /* ---------- UI ---------- */
  THEMES: Object.freeze(['light', 'dark', 'system']),
  DENSITIES: Object.freeze(['comfortable', 'compact']),
  VIEW_MODES: Object.freeze(['list', 'grid', 'table', 'kanban', 'calendar']),
  SORT_DIRECTIONS: Object.freeze(['asc', 'desc']),
  LOCALES: Object.freeze(['en-US', 'en-GB', 'fr-FR', 'es-ES', 'de-DE', 'pt-BR', 'ar-SA']),
  TIMEZONES: Object.freeze([
    'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Africa/Lagos', 'Africa/Nairobi',
    'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney',
  ]),
  DATE_FORMATS: Object.freeze({ short: 'MMM d, y', long: 'EEEE, MMMM d, y', time: 'HH:mm' }),
  DAYS_OF_WEEK: Object.freeze(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  FILE_ICON_MAP: Object.freeze({
    pdf: 'fa-file-pdf', doc: 'fa-file-word', docx: 'fa-file-word',
    xls: 'fa-file-excel', xlsx: 'fa-file-excel', csv: 'fa-file-csv',
    ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
    png: 'fa-file-image', jpg: 'fa-file-image', jpeg: 'fa-file-image',
    gif: 'fa-file-image', svg: 'fa-file-image',
    mp4: 'fa-file-video', webm: 'fa-file-video',
    mp3: 'fa-file-audio', wav: 'fa-file-audio',
    zip: 'fa-file-archive', default: 'fa-file',
  }),

  /* ---------- FEATURE FLAGS ---------- */
  FEATURE_FLAGS: Object.freeze({
    enable_socket: true,
    enable_ai_match: true,
    enable_blockchain_certs: false,
    enable_webinars: true,
    enable_forums: true,
    enable_study_partners: true,
    enable_succession: true,
    enable_wellness: true,
    enable_proctoring: false,
    enable_offline_mode: true,
    enable_analytics: true,
    enable_api: true,
  }),
});

/* ============================================================
   RUNTIME FLAGS
   ============================================================ */
const FLAGS = {
  DEBUG: CONFIG_ENV_IS_DEV(CONFIG.ENV),
  VERBOSE: false,
  USE_MOCKS: false,
  DISABLE_POLLING: false,
  FORCE_OFFLINE: false,
};
function CONFIG_ENV_IS_DEV(env) {
  return env === 'development' || env === 'dev' || env === 'local';
}

/* ============================================================
   GLOBAL SOCKET / AUTH
   ============================================================ */
let socket = null;
let socketStatus = 'disconnected'; // disconnected | connecting | connected | error
let authToken = null;
let refreshToken = null;
let tokenExpiresAt = null;
let refreshTimer = null;
let currentUser = null;
let currentUserRole = null;
let userPermissions = new Set();
let appPhase = 'landing'; // landing | auth | onboarding | app | error
let appInitialised = false;

/* ============================================================
   NAVIGATION
   ============================================================ */
let activeTab = 'dashboard';
let activeESchoolTab = 'courses';
let activeInstTab = 'overview';
let currentRoute = { name: 'landing', params: {}, query: {} };
let routeHistory = [];
let breadcrumbs = [];

/* ============================================================
   CHAT
   ============================================================ */
let currentChatId = null;
let chatTypingTimer = null;
let pollTimer = null;
let notificationsPanelOpen = false;

/* ============================================================
   UI STATE
   ============================================================ */
const UI = {
  theme: 'system',
  resolvedTheme: 'light',
  density: 'comfortable',
  locale: APP.LOCALE,
  timezone: APP.TIMEZONE,
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  activeModal: null,
  modalStack: [],
  activeDrawer: null,
  commandPaletteOpen: false,
  searchOpen: false,
  filtersPanelOpen: false,
  toasts: [],
  confirmDialog: null,
  promptDialog: null,
  contextMenu: null,
  tooltipsEnabled: true,
  reducedMotion: false,
  keyboardShortcutsEnabled: true,
  lastFocusedElement: null,
  scrollPositions: {},
  stickyHeaders: true,
  tableColumns: {},       // { [entity]: ['id','name',...] }
  tableColumnWidths: {},  // { [entity]: { id: 80, name: 200 } }
  viewMode: {},           // { [entity]: 'list'|'grid'|'table' }
  expandedRows: new Set(),
  collapsedSections: {},
};

/* ============================================================
   ASYNC / REQUEST STATE
   ============================================================ */
const ASYNC = {
  loading: {},       // { [key]: boolean }
  errors: {},        // { [key]: Error | string | null }
  inflight: {},      // { [key]: Promise }
  controllers: {},   // { [key]: AbortController }
  lastFetched: {},   // { [key]: number (timestamp) }
  cacheTTL: {},      // { [key]: number (ms) }
  retryCount: {},    // { [key]: number }
};

/* ============================================================
   FORM DRAFTS / OFFLINE QUEUE
   ============================================================ */
const FORMS = {
  drafts: {},        // { [formKey]: { data, savedAt } }
  dirty: new Set(),  // set of dirty form keys
  validationErrors: {}, // { [formKey]: { field: msg } }
  touched: {},       // { [formKey]: Set<field> }
};
const OFFLINE = {
  queue: [],         // pending writes
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSyncAt: null,
  syncInProgress: false,
};

/* ============================================================
   FILTERS / SEARCH / SORT / PAGINATION
   ============================================================ */
const FILTERS = {
  users: {}, experts: {}, courses: {}, consultations: {}, transactions: {},
  events: {}, notifications: {}, trainees: {}, programmes: {}, cohorts: {},
  assessments: {}, certificates: {}, sessions: {}, instructors: {},
  campuses: {}, announcements: {}, apiKeys: {}, webhooks: {}, auditLogs: {},
};
const SEARCH = {
  users: '', experts: '', courses: '', consultations: '', transactions: '',
  events: '', notifications: '', trainees: '', programmes: '', cohorts: '',
  assessments: '', certificates: '', sessions: '', instructors: '',
  campuses: '', announcements: '', apiKeys: '', webhooks: '', auditLogs: '',
};
const SORT = {
  users:     { field: 'created_at', dir: 'desc' },
  experts:   { field: 'rating',     dir: 'desc' },
  courses:   { field: 'created_at', dir: 'desc' },
  consultations: { field: 'scheduled_at', dir: 'desc' },
  transactions:  { field: 'created_at', dir: 'desc' },
  trainees:  { field: 'name', dir: 'asc' },
  programmes:{ field: 'created_at', dir: 'desc' },
  cohorts:   { field: 'start_date', dir: 'desc' },
};
const PAGINATION = {
  users:     { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  experts:   { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  courses:   { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  consultations: { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  transactions:  { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  institutionTrainees:      { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  institutionEnrollments:   { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  institutionCertificates:  { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  institutionSessions:      { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  institutionProgrammes:    { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
  institutionCohorts:       { page: 1, perPage: CONFIG.PER_PAGE, total: 0 },
};

/* ============================================================
   SELECTION
   ============================================================ */
let selectedRows = {
  users: new Set(),
  trainees: new Set(),
  certificates: new Set(),
  programmes: new Set(),
  cohorts: new Set(),
  campuses: new Set(),
  // additions
  experts: new Set(),
  courses: new Set(),
  consultations: new Set(),
  transactions: new Set(),
  enrollments: new Set(),
  assessments: new Set(),
  instructors: new Set(),
  announcements: new Set(),
  apiKeys: new Set(),
  webhooks: new Set(),
  auditLogs: new Set(),
  notifications: new Set(),
};

/* ============================================================
   PRIMARY STATE TREE
   ============================================================ */
const S = {
  /* ---------- Core ---------- */
  users: [], experts: [], events: [], consultations: [], courses: [], notifications: [],
  reviews: [], transactions: [], payouts: [], enrollments: [], auditLogs: [], claims: [],
  tickets: [], coupons: [], certificates: [], wallet: { balance: 0, ledger: [] }, earnings: null,
  analytics: null, eventRegistrations: [], availability: [], timeOff: [], chatMessages: {},
  expertStats: null, expertPortfolio: [],

  /* ---------- Legacy pagination shim ---------- */
  page: {
    users: 1, experts: 1, courses: 1, consultations: 1, transactions: 1,
    institutionTrainees: 1, institutionEnrollments: 1, institutionCertificates: 1,
    institutionSessions: 1, institutionProgrammes: 1, institutionCohorts: 1,
  },

  /* ---------- Institutions ---------- */
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

  /* ---------- Consultation extensions ---------- */
  consultationSlots: [], consultationPackages: [], consultationTiers: [],
  consultationEscrow: {}, consultationDisputes: [], consultationFollowups: [],
  consultationRecordings: {}, expertQuestions: [], userShortlist: [], userPackages: [],
  expertConsultationAnalytics: null, adminConsultationAnalytics: null,
  expertPublicProfile: null, consultationMatchResults: [],
  instantConsultationExpert: null, corporateBudgets: [], consultationReviews: [],
  consultationReminders: [], consultationAttendees: [],

  /* ---------- E-School extensions ---------- */
  courseCurriculum: {}, currentLesson: null, currentLessonProgress: null,
  currentQuiz: null, currentQuizAttempts: [], currentAssignment: null,
  currentAssignmentSubmission: null, lessonNotes: [], courseDiscussions: [],
  coursePaths: [], currentCoursePath: null, courseBundles: [],
  userXP: null, userBadges: [], userStreak: null, userLevel: null,
  availableTrials: [], userRefunds: [], lessonQuestions: [],
  recentWatchHistory: [], studyPartners: [], courseReviews: [],
  enrolledCourseIds: new Set(), wishlistIds: new Set(),
  courseAnalytics: null, courseCertificates: [],

  /* ---------- Institution extensions ---------- */
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

  /* ---------- NEW: messaging ---------- */
  conversations: [], activeConversationId: null, unreadCounts: {},
  typingUsers: {}, messageDrafts: {},

  /* ---------- NEW: calendar / scheduling ---------- */
  calendarEvents: [], calendarView: 'month', calendarRange: { start: null, end: null },

  /* ---------- NEW: files ---------- */
  uploads: {},         // { [uploadId]: { file, progress, status, error, url } }
  attachments: {},     // { [entityId]: Attachment[] }

  /* ---------- NEW: search / discovery ---------- */
  globalSearchResults: { users: [], experts: [], courses: [], programmes: [], events: [] },
  recentSearches: [],
  savedSearches: [],

  /* ---------- NEW: prefs ---------- */
  userPreferences: null,
  notificationPreferences: null,
  consentState: null,

  /* ---------- NEW: realtime ---------- */
  presence: {},        // { [userId]: { online, lastSeen } }
  liveEvents: [],      // ephemeral push events

  /* ---------- NEW: meta ---------- */
  lastServerSync: null,
  serverTimeOffsetMs: 0,
  buildInfo: { version: APP.VERSION, env: APP.ENV },
};

/* ============================================================
   MUTABLE COLLECTIONS (typed helpers)
   ============================================================ */
const MAPS = {
  usersById: new Map(),
  expertsById: new Map(),
  coursesById: new Map(),
  programmesById: new Map(),
  cohortsById: new Map(),
  traineesById: new Map(),
  consultationsById: new Map(),
  certificatesBySerial: new Map(),
};

const INDEXES = {
  coursesByCategory: new Map(),
  traineesByCohort: new Map(),
  sessionsByDate: new Map(),
  transactionsByUser: new Map(),
  programmesByStatus: new Map(),
};

/* ============================================================
   SMALL UTILITIES
   ============================================================ */
function isAuthenticated() {
  return Boolean(authToken && currentUser);
}

function hasPermission(perm) {
  if (!perm) return true;
  return userPermissions.has(perm) || currentUserRole === 'super_admin';
}

function setLoading(key, value = true) {
  if (!key) return;
  if (value) ASYNC.loading[key] = true;
  else delete ASYNC.loading[key];
}

function setError(key, err = null) {
  if (!key) return;
  if (err) ASYNC.errors[key] = err;
  else delete ASYNC.errors[key];
}

function resetAllState() {
  // clear primary arrays
  for (const k of Object.keys(S)) {
    const v = S[k];
    if (Array.isArray(v)) v.length = 0;
    else if (v instanceof Set) v.clear();
    else if (v instanceof Map) v.clear();
    else if (v && typeof v === 'object' && !(v instanceof Date)) {
      for (const kk of Object.keys(v)) delete v[kk];
    }
  }
  // clear async
  for (const k of Object.keys(ASYNC.loading)) delete ASYNC.loading[k];
  for (const k of Object.keys(ASYNC.errors)) delete ASYNC.errors[k];
  for (const k of Object.keys(ASYNC.inflight)) delete ASYNC.inflight[k];
  for (const k of Object.keys(ASYNC.lastFetched)) delete ASYNC.lastFetched[k];
  // clear selection
  for (const key of Object.keys(selectedRows)) selectedRows[key].clear();
  // clear maps
  for (const m of Object.values(MAPS)) m.clear();
  for (const m of Object.values(INDEXES)) m.clear();
}

/* ============================================================
   EXPORT TO GLOBAL (browser-friendly, no bundler assumed)
   ============================================================ */
if (typeof window !== 'undefined') {
  Object.assign(window, {
    APP, CONFIG, FLAGS,
    UI, ASYNC, FORMS, OFFLINE,
    FILTERS, SEARCH, SORT, PAGINATION,
    MAPS, INDEXES,
    S,
    // mutable top-level bindings
    get socket() { return socket; },
    set socket(v) { socket = v; },
    get socketStatus() { return socketStatus; },
    set socketStatus(v) { socketStatus = v; },
    get authToken() { return authToken; },
    set authToken(v) { authToken = v; },
    get refreshToken() { return refreshToken; },
    set refreshToken(v) { refreshToken = v; },
    get tokenExpiresAt() { return tokenExpiresAt; },
    set tokenExpiresAt(v) { tokenExpiresAt = v; },
    get currentUser() { return currentUser; },
    set currentUser(v) { currentUser = v; },
    get currentUserRole() { return currentUserRole; },
    set currentUserRole(v) { currentUserRole = v; },
    get userPermissions() { return userPermissions; },
    set userPermissions(v) { userPermissions = v; },
    get appPhase() { return appPhase; },
    set appPhase(v) { appPhase = v; },
    get activeTab() { return activeTab; },
    set activeTab(v) { activeTab = v; },
    get activeESchoolTab() { return activeESchoolTab; },
    set activeESchoolTab(v) { activeESchoolTab = v; },
    get activeInstTab() { return activeInstTab; },
    set activeInstTab(v) { activeInstTab = v; },
    get currentChatId() { return currentChatId; },
    set currentChatId(v) { currentChatId = v; },
    get chatTypingTimer() { return chatTypingTimer; },
    set chatTypingTimer(v) { chatTypingTimer = v; },
    get pollTimer() { return pollTimer; },
    set pollTimer(v) { pollTimer = v; },
    get notificationsPanelOpen() { return notificationsPanelOpen; },
    set notificationsPanelOpen(v) { notificationsPanelOpen = v; },
    get selectedRows() { return selectedRows; },
    set selectedRows(v) { selectedRows = v; },
    // utilities
    isAuthenticated, hasPermission, setLoading, setError, resetAllState,
  });
}9