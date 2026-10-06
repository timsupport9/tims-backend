/* ============================================================
   MySQL pool + auto-reconnect + graceful demo fallback
   ============================================================ */
const mysql = require('mysql2/promise');
const config = require('../config');
const ctx = require('../context');

async function tryConnect() {
  const st = ctx.dbState;
  if (ctx.demo.forced || !config.db.enabled) return;
  if (st.connecting || st.connected) return;
  st.connecting = true;
  st.lastAttempt = new Date();

  try {
    if (!st.pool) {
      st.pool = mysql.createPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        waitForConnections: true,
        connectionLimit: config.db.poolSize,
        namedPlaceholders: true,
        timezone: 'Z',
        connectTimeout: 5000,
      });
    }

    const conn = await st.pool.getConnection();
    await conn.ping();
    conn.release();

    st.connected = true;
    st.lastSuccess = new Date();
    st.lastError = null;
    console.log(`[db] connected → ${config.db.host}:${config.db.port}/${config.db.database}`);

    if (ctx.demo.active && !ctx.demo.forced) {
      ctx.demo.active = false;
      console.log('[demo] disabled — MySQL in use');
    }

    if (!st.bootstrapped) {
      st.bootstrapped = true;
      try {
        if (config.db.bootstrapSchema) {
          await require('../bootstrap/schema').bootstrapDatabase();
        }
        if (config.db.seedDemo) {
          await require('../bootstrap/seed-db').seedDemoData();
        }
      } catch (e) {
        console.error('[db] bootstrap/seed error:', e.message);
      }
    }
  } catch (err) {
    st.connected = false;
    st.lastError = err.message;

    if (!ctx.demo.forced && process.env.DEMO_MODE !== 'false') {
      if (!ctx.demo.active) {
        ctx.demo.active = true;
        console.log('[demo] MySQL unavailable — demo mode enabled');
        if (!ctx.demo.users.length) {
          await require('./demo-store').seedDemoMemory();
        }
      }
    }

    console.warn(`[db] connect failed: ${err.message} — retry in ${config.db.retryMs}ms`);
    if (st.pool) { try { await st.pool.end(); } catch {} st.pool = null; }
    setTimeout(tryConnect, config.db.retryMs);
  } finally {
    st.connecting = false;
  }
}

function poolOrThrow() {
  const st = ctx.dbState;
  if (!st.connected || !st.pool) {
    const e = new Error('Database unavailable');
    e.status = 503;
    throw e;
  }
  return st.pool;
}

async function shutdownPool() {
  const st = ctx.dbState;
  if (st.pool) {
    try { await st.pool.end(); } catch {}
    st.pool = null;
    st.connected = false;
  }
}

module.exports = { tryConnect, poolOrThrow, shutdownPool };
