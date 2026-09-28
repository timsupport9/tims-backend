/* ============================================================
   ExpertHub 2.0 — Express + MySQL + Socket.io backend
   Full build with Institution / Corporate Training module
   ============================================================ */
require('dotenv').config();

const express     = require('express');
const http        = require('http');
const path        = require('path');
const fs          = require('fs');
const cors        = require('cors');
const morgan      = require('morgan');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const mysql       = require('mysql2/promise');
const multer      = require('multer');
const rateLimit   = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const compression = require('compression');
const { nanoid }  = require('nanoid');
const { Server }  = require('socket.io');
const crypto      = require('crypto');

/* ---------- Optional services ---------- */
let sendEmail = async () => ({ ok: false, error: 'Email not configured' });
let certificatePdfStream = null;
try {
  sendEmail = require('./services/email').sendEmail;
} catch (e) { console.log('[services] email module not found — emails will be skipped'); }
try {
  certificatePdfStream = require('./services/pdf').certificatePdfStream;
} catch (e) { console.log('[services] pdf module not found — PDF endpoints disabled'); }

/* ============================================================
   CONFIG
   ============================================================ */
const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

const config = {
  env,
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
    commission: Number(process.env.PLATFORM_COMMISSION || 20),
    withdrawalHoldDays: Number(process.env.WITHDRAWAL_HOLD_DAYS || 7),
    minPayout: Number(process.env.MIN_PAYOUT || 50),
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || path.join(__dirname, 'public', 'uploads'),
    maxFileSize: Number(process.env.MAX_FILE_SIZE || 8 * 1024 * 1024),
  },

  institution: {
    types: ['corporate','university','college','ngo','government','bootcamp'],
    roles: ['operations_manager','coordinator','instructor','viewer'],
    programmeStatuses: ['draft','active','paused','completed','archived'],
    assessmentTypes: ['quiz','exam','project','practical','peer'],
    lifecycleStatuses: ['invited','pending_approval','approved','active','on_hold','completed','certified','withdrawn','waitlisted'],
  },
};

/* Env validation */
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

/* ============================================================
   DEMO STORE
   ============================================================ */
const demo = {
  active: !config.db.enabled,
  forced: process.env.DEMO_MODE === 'true',
  counters: {},
  users: [], notificationPrefs: [], notifications: [], events: [], eventRegistrations: [],
  courses: [], lessons: [], enrollments: [], certificates: [], coupons: [],
  walletLedger: [], transactions: [], payouts: [], availability: [], timeOff: [],
  reviews: [], consultations: [], messages: [], claims: [], tickets: [], ticketReplies: [],
  refreshTokens: [], settings: {}, auditLogs: [],
  institutions: [], programmes: [], cohorts: [], assessments: [], projects: [],
  trainees: [], instructors: [], institutionTeam: [], institutionReqs: [], institutionAudit: [],
  sessions: [], attendance: [], materials: [], skills: [], traineeSkills: [],
  certificatesInst: [], enrollmentsInst: [], approvals: [], orgUnits: [],
  learningPaths: [], questionBank: [], submissions: [], projectSubmissions: [],
  reportTemplates: [], scheduledReports: [], teamPermissions: [],
  expertPortfolio: [], wishlist: [], complianceRules: [], imports: [],
};

function nextId(coll) {
  demo.counters[coll] = (demo.counters[coll] || 0) + 1;
  return demo.counters[coll];
}

async function seedDemoMemory() {
  if (demo.users.length) return;
  console.log('[demo] seeding in-memory store…');

  const _mkUser = async ({ name, email, password, role, status = 'active', spec = null, rate = 0, instRole = null, instId = null }) => {
    const hash = await bcrypt.hash(password, 10);
    const id = nextId('users');
    const u = {
      id, name, email, password_hash: hash, phone: '',
      role, status, specialization: spec, hourly_rate: rate, bio: '',
      avatar: null, institution_id: instId, institution_role: instRole,
      wallet_balance: role === 'expert' ? 320 : 0,
      total_earnings: role === 'expert' ? 1250 : 0,
      average_rating: role === 'expert' ? 4.7 : 0,
      created_at: new Date(), last_login_at: null,
      timezone: 'UTC', theme: 'light', language: 'en', intent: 'both',
      lifecycle_status: 'active', at_risk: 0,
    };
    demo.users.push(u);
    demo.notificationPrefs.push({ user_id: id, email_notifications: 1, push_notifications: 1, marketing: 0 });
    return u;
  };

  await _mkUser({ name: 'System Admin', email: 'admin@platform.com', password: 'admin123', role: 'admin', spec: 'Platform Operations' });
  await _mkUser({ name: 'Dr. Sarah Kimani', email: 'expert@platform.com', password: 'expert123', role: 'expert', spec: 'Data Science & AI', rate: 75 });
  await _mkUser({ name: 'John Mwangi', email: 'learner@platform.com', password: 'learner123', role: 'learner' });
  await _mkUser({ name: 'Aisha Bello', email: 'aisha@platform.com', password: 'expert123', role: 'expert', spec: 'Business Strategy', rate: 90 });
  await _mkUser({ name: 'Kwame Mensah', email: 'kwame@platform.com', password: 'expert123', role: 'expert', spec: 'Full-Stack Dev', rate: 80 });
  await _mkUser({ name: 'Grace Ochieng', email: 'grace@platform.com', password: 'expert123', role: 'expert', spec: 'UX Design', rate: 65 });
  await _mkUser({ name: 'Pending Expert', email: 'pending@platform.com', password: 'expert123', role: 'expert', status: 'pending', spec: 'Marketing', rate: 55 });

  const expertIds = demo.users.filter(u => u.role === 'expert').map(u => u.id);

  const courseSeeds = [
    ['Full-Stack Web Development', 'Master modern web development from zero to hero.', 'Technology', 'bootcamp', 'intermediate', 499, 12, 120],
    ['Data Science Bootcamp', 'Python, ML, and real-world projects.', 'Data', 'bootcamp', 'intermediate', 599, 14, 140],
    ['React in 30 Days', 'Build production React apps fast.', 'Frontend', 'short_course', 'intermediate', 99, 0, 30],
    ['Public Speaking Mastery', 'Command the room with confidence.', 'Soft Skills', 'short_course', 'beginner', 49, 0, 12],
    ['Mathematics Tutoring', '1-on-1 personalized math help.', 'Math', 'tuition', 'beginner', 25, 0, 1],
    ['SAT Math Prep', 'Comprehensive SAT math bootcamp.', 'Test Prep', 'exam_prep', 'intermediate', 39, 0, 20],
    ['Tech Career Roadmap', 'Navigate your tech career.', 'Career', 'career', 'beginner', 79, 0, 2],
  ];
  for (const c of courseSeeds) {
    const id = nextId('courses');
    demo.courses.push({
      id, title: c[0], description: c[1], category: c[2], course_type: c[3], level: c[4],
      price: c[5], duration_weeks: c[6], duration_hours: 0,
      total_lessons: c[7], expert_id: expertIds[Math.floor(Math.random() * expertIds.length)] || null,
      status: 'published', thumbnail: null, created_at: new Date(),
    });
  }

  const eventSeeds = [
    ['Live Bootcamp: Intro to AI', 'Hands-on introduction to machine learning.', 'Technology', 7, 500, 100, 0],
    ['Career Webinar: Tech Jobs', 'How to break into tech in 2026.', 'Career', 14, 300, 200, 0],
    ['Design Thinking Workshop', 'Practical design thinking for teams.', 'Design', 21, 400, 50, 25],
  ];
  for (const [title, description, category, days, pay, cap, price] of eventSeeds) {
    demo.events.push({
      id: nextId('events'), title, description, category,
      expert_id: null, date: new Date(Date.now() + days * 86400000),
      capacity: cap, price, expert_payment: pay, status: 'published', created_at: new Date(),
    });
  }

  demo.coupons.push(
    { id: nextId('coupons'), code: 'WELCOME10', discount_type: 'percent', discount_value: 10, max_uses: 1000, used_count: 0, min_spend: 0, applies_to: 'all', active: 1, expires_at: null, created_at: new Date() },
    { id: nextId('coupons'), code: 'SAVE50', discount_type: 'fixed', discount_value: 50, max_uses: 100, used_count: 0, min_spend: 200, applies_to: 'all', active: 1, expires_at: null, created_at: new Date() },
    { id: nextId('coupons'), code: 'BOOTCAMP20', discount_type: 'percent', discount_value: 20, max_uses: 200, used_count: 0, min_spend: 0, applies_to: 'bootcamp', active: 1, expires_at: null, created_at: new Date() },
  );

  /* Institutions demo */
  const acmeId = nextId('institutions');
  demo.institutions.push({
    id: acmeId, name: 'Acme Academy', type: 'corporate', industry: 'Banking & Fintech',
    contact_email: 'ops@acme.com', contact_phone: '+254 700 000 000',
    address: 'Nairobi, Kenya',
    ops_manager_id: null, ops_manager_name: null, ops_manager_email: null,
    status: 'active', default_capacity: 30, pass_mark: 70,
    primary_color: '#1e3a8a', accent_color: '#059669',
    created_at: new Date(),
  });

  const opsUser = await _mkUser({
    name: 'Olivia Ops', email: 'ops@acme.com', password: 'ops123',
    role: 'institution', instRole: 'operations_manager', instId: acmeId,
  });
  demo.institutions[0].ops_manager_id = opsUser.id;
  demo.institutions[0].ops_manager_name = opsUser.name;
  demo.institutions[0].ops_manager_email = opsUser.email;

  const coordUser = await _mkUser({
    name: 'Chris Coordinator', email: 'coord@acme.com', password: 'coord123',
    role: 'institution', instRole: 'coordinator', instId: acmeId,
  });
  demo.institutionTeam.push({
    id: nextId('institutionTeam'), institution_id: acmeId, user_id: coordUser.id,
    name: coordUser.name, email: coordUser.email, institution_role: 'coordinator',
    status: 'active', created_at: new Date(),
  });

  const betaId = nextId('institutions');
  demo.institutions.push({
    id: betaId, name: 'Beta Institute', type: 'university', industry: 'Higher Education',
    contact_email: 'hello@beta.edu', contact_phone: '+254 711 111 111',
    address: 'Mombasa, Kenya',
    status: 'pending', default_capacity: 40, pass_mark: 60, created_at: new Date(),
  });

  const expertList = demo.users.filter(u => u.role === 'expert' && u.status === 'active');
  expertList.slice(0, 3).forEach((e, idx) => {
    demo.instructors.push({
      id: nextId('instructors'), institution_id: acmeId, expert_id: e.id,
      name: e.name, specialization: e.specialization, programme_count: idx < 2 ? 1 : 0,
      status: 'active', created_at: new Date(),
    });
  });

  const programmes = [
    { title: 'Digital Banking Foundations', category: 'Fintech', description: 'Core skills for modern banking transformation.', status: 'active', start_date: new Date(Date.now() + 7 * 86400000), end_date: new Date(Date.now() + 77 * 86400000), capacity: 30 },
    { title: 'Leadership & Change Management', category: 'Leadership', description: 'Build high-performing teams through change.', status: 'active', start_date: new Date(Date.now() - 14 * 86400000), end_date: new Date(Date.now() + 56 * 86400000), capacity: 20 },
    { title: 'Data Analytics for Managers', category: 'Data', description: 'Turn data into decisions.', status: 'draft', start_date: null, end_date: null, capacity: 25 },
  ];
  for (const p of programmes) {
    demo.programmes.push({ id: nextId('programmes'), institution_id: acmeId, ...p, created_at: new Date() });
  }

  const [p1, p2] = demo.programmes;
  const [co1, co2] = [
    { programme: p1, name: 'Digital Banking — Cohort A', capacity: 30, status: 'active', instructor: demo.instructors[0] },
    { programme: p2, name: 'Leadership — Spring 2026', capacity: 20, status: 'active', instructor: demo.instructors[1] },
  ].map(c => {
    const id = nextId('cohorts');
    demo.cohorts.push({
      id, institution_id: acmeId, programme_id: c.programme.id, name: c.name,
      instructor_id: c.instructor?.expert_id || null,
      instructor_name: c.instructor?.name || null,
      start_date: c.programme.start_date, end_date: c.programme.end_date,
      capacity: c.capacity, trainee_count: 0, status: c.status, created_at: new Date(),
    });
    return demo.cohorts[demo.cohorts.length - 1];
  });

  demo.assessments.push(
    { id: nextId('assessments'), institution_id: acmeId, cohort_id: co1.id, title: 'Module 1 Quiz', type: 'quiz', weight: 15, due_date: new Date(Date.now() + 14 * 86400000), status: 'scheduled', created_at: new Date() },
    { id: nextId('assessments'), institution_id: acmeId, cohort_id: co1.id, title: 'Mid-Programme Exam', type: 'exam', weight: 35, due_date: new Date(Date.now() + 42 * 86400000), status: 'scheduled', created_at: new Date() },
    { id: nextId('assessments'), institution_id: acmeId, cohort_id: co2.id, title: 'Leadership Case Study', type: 'project', weight: 25, due_date: new Date(Date.now() + 28 * 86400000), status: 'scheduled', created_at: new Date() },
  );

  demo.projects.push({
    id: nextId('projects'), institution_id: acmeId, cohort_id: co1.id,
    title: 'Banking Transformation Capstone', category: 'Project',
    description: 'Design an end-to-end digital banking rollout plan.',
    deadline: new Date(Date.now() + 60 * 86400000), status: 'active',
    submissions_count: 0, created_at: new Date(),
  });

  const traineeSeeds = [
    { name: 'Amina Yusuf', email: 'amina@acme.com', progress: 62, avg: 78 },
    { name: 'Peter Otieno', email: 'peter@acme.com', progress: 44, avg: 71 },
    { name: 'Fatima Noor', email: 'fatima@acme.com', progress: 88, avg: 91 },
    { name: 'David Kim', email: 'david@acme.com', progress: 15, avg: 64 },
    { name: 'Grace Wanjiku', email: 'grace.w@acme.com', progress: 100, avg: 87 },
  ];
  for (const t of traineeSeeds) {
    demo.trainees.push({
      id: nextId('trainees'), institution_id: acmeId, user_id: null,
      name: t.name, email: t.email,
      programme_id: co1.programme_id, programme_title: p1.title,
      cohort_id: co1.id, cohort_name: co1.name,
      progress: t.progress, assessment_avg: t.avg,
      status: t.progress >= 100 ? 'completed' : 'active',
      lifecycle_status: t.progress >= 100 ? 'completed' : 'active',
      department: 'Engineering', created_at: new Date(),
    });
  }
  co1.trainee_count = traineeSeeds.length;

  demo.institutionReqs.push({
    id: nextId('institutionReqs'), institution_id: acmeId,
    title: 'Add 10 more trainees to Cohort A',
    type: 'capacity_change', requested_by: coordUser.name,
    status: 'pending', created_at: new Date(),
  });

  demo.institutionAudit.push(
    { id: nextId('institutionAudit'), institution_id: acmeId, actor_id: opsUser.id, actor_name: opsUser.name, action: 'Created programme "Digital Banking Foundations"', created_at: new Date(Date.now() - 3600 * 1000) },
    { id: nextId('institutionAudit'), institution_id: acmeId, actor_id: opsUser.id, actor_name: opsUser.name, action: 'Invited coordinator Chris Coordinator', created_at: new Date(Date.now() - 1800 * 1000) },
  );

  /* Institution certificates demo */
  const cert1 = demo.trainees[4];
  demo.certificatesInst.push({
    id: nextId('certificatesInst'), institution_id: acmeId,
    trainee_id: cert1.id, programme_id: co1.programme_id,
    title: `${cert1.name} - ${p1.title}`,
    serial: `EH-${acmeId}-${Date.now().toString(36).toUpperCase()}-DEMO01`,
    trainee_name: cert1.name, programme_title: p1.title,
    awarding_body: 'Chartered Institute of Bankers',
    cpd_points: 24, grade: 'Distinction',
    issued_at: new Date(), expires_at: new Date(Date.now() + 730 * 86400000),
    revoked: 0,
  });

  /* Skills demo */
  ['Communication', 'Data Analysis', 'Leadership', 'Digital Literacy', 'Problem Solving'].forEach(name => {
    demo.skills.push({ id: nextId('skills'), institution_id: acmeId, name, category: name === 'Data Analysis' ? 'Technical' : 'Soft Skills', description: '' });
  });

  console.log(`[demo] seeded: ${demo.users.length} users, ${demo.institutions.length} institutions, ${demo.programmes.length} programmes`);
}

function currentDemoUser(req) {
  const h = req.headers.authorization || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!tok) return null;
  try {
    const payload = jwt.verify(tok, config.jwt.secret);
    return demo.users.find(u => u.id === payload.id) || null;
  } catch { return null; }
}

/* ============================================================
   DB CONNECTION
   ============================================================ */
const dbState = { pool: null, connected: false, connecting: false, lastError: null, lastAttempt: null, lastSuccess: null, bootstrapped: false };

async function tryConnect() {
  if (demo.forced || !config.db.enabled) return;
  if (dbState.connecting || dbState.connected) return;
  dbState.connecting = true;
  dbState.lastAttempt = new Date();

  try {
    if (!dbState.pool) {
      dbState.pool = mysql.createPool({
        host: config.db.host, port: config.db.port,
        user: config.db.user, password: config.db.password,
        database: config.db.database,
        waitForConnections: true, connectionLimit: config.db.poolSize,
        namedPlaceholders: true, timezone: 'Z', connectTimeout: 5000,
      });
    }
    const conn = await dbState.pool.getConnection();
    await conn.ping();
    conn.release();

    dbState.connected = true;
    dbState.lastSuccess = new Date();
    dbState.lastError = null;
    console.log(`[db] connected → ${config.db.host}:${config.db.port}/${config.db.database}`);
    if (demo.active && !demo.forced) { demo.active = false; console.log('[demo] disabled — MySQL in use'); }

    if (!dbState.bootstrapped) {
      dbState.bootstrapped = true;
      try {
        if (config.db.bootstrapSchema) await bootstrapDatabase();
        if (config.db.seedDemo) await seedDemoData();
      } catch (e) { console.error('[db] bootstrap/seed error:', e.message); }
    }
  } catch (err) {
    dbState.connected = false;
    dbState.lastError = err.message;
    if (!demo.forced && process.env.DEMO_MODE !== 'false') {
      if (!demo.active) {
        demo.active = true;
        console.log('[demo] MySQL unavailable — demo mode enabled');
        if (!demo.users.length) await seedDemoMemory();
      }
    }
    console.warn(`[db] connect failed: ${err.message} — retry in ${config.db.retryMs}ms`);
    if (dbState.pool) { try { await dbState.pool.end(); } catch {} dbState.pool = null; }
    setTimeout(tryConnect, config.db.retryMs);
  } finally { dbState.connecting = false; }
}

function poolOrThrow() {
  if (!dbState.connected || !dbState.pool) {
    const e = new Error('Database unavailable');
    e.status = 503;
    throw e;
  }
  return dbState.pool;
}

async function bootstrapDatabase() {
  const schemaFile = path.join(__dirname, 'database.sql');
  if (!fs.existsSync(schemaFile)) { console.warn('[db] database.sql not found — skipping'); return; }
  const schema = fs.readFileSync(schemaFile, 'utf8');
  const sanitized = schema.split('\n').filter(l => !/^\s*(CREATE DATABASE|USE )/i.test(l)).join('\n');

  const conn = await mysql.createConnection({
    host: config.db.host, port: config.db.port,
    user: config.db.user, password: config.db.password,
    database: config.db.database, multipleStatements: true,
  });
  await conn.query(sanitized).catch(e => console.warn('[db] schema warning:', e.message));
  await conn.end();
  console.log('[db] schema bootstrap complete');
}

async function seedDemoData() {
  const pool = poolOrThrow();
  const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM users');
  if (c > 0) return;

  const demoUsers = [
    { name: 'System Admin',     email: 'admin@platform.com',   pwd: 'admin123',   role: 'admin',   status: 'active', spec: 'Platform Operations', rate: 0  },
    { name: 'Dr. Sarah Kimani', email: 'expert@platform.com',  pwd: 'expert123',  role: 'expert',  status: 'active', spec: 'Data Science & AI',   rate: 75 },
    { name: 'John Mwangi',      email: 'learner@platform.com', pwd: 'learner123', role: 'learner', status: 'active', spec: null,                  rate: 0  },
    { name: 'Aisha Bello',      email: 'aisha@platform.com',   pwd: 'expert123',  role: 'expert',  status: 'active', spec: 'Business Strategy',   rate: 90 },
    { name: 'Kwame Mensah',     email: 'kwame@platform.com',   pwd: 'expert123',  role: 'expert',  status: 'active', spec: 'Full-Stack Dev',      rate: 80 },
    { name: 'Grace Ochieng',    email: 'grace@platform.com',   pwd: 'expert123',  role: 'expert',  status: 'active', spec: 'UX Design',           rate: 65 },
    { name: 'Pending Expert',   email: 'pending@platform.com', pwd: 'expert123',  role: 'expert',  status: 'pending', spec: 'Marketing',          rate: 55 },
  ];
  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.pwd, 10);
    const [r] = await pool.query(
      `INSERT INTO users (name,email,password_hash,role,status,specialization,hourly_rate,average_rating,total_earnings,wallet_balance,intent)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'both')`,
      [u.name, u.email, hash, u.role, u.status, u.spec, u.rate,
       u.role === 'expert' ? 4.7 : 0, u.role === 'expert' ? 1250 : 0, u.role === 'expert' ? 320 : 0]
    );
    await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  }

  /* Institution */
  try {
    const [inst] = await pool.query(
      `INSERT INTO institutions (name,type,industry,contact_email,contact_phone,address,status,default_capacity,pass_mark,primary_color,accent_color)
       VALUES ('Acme Academy','corporate','Banking & Fintech','ops@acme.com','+254 700 000 000','Nairobi, Kenya','active',30,70,'#1e3a8a','#059669')`
    );
    const instId = inst.insertId;
    const hash = await bcrypt.hash('ops123', 10);
    const [ops] = await pool.query(
      `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,intent)
       VALUES ('Olivia Ops','ops@acme.com',?,'institution','active',?, 'operations_manager','both')`,
      [hash, instId]
    );
    await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [ops.insertId]);
    await pool.query(
      `UPDATE institutions SET ops_manager_id=?, ops_manager_name='Olivia Ops', ops_manager_email='ops@acme.com' WHERE id=?`,
      [ops.insertId, instId]
    );

    const hash2 = await bcrypt.hash('coord123', 10);
    await pool.query(
      `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,intent)
       VALUES ('Chris Coordinator','coord@acme.com',?,'institution','active',?, 'coordinator','both')`,
      [hash2, instId]
    );

    await pool.query(
      `INSERT INTO programmes (institution_id,title,description,category,status,start_date,end_date,capacity)
       VALUES (?, 'Digital Banking Foundations','Core skills for modern banking transformation.','Fintech','active',
               DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 77 DAY), 30)`,
      [instId]
    );
    await pool.query(
      `INSERT INTO programmes (institution_id,title,description,category,status,start_date,end_date,capacity)
       VALUES (?, 'Leadership & Change Management','Build high-performing teams through change.','Leadership','active',
               DATE_SUB(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 56 DAY), 20)`,
      [instId]
    );

    console.log('[db] demo institution seeded (ops@acme.com / ops123)');
  } catch (e) {
    console.warn('[db] institution seed skipped:', e.message);
  }
}

