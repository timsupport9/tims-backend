/* ============================================================
   Authentication — register, login, refresh, logout, me,
   forgot/reset password, change password
   ============================================================ */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { nanoid } = require('nanoid');
const config = require('../config');
const { poolOrThrow } = require('../lib/db');
const { asyncH, validate, auth } = require('../lib/helpers');
const { notify } = require('../lib/notify');

const router = express.Router();

router.post('/register', [
  body('name').isLength({ min: 2, max: 120 }),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('role').optional().isIn(['learner', 'expert', 'institution']),
], validate, asyncH(async (req, res) => {
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
    [name, email, hash, phone, safeRole, status,
     extra.specialization || null, extra.hourly_rate || 0, extra.bio || null]
  );
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await notify(r.insertId, 'Welcome!',
    status === 'active' ? 'Your account is ready.' : 'Your account is pending admin approval.');

  if (safeRole === 'institution') {
    const [inst] = await pool.query(
      `INSERT INTO institutions (name, type, industry, contact_email, contact_phone, address, ops_manager_id, ops_manager_name, ops_manager_email, status, primary_color, accent_color)
       VALUES (?,?,?,?,?,?,?,?,?, 'pending','#1e3a8a','#059669')`,
      [extra.institution_name || (name + "'s Institution"),
       extra.institution_type || 'corporate', extra.industry || '',
       email, phone, '', r.insertId, name, email]
    );
    await pool.query(
      `UPDATE users SET institution_id=?, institution_role='operations_manager' WHERE id=?`,
      [inst.insertId, r.insertId]
    );
  }

  const [admins] = await pool.query("SELECT id FROM users WHERE role='admin'");
  for (const a of admins) {
    await notify(a.id, 'New registration',
      `${name} (${safeRole}) registered.`, 'info',
      safeRole === 'institution' ? '/admin/institutions' : '/admin/users');
  }

  res.status(201).json({
    id: r.insertId, status,
    message: status === 'active'
      ? 'Account created. You can log in now.'
      : safeRole === 'institution'
        ? 'Institution registered. Awaiting admin verification.'
        : 'Registration successful. Awaiting admin approval.',
  });
}));

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], validate, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { email, password } = req.body;

  const [[u]] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  if (!u) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  if (u.status === 'pending')   return res.status(403).json({ error: 'Account pending admin approval' });
  if (u.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
  if (u.status === 'rejected')  return res.status(403).json({ error: 'Account rejected' });

  const token = jwt.sign(
    { id: u.id, role: u.role, email: u.email, institution_id: u.institution_id },
    config.jwt.secret, { expiresIn: config.jwt.expiresIn }
  );
  const refresh = jwt.sign({ id: u.id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });

  await pool.query(
    'INSERT INTO refresh_tokens (user_id,token,expires_at) VALUES (?,?,?)',
    [u.id, refresh, new Date(Date.now() + 30 * 24 * 3600 * 1000)]
  );
  await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=?', [u.id]);

  delete u.password_hash;
  res.json({ token, refresh, user: u });
}));

router.post('/refresh', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error: 'Refresh token required' });

  let payload;
  try { payload = jwt.verify(refresh, config.jwt.refreshSecret); }
  catch { return res.status(401).json({ error: 'Invalid refresh token' }); }

  const [[row]] = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token=? AND revoked=0 AND expires_at > NOW()', [refresh]);
  if (!row) return res.status(401).json({ error: 'Refresh token revoked or expired' });

  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [payload.id]);
  if (!u || u.status !== 'active') return res.status(403).json({ error: 'Account not active' });

  const token = jwt.sign(
    { id: u.id, role: u.role, email: u.email, institution_id: u.institution_id },
    config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  res.json({ token });
}));

router.post('/logout', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  if (req.body?.refresh) {
    await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE token=?', [req.body.refresh]);
  }
  res.json({ ok: true });
}));

router.get('/me', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  if (!u) return res.status(404).json({ error: 'Not found' });
  delete u.password_hash;
  res.json({ user: u });
}));

router.post('/forgot', [body('email').isEmail()], validate, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query('SELECT id FROM users WHERE email=?', [req.body.email]);
  if (!u) return res.json({ ok: true, message: 'If the email exists, a reset link was sent.' });

  const token = nanoid(40);
  await pool.query(
    'INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,?)',
    [u.id, token, new Date(Date.now() + 3600 * 1000)]
  );
  console.log(`[PASSWORD RESET] ${req.body.email} → /#/reset?token=${token}`);
  res.json({ ok: true, message: 'If the email exists, a reset link was sent.' });
}));

router.post('/reset', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
], validate, asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { token, password } = req.body;
  const [[row]] = await pool.query(
    'SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > NOW()', [token]);
  if (!row) return res.status(400).json({ error: 'Invalid or expired token' });

  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, row.user_id]);
  await pool.query('UPDATE password_resets SET used=1 WHERE id=?', [row.id]);
  await pool.query('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', [row.user_id]);
  res.json({ ok: true });
}));

router.put('/password', auth(), [
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

module.exports = router;
