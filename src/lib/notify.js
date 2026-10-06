/* ============================================================
   In-app notification creation + realtime socket delivery
   ============================================================ */
const { poolOrThrow } = require('./db');
const ctx = require('../context');

async function notify(userId, title, message, type = 'info', link = null) {
  const pool = poolOrThrow();
  try {
    const [r] = await pool.query(
      `INSERT INTO notifications (user_id,title,message,type,link) VALUES (?,?,?,?,?)`,
      [userId, title, message, type, link]
    );
    if (ctx.io) {
      ctx.io.to(`user_${userId}`).emit('notification', {
        id: r.insertId, user_id: userId, title, message, type, link,
        is_read: 0, created_at: new Date(),
      });
    }
    return r.insertId;
  } catch {
    /* notifications are best-effort */
  }
}

async function broadcast(title, message, audience = 'all') {
  const pool = poolOrThrow();
  const conds = [];
  if (audience === 'experts') conds.push("role='expert'");
  if (audience === 'learners') conds.push("role='learner'");
  if (audience === 'institutions') conds.push("role='institution'");
  if (audience === 'admins') conds.push("role='admin'");
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const [users] = await pool.query(`SELECT id FROM users ${where}`);
  for (const u of users) {
    await pool.query(
      `INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?, 'broadcast')`,
      [u.id, title, message]
    );
    if (ctx.io) ctx.io.to(`user_${u.id}`).emit('broadcast', { title, message });
  }
  return users.length;
}

module.exports = { notify, broadcast };
