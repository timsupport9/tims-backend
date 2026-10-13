/* ============================================================
   ExpertHub — js/public/landing/features.js
   "Everything you need to learn, earn and train" band.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.landing = P.landing || {};

  function feature(icon, bg, title, text) {
    return '<div class="feature-card">' +
      '<div class="feature-icon"' + (bg ? ' style="background:' + bg + '"' : '') + '>' +
        '<i class="fas ' + icon + '"></i></div>' +
      '<h3>' + title + '</h3><p>' + text + '</p></div>';
  }

  P.landing.features = function () {
    var items = [
      feature('fa-graduation-cap', '', 'Learn anything',
        'Bootcamps, short courses, tuition and exam prep curated by experts.'),
      feature('fa-user-tie', 'linear-gradient(135deg,#10b981,#059669)', 'Teach and earn',
        'Experts get verified, manage consultations and withdraw earnings.'),
      feature('fa-comments', 'linear-gradient(135deg,#f59e0b,#d97706)', 'Real-time chat',
        'Live messaging, attachments, typing indicator and video calls.'),
      feature('fa-building-columns', 'linear-gradient(135deg,#8b5cf6,#6d28d9)', 'Corporate training',
        'Programmes, cohorts, assessments, certifications and compliance.'),
      feature('fa-shield-halved', 'linear-gradient(135deg,#ef4444,#b91c1c)', 'Admin controlled',
        'Approvals, moderation, payouts and full audit logging built in.'),
      feature('fa-chart-line', 'linear-gradient(135deg,#0ea5e9,#0369a1)', 'Deep analytics',
        'Track progress, scores and completion across all cohorts.')
    ];

    return '' +
      '<section class="section alt">' +
        '<h2 class="section-title">Everything you need to learn, earn and train</h2>' +
        '<p class="section-sub">A complete platform for learners, experts, institutions and administrators.</p>' +
        '<div class="features-grid">' + items.join('') + '</div>' +
      '</section>';
  };

  P.landing.feature = feature;
})();
