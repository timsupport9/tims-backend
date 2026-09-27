/* ============================================================
   ExpertHub 2.0 — Express + MySQL + Socket.io backend
   Serves API AND frontend from /public
   -------------------------------------------
   • Config comes exclusively from process.env (host environment).
   • No hardcoded secrets. Dev fallbacks only, with loud warnings.
   • Runs fully without MySQL using an in-memory demo backend.
   • Auto-switches to MySQL when DB_* env vars are present and reachable.
   • NEW: Institutions / Corporate Training (programmes, cohorts,
     assessments, projects, trainees, instructors, ops manager).
   ============================================================ */
require('dotenv').config();

const express      = require('express');
const http         = require('http');
const path         = require('path');
const fs           = require('fs');
const cors         = require('cors');
const morgan       = require('morgan');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const mysql        = require('mysql2/promise');
const multer       = require('multer');
const rateLimit    = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const compression  = require('compression');
const { nanoid }   = require('nanoid');
const { Server }   = require('socket.io');

/* ============================================================
   CONFIG — everything from environment
   ============================================================ */
const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

const config = {
  env,
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || '*',

  db: {
    enabled: !!(process.env.DB_HOST && process.env.DB_NAME),
    host:     process.env.DB_HOST || '',
    port:     Number(process.env.DB_PORT || 3306),
    user:     process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    poolSize: Number(process.env.DB_POOL_SIZE || 15),
    retryMs:  Number(process.env.DB_RETRY_MS || 10000),
    bootstrapSchema: process.env.DB_BOOTSTRAP !== 'false',
    seedDemo: process.env.DB_SEED_DEMO !== 'false',
  },

  jwt: {
    secret:           process.env.JWT_SECRET,
    refreshSecret:    process.env.JWT_REFRESH_SECRET,
    expiresIn:        process.env.JWT_EXPIRES || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '30d',
  },

  platform: {
    commission:         Number(process.env.PLATFORM_COMMISSION || 20),
    withdrawalHoldDays: Number(process.env.WITHDRAWAL_HOLD_DAYS || 7),
    minPayout:          Number(process.env.MIN_PAYOUT || 50),
  },

  uploads: {
    dir:         process.env.UPLOAD_DIR || path.join(__dirname, 'public', 'uploads'),
    maxFileSize: Number(process.env.MAX_FILE_SIZE || 8 * 1024 * 1024),
  },

  /* ----- Institution constants (used by frontend + server) ----- */
  institution: {
    types: ['corporate','university','college','ngo','government','bootcamp'],
    roles: ['operations_manager','coordinator','instructor','viewer'],
    programmeStatuses: ['draft','active','paused','completed','archived'],
    assessmentTypes:   ['quiz','exam','project','practical','peer'],
  },
};

/* ---------- Env validation (dev fallbacks, prod hard-fail) ---------- */
(function validateEnv() {
  const missing = [];
  if (!config.jwt.secret)        missing.push('JWT_SECRET');
  if (!config.jwt.refreshSecret) missing.push('JWT_REFRESH_SECRET');

  if (missing.length) {
    if (isProd) {
      console.error(`❌ Missing required env vars in production: ${missing.join(', ')}`);
      process.exit(1);
    }
    console.warn(`⚠️  Missing env vars: ${missing.join(', ')}`);
    console.warn('   Using dev-only fallbacks — DO NOT use in production.\n');
    if (!config.jwt.secret)        config.jwt.secret        = 'dev_secret_change_me';
    if (!config.jwt.refreshSecret) config.jwt.refreshSecret = 'dev_refresh_change_me';
  }
})();

/* ============================================================
   DEMO STORE (in-memory backend when MySQL is unavailable)
   ============================================================ */
const demo = {
  active: !config.db.enabled,
  forced: process.env.DEMO_MODE === 'true',
  counters: {},
  users: [],
  notificationPrefs: [],
  notifications: [],
  events: [],
  eventRegistrations: [],
  courses: [],
  lessons: [],
  enrollments: [],
  certificates: [],
  coupons: [],
  walletLedger: [],
  transactions: [],
  payouts: [],
  availability: [],
  timeOff: [],
  reviews: [],
  consultations: [],
  messages: [],
  claims: [],
  tickets: [],
  ticketReplies: [],
  refreshTokens: [],
  settings: {},
  auditLogs: [],

  /* ----- NEW: corporate / institutional ----- */
  institutions:     [],
  programmes:       [],
  cohorts:          [],
  assessments:      [],
  projects:         [],
  trainees:         [],
  instructors:      [],
  institutionTeam:  [],
  institutionReqs:  [],
  institutionAudit: [],
};

function nextId(coll) {
  demo.counters[coll] = (demo.counters[coll] || 0) + 1;
  return demo.counters[coll];
}

async function seedDemoMemory() {
  if (demo.users.length) return;
  console.log('[demo] seeding in-memory store…');

  const seedUsers = [
    { name:'System Admin',     email:'admin@platform.com',   password:'admin123',   role:'admin',   status:'active',  spec:'Platform Operations', rate:0  },
    { name:'Dr. Sarah Kimani', email:'expert@platform.com',  password:'expert123',  role:'expert',  status:'active',  spec:'Data Science & AI',   rate:75 },
    { name:'John Mwangi',      email:'learner@platform.com', password:'learner123', role:'learner', status:'active',  spec:null,                  rate:0  },
    { name:'Aisha Bello',      email:'aisha@platform.com',   password:'expert123',  role:'expert',  status:'active',  spec:'Business Strategy',   rate:90 },
    { name:'Kwame Mensah',     email:'kwame@platform.com',   password:'expert123',  role:'expert',  status:'active',  spec:'Full-Stack Dev',      rate:80 },
    { name:'Grace Ochieng',    email:'grace@platform.com',   password:'expert123',  role:'expert',  status:'active',  spec:'UX Design',           rate:65 },
    { name:'Pending Expert',   email:'pending@platform.com', password:'expert123',  role:'expert',  status:'pending', spec:'Marketing',           rate:55 },
  ];

  for (const u of seedUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    const id = nextId('users');
    demo.users.push({
      id, name: u.name, email: u.email, password_hash: hash,
      phone: '', role: u.role, status: u.status,
      specialization: u.spec, hourly_rate: u.rate, bio: '',
      avatar: null,
      wallet_balance:  u.role === 'expert' ? 320  : 0,
      total_earnings:  u.role === 'expert' ? 1250 : 0,
      average_rating:  u.role === 'expert' ? 4.7  : 0,
      created_at: new Date(), last_login_at: null,
      timezone: 'UTC', theme: 'light', language: 'en',
      intent: 'both',
      institution_id: null, institution_role: null,
    });
    demo.notificationPrefs.push({
      user_id: id, email_notifications: 1, push_notifications: 1, marketing: 0,
    });
  }

  const expertIds = demo.users.filter(u => u.role === 'expert').map(u => u.id);

  // Courses
  const courseSeeds = [
    ['Full-Stack Web Development','Master modern web development from zero to hero.','Technology','bootcamp','intermediate',499,12,120],
    ['Data Science Bootcamp','Python, ML, and real-world projects.','Data','bootcamp','intermediate',599,14,140],
    ['React in 30 Days','Build production React apps fast.','Frontend','short_course','intermediate',99,0,30],
    ['Public Speaking Mastery','Command the room with confidence.','Soft Skills','short_course','beginner',49,0,12],
    ['Mathematics Tutoring','1-on-1 personalized math help.','Math','tuition','beginner',25,0,1],
    ['SAT Math Prep','Comprehensive SAT math bootcamp.','Test Prep','exam_prep','intermediate',39,0,20],
    ['Tech Career Roadmap','Navigate your tech career.','Career','career','beginner',79,0,2],
  ];
  for (const c of courseSeeds) {
    const id = nextId('courses');
    demo.courses.push({
      id, title: c[0], description: c[1], category: c[2], course_type: c[3], level: c[4],
      price: c[5], duration_weeks: c[6], duration_hours: 0,
      total_lessons: c[7], expert_id: expertIds[Math.floor(Math.random() * expertIds.length)] || null,
      status: 'published', thumbnail: null, created_at: new Date(),
    });
    for (let i = 1; i <= 5; i++) {
      demo.lessons.push({
        id: nextId('lessons'), course_id: id, title: `Lesson ${i}`,
        content: `Content for lesson ${i}`, position: i, duration_minutes: 20,
      });
    }
  }

  // Events
  const eventSeeds = [
    ['Live Bootcamp: Intro to AI','Hands-on introduction to machine learning.','Technology',7, 500,100, 0],
    ['Career Webinar: Tech Jobs', 'How to break into tech in 2026.',          'Career',    14,300,200, 0],
    ['Design Thinking Workshop',  'Practical design thinking for teams.',      'Design',    21,400, 50,25],
  ];
  for (const [title, description, category, days, pay, cap, price] of eventSeeds) {
    demo.events.push({
      id: nextId('events'), title, description, category,
      expert_id: null, date: new Date(Date.now() + days * 86400000),
      start_time: null, end_time: null, location: 'Online', meeting_url: '',
      capacity: cap, price, expert_payment: pay, status: 'published',
      created_at: new Date(),
    });
  }

  // Coupons
  demo.coupons.push(
    { id: nextId('coupons'), code:'WELCOME10',  discount_type:'percent', discount_value:10, max_uses:1000, used_count:0, min_spend:0,   applies_to:'all',      active:1, expires_at:null, created_at:new Date() },
    { id: nextId('coupons'), code:'SAVE50',     discount_type:'fixed',   discount_value:50, max_uses:100,  used_count:0, min_spend:200, applies_to:'all',      active:1, expires_at:null, created_at:new Date() },
    { id: nextId('coupons'), code:'BOOTCAMP20', discount_type:'percent', discount_value:20, max_uses:200,  used_count:0, min_spend:0,   applies_to:'bootcamp', active:1, expires_at:null, created_at:new Date() },
  );

  // Notifications
  demo.notifications.push(
    { id: nextId('notifications'), user_id:null, title:'Welcome to ExpertHub', message:'Your account is ready. Explore the platform!', type:'info', link:null, is_read:0, created_at:new Date() },
    { id: nextId('notifications'), user_id:null, title:'New event',           message:'Live Bootcamp: Intro to AI has been added.',   type:'info', link:null, is_read:0, created_at:new Date() },
  );

  /* ============================================================
     Seed institutions + corporate training data
     ============================================================ */
  async function _mkUser({ name, email, password, role, status='active', spec=null, rate=0, instRole=null, instId=null }) {
    const hash = await bcrypt.hash(password, 10);
    const id = nextId('users');
    demo.users.push({
      id, name, email, password_hash: hash, phone:'',
      role, status, specialization: spec, hourly_rate: rate, bio:'',
      avatar:null, institution_id: instId, institution_role: instRole,
      wallet_balance: role === 'expert' ? 320 : 0,
      total_earnings: role === 'expert' ? 1250 : 0,
      average_rating: role === 'expert' ? 4.7 : 0,
      created_at: new Date(), last_login_at: null,
      timezone:'UTC', theme:'light', language:'en', intent:'both',
    });
    demo.notificationPrefs.push({ user_id:id, email_notifications:1, push_notifications:1, marketing:0 });
    return demo.users[demo.users.length - 1];
  }

  // 1. Acme Academy (corporate)
  const acmeId = nextId('institutions');
  const acme = {
    id: acmeId, name:'Acme Academy', type:'corporate', industry:'Banking & Fintech',
    contact_email:'ops@acme.com', contact_phone:'+254 700 000 000',
    address:'Nairobi, Kenya',
    ops_manager_id:null, ops_manager_name:null, ops_manager_email:null,
    status:'active', default_capacity:30, pass_mark:70, created_at:new Date(),
  };
  demo.institutions.push(acme);

  // 2. Ops manager
  const opsUser = await _mkUser({
    name:'Olivia Ops', email:'ops@acme.com', password:'ops123',
    role:'institution', status:'active', instRole:'operations_manager', instId:acmeId,
  });
  acme.ops_manager_id = opsUser.id;
  acme.ops_manager_name = opsUser.name;
  acme.ops_manager_email = opsUser.email;

  // 3. Coordinator
  const coordUser = await _mkUser({
    name:'Chris Coordinator', email:'coord@acme.com', password:'coord123',
    role:'institution', status:'active', instRole:'coordinator', instId:acmeId,
  });
  demo.institutionTeam.push({
    id: nextId('institutionTeam'), institution_id: acmeId, user_id: coordUser.id,
    name: coordUser.name, email: coordUser.email, institution_role:'coordinator',
    status:'active', created_at:new Date(),
  });

  // 4. Second institution (pending for admin demo)
  const betaId = nextId('institutions');
  demo.institutions.push({
    id: betaId, name:'Beta Institute', type:'university', industry:'Higher Education',
    contact_email:'hello@beta.edu', contact_phone:'+254 711 111 111',
    address:'Mombasa, Kenya',
    ops_manager_id:null, ops_manager_name:null, ops_manager_email:null,
    status:'pending', default_capacity:40, pass_mark:60, created_at:new Date(),
  });

  // 5. Instructors
  const expertList = demo.users.filter(u => u.role === 'expert' && u.status === 'active');
  expertList.slice(0, 3).forEach((e, idx) => {
    demo.instructors.push({
      id: nextId('instructors'), institution_id: acmeId, expert_id: e.id,
      name: e.name, specialization: e.specialization, programme_count: idx < 2 ? 1 : 0,
      status:'active', created_at: new Date(),
    });
  });

  // 6. Programmes
  const programmes = [
    { title:'Digital Banking Foundations', category:'Fintech',
      description:'Core skills for modern banking transformation.', status:'active',
      start_date: new Date(Date.now() + 7*86400000), end_date: new Date(Date.now() + 77*86400000), capacity:30 },
    { title:'Leadership & Change Management', category:'Leadership',
      description:'Build high-performing teams through change.', status:'active',
      start_date: new Date(Date.now() - 14*86400000), end_date: new Date(Date.now() + 56*86400000), capacity:20 },
    { title:'Data Analytics for Managers', category:'Data',
      description:'Turn data into decisions.', status:'draft',
      start_date: null, end_date: null, capacity:25 },
  ];
  for (const p of programmes) {
    demo.programmes.push({
      id: nextId('programmes'), institution_id: acmeId, ...p, created_at: new Date(),
    });
  }
  const [p1, p2] = demo.programmes;

  // 7. Cohorts
  const cohortSeeds = [
    { programme: p1, name:'Digital Banking — Cohort A', capacity:30, status:'active',
      start_date:new Date(Date.now() + 7*86400000), end_date:new Date(Date.now() + 77*86400000), instructor: demo.instructors[0] },
    { programme: p2, name:'Leadership — Spring 2026', capacity:20, status:'active',
      start_date:new Date(Date.now() - 14*86400000), end_date:new Date(Date.now() + 56*86400000), instructor: demo.instructors[1] },
  ];
  for (const c of cohortSeeds) {
    demo.cohorts.push({
      id: nextId('cohorts'), institution_id: acmeId,
      programme_id: c.programme.id, name: c.name,
      instructor_id: c.instructor?.expert_id || null,
      instructor_name: c.instructor?.name || null,
      start_date: c.start_date, end_date: c.end_date,
      capacity: c.capacity, trainee_count: 0, status: c.status, created_at: new Date(),
    });
  }
  const [co1, co2] = demo.cohorts;

  // 8. Assessments
  demo.assessments.push(
    { id: nextId('assessments'), institution_id: acmeId, cohort_id: co1.id,
      title:'Module 1 Quiz', type:'quiz', weight:15,
      due_date:new Date(Date.now() + 14*86400000), status:'scheduled', created_at:new Date() },
    { id: nextId('assessments'), institution_id: acmeId, cohort_id: co1.id,
      title:'Mid-Programme Exam', type:'exam', weight:35,
      due_date:new Date(Date.now() + 42*86400000), status:'scheduled', created_at:new Date() },
    { id: nextId('assessments'), institution_id: acmeId, cohort_id: co2.id,
      title:'Leadership Case Study', type:'project', weight:25,
      due_date:new Date(Date.now() + 28*86400000), status:'scheduled', created_at:new Date() },
  );

  // 9. Capstone project
  demo.projects.push({
    id: nextId('projects'), institution_id: acmeId, cohort_id: co1.id,
    title:'Banking Transformation Capstone', category:'Project',
    description:'Design an end-to-end digital banking rollout plan.',
    deadline:new Date(Date.now() + 60*86400000), status:'active',
    submissions_count:0, created_at:new Date(),
  });

  // 10. Trainees
  const traineeSeeds = [
    { name:'Amina Yusuf',  email:'amina@acme.com',  progress:62, avg:78 },
    { name:'Peter Otieno', email:'peter@acme.com',  progress:44, avg:71 },
    { name:'Fatima Noor',  email:'fatima@acme.com', progress:88, avg:91 },
    { name:'David Kim',    email:'david@acme.com',  progress:15, avg:64 },
    { name:'Grace Wanjiku',email:'grace.w@acme.com',progress:100, avg:87 },
  ];
  for (const t of traineeSeeds) {
    demo.trainees.push({
      id: nextId('trainees'), institution_id: acmeId, user_id:null,
      name: t.name, email: t.email,
      programme_id: co1.programme_id, programme_title: p1.title,
      cohort_id: co1.id, cohort_name: co1.name,
      progress: t.progress, assessment_avg: t.avg,
      status: t.progress >= 100 ? 'completed' : 'active',
      created_at: new Date(),
    });
  }
  co1.trainee_count = traineeSeeds.length;

  // 11. Approval request
  demo.institutionReqs.push({
    id: nextId('institutionReqs'), institution_id: acmeId,
    title:'Add 10 more trainees to Cohort A',
    type:'capacity_change', requested_by: coordUser.name,
    status:'pending', created_at: new Date(),
  });

  // 12. Audit
  demo.institutionAudit.push(
    { id: nextId('institutionAudit'), institution_id: acmeId, actor_id: opsUser.id,
      actor_name: opsUser.name, action:'Created programme "Digital Banking Foundations"',
      meta:null, created_at: new Date(Date.now() - 3600*1000) },
    { id: nextId('institutionAudit'), institution_id: acmeId, actor_id: opsUser.id,
      actor_name: opsUser.name, action:'Invited coordinator Chris Coordinator',
      meta:null, created_at: new Date(Date.now() - 1800*1000) },
  );

  console.log(`[demo] seeded: ${demo.users.length} users, ${demo.courses.length} courses, ${demo.events.length} events`);
  console.log(`[demo] institutions: ${demo.institutions.length}, programmes: ${demo.programmes.length}, trainees: ${demo.trainees.length}`);
}

