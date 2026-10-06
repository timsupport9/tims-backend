/* ============================================================
   Admin panel — users, analytics, payouts, coupons, claims,
   tickets, reviews, disputes, refunds, settings, events,
   notifications broadcast
   ============================================================ */
const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { auth, asyncH, safeRoute } = require('../lib/helpers');
const { poolOrThrow } = require('../lib/db');
const { logAudit } = require('../lib/institution-audit');
const { notify, broadcast } = require('../lib/notify');

const router = express.Router();

/* ---------- Users ---------- */
router.get('/users', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT id,name,email,phone,role,status,avatar,created_at,last_login_at FROM users ORDER BY created_at DESC');
  res.json({ users: rows, total: rows.length, page: 1, pages: 1 });
}));

router.put('/users/:id/approve', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query("UPDATE users SET status='active' WHERE id=?", [req.params.id]);
  await notify(req.params.id, 'Account approved', 'Your account has been approved.');
  res.json({ ok: true });
}));

router.put('/users/:id/suspend', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query("UPDATE users SET status='suspended' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
}));

router.put('/users/:id/reject', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query("UPDATE users SET status='rejected' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
}));

router.put('/users/:id', auth(['admin']), asyncH(async (req, res) => {
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

router.delete('/users/:id', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM users WHERE id=?', [req.params.id]);
  await logAudit(req.user.id, 'user.delete', 'user', req.params.id, {}, req.ip);
  res.json({ ok: true });
}));

/* ---------- Experts ---------- */
router.get('/experts', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT id,name,email,phone,avatar,specialization,hourly_rate,average_rating,total_earnings,status,created_at
       FROM users WHERE role='expert' ORDER BY created_at DESC`);
  res.json({ experts: rows, total: rows.length, page: 1, pages: 1 });
}));

router.post('/experts/create', auth(['admin']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { name, email, specialization, hourly_rate, bio, phone } = req.body;
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const tempPwd = nanoid(10);
  const hash = await bcrypt.hash(tempPwd, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,phone,role,status,specialization,hourly_rate,bio,intent)
     VALUES (?,?,?,?, 'expert','active',?,?,?, 'both')`,
    [name, email, hash, phone || '', specialization || null, hourly_rate || 0, bio || null]);
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  res.status(201).json({ id: r.insertId, temp_password: tempPwd });
}));

router.post('/experts/:id/verify-badge', auth(['admin']), safeRoute(async (req, res) => {
  await poolOrThrow().query('UPDATE users SET verified_badge=1 WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Analytics ---------- */
router.get('/analytics', auth(['admin']), asyncH(async (_req, res) => {
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
       (SELECT COUNT(*) FROM trainees)     trainees`);
  const [roles] = await pool.query("SELECT role, COUNT(*) c FROM users GROUP BY role");
  const [top] = await pool.query(
    `SELECT id,name,average_rating,total_earnings FROM users WHERE role='expert' ORDER BY total_earnings DESC LIMIT 10`);
  const [usersByMonth] = await pool.query(
    `SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COUNT(*) c FROM users GROUP BY ym ORDER BY ym DESC LIMIT 12`);
  const [revenueByMonth] = await pool.query(
    `SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COALESCE(SUM(amount),0) total FROM transactions
      WHERE status='succeeded' AND direction='in' GROUP BY ym ORDER BY ym DESC LIMIT 12`);
  res.json({ totals, usersByRole: roles, topExperts: top, usersByMonth, revenueByMonth });
}));

/* ---------- Transactions & payouts ---------- */
router.get('/transactions', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT t.*, u.name user_name FROM transactions t
       LEFT JOIN users u ON u.id=t.user_id
      ORDER BY t.created_at DESC LIMIT 500`);
  res.json({ transactions: rows, total: rows.length, page: 1, pages: 1 });
}));

router.get('/payouts', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT p.*, u.name expert_name, u.email expert_email FROM payouts p
       LEFT JOIN users u ON u.id=p.expert_id ORDER BY p.created_at DESC`);
  res.json({ payouts: rows });
}));

router.put('/payouts/:id', auth(['admin']), asyncH(async (req, res) => {
  const { status, reason } = req.body;
  await poolOrThrow().query(
    `UPDATE payouts SET status=?, rejection_reason=?, processed_at=IF(?='paid', NOW(), processed_at) WHERE id=?`,
    [status, reason || null, status, req.params.id]);
  await logAudit(req.user.id, `payout.${status}`, 'payout', req.params.id, {}, req.ip);
  res.json({ ok: true });
}));

/* ---------- Coupons ---------- */
router.get('/coupons', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ coupons: rows });
}));

router.post('/coupons', auth(['admin']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO coupons (code,discount_type,discount_value,max_uses,min_spend,applies_to,active,expires_at)
     VALUES (?,?,?,?,?,?, 1, ?)`,
    [b.code, b.discount_type, b.discount_value, b.max_uses || null,
     b.min_spend || 0, b.applies_to || 'all', b.expires_at || null]);
  await logAudit(req.user.id, 'coupon.create', 'coupon', r.insertId, { code: b.code }, req.ip);
  res.status(201).json({ id: r.insertId });
}));

router.put('/coupons/:id/toggle', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE coupons SET active = 1 - active WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

router.delete('/coupons/:id', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM coupons WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

/* ---------- Claims / tickets / reviews ---------- */
router.get('/claims', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM claims ORDER BY created_at DESC');
  res.json({ claims: rows });
}));

