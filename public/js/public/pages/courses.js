/* ============================================================
   ExpertHub — js/public/pages/courses.js
   #/courses  —  browse courses.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.pages = P.pages || {};
  var F = P.format, esc = F.esc;
  var currentCategory = 'all';

  function render(ctx) {
    try { appPhase = 'landing'; } catch (_) {}
    P.ensureStyles();

    var q = (ctx && ctx.query && ctx.query.get && ctx.query.get('q')) || '';

    var root = document.getElementById('app-root');
    root.innerHTML = '' +
      '<div class="landing">' +
        P.components.navbar('courses') +
        '<div class="pub-page">' +
          '<h1 class="section-title" style="margin-bottom:6px">Browse courses</h1>' +
          '<p class="section-sub">Bootcamps, short courses, tuition and exam prep from verified experts.</p>' +

          '<form class="pub-search" id="pubCourseSearch" style="margin:22px 0" autocomplete="off">' +
            '<i class="fas fa-magnifying-glass"></i>' +
            '<input type="search" id="pubCourseQuery" placeholder="Search courses…" value="' + esc(q) + '">' +
            '<button class="btn btn-primary" type="submit">Search</button>' +
          '</form>' +

          '<div class="pub-chips" id="pubCourseFilters" style="margin-bottom:24px">' +
            ['all|All', 'Web Development|Web', 'Data Science|Data', 'Business|Business',
             'Exam Prep|Exam prep', 'Design|Design']
              .map(function (f, i) {
                var parts = f.split('|');
                return '<button class="pub-chip' + (i === 0 ? ' is-active' : '') + '" ' +
                  'data-action="course-filter" data-filter="' + esc(parts[0]) + '">' +
                  esc(parts[1]) + '</button>';
              }).join('') +
          '</div>' +

          '<div class="pub-grid pub-grid-3" id="pubCourseList">' + F.skeletons(6, 280) + '</div>' +
        '</div>' +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);
    bind(root);
    load({ q: q, category: 'all' });
  }

  function bind(root) {
    var form = root.querySelector('#pubCourseSearch');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        load({ q: (root.querySelector('#pubCourseQuery') || {}).value || '', category: currentCategory });
      });
    }
    /* Category chips. */
    (root.querySelectorAll('[data-action="course-filter"]') || []).forEach(function (el) {
      el.addEventListener('click', function () {
        (root.querySelectorAll('.pub-chip') || []).forEach(function (s) { s.classList.remove('is-active'); });
        el.classList.add('is-active');
        currentCategory = el.getAttribute('data-filter') || 'all';
        var qInput = root.querySelector('#pubCourseQuery');
        load({ q: qInput ? qInput.value : '', category: currentCategory });
      });
    });
  }

  async function load(opts) {
    var el = document.getElementById('pubCourseList');
    if (!el) return;
    el.innerHTML = F.skeletons(6, 280);

    var params = [];
    if (opts.q) params.push('q=' + encodeURIComponent(opts.q));
    if (opts.category && opts.category !== 'all') params.push('category=' + encodeURIComponent(opts.category));
    params.push('limit=24');

    var list;
    try {
      var raw = await P.api.fetch('/courses?' + params.join('&'));
      list = F.listOf(raw, ['courses']).map(P.normalize.course);
    } catch (_) { list = []; }
    if (!list.length) list = P.demo.courses.map(P.normalize.course);

    if (!document.body.contains(el)) return;
    el.innerHTML = list.length
      ? list.map(P.components.courseCard).join('')
      : F.empty('No courses match your filters.');
  }

  P.pages.courses = { render: render, load: load };
})();
