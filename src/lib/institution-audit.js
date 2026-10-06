/* ============================================================
   Audit logging — institution-scoped + global
   ============================================================ */
const { poolOrThrow } = require('./db');

async function institutionAudit(instId, actorId, actorName, action, meta = null, ip = null) {
  try {
    const pool = poolOrThrow();
    await pool.query(
      `INSERT INTO institution_audit_logs (institution_id, actor_id, action, meta, ip)
       VALUES (?,?,?,?,?)`,
      [instId, actorId, action, meta ? JSON.stringify(meta) : null, ip]
    );
  } catch { /* silent */ }
}

async function logAudit(actorId, action, target, targetId, meta, ip) {
  try {
    const pool = poolOrThrow();
    await pool.query(
      `INSERT INTO audit_logs (actor_id,action,target,target_id,meta,ip) VALUES (?,?,?,?,?,?)`,
      [actorId || null, action, target || null, targetId || null,
       meta ? JSON.stringify(meta) : null, ip || null]
    );
  } catch { /* best effort */ }
}

module.exports = { institutionAudit, logAudit };