/* ============================================================
   EXPRESS APP
   ============================================================ */
const now = () => new Date();
const genRef = (p = 'TX') => `${p}-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;
const asyncH = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const app = express();
app.set('trust proxy', 1);
app.use(compression());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isProd ? 'combined' : 'dev'));

fs.mkdirSync(config.uploads.dir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _f, cb) => cb(null, config.uploads.dir),
  filename: (_req, f, cb) => cb(null, `${Date.now()}-${nanoid(8)}${path.extname(f.originalname)}`),
});
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', 'application/vnd.ms-excel', 'text/csv',
]);
const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxFileSize },
  fileFilter: (_req, f, cb) => ALLOWED_MIME.has(f.mimetype) ? cb(null, true) : cb(new Error('File type not allowed')),
});
app.use('/uploads', express.static(config.uploads.dir));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many login attempts' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/forgot', loginLimiter);

const validate = (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, errors: errs.array() });
  next();
};

function auth(roles = null) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!tok) return res.status(401).json({ error: 'No token' });
    try {
      const payload = jwt.verify(tok, config.jwt.secret);
      req.user = payload;
      if (roles && !roles.includes(payload.role)) return res.status(403).json({ error: 'Forbidden' });
      next();
    } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
  };
}

/* ============================================================
   HEALTH
   ============================================================ */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true, env: config.env, uptime: process.uptime(), demo_mode: demo.active,
    db: { configured: config.db.enabled, connected: dbState.connected, last_attempt: dbState.lastAttempt, last_success: dbState.lastSuccess, last_error: dbState.lastError },
    counts: demo.active ? {
      users: demo.users.length, experts: demo.users.filter(u => u.role === 'expert').length,
      institutions: demo.institutions.length, programmes: demo.programmes.length, trainees: demo.trainees.length,
    } : undefined,
    time: new Date().toISOString(),
  });
});

/* ============================================================
   PUBLIC ROUTES (no auth)
   ============================================================ */
app.get('/api/verify/:serial', asyncH(async (req, res) => {
  const serial = req.params.serial;
  if (demo.active) {
    const c = demo.certificatesInst.find(x => x.serial === serial && !x.revoked);
    const c2 = demo.certificates.find(x => x.serial === serial);
    if (!c && !c2) return res.status(404).json({ valid: false, error: 'Certificate not found' });
    if (c) {
      const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
      return res.json({ valid: !isExpired, status: isExpired ? 'expired' : 'valid', certificate: {
        trainee_name: c.trainee_name, institution_name: 'Acme Academy',
        title: c.title, awarding_body: c.awarding_body, cpd_points: c.cpd_points,
        issued_at: c.issued_at, expires_at: c.expires_at, serial: c.serial,
      }});
    }
    return res.json({ valid: true, status: 'valid', certificate: c2 });
  }

  try {
    const pool = poolOrThrow();
    const [[c]] = await pool.query(
      `SELECT c.*, u.name AS trainee_name, i.name AS institution_name
         FROM institution_certificates c
         JOIN users u ON u.id = c.trainee_id
         LEFT JOIN institutions i ON i.id = c.institution_id
        WHERE c.serial = ? AND c.revoked = 0`,
      [serial]
    );
    if (!c) return res.status(404).json({ valid: false, error: 'Certificate not found' });
    const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
    res.json({ valid: !isExpired, status: isExpired ? 'expired' : 'valid', certificate: {
      trainee_name: c.trainee_name, institution_name: c.institution_name,
      title: c.title, awarding_body: c.awarding_body, cpd_points: c.cpd_points,
      issued_at: c.issued_at, expires_at: c.expires_at, serial: c.serial,
    }});
  } catch (e) { res.status(503).json({ valid: false, error: 'Service unavailable' }); }
}));

app.post('/api/auth/setup-account', [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
], validate, asyncH(async (req, res) => {
  if (demo.active) {
    const u = demo.users.find(x => x.email === req.body.email);
    if (!u) return res.status(404).json({ error: 'No pending invitation found' });
    u.password_hash = await bcrypt.hash(req.body.password, 10);
    u.lifecycle_status = 'active';
    return res.json({ ok: true, message: 'Account activated' });
  }

  const pool = poolOrThrow();
  const { email, password, token } = req.body;
  const [[u]] = await pool.query('SELECT * FROM users WHERE email=? AND lifecycle_status=?', [email, 'invited']);
  if (!u) return res.status(404).json({ error: 'No pending invitation found' });

  if (token) {
    const [[row]] = await pool.query('SELECT * FROM password_resets WHERE token=? AND user_id=? AND used=0', [token, u.id]);
    if (!row) return res.status(400).json({ error: 'Invalid invitation link' });
    await pool.query('UPDATE password_resets SET used=1 WHERE id=?', [row.id]);
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query("UPDATE users SET password_hash=?, lifecycle_status='active', accepted_at=NOW() WHERE id=?", [hash, u.id]);
  res.json({ ok: true, message: 'Account activated' });
}));

/* ============================================================
   DEMO ROUTER
   ============================================================ */
const demoRouter = express.Router();

demoRouter.use(async (req, res, next) => {
  if (!demo.active) return next();
  try {
    const handled = await handleDemo(req, res);
    if (!handled) return next();
  } catch (e) {
    console.error('[demo] error:', e);
    res.status(500).json({ error: 'Demo backend error: ' + e.message });
  }
});

async function handleDemo(req, res) {
  const { method } = req;
  const p = req.path.replace(/^\/+/, '/');
  let m;

  if (p === '/health') return false;

  /* ---------- AUTH ---------- */
  if (method === 'POST' && p === '/auth/login') {
    const { email, password } = req.body || {};
    const user = demo.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' }), true;
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' }), true;
    if (user.status === 'pending') return res.status(403).json({ error: 'Account pending admin approval' }), true;
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' }), true;
    if (user.status === 'rejected') return res.status(403).json({ error: 'Account rejected' }), true;

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    const refresh = jwt.sign({ id: user.id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
    demo.refreshTokens.push({ id: nextId('refreshTokens'), user_id: user.id, token: refresh, revoked: 0 });

    user.last_login_at = new Date();
    const { password_hash, ...safe } = user;
    return res.json({ token, refresh, user: safe, _demo: true }), true;
  }

  if (method === 'POST' && p === '/auth/register') {
    const { name, email, password, phone = '', role = 'learner', extra = {} } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' }), true;
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' }), true;

    const safeRole = role === 'admin' ? 'learner' : role;
    const status = safeRole === 'learner' ? 'active' : 'pending';
    const hash = await bcrypt.hash(password, 10);
    const id = nextId('users');

    const user = {
      id, name, email, password_hash: hash, phone, role: safeRole, status,
      specialization: extra.specialization || null,
      hourly_rate: extra.hourly_rate || 0, bio: extra.bio || null,
      avatar: null, wallet_balance: 0, total_earnings: 0, average_rating: 0,
      created_at: new Date(), last_login_at: null,
      timezone: 'UTC', theme: 'light', language: 'en', intent: 'both',
      institution_id: null, institution_role: null,
      lifecycle_status: 'active', at_risk: 0,
    };
    demo.users.push(user);
    demo.notificationPrefs.push({ user_id: id, email_notifications: 1, push_notifications: 1, marketing: 0 });

    if (safeRole === 'institution') {
      const instId = nextId('institutions');
      demo.institutions.push({
        id: instId,
        name: extra.institution_name || name + "'s Institution",
        type: extra.institution_type || 'corporate',
        industry: extra.industry || '',
        contact_email: email, contact_phone: phone, address: '',
        ops_manager_id: id, ops_manager_name: name, ops_manager_email: email,
        status: 'pending', default_capacity: 30, pass_mark: 70,
        primary_color: '#1e3a8a', accent_color: '#059669',
        created_at: new Date(),
      });
      user.institution_id = instId;
      user.institution_role = 'operations_manager';
    }

    return res.status(201).json({
      id, status,
      message: status === 'active' ? 'Account created.'
        : safeRole === 'institution' ? 'Institution registered. Awaiting admin verification.'
        : 'Registration successful. Awaiting admin approval.',
    }), true;
  }

  if (method === 'GET' && p === '/auth/me') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { password_hash, ...safe } = user;
    return res.json({ user: safe }), true;
  }

  if (method === 'POST' && p === '/auth/refresh') {
    const { refresh } = req.body || {};
    if (!refresh) return res.status(400).json({ error: 'Refresh token required' }), true;
    try {
      const payload = jwt.verify(refresh, config.jwt.refreshSecret);
      const rt = demo.refreshTokens.find(t => t.token === refresh && !t.revoked);
      if (!rt) return res.status(401).json({ error: 'Refresh token revoked or expired' }), true;
      const user = demo.users.find(u => u.id === payload.id);
      if (!user || user.status !== 'active') return res.status(403).json({ error: 'Account not active' }), true;
      const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
      return res.json({ token }), true;
    } catch { return res.status(401).json({ error: 'Invalid refresh token' }), true; }
  }

  if (method === 'POST' && p === '/auth/logout') {
    const { refresh } = req.body || {};
    if (refresh) {
      const rt = demo.refreshTokens.find(t => t.token === refresh);
      if (rt) rt.revoked = 1;
    }
    return res.json({ ok: true }), true;
  }

  if (method === 'POST' && p === '/auth/forgot') return res.json({ ok: true, message: 'Reset link sent (demo)' }), true;
  if (method === 'POST' && p === '/auth/reset') return res.json({ ok: true, message: 'Password reset (demo)' }), true;

  if (method === 'PUT' && p === '/auth/password') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { old_password, new_password } = req.body || {};
    const ok = await bcrypt.compare(old_password || '', user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' }), true;
    user.password_hash = await bcrypt.hash(new_password, 10);
    return res.json({ ok: true }), true;
  }

  /* ---------- COMMON ---------- */
  if (method === 'GET' && p === '/common/notifications') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const mine = demo.notifications.filter(n => n.user_id === null || n.user_id === user.id);
    const rows = [...mine].sort((a, b) => b.created_at - a.created_at).slice(0, limit);
    const unread = mine.filter(n => !n.is_read).length;
    return res.json({ notifications: rows, unread }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/common\/notifications\/(\d+)\/read$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const n = demo.notifications.find(x => x.id === Number(m[1]));
    if (n) n.is_read = 1;
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && p === '/common/notifications/read-all') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    demo.notifications.forEach(n => { if (n.user_id === user.id) n.is_read = 1; });
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/common/events') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const events = demo.events.filter(e => e.status === 'published').map(e => ({
      ...e,
      registered_count: demo.eventRegistrations.filter(r => r.event_id === e.id && r.status === 'registered').length,
    }));
    return res.json({ events }), true;
  }
  if (method === 'POST' && (m = p.match(/^\/common\/events\/(\d+)\/register$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const eventId = Number(m[1]);
    const ev = demo.events.find(e => e.id === eventId);
    if (!ev) return res.status(404).json({ error: 'Event not found' }), true;
    const existing = demo.eventRegistrations.find(r => r.event_id === eventId && r.user_id === user.id);
    if (existing) existing.status = 'registered';
    else demo.eventRegistrations.push({ id: nextId('eventRegistrations'), event_id: eventId, user_id: user.id, status: 'registered', created_at: new Date() });
    return res.json({ ok: true }), true;
  }

  /* ---------- ESCHOOL ---------- */
  if (method === 'GET' && p === '/eschool/courses') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const type = req.query.type || null;
    const q = req.query.q || null;
    let list = demo.courses.filter(c => c.status === 'published');
    if (type) list = list.filter(c => c.course_type === type);
    if (q) list = list.filter(c => (c.title || '').toLowerCase().includes(String(q).toLowerCase()));
    return res.json({ courses: list, total: list.length, page: 1, pages: 1 }), true;
  }
  if (method === 'GET' && (m = p.match(/^\/eschool\/courses\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.courses.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Course not found' }), true;
    const lessons = demo.lessons.filter(l => l.course_id === c.id);
    return res.json({ course: c, lessons }), true;
  }
  if (method === 'POST' && p === '/eschool/enroll') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { course_id, coupon_code } = req.body || {};
    const c = demo.courses.find(x => x.id === Number(course_id));
    if (!c) return res.status(404).json({ error: 'Course not found' }), true;
    let price = Number(c.price), discount = 0;
    if (coupon_code) {
      const cp = demo.coupons.find(x => x.code === coupon_code && x.active);
      if (!cp) return res.status(400).json({ error: 'Invalid coupon' }), true;
      discount = cp.discount_type === 'percent' ? price * (Number(cp.discount_value) / 100) : Number(cp.discount_value);
      discount = Math.min(discount, price);
      cp.used_count++;
    }
    const finalPrice = price - discount;
    const id = nextId('enrollments');
    demo.enrollments.push({
      id, user_id: user.id, course_id: c.id, enrollment_type: c.course_type,
      title: c.title, progress: 0, status: 'active', created_at: new Date(),
    });
    return res.status(201).json({ id, paid: finalPrice, discount }), true;
  }

  /* ---------- USER: enrollments, wallet, certificates, wishlist ---------- */
  if (method === 'GET' && p === '/user/enrollments') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ enrollments: demo.enrollments.filter(e => e.user_id === user.id) }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/user\/enrollments\/(\d+)\/progress$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const enr = demo.enrollments.find(e => e.id === Number(m[1]) && e.user_id === user.id);
    if (!enr) return res.status(404).json({ error: 'Enrollment not found' }), true;
    enr.progress = req.body?.progress || 0;
    if (enr.progress >= 100) {
      enr.status = 'completed';
      const serial = `EH-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;
      demo.certificates.push({
        id: nextId('certificates'), user_id: user.id,
        course_title: enr.title, serial, issued_at: new Date(),
      });
    }
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/user/certificates') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ certificates: demo.certificates.filter(c => c.user_id === user.id) }), true;
  }

  /* Wishlist */
  if (method === 'GET' && p === '/user/wishlist') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ items: demo.wishlist.filter(w => w.user_id === user.id) }), true;
  }
  if (method === 'POST' && p === '/user/wishlist/toggle') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const cid = Number(req.body?.course_id);
    const idx = demo.wishlist.findIndex(w => w.user_id === user.id && w.course_id === cid);
    if (idx >= 0) demo.wishlist.splice(idx, 1);
    else demo.wishlist.push({ id: nextId('wishlist'), user_id: user.id, course_id: cid, added_at: new Date() });
    return res.json({ ok: true }), true;
  }

  /* Wallet + transactions */
  if (method === 'GET' && p === '/user/wallet') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const ledger = demo.walletLedger.filter(l => l.user_id === user.id);
    return res.json({ balance: Number(user.wallet_balance) || 0, ledger }), true;
  }
  if (method === 'POST' && p === '/user/wallet/topup') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { amount, provider } = req.body || {};
    user.wallet_balance = Number(user.wallet_balance) + Number(amount);
    demo.walletLedger.push({ id: nextId('walletLedger'), user_id: user.id, amount: Number(amount), balance_after: user.wallet_balance, reason: 'Wallet top-up', created_at: new Date() });
    return res.json({ ok: true, balance: user.wallet_balance }), true;
  }
  if (method === 'GET' && p === '/user/transactions') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ transactions: demo.transactions.filter(t => t.user_id === user.id) }), true;
  }

  /* Preferences */
  if (method === 'GET' && p === '/user/preferences') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ intent: user.intent || 'both' }), true;
  }
  if (method === 'PUT' && p === '/user/preferences') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    if (['learn', 'consult', 'both'].includes(req.body?.intent)) user.intent = req.body.intent;
    return res.json({ ok: true, intent: user.intent }), true;
  }
  if (method === 'PUT' && p === '/user/profile') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { name, phone, timezone, intent } = req.body || {};
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (timezone !== undefined) user.timezone = timezone;
    if (intent !== undefined && ['learn', 'consult', 'both'].includes(intent)) user.intent = intent;
    const { password_hash, ...safe } = user;
    return res.json({ ok: true, user: safe }), true;
  }

  /* Claims + tickets + reviews */
  if (method === 'POST' && p === '/user/claims') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const id = nextId('claims');
    demo.claims.push({ id, user_id: user.id, ...req.body, status: 'open', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'GET' && p === '/user/claims') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ claims: demo.claims.filter(c => c.user_id === user.id) }), true;
  }
  if (method === 'POST' && p === '/user/tickets') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const ref = `TKT-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}`;
    const id = nextId('tickets');
    demo.tickets.push({ id, user_id: user.id, reference: ref, ...req.body, status: 'open', created_at: new Date() });
    return res.status(201).json({ id, reference: ref }), true;
  }
  if (method === 'GET' && p === '/user/tickets') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ tickets: demo.tickets.filter(t => t.user_id === user.id) }), true;
  }
  if (method === 'POST' && (m = p.match(/^\/user\/tickets\/(\d+)\/replies$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    demo.ticketReplies.push({ id: nextId('ticketReplies'), ticket_id: Number(m[1]), user_id: user.id, message: req.body?.message || '', created_at: new Date() });
    return res.status(201).json({ ok: true }), true;
  }
  if (method === 'POST' && p === '/user/reviews') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const id = nextId('reviews');
    demo.reviews.push({ id, author_id: user.id, ...req.body, status: 'published', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  /* Experts */
  if (method === 'GET' && p === '/user/experts') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const list = demo.users.filter(u => u.role === 'expert' && u.status === 'active').map(u => ({
      id: u.id, name: u.name, email: u.email, avatar: u.avatar, bio: u.bio,
      specialization: u.specialization, hourly_rate: u.hourly_rate, average_rating: u.average_rating,
    }));
    return res.json({ experts: list, total: list.length }), true;
  }

  /* ---------- EXPERT PANEL ---------- */
  if (method === 'GET' && p === '/expert/earnings') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({
      summary: { total_earned: user.total_earnings || 0, available_balance: user.wallet_balance || 0, total_paid_out: 0, pending_balance: 0 },
      ledger: demo.walletLedger.filter(l => l.user_id === user.id),
    }), true;
  }
  if (method === 'GET' && p === '/expert/dashboard-stats') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ stats: { total_consultations: 0, active_consultations: 0, total_courses: demo.courses.filter(c => c.expert_id === user.id).length } }), true;
  }
  if (method === 'GET' && p === '/expert/portfolio') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ items: demo.expertPortfolio.filter(p => p.expert_id === user.id) }), true;
  }
  if (method === 'POST' && p === '/expert/portfolio') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    const id = nextId('expertPortfolio');
    demo.expertPortfolio.push({ id, expert_id: user.id, ...req.body, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/expert\/portfolio\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    demo.expertPortfolio = demo.expertPortfolio.filter(x => !(x.id === Number(m[1]) && x.expert_id === user.id));
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/expert/reviews') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ reviews: demo.reviews.filter(r => r.expert_id === user.id) }), true;
  }
  if (method === 'GET' && p === '/expert/availability') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ availability: demo.availability.filter(a => a.expert_id === user.id) }), true;
  }
  if (method === 'PUT' && p === '/expert/availability') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    demo.availability = demo.availability.filter(a => a.expert_id !== user.id);
    for (const s of (req.body?.schedule || [])) {
      demo.availability.push({ id: nextId('availability'), expert_id: user.id, day_of_week: s.day, start_time: s.start, end_time: s.end, active: 1 });
    }
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/expert/time-off') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ timeOff: demo.timeOff.filter(t => t.expert_id === user.id) }), true;
  }
  if (method === 'POST' && p === '/expert/time-off') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    const id = nextId('timeOff');
    demo.timeOff.push({ id, expert_id: user.id, ...req.body, status: 'pending', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'GET' && p === '/expert/withdrawals') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ payouts: demo.payouts.filter(p => p.expert_id === user.id) }), true;
  }
  if (method === 'POST' && p === '/expert/withdrawals') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    const { amount, method: pm } = req.body || {};
    if (Number(amount) < config.platform.minPayout) return res.status(400).json({ error: `Minimum withdrawal ${config.platform.minPayout}` }), true;
    if (Number(user.wallet_balance) < Number(amount)) return res.status(400).json({ error: 'Insufficient balance' }), true;
    user.wallet_balance = Number(user.wallet_balance) - Number(amount);
    const id = nextId('payouts');
    demo.payouts.push({ id, expert_id: user.id, amount: Number(amount), method: pm, status: 'pending', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && p === '/expert/profile') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    const { specialization, hourly_rate, bio } = req.body || {};
    if (specialization !== undefined) user.specialization = specialization;
    if (hourly_rate !== undefined) user.hourly_rate = hourly_rate;
    if (bio !== undefined) user.bio = bio;
    return res.json({ ok: true }), true;
  }
  if (method === 'POST' && p === '/expert/courses') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    const id = nextId('courses');
    demo.courses.push({ id, ...req.body, expert_id: user.id, status: 'draft', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'POST' && (m = p.match(/^\/expert\/reviews\/(\d+)\/reply$/))) {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    const r = demo.reviews.find(x => x.id === Number(m[1]) && x.expert_id === user.id);
    if (r) { r.reply = req.body?.reply || ''; r.replied_at = new Date(); }
    return res.json({ ok: true }), true;
  }

  /* ---------- ADMIN ---------- */
  if (method === 'GET' && p === '/admin/users') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    const list = demo.users.map(({ password_hash, ...u }) => u);
    return res.json({ users: list, total: list.length }), true;
  }
  if (method === 'GET' && p === '/admin/experts') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    const list = demo.users.filter(u => u.role === 'expert').map(({ password_hash, ...u }) => u);
    return res.json({ experts: list, total: list.length }), true;
  }
  if (method === 'GET' && p === '/admin/analytics') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({
      totals: {
        total_users: demo.users.length,
        active_experts: demo.users.filter(u => u.role === 'expert' && u.status === 'active').length,
        pending_users: demo.users.filter(u => u.status === 'pending').length,
        active_consultations: 0,
        total_revenue: 0,
        published_courses: demo.courses.filter(c => c.status === 'published').length,
        published_events: demo.events.filter(e => e.status === 'published').length,
        institutions: demo.institutions.length,
        programmes: demo.programmes.length,
        trainees: demo.trainees.length,
      },
      usersByRole: ['admin', 'expert', 'institution', 'learner'].map(role => ({ role, c: demo.users.filter(u => u.role === role).length })),
      topExperts: demo.users.filter(u => u.role === 'expert').map(u => ({ id: u.id, name: u.name, average_rating: u.average_rating, total_earnings: u.total_earnings })),
      usersByMonth: [], revenueByMonth: [],
    }), true;
  }
  if (method === 'GET' && p === '/admin/transactions') return res.json({ transactions: demo.transactions }), true;
  if (method === 'GET' && p === '/admin/payouts') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ payouts: demo.payouts.map(p => ({ ...p, expert_name: demo.users.find(u => u.id === p.expert_id)?.name })) }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/payouts\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    const po = demo.payouts.find(x => x.id === Number(m[1]));
    if (po) Object.assign(po, req.body);
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/admin/coupons') return res.json({ coupons: demo.coupons }), true;
  if (method === 'POST' && p === '/admin/coupons') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    const id = nextId('coupons');
    demo.coupons.push({ id, ...req.body, used_count: 0, active: 1, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/coupons\/(\d+)\/toggle$/))) {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    const cp = demo.coupons.find(x => x.id === Number(m[1]));
    if (cp) cp.active = cp.active ? 0 : 1;
    return res.json({ ok: true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/admin\/coupons\/(\d+)$/))) {
    demo.coupons = demo.coupons.filter(x => x.id !== Number(m[1]));
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/admin/claims') return res.json({ claims: demo.claims }), true;
  if (method === 'PUT' && (m = p.match(/^\/admin\/claims\/(\d+)$/))) {
    const c = demo.claims.find(x => x.id === Number(m[1]));
    if (c) Object.assign(c, req.body);
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/admin/tickets') return res.json({ tickets: demo.tickets }), true;
  if (method === 'PUT' && (m = p.match(/^\/admin\/tickets\/(\d+)$/))) {
    const t = demo.tickets.find(x => x.id === Number(m[1]));
    if (t) Object.assign(t, req.body);
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/admin/reviews') return res.json({ reviews: demo.reviews }), true;
  if (method === 'PUT' && (m = p.match(/^\/admin\/reviews\/(\d+)$/))) {
    const r = demo.reviews.find(x => x.id === Number(m[1]));
    if (r) Object.assign(r, req.body);
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/admin/audit-logs') return res.json({ logs: demo.auditLogs }), true;
  if (method === 'GET' && p === '/admin/settings') return res.json({ settings: demo.settings }), true;
  if (method === 'PUT' && p === '/admin/settings') {
    Object.assign(demo.settings, req.body.settings || {});
    return res.json({ ok: true }), true;
  }
  if (method === 'POST' && p === '/admin/events') {
    const id = nextId('events');
    demo.events.push({ id, ...req.body, status: 'published', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/events\/(\d+)$/))) {
    const ev = demo.events.find(x => x.id === Number(m[1]));
    if (ev) Object.assign(ev, req.body);
    return res.json({ ok: true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/admin\/events\/(\d+)$/))) {
    demo.events = demo.events.filter(x => x.id !== Number(m[1]));
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/users\/(\d+)\/(approve|suspend|reject)$/))) {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (u) u.status = m[2] === 'approve' ? 'active' : m[2] === 'suspend' ? 'suspended' : 'rejected';
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/users\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (u) Object.assign(u, req.body);
    return res.json({ ok: true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/admin\/users\/(\d+)$/))) {
    demo.users = demo.users.filter(x => x.id !== Number(m[1]));
    return res.json({ ok: true }), true;
  }
  if (method === 'POST' && p === '/admin/experts/create') {
    const { name, email, specialization, hourly_rate, bio, phone } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name and email required' }), true;
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' }), true;
    const tempPwd = nanoid(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const id = nextId('users');
    demo.users.push({
      id, name, email, password_hash: hash, phone: phone || '',
      role: 'expert', status: 'active', specialization, hourly_rate: Number(hourly_rate || 0), bio,
      wallet_balance: 0, total_earnings: 0, average_rating: 0,
      created_at: new Date(), intent: 'both',
    });
    return res.status(201).json({ id, temp_password: tempPwd }), true;
  }
  if (method === 'POST' && p === '/admin/notifications/broadcast') {
    const { title, message, audience = 'all' } = req.body || {};
    let targets = demo.users;
    if (audience === 'experts') targets = targets.filter(u => u.role === 'expert');
    if (audience === 'learners') targets = targets.filter(u => u.role === 'learner');
    if (audience === 'institutions') targets = targets.filter(u => u.role === 'institution');
    if (audience === 'admins') targets = targets.filter(u => u.role === 'admin');
    for (const u of targets) {
      demo.notifications.push({ id: nextId('notifications'), user_id: u.id, title, message, type: 'broadcast', is_read: 0, created_at: new Date() });
    }
    return res.json({ ok: true, sent: targets.length }), true;
  }

  /* Admin Institutions */
  if (method === 'GET' && p === '/admin/institutions') {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ institutions: demo.institutions.map(i => ({ ...i, programme_count: demo.programmes.filter(x => x.institution_id === i.id).length })) }), true;
  }
  if (method === 'POST' && p === '/admin/institutions') {
    const id = nextId('institutions');
    demo.institutions.push({ id, ...req.body, status: 'pending', default_capacity: 30, pass_mark: 70, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/institutions\/(\d+)\/(approve|reject|suspend)$/))) {
    const inst = demo.institutions.find(i => i.id === Number(m[1]));
    if (!inst) return res.status(404).json({ error: 'Not found' }), true;
    inst.status = m[2] === 'approve' ? 'active' : m[2] === 'reject' ? 'rejected' : 'suspended';
    if (inst.ops_manager_id) {
      const u = demo.users.find(x => x.id === inst.ops_manager_id);
      if (u) u.status = inst.status;
    }
    return res.json({ ok: true, status: inst.status }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/institutions\/(\d+)$/))) {
    const inst = demo.institutions.find(i => i.id === Number(m[1]));
    if (inst) Object.assign(inst, req.body);
    return res.json({ ok: true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/admin\/institutions\/(\d+)$/))) {
    const id = Number(m[1]);
    demo.institutions = demo.institutions.filter(i => i.id !== id);
    demo.programmes = demo.programmes.filter(x => x.institution_id !== id);
    demo.cohorts = demo.cohorts.filter(x => x.institution_id !== id);
    demo.trainees = demo.trainees.filter(x => x.institution_id !== id);
    return res.json({ ok: true }), true;
  }
  if (method === 'POST' && (m = p.match(/^\/admin\/institutions\/(\d+)\/ops-manager$/))) {
    const inst = demo.institutions.find(i => i.id === Number(m[1]));
    if (!inst) return res.status(404).json({ error: 'Not found' }), true;
    const { name, email } = req.body || {};
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' }), true;
    const tempPwd = nanoid(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const uid = nextId('users');
    demo.users.push({
      id: uid, name, email, password_hash: hash, role: 'institution', status: 'active',
      institution_id: inst.id, institution_role: 'operations_manager', intent: 'both',
      created_at: new Date(),
    });
    inst.ops_manager_id = uid;
    inst.ops_manager_name = name;
    inst.ops_manager_email = email;
    return res.status(201).json({ id: uid, temp_password: tempPwd }), true;
  }

  /* ============================================================
     INSTITUTION — SELF-SERVICE (demo)
     ============================================================ */
  function _instContext(req) {
    const user = currentDemoUser(req);
    if (!user) return { user: null, inst: null, error: { status: 401, error: 'Invalid or expired token' } };
    if (user.role !== 'institution') return { user, inst: null, error: { status: 403, error: 'Not an institution account' } };
    const inst = demo.institutions.find(i => i.id === user.institution_id);
    if (!inst) return { user, inst: null, error: { status: 404, error: 'Institution not found' } };
    return { user, inst, error: null };
  }

  if (method === 'GET' && p === '/institution/me') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ institution: inst }), true;
  }
  if (method === 'PUT' && p === '/institution/profile') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    for (const k of ['name', 'type', 'industry', 'contact_phone', 'address']) {
      if (req.body[k] !== undefined) inst[k] = req.body[k];
    }
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && p === '/institution/settings') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    if (user.institution_role !== 'operations_manager') return res.status(403).json({ error: 'Only Ops Manager' }), true;
    for (const k of ['name', 'contact_email', 'default_capacity', 'pass_mark', 'seat_allocation', 'billing_cycle']) {
      if (req.body[k] !== undefined) inst[k] = req.body[k];
    }
    return res.json({ ok: true }), true;
  }

  /* Branding */
  if (method === 'GET' && p === '/institution/branding') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ branding: {
      id: inst.id, name: inst.name,
      logo_url: inst.logo_url || null,
      primary_color: inst.primary_color || '#1e3a8a',
      accent_color: inst.accent_color || '#059669',
      subdomain: inst.subdomain || null,
      custom_domain: inst.custom_domain || null,
      email_sender_name: inst.email_sender_name || null,
      email_sender_address: inst.email_sender_address || null,
      welcome_message: inst.welcome_message || null,
    }}), true;
  }
  if (method === 'PUT' && p === '/institution/branding') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    for (const k of ['primary_color', 'accent_color', 'subdomain', 'email_sender_name', 'email_sender_address', 'welcome_message']) {
      if (b[k] !== undefined) inst[k] = b[k];
    }
    return res.json({ ok: true }), true;
  }

  /* Webhook */
  if (method === 'PUT' && p === '/institution/webhook') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    inst.webhook_url = req.body?.webhook_url || null;
    inst.webhook_secret = req.body?.webhook_secret || null;
    return res.json({ ok: true }), true;
  }
  if (method === 'POST' && p === '/institution/webhook/test') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    if (!inst.webhook_url) return res.status(400).json({ error: 'No webhook configured' }), true;
    return res.json({ ok: true, status: 200, demo: true }), true;
  }

  /* Programmes */
  if (method === 'GET' && p === '/institution/programmes') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.programmes
      .filter(x => x.institution_id === inst.id)
      .map(x => ({ ...x, enrolled_count: demo.trainees.filter(t => t.programme_id === x.id).length }));
    return res.json({ programmes: list }), true;
  }
  if (method === 'POST' && p === '/institution/programmes') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Title required' }), true;
    const id = nextId('programmes');
    demo.programmes.push({
      id, institution_id: inst.id,
      title: b.title, description: b.description || '', category: b.category || 'General',
      delivery_mode: b.delivery_mode || 'hybrid', level: b.level || 'intermediate',
      status: b.status || 'draft',
      start_date: b.start_date ? new Date(b.start_date) : null,
      end_date: b.end_date ? new Date(b.end_date) : null,
      capacity: Number(b.capacity || inst.default_capacity || 30),
      duration_hours: Number(b.duration_hours || 0),
      cost_per_seat: Number(b.cost_per_seat || 0),
      trainer_cost: Number(b.trainer_cost || 0),
      materials_cost: Number(b.materials_cost || 0),
      prerequisite_programme_id: b.prerequisite_programme_id || null,
      accreditation_body: b.accreditation_body || null,
      cpd_points: Number(b.cpd_points || 0),
      created_at: new Date(),
    });
    demo.institutionAudit.push({
      id: nextId('institutionAudit'), institution_id: inst.id,
      actor_id: user.id, actor_name: user.name,
      action: `Created programme "${b.title}"`, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/programmes\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const pr = demo.programmes.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (!pr) return res.status(404).json({ error: 'Programme not found' }), true;
    Object.assign(pr, req.body || {});
    return res.json({ ok: true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/programmes\/(\d+)$/))) {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const pr = demo.programmes.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (!pr) return res.status(404).json({ error: 'Programme not found' }), true;
    demo.programmes = demo.programmes.filter(x => x.id !== pr.id);
    demo.institutionAudit.push({
      id: nextId('institutionAudit'), institution_id: inst.id,
      actor_id: user.id, actor_name: user.name,
      action: `Deleted programme "${pr.title}"`, created_at: new Date(),
    });
    return res.json({ ok: true }), true;
  }

  /* Programme modules (curriculum) */
  if (method === 'GET' && (m = p.match(/^\/institution\/programmes\/(\d+)\/modules$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ modules: demo.materials.filter(x => x.programme_id === Number(m[1]) && x.type === 'module') }), true;
  }
  if (method === 'POST' && (m = p.match(/^\/institution\/programmes\/(\d+)\/modules$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Title required' }), true;
    const existing = demo.materials.filter(x => x.programme_id === Number(m[1]) && x.type === 'module');
    const id = nextId('materials');
    demo.materials.push({
      id, type: 'module', programme_id: Number(m[1]),
      title: b.title, description: b.description || null,
      duration_hours: Number(b.duration_hours || 0),
      position: existing.length + 1, created_at: new Date(),
    });
    return res.status(201).json({ id, position: existing.length + 1 }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/programmes\/(\d+)\/modules\/(\d+)$/))) {
    demo.materials = demo.materials.filter(x => x.id !== Number(m[2]));
    return res.json({ ok: true }), true;
  }

  /* Cohorts */
  if (method === 'GET' && p === '/institution/cohorts') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.cohorts.filter(c => c.institution_id === inst.id).map(c => ({
      ...c,
      programme_title: demo.programmes.find(x => x.id === c.programme_id)?.title || null,
      instructor_name: c.instructor_name || (c.instructor_id ? demo.users.find(u => u.id === c.instructor_id)?.name : null) || null,
      trainee_count: demo.trainees.filter(t => t.cohort_id === c.id).length,
    }));
    return res.json({ cohorts: list }), true;
  }
  if (method === 'POST' && p === '/institution/cohorts') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.name || !b.programme_id) return res.status(400).json({ error: 'name and programme_id required' }), true;
    const instructor = b.instructor_id ? demo.users.find(u => u.id === Number(b.instructor_id)) : null;
    const id = nextId('cohorts');
    demo.cohorts.push({
      id, institution_id: inst.id, programme_id: Number(b.programme_id),
      name: b.name, instructor_id: instructor?.id || null, instructor_name: instructor?.name || null,
      start_date: b.start_date ? new Date(b.start_date) : null,
      end_date: b.end_date ? new Date(b.end_date) : null,
      capacity: Number(b.capacity || inst.default_capacity || 30),
      location: b.location || null,
      trainee_count: 0, status: b.status || 'active', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/cohorts\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const ch = demo.cohorts.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (!ch) return res.status(404).json({ error: 'Cohort not found' }), true;
    Object.assign(ch, req.body || {});
    return res.json({ ok: true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/cohorts\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.cohorts = demo.cohorts.filter(x => !(x.id === Number(m[1]) && x.institution_id === inst.id));
    return res.json({ ok: true }), true;
  }

  /* Waitlist */
  if (method === 'GET' && (m = p.match(/^\/institution\/cohorts\/(\d+)\/waitlist$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ waitlist: demo.materials.filter(x => x.type === 'waitlist' && x.cohort_id === Number(m[1])) }), true;
  }

  /* Assessments */
  if (method === 'GET' && p === '/institution/assessments') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.assessments.filter(x => x.institution_id === inst.id).map(x => ({
      ...x, cohort_name: demo.cohorts.find(c => c.id === x.cohort_id)?.name || null,
      question_count: 0,
    }));
    return res.json({ assessments: list }), true;
  }
  if (method === 'POST' && p === '/institution/assessments') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.title || !b.cohort_id) return res.status(400).json({ error: 'title and cohort_id required' }), true;
    const id = nextId('assessments');
    demo.assessments.push({
      id, institution_id: inst.id, cohort_id: Number(b.cohort_id),
      title: b.title, type: b.type || 'quiz',
      weight: Number(b.weight || 0), pass_mark: Number(b.pass_mark || 70),
      max_attempts: Number(b.max_attempts || 1),
      time_limit_minutes: Number(b.time_limit_minutes || 0),
      auto_grade: b.auto_grade === false ? 0 : 1,
      due_date: b.due_date ? new Date(b.due_date) : null,
      status: 'scheduled', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/assessments\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.assessments = demo.assessments.filter(x => !(x.id === Number(m[1]) && x.institution_id === inst.id));
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && (m = p.match(/^\/institution\/assessments\/(\d+)\/submissions$/))) {
    return res.json({ submissions: [] }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/assessments\/submissions\/(\d+)\/grade$/))) {
    return res.json({ ok: true, demo: true }), true;
  }

  /* Projects */
  if (method === 'GET' && p === '/institution/projects') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.projects.filter(x => x.institution_id === inst.id).map(x => ({
      ...x, cohort_name: demo.cohorts.find(c => c.id === x.cohort_id)?.name || null,
    }));
    return res.json({ projects: list }), true;
  }
  if (method === 'POST' && p === '/institution/projects') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.title || !b.cohort_id) return res.status(400).json({ error: 'title and cohort_id required' }), true;
    const id = nextId('projects');
    demo.projects.push({
      id, institution_id: inst.id, cohort_id: Number(b.cohort_id),
      title: b.title, description: b.description || '', category: b.category || 'Project',
      deadline: b.deadline ? new Date(b.deadline) : null,
      max_score: Number(b.max_score || 100),
      status: 'active', submissions_count: 0, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  /* Question Bank */
  if (method === 'GET' && p === '/institution/question-bank') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ questions: demo.questionBank.filter(q => q.institution_id === inst.id) }), true;
  }
  if (method === 'POST' && p === '/institution/question-bank') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.question_text) return res.status(400).json({ error: 'Question text required' }), true;
    const id = nextId('questionBank');
    demo.questionBank.push({
      id, institution_id: inst.id,
      category: b.category || null,
      difficulty: b.difficulty || 'medium',
      question_type: b.question_type || 'mcq',
      question_text: b.question_text,
      options: b.options || null,
      correct_answer: b.correct_answer || null,
      points: Number(b.points || 1),
      explanation: b.explanation || null,
      tags: b.tags || null,
      created_by: user.id,
      created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/question-bank\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.questionBank = demo.questionBank.filter(x => !(x.id === Number(m[1]) && x.institution_id === inst.id));
    return res.json({ ok: true }), true;
  }

  /* Trainees */
  if (method === 'GET' && p === '/institution/trainees') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ trainees: demo.trainees.filter(t => t.institution_id === inst.id), total: demo.trainees.length }), true;
  }
  if (method === 'GET' && (m = p.match(/^\/institution\/trainees\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const t = demo.trainees.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (!t) return res.status(404).json({ error: 'Trainee not found' }), true;
    return res.json({ trainee: t, enrollments: [], certificates: [], skills: [] }), true;
  }
  if (method === 'POST' && p === '/institution/trainees/invite') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const { emails = [], programme_id, cohort_id } = req.body || {};
    if (!Array.isArray(emails) || !emails.length) return res.status(400).json({ error: 'emails required' }), true;
    const programme = demo.programmes.find(p => p.id === Number(programme_id));
    let invited = [];
    for (const email of emails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      const id = nextId('trainees');
      demo.trainees.push({
        id, institution_id: inst.id, user_id: null,
        name: email.split('@')[0], email,
        programme_id: programme?.id || null,
        programme_title: programme?.title || null,
        cohort_id: cohort_id ? Number(cohort_id) : null,
        cohort_name: cohort_id ? demo.cohorts.find(c => c.id === Number(cohort_id))?.name : null,
        progress: 0, assessment_avg: null,
        status: 'invited', lifecycle_status: 'invited',
        created_at: new Date(),
      });
      invited.push(email);
    }
    return res.status(201).json({ invited: invited.length, emails: invited }), true;
  }
  if (method === 'POST' && p === '/institution/trainees/import') {
    // CSV import — no real file in demo, return simulated
    return res.json({
      import_id: nextId('imports'),
      total: 0, success: 0, errors: [],
      invited: [],
    }), true;
  }
  if (method === 'GET' && p === '/institution/trainees/imports') {
    return res.json({ imports: [] }), true;
  }

  /* Enrollments */
  if (method === 'GET' && p === '/institution/enrollments') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.trainees.filter(t => t.institution_id === inst.id).map(t => ({
      id: t.id, user_id: t.user_id, trainee_name: t.name, email: t.email,
      department: t.department || null,
      programme_id: t.programme_id, programme_title: t.programme_title,
      cohort_id: t.cohort_id, cohort_name: t.cohort_name,
      status: t.lifecycle_status || t.status,
      progress: t.progress, enrolled_at: t.created_at,
    }));
    return res.json({ enrollments: list, total: list.length, page: 1, per: 50 }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/enrollments\/(\d+)\/approve$/))) {
    const t = demo.trainees.find(x => x.id === Number(m[1]));
    if (t) { t.lifecycle_status = 'active'; t.status = 'active'; }
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/enrollments\/(\d+)\/reject$/))) {
    const t = demo.trainees.find(x => x.id === Number(m[1]));
    if (t) { t.lifecycle_status = 'withdrawn'; t.status = 'withdrawn'; }
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/enrollments\/(\d+)\/transfer$/))) {
    const t = demo.trainees.find(x => x.id === Number(m[1]));
    if (t) { t.cohort_id = Number(req.body?.cohort_id); }
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/enrollments\/(\d+)\/notes$/))) {
    const t = demo.trainees.find(x => x.id === Number(m[1]));
    if (t) {
      t.at_risk = req.body?.at_risk ? 1 : 0;
      t.accessibility_notes = req.body?.accessibility_notes || null;
      t.internal_notes = req.body?.internal_notes || null;
    }
    return res.json({ ok: true }), true;
  }

  /* Sessions */
  if (method === 'GET' && p === '/institution/sessions') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.sessions.filter(s => s.institution_id === inst.id).map(s => ({
      ...s,
      cohort_name: demo.cohorts.find(c => c.id === s.cohort_id)?.name || null,
      instructor_name: s.instructor_id ? demo.users.find(u => u.id === s.instructor_id)?.name : null,
      present_count: 0, total_count: 0,
    }));
    return res.json({ sessions: list }), true;
  }
  if (method === 'POST' && p === '/institution/sessions') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.title || !b.cohort_id || !b.scheduled_at) return res.status(400).json({ error: 'title, cohort_id, scheduled_at required' }), true;
    const id = nextId('sessions');
    demo.sessions.push({
      id, institution_id: inst.id, cohort_id: Number(b.cohort_id),
      title: b.title, description: b.description || null,
      instructor_id: b.instructor_id || null,
      scheduled_at: new Date(b.scheduled_at),
      duration_minutes: Number(b.duration_minutes || 60),
      mode: b.mode || 'online', location: b.location || null,
      meeting_url: b.meeting_url || null,
      status: 'scheduled', created_by: user.id, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/sessions\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const s = demo.sessions.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (!s) return res.status(404).json({ error: 'Session not found' }), true;
    Object.assign(s, req.body || {});
    return res.json({ ok: true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/sessions\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.sessions = demo.sessions.filter(x => !(x.id === Number(m[1]) && x.institution_id === inst.id));
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && (m = p.match(/^\/institution\/sessions\/(\d+)\/attendance$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const session = demo.sessions.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (!session) return res.status(404).json({ error: 'Session not found' }), true;
    const trainees = demo.trainees
      .filter(t => t.cohort_id === session.cohort_id && t.institution_id === inst.id)
      .map(t => ({ id: t.id, name: t.name, email: t.email, status: 'absent', excuse_reason: null }));
    return res.json({ session, trainees }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/sessions\/(\d+)\/attendance$/))) {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const records = req.body?.records || [];
    for (const r of records) {
      const existing = demo.attendance.find(a => a.session_id === Number(m[1]) && a.trainee_id === r.trainee_id);
      if (existing) Object.assign(existing, r);
      else demo.attendance.push({ id: nextId('attendance'), session_id: Number(m[1]), ...r, marked_by: user.id, marked_at: new Date() });
    }
    return res.json({ ok: true }), true;
  }

  /* Certificates */
  if (method === 'GET' && p === '/institution/certificates') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ certificates: demo.certificatesInst.filter(c => c.institution_id === inst.id) }), true;
  }
  if (method === 'POST' && p === '/institution/certificates/issue') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const { trainee_id, programme_id, awarding_body, cpd_points, valid_months, grade } = req.body || {};
    const t = demo.trainees.find(x => x.id === Number(trainee_id));
    const pr = demo.programmes.find(x => x.id === Number(programme_id));
    if (!t || !pr) return res.status(404).json({ error: 'Trainee or programme not found' }), true;

    const serial = `EH-${inst.id}-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}`;
    const expiresAt = valid_months ? new Date(Date.now() + valid_months * 30 * 86400000) : null;
    const id = nextId('certificatesInst');
    demo.certificatesInst.push({
      id, institution_id: inst.id, trainee_id: t.id, programme_id: pr.id,
      title: `${t.name} - ${pr.title}`, serial,
      trainee_name: t.name, programme_title: pr.title,
      awarding_body: awarding_body || null,
      cpd_points: Number(cpd_points || 0),
      grade: grade || null,
      issued_at: new Date(), expires_at: expiresAt,
      revoked: 0,
    });
    return res.status(201).json({ id, serial, verification_url: `/verify/${serial}` }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/certificates\/(\d+)\/revoke$/))) {
    const c = demo.certificatesInst.find(x => x.id === Number(m[1]));
    if (c) { c.revoked = 1; c.revoked_reason = req.body?.reason || null; }
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/certificates\/(\d+)\/renew$/))) {
    const c = demo.certificatesInst.find(x => x.id === Number(m[1]));
    if (c) {
      const months = Number(req.body?.valid_months || 12);
      c.expires_at = new Date(Date.now() + months * 30 * 86400000);
      c.revoked = 0;
    }
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/institution/certificates/expiring') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const days = Number(req.query.days || 90);
    const now = Date.now();
    const list = demo.certificatesInst.filter(c => {
      if (c.institution_id !== inst.id || c.revoked || !c.expires_at) return false;
      const d = (new Date(c.expires_at) - now) / 86400000;
      return d > 0 && d < days;
    });
    return res.json({ certificates: list, window_days: days }), true;
  }
  if (method === 'GET' && (m = p.match(/^\/institution\/certificates\/(\d+)\/pdf$/))) {
    if (!certificatePdfStream) return res.status(503).json({ error: 'PDF generation unavailable' }), true;
    const c = demo.certificatesInst.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${c.serial}.pdf"`);
    const doc = certificatePdfStream(c, {});
    doc.pipe(res);
    return true;
  }

  /* Skills */
  if (method === 'GET' && p === '/institution/skills') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ skills: demo.skills.filter(s => s.institution_id === inst.id) }), true;
  }
  if (method === 'POST' && p === '/institution/skills') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Name required' }), true;
    const id = nextId('skills');
    demo.skills.push({ id, institution_id: inst.id, name: b.name, category: b.category || null, description: b.description || null, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/skills\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.skills = demo.skills.filter(s => !(s.id === Number(m[1]) && s.institution_id === inst.id));
    return res.json({ ok: true }), true;
  }
  if (method === 'GET' && p === '/institution/skills/matrix') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const skills = demo.skills.filter(s => s.institution_id === inst.id);
    const trainees = demo.trainees.filter(t => t.institution_id === inst.id);
    const matrix = trainees.map(t => ({
      trainee: { id: t.id, name: t.name, email: t.email, department: t.department || null },
      levels: Object.fromEntries(
        skills.map(s => {
          const ts = demo.traineeSkills.find(x => x.trainee_id === t.id && x.skill_id === s.id);
          return [s.id, ts ? ts.level : 0];
        })
      ),
    }));
    return res.json({ skills, matrix }), true;
  }
  if (method === 'PUT' && p === '/institution/skills/assess') {
    const { user, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const { trainee_id, skill_id, level, source } = req.body || {};
    const existing = demo.traineeSkills.find(x => x.trainee_id === Number(trainee_id) && x.skill_id === Number(skill_id));
    if (existing) {
      existing.level = Number(level);
      existing.assessed_by = user.id;
      existing.assessed_at = new Date();
    } else {
      demo.traineeSkills.push({
        id: nextId('traineeSkills'),
        trainee_id: Number(trainee_id),
        skill_id: Number(skill_id),
        level: Number(level),
        assessed_by: user.id,
        source: source || 'manager',
        assessed_at: new Date(),
      });
    }
    return res.json({ ok: true }), true;
  }

  /* Approvals */
  if (method === 'GET' && p === '/institution/approvals') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const status = req.query.status || 'pending';
    return res.json({ approvals: demo.institutionReqs.filter(a => a.institution_id === inst.id && a.status === status) }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/approvals\/(\d+)$/))) {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const a = demo.institutionReqs.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (!a) return res.status(404).json({ error: 'Request not found' }), true;
    a.status = req.body?.status || 'approved';
    a.decision_notes = req.body?.decision_notes || null;
    a.decided_at = new Date();
    return res.json({ ok: true }), true;
  }

  /* Instructors */
  if (method === 'GET' && p === '/institution/instructors') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ instructors: demo.instructors.filter(i => i.institution_id === inst.id) }), true;
  }
  if (method === 'POST' && p === '/institution/instructors') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const expert = demo.users.find(u => u.id === Number(req.body?.expert_id) && u.role === 'expert');
    if (!expert) return res.status(404).json({ error: 'Expert not found' }), true;
    const existing = demo.instructors.find(i => i.institution_id === inst.id && i.expert_id === expert.id);
    if (existing) return res.json({ id: existing.id, already: true }), true;
    const id = nextId('instructors');
    demo.instructors.push({ id, institution_id: inst.id, expert_id: expert.id, name: expert.name, specialization: expert.specialization, programme_count: 0, status: 'active', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  /* Team */
  if (method === 'GET' && p === '/institution/team') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    if (user.institution_role !== 'operations_manager') return res.json({ team: [] }), true;
    return res.json({ team: demo.institutionTeam.filter(t => t.institution_id === inst.id) }), true;
  }
  if (method === 'POST' && p === '/institution/team/invite') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    if (user.institution_role !== 'operations_manager') return res.status(403).json({ error: 'Only Ops Manager' }), true;
    const { name, email, institution_role } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name and email required' }), true;
    if (!config.institution.roles.includes(institution_role)) return res.status(400).json({ error: 'Invalid role' }), true;
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' }), true;
    const tempPwd = nanoid(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const uid = nextId('users');
    demo.users.push({
      id: uid, name, email, password_hash: hash, role: 'institution', status: 'active',
      institution_id: inst.id, institution_role, intent: 'both',
      created_at: new Date(),
    });
    demo.institutionTeam.push({ id: nextId('institutionTeam'), institution_id: inst.id, user_id: uid, name, email, institution_role, status: 'active', created_at: new Date() });
    return res.status(201).json({ id: uid, temp_password: tempPwd }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/team\/(\d+)\/role$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const u = demo.users.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (u) u.institution_role = req.body?.institution_role;
    return res.json({ ok: true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/team\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.institutionTeam = demo.institutionTeam.filter(t => !(t.user_id === Number(m[1]) && t.institution_id === inst.id));
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (u) u.status = 'suspended';
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/team\/(\d+)\/permissions$/))) {
    const { inst } = _instContext(req);
    const list = req.body?.permissions || [];
    for (const p of list) {
      const existing = demo.teamPermissions.find(x => x.user_id === Number(m[1]) && x.permission_key === p.key);
      if (existing) existing.granted = p.granted ? 1 : 0;
      else demo.teamPermissions.push({ id: nextId('teamPermissions'), institution_id: inst.id, user_id: Number(m[1]), permission_key: p.key, granted: p.granted ? 1 : 0 });
    }
    return res.json({ ok: true }), true;
  }

  /* Org units */
  if (method === 'GET' && p === '/institution/org-units') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ units: demo.orgUnits.filter(u => u.institution_id === inst.id) }), true;
  }
  if (method === 'POST' && p === '/institution/org-units') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const id = nextId('orgUnits');
    demo.orgUnits.push({ id, institution_id: inst.id, ...req.body, active: 1, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/org-units\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const ou = demo.orgUnits.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (ou) Object.assign(ou, req.body);
    return res.json({ ok: true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/org-units\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.orgUnits = demo.orgUnits.filter(x => !(x.id === Number(m[1]) && x.institution_id === inst.id));
    return res.json({ ok: true }), true;
  }

  /* Learning paths */
  if (method === 'GET' && p === '/institution/learning-paths') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ paths: demo.learningPaths.filter(lp => lp.institution_id === inst.id).map(lp => ({ ...lp, step_count: 0 })) }), true;
  }
  if (method === 'POST' && p === '/institution/learning-paths') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const id = nextId('learningPaths');
    demo.learningPaths.push({ id, institution_id: inst.id, ...req.body, active: 1, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/learning-paths\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.learningPaths = demo.learningPaths.filter(x => !(x.id === Number(m[1]) && x.institution_id === inst.id));
    return res.json({ ok: true }), true;
  }

  /* Compliance */
  if (method === 'GET' && p === '/institution/compliance-rules') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ rules: demo.complianceRules.filter(r => r.institution_id === inst.id) }), true;
  }
  if (method === 'POST' && p === '/institution/compliance-rules') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const id = nextId('complianceRules');
    demo.complianceRules.push({ id, institution_id: inst.id, ...req.body, active: 1, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  /* Reports */
  if (method === 'GET' && p === '/institution/reports/programme-scorecard') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const rows = demo.programmes.filter(p => p.institution_id === inst.id).map(p => {
      const enrolled = demo.trainees.filter(t => t.programme_id === p.id);
      const completed = enrolled.filter(t => t.progress >= 100);
      const avg = enrolled.length ? Math.round(enrolled.reduce((s, t) => s + (t.progress || 0), 0) / enrolled.length) : 0;
      return { id: p.id, title: p.title, status: p.status, total_enrolled: enrolled.length, total_completed: completed.length, avg_progress: avg, cost_per_seat: p.cost_per_seat || 0 };
    });
    return res.json({ scorecard: rows }), true;
  }
  if (method === 'GET' && p === '/institution/reports/cohort-comparison') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const rows = demo.cohorts.filter(c => c.institution_id === inst.id).map(c => {
      const ts = demo.trainees.filter(t => t.cohort_id === c.id);
      const avg = ts.length ? Math.round(ts.reduce((s, t) => s + (t.progress || 0), 0) / ts.length) : 0;
      return { id: c.id, name: c.name, programme_title: c.programme_title || demo.programmes.find(x => x.id === c.programme_id)?.title, enrolled: ts.length, avg_progress: avg, avg_score: 0, presents: 0, attendance_total: 0 };
    });
    return res.json({ cohorts: rows }), true;
  }
  if (method === 'GET' && p === '/institution/reports/trainee-progress-heatmap') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const rows = demo.trainees.filter(t => t.institution_id === inst.id).map(t => ({
      id: t.id, name: t.name, department: t.department || null,
      programme_title: t.programme_title || null,
      progress: t.progress || 0,
      pace: t.progress >= 80 ? 'ahead' : t.progress >= 50 ? 'on_track' : t.progress >= 20 ? 'behind' : 'at_risk',
    }));
    return res.json({ heatmap: rows }), true;
  }
  if (method === 'GET' && p === '/institution/reports/compliance') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const rows = demo.trainees.filter(t => t.institution_id === inst.id).map(t => {
      const c = demo.certificatesInst.find(x => x.trainee_id === t.id && !x.revoked);
      let status = 'no_expiry';
      if (c) {
        if (!c.expires_at) status = 'no_expiry';
        else if (new Date(c.expires_at) < new Date()) status = 'expired';
        else if (new Date(c.expires_at) - Date.now() < 30 * 86400000) status = 'expiring_soon';
        else status = 'valid';
      }
      return { id: t.id, name: t.name, department: t.department || null, title: c?.title, expires_at: c?.expires_at, compliance_status: status };
    });
    return res.json({ compliance: rows }), true;
  }
  if (method === 'GET' && p === '/institution/reports/cost') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const rows = demo.programmes.filter(p => p.institution_id === inst.id).map(p => {
      const seats = demo.trainees.filter(t => t.programme_id === p.id).length;
      return { id: p.id, title: p.title, seats, cost_per_seat: p.cost_per_seat || 0, trainer_cost: p.trainer_cost || 0, materials_cost: p.materials_cost || 0, total_cost: seats * (p.cost_per_seat || 0) + (p.trainer_cost || 0) + (p.materials_cost || 0) };
    });
    const total = rows.reduce((s, r) => s + r.total_cost, 0);
    return res.json({ cost: rows, total_cost: total }), true;
  }
  if (method === 'GET' && p === '/institution/report-templates') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ templates: demo.reportTemplates.filter(t => t.institution_id === inst.id) }), true;
  }
  if (method === 'POST' && p === '/institution/report-templates') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const id = nextId('reportTemplates');
    demo.reportTemplates.push({ id, institution_id: inst.id, name: req.body?.name, report_type: req.body?.report_type, filters: req.body?.filters || {}, columns: req.body?.columns || [], created_by: user.id, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'GET' && p === '/institution/scheduled-reports') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.scheduledReports.filter(r => r.institution_id === inst.id).map(r => ({
      ...r, template_name: demo.reportTemplates.find(t => t.id === r.template_id)?.name,
    }));
    return res.json({ reports: list }), true;
  }
  if (method === 'POST' && p === '/institution/scheduled-reports') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const id = nextId('scheduledReports');
    demo.scheduledReports.push({
      id, institution_id: inst.id,
      template_id: Number(req.body?.template_id),
      frequency: req.body?.frequency || 'weekly',
      recipients: req.body?.recipients || [],
      next_run_at: new Date(Date.now() + 7 * 86400000),
      active: 1, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  /* Materials */
  if (method === 'GET' && p === '/institution/materials') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.materials.filter(m => m.institution_id === inst.id && m.type !== 'module');
    return res.json({ materials: list }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/materials\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.materials = demo.materials.filter(x => !(x.id === Number(m[1]) && x.institution_id === inst.id));
    return res.json({ ok: true }), true;
  }

  /* Stats */
  if (method === 'GET' && p === '/institution/stats') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;

    const myTrainees = demo.trainees.filter(t => t.institution_id === inst.id);
    const myCohorts = demo.cohorts.filter(c => c.institution_id === inst.id);
    const myReqs = demo.institutionReqs.filter(r => r.institution_id === inst.id);
    const myAudit = demo.institutionAudit.filter(a => a.institution_id === inst.id).sort((a, b) => b.created_at - a.created_at);

    const avgCompletion = myTrainees.length ? Math.round(myTrainees.reduce((s, t) => s + (t.progress || 0), 0) / myTrainees.length) : 0;
    const scored = myTrainees.filter(t => t.assessment_avg != null);
    const avgScore = scored.length ? Math.round(scored.reduce((s, t) => s + t.assessment_avg, 0) / scored.length) : 0;
    const expiringCerts = demo.certificatesInst.filter(c => {
      if (c.institution_id !== inst.id || c.revoked || !c.expires_at) return false;
      const d = (new Date(c.expires_at) - Date.now()) / 86400000;
      return d > 0 && d < 90;
    });

    const upcomingSessions = demo.sessions.filter(s => s.institution_id === inst.id && s.status === 'scheduled').slice(0, 5);

    return res.json({
      stats: {
        avgCompletionRate: avgCompletion,
        avgScore,
        attendanceRate: 0,
        totalTrainees: myTrainees.length,
        pendingApprovals: myReqs.filter(r => r.status === 'pending').length,
        expiringCertificates: expiringCerts.length,
        projectsSubmitted: 0,
        certificatesIssued: demo.certificatesInst.filter(c => c.institution_id === inst.id).length,
        upcomingSessions,
        auditLog: myAudit.slice(0, 30),
        totals: {
          programmes: demo.programmes.filter(p => p.institution_id === inst.id).length,
          cohorts: myCohorts.length,
          assessments: demo.assessments.filter(a => a.institution_id === inst.id).length,
          projects: demo.projects.filter(p => p.institution_id === inst.id).length,
          trainees: myTrainees.length,
          instructors: demo.instructors.filter(i => i.institution_id === inst.id).length,
        },
      },
    }), true;
  }

  /* Upload material via file */
  if (method === 'POST' && p === '/institution/materials') {
    return res.status(503).json({ error: 'File upload not available in demo mode. Configure MySQL.', demo: true }), true;
  }

  /* Fallback */
  return res.status(503).json({
    error: 'Feature not available in demo mode',
    message: 'Configure DB_HOST/DB_USER/DB_PASSWORD/DB_NAME and restart for full functionality.',
    path: p, method,
  }), true;
}

