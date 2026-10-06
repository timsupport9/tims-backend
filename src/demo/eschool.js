/* ============================================================
   Demo mode — E-School (courses, lessons, enrollments)
   ============================================================ */
const { demo, nextId, currentDemoUser } = require('./_base');

module.exports = async function eschoolDemo(req, res, p, m) {
  const { method } = req;

  /* ---------- Course catalog ---------- */
  if (method === 'GET' && p === '/eschool/courses') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const type = req.query.type || null;
    const q = req.query.q || null;
    let list = demo.courses.filter(c => c.status === 'published');
    if (type) list = list.filter(c => c.course_type === type);
    if (q) list = list.filter(c => (c.title || '').toLowerCase().includes(String(q).toLowerCase()));
    return res.json({ courses: list, total: list.length, page: 1, pages: 1 }), true;
  }

  /* ---------- Single course ---------- */
  if (method === 'GET' && (m = p.match(/^\/eschool\/courses\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.courses.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Course not found' }), true;
    const lessons = demo.lessons.filter(l => l.course_id === c.id);
    return res.json({ course: c, lessons }), true;
  }

  /* ---------- Curriculum (modules + lessons nested) ---------- */
  if (method === 'GET' && (m = p.match(/^\/eschool\/courses\/(\d+)\/curriculum$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const c = demo.courses.find(x => x.id === Number(m[1]));
    if (!c) return res.status(404).json({ error: 'Course not found' }), true;
    const modules = demo.courseModules
      .filter(md => md.course_id === c.id)
      .sort((a, b) => a.position - b.position)
      .map(md => ({
        ...md,
        lessons: demo.lessons
          .filter(l => l.module_id === md.id)
          .sort((a, b) => a.position - b.position),
      }));
    return res.json({ course: c, modules }), true;
  }

  /* ---------- Discussions ---------- */
  if (method === 'GET' && (m = p.match(/^\/eschool\/courses\/(\d+)\/discussions$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const cid = Number(m[1]);
    return res.json({ discussions: demo.courseDiscussions.filter(d => d.course_id === cid) }), true;
  }

  if (method === 'POST' && p === '/eschool/discussions') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const d = {
      id: nextId('courseDiscussions'),
      course_id: Number(req.body?.course_id),
      lesson_id: Number(req.body?.lesson_id),
      user_id: user.id, author_name: user.name,
      body: req.body?.body || '', upvotes: 0, created_at: new Date(),
    };
    demo.courseDiscussions.push(d);
    return res.status(201).json({ id: d.id }), true;
  }

  /* ---------- Enroll ---------- */
  if (method === 'POST' && p === '/eschool/enroll') {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const { course_id, coupon_code } = req.body || {};
    const c = demo.courses.find(x => x.id === Number(course_id));
    if (!c) return res.status(404).json({ error: 'Course not found' }), true;

    let price = Number(c.price), discount = 0;
    if (coupon_code) {
      const cp = demo.coupons.find(x => x.code === coupon_code && x.active);
      if (!cp) return res.status(400).json({ error: 'Invalid coupon' }), true;
      discount = cp.discount_type === 'percent'
        ? price * (Number(cp.discount_value) / 100)
        : Number(cp.discount_value);
      discount = Math.min(discount, price);
      cp.used_count++;
    }
    const finalPrice = price - discount;
    const id = nextId('enrollments');
    demo.enrollments.push({
      id, user_id: user.id, course_id: c.id,
      enrollment_type: c.course_type, title: c.title,
      progress: 0, status: 'active', created_at: new Date(),
    });
    c.enrolled_count = (c.enrolled_count || 0) + 1;
    return res.status(201).json({ id, paid: finalPrice, discount }), true;
  }

  /* ---------- Bundles / trials ---------- */
  if (method === 'POST' && (m = p.match(/^\/eschool\/courses\/(\d+)\/start-trial$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ ok: true, trial_expires_at: new Date(Date.now() + 48 * 3600 * 1000) }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/eschool\/bundles\/(\d+)\/purchase$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const b = demo.courseBundles.find(x => x.id === Number(m[1]));
    if (!b) return res.status(404).json({ error: 'Bundle not found' }), true;
    for (const cid of (b.course_ids || [])) {
      const c = demo.courses.find(x => x.id === cid);
      if (!c) continue;
      demo.enrollments.push({
        id: nextId('enrollments'), user_id: user.id, course_id: c.id,
        enrollment_type: c.course_type, title: c.title,
        progress: 0, status: 'active', created_at: new Date(),
      });
    }
    return res.json({ ok: true }), true;
  }

  /* ---------- Lesson detail ---------- */
  if (method === 'GET' && (m = p.match(/^\/eschool\/lessons\/(\d+)$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const lesson = demo.lessons.find(l => l.id === Number(m[1]));
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' }), true;
    return res.json({ lesson, progress: { status: 'not_started' } }), true;
  }

  /* ---------- Lesson progress ---------- */
  if (method === 'POST' && (m = p.match(/^\/eschool\/lessons\/(\d+)\/progress$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const lessonId = Number(m[1]);
    const lesson = demo.lessons.find(l => l.id === lessonId);
    if (!lesson) return res.status(404).json({ error: 'Not found' }), true;

    if (req.body?.status === 'completed') {
      const enrollment = demo.enrollments.find(e => e.user_id === user.id && e.course_id === lesson.course_id);
      if (enrollment) {
        const totalLessons = demo.lessons.filter(l => l.course_id === lesson.course_id).length || 1;
        enrollment.progress = Math.min(100, Math.round((enrollment.progress || 0) + (100 / totalLessons)));
        if (enrollment.progress >= 100) {
          enrollment.status = 'completed';
          const serial = `EH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          demo.certificates.push({
            id: nextId('certificates'), user_id: user.id,
            course_title: enrollment.title, serial, issued_at: new Date(),
          });
        }
      }
      demo.userXP[user.id] = (demo.userXP[user.id] || 0) + 10;
    }
    return res.json({ ok: true }), true;
  }

  /* ---------- Lesson notes ---------- */
  if (method === 'GET' && (m = p.match(/^\/eschool\/lessons\/(\d+)\/notes$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const lessonId = Number(m[1]);
    return res.json({ notes: demo.lessonNotes.filter(n => n.user_id === user.id && n.lesson_id === lessonId) }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/eschool\/lessons\/(\d+)\/notes$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const note = {
      id: nextId('lessonNotes'), user_id: user.id, lesson_id: Number(m[1]),
      content: req.body?.content || '', created_at: new Date(),
    };
    demo.lessonNotes.push(note);
    return res.status(201).json({ id: note.id }), true;
  }

  /* ---------- Lesson questions ---------- */
  if (method === 'GET' && (m = p.match(/^\/eschool\/lessons\/(\d+)\/questions$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    return res.json({ questions: demo.lessonQuestions.filter(q => q.lesson_id === Number(m[1])) }), true;
  }

  if (method === 'POST' && (m = p.match(/^\/eschool\/lessons\/(\d+)\/questions$/))) {
    const user = currentDemoUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' }), true;
    const q = {
      id: nextId('lessonQuestions'), lesson_id: Number(m[1]), user_id: user.id,
      question: req.body?.question || '', answer: null, created_at: new Date(),
    };
    demo.lessonQuestions.push(q);
    return res.status(201).json({ id: q.id }), true;
  }

  return false;
};
