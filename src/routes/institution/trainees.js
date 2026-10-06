/* ============================================================
   Institution — trainees + enrollments + imports
   Mounted at / (contains both /trainees/* and /enrollments/*)
   ============================================================ */
const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { asyncH, safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');
const { institutionAudit } = require('../../lib/institution-audit');
const { notify } = require('../../lib/notify');

const router = express.Router();

/* ============================================================
   TRAINEES
   ============================================================ */
router.get('/trainees', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { search, status } = req.query;
  const clauses = ['u.institution_id=?', "u.role IN ('learner','institution')"];
  const params = [req.institution.id];
  if (search) {
    clauses.push('(u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) { clauses.push('u.lifecycle_status=?'); params.push(status); }

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar, u.department, u.job_title, u.employee_id,
            u.cost_centre, u.lifecycle_status, u.created_at, u.status, u.at_risk,
       (SELECT e.id FROM trainee_enrollments e WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) latest_enrollment_id,
       (SELECT e.status FROM trainee_enrollments e WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) enrollment_status,
       (SELECT e.progress FROM trainee_enrollments e WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) progress,
       (SELECT p.title FROM trainee_enrollments e JOIN programmes p ON p.id=e.programme_id WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) programme_title,
       (SELECT c.name FROM trainee_enrollments e JOIN cohorts c ON c.id=e.cohort_id WHERE e.user_id=u.id ORDER BY e.enrolled_at DESC LIMIT 1) cohort_name
       FROM users u WHERE ${clauses.join(' AND ')} ORDER BY u.created_at DESC LIMIT 200`,
    params);
  res.json({ trainees: rows, total: rows.length, page: 1, per: 50 });
}));

router.get('/trainees/:id', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[user]] = await pool.query(
    'SELECT * FROM users WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  if (!user) return res.status(404).json({ error: 'Not found' });
  delete user.password_hash;

  const [enrollments] = await pool.query(
    `SELECT e.*, p.title programme_title, c.name cohort_name
       FROM trainee_enrollments e
       LEFT JOIN programmes p ON p.id=e.programme_id
       LEFT JOIN cohorts c ON c.id=e.cohort_id
      WHERE e.user_id=? ORDER BY e.enrolled_at DESC`, [req.params.id]);
  const [certificates] = await pool.query(
    'SELECT * FROM institution_certificates WHERE trainee_id=?', [req.params.id]);
  const [skills] = await pool.query(
    `SELECT ts.*, s.name skill_name, s.category FROM trainee_skills ts
       JOIN skills s ON s.id=ts.skill_id WHERE ts.trainee_id=?`, [req.params.id]);

  res.json({ trainee: user, enrollments, certificates, skills });
}));

router.post('/trainees/invite', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { emails = [], programme_id, cohort_id } = req.body;
  if (!Array.isArray(emails) || !emails.length) return res.status(400).json({ error: 'emails required' });

  const results = [];
  for (const email of emails) {
    try {
      const [[existing]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
      if (existing) { results.push({ email, status: 'exists' }); continue; }

      const tempPassword = nanoid(12);
      const hash = await bcrypt.hash(tempPassword, 10);
      const [r] = await pool.query(
        `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,lifecycle_status,invited_at)
         VALUES (?,?,?, 'learner','active',?, 'viewer','invited', NOW())`,
        [email.split('@')[0], email, hash, req.institution.id]);
      await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);

      if (programme_id) {
        await pool.query(
          `INSERT INTO trainee_enrollments (user_id, programme_id, cohort_id, institution_id, status)
           VALUES (?,?,?,?, 'invited')`,
          [r.insertId, programme_id, cohort_id || null, req.institution.id]);
      }

      await notify(r.insertId, 'Welcome to your training portal',
        `Temporary password: ${tempPassword}`, 'info', '/login');
      results.push({ email, status: 'invited', id: r.insertId });
    } catch (e) {
      results.push({ email, status: 'error', error: e.message });
    }
  }
  res.status(201).json({ results });
}));

router.post('/trainees/import', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });

  const text = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return res.status(400).json({ error: 'CSV needs header and rows' });

  const headers = lines.shift().split(',').map(h => h.trim().toLowerCase());
  for (const rc of ['name', 'email']) {
    if (!headers.includes(rc)) return res.status(400).json({ error: `Missing column: ${rc}` });
  }

  const [imp] = await pool.query(
    `INSERT INTO trainee_imports (institution_id, imported_by, filename, total_rows, status)
     VALUES (?,?,?,?, 'processing')`,
    [req.institution.id, req.user.id, req.file.originalname, lines.length]);

  const errors = []; const invited = []; let success = 0;
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].split(',').map(v => v.trim());
    const rec = Object.fromEntries(headers.map((h, idx) => [h, row[idx] || '']));
    const lineNo = i + 2;

    if (!rec.name || !rec.email) { errors.push({ row: lineNo, error: 'Missing name or email' }); continue; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rec.email)) { errors.push({ row: lineNo, email: rec.email, error: 'Invalid email' }); continue; }

    try {
      const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [rec.email]);
      if (exists) { errors.push({ row: lineNo, email: rec.email, error: 'Email exists' }); continue; }

      const tempPassword = nanoid(12);
      const hash = await bcrypt.hash(tempPassword, 10);
      const [r] = await pool.query(
        `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,department,job_title,employee_id,cost_centre,lifecycle_status,invited_at)
         VALUES (?,?,?, 'learner','active',?, 'viewer',?,?,?,?, 'invited', NOW())`,
        [rec.name, rec.email, hash, req.institution.id, rec.department || null,
         rec.job_title || null, rec.employee_id || null, rec.cost_centre || null]);
      await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
      await notify(r.insertId, 'Welcome', `Temporary password: ${tempPassword}`, 'info', '/login');
      invited.push({ id: r.insertId, email: rec.email, name: rec.name });
      success++;
    } catch (e) {
      errors.push({ row: lineNo, email: rec.email, error: e.message });
    }
  }

  await pool.query(
    `UPDATE trainee_imports SET success_count=?, error_count=?, errors=?, status='completed', completed_at=NOW() WHERE id=?`,
    [success, errors.length, JSON.stringify(errors.slice(0, 200)), imp.insertId]);

  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Imported ${success} trainees`, null, req.ip);

  res.json({ import_id: imp.insertId, total: lines.length, success, errors, invited });
}));

