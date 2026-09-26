/* ============================================================
   ExpertHub 2.0 — Express + MySQL + Socket.io backend
   Serves API AND frontend from /public
   -------------------------------------------
   Improvements:
   - All config comes from .env (no hidden defaults for secrets)
   - Server boots even if MySQL is unreachable (graceful degrade)
   - Auto-reconnect loop for the DB pool
   - /api/health endpoint reports DB + uptime
   - Bootstrap/seed skipped when DB disabled or unavailable
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
   CONFIG (all from .env)
   ============================================================ */
const config = {
  env:  process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),

  db: {
    // Set ENABLE_DB=false to run the server without any DB.
    enabled: process.env.ENABLE_DB !== 'false',
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT || 3306),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    poolSize: Number(process.env.DB_POOL_SIZE || 15),
    retryMs:  Number(process.env.DB_RETRY_MS || 10000),
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

  bootstrap: {
    runSchema: process.env.RUN_SCHEMA !== 'false',
    seed:      process.env.SEED_DEMO_DATA !== 'false',
    schemaFile: process.env.SCHEMA_FILE || 'database.sql',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

/* ---------- Validate required env vars ---------- */
function validateEnv() {
  const missing = [];
  if (!config.jwt.secret)        missing.push('JWT_SECRET');
  if (!config.jwt.refreshSecret) missing.push('JWT_REFRESH_SECRET');
  if (config.db.enabled) {
    if (!config.db.host)     missing.push('DB_HOST');
    if (!config.db.user)     missing.push('DB_USER');
    if (!config.db.database) missing.push('DB_NAME');
  }

  if (missing.length) {
    const msg = `Missing required env vars: ${missing.join(', ')}`;
    if (config.env === 'production') {
      console.error(`❌ ${msg}`);
      process.exit(1);
    } else {
      console.warn(`⚠️  ${msg} — dev mode, using insecure fallbacks. DO NOT use in production.`);
      if (!config.jwt.secret)        config.jwt.secret        = 'dev_secret_change_me';
      if (!config.jwt.refreshSecret) config.jwt.refreshSecret = 'dev_refresh_change_me';
    }
  }
}
validateEnv();

/* ============================================================
   DATABASE — resilient pool with reconnect
   ============================================================ */
const dbState = {
  pool: null,
  connected: false,
  connecting: false,
  lastError: null,
  lastAttempt: null,
  lastSuccess: null,
};

async function tryConnect() {
  if (!config.db.enabled) {
    console.log('[db] disabled via ENABLE_DB=false — API will return 503 for DB routes');
    return;
  }
  if (dbState.connecting || dbState.connected) return;

  dbState.connecting = true;
  dbState.lastAttempt = new Date();

  try {
    // Build pool
    if (!dbState.pool) {
      dbState.pool = mysql.createPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        waitForConnections: true,
        connectionLimit: config.db.poolSize,
        namedPlaceholders: true,
        timezone: 'Z',
        connectTimeout: 5000,
      });
    }
    // Verify connectivity
    const conn = await dbState.pool.getConnection();
    await conn.ping();
    conn.release();

    dbState.connected = true;
    dbState.lastError = null;
    dbState.lastSuccess = new Date();
    console.log(`[db] connected → ${config.db.host}:${config.db.port}/${config.db.database}`);

    // Run bootstrap once connected
    onDatabaseReady().catch(e => console.error('[db] post-connect bootstrap error:', e.message));
  } catch (err) {
    dbState.connected = false;
    dbState.lastError = err.message;
    console.warn(`[db] connect failed: ${err.message} — retrying in ${config.db.retryMs}ms`);
    // Destroy broken pool so we rebuild next attempt
    if (dbState.pool) { try { await dbState.pool.end(); } catch {} dbState.pool = null; }
    setTimeout(tryConnect, config.db.retryMs);
  } finally {
    dbState.connecting = false;
  }
}

/** Returns the pool or throws if DB unavailable. */
function getPool() {
  if (!dbState.connected || !dbState.pool) {
    const e = new Error('Database unavailable');
    e.status = 503;
    throw e;
  }
  return dbState.pool;
}

/** Middleware: block API routes when DB is down. */
function requireDB(req, res, next) {
  if (!dbState.connected) {
    return res.status(503).json({
      error: 'Database unavailable',
      hint: 'Configure DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in .env and restart, or wait for auto-reconnect.',
      last_attempt: dbState.lastAttempt,
      last_error: dbState.lastError,
    });
  }
  next();
}

/** Called once when the pool first becomes available. */
let dbInitialised = false;
async function onDatabaseReady() {
  if (dbInitialised) return;
  dbInitialised = true;
  try {
    if (config.bootstrap.runSchema) await bootstrapDatabase();
    if (config.bootstrap.seed)     await seedDemoData();
  } catch (e) {
    console.error('[db] bootstrap/seed error:', e.message);
  }
}

/* ---------- Schema bootstrap ---------- */
async function bootstrapDatabase() {
  const schemaPath = path.join(__dirname, config.bootstrap.schemaFile);
  if (!fs.existsSync(schemaPath)) {
    console.warn(`[db] schema file not found at ${schemaPath} — skipping schema bootstrap`);
    return;
  }
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const sanitized = schema
    .split('\n')
    .filter(l => !/^\s*(CREATE DATABASE|USE )/i.test(l))
    .join('\n');

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });
  await conn.query(sanitized).catch(e => console.warn('[db] schema warning:', e.message));
  await conn.end();
  console.log('[db] schema bootstrap complete');
}

