/* ============================================================
   E-School — course catalogue, enrollment, lessons, discussions
   ============================================================ */
const express = require('express');
const { asyncH, auth, safeRoute } = require('../lib/helpers');
const { poolOrThrow } = require('../lib/db');
const config = require('../config');

const router = express.Router();

router.get('/courses', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { type, q, page = 1, per = 20 } = req.query;
  const limit = Math.min(Number(per), 100);
  const offset = (Math.max(Number(page), 1) - 1) * limit;
  const conds = ["c.status='published'"]; const params = [];
  if (type) { conds.push('c.course_type=?'); params.push(type); }
  if (q) { conds.push('(c.title LIKE ? OR c.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const where = `WHERE ${conds.join(' AND ')}`;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM courses c ${where}`, params);
  const [rows] = await pool.query(
    `SELECT c.*, u.name expert_name FROM courses c
       LEFT JOIN users u ON u.id=c.expert_id
       ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]);
  res.json({ courses: rows, total, page: Number(page), pages: Math.max(1, Math.ceil(total / limit)) });
}));

router.get('/courses/:id', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[course]] = await pool.query(
    `SELECT c.*, u.name expert_name FROM courses c
       LEFT JOIN users u ON u.id=c.expert_id WHERE c.id=?`, [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const [lessons] = await pool.query('SELECT * FROM lessons WHERE course_id=? ORDER BY position', [req.params.id]);
  res.json({ course, lessons });
}));

router.get('/courses/:id/curriculum', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[course]] = await pool.query('SELECT * FROM courses WHERE id=?', [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const [modules] = await pool.query('SELECT * FROM course_modules WHERE course_id=? ORDER BY position', [req.params.id]);
  const [lessons] = await pool.query('SELECT * FROM lessons WHERE course_id=? ORDER BY position', [req.params.id]);
  const out = modules.map(m => ({ ...m, lessons: lessons.filter(l => l.module_id === m.id) }));
  res.json({ course, modules: out });
}, { course: {}, modules: [] }));

router.get('/courses/:id/discussions', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT d.*, u.name author_name FROM course_discussions d
       LEFT JOIN users u ON u.id=d.user_id
      WHERE d.course_id=? ORDER BY d.created_at DESC`, [req.params.id]);
  res.json({ discussions: rows });
}, { discussions: [] }));

router.post('/enroll', auth(), asyncH(async (req, res) => {
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
    discount = cp.discount_type === 'percent'
      ? price * (cp.discount_value / 100)
      : Number(cp.discount_value);
    discount = Math.min(discount, price);
  }
  const finalPrice = price - discount;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (finalPrice > 0) {
      const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id=? FOR UPDATE', [req.user.id]);
      if (Number(u.wallet_balance) < finalPrice) throw new Error('Insufficient balance');
      const newBal = Number(u.wallet_balance) - finalPrice;
      await conn.query('UPDATE users SET wallet_balance=? WHERE id=?', [newBal, req.user.id]);
      await conn.query(
        'INSERT INTO wallet_ledger (user_id,amount,balance_after,reason) VALUES (?,?,?,?)',
        [req.user.id, -finalPrice, newBal, `Enrollment: ${c.title}`]);
      await conn.query(
        `INSERT INTO transactions (user_id,reference,description,amount,provider,status,direction) VALUES (?,?,?,?, 'wallet','succeeded','out')`,
        [req.user.id, `ENR-${Date.now().toString(36).toUpperCase()}`, c.title, finalPrice]);
      if (c.expert_id) {
        const cut = finalPrice * ((100 - config.platform.commission) / 100);
        await conn.query(
          'UPDATE users SET wallet_balance=wallet_balance+?, total_earnings=total_earnings+? WHERE id=?',
          [cut, cut, c.expert_id]);
        const [[e2]] = await conn.query('SELECT wallet_balance FROM users WHERE id=?', [c.expert_id]);
        await conn.query(
          'INSERT INTO wallet_ledger (user_id,amount,balance_after,reason) VALUES (?,?,?,?)',
          [c.expert_id, cut, e2.wallet_balance, `Course sale: ${c.title}`]);
      }
    }
    const [r] = await conn.query(
      `INSERT INTO enrollments (user_id, course_id, enrollment_type, reference_id, progress, status) VALUES (?,?,?,?, 0, 'active')`,
      [req.user.id, course_id, c.course_type, c.id]);
    if (cp) await conn.query('UPDATE coupons SET used_count=used_count+1 WHERE id=?', [cp.id]);
    await conn.commit();
    res.status(201).json({ id: r.insertId, paid: finalPrice, discount });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

router.post('/courses/:id/start-trial', auth(), safeRoute(async (_req, res) => {
  res.json({ ok: true, trial_expires_at: new Date(Date.now() + 48 * 3600 * 1000) });
}, { ok: true }));

router.post('/bundles/:id/purchase', auth(), safeRoute(async (_req, res) => {
  res.json({ ok: true });
}, { ok: true }));

router.get('/lessons/:id', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[lesson]] = await pool.query('SELECT * FROM lessons WHERE id=?', [req.params.id]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const [[progress]] = await pool.query(
    'SELECT * FROM lesson_progress WHERE user_id=? AND lesson_id=?',
    [req.user.id, req.params.id]).catch(() => [[null]]);
  res.json({ lesson, progress: progress || { status: 'not_started' } });
}, { lesson: null, progress: null }));

router.post('/lessons/:id/progress', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const { status, position_seconds, time_spent_seconds } = req.body || {};
  await pool.query(
    `INSERT INTO lesson_progress (user_id, lesson_id, status, position_seconds, time_spent_seconds, updated_at)
     VALUES (?,?,?,?,?, NOW())
     ON DUPLICATE KEY UPDATE
       status=COALESCE(VALUES(status), status),
       position_seconds=COALESCE(VALUES(position_seconds), position_seconds),
       time_spent_seconds=time_spent_seconds + COALESCE(VALUES(time_spent_seconds), 0),
       updated_at=NOW()`,
    [req.user.id, req.params.id, status || null, position_seconds || null, time_spent_seconds || 0]);
  res.json({ ok: true });
}, { ok: true }));

router.get('/lessons/:id/notes', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM lesson_notes WHERE user_id=? AND lesson_id=? ORDER BY created_at DESC',
    [req.user.id, req.params.id]);
  res.json({ notes: rows });
}, { notes: [] }));

router.post('/lessons/:id/notes', auth(), safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    'INSERT INTO lesson_notes (user_id, lesson_id, content) VALUES (?,?,?)',
    [req.user.id, req.params.id, req.body?.content || '']);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.get('/lessons/:id/questions', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM lesson_questions WHERE lesson_id=? ORDER BY created_at DESC', [req.params.id]);
  res.json({ questions: rows });
}, { questions: [] }));

router.post('/lessons/:id/questions', auth(), safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    'INSERT INTO lesson_questions (lesson_id, user_id, question) VALUES (?,?,?)',
    [req.params.id, req.user.id, req.body?.question || '']);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.post('/discussions', auth(), safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    'INSERT INTO course_discussions (course_id, lesson_id, user_id, body) VALUES (?,?,?,?)',
    [req.body?.course_id, req.body?.lesson_id || null, req.user.id, req.body?.body || '']);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

module.exports = router;
