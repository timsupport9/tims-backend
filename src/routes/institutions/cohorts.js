/* ============================================================
   Institution — cohorts + waitlist
   ============================================================ */
const express = require('express');
const { asyncH, safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');
const { institutionAudit } = require('../../lib/institution-audit');

const router = express.Router();

router.get('/', asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT c.*, p.title programme_title, u.name instructor_name,
       (SELECT COUNT(*) FROM trainee_enrollments te WHERE te.cohort_id=c.id) trainee_count
       FROM cohorts c
       LEFT JOIN programmes p ON p.id=c.programme_id
       LEFT JOIN users u ON u.id=c.instructor_id
      WHERE c.institution_id=? ORDER BY c.created_at DESC`,
    [req.institution.id]);
  res.json({ cohorts: rows });
}));

router.post('/', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.name || !b.programme_id) return res.status(400).json({ error: 'name and programme_id required' });

  const [r] = await pool.query(
    `INSERT INTO cohorts (institution_id, programme_id, name, instructor_id, substitute_instructor_id,
       start_date, end_date, capacity, location, status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, Number(b.programme_id), b.name,
     b.instructor_id || null, b.substitute_instructor_id || null,
     b.start_date || null, b.end_date || null,
     b.capacity || 30, b.location || null, b.status || 'scheduled']);

  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Created cohort "${b.name}"`, null, req.ip);
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['name', 'programme_id', 'instructor_id', 'substitute_instructor_id',
    'start_date', 'end_date', 'capacity', 'location', 'status'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.institution.id);
  await pool.query(`UPDATE cohorts SET ${sets.join(',')} WHERE id=? AND institution_id=?`, vals);
  res.json({ ok: true });
}));

router.delete('/:id', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE trainee_enrollments SET cohort_id=NULL WHERE cohort_id=?', [req.params.id]);
    await conn.query('DELETE FROM cohort_sessions WHERE cohort_id=?', [req.params.id]).catch(() => {});
    await conn.query('DELETE FROM cohort_waitlist WHERE cohort_id=?', [req.params.id]).catch(() => {});
    await conn.query('DELETE FROM cohorts WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  res.json({ ok: true });
}));

router.get('/:id/waitlist', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT w.*, u.name, u.email FROM cohort_waitlist w
       JOIN users u ON u.id=w.user_id
      WHERE w.cohort_id=? ORDER BY w.position`, [req.params.id]);
  res.json({ waitlist: rows });
}, { waitlist: [] }));

module.exports = router;
