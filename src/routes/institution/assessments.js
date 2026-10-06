/* ============================================================
   Institution — assessments + submissions grading
   ============================================================ */
const express = require('express');
const { safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');

const router = express.Router();

router.get('/', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT a.*, c.name cohort_name,
       (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id=a.id) question_count,
       (SELECT COUNT(*) FROM assessment_submissions WHERE assessment_id=a.id) submission_count
       FROM assessments a
       LEFT JOIN cohorts c ON c.id=a.cohort_id
      WHERE a.institution_id=? ORDER BY a.created_at DESC`,
    [req.institution.id]);
  res.json({ assessments: rows });
}, { assessments: [] }));

router.post('/', safeRoute(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO assessments (institution_id, cohort_id, title, description, type, weight,
       pass_mark, max_attempts, time_limit_minutes, auto_grade, due_date, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, b.cohort_id, b.title, b.description || null,
     b.type || 'quiz', b.weight || 20, b.pass_mark || 70,
     b.max_attempts || 1, b.time_limit_minutes || 0,
     b.auto_grade === false ? 0 : 1, b.due_date || null, b.status || 'scheduled']);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.delete('/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM assessments WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.get('/:id/submissions', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT s.*, u.name trainee_name, u.email FROM assessment_submissions s
       JOIN users u ON u.id=s.trainee_id
      WHERE s.assessment_id=? ORDER BY s.submitted_at DESC`, [req.params.id]);
  res.json({ submissions: rows });
}, { submissions: [] }));

router.put('/submissions/:id/grade', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    `UPDATE assessment_submissions SET score=?, feedback=?, passed=?, graded_by=?, graded_at=NOW()
      WHERE id=?`,
    [req.body.score, req.body.feedback || null,
     req.body.passed === true ? 1 : req.body.passed === false ? 0 : null,
     req.user.id, req.params.id]);
  res.json({ ok: true });
}, { ok: true }));

module.exports = router;
