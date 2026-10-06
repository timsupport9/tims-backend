/* ============================================================
   Institution — programmes + programme modules
   ============================================================ */
const express = require('express');
const { asyncH, safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');
const { institutionAudit } = require('../../lib/institution-audit');

const router = express.Router();

router.get('/', asyncH(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT p.*,
       (SELECT COUNT(*) FROM trainee_enrollments te WHERE te.programme_id=p.id) AS enrolled_count,
       (SELECT title FROM programmes pp WHERE pp.id=p.prerequisite_programme_id) AS prerequisite_title
       FROM programmes p WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]);
  res.json({ programmes: rows });
}));

router.post('/', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.title) return res.status(400).json({ error: 'Title required' });

  const [r] = await pool.query(
    `INSERT INTO programmes (institution_id, title, description, category, delivery_mode, level, status,
       start_date, end_date, capacity, duration_hours, cost_per_seat, trainer_cost, materials_cost,
       prerequisite_programme_id, accreditation_body, cpd_points)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, b.title, b.description || null, b.category || null,
     b.delivery_mode || 'hybrid', b.level || 'intermediate', b.status || 'draft',
     b.start_date || null, b.end_date || null, b.capacity || 30, b.duration_hours || 0,
     b.cost_per_seat || 0, b.trainer_cost || 0, b.materials_cost || 0,
     b.prerequisite_programme_id || null, b.accreditation_body || null, b.cpd_points || 0]);

  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Created programme "${b.title}"`, null, req.ip);
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['title', 'description', 'category', 'delivery_mode', 'level', 'status',
    'start_date', 'end_date', 'capacity', 'duration_hours', 'cost_per_seat',
    'trainer_cost', 'materials_cost', 'prerequisite_programme_id', 'accreditation_body', 'cpd_points'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.institution.id);
  await pool.query(`UPDATE programmes SET ${sets.join(',')} WHERE id=? AND institution_id=?`, vals);
  res.json({ ok: true });
}));

router.delete('/:id', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM trainee_enrollments WHERE programme_id=?', [req.params.id]);
    await conn.query('DELETE FROM programme_skills WHERE programme_id=?', [req.params.id]).catch(() => {});
    await conn.query('DELETE FROM programme_modules WHERE programme_id=?', [req.params.id]).catch(() => {});
    await conn.query('DELETE FROM programmes WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Deleted programme #${req.params.id}`, null, req.ip);
  res.json({ ok: true });
}));

/* ---------- Modules ---------- */
router.get('/:id/modules', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM programme_modules WHERE programme_id=? ORDER BY position', [req.params.id]);
  res.json({ modules: rows });
}, { modules: [] }));

router.post('/:id/modules', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[{ nextPos }]] = await pool.query(
    'SELECT COALESCE(MAX(position),0)+1 nextPos FROM programme_modules WHERE programme_id=?', [req.params.id]);
  const [r] = await pool.query(
    `INSERT INTO programme_modules (programme_id, title, description, position, duration_hours, delivery_mode)
     VALUES (?,?,?,?,?,?)`,
    [req.params.id, req.body.title, req.body.description || null,
     nextPos, req.body.duration_hours || 0, req.body.delivery_mode || null]);
  res.status(201).json({ id: r.insertId, position: nextPos });
}, { ok: true }));

router.delete('/:id/modules/:moduleId', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM programme_modules WHERE id=? AND programme_id=?', [req.params.moduleId, req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

module.exports = router;
