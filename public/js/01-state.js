/* ============================================================
   ExpertHub 2.0 — 01-state.js
   Global configuration + shared mutable state.
   MUST load before every other app file.

   Integrates:
   - All original CONFIG entries (unaltered)
   - Reconciled CONFIG.BADGES (single authoritative set, no override
     needed in 11-user.js)
   - CONFIG.FEATURES (Sprints 3-10 gating)
   - All policy constants used by modules (REFUND_MAX_PROGRESS_PCT,
     CANCEL_FREE_HOURS, INSTANT_RESPONSE_MINS, extended-loader retry)
   - All S.* keys read by delivered user-dashboard modules
   - Forward-compat S.* buckets for Sprints 3-10
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
  CANCEL_FREE_HOURS: 24,
  INSTANT_RESPONSE_MINS: 15,

  /* ---------- E-SCHOOL ---------- */
  COURSE_TYPES: ['bootcamp','short_course','tuition','exam_prep','career','certification'],
  LESSON_TYPES: ['video','reading','quiz','assignment','live','code','download','audio','slides'],
  QUIZ_QUESTION_TYPES: ['mcq','true_false','multi_select','short_answer','essay'],
  XP_REWARDS: {
    lesson_complete: 10, quiz_pass: 25, quiz_perfect: 50,
    assignment_submit: 20, course_complete: 200, daily_streak: 5,
    forum_answer: 15, first_lesson_today: 5,
  },

  /* Reconciled BADGES — single authoritative set.
     Every entry has {name, icon, desc}; achievements.js reads all three.
     This replaces the partial set that was in 01-state.js AND the
     override that was in 11-user.js (which no longer needs to run). */
  BADGES: {
    first_lesson:       { name: 'First Steps',       icon: 'fa-shoe-prints',   desc: 'Completed your first lesson' },
    first_course:       { name: 'Course Champion',   icon: 'fa-trophy',        desc: 'Enrolled in your first course' },
    first_completion:   { name: 'Course Complete',   icon: 'fa-graduation-cap',desc: 'Completed your first course' },
    three_courses:      { name: 'Knowledge Seeker',  icon: 'fa-book-open',     desc: 'Completed 3 courses' },
    five_courses:       { name: 'Learning Machine',  icon: 'fa-rocket',        desc: 'Completed 5 courses' },
    ten_courses:        { name: 'Lifelong Learner',  icon: 'fa-brain',         desc: 'Completed 10 courses' },
    perfect_quiz:       { name: 'Perfect Score',     icon: 'fa-star',          desc: 'Scored 100% on an assessment' },
    first_certificate:  { name: 'Certified',         icon: 'fa-certificate',   desc: 'Earned your first certificate' },
    path_complete:      { name: 'Path Master',       icon: 'fa-route',         desc: 'Completed a full learning path' },
    streak_7:           { name: 'Week Warrior',      icon: 'fa-fire',          desc: '7-day learning streak' },
    streak_30:          { name: 'Month Master',      icon: 'fa-crown',         desc: '30-day learning streak' },
    first_consultation: { name: 'First Session',     icon: 'fa-comments',      desc: 'Completed your first consultation' },
    five_consultations: { name: 'Consultation Pro',  icon: 'fa-user-tie',      desc: 'Completed 5 consultations' },
    help_10:            { name: 'Helpful Hand',      icon: 'fa-hands-helping', desc: 'Answered 10 questions in the community' },
    night_owl:          { name: 'Night Owl',         icon: 'fa-moon',          desc: 'Studied after midnight 5 times' },
    early_bird:         { name: 'Early Bird',        icon: 'fa-sun',           desc: 'Studied before 6 AM 5 times' },
  },

  COURSE_REFUND_WINDOW_DAYS: 14,
  REFUND_MAX_PROGRESS_PCT: 30,
  TRIAL_DURATION_HOURS: 48,

  /* ---------- USER DASHBOARD — DATA LOADER ---------- */
  USER_EXPANDED_RETRY_MS: 8000,
  USER_EXPANDED_MAX_TRIES: 3,

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
    { code:'star',         label:'Star',           readiness:'ready_now',   performance:'high',   potential:'high' },
    { code:'high_pot',     label:'High Potential', readiness:'ready_soon',  performance:'medium', potential:'high' },
    { code:'enigma',       label:'Enigma',         readiness:'ready_later', performance:'low',    potential:'high' },
    { code:'current_star', label:'Current Star',   readiness:'ready_now',   performance:'high',   potential:'medium' },
    { code:'core',         label:'Core Player',    readiness:'ready_later', performance:'medium', potential:'medium' },
    { code:'inconsistent', label:'Inconsistent',   readiness:'developing',  performance:'low',    potential:'medium' },
    { code:'trusted',      label:'Trusted Pro',    readiness:'ready_now',   performance:'high',   potential:'low' },
    { code:'dilemma',      label:'Dilemma',        readiness:'developing',  performance:'medium', potential:'low' },
    { code:'risk',         label:'At Risk',        readiness:'not_ready',   performance:'low',    potential:'low' },
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
    trainee:     ['id','name','email','department','job_title','campus','status','progress','joined_at','last_active'],
    programme:   ['id','title','category','status','enrolled_count','capacity','avg_progress','start_date','end_date'],
    cohort:      ['id','name','programme_title','instructor_name','capacity','trainee_count','start_date','end_date','status'],
    assessment:  ['id','title','type','cohort_name','weight','due_date','submissions','avg_score','pass_rate'],
    certificate: ['serial','trainee_name','programme_title','issued_at','expires_at','cpd_points','status'],
    budget:      ['department','allocated','spent','remaining','utilization_pct','period'],
    instructor:  ['name','specialization','programmes','sessions','avg_rating','utilization_pct'],
  },

  /* ---------- FEATURE FLAGS (Sprints 3-10) ----------
     Each new sprint item ships behind a flag. Toggle per environment
     via build-time substitution or an override passed to CONFIG. */
  FEATURES: {
    /* Sprint 3 */
    cohortLearning:        false,
    courseForum:           false,
    offlineMedia:          false,
    /* Sprint 4 */
    peerStudyGroups:       false,
    courseComparison:      false,
    advancedPlayer:        false,
    learningGoals:         false,
    /* Sprint 5 */
    subscriptions:         false,
    certificationTracks:   false,
    institutionLinked:     false,
    /* Sprint 6 */
    recurringBookings:     false,
    groupConsultations:    false,
    sessionRecordings:     false,
    expertVerifiedBadges:  false,
    consultationBundles:   false,
    /* Sprint 7 */
    skillGapRecommendations: false,
    cvEnhancement:         false,
    mentorPathwayLink:     false,
    interviewAIFeedback:   false,
    pathwayProgress:       false,
    /* Sprint 8 */
    perCourseGroups:       false,
    eventCalendarRSVP:     false,
    studyChallenges:       false,
    moderationTools:       false,
    /* Sprint 9 */
    invoices:              false,
    spendingAnalytics:     false,
    refundAutomation:      false,
    supportTemplates:      false,
    gdprEnhanced:          false,
    /* Sprint 10 */
    globalSearch:          false,
    notificationCenter:    false,
    offlineReads:          false,
    accessibilityMode:     false,
  },

  /* ---------- FORWARD-COMPAT POLICY (Sprints 3-10) ---------- */
  COHORT_MAX_WAITLIST:       50,
  OFFLINE_MAX_ITEMS:         50,
  OFFLINE_MAX_MB:            500,
  FORUM_MAX_THREADS_PER_DAY: 10,
  COMPARE_MAX_COURSES:       4,
  SEARCH_MIN_QUERY_LENGTH:   2,
  NOTIFICATIONS_PER_PAGE:    25,
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
  /* ============================================================
     CORE
     ============================================================ */
  users: [], experts: [], events: [], consultations: [], courses: [], notifications: [],
  reviews: [], transactions: [], payouts: [], enrollments: [], auditLogs: [], claims: [],
  tickets: [], coupons: [], certificates: [], wallet: { balance: 0, ledger: [] }, earnings: null,
  analytics: null, eventRegistrations: [], availability: [], timeOff: [], chatMessages: {},
  expertStats: null, expertPortfolio: [],

  /* ============================================================
     PAGINATION
     ============================================================ */
  page: {
    users: 1, experts: 1, courses: 1, consultations: 1, transactions: 1,
    institutionTrainees: 1, institutionEnrollments: 1, institutionCertificates: 1,
    institutionSessions: 1, institutionProgrammes: 1, institutionCohorts: 1,
  },

  /* ============================================================
     INSTITUTIONS (admin scope)
     ============================================================ */
  institutions: [],

  /* ============================================================
     INSTITUTION (institution scope)
     ============================================================ */
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

  /* ============================================================
     USER INTENT
     ============================================================ */
  userIntent: 'both',

  /* ============================================================
     CONSULTATION EXTENSIONS
     ============================================================ */
  consultationSlots: [], consultationPackages: [], consultationTiers: [],
  consultationEscrow: {}, consultationDisputes: [], consultationFollowups: [],
  consultationRecordings: {}, expertQuestions: [], userShortlist: [], userPackages: [],
  expertConsultationAnalytics: null, adminConsultationAnalytics: null,
  expertPublicProfile: null, consultationMatchResults: [],
  instantConsultationExpert: null, corporateBudgets: [], consultationReviews: [],
  consultationReminders: [], consultationAttendees: [],

  /* ============================================================
     E-SCHOOL EXTENSIONS
     ============================================================ */
  courseCurriculum: {}, currentLesson: null, currentLessonProgress: null,
  currentQuiz: null, currentQuizAttempts: [], currentAssignment: null,
  currentAssignmentSubmission: null, lessonNotes: [], courseDiscussions: [],
  coursePaths: [], currentCoursePath: null, courseBundles: [],
  userXP: null, userBadges: [], userStreak: null, userLevel: null,
  availableTrials: [], userRefunds: [], lessonQuestions: [],
  recentWatchHistory: [], studyPartners: [], courseReviews: [],
  enrolledCourseIds: new Set(), wishlistIds: new Set(),
  courseAnalytics: null, courseCertificates: [],

  /* ============================================================
     INSTITUTION EXTENSIONS
     ============================================================ */
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

  /* ============================================================
     LEARNER DASHBOARD — DELIVERED MODULES
     ============================================================ */

  /* ---- Wishlist ---- */
  wishlist: [],

  /* ---- E-School home aggregates (Sprint 1-2) ---- */
  continueLearning:    [],
  recommendations:     [],
  liveClasses:         [],
  upcomingAssessments: [],
  recentActivity:      [],
  learningAnalytics:   {},                    // { '7d': {...}, '30d': {...}, '90d': {...} }
  courseLanguages:     ['English', 'Kiswahili'],

  /* ---- Assessments ---- */
  userAssessments: [],
  userAttempts:    [],

  /* ---- Personal development ---- */
  personalGoals:  [],
  habits:         [],
  journalEntries: [],
  decisions:      [],
  milestones:     [],

  /* ---- Academic ---- */
  academicSubjects:    [],
  studyTimetable:      [],
  academicAssignments: [],
  revisionMaterials:   [],

  /* ---- Career ---- */
  careerPathways:     [],
  careerDirectory:    [],
  careerInterests:    [],
  careerProfiles:     [],
  userCv:             null,
  interviewPrep:      [],
  savedOpportunities: [],
  careerComparisons:  [],

  /* ---- Mentorship ---- */
  mentorships: [],

  /* ---- Skills ---- */
  skillAssessments: [],

  /* ---- Productivity ---- */
  tasks:     [],
  reminders: [],

  /* ---- Community ---- */
  studyGroups:              [],
  discussionsCommunity:     [],
  communityChallenges:      [],
  communityActivity:        [],
  communityRecommendations: [],

  /* ---- Resources ---- */
  resources: [],

  /* ---- Event registrations (guarded) ---- */
  eventRegistrations: [],

  /* ============================================================
     PROFILE / SECURITY (Stage 7)
     ============================================================ */
  activeSessions:  [],
  privacySettings: null,
  securityEvents:  [],
  recoveryOptions: {},
  publicProfile:   null,

  /* ============================================================
     AI ASSISTANT (Stage 8)
     ============================================================ */
  aiConversations: [],
  aiUsage:         null,
  aiEnabled:       false,
  aiCapabilities:  [],

  /* ============================================================
     OPPORTUNITIES (Stage 8)
     ============================================================ */
  opportunities: [],

  /* ============================================================
     EXTENDED LOADER BOOKKEEPING
     ============================================================ */
  userExtLoaded:       false,
  userExtErrors:       [],
  userExtLastLoadedAt: 0,

  /* ============================================================
     FORWARD-COMPAT — SPRINTS 3-10
     Guarded buckets; empty by default until their feature flag is on.
     ============================================================ */

  /* Sprint 3 F — Cohorts */
  userCohorts:    [],
  cohortSessions: [],

  /* Sprint 3 H — Course-level discussion forum */
  courseForumThreads:    [],
  courseForumPagination: {},

  /* Sprint 3 K — Offline media downloads */
  offlineDownloads: [],   // [{ lessonId, courseId, status, sizeBytes, downloadedAt }]

  /* Sprint 4 L — Peer study groups */
  peerStudyGroups: [],

  /* Sprint 4 M — Course comparison tray */
  comparisonTray: [],     // [{ courseId }]

  /* Sprint 5 P — Subscriptions & invoices */
  subscriptionPlans:   [],
  currentSubscription: null,
  invoices:            [],

  /* Sprint 5 Q — Certification prep tracks */
  certificationTracks: [],

  /* Sprint 6 S — Recurring consultation series */
  consultationSeries: [],

  /* Sprint 6 T — Group consultations */
  groupConsultationParticipants: [],

  /* Sprint 6 U — Recording follow-ups */
  consultationFollowupFiles: [],

  /* Sprint 6 V — Verified expert badges */
  expertVerifiedBadges: [],

  /* Sprint 8 AD — Event RSVPs */
  eventRSVPs: [],

  /* Sprint 8 AE — Challenge leaderboards */
  challengeLeaderboards: {},

  /* Sprint 9 AG — Bulk invoice export job */
  invoiceExportJob: null,

  /* Sprint 10 AL — Global search */
  searchResults: null,
  searchHistory: [],

  /* Sprint 10 AM — Notification preferences */
  notificationPreferences: {},
};

/* ============================================================
   EXPERT ROLE ADDITIONS
   Declared outside S literal for clarity; safely ignored by the
   user dashboard (they simply remain empty).
   ============================================================ */
S.expertClients            = [];
S.expertNotes              = [];
S.expertReminders          = [];
S.expertTasks              = [];
S.expertProjects           = [];
S.expertMilestones         = [];
S.expertMentorships        = [];
S.expertMentorshipSessions = [];
S.expertProposals          = [];
S.expertCredentials        = [];
S.expertCPD                = [];
S.expertSkills             = [];
S.expertTeam               = [];
S.expertAnalytics          = null;
S.availabilitySettings     = { buffer_minutes: 15, advance_hours: 24 };
S.courseAnalytics          = { courses: [], totalEnrollments: 0, avgCompletion: 0, avgRating: 0, revenue30d: 0 };