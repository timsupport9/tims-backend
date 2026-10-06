/* ============================================================
   ExpertHub 2.0 — 01-state.js
   Global configuration + shared mutable state.
   MUST load before every other app file.

   Sections are numbered §1..§30 so the file may be emitted in
   batches of ten and concatenated without modification.

   DEFAULT REGION: East Africa (Kenya / Uganda / Tanzania /
   Rwanda / Burundi / South Sudan / Ethiopia / Somalia /
   Djibouti / Eritrea / DRC).
   DEFAULT CURRENCY: KES (Kenyan Shilling).
   ============================================================ */

'use strict';

/* ============================================================
   §1  APP META
   ============================================================ */
const APP = Object.freeze({
  NAME: 'ExpertHub',
  SHORT_NAME: 'EH',
  TAGLINE: 'Expertise, on demand.',
  DESCRIPTION: 'East Africa\'s marketplace for vetted expertise, consultations, and structured learning.',
  VERSION: '2.0.0',
  VERSION_MAJOR: 2,
  VERSION_MINOR: 0,
  VERSION_PATCH: 0,
  BUILD: 'dev',
  BUILD_HASH: 'local',
  BUILD_TIMESTAMP: 0,
  ENV: (typeof window !== 'undefined' && window.__ENV__) || 'development',
  LOCALE: 'en-KE',
  FALLBACK_LOCALE: 'en-US',
  TIMEZONE: 'Africa/Nairobi',
  DEFAULT_REGION: 'EA',
  DEFAULT_COUNTRY: 'KE',
  DEFAULT_CURRENCY: 'KES',

  /* ---------- Contact ---------- */
  SUPPORT_EMAIL: 'support@experthub.co.ke',
  SALES_EMAIL: 'sales@experthub.co.ke',
  NOREPLY_EMAIL: 'no-reply@experthub.co.ke',
  SECURITY_EMAIL: 'security@experthub.co.ke',
  BILLING_EMAIL: 'billing@experthub.co.ke',
  PARTNERSHIPS_EMAIL: 'partners@experthub.co.ke',
  PRESS_EMAIL: 'press@experthub.co.ke',
  SUPPORT_PHONE_KE: '+254-000-000-000',
  SUPPORT_PHONE_UG: '+256-000-000-000',
  SUPPORT_PHONE_TZ: '+255-000-000-000',
  SUPPORT_WHATSAPP: '+254-000-000-000',

  /* ---------- URLs ---------- */
  BASE_URL: '',
  LEGAL_URL: '/legal',
  TERMS_URL: '/legal/terms',
  PRIVACY_URL: '/legal/privacy',
  COOKIES_URL: '/legal/cookies',
  DPA_URL: '/legal/dpa',
  REFUND_POLICY_URL: '/legal/refunds',
  STATUS_URL: '/status',
  DOCS_URL: '/docs',
  API_DOCS_URL: '/docs/api',
  CHANGELOG_URL: '/changelog',
  HELP_CENTER_URL: '/help',
  COMMUNITY_URL: '/community',
  BLOG_URL: '/blog',
  CAREERS_URL: '/careers',
  PRESS_URL: '/press',

  /* ---------- Identity ---------- */
  STORAGE_NAMESPACE: 'eh',
  SESSION_COOKIE: 'eh.sid',
  CSRF_COOKIE: 'eh.csrf',
  SUPPORTED_LOCALES: Object.freeze(['en-KE', 'en-UG', 'en-TZ', 'en-RW', 'sw-KE', 'sw-TZ', 'fr-RW', 'fr-BI', 'am-ET', 'so-SO', 'ar-SO', 'en-US', 'en-GB']),
  RTL_LOCALES: Object.freeze(['ar-SO', 'ar-SA', 'he-IL', 'fa-IR']),
  PRIMARY_LOCALES: Object.freeze(['en-KE', 'sw-KE', 'en-UG', 'en-TZ']),

  /* ---------- Legal ---------- */
  COPYRIGHT_YEAR: new Date().getFullYear(),
  COPYRIGHT: '© ExpertHub. All rights reserved.',
  COMPANY_LEGAL_NAME: 'ExpertHub East Africa Ltd.',
  COMPANY_REGISTRATION_KE: 'PVT-XXXXXXXX',
  COMPANY_REGISTRATION_UG: 'UG-XXXXXXXX',
  COMPANY_REGISTRATION_TZ: 'TZ-XXXXXXXX',
  VAT_NUMBER_KE: 'KE-VAT-XXXXXXXX',
  TAX_PIN_KE: 'PXXXXXXXXX',
  DATA_PROTECTION_ACT_KE: 'DPA-2019',
  DATA_PROTECTION_ACT_UG: 'DPA-2019',
  DATA_PROTECTION_ACT_TZ: 'PDPA-2022',
  DATA_PROTECTION_ACT_RW: 'DPA-2021',

  /* ---------- Social ---------- */
  SOCIAL: Object.freeze({
    twitter: 'https://twitter.com/experthub_ea',
    linkedin: 'https://linkedin.com/company/experthub-ea',
    facebook: 'https://facebook.com/experthub.ea',
    instagram: 'https://instagram.com/experthub.ea',
    youtube: 'https://youtube.com/@experthub-ea',
    github: 'https://github.com/experthub-ea',
    tiktok: 'https://tiktok.com/@experthub.ea',
    whatsapp_channel: 'https://whatsapp.com/channel/experthub',
  }),

  /* ---------- Regional presence ---------- */
  OFFICES: Object.freeze([
    { country: 'KE', city: 'Nairobi',   timezone: 'Africa/Nairobi',   primary: true },
    { country: 'UG', city: 'Kampala',   timezone: 'Africa/Kampala',   primary: false },
    { country: 'TZ', city: 'Dar es Salaam', timezone: 'Africa/Dar_es_Salaam', primary: false },
    { country: 'RW', city: 'Kigali',    timezone: 'Africa/Kigali',    primary: false },
    { country: 'ET', city: 'Addis Ababa', timezone: 'Africa/Addis_Ababa', primary: false },
  ]),

  /* ---------- Brand ---------- */
  BRAND: Object.freeze({
    PRIMARY: '#0f766e',
    PRIMARY_DARK: '#115e59',
    PRIMARY_LIGHT: '#5eead4',
    ACCENT: '#f59e0b',
    ACCENT_DARK: '#b45309',
    LOGO_URL: '/assets/img/logo.svg',
    LOGO_DARK_URL: '/assets/img/logo-dark.svg',
    FAVICON_URL: '/assets/img/favicon.ico',
    OG_IMAGE_URL: '/assets/img/og-image.png',
    THEME_COLOR: '#0f766e',
  }),
});

/* ============================================================
   §2  CONFIG · NETWORK & API
   ============================================================ */