app.use('/api', demoRouter);

/* ============================================================
   REAL DB ROUTES
   ============================================================ */
const requireDB = (req, res, next) => {
  if (demo.active) return next('route');
  if (!dbState.connected) {
    return res.status(503).json({
      error: 'Database unavailable',
      hint: 'Configure DB_* env vars or wait for auto-reconnect.',
      last_error: dbState.lastError,
    });
  }
  next();
};

async function logAudit(actorId, action, target, targetId, meta, ip) {
  try {
    const pool = poolOrThrow();
    await pool.query(
      `INSERT INTO audit_logs (actor_id,action,target,target_id,meta,ip) VALUES (?,?,?,?,?,?)`,
      [actorId || null, action, target || null, targetId || null, meta ? JSON.stringify(meta) : null, ip || null]
    );
  } catch (e) { console.error('audit log failed', e.message); }
}

async function notify(userId, title, message, type = 'info', link = null) {
  const pool = poolOrThrow();
  const [r] = await pool.query(
    `INSERT INTO notifications (user_id,title,message,type,link) VALUES (?,?,?,?,?)`,
    [userId, title, message, type, link]
  );
  if (io) io.to(`user_${userId}`).emit('notification', { id: r.insertId, user_id: userId, title, message, type, link, is_read: 0, created_at: now() });
  return r.insertId;
}