router.get('/trainees/imports', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT i.*, u.name imported_by_name FROM trainee_imports i
       LEFT JOIN users u ON u.id=i.imported_by
      WHERE i.institution_id=? ORDER BY i.created_at DESC LIMIT 50`,
    [req.institution.id]);
  res.json({ imports: rows });
}, { imports: [] }));

/* ============================================================
   ENROLLMENTS
   ============================================================ */
router.get('/enrollments', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const clauses = ['e.institution_id=?']; const params = [req.institution.id];
  if (req.query.status) { clauses.push('e.status=?'); params.push(req.query.status); }
  if (req.query.cohort_id) { clauses.push('e.cohort_id=?'); params.push(req.query.cohort_id); }
  if (req.query.programme_id) { clauses.push('e.programme_id=?'); params.push(req.query.programme_id); }

  const [rows] = await pool.query(
    `SELECT e.*, u.name trainee_name, u.email, u.avatar, u.department,
            p.title programme_title, c.name cohort_name
       FROM trainee_enrollments e
       JOIN users u ON u.id=e.user_id
       LEFT JOIN programmes p ON p.id=e.programme_id
       LEFT JOIN cohorts c ON c.id=e.cohort_id
      WHERE ${clauses.join(' AND ')} ORDER BY e.enrolled_at DESC LIMIT 200`,
    params);
  res.json({ enrollments: rows, total: rows.length, page: 1, per: 50 });
}));

router.post('/enrollments', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { user_id, programme_id, cohort_id, notes } = req.body;
  const [r] = await pool.query(
    `INSERT INTO trainee_enrollments (user_id, programme_id, cohort_id, institution_id, status, notes)
     VALUES (?,?,?,?, 'pending_approval', ?)`,
    [user_id, programme_id, cohort_id || null, req.institution.id, notes || null]);

  const [approval] = await pool.query(
    `INSERT INTO approval_requests (institution_id, request_type, requested_by, payload)
     VALUES (?, 'enrolment', ?, ?)`,
    [req.institution.id, req.user.id, JSON.stringify({ enrolment_id: r.insertId })]);

  const [managers] = await pool.query(
    `SELECT id FROM users WHERE institution_id=? AND institution_role='operations_manager' AND status='active'`,
    [req.institution.id]);
  for (const mgr of managers) {
    await notify(mgr.id, 'Enrolment approval required', 'A trainee requested enrolment.',
      'warning', '/institution/operations');
  }

  res.status(201).json({ id: r.insertId, request_id: approval.insertId });
}));

router.put('/enrollments/:id/approve', asyncH(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `UPDATE trainee_enrollments SET status='active', manager_approved_by=?, manager_approved_at=NOW()
      WHERE id=? AND institution_id=?`,
    [req.user.id, req.params.id, req.institution.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Not found' });
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Approved enrolment #${req.params.id}`, null, req.ip);
  res.json({ ok: true });
}));

router.put('/enrollments/:id/reject', asyncH(async (req, res) => {
  await poolOrThrow().query(
    `UPDATE trainee_enrollments SET status='withdrawn', withdraw_reason=?, manager_approved_by=?,
       manager_approved_at=NOW(), withdrawn_at=NOW()
      WHERE id=? AND institution_id=?`,
    [req.body.reason || null, req.user.id, req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

router.put('/enrollments/:id/transfer', asyncH(async (req, res) => {
  await poolOrThrow().query(
    'UPDATE trainee_enrollments SET cohort_id=? WHERE id=? AND institution_id=?',
    [req.body.cohort_id, req.params.id, req.institution.id]);
  res.json({ ok: true });
}));

router.put('/enrollments/:id/notes', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query(
    'UPDATE trainee_enrollments SET internal_notes=? WHERE id=? AND institution_id=?',
    [req.body.internal_notes || null, req.params.id, req.institution.id]);

  if (req.body.at_risk !== undefined) {
    await pool.query(
      `UPDATE users SET at_risk=?, accessibility_notes=COALESCE(?, accessibility_notes)
        WHERE id=(SELECT user_id FROM trainee_enrollments WHERE id=?)`,
      [req.body.at_risk ? 1 : 0, req.body.accessibility_notes || null, req.params.id]);
  }
  res.json({ ok: true });
}));

module.exports = router;
