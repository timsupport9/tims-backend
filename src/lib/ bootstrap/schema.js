/* ============================================================
   Bootstrap database schema from database.sql
   ============================================================ */
const fs = require('fs');
const mysql = require('mysql2/promise');
const config = require('../config');
const paths = require('../paths');

async function bootstrapDatabase() {
  if (!fs.existsSync(paths.SCHEMA_FILE)) {
    console.warn('[db] database.sql not found — skipping schema bootstrap');
    return;
  }

  const raw = fs.readFileSync(paths.SCHEMA_FILE, 'utf8');
  const sanitized = raw
    .split('\n')
    .filter(l => !/^\s*(CREATE DATABASE|USE )/i.test(l))
    .join('\n');

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });

  await conn.query(sanitized).catch(e => console.warn('[db] schema warning:', e.message));
  await conn.end();
  console.log('[db] schema bootstrap complete');
}

module.exports = { bootstrapDatabase };