/* ---------- Demo seed ---------- */
async function seedDemoData() {
  const pool = getPool();
  const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM users');
  if (c > 0) return;

  const demo = [
    { name:'System Admin',     email:'admin@platform.com',   pwd:'admin123',   role:'admin',   status:'active', spec:'Platform Operations', rate:0 },
    { name:'Dr. Sarah Kimani', email:'expert@platform.com',  pwd:'expert123',  role:'expert',  status:'active', spec:'Data Science & AI',   rate:75 },
    { name:'John Mwangi',      email:'learner@platform.com', pwd:'learner123', role:'learner', status:'active', spec:null, rate:0 },
    { name:'Aisha Bello',      email:'aisha@platform.com',   pwd:'expert123',  role:'expert',  status:'active', spec:'Business Strategy',  rate:90 },
    { name:'Kwame Mensah',     email:'kwame@platform.com',   pwd:'expert123',  role:'expert',  status:'active', spec:'Full-Stack Dev',     rate:80 },
    { name:'Grace Ochieng',    email:'grace@platform.com',   pwd:'expert123',  role:'expert',  status:'active', spec:'UX Design',          rate:65 },
    { name:'Pending Expert',   email:'pending@platform.com', pwd:'expert123',  role:'expert',  status:'pending',spec:'Marketing',          rate:55 },
  ];
  for (const u of demo) {
    const hash = await bcrypt.hash(u.pwd, 10);
    const [r] = await pool.query(
      `INSERT INTO users (name,email,password_hash,role,status,specialization,hourly_rate,average_rating,total_earnings,wallet_balance)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [u.name, u.email, hash, u.role, u.status, u.spec, u.rate,
       u.role==='expert'?4.7:0, u.role==='expert'?1250:0, u.role==='expert'?320:0]
    );
    await pool.query(`INSERT INTO notification_prefs (user_id) VALUES (?)`, [r.insertId]);
  }

  const [expertRows] = await pool.query("SELECT id FROM users WHERE role='expert'");
  const expertIds = expertRows.map(r => r.id);

  const courses = [
    ['Full-Stack Web Development','Master modern web development from zero to hero.','Technology','bootcamp','intermediate',499,12,0,120],
    ['Data Science Bootcamp','Python, ML, and real-world projects.','Data','bootcamp','intermediate',599,14,0,140],
    ['React in 30 Days','Build production React apps fast.','Frontend','short_course','intermediate',99,0,30,30],
    ['Public Speaking Mastery','Command the room with confidence.','Soft Skills','short_course','beginner',49,0,12,12],
    ['Mathematics Tutoring','1-on-1 personalized math help.','Math','tuition','beginner',25,0,1,1],
    ['SAT Math Prep','Comprehensive SAT math bootcamp.','Test Prep','exam_prep','intermediate',39,0,20,20],
    ['Tech Career Roadmap','Navigate your tech career.','Career','career','beginner',79,0,2,2],
  ];
  for (const c of courses) {
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

  const events = [
    ['Live Bootcamp: Intro to AI','Hands-on introduction to machine learning.','Technology',7,500,100,0],
    ['Career Webinar: Tech Jobs','How to break into tech in 2026.','Career',14,300,200,0],
    ['Design Thinking Workshop','Practical design thinking for teams.','Design',21,400,50,25],
  ];
  for (const [title,desc,cat,days,pay,cap,price] of events) {
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

  console.log('[seed] demo data inserted');
}

/* ============================================================
   APP + MIDDLEWARE
   ============================================================ */
const now = () => new Date();
const genRef = (p='TX') => `${p}-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;
const asyncH = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

const app = express();
app.set('trust proxy', 1);
app.use(compression());
app.use(cors({ origin: config.cors.origin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

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

/* Health check — no DB required */
app.get('/api/health', (req,res) => {
  res.json({
    ok: true,
    env: config.env,
    uptime: process.uptime(),
    db: {
      enabled: config.db.enabled,
      connected: dbState.connected,
      last_attempt: dbState.lastAttempt,
      last_success: dbState.lastSuccess,
      last_error: dbState.lastError,
    },
    time: new Date().toISOString(),
  });
});

/* Validation helper */
const validate = (req,res,next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, errors: errs.array() });
  next();
};

/* Auth middleware */
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

/* ============================================================
   DATABASE-BACKED HELPERS
   ============================================================ */
async function logAudit(actorId, action, target, targetId, meta, ip) {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO audit_logs (actor_id,action,target,target_id,meta,ip) VALUES (?,?,?,?,?,?)`,
      [actorId||null, action, target||null, targetId||null, meta?JSON.stringify(meta):null, ip||null]
    );
  } catch (e) { console.error('audit log failed', e.message); }
}

async function notify(userId, title, message, type='info', link=null) {
  const pool = getPool();
  const [r] = await pool.query(
    `INSERT INTO notifications (user_id,title,message,type,link) VALUES (?,?,?,?,?)`,
    [userId, title, message, type, link]
  );
  io.to(`user_${userId}`).emit('notification', { id: r.insertId, user_id: userId, title, message, type, link, is_read: 0, created_at: now() });
  return r.insertId;
}

async function creditWallet(userId, amount, reason, ref=null) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id=?', [amount, userId]);
    const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id=?', [userId]);
    await conn.query(
      'INSERT INTO wallet_ledger (user_id,amount,balance_after,reason,reference) VALUES (?,?,?,?,?)',
      [userId, amount, u.wallet_balance, reason, ref]
    );
    await conn.commit();
    return u.wallet_balance;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function debitWallet(userId, amount, reason, ref=null) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id=? FOR UPDATE', [userId]);
    if (!u || Number(u.wallet_balance) < Number(amount)) throw new Error('Insufficient balance');
    await conn.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id=?', [amount, userId]);
    const [[u2]] = await conn.query('SELECT wallet_balance FROM users WHERE id=?', [userId]);
    await conn.query(
      'INSERT INTO wallet_ledger (user_id,amount,balance_after,reason,reference) VALUES (?,?,?,?,?)',
      [userId, -amount, u2.wallet_balance, reason, ref]
    );
    await conn.commit();
    return u2.wallet_balance;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

/* ============================================================
   AUTH ROUTES
   ============================================================ */
app.post('/api/auth/register', [
  body('name').isLength({ min:2, max:120 }).withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min:8 }).withMessage('Password must be at least 8 chars'),
  body('role').optional().isIn(['learner','expert']).withMessage('Invalid role'),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
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
  for (const a of admins) {
    await notify(a.id, 'New registration', `${name} (${safeRole}) registered.`, 'info', '/admin/users');
  }
  res.status(201).json({
    id: r.insertId, status,
    message: status==='active'
      ? 'Account created. You can log in now.'
      : 'Registration successful. Awaiting admin approval.',
  });
}));

app.post('/api/auth/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
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

app.post('/api/auth/refresh', asyncH(async (req,res) => {
  const pool = getPool();
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error:'Refresh token required' });
  let payload;
  try { payload = jwt.verify(refresh, config.jwt.refreshSecret); } catch { return res.status(401).json({ error:'Invalid refresh token' }); }
  const [[row]] = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token=? AND revoked=0 AND expires_at > NOW()', [refresh]
  );
  if (!row) return res.status(401).json({ error:'Refresh token revoked or expired' });
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [payload.id]);
  if (!u || u.status !== 'active') return res.status(403).json({ error:'Account not active' });
  const token = jwt.sign({ id:u.id, role:u.role, email:u.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  res.json({ token });
}));

app.post('/api/auth/logout', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const { refresh } = req.body || {};
  if (refresh) await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE token=?', [refresh]);
  res.json({ ok:true });
}));

app.get('/api/auth/me', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  if (!u) return res.status(404).json({ error:'Not found' });
  delete u.password_hash;
  res.json({ user:u });
}));

app.post('/api/auth/forgot', [body('email').isEmail()], validate, asyncH(async (req,res) => {
  const pool = getPool();
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
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { token, password } = req.body;
  const [[row]] = await pool.query(
    'SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > NOW()', [token]
  );
  if (!row) return res.status(400).json({ error:'Invalid or expired token' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, row.user_id]);
  await pool.query('UPDATE password_resets SET used=1 WHERE id=?', [row.id]);
  await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', [row.user_id]);
  res.json({ ok:true });
}));

app.put('/api/auth/password', auth(), [
  body('old_password').notEmpty(),
  body('new_password').isLength({ min:8 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const [[u]] = await pool.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
  const ok = await bcrypt.compare(req.body.old_password, u.password_hash);
  if (!ok) return res.status(400).json({ error:'Current password is incorrect' });
  const hash = await bcrypt.hash(req.body.new_password, 10);
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
  await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', [req.user.id]);
  res.json({ ok:true });
}));

/* ============================================================
   COMMON
   ============================================================ */
app.get('/api/common/notifications', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const limit = Math.min(Number(req.query.limit||30), 100);
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE user_id IS NULL OR user_id=? ORDER BY created_at DESC LIMIT ?`,
    [req.user.id, limit]
  );
  const [[{ unread }]] = await pool.query(
    `SELECT COUNT(*) AS unread FROM notifications WHERE (user_id IS NULL OR user_id=?) AND is_read=0`,
    [req.user.id]
  );
  res.json({ notifications: rows, unread });
}));

app.put('/api/common/notifications/:id/read', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query('UPDATE notifications SET is_read=1 WHERE id=? AND (user_id=? OR user_id IS NULL)', [req.params.id, req.user.id]);
  res.json({ ok:true });
}));