async function creditWallet(userId, amount, reason, ref = null) {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id=?', [amount, userId]);
    const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id=?', [userId]);
    await conn.query('INSERT INTO wallet_ledger (user_id,amount,balance_after,reason,reference) VALUES (?,?,?,?,?)', [userId, amount, u.wallet_balance, reason, ref]);
    await conn.commit();
    return u.wallet_balance;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function debitWallet(userId, amount, reason, ref = null) {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id=? FOR UPDATE', [userId]);
    if (!u || Number(u.wallet_balance) < Number(amount)) throw new Error('Insufficient balance');
    await conn.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id=?', [amount, userId]);
    const [[u2]] = await conn.query('SELECT wallet_balance FROM users WHERE id=?', [userId]);
    await conn.query('INSERT INTO wallet_ledger (user_id,amount,balance_after,reason,reference) VALUES (?,?,?,?,?)', [userId, -amount, u2.wallet_balance, reason, ref]);
    await conn.commit();
    return u2.wallet_balance;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function institutionAudit(instId, actorId, actorName, action, meta = null, ip = null) {
  try {
    const pool = poolOrThrow();
    await pool.query(
      `INSERT INTO institution_audit_logs (institution_id, actor_id, action, meta, ip)
       VALUES (?,?,?,?,?)`,
      [instId, actorId, action, meta ? JSON.stringify(meta) : null, ip]
    );
  } catch (e) { console.error('[inst audit]', e.message); }
}

async function requireInstitution(req, res, next) {
  try {
    const pool = poolOrThrow();
    const [[u]] = await pool.query(
      'SELECT id, institution_id, institution_role, status FROM users WHERE id=?',
      [req.user.id]
    );
    if (!u || !u.institution_id) return res.status(403).json({ error: 'Not an institution account' });
    const [[inst]] = await pool.query('SELECT * FROM institutions WHERE id=?', [u.institution_id]);
    if (!inst) return res.status(404).json({ error: 'Institution not found' });
    if (inst.status !== 'active' && u.institution_role !== 'operations_manager') {
      return res.status(403).json({ error: 'Institution not active' });
    }
    req.institution = inst;
    req.institutionRole = u.institution_role;
    next();
  } catch (e) { next(e); }
}

/* -------------------- AUTH -------------------- */
app.post('/api/auth/register', [
  body('name').isLength({ min: 2, max: 120 }),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('role').optional().isIn(['learner', 'expert', 'institution']),
], validate, requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { name, email, password, phone = '', role = 'learner', extra = {} } = req.body;
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const safeRole = role === 'admin' ? 'learner' : role;
  const status = safeRole === 'learner' ? 'active' : 'pending';
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,phone,role,status,specialization,hourly_rate,bio,intent)
     VALUES (?,?,?,?,?,?,?,?,?, 'both')`,
    [name, email, hash, phone, safeRole, status, extra.specialization || null, extra.hourly_rate || 0, extra.bio || null]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await notify(r.insertId, 'Welcome!', status === 'active' ? 'Your account is ready.' : 'Your account is pending admin approval.');

  if (safeRole === 'institution') {
    const [inst] = await pool.query(
      `INSERT INTO institutions (name, type, industry, contact_email, contact_phone, address, ops_manager_id, ops_manager_name, ops_manager_email, status, primary_color, accent_color)
       VALUES (?,?,?,?,?,?,?,?,?, 'pending','#1e3a8a','#059669')`,
      [extra.institution_name || (name + "'s Institution"), extra.institution_type || 'corporate', extra.industry || '', email, phone, '', r.insertId, name, email]
    );
    await pool.query(`UPDATE users SET institution_id=?, institution_role='operations_manager' WHERE id=?`, [inst.insertId, r.insertId]);
  }

  const [admins] = await pool.query("SELECT id FROM users WHERE role='admin'");
  for (const a of admins) {
    await notify(a.id, 'New registration', `${name} (${safeRole}) registered.`, 'info', safeRole === 'institution' ? '/admin/institutions' : '/admin/users');
  }
  res.status(201).json({
    id: r.insertId, status,
    message: status === 'active' ? 'Account created. You can log in now.'
      : safeRole === 'institution' ? 'Institution registered. Awaiting admin verification.'
      : 'Registration successful. Awaiting admin approval.',
  });
}));

app.post('/api/auth/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], validate, requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { email, password } = req.body;
  const [[u]] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  if (!u) return res.status(401).json({ error: 'Invalid email or password' });
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
  if (u.status === 'pending') return res.status(403).json({ error: 'Account pending admin approval' });
  if (u.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
  if (u.status === 'rejected') return res.status(403).json({ error: 'Account rejected' });

  const token = jwt.sign({ id: u.id, role: u.role, email: u.email, institution_id: u.institution_id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refresh = jwt.sign({ id: u.id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  await pool.query('INSERT INTO refresh_tokens (user_id,token,expires_at) VALUES (?,?,?)', [u.id, refresh, new Date(Date.now() + 30 * 24 * 3600 * 1000)]);
  await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=?', [u.id]);
  delete u.password_hash;
  res.json({ token, refresh, user: u });
}));

app.post('/api/auth/refresh', requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error: 'Refresh token required' });
  let payload;
  try { payload = jwt.verify(refresh, config.jwt.refreshSecret); } catch { return res.status(401).json({ error: 'Invalid refresh token' }); }
  const [[row]] = await pool.query('SELECT * FROM refresh_tokens WHERE token=? AND revoked=0 AND expires_at > NOW()', [refresh]);
  if (!row) return res.status(401).json({ error: 'Refresh token revoked or expired' });
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [payload.id]);
  if (!u || u.status !== 'active') return res.status(403).json({ error: 'Account not active' });
  const token = jwt.sign({ id: u.id, role: u.role, email: u.email, institution_id: u.institution_id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  res.json({ token });
}));

app.post('/api/auth/logout', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  if (req.body?.refresh) await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE token=?', [req.body.refresh]);
  res.json({ ok: true });
}));

app.get('/api/auth/me', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  if (!u) return res.status(404).json({ error: 'Not found' });
  delete u.password_hash;
  res.json({ user: u });
}));

app.post('/api/auth/forgot', [body('email').isEmail()], validate, requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT id FROM users WHERE email=?', [req.body.email]);
  if (!u) return res.json({ ok: true, message: 'If the email exists, a reset link was sent.' });
  const token = nanoid(40);
  await pool.query('INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,?)', [u.id, token, new Date(Date.now() + 3600 * 1000)]);
  console.log(`[PASSWORD RESET] ${req.body.email} → /#/reset?token=${token}`);
  res.json({ ok: true, message: 'If the email exists, a reset link was sent.' });
}));

