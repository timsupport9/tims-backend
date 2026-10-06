/* ============================================================
   Institution — analytics dashboard
   Mounted at /analytics
   ============================================================ */
const express = require('express');
const { safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');

const router = express.Router();

router.get('/', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const instId = req.institution.id;

  const [[{ avgCompletionRate }]] = await pool.query(
    'SELECT COALESCE(AVG(progress),0) avgCompletionRate FROM trainee_enrollments WHERE institution_id=?',
    [instId]);
  const [[{ attendanceTotal }]] = await pool.query(
    `SELECT COUNT(*) attendanceTotal FROM session_attendance sa
       JOIN cohort_sessions s ON s.id=sa.session_id WHERE s.institution_id=?`, [instId]);
  const [[{ attendancePresent }]] = await pool.query(
    `SELECT COUNT(*) attendancePresent FROM session_attendance sa
       JOIN cohort_sessions s ON s.id=sa.session_id
      WHERE s.institution_id=? AND sa.status IN ('present','late')`, [instId]);

  const [cohortPerformance] = await pool.query(
    `SELECT c.id, c.name, p.title programme_title,
       (SELECT COUNT(*) FROM trainee_enrollments WHERE cohort_id=c.id) enrolled,
       (SELECT AVG(progress) FROM trainee_enrollments WHERE cohort_id=c.id) avg_progress
       FROM cohorts c LEFT JOIN programmes p ON p.id=c.programme_id
      WHERE c.institution_id=?`, [instId]);

  res.json({
    overview: {
      activeTrainees: 0,
      completionRate: Math.round(Number(avgCompletionRate) || 0),
      avgScore: 0,
      certificatesIssued: 0,
      certificatesExpiring: 0,
      budgetUtilisation: 0,
      atRiskTrainees: 0,
      attendanceRate: Number(attendanceTotal)
        ? Math.round((Number(attendancePresent) / Number(attendanceTotal)) * 100)
        : 0,
    },
    cohortPerformance,
    instructorPerformance: [],
    campusPerformance: [],
    trends: { revenue: [] },
    programmeMix: [],
  });
}, {}));

module.exports = router;
