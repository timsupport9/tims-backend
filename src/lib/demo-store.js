/* ============================================================
   In-memory demo store — seeds rich data for every domain so the
   SPA works fully without MySQL. Same shape as DB where possible.
   ============================================================ */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const ctx = require('../context');

const demo = {
  active: !config.db.enabled,
  forced: process.env.DEMO_MODE === 'true',
  counters: {},

  /* Core */
  users: [], notificationPrefs: [], notifications: [], events: [], eventRegistrations: [],
  courses: [], lessons: [], enrollments: [], certificates: [], coupons: [],
  walletLedger: [], transactions: [], payouts: [], availability: [], timeOff: [],
  reviews: [], consultations: [], consultationMessages: [], consultationAttachments: [],
  claims: [], tickets: [], ticketReplies: [], refreshTokens: [], settings: {}, auditLogs: [],

  /* Institutions */
  institutions: [], programmes: [], cohorts: [], assessments: [], assessmentSubmissions: [],
  projects: [], projectSubmissions: [],
  trainees: [], instructors: [], institutionTeam: [], institutionReqs: [], institutionAudit: [],
  sessions: [], attendance: [], materials: [], skills: [], traineeSkills: [],
  certificatesInst: [], enrollmentsInst: [], approvals: [], orgUnits: [],
  learningPaths: [], learningPathSteps: [], questionBank: [], submissions: [],
  reportTemplates: [], scheduledReports: [], teamPermissions: [],
  expertPortfolio: [], wishlist: [], complianceRules: [], imports: [],
  campuses: [], budgetAllocations: [], budgetTransactions: [],
  examProctorSessions: [], examProctorFlags: [],
  instructorMarketplace: [], instructorContracts: [], instructorRequests: [],
  wellnessScores: [], wellnessAlerts: [],
  successionAssignments: [],
  ssoConfiguration: {},
  apiKeys: [], webhooks: [], announcements: [],
  reportDefinitions: [], complianceRuns: [], blockchainCerts: [],

  /* E-School / consultation extensions */
  courseModules: [], courseDiscussions: [], lessonNotes: [], lessonQuestions: [],
  userXP: {}, userBadges: [], userStreak: {},
  courseBundles: [], learningPathsCatalog: [],
  userShortlist: [], userPackages: [], packageDefs: [],
  consultationSlots: [], consultationTiers: [], consultationDisputes: [],
  consultationReminders: [], consultationReviews: [],
  refunds: [],
  gdprRequests: [],
  expertQuestions: [],
  courseReviews: [],
  watchHistory: [],
  consultationAnalytics: [],
};

ctx.demo = demo;

function nextId(coll) {
  demo.counters[coll] = (demo.counters[coll] || 0) + 1;
  return demo.counters[coll];
}