/* Extract logged-in user from JWT without touching a DB */
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
   DB CONNECTION — retry forever, non-blocking
   ============================================================ */
const dbState = {
  pool: null, connected: false, connecting: false,
  lastError: null, lastAttempt: null, lastSuccess: null,
  bootstrapped: false,
};

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
        waitForConnections: true,
        connectionLimit: config.db.poolSize,
        namedPlaceholders: true,
        timezone: 'Z',
        connectTimeout: 5000,
      });
    }
    const conn = await dbState.pool.getConnection();
    await conn.ping();
    conn.release();

    dbState.connected = true;
    dbState.lastSuccess = new Date();
    dbState.lastError = null;
    console.log(`[db] connected → ${config.db.host}:${config.db.port}/${config.db.database}`);

    if (demo.active && !demo.forced) {
      demo.active = false;
      console.log('[demo] disabled — real MySQL database is now in use');
    }

    if (!dbState.bootstrapped) {
      dbState.bootstrapped = true;
      try {
        if (config.db.bootstrapSchema) await bootstrapDatabase();
        if (config.db.seedDemo)        await seedDemoData();
      } catch (e) {
        console.error('[db] bootstrap/seed error:', e.message);
      }
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
    console.warn(`[db] connect failed: ${err.message} — retrying in ${config.db.retryMs}ms`);
    if (dbState.pool) { try { await dbState.pool.end(); } catch {} dbState.pool = null; }
    setTimeout(tryConnect, config.db.retryMs);
  } finally {
    dbState.connecting = false;
  }
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
  if (!fs.existsSync(schemaFile)) {
    console.warn('[db] database.sql not found — skipping schema bootstrap');
    return;
  }
  const schema = fs.readFileSync(schemaFile, 'utf8');
  const sanitized = schema.split('\n')
    .filter(l => !/^\s*(CREATE DATABASE|USE )/i.test(l)).join('\n');

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
    { name:'System Admin',     email:'admin@platform.com',   pwd:'admin123',   role:'admin',   status:'active', spec:'Platform Operations', rate:0  },
    { name:'Dr. Sarah Kimani', email:'expert@platform.com',  pwd:'expert123',  role:'expert',  status:'active', spec:'Data Science & AI',   rate:75 },
    { name:'John Mwangi',      email:'learner@platform.com', pwd:'learner123', role:'learner', status:'active', spec:null,                  rate:0  },
    { name:'Aisha Bello',      email:'aisha@platform.com',   pwd:'expert123',  role:'expert',  status:'active', spec:'Business Strategy',   rate:90 },
    { name:'Kwame Mensah',     email:'kwame@platform.com',   pwd:'expert123',  role:'expert',  status:'active', spec:'Full-Stack Dev',      rate:80 },
    { name:'Grace Ochieng',    email:'grace@platform.com',   pwd:'expert123',  role:'expert',  status:'active', spec:'UX Design',           rate:65 },
    { name:'Pending Expert',   email:'pending@platform.com', pwd:'expert123',  role:'expert',  status:'pending',spec:'Marketing',           rate:55 },
  ];
  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.pwd, 10);
    const [r] = await pool.query(
      `INSERT INTO users (name,email,password_hash,role,status,specialization,hourly_rate,average_rating,total_earnings,wallet_balance,intent)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'both')`,
      [u.name, u.email, hash, u.role, u.status, u.spec, u.rate,
       u.role==='expert'?4.7:0, u.role==='expert'?1250:0, u.role==='expert'?320:0]
    );
    await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  }
  const [expertRows] = await pool.query("SELECT id FROM users WHERE role='expert'");
  const expertIds = expertRows.map(r => r.id);

  const courseRows = [
    ['Full-Stack Web Development','Master modern web development from zero to hero.','Technology','bootcamp','intermediate',499,12,0,120],
    ['Data Science Bootcamp','Python, ML, and real-world projects.','Data','bootcamp','intermediate',599,14,0,140],
    ['React in 30 Days','Build production React apps fast.','Frontend','short_course','intermediate',99,0,30,30],
    ['Public Speaking Mastery','Command the room with confidence.','Soft Skills','short_course','beginner',49,0,12,12],
    ['Mathematics Tutoring','1-on-1 personalized math help.','Math','tuition','beginner',25,0,1,1],
    ['SAT Math Prep','Comprehensive SAT math bootcamp.','Test Prep','exam_prep','intermediate',39,0,20,20],
    ['Tech Career Roadmap','Navigate your tech career.','Career','career','beginner',79,0,2,2],
  ];
  for (const c of courseRows) {
    const [r] = await pool.query(
      `INSERT INTO courses (title,description,category,course_type,level,price,duration_weeks,duration_hours,total_lessons,expert_id,status)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'published')`,
      [...c, expertIds[Math.floor(Math.random()*expertIds.length)]||null]
    );
    for (let i=1;i<=5;i++) {
      await pool.query(
        `INSERT INTO lessons (course_id,title,content,position,duration_minutes) VALUES (?,?,?,?,?)`,
        [r.insertId, `Lesson ${i}`, `Content for lesson ${i}`, i, 20]
      );
    }
  }

  const eventRows = [
    ['Live Bootcamp: Intro to AI','Hands-on introduction to machine learning.','Technology',7,500,100,0],
    ['Career Webinar: Tech Jobs','How to break into tech in 2026.','Career',14,300,200,0],
    ['Design Thinking Workshop','Practical design thinking for teams.','Design',21,400,50,25],
  ];
  for (const [title,desc,cat,days,pay,cap,price] of eventRows) {
    await pool.query(
      `INSERT INTO events (title,description,category,date,expert_payment,capacity,price,status)
       VALUES (?,?,?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?,?,?, 'published')`,
      [title,desc,cat,days,pay,cap,price]
    );
  }

  await pool.query(
    `INSERT INTO coupons (code,discount_type,discount_value,max_uses,min_spend,applies_to,active) VALUES
     ('WELCOME10','percent',10,1000,0,'all',1),
     ('SAVE50','fixed',50,100,200,'all',1),
     ('BOOTCAMP20','percent',20,200,0,'bootcamp',1)`
  );
  await pool.query(
    `INSERT INTO notifications (title,message,type) VALUES
     ('Welcome to ExpertHub','Your account is ready. Explore the platform!','info'),
     ('New event','Live Bootcamp: Intro to AI has been added.','info')`
  );

  /* ---- Seed a demo institution ---- */
  try {
    const [inst] = await pool.query(
      `INSERT INTO institutions (name,type,industry,contact_email,contact_phone,address,status,default_capacity,pass_mark)
       VALUES ('Acme Academy','corporate','Banking & Fintech','ops@acme.com','+254 700 000 000','Nairobi, Kenya','active',30,70)`
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

    // Coordinator
    const hash2 = await bcrypt.hash('coord123', 10);
    const [coord] = await pool.query(
      `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,intent)
       VALUES ('Chris Coordinator','coord@acme.com',?,'institution','active',?, 'coordinator','both')`,
      [hash2, instId]
    );
    await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [coord.insertId]);

    // Programmes
    const [p1] = await pool.query(
      `INSERT INTO programmes (institution_id,title,description,category,status,start_date,end_date,capacity)
       VALUES (?, 'Digital Banking Foundations','Core skills for modern banking transformation.','Fintech','active',
               DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 77 DAY), 30)`,
      [instId]
    );
    const [p2] = await pool.query(
      `INSERT INTO programmes (institution_id,title,description,category,status,start_date,end_date,capacity)
       VALUES (?, 'Leadership & Change Management','Build high-performing teams through change.','Leadership','active',
               DATE_SUB(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 56 DAY), 20)`,
      [instId]
    );
    await pool.query(
      `INSERT INTO programmes (institution_id,title,description,category,status,capacity)
       VALUES (?, 'Data Analytics for Managers','Turn data into decisions.','Data','draft', 25)`,
      [instId]
    );

    // Cohorts
    await pool.query(
      `INSERT INTO cohorts (institution_id,programme_id,name,start_date,end_date,capacity,status)
       VALUES (?,?, 'Digital Banking — Cohort A', DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 77 DAY), 30, 'active')`,
      [instId, p1.insertId]
    );
    await pool.query(
      `INSERT INTO cohorts (institution_id,programme_id,name,start_date,end_date,capacity,status)
       VALUES (?,?, 'Leadership — Spring 2026', DATE_SUB(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 56 DAY), 20, 'active')`,
      [instId, p2.insertId]
    );

    console.log('[db] demo institution seeded (ops@acme.com / ops123)');
  } catch (e) {
    console.warn('[db] institution seed skipped:', e.message);
  }

  console.log('[db] demo data seeded');
}

/* ============================================================
   EXPRESS APP
   ============================================================ */
