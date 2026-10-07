/* ============================================================
   Demo mode — consultation booking & lifecycle
   ============================================================ */
const config = require('../config');
const { demo, nextId, currentDemoUser } = require('./_base');

module.exports = async function consultationsDemo(req, res, p, m) {
  const { method } = req;
  const user = currentDemoUser(req);

  /* ---------- Book ---------- */
  if (method === 'POST' && p === '/consultations/book') {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { expert_id, slot_id, title, description, consultation_type, duration_minutes } = req.body || {};
    const expert = demo.users.find(u => u.id === Number(expert_id) && u.role === 'expert');
    if (!expert) return res.status(404).json({ error: 'Expert not found' }), true;

    let slot = null;
    if (slot_id) {
      slot = demo.consultationSlots.find(s => s.id === Number(slot_id) && s.status === 'available');
      if (!slot) return res.status(409).json({ error: 'Slot no longer available' }), true;
      slot.status = 'booked';
    }
    const price = slot?.price || (duration_minutes || 30) * (expert.hourly_rate / 60);
    const id = nextId('consultations');
    const c = {
      id, user_id: user.id, expert_id: expert.id,
      client_name: user.name, client_email: user.email,
      expert_name: expert.name, expert_email: expert.email,
      expert_specialization: expert.specialization,
      title: title || 'Consultation', description: description || '',
      status: 'pending_expert_confirmation',
      consultation_type: consultation_type || 'video',
      session_type: 'scheduled',
      price: Math.round(price * 100) / 100,
      duration_minutes: duration_minutes || slot?.duration_minutes || 30,
      payment_status: 'held', slot_id: slot?.id || null,
      scheduled_at: slot?.start_time || null,
      created_at: new Date(),
    };
    demo.consultations.push(c);

    demo.notifications.push({
      id: nextId('notifications'), user_id: expert.id,
      title: 'New booking request',
      message: `${user.name} wants a ${c.duration_minutes}m session.`,
      type: 'booking', is_read: 0, created_at: new Date(),
    });
    return res.status(201).json(c), true;
  }

  /* ---------- Match ---------- */
  if (method === 'POST' && p === '/consultations/match') {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { problemText, budget } = req.body || {};
    const text = String(problemText || '').toLowerCase();
    const experts = demo.users.filter(u => u.role === 'expert' && u.status === 'active');
    const scored = experts.map(e => {
      let score = Number(e.average_rating || 0);
      const spec = String(e.specialization || '').toLowerCase();
      if (spec && text.includes(spec.split(' ')[0])) score += 5;
      if (!budget || Number(e.hourly_rate) <= Number(budget)) score += 1;
      return { ...e, _score: score, password_hash: undefined };
    }).sort((a, b) => b._score - a._score).slice(0, 5);
    return res.json({ matches: scored }), true;
  }

  /* ---------- Instant ---------- */
  if (method === 'POST' && p === '/consultations/instant') {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const expert = demo.users.find(u => u.role === 'expert' && u.status === 'active' && u.instant_available);
    if (!expert) return res.status(404).json({ error: 'No expert available right now' }), true;
    const id = nextId('consultations');
    const c = {
      id, user_id: user.id, expert_id: expert.id,
      client_name: user.name, client_email: user.email,
      expert_name: expert.name, expert_email: expert.email,
      expert_specialization: expert.specialization,
      title: req.body?.topic || 'Instant consultation',
      description: '', status: 'in_session', session_type: 'instant',
      consultation_type: 'video', price: expert.hourly_rate / 2,
      duration_minutes: 15, payment_status: 'held',
      scheduled_at: new Date(), created_at: new Date(),
    };
    demo.consultations.push(c);
    return res.status(201).json({ ...c, expert }), true;
  }

  /* ---------- Confirm ---------- */
  if (method === 'PUT' && (m = p.match(/^\/consultations\/(\d+)\/confirm$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.consultations.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    if (c.expert_id !== user.id && user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }), true;
    c.status = 'confirmed';
    return res.json({ ok: true }), true;
  }

  /* ---------- Start ---------- */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/start$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.consultations.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    c.status = 'in_session';
    c.started_at = new Date();
    return res.json({ ok: true }), true;
  }

  /* ---------- Complete ---------- */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/complete$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.consultations.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    c.status = 'completed';
    c.completed_at = new Date();
    c.payment_status = 'released';
    if (c.expert_id) {
      const expert = demo.users.find(u => u.id === c.expert_id);
      if (expert) {
        const cut = Number(c.price) * ((100 - config.platform.commission) / 100);
        expert.wallet_balance = Number(expert.wallet_balance || 0) + cut;
        expert.total_earnings = Number(expert.total_earnings || 0) + cut;
        demo.walletLedger.push({
          id: nextId('walletLedger'), user_id: expert.id,
          amount: cut, balance_after: expert.wallet_balance,
          reason: `Consultation: ${c.title}`, created_at: new Date(),
        });
      }
    }
    return res.json({ ok: true }), true;
  }

  /* ---------- Reschedule ---------- */
  if (method === 'PUT' && (m = p.match(/^\/consultations\/(\d+)\/reschedule$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.consultations.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    const slot = demo.consultationSlots.find(s => s.id === Number(req.body?.new_slot_id) && s.status === 'available');
    if (!slot) return res.status(409).json({ error: 'Slot not available' }), true;
    if (c.slot_id) {
      const old = demo.consultationSlots.find(s => s.id === c.slot_id);
      if (old) old.status = 'available';
    }
    slot.status = 'booked';
    c.slot_id = slot.id;
    c.scheduled_at = slot.start_time;
    c.reschedule_count = (c.reschedule_count || 0) + 1;
    return res.json({ ok: true }), true;
  }

  /* ---------- Cancel ---------- */
  if (method === 'PUT' && (m = p.match(/^\/consultations\/(\d+)\/cancel$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.consultations.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    c.status = 'cancelled';
    c.cancel_reason = req.body?.reason || null;
    if (c.slot_id) {
      const slot = demo.consultationSlots.find(s => s.id === c.slot_id);
      if (slot) slot.status = 'available';
    }
    return res.json({ ok: true }), true;
  }

  /* ---------- Review ---------- */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/review$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.consultations.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    const id = nextId('reviews');
    demo.reviews.push({
      id, expert_id: c.expert_id, author_id: user.id, consultation_id: c.id,
      rating: Number(req.body?.rating || 5),
      comment: req.body?.comment || '',
      status: 'published', created_at: new Date(),
    });
    c.reviewed = 1;
    return res.status(201).json({ id }), true;
  }

  /* ---------- Tip ---------- */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/tip$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.consultations.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    const amount = Number(req.body?.amount || 0);
    if (amount <= 0) return res.status(400).json({ error: 'Amount required' }), true;
    const expert = demo.users.find(u => u.id === c.expert_id);
    if (expert) {
      expert.wallet_balance = Number(expert.wallet_balance || 0) + amount;
      expert.total_earnings = Number(expert.total_earnings || 0) + amount;
      demo.walletLedger.push({
        id: nextId('walletLedger'), user_id: expert.id,
        amount, balance_after: expert.wallet_balance,
        reason: 'Tip from client', created_at: new Date(),
      });
    }
    return res.json({ ok: true }), true;
  }

  /* ---------- Dispute ---------- */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/dispute$/))) {
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.consultations.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    const id = nextId('consultationDisputes');
    demo.consultationDisputes.push({
      id, consultation_id: c.id, consultation_title: c.title,
      opener_id: user.id, opener_name: user.name,
      expert_id: c.expert_id, expert_name: c.expert_name,
      reason: req.body?.reason || 'other',
      description: req.body?.description || '',
      status: 'open', opened_at: new Date(),
    });
    c.status = 'disputed';
    c.disputed = 1;
    return res.status(201).json({ id }), true;
  }

  return false;
};
