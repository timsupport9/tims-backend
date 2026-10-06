/* ============================================================
   Institution — pre-built reports + custom report templates
   Mounted at /reports
   ============================================================ */
const express = require('express');
const { safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');

const router = express.Router();

router.get('/programme-scorecard', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT p.id, p.title, p.status,
       (SELECT COUNT(*) FROM trainee_enrollments WHERE programme_id=p.id) total_enrolled,
       (SELECT COUNT(*) FROM trainee_enrollments WHERE programme_id=p.id AND status IN ('completed','certified')) total_completed,
       (SELECT AVG(progress) FROM trainee_enrollments WHERE programme_id=p.id) avg_progress,
       p.cost_per_seat
       FROM programmes p WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]);
  res.json({ scorecard: rows });
}, { scorecard: [] }));

router.get('/cohort-comparison', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT c.id, c.name, p.title programme_title,
       (SELECT COUNT(*) FROM trainee_enrollments WHERE cohort_id=c.id) enrolled,
       (SELECT AVG(progress) FROM trainee_enrollments WHERE cohort_id=c.id) avg_progress,
       (SELECT COUNT(*) FROM session_attendance sa JOIN cohort_sessions s ON s.id=sa.session_id WHERE s.cohort_id=c.id AND sa.status IN ('present','late')) presents,
       (SELECT COUNT(*) FROM session_attendance sa JOIN cohort_sessions s ON s.id=sa.session_id WHERE s.cohort_id=c.id) attendance_total
       FROM cohorts c
       LEFT JOIN programmes p ON p.id=c.programme_id
      WHERE c.institution_id=? ORDER BY c.created_at DESC`,
    [req.institution.id]);
  res.json({ cohorts: rows });
}, { cohorts: [] }));

router.get('/trainee-progress-heatmap', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT u.id, u.name, u.department, p.title programme_title, e.progress, e.status,
       CASE WHEN e.progress >= 80 THEN 'ahead'
            WHEN e.progress >= 50 THEN 'on_track'
            WHEN e.progress >= 20 THEN 'behind'
            ELSE 'at_risk' END pace
       FROM trainee_enrollments e
       JOIN users u ON u.id=e.user_id
       LEFT JOIN programmes p ON p.id=e.programme_id
      WHERE e.institution_id=? AND e.status IN ('active','approved','on_hold')
      ORDER BY e.progress ASC`,
    [req.institution.id]);
  res.json({ heatmap: rows });
}, { heatmap: [] }));

router.get('/compliance', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT u.id, u.name, u.email, u.department, c.serial, c.title, c.expires_at, c.revoked,
       CASE WHEN c.revoked=1 THEN 'revoked'
            WHEN c.expires_at IS NULL THEN 'no_expiry'
            WHEN c.expires_at < NOW() THEN 'expired'
            WHEN c.expires_at < DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 'expiring_soon'
            ELSE 'valid' END compliance_status
       FROM users u
       LEFT JOIN institution_certificates c ON c.trainee_id=u.id
      WHERE u.institution_id=? ORDER BY u.name`,
    [req.institution.id]);
  res.json({ compliance: rows });
}, { compliance: [] }));

router.get('/cost', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT p.id, p.title,
       (SELECT COUNT(*) FROM trainee_enrollments WHERE programme_id=p.id) seats,
       p.cost_per_seat, p.trainer_cost, p.materials_cost,
       (SELECT COUNT(*) FROM trainee_enrollments WHERE programme_id=p.id) * p.cost_per_seat
         + p.trainer_cost + p.materials_cost total_cost
       FROM programmes p WHERE p.institution_id=? ORDER BY p.created_at DESC`,
    [req.institution.id]);
  const total = rows.reduce((s, r) => s + Number(r.total_cost || 0), 0);
  res.json({ cost: rows, total_cost: total });
}, { cost: [], total_cost: 0 }));

module.exports = router;
