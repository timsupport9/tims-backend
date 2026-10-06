/* ============================================================
   Centralised configuration + env validation
   ============================================================ */
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

const config = {
  env,
  isProd,
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',

  db: {
    enabled: !!(process.env.DB_HOST && process.env.DB_NAME),
    host: process.env.DB_HOST || '',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    poolSize: Number(process.env.DB_POOL_SIZE || 15),
    retryMs: Number(process.env.DB_RETRY_MS || 10000),
    bootstrapSchema: process.env.DB_BOOTSTRAP !== 'false',
    seedDemo: process.env.DB_SEED_DEMO !== 'false',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '30d',
  },

  platform: {
    name: process.env.PLATFORM_NAME || 'ExpertHub',
    commission: Number(process.env.PLATFORM_COMMISSION || 20),
    withdrawalHoldDays: Number(process.env.WITHDRAWAL_HOLD_DAYS || 7),
    minPayout: Number(process.env.MIN_PAYOUT || 50),
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'public', 'uploads'),
    maxFileSize: Number(process.env.MAX_FILE_SIZE || 8 * 1024 * 1024),
  },

  institution: {
    types: ['corporate', 'university', 'college', 'ngo', 'government', 'bootcamp'],
    roles: ['operations_manager', 'coordinator', 'instructor', 'viewer'],
    programmeStatuses: ['draft', 'active', 'paused', 'completed', 'archived'],
    assessmentTypes: ['quiz', 'exam', 'project', 'practical', 'peer'],
    lifecycleStatuses: ['invited', 'pending_approval', 'approved', 'active', 'on_hold',
      'completed', 'certified', 'withdrawn', 'waitlisted'],
  },

  landing: {
    /* Landing page is dynamic — these defaults feed /api/public/landing when DB is empty */
    headline: process.env.LANDING_HEADLINE || 'Learn from world-class experts. On your schedule.',
    subheadline: process.env.LANDING_SUBHEADLINE || '1-on-1 consultations, live cohorts, and self-paced courses taught by verified industry professionals.',
    heroImage: process.env.LANDING_HERO_IMAGE || '/uploads/hero-default.jpg',
    ctaPrimary: { label: 'Browse Experts', href: '#/experts' },
    ctaSecondary: { label: 'Explore Courses', href: '#/courses' },
    testimonials: [
      { id: 1, name: 'Amara O.', role: 'Product Manager', quote: 'Booked a 30-min session and rewrote my roadmap the same day.', rating: 5 },
      { id: 2, name: 'David K.', role: 'Data Analyst', quote: 'The Data Science bootcamp paid for itself in my first month.', rating: 5 },
      { id: 3, name: 'Sarah M.', role: 'Founder', quote: 'Institution dashboard saves my ops team hours every week.', rating: 5 },
    ],
    stats: [
      { label: 'Verified experts', value: '500+' },
      { label: 'Learners served', value: '18k+' },
      { label: 'Avg. session rating', value: '4.9' },
      { label: 'Institutions', value: '120+' },
    ],
    features: [
      { icon: 'users', title: 'Verified experts', body: 'Every expert is vetted, rated, and reviewed by real learners.' },
      { icon: 'video', title: '1-on-1 sessions', body: 'Book 15, 30, or 60-minute consultations with instant join.' },
      { icon: 'graduation', title: 'Bootcamps & cohorts', body: 'Structured multi-week programmes with certificates.' },
      { icon: 'building', title: 'Corporate training', body: 'Manage trainees, cohorts, budgets, and compliance in one place.' },
    ],
  },
};

/* ---------- env validation ---------- */
(function validateEnv() {
  const missing = [];
  if (!config.jwt.secret) missing.push('JWT_SECRET');
  if (!config.jwt.refreshSecret) missing.push('JWT_REFRESH_SECRET');

  if (missing.length) {
    if (isProd) {
      console.error(`Missing required env vars in production: ${missing.join(', ')}`);
      process.exit(1);
    }
    console.warn(`Missing env vars: ${missing.join(', ')} — using dev fallbacks`);
    if (!config.jwt.secret) config.jwt.secret = 'dev_secret_change_me';
    if (!config.jwt.refreshSecret) config.jwt.refreshSecret = 'dev_refresh_change_me';
  }
})();

module.exports = config;
