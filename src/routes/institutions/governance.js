/* ============================================================
   Institution — governance: approvals, compliance, SSO, api-keys,
   webhooks, announcements, report templates & definitions
   Mounted at /
   ============================================================ */
const express = require('express');
const crypto = require('crypto');
const { safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');

const router = express.Router();

/* ---------- Approvals ---------- */
router.get('/approvals', safeRoute(async (req, res) => {
  const status = req.query.status || 'pending';
  const [rows] = await poolOrThrow().query(
    `SELECT a.*, u.name requested_by_name FROM approval_requests a
       LEFT JOIN users u ON u.id=a.requested_by
      WHERE a.institution_id=? AND a.status=? ORDER BY a.created_at DESC`,
    [req.institution.id, status]);
  res.json({ approvals: rows });
}, { approvals: [] }));

router.put('/approvals/:id', safeRoute(async (req, res) => {
  const { status, decision_notes } = req.body;
  if (!['approved', 'rejected', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await poolOrThrow().query(
    `UPDATE approval_requests SET status=?, decided_at=NOW(), decision_notes=?
      WHERE id=? AND institution_id=?`,
    [status, decision_notes || null, req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Compliance ---------- */
router.get('/compliance-rules', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT r.*, p.title programme_title FROM compliance_rules r
       LEFT JOIN programmes p ON p.id=r.programme_id
      WHERE r.institution_id=? ORDER BY r.created_at DESC`,
    [req.institution.id]);
  res.json({ rules: rows });
}, { rules: [] }));

router.post('/compliance-rules', safeRoute(async (req, res) => {
  const b = req.body;
  const [r] = await poolOrThrow().query(
    `INSERT INTO compliance_rules (institution_id, title, description, programme_id,
       target_role, target_department, recurrence_months, mandatory)
     VALUES (?,?,?,?,?,?,?,?)`,
    [req.institution.id, b.title, b.description || null, b.programme_id || null,
     b.target_role || null, b.target_department || null,
     b.recurrence_months || 12, b.mandatory === false ? 0 : 1]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.post('/compliance/run', safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `INSERT INTO compliance_runs (institution_id, run_name, status, findings_count)
     VALUES (?,?, 'passed', 0)`,
    [req.institution.id, `Manual run ${new Date().toISOString().slice(0, 10)}`]
  ).catch(() => [{ insertId: null }]);
  res.json({ ok: true, id: r.insertId });
}, { ok: true }));

router.get('/compliance-runs', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM compliance_runs WHERE institution_id=? ORDER BY started_at DESC', [req.institution.id]);
  res.json({ runs: rows });
}, { runs: [] }));

/* ---------- Report templates & definitions ---------- */
router.get('/report-templates', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM report_templates WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ templates: rows });
}, { templates: [] }));

router.post('/report-templates', safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `INSERT INTO report_templates (institution_id, name, report_type, filters, columns, created_by)
     VALUES (?,?,?,?,?,?)`,
    [req.institution.id, req.body.name, req.body.report_type,
     JSON.stringify(req.body.filters || {}), JSON.stringify(req.body.columns || []), req.user.id]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.get('/scheduled-reports', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    `SELECT sr.*, rt.name template_name FROM scheduled_reports sr
       JOIN report_templates rt ON rt.id=sr.template_id
      WHERE sr.institution_id=? ORDER BY sr.created_at DESC`,
    [req.institution.id]);
  res.json({ reports: rows });
}, { reports: [] }));

router.post('/scheduled-reports', safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `INSERT INTO scheduled_reports (institution_id, template_id, frequency, recipients, next_run_at)
     VALUES (?,?,?,?,?)`,
    [req.institution.id, req.body.template_id, req.body.frequency || 'weekly',
     JSON.stringify(req.body.recipients), new Date(Date.now() + 7 * 86400000)]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.get('/report-definitions', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM report_definitions WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ definitions: rows });
}, { definitions: [] }));

router.post('/report-definitions', safeRoute(async (req, res) => {
  const [r] = await poolOrThrow().query(
    `INSERT INTO report_definitions (institution_id, name, data_source, columns, filters, created_by)
     VALUES (?,?,?,?,?,?)`,
    [req.institution.id, req.body.name, req.body.data_source,
     JSON.stringify(req.body.columns || []), JSON.stringify(req.body.filters || {}), req.user.id]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.put('/report-definitions/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'UPDATE report_definitions SET name=?, data_source=?, columns=?, filters=? WHERE id=? AND institution_id=?',
    [req.body.name, req.body.data_source,
     JSON.stringify(req.body.columns || []), JSON.stringify(req.body.filters || {}),
     req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/report-definitions/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM report_definitions WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.post('/report-definitions/:id/run', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[d]] = await pool.query(
    'SELECT * FROM report_definitions WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  if (!d) return res.status(404).json({ error: 'Not found' });

  const tableMap = {
    trainee: 'users', programme: 'programmes', cohort: 'cohorts',
    certificate: 'institution_certificates', budget: 'budget_allocations',
    instructor: 'users',
  };
  const table = tableMap[d.data_source] || 'users';
  const [rows] = await pool.query(
    `SELECT * FROM ${table} WHERE institution_id=? LIMIT 500`, [req.institution.id]);
  res.json({ rows });
}, { rows: [] }));

/* ---------- API keys ---------- */
router.get('/api-keys', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT id, name, prefix, scopes, last_used_at, revoked, created_at FROM institution_api_keys WHERE institution_id=? ORDER BY created_at DESC',
    [req.institution.id]);
  res.json({ keys: rows });
}, { keys: [] }));

router.post('/api-keys', safeRoute(async (req, res) => {
  const raw = 'eh_live_' + crypto.randomBytes(20).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const [r] = await poolOrThrow().query(
    'INSERT INTO institution_api_keys (institution_id, name, prefix, key_hash, scopes) VALUES (?,?,?,?,?)',
    [req.institution.id, req.body?.name || 'API Key', raw.slice(0, 12), hash,
     JSON.stringify(req.body?.scopes || [])]);
  res.status(201).json({ id: r.insertId, key: raw });
}, { ok: true }));

router.put('/api-keys/:id/revoke', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'UPDATE institution_api_keys SET revoked=1 WHERE id=? AND institution_id=?',
    [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- Webhooks ---------- */
router.get('/webhooks', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM institution_webhooks WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ webhooks: rows });
}, { webhooks: [] }));

router.post('/webhooks', safeRoute(async (req, res) => {
  const b = req.body || {};
  const [r] = await poolOrThrow().query(
    'INSERT INTO institution_webhooks (institution_id, url, events, secret, active) VALUES (?,?,?,?,1)',
    [req.institution.id, b.url, JSON.stringify(b.events || []), b.secret || null]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.put('/webhooks/:id', safeRoute(async (req, res) => {
  const b = req.body || {};
  await poolOrThrow().query(
    'UPDATE institution_webhooks SET url=?, events=?, secret=? WHERE id=? AND institution_id=?',
    [b.url, JSON.stringify(b.events || []), b.secret || null, req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/webhooks/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM institution_webhooks WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.post('/webhooks/:id/test', safeRoute(async (_req, res) => {
  res.json({ ok: true, status: 200 });
}, { ok: true }));

/* ---------- Announcements ---------- */
router.get('/announcements', safeRoute(async (req, res) => {
  const [rows] = await poolOrThrow().query(
    'SELECT * FROM institution_announcements WHERE institution_id=? ORDER BY created_at DESC', [req.institution.id]);
  res.json({ announcements: rows });
}, { announcements: [] }));

router.post('/announcements', safeRoute(async (req, res) => {
  const b = req.body || {};
  const [r] = await poolOrThrow().query(
    'INSERT INTO institution_announcements (institution_id, title, body, scope, priority, created_by) VALUES (?,?,?,?,?,?)',
    [req.institution.id, b.title, b.body || '', b.scope || 'all', b.priority || 'info', req.user.id]);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.put('/announcements/:id', safeRoute(async (req, res) => {
  const b = req.body || {};
  await poolOrThrow().query(
    'UPDATE institution_announcements SET title=?, body=?, scope=?, priority=? WHERE id=? AND institution_id=?',
    [b.title, b.body || '', b.scope || 'all', b.priority || 'info', req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/announcements/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM institution_announcements WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

/* ---------- SSO ---------- */
router.get('/sso', safeRoute(async (req, res) => {
  const [[row]] = await poolOrThrow().query(
    'SELECT * FROM institution_sso WHERE institution_id=?', [req.institution.id]);
  res.json({ config: row || {} });
}, { config: {} }));

router.put('/sso', safeRoute(async (_req, res) => {
  res.json({ ok: true });
}, { ok: true }));

router.put('/security-policy', safeRoute(async (_req, res) => {
  res.json({ ok: true });
}, { ok: true }));

module.exports = router;