app.post('/api/auth/reset', [body('token').notEmpty(), body('password').isLength({ min: 8 })], validate, requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { token, password } = req.body;
  const [[row]] = await pool.query('SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > NOW()', [token]);
  if (!row) return res.status(400).json({ error: 'Invalid or expired token' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, row.user_id]);
  await pool.query('UPDATE password_resets SET used=1 WHERE id=?', [row.id]);
  await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', [row.user_id]);
  res.json({ ok: true });
}));

app.put('/api/auth/password', auth(), requireDB, [
  body('old_password').notEmpty(),
  body('new_password').isLength({ min: 8 }),
], validate, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
  const ok = await bcrypt.compare(req.body.old_password, u.password_hash);
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
  const hash = await bcrypt.hash(req.body.new_password, 10);
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
  await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', [req.user.id]);
  res.json({ ok: true });
}));

/* -------------------- COMMON -------------------- */
app.get('/api/common/notifications', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const limit = Math.min(Number(req.query.limit || 30), 100);
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE user_id IS NULL OR user_id=? ORDER BY created_at DESC LIMIT ?`,
    [req.user.id, limit]
  );
  const [[{ unread }]] = await pool.query(
    `SELECT COUNT(*) unread FROM notifications WHERE (user_id IS NULL OR user_id=?) AND is_read=0`,
    [req.user.id]
  );
  res.json({ notifications: rows, unread });
}));

app.put('/api/common/notifications/:id/read', auth(), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE notifications SET is_read=1 WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

app.put('/api/common/notifications/read-all', auth(), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
  res.json({ ok: true });
}));

app.get('/api/common/events', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT e.*, u.name expert_name,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id=e.id AND er.status='registered') registered_count
       FROM events e LEFT JOIN users u ON u.id=e.expert_id
      WHERE e.status='published' ORDER BY e.date`
  );
  res.json({ events: rows });
}));

app.post('/api/common/events/:id/register', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[ev]] = await pool.query('SELECT * FROM events WHERE id=?', [req.params.id]);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  const [[existing]] = await pool.query('SELECT id FROM event_registrations WHERE event_id=? AND user_id=?', [req.params.id, req.user.id]);
  if (existing) await pool.query("UPDATE event_registrations SET status='registered' WHERE id=?", [existing.id]);
  else await pool.query(`INSERT INTO event_registrations (event_id,user_id,status) VALUES (?,?,'registered')`, [req.params.id, req.user.id]);
  await notify(req.user.id, 'Event registered', `You are registered for "${ev.title}".`);
  res.json({ ok: true });
}));

/* -------------------- ESCHOOL -------------------- */
app.get('/api/eschool/courses', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { type, q, page = 1, per = 20 } = req.query;
  const limit = Math.min(Number(per), 100);
  const offset = (Math.max(Number(page), 1) - 1) * limit;
  const conds = ["c.status='published'"];
  const params = [];
  if (type) { conds.push('c.course_type=?'); params.push(type); }
  if (q) { conds.push('(c.title LIKE ? OR c.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const where = `WHERE ${conds.join(' AND ')}`;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM courses c ${where}`, params);
  const [rows] = await pool.query(
    `SELECT c.*, u.name expert_name FROM courses c LEFT JOIN users u ON u.id=c.expert_id ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ courses: rows, total, page: Number(page), pages: Math.max(1, Math.ceil(total / limit)) });
}));

app.get('/api/eschool/courses/:id', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[course]] = await pool.query(`SELECT c.*, u.name expert_name FROM courses c LEFT JOIN users u ON u.id=c.expert_id WHERE c.id=?`, [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const [lessons] = await pool.query('SELECT * FROM lessons WHERE course_id=? ORDER BY position', [req.params.id]);
  res.json({ course, lessons });
}));

app.post('/api/eschool/enroll', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { course_id, coupon_code } = req.body;
  const [[c]] = await pool.query('SELECT * FROM courses WHERE id=?', [course_id]);
  if (!c) return res.status(404).json({ error: 'Course not found' });

  let price = Number(c.price), discount = 0, cp = null;
  if (coupon_code) {
    const [[row]] = await pool.query('SELECT * FROM coupons WHERE code=? AND active=1', [coupon_code]);
    cp = row;
    if (!cp) return res.status(400).json({ error: 'Invalid coupon' });
    if (cp.max_uses && cp.used_count >= cp.max_uses) return res.status(400).json({ error: 'Coupon usage limit reached' });
    if (Number(cp.min_spend) > price) return res.status(400).json({ error: 'Minimum spend not met' });
    discount = cp.discount_type === 'percent' ? price * (cp.discount_value / 100) : Number(cp.discount_value);
    discount = Math.min(discount, price);
  }
  const finalPrice = price - discount;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (finalPrice > 0) {
      const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id=? FOR UPDATE', [req.user.id]);
      if (Number(u.wallet_balance) < finalPrice) throw new Error('Insufficient balance');
      await conn.query('UPDATE users SET wallet_balance=wallet_balance-? WHERE id=?', [finalPrice, req.user.id]);
      await conn.query('INSERT INTO wallet_ledger (user_id,amount,balance_after,reason) VALUES (?,?,?,?)', [req.user.id, -finalPrice, Number(u.wallet_balance) - finalPrice, `Enrollment: ${c.title}`]);
      await conn.query(`INSERT INTO transactions (user_id,reference,description,amount,provider,status,direction) VALUES (?,?,?,?, 'wallet','succeeded','out')`, [req.user.id, genRef('ENR'), c.title, finalPrice]);
      if (c.expert_id) {
        const cut = finalPrice * ((100 - config.platform.commission) / 100);
        await conn.query('UPDATE users SET wallet_balance=wallet_balance+?, total_earnings=total_earnings+? WHERE id=?', [cut, cut, c.expert_id]);
        await conn.query('INSERT INTO wallet_ledger (user_id,amount,balance_after,reason) VALUES (?,?,?,?)', [c.expert_id, cut, 0, `Course sale: ${c.title}`]);
      }
    }
    const [r] = await conn.query(
      `INSERT INTO enrollments (user_id, course_id, enrollment_type, reference_id, progress, status) VALUES (?,?,?,?, 0, 'active')`,
      [req.user.id, course_id, c.course_type, c.id]
    );
    if (cp) await conn.query('UPDATE coupons SET used_count=used_count+1 WHERE id=?', [cp.id]);
    await conn.commit();
    res.status(201).json({ id: r.insertId, paid: finalPrice, discount });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.get('/api/user/enrollments', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT e.*, c.title, c.thumbnail, c.total_lessons, c.course_type enrollment_type FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=? ORDER BY e.created_at DESC`,
    [req.user.id]
  );
  res.json({ enrollments: rows });
}));

app.put('/api/user/enrollments/:id/progress', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { progress } = req.body;
  const [[enr]] = await pool.query('SELECT * FROM enrollments WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!enr) return res.status(404).json({ error: 'Enrollment not found' });
  await pool.query('UPDATE enrollments SET progress=? WHERE id=?', [progress, req.params.id]);
  if (progress >= 100) {
    const [[c]] = await pool.query('SELECT title FROM courses WHERE id=?', [enr.course_id]);
    const serial = `EH-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;
    const hash = Buffer.from(`${req.user.id}:${serial}`).toString('base64');
    const [r] = await pool.query(`INSERT INTO certificates (user_id, course_title, serial, verification_hash) VALUES (?,?,?,?)`, [req.user.id, c.title, serial, hash]);
    await pool.query('UPDATE enrollments SET status="completed", certificate_id=? WHERE id=?', [r.insertId, req.params.id]);
  }
  res.json({ ok: true });
}));

app.get('/api/user/certificates', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM certificates WHERE user_id=? ORDER BY issued_at DESC', [req.user.id]);
  res.json({ certificates: rows });
}));

/* -------------------- USER: wallet, wishlist, prefs -------------------- */
app.get('/api/user/wallet', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT wallet_balance FROM users WHERE id=?', [req.user.id]);
  const [ledger] = await pool.query('SELECT * FROM wallet_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
  res.json({ balance: Number(u?.wallet_balance || 0), ledger });
}));

app.post('/api/user/wallet/topup', auth(), requireDB, asyncH(async (req, res) => {
  const { amount, provider } = req.body;
  const ref = genRef('TOP');
  await creditWallet(req.user.id, amount, 'Wallet top-up', ref);
  const pool = poolOrThrow();
  await pool.query(`INSERT INTO transactions (user_id,reference,description,amount,provider,status,direction) VALUES (?,?, 'Wallet top-up', ?, ?, 'succeeded', 'in')`, [req.user.id, ref, amount, provider]);
  const [[u]] = await pool.query('SELECT wallet_balance FROM users WHERE id=?', [req.user.id]);
  res.json({ ok: true, balance: u.wallet_balance, reference: ref });
}));

app.get('/api/user/transactions', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ transactions: rows });
}));

app.get('/api/user/wishlist', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM user_wishlist WHERE user_id=?', [req.user.id]);
  res.json({ items: rows });
}));

app.post('/api/user/wishlist/toggle', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const cid = Number(req.body?.course_id);
  const [[existing]] = await pool.query('SELECT id FROM user_wishlist WHERE user_id=? AND course_id=?', [req.user.id, cid]);
  if (existing) await pool.query('DELETE FROM user_wishlist WHERE id=?', [existing.id]);
  else await pool.query('INSERT INTO user_wishlist (user_id, course_id) VALUES (?,?)', [req.user.id, cid]);
  res.json({ ok: true });
}));

app.get('/api/user/preferences', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT intent FROM users WHERE id=?', [req.user.id]);
  res.json({ intent: u?.intent || 'both' });
}));

app.put('/api/user/preferences', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { intent } = req.body || {};
  if (!['learn', 'consult', 'both'].includes(intent)) return res.status(400).json({ error: 'Invalid intent' });
  await pool.query('UPDATE users SET intent=? WHERE id=?', [intent, req.user.id]);
  res.json({ ok: true, intent });
}));

app.put('/api/user/profile', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { name, phone, timezone, theme, language, intent } = req.body || {};
  const sets = []; const vals = [];
  if (name !== undefined) { sets.push('name=?'); vals.push(name); }
  if (phone !== undefined) { sets.push('phone=?'); vals.push(phone); }
  if (timezone !== undefined) { sets.push('timezone=?'); vals.push(timezone); }
  if (theme !== undefined) { sets.push('theme=?'); vals.push(theme); }
  if (language !== undefined) { sets.push('language=?'); vals.push(language); }
  if (intent !== undefined && ['learn', 'consult', 'both'].includes(intent)) { sets.push('intent=?'); vals.push(intent); }
  if (sets.length) {
    vals.push(req.user.id);
    await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, vals);
  }
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  delete u.password_hash;
  res.json({ ok: true, user: u });
}));

app.post('/api/user/claims', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO claims (user_id,consultation_id,claim_title,claim_description,claim_amount,status) VALUES (?,?,?,?,?, 'open')`,
    [req.user.id, b.consultation_id || null, b.claim_title, b.claim_description, b.claim_amount || null]
  );
  res.status(201).json({ id: r.insertId });
}));

app.get('/api/user/claims', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM claims WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ claims: rows });
}));

app.post('/api/user/tickets', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { subject, description, priority = 'normal', category = 'general' } = req.body;
  const ref = `TKT-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}`;
  const [r] = await pool.query(
    `INSERT INTO tickets (user_id,reference,subject,description,priority,category,status) VALUES (?,?,?,?,?,?, 'open')`,
    [req.user.id, ref, subject, description, priority, category]
  );
  res.status(201).json({ id: r.insertId, reference: ref });
}));

app.get('/api/user/tickets', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM tickets WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ tickets: rows });
}));

app.post('/api/user/tickets/:id/replies', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [r] = await pool.query('INSERT INTO ticket_replies (ticket_id,user_id,message) VALUES (?,?,?)', [req.params.id, req.user.id, req.body.message]);
  res.status(201).json({ id: r.insertId });
}));

app.post('/api/user/reviews', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { expert_id, consultation_id = null, rating, comment = '' } = req.body;
  const [r] = await pool.query(
    `INSERT INTO reviews (expert_id,author_id,consultation_id,rating,comment,status) VALUES (?,?,?,?,?, 'published')`,
    [expert_id, req.user.id, consultation_id, rating, comment]
  );
  const [[stats]] = await pool.query(`SELECT AVG(rating) avg_rating FROM reviews WHERE expert_id=? AND status='published'`, [expert_id]);
  await pool.query('UPDATE users SET average_rating=? WHERE id=?', [stats.avg_rating, expert_id]);
  res.status(201).json({ id: r.insertId });
}));

/* -------------------- EXPERTS -------------------- */
app.get('/api/user/experts', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(`SELECT id, name, email, avatar, bio, specialization, hourly_rate, average_rating FROM users WHERE role='expert' AND status='active'`);
  res.json({ experts: rows, total: rows.length, page: 1, pages: 1 });
}));

app.get('/api/user/experts/:id', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[expert]] = await pool.query(`SELECT id, name, email, avatar, bio, specialization, hourly_rate, average_rating FROM users WHERE id=? AND role='expert'`, [req.params.id]);
  if (!expert) return res.status(404).json({ error: 'Expert not found' });
  const [reviews] = await pool.query(`SELECT r.*, u.name author_name FROM reviews r LEFT JOIN users u ON u.id=r.author_id WHERE r.expert_id=? AND r.status='published'`, [req.params.id]);
  const [availability] = await pool.query('SELECT * FROM availability WHERE expert_id=?', [req.params.id]);
  res.json({ expert, reviews, availability });
}));

/* -------------------- EXPERT PANEL -------------------- */
app.get('/api/expert/earnings', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT total_earnings, wallet_balance FROM users WHERE id=?', [req.user.id]);
  const [[paidOut]] = await pool.query("SELECT COALESCE(SUM(amount),0) paid FROM payouts WHERE expert_id=? AND status='paid'", [req.user.id]);
  const [ledger] = await pool.query('SELECT * FROM wallet_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
  res.json({
    summary: { total_earned: Number(u.total_earnings) || 0, available_balance: Number(u.wallet_balance) || 0, total_paid_out: Number(paidOut.paid) || 0, pending_balance: 0 },
    ledger,
  });
}));

app.get('/api/expert/dashboard-stats', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[s]] = await pool.query(
    `SELECT
        (SELECT COUNT(*) FROM consultations WHERE expert_id=?) total_consultations,
        (SELECT COUNT(*) FROM consultations WHERE expert_id=? AND status IN ('assigned','in_progress')) active_consultations,
        (SELECT COUNT(*) FROM courses WHERE expert_id=?) total_courses`,
    [req.user.id, req.user.id, req.user.id]
  );
  res.json({ stats: s });
}));

app.get('/api/expert/portfolio', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM expert_portfolio WHERE expert_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ items: rows });
}));

app.post('/api/expert/portfolio', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { title, category, description, link } = req.body;
  const [r] = await pool.query(
    'INSERT INTO expert_portfolio (expert_id, title, category, description, link) VALUES (?,?,?,?,?)',
    [req.user.id, title, category || 'Case Study', description || null, link || null]
  );
  res.status(201).json({ id: r.insertId });
}));