const NETWORK_CONFIG = Object.freeze({
  /* ---------- API ---------- */
  API_BASE: '',
  API_VERSION: 'v1',
  API_PREFIX: '/api',
  API_TIMEOUT_MS: 30000,
  API_UPLOAD_TIMEOUT_MS: 180000,
  API_STREAM_TIMEOUT_MS: 0,
  API_DOWNLOAD_TIMEOUT_MS: 300000,
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_BACKOFF_MS: 500,
  API_RETRY_BACKOFF_FACTOR: 2,
  API_RETRY_JITTER_MS: 150,
  API_RETRY_STATUSES: Object.freeze([408, 425, 429, 500, 502, 503, 504, 522, 524]),
  API_RETRY_METHODS: Object.freeze(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']),
  API_IDEMPOTENCY_HEADER: 'Idempotency-Key',
  API_CIRCUIT_BREAKER_THRESHOLD: 5,
  API_CIRCUIT_BREAKER_TIMEOUT_MS: 60000,

  /* ---------- Headers ---------- */
  HEADER_REQUEST_ID: 'X-Request-Id',
  HEADER_CORRELATION_ID: 'X-Correlation-Id',
  HEADER_CLIENT: 'X-Client',
  HEADER_CLIENT_VERSION: 'X-Client-Version',
  HEADER_TIMEZONE: 'X-Timezone',
  HEADER_LOCALE: 'X-Locale',
  HEADER_REGION: 'X-Region',
  HEADER_CURRENCY: 'X-Currency',
  HEADER_DEVICE: 'X-Device',
  HEADER_PLATFORM: 'X-Platform',
  HEADER_TENANT: 'X-Tenant',

  /* ---------- Polling ---------- */
  POLL_INTERVAL: 60000,
  POLL_INTERVAL_FAST: 10000,
  POLL_INTERVAL_SLOW: 300000,
  POLL_MAX_BACKOFF_MS: 600000,
  POLL_PAUSE_WHEN_HIDDEN: true,
  POLL_STOP_AFTER_FAILURES: 10,

  /* ---------- Cache ---------- */
  CACHE_DEFAULT_TTL_MS: 60000,
  CACHE_LONG_TTL_MS: 900000,
  CACHE_SHORT_TTL_MS: 5000,
  CACHE_STALE_WHILE_REVALIDATE_MS: 300000,
  CACHE_MAX_ENTRIES: 500,
  CACHE_PERSIST: true,
  CACHE_VERSION: 1,

  /* ---------- Socket ---------- */
  SOCKET_URL: '',
  SOCKET_PATH: '/socket.io',
  SOCKET_TRANSPORTS: Object.freeze(['websocket', 'polling']),
  SOCKET_RECONNECT_ATTEMPTS: 10,
  SOCKET_RECONNECT_DELAY_MS: 2000,
  SOCKET_RECONNECT_DELAY_MAX_MS: 30000,
  SOCKET_ACK_TIMEOUT_MS: 10000,
  SOCKET_HEARTBEAT_MS: 25000,
  SOCKET_NAMESPACES: Object.freeze({
    DEFAULT: '/',
    CHAT: '/chat',
    NOTIFICATIONS: '/notifications',
    PRESENCE: '/presence',
    SESSIONS: '/sessions',
    INSTITUTION: '/institution',
  }),
  SOCKET_EVENTS: Object.freeze({
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    RECONNECT: 'reconnect',
    ERROR: 'error',
    MESSAGE_NEW: 'message:new',
    MESSAGE_READ: 'message:read',
    MESSAGE_TYPING: 'message:typing',
    NOTIFICATION_NEW: 'notification:new',
    PRESENCE_UPDATE: 'presence:update',
    SESSION_STARTED: 'session:started',
    SESSION_ENDED: 'session:ended',
    ORDER_UPDATED: 'order:updated',
    PAYMENT_COMPLETED: 'payment:completed',
    PAYOUT_UPDATED: 'payout:updated',
  }),

  /* ---------- SSE ---------- */
  SSE_RECONNECT_MS: 5000,
  SSE_MAX_RECONNECT_MS: 60000,
  SSE_HEARTBEAT_MS: 30000,

  /* ---------- Compression ---------- */
  ENABLE_GZIP: true,
  ENABLE_BROTLI: true,
  ENABLE_RESPONSE_CACHE: true,

  /* ---------- Rate limit awareness ---------- */
  RATE_LIMIT_HEADERS: Object.freeze({
    LIMIT: 'X-RateLimit-Limit',
    REMAINING: 'X-RateLimit-Remaining',
    RESET: 'X-RateLimit-Reset',
    RETRY_AFTER: 'Retry-After',
  }),

  /* ---------- Error envelope ---------- */
  ERROR_ENVELOPE_FIELDS: Object.freeze(['code', 'message', 'details', 'request_id', 'timestamp']),
  REQUEST_ID_FALLBACK: 'unknown',
});

/* ============================================================
   §3  CONFIG · STORAGE, CURRENCY (EAST AFRICA) & FEES
   ============================================================ */
const STORAGE_CONFIG = Object.freeze({
  /* ---------- Drivers ---------- */
  STORAGE_DRIVER: 'localStorage',
  SESSION_DRIVER: 'sessionStorage',
  COOKIE_DRIVER: 'document.cookie',
  STORAGE_PREFIX: 'eh.',
  STORAGE_VERSION: 2,
  STORAGE_ENCRYPT_SENSITIVE: false,
  STORAGE_QUOTA_WARN_PCT: 80,
  STORAGE_QUOTA_CRITICAL_PCT: 95,

  /* ---------- Keys ---------- */
  STORAGE_KEYS: Object.freeze({
    AUTH_TOKEN:     'eh.auth.token',
    REFRESH_TOKEN:  'eh.auth.refresh',
    USER:           'eh.auth.user',
    SESSION_ID:     'eh.auth.sid',
    LAST_LOGIN:     'eh.auth.lastLogin',
    LOGIN_ATTEMPTS: 'eh.auth.attempts',
    MFA_STATE:      'eh.auth.mfa',
    THEME:          'eh.ui.theme',
    DENSITY:        'eh.ui.density',
    LOCALE:         'eh.ui.locale',
    TIMEZONE:       'eh.ui.timezone',
    CURRENCY:       'eh.ui.currency',
    COUNTRY:        'eh.ui.country',
    REGION:         'eh.ui.region',
    SIDEBAR:        'eh.ui.sidebar',
    TABLE_COLUMNS:  'eh.ui.tableColumns',
    TABLE_WIDTHS:   'eh.ui.tableWidths',
    VIEW_MODE:      'eh.ui.viewMode',
    SORT_PREFS:     'eh.ui.sortPrefs',
    FILTER_PREFS:   'eh.ui.filterPrefs',
    ONBOARDING:     'eh.onboarding',
    ONBOARDING_STEP:'eh.onboarding.step',
    DRAFT_PREFIX:   'eh.draft.',
    FILTER_PREFIX:  'eh.filter.',
    LAST_ROUTE:     'eh.route.last',
    ROUTE_HISTORY:  'eh.route.history',
    CONSENT:        'eh.consent',
    COOKIE_CONSENT: 'eh.consent.cookies',
    PREFS:          'eh.prefs',
    NOTIF_PREFS:    'eh.prefs.notifications',
    EMAIL_PREFS:    'eh.prefs.email',
    PUSH_PREFS:     'eh.prefs.push',
    SMS_PREFS:      'eh.prefs.sms',
    OFFLINE_QUEUE:  'eh.offline.queue',
    OFFLINE_META:   'eh.offline.meta',
    SEARCH_HISTORY: 'eh.search.history',
    RECENT_SEARCH:  'eh.search.recent',
    SAVED_SEARCH:   'eh.search.saved',
    FEATURE_FLAGS:  'eh.flags',
    CACHE_PREFIX:   'eh.cache.',
    ANALYTICS_QUEUE:'eh.analytics.queue',
    IMPERSONATION:  'eh.auth.impersonate',
    SCROLL_POS:     'eh.ui.scroll',
    CALENDAR_VIEW:  'eh.ui.calendarView',
    WALLET_PIN:     'eh.wallet.pin',
    BIOMETRIC:      'eh.auth.biometric',
  }),

  /* ---------- Default currency (East Africa) ---------- */
  CURRENCY: 'KES',
  CURRENCY_SYMBOL: 'KSh',
  CURRENCY_LOCALE: 'en-KE',

  /* ---------- East African currencies ---------- */
  EAST_AFRICAN_CURRENCIES: Object.freeze([
    'KES', // Kenyan Shilling
    'UGX', // Ugandan Shilling
    'TZS', // Tanzanian Shilling
    'RWF', // Rwandan Franc
    'BIF', // Burundian Franc
    'SSP', // South Sudanese Pound
    'ETB', // Ethiopian Birr
    'SOS', // Somali Shilling
    'DJF', // Djiboutian Franc
    'ERN', // Eritrean Nakfa
    'CDF', // Congolese Franc (DRC — EAC member since 2022)
  ]),

  /* ---------- Full currency registry (EA-first, global fallback) ---------- */
  CURRENCIES: Object.freeze({
    /* ----- East African Community ----- */
    KES: { symbol: 'KSh',  decimals: 2, locale: 'en-KE', name: 'Kenyan Shilling',        country: 'KE', primary: true  },
    UGX: { symbol: 'USh',  decimals: 0, locale: 'en-UG', name: 'Ugandan Shilling',        country: 'UG', primary: true  },
    TZS: { symbol: 'TSh',  decimals: 0, locale: 'en-TZ', name: 'Tanzanian Shilling',      country: 'TZ', primary: true  },
    RWF: { symbol: 'FRw',  decimals: 0, locale: 'en-RW', name: 'Rwandan Franc',           country: 'RW', primary: true  },
    BIF: { symbol: 'FBu',  decimals: 0, locale: 'fr-BI', name: 'Burundian Franc',         country: 'BI', primary: true  },
    SSP: { symbol: 'SSP',  decimals: 2, locale: 'en-SS', name: 'South Sudanese Pound',    country: 'SS', primary: true  },
    ETB: { symbol: 'Br',   decimals: 2, locale: 'am-ET', name: 'Ethiopian Birr',          country: 'ET', primary: true  },
    SOS: { symbol: 'Sh.So.', decimals: 0, locale: 'so-SO', name: 'Somali Shilling',       country: 'SO', primary: true  },
    DJF: { symbol: 'Fdj',  decimals: 0, locale: 'fr-DJ', name: 'Djiboutian Franc',        country: 'DJ', primary: true  },
    ERN: { symbol: 'Nfk',  decimals: 2, locale: 'en-ER', name: 'Eritrean Nakfa',          country: 'ER', primary: true  },
    CDF: { symbol: 'FC',   decimals: 2, locale: 'fr-CD', name: 'Congolese Franc',         country: 'CD', primary: true  },

    /* ----- Global fallback ----- */
    USD: { symbol: '$',   decimals: 2, locale: 'en-US', name: 'US Dollar',                country: 'US', primary: false },
    EUR: { symbol: '€',   decimals: 2, locale: 'de-DE', name: 'Euro',                     country: 'EU', primary: false },
    GBP: { symbol: '£',   decimals: 2, locale: 'en-GB', name: 'Pound Sterling',           country: 'GB', primary: false },
    ZAR: { symbol: 'R',   decimals: 2, locale: 'en-ZA', name: 'South African Rand',       country: 'ZA', primary: false },
    INR: { symbol: '₹',   decimals: 2, locale: 'en-IN', name: 'Indian Rupee',             country: 'IN', primary: false },
    AED: { symbol: 'د.إ', decimals: 2, locale: 'ar-AE', name: 'UAE Dirham',               country: 'AE', primary: false },
    CNY: { symbol: '¥',   decimals: 2, locale: 'zh-CN', name: 'Chinese Yuan',             country: 'CN', primary: false },
    JPY: { symbol: '¥',   decimals: 0, locale: 'ja-JP', name: 'Japanese Yen',             country: 'JP', primary: false },
    CAD: { symbol: 'C$',  decimals: 2, locale: 'en-CA', name: 'Canadian Dollar',          country: 'CA', primary: false },
    AUD: { symbol: 'A$',  decimals: 2, locale: 'en-AU', name: 'Australian Dollar',        country: 'AU', primary: false },
  }),

  /* ---------- Tax rates (East Africa) ---------- */
  TAX_RATES: Object.freeze({
    default: 0,

    /* VAT */
    vat_ke: 0.16,   // Kenya VAT
    vat_ug: 0.18,   // Uganda VAT
    vat_tz: 0.18,   // Tanzania VAT
    vat_rw: 0.18,   // Rwanda VAT
    vat_bi: 0.18,   // Burundi VAT
    vat_et: 0.15,   // Ethiopia VAT
    vat_ss: 0.18,   // South Sudan VAT
    vat_dj: 0.10,   // Djibouti VAT
    vat_er: 0.05,   // Eritrea VAT (sales tax)
    vat_so: 0.10,   // Somalia sales tax
    vat_cd: 0.16,   // DRC VAT

    /* Withholding tax */
    wht_ke: 0.05,
    wht_ug: 0.06,
    wht_tz: 0.10,
    wht_rw: 0.15,
    wht_et: 0.02,
    wht_ss: 0.15,

    /* Digital service tax */
    dst_ke: 0.015,
    dst_ug: 0.06,
    dst_tz: 0.02,
    dst_rw: 0.015,

    /* Global */
    vat_uk: 0.20,
    vat_eu: 0.21,
    gst_au: 0.10,
    gst_ca: 0.05,
    gst_in: 0.18,
  }),

  /* ---------- VAT registration thresholds ---------- */
  VAT_THRESHOLDS: Object.freeze({
    KE: 5000000,      // KES
    UG: 150000000,    // UGX
    TZ: 100000000,    // TZS
    RW: 20000000,     // RWF
    ET: 1000000,      // ETB
    CD: 80000000,     // CDF
  }),

  /* ---------- Platform fees ---------- */
  PLATFORM_COMMISSION: 18,
  PLATFORM_COMMISSION_MIN: 5,
  PLATFORM_COMMISSION_MAX: 35,
  PLATFORM_COMMISSION_EDU: 12,
  PLATFORM_COMMISSION_HEALTH: 15,
  PAYMENT_PROCESSING_FEE_PCT: 2.5,
  PAYMENT_PROCESSING_FEE_FIXED: 15,     // in KES (major units)
  PAYMENT_PROCESSING_FEE_FIXED_BY_CUR: Object.freeze({
    KES: 15, UGX: 500, TZS: 300, RWF: 150, BIF: 300, ETB: 5, SSP: 200, SOS: 100, DJF: 30, ERN: 3, CDF: 400,
  }),
  WITHDRAWAL_HOLD_DAYS: 7,
  WITHDRAWAL_HOLD_DAYS_FIRST: 14,
  WITHDRAWAL_FEE_FLAT: 0,
  WITHDRAWAL_FEE_PCT: 0,
  MIN_PAYOUT: 500,                   // KES
  MAX_PAYOUT: 5000000,               // KES
  MIN_PAYOUT_BY_CUR: Object.freeze({
    KES: 500, UGX: 15000, TZS: 10000, RWF: 5000, BIF: 10000, ETB: 200, SSP: 5000, SOS: 5000, DJF: 1000, ERN: 100, CDF: 15000,
  }),
  MAX_PAYOUT_BY_CUR: Object.freeze({
    KES: 5000000, UGX: 150000000, TZS: 100000000, RWF: 50000000, BIF: 100000000,
    ETB: 2000000, SSP: 50000000, SOS: 50000000, DJF: 10000000, ERN: 1000000, CDF: 150000000,
  }),
  PAYOUT_SCHEDULE: 'weekly',
  PAYOUT_SCHEDULES: Object.freeze(['daily', 'weekly', 'biweekly', 'monthly', 'manual']),
  PAYOUT_DAYS: Object.freeze(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
  ESCROW_RELEASE_HOURS: 72,
  DISPUTE_HOLD_HOURS: 168,
  AUTO_RELEASE_HOURS: 120,
  REFUND_WINDOW_DAYS: 14,

  /* ---------- Lists ---------- */
  PER_PAGE: 20,
  PAGINATION_SIZES: Object.freeze([10, 20, 50, 100]),
  MAX_PAGE_SIZE: 250,
  MAX_BULK_OPERATION: 500,

  /* ---------- Numbers ---------- */
  THOUSAND_SEPARATOR: ',',
  DECIMAL_SEPARATOR: '.',
  LARGE_NUMBER_SHORT: Object.freeze({ k: 1000, M: 1000000, B: 1000000000, T: 1000000000000 }),
});

/* ============================================================
   §4  CONFIG · MEDIA & PAYMENTS (EAST AFRICA FOCUS)
   ============================================================ */
const MEDIA_CONFIG = Object.freeze({
  /* ---------- Placeholders ---------- */
  DEFAULT_AVATAR: 'https://ui-avatars.com/api/?background=0f766e&color=fff&name=',
  DEFAULT_AVATAR_LOCAL: '/assets/img/avatar-placeholder.svg',
  PLACEHOLDER_IMAGE: '/assets/img/placeholder.svg',
  PLACEHOLDER_COVER: '/assets/img/cover-placeholder.jpg',
  PLACEHOLDER_VIDEO: '/assets/img/video-placeholder.svg',
  PLACEHOLDER_DOC: '/assets/img/doc-placeholder.svg',
  PLACEHOLDER_AUDIO: '/assets/img/audio-placeholder.svg',
  DEFAULT_ORG_LOGO: '/assets/img/org-placeholder.svg',
  DEFAULT_COURSE_COVER: '/assets/img/course-cover.jpg',
  DEFAULT_PROGRAMME_COVER: '/assets/img/programme-cover.jpg',

  /* ---------- Limits ---------- */
  MAX_UPLOAD_MB: 25,
  MAX_VIDEO_UPLOAD_MB: 500,
  MAX_AUDIO_UPLOAD_MB: 100,
  MAX_IMAGE_UPLOAD_MB: 10,
  MAX_DOC_UPLOAD_MB: 50,
  MAX_ATTACHMENTS_PER_MESSAGE: 10,
  MAX_ATTACHMENTS_PER_POST: 20,
  MAX_TOTAL_UPLOAD_MB: 1000,
  MAX_IMAGE_DIMENSION: 6000,
  MIN_IMAGE_DIMENSION: 64,
  IMAGE_THUMBNAIL_WIDTH: 320,
  IMAGE_THUMBNAIL_HEIGHTS: Object.freeze([180, 320, 640, 1280]),
  AVATAR_MAX_DIMENSION: 512,
  COVER_MAX_DIMENSION: 2560,
  IMAGE_COMPRESSION_QUALITY: 0.82,
  IMAGE_COMPRESSION_MAX_KB: 500,

  /* ---------- MIME ---------- */
  ALLOWED_IMAGE_TYPES: Object.freeze([
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
    'image/gif', 'image/svg+xml', 'image/avif', 'image/heic',
  ]),
  ALLOWED_DOC_TYPES: Object.freeze([
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'text/markdown', 'text/rtf',
    'application/json', 'application/xml', 'text/xml',
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed', 'application/x-7z-compressed',
  ]),
  ALLOWED_MEDIA_TYPES: Object.freeze([
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
    'audio/ogg', 'audio/webm', 'audio/aac', 'audio/m4a',
  ]),
  BLOCKED_EXTENSIONS: Object.freeze([
    'exe', 'bat', 'cmd', 'sh', 'dll', 'msi', 'scr', 'jar', 'com',
    'vbs', 'js', 'jse', 'wsf', 'wsh', 'ps1', 'psm1', 'app', 'deb', 'rpm',
  ]),
  ALLOWED_EXTENSIONS: Object.freeze([
    'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'heic',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'csv', 'md', 'rtf', 'json', 'xml',
    'zip', 'rar', '7z',
    'mp4', 'webm', 'mov', 'avi',
    'mp3', 'wav', 'ogg', 'aac', 'm4a',
  ]),

  /* ---------- Video ---------- */
  VIDEO_MAX_DURATION_SEC: 7200,
  VIDEO_MIN_DURATION_SEC: 3,
  VIDEO_ACCEPTED_CODECS: Object.freeze(['h264', 'vp9', 'av1', 'hevc']),
  VIDEO_DEFAULT_QUALITY: '720p',
  VIDEO_QUALITIES: Object.freeze(['240p', '360p', '480p', '720p', '1080p', '1440p', '2160p']),
  VIDEO_MAX_BITRATE_KBPS: 8000,
  VIDEO_THUMBNAIL_COUNT: 5,

  /* ---------- Audio ---------- */
  AUDIO_MAX_DURATION_SEC: 7200,
  AUDIO_SAMPLE_RATE_HZ: 44100,
  AUDIO_BITRATE_KBPS: 128,

  /* ---------- Image CDN ---------- */
  CDN_BASE: '',
  CDN_IMAGE_PARAMS: Object.freeze({
    thumb: '?w=320&q=80&f=auto',
    medium: '?w=800&q=85&f=auto',
    large: '?w=1600&q=90&f=auto',
    original: '',
  }),

  /* ---------- Chunked upload ---------- */
  CHUNKED_UPLOAD_ENABLED: true,
  CHUNK_SIZE_MB: 5,
  CHUNK_MAX_CONCURRENT: 3,
  CHUNK_RETRY_ATTEMPTS: 3,
});

const PAYMENT_CONFIG = Object.freeze({
  /* ---------- Providers (East Africa priority) ---------- */
  PAYMENT_PROVIDERS: Object.freeze([
    'mpesa', 'airtel_money', 'tigo_pesa', 'mtn_momo', 'equitel',
    'pesapal', 'flutterwave', 'paystack', 'stripe', 'paypal', 'demo',
  ]),
  PAYMENT_PROVIDER_LABELS: Object.freeze({
    mpesa: 'M-Pesa',
    airtel_money: 'Airtel Money',
    tigo_pesa: 'Mixx by Yas (Tigo Pesa)',
    mtn_momo: 'MTN Mobile Money',
    equitel: 'Equitel',
    pesapal: 'Pesapal',
    flutterwave: 'Flutterwave',
    paystack: 'Paystack',
    stripe: 'Stripe',
    paypal: 'PayPal',
    demo: 'Demo (Sandbox)',
  }),
  PAYMENT_PROVIDER_REGIONS: Object.freeze({
    mpesa:        ['KE', 'TZ', 'MZ', 'CD', 'LS', 'GH', 'EG'],
    airtel_money: ['KE', 'UG', 'TZ', 'RW', 'ZM', 'MW', 'MG', 'NE', 'TD', 'CD'],
    tigo_pesa:    ['TZ', 'GH', 'SN'],
    mtn_momo:     ['UG', 'RW', 'GH', 'CM', 'CI', 'ZM', 'BJ'],
    equitel:      ['KE'],
    pesapal:      ['KE', 'UG', 'TZ', 'RW', 'ZM', 'ZW', 'MW'],
    flutterwave:  ['KE', 'UG', 'TZ', 'RW', 'NG', 'GH', 'ZA', 'ZM'],
    paystack:     ['KE', 'NG', 'GH', 'ZA', 'CI'],
    stripe:       ['US', 'EU', 'GB', 'CA', 'AU', 'KE', 'ZA'],
    paypal:       ['global'],
    demo:         ['*'],
  }),

  /* ---------- Payment methods ---------- */
  PAYMENT_METHODS: Object.freeze([
    'card', 'mobile_money', 'bank_transfer', 'wallet',
    'paypal', 'ussd', 'qr_code', 'invoice', 'cash_on_delivery',
  ]),
  PAYMENT_METHOD_LABELS: Object.freeze({
    card: 'Card',
    mobile_money: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
    wallet: 'ExpertHub Wallet',
    paypal: 'PayPal',
    ussd: 'USSD',
    qr_code: 'QR Code',
    invoice: 'Invoice',
    cash_on_delivery: 'Cash on Delivery',
  }),

  /* ---------- Supported currencies ---------- */
  PAYMENT_CURRENCIES: Object.freeze(['KES', 'UGX', 'TZS', 'RWF', 'BIF', 'SSP', 'ETB', 'SOS', 'DJF', 'ERN', 'CDF', 'USD', 'EUR', 'GBP', 'ZAR']),

  /* ---------- Statuses ---------- */
  PAYMENT_STATUSES: Object.freeze([
    'requires_payment_method', 'requires_confirmation', 'requires_action',
    'processing', 'pending', 'succeeded', 'failed', 'cancelled',
    'refunded', 'partially_refunded', 'disputed', 'expired', 'abandoned',
  ]),
  PAYOUT_STATUSES: Object.freeze([
    'pending', 'in_review', 'approved', 'processing', 'paid',
    'failed', 'cancelled', 'reversed', 'on_hold',
  ]),
  REFUND_STATUSES: Object.freeze(['requested', 'approved', 'rejected', 'processing', 'refunded', 'failed', 'cancelled']),
  DISPUTE_STATUSES_PAYMENT: Object.freeze(['open', 'under_review', 'won', 'lost', 'closed']),
  TRANSACTION_TYPES: Object.freeze([
    'consultation_payment', 'course_purchase', 'programme_fee', 'payout',
    'refund', 'tip', 'platform_fee', 'subscription', 'institution_invoice',
    'wallet_topup', 'wallet_withdrawal', 'adjustment', 'chargeback',
    'bundle_purchase', 'path_purchase', 'certificate_fee',
  ]),
  LEDGER_DIRECTIONS: Object.freeze(['credit', 'debit']),

  /* ---------- Wallet ---------- */
  WALLET_MIN_TOPUP: 100,              // KES
  WALLET_MAX_TOPUP: 500000,           // KES
  WALLET_MIN_TOPUP_BY_CUR: Object.freeze({
    KES: 100, UGX: 3000, TZS: 2000, RWF: 1000, ETB: 50, CDF: 3000,
  }),
  WALLET_MAX_TOPUP_BY_CUR: Object.freeze({
    KES: 500000, UGX: 15000000, TZS: 10000000, RWF: 5000000, ETB: 100000, CDF: 15000000,
  }),
  WALLET_MAX_BALANCE: 2000000,        // KES
  WALLET_AUTO_TOPUP_THRESHOLD: 200,   // KES
  WALLET_AUTO_TOPUP_AMOUNT: 1000,     // KES
  WALLET_EXPIRY_MONTHS: 24,
  WALLET_PIN_MIN_LENGTH: 4,
  WALLET_PIN_MAX_LENGTH: 6,

  /* ---------- Mobile money config ---------- */
  MOBILE_MONEY_PHONE_LENGTH: Object.freeze({
    KE: 12, UG: 12, TZ: 12, RW: 12, BI: 11, ET: 12, SS: 12, SO: 12, DJ: 11, ER: 10, CD: 12,
  }),
  MOBILE_MONEY_COUNTRY_CODES: Object.freeze({
    KE: '+254', UG: '+256', TZ: '+255', RW: '+250', BI: '+257',
    ET: '+251', SS: '+211', SO: '+252', DJ: '+253', ER: '+291', CD: '+243',
  }),
  MOBILE_MONEY_PREFIXES: Object.freeze({
    KE: ['07', '01', '+2547', '+2541'],
    UG: ['07', '03', '+2567', '+2563'],
    TZ: ['07', '06', '+2557', '+2556'],
    RW: ['07', '+2507'],
  }),
  MOBILE_MONEY_TIMEOUT_SEC: 90,
  MOBILE_MONEY_MAX_AMOUNT: 250000,    // KES per transaction
  MOBILE_MONEY_MIN_AMOUNT: 1,

  /* ---------- Card ---------- */
  CARD_BRANDS: Object.freeze(['visa', 'mastercard', 'amex', 'discover', 'verve', 'unionpay', 'jcb']),
  CARD_3DS_REQUIRED_PCT: 100,

  /* ---------- Bank transfer ---------- */
  BANK_TRANSFER_MIN_HOURS: 2,
  BANK_TRANSFER_MAX_HOURS: 72,
  BANK_TRANSFER_REFERENCE_PREFIX: 'EHT-',

  /* ---------- Subscription plans ---------- */
  SUBSCRIPTION_PLANS: Object.freeze({
    free:       { price: 0,       currency: 'KES', billing: 'monthly', features: ['basic'] },
    pro:        { price: 2500,    currency: 'KES', billing: 'monthly', features: ['pro', 'analytics'] },
    business:   { price: 7500,    currency: 'KES', billing: 'monthly', features: ['pro', 'analytics', 'api'] },
    enterprise: { price: 0,       currency: 'KES', billing: 'custom',  features: ['*'] },
  }),
});

/* ============================================================
   §5  CONFIG · USER, VALIDATION & RATE LIMITS
   ============================================================ */
const USER_CONFIG = Object.freeze({
  USER_INTENTS: Object.freeze(['learn', 'consult', 'both']),
  USER_INTENT_LABELS: Object.freeze({
    learn: 'I want to learn',
    consult: 'I want to consult an expert',
    both: 'Both',
  }),
  USER_ROLES: Object.freeze([
    'guest', 'user', 'expert', 'institution_admin',
    'institution_staff', 'institution_instructor', 'admin', 'super_admin', 'support',
  ]),
  USER_ROLE_HIERARCHY: Object.freeze({
    guest: 0,
    user: 10,
    expert: 20,
    institution_staff: 30,
    institution_instructor: 35,
    institution_admin: 40,
    support: 50,
    admin: 80,
    super_admin: 100,
  }),
  USER_STATUSES: Object.freeze(['pending', 'active', 'suspended', 'banned', 'deactivated', 'archived']),
  USER_VERIFICATION_LEVELS: Object.freeze(['none', 'email', 'phone', 'identity', 'expert_verified', 'institutional']),
  GENDERS: Object.freeze(['male', 'female', 'non_binary', 'prefer_not_to_say']),
  ONBOARDING_STEPS: Object.freeze(['welcome', 'profile', 'intent', 'interests', 'availability', 'payment', 'verify', 'complete']),
  ONBOARDING_STEP_WEIGHTS: Object.freeze({
    welcome: 0, profile: 25, intent: 10, interests: 15,
    availability: 15, payment: 15, verify: 20, complete: 0,
  }),
  EXPERT_LEVELS: Object.freeze(['junior', 'mid', 'senior', 'lead', 'principal']),
  EXPERT_LEVEL_LABELS: Object.freeze({
    junior: 'Junior Expert', mid: 'Mid-level Expert', senior: 'Senior Expert',
    lead: 'Lead Expert', principal: 'Principal Expert',
  }),
  EXPERT_STATUSES: Object.freeze(['draft', 'pending_review', 'approved', 'rejected', 'suspended', 'retired']),
  LANGUAGE_PROFICIENCIES: Object.freeze(['basic', 'conversational', 'professional', 'fluent', 'native']),
  LANGUAGE_PROFICIENCY_WEIGHTS: Object.freeze({ basic: 1, conversational: 2, professional: 3, fluent: 4, native: 5 }),

  /* ---------- Common East African languages ---------- */
  COMMON_LANGUAGES: Object.freeze([
    'English', 'Swahili', 'Kikuyu', 'Luo', 'Kamba', 'Kalenjin', 'Luhya',
    'Luganda', 'Runyankole', 'Acholi', 'Ateso', 'Langi',
    'Chichewa', 'Kinyarwanda', 'Kirundi', 'Amharic', 'Oromo', 'Tigrinya',
    'Somali', 'Arabic', 'French', 'Lingala', 'Swahili (Congo)',
  ]),

  /* ---------- Limits ---------- */
  MAX_INTERESTS: 20,
  MAX_SKILLS: 40,
  MAX_LANGUAGES: 10,
  MAX_PORTFOLIO_ITEMS: 30,
  MAX_CERTIFICATIONS: 25,
  MAX_EDUCATION_ENTRIES: 10,
  MAX_EXPERIENCE_ENTRIES: 20,
  MAX_BIO_LENGTH: 2000,
  MAX_BIO_MIN_LENGTH: 80,
  MAX_HEADLINE_LENGTH: 140,
  MAX_HEADLINE_MIN_LENGTH: 10,
  MIN_EXPERT_YEARS: 1,
  MAX_EXPERT_YEARS: 60,
  MIN_AGE: 13,
  MAX_AGE: 120,
  MAX_NAME_LENGTH: 120,
  MAX_USERNAME_LENGTH: 30,
  MIN_USERNAME_LENGTH: 3,
  MAX_DISPLAY_NAME_LENGTH: 60,

  /* ---------- Profile completion weights ---------- */
  PROFILE_COMPLETION_WEIGHTS: Object.freeze({
    avatar: 10, bio: 15, headline: 10, skills: 15, languages: 5,
    experience: 15, education: 10, certifications: 10, portfolio: 10,
  }),
  PROFILE_COMPLETION_MIN_FOR_MATCHING: 60,

  /* ---------- Expert verification ---------- */
  EXPERT_VERIFICATION_DOCS: Object.freeze([
    'government_id', 'professional_certificate', 'degree',
    'employment_letter', 'portfolio_proof', 'tax_certificate',
  ]),
  EXPERT_VERIFICATION_TTL_DAYS: 365,
  EXPERT_REVIEW_SLA_HOURS: 48,
  EXPERT_MIN_RATING_FOR_FEATURED: 4.5,
  EXPERT_MIN_SESSIONS_FOR_FEATURED: 25,

  /* ---------- Referrals ---------- */
  REFERRAL_BONUS_REFERRER: 500,       // KES
  REFERRAL_BONUS_REFEREE: 250,        // KES
  REFERRAL_MAX_PER_USER: 50,
  REFERRAL_EXPIRY_DAYS: 90,
});

const VALIDATION_CONFIG = Object.freeze({
  /* ---------- Regex library ---------- */
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  PHONE_REGEX: /^\+?[0-9\s\-()]{7,20}$/,
  PHONE_EA_REGEX: /^\+?(254|255|256|250|257|251|211|252|253|291|243)[0-9]{7,9}$/,
  URL_REGEX: /^https?:\/\/[^\s]+$/i,
  USERNAME_REGEX: /^[a-zA-Z0-9_\.]{3,30}$/,
  SLUG_REGEX: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR_REGEX: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i,
  CURRENCY_CODE_REGEX: /^[A-Z]{3}$/,
  COUNTRY_CODE_REGEX: /^[A-Z]{2}$/,
  OTP_REGEX: /^\d{6}$/,
  TIME_REGEX: /^([01]\d|2[0-3]):([0-5]\d)$/,
  TIME_12_REGEX: /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i,
  DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
  DATE_DMY_REGEX: /^\d{2}\/\d{2}\/\d{4}$/,
  DATETIME_REGEX: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
  CRON_REGEX: /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/,
  IPV4_REGEX: /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/,
  IPV6_REGEX: /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i,
  MAC_REGEX: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  BASE64_REGEX: /^[A-Za-z0-9+/]*={0,2}$/,
  JWT_REGEX: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
  BANK_ACCOUNT_KE_REGEX: /^\d{10,16}$/,
  MPESA_CODE_REGEX: /^[A-Z0-9]{10}$/,
  TILL_NUMBER_REGEX: /^\d{5,7}$/,
  PAYBILL_REGEX: /^\d{5,7}$/,
  KRA_PIN_REGEX: /^[A-Z]\d{9}[A-Z]$/i,
  TIN_UG_REGEX: /^\d{10}$/,
  NIN_UG_REGEX: /^[A-Z]{2}\d{7}[A-Z0-9]{4}$/i,
  TIN_TZ_REGEX: /^\d{9}$/,
  NATIONAL_ID_KE_REGEX: /^\d{7,8}$/,
  PASSPORT_REGEX: /^[A-Z0-9]{6,9}$/i,
  NHIF_REGEX: /^\d{6,9}$/,
  SHA_REGEX: /^\d{6,9}$/,

  /* ---------- Password rules ---------- */
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  PASSWORD_STRONG_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/,
  PASSWORD_HISTORY_COUNT: 5,
  PASSWORD_ROTATION_DAYS: 0,
  PASSWORD_BREACH_CHECK: true,
  PASSWORD_COMMON_BLOCKLIST_URL: '/assets/data/common-passwords.txt',

  /* ---------- OTP ---------- */
  OTP_LENGTH: 6,
  OTP_TTL_SECONDS: 600,
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_COOLDOWN_SEC: 60,

  /* ---------- Content limits ---------- */
  MAX_TEXT_LENGTH: 10000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_REVIEW_LENGTH: 3000,
  MAX_MESSAGE_LENGTH: 5000,
  MAX_TITLE_LENGTH: 200,
  MAX_SUMMARY_LENGTH: 500,
  MAX_TAG_LENGTH: 40,
  MAX_TAGS: 15,
  MAX_FILE_NAME_LENGTH: 255,
  MAX_URL_LENGTH: 2048,

  /* ---------- Number ranges ---------- */
  RATING_MIN: 1,
  RATING_MAX: 5,
  RATING_STEP: 1,
  PRICE_MIN: 0,
  PRICE_MAX: 1000000,                 // KES
  PRICE_MAX_BY_CUR: Object.freeze({
    KES: 1000000, UGX: 30000000, TZS: 20000000, RWF: 10000000, ETB: 200000, CDF: 30000000,
  }),
  QUANTITY_MIN: 1,
  QUANTITY_MAX: 999,
});

const RATE_LIMIT_CONFIG = Object.freeze({
  RATE_LIMITS: Object.freeze({
    login:               { max: 5,   windowMs: 60000 },
    login_failed:        { max: 10,  windowMs: 900000 },
    login_ip:            { max: 30,  windowMs: 300000 },
    register:            { max: 3,   windowMs: 3600000 },
    register_ip:         { max: 10,  windowMs: 3600000 },
    password_reset:      { max: 3,   windowMs: 3600000 },
    password_change:     { max: 5,   windowMs: 3600000 },
    email_verify:        { max: 5,   windowMs: 3600000 },
    otp_request:         { max: 5,   windowMs: 900000 },
    otp_verify:          { max: 10,  windowMs: 900000 },
    mfa_challenge:       { max: 10,  windowMs: 300000 },
    message_send:        { max: 30,  windowMs: 60000 },
    message_bulk:        { max: 5,   windowMs: 3600000 },
    review_submit:       { max: 5,   windowMs: 86400000 },
    booking_create:      { max: 10,  windowMs: 3600000 },
    booking_cancel:      { max: 20,  windowMs: 3600000 },
    booking_reschedule:  { max: 10,  windowMs: 3600000 },
    withdraw_request:    { max: 5,   windowMs: 86400000 },
    deposit_request:     { max: 20,  windowMs: 3600000 },
    wallet_transfer:     { max: 20,  windowMs: 3600000 },
    upload:              { max: 50,  windowMs: 3600000 },
    upload_large:        { max: 5,   windowMs: 3600000 },
    report_generate:     { max: 10,  windowMs: 3600000 },
    api_call:            { max: 600, windowMs: 60000 },
    api_call_write:      { max: 120, windowMs: 60000 },
    search:              { max: 120, windowMs: 60000 },
    search_global:       { max: 60,  windowMs: 60000 },
    export_data:         { max: 5,   windowMs: 86400000 },
    delete_account:      { max: 1,   windowMs: 86400000 },
    report_content:      { max: 10,  windowMs: 86400000 },
    follow_user:         { max: 100, windowMs: 3600000 },
    apply_expert:        { max: 2,   windowMs: 86400000 },
    request_payout:      { max: 5,   windowMs: 86400000 },
  }),
  RATE_LIMIT_BLOCK_MS: 900000,
  RATE_LIMIT_STORAGE_KEY: 'eh.ratelimit',
  RATE_LIMIT_BY_IP: true,
  RATE_LIMIT_BY_USER: true,
  RATE_LIMIT_BY_API_KEY: true,
  RATE_LIMIT_SLIDING_WINDOW: true,
});

/* ============================================================
   §6  CONFIG · INSTITUTION
   ============================================================ */
const INSTITUTION_CONFIG = Object.freeze({
  INSTITUTION_TYPES: Object.freeze([
    'corporate', 'university', 'college', 'tvet', 'ngo', 'government',
    'bootcamp', 'school', 'hospital', 'bank', 'telecom', 'cooperative',
    'sacco', 'county_government', 'faith_based',
  ]),
  INSTITUTION_TYPE_LABELS: Object.freeze({
    corporate: 'Corporation', university: 'University', college: 'College',
    tvet: 'TVET Institution', ngo: 'NGO / Nonprofit', government: 'Government',
    bootcamp: 'Bootcamp', school: 'School', hospital: 'Hospital',
    bank: 'Bank / Financial', telecom: 'Telecom', cooperative: 'Cooperative',
    sacco: 'SACCO', county_government: 'County Government', faith_based: 'Faith-Based',
  }),
  INSTITUTION_ROLES: Object.freeze(['operations_manager', 'coordinator', 'instructor', 'viewer', 'analyst', 'auditor']),
  INSTITUTION_ROLE_PERMISSIONS: Object.freeze({
    operations_manager: ['*'],
    coordinator: ['read:*', 'write:trainees', 'write:cohorts', 'write:announcements'],
    instructor: ['read:*', 'write:assessments', 'write:sessions', 'grade:assessments'],
    viewer: ['read:*'],
    analyst: ['read:analytics', 'read:reports', 'write:reports'],
    auditor: ['read:audit', 'read:compliance'],
  }),
  INSTITUTION_PLANS: Object.freeze(['starter', 'growth', 'enterprise', 'education']),
  INSTITUTION_PLAN_LIMITS: Object.freeze({
    starter:   { seats: 50,   campuses: 1,  storage_gb: 10,  api_calls: 10000,   reports: 5 },
    growth:    { seats: 500,  campuses: 10, storage_gb: 100, api_calls: 100000,  reports: 50 },
    enterprise:{ seats: -1,   campuses: -1, storage_gb: -1,  api_calls: -1,      reports: -1 },
    education: { seats: 5000, campuses: 50, storage_gb: 500, api_calls: 1000000, reports: 500 },
  }),
  INSTITUTION_PLAN_PRICING_KES: Object.freeze({
    starter: 25000, growth: 120000, enterprise: 0, education: 75000,
  }),
  INSTITUTION_STATUSES: Object.freeze(['pending', 'trial', 'active', 'past_due', 'suspended', 'cancelled']),
  CAMPUS_TYPES: Object.freeze(['main', 'branch', 'satellite', 'partner', 'virtual']),
  BUDGET_PERIODS: Object.freeze(['monthly', 'quarterly', 'annual']),
  BUDGET_STATUSES: Object.freeze(['draft', 'active', 'exhausted', 'closed']),
  BUDGET_ALERT_THRESHOLDS: Object.freeze([50, 75, 90, 100]),
  PROCTOR_MODES: Object.freeze(['none', 'webcam', 'lockdown', 'ai', 'hybrid']),
  PROCTOR_STATUSES: Object.freeze(['scheduled', 'active', 'completed', 'flagged', 'invalidated']),
  PROCTOR_FLAG_TYPES: Object.freeze([
    'face_not_visible', 'multiple_faces', 'looking_away', 'background_noise',
    'tab_switch', 'copy_paste', 'screen_share', 'audio_anomaly', 'identity_mismatch',
  ]),
  WELLNESS_RISK_LEVELS: Object.freeze(['low', 'medium', 'high', 'critical']),
  WELLNESS_RISK_COLOURS: Object.freeze({ low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }),
  WELLNESS_SIGNALS: Object.freeze([
    'login_frequency', 'session_attendance', 'assignment_timeliness',
    'forum_engagement', 'quiz_performance', 'feedback_sentiment',
    'peer_interaction', 'mentor_checkins', 'resource_access',
  ]),
  WELLNESS_SIGNAL_WEIGHTS: Object.freeze({
    login_frequency: 0.10, session_attendance: 0.20, assignment_timeliness: 0.15,
    forum_engagement: 0.10, quiz_performance: 0.15, feedback_sentiment: 0.10,
    peer_interaction: 0.10, mentor_checkins: 0.05, resource_access: 0.05,
  }),
  WELLNESS_ALERT_STATUSES: Object.freeze(['open', 'acknowledged', 'escalated', 'resolved', 'dismissed']),
  WELLNESS_SCORE_RANGE: Object.freeze({ min: 0, max: 100 }),
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
  READINESS_LEVELS: Object.freeze(['ready_now', 'ready_soon', 'ready_later', 'developing', 'not_ready']),
  READINESS_HORIZONS: Object.freeze({ ready_now: '0-6 months', ready_soon: '6-12 months', ready_later: '12-24 months', developing: '24+ months', not_ready: 'not ready' }),
  SSO_PROVIDERS: Object.freeze(['saml', 'azure_ad', 'google_workspace', 'okta', 'onelogin', 'custom_oidc']),
  SSO_STATUSES: Object.freeze(['not_configured', 'configured', 'testing', 'enabled', 'error']),
  SSO_DEFAULT_MAPPINGS: Object.freeze({
    email: 'email', name: 'name', firstName: 'given_name', lastName: 'family_name',
    department: 'department', employeeId: 'employee_id', role: 'role',
  }),
  WEBHOOK_EVENTS: Object.freeze([
    'trainee.enrolled', 'trainee.completed', 'trainee.withdrawn', 'trainee.updated',
    'certificate.issued', 'certificate.expired', 'certificate.revoked',
    'programme.started', 'programme.completed', 'programme.created',
    'cohort.started', 'cohort.completed',
    'assessment.submitted', 'assessment.graded',
    'session.scheduled', 'session.completed', 'session.cancelled',
    'budget.threshold_reached', 'budget.exhausted',
    'compliance.breach', 'compliance.run_completed',
    'instructor.assigned', 'instructor.removed',
    'report.scheduled', 'report.ready',
    'wellness.alert', 'wellness.escalated',
  ]),
  WEBHOOK_EVENT_LABELS: Object.freeze({
    'trainee.enrolled': 'Trainee Enrolled',
    'trainee.completed': 'Trainee Completed',
    'trainee.withdrawn': 'Trainee Withdrawn',
    'certificate.issued': 'Certificate Issued',
    'programme.started': 'Programme Started',
    'assessment.submitted': 'Assessment Submitted',
    'session.scheduled': 'Session Scheduled',
    'budget.threshold_reached': 'Budget Threshold Reached',
    'compliance.breach': 'Compliance Breach',
    'wellness.alert': 'Wellness Alert',
  }),
  WEBHOOK_STATUSES: Object.freeze(['active', 'paused', 'failing', 'disabled']),
  WEBHOOK_MAX_RETRIES: 5,
  WEBHOOK_TIMEOUT_MS: 15000,
  WEBHOOK_SIGNATURE_HEADER: 'X-EH-Signature',
  WEBHOOK_SIGNATURE_ALGO: 'sha256',
  WEBHOOK_BACKOFF_BASE_MS: 30000,
  WEBHOOK_BACKOFF_FACTOR: 3,
  API_SCOPES: Object.freeze([
    'read:trainees', 'write:trainees', 'read:programmes', 'write:programmes',
    'read:cohorts', 'write:cohorts', 'read:assessments', 'write:assessments',
    'read:certificates', 'issue:certificates', 'read:analytics', 'read:budgets',
    'write:budgets', 'read:instructors', 'write:instructors', 'read:audit',
    'read:compliance', 'write:compliance', 'read:wellness', 'write:wellness',
    'read:sessions', 'write:sessions', 'read:campuses', 'write:campuses',
  ]),
  API_KEY_PREFIX: 'ehk_',
  API_KEY_LENGTH: 48,
  API_KEY_STATUSES: Object.freeze(['active', 'revoked', 'expired']),
  API_KEY_DEFAULT_TTL_DAYS: 365,
  API_KEY_MAX_PER_INSTITUTION: 20,
  API_KEY_ROTATION_DAYS: 90,
  ANNOUNCEMENT_SCOPES: Object.freeze(['all', 'campus', 'programme', 'cohort', 'department', 'role', 'individual']),
  ANNOUNCEMENT_PRIORITIES: Object.freeze(['info', 'important', 'urgent', 'critical']),
  ANNOUNCEMENT_PRIORITY_COLOURS: Object.freeze({ info: '#3b82f6', important: '#f59e0b', urgent: '#f97316', critical: '#ef4444' }),
  ANNOUNCEMENT_STATUSES: Object.freeze(['draft', 'scheduled', 'published', 'archived']),
  ANNOUNCEMENT_CHANNELS: Object.freeze(['in_app', 'email', 'sms', 'push', 'whatsapp']),
  REPORT_FIELD_LIBRARY: Object.freeze({
    trainee:     ['id', 'name', 'email', 'phone', 'department', 'job_title', 'campus', 'status', 'progress', 'joined_at', 'last_active', 'manager', 'employee_id'],
    programme:   ['id', 'title', 'category', 'status', 'enrolled_count', 'capacity', 'avg_progress', 'completion_rate', 'start_date', 'end_date', 'budget'],
    cohort:      ['id', 'name', 'programme_title', 'instructor_name', 'capacity', 'trainee_count', 'start_date', 'end_date', 'status', 'campus'],
    assessment:  ['id', 'title', 'type', 'cohort_name', 'weight', 'due_date', 'submissions', 'avg_score', 'pass_rate', 'graded_count'],
    certificate: ['serial', 'trainee_name', 'programme_title', 'issued_at', 'expires_at', 'cpd_points', 'status', 'verification_url'],
    budget:      ['department', 'allocated', 'spent', 'remaining', 'utilization_pct', 'period', 'currency', 'owner'],
    instructor:  ['name', 'email', 'specialization', 'programmes', 'sessions', 'avg_rating', 'utilization_pct', 'cost'],
    session:     ['id', 'title', 'cohort_name', 'instructor_name', 'scheduled_at', 'duration_min', 'attendance_rate', 'mode', 'location'],
    compliance:  ['rule', 'scope', 'status', 'last_run', 'violations', 'owner', 'severity', 'deadline'],
    wellness:    ['trainee_name', 'risk_level', 'score', 'signals', 'last_checkin', 'interventions'],
  }),
  REPORT_FORMATS: Object.freeze(['csv', 'xlsx', 'pdf', 'json', 'xml']),
  REPORT_SCHEDULES: Object.freeze(['once', 'daily', 'weekly', 'monthly', 'quarterly']),
  REPORT_STATUSES: Object.freeze(['queued', 'running', 'ready', 'failed', 'expired']),
  REPORT_RETENTION_DAYS: 90,
  REPORT_MAX_ROWS: 500000,
  COMPLIANCE_RULE_SEVERITIES: Object.freeze(['low', 'medium', 'high', 'critical']),
  COMPLIANCE_RULE_TYPES: Object.freeze([
    'attendance', 'completion', 'certification', 'budget', 'training_hours',
    'assessment_score', 'data_retention', 'access_control', 'audit_trail',
  ]),
  ORG_UNIT_TYPES: Object.freeze(['division', 'department', 'team', 'unit', 'region', 'branch']),
  IMPORT_STATUSES: Object.freeze(['uploaded', 'validating', 'validated', 'importing', 'completed', 'failed']),
  IMPORT_MAX_ROWS: 50000,
  IMPORT_CHUNK_SIZE: 500,
  IMPORT_ALLOWED_TYPES: Object.freeze(['csv', 'xlsx']),
  LEARNING_PATH_MAX_ITEMS: 50,
  SKILLS_MATRIX_MAX_SKILLS: 200,
});

/* ============================================================
   §7  CONFIG · CONSULTATION
   ============================================================ */
const CONSULTATION_CONFIG = Object.freeze({
  CONSULTATION_STATUSES: Object.freeze([
    'pending_payment', 'pending_expert_confirmation', 'confirmed', 'scheduled',
    'in_grace', 'in_session', 'awaiting_completion', 'completed',
    'no_show', 'cancelled', 'expired', 'disputed', 'refunded', 'rescheduled',
  ]),
  CONSULTATION_STATUS_LABELS: Object.freeze({
    pending_payment: 'Awaiting Payment',
    pending_expert_confirmation: 'Awaiting Expert Confirmation',
    confirmed: 'Confirmed',
    scheduled: 'Scheduled',
    in_grace: 'In Grace Period',
    in_session: 'In Session',
    awaiting_completion: 'Awaiting Completion',
    completed: 'Completed',
    no_show: 'No Show',
    cancelled: 'Cancelled',
    expired: 'Expired',
    disputed: 'Disputed',
    refunded: 'Refunded',
    rescheduled: 'Rescheduled',
  }),
  CONSULTATION_TYPES: Object.freeze(['video', 'audio', 'chat', 'in_person']),
  CONSULTATION_TYPE_LABELS: Object.freeze({
    video: 'Video Call', audio: 'Audio Call', chat: 'Text Chat', in_person: 'In Person',
  }),
  CONSULTATION_TIERS: Object.freeze(['standard', 'priority', 'vip']),
  TIER_MULTIPLIERS: Object.freeze({ standard: 1, priority: 1.35, vip: 1.8 }),
  TIER_SLA_RESPONSE_HOURS: Object.freeze({ standard: 24, priority: 6, vip: 1 }),
  SESSION_DURATIONS: Object.freeze([15, 30, 45, 60, 90, 120]),
  SESSION_DURATION_DEFAULT: 30,
  SESSION_GRACE_MINUTES: 10,
  SESSION_REMINDER_MINUTES: Object.freeze([1440, 60, 15, 5]),
  SESSION_MAX_DURATION_MIN: 240,
  SESSION_OVERTIME_GRACE_MIN: 10,
  MAX_RESCHEDULES: 2,
  RESCHEDULE_MIN_NOTICE_HOURS: 24,
  CANCEL_MIN_NOTICE_HOURS: 24,
  BOOKING_MIN_LEAD_MINUTES: 60,
  BOOKING_MAX_HORIZON_DAYS: 120,
  REFUND_POLICY: Object.freeze({ over24h: 100, over2h: 50, under2h: 0 }),
  DISPUTE_REASONS: Object.freeze(['no_show', 'poor_quality', 'wrong_expertise', 'technical_issues', 'other', 'late_start', 'incomplete']),
  DISPUTE_STATUSES: Object.freeze(['open', 'under_review', 'resolved_buyer', 'resolved_expert', 'resolved_split', 'closed']),
  DISPUTE_WINDOW_DAYS: 7,
  DISPUTE_AUTO_ESCALATE_HOURS: 72,
  DISPUTE_EVIDENCE_MAX_FILES: 10,
  TIP_PRESETS: Object.freeze([50, 100, 200, 500]),         // KES
  TIP_MAX_PCT: 50,
  EXPERT_QUESTION_STATUSES: Object.freeze(['open', 'answered', 'closed']),
  EXPERT_QUESTION_TTL_DAYS: 14,
  CONSULTATION_PACKAGE_SIZES: Object.freeze([1, 3, 5, 10]),
  PACKAGE_DISCOUNTS: Object.freeze({ 1: 0, 3: 0.05, 5: 0.10, 10: 0.18 }),
  PACKAGE_EXPIRY_DAYS: 180,
  SLOT_DURATION_MIN: 30,
  SLOT_BUFFER_MIN: 10,
  AVAILABILITY_RECURRENCE: Object.freeze(['none', 'daily', 'weekly', 'biweekly', 'monthly']),
  TIME_OFF_STATUSES: Object.freeze(['pending', 'approved', 'rejected', 'cancelled']),
  RECORDING_RETENTION_DAYS: 60,
  RECORDING_CONSENT_REQUIRED: true,
  RECORDING_FORMATS: Object.freeze(['mp4', 'webm', 'm3u8']),
  FOLLOWUP_MAX_DAYS: 30,
  FOLLOWUP_MAX_MESSAGES: 20,
  MATCH_WEIGHT_SKILL: 0.40,
  MATCH_WEIGHT_RATING: 0.25,
  MATCH_WEIGHT_PRICE: 0.15,
  MATCH_WEIGHT_AVAILABILITY: 0.10,
  MATCH_WEIGHT_HISTORY: 0.10,
  MATCH_MIN_SCORE: 0.35,
  MATCH_MAX_RESULTS: 25,
  INSTANT_CONSULT_TIMEOUT_SEC: 120,
  INSTANT_CONSULT_MAX_AMOUNT: 5000,       // KES
  CONSULTATION_MIN_PRICE: 200,            // KES
  CONSULTATION_MAX_PRICE: 250000,         // KES
  CONSULTATION_MIN_PRICE_BY_CUR: Object.freeze({
    KES: 200, UGX: 6000, TZS: 4000, RWF: 2000, ETB: 100, CDF: 6000,
  }),
  CONSULTATION_MAX_PRICE_BY_CUR: Object.freeze({
    KES: 250000, UGX: 7500000, TZS: 5000000, RWF: 2500000, ETB: 50000, CDF: 7500000,
  }),
  CONSULTATION_PLATFORM_ROOM_PREFIX: 'eh-room-',
  CONSULTATION_ROOM_TOKEN_TTL_MIN: 120,
  CONSULTATION_ATTENDEE_MAX: 25,
  CONSULTATION_WAITING_ROOM: true,
  CONSULTATION_LOBBY_MUSIC_URL: '/assets/audio/lobby.mp3',
  NO_SHOW_AUTO_REFUND_HOURS: 24,
  NO_SHOW_PENALTY_PCT: 0,
});

/* ============================================================
   §8  CONFIG · E-SCHOOL
   ============================================================ */
const ESCHOOL_CONFIG = Object.freeze({
  COURSE_TYPES: Object.freeze(['bootcamp', 'short_course', 'tuition', 'exam_prep', 'career', 'certification', 'workshop', 'seminar']),
  COURSE_TYPE_LABELS: Object.freeze({
    bootcamp: 'Bootcamp', short_course: 'Short Course', tuition: 'Tuition',
    exam_prep: 'Exam Preparation', career: 'Career Development',
    certification: 'Certification', workshop: 'Workshop', seminar: 'Seminar',
  }),
  COURSE_LEVELS: Object.freeze(['beginner', 'intermediate', 'advanced', 'all_levels']),
  COURSE_LEVEL_LABELS: Object.freeze({
    beginner: 'Beginner', intermediate: 'Intermediate',
    advanced: 'Advanced', all_levels: 'All Levels',
  }),
  COURSE_VISIBILITY: Object.freeze(['public', 'private', 'unlisted', 'institution_only', 'invite_only']),
  COURSE_STATUSES: Object.freeze(['draft', 'in_review', 'published', 'paused', 'archived']),
  LESSON_TYPES: Object.freeze(['video', 'reading', 'quiz', 'assignment', 'live', 'code', 'download', 'discussion', 'external']),
  LESSON_TYPE_ICONS: Object.freeze({
    video: 'fa-play-circle', reading: 'fa-book-open', quiz: 'fa-question-circle',
    assignment: 'fa-tasks', live: 'fa-broadcast-tower', code: 'fa-code',
    download: 'fa-download', discussion: 'fa-comments', external: 'fa-external-link',
  }),
  LESSON_STATUSES: Object.freeze(['draft', 'published', 'hidden']),
  QUIZ_QUESTION_TYPES: Object.freeze(['mcq', 'true_false', 'multi_select', 'short_answer', 'essay', 'fill_blank', 'matching', 'ordering']),
  ENROLLMENT_STATUSES: Object.freeze(['enrolled', 'in_progress', 'completed', 'dropped', 'expired', 'refunded', 'paused']),
  ENROLLMENT_SOURCES: Object.freeze(['direct', 'institution', 'bundle', 'path', 'trial', 'gift', 'promotion']),
  XP_REWARDS: Object.freeze({
    lesson_complete: 10, quiz_pass: 25, quiz_perfect: 50,
    assignment_submit: 20, assignment_pass: 35, course_complete: 200,
    daily_streak: 5, forum_answer: 15, first_lesson_today: 5,
    path_complete: 500, review_written: 10, peer_review: 30,
    live_attendance: 40, project_submit: 75,
  }),
  XP_LEVELS: Object.freeze([
    { level: 1, title: 'Novice',      min: 0,     icon: 'fa-seedling' },
    { level: 2, title: 'Apprentice',  min: 100,   icon: 'fa-book' },
    { level: 3, title: 'Learner',     min: 300,   icon: 'fa-graduation-cap' },
    { level: 4, title: 'Achiever',    min: 700,   icon: 'fa-medal' },
    { level: 5, title: 'Scholar',     min: 1500,  icon: 'fa-award' },
    { level: 6, title: 'Expert',      min: 3000,  icon: 'fa-star' },
    { level: 7, title: 'Master',      min: 6000,  icon: 'fa-crown' },
    { level: 8, title: 'Grandmaster', min: 12000, icon: 'fa-gem' },
    { level: 9, title: 'Legend',      min: 24000, icon: 'fa-fire' },
  ]),
  BADGES: Object.freeze({
    first_lesson:   { name: 'First Steps',      icon: 'fa-shoe-prints',       description: 'Completed your first lesson' },
    first_course:   { name: 'Course Champion',  icon: 'fa-trophy',            description: 'Completed your first course' },
    five_courses:   { name: 'Learning Machine', icon: 'fa-rocket',            description: 'Completed 5 courses' },
    perfect_quiz:   { name: 'Perfect Score',    icon: 'fa-star',              description: 'Scored 100% on a quiz' },
    streak_7:       { name: 'Week Warrior',     icon: 'fa-fire',              description: '7-day learning streak' },
    streak_30:      { name: 'Month Master',     icon: 'fa-crown',             description: '30-day learning streak' },
    help_10:        { name: 'Helpful Hand',     icon: 'fa-hands-helping',     description: 'Answered 10 forum questions' },
    night_owl:      { name: 'Night Owl',        icon: 'fa-moon',              description: 'Learned after midnight 10 times' },
    early_bird:     { name: 'Early Bird',       icon: 'fa-sun',               description: 'Learned before 6am 10 times' },
    path_master:    { name: 'Path Master',      icon: 'fa-route',             description: 'Completed a learning path' },
    peer_reviewer:  { name: 'Peer Reviewer',    icon: 'fa-user-check',        description: 'Reviewed 20 peer submissions' },
    live_regular:   { name: 'Live Regular',     icon: 'fa-broadcast-tower',   description: 'Attended 10 live sessions' },
  }),
  COURSE_REFUND_WINDOW_DAYS: 14,
  COURSE_REFUND_MAX_PROGRESS_PCT: 30,
  TRIAL_DURATION_HOURS: 48,
  TRIAL_MAX_ACTIVE: 1,
  TRIAL_LESSON_LIMIT: 3,
  COURSE_REVIEW_MIN_RATING: 1,
  COURSE_REVIEW_MAX_RATING: 5,
  COURSE_REVIEW_MIN_LENGTH: 10,
  COURSE_REVIEW_MAX_LENGTH: 3000,
  COURSE_REVIEW_EDIT_WINDOW_DAYS: 30,
  CERTIFICATE_PREFIX: 'EH-CERT-',
  CERTIFICATE_VALIDITY_YEARS: 3,
  CERTIFICATE_VERIFY_URL: '/verify/certificate',
  CERTIFICATE_PDF_TEMPLATE: '/assets/templates/certificate.pdf',
  CPD_POINTS_PER_HOUR: 1,
  ASSESSMENT_TYPES: Object.freeze(['quiz', 'exam', 'project', 'practical', 'peer', 'portfolio']),
  ASSESSMENT_STATUSES: Object.freeze(['draft', 'published', 'in_progress', 'submitted', 'graded', 'returned']),
  ASSESSMENT_GRADING_MODES: Object.freeze(['auto', 'manual', 'peer', 'hybrid']),
  DELIVERY_MODES: Object.freeze(['online', 'in_person', 'hybrid', 'self_paced']),
  SESSION_MODES: Object.freeze(['online', 'in_person', 'hybrid']),
  ATTENDANCE_STATUSES: Object.freeze(['present', 'late', 'absent', 'excused']),
  ATTENDANCE_THRESHOLD_PCT: 75,
  PASSING_SCORE_PCT: 60,
  DISTINCTION_SCORE_PCT: 85,
  MAX_QUIZ_ATTEMPTS: 5,
  QUIZ_TIME_GRACE_SEC: 30,
  DISCUSSION_MAX_DEPTH: 5,
  DISCUSSION_MAX_LENGTH: 3000,
  STUDY_PARTNER_MAX: 5,
  WISHLIST_MAX: 200,
  CURRICULUM_MAX_DEPTH: 4,
  CURRICULUM_MAX_SECTIONS: 50,
  CURRICULUM_MAX_LESSONS_PER_SECTION: 100,
  COURSE_MAX_DURATION_HOURS: 500,
  COURSE_MIN_DURATION_MINUTES: 15,
  BUNDLE_MAX_COURSES: 20,
  PATH_MAX_COURSES: 30,
  LIVE_SESSION_MAX_ATTENDEES: 500,
  LIVE_SESSION_RECORDING_DEFAULT: true,
  COURSE_PRICE_MIN: 0,
  COURSE_PRICE_MAX: 500000,               // KES
  COURSE_PRICE_MAX_BY_CUR: Object.freeze({
    KES: 500000, UGX: 15000000, TZS: 10000000, RWF: 5000000, ETB: 100000, CDF: 15000000,
  }),
  FREE_COURSE_LESSON_LIMIT: 2,
});

/* ============================================================
   §9  CONFIG · PROGRAMME, STATUS, NOTIFICATIONS, UI, FLAGS
   ============================================================ */
const PROGRAMME_CONFIG = Object.freeze({
  PROGRAMME_STATUSES: Object.freeze(['draft', 'active', 'paused', 'completed', 'archived']),
  COHORT_STATUSES: Object.freeze(['draft', 'scheduled', 'active', 'completed', 'cancelled']),
  LIFECYCLE_STATUSES: Object.freeze([
    'invited', 'pending_approval', 'approved', 'active', 'on_hold',
    'completed', 'certified', 'withdrawn', 'waitlisted',
  ]),
  LIFECYCLE_TRANSITIONS: Object.freeze({
    invited:          ['pending_approval', 'withdrawn', 'waitlisted'],
    pending_approval: ['approved', 'withdrawn', 'waitlisted'],
    approved:         ['active', 'withdrawn'],
    active:           ['on_hold', 'completed', 'withdrawn'],
    on_hold:          ['active', 'withdrawn'],
    completed:        ['certified'],
    certified:        [],
    withdrawn:        ['approved'],
    waitlisted:       ['invited', 'withdrawn'],
  }),
  SKILL_LEVELS: Object.freeze(['Not Assessed', 'Novice', 'Basic', 'Competent', 'Proficient', 'Expert']),
  SKILL_LEVEL_COLOURS: Object.freeze(['#e5e7eb', '#fecaca', '#fde68a', '#bbf7d0', '#86efac', '#22c55e']),
  SKILL_GAP_THRESHOLD: 1,
  COHORT_MAX_CAPACITY: 5000,
  COHORT_MIN_CAPACITY: 1,
  PROGRAMME_MAX_DURATION_WEEKS: 260,
  PROGRAMME_MIN_DURATION_HOURS: 2,
  PROJECT_STATUSES: Object.freeze(['proposal', 'approved', 'in_progress', 'review', 'completed', 'rejected']),
  PROJECT_PRIORITIES: Object.freeze(['low', 'medium', 'high', 'critical']),
  MILESTONE_STATUSES: Object.freeze(['pending', 'in_progress', 'blocked', 'completed']),
});

const STATUS_CONFIG = Object.freeze({
  STATUS_COLOURS: Object.freeze({
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
    info: '#3b82f6', neutral: '#6b7280', muted: '#9ca3af',
    pending: '#f59e0b', active: '#22c55e', inactive: '#6b7280',
    draft: '#9ca3af', published: '#22c55e', archived: '#6b7280',
    scheduled: '#8b5cf6', completed: '#10b981', cancelled: '#ef4444',
    failed: '#ef4444', processing: '#3b82f6', paused: '#f59e0b',
    in_progress: '#3b82f6', submitted: '#8b5cf6', graded: '#10b981',
    rejected: '#ef4444', approved: '#22c55e', under_review: '#f59e0b',
    expired: '#6b7280', refunded: '#8b5cf6', disputed: '#ef4444',
    verified: '#22c55e', unverified: '#9ca3af', suspended: '#ef4444',
  }),
  STATUS_ICONS: Object.freeze({
    success: 'fa-circle-check', warning: 'fa-triangle-exclamation',
    danger: 'fa-circle-xmark', info: 'fa-circle-info',
    pending: 'fa-clock', active: 'fa-circle-play', inactive: 'fa-circle-pause',
    draft: 'fa-pen', published: 'fa-rocket', archived: 'fa-box-archive',
    scheduled: 'fa-calendar', completed: 'fa-flag-checkered', cancelled: 'fa-ban',
    failed: 'fa-xmark', processing: 'fa-spinner', paused: 'fa-pause',
    in_progress: 'fa-spinner', submitted: 'fa-paper-plane', graded: 'fa-check-double',
    verified: 'fa-badge-check', suspended: 'fa-user-slash',
  }),
  SEVERITY_ORDER: Object.freeze(['low', 'medium', 'high', 'critical']),
  SEVERITY_COLOURS: Object.freeze({ low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }),
});

const NOTIFICATION_CONFIG = Object.freeze({
  NOTIFICATION_TYPES: Object.freeze([
    'system', 'message', 'booking', 'payment', 'payout', 'course',
    'certificate', 'assessment', 'announcement', 'reminder', 'alert',
    'mention', 'follow', 'review', 'dispute', 'compliance', 'wellness',
    'security', 'marketing', 'referral',
  ]),
  NOTIFICATION_TYPE_ICONS: Object.freeze({
    system: 'fa-gear', message: 'fa-comment', booking: 'fa-calendar-check',
    payment: 'fa-credit-card', payout: 'fa-money-bill-transfer', course: 'fa-graduation-cap',
    certificate: 'fa-certificate', assessment: 'fa-clipboard-check',
    announcement: 'fa-bullhorn', reminder: 'fa-bell', alert: 'fa-exclamation-triangle',
    mention: 'fa-at', follow: 'fa-user-plus', review: 'fa-star',
    dispute: 'fa-scale-balanced', compliance: 'fa-shield-halved',
    wellness: 'fa-heart-pulse', security: 'fa-lock', marketing: 'fa-tag',
    referral: 'fa-user-group',
  }),
  NOTIFICATION_CHANNELS: Object.freeze(['in_app', 'email', 'push', 'sms', 'webhook', 'whatsapp']),
  NOTIFICATION_PRIORITIES: Object.freeze(['low', 'normal', 'high', 'urgent']),
  NOTIFICATION_GROUPINGS: Object.freeze(['none', 'hourly', 'daily', 'weekly']),
  QUIET_HOURS_DEFAULT: Object.freeze({ enabled: false, start: '22:00', end: '07:00' }),
  DIGEST_HOUR_LOCAL: 8,
  TOAST_DURATION_MS: 4000,
  TOAST_DURATION_LONG_MS: 8000,
  TOAST_MAX_VISIBLE: 3,
  TOAST_POSITION: 'top-right',
  NOTIFICATION_RETENTION_DAYS: 90,
  UNREAD_BADGE_MAX: 99,
  PUSH_VAPID_PUBLIC_KEY: '',
});

const UI_CONFIG = Object.freeze({
  THEMES: Object.freeze(['light', 'dark', 'system', 'high-contrast']),
  DENSITIES: Object.freeze(['comfortable', 'compact']),
  VIEW_MODES: Object.freeze(['list', 'grid', 'table', 'kanban', 'calendar', 'timeline']),
  SORT_DIRECTIONS: Object.freeze(['asc', 'desc']),
  LOCALES: Object.freeze(['en-KE', 'en-UG', 'en-TZ', 'en-RW', 'sw-KE', 'sw-TZ', 'fr-RW', 'fr-BI', 'am-ET', 'so-SO', 'ar-SO', 'en-US', 'en-GB']),
  TIMEZONES: Object.freeze([
    'Africa/Nairobi', 'Africa/Kampala', 'Africa/Dar_es_Salaam',
    'Africa/Kigali', 'Africa/Bujumbura', 'Africa/Juba', 'Africa/Addis_Ababa',
    'Africa/Mogadishu', 'Africa/Djibouti', 'Africa/Asmara', 'Africa/Kinshasa',
    'UTC', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'Asia/Kolkata',
  ]),
  DATE_FORMATS: Object.freeze({
    short: 'dd/MM/y', long: 'EEEE, d MMMM y', time: 'HH:mm',
    datetime: 'dd/MM/y HH:mm', iso: 'y-MM-dd',
  }),
  DAYS_OF_WEEK: Object.freeze(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  FILE_ICON_MAP: Object.freeze({
    pdf: 'fa-file-pdf', doc: 'fa-file-word', docx: 'fa-file-word',
    xls: 'fa-file-excel', xlsx: 'fa-file-excel', csv: 'fa-file-csv',
    ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
    png: 'fa-file-image', jpg: 'fa-file-image', jpeg: 'fa-file-image',
    gif: 'fa-file-image', svg: 'fa-file-image', webp: 'fa-file-image',
    mp4: 'fa-file-video', webm: 'fa-file-video', mov: 'fa-file-video',
    mp3: 'fa-file-audio', wav: 'fa-file-audio', ogg: 'fa-file-audio',
    zip: 'fa-file-archive', json: 'fa-file-code', txt: 'fa-file-lines',
    md: 'fa-file-lines', default: 'fa-file',
  }),
  SIDEBAR_BREAKPOINT_PX: 1024,
  MOBILE_BREAKPOINT_PX: 768,
  TABLET_BREAKPOINT_PX: 1024,
  DESKTOP_BREAKPOINT_PX: 1280,
  WIDE_BREAKPOINT_PX: 1536,
  DEBOUNCE_SEARCH_MS: 300,
  DEBOUNCE_INPUT_MS: 150,
  DEBOUNCE_RESIZE_MS: 200,
  DEBOUNCE_SCROLL_MS: 100,
  SCROLL_THRESHOLD_PX: 200,
  ANIMATION_DURATION_MS: 200,
  MODAL_MAX_STACK: 3,
  COMMAND_PALETTE_MAX_RESULTS: 12,
  TABLE_DEFAULT_PAGE_SIZE: 20,
  SKELETON_ROWS: 8,
  CHART_COLOURS: Object.freeze(['#0f766e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#f97316']),
});

const FEATURE_FLAGS = Object.freeze({
  enable_socket: true,
  enable_sse: false,
  enable_ai_match: true,
  enable_ai_assist: true,
  enable_ai_moderation: true,
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
  enable_webhooks: true,
  enable_sso: true,
  enable_payments: true,
  enable_payouts: true,
  enable_mobile_money: true,
  enable_referrals: true,
  enable_gamification: true,
  enable_calendar: true,
  enable_file_manager: true,
  enable_global_search: true,
  enable_command_palette: true,
  enable_kanban: true,
  enable_dark_mode: true,
  enable_i18n: true,
  enable_push_notifications: false,
  enable_sms_notifications: true,
  enable_whatsapp_notifications: true,
  enable_audit_log: true,
  enable_impersonation: true,
  enable_maintenance_mode: false,
  enable_live_sessions: true,
  enable_video_recording: true,
  enable_transcripts: true,
  enable_captions: true,
  enable_multicurrency: true,
  enable_wallet: true,
  enable_instant_consult: true,
  enable_group_consult: true,
  enable_certificate_verification: true,
  enable_institution_api: true,
  enable_compliance_module: true,
  enable_wellness_module: true,
});

/* ============================================================
   §10  CONFIG ASSEMBLY & RUNTIME FLAGS
   ============================================================ */
const CONFIG = Object.freeze({
  ...NETWORK_CONFIG,
  ...STORAGE_CONFIG,
  ...MEDIA_CONFIG,
  ...PAYMENT_CONFIG,
  ...USER_CONFIG,
  ...VALIDATION_CONFIG,
  ...RATE_LIMIT_CONFIG,
  ...INSTITUTION_CONFIG,
  ...CONSULTATION_CONFIG,
  ...ESCHOOL_CONFIG,
  ...PROGRAMME_CONFIG,
  ...STATUS_CONFIG,
  ...NOTIFICATION_CONFIG,
  ...UI_CONFIG,
  FEATURE_FLAGS,
});

/* ---------- Environment helpers ---------- */
function envIsDev(env) {
  return env === 'development' || env === 'dev' || env === 'local';
}
function envIsProd(env) {
  return env === 'production' || env === 'prod';
}
function envIsTest(env) {
  return env === 'test' || env === 'testing' || env === 'ci';
}
function envIsStaging(env) {
  return env === 'staging' || env === 'stage' || env === 'preprod';
}
function detectEnv() {
  if (typeof window !== 'undefined' && window.__ENV__) return window.__ENV__;
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) return process.env.NODE_ENV;
  return 'development';
}
function detectOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}
function detectReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
}
function detectPreferredTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (_) { return 'light'; }
}
function detectConnectionType() {
  if (typeof navigator === 'undefined') return 'unknown';
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return c && c.effectiveType ? c.effectiveType : 'unknown';
}
function detectSaveData() {
  if (typeof navigator === 'undefined') return false;
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return c ? Boolean(c.saveData) : false;
}

