/* ============================================================
   Demo router aggregator — intercepts /api/* when ctx.demo.active
   Modules are checked in order; first handler returning true wins.
   ============================================================ */
const express = require('express');
const ctx = require('../context');

const modules = [
  require('./public'),      // landing page (no auth required)
  require('./auth'),
  require('./common'),
  require('./eschool'),
  require('./user'),
  require('./experts'),
  require('./consultations'),
  require('./expert-panel'),
  require('./admin'),
  require('./institution'),
];

function mountDemoRouter(app) {
  const router = express.Router();

  router.use(async (req, res, next) => {
    if (!ctx.demo.active) return next();

    const p = req.path.replace(/^\/+/, '/');
    if (p === '/health') return next();

    try {
      for (const handle of modules) {
        const handled = await handle(req, res, p);
        if (handled) return;
      }
      return next();
    } catch (e) {
      console.error('[demo] error:', e);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Demo backend error: ' + e.message });
      }
    }
  });

  app.use('/api', router);
}

module.exports = { mountDemoRouter };
