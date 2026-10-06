/* ============================================================
   ExpertHub 2.0 — thin bootstrap
   Wires: config → context → demo store → express app → routes → sockets
   ============================================================ */
require('dotenv').config();

const http = require('http');
const express = require('express');

const config = require('./src/config');
const ctx = require('./src/context');
const paths = require('./src/paths');

/* Prime shared context before any module reads it */
ctx.config = config;

const { seedDemoMemory } = require('./src/lib/demo-store');
const { buildApp, staticAndSpa, errorHandler } = require('./src/lib/middleware');
const { attachSocket } = require('./src/lib/socket');
const { mountDemoRouter } = require('./src/demo/router');
const { mountRoutes } = require('./src/routes');
const { tryConnect, shutdownPool } = require('./src/lib/db');

(async () => {
  /* 1. Demo store is always primed — it becomes the live store if MySQL is down */
  await seedDemoMemory();

  /* 2. Build express app */
  const app = express();
  buildApp(app);

  /* 3. Demo router FIRST — only intercepts when ctx.demo.active */
  mountDemoRouter(app);

  /* 4. Real routes — guarded by requireDB, so they no-op in demo mode */
  mountRoutes(app);

  /* 5. Static assets + SPA fallback (dynamic landing page served from index.html) */
  staticAndSpa(app);

  /* 6. Error handler last */
  errorHandler(app);

  /* 7. HTTP + Socket.io */
  const server = http.createServer(app);
  ctx.io = attachSocket(server);

  server.listen(config.port, () => {
    console.log(`\n  ExpertHub 2.0 API → http://localhost:${config.port}`);
    console.log(`   Environment: ${config.env}`);
    console.log(`   Health:      http://localhost:${config.port}/api/health`);
    console.log(`   Landing:     http://localhost:${config.port}/api/public/landing`);
    if (ctx.demo.active) {
      console.log('\n   DEMO MODE ACTIVE — in-memory backend');
      console.log('      admin@platform.com   / admin123');
      console.log('      expert@platform.com  / expert123');
      console.log('      learner@platform.com / learner123');
      console.log('      ops@acme.com         / ops123');
      console.log('      coord@acme.com       / coord123');
    } else {
      console.log(`   DB target: ${config.db.host}:${config.db.port}/${config.db.database}`);
    }
    console.log('');
    if (!ctx.demo.forced && config.db.enabled) tryConnect();
  });

  async function shutdown(signal) {
    console.log(`\n[${signal}] shutting down…`);
    try { await shutdownPool(); } catch {}
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
  process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));
})();