const now = () => new Date();
const genRef = (p='TX') => `${p}-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;
const asyncH = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

const app = express();
app.set('trust proxy', 1);
app.use(compression());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isProd ? 'combined' : 'dev'));

/* Uploads */
fs.mkdirSync(config.uploads.dir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req,_f,cb) => cb(null, config.uploads.dir),
  filename: (_req,f,cb) => cb(null, `${Date.now()}-${nanoid(8)}${path.extname(f.originalname)}`),
});
const ALLOWED_MIME = new Set([
  'image/jpeg','image/png','image/webp','image/gif',
  'application/pdf','text/plain',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
]);
const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxFileSize },
  fileFilter: (_req,f,cb) => ALLOWED_MIME.has(f.mimetype) ? cb(null,true) : cb(new Error('File type not allowed')),
});
app.use('/uploads', express.static(config.uploads.dir));

/* Rate limits */
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, message:{ error:'Too many login attempts' } });
const apiLimiter   = rateLimit({ windowMs: 60*1000, max: 300 });
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/forgot', loginLimiter);

/* Validation helper */
const validate = (req,res,next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, errors: errs.array() });
  next();
};

/* JWT auth middleware */
function auth(roles=null) {
  return (req,res,next) => {
    const h = req.headers.authorization || '';
    const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!tok) return res.status(401).json({ error:'No token' });
    try {
      const payload = jwt.verify(tok, config.jwt.secret);
      req.user = payload;
      if (roles && !roles.includes(payload.role)) return res.status(403).json({ error:'Forbidden' });
      next();
    } catch { return res.status(401).json({ error:'Invalid or expired token' }); }
  };
}

/* ---------- HEALTH ---------- */
app.get('/api/health', (req,res) => {
  res.json({
    ok: true,
    env: config.env,
    uptime: process.uptime(),
    demo_mode: demo.active,
    db: {
      configured: config.db.enabled,
      connected:  dbState.connected,
      last_attempt: dbState.lastAttempt,
      last_success: dbState.lastSuccess,
      last_error:   dbState.lastError,
    },
    counts: demo.active ? {
      users:        demo.users.length,
      experts:      demo.users.filter(u => u.role === 'expert').length,
      institutions: demo.institutions.length,
      programmes:   demo.programmes.length,
      trainees:     demo.trainees.length,
    } : undefined,
    time: new Date().toISOString(),
  });
});

/* ============================================================
   DEMO ROUTER — handles ALL requests while demo.active === true
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

  /* ============================================================
     AUTH
     ============================================================ */
  if (method === 'POST' && p === '/auth/login') {
    const { email, password } = req.body || {};
    const user = demo.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error:'Invalid email or password' }), true;
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error:'Invalid email or password' }), true;
    if (user.status === 'pending')   return res.status(403).json({ error:'Account pending admin approval' }), true;
    if (user.status === 'suspended') return res.status(403).json({ error:'Account suspended' }), true;
    if (user.status === 'rejected')  return res.status(403).json({ error:'Account rejected. Contact support.' }), true;

    const token   = jwt.sign({ id:user.id, role:user.role, email:user.email }, config.jwt.secret,        { expiresIn: config.jwt.expiresIn });
    const refresh = jwt.sign({ id:user.id },                                     config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
    demo.refreshTokens.push({ id: nextId('refreshTokens'), user_id: user.id, token: refresh, revoked: 0, expires_at: new Date(Date.now() + 30*86400000) });

    user.last_login_at = new Date();
    const { password_hash, ...safe } = user;
    return res.json({ token, refresh, user: safe, _demo: true }), true;
  }

  if (method === 'POST' && p === '/auth/register') {
    const { name, email, password, phone='', role='learner', extra={} } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error:'name, email, password required' }), true;
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error:'Email already registered' }), true;

    const safeRole = role === 'admin' ? 'learner' : role;
    const status   = safeRole === 'learner' ? 'active' : 'pending';

    const hash = await bcrypt.hash(password, 10);
    const id   = nextId('users');

    const user = {
      id, name, email, password_hash: hash, phone, role: safeRole, status,
      specialization: extra.specialization || null,
      hourly_rate: extra.hourly_rate || 0,
      bio: extra.bio || null,
      avatar: null, wallet_balance: 0, total_earnings: 0, average_rating: 0,
      created_at: new Date(), last_login_at: null,
      timezone:'UTC', theme:'light', language:'en',
      intent: 'both',
      institution_id: null, institution_role: null,
    };
    demo.users.push(user);
    demo.notificationPrefs.push({ user_id: id, email_notifications:1, push_notifications:1, marketing:0 });

    if (safeRole === 'institution') {
      const instId = nextId('institutions');
      demo.institutions.push({
        id: instId,
        name: extra.institution_name || name + "'s Institution",
        type: extra.institution_type || 'corporate',
        industry: extra.industry || '',
        contact_email: email,
        contact_phone: phone,
        address: '',
        ops_manager_id: id,
        ops_manager_name: name,
        ops_manager_email: email,
        status: 'pending',
        default_capacity: 30,
        pass_mark: 70,
        created_at: new Date(),
      });
      user.institution_id = instId;
      user.institution_role = 'operations_manager';
    }

    for (const a of demo.users.filter(u => u.role === 'admin')) {
      demo.notifications.push({
        id: nextId('notifications'), user_id: a.id,
        title:'New registration',
        message:`${name} (${safeRole}) registered.`,
        type:'info', link: safeRole === 'institution' ? '/admin/institutions' : '/admin/users',
        is_read: 0, created_at: new Date(),
      });
    }

    return res.status(201).json({
      id, status,
      message: status === 'active'
        ? 'Account created. You can log in now.'
        : safeRole === 'institution'
          ? 'Institution registered. Awaiting admin verification.'
          : 'Registration successful. Awaiting admin approval.',
    }), true;
  }

  if (method === 'GET' && p === '/auth/me') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { password_hash, ...safe } = user;
    return res.json({ user: safe }), true;
  }

  if (method === 'POST' && p === '/auth/refresh') {
    const { refresh } = req.body || {};
    if (!refresh) return res.status(400).json({ error:'Refresh token required' }), true;
    try {
      const payload = jwt.verify(refresh, config.jwt.refreshSecret);
      const rt = demo.refreshTokens.find(t => t.token === refresh && !t.revoked);
      if (!rt) return res.status(401).json({ error:'Refresh token revoked or expired' }), true;
      const user = demo.users.find(u => u.id === payload.id);
      if (!user || user.status !== 'active') return res.status(403).json({ error:'Account not active' }), true;
      const token = jwt.sign({ id:user.id, role:user.role, email:user.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
      return res.json({ token }), true;
    } catch { return res.status(401).json({ error:'Invalid refresh token' }), true; }
  }

  if (method === 'POST' && p === '/auth/logout') {
    const { refresh } = req.body || {};
    if (refresh) {
      const rt = demo.refreshTokens.find(t => t.token === refresh);
      if (rt) rt.revoked = 1;
    }
    return res.json({ ok:true }), true;
  }

  if (method === 'POST' && p === '/auth/forgot') {
    return res.json({ ok:true, message:'If the email exists, a reset link was sent. (demo)' }), true;
  }
  if (method === 'POST' && p === '/auth/reset') {
    return res.json({ ok:true, message:'Password reset ignored in demo mode.' }), true;
  }
  if (method === 'PUT' && p === '/auth/password') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { old_password, new_password } = req.body || {};
    const ok = await bcrypt.compare(old_password || '', user.password_hash);
    if (!ok) return res.status(400).json({ error:'Current password is incorrect' }), true;
    user.password_hash = await bcrypt.hash(new_password, 10);
    return res.json({ ok:true }), true;
  }

  /* ============================================================
     COMMON
     ============================================================ */
  if (method === 'GET' && p === '/common/notifications') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const mine = demo.notifications.filter(n => n.user_id === null || n.user_id === user.id);
    const rows = [...mine].sort((a,b) => b.created_at - a.created_at).slice(0, limit);
    const unread = mine.filter(n => !n.is_read).length;
    return res.json({ notifications: rows, unread }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/common\/notifications\/(\d+)\/read$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const n = demo.notifications.find(x => x.id === Number(m[1]) && (x.user_id === null || x.user_id === user.id));
    if (n) n.is_read = 1;
    return res.json({ ok:true }), true;
  }
  if (method === 'PUT' && p === '/common/notifications/read-all') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    demo.notifications.forEach(n => { if (n.user_id === user.id) n.is_read = 1; });
    return res.json({ ok:true }), true;
  }

  if (method === 'GET' && p === '/common/events') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const events = demo.events
      .filter(e => e.status === 'published')
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .map(e => ({
        ...e,
        expert_name: e.expert_id ? (demo.users.find(u => u.id === e.expert_id)?.name || null) : null,
        registered_count: demo.eventRegistrations.filter(r => r.event_id === e.id && r.status === 'registered').length,
      }));
    return res.json({ events }), true;
  }
  if (method === 'POST' && (m = p.match(/^\/common\/events\/(\d+)\/register$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const eventId = Number(m[1]);
    const ev = demo.events.find(e => e.id === eventId);
    if (!ev) return res.status(404).json({ error:'Event not found' }), true;
    const existing = demo.eventRegistrations.find(r => r.event_id === eventId && r.user_id === user.id);
    if (existing) existing.status = 'registered';
    else demo.eventRegistrations.push({ id: nextId('eventRegistrations'), event_id: eventId, user_id: user.id, status: 'registered', created_at: new Date() });
    demo.notifications.push({ id: nextId('notifications'), user_id: user.id, title:'Event registered', message:`You're registered for "${ev.title}".`, type:'info', link:null, is_read:0, created_at:new Date() });
    return res.json({ ok:true }), true;
  }

  /* ============================================================
     ESCHOOL / COURSES
     ============================================================ */
  if (method === 'GET' && p === '/eschool/courses') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const type = req.query.type || null;
    const q    = req.query.q || null;
    const page = Math.max(Number(req.query.page || 1), 1);
    const per  = Math.min(Number(req.query.per || 20), 100);
    let list = demo.courses.filter(c => c.status === 'published');
    if (type) list = list.filter(c => c.course_type === type);
    if (q)    list = list.filter(c =>
      (c.title || '').toLowerCase().includes(String(q).toLowerCase()) ||
      (c.description || '').toLowerCase().includes(String(q).toLowerCase()));
    const total = list.length;
    const paged = list.slice((page-1)*per, page*per).map(c => ({
      ...c, expert_name: c.expert_id ? (demo.users.find(u => u.id === c.expert_id)?.name || null) : null,
    }));
    return res.json({ courses: paged, total, page, pages: Math.max(1, Math.ceil(total/per)) }), true;
  }
  if (method === 'GET' && (m = p.match(/^\/eschool\/courses\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const c = demo.courses.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error:'Course not found' }), true;
    const lessons = demo.lessons.filter(l => l.course_id === c.id).sort((a,b) => a.position - b.position);
    return res.json({
      course: { ...c, expert_name: c.expert_id ? (demo.users.find(u => u.id === c.expert_id)?.name || null) : null },
      lessons,
    }), true;
  }
  if (method === 'POST' && p === '/eschool/enroll') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { course_id, coupon_code } = req.body || {};
    const c = demo.courses.find(x => x.id === Number(course_id));
    if (!c) return res.status(404).json({ error:'Course not found' }), true;

    let price = Number(c.price);
    let discount = 0;
    if (coupon_code) {
      const cp = demo.coupons.find(x => x.code === coupon_code && x.active);
      if (!cp) return res.status(400).json({ error:'Invalid coupon' }), true;
      if (cp.max_uses && cp.used_count >= cp.max_uses) return res.status(400).json({ error:'Coupon usage limit reached' }), true;
      if (Number(cp.min_spend) > price) return res.status(400).json({ error:'Minimum spend not met' }), true;
      if (cp.applies_to !== 'all' && !String(c.course_type).includes(cp.applies_to)) return res.status(400).json({ error:'Coupon not valid for this item' }), true;
      discount = cp.discount_type === 'percent'
        ? price * (Number(cp.discount_value) / 100)
        : Number(cp.discount_value);
      discount = Math.min(discount, price);
      cp.used_count++;
    }
    const finalPrice = price - discount;

    if (finalPrice > 0) {
      user.wallet_balance = Number(user.wallet_balance) - finalPrice;
      demo.walletLedger.push({ id: nextId('walletLedger'), user_id: user.id, amount: -finalPrice, balance_after: user.wallet_balance, reason: `Enrollment: ${c.title}`, reference: null, created_at: new Date() });
      demo.transactions.push({ id: nextId('transactions'), user_id: user.id, reference: genRef('ENR'), description: c.title, amount: finalPrice, provider: 'wallet', status: 'succeeded', direction: 'out', created_at: new Date() });
      if (c.expert_id) {
        const expert = demo.users.find(u => u.id === c.expert_id);
        if (expert) {
          const cut = finalPrice * ((100 - config.platform.commission) / 100);
          expert.wallet_balance = Number(expert.wallet_balance) + cut;
          expert.total_earnings = Number(expert.total_earnings) + cut;
          demo.walletLedger.push({ id: nextId('walletLedger'), user_id: expert.id, amount: cut, balance_after: expert.wallet_balance, reason: `Course sale: ${c.title}`, reference: null, created_at: new Date() });
        }
      }
    }
    const id = nextId('enrollments');
    demo.enrollments.push({
      id, user_id: user.id, course_id: c.id, enrollment_type: c.course_type,
      reference_id: c.id, title: c.title, progress: 0, status: 'active',
      created_at: new Date(), certificate_id: null,
    });
    return res.status(201).json({ id, paid: finalPrice, discount }), true;
  }

  if (method === 'GET' && p === '/user/enrollments') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const rows = demo.enrollments
      .filter(e => e.user_id === user.id)
      .sort((a,b) => b.created_at - a.created_at)
      .map(e => ({ ...e, thumbnail: null, total_lessons: demo.lessons.filter(l => l.course_id === e.course_id).length }));
    return res.json({ enrollments: rows }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/user\/enrollments\/(\d+)\/progress$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { progress } = req.body || {};
    const enr = demo.enrollments.find(e => e.id === Number(m[1]) && e.user_id === user.id);
    if (!enr) return res.status(404).json({ error:'Enrollment not found' }), true;
    enr.progress = progress;
    if (progress >= 100) {
      enr.status = 'completed';
      const serial = `EH-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;
      const hash = Buffer.from(`${user.id}:${serial}`).toString('base64');
      const certId = nextId('certificates');
      demo.certificates.push({ id: certId, user_id: user.id, course_title: enr.title, serial, verification_hash: hash, issued_at: new Date() });
      enr.certificate_id = certId;
    }
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/user/certificates') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const certs = demo.certificates.filter(c => c.user_id === user.id).sort((a,b) => b.issued_at - a.issued_at);
    return res.json({ certificates: certs }), true;
  }

  /* ============================================================
     EXPERTS
     ============================================================ */
  if (method === 'GET' && p === '/user/experts') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const list = demo.users
      .filter(u => u.role === 'expert' && u.status === 'active')
      .map(u => ({
        id: u.id, name: u.name, email: u.email, avatar: u.avatar, bio: u.bio,
        specialization: u.specialization, hourly_rate: u.hourly_rate, average_rating: u.average_rating,
      }));
    return res.json({ experts: list, total: list.length, page: 1, pages: 1 }), true;
  }
  if (method === 'GET' && (m = p.match(/^\/user\/experts\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const e = demo.users.find(u => u.id === Number(m[1]) && u.role === 'expert');
    if (!e) return res.status(404).json({ error:'Expert not found' }), true;
    const reviews = demo.reviews.filter(r => r.expert_id === e.id && r.status === 'published')
      .map(r => ({ ...r, author_name: demo.users.find(u => u.id === r.author_id)?.name || null }));
    const availability = demo.availability.filter(a => a.expert_id === e.id);
    return res.json({
      expert: {
        id: e.id, name: e.name, email: e.email, avatar: e.avatar, bio: e.bio,
        specialization: e.specialization, hourly_rate: e.hourly_rate, average_rating: e.average_rating,
      },
      reviews, availability,
    }), true;
  }

  /* ============================================================
     EXPERT PANEL
     ============================================================ */
  if (method === 'GET' && p === '/expert/earnings') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({
      summary: {
        total_earned: Number(user.total_earnings) || 0,
        available_balance: Number(user.wallet_balance) || 0,
        total_paid_out: 0,
        pending_balance: 0,
      },
      ledger: demo.walletLedger.filter(l => l.user_id === user.id).sort((a,b) => b.created_at - a.created_at).slice(0, 30),
    }), true;
  }
  if (method === 'GET' && p === '/expert/dashboard-stats') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({
      stats: {
        total_consultations: demo.consultations.filter(c => c.expert_id === user.id).length,
        active_consultations: demo.consultations.filter(c => c.expert_id === user.id && ['assigned','in_progress'].includes(c.status)).length,
        total_courses: demo.courses.filter(c => c.expert_id === user.id).length,
        total_event_registrations: demo.eventRegistrations.filter(r => {
          const e = demo.events.find(x => x.id === r.event_id);
          return e && e.expert_id === user.id;
        }).length,
      },
    }), true;
  }
  if (method === 'GET' && p === '/expert/reviews') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    const reviews = demo.reviews.filter(r => r.expert_id === user.id)
      .map(r => ({ ...r, author_name: demo.users.find(u => u.id === r.author_id)?.name || null }));
    return res.json({ reviews }), true;
  }
  if (method === 'GET' && p === '/expert/availability') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ availability: demo.availability.filter(a => a.expert_id === user.id) }), true;
  }
  if (method === 'PUT' && p === '/expert/availability') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    const { schedule = [] } = req.body || {};
    demo.availability = demo.availability.filter(a => a.expert_id !== user.id);
    for (const s of schedule) {
      demo.availability.push({ id: nextId('availability'), expert_id: user.id, day_of_week: s.day, start_time: s.start, end_time: s.end, active: 1 });
    }
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/expert/withdrawals') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ payouts: demo.payouts.filter(x => x.expert_id === user.id) }), true;
  }
  if (method === 'POST' && p === '/expert/withdrawals') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    const { amount, method: payMethod, account_details = {} } = req.body || {};
    if (Number(amount) < config.platform.minPayout) return res.status(400).json({ error:`Minimum withdrawal is ${config.platform.minPayout}` }), true;
    if (Number(user.wallet_balance) < Number(amount)) return res.status(400).json({ error:'Insufficient balance' }), true;
    user.wallet_balance = Number(user.wallet_balance) - Number(amount);
    demo.walletLedger.push({ id: nextId('walletLedger'), user_id: user.id, amount: -Number(amount), balance_after: user.wallet_balance, reason: 'Withdrawal request', reference: null, created_at: new Date() });
    const id = nextId('payouts');
    demo.payouts.push({ id, expert_id: user.id, amount: Number(amount), method: payMethod, account_details: JSON.stringify(account_details), status: 'pending', rejection_reason: null, processed_at: null, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'GET' && p === '/expert/time-off') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ timeOff: demo.timeOff.filter(t => t.expert_id === user.id) }), true;
  }
  if (method === 'POST' && p === '/expert/time-off') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    const { start_date, end_date, reason='' } = req.body || {};
    const id = nextId('timeOff');
    demo.timeOff.push({ id, expert_id: user.id, start_date, end_date, reason, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && p === '/expert/profile') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    const { specialization, hourly_rate, bio } = req.body || {};
    if (specialization !== undefined) user.specialization = specialization;
    if (hourly_rate   !== undefined) user.hourly_rate   = hourly_rate;
    if (bio           !== undefined) user.bio           = bio;
    return res.json({ ok:true }), true;
  }
  if (method === 'POST' && p === '/expert/courses') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    const b = req.body || {};
    const id = nextId('courses');
    demo.courses.push({
      id, title:b.title, description:b.description || '', category: b.category || 'General',
      course_type: b.course_type || 'short_course', level: b.level || 'beginner',
      price: Number(b.price || 0), duration_weeks:0, duration_hours:0, total_lessons:0,
      expert_id: user.id, status:'draft', thumbnail:null, created_at:new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'POST' && (m = p.match(/^\/expert\/reviews\/(\d+)\/reply$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'expert') return res.status(403).json({ error:'Forbidden' }), true;
    const review = demo.reviews.find(r => r.id === Number(m[1]) && r.expert_id === user.id);
    if (!review) return res.status(404).json({ error:'Review not found' }), true;
    review.reply = req.body?.reply || '';
    review.replied_at = new Date();
    return res.json({ ok:true }), true;
  }

  /* ============================================================
     ADMIN PANEL
     ============================================================ */
  if (method === 'GET' && p === '/admin/users') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const list = demo.users.map(({ password_hash, ...u }) => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
      status: u.status, avatar: u.avatar, created_at: u.created_at, last_login_at: u.last_login_at,
    }));
    return res.json({ users: list, total: list.length, page: 1, pages: 1 }), true;
  }
  if (method === 'GET' && p === '/admin/experts') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const experts = demo.users.filter(u => u.role === 'expert').map(({ password_hash, ...u }) => u);
    return res.json({ experts, total: experts.length, page: 1, pages: 1 }), true;
  }
  if (method === 'GET' && p === '/admin/analytics') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({
      totals: {
        total_users: demo.users.length,
        active_experts: demo.users.filter(u => u.role === 'expert' && u.status === 'active').length,
        pending_users: demo.users.filter(u => u.status === 'pending').length,
        active_consultations: demo.consultations.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length,
        total_revenue: demo.transactions.filter(t => t.status === 'succeeded' && t.direction === 'in').reduce((s,t) => s + Number(t.amount), 0),
        published_courses: demo.courses.filter(c => c.status === 'published').length,
        published_events: demo.events.filter(e => e.status === 'published').length,
        institutions: demo.institutions.length,
        programmes: demo.programmes.length,
        trainees: demo.trainees.length,
      },
      usersByRole: ['admin','expert','institution','learner'].map(role => ({
        role, c: demo.users.filter(u => u.role === role).length,
      })),
      revenueByMonth: [], usersByMonth: [],
      topExperts: demo.users.filter(u => u.role === 'expert')
        .map(u => ({ id: u.id, name: u.name, average_rating: u.average_rating, total_earnings: u.total_earnings })),
    }), true;
  }
  if (method === 'GET' && p === '/admin/transactions') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const rows = demo.transactions.map(t => ({ ...t, user_name: demo.users.find(u => u.id === t.user_id)?.name || null }));
    return res.json({ transactions: rows, total: rows.length, page: 1, pages: 1 }), true;
  }
  if (method === 'GET' && p === '/admin/payouts') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const rows = demo.payouts.map(p => ({
      ...p,
      expert_name: demo.users.find(u => u.id === p.expert_id)?.name || null,
      expert_email: demo.users.find(u => u.id === p.expert_id)?.email || null,
    }));
    return res.json({ payouts: rows }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/payouts\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const payout = demo.payouts.find(x => x.id === Number(m[1]));
    if (!payout) return res.status(404).json({ error:'Payout not found' }), true;
    const { status, reason } = req.body || {};
    if (status) payout.status = status;
    if (reason) payout.rejection_reason = reason;
    if (status === 'paid') payout.processed_at = new Date();
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/admin/coupons') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ coupons: demo.coupons }), true;
  }
  if (method === 'POST' && p === '/admin/coupons') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const b = req.body || {};
    if (!b.code) return res.status(400).json({ error:'Code required' }), true;
    if (demo.coupons.find(c => c.code === b.code)) return res.status(409).json({ error:'Code already exists' }), true;
    const id = nextId('coupons');
    demo.coupons.push({
      id, code: b.code, discount_type: b.discount_type || 'percent',
      discount_value: Number(b.discount_value || 0),
      max_uses: b.max_uses || null, used_count: 0,
      min_spend: Number(b.min_spend || 0),
      applies_to: b.applies_to || 'all',
      active: 1, expires_at: b.expires_at || null, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/coupons\/(\d+)\/toggle$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const c = demo.coupons.find(x => x.id === Number(m[1]));
    if (c) c.active = c.active ? 0 : 1;
    return res.json({ ok:true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/admin\/coupons\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    demo.coupons = demo.coupons.filter(x => x.id !== Number(m[1]));
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/admin/claims') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ claims: demo.claims }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/claims\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const claim = demo.claims.find(x => x.id === Number(m[1]));
    if (!claim) return res.status(404).json({ error:'Claim not found' }), true;
    Object.assign(claim, req.body || {});
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/admin/tickets') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ tickets: demo.tickets }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/tickets\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const t = demo.tickets.find(x => x.id === Number(m[1]));
    if (!t) return res.status(404).json({ error:'Ticket not found' }), true;
    Object.assign(t, req.body || {});
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/admin/reviews') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ reviews: demo.reviews }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/reviews\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const r = demo.reviews.find(x => x.id === Number(m[1]));
    if (!r) return res.status(404).json({ error:'Review not found' }), true;
    Object.assign(r, req.body || {});
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/admin/audit-logs') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ logs: demo.auditLogs }), true;
  }
  if (method === 'GET' && p === '/admin/settings') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ settings: demo.settings }), true;
  }
  if (method === 'PUT' && p === '/admin/settings') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    Object.assign(demo.settings, req.body.settings || {});
    return res.json({ ok:true }), true;
  }

  if (method === 'POST' && p === '/admin/events') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const b = req.body || {};
    const id = nextId('events');
    demo.events.push({
      id, title: b.title, description: b.description || '', category: b.category || 'General',
      expert_id: b.expert_id || null, date: b.date || null,
      start_time: b.start_time || null, end_time: b.end_time || null,
      location: b.location || '', meeting_url: b.meeting_url || '',
      capacity: b.capacity || 100, price: b.price || 0, expert_payment: b.expert_payment || 0,
      status: 'published', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/events\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const ev = demo.events.find(e => e.id === Number(m[1]));
    if (!ev) return res.status(404).json({ error:'Event not found' }), true;
    Object.assign(ev, req.body || {});
    return res.json({ ok:true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/admin\/events\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const idx = demo.events.findIndex(e => e.id === Number(m[1]));
    if (idx >= 0) demo.events.splice(idx, 1);
    return res.json({ ok:true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/users\/(\d+)\/approve$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (u) u.status = 'active';
    return res.json({ ok:true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/users\/(\d+)\/suspend$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (u) u.status = 'suspended';
    return res.json({ ok:true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/users\/(\d+)\/reject$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (u) u.status = 'rejected';
    return res.json({ ok:true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/users\/(\d+)$/))) {
    const admin = currentDemoUser(req);
    if (!admin) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (admin.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (!u) return res.status(404).json({ error:'User not found' }), true;
    const { name, role, status } = req.body || {};
    if (name)   u.name = name;
    if (role)   u.role = role;
    if (status) u.status = status;
    return res.json({ ok:true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/admin\/users\/(\d+)$/))) {
    const admin = currentDemoUser(req);
    if (!admin) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (admin.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    demo.users = demo.users.filter(x => x.id !== Number(m[1]));
    return res.json({ ok:true }), true;
  }
  if (method === 'POST' && p === '/admin/experts/create') {
    const admin = currentDemoUser(req);
    if (!admin) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (admin.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const { name, email, specialization, hourly_rate, bio, phone } = req.body || {};
    if (!name || !email) return res.status(400).json({ error:'Name and email required' }), true;
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error:'Email already registered' }), true;
    const tempPwd = nanoid(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const id = nextId('users');
    demo.users.push({
      id, name, email, password_hash: hash, phone: phone||'',
      role:'expert', status:'active', specialization, hourly_rate: Number(hourly_rate||0), bio,
      avatar:null, wallet_balance:0, total_earnings:0, average_rating:0,
      created_at:new Date(), last_login_at:null,
      timezone:'UTC', theme:'light', language:'en', intent:'both',
    });
    demo.notificationPrefs.push({ user_id:id, email_notifications:1, push_notifications:1, marketing:0 });
    return res.status(201).json({ id, temp_password: tempPwd }), true;
  }
  if (method === 'POST' && p === '/admin/notifications/broadcast') {
    const admin = currentDemoUser(req);
    if (!admin) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (admin.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const { title, message, audience='all' } = req.body || {};
    if (!title || !message) return res.status(400).json({ error:'Title and message required' }), true;
    let targets = demo.users;
    if (audience === 'experts')      targets = targets.filter(u => u.role === 'expert');
    if (audience === 'learners')     targets = targets.filter(u => u.role === 'learner');
    if (audience === 'institutions') targets = targets.filter(u => u.role === 'institution');
    if (audience === 'admins')       targets = targets.filter(u => u.role === 'admin');
    let sent = 0;
    for (const u of targets) {
      demo.notifications.push({ id: nextId('notifications'), user_id:u.id, title, message, type:'broadcast', link:null, is_read:0, created_at:new Date() });
      sent++;
    }
    return res.json({ ok:true, sent }), true;
  }

  /* ============================================================
     ADMIN — INSTITUTIONS
     ============================================================ */
  if (method === 'GET' && p === '/admin/institutions') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const list = demo.institutions.map(i => ({
      ...i,
      programme_count: demo.programmes.filter(x => x.institution_id === i.id).length,
    }));
    return res.json({ institutions: list }), true;
  }
  if (method === 'POST' && p === '/admin/institutions') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error:'Institution name required' }), true;
    const id = nextId('institutions');
    demo.institutions.push({
      id,
      name: b.name, type: b.type || 'corporate', industry: b.industry || '',
      contact_email: b.contact_email || '', contact_phone: b.contact_phone || '',
      address: b.address || '',
      ops_manager_id: null, ops_manager_name: null, ops_manager_email: null,
      status: 'pending', default_capacity: 30, pass_mark: 70, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/institutions\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const inst = demo.institutions.find(i => i.id === Number(m[1]));
    if (!inst) return res.status(404).json({ error:'Institution not found' }), true;
    const b = req.body || {};
    for (const k of ['name','type','industry','contact_email','contact_phone','address']) {
      if (b[k] !== undefined) inst[k] = b[k];
    }
    return res.json({ ok:true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/institutions\/(\d+)\/(approve|reject|suspend)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const inst = demo.institutions.find(i => i.id === Number(m[1]));
    if (!inst) return res.status(404).json({ error:'Institution not found' }), true;
    const action = m[2];
    inst.status = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'suspended';
    if (inst.ops_manager_id) {
      const u = demo.users.find(x => x.id === inst.ops_manager_id);
      if (u) u.status = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'suspended';
    }
    return res.json({ ok:true, status: inst.status }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/admin\/institutions\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const id = Number(m[1]);
    demo.institutions = demo.institutions.filter(i => i.id !== id);
    demo.programmes    = demo.programmes.filter(x => x.institution_id !== id);
    demo.cohorts       = demo.cohorts.filter(x => x.institution_id !== id);
    demo.assessments   = demo.assessments.filter(x => x.institution_id !== id);
    demo.projects      = demo.projects.filter(x => x.institution_id !== id);
    demo.trainees      = demo.trainees.filter(x => x.institution_id !== id);
    demo.instructors   = demo.instructors.filter(x => x.institution_id !== id);
    demo.institutionTeam = demo.institutionTeam.filter(x => x.institution_id !== id);
    return res.json({ ok:true }), true;
  }
  if (method === 'POST' && (m = p.match(/^\/admin\/institutions\/(\d+)\/ops-manager$/))) {
    const admin = currentDemoUser(req);
    if (!admin) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (admin.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    const inst = demo.institutions.find(i => i.id === Number(m[1]));
    if (!inst) return res.status(404).json({ error:'Institution not found' }), true;
    const { name, email } = req.body || {};
    if (!name || !email) return res.status(400).json({ error:'name and email required' }), true;
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error:'Email already registered' }), true;

    const tempPwd = nanoid(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const uid  = nextId('users');
    demo.users.push({
      id: uid, name, email, password_hash: hash, phone:'',
      role:'institution', status:'active',
      specialization:null, hourly_rate:0, bio:null, avatar:null,
      institution_id: inst.id, institution_role:'operations_manager',
      wallet_balance:0, total_earnings:0, average_rating:0,
      created_at:new Date(), last_login_at:null,
      timezone:'UTC', theme:'light', language:'en', intent:'both',
    });
    demo.notificationPrefs.push({ user_id: uid, email_notifications:1, push_notifications:1, marketing:0 });
    inst.ops_manager_id = uid;
    inst.ops_manager_name = name;
    inst.ops_manager_email = email;
    return res.status(201).json({ id: uid, temp_password: tempPwd }), true;
  }

  /* ============================================================
     USER WALLET / PROFILE / PREFS / REVIEWS
     ============================================================ */
  if (method === 'GET' && p === '/user/wallet') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const ledger = demo.walletLedger.filter(l => l.user_id === user.id).sort((a,b) => b.created_at - a.created_at).slice(0, 30);
    return res.json({ balance: Number(user.wallet_balance) || 0, ledger }), true;
  }
  if (method === 'POST' && p === '/user/wallet/topup') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { amount, provider } = req.body || {};
    const ref = genRef('TOP');
    user.wallet_balance = Number(user.wallet_balance) + Number(amount);
    demo.transactions.push({ id: nextId('transactions'), user_id: user.id, reference: ref, description: 'Wallet top-up', amount, provider, status: 'succeeded', direction: 'in', created_at: new Date() });
    demo.walletLedger.push({ id: nextId('walletLedger'), user_id: user.id, amount: Number(amount), balance_after: user.wallet_balance, reason: 'Wallet top-up', reference: ref, created_at: new Date() });
    return res.json({ ok:true, balance: user.wallet_balance, reference: ref }), true;
  }
  if (method === 'GET' && p === '/user/transactions') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    return res.json({ transactions: demo.transactions.filter(t => t.user_id === user.id) }), true;
  }
  if (method === 'GET' && p === '/user/notification-prefs') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    let p = demo.notificationPrefs.find(x => x.user_id === user.id);
    if (!p) { p = { user_id: user.id, email_notifications:1, push_notifications:1, marketing:0 }; demo.notificationPrefs.push(p); }
    return res.json({ prefs: p }), true;
  }
  if (method === 'PUT' && p === '/user/notification-prefs') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    let p = demo.notificationPrefs.find(x => x.user_id === user.id);
    if (!p) { p = { user_id: user.id }; demo.notificationPrefs.push(p); }
    Object.assign(p, req.body);
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/user/preferences') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    return res.json({ intent: user.intent || 'both' }), true;
  }
  if (method === 'PUT' && p === '/user/preferences') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { intent } = req.body || {};
    if (intent && ['learn','consult','both'].includes(intent)) user.intent = intent;
    return res.json({ ok:true, intent: user.intent }), true;
  }
  if (method === 'PUT' && p === '/user/profile') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { name, phone, timezone, theme, language, intent } = req.body || {};
    if (name     !== undefined) user.name = name;
    if (phone    !== undefined) user.phone = phone;
    if (timezone !== undefined) user.timezone = timezone;
    if (theme    !== undefined) user.theme = theme;
    if (language !== undefined) user.language = language;
    if (intent   !== undefined && ['learn','consult','both'].includes(intent)) user.intent = intent;
    const { password_hash, ...safe } = user;
    return res.json({ ok:true, user: safe }), true;
  }
  if (method === 'POST' && p === '/user/claims') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const b = req.body || {};
    const id = nextId('claims');
    demo.claims.push({ id, user_id: user.id, ...b, status:'open', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'GET' && p === '/user/claims') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    return res.json({ claims: demo.claims.filter(c => c.user_id === user.id) }), true;
  }
  if (method === 'POST' && p === '/user/tickets') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { subject, description, priority='normal', category='general' } = req.body || {};
    const ref = `TKT-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}`;
    const id = nextId('tickets');
    demo.tickets.push({ id, user_id: user.id, reference: ref, subject, description, priority, category, status:'open', created_at: new Date() });
    return res.status(201).json({ id, reference: ref }), true;
  }
  if (method === 'GET' && p === '/user/tickets') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    return res.json({ tickets: demo.tickets.filter(t => t.user_id === user.id) }), true;
  }
  if (method === 'POST' && (m = p.match(/^\/user\/tickets\/(\d+)\/replies$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const tid = Number(m[1]);
    const t = demo.tickets.find(x => x.id === tid && x.user_id === user.id);
    if (!t) return res.status(404).json({ error:'Ticket not found' }), true;
    const id = nextId('ticketReplies');
    demo.ticketReplies.push({ id, ticket_id: tid, user_id: user.id, message: req.body?.message || '', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'POST' && p === '/user/reviews') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { expert_id, consultation_id=null, rating, comment='' } = req.body || {};
    const id = nextId('reviews');
    demo.reviews.push({ id, expert_id, author_id: user.id, consultation_id, rating, comment, status: 'published', reply: null, replied_at: null, created_at: new Date() });
    const expert = demo.users.find(u => u.id === expert_id);
    if (expert) {
      const all = demo.reviews.filter(r => r.expert_id === expert_id && r.status === 'published');
      expert.average_rating = all.reduce((s,r) => s + Number(r.rating), 0) / all.length;
    }
    return res.status(201).json({ id }), true;
  }

  /* ============================================================
     INSTITUTION — SELF-SERVICE (demo)
     ============================================================ */
  function _instContext(req) {
    const user = currentDemoUser(req);
    if (!user) return { user:null, inst:null, error:{ status:401, error:'Invalid or expired token' } };
    if (user.role !== 'institution') return { user, inst:null, error:{ status:403, error:'Not an institution account' } };
    const inst = demo.institutions.find(i => i.id === user.institution_id);
    if (!inst) return { user, inst:null, error:{ status:404, error:'Institution not found' } };
    if (inst.status !== 'active' && user.institution_role !== 'operations_manager') {
      return { user, inst, error:{ status:403, error:'Institution not active' } };
    }
    return { user, inst, error:null };
  }

  if (method === 'GET' && p === '/institution/me') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    return res.json({ institution: inst }), true;
  }
  if (method === 'PUT' && p === '/institution/profile') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    for (const k of ['name','type','industry','contact_phone','address']) {
      if (b[k] !== undefined) inst[k] = b[k];
    }
    return res.json({ ok:true }), true;
  }
  if (method === 'PUT' && p === '/institution/settings') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    if (user.institution_role !== 'operations_manager') {
      return res.status(403).json({ error:'Only Operations Manager can change settings' }), true;
    }
    const b = req.body || {};
    if (b.name             !== undefined) inst.name = b.name;
    if (b.contact_email    !== undefined) inst.contact_email = b.contact_email;
    if (b.default_capacity !== undefined) inst.default_capacity = Number(b.default_capacity);
    if (b.pass_mark        !== undefined) inst.pass_mark = Number(b.pass_mark);
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/institution/programmes') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.programmes
      .filter(x => x.institution_id === inst.id)
      .map(x => ({
        ...x,
        enrolled_count: demo.cohorts.filter(c => c.programme_id === x.id)
          .reduce((s,c) => s + (c.trainee_count||0), 0),
      }));
    return res.json({ programmes: list }), true;
  }
  if (method === 'POST' && p === '/institution/programmes') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error:'Title required' }), true;
    const id = nextId('programmes');
    demo.programmes.push({
      id, institution_id: inst.id,
      title:b.title, description:b.description || '', category:b.category || 'General',
      status: b.status || 'draft',
      start_date: b.start_date ? new Date(b.start_date) : null,
      end_date:   b.end_date   ? new Date(b.end_date)   : null,
      capacity: Number(b.capacity || inst.default_capacity),
      created_at: new Date(),
    });
    demo.institutionAudit.push({ id: nextId('institutionAudit'), institution_id: inst.id,
      actor_id: user.id, actor_name: user.name,
      action:`Created programme "${b.title}"`, meta:null, created_at:new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/programmes\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const pr = demo.programmes.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (!pr) return res.status(404).json({ error:'Programme not found' }), true;
    const b = req.body || {};
    for (const k of ['title','description','category','status','capacity']) if (b[k] !== undefined) pr[k] = b[k];
    if (b.start_date !== undefined) pr.start_date = b.start_date ? new Date(b.start_date) : null;
    if (b.end_date   !== undefined) pr.end_date   = b.end_date   ? new Date(b.end_date)   : null;
    return res.json({ ok:true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/programmes\/(\d+)$/))) {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const id = Number(m[1]);
    const pr = demo.programmes.find(x => x.id === id && x.institution_id === inst.id);
    if (!pr) return res.status(404).json({ error:'Programme not found' }), true;
    demo.programmes = demo.programmes.filter(x => x.id !== id);
    demo.institutionAudit.push({ id: nextId('institutionAudit'), institution_id: inst.id,
      actor_id: user.id, actor_name: user.name,
      action:`Deleted programme "${pr.title}"`, meta:null, created_at:new Date() });
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/institution/cohorts') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.cohorts
      .filter(c => c.institution_id === inst.id)
      .map(c => ({
        ...c,
        programme_title: demo.programmes.find(x => x.id === c.programme_id)?.title || null,
        instructor_name: c.instructor_name ||
          (c.instructor_id ? demo.users.find(u => u.id === c.instructor_id)?.name : null) || null,
        trainee_count: demo.trainees.filter(t => t.cohort_id === c.id).length,
      }));
    return res.json({ cohorts: list }), true;
  }
  if (method === 'POST' && p === '/institution/cohorts') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.name || !b.programme_id) return res.status(400).json({ error:'name and programme_id required' }), true;
    const instructor = b.instructor_id ? demo.users.find(u => u.id === Number(b.instructor_id)) : null;
    const id = nextId('cohorts');
    demo.cohorts.push({
      id, institution_id: inst.id,
      programme_id: Number(b.programme_id),
      name: b.name,
      instructor_id: instructor?.id || null,
      instructor_name: instructor?.name || null,
      start_date: b.start_date ? new Date(b.start_date) : null,
      end_date:   b.end_date   ? new Date(b.end_date)   : null,
      capacity: Number(b.capacity || inst.default_capacity),
      trainee_count: 0, status: b.status || 'active', created_at: new Date(),
    });
    demo.institutionAudit.push({ id: nextId('institutionAudit'), institution_id: inst.id,
      actor_id: user.id, actor_name: user.name,
      action:`Created cohort "${b.name}"`, meta:null, created_at:new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/cohorts\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const ch = demo.cohorts.find(x => x.id === Number(m[1]) && x.institution_id === inst.id);
    if (!ch) return res.status(404).json({ error:'Cohort not found' }), true;
    const b = req.body || {};
    for (const k of ['name','capacity','status']) if (b[k] !== undefined) ch[k] = b[k];
    if (b.programme_id  !== undefined) ch.programme_id = Number(b.programme_id);
    if (b.instructor_id !== undefined) {
      const instr = b.instructor_id ? demo.users.find(u => u.id === Number(b.instructor_id)) : null;
      ch.instructor_id = instr?.id || null;
      ch.instructor_name = instr?.name || null;
    }
    if (b.start_date !== undefined) ch.start_date = b.start_date ? new Date(b.start_date) : null;
    if (b.end_date   !== undefined) ch.end_date   = b.end_date   ? new Date(b.end_date)   : null;
    return res.json({ ok:true }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/cohorts\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.cohorts = demo.cohorts.filter(x => !(x.id === Number(m[1]) && x.institution_id === inst.id));
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/institution/assessments') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.assessments
      .filter(x => x.institution_id === inst.id)
      .map(x => ({
        ...x,
        cohort_name: demo.cohorts.find(c => c.id === x.cohort_id)?.name || null,
      }));
    return res.json({ assessments: list }), true;
  }
  if (method === 'POST' && p === '/institution/assessments') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.title || !b.cohort_id) return res.status(400).json({ error:'title and cohort_id required' }), true;
    const id = nextId('assessments');
    demo.assessments.push({
      id, institution_id: inst.id, cohort_id: Number(b.cohort_id),
      title:b.title, type: b.type || 'quiz',
      weight: Number(b.weight || 0),
      due_date: b.due_date ? new Date(b.due_date) : null,
      status: 'scheduled', created_at: new Date(),
    });
    demo.institutionAudit.push({ id: nextId('institutionAudit'), institution_id: inst.id,
      actor_id: user.id, actor_name: user.name,
      action:`Scheduled assessment "${b.title}"`, meta:null, created_at:new Date() });
    return res.status(201).json({ id }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/assessments\/(\d+)$/))) {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    demo.assessments = demo.assessments.filter(x => !(x.id === Number(m[1]) && x.institution_id === inst.id));
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/institution/projects') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.projects
      .filter(x => x.institution_id === inst.id)
      .map(x => ({
        ...x,
        cohort_name: demo.cohorts.find(c => c.id === x.cohort_id)?.name || null,
      }));
    return res.json({ projects: list }), true;
  }
  if (method === 'POST' && p === '/institution/projects') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const b = req.body || {};
    if (!b.title || !b.cohort_id) return res.status(400).json({ error:'title and cohort_id required' }), true;
    const id = nextId('projects');
    demo.projects.push({
      id, institution_id: inst.id, cohort_id: Number(b.cohort_id),
      title:b.title, description:b.description || '', category:b.category || 'Project',
      deadline: b.deadline ? new Date(b.deadline) : null,
      status: 'active', submissions_count: 0, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'GET' && p === '/institution/trainees') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.trainees.filter(t => t.institution_id === inst.id);
    return res.json({ trainees: list }), true;
  }
  if (method === 'POST' && p === '/institution/trainees/invite') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const { emails = [], programme_id } = req.body || {};
    if (!Array.isArray(emails) || !emails.length) return res.status(400).json({ error:'emails array required' }), true;
    const programme = demo.programmes.find(p => p.id === Number(programme_id));
    const cohort = demo.cohorts.find(c => c.programme_id === Number(programme_id));
    const invited = [];
    for (const email of emails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      const id = nextId('trainees');
      demo.trainees.push({
        id, institution_id: inst.id, user_id: null,
        name: email.split('@')[0], email,
        programme_id: programme?.id || null,
        programme_title: programme?.title || null,
        cohort_id: cohort?.id || null,
        cohort_name: cohort?.name || null,
        progress: 0, assessment_avg: null, status:'invited',
        created_at: new Date(),
      });
      invited.push(email);
    }
    if (cohort) cohort.trainee_count = demo.trainees.filter(t => t.cohort_id === cohort.id).length;
    demo.institutionAudit.push({ id: nextId('institutionAudit'), institution_id: inst.id,
      actor_id: user.id, actor_name: user.name,
      action:`Invited ${invited.length} trainee(s) to "${programme?.title || '—'}"`,
      meta:null, created_at:new Date() });
    return res.status(201).json({ invited: invited.length, emails: invited }), true;
  }
  if (method === 'GET' && p === '/institution/instructors') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const list = demo.instructors.filter(i => i.institution_id === inst.id);
    return res.json({ instructors: list }), true;
  }
  if (method === 'POST' && p === '/institution/instructors') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    const { expert_id } = req.body || {};
    const expert = demo.users.find(u => u.id === Number(expert_id) && u.role === 'expert');
    if (!expert) return res.status(404).json({ error:'Expert not found' }), true;
    const existing = demo.instructors.find(i => i.institution_id === inst.id && i.expert_id === expert.id);
    if (existing) return res.json({ id: existing.id, already: true }), true;
    const id = nextId('instructors');
    demo.instructors.push({
      id, institution_id: inst.id, expert_id: expert.id,
      name: expert.name, specialization: expert.specialization,
      programme_count: 0, status:'active', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }
  if (method === 'GET' && p === '/institution/team') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    if (user.institution_role !== 'operations_manager') return res.json({ team: [] }), true;
    const list = demo.institutionTeam.filter(t => t.institution_id === inst.id);
    return res.json({ team: list }), true;
  }
  if (method === 'POST' && p === '/institution/team/invite') {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    if (user.institution_role !== 'operations_manager') {
      return res.status(403).json({ error:'Only Operations Manager can invite team members' }), true;
    }
    const { name, email, institution_role } = req.body || {};
    if (!name || !email) return res.status(400).json({ error:'name and email required' }), true;
    if (!config.institution.roles.includes(institution_role)) {
      return res.status(400).json({ error:'Invalid institution_role' }), true;
    }
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error:'Email already registered' }), true;

    const tempPwd = nanoid(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const uid  = nextId('users');
    demo.users.push({
      id: uid, name, email, password_hash: hash, phone:'',
      role:'institution', status:'active',
      specialization:null, hourly_rate:0, bio:null, avatar:null,
      institution_id: inst.id, institution_role,
      wallet_balance:0, total_earnings:0, average_rating:0,
      created_at:new Date(), last_login_at:null,
      timezone:'UTC', theme:'light', language:'en', intent:'both',
    });
    demo.notificationPrefs.push({ user_id: uid, email_notifications:1, push_notifications:1, marketing:0 });
    demo.institutionTeam.push({
      id: nextId('institutionTeam'), institution_id: inst.id, user_id: uid,
      name, email, institution_role, status:'active', created_at:new Date(),
    });
    demo.institutionAudit.push({ id: nextId('institutionAudit'), institution_id: inst.id,
      actor_id: user.id, actor_name: user.name,
      action:`Invited ${name} (${institution_role})`, meta:null, created_at:new Date() });
    return res.status(201).json({ id: uid, temp_password: tempPwd }), true;
  }
  if (method === 'DELETE' && (m = p.match(/^\/institution\/team\/(\d+)$/))) {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    if (user.institution_role !== 'operations_manager') {
      return res.status(403).json({ error:'Only Operations Manager can remove team members' }), true;
    }
    const id = Number(m[1]);
    const tm = demo.institutionTeam.find(t => t.id === id && t.institution_id === inst.id);
    if (!tm) return res.status(404).json({ error:'Team member not found' }), true;
    if (tm.user_id === inst.ops_manager_id) {
      return res.status(400).json({ error:'Cannot remove the Operations Manager' }), true;
    }
    demo.institutionTeam = demo.institutionTeam.filter(t => t.id !== id);
    const u = demo.users.find(x => x.id === tm.user_id);
    if (u) u.status = 'suspended';
    return res.json({ ok:true }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/institution\/requests\/(\d+)\/(approve|reject)$/))) {
    const { user, inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;
    if (user.institution_role !== 'operations_manager') {
      return res.status(403).json({ error:'Only Operations Manager can approve requests' }), true;
    }
    const id = Number(m[1]);
    const reqRow = demo.institutionReqs.find(x => x.id === id && x.institution_id === inst.id);
    if (!reqRow) return res.status(404).json({ error:'Request not found' }), true;
    reqRow.status = m[2] === 'approve' ? 'approved' : 'rejected';
    demo.institutionAudit.push({ id: nextId('institutionAudit'), institution_id: inst.id,
      actor_id: user.id, actor_name: user.name,
      action:`${m[2] === 'approve' ? 'Approved' : 'Rejected'} request "${reqRow.title}"`,
      meta:null, created_at:new Date() });
    return res.json({ ok:true }), true;
  }
  if (method === 'GET' && p === '/institution/stats') {
    const { inst, error } = _instContext(req);
    if (error) return res.status(error.status).json({ error: error.error }), true;

    const myTrainees = demo.trainees.filter(t => t.institution_id === inst.id);
    const myCohorts  = demo.cohorts.filter(c => c.institution_id === inst.id);
    const myAssess   = demo.assessments.filter(a => a.institution_id === inst.id);
    const myProjects = demo.projects.filter(p => p.institution_id === inst.id);
    const myReqs     = demo.institutionReqs.filter(r => r.institution_id === inst.id);
    const myAudit    = demo.institutionAudit
                         .filter(a => a.institution_id === inst.id)
                         .sort((a,b) => b.created_at - a.created_at);

    const avgCompletion = myTrainees.length
      ? Math.round(myTrainees.reduce((s,t) => s + (t.progress || 0), 0) / myTrainees.length)
      : 0;
    const scored = myTrainees.filter(t => t.assessment_avg != null);
    const avgScore = scored.length
      ? Math.round(scored.reduce((s,t) => s + t.assessment_avg, 0) / scored.length)
      : 0;

    const upcomingSessions = myCohorts.slice(0, 5).map((c, i) => ({
      id: c.id, title: `Live session — ${c.name}`,
      cohort_name: c.name,
      scheduled_at: new Date(Date.now() + (i+1) * 86400000),
      mode: 'online',
    }));

    return res.json({
      stats: {
        avg_completion_rate: avgCompletion,
        avg_score: avgScore,
        projects_submitted: myProjects.reduce((s,p) => s + (p.submissions_count||0), 0),
        certificates_issued: myTrainees.filter(t => t.status === 'completed').length,
        upcomingSessions,
        pendingApprovals: myReqs.filter(r => r.status === 'pending'),
        auditLog: myAudit.slice(0, 30),
        totals: {
          programmes: demo.programmes.filter(p => p.institution_id === inst.id).length,
          cohorts: myCohorts.length,
          assessments: myAssess.length,
          projects: myProjects.length,
          trainees: myTrainees.length,
          instructors: demo.instructors.filter(i => i.institution_id === inst.id).length,
        },
      },
    }), true;
  }

  /* ============================================================
     NOT IMPLEMENTED IN DEMO
     ============================================================ */
  return res.status(503).json({
    error: 'Feature not available in demo mode',
    message: 'This endpoint requires a real MySQL database. Configure DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in the host environment and restart.',
    path: p,
    method,
  }), true;
}

/* Mount the demo router FIRST */
app.use('/api', demoRouter);

/* ============================================================
   REAL DB ROUTES
   ============================================================ */
const requireDB = (req, res, next) => {
  if (demo.active) return next('route');
  if (!dbState.connected) {
    return res.status(503).json({
      error: 'Database unavailable',
      hint: 'Configure DB_* env vars and restart, or wait for auto-reconnect. Demo mode may be forced via DEMO_MODE=true.',
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
      [actorId||null, action, target||null, targetId||null, meta?JSON.stringify(meta):null, ip||null]
    );
  } catch (e) { console.error('audit log failed', e.message); }
}

async function notify(userId, title, message, type='info', link=null) {
  const pool = poolOrThrow();
  const [r] = await pool.query(
    `INSERT INTO notifications (user_id,title,message,type,link) VALUES (?,?,?,?,?)`,
    [userId, title, message, type, link]
  );
  io.to(`user_${userId}`).emit('notification', { id: r.insertId, user_id: userId, title, message, type, link, is_read: 0, created_at: now() });
  return r.insertId;
}

async function creditWallet(userId, amount, reason, ref=null) {
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

async function debitWallet(userId, amount, reason, ref=null) {
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

/* -------------------- AUTH -------------------- */
app.post('/api/auth/register', [
  body('name').isLength({ min:2, max:120 }).withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min:8 }).withMessage('Password must be at least 8 chars'),
  body('role').optional().isIn(['learner','expert','institution']).withMessage('Invalid role'),
], validate, requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { name, email, password, phone='', role='learner', extra={} } = req.body;
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error:'Email already registered' });

  const safeRole = role === 'admin' ? 'learner' : role;
  const status = safeRole === 'learner' ? 'active' : 'pending';
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,phone,role,status,specialization,hourly_rate,bio,intent)
     VALUES (?,?,?,?,?,?,?,?,?, 'both')`,
    [name, email, hash, phone, safeRole, status,
     extra.specialization||null, extra.hourly_rate||0, extra.bio||null]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await notify(r.insertId, 'Welcome!', status==='active' ? 'Your account is ready.' : 'Your account is pending admin approval.');

  // Institution branch
  if (safeRole === 'institution') {
    const [inst] = await pool.query(
      `INSERT INTO institutions
         (name, type, industry, contact_email, contact_phone, address,
          ops_manager_id, ops_manager_name, ops_manager_email, status)
       VALUES (?,?,?,?,?,?,?,?,?, 'pending')`,
      [
        extra.institution_name || (name + "'s Institution"),
        extra.institution_type || 'corporate',
        extra.industry || '',
        email, phone, '',
        r.insertId, name, email,
      ]
    );
    await pool.query(
      `UPDATE users SET institution_id=?, institution_role='operations_manager' WHERE id=?`,
      [inst.insertId, r.insertId]
    );
  }

  const [admins] = await pool.query("SELECT id FROM users WHERE role='admin'");
  for (const a of admins) {
    await notify(a.id, 'New registration', `${name} (${safeRole}) registered.`,
      'info', safeRole === 'institution' ? '/admin/institutions' : '/admin/users');
  }
  res.status(201).json({
    id: r.insertId, status,
    message: status==='active'
      ? 'Account created. You can log in now.'
      : safeRole === 'institution'
        ? 'Institution registered. Awaiting admin verification.'
        : 'Registration successful. Awaiting admin approval.',
  });
}));