router.put('/claims/:id', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query(
    `UPDATE claims SET status=?, resolution=?, resolved_at=IF(? IN ('resolved','rejected'), NOW(), resolved_at) WHERE id=?`,
    [req.body.status, req.body.resolution || null, req.body.status, req.params.id]);
  res.json({ ok: true });
}));

router.get('/tickets', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT t.*, u.name user_name FROM tickets t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC`);
  res.json({ tickets: rows });
}));

router.put('/tickets/:id', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE tickets SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ ok: true });
}));

router.get('/reviews', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT r.*, a.name author_name, e.name expert_name FROM reviews r
       LEFT JOIN users a ON a.id=r.author_id
       LEFT JOIN users e ON e.id=r.expert_id
      ORDER BY r.created_at DESC`);
  res.json({ reviews: rows });
}));

router.put('/reviews/:id', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE reviews SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ ok: true });
}));

/* ---------- Audit / settings ---------- */
router.get('/audit-logs', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT l.*, u.name actor_name FROM audit_logs l
       LEFT JOIN users u ON u.id=l.actor_id
      ORDER BY l.created_at DESC LIMIT 500`);
  res.json({ logs: rows });
}));

router.get('/settings', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query('SELECT key_name, value FROM settings');
  const settings = {};
  rows.forEach(r => { settings[r.key_name] = r.value; });
  res.json({ settings });
}));

router.put('/settings', auth(['admin']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  for (const [k, v] of Object.entries(req.body.settings || {})) {
    await pool.query(
      `INSERT INTO settings (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)`,
      [k, String(v)]);
  }
  res.json({ ok: true });
}));

/* ---------- Events ---------- */
router.post('/events', auth(['admin']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO events (title,description,category,expert_id,date,start_time,end_time,location,meeting_url,capacity,price,expert_payment,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'published')`,
    [b.title, b.description || '', b.category || 'General', b.expert_id || null,
     b.date || null, b.start_time || null, b.end_time || null,
     b.location || '', b.meeting_url || '', b.capacity || 100, b.price || 0, b.expert_payment || 0]);
  res.status(201).json({ id: r.insertId });
}));

router.put('/events/:id', auth(['admin']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['title', 'description', 'category', 'expert_id', 'date', 'start_time', 'end_time',
    'location', 'meeting_url', 'capacity', 'price', 'expert_payment', 'status'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE events SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
}));

router.delete('/events/:id', auth(['admin']), asyncH(async (req, res) => {
  await poolOrThrow().query('DELETE FROM events WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

/* ---------- Broadcast ---------- */
router.post('/notifications/broadcast', auth(['admin']), asyncH(async (req, res) => {
  const { title, message, audience = 'all' } = req.body;
  const sent = await broadcast(title, message, audience);
  res.json({ ok: true, sent });
}));

/* ---------- Disputes ---------- */
router.get('/disputes', auth(['admin']), safeRoute(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM consultation_disputes ORDER BY opened_at DESC');
  res.json({ disputes: rows });
}, { disputes: [] }));

router.put('/disputes/:id', auth(['admin']), safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'UPDATE consultation_disputes SET status=?, resolution=?, resolution_notes=?, refund_amount=?, resolved_at=NOW() WHERE id=?',
    [req.body.status, req.body.resolution || null, req.body.resolution_notes || null,
     req.body.refund_amount || 0, req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Consultation analytics ---------- */
router.get('/consultation-analytics', auth(['admin']), safeRoute(async (_req, res) => {
  const pool = poolOrThrow();
  const [[totals]] = await pool.query(
    `SELECT COUNT(*) total,
            SUM(status='completed') completed,
            SUM(status='no_show') no_shows,
            AVG(price) avg_price
       FROM consultations`);
  const [byStatus] = await pool.query(
    'SELECT status label, COUNT(*) value FROM consultations GROUP BY status');
  const [topExperts] = await pool.query(
    `SELECT u.id, u.name, u.average_rating, u.total_earnings, COUNT(c.id) consultations
       FROM users u LEFT JOIN consultations c ON c.expert_id=u.id
      WHERE u.role='expert' GROUP BY u.id ORDER BY u.total_earnings DESC LIMIT 10`);
  const [reasons] = await pool.query(
    "SELECT cancel_reason, COUNT(*) c FROM consultations WHERE status='cancelled' GROUP BY cancel_reason");
  res.json({ totals, byStatus, topExperts, cancellation_reasons: reasons });
}, { totals: {}, byStatus: [], topExperts: [], cancellation_reasons: [] }));

/* ---------- Refunds ---------- */
router.get('/refunds', auth(['admin']), safeRoute(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT r.*, u.name user_name FROM refunds r
       LEFT JOIN users u ON u.id=r.user_id
      ORDER BY r.requested_at DESC`);
  res.json({ refunds: rows });
}, { refunds: [] }));

router.put('/refunds/:id', auth(['admin']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[r]] = await pool.query('SELECT * FROM refunds WHERE id=?', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (req.body.status === 'approved') {
    await require('../lib/wallet').creditWallet(r.user_id, r.amount, `Refund: ${r.course_title}`, `REF-${r.id}`);
  }
  await pool.query('UPDATE refunds SET status=?, processed_at=NOW() WHERE id=?', [req.body.status, req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

module.exports = router;
