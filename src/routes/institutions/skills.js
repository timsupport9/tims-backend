/* ============================================================
   Institution — skills catalogue + matrix + assessments
   ============================================================ */
const express = require('express');
const { safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');

const router = express.Router();

router.get('/', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM skills WHERE institution_id=? ORDER BY category, name', [req.institution.id]);
  res.json({ skills: rows });
}, { skills: [] }));

router.post('/', safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    'INSERT INTO skills (institution_id, name, category, description) VALUES (?,?,?,?)',
    [req.institution.id, req.body.name, req.body.category || null, req.body.description || null]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.delete('/:id', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM trainee_skills WHERE skill_id=?', [req.params.id]);
    await conn.query('DELETE FROM programme_skills WHERE skill_id=?', [req.params.id]).catch(() => {});
    await conn.query('DELETE FROM skills WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  res.json({ ok: true });
}, { ok: true }));

router.get('/matrix', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [skills] = await pool.query(
    'SELECT * FROM skills WHERE institution_id=? ORDER BY category, name', [req.institution.id]);

  const clauses = ["e.institution_id=?", "e.status IN ('active','approved','completed','certified')"];
  const params = [req.institution.id];
  if (req.query.cohort_id) { clauses.push('e.cohort_id=?'); params.push(req.query.cohort_id); }

  const [trainees] = await pool.query(
    `SELECT DISTINCT u.id, u.name, u.email, u.department FROM users u
       JOIN trainee_enrollments e ON e.user_id=u.id
      WHERE ${clauses.join(' AND ')} ORDER BY u.name`, params);

  let levels = [];
  if (trainees.length) {
    const ph = trainees.map(() => '?').join(',');
    [levels] = await pool.query(
      `SELECT trainee_id, skill_id, level FROM trainee_skills WHERE trainee_id IN (${ph})`,
      trainees.map(t => t.id));
  }

  const matrix = trainees.map(t => ({
    trainee: t,
    levels: Object.fromEntries(levels.filter(l => l.trainee_id === t.id).map(l => [l.skill_id, l.level])),
  }));

  res.json({ skills, matrix });
}, { skills: [], matrix: [] }));

router.put('/assess', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const { trainee_id, skill_id, level, source = 'manager' } = req.body;
  await pool.query(
    `INSERT INTO trainee_skills (trainee_id, skill_id, level, assessed_by, source, assessed_at)
     VALUES (?,?,?,?,?, NOW())
     ON DUPLICATE KEY UPDATE
       level=VALUES(level),
       assessed_by=VALUES(assessed_by),
       assessed_at=NOW(),
       source=VALUES(source)`,
    [trainee_id, skill_id, level, req.user.id, source]);
  res.json({ ok: true });
}, { ok: true }));

module.exports = router;