app.post('/api/auth/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], validate, requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { email, password } = req.body;
  const [[u]] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  if (!u) return res.status(401).json({ error:'Invalid email or password' });
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error:'Invalid email or password' });
  if (u.status === 'pending')   return res.status(403).json({ error:'Account pending admin approval' });
  if (u.status === 'suspended') return res.status(403).json({ error:'Account suspended' });
  if (u.status === 'rejected')  return res.status(403).json({ error:'Account rejected. Contact support.' });

  const token = jwt.sign({ id:u.id, role:u.role, email:u.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refresh = jwt.sign({ id:u.id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  const expiresAt = new Date(Date.now() + 30*24*3600*1000);
  await pool.query('INSERT INTO refresh_tokens (user_id,token,expires_at) VALUES (?,?,?)', [u.id, refresh, expiresAt]);
  await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=?', [u.id]);
  delete u.password_hash;
  res.json({ token, refresh, user:u });
}));

app.post('/api/auth/refresh', requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error:'Refresh token required' });
  let payload;
  try { payload = jwt.verify(refresh, config.jwt.refreshSecret); } catch { return res.status(401).json({ error:'Invalid refresh token' }); }
  const [[row]] = await pool.query('SELECT * FROM refresh_tokens WHERE token=? AND revoked=0 AND expires_at > NOW()', [refresh]);
  if (!row) return res.status(401).json({ error:'Refresh token revoked or expired' });
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [payload.id]);
  if (!u || u.status !== 'active') return res.status(403).json({ error:'Account not active' });
  const token = jwt.sign({ id:u.id, role:u.role, email:u.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  res.json({ token });
}));