app.put('/api/common/notifications/read-all', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
  res.json({ ok:true });
}));

app.get('/api/common/consultations', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const page = Math.max(Number(req.query.page||1),1);
  const per  = Math.min(Number(req.query.per||20),100);
  const offset = (page-1)*per;
  const status = req.query.status || null;
  let where = []; let args = [];
  if (req.user.role === 'expert') { where.push('c.expert_id=?'); args.push(req.user.id); }
  else if (req.user.role === 'learner') { where.push('c.user_id=?'); args.push(req.user.id); }
  if (status) { where.push('c.status=?'); args.push(status); }
  const whereSQL = where.length ? 'WHERE '+where.join(' AND ') : '';
  const [rows] = await pool.query(
    `SELECT c.*, u.name AS client_name, e.name AS expert_name
     FROM consultations c
     LEFT JOIN users u ON u.id=c.user_id
     LEFT JOIN users e ON e.id=c.expert_id
     ${whereSQL}
     ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [...args, per, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM consultations c ${whereSQL}`, args);
  res.json({ consultations: rows, total, page, pages: Math.max(1, Math.ceil(total/per)) });
}));

app.get('/api/common/events', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT e.*, u.name AS expert_name,
       (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id=e.id AND er.status='registered') AS registered_count
     FROM events e LEFT JOIN users u ON u.id=e.expert_id
     WHERE e.status='published' ORDER BY e.date ASC`
  );
  res.json({ events: rows });
}));

app.post('/api/common/events/:id/register', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const eventId = Number(req.params.id);
  const [[ev]] = await pool.query('SELECT * FROM events WHERE id=?', [eventId]);
  if (!ev) return res.status(404).json({ error:'Event not found' });
  await pool.query(
    `INSERT INTO event_registrations (event_id,user_id) VALUES (?,?) ON DUPLICATE KEY UPDATE status='registered'`,
    [eventId, req.user.id]
  );
  await notify(req.user.id, 'Event registered', `You're registered for "${ev.title}".`);
  res.json({ ok:true });
}));

/* ============================================================
   ESCHOOL
   ============================================================ */
app.get('/api/eschool/courses', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const type = req.query.type || null;
  const q = req.query.q || null;
  const page = Math.max(Number(req.query.page||1),1);
  const per = Math.min(Number(req.query.per||20),100);
  const offset = (page-1)*per;
  const where = [`status='published'`]; const args = [];
  if (type) { where.push('course_type=?'); args.push(type); }
  if (q)    { where.push('(title LIKE ? OR description LIKE ?)'); args.push(`%${q}%`,`%${q}%`); }
  const whereSQL = 'WHERE '+where.join(' AND ');
  const [rows] = await pool.query(
    `SELECT c.*, u.name AS expert_name FROM courses c LEFT JOIN users u ON u.id=c.expert_id
     ${whereSQL} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [...args, per, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM courses c ${whereSQL}`, args);
  res.json({ courses: rows, total, page, pages: Math.max(1, Math.ceil(total/per)) });
}));

app.get('/api/eschool/courses/:id', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [[c]] = await pool.query(
    `SELECT c.*, u.name AS expert_name FROM courses c LEFT JOIN users u ON u.id=c.expert_id WHERE c.id=?`,
    [req.params.id]
  );
  if (!c) return res.status(404).json({ error:'Course not found' });
  const [lessons] = await pool.query('SELECT * FROM lessons WHERE course_id=? ORDER BY position ASC', [c.id]);
  res.json({ course:c, lessons });
}));

app.post('/api/eschool/enroll', auth(), [
  body('course_id').isInt(),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { course_id, coupon_code } = req.body;
  const [[c]] = await pool.query('SELECT * FROM courses WHERE id=?', [course_id]);
  if (!c) return res.status(404).json({ error:'Course not found' });

  let price = Number(c.price);
  let discount = 0;
  if (coupon_code) {
    const [[cp]] = await pool.query(
      `SELECT * FROM coupons WHERE code=? AND active=1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [coupon_code]
    );
    if (!cp) return res.status(400).json({ error:'Invalid coupon' });
    if (cp.max_uses && cp.used_count >= cp.max_uses) return res.status(400).json({ error:'Coupon usage limit reached' });
    if (Number(cp.min_spend) > price) return res.status(400).json({ error:'Minimum spend not met' });
    if (cp.applies_to !== 'all' && !c.course_type.includes(cp.applies_to)) return res.status(400).json({ error:'Coupon not valid for this item' });
    discount = cp.discount_type === 'percent' ? price * (Number(cp.discount_value)/100) : Number(cp.discount_value);
    discount = Math.min(discount, price);
    await pool.query('UPDATE coupons SET used_count=used_count+1 WHERE id=?', [cp.id]);
  }
  const finalPrice = price - discount;

  if (finalPrice > 0) {
    await debitWallet(req.user.id, finalPrice, `Enrollment: ${c.title}`, null);
    await pool.query(
      `INSERT INTO transactions (user_id,reference,description,amount,provider,status,direction)
       VALUES (?,?,?,?,?,'succeeded','out')`,
      [req.user.id, genRef('ENR'), c.title, finalPrice, 'wallet']
    );
    if (c.expert_id) {
      const expertCut = finalPrice * ((100 - config.platform.commission)/100);
      await creditWallet(c.expert_id, expertCut, `Course sale: ${c.title}`, null);
      await pool.query('UPDATE users SET total_earnings = total_earnings + ? WHERE id=?', [expertCut, c.expert_id]);
      await notify(c.expert_id, 'New enrollment', `A learner enrolled in "${c.title}".`);
    }
  }

  const [r] = await pool.query(
    `INSERT INTO enrollments (user_id,course_id,enrollment_type,reference_id,title)
     VALUES (?,?,?,?,?)`,
    [req.user.id, c.id, c.course_type, c.id, c.title]
  );
  await notify(req.user.id, 'Enrolled', `You are enrolled in "${c.title}".`);
  res.status(201).json({ id:r.insertId, paid: finalPrice, discount });
}));

app.get('/api/user/enrollments', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT e.*, c.thumbnail, c.total_lessons FROM enrollments e
     LEFT JOIN courses c ON c.id=e.course_id
     WHERE e.user_id=? ORDER BY e.created_at DESC`, [req.user.id]
  );
  res.json({ enrollments: rows });
}));

