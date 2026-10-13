/* ============================================================
   dashboards/admin/reviews.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function stars(n) {
    return '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
  }

  function render() {
    const list = S.reviews.length ? S.reviews.map(r => `
      <article class="review-card">
        <header class="review-header">
          <span class="review-author">
            ${EH.Fmt.esc(r.author_name || 'Anonymous')} → ${EH.Fmt.esc(r.expert_name || 'Expert')}
          </span>
          <span class="star-rating">${stars(r.rating)}</span>
          <span class="${EH.Fmt.statusClass(r.status)}">${EH.Fmt.esc(r.status || '')}</span>
        </header>
        <p class="review-body">${EH.Fmt.esc(r.comment || '')}</p>
        <footer class="review-actions">
          ${r.status !== 'published' ? `<button class="btn btn-success btn-xs" data-action="review-publish" data-id="${r.id}">Publish</button>` : ''}
          ${r.status !== 'hidden' ? `<button class="btn btn-danger btn-xs" data-action="review-hide" data-id="${r.id}">Hide</button>` : ''}
        </footer>
      </article>`).join('') : '<p class="empty-row">No reviews</p>';

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Reviews' }])}
      ${EH.Layout.pageHeader('Reviews')}
      <section class="panel">${list}</section>`;
  }

  EH.AdminReviews = { render };
})(window);
