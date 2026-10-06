/* ============================================================
   Demo mode — expert slots / tiers / packages (both public & self)
   ============================================================ */
const { demo, nextId, currentDemoUser } = require('./_base');

module.exports = async function expertsDemo(req, res, p, m) {
  const { method } = req;
  const user = currentDemoUser(req);

  /* ---------- Public reads for a given expert ---------- */
  if (method === 'GET' && (m = p.match(/^\/experts\/(\d+)\/questions$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ questions: demo.expertQuestions.filter(q => q.expert_id === Number(m[1])) }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/experts\/(\d+)\/slots$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const list = demo.consultationSlots.filter(s => s.expert_id === Number(m[1]));
    return res.json({ slots: list }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/experts\/(\d+)\/tiers$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ tiers: demo.consultationTiers.filter(t => t.expert_id === Number(m[1])) }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/experts\/(\d+)\/packages$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ packages: demo.packageDefs.filter(pd => pd.expert_id === Number(m[1])) }), true;
  }

  /* ---------- Expert self — slots ---------- */
  if (method === 'GET' && p === '/experts/me/slots') {
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ slots: demo.consultationSlots.filter(s => s.expert_id === user.id) }), true;
  }

  if (method === 'POST' && p === '/experts/me/slots') {
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    const slots = req.body?.slots || [];
    let created = 0;
    for (const s of slots) {
      demo.consultationSlots.push({
        id: nextId('consultationSlots'), expert_id: user.id,
        start_time: new Date(s.start), end_time: new Date(s.end),
        duration_minutes: s.duration || 30, price: s.price || user.hourly_rate || 0,
        status: 'available', created_at: new Date(),
      });
      created++;
    }
    return res.json({ ok: true, created }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/experts\/me\/slots\/(\d+)$/))) {
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    demo.consultationSlots = demo.consultationSlots.filter(s => !(s.id === Number(m[1]) && s.expert_id === user.id));
    return res.json({ ok: true }), true;
  }

  /* ---------- Expert self — tiers ---------- */
  if (method === 'GET' && p === '/experts/me/tiers') {
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ tiers: demo.consultationTiers.filter(t => t.expert_id === user.id) }), true;
  }

  if (method === 'PUT' && p === '/experts/me/tiers') {
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    demo.consultationTiers = demo.consultationTiers.filter(t => t.expert_id !== user.id);
    for (const t of (req.body?.tiers || [])) {
      demo.consultationTiers.push({
        id: nextId('consultationTiers'), expert_id: user.id,
        name: t.name, duration_minutes: t.duration_minutes,
        price: t.price, description: t.description || '',
      });
    }
    return res.json({ ok: true }), true;
  }

  if (method === 'POST' && p === '/experts/me/block-time') {
    if (!user || user.role !== 'expert') return res.status(403).json({ error: 'Forbidden' }), true;
    return res.json({ ok: true }), true;
  }

  return false;
};
