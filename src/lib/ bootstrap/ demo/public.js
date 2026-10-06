/* ============================================================
   Demo mode — PUBLIC (no auth) landing page endpoints
   These power your dynamic landing page.
   ============================================================ */
const config = require('../config');
const { demo } = require('./_base');

module.exports = async function publicDemo(req, res, p) {
  const { method } = req;

  /* ---------- Aggregate landing payload ---------- */
  if (method === 'GET' && p === '/public/landing') {
    const featuredCourses = demo.courses
      .filter(c => c.status === 'published')
      .sort((a, b) => (b.enrolled_count || 0) - (a.enrolled_count || 0))
      .slice(0, 6);

    const topExperts = demo.users
      .filter(u => u.role === 'expert' && u.status === 'active')
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 6)
      .map(u => ({
        id: u.id, name: u.name, specialization: u.specialization,
        hourly_rate: u.hourly_rate, average_rating: u.average_rating,
        verified_badge: u.verified_badge,
        response_time_minutes: u.response_time_minutes,
        is_online: u.is_online,
        avatar: u.avatar,
      }));

    const upcomingEvents = demo.events
      .filter(e => e.status === 'published' && new Date(e.date) > new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 4);

    const testimonials = demo.reviews
      .filter(r => r.status === 'published' && Number(r.rating) >= 4)
      .slice(0, 6)
      .map(r => {
        const author = demo.users.find(u => u.id === r.author_id);
        return { id: r.id, rating: r.rating, comment: r.comment, author_name: author?.name || 'Anonymous' };
      });

    return res.json({
      hero: {
        headline: config.landing.headline,
        subheadline: config.landing.subheadline,
        hero_image: config.landing.heroImage,
        cta_primary: config.landing.ctaPrimary,
        cta_secondary: config.landing.ctaSecondary,
      },
      stats: config.landing.stats,
      features: config.landing.features,
      featured_courses: featuredCourses.map(c => ({
        id: c.id, title: c.title, description: c.description,
        category: c.category, course_type: c.course_type, level: c.level,
        price: c.price, thumbnail: c.thumbnail,
        average_rating: Number(c.average_rating || 0).toFixed(1),
        enrolled_count: c.enrolled_count,
        expert_name: c.expert_name,
      })),
      top_experts: topExperts,
      upcoming_events: upcomingEvents,
      testimonials: testimonials.length ? testimonials : config.landing.testimonials,
      _demo: true,
    }), true;
  }

  /* ---------- Public course catalogue ---------- */
  if (method === 'GET' && p === '/public/courses') {
    let list = demo.courses.filter(c => c.status === 'published');
    const { type, category, level, q, featured } = req.query;
    if (type) list = list.filter(c => c.course_type === type);
    if (category) list = list.filter(c => c.category === category);
    if (level) list = list.filter(c => c.level === level);
    if (featured === 'true') list = list.filter(c => c.is_featured);
    if (q) {
      const needle = String(q).toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(needle) ||
        (c.description || '').toLowerCase().includes(needle));
    }
    const page = Math.max(1, Number(req.query.page || 1));
    const per = Math.min(50, Number(req.query.per || 12));
    const total = list.length;
    const items = list.slice((page - 1) * per, page * per);

    const categories = [...new Set(demo.courses.map(c => c.category).filter(Boolean))];
    const types = [...new Set(demo.courses.map(c => c.course_type).filter(Boolean))];

    return res.json({
      courses: items,
      filters: { categories, types, levels: ['beginner', 'intermediate', 'advanced'] },
      total, page, pages: Math.max(1, Math.ceil(total / per)),
    }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/public\/courses\/(\d+)$/))) {
    const c = demo.courses.find(x => x.id === Number(m[1]) && x.status === 'published');
    if (!c) return res.status(404).json({ error: 'Course not found' }), true;
    const lessons = demo.lessons.filter(l => l.course_id === c.id).slice(0, 5);
    const modules = demo.courseModules
      .filter(md => md.course_id === c.id)
      .sort((a, b) => a.position - b.position)
      .map(md => ({
        ...md,
        lessons: demo.lessons
          .filter(l => l.module_id === md.id)
          .sort((a, b) => a.position - b.position),
      }));
    const reviews = demo.courseReviews
      .filter(r => r.course_id === c.id)
      .slice(0, 10);
    return res.json({ course: c, modules, lessons, reviews }), true;
  }

  /* ---------- Public experts ---------- */
  if (method === 'GET' && p === '/public/experts') {
    let list = demo.users.filter(u => u.role === 'expert' && u.status === 'active');
    const { q, specialization, max_rate, online } = req.query;
    if (specialization) list = list.filter(u => (u.specialization || '').toLowerCase().includes(String(specialization).toLowerCase()));
    if (max_rate) list = list.filter(u => Number(u.hourly_rate) <= Number(max_rate));
    if (online === 'true') list = list.filter(u => u.is_online);
    if (q) {
      const needle = String(q).toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(needle) ||
        (u.specialization || '').toLowerCase().includes(needle) ||
        (u.bio || '').toLowerCase().includes(needle));
    }
    list = list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    const page = Math.max(1, Number(req.query.page || 1));
    const per = Math.min(50, Number(req.query.per || 12));
    const total = list.length;
    const items = list.slice((page - 1) * per, page * per).map(u => ({
      id: u.id, name: u.name, specialization: u.specialization,
      hourly_rate: u.hourly_rate, average_rating: u.average_rating,
      verified_badge: u.verified_badge, is_online: u.is_online,
      instant_available: u.instant_available,
      response_time_minutes: u.response_time_minutes,
      bio: u.bio, avatar: u.avatar,
    }));

    const specializations = [...new Set(demo.users
      .filter(u => u.role === 'expert' && u.status === 'active')
      .map(u => u.specialization).filter(Boolean))];

    return res.json({
      experts: items, specializations,
      total, page, pages: Math.max(1, Math.ceil(total / per)),
    }), true;
  }

  if (method === 'GET' && (m = p.match(/^\/public\/experts\/(\d+)$/))) {
    const e = demo.users.find(u => u.id === Number(m[1]) && u.role === 'expert' && u.status === 'active');
    if (!e) return res.status(404).json({ error: 'Expert not found' }), true;
    const { password_hash, ...safe } = e;
    const reviews = demo.reviews
      .filter(r => r.expert_id === e.id && r.status === 'published')
      .map(r => {
        const a = demo.users.find(u => u.id === r.author_id);
        return { ...r, author_name: a?.name || 'Anonymous' };
      });
    const tiers = demo.consultationTiers.filter(t => t.expert_id === e.id);
    const slots = demo.consultationSlots
      .filter(s => s.expert_id === e.id && s.status === 'available' && new Date(s.start_time) > new Date())
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 20);
    const packages = demo.packageDefs.filter(pd => pd.expert_id === e.id);
    return res.json({ expert: safe, reviews, tiers, slots, packages }), true;
  }

  /* ---------- Public events ---------- */
  if (method === 'GET' && p === '/public/events') {
    const list = demo.events
      .filter(e => e.status === 'published')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(e => ({
        ...e,
        registered_count: demo.eventRegistrations.filter(r => r.event_id === e.id && r.status === 'registered').length,
      }));
    return res.json({ events: list }), true;
  }

  /* ---------- Public certificates verification (no auth) ---------- */
  if (method === 'GET' && p === '/public/stats') {
    return res.json({
      stats: {
        experts: demo.users.filter(u => u.role === 'expert' && u.status === 'active').length,
        learners: demo.users.filter(u => u.role === 'learner').length,
        courses: demo.courses.filter(c => c.status === 'published').length,
        institutions: demo.institutions.length,
        sessions_completed: demo.consultations.filter(c => c.status === 'completed').length,
        avg_rating: 4.9,
      },
    }), true;
  }

  if (method === 'GET' && p === '/public/health') {
    return res.json({ ok: true, demo: true, time: new Date().toISOString() }), true;
  }

  return false;
};