app.delete('/api/expert/portfolio/:id', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM expert_portfolio WHERE id=? AND expert_id=?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.get('/api/expert/reviews', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(`SELECT r.*, u.name author_name FROM reviews r LEFT JOIN users u ON u.id=r.author_id WHERE r.expert_id=? ORDER BY r.created_at DESC`, [req.user.id]);
  res.json({ reviews: rows });
}));

app.post('/api/expert/reviews/:id/reply', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('UPDATE reviews SET reply=?, replied_at=NOW() WHERE id=? AND expert_id=?', [req.body.reply, req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.get('/api/expert/availability', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM availability WHERE expert_id=?', [req.user.id]);
  res.json({ availability: rows });
}));

app.put('/api/expert/availability', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM availability WHERE expert_id=?', [req.user.id]);
  for (const s of (req.body.schedule || [])) {
    await pool.query('INSERT INTO availability (expert_id,day_of_week,start_time,end_time) VALUES (?,?,?,?)', [req.user.id, s.day, s.start, s.end]);
  }
  res.json({ ok: true });
}));

app.get('/api/expert/withdrawals', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM payouts WHERE expert_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ payouts: rows });
}));

app.post('/api/expert/withdrawals', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const { amount, method, account_details = {} } = req.body;
  if (Number(amount) < config.platform.minPayout) return res.status(400).json({ error: `Minimum withdrawal ${config.platform.minPayout}` });
  await debitWallet(req.user.id, amount, 'Withdrawal request');
  const pool = poolOrThrow();
  const [r] = await pool.query(`INSERT INTO payouts (expert_id,amount,method,account_details,status) VALUES (?,?,?,?, 'pending')`, [req.user.id, amount, method, JSON.stringify(account_details)]);
  res.status(201).json({ id: r.insertId });
}));

app.get('/api/expert/time-off', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM time_off WHERE expert_id=?', [req.user.id]);
  res.json({ timeOff: rows });
}));

app.post('/api/expert/time-off', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { start_date, end_date, reason = '' } = req.body;
  const [r] = await pool.query('INSERT INTO time_off (expert_id,start_date,end_date,reason) VALUES (?,?,?,?)', [req.user.id, start_date, end_date, reason]);
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/expert/profile', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { specialization, hourly_rate, bio } = req.body;
  const sets = []; const vals = [];
  if (specialization !== undefined) { sets.push('specialization=?'); vals.push(specialization); }
  if (hourly_rate !== undefined) { sets.push('hourly_rate=?'); vals.push(hourly_rate); }
  if (bio !== undefined) { sets.push('bio=?'); vals.push(bio); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.user.id);
  await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
}));

app.post('/api/expert/courses', auth(['expert']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO courses (title,description,category,course_type,level,price,expert_id,status) VALUES (?,?,?,?,?,?,?, 'draft')`,
    [b.title, b.description || '', b.category || 'General', b.course_type || 'short_course', b.level || 'beginner', b.price || 0, req.user.id]
  );
  res.status(201).json({ id: r.insertId });
}));

/* -------------------- ADMIN -------------------- */
app.get('/api/admin/users', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT id,name,email,phone,role,status,avatar,created_at,last_login_at FROM users ORDER BY created_at DESC');
  res.json({ users: rows, total: rows.length, page: 1, pages: 1 });
}));

app.get('/api/admin/experts', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(`SELECT id,name,email,phone,avatar,specialization,hourly_rate,average_rating,total_earnings,status,created_at FROM users WHERE role='expert' ORDER BY created_at DESC`);
  res.json({ experts: rows, total: rows.length, page: 1, pages: 1 });
}));

app.get('/api/admin/analytics', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[totals]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users) total_users,
       (SELECT COUNT(*) FROM users WHERE role='expert' AND status='active') active_experts,
       (SELECT COUNT(*) FROM users WHERE status='pending') pending_users,
       (SELECT COUNT(*) FROM consultations WHERE status IN ('pending','assigned','in_progress')) active_consultations,
       (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE status='succeeded' AND direction='in') total_revenue,
       (SELECT COUNT(*) FROM courses WHERE status='published') published_courses,
       (SELECT COUNT(*) FROM events  WHERE status='published') published_events,
       (SELECT COUNT(*) FROM institutions) institutions,
       (SELECT COUNT(*) FROM programmes)   programmes,
       (SELECT COUNT(*) FROM trainees)     trainees`
  );
  const [roles] = await pool.query("SELECT role, COUNT(*) c FROM users GROUP BY role");
  const [top] = await pool.query(`SELECT id,name,average_rating,total_earnings FROM users WHERE role='expert' ORDER BY total_earnings DESC LIMIT 10`);
  const [usersByMonth] = await pool.query(`SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COUNT(*) c FROM users GROUP BY ym ORDER BY ym DESC LIMIT 12`);
  const [revenueByMonth] = await pool.query(`SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COALESCE(SUM(amount),0) total FROM transactions WHERE status='succeeded' AND direction='in' GROUP BY ym ORDER BY ym DESC LIMIT 12`);
  res.json({ totals, usersByRole: roles, topExperts: top, usersByMonth, revenueByMonth });
}));

app.get('/api/admin/transactions', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(`SELECT t.*, u.name user_name FROM transactions t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 500`);
  res.json({ transactions: rows, total: rows.length, page: 1, pages: 1 });
}));

app.get('/api/admin/payouts', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(`SELECT p.*, u.name expert_name, u.email expert_email FROM payouts p LEFT JOIN users u ON u.id=p.expert_id ORDER BY p.created_at DESC`);
  res.json({ payouts: rows });
}));

app.put('/api/admin/payouts/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { status, reason } = req.body;
  await pool.query(`UPDATE payouts SET status=?, rejection_reason=?, processed_at=IF(?='paid', NOW(), processed_at) WHERE id=?`, [status, reason || null, status, req.params.id]);
  await logAudit(req.user.id, `payout.${status}`, 'payout', req.params.id, {}, req.ip);
  res.json({ ok: true });
}));

app.get('/api/admin/coupons', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ coupons: rows });
}));

app.post('/api/admin/coupons', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO coupons (code,discount_type,discount_value,max_uses,min_spend,applies_to,active,expires_at) VALUES (?,?,?,?,?,?, 1, ?)`,
    [b.code, b.discount_type, b.discount_value, b.max_uses || null, b.min_spend || 0, b.applies_to || 'all', b.expires_at || null]
  );
  await logAudit(req.user.id, 'coupon.create', 'coupon', r.insertId, { code: b.code }, req.ip);
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/admin/coupons/:id/toggle', auth(['admin']), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE coupons SET active = 1 - active WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

app.delete('/api/admin/coupons/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM coupons WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/claims', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM claims ORDER BY created_at DESC');
  res.json({ claims: rows });
}));

app.put('/api/admin/claims/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query(`UPDATE claims SET status=?, resolution=?, resolved_at=IF(? IN ('resolved','rejected'), NOW(), resolved_at) WHERE id=?`, [req.body.status, req.body.resolution || null, req.body.status, req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/tickets', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(`SELECT t.*, u.name user_name FROM tickets t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC`);
  res.json({ tickets: rows });
}));

app.put('/api/admin/tickets/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE tickets SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/reviews', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(`SELECT r.*, a.name author_name, e.name expert_name FROM reviews r LEFT JOIN users a ON a.id=r.author_id LEFT JOIN users e ON e.id=r.expert_id ORDER BY r.created_at DESC`);
  res.json({ reviews: rows });
}));

app.put('/api/admin/reviews/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE reviews SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/audit-logs', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(`SELECT l.*, u.name actor_name FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_id ORDER BY l.created_at DESC LIMIT 500`);
  res.json({ logs: rows });
}));

app.get('/api/admin/settings', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT key_name, value FROM settings');
  const settings = {};
  rows.forEach(r => { settings[r.key_name] = r.value; });
  res.json({ settings });
}));

app.put('/api/admin/settings', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  for (const [k, v] of Object.entries(req.body.settings || {})) {
    await pool.query(`INSERT INTO settings (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)`, [k, String(v)]);
  }
  res.json({ ok: true });
}));

app.post('/api/admin/events', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO events (title,description,category,expert_id,date,start_time,end_time,location,meeting_url,capacity,price,expert_payment,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'published')`,
    [b.title, b.description || '', b.category || 'General', b.expert_id || null, b.date || null, b.start_time || null, b.end_time || null, b.location || '', b.meeting_url || '', b.capacity || 100, b.price || 0, b.expert_payment || 0]
  );
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/admin/events/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['title', 'description', 'category', 'expert_id', 'date', 'start_time', 'end_time', 'location', 'meeting_url', 'capacity', 'price', 'expert_payment', 'status'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE events SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
}));

app.delete('/api/admin/events/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM events WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

app.put('/api/admin/users/:id/approve', auth(['admin']), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query("UPDATE users SET status='active' WHERE id=?", [req.params.id]);
  await notify(req.params.id, 'Account approved', 'Your account has been approved.');
  res.json({ ok: true });
}));

app.put('/api/admin/users/:id/suspend', auth(['admin']), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query("UPDATE users SET status='suspended' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
}));

app.put('/api/admin/users/:id/reject', auth(['admin']), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query("UPDATE users SET status='rejected' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
}));

app.put('/api/admin/users/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { name, role, status } = req.body;
  const sets = []; const vals = [];
  if (name) { sets.push('name=?'); vals.push(name); }
  if (role) { sets.push('role=?'); vals.push(role); }
  if (status) { sets.push('status=?'); vals.push(status); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
}));

app.delete('/api/admin/users/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM users WHERE id=?', [req.params.id]);
  await logAudit(req.user.id, 'user.delete', 'user', req.params.id, {}, req.ip);
  res.json({ ok: true });
}));

app.post('/api/admin/experts/create', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { name, email, specialization, hourly_rate, bio, phone } = req.body;
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const tempPwd = nanoid(10);
  const hash = await bcrypt.hash(tempPwd, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,phone,role,status,specialization,hourly_rate,bio,intent) VALUES (?,?,?,?, 'expert','active',?,?,?, 'both')`,
    [name, email, hash, phone || '', specialization || null, hourly_rate || 0, bio || null]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  res.status(201).json({ id: r.insertId, temp_password: tempPwd });
}));

app.post('/api/admin/notifications/broadcast', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { title, message, audience = 'all' } = req.body;
  let conds = [];
  if (audience === 'experts') conds.push("role='expert'");
  if (audience === 'learners') conds.push("role='learner'");
  if (audience === 'institutions') conds.push("role='institution'");
  if (audience === 'admins') conds.push("role='admin'");
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const [users] = await pool.query(`SELECT id FROM users ${where}`);
  for (const u of users) {
    await pool.query(`INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?, 'broadcast')`, [u.id, title, message]);
    if (io) io.to(`user_${u.id}`).emit('broadcast', { title, message });
  }
  res.json({ ok: true, sent: users.length });
}));

/* -------------------- ADMIN — INSTITUTIONS -------------------- */
app.get('/api/admin/institutions', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT i.*, (SELECT COUNT(*) FROM programmes p WHERE p.institution_id=i.id) programme_count FROM institutions i ORDER BY i.created_at DESC`
  );
  res.json({ institutions: rows });
}));

app.post('/api/admin/institutions', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: 'Name required' });
  const [r] = await pool.query(
    `INSERT INTO institutions (name,type,industry,contact_email,contact_phone,address,status) VALUES (?,?,?,?,?,?, 'pending')`,
    [b.name, b.type || 'corporate', b.industry || '', b.contact_email || '', b.contact_phone || '', b.address || '']
  );
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/admin/institutions/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['name', 'type', 'industry', 'contact_email', 'contact_phone', 'address', 'status'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
}));

['approve', 'reject', 'suspend'].forEach(action => {
  app.put(`/api/admin/institutions/:id/${action}`, auth(['admin']), requireDB, asyncH(async (req, res) => {
    const pool = poolOrThrow();
    const status = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'suspended';
    const [[inst]] = await pool.query('SELECT ops_manager_id FROM institutions WHERE id=?', [req.params.id]);
    if (!inst) return res.status(404).json({ error: 'Not found' });
    await pool.query('UPDATE institutions SET status=? WHERE id=?', [status, req.params.id]);
    if (inst.ops_manager_id) {
      await pool.query('UPDATE users SET status=? WHERE id=?', [status, inst.ops_manager_id]);
      if (io) io.to(`user_${inst.ops_manager_id}`).emit('notification', {
        title: action === 'approve' ? 'Institution verified' : `Institution ${status}`,
        message: `Your institution is now ${status}.`,
        type: action === 'approve' ? 'success' : 'warning',
        created_at: new Date(),
      });
    }
    await logAudit(req.user.id, `institution.${action}`, 'institution', req.params.id, {}, req.ip);
    res.json({ ok: true, status });
  }));
});

app.delete('/api/admin/institutions/:id', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM programmes WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM cohorts WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM assessments WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM projects WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM trainees WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM institutions WHERE id=?', [req.params.id]);
  await logAudit(req.user.id, 'institution.delete', 'institution', req.params.id, {}, req.ip);
  res.json({ ok: true });
}));

app.post('/api/admin/institutions/:id/ops-manager', auth(['admin']), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const tempPwd = nanoid(10);
  const hash = await bcrypt.hash(tempPwd, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,intent) VALUES (?,?,?, 'institution','active',?, 'operations_manager','both')`,
    [name, email, hash, req.params.id]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await pool.query('UPDATE institutions SET ops_manager_id=?, ops_manager_name=?, ops_manager_email=? WHERE id=?', [r.insertId, name, email, req.params.id]);
  res.status(201).json({ id: r.insertId, temp_password: tempPwd });
}));

/* ============================================================
   INSTITUTION — REAL DB ROUTES
   ============================================================ */
app.get('/api/institution/me', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  res.json({ institution: req.institution });
}));

app.put('/api/institution/profile', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['name', 'type', 'industry', 'contact_phone', 'address'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (sets.length) {
    vals.push(req.institution.id);
    await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  }
  res.json({ ok: true });
}));

app.put('/api/institution/settings', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  if (req.institutionRole !== 'operations_manager') return res.status(403).json({ error: 'Only Operations Manager' });
  const pool = poolOrThrow();
  const b = req.body;
  const sets = []; const vals = [];
  for (const k of ['name', 'contact_email', 'default_capacity', 'pass_mark', 'seat_allocation', 'billing_cycle', 'contract_start', 'contract_end']) {
    if (b[k] !== undefined) { sets.push(`${k}=?`); vals.push(b[k]); }
  }
  if (sets.length) {
    vals.push(req.institution.id);
    await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  }
  res.json({ ok: true });
}));

/* Branding */
app.get('/api/institution/branding', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const i = req.institution;
  res.json({ branding: {
    id: i.id, name: i.name,
    logo_url: i.logo_url || null,
    primary_color: i.primary_color || '#1e3a8a',
    accent_color: i.accent_color || '#059669',
    subdomain: i.subdomain || null,
    custom_domain: i.custom_domain || null,
    email_sender_name: i.email_sender_name || null,
    email_sender_address: i.email_sender_address || null,
    welcome_message: i.welcome_message || null,
  }});
}));

app.put('/api/institution/branding',
  auth(), requireDB, requireInstitution,
  upload.fields([{ name: 'logo', maxCount: 1 }]),
  asyncH(async (req, res) => {
    const pool = poolOrThrow();
    const allowed = ['primary_color', 'accent_color', 'subdomain', 'email_sender_name', 'email_sender_address', 'welcome_message'];
    const sets = []; const vals = [];
    for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
    if (req.files && req.files.logo && req.files.logo[0]) {
      sets.push('logo_url=?');
      vals.push('/uploads/' + req.files.logo[0].filename);
    }
    if (!sets.length) return res.json({ ok: true });
    vals.push(req.institution.id);
    await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
    await institutionAudit(req.institution.id, req.user.id, req.user.email, 'institution.branding.update', null, req.ip);
    res.json({ ok: true });
  })
);

/* Webhook */
app.put('/api/institution/webhook', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('UPDATE institutions SET webhook_url=?, webhook_secret=? WHERE id=?',
    [req.body.webhook_url || null, req.body.webhook_secret || null, req.institution.id]);
  res.json({ ok: true });
}));

app.post('/api/institution/webhook/test', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[inst]] = await pool.query('SELECT webhook_url, webhook_secret FROM institutions WHERE id=?', [req.institution.id]);
  if (!inst || !inst.webhook_url) return res.status(400).json({ error: 'No webhook configured' });
  const payload = JSON.stringify({ event: 'test', timestamp: new Date().toISOString(), institution_id: req.institution.id });
  const sig = crypto.createHmac('sha256', inst.webhook_secret || '').update(payload).digest('hex');
  try {
    const fetch = global.fetch || require('node-fetch');
    const r = await fetch(inst.webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-ExpertHub-Signature': sig }, body: payload });
    res.json({ ok: true, status: r.status });
  } catch (e) {
    res.status(502).json({ error: 'Webhook delivery failed: ' + e.message });
  }
}));

/* Programmes */
app.get('/api/institution/programmes', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM trainee_enrollments te WHERE te.programme_id=p.id) AS enrolled_count,
            (SELECT title FROM programmes pp WHERE pp.id=p.prerequisite_programme_id) AS prerequisite_title
       FROM programmes p WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]
  );
  res.json({ programmes: rows });
}));

app.post('/api/institution/programmes', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.title) return res.status(400).json({ error: 'Title required' });
  const [r] = await pool.query(
    `INSERT INTO programmes (institution_id, title, description, category, delivery_mode, level, status, start_date, end_date, capacity, duration_hours, cost_per_seat, trainer_cost, materials_cost, prerequisite_programme_id, accreditation_body, cpd_points)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, b.title, b.description || null, b.category || null, b.delivery_mode || 'hybrid', b.level || 'intermediate', b.status || 'draft',
     b.start_date || null, b.end_date || null, b.capacity || 30, b.duration_hours || 0,
     b.cost_per_seat || 0, b.trainer_cost || 0, b.materials_cost || 0,
     b.prerequisite_programme_id || null, b.accreditation_body || null, b.cpd_points || 0]
  );
  await institutionAudit(req.institution.id, req.user.id, req.user.email, `Created programme "${b.title}"`, null, req.ip);
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/institution/programmes/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['title', 'description', 'category', 'delivery_mode', 'level', 'status', 'start_date', 'end_date', 'capacity', 'duration_hours', 'cost_per_seat', 'trainer_cost', 'materials_cost', 'prerequisite_programme_id', 'accreditation_body', 'cpd_points'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.institution.id);
  await pool.query(`UPDATE programmes SET ${sets.join(',')} WHERE id=? AND institution_id=?`, vals);
  res.json({ ok: true });
}));

app.delete('/api/institution/programmes/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM trainee_enrollments WHERE programme_id=?', [req.params.id]);
    await conn.query('DELETE FROM programme_skills WHERE programme_id=?', [req.params.id]);
    await conn.query('DELETE FROM programme_modules WHERE programme_id=?', [req.params.id]);
    await conn.query('DELETE FROM programmes WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  await institutionAudit(req.institution.id, req.user.id, req.user.email, `Deleted programme #${req.params.id}`, null, req.ip);
  res.json({ ok: true });
}));

/* Programme modules */
app.get('/api/institution/programmes/:id/modules', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM programme_modules WHERE programme_id=? ORDER BY position', [req.params.id]);
  res.json({ modules: rows });
}));

app.post('/api/institution/programmes/:id/modules', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[{ nextPos }]] = await pool.query('SELECT COALESCE(MAX(position),0)+1 nextPos FROM programme_modules WHERE programme_id=?', [req.params.id]);
  const [r] = await pool.query(
    `INSERT INTO programme_modules (programme_id, title, description, position, duration_hours, delivery_mode) VALUES (?,?,?,?,?,?)`,
    [req.params.id, req.body.title, req.body.description || null, nextPos, req.body.duration_hours || 0, req.body.delivery_mode || null]
  );
  res.status(201).json({ id: r.insertId, position: nextPos });
}));

app.delete('/api/institution/programmes/:id/modules/:moduleId', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM programme_modules WHERE id=? AND programme_id=?', [req.params.moduleId, req.params.id]);
  res.json({ ok: true });
}));

/* Cohorts */
app.get('/api/institution/cohorts', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT c.*, p.title programme_title, u.name instructor_name,
            (SELECT COUNT(*) FROM trainee_enrollments te WHERE te.cohort_id=c.id) trainee_count
       FROM cohorts c LEFT JOIN programmes p ON p.id=c.programme_id LEFT JOIN users u ON u.id=c.instructor_id
      WHERE c.institution_id=? ORDER BY c.created_at DESC`,
    [req.institution.id]
  );
  res.json({ cohorts: rows });
}));

app.post('/api/institution/cohorts', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.name || !b.programme_id) return res.status(400).json({ error: 'name and programme_id required' });
  const [r] = await pool.query(
    `INSERT INTO cohorts (institution_id, programme_id, name, instructor_id, substitute_instructor_id, start_date, end_date, capacity, location, status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, Number(b.programme_id), b.name, b.instructor_id || null, b.substitute_instructor_id || null,
     b.start_date || null, b.end_date || null, b.capacity || 30, b.location || null, b.status || 'scheduled']
  );
  await institutionAudit(req.institution.id, req.user.id, req.user.email, `Created cohort "${b.name}"`, null, req.ip);
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/institution/cohorts/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['name', 'programme_id', 'instructor_id', 'substitute_instructor_id', 'start_date', 'end_date', 'capacity', 'location', 'status'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.institution.id);
  await pool.query(`UPDATE cohorts SET ${sets.join(',')} WHERE id=? AND institution_id=?`, vals);
  res.json({ ok: true });
}));

