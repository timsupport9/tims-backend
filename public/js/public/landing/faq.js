/* ============================================================
   ExpertHub — js/public/landing/faq.js
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.landing = P.landing || {};
  var esc = P.format.esc;

  var ITEMS = [
    ['How does registration work?',
     'Learners are approved instantly. Experts and institutions require admin approval.'],
    ['What is the platform commission?',
     'We charge a flat 20% commission on all course sales and consultations.'],
    ['How long do payouts take?',
     'Withdrawals have a 7-day holding period, then process within 3 to 5 business days.'],
    ['Can I switch from learner to expert?',
     'Yes. Apply to become an expert from your dashboard. Our team reviews each application.'],
    ['Do you support corporate training?',
     'Yes. Institutions get programmes, cohorts, assessments, projects, certifications and compliance tracking.'],
    ['How do I contact support?',
     'Use the contact page or email support@experthub.example. We reply within one business day.']
  ];

  P.landing.faq = function () {
    return '' +
      '<section class="section">' +
        '<h2 class="section-title">Frequently asked questions</h2>' +
        '<p class="section-sub">Everything you need to know.</p>' +
        '<div class="faq-list">' +
          ITEMS.map(function (qa) {
            return '<div class="faq-item">' +
              '<div class="faq-q" data-action="faq">' + esc(qa[0]) +
                '<i class="fas fa-chevron-down"></i></div>' +
              '<div class="faq-a">' + esc(qa[1]) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</section>';
  };

  P.landing.faqItems = ITEMS;
})();
