/* ============================================================
   dashboards/expert/reviews.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function stars(n) {
    return '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
  }

  function render() {
    const reviews = S.reviews || [];
    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
      : '0.0';

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Reviews' }])}
      ${EH.Layout.pageHeader('My Reviews')}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'Average Rating', value: avg, icon: 'fa-star', tone: 'yellow' }),
        EH.Layout.statCard({ label: 'Total Reviews', value: reviews.length, icon: 'fa-comment', tone: 'blue' }),
        EH.Layout.statCard({ label: '5-Star Reviews',
          value: reviews.filter(r => r.rating === 5).length, icon: 'fa-thumbs-up', tone: 'green' }),
        EH.Layout.statCard({ label: 'With Replies',
          value: reviews.filter(r => r.reply).length, icon: 'fa-reply', tone: 'purple' }),
      ])}

      <section class="panel">
        ${reviews.length ? reviews.map(r => `
          <article class="review-card">
            <header class="review-header">
              <span class="review-author">${EH.Fmt.esc(r.author_name || 'Anonymous')}</span>
              <span class="star-rating">${stars(r.rating)}</span>
              <span class="review-date">${EH.Dates.fmtDate(r.created_at)}</span>
            </header>
            <p class="review-body">${EH.Fmt.esc(r.comment || '')}</p>
            ${r.reply
              ? `<div class="alert alert-info" style="margin-top:10px">
                  <i class="fas fa-reply"></i>
                  <strong>Your reply:</strong> ${EH.Fmt.esc(r.reply)}
                </div>`
              : `<footer class="review-actions">
                  <button class="btn btn-secondary btn-sm" data-action="reply-review" data-id="${r.id}">
                    <i class="fas fa-reply"></i> Reply</button>
                </footer>`}
          </article>`).join('') : `
            <div class="empty-state">
              <i class="fas fa-star"></i>
              <h3>No reviews yet</h3>
              <p>Complete consultations to receive reviews from clients.</p>
            </div>`}
      </section>`;
  }

  EH.ExpertReviews = { render };
})(window);
