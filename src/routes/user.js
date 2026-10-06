/* ============================================================
   Learner / user panel — enrollments, wallet, profile, wishlist,
   XP, badges, expert browsing, GDPR
   ============================================================ */
const express = require('express');
const { auth, asyncH, safeRoute } = require('../lib/helpers');
const { poolOrThrow } = require('../lib/db');
const { creditWallet } = require('../lib/wallet');

const router = express.Router();

/* ---------- Enrollments ---------- */
router.get('/enrollments', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [rows] = await pool.query(
    `SELECT e.*, c.title, c.thumbnail, c.total_lessons, c.course_type enrollment_type
       FROM enrollments e JOIN courses c ON c.id=e.course_id
      WHERE e.user_id=? ORDER BY e.created_at DESC`, [req.user.id]);
  res.json({ enrollments: rows });
}));

router.put('/enrollments/:id/progress', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { progress } = req.body;
  const [[enr]] = await pool.query(
    'SELECT * FROM enrollments WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!enr) return res.status(404).json({ error: 'Enrollment not found' });

  await pool.query('UPDATE enrollments SET progress=? WHERE id=?', [progress, req.params.id]);

  if (progress >= 100) {
    const [[c]] = await pool.query('SELECT title FROM courses WHERE id=?', [enr.course_id]);
    const serial = `EH-${Date.now().toString(36).toUpperCase()}`;
    const hash = Buffer.from(`${req.user.id}:${serial}`).toString('base64');
    const [r] = await pool.query(
      `INSERT INTO certificates (user_id, course_title, serial, verification_hash) VALUES (?,?,?,?)`,
      [req.user.id, c.title, serial, hash]);
    await pool.query('UPDATE enrollments SET status="completed", certificate_id=? WHERE id=?',
      [r.insertId, req.params.id]);
    const ctx = require('../context');
    if (ctx.io) {
      ctx.io.to(`user_${req.user.id}`).emit('enrollment:certificate_issued', { course_title: c.title, serial });
    }
  }
  res.json({ ok: true });
}));

/* ---------- Certificates ---------- */
router.get('/certificates', auth(), asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM certificates WHERE user_id=? ORDER BY issued_at DESC', [req.user.id]);
  res.json({ certificates: rows });
}));

/* ---------- Wallet ---------- */
router.get('/wallet', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT wallet_balance FROM users WHERE id=?', [req.user.id]);
  const [ledger] = await pool.query(
    'SELECT * FROM wallet_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
  res.json({ balance: Number(u?.wallet_balance || 0), ledger });
}));

router.post('/wallet/topup', auth(), asyncH(async (req, res) => {
  const { amount, provider } = req.body;
  const ref = `TOP-${Date.now().toString(36).toUpperCase()}`;
  await creditWallet(req.user.id, amount, 'Wallet top-up', ref);
  const pool = poolOrThrow();
  await pool.query(
    `INSERT INTO transactions (user_id,reference,description,amount,provider,status,direction) VALUES (?,?, 'Wallet top-up', ?, ?, 'succeeded', 'in')`,
    [req.user.id, ref, amount, provider || 'wallet']);
  const [[u]] = await pool.query('SELECT wallet_balance FROM users WHERE id=?', [req.user.id]);
  res.json({ ok: true, balance: u.wallet_balance, reference: ref });
}));

router.get('/transactions', auth(), asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ transactions: rows });
}));

/* ---------- Preferences / profile ---------- */
router.get('/preferences', auth(), asyncH(async (req, res) => {
  const [[u]] = await poolOrThrow().query('SELECT intent FROM users WHERE id=?', [req.user.id]);
  res.json({ intent: u?.intent || 'both' });
}));

router.put('/preferences', auth(), asyncH(async (req, res) => {
  const { intent } = req.body || {};
  if (!['learn', 'consult', 'both'].includes(intent)) {
    return res.status(400).json({ error: 'Invalid intent' });
  }
  await poolOrThrow().query('UPDATE users SET intent=? WHERE id=?', [intent, req.user.id]);
  res.json({ ok: true, intent });
}));

router.put('/profile', auth(), asyncH(async (req, res) => {
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

/* ---------- XP / badges / learning paths / bundles ---------- */
router.get('/xp', auth(), safeRoute(async (req, res) => {
  const [[u]] = await poolOrThrow().query(
    'SELECT xp, current_streak, longest_streak FROM users WHERE id=?', [req.user.id]);
  const xp = u?.xp || 0;
  res.json({
    xp, level: Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1),
    current_streak: u?.current_streak || 0, longest_streak: u?.longest_streak || 0,
  });
}, { xp: 0, level: 1, current_streak: 0, longest_streak: 0 }));

router.get('/badges', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM user_badges WHERE user_id=?', [req.user.id]);
  res.json({ badges: rows });
}, { badges: [] }));