app.post('/api/auth/logout', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { refresh } = req.body || {};
  if (refresh) await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE token=?', [refresh]);
  res.json({ ok:true });
}));

app.get('/api/auth/me', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  if (!u) return res.status(404).json({ error:'Not found' });
  delete u.password_hash;
  res.json({ user:u });
}));

app.post('/api/auth/forgot', [body('email').isEmail()], validate, requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { email } = req.body;
  const [[u]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (!u) return res.json({ ok:true, message:'If the email exists, a reset link was sent.' });
  const token = nanoid(40);
  const expires = new Date(Date.now() + 3600*1000);
  await pool.query('INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,?)', [u.id, token, expires]);
  console.log(`[PASSWORD RESET] ${email} → /#/reset?token=${token}`);
  res.json({ ok:true, message:'If the email exists, a reset link was sent.' });
}));

app.post('/api/auth/reset', [
  body('token').notEmpty(),
  body('password').isLength({ min:8 }),
], validate, requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { token, password } = req.body;
  const [[row]] = await pool.query('SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > NOW()', [token]);
  if (!row) return res.status(400).json({ error:'Invalid or expired token' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, row.user_id]);
  await pool.query('UPDATE password_resets SET used=1 WHERE id=?', [row.id]);
  await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', [row.user_id]);
  res.json({ ok:true });
}));

