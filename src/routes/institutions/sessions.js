/* ============================================================
   Institution — cohort sessions + attendance + ICS export
   ============================================================ */
const express = require('express');
const { safeRoute } = require('../../lib/helpers');
const { poolOrThrow } = require('../../lib/db');
const { notify } = require('../../lib/notify');
const { institutionAudit } = require('../../lib/institution-audit');

const router = express.Router();

router.get('/', safeRoute(async (req, res) => {
  const clauses = ['s.institution_id=?']; const params = [req.institution.id];
  if (req.query.cohort_id) { clauses.push('s.cohort_id=?'); params.push(req.query.cohort_id); }
  if (req.query.status) { clauses.push('s.status=?'); params.push(req.query.status); }

  const [rows] = await poolOrThrow().query(
    `SELECT s.*, u.name instructor_name, c.name cohort_name,
       (SELECT COUNT(*) FROM session_attendance WHERE session_id=s.id AND status='present') present_count,
       (SELECT COUNT(*) FROM session_attendance WHERE session_id=s.id) total_count
       FROM cohort_sessions s
       LEFT JOIN users u ON u.id=s.instructor_id
       LEFT JOIN cohorts c ON c.id=s.cohort_id
      WHERE ${clauses.join(' AND ')} ORDER BY s.scheduled_at DESC`,
    params);
  res.json({ sessions: rows });
}, { sessions: [] }));

router.post('/', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const b = req.body;
  if (!b.title || !b.cohort_id || !b.scheduled_at) {
    return res.status(400).json({ error: 'title, cohort_id, scheduled_at required' });
  }

  const [r] = await pool.query(
    `INSERT INTO cohort_sessions (cohort_id, institution_id, title, description, instructor_id,
       scheduled_at, duration_minutes, mode, location, meeting_url, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [b.cohort_id, req.institution.id, b.title, b.description || null,
     b.instructor_id || null, b.scheduled_at, b.duration_minutes || 60,
     b.mode || 'online', b.location || null, b.meeting_url || null, req.user.id]);

  const [trainees] = await pool.query(
    `SELECT user_id FROM trainee_enrollments WHERE cohort_id=? AND status='active'`,
    [b.cohort_id]);
  for (const t of trainees) {
    await pool.query(
      `INSERT IGNORE INTO session_attendance (session_id, trainee_id, status) VALUES (?,?, 'absent')`,
      [r.insertId, t.user_id]);
    await notify(t.user_id, 'New session scheduled',
      `${b.title} on ${new Date(b.scheduled_at).toLocaleString()}`, 'info');
  }
  await institutionAudit(req.institution.id, req.user.id, req.user.email,
    `Scheduled session "${b.title}"`, null, req.ip);
  res.status(201).json({ id: r.insertId });
}, { ok: true }));

router.put('/:id', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const allowed = ['title', 'description', 'instructor_id', 'scheduled_at',
    'duration_minutes', 'mode', 'location', 'meeting_url', 'recording_url', 'status'];
  const sets = []; const vals = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.institution.id);
  await pool.query(`UPDATE cohort_sessions SET ${sets.join(',')} WHERE id=? AND institution_id=?`, vals);
  res.json({ ok: true });
}, { ok: true }));

router.delete('/:id', safeRoute(async (req, res) => {
  await poolOrThrow().query(
    'DELETE FROM cohort_sessions WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  res.json({ ok: true });
}, { ok: true }));

router.get('/:id/attendance', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  const [[session]] = await pool.query(
    'SELECT * FROM cohort_sessions WHERE id=? AND institution_id=?', [req.params.id, req.institution.id]);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const [trainees] = await pool.query(
    `SELECT u.id, u.name, u.email, COALESCE(a.status,'absent') status, a.excuse_reason
       FROM trainee_enrollments e
       JOIN users u ON u.id=e.user_id
       LEFT JOIN session_attendance a ON a.session_id=? AND a.trainee_id=u.id
      WHERE e.cohort_id=? AND e.status='active' ORDER BY u.name`,
    [req.params.id, session.cohort_id]);
  res.json({ session, trainees });
}, { session: null, trainees: [] }));

router.put('/:id/attendance', safeRoute(async (req, res) => {
  const pool = poolOrThrow();
  for (const r of (req.body.records || [])) {
    await pool.query(
      `INSERT INTO session_attendance (session_id, trainee_id, status, excuse_reason, marked_by, marked_at)
       VALUES (?,?,?,?,?, NOW())
       ON DUPLICATE KEY UPDATE
         status=VALUES(status),
         excuse_reason=VALUES(excuse_reason),
         marked_by=VALUES(marked_by),
         marked_at=NOW()`,
      [req.params.id, r.trainee_id, r.status, r.excuse_reason || null, req.user.id]);
  }
  res.json({ ok: true });
}, { ok: true }));

router.get('/:id/ics', safeRoute(async (req, res) => {
  const [[s]] = await poolOrThrow().query(
    'SELECT * FROM cohort_sessions WHERE id=?', [req.params.id]);
  if (!s) return res.status(404).end();

  const dt = d => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(new Date(s.scheduled_at).getTime() + (s.duration_minutes || 60) * 60000);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ExpertHub//Sessions//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${s.id}@experthub`, `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(s.scheduled_at)}`, `DTEND:${dt(end)}`, `SUMMARY:${s.title}`,
    s.description ? `DESCRIPTION:${s.description.replace(/\n/g, '\\n')}` : '',
    s.location ? `LOCATION:${s.location}` : '',
    s.meeting_url ? `URL:${s.meeting_url}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="session-${s.id}.ics"`);
  res.send(lines.join('\r\n'));
}, { ok: true }));

module.exports = router;
