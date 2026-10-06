/* ============================================================
   Institution routes — aggregated under /api/institution
   Uses requireInstitution middleware to attach req.institution
   ============================================================ */
const express = require('express');
const { auth, asyncH } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');

const router = express.Router();

/* requireInstitution — runs on every child route */
router.use(auth(), asyncH(async (req, res, next) => {
  const pool = poolOrThrow();
  const [[u]] = await pool.query(
    'SELECT id, institution_id, institution_role, status FROM users WHERE id=?',
    [req.user.id]);
  if (!u || !u.institution_id) return res.status(403).json({ error: 'Not an institution account' });

  const [[inst]] = await pool.query('SELECT * FROM institutions WHERE id=?', [u.institution_id]);
  if (!inst) return res.status(404).json({ error: 'Institution not found' });

  if (inst.status !== 'active' && u.institution_role !== 'operations_manager') {
    return res.status(403).json({ error: 'Institution not active' });
  }

  req.institution = inst;
  req.institutionRole = u.institution_role;
  next();
}));

/* Sub-routers */
router.use('/',            require('./profile'));
router.use('/programmes',  require('./programmes'));
router.use('/cohorts',     require('./cohorts'));
router.use('/',            require('./trainees'));   /* contains /trainees/* and /enrollments/* */
router.use('/sessions',    require('./sessions'));
router.use('/certificates',require('./certificates'));
router.use('/skills',      require('./skills'));
router.use('/assessments', require('./assessments'));
router.use('/reports',     require('./reports'));
router.use('/analytics',   require('./analytics'));
router.use('/',            require('./governance'));
router.use('/',            require('./misc'));

module.exports = router;
