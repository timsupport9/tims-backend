/* ============================================================
   ExpertHub — js/public/components/hero.js
   Hero section + unified search bar.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var esc = P.format.esc;

  P.components.hero = function () {
    return '' +
      '<main class="hero">' +
        '<div>' +
          '<span class="hero-badge"><span class="live-indicator"></span> ' +
            'Trusted by learners, experts and institutions</span>' +
          '<h1 class="hero-title">Learn, consult and grow with ' +
            '<span class="hero-title-accent">real experts</span></h1>' +
          '<p class="hero-subtitle">ExpertHub combines an E-School, bootcamps, short courses, ' +
            'tuition, exam prep, 1-on-1 consultations and full corporate training in one modern platform.</p>' +

          P.components.search() +

          '<div class="pub-chips">' +
            ['Web development', 'Data science', 'IELTS', 'Business', 'Design'].map(function (t) {
              return '<button type="button" class="pub-chip" data-action="chip" ' +
                     'data-query="' + esc(t) + '">' + esc(t) + '</button>';
            }).join('') +
          '</div>' +

          '<div class="hero-cta" style="margin-top:26px">' +
            '<button class="btn btn-primary" data-goto="#/register">' +
              '<i class="fas fa-rocket"></i> Get started free</button>' +
            '<button class="btn btn-secondary" data-goto="#/login">' +
              '<i class="fas fa-right-to-bracket"></i> I already have an account</button>' +
          '</div>' +

          '<div class="hero-stats" style="margin-top:34px">' +
            '<div><div class="hero-stat-value">2k+</div><div class="hero-stat-label">Active learners</div></div>' +
            '<div><div class="hero-stat-value">150+</div><div class="hero-stat-label">Verified experts</div></div>' +
            '<div><div class="hero-stat-value">4.9 / 5</div><div class="hero-stat-label">Average rating</div></div>' +
          '</div>' +
        '</div>' +

        '<div class="hero-visual">' +
          '<div class="hero-card">' +
            row('fa-school', '', 'E-School hub', 'Bootcamps, courses, tuition and exams') +
            row('fa-comments', 'green', '1-on-1 consultations', 'Chat, audio and video calls') +
            row('fa-user-tie', 'yellow', 'Verified experts', 'Approved by our admin team') +
          '</div>' +
          '<div class="hero-card">' +
            row('fa-building-columns', '', 'Corporate training',
                'Programmes, cohorts, assessments and compliance') +
          '</div>' +
        '</div>' +
      '</main>';
  };

  function row(icon, tint, title, desc) {
    return '<div class="hero-card-row">' +
      '<div class="hero-card-icon ' + (tint || '') + '"><i class="fas ' + icon + '"></i></div>' +
      '<div><div class="hero-card-title">' + esc(title) + '</div>' +
      '<div class="hero-card-desc">' + esc(desc) + '</div></div>' +
    '</div>';
  }
})();
