/* ============================================================
   ExpertHub 2.0 — js/expert/15-reviews.js
   Expert reviews list + reply.
   ============================================================ */

function expertReviews() {
  const reviews = S.reviews || [];
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reviews</span></div>
    <section class="page-header"><h1 class="page-title">My Reviews</h1></section>

    <div class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Average Rating</p><p class="stat-value">${avg}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Reviews</p><p class="stat-value">${reviews.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comment"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">5-Star Reviews</p><p class="stat-value">${reviews.filter(r => r.rating === 5).length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-thumbs-up"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">With Replies</p><p class="stat-value">${reviews.filter(r => r.reply).length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-reply"></i></div>
      </div>
    </div>

    <section class="panel">
      ${reviews.length ? reviews.map(r => `
        <article class="review-card">
          <header class="review-header">
            <span class="review-author">${esc(r.author_name || 'Anonymous')}</span>
            <span class="star-rating">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
            <span class="review-date">${fmtDate(r.created_at)}</span>
          </header>
          <p class="review-body">${esc(r.comment || '')}</p>
          ${r.reply
            ? `<div class="alert alert-info" style="margin-top:10px">
                <i class="fas fa-reply"></i>
                <strong>Your reply:</strong> ${esc(r.reply)}
              </div>`
            : `<footer class="review-actions">
                <button class="btn btn-secondary btn-sm" data-action="reply-review" data-id="${r.id}">
                  <i class="fas fa-reply"></i> Reply</button>
              </footer>`
          }
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-star"></i>
          <h3>No reviews yet</h3>
          <p>Complete consultations to receive reviews from clients.</p>
        </div>
      `}
    </section>
  `;
}
