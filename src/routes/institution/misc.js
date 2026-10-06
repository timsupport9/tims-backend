/* ============================================================
   Institution — misc: stats, campuses, budgets, org units,
   learning paths, question bank, instructors, team, materials,
   wellness, succession, proctoring, blockchain, skills gap
   Mounted at /
   ============================================================ */
const express = require('express');
const { asyncH, safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');
const { institutionAudit } = require('../../lib/institution-audit');
const config = require('../../config');

const router = express.Router();

/* ---------- Aggregate stats ---------- */
router.get('/stats', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const instId = req.institution.id;

  const [[{ programmes }]] = await pool.query('SELECT COUNT(*) programmes FROM programmes WHERE institution_id=?', [instId]);
  const [[{ cohorts }]] = await pool.query('SELECT COUNT(*) cohorts FROM cohorts WHERE institution_id=?', [instId]);
  const [[{ assessments }]] = await pool.query('SELECT COUNT(*) assessments FROM assessments WHERE institution_id=?', [instId]);
  const [[{ projects }]] = await pool.query('SELECT COUNT(*) projects FROM projects WHERE institution_id=?', [instId]);
  const [[{ trainees }]] = await pool.query('SELECT COUNT(DISTINCT user_id) trainees FROM trainee_enrollments WHERE institution_id=?', [instId]);
  const [[{ instructors }]] = await pool.query(
    "SELECT COUNT(*) instructors FROM users WHERE institution_id=? AND role='expert'", [instId]);
  const [[{ avgCompletionRate }]] = await pool.query(
    'SELECT COALESCE(AVG(progress),0) avgCompletionRate FROM trainee_enrollments WHERE institution_id=?', [instId]);
  const [[{ attendanceTotal }]] = await pool.query(
    `SELECT COUNT(*) attendanceTotal FROM session_attendance sa
       JOIN cohort_sessions s ON s.id=sa.session_id WHERE s.institution_id=?`, [instId]);
  const [[{ attendancePresent }]] = await pool.query(
    `SELECT COUNT(*) attendancePresent FROM session_attendance sa
       JOIN cohort_sessions s ON s.id=sa.session_id
      WHERE s.institution_id=? AND sa.status IN ('present','late')`, [instId]);
  const [[{ pendingApprovals }]] = await pool.query(
    "SELECT COUNT(*) pendingApprovals FROM approval_requests WHERE institution_id=? AND status='pending'", [instId]);
  const [[{ expiringCertificates }]] = await pool.query(
    `SELECT COUNT(*) expiringCertificates FROM institution_certificates
      WHERE institution_id=? AND revoked=0 AND expires_at IS NOT NULL
        AND expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 90 DAY)`, [instId]);

  const [upcomingSessions] = await pool.query(
    `SELECT s.id, s.title, s.scheduled_at, c.name cohort_name
       FROM cohort_sessions s LEFT JOIN cohorts c ON c.id=s.cohort_id
      WHERE s.institution_id=? AND s.status='scheduled' AND s.scheduled_at >= NOW()
      ORDER BY s.scheduled_at ASC LIMIT 10`, [instId]);

  const [auditLog] = await pool.query(
    `SELECT l.*, u.name actor_name FROM institution_audit_logs l
       LEFT JOIN users u ON u.id=l.actor_id
      WHERE l.institution_id=? ORDER BY l.created_at DESC LIMIT 20`, [instId]);

  res.json({
    stats: {
      avgCompletionRate: Math.round(Number(avgCompletionRate) || 0),
      avgScore: 0,
      attendanceRate: Number(attendanceTotal)
        ? Math.round((Number(attendancePresent) / Number(attendanceTotal)) * 100)
        : 0,
      totalTrainees: Number(trainees),
      pendingApprovals: Number(pendingApprovals),
      expiringCertificates: Number(expiringCertificates),
      projectsSubmitted: 0,
      certificatesIssued: 0,
      upcomingSessions,
      auditLog,
      totals: { programmes, cohorts, assessments, projects, trainees, instructors },
    },
  });
}));