app.put('/api/auth/password', auth(), requireDB, [
  body('old_password').notEmpty(),
  body('new_password').isLength({ min:8 }),
], validate, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
  const ok = await bcrypt.compare(req.body.old_password, u.password_hash);
  if (!ok) return res.status(400).json({ error:'Current password is incorrect' });
  const hash = await bcrypt.hash(req.body.new_password, 10);
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
  await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', [req.user.id]);
  res.json({ ok:true });
}));

/* -------------------- COMMON -------------------- */
app.get('/api/common/notifications', auth(), requireDB, asyncH(async (req,res) => {
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

app.put('/api/common/notifications/:id/read', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('UPDATE notifications SET is_read=1 WHERE id=?', [req.params.id]);
  res.json({ ok:true });
}));

app.put('/api/common/notifications/read-all', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
  res.json({ ok:true });
}));

app.get('/api/common/events', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT e.*, u.name expert_name,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id=e.id AND er.status='registered') registered_count
       FROM events e LEFT JOIN users u ON u.id=e.expert_id
      WHERE e.status='published' ORDER BY e.date`,
  );
  res.json({ events: rows });
}));

app.post('/api/common/events/:id/register', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [[ev]] = await pool.query('SELECT * FROM events WHERE id=?', [req.params.id]);
  if (!ev) return res.status(404).json({ error:'Event not found' });
  const [[existing]] = await pool.query(
    'SELECT id FROM event_registrations WHERE event_id=? AND user_id=?',
    [req.params.id, req.user.id]
  );
  if (existing) {
    await pool.query("UPDATE event_registrations SET status='registered' WHERE id=?", [existing.id]);
  } else {
    await pool.query(
      `INSERT INTO event_registrations (event_id,user_id,status) VALUES (?,?,'registered')`,
      [req.params.id, req.user.id]
    );
  }
  await notify(req.user.id, 'Event registered', `You're registered for "${ev.title}".`);
  res.json({ ok:true });
}));

/* -------------------- ESCHOOL / COURSES -------------------- */
app.get('/api/eschool/courses', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { type, q, page=1, per=20 } = req.query;
  const limit = Math.min(Number(per), 100);
  const offset = (Math.max(Number(page), 1) - 1) * limit;

  const conds = ["c.status='published'"];
  const params = [];
  if (type) { conds.push('c.course_type=?'); params.push(type); }
  if (q)    { conds.push('(c.title LIKE ? OR c.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

  const where = `WHERE ${conds.join(' AND ')}`;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM courses c ${where}`, params);
  const [rows] = await pool.query(
    `SELECT c.*, u.name expert_name FROM courses c
       LEFT JOIN users u ON u.id=c.expert_id
       ${where}
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ courses: rows, total, page: Number(page), pages: Math.max(1, Math.ceil(total/limit)) });
}));

app.get('/api/eschool/courses/:id', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [[course]] = await pool.query(
    `SELECT c.*, u.name expert_name FROM courses c
       LEFT JOIN users u ON u.id=c.expert_id WHERE c.id=?`,
    [req.params.id]
  );
  if (!course) return res.status(404).json({ error:'Course not found' });
  const [lessons] = await pool.query(
    'SELECT * FROM lessons WHERE course_id=? ORDER BY position',
    [req.params.id]
  );
  res.json({ course, lessons });
}));

app.post('/api/eschool/enroll', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { course_id, coupon_code } = req.body;
  const [[c]] = await pool.query('SELECT * FROM courses WHERE id=?', [course_id]);
  if (!c) return res.status(404).json({ error:'Course not found' });

  let price = Number(c.price);
  let discount = 0;
  let cp = null;
  if (coupon_code) {
    const [[row]] = await pool.query('SELECT * FROM coupons WHERE code=? AND active=1', [coupon_code]);
    cp = row;
    if (!cp) return res.status(400).json({ error:'Invalid coupon' });
    if (cp.max_uses && cp.used_count >= cp.max_uses) return res.status(400).json({ error:'Coupon usage limit reached' });
    if (Number(cp.min_spend) > price) return res.status(400).json({ error:'Minimum spend not met' });
    if (cp.applies_to !== 'all' && !String(c.course_type).includes(cp.applies_to)) return res.status(400).json({ error:'Coupon not valid for this item' });
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
      await conn.query('INSERT INTO wallet_ledger (user_id,amount,balance_after,reason) VALUES (?,?,?,?)',
        [req.user.id, -finalPrice, Number(u.wallet_balance) - finalPrice, `Enrollment: ${c.title}`]);
      await conn.query(
        `INSERT INTO transactions (user_id,reference,description,amount,provider,status,direction)
         VALUES (?,?,?,?, 'wallet','succeeded','out')`,
        [req.user.id, genRef('ENR'), c.title, finalPrice]
      );
      if (c.expert_id) {
        const cut = finalPrice * ((100 - config.platform.commission) / 100);
        await conn.query('UPDATE users SET wallet_balance=wallet_balance+?, total_earnings=total_earnings+? WHERE id=?',
          [cut, cut, c.expert_id]);
        await conn.query('INSERT INTO wallet_ledger (user_id,amount,balance_after,reason) VALUES (?,?,?,?)',
          [c.expert_id, cut, 0, `Course sale: ${c.title}`]);
      }
    }
    const [r] = await conn.query(
      `INSERT INTO enrollments (user_id, course_id, enrollment_type, reference_id, progress, status)
       VALUES (?,?,?,?, 0, 'active')`,
      [req.user.id, course_id, c.course_type, c.id]
    );
    if (cp) await conn.query('UPDATE coupons SET used_count=used_count+1 WHERE id=?', [cp.id]);
    await conn.commit();
    res.status(201).json({ id: r.insertId, paid: finalPrice, discount });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.get('/api/user/enrollments', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT e.*, c.title, c.thumbnail, c.total_lessons, c.course_type enrollment_type
       FROM enrollments e JOIN courses c ON c.id=e.course_id
      WHERE e.user_id=? ORDER BY e.created_at DESC`,
    [req.user.id]
  );
  res.json({ enrollments: rows });
}));

app.put('/api/user/enrollments/:id/progress', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { progress } = req.body;
  const [[enr]] = await pool.query('SELECT * FROM enrollments WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!enr) return res.status(404).json({ error:'Enrollment not found' });
  await pool.query('UPDATE enrollments SET progress=? WHERE id=?', [progress, req.params.id]);
  if (progress >= 100) {
    const [[c]] = await pool.query('SELECT title FROM courses WHERE id=?', [enr.course_id]);
    const serial = `EH-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;
    const hash = Buffer.from(`${req.user.id}:${serial}`).toString('base64');
    const [r] = await pool.query(
      `INSERT INTO certificates (user_id, course_title, serial, verification_hash) VALUES (?,?,?,?)`,
      [req.user.id, c.title, serial, hash]
    );
    await pool.query('UPDATE enrollments SET status="completed", certificate_id=? WHERE id=?', [r.insertId, req.params.id]);
  }
  res.json({ ok:true });
}));

app.get('/api/user/certificates', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    'SELECT * FROM certificates WHERE user_id=? ORDER BY issued_at DESC',
    [req.user.id]
  );
  res.json({ certificates: rows });
}));

/* -------------------- EXPERTS -------------------- */
app.get('/api/user/experts', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT id, name, email, avatar, bio, specialization, hourly_rate, average_rating
       FROM users WHERE role='expert' AND status='active'`,
  );
  res.json({ experts: rows, total: rows.length, page: 1, pages: 1 });
}));

app.get('/api/user/experts/:id', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [[expert]] = await pool.query(
    `SELECT id, name, email, avatar, bio, specialization, hourly_rate, average_rating
       FROM users WHERE id=? AND role='expert'`,
    [req.params.id]
  );
  if (!expert) return res.status(404).json({ error:'Expert not found' });
  const [reviews] = await pool.query(
    `SELECT r.*, u.name author_name FROM reviews r
       LEFT JOIN users u ON u.id=r.author_id
      WHERE r.expert_id=? AND r.status='published' ORDER BY r.created_at DESC`,
    [req.params.id]
  );
  const [availability] = await pool.query(
    'SELECT * FROM availability WHERE expert_id=?', [req.params.id]
  );
  res.json({ expert, reviews, availability });
}));

/* -------------------- USER: WALLET / PROFILE / PREFS -------------------- */
app.get('/api/user/wallet', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT wallet_balance FROM users WHERE id=?', [req.user.id]);
  const [ledger] = await pool.query(
    'SELECT * FROM wallet_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  res.json({ balance: Number(u?.wallet_balance || 0), ledger });
}));

app.post('/api/user/wallet/topup', auth(), requireDB, asyncH(async (req,res) => {
  const { amount, provider } = req.body;
  const ref = genRef('TOP');
  await creditWallet(req.user.id, amount, 'Wallet top-up', ref);
  const pool = poolOrThrow();
  await pool.query(
    `INSERT INTO transactions (user_id,reference,description,amount,provider,status,direction)
     VALUES (?,?, 'Wallet top-up', ?, ?, 'succeeded', 'in')`,
    [req.user.id, ref, amount, provider]
  );
  const [[u]] = await pool.query('SELECT wallet_balance FROM users WHERE id=?', [req.user.id]);
  res.json({ ok:true, balance: u.wallet_balance, reference: ref });
}));

app.get('/api/user/transactions', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    'SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ transactions: rows });
}));

app.get('/api/user/preferences', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT intent FROM users WHERE id=?', [req.user.id]);
  res.json({ intent: u?.intent || 'both' });
}));

app.put('/api/user/preferences', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { intent } = req.body || {};
  if (!['learn','consult','both'].includes(intent)) {
    return res.status(400).json({ error:'Invalid intent' });
  }
  await pool.query('UPDATE users SET intent=? WHERE id=?', [intent, req.user.id]);
  res.json({ ok: true, intent });
}));

app.put('/api/user/profile', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { name, phone, timezone, theme, language, intent } = req.body || {};
  const sets = []; const vals = [];
  if (name     !== undefined) { sets.push('name=?'); vals.push(name); }
  if (phone    !== undefined) { sets.push('phone=?'); vals.push(phone); }
  if (timezone !== undefined) { sets.push('timezone=?'); vals.push(timezone); }
  if (theme    !== undefined) { sets.push('theme=?'); vals.push(theme); }
  if (language !== undefined) { sets.push('language=?'); vals.push(language); }
  if (intent !== undefined && ['learn','consult','both'].includes(intent)) { sets.push('intent=?'); vals.push(intent); }
  if (sets.length) {
    vals.push(req.user.id);
    await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, vals);
  }
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  delete u.password_hash;
  res.json({ ok:true, user: u });
}));

app.post('/api/user/claims', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO claims (user_id,consultation_id,claim_title,claim_description,claim_amount,status)
     VALUES (?,?,?,?,?, 'open')`,
    [req.user.id, b.consultation_id||null, b.claim_title, b.claim_description, b.claim_amount||null]
  );
  res.status(201).json({ id: r.insertId });
}));

