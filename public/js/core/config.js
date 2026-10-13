/* ============================================================
   core/config.js — Global runtime configuration
   ============================================================ */
(function (global) {
  'use strict';

  const CONFIG = Object.freeze({
    APP_NAME: 'ExpertHub',
    APP_VERSION: '2.0.0',
    API_BASE: '',

    CURRENCY: 'USD',
    CURRENCY_SYMBOL: '$',
    SUPPORTED_CURRENCIES: ['USD', 'KES', 'NGN', 'EUR', 'GBP'],

    PLATFORM_COMMISSION: 20,
    WITHDRAWAL_HOLD_DAYS: 7,
    MIN_PAYOUT: 50,

    PER_PAGE: 20,
    DEFAULT_AVATAR: 'https://ui-avatars.com/api/?background=1e3a8a&color=fff&name=',

    PAYMENT_PROVIDERS: ['stripe', 'paystack', 'flutterwave', 'paypal', 'mpesa', 'demo'],
    USER_INTENTS: ['learn', 'consult', 'both'],
    INSTITUTION_TYPES: ['corporate', 'university', 'college', 'ngo', 'government', 'bootcamp'],
    INSTITUTION_ROLES: ['operations_manager', 'coordinator', 'instructor', 'viewer'],
    ASSESSMENT_TYPES: ['quiz', 'exam', 'project', 'practical', 'peer'],
    PROGRAMME_STATUSES: ['draft', 'active', 'paused', 'completed', 'archived'],
    SESSION_MODES: ['online', 'in_person', 'hybrid'],
    LIFECYCLE_STATUSES: [
      'invited', 'pending_approval', 'approved', 'active',
      'on_hold', 'completed', 'certified', 'withdrawn', 'waitlisted',
    ],
    SKILL_LEVELS: ['Not Assessed', 'Novice', 'Basic', 'Competent', 'Proficient', 'Expert'],
    SKILL_LEVEL_COLOURS: ['#e5e7eb', '#fecaca', '#fde68a', '#bbf7d0', '#86efac', '#22c55e'],
    DELIVERY_MODES: ['online', 'in_person', 'hybrid', 'self_paced'],
    ATTENDANCE_STATUSES: ['present', 'late', 'absent', 'excused'],
    COURSE_TYPES: ['bootcamp', 'short_course', 'tuition', 'exam_prep', 'career'],
    CONSULTATION_TYPES: ['career', 'academic', 'business', 'technical'],
    CONSULTATION_STATUSES: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
    PRIORITY_LEVELS: ['low', 'normal', 'high', 'urgent'],

    POLL_INTERVAL: 60000,
    SOCKET_RECONNECT_DELAY: 2000,
    API_TIMEOUT_MS: 30000,
    CACHE_TTL_MS: 5 * 60 * 1000,
    MAX_UPLOAD_MB: 25,

    STORAGE_KEYS: {
      TOKEN: 'token',
      REFRESH: 'refresh',
      USER: 'user',
      THEME: 'theme',
      LOCALE: 'locale',
      SIDEBAR_COLLAPSED: 'sidebar_collapsed',
    },

    ROUTES: {
      LANDING: '/',
      LOGIN: '/login',
      REGISTER: '/register',
      FORGOT: '/forgot',
      RESET: '/reset',
      VERIFY: '/verify',
      SETUP: '/setup-account',
      DASHBOARD: '/dashboard',
    },

    FEATURE_FLAGS: {
      REALTIME_CHAT: true,
      VIDEO_CALLS: true,
      ANALYTICS: true,
      WALLET_TOPUP: true,
      INSTITUTION_BRANDING: true,
      SCHEDULED_REPORTS: true,
    },

    isDevelopment() {
      return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    },
  });

  global.EH = global.EH || {};
  global.EH.CONFIG = CONFIG;
  global.EH.CONFIG_FROZEN = true;
})(window);
