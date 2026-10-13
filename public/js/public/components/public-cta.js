/* ============================================================
   public/components/public-cta.js — Bottom CTA band
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    return `
      <section class="public-cta">
        <div class="public-cta-content">
          <h2>Ready to start your journey?</h2>
          <p>Join thousands of learners, experts and institutions growing on ExpertHub.</p>
          <div class="hero-cta">
            <button class="btn btn-primary btn-lg" id="ctaStart">
              <i class="fas fa-rocket"></i> Get started free</button>
            <button class="btn btn-secondary btn-lg" id="ctaContact">
              <i class="fas fa-envelope"></i> Talk to sales</button>
          </div>
        </div>
      </section>`;
  }

  function attach(root) {
    if (!root) return;
    root.querySelector('#ctaStart')?.addEventListener('click', () => { location.hash = '#/register'; });
    root.querySelector('#ctaContact')?.addEventListener('click', () => { location.hash = '#/contact'; });
  }

  EH.PublicCTA = { render, attach };
})(window);