app.put('/api/user/enrollments/:id/progress', auth(), [
  body('progress').isInt({ min:0, max:100 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { progress } = req.body;
  await pool.query(
    `UPDATE enrollments SET progress=?, status=CASE WHEN ?>=100 THEN 'completed' ELSE status END WHERE id=? AND user_id=?`,
    [progress, progress, req.params.id, req.user.id]
  );
  if (progress >= 100) {
    const [[enr]] = await pool.query('SELECT title FROM enrollments WHERE id=?', [req.params.id]);
    const serial = `EH-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;
    const hash = Buffer.from(`${req.user.id}:${serial}`).toString('base64');
    const [r] = await pool.query(
      'INSERT INTO certificates (user_id,course_title,serial,verification_hash) VALUES (?,?,?,?)',
      [req.user.id, enr.title, serial, hash]
    );
    await pool.query('UPDATE enrollments SET certificate_id=? WHERE id=?', [r.insertId, req.params.id]);
    await notify(req.user.id, 'Certificate issued', `Your certificate for "${enr.title}" is ready.`);
  }
  res.json({ ok:true });
}));

app.get('/api/user/certificates', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM certificates WHERE user_id=? ORDER BY issued_at DESC', [req.user.id]);
  res.json({ certificates: rows });
}));

/* ============================================================
   EXPERTS
   ============================================================ */
app.get('/api/user/experts', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const q = req.query.q || null;
  const spec = req.query.spec || null;
  const page = Math.max(Number(req.query.page||1),1);
  const per = Math.min(Number(req.query.per||20),100);
  const offset = (page-1)*per;
  const where = [`role='expert'`, `status='active'`]; const args = [];
  if (q) { where.push('(name LIKE ? OR specialization LIKE ?)'); args.push(`%${q}%`,`%${q}%`); }
  if (spec) { where.push('specialization=?'); args.push(spec); }
  const whereSQL = 'WHERE '+where.join(' AND ');
  const [rows] = await pool.query(
    `SELECT id,name,email,avatar,bio,specialization,hourly_rate,average_rating
     FROM users ${whereSQL} ORDER BY average_rating DESC LIMIT ? OFFSET ?`,
    [...args, per, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users ${whereSQL}`, args);
  res.json({ experts:rows, total, page, pages: Math.max(1, Math.ceil(total/per)) });
}));

app.get('/api/user/experts/:id', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [[e]] = await pool.query(
    `SELECT id,name,email,avatar,bio,specialization,hourly_rate,average_rating FROM users WHERE id=? AND role='expert'`,
    [req.params.id]
  );
  if (!e) return res.status(404).json({ error:'Expert not found' });
  const [reviews] = await pool.query(
    `SELECT r.*, u.name AS author_name FROM reviews r LEFT JOIN users u ON u.id=r.author_id
     WHERE r.expert_id=? AND r.status='published' ORDER BY r.created_at DESC LIMIT 20`,
    [req.params.id]
  );
  const [availability] = await pool.query('SELECT * FROM availability WHERE expert_id=? ORDER BY day_of_week', [req.params.id]);
  res.json({ expert:e, reviews, availability });
}));

/* ============================================================
   CONSULTATIONS + MESSAGES
   ============================================================ */
app.post('/api/user/consultations', auth(), [
  body('title').isLength({ min:3, max:200 }),
  body('description').isLength({ min:5 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { title, description, consultation_type='general', expert_id=null, priority='normal', scheduled_at=null } = req.body;
  const [r] = await pool.query(
    `INSERT INTO consultations (user_id,expert_id,title,description,consultation_type,priority,status,scheduled_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [req.user.id, expert_id, title, description, consultation_type, priority, expert_id ? 'assigned' : 'pending', scheduled_at]
  );
  if (expert_id) await notify(expert_id, 'New consultation', `"${title}" was assigned to you.`, 'info', '/expert/consultations');
  res.status(201).json({ id:r.insertId });
}));

app.put('/api/common/consultations/:id/status', auth(), [
  body('status').isIn(['pending','assigned','in_progress','completed','cancelled','disputed']),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { status } = req.body;
  const [[c]] = await pool.query('SELECT * FROM consultations WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error:'Not found' });
  if (req.user.role !== 'admin' && c.user_id !== req.user.id && c.expert_id !== req.user.id)
    return res.status(403).json({ error:'Forbidden' });
  await pool.query('UPDATE consultations SET status=?, closed_at=CASE WHEN ? IN ("completed","cancelled") THEN NOW() ELSE closed_at END WHERE id=?', [status, status, req.params.id]);
  if (status === 'completed' && c.expert_id) {
    const fee = Number(c.expert_fee||0);
    if (fee > 0) {
      const cut = fee * ((100 - config.platform.commission)/100);
      await creditWallet(c.expert_id, cut, `Consultation completed: ${c.title}`, null);
      await pool.query('UPDATE users SET total_earnings = total_earnings + ? WHERE id=?', [cut, c.expert_id]);
    }
  }
  res.json({ ok:true });
}));

app.put('/api/common/consultations/:id/assign', auth(['admin']), [
  body('expert_id').isInt(),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query("UPDATE consultations SET expert_id=?, status='assigned' WHERE id=?", [req.body.expert_id, req.params.id]);
  await notify(req.body.expert_id, 'Consultation assigned', 'A new consultation has been assigned to you.', 'info', '/expert/consultations');
  res.json({ ok:true });
}));

app.get('/api/common/consultations/:id', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [[c]] = await pool.query(
    `SELECT c.*, u.name AS client_name, u.email AS client_email, e.name AS expert_name, e.email AS expert_email
     FROM consultations c
     LEFT JOIN users u ON u.id=c.user_id
     LEFT JOIN users e ON e.id=c.expert_id
     WHERE c.id=?`, [req.params.id]
  );
  if (!c) return res.status(404).json({ error:'Not found' });
  res.json({ consultation:c });
}));

app.get('/api/common/consultations/:id/messages', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
     FROM messages m LEFT JOIN users u ON u.id=m.sender_id
     WHERE m.consultation_id=? ORDER BY m.created_at ASC`, [req.params.id]
  );
  await pool.query(
    `UPDATE messages SET read_at=NOW() WHERE consultation_id=? AND sender_id<>? AND read_at IS NULL`,
    [req.params.id, req.user.id]
  );
  res.json({ messages: rows });
}));

app.post('/api/common/consultations/:id/messages', auth(), [
  body('message').optional({ nullable:true }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { message } = req.body;
  const [r] = await pool.query(
    `INSERT INTO messages (consultation_id,sender_id,message) VALUES (?,?,?)`,
    [req.params.id, req.user.id, message||'']
  );
  const [[m]] = await pool.query(
    `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar FROM messages m
     LEFT JOIN users u ON u.id=m.sender_id WHERE m.id=?`, [r.insertId]
  );
  io.to(`consultation_${req.params.id}`).emit('new_message', { consultation_id:Number(req.params.id), ...m });
  const [[c]] = await pool.query('SELECT user_id, expert_id, title FROM consultations WHERE id=?', [req.params.id]);
  const recipient = req.user.id === c.user_id ? c.expert_id : c.user_id;
  if (recipient && recipient !== req.user.id) {
    await notify(recipient, 'New message', `New message in "${c.title}".`, 'info', `/consultations/${req.params.id}`);
  }
  res.status(201).json(m);
}));

app.post('/api/common/consultations/:id/attachments', auth(), upload.single('attachments'), asyncH(async (req,res) => {
  const pool = getPool();
  if (!req.file) return res.status(400).json({ error:'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  const [r] = await pool.query(
    `INSERT INTO messages (consultation_id,sender_id,message,attachment_url,attachment_type) VALUES (?,?,?,?,?)`,
    [req.params.id, req.user.id, '[attachment]', url, req.file.mimetype]
  );
  const [[m]] = await pool.query(
    `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar FROM messages m
     LEFT JOIN users u ON u.id=m.sender_id WHERE m.id=?`, [r.insertId]
  );
  io.to(`consultation_${req.params.id}`).emit('new_message', { consultation_id:Number(req.params.id), ...m });
  res.status(201).json(m);
}));

app.put('/api/common/consultations/:id/meeting', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const { meeting_url } = req.body;
  await pool.query('UPDATE consultations SET meeting_url=? WHERE id=?', [meeting_url, req.params.id]);
  res.json({ ok:true });
}));