async function seedDemoMemory() {
  if (demo.users.length) return;
  console.log('[demo] seeding in-memory store…');

  const _mkUser = async ({ name, email, password, role, status = 'active', spec = null, rate = 0, instRole = null, instId = null }) => {
    const hash = await bcrypt.hash(password, 10);
    const id = nextId('users');
    const u = {
      id, name, email, password_hash: hash, phone: '',
      role, status, specialization: spec, hourly_rate: rate, bio: '',
      avatar: null, institution_id: instId, institution_role: instRole,
      wallet_balance: role === 'expert' ? 320 : 0,
      total_earnings: role === 'expert' ? 1250 : 0,
      average_rating: role === 'expert' ? 4.7 : 0,
      created_at: new Date(), last_login_at: null,
      timezone: 'UTC', theme: 'light', language: 'en', intent: 'both',
      lifecycle_status: 'active', at_risk: 0,
      verified_badge: role === 'expert' ? 1 : 0,
      response_time_minutes: role === 'expert' ? 15 : null,
      completion_rate: role === 'expert' ? 96 : null,
      is_online: role === 'expert',
      instant_available: role === 'expert' ? 1 : 0,
    };
    demo.users.push(u);
    demo.notificationPrefs.push({ user_id: id, email_notifications: 1, push_notifications: 1, marketing: 0 });
    demo.userXP[id] = 0;
    demo.userStreak[id] = { current: 0, longest: 0 };
    return u;
  };

  /* ---------- Users ---------- */
  await _mkUser({ name: 'System Admin', email: 'admin@platform.com', password: 'admin123', role: 'admin', spec: 'Platform Operations' });
  await _mkUser({ name: 'Dr. Sarah Kimani', email: 'expert@platform.com', password: 'expert123', role: 'expert', spec: 'Data Science & AI', rate: 75 });
  await _mkUser({ name: 'John Mwangi', email: 'learner@platform.com', password: 'learner123', role: 'learner' });
  await _mkUser({ name: 'Aisha Bello', email: 'aisha@platform.com', password: 'expert123', role: 'expert', spec: 'Business Strategy', rate: 90 });
  await _mkUser({ name: 'Kwame Mensah', email: 'kwame@platform.com', password: 'expert123', role: 'expert', spec: 'Full-Stack Dev', rate: 80 });
  await _mkUser({ name: 'Grace Ochieng', email: 'grace@platform.com', password: 'expert123', role: 'expert', spec: 'UX Design', rate: 65 });
  await _mkUser({ name: 'Pending Expert', email: 'pending@platform.com', password: 'expert123', role: 'expert', status: 'pending', spec: 'Marketing', rate: 55 });

  const expertIds = demo.users.filter(u => u.role === 'expert' && u.status === 'active').map(u => u.id);

  /* ---------- Courses + modules + lessons ---------- */
  const courseSeeds = [
    ['Full-Stack Web Development', 'Master modern web development from zero to hero.', 'Technology', 'bootcamp', 'intermediate', 499, 12, 120],
    ['Data Science Bootcamp', 'Python, ML, and real-world projects.', 'Data', 'bootcamp', 'intermediate', 599, 14, 140],
    ['React in 30 Days', 'Build production React apps fast.', 'Frontend', 'short_course', 'intermediate', 99, 0, 30],
    ['Public Speaking Mastery', 'Command the room with confidence.', 'Soft Skills', 'short_course', 'beginner', 49, 0, 12],
    ['Mathematics Tutoring', '1-on-1 personalized math help.', 'Math', 'tuition', 'beginner', 25, 0, 1],
    ['SAT Math Prep', 'Comprehensive SAT math bootcamp.', 'Test Prep', 'exam_prep', 'intermediate', 39, 0, 20],
    ['Tech Career Roadmap', 'Navigate your tech career.', 'Career', 'career', 'beginner', 79, 0, 2],
  ];
  for (const c of courseSeeds) {
    const id = nextId('courses');
    const expertId = expertIds[Math.floor(Math.random() * expertIds.length)] || null;
    const expert = demo.users.find(u => u.id === expertId);
    demo.courses.push({
      id, title: c[0], description: c[1], category: c[2], course_type: c[3], level: c[4],
      price: c[5], duration_weeks: c[6], duration_hours: c[7] || 0,
      total_lessons: c[7], expert_id: expertId,
      expert_name: expert?.name || null,
      expert_avatar: expert?.avatar || null,
      enrolled_count: Math.floor(Math.random() * 400),
      average_rating: 4.4 + Math.random() * 0.5,
      review_count: Math.floor(Math.random() * 120),
      status: 'published', thumbnail: null,
      is_featured: id <= 3 ? 1 : 0,
      created_at: new Date(),
    });

    const modA = nextId('courseModules');
    demo.courseModules.push({ id: modA, course_id: id, title: 'Getting Started', description: 'Orientation and setup.', position: 1 });
    const modB = nextId('courseModules');
    demo.courseModules.push({ id: modB, course_id: id, title: 'Core Concepts', description: 'Deep dive into essentials.', position: 2 });

    ['Introduction', 'Setting up your environment', 'First Project'].forEach((t, i) => {
      demo.lessons.push({
        id: nextId('lessons'), course_id: id, module_id: modA,
        title: t, lesson_type: i === 2 ? 'assignment' : 'video',
        duration_minutes: 12 + i * 5, position: i + 1,
        video_url: null, content: `Lesson content for ${t}.`,
        is_preview: i === 0 ? 1 : 0, resources: '[]',
      });
    });
    ['Deep Dive', 'Advanced Patterns', 'Real-World Practice', 'Module Quiz'].forEach((t, i) => {
      demo.lessons.push({
        id: nextId('lessons'), course_id: id, module_id: modB,
        title: t, lesson_type: i === 3 ? 'quiz' : 'video',
        duration_minutes: 20 + i * 4, position: i + 1,
        video_url: null, content: `Lesson content for ${t}.`,
        is_preview: 0, resources: '[]',
      });
    });
  }

  /* ---------- Bundles & learning paths ---------- */
  demo.courseBundles.push(
    { id: nextId('courseBundles'), title: 'Tech Starter Bundle', description: 'Two top courses at a discount.', price: 450, original_price: 598, discount_pct: 25, course_count: 2, course_ids: [1, 2] },
    { id: nextId('courseBundles'), title: 'Career Prep Bundle', description: 'React + Career Roadmap.', price: 130, original_price: 178, discount_pct: 27, course_count: 2, course_ids: [3, 7] },
  );
  demo.learningPathsCatalog.push(
    { id: nextId('learningPathsCatalog'), title: 'Become a Full-Stack Developer', description: 'Bootcamp + React + Career Roadmap.', step_count: 3, progress: 0, status: 'not_started' },
    { id: nextId('learningPathsCatalog'), title: 'Data Science Career Track', description: 'Data Science Bootcamp + Public Speaking.', step_count: 2, progress: 0, status: 'not_started' },
  );

  /* ---------- Events ---------- */
  const eventSeeds = [
    ['Live Bootcamp: Intro to AI', 'Hands-on introduction to machine learning.', 'Technology', 7, 500, 100, 0],
    ['Career Webinar: Tech Jobs', 'How to break into tech in 2026.', 'Career', 14, 300, 200, 0],
    ['Design Thinking Workshop', 'Practical design thinking for teams.', 'Design', 21, 400, 50, 25],
  ];
  for (const [title, description, category, days, pay, cap, price] of eventSeeds) {
    demo.events.push({
      id: nextId('events'), title, description, category,
      expert_id: expertIds[Math.floor(Math.random() * expertIds.length)],
      date: new Date(Date.now() + days * 86400000),
      capacity: cap, price, expert_payment: pay,
      status: 'published', created_at: new Date(),
    });
  }

  /* ---------- Coupons ---------- */
  demo.coupons.push(
    { id: nextId('coupons'), code: 'WELCOME10', discount_type: 'percent', discount_value: 10, max_uses: 1000, used_count: 0, min_spend: 0, applies_to: 'all', active: 1, expires_at: null, created_at: new Date() },
    { id: nextId('coupons'), code: 'SAVE50', discount_type: 'fixed', discount_value: 50, max_uses: 100, used_count: 0, min_spend: 200, applies_to: 'all', active: 1, expires_at: null, created_at: new Date() },
    { id: nextId('coupons'), code: 'BOOTCAMP20', discount_type: 'percent', discount_value: 20, max_uses: 200, used_count: 0, min_spend: 0, applies_to: 'bootcamp', active: 1, expires_at: null, created_at: new Date() },
  );

  /* ---------- Institutions ---------- */
  const acmeId = nextId('institutions');
  demo.institutions.push({
    id: acmeId, name: 'Acme Academy', type: 'corporate', industry: 'Banking & Fintech',
    contact_email: 'ops@acme.com', contact_phone: '+254 700 000 000',
    address: 'Nairobi, Kenya',
    ops_manager_id: null, ops_manager_name: null, ops_manager_email: null,
    status: 'active', default_capacity: 30, pass_mark: 70,
    primary_color: '#1e3a8a', accent_color: '#059669',
    logo_url: null, subdomain: 'acme',
    created_at: new Date(),
  });

  const opsUser = await _mkUser({ name: 'Olivia Ops', email: 'ops@acme.com', password: 'ops123', role: 'institution', instRole: 'operations_manager', instId: acmeId });
  demo.institutions[0].ops_manager_id = opsUser.id;
  demo.institutions[0].ops_manager_name = opsUser.name;
  demo.institutions[0].ops_manager_email = opsUser.email;

  const coordUser = await _mkUser({ name: 'Chris Coordinator', email: 'coord@acme.com', password: 'coord123', role: 'institution', instRole: 'coordinator', instId: acmeId });
  demo.institutionTeam.push({
    id: nextId('institutionTeam'), institution_id: acmeId, user_id: coordUser.id,
    name: coordUser.name, email: coordUser.email, institution_role: 'coordinator',
    status: 'active', created_at: new Date(),
  });

  const betaId = nextId('institutions');
  demo.institutions.push({
    id: betaId, name: 'Beta Institute', type: 'university', industry: 'Higher Education',
    contact_email: 'hello@beta.edu', contact_phone: '+254 711 111 111',
    address: 'Mombasa, Kenya', status: 'pending', default_capacity: 40, pass_mark: 60,
    created_at: new Date(),
  });

  /* ---------- Instructors + marketplace ---------- */
  const expertList = demo.users.filter(u => u.role === 'expert' && u.status === 'active');
  expertList.slice(0, 3).forEach((e, idx) => {
    demo.instructors.push({
      id: nextId('instructors'), institution_id: acmeId, expert_id: e.id,
      name: e.name, specialization: e.specialization, programme_count: idx < 2 ? 1 : 0,
      status: 'active', created_at: new Date(),
    });
    demo.instructorMarketplace.push({
      id: nextId('instructorMarketplace'),
      name: e.name, specialization: e.specialization, hourly_rate: e.hourly_rate,
      average_rating: e.average_rating, verified: 1, programmes_completed: 5 + idx,
    });
  });

  /* ---------- Programmes ---------- */
  const programmes = [
    { title: 'Digital Banking Foundations', category: 'Fintech', description: 'Core skills for modern banking transformation.', status: 'active', start_date: new Date(Date.now() + 7 * 86400000), end_date: new Date(Date.now() + 77 * 86400000), capacity: 30, cost_per_seat: 800 },
    { title: 'Leadership & Change Management', category: 'Leadership', description: 'Build high-performing teams through change.', status: 'active', start_date: new Date(Date.now() - 14 * 86400000), end_date: new Date(Date.now() + 56 * 86400000), capacity: 20, cost_per_seat: 1200 },
    { title: 'Data Analytics for Managers', category: 'Data', description: 'Turn data into decisions.', status: 'draft', start_date: null, end_date: null, capacity: 25, cost_per_seat: 950 },
  ];
  for (const p of programmes) {
    demo.programmes.push({ id: nextId('programmes'), institution_id: acmeId, ...p, created_at: new Date() });
  }

  /* ---------- Cohorts ---------- */
  const [p1, p2] = demo.programmes;
  const co1 = {
    id: nextId('cohorts'), institution_id: acmeId, programme_id: p1.id,
    name: 'Digital Banking — Cohort A',
    instructor_id: demo.instructors[0]?.expert_id || null,
    instructor_name: demo.instructors[0]?.name || null,
    start_date: p1.start_date, end_date: p1.end_date,
    capacity: 30, trainee_count: 0, status: 'active', created_at: new Date(),
  };
  demo.cohorts.push(co1);
  const co2 = {
    id: nextId('cohorts'), institution_id: acmeId, programme_id: p2.id,
    name: 'Leadership — Spring 2026',
    instructor_id: demo.instructors[1]?.expert_id || null,
    instructor_name: demo.instructors[1]?.name || null,
    start_date: p2.start_date, end_date: p2.end_date,
    capacity: 20, trainee_count: 0, status: 'active', created_at: new Date(),
  };
  demo.cohorts.push(co2);

  /* ---------- Assessments + projects ---------- */
  demo.assessments.push(
    { id: nextId('assessments'), institution_id: acmeId, cohort_id: co1.id, title: 'Module 1 Quiz', type: 'quiz', weight: 15, due_date: new Date(Date.now() + 14 * 86400000), status: 'scheduled', created_at: new Date() },
    { id: nextId('assessments'), institution_id: acmeId, cohort_id: co1.id, title: 'Mid-Programme Exam', type: 'exam', weight: 35, due_date: new Date(Date.now() + 42 * 86400000), status: 'scheduled', created_at: new Date() },
    { id: nextId('assessments'), institution_id: acmeId, cohort_id: co2.id, title: 'Leadership Case Study', type: 'project', weight: 25, due_date: new Date(Date.now() + 28 * 86400000), status: 'scheduled', created_at: new Date() },
  );
  demo.projects.push({
    id: nextId('projects'), institution_id: acmeId, cohort_id: co1.id,
    title: 'Banking Transformation Capstone', category: 'Project',
    description: 'Design an end-to-end digital banking rollout plan.',
    deadline: new Date(Date.now() + 60 * 86400000), status: 'active',
    submissions_count: 0, created_at: new Date(),
  });

  /* ---------- Trainees ---------- */
  const traineeSeeds = [
    { name: 'Amina Yusuf', email: 'amina@acme.com', progress: 62, avg: 78 },
    { name: 'Peter Otieno', email: 'peter@acme.com', progress: 44, avg: 71 },
    { name: 'Fatima Noor', email: 'fatima@acme.com', progress: 88, avg: 91 },
    { name: 'David Kim', email: 'david@acme.com', progress: 15, avg: 64 },
    { name: 'Grace Wanjiku', email: 'grace.w@acme.com', progress: 100, avg: 87 },
  ];
  for (const t of traineeSeeds) {
    demo.trainees.push({
      id: nextId('trainees'), institution_id: acmeId, user_id: null,
      name: t.name, email: t.email,
      programme_id: co1.programme_id, programme_title: p1.title,
      cohort_id: co1.id, cohort_name: co1.name,
      progress: t.progress, assessment_avg: t.avg,
      status: t.progress >= 100 ? 'completed' : 'active',
      lifecycle_status: t.progress >= 100 ? 'completed' : 'active',
      department: 'Engineering', created_at: new Date(),
    });
  }
  co1.trainee_count = traineeSeeds.length;

  /* ---------- Approval request ---------- */
  demo.institutionReqs.push({
    id: nextId('institutionReqs'), institution_id: acmeId,
    title: 'Add 10 more trainees to Cohort A',
    type: 'capacity_change', request_type: 'capacity_change',
    requested_by: coordUser.id, requested_by_name: coordUser.name,
    status: 'pending', created_at: new Date(),
  });

  /* ---------- Audit log ---------- */
  demo.institutionAudit.push(
    { id: nextId('institutionAudit'), institution_id: acmeId, actor_id: opsUser.id, actor_name: opsUser.name, action: 'Created programme "Digital Banking Foundations"', created_at: new Date(Date.now() - 3600 * 1000) },
    { id: nextId('institutionAudit'), institution_id: acmeId, actor_id: opsUser.id, actor_name: opsUser.name, action: 'Invited coordinator Chris Coordinator', created_at: new Date(Date.now() - 1800 * 1000) },
  );

  /* ---------- Institution certificates ---------- */
  const cert1 = demo.trainees[4];
  const blockchain_hash = '0x' + crypto.randomBytes(32).toString('hex');
  demo.certificatesInst.push({
    id: nextId('certificatesInst'), institution_id: acmeId,
    trainee_id: cert1.id, programme_id: co1.programme_id,
    title: `${cert1.name} - ${p1.title}`,
    serial: `EH-${acmeId}-${Date.now().toString(36).toUpperCase()}-DEMO01`,
    trainee_name: cert1.name, programme_title: p1.title,
    awarding_body: 'Chartered Institute of Bankers',
    cpd_points: 24, grade: 'Distinction',
    blockchain_hash,
    issued_at: new Date(), expires_at: new Date(Date.now() + 730 * 86400000),
    revoked: 0,
  });
  demo.blockchainCerts.push({
    id: nextId('blockchainCerts'),
    serial: demo.certificatesInst[0].serial,
    trainee_name: cert1.name,
    blockchain_hash,
    issued_at: new Date(),
  });

  /* ---------- Skills ---------- */
  ['Communication', 'Data Analysis', 'Leadership', 'Digital Literacy', 'Problem Solving'].forEach(name => {
    demo.skills.push({ id: nextId('skills'), institution_id: acmeId, name, category: name === 'Data Analysis' ? 'Technical' : 'Soft Skills', description: '' });
  });
  demo.skills.forEach((s, i) => {
    demo.trainees.slice(0, 3).forEach(t => {
      demo.traineeSkills.push({
        id: nextId('traineeSkills'), trainee_id: t.id, skill_id: s.id,
        level: 2 + ((i + t.id) % 4), assessed_by: opsUser.id,
        source: 'manager', assessed_at: new Date(),
      });
    });
  });

  /* ---------- Campuses ---------- */
  demo.campuses.push(
    { id: nextId('campuses'), institution_id: acmeId, name: 'Nairobi HQ', type: 'main', address: 'Nairobi CBD', contact_phone: '+254 700 111 111', capacity: 120, trainee_count: 42, programme_count: 5, sessions_per_month: 24, manager_name: 'Olivia Ops', is_main: 1, status: 'active', created_at: new Date() },
    { id: nextId('campuses'), institution_id: acmeId, name: 'Mombasa Branch', type: 'branch', address: 'Mombasa', contact_phone: '+254 700 222 222', capacity: 60, trainee_count: 18, programme_count: 2, sessions_per_month: 12, manager_name: 'Chris Coordinator', is_main: 0, status: 'active', created_at: new Date() },
  );

  /* ---------- Budgets ---------- */
  ['Engineering', 'Sales', 'Operations'].forEach(dept => {
    const alloc = 50000 + Math.floor(Math.random() * 30000);
    const spent = Math.floor(alloc * (0.3 + Math.random() * 0.6));
    demo.budgetAllocations.push({ id: nextId('budgetAllocations'), institution_id: acmeId, department: dept, period: 'monthly', allocated: alloc, spent, created_at: new Date() });
  });
  demo.budgetAllocations.forEach(b => {
    for (let i = 0; i < 3; i++) {
      demo.budgetTransactions.push({
        id: nextId('budgetTransactions'), budget_id: b.id, institution_id: acmeId,
        department: b.department, description: 'Training spend ' + (i + 1),
        amount: Math.round(b.spent / 3),
        created_at: new Date(Date.now() - i * 7 * 86400000),
      });
    }
  });

  /* ---------- Wellness ---------- */
  demo.trainees.forEach((t, i) => {
    const score = 40 + ((i * 15) % 60);
    const risk = score >= 75 ? 'low' : score >= 55 ? 'medium' : score >= 35 ? 'high' : 'critical';
    demo.wellnessScores.push({
      id: nextId('wellnessScores'), institution_id: acmeId, trainee_id: t.id,
      trainee_name: t.name, score,
      login_frequency: Math.min(100, score + 10),
      attendance_score: Math.min(100, score + 5),
      timeliness_score: Math.max(0, score - 10),
      engagement_score: score,
      risk_level: risk, computed_at: new Date(),
    });
    if (risk === 'high' || risk === 'critical') {
      demo.wellnessAlerts.push({
        id: nextId('wellnessAlerts'), institution_id: acmeId, trainee_id: t.id,
        trainee_name: t.name, reason: 'Low engagement in last 14 days',
        score, severity: risk, status: 'open', created_at: new Date(),
      });
    }
  });

  /* ---------- Succession ---------- */
  demo.successionAssignments.push(
    { id: nextId('successionAssignments'), institution_id: acmeId, trainee_id: demo.trainees[2].id, trainee_name: demo.trainees[2].name, box_code: 'star', performance: 'high', potential: 'high', created_at: new Date() },
    { id: nextId('successionAssignments'), institution_id: acmeId, trainee_id: demo.trainees[4].id, trainee_name: demo.trainees[4].name, box_code: 'current_star', performance: 'high', potential: 'medium', created_at: new Date() },
  );

  /* ---------- API keys / webhooks / announcements ---------- */
  demo.apiKeys.push({
    id: nextId('apiKeys'), institution_id: acmeId,
    name: 'HRIS Integration', prefix: 'eh_live_a1b2',
    scopes: ['read:trainees', 'read:programmes'],
    last_used_at: new Date(Date.now() - 3600 * 1000), revoked: 0, created_at: new Date(),
  });
  demo.webhooks.push({
    id: nextId('webhooks'), institution_id: acmeId,
    url: 'https://example.com/hooks/experthub',
    events: ['trainee.enrolled', 'certificate.issued'],
    active: 1, last_fired_at: new Date(Date.now() - 7200 * 1000), created_at: new Date(),
  });
  demo.announcements.push({
    id: nextId('announcements'), institution_id: acmeId,
    title: 'Q1 all-hands training kickoff',
    body: 'All cohorts start Monday. Please review the updated curriculum.',
    scope: 'all', priority: 'important', view_count: 42, created_at: new Date(),
  });

  /* ---------- SSO ---------- */
  demo.ssoConfiguration = {
    provider: 'azure_ad', entity_id: 'experthub-acme', metadata_url: '',
    certificate: '', force_mfa: false, ip_whitelist_enabled: false,
    session_timeout: true,
    recent_logins: [
      { user_name: 'Olivia Ops', ip: '41.90.64.1', timestamp: new Date(Date.now() - 3600 * 1000), status: 'success' },
      { user_name: 'Chris Coordinator', ip: '41.90.64.2', timestamp: new Date(Date.now() - 7200 * 1000), status: 'success' },
    ],
  };

  /* ---------- Reports ---------- */
  demo.reportDefinitions.push({
    id: nextId('reportDefinitions'), institution_id: acmeId,
    name: 'All active trainees by programme', data_source: 'trainee',
    columns: ['id', 'name', 'email', 'programme', 'progress', 'status'],
    filters: {}, created_at: new Date(),
  });
  demo.complianceRuns.push({
    id: nextId('complianceRuns'), institution_id: acmeId,
    run_name: 'Q1 Compliance Sweep', status: 'passed', findings_count: 0,
    started_at: new Date(Date.now() - 7 * 86400000),
  });

  /* ---------- Packages / tiers / slots ---------- */
  demo.packageDefs.push(
    { id: nextId('packageDefs'), expert_id: expertList[0]?.id || null, name: '5-Session Pack', sessions_count: 5, price: 300, description: 'Save 20% on 5 sessions.' },
    { id: nextId('packageDefs'), expert_id: expertList[1]?.id || null, name: '10-Session Pack', sessions_count: 10, price: 550, description: 'Save 30% on 10 sessions.' },
  );
  expertList.slice(0, 3).forEach((e, idx) => {
    demo.consultationTiers.push(
      { id: nextId('consultationTiers'), expert_id: e.id, name: 'Quick', duration_minutes: 15, price: Math.round(e.hourly_rate / 4), description: '15-min focused session' },
      { id: nextId('consultationTiers'), expert_id: e.id, name: 'Standard', duration_minutes: 30, price: Math.round(e.hourly_rate / 2), description: '30-min working session' },
      { id: nextId('consultationTiers'), expert_id: e.id, name: 'Deep Dive', duration_minutes: 60, price: e.hourly_rate, description: '60-min deep dive' },
    );
    for (let d = 1; d <= 5; d++) {
      const start = new Date(Date.now() + d * 86400000);
      start.setHours(9 + (idx % 3) + d, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60000);
      demo.consultationSlots.push({
        id: nextId('consultationSlots'), expert_id: e.id,
        start_time: start, end_time: end, duration_minutes: 30,
        price: Math.round(e.hourly_rate / 2),
        status: 'available', created_at: new Date(),
      });
    }
  });

  /* ---------- Consultations demo ---------- */
  const learner = demo.users.find(u => u.role === 'learner');
  demo.consultations.push({
    id: nextId('consultations'), user_id: learner.id, expert_id: expertList[0].id,
    client_name: learner.name, client_email: learner.email,
    expert_name: expertList[0].name, expert_email: expertList[0].email,
    expert_specialization: expertList[0].specialization,
    title: 'Intro to Machine Learning',
    description: 'Help me plan my ML learning path.',
    status: 'confirmed', consultation_type: 'video', session_type: 'scheduled',
    price: 75, duration_minutes: 30, payment_status: 'held',
    scheduled_at: new Date(Date.now() + 2 * 86400000),
    created_at: new Date(),
  });
  demo.consultations.push({
    id: nextId('consultations'), user_id: learner.id, expert_id: expertList[1].id,
    client_name: learner.name, client_email: learner.email,
    expert_name: expertList[1].name, expert_email: expertList[1].email,
    expert_specialization: expertList[1].specialization,
    title: 'Business Strategy Session',
    description: 'Review my 2026 plan.',
    status: 'completed', consultation_type: 'video', session_type: 'scheduled',
    price: 90, duration_minutes: 45, payment_status: 'released',
    scheduled_at: new Date(Date.now() - 3 * 86400000),
    completed_at: new Date(Date.now() - 3 * 86400000),
    created_at: new Date(Date.now() - 5 * 86400000),
  });

  /* ---------- Expert questions ---------- */
  demo.expertQuestions.push({
    id: nextId('expertQuestions'), expert_id: expertList[0].id,
    asker_name: 'Anonymous', question: 'How do I get started with deep learning?',
    created_at: new Date(Date.now() - 3 * 86400000),
  });

  /* ---------- Notifications ---------- */
  demo.notifications.push({
    id: nextId('notifications'), user_id: null,
    title: 'Welcome to ExpertHub',
    message: 'Get started with any course.',
    type: 'info', is_read: 0, created_at: new Date(),
  });

  /* ---------- XP / badges / streaks ---------- */
  demo.userXP[learner.id] = 250;
  demo.userStreak[learner.id] = { current: 4, longest: 12 };
  demo.userBadges.push({ id: nextId('userBadges'), user_id: learner.id, badge_code: 'first_lesson', earned_at: new Date() });

  /* ---------- Reviews ---------- */
  demo.reviews.push({
    id: nextId('reviews'), expert_id: expertList[0].id, author_id: learner.id,
    rating: 5, comment: 'Fantastic session — clear and actionable.',
    status: 'published', created_at: new Date(Date.now() - 5 * 86400000),
  });

  console.log(`[demo] seeded: ${demo.users.length} users, ${demo.institutions.length} institutions, ${demo.programmes.length} programmes, ${demo.courses.length} courses`);
}

/* ============================================================
   Resolve authenticated user from request in demo mode
   ============================================================ */
function currentDemoUser(req) {
  const h = req.headers.authorization || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!tok) return null;
  try {
    const payload = jwt.verify(tok, config.jwt.secret);
    return demo.users.find(u => u.id === payload.id) || null;
  } catch { return null; }
}

module.exports = { demo, nextId, seedDemoMemory, currentDemoUser };