app.delete('/api/institution/cohorts/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE trainee_enrollments SET cohort_id=NULL WHERE cohort_id=?', [req.params.id]);
    await conn.query('DELETE FROM cohort_sessions WHERE cohort_id=?', [req.params.id]);
    await conn.query('DELETE FROM cohort_waitlist WHERE cohort_id=?', [req.params.id]);
    await conn.query('DELETE FROM cohorts WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  res.json({ ok: true });
}));

/* Waitlist */
app.get('/api/institution/cohorts/:id/waitlist', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT w.*, u.name, u.email FROM cohort_waitlist w JOIN users u ON u.id=w.user_id WHERE w.cohort_id=? ORDER BY w.position`,
    [req.params.id]
  );
  res.json({ waitlist: rows });
}));

/* Enrollments */
app.get('/api/institution/enrollments', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const clauses = ['e.institution_id=?']; const params = [req.institution.id];
  if (req.query.status) { clauses.push('e.status=?'); params.push(req.query.status); }
  if (req.query.cohort_id) { clauses.push('e.cohort_id=?'); params.push(req.query.cohort_id); }
  if (req.query.programme_id) { clauses.push('e.programme_id=?'); params.push(req.query.programme_id); }
  const [rows] = await pool.query(
    `SELECT e.*, u.name trainee_name, u.email, u.avatar, u.department,
            p.title programme_title, c.name cohort_name
       FROM trainee_enrollments e
       JOIN users u ON u.id=e.user_id
       LEFT JOIN programmes p ON p.id=e.programme_id
       LEFT JOIN cohorts c ON c.id=e.cohort_id
      WHERE ${clauses.join(' AND ')} ORDER BY e.enrolled_at DESC LIMIT 200`,
    params
  );
  res.json({ enrollments: rows, total: rows.length, page: 1, per: 50 });
}));

app.post('/api/institution/enrollments', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { user_id, programme_id, cohort_id, notes } = req.body;
  const [r] = await pool.query(
    `INSERT INTO trainee_enrollments (user_id, programme_id, cohort_id, institution_id, status, notes) VALUES (?,?,?,?, 'pending_approval', ?)`,
    [user_id, programme_id, cohort_id || null, req.institution.id, notes || null]
  );
  const [approval] = await pool.query(
    `INSERT INTO approval_requests (institution_id, request_type, requested_by, payload) VALUES (?, 'enrolment', ?, ?)`,
    [req.institution.id, req.user.id, JSON.stringify({ enrolment_id: r.insertId })]
  );
  const [managers] = await pool.query(`SELECT id FROM users WHERE institution_id=? AND institution_role='operations_manager' AND status='active'`, [req.institution.id]);
  for (const mgr of managers) {
    await notify(mgr.id, 'Enrolment approval required', 'A trainee requested enrolment.', 'warning', '/institution/operations');
  }
  res.status(201).json({ id: r.insertId, request_id: approval.insertId });
}));

app.put('/api/institution/enrollments/:id/approve', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [r] = await pool.query(
    `UPDATE trainee_enrollments SET status='active', manager_approved_by=?, manager_approved_at=NOW() WHERE id=? AND institution_id=?`,
    [req.user.id, req.params.id, req.institution.id]
  );
  if (!r.affectedRows) return res.status(404).json({ error: 'Not found' });
  await institutionAudit(req.institution.id, req.user.id, req.user.email, `Approved enrolment #${req.params.id}`, null, req.ip);
  res.json({ ok: true });
}));

app.put('/api/institution/enrollments/:id/reject', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query(
    `UPDATE trainee_enrollments SET status='withdrawn', withdraw_reason=?, manager_approved_by=?, manager_approved_at=NOW(), withdrawn_at=NOW() WHERE id=? AND institution_id=?`,
    [req.body.reason || null, req.user.id, req.params.id, req.institution.id]
  );
  res.json({ ok: true });
}));

app.put('/api/institution/enrollments/:id/transfer', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query(`UPDATE trainee_enrollments SET cohort_id=? WHERE id=? AND institution_id=?`, [req.body.cohort_id, req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

app.put('/api/institution/enrollments/:id/notes', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query(`UPDATE trainee_enrollments SET internal_notes=? WHERE id=? AND institution_id=?`, [req.body.internal_notes || null, req.params.id, req.institution.id]);
  if (req.body.at_risk !== undefined) {
    await pool.query(
      `UPDATE users SET at_risk=?, accessibility_notes=COALESCE(?, accessibility_notes) WHERE id=(SELECT user_id FROM trainee_enrollments WHERE id=?)`,
      [req.body.at_risk ? 1 : 0, req.body.accessibility_notes || null, req.params.id]
    );
  }
  res.json({ ok: true });
}));

/* Trainees */
app.get('/api/institution/trainees', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { search, status } = req.query;
  const clauses = ['u.institution_id=?', "u.role IN ('learner','institution')"];
  const params = [req.institution.id];
  if (search) { clauses.push('(u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { clauses.push('u.lifecycle_status=?'); params.push(status); }
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar, u.department, u.job_title, u.employee_id, u.cost_centre, u.lifecycle_status, u.created_at, u.status, u.at_risk,
        (SELECT e.id FROM trainee_enrollments e WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) latest_enrollment_id,
        (SELECT e.status FROM trainee_enrollments e WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) enrollment_status,
        (SELECT e.progress FROM trainee_enrollments e WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) progress,
        (SELECT p.title FROM trainee_enrollments e JOIN programmes p ON p.id=e.programme_id WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) programme_title,
        (SELECT c.name FROM trainee_enrollments e JOIN cohorts c ON c.id=e.cohort_id WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) cohort_name
       FROM users u WHERE ${clauses.join(' AND ')} ORDER BY u.created_at DESC LIMIT 200`,
    params
  );
  res.json({ trainees: rows, total: rows.length, page: 1, per: 50 });
}));

app.get('/api/institution/trainees/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[user]] = await pool.query('SELECT * FROM users WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  if (!user) return res.status(404).json({ error: 'Not found' });
  delete user.password_hash;
  const [enrollments] = await pool.query(
    `SELECT e.*, p.title programme_title, c.name cohort_name FROM trainee_enrollments e LEFT JOIN programmes p ON p.id=e.programme_id LEFT JOIN cohorts c ON c.id=e.cohort_id WHERE e.user_id=? ORDER BY e.enrolled_at DESC`,
    [req.params.id]
  );
  const [certificates] = await pool.query('SELECT * FROM institution_certificates WHERE trainee_id=?', [req.params.id]);
  const [skills] = await pool.query(
    `SELECT ts.*, s.name skill_name, s.category FROM trainee_skills ts JOIN skills s ON s.id=ts.skill_id WHERE ts.trainee_id=?`,
    [req.params.id]
  );
  res.json({ trainee: user, enrollments, certificates, skills });
}));

app.post('/api/institution/trainees/invite', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { emails = [], programme_id, cohort_id } = req.body;
  if (!Array.isArray(emails) || !emails.length) return res.status(400).json({ error: 'emails required' });
  const results = [];
  for (const email of emails) {
    try {
      const [[existing]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
      if (existing) { results.push({ email, status: 'exists' }); continue; }
      const tempPassword = nanoid(12);
      const hash = await bcrypt.hash(tempPassword, 10);
      const [r] = await pool.query(
        `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,lifecycle_status,invited_at)
         VALUES (?,?,?, 'learner','active',?, 'viewer','invited', NOW())`,
        [email.split('@')[0], email, hash, req.institution.id]
      );
      await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
      if (programme_id) {
        await pool.query(
          `INSERT INTO trainee_enrollments (user_id, programme_id, cohort_id, institution_id, status) VALUES (?,?,?,?, 'invited')`,
          [r.insertId, programme_id, cohort_id || null, req.institution.id]
        );
      }
      await notify(r.insertId, 'Welcome to your training portal', `Temporary password: ${tempPassword}`, 'info', '/login');
      if (sendEmail) {
        sendEmail({ to: email, subject: 'Your ExpertHub training account', body: `Sign in with password: ${tempPassword}` }).catch(() => {});
      }
      results.push({ email, status: 'invited', id: r.insertId });
    } catch (e) {
      results.push({ email, status: 'error', error: e.message });
    }
  }
  res.status(201).json({ results });
}));

app.post('/api/institution/trainees/import', auth(), requireDB, requireInstitution, upload.single('file'), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  const text = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return res.status(400).json({ error: 'CSV needs header and rows' });
  const headers = lines.shift().split(',').map(h => h.trim().toLowerCase());
  for (const rc of ['name', 'email']) {
    if (!headers.includes(rc)) return res.status(400).json({ error: `Missing column: ${rc}` });
  }
  const [imp] = await pool.query(
    `INSERT INTO trainee_imports (institution_id, imported_by, filename, total_rows, status) VALUES (?,?,?,?, 'processing')`,
    [req.institution.id, req.user.id, req.file.originalname, lines.length]
  );
  const errors = []; const invited = []; let success = 0;
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].split(',').map(v => v.trim());
    const rec = Object.fromEntries(headers.map((h, idx) => [h, row[idx] || '']));
    const lineNo = i + 2;
    if (!rec.name || !rec.email) { errors.push({ row: lineNo, error: 'Missing name or email' }); continue; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rec.email)) { errors.push({ row: lineNo, email: rec.email, error: 'Invalid email' }); continue; }
    try {
      const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [rec.email]);
      if (exists) { errors.push({ row: lineNo, email: rec.email, error: 'Email exists' }); continue; }
      const tempPassword = nanoid(12);
      const hash = await bcrypt.hash(tempPassword, 10);
      const [r] = await pool.query(
        `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,department,job_title,employee_id,cost_centre,lifecycle_status,invited_at)
         VALUES (?,?,?, 'learner','active',?, 'viewer',?,?,?,?, 'invited', NOW())`,
        [rec.name, rec.email, hash, req.institution.id, rec.department || null, rec.job_title || null, rec.employee_id || null, rec.cost_centre || null]
      );
      await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
      await notify(r.insertId, 'Welcome', `Temporary password: ${tempPassword}`, 'info', '/login');
      invited.push({ id: r.insertId, email: rec.email, name: rec.name });
      success++;
    } catch (e) {
      errors.push({ row: lineNo, email: rec.email, error: e.message });
    }
  }
  await pool.query(
    `UPDATE trainee_imports SET success_count=?, error_count=?, errors=?, status='completed', completed_at=NOW() WHERE id=?`,
    [success, errors.length, JSON.stringify(errors.slice(0, 200)), imp.insertId]
  );
  await institutionAudit(req.institution.id, req.user.id, req.user.email, `Imported ${success} trainees`, null, req.ip);
  res.json({ import_id: imp.insertId, total: lines.length, success, errors, invited });
}));

app.get('/api/institution/trainees/imports', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT i.*, u.name imported_by_name FROM trainee_imports i LEFT JOIN users u ON u.id=i.imported_by WHERE i.institution_id=? ORDER BY i.created_at DESC LIMIT 50`,
    [req.institution.id]
  );
  res.json({ imports: rows });
}));

/* Sessions */
app.get('/api/institution/sessions', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const clauses = ['s.institution_id=?']; const params = [req.institution.id];
  if (req.query.cohort_id) { clauses.push('s.cohort_id=?'); params.push(req.query.cohort_id); }
  if (req.query.status) { clauses.push('s.status=?'); params.push(req.query.status); }
  const [rows] = await pool.query(
    `SELECT s.*, u.name instructor_name, c.name cohort_name,
        (SELECT COUNT(*) FROM session_attendance WHERE session_id=s.id AND status='present') present_count,
        (SELECT COUNT(*) FROM session_attendance WHERE session_id=s.id) total_count
       FROM cohort_sessions s LEFT JOIN users u ON u.id=s.instructor_id LEFT JOIN cohorts c ON c.id=s.cohort_id
      WHERE ${clauses.join(' AND ')} ORDER BY s.scheduled_at DESC`,
    params
  );
  res.json({ sessions: rows });
}));

app.post('/api/institution/sessions', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.title || !b.cohort_id || !b.scheduled_at) return res.status(400).json({ error: 'title, cohort_id, scheduled_at required' });
  const [r] = await pool.query(
    `INSERT INTO cohort_sessions (cohort_id, institution_id, title, description, instructor_id, scheduled_at, duration_minutes, mode, location, meeting_url, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [b.cohort_id, req.institution.id, b.title, b.description || null, b.instructor_id || null, b.scheduled_at, b.duration_minutes || 60, b.mode || 'online', b.location || null, b.meeting_url || null, req.user.id]
  );
  const [trainees] = await pool.query(`SELECT user_id FROM trainee_enrollments WHERE cohort_id=? AND status='active'`, [b.cohort_id]);
  for (const t of trainees) {
    await pool.query(`INSERT IGNORE INTO session_attendance (session_id, trainee_id, status) VALUES (?,?, 'absent')`, [r.insertId, t.user_id]);
    await notify(t.user_id, 'New session scheduled', `${b.title} on ${new Date(b.scheduled_at).toLocaleString()}`, 'info');
  }
  await institutionAudit(req.institution.id, req.user.id, req.user.email, `Scheduled session "${b.title}"`, null, req.ip);
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/institution/sessions/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['title', 'description', 'instructor_id', 'scheduled_at', 'duration_minutes', 'mode', 'location', 'meeting_url', 'recording_url', 'status'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.institution.id);
  await pool.query(`UPDATE cohort_sessions SET ${sets.join(',')} WHERE id=? AND institution_id=?`, vals);
  res.json({ ok: true });
}));

app.delete('/api/institution/sessions/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM cohort_sessions WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

app.get('/api/institution/sessions/:id/attendance', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[session]] = await pool.query('SELECT * FROM cohort_sessions WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const [trainees] = await pool.query(
    `SELECT u.id, u.name, u.email, COALESCE(a.status,'absent') status, a.excuse_reason
       FROM trainee_enrollments e JOIN users u ON u.id=e.user_id
       LEFT JOIN session_attendance a ON a.session_id=? AND a.trainee_id=u.id
      WHERE e.cohort_id=? AND e.status='active' ORDER BY u.name`,
    [req.params.id, session.cohort_id]
  );
  res.json({ session, trainees });
}));

app.put('/api/institution/sessions/:id/attendance', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  for (const r of (req.body.records || [])) {
    await pool.query(
      `INSERT INTO session_attendance (session_id, trainee_id, status, excuse_reason, marked_by, marked_at)
       VALUES (?,?,?,?,?, NOW())
       ON DUPLICATE KEY UPDATE status=VALUES(status), excuse_reason=VALUES(excuse_reason), marked_by=VALUES(marked_by), marked_at=NOW()`,
      [req.params.id, r.trainee_id, r.status, r.excuse_reason || null, req.user.id]
    );
  }
  res.json({ ok: true });
}));

app.get('/api/institution/sessions/:id/ics', auth(), requireDB, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[s]] = await pool.query('SELECT * FROM cohort_sessions WHERE id=?', [req.params.id]);
  if (!s) return res.status(404).end();
  const dt = d => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(new Date(s.scheduled_at).getTime() + (s.duration_minutes || 60) * 60000);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ExpertHub//Sessions//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${s.id}@experthub`, `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(s.scheduled_at)}`, `DTEND:${dt(end)}`, `SUMMARY:${s.title}`,
    s.description ? `DESCRIPTION:${s.description.replace(/\n/g, '\\n')}` : '',
    s.location ? `LOCATION:${s.location}` : '',
    s.meeting_url ? `URL:${s.meeting_url}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="session-${s.id}.ics"`);
  res.send(lines.join('\r\n'));
}));

/* Certificates */
app.get('/api/institution/certificates', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT c.*, u.name trainee_name, u.email, p.title programme_title
       FROM institution_certificates c
       JOIN users u ON u.id=c.trainee_id
       LEFT JOIN programmes p ON p.id=c.programme_id
      WHERE c.institution_id=? ORDER BY c.issued_at DESC`,
    [req.institution.id]
  );
  res.json({ certificates: rows });
}));

app.post('/api/institution/certificates/issue', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { trainee_id, programme_id, awarding_body, cpd_points, valid_months, grade } = req.body;
  const [[trainee]] = await pool.query('SELECT name FROM users WHERE id=?', [trainee_id]);
  const [[prog]] = await pool.query('SELECT title FROM programmes WHERE id=?', [programme_id]);
  if (!trainee || !prog) return res.status(404).json({ error: 'Trainee or programme not found' });
  const serial = `EH-${req.institution.id}-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}`;
  const verification_hash = crypto.createHash('sha256').update(`${trainee_id}|${serial}|${req.institution.id}`).digest('hex');
  const expiresAt = valid_months ? new Date(Date.now() + valid_months * 30 * 86400000) : null;
  const [r] = await pool.query(
    `INSERT INTO institution_certificates (institution_id, trainee_id, programme_id, title, serial, awarding_body, cpd_points, grade, verification_hash, expires_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, trainee_id, programme_id, `${trainee.name} - ${prog.title}`, serial, awarding_body || null, cpd_points || 0, grade || null, verification_hash, expiresAt]
  );
  await notify(trainee_id, 'Certificate issued', `You have been awarded "${prog.title}". Serial: ${serial}`, 'success', `/verify/${serial}`);
  await institutionAudit(req.institution.id, req.user.id, req.user.email, `Issued certificate ${serial}`, { programme_id }, req.ip);
  res.status(201).json({ id: r.insertId, serial, verification_url: `/verify/${serial}` });
}));

app.put('/api/institution/certificates/:id/revoke', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [r] = await pool.query(
    `UPDATE institution_certificates SET revoked=1, revoked_reason=? WHERE id=? AND institution_id=?`,
    [req.body.reason || null, req.params.id, req.institution.id]
  );
  if (!r.affectedRows) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}));

app.put('/api/institution/certificates/:id/renew', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const months = Number(req.body.valid_months || 12);
  const expires = new Date(Date.now() + months * 30 * 86400000);
  await pool.query(
    `UPDATE institution_certificates SET expires_at=?, revoked=0, revoked_reason=NULL WHERE id=? AND institution_id=?`,
    [expires, req.params.id, req.institution.id]
  );
  res.json({ ok: true, expires_at: expires });
}));

app.get('/api/institution/certificates/expiring', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const days = Math.min(Number(req.query.days) || 90, 365);
  const [rows] = await pool.query(
    `SELECT c.*, u.name trainee_name, u.email FROM institution_certificates c
       JOIN users u ON u.id=c.trainee_id
      WHERE c.institution_id=? AND c.revoked=0 AND c.expires_at IS NOT NULL
        AND c.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
      ORDER BY c.expires_at ASC`,
    [req.institution.id, days]
  );
  res.json({ certificates: rows, window_days: days });
}));

app.get('/api/institution/certificates/:id/pdf', auth(['institution', 'learner']), requireDB, asyncH(async (req, res) => {
  if (!certificatePdfStream) return res.status(503).json({ error: 'PDF generation unavailable' });
  const pool = poolOrThrow();
  const [[c]] = await pool.query(
    `SELECT c.*, u.name trainee_name, i.name institution_name, i.primary_color, i.accent_color
       FROM institution_certificates c
       JOIN users u ON u.id=c.trainee_id
       LEFT JOIN institutions i ON i.id=c.institution_id
      WHERE c.id=?`,
    [req.params.id]
  );
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${c.serial}.pdf"`);
  const doc = certificatePdfStream(c, { primary_color: c.primary_color, accent_color: c.accent_color });
  doc.pipe(res);
}));

/* Skills */
app.get('/api/institution/skills', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM skills WHERE institution_id=? ORDER BY category, name', [req.institution.id]);
  res.json({ skills: rows });
}));

app.post('/api/institution/skills', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [r] = await poolOrThrow().query(
    'INSERT INTO skills (institution_id, name, category, description) VALUES (?,?,?,?)',
    [req.institution.id, req.body.name, req.body.category || null, req.body.description || null]
  );
  res.status(201).json({ id: r.insertId });
}));

app.delete('/api/institution/skills/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM trainee_skills WHERE skill_id=?', [req.params.id]);
    await conn.query('DELETE FROM programme_skills WHERE skill_id=?', [req.params.id]);
    await conn.query('DELETE FROM skills WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  res.json({ ok: true });
}));

app.get('/api/institution/skills/matrix', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [skills] = await pool.query('SELECT * FROM skills WHERE institution_id=? ORDER BY category, name', [req.institution.id]);
  const clauses = ["e.institution_id=?", "e.status IN ('active','approved','completed','certified')"];
  const params = [req.institution.id];
  if (req.query.cohort_id) { clauses.push('e.cohort_id=?'); params.push(req.query.cohort_id); }
  const [trainees] = await pool.query(
    `SELECT DISTINCT u.id, u.name, u.email, u.department FROM users u
       JOIN trainee_enrollments e ON e.user_id=u.id
      WHERE ${clauses.join(' AND ')} ORDER BY u.name`,
    params
  );
  let levels = [];
  if (trainees.length) {
    const ph = trainees.map(() => '?').join(',');
    [levels] = await pool.query(`SELECT trainee_id, skill_id, level FROM trainee_skills WHERE trainee_id IN (${ph})`, trainees.map(t => t.id));
  }
  const matrix = trainees.map(t => ({
    trainee: t,
    levels: Object.fromEntries(levels.filter(l => l.trainee_id === t.id).map(l => [l.skill_id, l.level])),
  }));
  res.json({ skills, matrix });
}));

app.put('/api/institution/skills/assess', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { trainee_id, skill_id, level, source = 'manager' } = req.body;
  await pool.query(
    `INSERT INTO trainee_skills (trainee_id, skill_id, level, assessed_by, source, assessed_at) VALUES (?,?,?,?,?, NOW())
     ON DUPLICATE KEY UPDATE level=VALUES(level), assessed_by=VALUES(assessed_by), assessed_at=NOW(), source=VALUES(source)`,
    [trainee_id, skill_id, level, req.user.id, source]
  );
  res.json({ ok: true });
}));