router.get('/learning-paths', auth(), safeRoute(async (_req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM learning_paths WHERE active=1 ORDER BY created_at DESC');
  res.json({ paths: rows });
}, { paths: [] }));

router.get('/bundles', auth(), safeRoute(async (_req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM course_bundles ORDER BY created_at DESC');
  res.json({ bundles: rows });
}, { bundles: [] }));

router.get('/watch-history', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM lesson_progress WHERE user_id=? ORDER BY updated_at DESC LIMIT 20', [req.user.id]);
  res.json({ history: rows });
}, { history: [] }));

/* ---------- Wishlist / shortlist ---------- */
router.get('/wishlist', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM user_wishlist WHERE user_id=?', [req.user.id]);
  res.json({ items: rows });
}, { items: [] }));

router.post('/wishlist/toggle', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const cid = Number(req.body?.course_id);
  const [[existing]] = await pool.query(
    'SELECT id FROM user_wishlist WHERE user_id=? AND course_id=?', [req.user.id, cid]);
  if (existing) await pool.query('DELETE FROM user_wishlist WHERE id=?', [existing.id]);
  else await pool.query('INSERT INTO user_wishlist (user_id, course_id) VALUES (?,?)', [req.user.id, cid]);
  res.json({ ok: true });
}, { ok: true }));

router.get('/shortlist', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT s.expert_id, u.name, u.specialization, u.hourly_rate, u.average_rating
       FROM user_shortlist s JOIN users u ON u.id=s.expert_id
      WHERE s.user_id=?`, [req.user.id]);
  res.json({ shortlist: rows });
}, { shortlist: [] }));

router.post('/shortlist/toggle', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const eid = Number(req.body?.expert_id);
  const [[existing]] = await pool.query(
    'SELECT id FROM user_shortlist WHERE user_id=? AND expert_id=?', [req.user.id, eid]);
  if (existing) await pool.query('DELETE FROM user_shortlist WHERE id=?', [existing.id]);
  else await pool.query('INSERT INTO user_shortlist (user_id, expert_id) VALUES (?,?)', [req.user.id, eid]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Packages ---------- */
router.get('/packages', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT up.*, pd.name package_name, u.name expert_name, pd.sessions_count sessions_total
       FROM user_packages up
       LEFT JOIN package_defs pd ON pd.id=up.package_id
       LEFT JOIN users u ON u.id=pd.expert_id
      WHERE up.user_id=?`, [req.user.id]);
  res.json({ packages: rows });
}, { packages: [] }));

/* ---------- Course reviews ---------- */
router.get('/course-reviews', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query('SELECT * FROM course_reviews WHERE user_id=?', [req.user.id]);
  res.json({ reviews: rows });
}, { reviews: [] }));

router.post('/course-reviews', auth(), safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `INSERT INTO course_reviews (user_id, course_id, content_rating, instructor_rating, value_rating, would_recommend, comment)
     VALUES (?,?,?,?,?,?,?)`,
    [req.user.id, req.body?.course_id,
     req.body?.content_rating || 0, req.body?.instructor_rating || 0,
     req.body?.value_rating || 0, req.body?.would_recommend ? 1 : 0,
     req.body?.comment || '']);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

/* ---------- Refunds ---------- */
router.get('/refunds', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM refunds WHERE user_id=? ORDER BY requested_at DESC', [req.user.id]);
  res.json({ refunds: rows });
}, { refunds: [] }));

router.post('/enrollments/:id/refund', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[enr]] = await pool.query(
    `SELECT e.*, c.title course_title, c.price FROM enrollments e
       JOIN courses c ON c.id=e.course_id WHERE e.id=? AND e.user_id=?`,
    [req.params.id, req.user.id]);
  if (!enr) return res.status(404).json({ error: 'Enrollment not found' });
  const [r] = await pool.query(
    `INSERT INTO refunds (user_id, enrollment_id, course_title, amount, reason, status) VALUES (?,?,?,?,?, 'requested')`,
    [req.user.id, enr.id, enr.course_title, enr.price || 0, req.body?.reason || '']);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

