/* ============================================================
   ExpertHub 2.0 — dashboards/user/wishlist.js
   Wishlist + Bundles.
   ============================================================ */

let _wishlistTab = 'courses';

function renderUserWishlist() {
  const items = (S.wishlist || [])
    .map(w => S.courses.find(c => String(c.id) === String(w.course_id)))
    .filter(Boolean);

  return UserUI.page({
    title: _wishlistTab === 'bundles' ? 'Course Bundles' : 'My Wishlist',
    breadcrumb: _wishlistTab === 'bundles' ? 'Bundles' : 'Wishlist',
    content: `
      ${UserUI.tabs([
        { id: 'courses', label: 'Wishlist Courses', icon: 'fa-heart' },
        { id: 'bundles', label: 'Bundles',          icon: 'fa-box-open' },
      ], _wishlistTab, 'data-wishlist-tab')}

      ${_wishlistTab === 'courses' ? `
        ${items.length ? UserUI.cardGrid(items.map(c => `
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
        `)) : `<section class="panel">${UserUI.empty({
          icon: 'fa-heart',
          title: 'Your wishlist is empty',
          desc: 'Save courses you want to take later.',
          actionTab: 'eschool',
          actionLabel: 'Browse Courses',
        })}</section>`}
      ` : renderUserBundles()}
    `,
  });
}

function renderUserBundles() {
  const bundles = S.courseBundles || [];
  if (!bundles.length) return `<section class="panel">${UserUI.empty({
    icon: 'fa-box-open',
    title: 'No bundles available',
    desc: 'Curated bundles save you money. Check back soon.',
  })}</section>`;
  return UserUI.cardGrid(bundles.map(b => `
    <article class="program-card">
      ${b.discount_pct ? `<span class="chip chip-green">Save ${b.discount_pct}%</span>` : ''}
      <h4 class="program-title">${esc(b.title)}</h4>
      <p class="program-desc">${esc((b.description || '').slice(0, 120))}</p>
      <div class="pricing-price" style="margin:8px 0">
        ${fmtCur(b.price)}
        ${b.original_price
          ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:.9rem;margin-left:6px">${fmtCur(b.original_price)}</span>`
          : ''}
      </div>
      <p class="program-meta">${b.course_count || 0} courses included</p>
      <button class="btn btn-primary btn-sm" data-action="purchase-bundle" data-id="${b.id}">
        <i class="fas fa-shopping-cart"></i> Buy Bundle</button>
    </article>
  `));
}

window.ExpertHubUser.registerModule('wishlist', renderUserWishlist);
window.ExpertHubUser.registerModule('bundles', renderUserWishlist);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-wishlist-tab]');
  if (!t) return;
  _wishlistTab = t.dataset.wishlistTab;
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('purchase-bundle', async (id) => {
  try {
    await apiCall(`/api/eschool/bundles/${id}/purchase`, 'POST');
    await loadAllData();
    await loadUserExtendedData();
    rerenderRoleContent();
    showToast('Bundle purchased', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});
