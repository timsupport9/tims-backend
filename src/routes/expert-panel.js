/* ============================================================
   Expert panel — earnings, stats, portfolio, availability,
   withdrawals, profile, course CRUD, questions, analytics
   ============================================================ */
const express = require('express');
const { auth, asyncH, safeRoute } = require('../lib/helpers');
const { poolOrThrow } = require('../lib/db');
const { debitWallet } = require('../lib/wallet');
const config = require('../config');

const router = express.Router();

/* ---------- Earnings ---------- */
router.get('/earnings', auth(['expert']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query(
    'SELECT total_earnings, wallet_balance FROM users WHERE id=?', [req.user.id]);
  const [[paidOut]] = await pool.query(
    "SELECT COALESCE(SUM(amount),0) paid FROM payouts WHERE expert_id=? AND status='paid'", [req.user.id]);
  const [ledger] = await pool.query(
    'SELECT * FROM wallet_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
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

router.get('/dashboard-stats', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[s]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM consultations WHERE expert_id=?) total_consultations,
       (SELECT COUNT(*) FROM consultations WHERE expert_id=? AND status IN ('assigned','confirmed','in_progress','in_grace','in_session')) active_consultations,
       (SELECT COUNT(*) FROM courses WHERE expert_id=?) total_courses`,
    [req.user.id, req.user.id, req.user.id]);
  res.json({ stats: s });
}, { stats: { total_consultations: 0, active_consultations: 0, total_courses: 0 } }));

/* ---------- Portfolio ---------- */
router.get('/portfolio', auth(['expert']), asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM expert_portfolio WHERE expert_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ items: rows });
}));

router.post('/portfolio', auth(['expert']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { title, category, description, link } = req.body;
  const [r] = await pool.query(
    'INSERT INTO expert_portfolio (expert_id, title, category, description, link) VALUES (?,?,?,?,?)',
    [req.user.id, title, category || 'Case Study', description || null, link || null]);
  res.status(201).json({ id: r.insertId });
}));

router.delete('/portfolio/:id', auth(['expert']), asyncH(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM expert_portfolio WHERE id=? AND expert_id=?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

/* ---------- Reviews ---------- */
router.get('/reviews', auth(['expert']), asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT r.*, u.name author_name FROM reviews r
       LEFT JOIN users u ON u.id=r.author_id
      WHERE r.expert_id=? ORDER BY r.created_at DESC`, [req.user.id]);
  res.json({ reviews: rows });
}));

router.post('/reviews/:id/reply', auth(['expert']), asyncH(async (req, res) => {
  await poolOrThrow().query(
    'UPDATE reviews SET reply=?, replied_at=NOW() WHERE id=? AND expert_id=?',
    [req.body.reply, req.params.id, req.user.id]);
  res.json({ ok: true });
}));

/* ---------- Availability ---------- */
router.get('/availability', auth(['expert']), asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM availability WHERE expert_id=?', [req.user.id]);
  res.json({ availability: rows });
}));

router.put('/availability', auth(['expert']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM availability WHERE expert_id=?', [req.user.id]);
  for (const s of (req.body.schedule || [])) {
    await pool.query(
      'INSERT INTO availability (expert_id,day_of_week,start_time,end_time) VALUES (?,?,?,?)',
      [req.user.id, s.day, s.start, s.end]);
  }
  res.json({ ok: true });
}));

/* ---------- Time off ---------- */
router.get('/time-off', auth(['expert']), asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM time_off WHERE expert_id=?', [req.user.id]);
  res.json({ timeOff: rows });
}));

router.post('/time-off', auth(['expert']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { start_date, end_date, reason = '' } = req.body;
  const [r] = await pool.query(
    'INSERT INTO time_off (expert_id,start_date,end_date,reason) VALUES (?,?,?,?)',
    [req.user.id, start_date, end_date, reason]);
  res.status(201).json({ id: r.insertId });
}));

/* ---------- Withdrawals ---------- */
router.get('/withdrawals', auth(['expert']), asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM payouts WHERE expert_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ payouts: rows });
}));

router.post('/withdrawals', auth(['expert']), asyncH(async (req, res) => {
  const { amount, method, account_details = {} } = req.body;
  if (Number(amount) < config.platform.minPayout) {
    return res.status(400).json({ error: `Minimum withdrawal ${config.platform.minPayout}` });
  }
  await debitWallet(req.user.id, amount, 'Withdrawal request');
  const pool = poolOrThrow();
  const [r] = await pool.query(
    `INSERT INTO payouts (expert_id,amount,method,account_details,status) VALUES (?,?,?,?, 'pending')`,
    [req.user.id, amount, method, JSON.stringify(account_details)]);
  res.status(201).json({ id: r.insertId });
}));

