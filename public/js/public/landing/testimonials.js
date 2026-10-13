/* ============================================================
   public/landing/testimonials.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const TestimonialsSection = {
    render() {
      const items = EH.PublicConfig.testimonials || [];
      return `
        <section class="section alt" id="testimonials">
          <h2 class="section-title">Loved by learners, experts and institutions</h2>
          <p class="section-sub">Real stories from our community.</p>
          <div class="testimonials-grid">
            ${items.map(t => `
              <div class="testimonial">
                <p class="testimonial-text">"${EH.Fmt.esc(t.text)}"</p>
                <div class="testimonial-author">
                  <img class="testimonial-avatar"
                       src="https://ui-avatars.com/api/?background=${t.avatarBg}&color=fff&name=${encodeURIComponent(t.name)}"
                       alt="" />
                  <div>
                    <div class="testimonial-name">${EH.Fmt.esc(t.name)}</div>
                    <div class="testimonial-role">${EH.Fmt.esc(t.role)}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>`;
    },
  };

  EH.TestimonialsSection = TestimonialsSection;
})(window);
