/* ============================================================
   Demo mode — admin panel
   ============================================================ */
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { demo, nextId, currentDemoUser } = require('./_base');

module.exports = async function adminDemo(req, res, p, m) {
  const { method } = req;
  const user = currentDemoUser(req);

  const guard = () => {
    if (!user || user.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return false; }
    return true;
  };

  /* ---------- Users ---------- */
  if (method === 'GET' && p === '/admin/users') {
    if (!guard()) return true;
    const list = demo.users.map(({ password_hash, ...u }) => u);
    return res.json({ users: list, total: list.length }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/admin\/users\/(\d+)\/(approve|suspend|reject)$/))) {
    if (!guard()) return true;
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (u) u.status = m[2] === 'approve' ? 'active' : m[2] === 'suspend' ? 'suspended' : 'rejected';
    return res.json({ ok: true }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/admin\/users\/(\d+)$/))) {
    if (!guard()) return true;
    const u = demo.users.find(x => x.id === Number(m[1]));
    if (u) Object.assign(u, req.body);
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/admin\/users\/(\d+)$/))) {
    if (!guard()) return true;
    demo.users = demo.users.filter(x => x.id !== Number(m[1]));
    return res.json({ ok: true }), true;
  }

  /* ---------- Experts ---------- */
  if (method === 'GET' && p === '/admin/experts') {
    if (!guard()) return true;
    const list = demo.users.filter(u => u.role === 'expert').map(({ password_hash, ...u }) => u);
    return res.json({ experts: list, total: list.length }), true;
  }

  if (method === 'POST' && p === '/admin/experts/create') {
    if (!guard()) return true;
    const { name, email, specialization, hourly_rate, bio, phone } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name and email required' }), true;
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' }), true;
    const tempPwd = nanoid(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const id = nextId('users');
    demo.users.push({
      id, name, email, password_hash: hash, phone: phone || '',
      role: 'expert', status: 'active', specialization,
      hourly_rate: Number(hourly_rate || 0), bio,
      wallet_balance: 0, total_earnings: 0, average_rating: 0,
      created_at: new Date(), intent: 'both',
    });
    return res.status(201).json({ id, temp_password: tempPwd }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/admin\/experts\/(\d+)\/verify-badge$/))) {
    if (!guard()) return true;
    const e = demo.users.find(x => x.id === Number(m[1]) && x.role === 'expert');
    if (e) e.verified_badge = 1;
    return res.json({ ok: true }), true;
  }

  /* ---------- Analytics ---------- */
  if (method === 'GET' && p === '/admin/analytics') {
    if (!guard()) return true;
    return res.json({
      totals: {
        total_users: demo.users.length,
        active_experts: demo.users.filter(u => u.role === 'expert' && u.status === 'active').length,
        pending_users: demo.users.filter(u => u.status === 'pending').length,
        active_consultations: demo.consultations.filter(c => ['pending', 'assigned', 'in_progress'].includes(c.status)).length,
        total_revenue: demo.transactions
          .filter(t => t.status === 'succeeded' && t.direction === 'in')
          .reduce((s, t) => s + Number(t.amount || 0), 0),
        published_courses: demo.courses.filter(c => c.status === 'published').length,
        published_events: demo.events.filter(e => e.status === 'published').length,
        institutions: demo.institutions.length,
        programmes: demo.programmes.length,
        trainees: demo.trainees.length,
      },
      usersByRole: ['admin', 'expert', 'institution', 'learner']
        .map(role => ({ role, c: demo.users.filter(u => u.role === role).length })),
      topExperts: demo.users
        .filter(u => u.role === 'expert')
        .sort((a, b) => (b.total_earnings || 0) - (a.total_earnings || 0))
        .slice(0, 10)
        .map(u => ({ id: u.id, name: u.name, average_rating: u.average_rating, total_earnings: u.total_earnings })),
      usersByMonth: [],
      revenueByMonth: [],
    }), true;
  }

  /* ---------- Transactions / payouts / coupons ---------- */
  if (method === 'GET' && p === '/admin/transactions') {
    if (!guard()) return true;
    return res.json({ transactions: demo.transactions }), true;
  }

  if (method === 'GET' && p === '/admin/payouts') {
    if (!guard()) return true;
    return res.json({
      payouts: demo.payouts.map(pp => ({
        ...pp,
        expert_name: demo.users.find(u => u.id === pp.expert_id)?.name,
      })),
    }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/admin\/payouts\/(\d+)$/))) {
    if (!guard()) return true;
    const po = demo.payouts.find(x => x.id === Number(m[1]));
    if (po) Object.assign(po, req.body);
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && p === '/admin/coupons') {
    if (!guard()) return true;
    return res.json({ coupons: demo.coupons }), true;
  }

  if (method === 'POST' && p === '/admin/coupons') {
    if (!guard()) return true;
    const id = nextId('coupons');
    demo.coupons.push({ id, ...req.body, used_count: 0, active: 1, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/admin\/coupons\/(\d+)\/toggle$/))) {
    if (!guard()) return true;
    const cp = demo.coupons.find(x => x.id === Number(m[1]));
    if (cp) cp.active = cp.active ? 0 : 1;
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/admin\/coupons\/(\d+)$/))) {
    if (!guard()) return true;
    demo.coupons = demo.coupons.filter(x => x.id !== Number(m[1]));
    return res.json({ ok: true }), true;
  }

  /* ---------- Claims / tickets / reviews / audit ---------- */
  if (method === 'GET' && p === '/admin/claims') {
    if (!guard()) return true;
    return res.json({ claims: demo.claims }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/claims\/(\d+)$/))) {
    if (!guard()) return true;
    const c = demo.claims.find(x => x.id === Number(m[1]));
    if (c) Object.assign(c, req.body);
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && p === '/admin/tickets') {
    if (!guard()) return true;
    return res.json({ tickets: demo.tickets }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/tickets\/(\d+)$/))) {
    if (!guard()) return true;
    const t = demo.tickets.find(x => x.id === Number(m[1]));
    if (t) Object.assign(t, req.body);
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && p === '/admin/reviews') {
    if (!guard()) return true;
    return res.json({ reviews: demo.reviews }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/reviews\/(\d+)$/))) {
    if (!guard()) return true;
    const r = demo.reviews.find(x => x.id === Number(m[1]));
    if (r) Object.assign(r, req.body);
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && p === '/admin/audit-logs') {
    if (!guard()) return true;
    return res.json({ logs: demo.auditLogs }), true;
  }

  if (method === 'GET' && p === '/admin/settings') {
    if (!guard()) return true;
    return res.json({ settings: demo.settings }), true;
  }
  if (method === 'PUT' && p === '/admin/settings') {
    if (!guard()) return true;
    Object.assign(demo.settings, req.body.settings || {});
    return res.json({ ok: true }), true;
  }

  /* ---------- Disputes / refunds ---------- */
  if (method === 'GET' && p === '/admin/disputes') {
    if (!guard()) return true;
    return res.json({ disputes: demo.consultationDisputes }), true;
  }
  if (method === 'PUT' && (m = p.match(/^\/admin\/disputes\/(\d+)$/))) {
    if (!guard()) return true;
    const d = demo.consultationDisputes.find(x => x.id === Number(m[1]));
    if (!d) return res.status(404).json({ error: 'Not found' }), true;
    Object.assign(d, req.body || {});
    d.resolved_at = new Date();
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && p === '/admin/consultation-analytics') {
    if (!guard()) return true;
    const byStatus = {};
    demo.consultations.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
    const topExperts = demo.users
      .filter(u => u.role === 'expert')
      .map(u => ({
        id: u.id, name: u.name, average_rating: u.average_rating,
        total_earnings: u.total_earnings,
        consultations: demo.consultations.filter(c => c.expert_id === u.id).length,
      }))
      .sort((a, b) => b.total_earnings - a.total_earnings)
      .slice(0, 10);
    const cancels = demo.consultations.filter(c => c.status === 'cancelled');
    const reasons = {};
    cancels.forEach(c => {
      const r = c.cancel_reason || 'No reason given';
      reasons[r] = (reasons[r] || 0) + 1;
    });
    return res.json({
      totals: {
        total: demo.consultations.length,
        completed: demo.consultations.filter(c => c.status === 'completed').length,
        no_shows: demo.consultations.filter(c => c.status === 'no_show').length,
        avg_price: demo.consultations.length
          ? demo.consultations.reduce((s, c) => s + Number(c.price || 0), 0) / demo.consultations.length
          : 0,
      },
      byStatus: Object.entries(byStatus).map(([label, value]) => ({ label, value })),
      topExperts,
      cancellation_reasons: Object.entries(reasons).map(([cancel_reason, c]) => ({ cancel_reason, c })),
    }), true;
  }

  if (method === 'GET' && p === '/admin/refunds') {
    if (!guard()) return true;
    return res.json({
      refunds: demo.refunds.map(r => ({
        ...r, user_name: demo.users.find(u => u.id === r.user_id)?.name,
      })),
    }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/admin\/refunds\/(\d+)$/))) {
    if (!guard()) return true;
    const r = demo.refunds.find(x => x.id === Number(m[1]));
    if (!r) return res.status(404).json({ error: 'Not found' }), true;
    Object.assign(r, req.body || {});
    r.processed_at = new Date();
    return res.json({ ok: true }), true;
  }

  /* ---------- Events CRUD ---------- */
  if (method === 'POST' && p === '/admin/events') {
    if (!guard()) return true;
    const id = nextId('events');
    demo.events.push({ id, ...req.body, status: 'published', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/admin\/events\/(\d+)$/))) {
    if (!guard()) return true;
    const ev = demo.events.find(x => x.id === Number(m[1]));
    if (ev) Object.assign(ev, req.body);
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/admin\/events\/(\d+)$/))) {
    if (!guard()) return true;
    demo.events = demo.events.filter(x => x.id !== Number(m[1]));
    return res.json({ ok: true }), true;
  }

  /* ---------- Broadcast ---------- */
  if (method === 'POST' && p === '/admin/notifications/broadcast') {
    if (!guard()) return true;
    const { title, message, audience = 'all' } = req.body || {};
    let targets = demo.users;
    if (audience === 'experts') targets = targets.filter(u => u.role === 'expert');
    if (audience === 'learners') targets = targets.filter(u => u.role === 'learner');
    if (audience === 'institutions') targets = targets.filter(u => u.role === 'institution');
    if (audience === 'admins') targets = targets.filter(u => u.role === 'admin');
    for (const u of targets) {
      demo.notifications.push({
        id: nextId('notifications'), user_id: u.id,
        title, message, type: 'broadcast', is_read: 0, created_at: new Date(),
      });
    }
    return res.json({ ok: true, sent: targets.length }), true;
  }

  /* ---------- Institutions (admin) ---------- */
  if (method === 'GET' && p === '/admin/institutions') {
    if (!guard()) return true;
    return res.json({
      institutions: demo.institutions.map(i => ({
        ...i,
        programme_count: demo.programmes.filter(x => x.institution_id === i.id).length,
      })),
    }), true;
  }

  if (method === 'POST' && p === '/admin/institutions') {
    if (!guard()) return true;
    const id = nextId('institutions');
    demo.institutions.push({
      id, ...req.body, status: 'pending',
      default_capacity: 30, pass_mark: 70, created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/admin\/institutions\/(\d+)\/(approve|reject|suspend)$/))) {
    if (!guard()) return true;
    const inst = demo.institutions.find(i => i.id === Number(m[1]));
    if (!inst) return res.status(404).json({ error: 'Not found' }), true;
    inst.status = m[2] === 'approve' ? 'active' : m[2] === 'reject' ? 'rejected' : 'suspended';
    if (inst.ops_manager_id) {
      const u = demo.users.find(x => x.id === inst.ops_manager_id);
      if (u) u.status = inst.status;
    }
    return res.json({ ok: true, status: inst.status }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/admin\/institutions\/(\d+)$/))) {
    if (!guard()) return true;
    const inst = demo.institutions.find(i => i.id === Number(m[1]));
    if (inst) Object.assign(inst, req.body);
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/admin\/institutions\/(\d+)$/))) {
    if (!guard()) return true;
    const id = Number(m[1]);
    demo.institutions = demo.institutions.filter(i => i.id !== id);
    demo.programmes = demo.programmes.filter(x => x.institution_id !== id);
    demo.cohorts = demo.cohorts.filter(x => x.institution_id !== id);
    demo.trainees = demo.trainees.filter(x => x.institution_id !== id);
    return res.json({ ok: true }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/admin\/institutions\/(\d+)\/ops-manager$/))) {
    if (!guard()) return true;
    const inst = demo.institutions.find(i => i.id === Number(m[1]));
    if (!inst) return res.status(404).json({ error: 'Not found' }), true;
    const { name, email } = req.body || {};
    if (demo.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' }), true;
    const tempPwd = nanoid(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const uid = nextId('users');
    demo.users.push({
      id: uid, name, email, password_hash: hash,
      role: 'institution', status: 'active',
      institution_id: inst.id, institution_role: 'operations_manager', intent: 'both',
      created_at: new Date(),
    });
    inst.ops_manager_id = uid;
    inst.ops_manager_name = name;
    inst.ops_manager_email = email;
    return res.status(201).json({ id: uid, temp_password: tempPwd }), true;
  }

  return false;
};
