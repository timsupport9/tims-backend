/* ============================================================
   Public routes — no authentication required.
   - /api/verify/:serial            certificate verification
   - /api/auth/setup-account        account activation via invite
   - /api/public/landing            dynamic landing page payload
   - /api/public/courses            public catalogue
   - /api/public/courses/:id        public course detail
   - /api/public/experts            public expert list
   - /api/public/experts/:id        public expert profile
   - /api/public/events             public events
   - /api/public/stats              platform stats
   ============================================================ */
const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const config = require('../config');
const ctx = require('../context');
const { asyncH, validate, safeRoute } = require('../lib/helpers');
const { poolOrThrow } = require('../lib/db');

const router = express.Router();

/* ============================================================
   Certificate verification (public)
   ============================================================ */
router.get('/verify/:serial', asyncH(async (req, res) => {
  const serial = req.params.serial;

  /* Demo mode branch */
  if (ctx.demo.active) {
    const c = ctx.demo.certificatesInst.find(x => x.serial === serial && !x.revoked);
    const c2 = ctx.demo.certificates.find(x => x.serial === serial);
    if (!c && !c2) return res.status(404).json({ valid: false, error: 'Certificate not found' });

    if (c) {
      const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
      const bc = ctx.demo.blockchainCerts.find(b => b.serial === serial);
      return res.json({
        valid: !isExpired, status: isExpired ? 'expired' : 'valid',
        certificate: {
          trainee_name: c.trainee_name,
          institution_name: 'Acme Academy',
          title: c.title, awarding_body: c.awarding_body,
          cpd_points: c.cpd_points, issued_at: c.issued_at,
          expires_at: c.expires_at, serial: c.serial,
          blockchain_hash: bc ? bc.blockchain_hash : null,
        },
      });
    }
    return res.json({ valid: true, status: 'valid', certificate: c2 });
  }

  /* DB branch */
  try {
    const pool = poolOrThrow();
    const [[c]] = await pool.query(
      `SELECT c.*, u.name AS trainee_name, i.name AS institution_name
         FROM institution_certificates c
         JOIN users u ON u.id = c.trainee_id
         LEFT JOIN institutions i ON i.id = c.institution_id
        WHERE c.serial = ? AND c.revoked = 0`,
      [serial]
    );
    if (!c) return res.status(404).json({ valid: false, error: 'Certificate not found' });
    const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
    res.json({
      valid: !isExpired, status: isExpired ? 'expired' : 'valid',
      certificate: {
        trainee_name: c.trainee_name, institution_name: c.institution_name,
        title: c.title, awarding_body: c.awarding_body,
        cpd_points: c.cpd_points, issued_at: c.issued_at,
        expires_at: c.expires_at, serial: c.serial,
        blockchain_hash: c.blockchain_hash || null,
      },
    });
  } catch {
    res.status(503).json({ valid: false, error: 'Service unavailable' });
  }
}));

/* ============================================================
   Account setup (invite acceptance, public)
   ============================================================ */
router.post('/auth/setup-account', [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
], validate, asyncH(async (req, res) => {
  if (ctx.demo.active) {
    const u = ctx.demo.users.find(x => x.email === req.body.email);
    if (!u) return res.status(404).json({ error: 'No pending invitation found' });
    u.password_hash = await bcrypt.hash(req.body.password, 10);
    u.lifecycle_status = 'active';
    return res.json({ ok: true, message: 'Account activated' });
  }

  const pool = poolOrThrow();
  const { email, password, token } = req.body;
  const [[u]] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  if (!u) return res.status(404).json({ error: 'No pending invitation found' });

  if (token) {
    const [[row]] = await pool.query(
      'SELECT * FROM password_resets WHERE token=? AND user_id=? AND used=0',
      [token, u.id]
    );
    if (!row) return res.status(400).json({ error: 'Invalid invitation link' });
    await pool.query('UPDATE password_resets SET used=1 WHERE id=?', [row.id]);
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "UPDATE users SET password_hash=?, lifecycle_status='active', accepted_at=NOW() WHERE id=?",
    [hash, u.id]
  );
  res.json({ ok: true, message: 'Account activated' });
}));

/* ============================================================
   DYNAMIC LANDING PAGE
   ============================================================ */

