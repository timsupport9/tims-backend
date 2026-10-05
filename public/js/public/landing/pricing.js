/* ============================================================
   ExpertHub — js/public/landing/pricing.js
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.landing = P.landing || {};
  var esc = P.format.esc;

  function card(badge, name, price, features, cta, ctaClass, href, featured) {
    return '<div class="pricing-card' + (featured ? ' featured' : '') + '">' +
      '<span class="pricing-badge">' + esc(badge) + '</span>' +
      '<h3 style="margin:0">' + esc(name) + '</h3>' +
      '<div class="pricing-price">' + price + '</div>' +
      '<ul class="pricing-features">' +
        features.map(function (f) {
          return '<li><i class="fas fa-check"></i> ' + esc(f) + '</li>';
        }).join('') +
      '</ul>' +
      '<button class="btn ' + ctaClass + ' btn-block" data-goto="' + href + '">' + esc(cta) + '</button>' +
    '</div>';
  }

  P.landing.pricing = function () {
    return '' +
      '<section class="section" id="pricing">' +
        '<h2 class="section-title">Simple, transparent pricing</h2>' +
        '<p class="section-sub">Choose the plan that fits your journey.</p>' +
        '<div class="pricing-grid">' +
          card('Learner', 'Free', '$0<span>/mo</span>', [
            'Browse all courses', '1 free consultation per month',
            'Community access', 'Progress tracking'
          ], 'Get started', 'btn-secondary', '#/register', false) +
          card('Expert', 'Pro', '20%<span> commission</span>', [
            'Create unlimited courses', 'Accept consultations',
            'Instant payouts (7-day hold)', 'Priority support'
          ], 'Become an expert', 'btn-primary', '#/register', true) +
          card('Enterprise', 'Institution', 'Let\'s talk', [
            'Team accounts and ops manager', 'Programmes, cohorts and trainees',
            'Assessments and capstone projects', 'Custom branding and SSO'
          ], 'Register institution', 'btn-secondary', '#/register', false) +
        '</div>' +
      '</section>';
  };
})();
