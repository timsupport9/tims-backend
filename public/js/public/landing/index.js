/* ============================================================
   ExpertHub — js/public/landing/index.js
   Coordinator for the landing page (#/).
   Keeps the global `renderLanding()` name for backward compat
   with the existing 15-router.js.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};

  function renderLanding() {
    /* eslint-disable no-undef */
    try { appPhase = 'landing'; } catch (_) { try { window.appPhase = 'landing'; } catch (__) {} }
    P.ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' +
        P.components.navbar('home') +
        P.components.hero() +
        P.landing.discover() +
        P.landing.features() +
        P.landing.pricing() +
        P.landing.testimonials() +
        P.landing.faq() +
        P.components.cta() +
        P.components.footer() +
      '</div>';

    /* Wire DOM. */
    P.bindGoto(root);
    P.components.mountSearch(root);

    /* Async hydration. */
    P.landing.hydrateDiscover();
    P.landing.hydrateTestimonials();

    /* FAQ uses data-action="faq" — handled by global delegation in bind.js. */
  }

  /* Expose globally so the legacy router keeps working. */
  window.renderLanding = renderLanding;
  P.landing.render = renderLanding;
})();
