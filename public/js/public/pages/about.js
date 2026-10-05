/* ============================================================
   ExpertHub — js/public/pages/about.js
   #/about
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
        P.components.navbar('about') +
        '<div class="pub-page" style="max-width:860px">' +
          '<span class="hero-badge">About ExpertHub</span>' +
          '<h1 class="section-title" style="margin:0 0 16px">One platform for learning, consulting and training</h1>' +
          '<p style="font-size:1.05rem;line-height:1.8;opacity:.78">' +
            'ExpertHub exists to close the gap between people who want to learn and the experts who can teach them. ' +
            'We bring an E-School, 1-on-1 consultations and corporate training into a single, accountable platform — ' +
            'so learners get real outcomes, experts get paid fairly, and institutions get measurable results.' +
          '</p>' +

          '<div class="features-grid" style="margin-top:36px">' +
            feature('fa-bullseye', '', 'Our mission',
                    'Make high-quality, human-guided education accessible and affordable.') +
            feature('fa-eye', 'linear-gradient(135deg,#10b981,#059669)', 'Our vision',
                    'A world where expertise can be found, booked and trusted in minutes.') +
            feature('fa-handshake', 'linear-gradient(135deg,#8b5cf6,#6d28d9)', 'Our promise',
                    'Verified experts, transparent pricing and protected payments.') +
          '</div>' +

          '<h2 class="section-title" style="font-size:1.3rem;margin:44px 0 14px">What we do</h2>' +
          '<ul class="pub-list">' +
            ['E-School — bootcamps, short courses, tuition and exam preparation.',
             'Consultations — chat, audio and video sessions with verified experts.',
             'Corporate training — programmes, cohorts, assessments and compliance tracking.',
             'Certification — verifiable certificates issued on completion.'
            ].map(function (t) {
              return '<li><i class="fas fa-circle-check"></i><span>' + esc(t) + '</span></li>';
            }).join('') +
          '</ul>' +
        '</div>' +
        P.components.cta({
          title: 'Join ExpertHub today',
          text: 'Whether you want to learn, teach or train a whole organisation, it starts here.',
          label: 'Create your account',
          href: '#/register'
        }) +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);
  }

  P.pages.about = { render: render };
})();