/* ---------- Instructors ---------- */
router.get('/instructors', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT u.id, u.name, u.email, u.avatar, u.specialization, u.hourly_rate,
       (SELECT COUNT(*) FROM cohorts WHERE instructor_id=u.id) programme_count
       FROM users u
      WHERE u.role='expert' AND u.status='active'
        AND (u.institution_id=? OR u.institution_id IS NULL)
      ORDER BY u.name`,
    [req.institution.id]);
  res.json({ instructors: rows });
}, { instructors: [] }));

router.post('/instructors', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'UPDATE users SET institution_id=? WHERE id=? AND role=?',
    [req.institution.id, req.body.expert_id, 'expert']);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Instructor marketplace / contracts ---------- */
router.get('/instructor-marketplace', safeRoute(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT id, name, specialization, hourly_rate, average_rating, verified_badge
       FROM users WHERE role='expert' AND status='active'`);
  res.json({ instructors: rows });
}, { instructors: [] }));

router.get('/instructor-contracts', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM instructor_contracts WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ contracts: rows });
}, { contracts: [] }));

router.post('/instructor-contracts', safeRoute(async (req, res) => {
  const b = req.body || {};
  const [r] = await poolOrThrow().query(
    `INSERT INTO instructor_contracts (institution_id, instructor_id, programme_id, rate, start_date, end_date, status)
     VALUES (?,?,?,?,?,?, 'active')`,
    [req.institution.id, b.instructor_id, b.programme_id || null, b.rate || 0,
     b.start_date || null, b.end_date || null]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.post('/instructor-requests', safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `INSERT INTO instructor_requests (institution_id, payload) VALUES (?,?)`,
    [req.institution.id, JSON.stringify(req.body || {})]).catch(() => [{ insertId: null }]);
  res.status(201).json({ id: r.insertId, ok: true });
}, { ok: true }));

/* ---------- Team ---------- */
router.get('/team', safeRoute(async (req, res) => {
  if (req.institutionRole !== 'operations_manager') return res.json({ team: [] });
  const [rows] = await poolOrThrow().query(
    `SELECT id, name, email, institution_role, status, created_at FROM users
      WHERE institution_id=? AND institution_role IS NOT NULL ORDER BY created_at DESC`,
    [req.institution.id]);
  res.json({ team: rows });
}, { team: [] }));

router.post('/team/invite', safeRoute(async (req, res) => {
  if (req.institutionRole !== 'operations_manager') return res.status(403).json({ error: 'Only Operations Manager' });
  const pool = poolOrThrow();
  const bcrypt = require('bcryptjs');
  const { nanoid } = require('nanoid');

  const { name, email, institution_role } = req.body;
  if (!config.institution.roles.includes(institution_role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const [[existing]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const tempPassword = nanoid(12);
  const hash = await bcrypt.hash(tempPassword, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role)
     VALUES (?,?,?, 'institution','active',?,?)`,
    [name, email, hash, req.institution.id, institution_role]);
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Invited ${name} (${institution_role})`, null, req.ip);
  res.status(201).json({ id: r.insertId, temp_password: tempPassword });
}, { ok: true }));

router.put('/team/:id/role', safeRoute(async (req, res) => {
  if (!config.institution.roles.includes(req.body.institution_role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  await poolOrThrow().query(
    'UPDATE users SET institution_role=? WHERE id=? AND institution_id=?',
    [req.body.institution_role, req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/team/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'UPDATE users SET institution_id=NULL, institution_role=NULL WHERE id=? AND institution_id=?',
    [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.get('/team/:id/permissions', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT permission_key, granted FROM team_permissions WHERE user_id=?', [req.params.id]);
  res.json({ permissions: rows });
}, { permissions: [] }));

router.put('/team/:id/permissions', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  for (const p of (req.body.permissions || [])) {
    await pool.query(
      `INSERT INTO team_permissions (institution_id, user_id, permission_key, granted, granted_by)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE granted=VALUES(granted), granted_by=VALUES(granted_by)`,
      [req.institution.id, req.params.id, p.key, p.granted ? 1 : 0, req.user.id]);
  }
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Org units ---------- */
router.get('/org-units', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT o.*, u.name manager_name FROM org_units o
       LEFT JOIN users u ON u.id=o.manager_id
      WHERE o.institution_id=? ORDER BY o.unit_type, o.name`,
    [req.institution.id]);
  res.json({ units: rows });
}, { units: [] }));

router.post('/org-units', safeRoute(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO org_units (institution_id, parent_id, name, unit_type, code, manager_id, budget_amount)
     VALUES (?,?,?,?,?,?,?)`,
    [req.institution.id, b.parent_id || null, b.name, b.unit_type || 'department',
     b.code || null, b.manager_id || null, b.budget_amount || 0]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.put('/org-units/:id', safeRoute(async (req, res) => {
  const b = req.body;
  await poolOrThrow().query(
    `UPDATE org_units SET name=?, unit_type=?, code=?, manager_id=?, budget_amount=?, active=?
      WHERE id=? AND institution_id=?`,
    [b.name, b.unit_type || 'department', b.code || null, b.manager_id || null,
     b.budget_amount || 0, b.active === false ? 0 : 1,
     req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/org-units/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM org_units WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Learning paths ---------- */
router.get('/learning-paths', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT lp.*, COUNT(s.id) step_count FROM learning_paths lp
       LEFT JOIN learning_path_steps s ON s.path_id=lp.id
      WHERE lp.institution_id=? GROUP BY lp.id ORDER BY lp.created_at DESC`,
    [req.institution.id]);
  res.json({ paths: rows });
}, { paths: [] }));

router.post('/learning-paths', safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    'INSERT INTO learning_paths (institution_id, title, description, badge_icon) VALUES (?,?,?,?)',
    [req.institution.id, req.body.title, req.body.description || null, req.body.badge_icon || null]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.delete('/learning-paths/:id', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM learning_path_steps WHERE path_id=?', [req.params.id]).catch(() => {});
  await pool.query(
    'DELETE FROM learning_paths WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.post('/learning-paths/:id/steps', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[{ nextPos }]] = await pool.query(
    'SELECT COALESCE(MAX(position),0)+1 nextPos FROM learning_path_steps WHERE path_id=?', [req.params.id]);
  const [r] = await pool.query(
    'INSERT INTO learning_path_steps (path_id, programme_id, position) VALUES (?,?,?)',
    [req.params.id, req.body.programme_id, nextPos]);
  res.status(201).json({ id: r.insertId, position: nextPos });
}, { ok: true }));

router.delete('/learning-paths/steps/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query('DELETE FROM learning_path_steps WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Question bank ---------- */
router.get('/question-bank', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM question_bank WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ questions: rows });
}, { questions: [] }));

router.post('/question-bank', safeRoute(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO question_bank (institution_id, category, difficulty, question_type, question_text, options, correct_answer, points, explanation, tags, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, b.category || null, b.difficulty || 'medium',
     b.question_type, b.question_text,
     b.options ? JSON.stringify(b.options) : null, b.correct_answer || null,
     b.points || 1, b.explanation || null, b.tags || null, req.user.id]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.delete('/question-bank/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM question_bank WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Projects ---------- */
router.get('/projects', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT p.*, c.name cohort_name,
       (SELECT COUNT(*) FROM project_submissions WHERE project_id=p.id) submissions_count
       FROM projects p LEFT JOIN cohorts c ON c.id=p.cohort_id
      WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]);
  res.json({ projects: rows });
}, { projects: [] }));

router.post('/projects', safeRoute(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO projects (institution_id, cohort_id, title, description, category, deadline, max_score, status, created_by)
     VALUES (?,?,?,?,?,?,?, 'active', ?)`,
    [req.institution.id, b.cohort_id, b.title, b.description || null,
     b.category || null, b.deadline || null, b.max_score || 100, req.user.id]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

/* ---------- Materials ---------- */
router.get('/materials', safeRoute(async (req, res) => {
  const clauses = ['institution_id=?']; const params = [req.institution.id];
  if (req.query.cohort_id) { clauses.push('cohort_id=?'); params.push(req.query.cohort_id); }
  const [rows] = await poolOrThrow().query(
    `SELECT m.*, u.name uploaded_by_name FROM training_materials m
       LEFT JOIN users u ON u.id=m.uploaded_by
      WHERE ${clauses.join(' AND ')} ORDER BY m.created_at DESC`, params);
  res.json({ materials: rows });
}, { materials: [] }));

router.post('/materials', safeRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  const [r] = await poolOrThrow().query(
    `INSERT INTO training_materials (institution_id, cohort_id, programme_id, title, description, file_url, file_size, mime_type, uploaded_by)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, req.body.cohort_id || null, req.body.programme_id || null,
     req.body.title || req.file.originalname, req.body.description || null,
     '/uploads/' + req.file.filename, req.file.size, req.file.mimetype, req.user.id]);
  res.status(201).json({ id: r.insertId, url: '/uploads/' + req.file.filename });
}, { ok: true }));

router.delete('/materials/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM training_materials WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Campuses ---------- */
router.get('/campuses', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM campuses WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ campuses: rows });
}, { campuses: [] }));

router.post('/campuses', safeRoute(async (req, res) => {
  const b = req.body || {};
  const [r] = await poolOrThrow().query(
    'INSERT INTO campuses (institution_id, name, type, address, contact_phone, capacity) VALUES (?,?,?,?,?,?)',
    [req.institution.id, b.name, b.type || 'main', b.address || null,
     b.contact_phone || null, b.capacity || 0]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.put('/campuses/:id', safeRoute(async (req, res) => {
  const b = req.body || {};
  await poolOrThrow().query(
    'UPDATE campuses SET name=?, type=?, address=?, contact_phone=?, capacity=? WHERE id=? AND institution_id=?',
    [b.name, b.type || 'main', b.address || null, b.contact_phone || null,
     b.capacity || 0, req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/campuses/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM campuses WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Budgets ---------- */
router.get('/budgets', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM budget_allocations WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ budgets: rows });
}, { budgets: [] }));

router.post('/budgets', safeRoute(async (req, res) => {
  const b = req.body || {};
  const [r] = await poolOrThrow().query(
    'INSERT INTO budget_allocations (institution_id, department, period, allocated, spent) VALUES (?,?,?,?,0)',
    [req.institution.id, b.department, b.period || 'monthly', b.allocated || 0]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.put('/budgets/:id', safeRoute(async (req, res) => {
  const b = req.body || {};
  await poolOrThrow().query(
    'UPDATE budget_allocations SET department=?, allocated=? WHERE id=? AND institution_id=?',
    [b.department, b.allocated || 0, req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.get('/budget-transactions', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM budget_transactions WHERE institution_id=? ORDER BY created_at DESC LIMIT 200',
    [req.institution.id]);
  res.json({ transactions: rows });
}, { transactions: [] }));

/* ---------- Wellness ---------- */
router.get('/wellness', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM wellness_scores WHERE institution_id=?', [req.institution.id]);
  res.json({ scores: rows });
}, { scores: [] }));

router.post('/wellness/recompute', safeRoute(async (_req, res) => {
  res.json({ ok: true });
}, { ok: true }));

router.get('/wellness-alerts', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    "SELECT * FROM wellness_alerts WHERE institution_id=? AND status='open'", [req.institution.id]);
  res.json({ alerts: rows });
}, { alerts: [] }));

router.post('/wellness-alerts/:id/intervene', safeRoute(async (req, res) => {
  await poolOrThrow().query("UPDATE wellness_alerts SET status='intervened' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

router.post('/wellness-alerts/:id/dismiss', safeRoute(async (req, res) => {
  await poolOrThrow().query("UPDATE wellness_alerts SET status='dismissed' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Succession ---------- */
router.get('/succession', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM succession_assignments WHERE institution_id=?', [req.institution.id]);
  res.json({ boxes: [], trainees: [], assignments: rows });
}, { boxes: [], trainees: [], assignments: [] }));

router.post('/succession/assign', safeRoute(async (req, res) => {
  const b = req.body || {};
  await poolOrThrow().query(
    'INSERT INTO succession_assignments (institution_id, trainee_id, box_code) VALUES (?,?,?)',
    [req.institution.id, b.trainee_id, b.box_code]);
  res.status(201).json({ ok: true });
}, { ok: true }));

/* ---------- Skills gap ---------- */
router.get('/skills-gap', safeRoute(async (_req, res) => {
  res.json({ categories: [], topGaps: [], departmentGaps: [], summary: {} });
}));

router.post('/skills-gap/recompute', safeRoute(async (_req, res) => {
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Proctoring ---------- */
router.get('/exam-proctor-sessions', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM exam_proctor_sessions WHERE institution_id=? ORDER BY scheduled_at DESC', [req.institution.id]);
  res.json({ sessions: rows });
}, { sessions: [] }));

router.post('/exam-proctor-sessions', safeRoute(async (req, res) => {
  const b = req.body || {};
  const [r] = await poolOrThrow().query(
    `INSERT INTO exam_proctor_sessions (institution_id, exam_title, trainee_id, scheduled_at, proctor_mode, status)
     VALUES (?,?,?,?,?, 'scheduled')`,
    [req.institution.id, b.exam_title, b.trainee_id, b.scheduled_at, b.proctor_mode || 'webcam']);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.put('/exam-proctor-sessions/:id/invalidate', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    "UPDATE exam_proctor_sessions SET status='invalidated' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Blockchain certs ---------- */
router.get('/blockchain-certs', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT id, serial, trainee_name, blockchain_hash, issued_at FROM institution_certificates
      WHERE institution_id=? AND blockchain_hash IS NOT NULL`, [req.institution.id]);
  res.json({ certificates: rows });
}, { certificates: [] }));

module.exports = router;
