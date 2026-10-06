/* ============================================================
   Demo mode — expert panel (earnings, courses, availability, etc.)
   ============================================================ */
const config = require('../config');
const { demo, nextId, currentDemoUser } = require('./_base');

module.exports = async function expertPanelDemo(req, res, p, m) {
  const { method } = req;
  const user = currentDemoUser(req);

  const isExpert = () => user && user.role === 'expert';
  const guard = () => { if (!isExpert()) { res.status(403).json({ error: 'Forbidden' }); return false; } return true; };

  /* ---------- Earnings ---------- */
  if (method === 'GET' && p === '/expert/earnings') {
    if (!guard()) return true;
    return res.json({
      summary: {
        total_earned: user.total_earnings || 0,
        available_balance: user.wallet_balance || 0,
        total_paid_out: demo.payouts
          .filter(pp => pp.expert_id === user.id && pp.status === 'paid')
          .reduce((s, pp) => s + Number(pp.amount || 0), 0),
        pending_balance: 0,
      },
      ledger: demo.walletLedger.filter(l => l.user_id === user.id),
    }), true;
  }

  /* ---------- Dashboard stats ---------- */
  if (method === 'GET' && p === '/expert/dashboard-stats') {
    if (!guard()) return true;
    const mine = demo.consultations.filter(c => c.expert_id === user.id);
    return res.json({
      stats: {
        total_consultations: mine.length,
        active_consultations: mine.filter(c => ['assigned', 'confirmed', 'in_progress', 'in_grace', 'in_session'].includes(c.status)).length,
        total_courses: demo.courses.filter(c => c.expert_id === user.id).length,
      },
    }), true;
  }

  /* ---------- Portfolio ---------- */
  if (method === 'GET' && p === '/expert/portfolio') {
    if (!guard()) return true;
    return res.json({ items: demo.expertPortfolio.filter(pp => pp.expert_id === user.id) }), true;
  }

  if (method === 'POST' && p === '/expert/portfolio') {
    if (!guard()) return true;
    const id = nextId('expertPortfolio');
    demo.expertPortfolio.push({ id, expert_id: user.id, ...req.body, created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/expert\/portfolio\/(\d+)$/))) {
    if (!guard()) return true;
    demo.expertPortfolio = demo.expertPortfolio.filter(x => !(x.id === Number(m[1]) && x.expert_id === user.id));
    return res.json({ ok: true }), true;
  }

  /* ---------- Reviews ---------- */
  if (method === 'GET' && p === '/expert/reviews') {
    if (!guard()) return true;
    const rows = demo.reviews.filter(r => r.expert_id === user.id).map(r => {
      const a = demo.users.find(u => u.id === r.author_id);
      return { ...r, author_name: a?.name || 'Anonymous' };
    });
    return res.json({ reviews: rows }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/expert\/reviews\/(\d+)\/reply$/))) {
    if (!guard()) return true;
    const r = demo.reviews.find(x => x.id === Number(m[1]) && x.expert_id === user.id);
    if (r) { r.reply = req.body?.reply || ''; r.replied_at = new Date(); }
    return res.json({ ok: true }), true;
  }

  /* ---------- Availability / time off ---------- */
  if (method === 'GET' && p === '/expert/availability') {
    if (!guard()) return true;
    return res.json({ availability: demo.availability.filter(a => a.expert_id === user.id) }), true;
  }

  if (method === 'PUT' && p === '/expert/availability') {
    if (!guard()) return true;
    demo.availability = demo.availability.filter(a => a.expert_id !== user.id);
    for (const s of (req.body?.schedule || [])) {
      demo.availability.push({
        id: nextId('availability'), expert_id: user.id,
        day_of_week: s.day, start_time: s.start, end_time: s.end, active: 1,
      });
    }
    return res.json({ ok: true }), true;
  }

  if (method === 'GET' && p === '/expert/time-off') {
    if (!guard()) return true;
    return res.json({ timeOff: demo.timeOff.filter(t => t.expert_id === user.id) }), true;
  }

  if (method === 'POST' && p === '/expert/time-off') {
    if (!guard()) return true;
    const id = nextId('timeOff');
    demo.timeOff.push({ id, expert_id: user.id, ...req.body, status: 'pending', created_at: new Date() });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Withdrawals ---------- */
  if (method === 'GET' && p === '/expert/withdrawals') {
    if (!guard()) return true;
    return res.json({ payouts: demo.payouts.filter(pp => pp.expert_id === user.id) }), true;
  }

  if (method === 'POST' && p === '/expert/withdrawals') {
    if (!guard()) return true;
    const { amount, method: pm } = req.body || {};
    if (Number(amount) < config.platform.minPayout) {
      return res.status(400).json({ error: `Minimum withdrawal ${config.platform.minPayout}` }), true;
    }
    if (Number(user.wallet_balance) < Number(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' }), true;
    }
    user.wallet_balance = Number(user.wallet_balance) - Number(amount);
    const id = nextId('payouts');
    demo.payouts.push({
      id, expert_id: user.id, expert_name: user.name,
      amount: Number(amount), method: pm, status: 'pending', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  /* ---------- Profile ---------- */
  if (method === 'PUT' && p === '/expert/profile') {
    if (!guard()) return true;
    const { specialization, hourly_rate, bio } = req.body || {};
    if (specialization !== undefined) user.specialization = specialization;
    if (hourly_rate !== undefined) user.hourly_rate = hourly_rate;
    if (bio !== undefined) user.bio = bio;
    return res.json({ ok: true }), true;
  }

  /* ---------- Course CRUD ---------- */
  if (method === 'POST' && p === '/expert/courses') {
    if (!guard()) return true;
    const id = nextId('courses');
    demo.courses.push({
      id, ...req.body, expert_id: user.id, expert_name: user.name,
      enrolled_count: 0, average_rating: 0,
      status: 'draft', created_at: new Date(),
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/expert\/courses\/(\d+)$/))) {
    if (!guard()) return true;
    const c = demo.courses.find(x => x.id === Number(m[1]) && x.expert_id === user.id);
    if (!c) return res.status(404).json({ error: 'Not found' }), true;
    Object.assign(c, req.body || {});
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/expert\/courses\/(\d+)$/))) {
    if (!guard()) return true;
    demo.courses = demo.courses.filter(x => !(x.id === Number(m[1]) && x.expert_id === user.id));
    return res.json({ ok: true }), true;
  }

  /* ---------- Lessons ---------- */
  if (method === 'POST' && (m = p.match(/^\/expert\/courses\/(\d+)\/lessons$/))) {
    if (!guard()) return true;
    const cid = Number(m[1]);
    const id = nextId('lessons');
    const pos = demo.lessons.filter(l => l.course_id === cid).length + 1;
    demo.lessons.push({
      id, course_id: cid, module_id: req.body?.module_id || null,
      title: req.body?.title, lesson_type: req.body?.lesson_type || 'video',
      duration_minutes: req.body?.duration_minutes || 10,
      content: req.body?.content || '', video_url: req.body?.video_url || null,
      is_preview: 0, position: pos, resources: '[]',
    });
    return res.status(201).json({ id }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/expert\/lessons\/(\d+)$/))) {
    if (!guard()) return true;
    const l = demo.lessons.find(x => x.id === Number(m[1]));
    if (!l) return res.status(404).json({ error: 'Not found' }), true;
    Object.assign(l, req.body || {});
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/expert\/courses\/(\d+)\/lessons\/(\d+)$/))) {
    if (!guard()) return true;
    demo.lessons = demo.lessons.filter(x => x.id !== Number(m[2]));
    return res.json({ ok: true }), true;
  }

  /* ---------- Modules ---------- */
  if (method === 'POST' && (m = p.match(/^\/expert\/courses\/(\d+)\/modules$/))) {
    if (!guard()) return true;
    const cid = Number(m[1]);
    const id = nextId('courseModules');
    const pos = demo.courseModules.filter(x => x.course_id === cid).length + 1;
    demo.courseModules.push({
      id, course_id: cid, title: req.body?.title,
      description: req.body?.description || '', position: pos,
    });
    return res.status(201).json({ id, position: pos }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/expert\/courses\/(\d+)\/modules\/(\d+)$/))) {
    if (!guard()) return true;
    const mod = demo.courseModules.find(x => x.id === Number(m[2]));
    if (!mod) return res.status(404).json({ error: 'Not found' }), true;
    Object.assign(mod, req.body || {});
    return res.json({ ok: true }), true;
  }

  if (method === 'DELETE' && (m = p.match(/^\/expert\/courses\/(\d+)\/modules\/(\d+)$/))) {
    if (!guard()) return true;
    demo.courseModules = demo.courseModules.filter(x => x.id !== Number(m[2]));
    demo.lessons = demo.lessons.filter(x => x.module_id !== Number(m[2]));
    return res.json({ ok: true }), true;
  }

  /* ---------- Questions ---------- */
  if (method === 'GET' && p === '/expert/questions') {
    if (!guard()) return true;
    return res.json({ questions: demo.expertQuestions.filter(q => q.expert_id === user.id) }), true;
  }

  if (method === 'PUT' && (m = p.match(/^\/expert\/questions\/(\d+)\/answer$/))) {
    if (!guard()) return true;
    const q = demo.expertQuestions.find(x => x.id === Number(m[1]) && x.expert_id === user.id);
    if (!q) return res.status(404).json({ error: 'Not found' }), true;
    q.answer = req.body?.answer || '';
    q.answered_at = new Date();
    return res.json({ ok: true }), true;
  }

  /* ---------- Analytics ---------- */
  if (method === 'GET' && p === '/expert/consultation-analytics') {
    if (!guard()) return true;
    const mine = demo.consultations.filter(c => c.expert_id === user.id);
    const peakMap = {};
    mine.forEach(c => {
      if (!c.scheduled_at) return;
      const hr = new Date(c.scheduled_at).getUTCHours();
      peakMap[hr] = (peakMap[hr] || 0) + 1;
    });
    const peak_hours = Object.entries(peakMap)
      .map(([hr, c]) => ({ hr: Number(hr), c }))
      .sort((a, b) => b.c - a.c);
    return res.json({
      stats: {
        completed_sessions: mine.filter(c => c.status === 'completed').length,
        unique_clients: new Set(mine.map(c => c.user_id)).size,
        avg_duration: mine.length ? mine.reduce((s, c) => s + Number(c.duration_minutes || 0), 0) / mine.length : 0,
        cancelled: mine.filter(c => c.status === 'cancelled').length,
      },
      peak_hours,
    }), true;
  }

  if (method === 'GET' && p === '/expert/course-analytics') {
    if (!guard()) return true;
    const myCourses = demo.courses.filter(c => c.expert_id === user.id);
    const courses = myCourses.map(c => {
      const enrolls = demo.enrollments.filter(e => e.course_id === c.id);
      const completed = enrolls.filter(e => Number(e.progress) >= 100).length;
      const avgProgress = enrolls.length
        ? Math.round(enrolls.reduce((s, e) => s + Number(e.progress || 0), 0) / enrolls.length)
        : 0;
      return {
        title: c.title, enrolled: enrolls.length, completed,
        avg_progress: avgProgress, avg_rating: Number(c.average_rating || 0),
        revenue: enrolls.length * Number(c.price || 0),
        completion_pct: enrolls.length ? Math.round((completed / enrolls.length) * 100) : 0,
      };
    });
    return res.json({
      totalEnrollments: courses.reduce((s, c) => s + c.enrolled, 0),
      avgCompletion: courses.length ? Math.round(courses.reduce((s, c) => s + c.avg_progress, 0) / courses.length) : 0,
      avgRating: 4.6, revenue30d: 0, courses,
      enrollmentTrend: [
        { label: 'W1', value: 12 }, { label: 'W2', value: 24 },
        { label: 'W3', value: 38 }, { label: 'W4', value: 55 },
      ],
    }), true;
  }

  return false;
};
