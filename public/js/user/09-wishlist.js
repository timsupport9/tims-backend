/* ============================================================
   ExpertHub 2.0 — 09-wishlist.js
   Saved courses.
   ============================================================ */

/* ============================================================
   E-SCHOOL — WISHLIST
   ============================================================ */
function userWishlist() {
  const wishlist = S.wishlist || [];
  const items = wishlist
    .map(w => S.courses.find(c => String(c.id) === String(w.course_id)))
    .filter(Boolean);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wishlist</span></div>
    <section class="page-header"><h1 class="page-title">My Wishlist</h1></section>

    <section class="card-grid">
      ${items.map(c => `
        <article class="program-card">
          <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
          <h4 class="program-title">${esc(c.title || '')}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price || 0)}</span>
            <span class="program-meta">${esc(c.level || '')}</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${c.id}">
              <i class="fas fa-shopping-cart"></i> Enroll</button>
            <button class="btn btn-danger btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
              <i class="fas fa-heart"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-heart"></i>
          <h3>Your wishlist is empty</h3>
          <p>Save courses you want to take later.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">
            <i class="fas fa-search"></i> Browse Courses</button>
        </div>
      `}
    </section>
  `;
}
