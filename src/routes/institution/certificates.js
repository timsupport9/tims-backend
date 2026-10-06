/* ============================================================
   Institution — certificates issue / revoke / renew / PDF
   ============================================================ */
const express = require('express');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const { auth, safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');
const { institutionAudit } = require('../../lib/institution-audit');
const { notify } = require('../../lib/notify');

let certificatePdfStream = null;
try { certificatePdfStream = require('../../../services/pdf').certificatePdfStream; }
catch { /* optional */ }

const router = express.Router();

router.get('/', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT c.*, u.name trainee_name, u.email, p.title programme_title
       FROM institution_certificates c
       JOIN users u ON u.id=c.trainee_id
       LEFT JOIN programmes p ON p.id=c.programme_id
      WHERE c.institution_id=? ORDER BY c.issued_at DESC`,
    [req.institution.id]);
  res.json({ certificates: rows });
}, { certificates: [] }));

router.post('/issue', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const { trainee_id, programme_id, awarding_body, cpd_points, valid_months, grade } = req.body;

  const [[trainee]] = await pool.query('SELECT name FROM users WHERE id=?', [trainee_id]);
  const [[prog]] = await pool.query('SELECT title FROM programmes WHERE id=?', [programme_id]);
  if (!trainee || !prog) return res.status(404).json({ error: 'Trainee or programme not found' });

  const serial = `EH-${req.institution.id}-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}`;
  const verification_hash = crypto.createHash('sha256')
    .update(`${trainee_id}|${serial}|${req.institution.id}`).digest('hex');
  const blockchain_hash = '0x' + crypto.randomBytes(32).toString('hex');
  const expiresAt = valid_months ? new Date(Date.now() + valid_months * 30 * 86400000) : null;

  const [r] = await pool.query(
    `INSERT INTO institution_certificates (institution_id, trainee_id, programme_id, title, serial,
       awarding_body, cpd_points, grade, verification_hash, blockchain_hash, expires_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [req.institution.id, trainee_id, programme_id, `${trainee.name} - ${prog.title}`, serial,
     awarding_body || null, cpd_points || 0, grade || null,
     verification_hash, blockchain_hash, expiresAt]);

  await notify(trainee_id, 'Certificate issued',
    `You have been awarded "${prog.title}". Serial: ${serial}`, 'success', `/verify/${serial}`);
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Issued certificate ${serial}`, { programme_id }, req.ip);

  res.status(201).json({ id: r.insertId, serial, verification_url: `/verify/${serial}` });
}, { ok: true }));

router.put('/:id/revoke', safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `UPDATE institution_certificates SET revoked=1, revoked_reason=?
      WHERE id=? AND institution_id=?`,
    [req.body.reason || null, req.params.id, req.institution.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}, { ok: true }));

router.put('/:id/renew', safeRoute(async (req, res) => {
  const months = Number(req.body.valid_months || 12);
  const expires = new Date(Date.now() + months * 30 * 86400000);
  await poolOrThrow().query(
    `UPDATE institution_certificates SET expires_at=?, revoked=0, revoked_reason=NULL
      WHERE id=? AND institution_id=?`,
    [expires, req.params.id, req.institution.id]);
  res.json({ ok: true, expires_at: expires });
}, { ok: true }));

router.get('/expiring', safeRoute(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 90, 365);
  const [rows] = await poolOrThrow().query(
    `SELECT c.*, u.name trainee_name, u.email FROM institution_certificates c
       JOIN users u ON u.id=c.trainee_id
      WHERE c.institution_id=? AND c.revoked=0 AND c.expires_at IS NOT NULL
        AND c.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
      ORDER BY c.expires_at ASC`,
    [req.institution.id, days]);
  res.json({ certificates: rows, window_days: days });
}, { certificates: [], window_days: 90 }));

router.get('/:id/pdf', safeRoute(async (req, res) => {
  const [[c]] = await poolOrThrow().query(
    `SELECT c.*, u.name trainee_name, i.name institution_name, i.primary_color, i.accent_color
       FROM institution_certificates c
       JOIN users u ON u.id=c.trainee_id
       LEFT JOIN institutions i ON i.id=c.institution_id
      WHERE c.id=?`, [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });

  if (!certificatePdfStream) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${c.serial}.pdf"`);
    return res.send(Buffer.from(`%PDF-1.4\n%ExpertHub Certificate ${c.serial}\n`));
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${c.serial}.pdf"`);
  const doc = certificatePdfStream(c, {
    primary_color: c.primary_color, accent_color: c.accent_color,
  });
  doc.pipe(res);
}, {}));

module.exports = router;