/* ============================================================
   EXPERT ROUTES
   ============================================================ */
app.get('/api/expert/earnings', auth(['expert']), asyncH(async (req,res) => {
  const pool = getPool();
  const [[summary]] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total_earned,
            COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) AS total_paid_out,
            COALESCE(SUM(CASE WHEN status IN ('pending','processing','approved') THEN amount ELSE 0 END),0) AS pending_balance
     FROM payouts WHERE expert_id=?`, [req.user.id]
  );
  const [[u]] = await pool.query('SELECT wallet_balance, total_earnings FROM users WHERE id=?', [req.user.id]);
  const [ledger] = await pool.query('SELECT * FROM wallet_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
  res.json({
    summary:{
      total_earned: Number(u.total_earnings) || 0,
      available_balance: Number(u.wallet_balance) || 0,
      total_paid_out: summary.total_paid_out,
      pending_balance: summary.pending_balance,
    },
    ledger,
  });
}));

app.get('/api/expert/reviews', auth(['expert']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS author_name FROM reviews r LEFT JOIN users u ON u.id=r.author_id
     WHERE r.expert_id=? ORDER BY r.created_at DESC`, [req.user.id]
  );
  res.json({ reviews:rows });
}));

app.post('/api/expert/reviews/:id/reply', auth(['expert']), [
  body('reply').isLength({ min:2, max:500 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const [[r]] = await pool.query('SELECT expert_id FROM reviews WHERE id=?', [req.params.id]);
  if (!r || r.expert_id !== req.user.id) return res.status(403).json({ error:'Forbidden' });
  await pool.query('UPDATE reviews SET reply=?, replied_at=NOW() WHERE id=?', [req.body.reply, req.params.id]);
  res.json({ ok:true });
}));

app.post('/api/expert/withdrawals', auth(['expert']), [
  body('amount').isFloat({ gt:0 }),
  body('method').isIn(['bank_transfer','mobile_money','paypal','stripe']),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { amount, method, account_details={} } = req.body;
  if (amount < config.platform.minPayout) return res.status(400).json({ error:`Minimum withdrawal is ${config.platform.minPayout}` });
  const [[u]] = await pool.query('SELECT wallet_balance FROM users WHERE id=?', [req.user.id]);
  if (Number(u.wallet_balance) < Number(amount)) return res.status(400).json({ error:'Insufficient balance' });
  await debitWallet(req.user.id, Number(amount), 'Withdrawal request', null);
  const [r] = await pool.query(
    `INSERT INTO payouts (expert_id,amount,method,account_details,status) VALUES (?,?,?,?,'pending')`,
    [req.user.id, amount, method, JSON.stringify(account_details)]
  );
  await notify(req.user.id, 'Withdrawal requested', `Your withdrawal of $${amount} is pending approval.`);
  res.status(201).json({ id:r.insertId });
}));

app.get('/api/expert/withdrawals', auth(['expert']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM payouts WHERE expert_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ payouts: rows });
}));

app.get('/api/expert/availability', auth(['expert']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM availability WHERE expert_id=? ORDER BY day_of_week', [req.user.id]);
  res.json({ availability: rows });
}));

app.put('/api/expert/availability', auth(['expert']), asyncH(async (req,res) => {
  const pool = getPool();
  const { schedule = [] } = req.body;
  await pool.query('DELETE FROM availability WHERE expert_id=?', [req.user.id]);
  for (const s of schedule) {
    await pool.query(
      `INSERT INTO availability (expert_id,day_of_week,start_time,end_time,active) VALUES (?,?,?,?,1)`,
      [req.user.id, s.day, s.start, s.end]
    );
  }
  res.json({ ok:true });
}));

app.post('/api/expert/time-off', auth(['expert']), [
  body('start_date').isISO8601(),
  body('end_date').isISO8601(),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { start_date, end_date, reason='' } = req.body;
  const [r] = await pool.query(
    `INSERT INTO time_off (expert_id,start_date,end_date,reason) VALUES (?,?,?,?)`,
    [req.user.id, start_date, end_date, reason]
  );
  res.status(201).json({ id:r.insertId });
}));

app.get('/api/expert/time-off', auth(['expert']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM time_off WHERE expert_id=? ORDER BY start_date DESC', [req.user.id]);
  res.json({ timeOff: rows });
}));

app.put('/api/expert/profile', auth(['expert']), asyncH(async (req,res) => {
  const pool = getPool();
  const { specialization, hourly_rate, bio } = req.body;
  await pool.query('UPDATE users SET specialization=?, hourly_rate=?, bio=? WHERE id=?',
    [specialization, hourly_rate, bio, req.user.id]);
  res.json({ ok:true });
}));