/* ---------- Claims / tickets / reviews ---------- */
router.post('/claims', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO claims (user_id,consultation_id,claim_title,claim_description,claim_amount,status) VALUES (?,?,?,?,?, 'open')`,
    [req.user.id, b.consultation_id || null, b.claim_title, b.claim_description, b.claim_amount || null]);
  res.status(201).json({ id: r.insertId });
}));

router.get('/claims', auth(), asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM claims WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ claims: rows });
}));

router.post('/tickets', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { subject, description, priority = 'normal', category = 'general' } = req.body;
  const ref = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const [r] = await pool.query(
    `INSERT INTO tickets (user_id,reference,subject,description,priority,category,status) VALUES (?,?,?,?,?,?, 'open')`,
    [req.user.id, ref, subject, description, priority, category]);
  res.status(201).json({ id: r.insertId, reference: ref });
}));

router.get('/tickets', auth(), asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM tickets WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
  res.json({ tickets: rows });
}));

router.post('/tickets/:id/replies', auth(), asyncH(async (req, res) => {
  const [r] = await poolOrThrow().query(
    'INSERT INTO ticket_replies (ticket_id,user_id,message) VALUES (?,?,?)',
    [req.params.id, req.user.id, req.body.message]);
  res.status(201).json({ id: r.insertId });
}));

router.post('/reviews', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { expert_id, consultation_id = null, rating, comment = '' } = req.body;
  const [r] = await pool.query(
    `INSERT INTO reviews (expert_id,author_id,consultation_id,rating,comment,status) VALUES (?,?,?,?,?, 'published')`,
    [expert_id, req.user.id, consultation_id, rating, comment]);
  const [[stats]] = await pool.query(
    `SELECT AVG(rating) avg_rating FROM reviews WHERE expert_id=? AND status='published'`, [expert_id]);
  await pool.query('UPDATE users SET average_rating=? WHERE id=?', [stats.avg_rating, expert_id]);
  res.status(201).json({ id: r.insertId });
}));

/* ---------- GDPR ---------- */
router.get('/gdpr-export', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[user]] = await pool.query('SELECT id,name,email,phone,role,created_at FROM users WHERE id=?', [req.user.id]);
  const [enrollments] = await pool.query('SELECT * FROM enrollments WHERE user_id=?', [req.user.id]);
  const [consultations] = await pool.query('SELECT * FROM consultations WHERE user_id=?', [req.user.id]);
  const [transactions] = await pool.query('SELECT * FROM transactions WHERE user_id=?', [req.user.id]);
  const [certificates] = await pool.query('SELECT * FROM certificates WHERE user_id=?', [req.user.id]);
  const payload = { user, enrollments, consultations, transactions, certificates, exported_at: new Date() };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="my-data-${req.user.id}.json"`);
  res.send(JSON.stringify(payload, null, 2));
}));

router.post('/gdpr-delete', auth(), safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'UPDATE users SET status=?, deletion_requested_at=NOW() WHERE id=?', ['suspended', req.user.id]);
  res.json({ ok: true, message: 'Account scheduled for deletion in 30 days' });
}));

/* ---------- Expert browsing ---------- */
router.get('/experts', auth(), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT id, name, email, avatar, bio, specialization, hourly_rate, average_rating,
            verified_badge, response_time_minutes
       FROM users WHERE role='expert' AND status='active'`);
  res.json({ experts: rows, total: rows.length, page: 1, pages: 1 });
}));

router.get('/experts/:id', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[expert]] = await pool.query(
    `SELECT id, name, email, avatar, bio, specialization, hourly_rate, average_rating, verified_badge
       FROM users WHERE id=? AND role='expert'`, [req.params.id]);
  if (!expert) return res.status(404).json({ error: 'Expert not found' });
  const [reviews] = await pool.query(
    `SELECT r.*, u.name author_name FROM reviews r
       LEFT JOIN users u ON u.id=r.author_id
      WHERE r.expert_id=? AND r.status='published'`, [req.params.id]);
  const [availability] = await pool.query(
    'SELECT * FROM availability WHERE expert_id=?', [req.params.id]).catch(() => [[]]);
  res.json({ expert, reviews, availability });
}));

/* ---------- Package purchase ---------- */
router.post('/packages/:id/purchase', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[def]] = await pool.query('SELECT * FROM package_defs WHERE id=?', [req.params.id]);
  if (!def) return res.status(404).json({ error: 'Package not found' });
  await pool.query(
    `INSERT INTO user_packages (user_id, package_id, sessions_remaining, expires_at)
     VALUES (?,?,?, DATE_ADD(NOW(), INTERVAL 180 DAY))`,
    [req.user.id, def.id, def.sessions_count]);
  res.status(201).json({ ok: true });
}, { ok: true }));

module.exports = router;