router.get('/public/landing', asyncH(async (req, res) => {
  /* Demo mode */
  if (ctx.demo.active) {
    const { demo } = require('../lib/demo-store');

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
        is_online: u.is_online, avatar: u.avatar,
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
    });
  }

  /* DB mode — aggregate from tables, tolerate missing tables */
  try {
    const pool = poolOrThrow();

    const [featuredCourses] = await pool.query(
      `SELECT c.id, c.title, c.description, c.category, c.course_type, c.level,
              c.price, c.thumbnail, c.average_rating, c.enrolled_count,
              u.name expert_name
         FROM courses c
         LEFT JOIN users u ON u.id = c.expert_id
        WHERE c.status = 'published'
        ORDER BY c.enrolled_count DESC LIMIT 6`
    ).catch(() => [[]]);

    const [topExperts] = await pool.query(
      `SELECT id, name, specialization, hourly_rate, average_rating,
              verified_badge, response_time_minutes, avatar
         FROM users
        WHERE role = 'expert' AND status = 'active'
        ORDER BY average_rating DESC LIMIT 6`
    ).catch(() => [[]]);

    const [upcomingEvents] = await pool.query(
      `SELECT id, title, description, category, date, capacity, price
         FROM events
        WHERE status = 'published' AND date > NOW()
        ORDER BY date ASC LIMIT 4`
    ).catch(() => [[]]);

    const [testimonials] = await pool.query(
      `SELECT r.id, r.rating, r.comment, u.name author_name
         FROM reviews r
         LEFT JOIN users u ON u.id = r.author_id
        WHERE r.status = 'published' AND r.rating >= 4
        ORDER BY r.created_at DESC LIMIT 6`
    ).catch(() => [[]]);

    res.json({
      hero: {
        headline: config.landing.headline,
        subheadline: config.landing.subheadline,
        hero_image: config.landing.heroImage,
        cta_primary: config.landing.ctaPrimary,
        cta_secondary: config.landing.ctaSecondary,
      },
      stats: config.landing.stats,
      features: config.landing.features,
      featured_courses: featuredCourses,
      top_experts: topExperts,
      upcoming_events: upcomingEvents,
      testimonials: testimonials.length ? testimonials : config.landing.testimonials,
    });
  } catch {
    /* DB error — fall back to landing config only */
    res.json({
      hero: {
        headline: config.landing.headline,
        subheadline: config.landing.subheadline,
        hero_image: config.landing.heroImage,
        cta_primary: config.landing.ctaPrimary,
        cta_secondary: config.landing.ctaSecondary,
      },
      stats: config.landing.stats,
      features: config.landing.features,
      featured_courses: [],
      top_experts: [],
      upcoming_events: [],
      testimonials: config.landing.testimonials,
      _fallback: true,
    });
  }
}));