app.get('/api/expert/dashboard-stats', auth(['expert']), asyncH(async (req,res) => {
  const pool = getPool();
  const [[stats]] = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM consultations WHERE expert_id=?) AS total_consultations,
      (SELECT COUNT(*) FROM consultations WHERE expert_id=? AND status IN ('assigned','in_progress')) AS active_consultations,
      (SELECT COUNT(*) FROM courses WHERE expert_id=?) AS total_courses,
      (SELECT COUNT(*) FROM event_registrations er JOIN events e ON e.id=er.event_id WHERE e.expert_id=?) AS total_event_registrations`,
    [req.user.id, req.user.id, req.user.id, req.user.id]
  );
  res.json({ stats });
}));

/* ============================================================
   ADMIN
   ============================================================ */
app.get('/api/admin/users', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const page = Math.max(Number(req.query.page||1),1);
  const per = Math.min(Number(req.query.per||20),100);
  const offset = (page-1)*per;
  const q = req.query.q || null;
  const role = req.query.role || null;
  const status = req.query.status || null;
  const where = []; const args = [];
  if (q) { where.push('(name LIKE ? OR email LIKE ?)'); args.push(`%${q}%`,`%${q}%`); }
  if (role) { where.push('role=?'); args.push(role); }
  if (status) { where.push('status=?'); args.push(status); }
  const whereSQL = where.length ? 'WHERE '+where.join(' AND ') : '';
  const [rows] = await pool.query(
    `SELECT id,name,email,phone,role,status,avatar,created_at,last_login_at
     FROM users ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...args, per, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users ${whereSQL}`, args);
  res.json({ users:rows, total, page, pages: Math.max(1, Math.ceil(total/per)) });
}));

app.put('/api/admin/users/:id/approve', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query("UPDATE users SET status='active' WHERE id=?", [req.params.id]);
  await notify(req.params.id, 'Account approved', 'Your account has been approved. Welcome!');
  await logAudit(req.user.id, 'approve_user', 'users', req.params.id, null, req.ip);
  res.json({ ok:true });
}));

app.put('/api/admin/users/:id/suspend', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query("UPDATE users SET status='suspended' WHERE id=?", [req.params.id]);
  await notify(req.params.id, 'Account suspended', 'Your account has been suspended. Contact support.');
  await logAudit(req.user.id, 'suspend_user', 'users', req.params.id, null, req.ip);
  res.json({ ok:true });
}));

app.put('/api/admin/users/:id/reject', auth(['admin']), [
  body('reason').optional().isString(),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query("UPDATE users SET status='rejected', rejected_reason=? WHERE id=?", [req.body.reason||null, req.params.id]);
  await notify(req.params.id, 'Registration rejected', req.body.reason || 'Your application was rejected.');
  res.json({ ok:true });
}));

app.put('/api/admin/users/:id', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const { name, phone, role, status, hourly_rate, specialization, bio } = req.body;
  await pool.query(
    `UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), role=COALESCE(?,role),
     status=COALESCE(?,status), hourly_rate=COALESCE(?,hourly_rate),
     specialization=COALESCE(?,specialization), bio=COALESCE(?,bio) WHERE id=?`,
    [name, phone, role, status, hourly_rate, specialization, bio, req.params.id]
  );
  await logAudit(req.user.id, 'update_user', 'users', req.params.id, req.body, req.ip);
  res.json({ ok:true });
}));

app.delete('/api/admin/users/:id', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
  await logAudit(req.user.id, 'delete_user', 'users', req.params.id, null, req.ip);
  res.json({ ok:true });
}));

app.get('/api/admin/experts', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const page = Math.max(Number(req.query.page||1),1);
  const per = Math.min(Number(req.query.per||20),100);
  const offset = (page-1)*per;
  const status = req.query.status || null;
  const where = [`role='expert'`]; const args = [];
  if (status) { where.push('status=?'); args.push(status); }
  const whereSQL = 'WHERE '+where.join(' AND ');
  const [rows] = await pool.query(
    `SELECT id,name,email,status,specialization,hourly_rate,average_rating,total_earnings,avatar,created_at
     FROM users ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...args, per, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users ${whereSQL}`, args);
  res.json({ experts:rows, total, page, pages: Math.max(1, Math.ceil(total/per)) });
}));

app.post('/api/admin/experts/create', auth(['admin']), [
  body('name').isLength({ min:2 }),
  body('email').isEmail(),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { name, email, password='Expert@123', specialization='', hourly_rate=0, bio='', phone='' } = req.body;
  const [[ex]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (ex) return res.status(409).json({ error:'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,phone,role,status,specialization,hourly_rate,bio)
     VALUES (?,?,?,?,'expert','active',?,?,?)`,
    [name,email,hash,phone,specialization,hourly_rate,bio]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await logAudit(req.user.id, 'create_expert', 'users', r.insertId, { email }, req.ip);
  res.status(201).json({ id:r.insertId, temp_password: password });
}));

app.get('/api/admin/analytics', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const [[totals]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE role='expert' AND status='active') AS active_experts,
      (SELECT COUNT(*) FROM users WHERE status='pending') AS pending_users,
      (SELECT COUNT(*) FROM consultations WHERE status IN ('pending','assigned','in_progress')) AS active_consultations,
      (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE status='succeeded' AND direction='in') AS total_revenue,
      (SELECT COUNT(*) FROM courses WHERE status='published') AS published_courses,
      (SELECT COUNT(*) FROM events WHERE status='published') AS published_events
  `);
  const [usersByRole] = await pool.query("SELECT role, COUNT(*) AS c FROM users GROUP BY role");
  const [revenueByMonth] = await pool.query(`
    SELECT DATE_FORMAT(created_at,'%Y-%m') AS ym, SUM(amount) AS total
    FROM transactions WHERE status='succeeded' AND direction='in'
    GROUP BY ym ORDER BY ym DESC LIMIT 12
  `);
  const [usersByMonth] = await pool.query(`
    SELECT DATE_FORMAT(created_at,'%Y-%m') AS ym, COUNT(*) AS c
    FROM users GROUP BY ym ORDER BY ym DESC LIMIT 12
  `);
  const [topExperts] = await pool.query(`
    SELECT u.id, u.name, u.average_rating, u.total_earnings
    FROM users u WHERE u.role='expert' ORDER BY u.total_earnings DESC LIMIT 10
  `);
  res.json({ totals, usersByRole, revenueByMonth, usersByMonth, topExperts });
}));

app.get('/api/admin/transactions', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const page = Math.max(Number(req.query.page||1),1);
  const per = Math.min(Number(req.query.per||30),100);
  const offset = (page-1)*per;
  const [rows] = await pool.query(
    `SELECT t.*, u.name AS user_name FROM transactions t LEFT JOIN users u ON u.id=t.user_id
     ORDER BY t.created_at DESC LIMIT ? OFFSET ?`, [per, offset]
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM transactions');
  res.json({ transactions:rows, total, page, pages: Math.max(1, Math.ceil(total/per)) });
}));

app.get('/api/admin/payouts', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT p.*, u.name AS expert_name, u.email AS expert_email FROM payouts p
    LEFT JOIN users u ON u.id=p.expert_id ORDER BY p.created_at DESC`);
  res.json({ payouts:rows });
}));

app.put('/api/admin/payouts/:id', auth(['admin']), [
  body('status').isIn(['approved','rejected','paid','processing']),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { status, reason } = req.body;
  const [[p]] = await pool.query('SELECT * FROM payouts WHERE id=?', [req.params.id]);
  if (!p) return res.status(404).json({ error:'Not found' });
  if (status === 'rejected') {
    await creditWallet(p.expert_id, p.amount, 'Withdrawal rejected — refund', null);
  }
  await pool.query('UPDATE payouts SET status=?, rejection_reason=?, processed_at=NOW() WHERE id=?', [status, reason||null, req.params.id]);
  await notify(p.expert_id, `Withdrawal ${status}`, `Your withdrawal of $${p.amount} was ${status}.`);
  await logAudit(req.user.id, `payout_${status}`, 'payouts', req.params.id, null, req.ip);
  res.json({ ok:true });
}));

