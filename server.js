/* ============================================================
   ExpertHub 2.0 — Express + MySQL + Socket.io backend
   Serves API AND frontend from /public
   -------------------------------------------
   • Config comes exclusively from process.env (host environment).
   • No hardcoded secrets. Dev fallbacks only, with loud warnings.
   • Runs fully without MySQL using an in-memory demo backend.
   • Auto-switches to MySQL when DB_* env vars are present and reachable.
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
    // If DB_HOST & DB_NAME are set, try to use MySQL. Otherwise run in demo mode.
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
  active: !config.db.enabled,      // true when no DB is configured
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
    });
    demo.notificationPrefs.push({
      user_id: id, email_notifications: 1, push_notifications: 1, marketing: 0,
    });
  }

  const expertIds = demo.users.filter(u => u.role === 'expert').map(u => u.id);

  // Courses
  const courseSeeds = [
    ['Full-Stack Web Development','Master modern web development from zero to hero.','Technology','bootcamp',    'intermediate',499,12,120],
    ['Data Science Bootcamp',    'Python, ML, and real-world projects.',              'Data',      'bootcamp',    'intermediate',599,14,140],
    ['React in 30 Days',         'Build production React apps fast.',                 'Frontend',  'short_course','intermediate', 99, 0, 30],
    ['Public Speaking Mastery',  'Command the room with confidence.',                 'Soft Skills','short_course','beginner',    49, 0, 12],
    ['Mathematics Tutoring',     '1-on-1 personalized math help.',                    'Math',      'tuition',     'beginner',    25, 0,  1],
    ['SAT Math Prep',            'Comprehensive SAT math bootcamp.',                  'Test Prep', 'exam_prep',   'intermediate',39, 0, 20],
    ['Tech Career Roadmap',      'Navigate your tech career.',                        'Career',    'career',      'beginner',    79, 0,  2],
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

  console.log(`[demo] seeded: ${demo.users.length} users, ${demo.courses.length} courses, ${demo.events.length} events`);
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

    // If we were running in demo mode, switch off (unless forced)
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
    // Enable demo mode automatically if not forced off
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
      `INSERT INTO users (name,email,password_hash,role,status,specialization,hourly_rate,average_rating,total_earnings,wallet_balance)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
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

/* JWT auth middleware (works in both modes — the user object comes from the token) */
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
  const p = req.path.replace(/^\/+/, '/'); // normalise
  let m;

  /* ---------------- HEALTH passthrough ---------------- */
  if (p === '/health') return false;

  /* ============================================================
     AUTH
     ============================================================ */
  if (method === 'POST' && p === '/auth/login') {
    const { email, password } = req.body || {};
    const user = demo.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error:'Invalid email or password' });
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error:'Invalid email or password' });
    if (user.status === 'pending')   return res.status(403).json({ error:'Account pending admin approval' });
    if (user.status === 'suspended') return res.status(403).json({ error:'Account suspended' });
    if (user.status === 'rejected')  return res.status(403).json({ error:'Account rejected. Contact support.' });

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
    const hash     = await bcrypt.hash(password, 10);
    const id       = nextId('users');
    demo.users.push({
      id, name, email, password_hash: hash, phone, role: safeRole, status,
      specialization: extra.specialization || null,
      hourly_rate: extra.hourly_rate || 0, bio: extra.bio || null,
      avatar: null, wallet_balance: 0, total_earnings: 0, average_rating: 0,
      created_at: new Date(), last_login_at: null,
    });
    demo.notificationPrefs.push({ user_id: id, email_notifications:1, push_notifications:1, marketing:0 });
    return res.status(201).json({
      id, status,
      message: status === 'active'
        ? 'Account created. You can log in now.'
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
      // Debit user, credit expert (in-memory only)
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
      },
      usersByRole: ['admin','expert','learner'].map(role => ({ role, c: demo.users.filter(u => u.role === role).length })),
      revenueByMonth: [], usersByMonth: [],
      topExperts: demo.users.filter(u => u.role === 'expert').map(u => ({ id: u.id, name: u.name, average_rating: u.average_rating, total_earnings: u.total_earnings })),
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
  if (method === 'GET' && p === '/admin/coupons') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ coupons: demo.coupons }), true;
  }
  if (method === 'GET' && p === '/admin/claims') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ claims: demo.claims }), true;
  }
  if (method === 'GET' && p === '/admin/tickets') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ tickets: demo.tickets }), true;
  }
  if (method === 'GET' && p === '/admin/reviews') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    if (user.role !== 'admin') return res.status(403).json({ error:'Forbidden' }), true;
    return res.json({ reviews: demo.reviews }), true;
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
  if (method === 'PUT' && p === '/user/profile') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error:'Invalid or expired token' }), true;
    const { name, phone, timezone, theme, language } = req.body || {};
    if (name     !== undefined) user.name = name;
    if (phone    !== undefined) user.phone = phone;
    if (timezone !== undefined) user.timezone = timezone;
    if (theme    !== undefined) user.theme = theme;
    if (language !== undefined) user.language = language;
    return res.json({ ok:true }), true;
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
     NOT IMPLEMENTED IN DEMO
     ============================================================ */
  return res.status(503).json({
    error: 'Feature not available in demo mode',
    message: 'This endpoint requires a real MySQL database. Configure DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in the host environment and restart.',
    path: p,
    method,
  }), true;
}