/* ---------- Profile ---------- */
router.put('/profile', auth(['expert']), asyncH(async (req, res) => {
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

/* ---------- Course CRUD ---------- */
router.post('/courses', auth(['expert']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO courses (title,description,category,course_type,level,price,expert_id,status) VALUES (?,?,?,?,?,?,?, 'draft')`,
    [b.title, b.description || '', b.category || 'General',
     b.course_type || 'short_course', b.level || 'beginner', b.price || 0, req.user.id]);
  res.status(201).json({ id: r.insertId });
}));

router.put('/courses/:id', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['title', 'description', 'category', 'level', 'price', 'status', 'thumbnail'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.user.id);
  await pool.query(`UPDATE courses SET ${sets.join(',')} WHERE id=? AND expert_id=?`, vals);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/courses/:id', auth(['expert']), safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM courses WHERE id=? AND expert_id=?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Lessons ---------- */
router.post('/courses/:id/lessons', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[{ pos }]] = await pool.query(
    'SELECT COALESCE(MAX(position),0)+1 pos FROM lessons WHERE course_id=?', [req.params.id]);
  const [r] = await pool.query(
    `INSERT INTO lessons (course_id, module_id, title, lesson_type, duration_minutes, content, video_url, position, is_preview)
     VALUES (?,?,?,?,?,?,?,?,0)`,
    [req.params.id, req.body?.module_id || null, req.body?.title,
     req.body?.lesson_type || 'video', req.body?.duration_minutes || 10,
     req.body?.content || '', req.body?.video_url || null, pos]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.put('/lessons/:id', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['title', 'content', 'lesson_type', 'duration_minutes', 'video_url', 'is_preview', 'module_id'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE lessons SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/courses/:id/lessons/:lid', auth(['expert']), safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM lessons WHERE id=? AND course_id=?', [req.params.lid, req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Modules ---------- */
router.post('/courses/:id/modules', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[{ pos }]] = await pool.query(
    'SELECT COALESCE(MAX(position),0)+1 pos FROM course_modules WHERE course_id=?', [req.params.id]);
  const [r] = await pool.query(
    'INSERT INTO course_modules (course_id, title, description, position) VALUES (?,?,?,?)',
    [req.params.id, req.body?.title, req.body?.description || '', pos]);
  res.status(201).json({ id: r.insertId, position: pos });
}, { ok: true }));

router.put('/courses/:id/modules/:mid', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['title', 'description', 'position'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.mid);
  await pool.query(`UPDATE course_modules SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/courses/:id/modules/:mid', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM lessons WHERE module_id=?', [req.params.mid]).catch(() => {});
  await pool.query(
    'DELETE FROM course_modules WHERE id=? AND course_id=?', [req.params.mid, req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Questions ---------- */
router.get('/questions', auth(['expert']), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM expert_questions WHERE expert_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ questions: rows });
}, { questions: [] }));

router.put('/questions/:id/answer', auth(['expert']), safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'UPDATE expert_questions SET answer=?, answered_at=NOW() WHERE id=? AND expert_id=?',
    [req.body?.answer || '', req.params.id, req.user.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Analytics ---------- */
router.get('/consultation-analytics', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[s]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM consultations WHERE expert_id=? AND status='completed') completed_sessions,
       (SELECT COUNT(DISTINCT user_id) FROM consultations WHERE expert_id=?) unique_clients,
       (SELECT COALESCE(AVG(duration_minutes),0) FROM consultations WHERE expert_id=?) avg_duration,
       (SELECT COUNT(*) FROM consultations WHERE expert_id=? AND status='cancelled') cancelled`,
    [req.user.id, req.user.id, req.user.id, req.user.id]);
  const [peak] = await pool.query(
    `SELECT HOUR(scheduled_at) hr, COUNT(*) c FROM consultations
      WHERE expert_id=? AND scheduled_at IS NOT NULL
      GROUP BY hr ORDER BY c DESC LIMIT 12`, [req.user.id]);
  res.json({ stats: s, peak_hours: peak });
}, { stats: {}, peak_hours: [] }));

router.get('/course-analytics', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [courses] = await pool.query(
    `SELECT c.title,
            (SELECT COUNT(*) FROM enrollments WHERE course_id=c.id) enrolled,
            (SELECT COUNT(*) FROM enrollments WHERE course_id=c.id AND status='completed') completed,
            (SELECT COALESCE(AVG(progress),0) FROM enrollments WHERE course_id=c.id) avg_progress,
            c.average_rating, c.price
       FROM courses c WHERE c.expert_id=?`, [req.user.id]);
  const shaped = courses.map(c => ({
    title: c.title, enrolled: c.enrolled, completed: c.completed,
    avg_progress: Math.round(c.avg_progress || 0),
    avg_rating: Number(c.average_rating || 0),
    revenue: c.enrolled * Number(c.price || 0),
    completion_pct: c.enrolled ? Math.round((c.completed / c.enrolled) * 100) : 0,
  }));
  res.json({
    totalEnrollments: shaped.reduce((s, x) => s + x.enrolled, 0),
    avgCompletion: shaped.length
      ? Math.round(shaped.reduce((s, x) => s + x.avg_progress, 0) / shaped.length)
      : 0,
    avgRating: shaped.length
      ? (shaped.reduce((s, x) => s + x.avg_rating, 0) / shaped.length).toFixed(1)
      : 0,
    revenue30d: 0, courses: shaped, enrollmentTrend: [],
  });
}, { courses: [] }));

module.exports = router;
