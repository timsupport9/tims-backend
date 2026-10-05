/* ============================================================
   ExpertHub — js/public/landing/discover.js
   Live sections on the landing page: featured courses, experts,
   upcoming events, free resources. All hydrate asynchronously.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.landing = P.landing || {};
  var F = P.format, esc = F.esc;

  function sectionHead(title, sub, actionLabel, href) {
    return '<div class="pub-section-head">' +
      '<div>' +
        '<h2 class="section-title" style="margin:0 0 6px">' + esc(title) + '</h2>' +
        (sub ? '<p class="section-sub" style="margin:0">' + esc(sub) + '</p>' : '') +
      '</div>' +
      (actionLabel
        ? '<button class="pub-link" data-goto="' + href + '">' + esc(actionLabel) +
          ' <i class="fas fa-arrow-right"></i></button>'
        : '') +
    '</div>';
  }

  P.landing.discover = function () {
    return '' +
      /* Featured courses */
      '<section class="section alt" id="pub-courses-section">' +
        sectionHead('Featured courses',
                    'Hand-picked programmes from our verified experts.',
                    'Browse all courses', '#/courses') +
        '<div class="pub-grid pub-grid-3" id="pubCourses">' + F.skeletons(3, 280) + '</div>' +
      '</section>' +

      /* Experts */
      '<section class="section">' +
        sectionHead('Meet the experts',
                    'Verified professionals ready to help you one-on-one.',
                    'See all experts', '#/experts') +
        '<div class="pub-grid pub-grid-4" id="pubExperts">' + F.skeletons(4, 250) + '</div>' +
      '</section>' +

      /* Events */
      '<section class="section alt">' +
        sectionHead('Upcoming events',
                    'Workshops, webinars and open days you can join.',
                    'All events', '#/events') +
        '<div class="pub-grid" id="pubEvents" style="gap:14px">' + F.skeletons(3, 90) + '</div>' +
      '</section>' +

      /* Resources */
      '<section class="section">' +
        sectionHead('Free resources',
                    'Guides, templates and articles to get you moving.',
                    'All resources', '#/resources') +
        '<div class="pub-grid pub-grid-4" id="pubResources">' + F.skeletons(4, 240) + '</div>' +
      '</section>';
  };

  P.landing.hydrateDiscover = function () {
    hydrateCourses();
    hydrateExperts();
    hydrateEvents();
    hydrateResources();
  };

  /* ---- normalisers ---- */
  function normalizeCourse(raw) {
    raw = raw || {};
    var e = raw.expert || raw.instructor || raw.tutor || raw.owner || raw.teacher || {};
    return {
      id: F.pick(raw, 'id', '_id', 'slug'),
      title: F.pick(raw, 'title', 'name', 'courseName') || 'Untitled course',
      summary: F.pick(raw, 'summary', 'shortDescription', 'excerpt', 'description', 'overview') || '',
      thumbnail: F.pick(raw, 'thumbnail', 'image', 'cover', 'coverImage', 'imageUrl', 'banner') || '',
      category: F.pick(raw, 'category', 'categoryName', 'subject', 'field') || 'General',
      level: F.pick(raw, 'level', 'difficulty', 'skillLevel') || 'All levels',
      price: F.num(F.pick(raw, 'price', 'amount', 'fee', 'cost'), 0),
      currency: F.pick(raw, 'currency') || 'USD',
      rating: F.num(F.pick(raw, 'rating', 'averageRating', 'avgRating'), 0),
      ratingCount: F.num(F.pick(raw, 'ratingCount', 'reviewsCount', 'reviews'), 0),
      durationWeeks: F.num(F.pick(raw, 'durationWeeks', 'weeks'), 0) || null,
      lessons: F.num(F.pick(raw, 'lessons', 'lessonsCount', 'modules'), 0) || null,
      learners: F.num(F.pick(raw, 'learners', 'enrollments', 'studentsCount', 'students'), 0),
      expert: {
        id: F.pick(e, 'id', '_id', 'userId'),
        name: F.pick(e, 'name', 'fullName', 'displayName') || 'ExpertHub Expert',
        avatar: F.pick(e, 'avatar', 'avatarUrl', 'photo', 'image') || '',
        verified: !!(F.pick(e, 'verified', 'isVerified', 'approved') || e.status === 'approved')
      }
    };
  }

  function normalizeExpert(raw) {
    raw = raw || {};
    var u = raw.user || raw.profile || raw.account || {};
    var name = F.pick(raw, 'name', 'fullName', 'displayName') ||
               F.pick(u, 'name', 'fullName', 'displayName') || 'ExpertHub Expert';
    var specs = F.pick(raw, 'specializations', 'specialities', 'skills', 'expertise', 'tags');
    if (Array.isArray(specs)) {
      specs = specs.map(function (x) { return typeof x === 'string' ? x : (x.name || x.title); }).filter(Boolean);
    } else if (typeof specs === 'string') {
      specs = specs.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    } else {
      var cat = F.pick(raw, 'category', 'field', 'industry');
      specs = cat ? [cat] : [];
    }
    return {
      id: F.pick(raw, 'id', '_id', 'slug', 'userId'),
      name: name,
      avatar: F.pick(raw, 'avatar', 'avatarUrl', 'photo', 'image') ||
              F.pick(u, 'avatar', 'avatarUrl', 'photo') || '',
      headline: F.pick(raw, 'headline', 'title', 'bio', 'tagline', 'description', 'about') || '',
      specializations: specs,
      rating: F.num(F.pick(raw, 'rating', 'averageRating', 'avgRating'), 0),
      reviews: F.num(F.pick(raw, 'reviews', 'reviewsCount', 'ratingCount'), 0),
      sessions: F.num(F.pick(raw, 'sessions', 'sessionsCount', 'consultations'), 0),
      rate: F.num(F.pick(raw, 'hourlyRate', 'rate', 'price', 'consultationFee'), 0),
      currency: F.pick(raw, 'currency') || 'USD',
      verified: !!(F.pick(raw, 'verified', 'isVerified', 'approved') || raw.status === 'approved'),
      experienceYears: F.num(F.pick(raw, 'experienceYears', 'yearsOfExperience', 'experience'), 0)
    };
  }

  function normalizeEvent(raw) {
    raw = raw || {};
    var h = raw.host || raw.organizer || raw.expert || {};
    var mode = F.pick(raw, 'mode', 'format', 'type', 'deliveryMode');
    if (!mode) mode = F.pick(raw, 'location', 'venue') ? 'physical' : 'online';
    return {
      id: F.pick(raw, 'id', '_id', 'slug'),
      title: F.pick(raw, 'title', 'name') || 'ExpertHub event',
      summary: F.pick(raw, 'summary', 'description', 'excerpt', 'about') || '',
      cover: F.pick(raw, 'cover', 'image', 'banner', 'thumbnail') || '',
      startsAt: F.pick(raw, 'startsAt', 'startDate', 'startTime', 'date', 'starts_at'),
      endsAt: F.pick(raw, 'endsAt', 'endDate', 'endTime', 'ends_at'),
      mode: String(mode).toLowerCase(),
      location: F.pick(raw, 'location', 'venue', 'address', 'city') || '',
      price: F.num(F.pick(raw, 'price', 'amount', 'fee'), 0),
      currency: F.pick(raw, 'currency') || 'USD',
      host: {
        id: F.pick(h, 'id', '_id', 'userId'),
        name: F.pick(h, 'name', 'fullName', 'displayName') || 'ExpertHub',
        avatar: F.pick(h, 'avatar', 'avatarUrl', 'photo') || '',
        verified: !!(F.pick(h, 'verified', 'isVerified', 'approved'))
      }
    };
  }

  function normalizeResource(raw) {
    raw = raw || {};
    return {
      id: F.pick(raw, 'id', '_id', 'slug'),
      title: F.pick(raw, 'title', 'name') || 'Resource',
      summary: F.pick(raw, 'summary', 'description', 'excerpt') || '',
      cover: F.pick(raw, 'cover', 'image', 'thumbnail') || '',
      type: F.pick(raw, 'type', 'category', 'kind', 'format') || 'Article',
      readMinutes: F.num(F.pick(raw, 'readMinutes', 'readingTime', 'minutes'), 0) || null,
      url: F.pick(raw, 'url', 'link', 'fileUrl', 'href') || '',
      author: F.pick(raw, 'author', 'authorName', 'by') || 'ExpertHub'
    };
  }

  /* Expose normalisers for pages/*.js. */
  P.normalize = {
    course: normalizeCourse,
    expert: normalizeExpert,
    event: normalizeEvent,
    resource: normalizeResource
  };

  /* ---- demo fallbacks ---- */
  var DEMO_COURSES = [
    { id: 'demo-c1', title: 'Full-Stack Web Development Bootcamp', summary: 'From HTML to deployed APIs in 12 intensive weeks with live mentor support.', category: 'Web Development', level: 'Beginner', price: 480, currency: 'USD', rating: 4.9, durationWeeks: 12, lessons: 86, expert: { name: 'Jane Doe', verified: true } },
    { id: 'demo-c2', title: 'Data Science & Machine Learning', summary: 'Python, pandas, scikit-learn and model deployment for real business problems.', category: 'Data Science', level: 'Intermediate', price: 620, currency: 'USD', rating: 4.8, durationWeeks: 16, lessons: 104, expert: { name: 'Dr. Sarah Kim', verified: true } },
    { id: 'demo-c3', title: 'IELTS & Academic English Prep', summary: 'Targeted exam preparation with weekly mock tests and 1-on-1 feedback.', category: 'Exam Prep', level: 'All levels', price: 180, currency: 'USD', rating: 4.7, durationWeeks: 8, lessons: 40, expert: { name: 'Michael Otieno', verified: true } }
  ];
  var DEMO_EXPERTS = [
    { id: 'demo-e1', name: 'Dr. Sarah Kim', headline: 'Data scientist & former university lecturer', specializations: ['Data Science', 'Python', 'Statistics'], rating: 4.9, reviews: 142, rate: 45, currency: 'USD', verified: true, experienceYears: 11 },
    { id: 'demo-e2', name: 'Jane Doe', headline: 'Senior software engineer, ex-FAANG', specializations: ['JavaScript', 'React', 'Node.js'], rating: 4.8, reviews: 98, rate: 40, currency: 'USD', verified: true, experienceYears: 8 },
    { id: 'demo-e3', name: 'Michael Otieno', headline: 'IELTS examiner & academic English coach', specializations: ['IELTS', 'English', 'Study Abroad'], rating: 4.9, reviews: 221, rate: 25, currency: 'USD', verified: true, experienceYears: 14 },
    { id: 'demo-e4', name: 'Amara Nwosu', headline: 'Product design lead & design systems coach', specializations: ['UI/UX', 'Figma', 'Design Systems'], rating: 4.7, reviews: 63, rate: 55, currency: 'USD', verified: true, experienceYears: 9 }
  ];
  var DEMO_EVENTS = [
    { id: 'demo-v1', title: 'Live workshop: Build your first React app', summary: 'A hands-on 90-minute session with Jane Doe. Bring a laptop.', startsAt: new Date(Date.now() + 3 * 864e5).toISOString(), mode: 'online', price: 0, currency: 'USD' },
    { id: 'demo-v2', title: 'Data careers panel: breaking into analytics', summary: 'Three hiring managers answer your questions live.', startsAt: new Date(Date.now() + 9 * 864e5).toISOString(), mode: 'online', price: 10, currency: 'USD' },
    { id: 'demo-v3', title: 'Corporate training open day', summary: 'Meet our programme leads and see cohort dashboards in action.', startsAt: new Date(Date.now() + 15 * 864e5).toISOString(), mode: 'physical', location: 'Nairobi, Kenya', price: 0, currency: 'USD' }
  ];
  var DEMO_RESOURCES = [
    { id: 'demo-r1', title: 'The 2025 tech career roadmap', summary: 'Skills, timelines and salaries across eight in-demand tracks.', type: 'Guide', readMinutes: 14, url: '#' },
    { id: 'demo-r2', title: 'How to choose the right bootcamp', summary: 'Seven questions to ask before you pay a deposit.', type: 'Article', readMinutes: 7, url: '#' },
    { id: 'demo-r3', title: 'Corporate training RFP template', summary: 'A ready-to-use template for L&D teams evaluating vendors.', type: 'Template', readMinutes: 5, url: '#' },
    { id: 'demo-r4', title: 'Revision planner for exam prep', summary: 'A weekly schedule that balances new material and past papers.', type: 'Template', readMinutes: 6, url: '#' }
  ];

  P.demo = {
    courses: DEMO_COURSES,
    experts: DEMO_EXPERTS,
    events: DEMO_EVENTS,
    resources: DEMO_RESOURCES
  };

  /* ---- hydrators ---- */
  async function hydrateCourses() {
    var el = document.getElementById('pubCourses');
    if (!el) return;
    var list;
    try {
      var raw = await P.api.fetch('/courses?featured=true&limit=6');
      list = F.listOf(raw, ['courses']).map(normalizeCourse);
    } catch (_) { list = []; }
    if (!list.length) list = DEMO_COURSES.map(normalizeCourse);
    if (!document.body.contains(el)) return;
    el.innerHTML = list.slice(0, 6).map(P.components.courseCard).join('');
  }

  async function hydrateExperts() {
    var el = document.getElementById('pubExperts');
    if (!el) return;
    var list;
    try {
      var raw = await P.api.fetch('/experts?limit=8&verified=true');
      list = F.listOf(raw, ['experts']).map(normalizeExpert);
    } catch (_) { list = []; }
    if (!list.length) list = DEMO_EXPERTS.map(normalizeExpert);
    if (!document.body.contains(el)) return;
    el.innerHTML = list.slice(0, 8).map(P.components.expertCard).join('');
  }

  async function hydrateEvents() {
    var el = document.getElementById('pubEvents');
    if (!el) return;
    var list;
    try {
      var raw = await P.api.fetch('/events?upcoming=true&limit=4');
      list = F.listOf(raw, ['events']).map(normalizeEvent);
    } catch (_) { list = []; }
    if (!list.length) list = DEMO_EVENTS.map(normalizeEvent);
    if (!document.body.contains(el)) return;
    el.innerHTML = list.slice(0, 4).map(P.components.eventRow).join('');
  }

  async function hydrateResources() {
    var el = document.getElementById('pubResources');
    if (!el) return;
    var list;
    try {
      var raw = await P.api.fetch('/resources?limit=4');
      list = F.listOf(raw, ['resources']).map(normalizeResource);
    } catch (_) { list = []; }
    if (!list.length) list = DEMO_RESOURCES.map(normalizeResource);
    if (!document.body.contains(el)) return;
    el.innerHTML = list.slice(0, 4).map(P.components.resourceCard).join('');
  }
})();