app.get('/api/admin/coupons', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ coupons:rows });
}));

app.post('/api/admin/coupons', auth(['admin']), [
  body('code').isLength({ min:3, max:40 }),
  body('discount_type').isIn(['percent','fixed']),
  body('discount_value').isFloat({ gt:0 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { code, discount_type, discount_value, max_uses=null, min_spend=0, applies_to='all', expires_at=null } = req.body;
  const [r] = await pool.query(
    `INSERT INTO coupons (code,discount_type,discount_value,max_uses,min_spend,applies_to,expires_at) VALUES (?,?,?,?,?,?,?)`,
    [code.toUpperCase(), discount_type, discount_value, max_uses, min_spend, applies_to, expires_at]
  );
  res.status(201).json({ id:r.insertId });
}));

app.put('/api/admin/coupons/:id/toggle', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query('UPDATE coupons SET active = 1 - active WHERE id=?', [req.params.id]);
  res.json({ ok:true });
}));

app.delete('/api/admin/coupons/:id', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query('DELETE FROM coupons WHERE id=?', [req.params.id]);
  res.json({ ok:true });
}));

app.get('/api/admin/claims', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT c.*, u.name AS user_name FROM claims c LEFT JOIN users u ON u.id=c.user_id
    ORDER BY c.created_at DESC`);
  res.json({ claims:rows });
}));

app.put('/api/admin/claims/:id', auth(['admin']), [
  body('status').isIn(['open','investigating','resolved','rejected']),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query('UPDATE claims SET status=?, resolution=?, resolved_at=NOW() WHERE id=?', [req.body.status, req.body.resolution||null, req.params.id]);
  res.json({ ok:true });
}));

app.get('/api/admin/tickets', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT t.*, u.name AS user_name FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id
    ORDER BY t.created_at DESC`);
  res.json({ tickets:rows });
}));

app.put('/api/admin/tickets/:id', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const { status, priority, assigned_to } = req.body;
  await pool.query(
    `UPDATE support_tickets SET status=COALESCE(?,status), priority=COALESCE(?,priority), assigned_to=COALESCE(?,assigned_to) WHERE id=?`,
    [status, priority, assigned_to, req.params.id]
  );
  res.json({ ok:true });
}));

app.get('/api/admin/reviews', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT r.*, u.name AS author_name, e.name AS expert_name
    FROM reviews r
    LEFT JOIN users u ON u.id=r.author_id
    LEFT JOIN users e ON e.id=r.expert_id
    ORDER BY r.created_at DESC LIMIT 200`);
  res.json({ reviews:rows });
}));

app.put('/api/admin/reviews/:id', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const { status } = req.body;
  await pool.query('UPDATE reviews SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ ok:true });
}));

app.get('/api/admin/audit-logs', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT a.*, u.name AS actor_name FROM audit_logs a
    LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 300`);
  res.json({ logs: rows });
}));

app.post('/api/admin/notifications/broadcast', auth(['admin']), [
  body('title').isLength({ min:2, max:200 }),
  body('message').isLength({ min:2 }),
  body('audience').optional().isIn(['all','experts','learners','admins']),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { title, message, audience='all' } = req.body;
  let whereSQL = '';
  if (audience === 'experts')  whereSQL = "WHERE role='expert'";
  if (audience === 'learners') whereSQL = "WHERE role='learner'";
  if (audience === 'admins')   whereSQL = "WHERE role='admin'";
  const [users] = await pool.query(`SELECT id FROM users ${whereSQL}`);
  for (const u of users) await notify(u.id, title, message, 'broadcast');
  if (audience === 'all') {
    await pool.query(`INSERT INTO notifications (user_id,title,message,type) VALUES (NULL,?,?,'broadcast')`, [title, message]);
  }
  io.emit('broadcast', { title, message, created_at:now() });
  res.json({ ok:true, sent: users.length });
}));

app.get('/api/admin/settings', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM settings');
  const s = {};
  rows.forEach(r => s[r.setting_key] = r.setting_value);
  res.json({ settings:s });
}));

app.put('/api/admin/settings', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const { settings = {} } = req.body;
  for (const [k,v] of Object.entries(settings)) {
    await pool.query(
      `INSERT INTO settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`,
      [k, String(v)]
    );
  }
  await logAudit(req.user.id, 'update_settings', 'settings', null, settings, req.ip);
  res.json({ ok:true });
}));

app.post('/api/admin/events', auth(['admin']), [
  body('title').isLength({ min:3, max:200 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { title, description='', category='General', expert_id=null, date=null, start_time=null, end_time=null, location='', meeting_url='', capacity=100, price=0, expert_payment=0 } = req.body;
  const [r] = await pool.query(
    `INSERT INTO events (title,description,category,expert_id,date,start_time,end_time,location,meeting_url,capacity,price,expert_payment,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'published')`,
    [title, description, category, expert_id, date, start_time, end_time, location, meeting_url, capacity, price, expert_payment]
  );
  res.status(201).json({ id:r.insertId });
}));

app.put('/api/admin/events/:id', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  const fields = ['title','description','category','expert_id','date','start_time','end_time','location','meeting_url','capacity','price','expert_payment','status'];
  const updates = []; const args = [];
  for (const f of fields) if (f in req.body) { updates.push(`${f}=?`); args.push(req.body[f]); }
  if (!updates.length) return res.json({ ok:true });
  args.push(req.params.id);
  await pool.query(`UPDATE events SET ${updates.join(',')} WHERE id=?`, args);
  res.json({ ok:true });
}));

app.delete('/api/admin/events/:id', auth(['admin']), asyncH(async (req,res) => {
  const pool = getPool();
  await pool.query('DELETE FROM events WHERE id=?', [req.params.id]);
  res.json({ ok:true });
}));

/* ============================================================
   USER CLAIMS + SUPPORT + WALLET
   ============================================================ */
app.post('/api/user/claims', auth(), [
  body('claim_title').isLength({ min:3, max:200 }),
  body('claim_description').isLength({ min:5 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { consultation_id=null, claim_type='general', claim_title, claim_description, claim_amount=null } = req.body;
  const [r] = await pool.query(
    `INSERT INTO claims (user_id,consultation_id,claim_type,claim_title,claim_description,claim_amount)
     VALUES (?,?,?,?,?,?)`,
    [req.user.id, consultation_id, claim_type, claim_title, claim_description, claim_amount]
  );
  const [admins] = await pool.query("SELECT id FROM users WHERE role='admin'");
  for (const a of admins) await notify(a.id, 'New claim filed', claim_title, 'warning', '/admin/claims');
  res.status(201).json({ id:r.insertId });
}));

app.get('/api/user/claims', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM claims WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ claims:rows });
}));

