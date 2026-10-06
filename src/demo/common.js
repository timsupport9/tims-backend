/* ============================================================
   Demo mode — common (notifications, events, consultations I/O)
   ============================================================ */
const { demo, nextId, currentDemoUser } = require('./_base');

module.exports = async function commonDemo(req, res, p, m) {
  const { method } = req;

  /* ---------- Notifications ---------- */
  if (method === 'GET' && p === '/common/notifications') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const mine = demo.notifications.filter(n => n.user_id === null || n.user_id === user.id);
    const rows = [...mine]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
    const unread = mine.filter(n => !n.is_read).length;
    return res.json({ notifications: rows, unread }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/common\/notifications\/(\d+)\/read$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const n = demo.notifications.find(x => x.id === Number(m[1]));
    if (n) n.is_read = 1;
    return res.json({ ok: true }), true;
  }

  if (method === 'PUT' && p === '/common/notifications/read-all') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    demo.notifications.forEach(n => { if (n.user_id === user.id) n.is_read = 1; });
    return res.json({ ok: true }), true;
  }

  /* ---------- Events ---------- */
  if (method === 'GET' && p === '/common/events') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const events = demo.events
      .filter(e => e.status === 'published')
      .map(e => ({
        ...e,
        registered_count: demo.eventRegistrations.filter(r => r.event_id === e.id && r.status === 'registered').length,
      }));
    return res.json({ events }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/common\/events\/(\d+)\/register$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const eventId = Number(m[1]);
    const ev = demo.events.find(e => e.id === eventId);
    if (!ev) return res.status(404).json({ error: 'Event not found' }), true;
    const existing = demo.eventRegistrations.find(r => r.event_id === eventId && r.user_id === user.id);
    if (existing) existing.status = 'registered';
    else demo.eventRegistrations.push({
      id: nextId('eventRegistrations'), event_id: eventId,
      user_id: user.id, status: 'registered', created_at: new Date(),
    });
    return res.json({ ok: true }), true;
  }

  /* ---------- Consultations ---------- */
  if (method === 'GET' && p === '/common/consultations') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    let list = demo.consultations.slice();
    if (user.role === 'expert') list = list.filter(c => c.expert_id === user.id);
    else if (user.role === 'learner') list = list.filter(c => c.user_id === user.id);
    return res.json({ consultations: list }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/common\/consultations\/(\d+)\/messages$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const cid = Number(m[1]);
    const msgs = demo.consultationMessages
      .filter(x => x.consultation_id === cid)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return res.json({ messages: msgs }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/common\/consultations\/(\d+)\/messages$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const cid = Number(m[1]);
    const c = demo.consultations.find(x => x.id === cid);
    if (!c) return res.status(404).json({ error: 'Consultation not found' }), true;
    const msg = {
      id: nextId('consultationMessages'), consultation_id: cid,
      sender_id: user.id, sender_name: user.name,
      message: req.body?.message || '', attachment_url: null,
      created_at: new Date(), read_at: null,
    };
    demo.consultationMessages.push(msg);
    return res.status(201).json({ id: msg.id }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/common\/consultations\/(\d+)\/attachments$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const cid = Number(m[1]);
    const msg = {
      id: nextId('consultationMessages'), consultation_id: cid,
      sender_id: user.id, sender_name: user.name,
      message: '', attachment_url: '/uploads/demo-attachment',
      created_at: new Date(),
    };
    demo.consultationMessages.push(msg);
    return res.json({ ok: true }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/common\/consultations\/(\d+)\/assign$/))) {
    const user = currentDemoUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    const c = demo.consultations.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    const expert = demo.users.find(u => u.id === Number(req.body?.expert_id) && u.role === 'expert');
    if (!expert) return res.status(404).json({ error: 'Expert not found' }), true;
    c.expert_id = expert.id;
    c.expert_name = expert.name;
    c.expert_email = expert.email;
    c.expert_specialization = expert.specialization;
    c.status = 'pending_expert_confirmation';
    return res.json({ ok: true }), true;
  }

  return false;
};
