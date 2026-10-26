/* ============================================================
   ExpertHub 2.0 — dashboards/user/wishlist.js
   Wishlist + Bundles. Handles unavailable courses,
   deduplicates, refreshes after enrollment.
   ============================================================ */

let _wishlistTab = UserFilters.get('wishlist', 'tab', 'courses') || 'courses';

function renderUserWishlist() {
  const wishlistItems = (S.wishlist || []).map(w => {
    const c = (S.courses || []).find(c => String(c.id) === String(w.course_id));
    return { course: c, meta: w };
  });
  // Split available vs unavailable (course no longer in catalog)
  const available   = wishlistItems.filter(x => x.course);
  const unavailable = wishlistItems.filter(x => !x.course);

  return UserUI.page({
    title: _wishlistTab === 'bundles' ? 'Course Bundles' : 'My Wishlist',
    breadcrumb: _wishlistTab === 'bundles' ? 'Bundles' : 'Wishlist',
    content: `
      ${UserUI.tabs([
        { id: 'courses', label: 'Wishlist Courses', icon: 'fa-heart' },
        { id: 'bundles', label: 'Bundles',          icon: 'fa-box-open' },
      ], _wishlistTab, 'data-wishlist-tab')}

      ${_wishlistTab === 'courses' ? `
        ${available.length ? UserUI.cardGrid(available.map(({ course: c }) => {
          const enrolled = S.enrolledCourseIds.has(String(c.id));
          return `
            <article class="program-card">
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <h4 class="program-title">${esc(c.title || '')}</h4>
              <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
              <footer class="program-footer">
                <span class="program-price">${fmtCur(c.price || 0)}</span>
                <span class="program-meta">${esc(c.level || '')}</span>
              </footer>
              <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
                ${enrolled
                  ? `<button class="btn btn-success btn-sm flex-1" data-action="open-course-player" data-id="${c.id}">
                      <i class="fas fa-play"></i> Continue</button>`
                  : `<button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${c.id}">
                      <i class="fas fa-shopping-cart"></i> Enroll</button>`}
                <button class="btn btn-danger btn-sm" data-action="toggle-wishlist" data-id="${c.id}"
                        aria-label="Remove from wishlist">
                  <i class="fas fa-heart"></i></button>
              </div>
            </article>
          `;
        })) : `<section class="panel">${UserUI.empty({
          icon: 'fa-heart',
          title: 'Your wishlist is empty',
          desc: 'Save courses you want to take later.',
          actionTab: 'eschool',
          actionLabel: 'Browse Courses',
        })}</section>`}

        ${unavailable.length ? `
          <section class="panel">
            <h3 class="panel-title">Unavailable Courses</h3>
            ${unavailable.map(({ meta }) => `
              <div class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">Course ${esc(meta.course_id)}</span>
                  <span class="list-row-sub">This course is no longer available.</span>
                </div>
                <button class="btn btn-danger btn-xs" data-action="remove-wishlist-item" data-course="${meta.course_id}">
                  <i class="fas fa-trash"></i> Remove</button>
              </div>
            `).join('')}
          </section>
        ` : ''}
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
      ${b.owned
        ? '<span class="chip chip-green"><i class="fas fa-check"></i> Owned</span>'
        : `<button class="btn btn-primary btn-sm" data-action="purchase-bundle" data-id="${b.id}">
            <i class="fas fa-shopping-cart"></i> Buy Bundle</button>`}
    </article>
  `));
}

window.ExpertHubUser.registerModule('wishlist', renderUserWishlist);
window.ExpertHubUser.registerModule('bundles', renderUserWishlist);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-wishlist-tab]');
  if (!t) return;
  _wishlistTab = t.dataset.wishlistTab;
  UserFilters.set('wishlist', 'tab', _wishlistTab);
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('remove-wishlist-item', async (courseId) => {
  try {
    await apiCall('/api/user/wishlist/toggle', 'POST', { course_id: Number(courseId) });
    S.wishlist = (S.wishlist || []).filter(w => String(w.course_id) !== String(courseId));
    S.wishlistIds = new Set(S.wishlist.map(w => String(w.course_id)));
    rerenderRoleContent();
    showToast('Removed from wishlist', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('purchase-bundle', async (id) => {
  try {
    const info = await apiCall(`/api/eschool/bundles/${id}/pricing`).catch(() => null);
    const price = Number(info?.price ?? 0);
    if (info?.owned) return showToast('You already own this bundle', 'info');
    if (price > 0) {
      const balance = S.wallet?.balance || 0;
      const ok = await confirmDialog(
        balance >= price
          ? `Purchase bundle for ${fmtCur(price)}?`
          : `Insufficient wallet balance (${fmtCur(balance)}). You will be redirected to payment. Continue?`
      );
      if (!ok) return;
    }
    await apiCall(`/api/eschool/bundles/${id}/purchase`, 'POST');
    await loadAllData?.();
    await loadUserExtendedData({ force: true });
    rerenderRoleContent();
    showToast('Bundle purchased', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});