app.post('/api/user/tickets', auth(), [
  body('subject').isLength({ min:3, max:200 }),
  body('description').isLength({ min:5 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { subject, description, priority='normal', category='general' } = req.body;
  const ref = `TKT-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}`;
  const [r] = await pool.query(
    `INSERT INTO support_tickets (user_id,reference,subject,description,priority,category) VALUES (?,?,?,?,?,?)`,
    [req.user.id, ref, subject, description, priority, category]
  );
  res.status(201).json({ id:r.insertId, reference:ref });
}));

app.get('/api/user/tickets', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM support_tickets WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ tickets:rows });
}));

app.post('/api/user/tickets/:id/replies', auth(), [
  body('message').isLength({ min:1 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const [r] = await pool.query(
    `INSERT INTO ticket_replies (ticket_id,sender_id,message) VALUES (?,?,?)`,
    [req.params.id, req.user.id, req.body.message]
  );
  res.status(201).json({ id:r.insertId });
}));

app.get('/api/user/wallet', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [[u]] = await pool.query('SELECT wallet_balance FROM users WHERE id=?', [req.user.id]);
  const [ledger] = await pool.query('SELECT * FROM wallet_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
  res.json({ balance: Number(u.wallet_balance), ledger });
}));

app.post('/api/user/wallet/topup', auth(), [
  body('amount').isFloat({ gt:0 }),
  body('provider').isIn(['stripe','paystack','flutterwave','paypal','demo']),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { amount, provider } = req.body;
  const ref = genRef('TOP');
  await pool.query(
    `INSERT INTO transactions (user_id,reference,description,amount,provider,status,direction)
     VALUES (?,?,?,?,?,'succeeded','in')`,
    [req.user.id, ref, 'Wallet top-up', amount, provider]
  );
  const newBal = await creditWallet(req.user.id, Number(amount), 'Wallet top-up', ref);
  res.json({ ok:true, balance:newBal, reference:ref });
}));

app.get('/api/user/transactions', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 200`, [req.user.id]
  );
  res.json({ transactions:rows });
}));

app.put('/api/user/profile', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const { name, phone, timezone, theme, language } = req.body;
  await pool.query(
    `UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), timezone=COALESCE(?,timezone),
     theme=COALESCE(?,theme), language=COALESCE(?,language) WHERE id=?`,
    [name, phone, timezone, theme, language, req.user.id]
  );
  res.json({ ok:true });
}));

app.post('/api/user/avatar', auth(), upload.single('avatar'), asyncH(async (req,res) => {
  const pool = getPool();
  if (!req.file) return res.status(400).json({ error:'No file' });
  const url = `/uploads/${req.file.filename}`;
  await pool.query('UPDATE users SET avatar=? WHERE id=?', [url, req.user.id]);
  res.json({ avatar:url });
}));

app.get('/api/user/notification-prefs', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  let [[p]] = await pool.query('SELECT * FROM notification_prefs WHERE user_id=?', [req.user.id]);
  if (!p) { await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [req.user.id]); p = { user_id:req.user.id, email_notifications:1, push_notifications:1, marketing:0 }; }
  res.json({ prefs:p });
}));

app.put('/api/user/notification-prefs', auth(), asyncH(async (req,res) => {
  const pool = getPool();
  const { email_notifications, push_notifications, marketing } = req.body;
  await pool.query(
    `INSERT INTO notification_prefs (user_id,email_notifications,push_notifications,marketing)
     VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE
     email_notifications=VALUES(email_notifications), push_notifications=VALUES(push_notifications), marketing=VALUES(marketing)`,
    [req.user.id, email_notifications?1:0, push_notifications?1:0, marketing?1:0]
  );
  res.json({ ok:true });
}));

app.post('/api/user/reviews', auth(), [
  body('expert_id').isInt(),
  body('rating').isInt({ min:1, max:5 }),
], validate, asyncH(async (req,res) => {
  const pool = getPool();
  const { expert_id, consultation_id=null, rating, comment='' } = req.body;
  const [r] = await pool.query(
    `INSERT INTO reviews (expert_id,author_id,consultation_id,rating,comment) VALUES (?,?,?,?,?)`,
    [expert_id, req.user.id, consultation_id, rating, comment]
  );
  const [[agg]] = await pool.query('SELECT AVG(rating) AS avg_r FROM reviews WHERE expert_id=? AND status="published"', [expert_id]);
  await pool.query('UPDATE users SET average_rating=? WHERE id=?', [agg.avg_r||0, expert_id]);
  res.status(201).json({ id:r.insertId });
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
      '<h1>ExpertHub API</h1><p>API is running. Frontend not yet built.</p>' +
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
const io = new Server(server, { cors: { origin: config.cors.origin } });

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  try { socket.user = jwt.verify(token, config.jwt.secret); next(); } catch { next(); }
});

const onlineUsers = new Map(); // userId → count

io.on('connection', (socket) => {
  if (socket.user) {
    socket.join(`user_${socket.user.id}`);
    onlineUsers.set(socket.user.id, (onlineUsers.get(socket.user.id)||0) + 1);
    io.emit('presence', { user_id: socket.user.id, online:true });
  }

  socket.on('join_consultation', (consultationId) => {
    socket.join(`consultation_${consultationId}`);
  });
  socket.on('leave_consultation', (consultationId) => {
    socket.leave(`consultation_${consultationId}`);
  });

  socket.on('typing', ({ consultation_id, is_typing }) => {
    if (!socket.user) return;
    socket.to(`consultation_${consultation_id}`).emit('typing', {
      consultation_id, user_id: socket.user.id, is_typing,
    });
  });

  socket.on('disconnect', () => {
    if (socket.user) {
      const c = (onlineUsers.get(socket.user.id)||1) - 1;
      if (c <= 0) { onlineUsers.delete(socket.user.id); io.emit('presence', { user_id: socket.user.id, online:false }); }
      else onlineUsers.set(socket.user.id, c);
    }
  });
});

/* ============================================================
   START — HTTP first, DB in background
   ============================================================ */
server.listen(config.port, () => {
  console.log(`\n✅ ExpertHub 2.0 API running at http://localhost:${config.port}`);
  console.log(`   Environment: ${config.env}`);
  console.log(`   Health:      http://localhost:${config.port}/api/health`);
  if (config.db.enabled) {
    console.log(`   DB target:   ${config.db.host}:${config.db.port}/${config.db.database}`);
    console.log('   Connecting to database in background...');
  } else {
    console.log('   DB disabled (ENABLE_DB=false) — API will return 503 for DB routes.');
  }
  if (config.env !== 'production') {
    console.log('\n   Demo accounts (only created on first seed):');
    console.log('     admin@platform.com   / admin123');
    console.log('     expert@platform.com  / expert123');
    console.log('     learner@platform.com / learner123\n');
  }
  // Kick off DB connection (non-blocking)
  tryConnect();
});

/* ---------- Graceful shutdown ---------- */
async function shutdown(signal) {
  console.log(`\n[${signal}] shutting down...`);
  try { if (dbState.pool) await dbState.pool.end(); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException',  (err) => { console.error('[uncaughtException]', err); });