const FLAGS = {
  DEBUG: envIsDev(detectEnv()),
  VERBOSE: false,
  TRACE: false,
  USE_MOCKS: false,
  MOCK_DELAY_MS: 300,
  DISABLE_POLLING: false,
  DISABLE_SOCKET: false,
  FORCE_OFFLINE: false,
  DISABLE_ANALYTICS: false,
  DISABLE_CACHE: false,
  STRICT_MODE: false,
  FROZEN_STATE: false,
  LOG_REDUX: false,
  LOG_NETWORK: false,
  LOG_SOCKET: false,
  LOG_STATE_CHANGES: false,
};

const RUNTIME = {
  startedAt: Date.now(),
  bootId: (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'boot-' + Math.random().toString(36).slice(2, 10),
  env: detectEnv(),
  region: 'EA',
  country: 'KE',
  currency: 'KES',
  userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || 'unknown',
  platform: (typeof navigator !== 'undefined' && navigator.platform) || 'unknown',
  language: (typeof navigator !== 'undefined' && navigator.language) || APP.LOCALE,
  languages: (typeof navigator !== 'undefined' && navigator.languages) || [APP.LOCALE],
  online: detectOnline(),
  connectionType: detectConnectionType(),
  saveData: detectSaveData(),
  reducedMotion: detectReducedMotion(),
  preferredTheme: detectPreferredTheme(),
  deviceMemory: (typeof navigator !== 'undefined' && navigator.deviceMemory) || null,
  hardwareConcurrency: (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || null,
  timezone: (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
    ? (Intl.DateTimeFormat().resolvedOptions().timeZone || APP.TIMEZONE)
    : APP.TIMEZONE,
  screenWidth: (typeof window !== 'undefined' && window.screen) ? window.screen.width : 0,
  screenHeight: (typeof window !== 'undefined' && window.screen) ? window.screen.height : 0,
  devicePixelRatio: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
  touch: (typeof window !== 'undefined' && 'ontouchstart' in window) || false,
};