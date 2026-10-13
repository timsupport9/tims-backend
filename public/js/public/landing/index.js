/* ============================================================
   public/landing/index.js — Landing page composition
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    EH.state.appPhase = 'landing';
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="landing">
        ${EH.PublicNavbar.render()}
        ${EH.Hero.render()}
        ${EH.FeaturesSection.render()}
        ${EH.CategoryCard.grid()}
        ${EH.PricingSection.render()}
        ${EH.TestimonialsSection.render()}
        ${EH.FaqSection.render()}
        ${EH.DiscoverSection.render()}
        ${EH.PublicCTA.render()}
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.Hero.attach(root);
    EH.FaqSection.attach(root);
    EH.PublicCTA.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);
    EH.ScrollBehavior.init();
  }

  EH.Landing = { render };
  global.renderLanding = render;
})(window);
