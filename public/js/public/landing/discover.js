/* ============================================================
   public/landing/discover.js — Featured courses/experts/events
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const DiscoverSection = {
    render() {
      const courses = (EH.FallbackContent.courses || []).slice(0, 3);
      const experts = (EH.FallbackContent.experts || []).slice(0, 3);
      return `
        <section class="section" id="discover">
          <h2 class="section-title">Discover featured courses</h2>
          <p class="section-sub">Handpicked by our team.</p>
          <div class="card-grid">
            ${courses.map(c => EH.CourseCard.render(c)).join('')}
          </div>

          <h2 class="section-title" style="margin-top:48px">Meet our experts</h2>
          <p class="section-sub">Verified professionals ready to help you grow.</p>
          <div class="card-grid">
            ${experts.map(e => EH.ExpertCard.render(e)).join('')}
          </div>
        </section>`;
    },
  };

  EH.DiscoverSection = DiscoverSection;
})(window);