app.get('/api/user/claims', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM claims WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ claims: rows });
}));

app.post('/api/user/tickets', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { subject, description, priority='normal', category='general' } = req.body;
  const ref = `TKT-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}`;
  const [r] = await pool.query(
    `INSERT INTO tickets (user_id,reference,subject,description,priority,category,status)
     VALUES (?,?,?,?,?,?, 'open')`,
    [req.user.id, ref, subject, description, priority, category]
  );
  res.status(201).json({ id: r.insertId, reference: ref });
}));

app.get('/api/user/tickets', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM tickets WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ tickets: rows });
}));

app.post('/api/user/tickets/:id/replies', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { message } = req.body;
  const [r] = await pool.query(
    'INSERT INTO ticket_replies (ticket_id,user_id,message) VALUES (?,?,?)',
    [req.params.id, req.user.id, message]
  );
  res.status(201).json({ id: r.insertId });
}));

app.post('/api/user/reviews', auth(), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { expert_id, consultation_id=null, rating, comment='' } = req.body;
  const [r] = await pool.query(
    `INSERT INTO reviews (expert_id,author_id,consultation_id,rating,comment,status)
     VALUES (?,?,?,?,?, 'published')`,
    [expert_id, req.user.id, consultation_id, rating, comment]
  );
  const [[stats]] = await pool.query(
    `SELECT AVG(rating) avg_rating FROM reviews WHERE expert_id=? AND status='published'`,
    [expert_id]
  );
  await pool.query('UPDATE users SET average_rating=? WHERE id=?', [stats.avg_rating, expert_id]);
  res.status(201).json({ id: r.insertId });
}));

/* -------------------- EXPERT PANEL -------------------- */
app.get('/api/expert/earnings', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query(
    'SELECT total_earnings, wallet_balance FROM users WHERE id=?', [req.user.id]
  );
  const [[paidOut]] = await pool.query(
    "SELECT COALESCE(SUM(amount),0) paid FROM payouts WHERE expert_id=? AND status='paid'",
    [req.user.id]
  );
  const [ledger] = await pool.query(
    'SELECT * FROM wallet_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  res.json({
    summary: {
      total_earned: Number(u.total_earnings) || 0,
      available_balance: Number(u.wallet_balance) || 0,
      total_paid_out: Number(paidOut.paid) || 0,
      pending_balance: 0,
    },
    ledger,
  });
}));

app.get('/api/expert/dashboard-stats', auth(['expert']), requireDB, asyncH(async (req,res) => {
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

app.get('/api/expert/reviews', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT r.*, u.name author_name FROM reviews r
       LEFT JOIN users u ON u.id=r.author_id
      WHERE r.expert_id=? ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  res.json({ reviews: rows });
}));

app.post('/api/expert/reviews/:id/reply', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query(
    'UPDATE reviews SET reply=?, replied_at=NOW() WHERE id=? AND expert_id=?',
    [req.body.reply, req.params.id, req.user.id]
  );
  res.json({ ok:true });
}));

app.get('/api/expert/availability', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM availability WHERE expert_id=?', [req.user.id]);
  res.json({ availability: rows });
}));

app.put('/api/expert/availability', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { schedule = [] } = req.body;
  await pool.query('DELETE FROM availability WHERE expert_id=?', [req.user.id]);
  for (const s of schedule) {
    await pool.query(
      'INSERT INTO availability (expert_id,day_of_week,start_time,end_time) VALUES (?,?,?,?)',
      [req.user.id, s.day, s.start, s.end]
    );
  }
  res.json({ ok:true });
}));

app.get('/api/expert/withdrawals', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    'SELECT * FROM payouts WHERE expert_id=? ORDER BY created_at DESC', [req.user.id]
  );
  res.json({ payouts: rows });
}));

app.post('/api/expert/withdrawals', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const { amount, method, account_details={} } = req.body;
  if (Number(amount) < config.platform.minPayout) {
    return res.status(400).json({ error:`Minimum withdrawal is ${config.platform.minPayout}` });
  }
  await debitWallet(req.user.id, amount, 'Withdrawal request');
  const pool = poolOrThrow();
  const [r] = await pool.query(
    `INSERT INTO payouts (expert_id,amount,method,account_details,status)
     VALUES (?,?,?,?, 'pending')`,
    [req.user.id, amount, method, JSON.stringify(account_details)]
  );
  res.status(201).json({ id: r.insertId });
}));

app.get('/api/expert/time-off', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM time_off WHERE expert_id=?', [req.user.id]);
  res.json({ timeOff: rows });
}));

app.post('/api/expert/time-off', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { start_date, end_date, reason='' } = req.body;
  const [r] = await pool.query(
    'INSERT INTO time_off (expert_id,start_date,end_date,reason) VALUES (?,?,?,?)',
    [req.user.id, start_date, end_date, reason]
  );
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/expert/profile', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { specialization, hourly_rate, bio } = req.body;
  const sets = []; const vals = [];
  if (specialization !== undefined) { sets.push('specialization=?'); vals.push(specialization); }
  if (hourly_rate   !== undefined) { sets.push('hourly_rate=?'); vals.push(hourly_rate); }
  if (bio           !== undefined) { sets.push('bio=?'); vals.push(bio); }
  if (!sets.length) return res.json({ ok:true });
  vals.push(req.user.id);
  await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok:true });
}));

app.post('/api/expert/courses', auth(['expert']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO courses (title,description,category,course_type,level,price,expert_id,status)
     VALUES (?,?,?,?,?,?,?, 'draft')`,
    [b.title, b.description||'', b.category||'General', b.course_type||'short_course',
     b.level||'beginner', b.price||0, req.user.id]
  );
  res.status(201).json({ id: r.insertId });
}));

/* -------------------- ADMIN -------------------- */
app.get('/api/admin/users', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT id,name,email,phone,role,status,avatar,created_at,last_login_at FROM users ORDER BY created_at DESC`
  );
  res.json({ users: rows, total: rows.length, page: 1, pages: 1 });
}));

app.get('/api/admin/experts', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT id,name,email,phone,avatar,specialization,hourly_rate,average_rating,total_earnings,status,created_at
       FROM users WHERE role='expert' ORDER BY created_at DESC`
  );
  res.json({ experts: rows, total: rows.length, page: 1, pages: 1 });
}));

app.get('/api/admin/analytics', auth(['admin']), requireDB, asyncH(async (req,res) => {
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
  const [top] = await pool.query(
    `SELECT id,name,average_rating,total_earnings FROM users
      WHERE role='expert' ORDER BY total_earnings DESC LIMIT 10`
  );
  const [usersByMonth] = await pool.query(
    `SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COUNT(*) c FROM users GROUP BY ym ORDER BY ym DESC LIMIT 12`
  );
  const [revenueByMonth] = await pool.query(
    `SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COALESCE(SUM(amount),0) total
       FROM transactions WHERE status='succeeded' AND direction='in'
       GROUP BY ym ORDER BY ym DESC LIMIT 12`
  );
  res.json({ totals, usersByRole: roles, topExperts: top, usersByMonth, revenueByMonth });
}));

app.get('/api/admin/transactions', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT t.*, u.name user_name FROM transactions t
       LEFT JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 500`
  );
  res.json({ transactions: rows, total: rows.length, page: 1, pages: 1 });
}));

app.get('/api/admin/payouts', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT p.*, u.name expert_name, u.email expert_email FROM payouts p
       LEFT JOIN users u ON u.id=p.expert_id ORDER BY p.created_at DESC`
  );
  res.json({ payouts: rows });
}));

app.put('/api/admin/payouts/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { status, reason } = req.body;
  await pool.query(
    `UPDATE payouts SET status=?, rejection_reason=?, processed_at=IF(?='paid', NOW(), processed_at) WHERE id=?`,
    [status, reason||null, status, req.params.id]
  );
  await logAudit(req.user.id, `payout.${status}`, 'payout', req.params.id, {}, req.ip);
  res.json({ ok:true });
}));

app.get('/api/admin/coupons', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ coupons: rows });
}));

app.post('/api/admin/coupons', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO coupons (code,discount_type,discount_value,max_uses,min_spend,applies_to,active,expires_at)
     VALUES (?,?,?,?,?,?, 1, ?)`,
    [b.code, b.discount_type, b.discount_value, b.max_uses||null, b.min_spend||0, b.applies_to||'all', b.expires_at||null]
  );
  await logAudit(req.user.id, 'coupon.create', 'coupon', r.insertId, { code: b.code }, req.ip);
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/admin/coupons/:id/toggle', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('UPDATE coupons SET active = 1 - active WHERE id=?', [req.params.id]);
  res.json({ ok:true });
}));

app.delete('/api/admin/coupons/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM coupons WHERE id=?', [req.params.id]);
  res.json({ ok:true });
}));

app.get('/api/admin/claims', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT * FROM claims ORDER BY created_at DESC');
  res.json({ claims: rows });
}));

app.put('/api/admin/claims/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { status, resolution } = req.body;
  await pool.query(
    `UPDATE claims SET status=?, resolution=?, resolved_at=IF(? IN ('resolved','rejected'), NOW(), resolved_at) WHERE id=?`,
    [status, resolution||null, status, req.params.id]
  );
  res.json({ ok:true });
}));

app.get('/api/admin/tickets', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT t.*, u.name user_name FROM tickets t
       LEFT JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC`
  );
  res.json({ tickets: rows });
}));

app.put('/api/admin/tickets/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('UPDATE tickets SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ ok:true });
}));

app.get('/api/admin/reviews', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT r.*, a.name author_name, e.name expert_name
       FROM reviews r
       LEFT JOIN users a ON a.id=r.author_id
       LEFT JOIN users e ON e.id=r.expert_id
      ORDER BY r.created_at DESC`
  );
  res.json({ reviews: rows });
}));

app.put('/api/admin/reviews/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('UPDATE reviews SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ ok:true });
}));

app.get('/api/admin/audit-logs', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT l.*, u.name actor_name FROM audit_logs l
       LEFT JOIN users u ON u.id=l.actor_id ORDER BY l.created_at DESC LIMIT 500`
  );
  res.json({ logs: rows });
}));

app.get('/api/admin/settings', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query('SELECT key_name, value FROM settings');
  const settings = {};
  rows.forEach(r => { settings[r.key_name] = r.value; });
  res.json({ settings });
}));

app.put('/api/admin/settings', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { settings } = req.body;
  for (const [k, v] of Object.entries(settings || {})) {
    await pool.query(
      `INSERT INTO settings (key_name, value) VALUES (?,?)
       ON DUPLICATE KEY UPDATE value=VALUES(value)`,
      [k, String(v)]
    );
  }
  res.json({ ok:true });
}));

app.post('/api/admin/events', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO events (title,description,category,expert_id,date,start_time,end_time,location,meeting_url,capacity,price,expert_payment,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'published')`,
    [b.title, b.description||'', b.category||'General', b.expert_id||null, b.date||null,
     b.start_time||null, b.end_time||null, b.location||'', b.meeting_url||'',
     b.capacity||100, b.price||0, b.expert_payment||0]
  );
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/admin/events/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const allowed = ['title','description','category','expert_id','date','start_time','end_time','location','meeting_url','capacity','price','expert_payment','status'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok:true });
  vals.push(req.params.id);
  await pool.query(`UPDATE events SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok:true });
}));

app.delete('/api/admin/events/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM events WHERE id=?', [req.params.id]);
  res.json({ ok:true });
}));

app.put('/api/admin/users/:id/approve', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query("UPDATE users SET status='active' WHERE id=?", [req.params.id]);
  await notify(req.params.id, 'Account approved', 'Your account has been approved. You can now log in.');
  res.json({ ok:true });
}));

app.put('/api/admin/users/:id/suspend', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query("UPDATE users SET status='suspended' WHERE id=?", [req.params.id]);
  res.json({ ok:true });
}));

app.put('/api/admin/users/:id/reject', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query("UPDATE users SET status='rejected' WHERE id=?", [req.params.id]);
  res.json({ ok:true });
}));

app.put('/api/admin/users/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { name, role, status } = req.body;
  const sets = []; const vals = [];
  if (name)   { sets.push('name=?');   vals.push(name); }
  if (role)   { sets.push('role=?');   vals.push(role); }
  if (status) { sets.push('status=?'); vals.push(status); }
  if (!sets.length) return res.json({ ok:true });
  vals.push(req.params.id);
  await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok:true });
}));

app.delete('/api/admin/users/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
  await logAudit(req.user.id, 'user.delete', 'user', req.params.id, {}, req.ip);
  res.json({ ok:true });
}));

app.post('/api/admin/experts/create', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { name, email, specialization, hourly_rate, bio, phone } = req.body;
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error:'Email already registered' });
  const tempPwd = nanoid(10);
  const hash = await bcrypt.hash(tempPwd, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,phone,role,status,specialization,hourly_rate,bio,intent)
     VALUES (?,?,?,?, 'expert','active',?,?,?, 'both')`,
    [name, email, hash, phone||'', specialization||null, hourly_rate||0, bio||null]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  res.status(201).json({ id: r.insertId, temp_password: tempPwd });
}));

app.post('/api/admin/notifications/broadcast', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { title, message, audience='all' } = req.body;
  let conds = [];
  if (audience === 'experts')      conds.push("role='expert'");
  if (audience === 'learners')     conds.push("role='learner'");
  if (audience === 'institutions') conds.push("role='institution'");
  if (audience === 'admins')       conds.push("role='admin'");
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const [users] = await pool.query(`SELECT id FROM users ${where}`);
  for (const u of users) {
    await pool.query(
      `INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?, 'broadcast')`,
      [u.id, title, message]
    );
    io.to(`user_${u.id}`).emit('broadcast', { title, message });
  }
  res.json({ ok:true, sent: users.length });
}));

/* -------------------- ADMIN — INSTITUTIONS -------------------- */
app.get('/api/admin/institutions', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT i.*,
            (SELECT COUNT(*) FROM programmes p WHERE p.institution_id=i.id) programme_count
       FROM institutions i ORDER BY i.created_at DESC`
  );
  res.json({ institutions: rows });
}));

app.post('/api/admin/institutions', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.name) return res.status(400).json({ error:'Name required' });
  const [r] = await pool.query(
    `INSERT INTO institutions (name,type,industry,contact_email,contact_phone,address,status)
     VALUES (?,?,?,?,?,?, 'pending')`,
    [b.name, b.type||'corporate', b.industry||'', b.contact_email||'',
     b.contact_phone||'', b.address||'']
  );
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/admin/institutions/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const allowed = ['name','type','industry','contact_email','contact_phone','address','status'];
  const sets=[]; const vals=[];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok:true });
  vals.push(req.params.id);
  await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok:true });
}));

['approve','reject','suspend'].forEach(action => {
  app.put(`/api/admin/institutions/:id/${action}`, auth(['admin']), requireDB, asyncH(async (req,res) => {
    const pool = poolOrThrow();
    const status = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'suspended';
    const [[inst]] = await pool.query('SELECT ops_manager_id FROM institutions WHERE id=?', [req.params.id]);
    if (!inst) return res.status(404).json({ error:'Not found' });
    await pool.query('UPDATE institutions SET status=? WHERE id=?', [status, req.params.id]);
    if (inst.ops_manager_id) {
      await pool.query('UPDATE users SET status=? WHERE id=?', [status, inst.ops_manager_id]);
      io.to(`user_${inst.ops_manager_id}`).emit('notification', {
        title: action === 'approve' ? 'Institution verified' : `Institution ${status}`,
        message: action === 'approve' ? 'Your institution has been approved.' : `Your institution is now ${status}.`,
        type: action === 'approve' ? 'success' : 'warning',
        created_at: new Date(),
      });
    }
    await logAudit(req.user.id, `institution.${action}`, 'institution', req.params.id, {}, req.ip);
    res.json({ ok:true, status });
  }));
});

app.delete('/api/admin/institutions/:id', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM programmes WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM cohorts    WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM assessments WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM projects   WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM trainees   WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM institution_instructors WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM institutions WHERE id=?', [req.params.id]);
  await logAudit(req.user.id, 'institution.delete', 'institution', req.params.id, {}, req.ip);
  res.json({ ok:true });
}));

app.post('/api/admin/institutions/:id/ops-manager', auth(['admin']), requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error:'name and email required' });
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error:'Email already registered' });

  const tempPwd = nanoid(10);
  const hash = await bcrypt.hash(tempPwd, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,intent)
     VALUES (?,?,?, 'institution','active',?, 'operations_manager','both')`,
    [name, email, hash, req.params.id]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await pool.query(
    'UPDATE institutions SET ops_manager_id=?, ops_manager_name=?, ops_manager_email=? WHERE id=?',
    [r.insertId, name, email, req.params.id]
  );
  res.status(201).json({ id: r.insertId, temp_password: tempPwd });
}));