/* ---------- Public catalogue ---------- */
router.get('/public/courses', asyncH(async (req, res) => {
  if (ctx.demo.active) {
    const { demo } = require('../lib/demo-store');
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
    return res.json({
      courses: items,
      filters: {
        categories: [...new Set(demo.courses.map(c => c.category).filter(Boolean))],
        types: [...new Set(demo.courses.map(c => c.course_type).filter(Boolean))],
        levels: ['beginner', 'intermediate', 'advanced'],
      },
      total, page, pages: Math.max(1, Math.ceil(total / per)),
    });
  }

  try {
    const pool = poolOrThrow();
    const { type, category, level, q, featured, page = 1, per = 12 } = req.query;
    const limit = Math.min(Number(per), 50);
    const offset = (Math.max(Number(page), 1) - 1) * limit;
    const conds = ["c.status='published'"]; const params = [];
    if (type) { conds.push('c.course_type=?'); params.push(type); }
    if (category) { conds.push('c.category=?'); params.push(category); }
    if (level) { conds.push('c.level=?'); params.push(level); }
    if (featured === 'true') conds.push('c.is_featured=1');
    if (q) { conds.push('(c.title LIKE ? OR c.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const where = `WHERE ${conds.join(' AND ')}`;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM courses c ${where}`, params);
    const [rows] = await pool.query(
      `SELECT c.*, u.name expert_name
         FROM courses c LEFT JOIN users u ON u.id=c.expert_id
        ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]);
    res.json({ courses: rows, total, page: Number(page), pages: Math.max(1, Math.ceil(total / limit)) });
  } catch { res.json({ courses: [], total: 0, page: 1, pages: 1 }); }
}));

router.get('/public/courses/:id', asyncH(async (req, res) => {
  if (ctx.demo.active) {
    const { demo } = require('../lib/demo-store');
    const c = demo.courses.find(x => x.id === Number(req.params.id) && x.status === 'published');
    if (!c) return res.status(404).json({ error: 'Course not found' });
    const modules = demo.courseModules
      .filter(md => md.course_id === c.id)
      .sort((a, b) => a.position - b.position)
      .map(md => ({
        ...md,
        lessons: demo.lessons.filter(l => l.module_id === md.id).sort((a, b) => a.position - b.position),
      }));
    const lessons = demo.lessons.filter(l => l.course_id === c.id).slice(0, 5);
    const reviews = demo.courseReviews.filter(r => r.course_id === c.id).slice(0, 10);
    return res.json({ course: c, modules, lessons, reviews });
  }

  try {
    const pool = poolOrThrow();
    const [[course]] = await pool.query(
      `SELECT c.*, u.name expert_name FROM courses c
         LEFT JOIN users u ON u.id=c.expert_id
        WHERE c.id=? AND c.status='published'`, [req.params.id]);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const [modules] = await pool.query(
      'SELECT * FROM course_modules WHERE course_id=? ORDER BY position', [req.params.id]).catch(() => [[]]);
    const [lessons] = await pool.query(
      'SELECT * FROM lessons WHERE course_id=? ORDER BY position', [req.params.id]).catch(() => [[]]);
    res.json({ course, modules, lessons, reviews: [] });
  } catch { res.status(503).json({ error: 'Service unavailable' }); }
}));

/* ---------- Public experts ---------- */
router.get('/public/experts', asyncH(async (req, res) => {
  if (ctx.demo.active) {
    const { demo } = require('../lib/demo-store');
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
    return res.json({
      experts: items,
      specializations: [...new Set(demo.users.filter(u => u.role === 'expert' && u.status === 'active').map(u => u.specialization).filter(Boolean))],
      total, page, pages: Math.max(1, Math.ceil(total / per)),
    });
  }

  try {
    const pool = poolOrThrow();
    const [rows] = await pool.query(
      `SELECT id, name, specialization, hourly_rate, average_rating, verified_badge,
              is_online, instant_available, response_time_minutes, bio, avatar
         FROM users WHERE role='expert' AND status='active'
        ORDER BY average_rating DESC LIMIT 100`);
    res.json({ experts: rows, total: rows.length, page: 1, pages: 1 });
  } catch { res.json({ experts: [], total: 0 }); }
}));

router.get('/public/experts/:id', asyncH(async (req, res) => {
  if (ctx.demo.active) {
    const { demo } = require('../lib/demo-store');
    const e = demo.users.find(u => u.id === Number(req.params.id) && u.role === 'expert' && u.status === 'active');
    if (!e) return res.status(404).json({ error: 'Expert not found' });
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
    return res.json({ expert: safe, reviews, tiers, slots, packages });
  }

  try {
    const pool = poolOrThrow();
    const [[expert]] = await pool.query(
      `SELECT id, name, specialization, hourly_rate, average_rating, verified_badge,
              is_online, instant_available, response_time_minutes, bio, avatar
         FROM users WHERE id=? AND role='expert'`, [req.params.id]);
    if (!expert) return res.status(404).json({ error: 'Expert not found' });
    const [reviews] = await pool.query(
      `SELECT r.*, u.name author_name FROM reviews r
         LEFT JOIN users u ON u.id=r.author_id
        WHERE r.expert_id=? AND r.status='published'`, [req.params.id]).catch(() => [[]]);
    const [tiers] = await pool.query(
      'SELECT * FROM consultation_tiers WHERE expert_id=?', [req.params.id]).catch(() => [[]]);
    const [slots] = await pool.query(
      "SELECT * FROM consultation_slots WHERE expert_id=? AND status='available' AND start_time > NOW() ORDER BY start_time LIMIT 20",
      [req.params.id]).catch(() => [[]]);
    res.json({ expert, reviews, tiers, slots, packages: [] });
  } catch { res.status(503).json({ error: 'Service unavailable' }); }
}));

/* ---------- Public events ---------- */
router.get('/public/events', asyncH(async (req, res) => {
  if (ctx.demo.active) {
    const { demo } = require('../lib/demo-store');
    const list = demo.events
      .filter(e => e.status === 'published')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(e => ({
        ...e,
        registered_count: demo.eventRegistrations.filter(r => r.event_id === e.id && r.status === 'registered').length,
      }));
    return res.json({ events: list });
  }
  try {
    const [rows] = await poolOrThrow().query(
      `SELECT e.*, u.name expert_name,
         (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id=e.id AND er.status='registered') registered_count
         FROM events e LEFT JOIN users u ON u.id=e.expert_id
        WHERE e.status='published' ORDER BY e.date`);
    res.json({ events: rows });
  } catch { res.json({ events: [] }); }
}));

/* ---------- Public stats ---------- */
router.get('/public/stats', asyncH(async (req, res) => {
  if (ctx.demo.active) {
    const { demo } = require('../lib/demo-store');
    return res.json({
      stats: {
        experts: demo.users.filter(u => u.role === 'expert' && u.status === 'active').length,
        learners: demo.users.filter(u => u.role === 'learner').length,
        courses: demo.courses.filter(c => c.status === 'published').length,
        institutions: demo.institutions.length,
        sessions_completed: demo.consultations.filter(c => c.status === 'completed').length,
        avg_rating: 4.9,
      },
    });
  }
  try {
    const pool = poolOrThrow();
    const [[row]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role='expert' AND status='active') experts,
         (SELECT COUNT(*) FROM users WHERE role='learner') learners,
         (SELECT COUNT(*) FROM courses WHERE status='published') courses,
         (SELECT COUNT(*) FROM institutions) institutions,
         (SELECT COUNT(*) FROM consultations WHERE status='completed') sessions_completed`);
    res.json({ stats: { ...row, avg_rating: 4.9 } });
  } catch {
    res.json({ stats: { experts: 0, learners: 0, courses: 0, institutions: 0, sessions_completed: 0, avg_rating: 4.9 } });
  }
}));

/* ---------- Public health probe ---------- */
router.get('/public/health', (_req, res) => {
  res.json({ ok: true, demo: ctx.demo.active, time: new Date().toISOString() });
});

module.exports = router;
