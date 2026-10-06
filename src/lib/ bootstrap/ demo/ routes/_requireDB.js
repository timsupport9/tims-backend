/* ============================================================
   Middleware: only allow route to proceed if DB is connected.
   In demo mode, we call next('route') to skip the entire router
   (the demo router already handled the request).
   ============================================================ */
const ctx = require('../context');

module.exports = function requireDB(req, res, next) {
  if (ctx.demo.active) return next('route');

  if (!ctx.dbState.connected) {
    return res.status(503).json({
      error: 'Database unavailable',
      hint: 'Configure DB_* env vars or wait for auto-reconnect.',
      last_error: ctx.dbState.lastError,
    });
  }
  next();
};
