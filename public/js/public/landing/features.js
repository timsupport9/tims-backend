/* ============================================================
   public/landing/features.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const FeaturesSection = {
    render() {
      const features = EH.PublicConfig.features || [];
      return `
        <section class="section alt" id="features">
          <h2 class="section-title">Everything you need to learn, earn and train</h2>
          <p class="section-sub">A complete platform for learners, experts, institutions and administrators.</p>
          <div class="features-grid">
            ${features.map(f => `
              <div class="feature-card">
                <div class="feature-icon" style="${EH.PublicStyles.featureIconBg(f.color)}">
                  <i class="fas ${EH.Fmt.esc(f.icon)}"></i>
                </div>
                <h3>${EH.Fmt.esc(f.title)}</h3>
                <p>${EH.Fmt.esc(f.desc)}</p>
              </div>
            `).join('')}
          </div>
        </section>`;
    },
  };

  EH.FeaturesSection = FeaturesSection;
})(window);
