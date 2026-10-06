/* ============================================================
   Consultations — booking, lifecycle, tips, disputes
   ============================================================ */
const express = require('express');
const { auth, safeRoute } = require('../lib/helpers');
const { poolOrThrow } = require('../lib/db');
const { creditWallet } = require('../lib/wallet');
const { notify } = require('../lib/notify');
const config = require('../config');
const ctx = require('../context');

const router = express.Router();

router.post('/book', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const { expert_id, slot_id, title, description, consultation_type, duration_minutes } = req.body;

  const [[expert]] = await pool.query('SELECT * FROM users WHERE id=? AND role=?', [expert_id, 'expert']);
  if (!expert) return res.status(404).json({ error: 'Expert not found' });

  let slot = null;
  if (slot_id) {
    [[slot]] = await pool.query(
      "SELECT * FROM consultation_slots WHERE id=? AND status='available'", [slot_id]);
    if (!slot) return res.status(409).json({ error: 'Slot no longer available' });
    await pool.query("UPDATE consultation_slots SET status='booked' WHERE id=?", [slot_id]);
  }

  const price = slot?.price || (duration_minutes || 30) * (expert.hourly_rate / 60);
  const [r] = await pool.query(
    `INSERT INTO consultations (user_id, expert_id, title, description, status, consultation_type, session_type, price, duration_minutes, payment_status, slot_id, scheduled_at)
     VALUES (?,?,?,?, 'pending_expert_confirmation', ?, 'scheduled', ?, ?, 'held', ?, ?)`,
    [req.user.id, expert_id, title || 'Consultation', description || '',
     consultation_type || 'video', Math.round(price * 100) / 100,
     duration_minutes || slot?.duration_minutes || 30,
     slot_id || null, slot?.start_time || null]);

  await notify(expert_id, 'New booking request',
    `${req.user.email} wants a ${duration_minutes || 30}m session.`, 'booking');
  res.status(201).json({ id: r.insertId, status: 'pending_expert_confirmation' });
}, { ok: true }));

router.post('/match', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const { problemText, budget } = req.body || {};
  const text = String(problemText || '').toLowerCase();
  const [experts] = await pool.query(
    "SELECT id, name, specialization, hourly_rate, average_rating FROM users WHERE role='expert' AND status='active'");
  const scored = experts.map(e => {
    let score = Number(e.average_rating || 0);
    const spec = String(e.specialization || '').toLowerCase();
    if (spec && text.includes(spec.split(' ')[0])) score += 5;
    if (!budget || Number(e.hourly_rate) <= Number(budget)) score += 1;
    return { ...e, _score: score };
  }).sort((a, b) => b._score - a._score).slice(0, 5);
  res.json({ matches: scored });
}, { matches: [] }));

router.post('/instant', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[expert]] = await pool.query(
    "SELECT * FROM users WHERE role='expert' AND status='active' LIMIT 1");
  if (!expert) return res.status(404).json({ error: 'No expert available right now' });
  const [r] = await pool.query(
    `INSERT INTO consultations (user_id, expert_id, title, status, consultation_type, session_type, price, duration_minutes, payment_status, scheduled_at)
     VALUES (?,?,?, 'in_session', 'video', 'instant', ?, 15, 'held', NOW())`,
    [req.user.id, expert.id, req.body?.topic || 'Instant consultation', expert.hourly_rate / 2]);
  delete expert.password_hash;
  res.status(201).json({ id: r.insertId, status: 'in_session', expert });
}, { ok: true }));

router.put('/:id/confirm', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[c]] = await pool.query('SELECT * FROM consultations WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (c.expert_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await pool.query("UPDATE consultations SET status='confirmed' WHERE id=?", [req.params.id]);
  await notify(c.user_id, 'Consultation confirmed', `Your session is confirmed.`, 'success');
  res.json({ ok: true });
}, { ok: true }));

router.post('/:id/start', auth(), safeRoute(async (req, res) => {
  await poolOrThrow().query(
    "UPDATE consultations SET status='in_session', started_at=NOW() WHERE id=?", [req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

router.post('/:id/complete', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[c]] = await pool.query('SELECT * FROM consultations WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });

  await pool.query(
    "UPDATE consultations SET status='completed', completed_at=NOW(), payment_status='released' WHERE id=?",
    [req.params.id]);

  if (c.expert_id) {
    const cut = Number(c.price) * ((100 - config.platform.commission) / 100);
    await creditWallet(c.expert_id, cut, `Consultation: ${c.title}`, `CONS-${c.id}`);
    if (ctx.io) {
      ctx.io.to(`user_${c.expert_id}`).emit('consultation:escrow_released', {
        amount: c.price, consultation_id: c.id,
      });
    }
  }
  res.json({ ok: true });
}, { ok: true }));

router.put('/:id/reschedule', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[c]] = await pool.query('SELECT * FROM consultations WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const [[slot]] = await pool.query(
    "SELECT * FROM consultation_slots WHERE id=? AND status='available'", [req.body?.new_slot_id]);
  if (!slot) return res.status(409).json({ error: 'Slot not available' });
  if (c.slot_id) {
    await pool.query("UPDATE consultation_slots SET status='available' WHERE id=?", [c.slot_id]);
  }
  await pool.query("UPDATE consultation_slots SET status='booked' WHERE id=?", [slot.id]);
  await pool.query(
    'UPDATE consultations SET slot_id=?, scheduled_at=?, reschedule_count=reschedule_count+1 WHERE id=?',
    [slot.id, slot.start_time, req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

router.put('/:id/cancel', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[c]] = await pool.query('SELECT * FROM consultations WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  await pool.query(
    "UPDATE consultations SET status='cancelled', cancel_reason=? WHERE id=?",
    [req.body?.reason || null, req.params.id]);
  if (c.slot_id) {
    await pool.query("UPDATE consultation_slots SET status='available' WHERE id=?", [c.slot_id]);
  }
  res.json({ ok: true });
}, { ok: true }));

router.post('/:id/review', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[c]] = await pool.query('SELECT * FROM consultations WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const [r] = await pool.query(
    `INSERT INTO reviews (expert_id, author_id, consultation_id, rating, comment, status) VALUES (?,?,?,?,?, 'published')`,
    [c.expert_id, req.user.id, c.id, req.body?.rating || 5, req.body?.comment || '']);
  await pool.query('UPDATE consultations SET reviewed=1 WHERE id=?', [req.params.id]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.post('/:id/tip', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[c]] = await pool.query('SELECT * FROM consultations WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const amount = Number(req.body?.amount || 0);
  if (amount <= 0) return res.status(400).json({ error: 'Amount required' });
  await creditWallet(c.expert_id, amount, 'Tip from client', `TIP-${c.id}`);
  res.json({ ok: true });
}, { ok: true }));

router.post('/:id/dispute', auth(), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[c]] = await pool.query('SELECT * FROM consultations WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const [r] = await pool.query(
    `INSERT INTO consultation_disputes (consultation_id, opener_id, reason, description, status) VALUES (?,?,?,?, 'open')`,
    [c.id, req.user.id, req.body?.reason || 'other', req.body?.description || '']);
  await pool.query("UPDATE consultations SET status='disputed', disputed=1 WHERE id=?", [req.params.id]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

module.exports = router;
