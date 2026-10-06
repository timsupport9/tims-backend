/* ============================================================
   Demo mode — learner / user panel
   ============================================================ */
const { demo, nextId, currentDemoUser } = require('./_base');

module.exports = async function userDemo(req, res, p, m) {
  const { method } = req;
  const user = currentDemoUser(req);

  const needAuth = () => {
    if (!user) { res.status(401).json({ error: 'Invalid or expired token' }); return false; }
    return true;
  };

  /* ---------- Enrollments ---------- */
  if (method === 'GET' && p === '/user/enrollments') {
    if (!needAuth()) return true;
    return res.json({ enrollments: demo.enrollments.filter(e => e.user_id === user.id) }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/user\/enrollments\/(\d+)\/progress$/))) {
    if (!needAuth()) return true;
    const enr = demo.enrollments.find(e => e.id === Number(m[1]) && e.user_id === user.id);
    if (!enr) return res.status(404).json({ error: 'Enrollment not found' }), true;
    enr.progress = req.body?.progress || 0;
    if (enr.progress >= 100) {
      enr.status = 'completed';
      const serial = `EH-${Date.now().toString(36).toUpperCase()}`;
      demo.certificates.push({
        id: nextId('certificates'), user_id: user.id,
        course_title: enr.title, serial, issued_at: new Date(),
      });
    }
    return res.json({ ok: true }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/user\/enrollments\/(\d+)\/refund$/))) {
    if (!needAuth()) return true;
    const enr = demo.enrollments.find(e => e.id === Number(m[1]) && e.user_id === user.id);
    if (!enr) return res.status(404).json({ error: 'Enrollment not found' }), true;
    const r = {
      id: nextId('refunds'), user_id: user.id, enrollment_id: enr.id,
      course_title: enr.title, amount: 0, reason: req.body?.reason || '',
      status: 'requested', requested_at: new Date(),
    };
    demo.refunds.push(r);
    return res.status(201).json({ id: r.id }), true;
  }

  if (method === 'GET' && p === '/user/refunds') {
    if (!needAuth()) return true;
    return res.json({ refunds: demo.refunds.filter(r => r.user_id === user.id) }), true;
  }

  /* ---------- Certificates ---------- */
  if (method === 'GET' && p === '/user/certificates') {
    if (!needAuth()) return true;
    return res.json({ certificates: demo.certificates.filter(c => c.user_id === user.id) }), true;
  }

  /* ---------- Wishlist ---------- */
  if (method === 'GET' && p === '/user/wishlist') {
    if (!needAuth()) return true;
    return res.json({ items: demo.wishlist.filter(w => w.user_id === user.id) }), true;
  }

  if (method === 'POST' && p === '/user/wishlist/toggle') {
    if (!needAuth()) return true;
    const cid = Number(req.body?.course_id);
    const idx = demo.wishlist.findIndex(w => w.user_id === user.id && w.course_id === cid);
    if (idx >= 0) demo.wishlist.splice(idx, 1);
    else demo.wishlist.push({ id: nextId('wishlist'), user_id: user.id, course_id: cid, added_at: new Date() });
    return res.json({ ok: true }), true;
  }

  /* ---------- XP / badges / streak ---------- */
  if (method === 'GET' && p === '/user/xp') {
    if (!needAuth()) return true;
    const xp = demo.userXP[user.id] || 0;
    const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
    const streak = demo.userStreak[user.id] || { current: 0, longest: 0 };
    return res.json({ xp, level, current_streak: streak.current, longest_streak: streak.longest }), true;
  }

  if (method === 'GET' && p === '/user/badges') {
    if (!needAuth()) return true;
    return res.json({ badges: demo.userBadges.filter(b => b.user_id === user.id) }), true;
  }

  /* ---------- Learning paths / bundles ---------- */
  if (method === 'GET' && p === '/user/learning-paths') {
    if (!needAuth()) return true;
    return res.json({ paths: demo.learningPathsCatalog }), true;
  }

  if (method === 'GET' && p === '/user/bundles') {
    if (!needAuth()) return true;
    return res.json({ bundles: demo.courseBundles }), true;
  }

  /* ---------- Watch history ---------- */
  if (method === 'GET' && p === '/user/watch-history') {
    if (!needAuth()) return true;
    return res.json({ history: demo.watchHistory.filter(w => w.user_id === user.id) }), true;
  }

  /* ---------- Course reviews ---------- */
  if (method === 'POST' && p === '/user/course-reviews') {
    if (!needAuth()) return true;
    const r = {
      id: nextId('courseReviews'), user_id: user.id,
      course_id: Number(req.body?.course_id),
      content_rating: Number(req.body?.content_rating || 0),
      instructor_rating: Number(req.body?.instructor_rating || 0),
      value_rating: Number(req.body?.value_rating || 0),
      would_recommend: req.body?.would_recommend ? 1 : 0,
      comment: req.body?.comment || '', created_at: new Date(),
    };
    demo.courseReviews.push(r);
    return res.status(201).json({ id: r.id }), true;
  }

  if (method === 'GET' && p === '/user/course-reviews') {
    if (!needAuth()) return true;
    return res.json({ reviews: demo.courseReviews.filter(r => r.user_id === user.id) }), true;
  }

  /* ---------- Wallet ---------- */
  if (method === 'GET' && p === '/user/wallet') {
    if (!needAuth()) return true;
    const ledger = demo.walletLedger.filter(l => l.user_id === user.id);
    return res.json({ balance: Number(user.wallet_balance) || 0, ledger }), true;
  }

  if (method === 'POST' && p === '/user/wallet/topup') {
    if (!needAuth()) return true;
    const { amount, provider } = req.body || {};
    user.wallet_balance = Number(user.wallet_balance) + Number(amount);
    demo.walletLedger.push({
      id: nextId('walletLedger'), user_id: user.id,
      amount: Number(amount), balance_after: user.wallet_balance,
      reason: 'Wallet top-up', created_at: new Date(),
    });
    const ref = `TOP-${Date.now().toString(36).toUpperCase()}`;
    demo.transactions.push({
      id: nextId('transactions'), user_id: user.id, user_name: user.name,
      reference: ref, description: 'Wallet top-up',
      amount: Number(amount), provider: provider || 'demo',
      status: 'succeeded', direction: 'in', created_at: new Date(),
    });
    return res.json({ ok: true, balance: user.wallet_balance, reference: ref }), true;
  }

  if (method === 'GET' && p === '/user/transactions') {
    if (!needAuth()) return true;
    return res.json({ transactions: demo.transactions.filter(t => t.user_id === user.id) }), true;
  }

  /* ---------- Preferences ---------- */
  if (method === 'GET' && p === '/user/preferences') {
    if (!needAuth()) return true;
    return res.json({ intent: user.intent || 'both' }), true;
  }

  if (method === 'PUT' && p === '/user/preferences') {
    if (!needAuth()) return true;
    if (['learn', 'consult', 'both'].includes(req.body?.intent)) user.intent = req.body.intent;
    return res.json({ ok: true, intent: user.intent }), true;
  }

  /* ---------- Profile ---------- */
  if (method === 'PUT' && p === '/user/profile') {
    if (!needAuth()) return true;
    const { name, phone, timezone, intent } = req.body || {};
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (timezone !== undefined) user.timezone = timezone;
    if (intent !== undefined && ['learn', 'consult', 'both'].includes(intent)) user.intent = intent;
    const { password_hash, ...safe } = user;
    return res.json({ ok: true, user: safe }), true;
  }

  /* ---------- Shortlist / packages ---------- */
  if (method === 'GET' && p === '/user/shortlist') {
    if (!needAuth()) return true;
    const list = demo.userShortlist
      .filter(s => s.user_id === user.id)
      .map(s => {
        const e = demo.users.find(u => u.id === s.expert_id);
        if (!e) return null;
        return { expert_id: e.id, name: e.name, specialization: e.specialization, hourly_rate: e.hourly_rate, average_rating: e.average_rating };
      })
      .filter(Boolean);
    return res.json({ shortlist: list }), true;
  }

  if (method === 'POST' && p === '/user/shortlist/toggle') {
    if (!needAuth()) return true;
    const eid = Number(req.body?.expert_id);
    const idx = demo.userShortlist.findIndex(s => s.user_id === user.id && s.expert_id === eid);
    if (idx >= 0) demo.userShortlist.splice(idx, 1);
    else demo.userShortlist.push({ id: nextId('userShortlist'), user_id: user.id, expert_id: eid, created_at: new Date() });
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && p === '/user/packages') {
    if (!needAuth()) return true;
    const list = demo.userPackages.filter(x => x.user_id === user.id).map(x => {
      const def = demo.packageDefs.find(pd => pd.id === x.package_id) || {};
      const expert = demo.users.find(u => u.id === def.expert_id);
      return { ...x, package_name: def.name, expert_name: expert?.name, sessions_total: def.sessions_count };
    });
    return res.json({ packages: list }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/packages\/(\d+)\/purchase$/))) {
    if (!needAuth()) return true;
    const def = demo.packageDefs.find(pd => pd.id === Number(m[1]));
    if (!def) return res.status(404).json({ error: 'Package not found' }), true;
    demo.userPackages.push({
      id: nextId('userPackages'), user_id: user.id, package_id: def.id,
      sessions_remaining: def.sessions_count,
      expires_at: new Date(Date.now() + 180 * 86400000),
      created_at: new Date(),
    });
    return res.status(201).json({ ok: true }), true;
  }

  /* ---------- Claims / tickets / reviews ---------- */
  if (method === 'POST' && p === '/user/claims') {
    if (!needAuth()) return true;
    const id = nextId('claims');
    demo.claims.push({ id, user_id: user.id, ...req.body, status: 'open', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  if (method === 'GET' && p === '/user/claims') {
    if (!needAuth()) return true;
    return res.json({ claims: demo.claims.filter(c => c.user_id === user.id) }), true;
  }

  if (method === 'POST' && p === '/user/tickets') {
    if (!needAuth()) return true;
    const ref = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const id = nextId('tickets');
    demo.tickets.push({ id, user_id: user.id, user_name: user.name, reference: ref, ...req.body, status: 'open', created_at: new Date() });
    return res.status(201).json({ id, reference: ref }), true;
  }

  if (method === 'GET' && p === '/user/tickets') {
    if (!needAuth()) return true;
    return res.json({ tickets: demo.tickets.filter(t => t.user_id === user.id) }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/user\/tickets\/(\d+)\/replies$/))) {
    if (!needAuth()) return true;
    demo.ticketReplies.push({
      id: nextId('ticketReplies'), ticket_id: Number(m[1]),
      user_id: user.id, message: req.body?.message || '', created_at: new Date(),
    });
    return res.status(201).json({ ok: true }), true;
  }

  if (method === 'POST' && p === '/user/reviews') {
    if (!needAuth()) return true;
    const id = nextId('reviews');
    demo.reviews.push({ id, author_id: user.id, ...req.body, status: 'published', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  /* ---------- GDPR ---------- */
  if (method === 'GET' && p === '/user/gdpr-export') {
    if (!needAuth()) return true;
    const payload = {
      user: { ...user, password_hash: undefined },
      enrollments: demo.enrollments.filter(e => e.user_id === user.id),
      consultations: demo.consultations.filter(c => c.user_id === user.id),
      transactions: demo.transactions.filter(t => t.user_id === user.id),
      certificates: demo.certificates.filter(c => c.user_id === user.id),
      notifications: demo.notifications.filter(n => n.user_id === user.id),
      tickets: demo.tickets.filter(t => t.user_id === user.id),
      claims: demo.claims.filter(c => c.user_id === user.id),
      exported_at: new Date(),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-${user.id}.json"`);
    return res.send(JSON.stringify(payload, null, 2)), true;
  }

  if (method === 'POST' && p === '/user/gdpr-delete') {
    if (!needAuth()) return true;
    user.status = 'suspended';
    user.deletion_requested_at = new Date();
    return res.json({ ok: true, message: 'Account scheduled for deletion in 30 days' }), true;
  }

  /* ---------- Browse experts ---------- */
  if (method === 'GET' && p === '/user/experts') {
    if (!needAuth()) return true;
    const list = demo.users
      .filter(u => u.role === 'expert' && u.status === 'active')
      .map(u => ({
        id: u.id, name: u.name, email: u.email, avatar: u.avatar, bio: u.bio,
        specialization: u.specialization, hourly_rate: u.hourly_rate,
        average_rating: u.average_rating, is_online: u.is_online,
        instant_available: u.instant_available,
        response_time_minutes: u.response_time_minutes,
        verified_badge: u.verified_badge,
      }));
    return res.json({ experts: list, total: list.length }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/user\/experts\/(\d+)$/))) {
    if (!needAuth()) return true;
    const e = demo.users.find(u => u.id === Number(m[1]) && u.role === 'expert');
    if (!e) return res.status(404).json({ error: 'Expert not found' }), true;
    const { password_hash, ...safe } = e;
    return res.json({
      expert: safe,
      reviews: demo.reviews.filter(r => r.expert_id === e.id),
      availability: demo.consultationSlots.filter(s => s.expert_id === e.id && s.status === 'available'),
    }), true;
  }

  return false;
};
