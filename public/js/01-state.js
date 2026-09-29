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
