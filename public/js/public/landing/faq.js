/* ============================================================
   public/landing/faq.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const FaqSection = {
    render() {
      const items = EH.PublicConfig.faq || [];
      return `
        <section class="section" id="faq">
          <h2 class="section-title">Frequently asked questions</h2>
          <p class="section-sub">Everything you need to know.</p>
          <div class="faq-list">
            ${items.map(([q, a]) => `
              <div class="faq-item">
                <div class="faq-q">${EH.Fmt.esc(q)}<i class="fas fa-chevron-down"></i></div>
                <div class="faq-a">${EH.Fmt.esc(a)}</div>
              </div>
            `).join('')}
          </div>
        </section>`;
    },

    attach(root) {
      if (!root) return;
      EH.Accordion.initFaq(root);
    },
  };

  EH.FaqSection = FaqSection;
})(window);
