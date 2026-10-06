/* ============================================================
   Common authenticated routes — notifications, events, consultations
   ============================================================ */
const express = require('express');
const { asyncH, auth, safeRoute } = require('../lib/helpers');
const { poolOrThrow } = require('../lib/db');
const { notify } = require('../lib/notify');
const ctx = require('../context');

const router = express.Router();

router.get('/notifications', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const limit = Math.min(Number(req.query.limit || 30), 100);
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE user_id IS NULL OR user_id=? ORDER BY created_at DESC LIMIT ?`,
    [req.user.id, limit]);
  const [[{ unread }]] = await pool.query(
    `SELECT COUNT(*) unread FROM notifications WHERE (user_id IS NULL OR user_id=?) AND is_read=0`,
    [req.user.id]);
  res.json({ notifications: rows, unread });
}));

router.put('/notifications/:id/read', auth(), asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE notifications SET is_read=1 WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

router.put('/notifications/read-all', auth(), asyncH(async (req, res) => {
  await poolOrThrow().query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
  res.json({ ok: true });
}));

router.get('/events', auth(), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT e.*, u.name expert_name,
       (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id=e.id AND er.status='registered') registered_count
       FROM events e LEFT JOIN users u ON u.id=e.expert_id
      WHERE e.status='published' ORDER BY e.date`);
  res.json({ events: rows });
}));

router.post('/events/:id/register', auth(), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[ev]] = await pool.query('SELECT * FROM events WHERE id=?', [req.params.id]);
  if (!ev) return res.status(404).json({ error: 'Event not found' });

  const [[existing]] = await pool.query(
    'SELECT id FROM event_registrations WHERE event_id=? AND user_id=?', [req.params.id, req.user.id]);
  if (existing) {
    await pool.query("UPDATE event_registrations SET status='registered' WHERE id=?", [existing.id]);
  } else {
    await pool.query(
      `INSERT INTO event_registrations (event_id,user_id,status) VALUES (?,?,'registered')`,
      [req.params.id, req.user.id]);
  }
  await notify(req.user.id, 'Event registered', `You are registered for "${ev.title}".`);
  res.json({ ok: true });
}));

/* ---------- Consultations ---------- */
router.get('/consultations', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const clauses = ['1=1']; const params = [];
  if (req.user.role === 'expert') { clauses.push('c.expert_id=?'); params.push(req.user.id); }
  else if (req.user.role === 'learner') { clauses.push('c.user_id=?'); params.push(req.user.id); }

  const [rows] = await pool.query(
    `SELECT c.*, u.name client_name, e.name expert_name
       FROM consultations c
       LEFT JOIN users u ON u.id=c.user_id
       LEFT JOIN users e ON e.id=c.expert_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY c.created_at DESC LIMIT 200`, params);
  res.json({ consultations: rows });
}, { consultations: [] }));

router.get('/consultations/:id/messages', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM consultation_messages WHERE consultation_id=? ORDER BY created_at ASC',
    [req.params.id]);
  res.json({ messages: rows });
}, { messages: [] }));

router.post('/consultations/:id/messages', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [r] = await pool.query(
    'INSERT INTO consultation_messages (consultation_id, sender_id, message) VALUES (?,?,?)',
    [req.params.id, req.user.id, req.body?.message || '']);

  if (ctx.io) {
    ctx.io.to(`consultation_${req.params.id}`).emit('new_message', {
      id: r.insertId, consultation_id: Number(req.params.id),
      sender_id: req.user.id, sender_name: req.user.email,
      message: req.body?.message || '', created_at: new Date(),
    });
  }
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.post('/consultations/:id/attachments', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'File required' });
  const url = '/uploads/' + file.filename;
  await pool.query(
    'INSERT INTO consultation_messages (consultation_id, sender_id, message, attachment_url) VALUES (?,?,?,?)',
    [req.params.id, req.user.id, '', url]);
  res.json({ ok: true, url });
}, { ok: true }));

router.put('/consultations/:id/assign', auth(['admin']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query(
    "UPDATE consultations SET expert_id=?, status='pending_expert_confirmation' WHERE id=?",
    [req.body.expert_id, req.params.id]);
  await notify(req.body.expert_id, 'New consultation assigned', `Consultation #${req.params.id}`, 'info');
  res.json({ ok: true });
}, { ok: true }));

module.exports = router;
