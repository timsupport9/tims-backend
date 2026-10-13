/* ============================================================
   dashboards/learner/wishlist.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const items = (S.wishlist || [])
      .map(w => S.courses.find(c => String(c.id) === String(w.course_id)))
      .filter(Boolean);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Wishlist' }])}
      ${EH.Layout.pageHeader('My Wishlist')}
      <section class="card-grid">
        ${items.map(c => `
          <article class="program-card">
            <span class="chip chip-blue">${EH.Fmt.esc(EH.PublicFormat.courseType(c.course_type))}</span>
            <h4 class="program-title">${EH.Fmt.esc(c.title || '')}</h4>
            <p class="program-desc">${EH.Fmt.esc(EH.Fmt.truncate(c.description, 110))}</p>
            <footer class="program-footer">
              <span class="program-price">${EH.Fmt.cur(c.price || 0)}</span>
              <span class="program-meta">${EH.Fmt.esc(c.level || '')}</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
              <button class="btn btn-primary btn-sm" data-action="enroll-modal" data-id="${c.id}">
                <i class="fas fa-shopping-cart"></i> Enroll</button>
              <button class="btn btn-danger btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
                <i class="fas fa-heart"></i> Remove</button>
            </div>
          </article>`).join('') || `
            <div class="empty-state" style="grid-column:1/-1">
              <i class="fas fa-heart"></i>
              <h3>Your wishlist is empty</h3>
              <p>Save courses you want to take later.</p>
              <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">
                <i class="fas fa-search"></i> Browse Courses</button>
            </div>`}
      </section>`;
  }

  EH.LearnerWishlist = { render };
})(window);
