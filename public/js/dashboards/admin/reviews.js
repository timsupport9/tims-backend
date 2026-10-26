/* ============================================================
   admin/reviews.js — Review moderation
   ============================================================ */
(function () {
  AdminDash.reg('reviews', {
    nav: { label: 'Reviews', icon: 'fa-star' },
    render() {
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reviews</span></div>
        <section class="page-header"><h1 class="page-title">Reviews</h1></section>
        <section class="panel">
          ${S.reviews.length ? S.reviews.map(r => `
            <article class="review-card">
              <header class="review-header">
                <span class="review-author">${esc(r.author_name||'Anonymous')} → ${esc(r.expert_name||r.course_title||'Expert')}</span>
                <span class="star-rating">${'★'.repeat(r.rating||0)}${'☆'.repeat(5-(r.rating||0))}</span>
                <span class="${statusClass(r.status)}">${esc(r.status||'')}</span>
              </header>
              <p class="review-body">${esc(r.comment||'')}</p>
              <footer class="review-actions">
                ${r.status !== 'published' ? `<button class="btn btn-success btn-xs" data-action="review-publish" data-id="${r.id}">Publish</button>` : ''}
                ${r.status !== 'hidden' ? `<button class="btn btn-danger btn-xs" data-action="review-hide" data-id="${r.id}">Hide</button>` : ''}
              </footer>
            </article>
          `).join('') : '<p class="empty-row">No reviews</p>'}
        </section>`;
    },
    actions: {
      'review-publish': async ({ id }) => {
        await apiCall(`/api/admin/reviews/${id}`, 'PUT', { status: 'published' });
        await loadAllData(); rerenderRoleContent();
      },
      'review-hide': async ({ id }) => {
        await apiCall(`/api/admin/reviews/${id}`, 'PUT', { status: 'hidden' });
        await loadAllData(); rerenderRoleContent();
      },
    },
  });
})();
