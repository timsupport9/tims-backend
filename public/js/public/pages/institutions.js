/* ============================================================
   ExpertHub — js/public/pages/institutions.js
   #/institutions  —  public pitch to institutions.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.pages = P.pages || {};
  var esc = P.format.esc;
  var feature = P.landing.feature;

  function render() {
    try { appPhase = 'landing'; } catch (_) {}
    P.ensureStyles();

    var root = document.getElementById('app-root');
    root.innerHTML = '' +
      '<div class="landing">' +
        P.components.navbar('institutions') +
        '<div class="pub-page" style="max-width:1000px">' +
          '<span class="hero-badge">For institutions</span>' +
          '<h1 class="section-title" style="margin:0 0 16px">Corporate training that actually reports back</h1>' +
          '<p style="font-size:1.05rem;line-height:1.8;opacity:.78;max-width:70ch">' +
            'Run cohorts, assign trainers, assess trainees and prove compliance — all from one dashboard. ' +
            'ExpertHub gives L&amp;D teams the operational control of an LMS with the flexibility of a marketplace.' +
          '</p>' +

          '<div class="features-grid" style="margin-top:36px">' +
            feature('fa-users-rectangle', '', 'Programmes &amp; cohorts',
                    'Build multi-week programmes and group trainees into cohorts.') +
            feature('fa-clipboard-check', 'linear-gradient(135deg,#10b981,#059669)', 'Assessments',
                    'Quizzes, assignments and capstone projects with automatic scoring.') +
            feature('fa-certificate', 'linear-gradient(135deg,#f59e0b,#d97706)', 'Certifications',
                    'Issue verifiable certificates your HR system can validate.') +
            feature('fa-chart-pie', 'linear-gradient(135deg,#8b5cf6,#6d28d9)', 'Analytics',
                    'Completion, scores and engagement across every cohort.') +
            feature('fa-shield-halved', 'linear-gradient(135deg,#ef4444,#b91c1c)', 'Compliance',
                    'Audit logs, attendance records and exportable reports.') +
            feature('fa-plug', 'linear-gradient(135deg,#0ea5e9,#0369a1)', 'Integrations',
                    'SSO, custom branding and API access on enterprise plans.') +
          '</div>' +

          '<h2 class="section-title" style="font-size:1.3rem;margin:48px 0 16px">How onboarding works</h2>' +
          '<ul class="pub-list">' +
            ['Register your institution and tell us about your training needs.',
             'Our team reviews and approves your account, usually within one business day.',
             'An operations manager is assigned to help you structure your first programme.',
             'Enrol trainees, assign trainers and start tracking progress immediately.'
            ].map(function (t, i) {
              return '<li><span class="pub-tag" style="flex:none">' + (i + 1) + '</span>' +
                     '<span>' + esc(t) + '</span></li>';
            }).join('') +
          '</ul>' +
        '</div>' +
        P.components.cta({
          title: 'Talk to our training team',
          text: 'Tell us about your organisation and we will design a programme around your goals.',
          label: 'Register institution',
          href: '#/register',
          icon: 'fa-building-columns'
        }) +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);
  }

  P.pages.institutions = { render: render };
})();