/* Approvals */
app.get('/api/institution/approvals', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const status = req.query.status || 'pending';
  const [rows] = await pool.query(
    `SELECT a.*, u.name requested_by_name FROM approval_requests a
       LEFT JOIN users u ON u.id=a.requested_by
      WHERE a.institution_id=? AND a.status=? ORDER BY a.created_at DESC`,
    [req.institution.id, status]
  );
  res.json({ approvals: rows });
}));

app.put('/api/institution/approvals/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { status, decision_notes } = req.body;
  if (!['approved', 'rejected', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await pool.query(
    `UPDATE approval_requests SET status=?, decided_at=NOW(), decision_notes=? WHERE id=? AND institution_id=?`,
    [status, decision_notes || null, req.params.id, req.institution.id]
  );
  res.json({ ok: true });
}));

/* Instructors */
app.get('/api/institution/instructors', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar, u.specialization, u.hourly_rate,
        (SELECT COUNT(*) FROM cohorts WHERE instructor_id=u.id) programme_count
       FROM users u WHERE u.role='expert' AND u.status='active' AND (u.institution_id=? OR u.institution_id IS NULL) ORDER BY u.name`,
    [req.institution.id]
  );
  res.json({ instructors: rows });
}));

app.post('/api/institution/instructors', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('UPDATE users SET institution_id=? WHERE id=? AND role=?', [req.institution.id, req.body.expert_id, 'expert']);
  res.json({ ok: true });
}));

/* Team */
app.get('/api/institution/team', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  if (req.institutionRole !== 'operations_manager') return res.json({ team: [] });
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT id, name, email, institution_role, status, created_at FROM users WHERE institution_id=? AND institution_role IS NOT NULL ORDER BY created_at DESC`,
    [req.institution.id]
  );
  res.json({ team: rows });
}));

app.post('/api/institution/team/invite', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  if (req.institutionRole !== 'operations_manager') return res.status(403).json({ error: 'Only Operations Manager' });
  const pool = poolOrThrow();
  const { name, email, institution_role } = req.body;
  if (!config.institution.roles.includes(institution_role)) return res.status(400).json({ error: 'Invalid role' });
  const [[existing]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const tempPassword = nanoid(12);
  const hash = await bcrypt.hash(tempPassword, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role) VALUES (?,?,?, 'institution','active',?,?)`,
    [name, email, hash, req.institution.id, institution_role]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await notify(r.insertId, 'Welcome to the team', `Temporary password: ${tempPassword}`, 'info', '/login');
  if (sendEmail) sendEmail({ to: email, subject: 'Team invitation', body: `Temporary password: ${tempPassword}` }).catch(() => {});
  await institutionAudit(req.institution.id, req.user.id, req.user.email, `Invited ${name} (${institution_role})`, null, req.ip);
  res.status(201).json({ id: r.insertId, temp_password: tempPassword });
}));

app.put('/api/institution/team/:id/role', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  if (!config.institution.roles.includes(req.body.institution_role)) return res.status(400).json({ error: 'Invalid role' });
  await poolOrThrow().query('UPDATE users SET institution_role=? WHERE id=? AND institution_id=?',
    [req.body.institution_role, req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

app.delete('/api/institution/team/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE users SET institution_id=NULL, institution_role=NULL WHERE id=? AND institution_id=?',
    [req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

app.get('/api/institution/team/:id/permissions', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT permission_key, granted FROM team_permissions WHERE user_id=?', [req.params.id]);
  res.json({ permissions: rows });
}));

app.put('/api/institution/team/:id/permissions', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  for (const p of (req.body.permissions || [])) {
    await pool.query(
      `INSERT INTO team_permissions (institution_id, user_id, permission_key, granted, granted_by) VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE granted=VALUES(granted), granted_by=VALUES(granted_by)`,
      [req.institution.id, req.params.id, p.key, p.granted ? 1 : 0, req.user.id]
    );
  }
  res.json({ ok: true });
}));

/* Org units */
app.get('/api/institution/org-units', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT o.*, u.name manager_name FROM org_units o LEFT JOIN users u ON u.id=o.manager_id WHERE o.institution_id=? ORDER BY o.unit_type, o.name`,
    [req.institution.id]
  );
  res.json({ units: rows });
}));

app.post('/api/institution/org-units', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO org_units (institution_id, parent_id, name, unit_type, code, manager_id, budget_amount) VALUES (?,?,?,?,?,?,?)`,
    [req.institution.id, b.parent_id || null, b.name, b.unit_type || 'department', b.code || null, b.manager_id || null, b.budget_amount || 0]
  );
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/institution/org-units/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  await pool.query(
    `UPDATE org_units SET name=?, unit_type=?, code=?, manager_id=?, budget_amount=?, active=? WHERE id=? AND institution_id=?`,
    [b.name, b.unit_type || 'department', b.code || null, b.manager_id || null, b.budget_amount || 0, b.active === false ? 0 : 1, req.params.id, req.institution.id]
  );
  res.json({ ok: true });
}));

app.delete('/api/institution/org-units/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM org_units WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

/* Learning paths */
app.get('/api/institution/learning-paths', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT lp.*, COUNT(s.id) step_count FROM learning_paths lp LEFT JOIN learning_path_steps s ON s.path_id=lp.id WHERE lp.institution_id=? GROUP BY lp.id ORDER BY lp.created_at DESC`,
    [req.institution.id]
  );
  res.json({ paths: rows });
}));

app.post('/api/institution/learning-paths', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [r] = await poolOrThrow().query(
    'INSERT INTO learning_paths (institution_id, title, description, badge_icon) VALUES (?,?,?,?)',
    [req.institution.id, req.body.title, req.body.description || null, req.body.badge_icon || null]
  );
  res.status(201).json({ id: r.insertId });
}));

app.delete('/api/institution/learning-paths/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM learning_paths WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

/* Question bank */
app.get('/api/institution/question-bank', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM question_bank WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ questions: rows });
}));

app.post('/api/institution/question-bank', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO question_bank (institution_id, category, difficulty, question_type, question_text, options, correct_answer, points, explanation, tags, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, b.category || null, b.difficulty || 'medium', b.question_type, b.question_text,
     b.options ? JSON.stringify(b.options) : null, b.correct_answer || null, b.points || 1,
     b.explanation || null, b.tags || null, req.user.id]
  );
  res.status(201).json({ id: r.insertId });
}));

app.delete('/api/institution/question-bank/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM question_bank WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

/* Assessments */
app.get('/api/institution/assessments', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT a.*, c.name cohort_name,
        (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id=a.id) question_count,
        (SELECT COUNT(*) FROM assessment_submissions WHERE assessment_id=a.id) submission_count
       FROM assessments a LEFT JOIN cohorts c ON c.id=a.cohort_id WHERE a.institution_id=? ORDER BY a.created_at DESC`,
    [req.institution.id]
  );
  res.json({ assessments: rows });
}));

app.post('/api/institution/assessments', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO assessments (institution_id, cohort_id, title, description, type, weight, pass_mark, max_attempts, time_limit_minutes, auto_grade, due_date, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, b.cohort_id, b.title, b.description || null, b.type || 'quiz', b.weight || 20, b.pass_mark || 70, b.max_attempts || 1, b.time_limit_minutes || 0, b.auto_grade === false ? 0 : 1, b.due_date || null, b.status || 'scheduled']
  );
  res.status(201).json({ id: r.insertId });
}));

app.delete('/api/institution/assessments/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM assessments WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

app.get('/api/institution/assessments/:id/submissions', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT s.*, u.name trainee_name, u.email FROM assessment_submissions s JOIN users u ON u.id=s.trainee_id WHERE s.assessment_id=? ORDER BY s.submitted_at DESC`,
    [req.params.id]
  );
  res.json({ submissions: rows });
}));

app.put('/api/institution/assessments/submissions/:id/grade', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  await poolOrThrow().query(
    `UPDATE assessment_submissions SET score=?, feedback=?, passed=?, graded_by=?, graded_at=NOW() WHERE id=?`,
    [req.body.score, req.body.feedback || null, req.body.passed === true ? 1 : req.body.passed === false ? 0 : null, req.user.id, req.params.id]
  );
  res.json({ ok: true });
}));

/* Projects */
app.get('/api/institution/projects', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT p.*, c.name cohort_name, (SELECT COUNT(*) FROM project_submissions WHERE project_id=p.id) submissions_count
       FROM projects p LEFT JOIN cohorts c ON c.id=p.cohort_id WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]
  );
  res.json({ projects: rows });
}));

app.post('/api/institution/projects', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO projects (institution_id, cohort_id, title, description, category, deadline, max_score, status, created_by) VALUES (?,?,?,?,?,?,?, 'active', ?)`,
    [req.institution.id, b.cohort_id, b.title, b.description || null, b.category || null, b.deadline || null, b.max_score || 100, req.user.id]
  );
  res.status(201).json({ id: r.insertId });
}));

/* Materials */
app.get('/api/institution/materials', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const clauses = ['institution_id=?']; const params = [req.institution.id];
  if (req.query.cohort_id) { clauses.push('cohort_id=?'); params.push(req.query.cohort_id); }
  const [rows] = await poolOrThrow().query(
    `SELECT m.*, u.name uploaded_by_name FROM training_materials m LEFT JOIN users u ON u.id=m.uploaded_by WHERE ${clauses.join(' AND ')} ORDER BY m.created_at DESC`,
    params
  );
  res.json({ materials: rows });
}));

app.post('/api/institution/materials', auth(), requireDB, requireInstitution, upload.single('file'), asyncH(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  const [r] = await poolOrThrow().query(
    `INSERT INTO training_materials (institution_id, cohort_id, programme_id, title, description, file_url, file_size, mime_type, uploaded_by)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, req.body.cohort_id || null, req.body.programme_id || null, req.body.title || req.file.originalname, req.body.description || null,
     '/uploads/' + req.file.filename, req.file.size, req.file.mimetype, req.user.id]
  );
  res.status(201).json({ id: r.insertId, url: '/uploads/' + req.file.filename });
}));

app.delete('/api/institution/materials/:id', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM training_materials WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

/* Compliance */
app.get('/api/institution/compliance-rules', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT r.*, p.title programme_title FROM compliance_rules r LEFT JOIN programmes p ON p.id=r.programme_id WHERE r.institution_id=? ORDER BY r.created_at DESC`,
    [req.institution.id]
  );
  res.json({ rules: rows });
}));

app.post('/api/institution/compliance-rules', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO compliance_rules (institution_id, title, description, programme_id, target_role, target_department, recurrence_months, mandatory) VALUES (?,?,?,?,?,?,?,?)`,
    [req.institution.id, b.title, b.description || null, b.programme_id || null, b.target_role || null, b.target_department || null, b.recurrence_months || 12, b.mandatory === false ? 0 : 1]
  );
  res.status(201).json({ id: r.insertId });
}));

/* Reports */
app.get('/api/institution/reports/programme-scorecard', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT p.id, p.title, p.status,
        (SELECT COUNT(*) FROM trainee_enrollments WHERE programme_id=p.id) total_enrolled,
        (SELECT COUNT(*) FROM trainee_enrollments WHERE programme_id=p.id AND status IN ('completed','certified')) total_completed,
        (SELECT AVG(progress) FROM trainee_enrollments WHERE programme_id=p.id) avg_progress,
        p.cost_per_seat
       FROM programmes p WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]
  );
  res.json({ scorecard: rows });
}));

app.get('/api/institution/reports/cohort-comparison', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT c.id, c.name, p.title programme_title,
        (SELECT COUNT(*) FROM trainee_enrollments WHERE cohort_id=c.id) enrolled,
        (SELECT AVG(progress) FROM trainee_enrollments WHERE cohort_id=c.id) avg_progress,
        (SELECT COUNT(*) FROM session_attendance sa JOIN cohort_sessions s ON s.id=sa.session_id WHERE s.cohort_id=c.id AND sa.status IN ('present','late')) presents,
        (SELECT COUNT(*) FROM session_attendance sa JOIN cohort_sessions s ON s.id=sa.session_id WHERE s.cohort_id=c.id) attendance_total
       FROM cohorts c LEFT JOIN programmes p ON p.id=c.programme_id WHERE c.institution_id=? ORDER BY c.created_at DESC`,
    [req.institution.id]
  );
  res.json({ cohorts: rows });
}));

app.get('/api/institution/reports/trainee-progress-heatmap', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT u.id, u.name, u.department, p.title programme_title, e.progress, e.status,
        CASE WHEN e.progress >= 80 THEN 'ahead' WHEN e.progress >= 50 THEN 'on_track' WHEN e.progress >= 20 THEN 'behind' ELSE 'at_risk' END pace
       FROM trainee_enrollments e JOIN users u ON u.id=e.user_id LEFT JOIN programmes p ON p.id=e.programme_id
      WHERE e.institution_id=? AND e.status IN ('active','approved','on_hold') ORDER BY e.progress ASC`,
    [req.institution.id]
  );
  res.json({ heatmap: rows });
}));

app.get('/api/institution/reports/compliance', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT u.id, u.name, u.email, u.department, c.serial, c.title, c.expires_at, c.revoked,
        CASE WHEN c.revoked=1 THEN 'revoked' WHEN c.expires_at IS NULL THEN 'no_expiry' WHEN c.expires_at < NOW() THEN 'expired'
             WHEN c.expires_at < DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 'expiring_soon' ELSE 'valid' END compliance_status
       FROM users u LEFT JOIN institution_certificates c ON c.trainee_id=u.id WHERE u.institution_id=? ORDER BY u.name`,
    [req.institution.id]
  );
  res.json({ compliance: rows });
}));

app.get('/api/institution/reports/cost', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT p.id, p.title, (SELECT COUNT(*) FROM trainee_enrollments WHERE programme_id=p.id) seats,
        p.cost_per_seat, p.trainer_cost, p.materials_cost,
        (SELECT COUNT(*) FROM trainee_enrollments WHERE programme_id=p.id) * p.cost_per_seat + p.trainer_cost + p.materials_cost total_cost
       FROM programmes p WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]
  );
  const total = rows.reduce((s, r) => s + Number(r.total_cost || 0), 0);
  res.json({ cost: rows, total_cost: total });
}));

app.get('/api/institution/report-templates', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM report_templates WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ templates: rows });
}));

app.post('/api/institution/report-templates', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `INSERT INTO report_templates (institution_id, name, report_type, filters, columns, created_by) VALUES (?,?,?,?,?,?)`,
    [req.institution.id, req.body.name, req.body.report_type, JSON.stringify(req.body.filters || {}), JSON.stringify(req.body.columns || []), req.user.id]
  );
  res.status(201).json({ id: r.insertId });
}));

app.get('/api/institution/scheduled-reports', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT sr.*, rt.name template_name FROM scheduled_reports sr JOIN report_templates rt ON rt.id=sr.template_id WHERE sr.institution_id=? ORDER BY sr.created_at DESC`,
    [req.institution.id]
  );
  res.json({ reports: rows });
}));

app.post('/api/institution/scheduled-reports', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `INSERT INTO scheduled_reports (institution_id, template_id, frequency, recipients, next_run_at) VALUES (?,?,?,?,?)`,
    [req.institution.id, req.body.template_id, req.body.frequency || 'weekly', JSON.stringify(req.body.recipients), new Date(Date.now() + 7 * 86400000)]
  );
  res.status(201).json({ id: r.insertId });
}));

/* Stats */
app.get('/api/institution/stats', auth(), requireDB, requireInstitution, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const instId = req.institution.id;
  const [[{ programmes }]] = await pool.query('SELECT COUNT(*) programmes FROM programmes WHERE institution_id=?', [instId]);
  const [[{ cohorts }]] = await pool.query('SELECT COUNT(*) cohorts FROM cohorts WHERE institution_id=?', [instId]);
  const [[{ assessments }]] = await pool.query('SELECT COUNT(*) assessments FROM assessments WHERE institution_id=?', [instId]);
  const [[{ projects }]] = await pool.query('SELECT COUNT(*) projects FROM projects WHERE institution_id=?', [instId]);
  const [[{ trainees }]] = await pool.query('SELECT COUNT(DISTINCT user_id) trainees FROM trainee_enrollments WHERE institution_id=?', [instId]);
  const [[{ instructors }]] = await pool.query("SELECT COUNT(*) instructors FROM users WHERE institution_id=? AND role='expert'", [instId]);
  const [[{ avgCompletionRate }]] = await pool.query('SELECT COALESCE(AVG(progress),0) avgCompletionRate FROM trainee_enrollments WHERE institution_id=?', [instId]);
  const [[{ attendanceTotal }]] = await pool.query(
    `SELECT COUNT(*) attendanceTotal FROM session_attendance sa JOIN cohort_sessions s ON s.id=sa.session_id WHERE s.institution_id=?`, [instId]
  );
  const [[{ attendancePresent }]] = await pool.query(
    `SELECT COUNT(*) attendancePresent FROM session_attendance sa JOIN cohort_sessions s ON s.id=sa.session_id WHERE s.institution_id=? AND sa.status IN ('present','late')`, [instId]
  );
  const [upcomingSessions] = await pool.query(
    `SELECT s.id, s.title, s.scheduled_at, c.name cohort_name FROM cohort_sessions s LEFT JOIN cohorts c ON c.id=s.cohort_id
      WHERE s.institution_id=? AND s.status='scheduled' AND s.scheduled_at >= NOW() ORDER BY s.scheduled_at ASC LIMIT 10`, [instId]
  );
  const [[{ pendingApprovals }]] = await pool.query("SELECT COUNT(*) pendingApprovals FROM approval_requests WHERE institution_id=? AND status='pending'", [instId]);
  const [[{ expiringCertificates }]] = await pool.query(
    `SELECT COUNT(*) expiringCertificates FROM institution_certificates WHERE institution_id=? AND revoked=0 AND expires_at IS NOT NULL AND expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 90 DAY)`, [instId]
  );
  const [auditLog] = await pool.query(
    `SELECT l.*, u.name actor_name FROM institution_audit_logs l LEFT JOIN users u ON u.id=l.actor_id WHERE l.institution_id=? ORDER BY l.created_at DESC LIMIT 20`, [instId]
  );

  res.json({
    stats: {
      avgCompletionRate: Math.round(Number(avgCompletionRate) || 0),
      avgScore: 0,
      attendanceRate: Number(attendanceTotal) ? Math.round((Number(attendancePresent) / Number(attendanceTotal)) * 100) : 0,
      totalTrainees: Number(trainees),
      pendingApprovals: Number(pendingApprovals),
      expiringCertificates: Number(expiringCertificates),
      projectsSubmitted: 0,
      certificatesIssued: 0,
      upcomingSessions,
      auditLog,
      totals: { programmes, cohorts, assessments, projects, trainees, instructors },
    },
  });
}));

/* ============================================================
   STATIC + SPA FALLBACK
   ============================================================ */
app.use(express.static(path.join(__dirname, 'public')));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const indexHtml = path.join(__dirname, 'public', 'index.html');
  if (!fs.existsSync(indexHtml)) {
    return res.status(200).send(
      '<h1>ExpertHub API</h1>' +
      `<p>API is running. Demo mode: <b>${demo.active ? 'ON' : 'off'}</b></p>` +
      '<p><a href="/api/health">Health</a></p>'
    );
  }
  res.sendFile(indexHtml);
});

app.use((err, req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

/* ============================================================
   SOCKET.IO
   ============================================================ */
const server = http.createServer(app);
let io = new Server(server, { cors: { origin: config.corsOrigin } });

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  try { socket.user = jwt.verify(token, config.jwt.secret); next(); } catch { next(); }
});

const onlineUsers = new Map();
io.on('connection', (socket) => {
  if (socket.user) {
    socket.join(`user_${socket.user.id}`);
    onlineUsers.set(socket.user.id, (onlineUsers.get(socket.user.id) || 0) + 1);
    io.emit('presence', { user_id: socket.user.id, online: true });
  }
  socket.on('join_consultation', (id) => socket.join(`consultation_${id}`));
  socket.on('leave_consultation', (id) => socket.leave(`consultation_${id}`));
  socket.on('typing', ({ consultation_id, is_typing }) => {
    if (!socket.user) return;
    socket.to(`consultation_${consultation_id}`).emit('typing', { consultation_id, user_id: socket.user.id, is_typing });
  });
  socket.on('disconnect', () => {
    if (socket.user) {
      const c = (onlineUsers.get(socket.user.id) || 1) - 1;
      if (c <= 0) { onlineUsers.delete(socket.user.id); io.emit('presence', { user_id: socket.user.id, online: false }); }
      else onlineUsers.set(socket.user.id, c);
    }
  });
});

/* ============================================================
   START
   ============================================================ */
(async () => {
  await seedDemoMemory();
  server.listen(config.port, () => {
    console.log(`\n ExpertHub 2.0 API listening on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.env}`);
    console.log(`   Health:      http://localhost:${config.port}/api/health`);
    if (demo.active) {
      console.log('\n   DEMO MODE ACTIVE — in-memory backend, no MySQL required');
      console.log('      Demo logins:');
      console.log('        admin@platform.com   / admin123       (Admin)');
      console.log('        expert@platform.com  / expert123      (Expert)');
      console.log('        learner@platform.com / learner123     (Learner)');
      console.log('        ops@acme.com         / ops123         (Institution Ops Manager)');
      console.log('        coord@acme.com       / coord123       (Institution Coordinator)');
    } else {
      console.log(`   DB target:   ${config.db.host}:${config.db.port}/${config.db.database}`);
      console.log('   Connecting to MySQL in background…');
    }
    console.log('');
    if (!demo.forced && config.db.enabled) tryConnect();
  });
})();

async function shutdown(signal) {
  console.log(`\n[${signal}] shutting down…`);
  try { if (dbState.pool) await dbState.pool.end(); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => { console.error('[uncaughtException]', err); });