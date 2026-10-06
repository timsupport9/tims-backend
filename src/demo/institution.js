/* ============================================================
   Demo mode — institution self-service + extended features
   ============================================================ */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { demo, nextId, _instContext, currentDemoUser } = require('./_base');
const config = require('../config');

let certificatePdfStream = null;
try { certificatePdfStream = require('../../services/pdf').certificatePdfStream; } catch {}

module.exports = async function institutionDemo(req, res, p, m) {
  const { method } = req;
  const ensure = () => {
    const c = _instContext(req);
    if (c.error) { res.status(c.error.status).json({ error: c.error.error }); return null; }
    return c;
  };

  /* ============================================================
     SELF-SERVICE
     ============================================================ */

  /* ---------- Institution profile ---------- */
  if (method === 'GET' && p === '/institution/me') {
    const c = ensure(); if (!c) return true;
    return res.json({ institution: c.inst }), true;
  }
  if (method === 'PUT' && p === '/institution/profile') {
    const c = ensure(); if (!c) return true;
    for (const k of ['name', 'type', 'industry', 'contact_phone', 'address']) {
      if (req.body[k] !== undefined) c.inst[k] = req.body[k];
    }
    return res.json({ ok: true }), true;
  }
  if (method === 'PUT' && p === '/institution/settings') {
    const c = ensure(); if (!c) return true;
    if (c.user.institution_role !== 'operations_manager') return res.status(403).json({ error: 'Only Ops Manager' }), true;
    for (const k of ['name', 'contact_email', 'default_capacity', 'pass_mark', 'seat_allocation', 'billing_cycle']) {
      if (req.body[k] !== undefined) c.inst[k] = req.body[k];
    }
    return res.json({ ok: true }), true;
  }

  /* ---------- Branding ---------- */
  if (method === 'GET' && p === '/institution/branding') {
    const c = ensure(); if (!c) return true;
    return res.json({
      branding: {
        id: c.inst.id, name: c.inst.name,
        logo_url: c.inst.logo_url || null,
        primary_color: c.inst.primary_color || '#1e3a8a',
        accent_color: c.inst.accent_color || '#059669',
        subdomain: c.inst.subdomain || null,
        custom_domain: c.inst.custom_domain || null,
        email_sender_name: c.inst.email_sender_name || null,
        email_sender_address: c.inst.email_sender_address || null,
        welcome_message: c.inst.welcome_message || null,
      },
    }), true;
  }
  if (method === 'PUT' && p === '/institution/branding') {
    const c = ensure(); if (!c) return true;
    const b = req.body || {};
    for (const k of ['primary_color', 'accent_color', 'subdomain', 'email_sender_name', 'email_sender_address', 'welcome_message']) {
      if (b[k] !== undefined) c.inst[k] = b[k];
    }
    return res.json({ ok: true }), true;
  }

  /* ---------- Webhook ---------- */
  if (method === 'PUT' && p === '/institution/webhook') {
    const c = ensure(); if (!c) return true;
    c.inst.webhook_url = req.body?.webhook_url || null;
    c.inst.webhook_secret = req.body?.webhook_secret || null;
    return res.json({ ok: true }), true;
  }
  if (method === 'POST' && p === '/institution/webhook/test') {
    const c = ensure(); if (!c) return true;
    if (!c.inst.webhook_url) return res.status(400).json({ error: 'No webhook configured' }), true;
    return res.json({ ok: true, status: 200, demo: true }), true;
  }

  /* ---------- Programmes ---------- */
  if (method === 'GET' && p === '/institution/programmes') {
    const c = ensure(); if (!c) return true;
    const list = demo.programmes
      .filter(x => x.institution_id === c.inst.id)
      .map(x => ({
        ...x,
        enrolled_count: demo.trainees.filter(t => t.programme_id === x.id).length,
      }));
    return res.json({ programmes: list }), true;
  }

  if (method === 'POST' && p === '/institution/programmes') {
    const c = ensure(); if (!c) return true;
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Title required' }), true;
    const id = nextId('programmes');
    demo.programmes.push({
      id, institution_id: c.inst.id,
      title: b.title, description: b.description || '', category: b.category || 'General',
      delivery_mode: b.delivery_mode || 'hybrid', level: b.level || 'intermediate',
      status: b.status || 'draft',
      start_date: b.start_date ? new Date(b.start_date) : null,
      end_date: b.end_date ? new Date(b.end_date) : null,
      capacity: Number(b.capacity || c.inst.default_capacity || 30),
      duration_hours: Number(b.duration_hours || 0),
      cost_per_seat: Number(b.cost_per_seat || 0),
      trainer_cost: Number(b.trainer_cost || 0),
      materials_cost: Number(b.materials_cost || 0),
      accreditation_body: b.accreditation_body || null,
      cpd_points: Number(b.cpd_points || 0),
      created_at: new Date(),
    });
    demo.institutionAudit.push({
      id: nextId('institutionAudit'), institution_id: c.inst.id,
      actor_id: c.user.id, actor_name: c.user.name,
      action: `Created programme "${b.title}"`, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/programmes\/(\d+)$/))) {
    const c = ensure(); if (!c) return true;
    const pr = demo.programmes.find(x => x.id === Number(m[1]) && x.institution_id === c.inst.id);
    if (!pr) return res.status(404).json({ error: 'Programme not found' }), true;
    Object.assign(pr, req.body || {});
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/institution\/programmes\/(\d+)$/))) {
    const c = ensure(); if (!c) return true;
    const pr = demo.programmes.find(x => x.id === Number(m[1]) && x.institution_id === c.inst.id);
    if (!pr) return res.status(404).json({ error: 'Programme not found' }), true;
    demo.programmes = demo.programmes.filter(x => x.id !== pr.id);
    demo.institutionAudit.push({
      id: nextId('institutionAudit'), institution_id: c.inst.id,
      actor_id: c.user.id, actor_name: c.user.name,
      action: `Deleted programme "${pr.title}"`, created_at: new Date(),
    });
    return res.json({ ok: true }), true;
  }

  /* ---------- Cohorts ---------- */
  if (method === 'GET' && p === '/institution/cohorts') {
    const c = ensure(); if (!c) return true;
    const list = demo.cohorts
      .filter(x => x.institution_id === c.inst.id)
      .map(x => ({
        ...x,
        programme_title: demo.programmes.find(pp => pp.id === x.programme_id)?.title || null,
        instructor_name: x.instructor_name ||
          (x.instructor_id ? demo.users.find(u => u.id === x.instructor_id)?.name : null) || null,
        trainee_count: demo.trainees.filter(t => t.cohort_id === x.id).length,
      }));
    return res.json({ cohorts: list }), true;
  }

  if (method === 'POST' && p === '/institution/cohorts') {
    const c = ensure(); if (!c) return true;
    const b = req.body || {};
    if (!b.name || !b.programme_id) return res.status(400).json({ error: 'name and programme_id required' }), true;
    const instructor = b.instructor_id ? demo.users.find(u => u.id === Number(b.instructor_id)) : null;
    const id = nextId('cohorts');
    demo.cohorts.push({
      id, institution_id: c.inst.id, programme_id: Number(b.programme_id),
      name: b.name, instructor_id: instructor?.id || null,
      instructor_name: instructor?.name || null,
      start_date: b.start_date ? new Date(b.start_date) : null,
      end_date: b.end_date ? new Date(b.end_date) : null,
      capacity: Number(b.capacity || c.inst.default_capacity || 30),
      location: b.location || null, trainee_count: 0,
      status: b.status || 'active', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/cohorts\/(\d+)$/))) {
    const c = ensure(); if (!c) return true;
    const ch = demo.cohorts.find(x => x.id === Number(m[1]) && x.institution_id === c.inst.id);
    if (!ch) return res.status(404).json({ error: 'Cohort not found' }), true;
    Object.assign(ch, req.body || {});
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/institution\/cohorts\/(\d+)$/))) {
    const c = ensure(); if (!c) return true;
    demo.cohorts = demo.cohorts.filter(x => !(x.id === Number(m[1]) && x.institution_id === c.inst.id));
    return res.json({ ok: true }), true;
  }

  /* ---------- Assessments ---------- */
  if (method === 'GET' && p === '/institution/assessments') {
    const c = ensure(); if (!c) return true;
    const list = demo.assessments.filter(x => x.institution_id === c.inst.id).map(x => ({
      ...x,
      cohort_name: demo.cohorts.find(cc => cc.id === x.cohort_id)?.name || null,
      question_count: 0,
    }));
    return res.json({ assessments: list }), true;
  }

  if (method === 'POST' && p === '/institution/assessments') {
    const c = ensure(); if (!c) return true;
    const b = req.body || {};
    if (!b.title || !b.cohort_id) return res.status(400).json({ error: 'title and cohort_id required' }), true;
    const id = nextId('assessments');
    demo.assessments.push({
      id, institution_id: c.inst.id, cohort_id: Number(b.cohort_id),
      title: b.title, type: b.type || 'quiz',
      weight: Number(b.weight || 0), pass_mark: Number(b.pass_mark || 70),
      max_attempts: Number(b.max_attempts || 1),
      time_limit_minutes: Number(b.time_limit_minutes || 0),
      auto_grade: b.auto_grade === false ? 0 : 1,
      due_date: b.due_date ? new Date(b.due_date) : null,
      status: 'scheduled', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/institution\/assessments\/(\d+)$/))) {
    const c = ensure(); if (!c) return true;
    demo.assessments = demo.assessments.filter(x => !(x.id === Number(m[1]) && x.institution_id === c.inst.id));
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/institution\/assessments\/(\d+)\/submissions$/))) {
    return res.json({ submissions: demo.assessmentSubmissions.filter(s => s.assessment_id === Number(m[1])) }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/assessments\/submissions\/(\d+)\/grade$/))) {
    const s = demo.assessmentSubmissions.find(x => x.id === Number(m[1]));
    if (s) Object.assign(s, req.body || {}, { graded_at: new Date() });
    return res.json({ ok: true }), true;
  }

  /* ---------- Projects ---------- */
  if (method === 'GET' && p === '/institution/projects') {
    const c = ensure(); if (!c) return true;
    const list = demo.projects.filter(x => x.institution_id === c.inst.id).map(x => ({
      ...x,
      cohort_name: demo.cohorts.find(cc => cc.id === x.cohort_id)?.name || null,
    }));
    return res.json({ projects: list }), true;
  }

  if (method === 'POST' && p === '/institution/projects') {
    const c = ensure(); if (!c) return true;
    const b = req.body || {};
    if (!b.title || !b.cohort_id) return res.status(400).json({ error: 'title and cohort_id required' }), true;
    const id = nextId('projects');
    demo.projects.push({
      id, institution_id: c.inst.id, cohort_id: Number(b.cohort_id),
      title: b.title, description: b.description || '', category: b.category || 'Project',
      deadline: b.deadline ? new Date(b.deadline) : null,
      max_score: Number(b.max_score || 100),
      status: 'active', submissions_count: 0, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Question bank ---------- */
  if (method === 'GET' && p === '/institution/question-bank') {
    const c = ensure(); if (!c) return true;
    return res.json({ questions: demo.questionBank.filter(q => q.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/question-bank') {
    const c = ensure(); if (!c) return true;
    const b = req.body || {};
    if (!b.question_text) return res.status(400).json({ error: 'Question text required' }), true;
    const id = nextId('questionBank');
    demo.questionBank.push({
      id, institution_id: c.inst.id,
      category: b.category || null, difficulty: b.difficulty || 'medium',
      question_type: b.question_type || 'mcq', question_text: b.question_text,
      options: b.options || null, correct_answer: b.correct_answer || null,
      points: Number(b.points || 1), explanation: b.explanation || null,
      tags: b.tags || null, created_by: c.user.id, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/institution\/question-bank\/(\d+)$/))) {
    const c = ensure(); if (!c) return true;
    demo.questionBank = demo.questionBank.filter(x => !(x.id === Number(m[1]) && x.institution_id === c.inst.id));
    return res.json({ ok: true }), true;
  }

  /* ---------- Trainees ---------- */
  if (method === 'GET' && p === '/institution/trainees') {
    const c = ensure(); if (!c) return true;
    return res.json({
      trainees: demo.trainees.filter(t => t.institution_id === c.inst.id),
      total: demo.trainees.length,
    }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/institution\/trainees\/(\d+)$/))) {
    const c = ensure(); if (!c) return true;
    const t = demo.trainees.find(x => x.id === Number(m[1]) && x.institution_id === c.inst.id);
    if (!t) return res.status(404).json({ error: 'Trainee not found' }), true;
    return res.json({ trainee: t, enrollments: [], certificates: [], skills: [] }), true;
  }

  if (method === 'POST' && p === '/institution/trainees/invite') {
    const c = ensure(); if (!c) return true;
    const { emails = [], programme_id, cohort_id } = req.body || {};
    if (!Array.isArray(emails) || !emails.length) return res.status(400).json({ error: 'emails required' }), true;
    const programme = demo.programmes.find(pp => pp.id === Number(programme_id));
    const invited = [];
    for (const email of emails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      const id = nextId('trainees');
      demo.trainees.push({
        id, institution_id: c.inst.id, user_id: null,
        name: email.split('@')[0], email,
        programme_id: programme?.id || null,
        programme_title: programme?.title || null,
        cohort_id: cohort_id ? Number(cohort_id) : null,
        cohort_name: cohort_id ? demo.cohorts.find(cc => cc.id === Number(cohort_id))?.name : null,
        progress: 0, assessment_avg: null,
        status: 'invited', lifecycle_status: 'invited',
        created_at: new Date(),
      });
      invited.push(email);
    }
    return res.status(201).json({ invited: invited.length, emails: invited }), true;
  }

  /* ---------- Enrollments ---------- */
  if (method === 'GET' && p === '/institution/enrollments') {
    const c = ensure(); if (!c) return true;
    const list = demo.trainees.filter(t => t.institution_id === c.inst.id).map(t => ({
      id: t.id, user_id: t.user_id, trainee_name: t.name, email: t.email,
      department: t.department || null,
      programme_id: t.programme_id, programme_title: t.programme_title,
      cohort_id: t.cohort_id, cohort_name: t.cohort_name,
      status: t.lifecycle_status || t.status,
      progress: t.progress, enrolled_at: t.created_at,
    }));
    return res.json({ enrollments: list, total: list.length, page: 1, per: 50 }), true;
  }

  if (method === 'POST' && p === '/institution/enrollments') {
    const c = ensure(); if (!c) return true;
    const id = nextId('trainees');
    const t = {
      id, institution_id: c.inst.id, ...(req.body || {}),
      status: 'pending_approval', lifecycle_status: 'pending_approval',
      created_at: new Date(),
    };
    demo.trainees.push(t);
    return res.status(201).json({ id, request_id: nextId('approvals') }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/enrollments\/(\d+)\/approve$/))) {
    const t = demo.trainees.find(x => x.id === Number(m[1]));
    if (t) { t.lifecycle_status = 'active'; t.status = 'active'; }
    return res.json({ ok: true }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/enrollments\/(\d+)\/reject$/))) {
    const t = demo.trainees.find(x => x.id === Number(m[1]));
    if (t) { t.lifecycle_status = 'withdrawn'; t.status = 'withdrawn'; }
    return res.json({ ok: true }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/enrollments\/(\d+)\/transfer$/))) {
    const t = demo.trainees.find(x => x.id === Number(m[1]));
    if (t) t.cohort_id = Number(req.body?.cohort_id);
    return res.json({ ok: true }), true;
  }

  /* ---------- Sessions ---------- */
  if (method === 'GET' && p === '/institution/sessions') {
    const c = ensure(); if (!c) return true;
    const list = demo.sessions.filter(s => s.institution_id === c.inst.id).map(s => ({
      ...s,
      cohort_name: demo.cohorts.find(cc => cc.id === s.cohort_id)?.name || null,
      instructor_name: s.instructor_id ? demo.users.find(u => u.id === s.instructor_id)?.name : null,
      present_count: demo.attendance.filter(a => a.session_id === s.id && a.status === 'present').length,
      total_count: demo.attendance.filter(a => a.session_id === s.id).length,
    }));
    return res.json({ sessions: list }), true;
  }

  if (method === 'POST' && p === '/institution/sessions') {
    const c = ensure(); if (!c) return true;
    const b = req.body || {};
    if (!b.title || !b.cohort_id || !b.scheduled_at) {
      return res.status(400).json({ error: 'title, cohort_id, scheduled_at required' }), true;
    }
    const id = nextId('sessions');
    demo.sessions.push({
      id, institution_id: c.inst.id, cohort_id: Number(b.cohort_id),
      title: b.title, description: b.description || null,
      instructor_id: b.instructor_id || null,
      scheduled_at: new Date(b.scheduled_at),
      duration_minutes: Number(b.duration_minutes || 60),
      mode: b.mode || 'online', location: b.location || null,
      meeting_url: b.meeting_url || null,
      status: 'scheduled', created_by: c.user.id, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/institution\/sessions\/(\d+)\/attendance$/))) {
    const c = ensure(); if (!c) return true;
    const session = demo.sessions.find(x => x.id === Number(m[1]) && x.institution_id === c.inst.id);
    if (!session) return res.status(404).json({ error: 'Session not found' }), true;
    const trainees = demo.trainees
      .filter(t => t.cohort_id === session.cohort_id && t.institution_id === c.inst.id)
      .map(t => ({ id: t.id, name: t.name, email: t.email, status: 'absent', excuse_reason: null }));
    return res.json({ session, trainees }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/sessions\/(\d+)\/attendance$/))) {
    const c = ensure(); if (!c) return true;
    const records = req.body?.records || [];
    for (const r of records) {
      const existing = demo.attendance.find(a => a.session_id === Number(m[1]) && a.trainee_id === r.trainee_id);
      if (existing) Object.assign(existing, r);
      else demo.attendance.push({
        id: nextId('attendance'), session_id: Number(m[1]), ...r,
        marked_by: c.user.id, marked_at: new Date(),
      });
    }
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/institution\/sessions\/(\d+)\/ics$/))) {
    const c = ensure(); if (!c) return true;
    const s = demo.sessions.find(x => x.id === Number(m[1]) && x.institution_id === c.inst.id);
    if (!s) return res.status(404).end(), true;
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
    return res.send(lines.join('\r\n')), true;
  }

  /* ---------- Certificates ---------- */
  if (method === 'GET' && p === '/institution/certificates') {
    const c = ensure(); if (!c) return true;
    return res.json({ certificates: demo.certificatesInst.filter(x => x.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/certificates/issue') {
    const c = ensure(); if (!c) return true;
    const { trainee_id, programme_id, awarding_body, cpd_points, valid_months, grade } = req.body || {};
    const t = demo.trainees.find(x => x.id === Number(trainee_id));
    const pr = demo.programmes.find(x => x.id === Number(programme_id));
    if (!t || !pr) return res.status(404).json({ error: 'Trainee or programme not found' }), true;

    const serial = `EH-${c.inst.id}-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}`;
    const expiresAt = valid_months ? new Date(Date.now() + valid_months * 30 * 86400000) : null;
    const id = nextId('certificatesInst');
    const blockchain_hash = '0x' + crypto.randomBytes(32).toString('hex');
    demo.certificatesInst.push({
      id, institution_id: c.inst.id, trainee_id: t.id, programme_id: pr.id,
      title: `${t.name} - ${pr.title}`, serial,
      trainee_name: t.name, programme_title: pr.title,
      awarding_body: awarding_body || null,
      cpd_points: Number(cpd_points || 0),
      grade: grade || null,
      issued_at: new Date(), expires_at: expiresAt,
      revoked: 0, blockchain_hash,
    });
    demo.blockchainCerts.push({
      id: nextId('blockchainCerts'), serial, trainee_name: t.name,
      blockchain_hash, issued_at: new Date(),
    });
    return res.status(201).json({ id, serial, verification_url: `/verify/${serial}` }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/certificates\/(\d+)\/revoke$/))) {
    const c = demo.certificatesInst.find(x => x.id === Number(m[1]));
    if (c) { c.revoked = 1; c.revoked_reason = req.body?.reason || null; }
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && p === '/institution/certificates/expiring') {
    const c = ensure(); if (!c) return true;
    const days = Number(req.query.days || 90);
    const nowMs = Date.now();
    const list = demo.certificatesInst.filter(cert => {
      if (cert.institution_id !== c.inst.id || cert.revoked || !cert.expires_at) return false;
      const d = (new Date(cert.expires_at) - nowMs) / 86400000;
      return d > 0 && d < days;
    });
    return res.json({ certificates: list, window_days: days }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/institution\/certificates\/(\d+)\/pdf$/))) {
    const c = demo.certificatesInst.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    if (!certificatePdfStream) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${c.serial}.pdf"`);
      return res.send(Buffer.from(`%PDF-1.4\n%ExpertHub Certificate ${c.serial}\n`)), true;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${c.serial}.pdf"`);
    certificatePdfStream(c, {}).pipe(res);
    return true;
  }

  /* ---------- Skills ---------- */
  if (method === 'GET' && p === '/institution/skills') {
    const c = ensure(); if (!c) return true;
    return res.json({ skills: demo.skills.filter(s => s.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/skills') {
    const c = ensure(); if (!c) return true;
    if (!req.body?.name) return res.status(400).json({ error: 'Name required' }), true;
    const id = nextId('skills');
    demo.skills.push({
      id, institution_id: c.inst.id,
      name: req.body.name, category: req.body.category || null,
      description: req.body.description || null, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'GET' && p === '/institution/skills/matrix') {
    const c = ensure(); if (!c) return true;
    const skills = demo.skills.filter(s => s.institution_id === c.inst.id);
    const trainees = demo.trainees.filter(t => t.institution_id === c.inst.id);
    const matrix = trainees.map(t => ({
      trainee: { id: t.id, name: t.name, email: t.email, department: t.department || null },
      levels: Object.fromEntries(skills.map(s => {
        const ts = demo.traineeSkills.find(x => x.trainee_id === t.id && x.skill_id === s.id);
        return [s.id, ts ? ts.level : 0];
      })),
    }));
    return res.json({ skills, matrix }), true;
  }

  if (method === 'PUT' && p === '/institution/skills/assess') {
    const c = ensure(); if (!c) return true;
    const { trainee_id, skill_id, level, source } = req.body || {};
    const existing = demo.traineeSkills.find(x => x.trainee_id === Number(trainee_id) && x.skill_id === Number(skill_id));
    if (existing) {
      existing.level = Number(level);
      existing.assessed_by = c.user.id;
      existing.assessed_at = new Date();
    } else {
      demo.traineeSkills.push({
        id: nextId('traineeSkills'),
        trainee_id: Number(trainee_id), skill_id: Number(skill_id),
        level: Number(level), assessed_by: c.user.id,
        source: source || 'manager', assessed_at: new Date(),
      });
    }
    return res.json({ ok: true }), true;
  }

  /* ---------- Approvals ---------- */
  if (method === 'GET' && p === '/institution/approvals') {
    const c = ensure(); if (!c) return true;
    const status = req.query.status || 'pending';
    return res.json({
      approvals: demo.institutionReqs.filter(a => a.institution_id === c.inst.id && a.status === status),
    }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/approvals\/(\d+)$/))) {
    const c = ensure(); if (!c) return true;
    const a = demo.institutionReqs.find(x => x.id === Number(m[1]) && x.institution_id === c.inst.id);
    if (!a) return res.status(404).json({ error: 'Request not found' }), true;
    a.status = req.body?.status || 'approved';
    a.decision_notes = req.body?.decision_notes || null;
    a.decided_at = new Date();
    return res.json({ ok: true }), true;
  }

  /* ---------- Instructors ---------- */
  if (method === 'GET' && p === '/institution/instructors') {
    const c = ensure(); if (!c) return true;
    return res.json({ instructors: demo.instructors.filter(i => i.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/instructors') {
    const c = ensure(); if (!c) return true;
    const expert = demo.users.find(u => u.id === Number(req.body?.expert_id) && u.role === 'expert');
    if (!expert) return res.status(404).json({ error: 'Expert not found' }), true;
    const existing = demo.instructors.find(i => i.institution_id === c.inst.id && i.expert_id === expert.id);
    if (existing) return res.json({ id: existing.id, already: true }), true;
    const id = nextId('instructors');
    demo.instructors.push({
      id, institution_id: c.inst.id, expert_id: expert.id,
      name: expert.name, specialization: expert.specialization,
      programme_count: 0, status: 'active', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Team ---------- */
  if (method === 'GET' && p === '/institution/team') {
    const c = ensure(); if (!c) return true;
    if (c.user.institution_role !== 'operations_manager') return res.json({ team: [] }), true;
    return res.json({ team: demo.institutionTeam.filter(t => t.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/team/invite') {
    const c = ensure(); if (!c) return true;
    if (c.user.institution_role !== 'operations_manager') return res.status(403).json({ error: 'Only Ops Manager' }), true;
    const { name, email, institution_role } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name and email required' }), true;
    if (!config.institution.roles.includes(institution_role)) return res.status(400).json({ error: 'Invalid role' }), true;
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' }), true;
    const tempPwd = nanoid(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const uid = nextId('users');
    demo.users.push({
      id: uid, name, email, password_hash: hash, role: 'institution', status: 'active',
      institution_id: c.inst.id, institution_role, intent: 'both',
      created_at: new Date(),
    });
    demo.institutionTeam.push({
      id: nextId('institutionTeam'), institution_id: c.inst.id, user_id: uid,
      name, email, institution_role, status: 'active', created_at: new Date(),
    });
    return res.status(201).json({ id: uid, temp_password: tempPwd }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/team\/(\d+)\/role$/))) {
    const c = ensure(); if (!c) return true;
    const u = demo.users.find(x => x.id === Number(m[1]) && x.institution_id === c.inst.id);
    if (u) u.institution_role = req.body?.institution_role;
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/institution\/team\/(\d+)$/))) {
    const c = ensure(); if (!c) return true;
    demo.institutionTeam = demo.institutionTeam.filter(t => !(t.user_id === Number(m[1]) && t.institution_id === c.inst.id));
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (u) u.status = 'suspended';
    return res.json({ ok: true }), true;
  }

  /* ---------- Org units ---------- */
  if (method === 'GET' && p === '/institution/org-units') {
    const c = ensure(); if (!c) return true;
    return res.json({ units: demo.orgUnits.filter(u => u.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/org-units') {
    const c = ensure(); if (!c) return true;
    const id = nextId('orgUnits');
    demo.orgUnits.push({ id, institution_id: c.inst.id, ...req.body, active: 1, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Learning paths ---------- */
  if (method === 'GET' && p === '/institution/learning-paths') {
    const c = ensure(); if (!c) return true;
    return res.json({
      paths: demo.learningPaths
        .filter(lp => lp.institution_id === c.inst.id)
        .map(lp => ({ ...lp, step_count: demo.learningPathSteps.filter(s => s.path_id === lp.id).length })),
    }), true;
  }

  if (method === 'POST' && p === '/institution/learning-paths') {
    const c = ensure(); if (!c) return true;
    const id = nextId('learningPaths');
    demo.learningPaths.push({ id, institution_id: c.inst.id, ...req.body, active: 1, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/institution\/learning-paths\/(\d+)\/steps$/))) {
    const c = ensure(); if (!c) return true;
    const pid = Number(m[1]);
    const programme = demo.programmes.find(pp => pp.id === Number(req.body?.programme_id));
    if (!programme) return res.status(404).json({ error: 'Programme not found' }), true;
    const id = nextId('learningPathSteps');
    const position = demo.learningPathSteps.filter(s => s.path_id === pid).length + 1;
    demo.learningPathSteps.push({ id, path_id: pid, programme_id: programme.id, programme_title: programme.title, position });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Compliance ---------- */
  if (method === 'GET' && p === '/institution/compliance-rules') {
    const c = ensure(); if (!c) return true;
    return res.json({ rules: demo.complianceRules.filter(r => r.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/compliance-rules') {
    const c = ensure(); if (!c) return true;
    const id = nextId('complianceRules');
    demo.complianceRules.push({ id, institution_id: c.inst.id, ...req.body, active: 1, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  if (method === 'POST' && p === '/institution/compliance/run') {
    const c = ensure(); if (!c) return true;
    const id = nextId('complianceRuns');
    demo.complianceRuns.push({
      id, institution_id: c.inst.id,
      run_name: `Manual run ${new Date().toISOString().slice(0, 10)}`,
      status: 'passed', findings_count: 0, started_at: new Date(),
    });
    return res.json({ ok: true, id }), true;
  }

  if (method === 'GET' && p === '/institution/compliance-runs') {
    const c = ensure(); if (!c) return true;
    return res.json({ runs: demo.complianceRuns.filter(r => r.institution_id === c.inst.id) }), true;
  }

  /* ---------- Reports ---------- */
  if (method === 'GET' && p === '/institution/reports/programme-scorecard') {
    const c = ensure(); if (!c) return true;
    const rows = demo.programmes.filter(pp => pp.institution_id === c.inst.id).map(pp => {
      const enrolled = demo.trainees.filter(t => t.programme_id === pp.id);
      const completed = enrolled.filter(t => t.progress >= 100);
      const avg = enrolled.length
        ? Math.round(enrolled.reduce((s, t) => s + (t.progress || 0), 0) / enrolled.length)
        : 0;
      return {
        id: pp.id, title: pp.title, status: pp.status,
        total_enrolled: enrolled.length, total_completed: completed.length,
        avg_progress: avg, cost_per_seat: pp.cost_per_seat || 0,
      };
    });
    return res.json({ scorecard: rows }), true;
  }

  if (method === 'GET' && p === '/institution/reports/cohort-comparison') {
    const c = ensure(); if (!c) return true;
    const rows = demo.cohorts.filter(cc => cc.institution_id === c.inst.id).map(cc => {
      const ts = demo.trainees.filter(t => t.cohort_id === cc.id);
      const avg = ts.length ? Math.round(ts.reduce((s, t) => s + (t.progress || 0), 0) / ts.length) : 0;
      return {
        id: cc.id, name: cc.name,
        programme_title: cc.programme_title || demo.programmes.find(x => x.id === cc.programme_id)?.title,
        enrolled: ts.length, avg_progress: avg, avg_score: 0, presents: 0, attendance_total: 0,
      };
    });
    return res.json({ cohorts: rows }), true;
  }

  if (method === 'GET' && p === '/institution/reports/trainee-progress-heatmap') {
    const c = ensure(); if (!c) return true;
    const rows = demo.trainees.filter(t => t.institution_id === c.inst.id).map(t => ({
      id: t.id, name: t.name, department: t.department || null,
      programme_title: t.programme_title || null,
      progress: t.progress || 0,
      pace: t.progress >= 80 ? 'ahead' : t.progress >= 50 ? 'on_track' : t.progress >= 20 ? 'behind' : 'at_risk',
    }));
    return res.json({ heatmap: rows }), true;
  }

  if (method === 'GET' && p === '/institution/reports/compliance') {
    const c = ensure(); if (!c) return true;
    const rows = demo.trainees.filter(t => t.institution_id === c.inst.id).map(t => {
      const cert = demo.certificatesInst.find(x => x.trainee_id === t.id && !x.revoked);
      let status = 'no_expiry';
      if (cert) {
        if (!cert.expires_at) status = 'no_expiry';
        else if (new Date(cert.expires_at) < new Date()) status = 'expired';
        else if (new Date(cert.expires_at) - Date.now() < 30 * 86400000) status = 'expiring_soon';
        else status = 'valid';
      }
      return {
        id: t.id, name: t.name, email: t.email, department: t.department || null,
        title: cert?.title, expires_at: cert?.expires_at, compliance_status: status,
      };
    });
    return res.json({ compliance: rows }), true;
  }

  if (method === 'GET' && p === '/institution/reports/cost') {
    const c = ensure(); if (!c) return true;
    const rows = demo.programmes.filter(pp => pp.institution_id === c.inst.id).map(pp => {
      const seats = demo.trainees.filter(t => t.programme_id === pp.id).length;
      return {
        id: pp.id, title: pp.title, seats,
        cost_per_seat: pp.cost_per_seat || 0,
        trainer_cost: pp.trainer_cost || 0,
        materials_cost: pp.materials_cost || 0,
        total_cost: seats * (pp.cost_per_seat || 0) + (pp.trainer_cost || 0) + (pp.materials_cost || 0),
      };
    });
    const total = rows.reduce((s, r) => s + r.total_cost, 0);
    return res.json({ cost: rows, total_cost: total }), true;
  }

  /* ---------- Report definitions ---------- */
  if (method === 'GET' && p === '/institution/report-definitions') {
    const c = ensure(); if (!c) return true;
    return res.json({ definitions: demo.reportDefinitions.filter(d => d.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/report-definitions') {
    const c = ensure(); if (!c) return true;
    const id = nextId('reportDefinitions');
    demo.reportDefinitions.push({ id, institution_id: c.inst.id, ...req.body, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/institution\/report-definitions\/(\d+)\/run$/))) {
    const c = ensure(); if (!c) return true;
    const d = demo.reportDefinitions.find(x => x.id === Number(m[1]) && x.institution_id === c.inst.id);
    if (!d) return res.status(404).json({ error: 'Not found' }), true;
    const src = d.data_source || 'trainee';
    let rows = [];
    if (src === 'trainee') rows = demo.trainees.filter(t => t.institution_id === c.inst.id);
    else if (src === 'programme') rows = demo.programmes.filter(pp => pp.institution_id === c.inst.id);
    else if (src === 'cohort') rows = demo.cohorts.filter(cc => cc.institution_id === c.inst.id);
    else if (src === 'certificate') rows = demo.certificatesInst.filter(cert => cert.institution_id === c.inst.id);
    else if (src === 'budget') rows = demo.budgetAllocations.filter(b => b.institution_id === c.inst.id);
    else if (src === 'instructor') rows = demo.instructors.filter(i => i.institution_id === c.inst.id);
    return res.json({ rows }), true;
  }

  /* ---------- Materials ---------- */
  if (method === 'GET' && p === '/institution/materials') {
    const c = ensure(); if (!c) return true;
    const list = demo.materials.filter(mm => mm.institution_id === c.inst.id && mm.type !== 'module');
    return res.json({ materials: list }), true;
  }

  if (method === 'POST' && p === '/institution/materials') {
    const c = ensure(); if (!c) return true;
    const id = nextId('materials');
    demo.materials.push({
      id, institution_id: c.inst.id,
      title: req.body?.title || 'Demo material',
      description: req.body?.description || null,
      file_url: '/uploads/demo', file_size: 12345, mime_type: 'application/pdf',
      cohort_id: req.body?.cohort_id || null,
      uploaded_by: c.user?.id, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Stats ---------- */
  if (method === 'GET' && p === '/institution/stats') {
    const c = ensure(); if (!c) return true;
    const myTrainees = demo.trainees.filter(t => t.institution_id === c.inst.id);
    const myCohorts = demo.cohorts.filter(cc => cc.institution_id === c.inst.id);
    const myReqs = demo.institutionReqs.filter(r => r.institution_id === c.inst.id);
    const myAudit = demo.institutionAudit
      .filter(a => a.institution_id === c.inst.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const avgCompletion = myTrainees.length
      ? Math.round(myTrainees.reduce((s, t) => s + (t.progress || 0), 0) / myTrainees.length)
      : 0;
    const scored = myTrainees.filter(t => t.assessment_avg != null);
    const avgScore = scored.length
      ? Math.round(scored.reduce((s, t) => s + t.assessment_avg, 0) / scored.length)
      : 0;
    const expiringCerts = demo.certificatesInst.filter(cert => {
      if (cert.institution_id !== c.inst.id || cert.revoked || !cert.expires_at) return false;
      const d = (new Date(cert.expires_at) - Date.now()) / 86400000;
      return d > 0 && d < 90;
    });
    const upcomingSessions = demo.sessions
      .filter(s => s.institution_id === c.inst.id && s.status === 'scheduled')
      .slice(0, 5);

    return res.json({
      stats: {
        avgCompletionRate: avgCompletion,
        avgScore,
        attendanceRate: 0,
        totalTrainees: myTrainees.length,
        pendingApprovals: myReqs.filter(r => r.status === 'pending').length,
        expiringCertificates: expiringCerts.length,
        projectsSubmitted: 0,
        certificatesIssued: demo.certificatesInst.filter(cert => cert.institution_id === c.inst.id).length,
        upcomingSessions,
        auditLog: myAudit.slice(0, 30),
        totals: {
          programmes: demo.programmes.filter(pp => pp.institution_id === c.inst.id).length,
          cohorts: myCohorts.length,
          assessments: demo.assessments.filter(a => a.institution_id === c.inst.id).length,
          projects: demo.projects.filter(pp => pp.institution_id === c.inst.id).length,
          trainees: myTrainees.length,
          instructors: demo.instructors.filter(i => i.institution_id === c.inst.id).length,
        },
      },
    }), true;
  }

  /* ---------- Analytics ---------- */
  if (method === 'GET' && p === '/institution/analytics') {
    const c = ensure(); if (!c) return true;
    const myTrainees = demo.trainees.filter(t => t.institution_id === c.inst.id);
    const scored = myTrainees.filter(t => t.assessment_avg != null);
    const avgScore = scored.length ? Math.round(scored.reduce((s, t) => s + t.assessment_avg, 0) / scored.length) : 0;
    const avgCompletion = myTrainees.length
      ? Math.round(myTrainees.reduce((s, t) => s + (t.progress || 0), 0) / myTrainees.length)
      : 0;
    const budgetTotal = demo.budgetAllocations
      .filter(b => b.institution_id === c.inst.id)
      .reduce((s, b) => s + Number(b.allocated || 0), 0);
    const budgetSpent = demo.budgetAllocations
      .filter(b => b.institution_id === c.inst.id)
      .reduce((s, b) => s + Number(b.spent || 0), 0);
    const certs = demo.certificatesInst.filter(cert => cert.institution_id === c.inst.id);
    const expiring = certs.filter(cert => {
      if (cert.revoked || !cert.expires_at) return false;
      const d = (new Date(cert.expires_at) - Date.now()) / 86400000;
      return d > 0 && d < 90;
    });
    const cohortPerformance = demo.cohorts
      .filter(cc => cc.institution_id === c.inst.id)
      .map(cc => {
        const ts = demo.trainees.filter(t => t.cohort_id === cc.id);
        const avgProgress = ts.length
          ? Math.round(ts.reduce((s, t) => s + (t.progress || 0), 0) / ts.length)
          : 0;
        const avgScore2 = ts.length
          ? Math.round(ts.reduce((s, t) => s + (t.assessment_avg || 0), 0) / ts.length)
          : 0;
        const completed = ts.filter(t => t.progress >= 100).length;
        return {
          id: cc.id, name: cc.name,
          programme_title: cc.programme_title || demo.programmes.find(x => x.id === cc.programme_id)?.title,
          enrolled: ts.length, avg_progress: avgProgress, avg_score: avgScore2,
          attendance_pct: 0,
          completion_pct: ts.length ? Math.round((completed / ts.length) * 100) : 0,
        };
      });
    const instructorPerformance = demo.instructors
      .filter(i => i.institution_id === c.inst.id)
      .map(i => ({
        name: i.name, programmes: i.programme_count || 0, sessions: 0,
        avg_rating: 4.5, attendance_delta: 5, utilisation: 65,
      }));
    const campusPerf = demo.campuses
      .filter(cc => cc.institution_id === c.inst.id)
      .map(cc => ({
        campus_name: cc.name, active_trainees: cc.trainee_count || 0,
        programmes: cc.programme_count || 0, avg_progress: 60, completion_rate: 55,
      }));
    const revenueTrend = [
      { label: 'M1', value: 5200 }, { label: 'M2', value: 8100 },
      { label: 'M3', value: 7400 }, { label: 'M4', value: 9800 },
    ];
    const programmeMix = [
      { label: 'Bootcamp', value: demo.programmes.filter(pp => pp.institution_id === c.inst.id).length },
      { label: 'Short Course', value: 5 },
      { label: 'Certification', value: 3 },
      { label: 'Compliance', value: demo.complianceRules.filter(r => r.institution_id === c.inst.id).length },
    ];
    return res.json({
      overview: {
        activeTrainees: myTrainees.length,
        activeTraineesChange: 8,
        completionRate: avgCompletion,
        completionTarget: 80,
        avgScore,
        certificatesIssued: certs.length,
        certificatesExpiring: expiring.length,
        budgetUtilisation: budgetTotal ? Math.round((budgetSpent / budgetTotal) * 100) : 0,
        atRiskTrainees: demo.wellnessAlerts
          .filter(w => w.institution_id === c.inst.id && ['high', 'critical'].includes(w.severity)).length,
      },
      cohortPerformance, instructorPerformance,
      campusPerformance: campusPerf,
      trends: { revenue: revenueTrend },
      programmeMix,
    }), true;
  }

  /* ---------- Campuses ---------- */
  if (method === 'GET' && p === '/institution/campuses') {
    const c = ensure(); if (!c) return true;
    return res.json({ campuses: demo.campuses.filter(cc => cc.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/campuses') {
    const c = ensure(); if (!c) return true;
    const id = nextId('campuses');
    demo.campuses.push({
      id, institution_id: c.inst.id, ...req.body,
      trainee_count: 0, programme_count: 0, sessions_per_month: 0,
      status: 'active', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Budgets ---------- */
  if (method === 'GET' && p === '/institution/budgets') {
    const c = ensure(); if (!c) return true;
    return res.json({ budgets: demo.budgetAllocations.filter(b => b.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/budgets') {
    const c = ensure(); if (!c) return true;
    const id = nextId('budgetAllocations');
    demo.budgetAllocations.push({
      id, institution_id: c.inst.id,
      department: req.body?.department, period: req.body?.period || 'monthly',
      allocated: Number(req.body?.allocated || 0), spent: 0, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'GET' && p === '/institution/budget-transactions') {
    const c = ensure(); if (!c) return true;
    return res.json({ transactions: demo.budgetTransactions.filter(t => t.institution_id === c.inst.id) }), true;
  }

  /* ---------- Instructor marketplace / contracts ---------- */
  if (method === 'GET' && p === '/institution/instructor-marketplace') {
    const c = ensure(); if (!c) return true;
    return res.json({ instructors: demo.instructorMarketplace }), true;
  }

  if (method === 'GET' && p === '/institution/instructor-contracts') {
    const c = ensure(); if (!c) return true;
    return res.json({ contracts: demo.instructorContracts.filter(x => x.institution_id === c.inst.id) }), true;
  }

  /* ---------- Wellness ---------- */
  if (method === 'GET' && p === '/institution/wellness') {
    const c = ensure(); if (!c) return true;
    return res.json({ scores: demo.wellnessScores.filter(s => s.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/wellness/recompute') {
    const c = ensure(); if (!c) return true;
    demo.wellnessScores.filter(s => s.institution_id === c.inst.id).forEach(s => {
      s.score = Math.max(20, Math.min(100, Number(s.score) + Math.floor((Math.random() - 0.5) * 10)));
      s.risk_level = s.score >= 75 ? 'low' : s.score >= 55 ? 'medium' : s.score >= 35 ? 'high' : 'critical';
      s.computed_at = new Date();
    });
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && p === '/institution/wellness-alerts') {
    const c = ensure(); if (!c) return true;
    return res.json({
      alerts: demo.wellnessAlerts.filter(a => a.institution_id === c.inst.id && a.status === 'open'),
    }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/institution\/wellness-alerts\/(\d+)\/intervene$/))) {
    const a = demo.wellnessAlerts.find(x => x.id === Number(m[1]));
    if (a) a.status = 'intervened';
    return res.json({ ok: true }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/institution\/wellness-alerts\/(\d+)\/dismiss$/))) {
    const a = demo.wellnessAlerts.find(x => x.id === Number(m[1]));
    if (a) a.status = 'dismissed';
    return res.json({ ok: true }), true;
  }

  /* ---------- Succession ---------- */
  if (method === 'GET' && p === '/institution/succession') {
    const c = ensure(); if (!c) return true;
    return res.json({
      boxes: [],
      trainees: demo.trainees.filter(t => t.institution_id === c.inst.id),
      assignments: demo.successionAssignments.filter(a => a.institution_id === c.inst.id),
    }), true;
  }

  if (method === 'POST' && p === '/institution/succession/assign') {
    const c = ensure(); if (!c) return true;
    const boxCode = req.body?.box_code;
    const map = {
      star: { p: 'high', pt: 'high' }, high_pot: { p: 'medium', pt: 'high' },
      enigma: { p: 'low', pt: 'high' }, current_star: { p: 'high', pt: 'medium' },
      core: { p: 'medium', pt: 'medium' }, inconsistent: { p: 'low', pt: 'medium' },
      trusted: { p: 'high', pt: 'low' }, dilemma: { p: 'medium', pt: 'low' }, risk: { p: 'low', pt: 'low' },
    };
    const perf = map[boxCode] || { p: 'medium', pt: 'medium' };
    const t = demo.trainees.find(x => x.id === Number(req.body?.trainee_id));
    if (!t) return res.status(404).json({ error: 'Trainee not found' }), true;
    demo.successionAssignments = demo.successionAssignments
      .filter(a => !(a.trainee_id === t.id && a.institution_id === c.inst.id));
    demo.successionAssignments.push({
      id: nextId('successionAssignments'), institution_id: c.inst.id,
      trainee_id: t.id, trainee_name: t.name,
      box_code: boxCode, performance: perf.p, potential: perf.pt,
      created_at: new Date(),
    });
    return res.status(201).json({ ok: true }), true;
  }

  /* ---------- SSO ---------- */
  if (method === 'GET' && p === '/institution/sso') {
    const c = ensure(); if (!c) return true;
    return res.json({ config: demo.ssoConfiguration }), true;
  }

  if (method === 'PUT' && p === '/institution/sso') {
    const c = ensure(); if (!c) return true;
    Object.assign(demo.ssoConfiguration, req.body || {});
    return res.json({ ok: true }), true;
  }

  if (method === 'PUT' && p === '/institution/security-policy') {
    const c = ensure(); if (!c) return true;
    Object.assign(demo.ssoConfiguration, req.body || {});
    return res.json({ ok: true }), true;
  }

  /* ---------- API keys ---------- */
  if (method === 'GET' && p === '/institution/api-keys') {
    const c = ensure(); if (!c) return true;
    return res.json({ keys: demo.apiKeys.filter(k => k.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/api-keys') {
    const c = ensure(); if (!c) return true;
    const id = nextId('apiKeys');
    const raw = 'eh_live_' + crypto.randomBytes(20).toString('hex');
    demo.apiKeys.push({
      id, institution_id: c.inst.id,
      name: req.body?.name, prefix: raw.slice(0, 12),
      scopes: req.body?.scopes || [], revoked: 0,
      created_at: new Date(), _full_key: raw,
    });
    return res.status(201).json({ id, key: raw }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/institution\/api-keys\/(\d+)\/revoke$/))) {
    const k = demo.apiKeys.find(x => x.id === Number(m[1]));
    if (k) k.revoked = 1;
    return res.json({ ok: true }), true;
  }

  /* ---------- Webhooks ---------- */
  if (method === 'GET' && p === '/institution/webhooks') {
    const c = ensure(); if (!c) return true;
    return res.json({ webhooks: demo.webhooks.filter(w => w.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/webhooks') {
    const c = ensure(); if (!c) return true;
    const id = nextId('webhooks');
    demo.webhooks.push({
      id, institution_id: c.inst.id, url: req.body?.url,
      events: req.body?.events || [], secret: req.body?.secret || null,
      active: 1, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/institution\/webhooks\/(\d+)\/test$/))) {
    const w = demo.webhooks.find(x => x.id === Number(m[1]));
    if (!w) return res.status(404).json({ error: 'Not found' }), true;
    w.last_fired_at = new Date();
    return res.json({ ok: true, status: 200 }), true;
  }

  /* ---------- Announcements ---------- */
  if (method === 'GET' && p === '/institution/announcements') {
    const c = ensure(); if (!c) return true;
    return res.json({ announcements: demo.announcements.filter(a => a.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/announcements') {
    const c = ensure(); if (!c) return true;
    const id = nextId('announcements');
    demo.announcements.push({
      id, institution_id: c.inst.id,
      title: req.body?.title, body: req.body?.body || '',
      scope: req.body?.scope || 'all', priority: req.body?.priority || 'info',
      view_count: 0, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Skills gap ---------- */
  if (method === 'GET' && p === '/institution/skills-gap') {
    const c = ensure(); if (!c) return true;
    const skills = demo.skills.filter(s => s.institution_id === c.inst.id);
    const categories = [...new Set(skills.map(s => s.category || 'General'))].map((name, i) => ({ id: i + 1, name }));
    const topGaps = skills.map(s => {
      const ts = demo.traineeSkills.filter(x => x.skill_id === s.id);
      const avg = ts.length ? ts.reduce((a, x) => a + x.level, 0) / ts.length : 0;
      return {
        skill_name: s.name, category: s.category,
        avg_level: avg, target_level: 4,
        gap: Math.max(0, 4 - Math.round(avg)),
        affected_trainees: ts.filter(x => x.level < 3).length,
        recommendation: avg < 2.5 ? 'Add dedicated programme' : avg < 3.5 ? 'Refresher workshop' : 'Stretch assignment',
      };
    }).sort((a, b) => b.gap - a.gap);
    return res.json({
      categories, topGaps,
      departmentGaps: [],
      summary: {
        totalSkills: skills.length,
        skillsAtTarget: topGaps.filter(g => g.gap === 0).length,
        skillsBelowTarget: topGaps.filter(g => g.gap > 0).length,
        criticalGaps: topGaps.filter(g => g.gap >= 2).length,
      },
    }), true;
  }

  /* ---------- Proctored exams ---------- */
  if (method === 'GET' && p === '/institution/exam-proctor-sessions') {
    const c = ensure(); if (!c) return true;
    return res.json({ sessions: demo.examProctorSessions.filter(x => x.institution_id === c.inst.id) }), true;
  }

  if (method === 'POST' && p === '/institution/exam-proctor-sessions') {
    const c = ensure(); if (!c) return true;
    const t = demo.trainees.find(x => x.id === Number(req.body?.trainee_id));
    const id = nextId('examProctorSessions');
    demo.examProctorSessions.push({
      id, institution_id: c.inst.id,
      exam_title: req.body?.exam_title,
      trainee_id: t?.id, trainee_name: t?.name,
      scheduled_at: req.body?.scheduled_at ? new Date(req.body.scheduled_at) : new Date(),
      proctor_mode: req.body?.proctor_mode || 'webcam',
      status: 'scheduled', integrity_score: null, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Blockchain certs ---------- */
  if (method === 'GET' && p === '/institution/blockchain-certs') {
    const c = ensure(); if (!c) return true;
    return res.json({ certificates: demo.blockchainCerts }), true;
  }

  /* ---------- Fallback for any other /institution/* ---------- */
  if (p.startsWith('/institution/')) {
    const key = p.split('/').pop();
    if (/s$/.test(key)) return res.json({ [key]: [] }), true;
    return res.json({ ok: true, _demo: true }), true;
  }

  return false;
};
