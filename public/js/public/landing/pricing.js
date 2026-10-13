/* ============================================================
   public/landing/pricing.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const PricingSection = {
    render() {
      const p = EH.PublicConfig.pricing;
      return `
        <section class="section" id="pricing">
          <h2 class="section-title">Simple, transparent pricing</h2>
          <p class="section-sub">Choose the plan that fits your journey.</p>
          <div class="pricing-grid">
            ${this._card(p.learner)}
            ${this._card(p.expert)}
            ${this._card(p.institution)}
          </div>
        </section>`;
    },

    _card(plan) {
      return `
        <div class="pricing-card ${plan.featured ? 'featured' : ''}">
          <span class="pricing-badge">${EH.Fmt.esc(plan.badge)}</span>
          <h3 style="margin:0">${EH.Fmt.esc(plan.title)}</h3>
          <div class="pricing-price">
            ${EH.Fmt.esc(plan.price)}<span>${EH.Fmt.esc(plan.period)}</span>
          </div>
          <ul class="pricing-features">
            ${plan.features.map(f => `
              <li><i class="fas fa-check"></i> ${EH.Fmt.esc(f)}</li>
            `).join('')}
          </ul>
          <a class="btn ${plan.featured ? 'btn-primary' : 'btn-secondary'} btn-block"
             href="${plan.ctaAction}">${EH.Fmt.esc(plan.cta)}</a>
        </div>`;
    },
  };

  EH.PricingSection = PricingSection;
})(window);