/* -------------------- INSTITUTION — REAL DB ROUTES -------------------- */
const INSTITUTION_ROLES = config.institution.roles;

async function requireInstitution(req, res, next) {
  try {
    const pool = poolOrThrow();
    const [[u]] = await pool.query(
      'SELECT id, institution_id, institution_role, status FROM users WHERE id=?',
      [req.user.id]
    );
    if (!u || !u.institution_id) return res.status(403).json({ error:'Not an institution account' });
    const [[inst]] = await pool.query('SELECT * FROM institutions WHERE id=?', [u.institution_id]);
    if (!inst) return res.status(404).json({ error:'Institution not found' });
    if (inst.status !== 'active' && u.institution_role !== 'operations_manager') {
      return res.status(403).json({ error:'Institution not active' });
    }
    req.institution = inst;
    req.institutionRole = u.institution_role;
    next();
  } catch (e) { next(e); }
}

async function institutionAudit(instId, actorId, actorName, action, meta=null) {
  try {
    const pool = poolOrThrow();
    await pool.query(
      `INSERT INTO institution_audit (institution_id, actor_id, actor_name, action, meta)
       VALUES (?,?,?,?,?)`,
      [instId, actorId, actorName, action, meta ? JSON.stringify(meta) : null]
    );
  } catch (e) { console.error('[inst audit]', e.message); }
}

app.get('/api/institution/me', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  res.json({ institution: req.institution });
}));

app.put('/api/institution/profile', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const allowed = ['name','type','industry','contact_phone','address'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (sets.length) {
    vals.push(req.institution.id);
    await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  }
  res.json({ ok:true });
}));

app.put('/api/institution/settings', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  if (req.institutionRole !== 'operations_manager') {
    return res.status(403).json({ error:'Only Operations Manager can change settings' });
  }
  const pool = poolOrThrow();
  const b = req.body;
  const sets = []; const vals = [];
  if (b.name             !== undefined) { sets.push('name=?');             vals.push(b.name); }
  if (b.contact_email    !== undefined) { sets.push('contact_email=?');    vals.push(b.contact_email); }
  if (b.default_capacity !== undefined) { sets.push('default_capacity=?'); vals.push(Number(b.default_capacity)); }
  if (b.pass_mark        !== undefined) { sets.push('pass_mark=?');        vals.push(Number(b.pass_mark)); }
  if (sets.length) {
    vals.push(req.institution.id);
    await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  }
  res.json({ ok:true });
}));

app.get('/api/institution/programmes', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM cohort_trainees ct
              JOIN cohorts c ON c.id = ct.cohort_id
              WHERE c.programme_id = p.id) AS enrolled_count
       FROM programmes p WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]
  );
  res.json({ programmes: rows });
}));

app.post('/api/institution/programmes', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.title) return res.status(400).json({ error:'Title required' });
  const [r] = await pool.query(
    `INSERT INTO programmes
       (institution_id, title, description, category, status, start_date, end_date, capacity)
     VALUES (?,?,?,?,?,?,?,?)`,
    [req.institution.id, b.title, b.description||'', b.category||'General',
     b.status||'draft', b.start_date||null, b.end_date||null,
     Number(b.capacity||req.institution.default_capacity||30)]
  );
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Created programme "${b.title}"`);
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/institution/programmes/:id', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const allowed = ['title','description','category','status','capacity','start_date','end_date'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok:true });
  vals.push(req.params.id, req.institution.id);
  await pool.query(`UPDATE programmes SET ${sets.join(',')} WHERE id=? AND institution_id=?`, vals);
  res.json({ ok:true });
}));

app.delete('/api/institution/programmes/:id', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM programmes WHERE id=? AND institution_id=?',
    [req.params.id, req.institution.id]);
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Deleted programme #${req.params.id}`);
  res.json({ ok:true });
}));

app.get('/api/institution/cohorts', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT c.*, p.title programme_title,
            (SELECT name FROM users WHERE id=c.instructor_id) instructor_name,
            (SELECT COUNT(*) FROM cohort_trainees ct WHERE ct.cohort_id=c.id) trainee_count
       FROM cohorts c
       LEFT JOIN programmes p ON p.id=c.programme_id
      WHERE c.institution_id=? ORDER BY c.created_at DESC`,
    [req.institution.id]
  );
  res.json({ cohorts: rows });
}));

app.post('/api/institution/cohorts', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.name || !b.programme_id) return res.status(400).json({ error:'name and programme_id required' });
  const [r] = await pool.query(
    `INSERT INTO cohorts
       (institution_id, programme_id, name, instructor_id, start_date, end_date, capacity, status)
     VALUES (?,?,?,?,?,?,?,?)`,
    [req.institution.id, Number(b.programme_id), b.name, b.instructor_id||null,
     b.start_date||null, b.end_date||null,
     Number(b.capacity||req.institution.default_capacity||30), b.status||'active']
  );
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Created cohort "${b.name}"`);
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/institution/cohorts/:id', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const allowed = ['name','capacity','status','programme_id','instructor_id','start_date','end_date'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok:true });
  vals.push(req.params.id, req.institution.id);
  await pool.query(`UPDATE cohorts SET ${sets.join(',')} WHERE id=? AND institution_id=?`, vals);
  res.json({ ok:true });
}));

app.delete('/api/institution/cohorts/:id', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM cohorts WHERE id=? AND institution_id=?',
    [req.params.id, req.institution.id]);
  res.json({ ok:true });
}));

app.get('/api/institution/assessments', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT a.*, c.name cohort_name FROM assessments a
       LEFT JOIN cohorts c ON c.id=a.cohort_id
      WHERE a.institution_id=? ORDER BY a.created_at DESC`,
    [req.institution.id]
  );
  res.json({ assessments: rows });
}));

app.post('/api/institution/assessments', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.title || !b.cohort_id) return res.status(400).json({ error:'title and cohort_id required' });
  const [r] = await pool.query(
    `INSERT INTO assessments (institution_id, cohort_id, title, type, weight, due_date, status)
     VALUES (?,?,?,?,?,?, 'scheduled')`,
    [req.institution.id, Number(b.cohort_id), b.title, b.type||'quiz', Number(b.weight||0), b.due_date||null]
  );
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Scheduled assessment "${b.title}"`);
  res.status(201).json({ id: r.insertId });
}));

app.delete('/api/institution/assessments/:id', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM assessments WHERE id=? AND institution_id=?',
    [req.params.id, req.institution.id]);
  res.json({ ok:true });
}));

app.get('/api/institution/projects', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT p.*, c.name cohort_name FROM projects p
       LEFT JOIN cohorts c ON c.id=p.cohort_id
      WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]
  );
  res.json({ projects: rows });
}));

app.post('/api/institution/projects', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.title || !b.cohort_id) return res.status(400).json({ error:'title and cohort_id required' });
  const [r] = await pool.query(
    `INSERT INTO projects (institution_id, cohort_id, title, description, category, deadline, status)
     VALUES (?,?,?,?,?,?, 'active')`,
    [req.institution.id, Number(b.cohort_id), b.title, b.description||'',
     b.category||'Project', b.deadline||null]
  );
  res.status(201).json({ id: r.insertId });
}));

app.get('/api/institution/trainees', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT t.*, p.title programme_title, c.name cohort_name
       FROM trainees t
       LEFT JOIN programmes p ON p.id=t.programme_id
       LEFT JOIN cohorts c ON c.id=t.cohort_id
      WHERE t.institution_id=? ORDER BY t.created_at DESC`,
    [req.institution.id]
  );
  res.json({ trainees: rows });
}));

app.post('/api/institution/trainees/invite', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { emails = [], programme_id } = req.body;
  if (!Array.isArray(emails) || !emails.length) return res.status(400).json({ error:'emails required' });
  const [[programme]] = await pool.query(
    'SELECT * FROM programmes WHERE id=? AND institution_id=?',
    [Number(programme_id), req.institution.id]
  );
  const [[cohort]] = programme
    ? await pool.query('SELECT * FROM cohorts WHERE programme_id=? LIMIT 1', [programme.id])
    : [[null]];

  let invited = 0;
  for (const email of emails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    await pool.query(
      `INSERT INTO trainees (institution_id, name, email, programme_id, cohort_id, progress, status)
       VALUES (?,?,?,?,?, 0, 'invited')`,
      [req.institution.id, email.split('@')[0], email, programme?.id||null, cohort?.id||null]
    );
    invited++;
  }
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Invited ${invited} trainee(s)`);
  res.status(201).json({ invited, emails });
}));

app.get('/api/institution/instructors', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT i.*,
            (SELECT COUNT(*) FROM cohorts c WHERE c.instructor_id=i.expert_id) programme_count
       FROM institution_instructors i WHERE i.institution_id=?`,
    [req.institution.id]
  );
  res.json({ instructors: rows });
}));

app.post('/api/institution/instructors', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { expert_id } = req.body;
  const [[expert]] = await pool.query(
    "SELECT id,name,specialization FROM users WHERE id=? AND role='expert'",
    [expert_id]
  );
  if (!expert) return res.status(404).json({ error:'Expert not found' });
  const [[exists]] = await pool.query(
    'SELECT id FROM institution_instructors WHERE institution_id=? AND expert_id=?',
    [req.institution.id, expert.id]
  );
  if (exists) return res.json({ id: exists.id, already: true });
  const [r] = await pool.query(
    `INSERT INTO institution_instructors (institution_id, expert_id, name, specialization, status)
     VALUES (?,?,?,?, 'active')`,
    [req.institution.id, expert.id, expert.name, expert.specialization]
  );
  res.status(201).json({ id: r.insertId });
}));

app.get('/api/institution/team', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  if (req.institutionRole !== 'operations_manager') return res.json({ team: [] });
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT id, name, email, institution_role, status FROM users
      WHERE institution_id=? AND role='institution' ORDER BY created_at`,
    [req.institution.id]
  );
  res.json({ team: rows });
}));

app.post('/api/institution/team/invite', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  if (req.institutionRole !== 'operations_manager') {
    return res.status(403).json({ error:'Only Operations Manager can invite team members' });
  }
  const pool = poolOrThrow();
  const { name, email, institution_role } = req.body;
  if (!name || !email) return res.status(400).json({ error:'name and email required' });
  if (!INSTITUTION_ROLES.includes(institution_role)) return res.status(400).json({ error:'Invalid role' });
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error:'Email already registered' });

  const tempPwd = nanoid(10);
  const hash = await bcrypt.hash(tempPwd, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,intent)
     VALUES (?,?,?, 'institution','active',?,?,'both')`,
    [name, email, hash, req.institution.id, institution_role]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Invited ${name} (${institution_role})`);
  res.status(201).json({ id: r.insertId, temp_password: tempPwd });
}));

app.delete('/api/institution/team/:id', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  if (req.institutionRole !== 'operations_manager') {
    return res.status(403).json({ error:'Only Operations Manager can remove team members' });
  }
  const pool = poolOrThrow();
  const [[tm]] = await pool.query('SELECT id, institution_id FROM users WHERE id=?', [req.params.id]);
  if (!tm || tm.institution_id !== req.institution.id) {
    return res.status(404).json({ error:'Team member not found' });
  }
  if (Number(req.params.id) === req.institution.ops_manager_id) {
    return res.status(400).json({ error:'Cannot remove Operations Manager' });
  }
  await pool.query("UPDATE users SET status='suspended' WHERE id=?", [req.params.id]);
  res.json({ ok:true });
}));

app.put('/api/institution/requests/:id/approve', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  if (req.institutionRole !== 'operations_manager') {
    return res.status(403).json({ error:'Only Operations Manager' });
  }
  const pool = poolOrThrow();
  await pool.query(
    "UPDATE institution_requests SET status='approved' WHERE id=? AND institution_id=?",
    [req.params.id, req.institution.id]
  );
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Approved request #${req.params.id}`);
  res.json({ ok:true });
}));

app.put('/api/institution/requests/:id/reject', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  if (req.institutionRole !== 'operations_manager') {
    return res.status(403).json({ error:'Only Operations Manager' });
  }
  const pool = poolOrThrow();
  await pool.query(
    "UPDATE institution_requests SET status='rejected' WHERE id=? AND institution_id=?",
    [req.params.id, req.institution.id]
  );
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Rejected request #${req.params.id}`);
  res.json({ ok:true });
}));

app.get('/api/institution/stats', auth(), requireDB, requireInstitution, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const [[{ programmes }]]  = await pool.query('SELECT COUNT(*) programmes FROM programmes WHERE institution_id=?', [req.institution.id]);
  const [[{ cohorts }]]     = await pool.query('SELECT COUNT(*) cohorts FROM cohorts WHERE institution_id=?', [req.institution.id]);
  const [[{ assessments }]] = await pool.query('SELECT COUNT(*) assessments FROM assessments WHERE institution_id=?', [req.institution.id]);
  const [[{ projects }]]    = await pool.query('SELECT COUNT(*) projects FROM projects WHERE institution_id=?', [req.institution.id]);
  const [[{ trainees }]]    = await pool.query('SELECT COUNT(*) trainees FROM trainees WHERE institution_id=?', [req.institution.id]);
  const [[{ instructors }]] = await pool.query('SELECT COUNT(*) instructors FROM institution_instructors WHERE institution_id=?', [req.institution.id]);
  const [[{ avg_completion_rate }]] = await pool.query(
    'SELECT COALESCE(AVG(progress),0) avg_completion_rate FROM trainees WHERE institution_id=?',
    [req.institution.id]
  );
  const [[{ avg_score }]] = await pool.query(
    'SELECT COALESCE(AVG(assessment_avg),0) avg_score FROM trainees WHERE institution_id=? AND assessment_avg IS NOT NULL',
    [req.institution.id]
  );
  const [pendingApprovals] = await pool.query(
    "SELECT id,title,type,requested_by,created_at FROM institution_requests WHERE institution_id=? AND status='pending'",
    [req.institution.id]
  );
  const [auditLog] = await pool.query(
    'SELECT * FROM institution_audit WHERE institution_id=? ORDER BY created_at DESC LIMIT 30',
    [req.institution.id]
  );
  const [upcomingCohorts] = await pool.query(
    "SELECT id, name FROM cohorts WHERE institution_id=? AND status='active' ORDER BY start_date LIMIT 5",
    [req.institution.id]
  );
  const upcomingSessions = upcomingCohorts.map((c, i) => ({
    id: c.id, title: `Live session — ${c.name}`, cohort_name: c.name,
    scheduled_at: new Date(Date.now() + (i+1) * 86400000), mode: 'online',
  }));

  res.json({
    stats: {
      avg_completion_rate: Math.round(Number(avg_completion_rate)||0),
      avg_score: Math.round(Number(avg_score)||0),
      projects_submitted: 0,
      certificates_issued: 0,
      upcomingSessions,
      pendingApprovals,
      auditLog,
      totals: { programmes, cohorts, assessments, projects, trainees, instructors },
    },
  });
}));

/* ============================================================
   STATIC + SPA FALLBACK
   ============================================================ */
app.use(express.static(path.join(__dirname, 'public')));
app.get(/.*/, (req,res,next) => {
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

/* Global error handler */
app.use((err, req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

/* ============================================================
   SOCKET.IO
   ============================================================ */
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.corsOrigin } });

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
    console.log(`\n✅ ExpertHub 2.0 API listening on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.env}`);
    console.log(`   Health:      http://localhost:${config.port}/api/health`);
    if (demo.active) {
      console.log('\n   ⚡ DEMO MODE ACTIVE — in-memory backend, no MySQL required');
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

/* ---------- Graceful shutdown ---------- */
async function shutdown(signal) {
  console.log(`\n[${signal}] shutting down…`);
  try { if (dbState.pool) await dbState.pool.end(); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException',  (err) => { console.error('[uncaughtException]', err); });
