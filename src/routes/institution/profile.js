/* ============================================================
   Institution profile & branding
   ============================================================ */
const express = require('express');
const { asyncH } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');
const { institutionAudit } = require('../../lib/institution-audit');

const router = express.Router();

router.get('/me', (req, res) => {
  res.json({ institution: req.institution });
});

router.put('/profile', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['name', 'type', 'industry', 'contact_phone', 'address'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (sets.length) {
    vals.push(req.institution.id);
    await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  }
  res.json({ ok: true });
}));

router.put('/settings', asyncH(async (req, res) => {
  if (req.institutionRole !== 'operations_manager') {
    return res.status(403).json({ error: 'Only Operations Manager' });
  }
  const pool = poolOrThrow();
  const b = req.body;
  const sets = []; const vals = [];
  for (const k of ['name', 'contact_email', 'default_capacity', 'pass_mark',
                   'seat_allocation', 'billing_cycle', 'contract_start', 'contract_end']) {
    if (b[k] !== undefined) { sets.push(`${k}=?`); vals.push(b[k]); }
  }
  if (sets.length) {
    vals.push(req.institution.id);
    await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  }
  res.json({ ok: true });
}));

router.get('/branding', (req, res) => {
  const i = req.institution;
  res.json({
    branding: {
      id: i.id, name: i.name,
      logo_url: i.logo_url || null,
      primary_color: i.primary_color || '#1e3a8a',
      accent_color: i.accent_color || '#059669',
      subdomain: i.subdomain || null,
      custom_domain: i.custom_domain || null,
      email_sender_name: i.email_sender_name || null,
      email_sender_address: i.email_sender_address || null,
      welcome_message: i.welcome_message || null,
    },
  });
});

router.put('/branding', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['primary_color', 'accent_color', 'subdomain',
                   'email_sender_name', 'email_sender_address', 'welcome_message'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.institution.id);
  await pool.query(`UPDATE institutions SET ${sets.join(',')} WHERE id=?`, vals);
  await institutionAudit(req.institution.id, req.user.id, req.user.email, 'branding.update', null, req.ip);
  res.json({ ok: true });
}));

router.put('/webhook', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  await pool.query(
    'UPDATE institutions SET webhook_url=?, webhook_secret=? WHERE id=?',
    [req.body.webhook_url || null, req.body.webhook_secret || null, req.institution.id]);
  res.json({ ok: true });
}));

router.post('/webhook/test', asyncH(async (req, res) => {
  const pool = poolOrThrow();
  const [[inst]] = await pool.query(
    'SELECT webhook_url, webhook_secret FROM institutions WHERE id=?', [req.institution.id]);
  if (!inst || !inst.webhook_url) return res.status(400).json({ error: 'No webhook configured' });

  const crypto = require('crypto');
  const payload = JSON.stringify({
    event: 'test', timestamp: new Date().toISOString(), institution_id: req.institution.id,
  });
  const sig = crypto.createHmac('sha256', inst.webhook_secret || '').update(payload).digest('hex');
  try {
    const fetchFn = global.fetch || require('node-fetch');
    const r = await fetchFn(inst.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ExpertHub-Signature': sig },
      body: payload,
    });
    res.json({ ok: true, status: r.status });
  } catch (e) {
    res.status(502).json({ error: 'Webhook delivery failed: ' + e.message });
  }
}));

module.exports = router;
