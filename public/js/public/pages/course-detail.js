/* ============================================================
   ExpertHub — js/public/pages/course-detail.js
   #/courses/:id  —  public course detail page.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.pages = P.pages || {};
  var F = P.format, esc = F.esc;

  function render(params) {
    try { appPhase = 'landing'; } catch (_) {}
    P.ensureStyles();

    var root = document.getElementById('app-root');
    root.innerHTML = '' +
      '<div class="landing">' +
        P.components.navbar('courses') +
        '<div class="pub-page" id="pubCourseDetail">' + F.skeletons(1, 420) + '</div>' +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);
    load(params && params.id);
  }

  async function load(id) {
    var host = document.getElementById('pubCourseDetail');
    if (!id || !host) return;

    var course;
    try {
      var raw = await P.api.fetch('/courses/' + encodeURIComponent(id));
      var c = F.oneOf(raw, ['course']);
      course = c ? P.normalize.course(c) : null;
    } catch (_) { course = null; }
    if (!course) {
      for (var i = 0; i < P.demo.courses.length; i++) {
        if (String(P.demo.courses[i].id) === String(id)) { course = P.normalize.course(P.demo.courses[i]); break; }
      }
    }
    if (!document.body.contains(host)) return;

    if (!course) {
      host.innerHTML = F.empty('That course could not be found.',
                               'Back to courses',
                               'data-goto="#/courses"');
      P.bindGoto(host);
      return;
    }

    var authed = !!(window.S && (S.user || S.token));
    var enrolledHref = authed ? '#/courses' : '#/register';

    host.innerHTML = '' +
      '<button class="pub-link" data-goto="#/courses" style="margin-bottom:20px">' +
        '<i class="fas fa-arrow-left"></i> All courses</button>' +

      '<div class="pub-detail-hero">' +
        '<div>' +
          '<span class="pub-tag" style="display:inline-block;margin-bottom:12px">' + esc(course.category) + '</span>' +
          '<h1 class="section-title" style="margin:0 0 12px">' + esc(course.title) + '</h1>' +
          '<p style="font-size:1.02rem;line-height:1.7;opacity:.72;margin:0 0 18px">' + esc(course.summary) + '</p>' +
          '<div class="pub-card-meta" style="padding:0;font-size:.85rem;gap:16px">' +
            (course.rating ? '<span><i class="fas fa-star" style="color:#f59e0b"></i> ' + Number(course.rating).toFixed(1) + '</span>' : '') +
            (course.lessons ? '<span><i class="fas fa-book-open"></i> ' + course.lessons + ' lessons</span>' : '') +
            (course.durationWeeks ? '<span><i class="fas fa-clock"></i> ' + course.durationWeeks + ' weeks</span>' : '') +
            '<span><i class="fas fa-signal"></i> ' + esc(course.level) + '</span>' +
          '</div>' +
        '</div>' +
        '<aside class="pub-side">' +
          '<div class="pub-detail-cover" style="aspect-ratio:16/10">' +
            '<img src="' + esc(F.safeImage(course.thumbnail, course.title)) + '" alt="">' +
          '</div>' +
          '<div class="pub-side-price">' + esc(F.money(course.price, course.currency)) + '</div>' +
          '<button class="btn btn-primary btn-block" data-goto="' + enrolledHref + '">' +
            '<i class="fas fa-graduation-cap"></i> ' +
            (authed ? 'Enrol now' : 'Create account to enrol') + '</button>' +
          '<button class="btn btn-secondary btn-block" data-goto="#/contact">' +
            '<i class="fas fa-circle-question"></i> Ask a question</button>' +
        '</aside>' +
      '</div>' +

      '<section style="margin-top:40px">' +
        '<h2 class="section-title" style="font-size:1.3rem;margin-bottom:16px">What you will learn</h2>' +
        '<ul class="pub-list">' +
          ['Master the core concepts through guided, project-based lessons.',
           'Work through real assignments with feedback from your instructor.',
           'Join live sessions and get your questions answered directly.',
           'Finish with a portfolio-ready capstone project.',
           'Earn a verifiable ExpertHub certificate on completion.'
          ].map(function (t) {
            return '<li><i class="fas fa-circle-check"></i><span>' + esc(t) + '</span></li>';
          }).join('') +
        '</ul>' +
      '</section>';

    P.bindGoto(host);
  }

  P.pages.courseDetail = { render: render, load: load };
})();