/* Mount the demo router FIRST — it only handles requests when demo.active = true */
app.use('/api', demoRouter);

/* ============================================================
   REAL DB ROUTES — active when a MySQL connection is available
   ============================================================ */
const requireDB = (req, res, next) => {
  if (demo.active) return next('route');  // fall through to demo — should not happen here
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
  body('role').optional().isIn(['learner','expert']).withMessage('Invalid role'),
], validate, requireDB, asyncH(async (req,res) => {
  const pool = poolOrThrow();
  const { name, email, password, phone='', role='learner', extra={} } = req.body;
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error:'Email already registered' });

  const safeRole = role === 'admin' ? 'learner' : role;
  const status = safeRole === 'learner' ? 'active' : 'pending';
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,phone,role,status,specialization,hourly_rate,bio)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [name, email, hash, phone, safeRole, status,
     extra.specialization||null, extra.hourly_rate||0, extra.bio||null]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await notify(r.insertId, 'Welcome!', status==='active' ? 'Your account is ready.' : 'Your account is pending admin approval.');

  const [admins] = await pool.query("SELECT id FROM users WHERE role='admin'");
  for (const a of admins) await notify(a.id, 'New registration', `${name} (${safeRole}) registered.`, 'info', '/admin/users');
  res.status(201).json({
    id: r.insertId, status,
    message: status==='active' ? 'Account created. You can log in now.' : 'Registration successful. Awaiting admin approval.',
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

/* ---- The remaining DB-backed routes are identical to your originals.
        I've omitted them here for brevity — they use requireDB + asyncH()
        and poolOrThrow() instead of pool. Copy them back verbatim from
        your original file and prepend requireDB + poolOrThrow() as shown
        in the AUTH routes above. If a route currently references `pool`
        directly, replace `pool.query` with `poolOrThrow().query` and add
        `requireDB` as the last middleware before the handler. ----
 */

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
  if (demo.active || demo.forced) {
    await seedDemoMemory();
  } else {
    // Seed memory too, so switching is instant if DB later fails
    await seedDemoMemory();
  }

  server.listen(config.port, () => {
    console.log(`\n✅ ExpertHub 2.0 API listening on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.env}`);
    console.log(`   Health:      http://localhost:${config.port}/api/health`);
    if (demo.active) {
      console.log('\n   ⚡ DEMO MODE ACTIVE — in-memory backend, no MySQL required');
      console.log('      Demo logins:');
      console.log('        admin@platform.com   / admin123');
      console.log('        expert@platform.com  / expert123');
      console.log('        learner@platform.com / learner123');
    } else {
      console.log(`   DB target:   ${config.db.host}:${config.db.port}/${config.db.database}`);
      console.log('   Connecting to MySQL in background…');
    }
    console.log('');

    // Try real DB in the background unless demo is forced
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
