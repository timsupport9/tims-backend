/* ============================================================
   Experts — public reads + expert self-service for slots/tiers
   Mounted under /api/experts
   ============================================================ */
const express = require('express');
const { auth, safeRoute } = require('../lib/helpers');
const { poolOrThrow } = require('../lib/db');

const router = express.Router();

/* ---------- Public reads for a specific expert ---------- */
router.get('/:id/questions', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM expert_questions WHERE expert_id=? ORDER BY created_at DESC', [req.params.id]);
  res.json({ questions: rows });
}, { questions: [] }));

router.get('/:id/slots', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    "SELECT * FROM consultation_slots WHERE expert_id=? AND status='available' AND start_time > NOW() ORDER BY start_time LIMIT 40",
    [req.params.id]);
  res.json({ slots: rows });
}, { slots: [] }));

router.get('/:id/tiers', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM consultation_tiers WHERE expert_id=?', [req.params.id]);
  res.json({ tiers: rows });
}, { tiers: [] }));

router.get('/:id/packages', auth(), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM package_defs WHERE expert_id=?', [req.params.id]);
  res.json({ packages: rows });
}, { packages: [] }));

/* ---------- Expert self-service ---------- */
router.get('/me/slots', auth(['expert']), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM consultation_slots WHERE expert_id=? ORDER BY start_time', [req.user.id]);
  res.json({ slots: rows });
}, { slots: [] }));

router.post('/me/slots', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const slots = req.body?.slots || [];
  let created = 0;
  for (const s of slots) {
    await pool.query(
      `INSERT INTO consultation_slots (expert_id, start_time, end_time, duration_minutes, price, status)
       VALUES (?,?,?,?,?, "available")`,
      [req.user.id, s.start, s.end, s.duration || 30, s.price || 0]);
    created++;
  }
  res.json({ ok: true, created });
}, { ok: true, created: 0 }));

router.delete('/me/slots/:id', auth(['expert']), safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM consultation_slots WHERE id=? AND expert_id=?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}, { ok: true }));

router.get('/me/tiers', auth(['expert']), safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM consultation_tiers WHERE expert_id=?', [req.user.id]);
  res.json({ tiers: rows });
}, { tiers: [] }));

router.put('/me/tiers', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM consultation_tiers WHERE expert_id=?', [req.user.id]);
  for (const t of (req.body?.tiers || [])) {
    await pool.query(
      'INSERT INTO consultation_tiers (expert_id, name, duration_minutes, price, description) VALUES (?,?,?,?,?)',
      [req.user.id, t.name, t.duration_minutes, t.price, t.description || '']);
  }
  res.json({ ok: true });
}, { ok: true }));

router.post('/me/block-time', auth(['expert']), safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query(
    'INSERT INTO expert_time_blocks (expert_id, start_time, end_time, reason) VALUES (?,?,?,?)',
    [req.user.id, req.body.start, req.body.end, req.body.reason || null]).catch(() => {});
  res.json({ ok: true });
}, { ok: true }));

module.exports = router;
