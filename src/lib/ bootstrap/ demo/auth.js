/* ============================================================
   Demo mode — authentication
   ============================================================ */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { demo, nextId, currentDemoUser } = require('./_base');

module.exports = async function authDemo(req, res, p) {
  const { method } = req;

  /* ---------- LOGIN ---------- */
  if (method === 'POST' && p === '/auth/login') {
    const { email, password } = req.body || {};
    const user = demo.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' }), true;

    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' }), true;

    if (user.status === 'pending')    return res.status(403).json({ error: 'Account pending admin approval' }), true;
    if (user.status === 'suspended')  return res.status(403).json({ error: 'Account suspended' }), true;
    if (user.status === 'rejected')   return res.status(403).json({ error: 'Account rejected' }), true;

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, institution_id: user.institution_id },
      config.jwt.secret, { expiresIn: config.jwt.expiresIn }
    );
    const refresh = jwt.sign({ id: user.id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
    demo.refreshTokens.push({ id: nextId('refreshTokens'), user_id: user.id, token: refresh, revoked: 0 });

    user.last_login_at = new Date();
    const { password_hash, ...safe } = user;
    return res.json({ token, refresh, user: safe, _demo: true }), true;
  }

  /* ---------- REGISTER ---------- */
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
      hourly_rate: extra.hourly_rate || 0,
      bio: extra.bio || null,
      avatar: null,
      wallet_balance: 0, total_earnings: 0, average_rating: 0,
      created_at: new Date(), last_login_at: null,
      timezone: 'UTC', theme: 'light', language: 'en', intent: 'both',
      institution_id: null, institution_role: null,
      lifecycle_status: 'active', at_risk: 0,
    };
    demo.users.push(user);
    demo.notificationPrefs.push({ user_id: id, email_notifications: 1, push_notifications: 1, marketing: 0 });
    demo.userXP[id] = 0;
    demo.userStreak[id] = { current: 0, longest: 0 };

    /* Auto-create institution for institution role */
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
      message: status === 'active'
        ? 'Account created. You can log in now.'
        : safeRole === 'institution'
          ? 'Institution registered. Awaiting admin verification.'
          : 'Registration successful. Awaiting admin approval.',
    }), true;
  }

  /* ---------- ME ---------- */
  if (method === 'GET' && p === '/auth/me') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { password_hash, ...safe } = user;
    return res.json({ user: safe }), true;
  }

  /* ---------- REFRESH ---------- */
  if (method === 'POST' && p === '/auth/refresh') {
    const { refresh } = req.body || {};
    if (!refresh) return res.status(400).json({ error: 'Refresh token required' }), true;
    try {
      const payload = jwt.verify(refresh, config.jwt.refreshSecret);
      const rt = demo.refreshTokens.find(t => t.token === refresh && !t.revoked);
      if (!rt) return res.status(401).json({ error: 'Refresh token revoked or expired' }), true;
      const user = demo.users.find(u => u.id === payload.id);
      if (!user || user.status !== 'active') return res.status(403).json({ error: 'Account not active' }), true;
      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email, institution_id: user.institution_id },
        config.jwt.secret, { expiresIn: config.jwt.expiresIn }
      );
      return res.json({ token }), true;
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' }), true;
    }
  }

  /* ---------- LOGOUT ---------- */
  if (method === 'POST' && p === '/auth/logout') {
    const { refresh } = req.body || {};
    if (refresh) {
      const rt = demo.refreshTokens.find(t => t.token === refresh);
      if (rt) rt.revoked = 1;
    }
    return res.json({ ok: true }), true;
  }

  /* ---------- FORGOT / RESET ---------- */
  if (method === 'POST' && p === '/auth/forgot') {
    return res.json({ ok: true, message: 'Reset link sent (demo)' }), true;
  }
  if (method === 'POST' && p === '/auth/reset') {
    return res.json({ ok: true, message: 'Password reset (demo)' }), true;
  }

  /* ---------- CHANGE PASSWORD ---------- */
  if (method === 'PUT' && p === '/auth/password') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { old_password, new_password } = req.body || {};
    const ok = await bcrypt.compare(old_password || '', user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' }), true;
    user.password_hash = await bcrypt.hash(new_password, 10);
    return res.json({ ok: true }), true;
  }

  /* ---------- SETUP ACCOUNT ---------- */
  if (method === 'POST' && p === '/auth/setup-account') {
    const { email, password } = req.body || {};
    const u = demo.users.find(x => x.email === email);
    if (!u) return res.status(404).json({ error: 'No pending invitation found' }), true;
    u.password_hash = await bcrypt.hash(password, 10);
    u.lifecycle_status = 'active';
    return res.json({ ok: true, message: 'Account activated' }), true;
  }

  return false;
};
