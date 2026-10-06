/* ============================================================
   Admin — institutions management
   Mounted under /api/admin/institutions
   ============================================================ */
const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { auth, asyncH } = require('../lib/helpers');
const { poolOrThrow } = require('../lib/db');
const { logAudit } = require('../lib/institution-audit');
const ctx = require('../context');

const router = express.Router();

router.get('/', auth(['admin']), asyncH(async (_req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT i.*, (SELECT COUNT(*) FROM programmes p WHERE p.institution_id=i.id) programme_count
       FROM institutions i ORDER BY i.created_at DESC`);
  res.json({ institutions: rows });
}));

router.post('/', auth(['admin']), asyncH(async (req, res) => {
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: 'Name required' });
  const [r] = await poolOrThrow().query(
    `INSERT INTO institutions (name,type,industry,contact_email,contact_phone,address,status)
     VALUES (?,?,?,?,?,?, 'pending')`,
    [b.name, b.type || 'corporate', b.industry || '',
     b.contact_email || '', b.contact_phone || '', b.address || '']);
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', auth(['admin']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['name', 'type', 'industry', 'contact_email', 'contact_phone', 'address', 'status'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
}));

['approve', 'reject', 'suspend'].forEach(action => {
  router.put(`/:id/${action}`, auth(['admin']), asyncH(async (req, res) => {
    const pool = poolOrThrow();
    const status = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'suspended';
    const [[inst]] = await pool.query('SELECT ops_manager_id FROM institutions WHERE id=?', [req.params.id]);
    if (!inst) return res.status(404).json({ error: 'Not found' });

    await pool.query('UPDATE institutions SET status=? WHERE id=?', [status, req.params.id]);

    if (inst.ops_manager_id) {
      await pool.query('UPDATE users SET status=? WHERE id=?', [status, inst.ops_manager_id]);
      if (ctx.io) {
        ctx.io.to(`user_${inst.ops_manager_id}`).emit('notification', {
          title: action === 'approve' ? 'Institution verified' : `Institution ${status}`,
          message: `Your institution is now ${status}.`,
          type: action === 'approve' ? 'success' : 'warning',
          created_at: new Date(),
        });
      }
    }
    await logAudit(req.user.id, `institution.${action}`, 'institution', req.params.id, {}, req.ip);
    res.json({ ok: true, status });
  }));
});

router.delete('/:id', auth(['admin']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query('DELETE FROM programmes WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM cohorts WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM assessments WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM projects WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM trainees WHERE institution_id=?', [req.params.id]);
  await pool.query('DELETE FROM institutions WHERE id=?', [req.params.id]);
  await logAudit(req.user.id, 'institution.delete', 'institution', req.params.id, {}, req.ip);
  res.json({ ok: true });
}));

router.post('/:id/ops-manager', auth(['admin']), asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  const [[exists]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const tempPwd = nanoid(10);
  const hash = await bcrypt.hash(tempPwd, 10);
  const [r] = await pool.query(
    `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,intent)
     VALUES (?,?,?, 'institution','active',?, 'operations_manager','both')`,
    [name, email, hash, req.params.id]);
  await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  await pool.query(
    'UPDATE institutions SET ops_manager_id=?, ops_manager_name=?, ops_manager_email=? WHERE id=?',
    [r.insertId, name, email, req.params.id]);
  res.status(201).json({ id: r.insertId, temp_password: tempPwd });
}));

module.exports = router;
