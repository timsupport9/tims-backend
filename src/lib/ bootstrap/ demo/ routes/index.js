/* ============================================================
   Route aggregator — mounts all real routes and 404 handler
   ============================================================ */
const requireDBSwitch = require('./_requireDB');
const ctx = require('../context');
const config = require('../config');

const publicRoutes = require('./public');
const authRoutes = require('./auth');
const commonRoutes = require('./common');
const eschoolRoutes = require('./eschool');
const userRoutes = require('./user');
const expertsRoutes = require('./experts');
const consultationsRoutes = require('./consultations');
const expertPanelRoutes = require('./expert-panel');
const adminRoutes = require('./admin');
const adminInstitutionsRoutes = require('./admin-institutions');
const institutionRoutes = require('./institution');

function healthHandler(req, res) {
  res.json({
    ok: true, env: config.env, uptime: process.uptime(),
    demo_mode: ctx.demo.active,
    db: {
      configured: config.db.enabled,
      connected: ctx.dbState.connected,
      last_attempt: ctx.dbState.lastAttempt,
      last_success: ctx.dbState.lastSuccess,
      last_error: ctx.dbState.lastError,
    },
    counts: ctx.demo.active ? {
      users: ctx.demo.users.length,
      experts: ctx.demo.users.filter(u => u.role === 'expert').length,
      institutions: ctx.demo.institutions.length,
      programmes: ctx.demo.programmes.length,
      trainees: ctx.demo.trainees.length,
      courses: ctx.demo.courses.length,
    } : undefined,
    time: new Date().toISOString(),
  });
}

function mountRoutes(app) {
  /* Health — always available, works in both modes */
  app.get('/api/health', healthHandler);

  /* Public — /api/public/* & /api/verify/* — no auth, works in demo via demo router */
  app.use('/api', publicRoutes);

  /* Auth — guarded by requireDBSwitch (demo router has already handled these) */
  app.use('/api/auth', requireDBSwitch, authRoutes);

  /* Authenticated routes — all DB-backed */
  app.use('/api/common',        requireDBSwitch, commonRoutes);
  app.use('/api/eschool',       requireDBSwitch, eschoolRoutes);
  app.use('/api/user',          requireDBSwitch, userRoutes);
  app.use('/api/experts',       requireDBSwitch, expertsRoutes);
  app.use('/api/consultations', requireDBSwitch, consultationsRoutes);
  app.use('/api/expert',        requireDBSwitch, expertPanelRoutes);
  app.use('/api/admin/institutions', requireDBSwitch, adminInstitutionsRoutes);
  app.use('/api/admin',         requireDBSwitch, adminRoutes);
  app.use('/api/institution',   requireDBSwitch, institutionRoutes);

  /* 404 fallback for unknown API paths */
  app.use('/api/', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.path,
      method: req.method,
      demo_mode: ctx.demo.active,
    });
  });
}

module.exports = { mountRoutes, healthHandler };
