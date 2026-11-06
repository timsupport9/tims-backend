/* ============================================================
   ExpertHub 2.0 — dashboards/user/packages.js
   Comprehensive package catalogue, comparison, purchase,
   usage tracking, renewal, receipts.
   ============================================================ */

/* ---------------- Module state ---------------- */
S.packageCatalogue    = S.packageCatalogue    || [];   // available packages to buy
S.userPackages        = S.userPackages        || [];   // purchased packages
S.packageCompareList  = S.packageCompareList  || [];   // ids
S.packageHistory      = S.packageHistory      || [];   // past transactions
S.packageCategories   = S.packageCategories   || [];
S.packageState        = S.packageState        || 'idle'; // idle|loading|ok|error|empty
S.packageRecommended  = S.packageRecommended  || [];

const PACKAGE_FILTER_KEY    = 'packages';
const PACKAGE_PAGE_SIZE     = 9;
const PACKAGE_COMPARE_MAX   = 3;
const PACKAGE_EXPIRY_WARN_DAYS = 7;

/* ---------------- Helpers ---------------- */

function _isPackageUsable(p) {
  if (!p) return false;
  if (Number(p.sessions_remaining || 0) <= 0 && !p.unlimited) return false;
  if (p.status && ['expired', 'cancelled', 'refunded'].includes(p.status)) return false;
  if (p.expires_at && new Date(p.expires_at).getTime() < Date.now()) return false;
  return true;
}
function _expiresSoon(p) {
  if (!p.expires_at) return false;
  const days = (new Date(p.expires_at).getTime() - Date.now()) / 86400000;
  return days > 0 && days <= PACKAGE_EXPIRY_WARN_DAYS;
}
function _pkgFilters() {
  return {
    tab:      UserFilters.get(PACKAGE_FILTER_KEY, 'tab', 'catalogue') || 'catalogue',
    query:    UserFilters.get(PACKAGE_FILTER_KEY, 'q', '') || '',
    category: UserFilters.get(PACKAGE_FILTER_KEY, 'category', '') || '',
    sort:     UserFilters.get(PACKAGE_FILTER_KEY, 'sort', 'popular') || 'popular',
    page:     Number(UserFilters.get(PACKAGE_FILTER_KEY, 'page', 1)) || 1,
  };
}
function _setPkgFilter(k, v) {
  UserFilters.set(PACKAGE_FILTER_KEY, k, v);
  if (k !== 'page') UserFilters.set(PACKAGE_FILTER_KEY, 'page', 1);
}

/* ---------------- Loader ---------------- */

let __pkgLoadingPromise = null;

async function _loadPackages({ force = false } = {}) {
  if (__pkgLoadingPromise) return __pkgLoadingPromise;
  if (S.packageState === 'ok' && !force) return;

  S.packageState = 'loading';
  __pkgLoadingPromise = (async () => {
    const [cat, purch, history, rec] = await Promise.allSettled([
      apiCall('/api/user/packages/catalogue').catch(() => ({ packages: [] })),
      apiCall('/api/user/packages').catch(() => ({ packages: [] })),
      apiCall('/api/user/packages/history').catch(() => ({ history: [] })),
      apiCall('/api/user/packages/recommended').catch(() => ({ packages: [] })),
    ]);
    if (cat.status === 'fulfilled') S.packageCatalogue = cat.value?.packages || [];
    if (purch.status === 'fulfilled') S.userPackages = purch.value?.packages || [];
    if (history.status === 'fulfilled') S.packageHistory = history.value?.history || [];
    if (rec.status === 'fulfilled') S.packageRecommended = rec.value?.packages || [];
    // Derive categories if backend didn't supply them
    S.packageCategories = Array.from(
      new Set((S.packageCatalogue || []).map(p => p.category).filter(Boolean))
    ).sort();
    S.packageState = (S.packageCatalogue || []).length || (S.userPackages || []).length ? 'ok' : 'empty';
  })().finally(() => { __pkgLoadingPromise = null; });
  return __pkgLoadingPromise;
}

/* ---------------- Main renderer ---------------- */

function renderUserPackages() {
  if (S.packageState === 'idle' || S.packageState === 'loading') {
    _loadPackages().then(() => rerenderRoleContent()).catch(() => {});
  }
  const f = _pkgFilters();

  return UserUI.page({
    title: 'Session Packages',
    breadcrumb: 'Packages',
    actions: `
      <button class="btn btn-secondary" data-action="open-package-comparison">
        <i class="fas fa-columns"></i> Compare (${(S.packageCompareList || []).length}/${PACKAGE_COMPARE_MAX})</button>
      <button class="btn btn-secondary" data-action="view-package-history">
        <i class="fas fa-history"></i> History</button>
    `,
    content: `
      ${S.packageState === 'loading' ? UserUI.loading('Loading packages…') : ''}
      ${S.packageState === 'error' ? UserUI.errorState({
        title: 'Could not load packages',
        retryAction: 'reload-packages',
        retryLabel: 'Retry',
      }) : ''}

      ${S.packageState === 'ok' || S.packageState === 'empty' ? `
        ${UserUI.tabs([
          { id: 'catalogue', label: 'Catalogue', icon: 'fa-store' },
          { id: 'my',        label: 'My Packages', icon: 'fa-ticket-alt' },
        ], f.tab, 'data-pkg-tab')}

        ${f.tab === 'catalogue' ? renderPackageCatalogue(f) : renderMyPackages()}
      ` : ''}
    `,
  });
}

/* ============================================================ */
/* Catalogue tab                                                */
/* ============================================================ */

function renderPackageCatalogue(f) {
  const recommended = (S.packageRecommended || []).slice(0, 3);
  const list = (S.packageCatalogue || []).slice();

  let filtered = list;
  if (f.query) {
    const q = f.query.toLowerCase();
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q));
  }
  if (f.category) filtered = filtered.filter(p => p.category === f.category);

  filtered.sort((a, b) => {
    if (f.sort === 'price_asc')  return Number(a.price || 0) - Number(b.price || 0);
    if (f.sort === 'price_desc') return Number(b.price || 0) - Number(a.price || 0);
    if (f.sort === 'popular')    return Number(b.purchase_count || 0) - Number(a.purchase_count || 0);
    if (f.sort === 'newest')     return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return 0;
  });

  const total = filtered.length;
  const page = Math.min(f.page, Math.max(1, Math.ceil(total / PACKAGE_PAGE_SIZE) || 1));
  const paged = filtered.slice((page - 1) * PACKAGE_PAGE_SIZE, page * PACKAGE_PAGE_SIZE);

  return `
    ${recommended.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-lightbulb"></i> Recommended for you</h3>
        <p class="form-hint">Based on your activity and current entitlements.</p>
        <div class="card-grid">
          ${recommended.map(p => renderPackageCard(p, { compact: true })).join('')}
        </div>
      </section>
    ` : ''}

    <section class="panel">
      <div class="expert-filters">
        <input type="search" id="pkg-search" class="form-input"
               placeholder="Search packages…" value="${esc(f.query)}" style="max-width:240px" />
        <select id="pkg-category" class="form-select" style="max-width:180px">
          <option value="">All categories</option>
          ${(S.packageCategories || []).map(c =>
            `<option value="${esc(c)}" ${f.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <select id="pkg-sort" class="form-select" style="max-width:180px">
          <option value="popular"    ${f.sort === 'popular' ? 'selected' : ''}>Most popular</option>
          <option value="price_asc"  ${f.sort === 'price_asc' ? 'selected' : ''}>Price: low → high</option>
          <option value="price_desc" ${f.sort === 'price_desc' ? 'selected' : ''}>Price: high → low</option>
          <option value="newest"     ${f.sort === 'newest' ? 'selected' : ''}>Newest</option>
        </select>
      </div>

      ${paged.length ? `
        <div class="card-grid" style="margin-top:12px">
          ${paged.map(p => renderPackageCard(p)).join('')}
        </div>
        ${UserUI.pagination({ page, pageSize: PACKAGE_PAGE_SIZE, total, action: 'pkg-page', key: 'catalogue' })}
      ` : UserUI.empty({
        icon: 'fa-store',
        title: 'No packages match',
        desc: 'Try adjusting the filters.',
      })}
    </section>
  `;
}

function renderPackageCard(p, opts = {}) {
  const comparing = (S.packageCompareList || []).includes(String(p.id));
  const owned = (S.userPackages || []).some(u => String(u.package_id) === String(p.id) && _isPackageUsable(u));
  return `
    <article class="program-card">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <span class="chip chip-blue">${esc(p.category || 'Package')}</span>
        ${owned ? '<span class="chip chip-green">Owned</span>' : ''}
        ${p.discount_pct ? `<span class="chip chip-yellow">-${p.discount_pct}%</span>` : ''}
      </div>
      <h4 class="program-title">${esc(p.name || '')}</h4>
      <p class="program-desc">${esc((p.description || '').slice(0, 140))}</p>
      ${(p.benefits || []).length && !opts.compact ? `
        <ul class="prereq-list" style="margin-top:8px">
          ${(p.benefits || []).slice(0, 4).map(b =>
            `<li><i class="fas fa-check" style="color:var(--accent)"></i> ${esc(b)}</li>`).join('')}
        </ul>
      ` : ''}
      <div class="pricing-price" style="margin:8px 0">
        <strong>${fmtCur(p.price || 0)}</strong>
        ${p.original_price ? `<span style="text-decoration:line-through;color:var(--text-muted);margin-left:8px">${fmtCur(p.original_price)}</span>` : ''}
      </div>
      <p class="program-meta">
        ${p.sessions_total ? `${p.sessions_total} sessions` : ''}
        ${p.validity_days ? ` · ${p.validity_days}d validity` : ''}
        ${p.discount_pct ? ` · Save ${p.discount_pct}%` : ''}
      </p>
      <div class="panel-actions" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        ${owned
          ? `<button class="btn btn-secondary btn-sm flex-1" disabled>Owned</button>`
          : `<button class="btn btn-primary btn-sm flex-1" data-action="purchase-package" data-id="${p.id}">
              <i class="fas fa-shopping-cart"></i> Buy</button>`}
        <button class="btn btn-secondary btn-sm" data-action="view-package-detail" data-id="${p.id}">
          <i class="fas fa-eye"></i></button>
        <button class="btn btn-secondary btn-sm" data-action="toggle-package-compare" data-id="${p.id}"
                aria-label="${comparing ? 'Remove from comparison' : 'Add to comparison'}">
          <i class="fas fa-columns" style="color:${comparing ? 'var(--brand)' : 'inherit'}"></i></button>
      </div>
    </article>
  `;
}

/* ============================================================ */
/* My Packages tab                                              */
/* ============================================================ */

function renderMyPackages() {
  const pkgs = S.userPackages || [];
  const usable    = pkgs.filter(_isPackageUsable);
  const expired   = pkgs.filter(p => !_isPackageUsable(p) && Number(p.sessions_remaining || 0) > 0);
  const exhausted = pkgs.filter(p => Number(p.sessions_remaining || 0) <= 0 && !p.unlimited);
  const pending   = pkgs.filter(p => p.status === 'pending_payment' || p.status === 'pending_activation');

  return `
    ${UserUI.stats([
      { label: 'Active',    value: usable.length,    icon: 'fa-ticket-alt', tone: 'green' },
      { label: 'Pending',   value: pending.length,   icon: 'fa-clock',      tone: 'yellow' },
      { label: 'Expired',   value: expired.length,   icon: 'fa-ban',        tone: 'red' },
      { label: 'Exhausted', value: exhausted.length, icon: 'fa-check',      tone: 'blue' },
    ])}

    ${usable.length ? `
      <section class="panel">
        <h3 class="panel-title">Active Packages</h3>
        <div class="card-grid">
          ${usable.map(p => renderUserPackageCard(p)).join('')}
        </div>
      </section>
    ` : ''}

    ${pending.length ? `
      <section class="panel">
        <h3 class="panel-title">Pending Payment / Activation</h3>
        <ul class="list-stack">
          ${pending.map(p => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(p.package_name || '')}</span>
                <span class="list-row-sub">Status: ${esc(p.status || '')} · Purchase ref: ${esc(p.reference || p.id)}</span>
              </div>
              <button class="btn btn-primary btn-sm" data-action="complete-package-payment" data-id="${p.package_id || p.id}">
                <i class="fas fa-credit-card"></i> Complete Payment</button>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    ${expired.length ? `
      <section class="panel">
        <h3 class="panel-title">Expired Packages</h3>
        <ul class="list-stack">
          ${expired.map(p => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(p.package_name || '')}</span>
                <span class="list-row-sub">Expired ${fmtDate(p.expires_at)} · ${p.sessions_remaining || 0} unused</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-xs" data-action="package-history" data-id="${p.package_id || p.id}">History</button>
                <button class="btn btn-primary btn-xs" data-action="renew-package" data-id="${p.package_id || p.id}">
                  <i class="fas fa-redo"></i> Renew</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    ${exhausted.length ? `
      <section class="panel">
        <h3 class="panel-title">Used Packages</h3>
        <ul class="list-stack">
          ${exhausted.map(p => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(p.package_name || '')}</span>
                <span class="list-row-sub">All sessions used · Purchased ${fmtDate(p.purchased_at || p.created_at)}</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-xs" data-action="package-history" data-id="${p.package_id || p.id}">History</button>
                <button class="btn btn-primary btn-xs" data-action="renew-package" data-id="${p.package_id || p.id}">
                  <i class="fas fa-redo"></i> Buy again</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    ${!pkgs.length ? `
      <section class="panel">${UserUI.empty({
        icon: 'fa-ticket-alt',
        title: 'No packages purchased',
        desc: 'Browse the catalogue to save on multi-session bookings.',
      })}</section>
    ` : ''}
  `;
}

function renderUserPackageCard(p) {
  const total = Number(p.sessions_total || 0);
  const used = Number(p.sessions_used || 0);
  const remaining = Number(p.sessions_remaining || 0);
  const pct = total ? Math.round((used / total) * 100) : 0;

  return `
    <article class="program-card">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <span class="chip chip-${_isPackageUsable(p) ? 'green' : 'neutral'}">
          ${p.unlimited ? 'Unlimited' : `${remaining} of ${total} left`}
        </span>
        ${_expiresSoon(p) ? '<span class="chip chip-yellow"><i class="fas fa-clock"></i> Expires soon</span>' : ''}
      </div>
      <h4 class="program-title">${esc(p.package_name || '')}</h4>
      ${p.expert_name ? `<p class="program-desc">with ${esc(p.expert_name)}</p>` : ''}
      ${total ? `
        <div class="progress-bar" style="margin-top:8px">
          <span style="width:${pct}%"></span>
        </div>
        <p class="program-meta">${used}/${total} used</p>
      ` : ''}
      <p class="program-meta">Expires: ${p.expires_at ? fmtDate(p.expires_at) : '—'}</p>
      <div class="panel-actions" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        ${_isPackageUsable(p) ? `
          <button class="btn btn-primary btn-sm flex-1" data-action="use-package-credit"
                  data-id="${p.package_id || p.id}">
            <i class="fas fa-calendar-plus"></i> Book Next</button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" data-action="package-history" data-id="${p.package_id || p.id}">
          <i class="fas fa-history"></i></button>
        <button class="btn btn-secondary btn-sm" data-action="renew-package" data-id="${p.package_id || p.id}">
          <i class="fas fa-redo"></i></button>
      </div>
    </article>
  `;
}

/* ============================================================ */
/* Package detail modal                                         */
/* ============================================================ */

window.ExpertHubUser.registerAction('view-package-detail', async (id) => {
  const p = (S.packageCatalogue || []).find(x => String(x.id) === String(id)) ||
            (S.userPackages || []).find(x => String(x.package_id) === String(id)) || {};
  let detail = null;
  try { detail = await apiCall(`/api/user/packages/catalogue/${id}`).catch(() => null); } catch {}
  const pkg = detail?.package || p;

  openModal({
    title: pkg.name || 'Package',
    className: 'modal-lg',
    body: `
      <p class="form-hint">${esc(pkg.category || '')}</p>
      <p>${esc(pkg.description || '')}</p>
      ${pkg.audience ? `<p><strong>Intended for:</strong> ${esc(pkg.audience)}</p>` : ''}

      ${(pkg.benefits || []).length ? `
        <h3 class="panel-title" style="margin-top:16px">Included Benefits</h3>
        <ul class="prereq-list">${pkg.benefits.map(b =>
          `<li><i class="fas fa-check-circle" style="color:var(--accent)"></i> ${esc(b)}</li>`).join('')}
        </ul>
      ` : ''}

      <h3 class="panel-title" style="margin-top:16px">Pricing</h3>
      <p><strong style="font-size:1.3rem">${fmtCur(pkg.price || 0)}</strong>
        ${pkg.original_price ? `<span style="text-decoration:line-through;color:var(--text-muted);margin-left:8px">${fmtCur(pkg.original_price)}</span>` : ''}</p>
      ${pkg.discount_pct ? `<p class="form-hint">You save ${pkg.discount_pct}%</p>` : ''}

      <h3 class="panel-title" style="margin-top:16px">Validity</h3>
      <p>${pkg.validity_days ? `${pkg.validity_days} days from purchase` : 'No expiry'}</p>
      ${pkg.renewable ? `<p class="form-hint">Renewable — you can extend before expiry.</p>` : ''}

      ${(pkg.terms || []).length ? `
        <h3 class="panel-title" style="margin-top:16px">Terms</h3>
        <ul class="prereq-list">${pkg.terms.map(t =>
          `<li><i class="fas fa-info-circle"></i> ${esc(t)}</li>`).join('')}
        </ul>
      ` : ''}
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      ${!pkg.owned ? `
        <button class="btn btn-primary" data-action="purchase-package" data-id="${esc(pkg.id)}"
                onclick="closeModal()">
          <i class="fas fa-shopping-cart"></i> Purchase</button>
      ` : `<span class="chip chip-green">You own this package</span>`}
    `,
  });
});

/* ============================================================ */
/* Comparison                                                   */
/* ============================================================ */

window.ExpertHubUser.registerAction('toggle-package-compare', (id) => {
  const sid = String(id);
  const list = S.packageCompareList || [];
  if (list.includes(sid)) {
    S.packageCompareList = list.filter(x => x !== sid);
    showToast('Removed from comparison', 'info');
  } else {
    if (list.length >= PACKAGE_COMPARE_MAX) {
      return showToast(`You can compare up to ${PACKAGE_COMPARE_MAX} packages`, 'warning');
    }
    S.packageCompareList = [...list, sid];
    showToast(`Added to comparison (${S.packageCompareList.length}/${PACKAGE_COMPARE_MAX})`, 'success');
  }
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('open-package-comparison', () => {
  const ids = S.packageCompareList || [];
  if (!ids.length) return showToast('Select packages to compare first', 'info');
  const pkgs = ids.map(id =>
    (S.packageCatalogue || []).find(p => String(p.id) === id) ||
    (S.userPackages || []).find(p => String(p.package_id) === id)
  ).filter(Boolean);
  if (!pkgs.length) return showToast('Selected packages unavailable', 'warning');

  const fields = [
    { key: 'category',      label: 'Category' },
    { key: 'price',         label: 'Price', fmt: v => fmtCur(v || 0) },
    { key: 'sessions_total',label: 'Sessions', fmt: v => v || '—' },
    { key: 'validity_days', label: 'Validity', fmt: v => v ? `${v}d` : '—' },
    { key: 'discount_pct',  label: 'Discount', fmt: v => v ? `${v}%` : '—' },
    { key: 'benefits',      label: 'Includes', fmt: v => (v || []).join(', ') || '—' },
    { key: 'renewable',     label: 'Renewable', fmt: v => v ? 'Yes' : 'No' },
  ];

  openModal({
    title: 'Compare Packages',
    className: 'modal-lg',
    body: `
      <div class="compare-table-wrap" style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th></th>
              ${pkgs.map(p => `
                <th style="text-align:center">
                  <div>${esc(p.name || '')}</div>
                  <button class="btn btn-danger btn-xs" data-action="toggle-package-compare"
                          data-id="${esc(p.id)}" style="margin-top:6px">
                    <i class="fas fa-times"></i></button>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${fields.map(f => `
              <tr>
                <td><strong>${esc(f.label)}</strong></td>
                ${pkgs.map(p => `<td style="text-align:center">${esc(String(f.fmt ? f.fmt(p[f.key]) : (p[f.key] || '—')))}</td>`).join('')}
              </tr>
            `).join('')}
            <tr>
              <td></td>
              ${pkgs.map(p => `
                <td style="text-align:center">
                  <button class="btn btn-primary btn-sm" data-action="purchase-package" data-id="${esc(p.id)}"
                          onclick="closeModal()">
                    <i class="fas fa-shopping-cart"></i> Buy</button>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-action="clear-package-comparison">Clear all</button>
      <button class="btn btn-secondary" data-close-modal>Close</button>
    `,
  });
});

window.ExpertHubUser.registerAction('clear-package-comparison', () => {
  S.packageCompareList = [];
  closeModal();
  rerenderRoleContent();
  showToast('Comparison cleared', 'info');
});

/* ============================================================ */
/* Purchase workflow                                            */
/* ============================================================ */

window.ExpertHubUser.registerAction('purchase-package', async (id) => {
  const p = (S.packageCatalogue || []).find(x => String(x.id) === String(id)) ||
            (S.userPackages || []).find(x => String(x.package_id) === String(id));
  if (!p) return showToast('Package not found', 'error');

  let quote = null;
  try { quote = await apiCall(`/api/user/packages/catalogue/${id}/quote`).catch(() => null); } catch {}
  const finalPrice = quote?.final_price ?? p.price ?? 0;
  const balance = S.wallet?.balance || 0;
  const currencies = ['card', 'mpesa', 'paypal', 'wallet'];

  openModal({
    title: `Purchase ${p.name || 'Package'}`,
    className: 'modal-lg',
    body: `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        Final price confirmed by server: <strong>${fmtCur(finalPrice)}</strong>
      </div>
      <p><strong>Sessions:</strong> ${p.sessions_total || '—'}</p>
      <p><strong>Validity:</strong> ${p.validity_days || '—'} days from purchase</p>
      <p><strong>Wallet balance:</strong> ${fmtCur(balance)}</p>

      <label class="form-group">
        <span class="form-label">Payment method *</span>
        <select id="pkMethod" class="form-select">
          ${currencies.map(c => `<option value="${c}">${c === 'wallet' ? `Wallet (${fmtCur(balance)})` : c}</option>`).join('')}
        </select>
      </label>

      ${(p.terms || []).length ? `
        <div class="alert alert-warning" style="margin-top:8px">
          <strong>Before purchasing:</strong>
          <ul style="margin:6px 0 0 20px">
            ${(p.terms || []).map(t => `<li>${esc(t)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <label class="checkbox-row" style="margin-top:8px">
        <input type="checkbox" id="pkAgree" />
        <span>I have read and agree to the package terms</span>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="pkBuy" class="btn btn-primary">
        <i class="fas fa-lock"></i> Confirm Purchase</button>
    `,
  });

  document.getElementById('pkBuy').onclick = async () => {
    if (!document.getElementById('pkAgree').checked) {
      return showToast('Please accept the terms', 'error');
    }
    const method = document.getElementById('pkMethod').value;
    const btn = document.getElementById('pkBuy');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing…';
    try {
      const d = await apiCall(`/api/user/packages/catalogue/${id}/purchase`, 'POST', {
        payment_method: method,
      });
      closeModal();
      await _loadPackages({ force: true });
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      if (d?.payment_url) {
        showToast('Redirecting to payment…', 'info', 4000);
        setTimeout(() => { window.location.href = d.payment_url; }, 600);
      } else if (d?.status === 'activated') {
        showToast('Package activated', 'success');
      } else {
        showToast('Purchase pending confirmation', 'info');
      }
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-lock"></i> Confirm Purchase';
    }
  };
});

/* ============================================================ */
/* Redeem credit → book session                                 */
/* ============================================================ */

window.ExpertHubUser.registerAction('use-package-credit', async (packageId) => {
  try {
    const fresh = await apiCall(`/api/user/packages/${packageId}`).catch(() => null);
    const p = fresh?.package || (S.userPackages || []).find(x => String(x.package_id) === String(packageId) || String(x.id) === String(packageId));
    if (!p) return showToast('Package not found', 'error');
    if (!_isPackageUsable(p)) return showToast('This package has expired or been exhausted', 'warning');

    openModal({
      title: 'Book Next Session',
      body: `
        <div class="alert alert-info">
          <i class="fas fa-ticket-alt"></i>
          <div>Using <strong>${esc(p.package_name || '')}</strong>
            — ${p.unlimited ? 'unlimited' : `${p.sessions_remaining} credit${p.sessions_remaining === 1 ? '' : 's'} remaining`}.</div>
        </div>
        <label class="form-group"><span class="form-label">Session Title *</span>
          <input id="pkTitle" class="form-input" required maxlength="140" /></label>
        <label class="form-group"><span class="form-label">Preferred date &amp; time *</span>
          <input id="pkWhen" type="datetime-local" class="form-input"
                 min="${new Date(Date.now() + 3600000).toISOString().slice(0, 16)}" required />
          <p class="form-hint">All times shown in ${esc(currentUser?.timezone || 'UTC')}.</p>
        </label>
        <label class="form-group"><span class="form-label">Notes (optional)</span>
          <textarea id="pkNotes" class="form-textarea" rows="3"></textarea></label>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="pkSave" class="btn btn-primary">Redeem Credit</button>
      `,
    });

    document.getElementById('pkSave').onclick = async () => {
      const title = document.getElementById('pkTitle').value.trim();
      const when = document.getElementById('pkWhen').value;
      if (!title || !when) return showToast('Title and time required', 'error');
      const btn = document.getElementById('pkSave');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Redeeming…';
      try {
        await apiCall('/api/user/packages/redeem', 'POST', {
          package_id: Number(packageId),
          title,
          scheduled_at: new Date(when).toISOString(),
          notes: document.getElementById('pkNotes').value || null,
        });
        closeModal();
        await reloadConsultations?.();
        await _loadPackages({ force: true });
        await loadUserExtendedData({ force: true });
        rerenderRoleContent();
        showToast('Session booked using credit', 'success');
      } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Redeem Credit';
      }
    };
  } catch (e) { showToast(e.message, 'error'); }
});

/* ============================================================ */
/* History, renewal, complete pending                           */
/* ============================================================ */

window.ExpertHubUser.registerAction('package-history', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/packages/${id}/usage`).catch(() => ({ usage: [] }));
    closeModal();
    openModal({
      title: 'Package Usage History',
      className: 'modal-lg',
      body: (d.usage || []).length ? `
        <ul class="list-stack">
          ${(d.usage || []).map(u => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(u.title || 'Session')}</span>
                <span class="list-row-sub">${fmtDT(u.scheduled_at)} · ${esc(u.status || '')}</span>
              </div>
              <span class="chip chip-neutral">${u.consultation_id ? 'Linked' : 'Free'}</span>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No usage yet</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('view-package-history', async () => {
  try {
    showLoading(true);
    const d = await apiCall('/api/user/packages/history').catch(() => ({ history: [] }));
    closeModal();
    openModal({
      title: 'Package Purchase History',
      className: 'modal-lg',
      body: (d.history || []).length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Package</th><th>Reference</th><th>Price</th><th>Status</th><th>Purchased</th><th></th></tr></thead>
            <tbody>
              ${(d.history || []).map(h => `
                <tr>
                  <td>${esc(h.package_name || '')}</td>
                  <td><code class="code">${esc(h.reference || h.id)}</code></td>
                  <td>${fmtCur(h.amount || 0)}</td>
                  <td>${UserUI.statusPill(h.status || '')}</td>
                  <td>${fmtDate(h.purchased_at || h.created_at)}</td>
                  <td>${h.receipt_available
                    ? `<button class="btn btn-secondary btn-xs" data-action="download-package-receipt" data-id="${h.id}">
                        <i class="fas fa-receipt"></i></button>` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No purchase history</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('renew-package', async (id) => {
  const p = (S.userPackages || []).find(x => String(x.package_id) === String(id) || String(x.id) === String(id)) ||
            (S.packageCatalogue || []).find(x => String(x.id) === String(id));
  if (!p) return showToast('Package not found', 'error');
  openModal({
    title: `Renew / Re-purchase ${p.package_name || p.name || ''}`,
    body: `
      <p>You are about to purchase a new cycle of this package.</p>
      <p><strong>Price:</strong> ${fmtCur(p.price || 0)}</p>
      <p class="form-hint">A new purchase will be created — your existing package remains until expiry.</p>
      <label class="form-group">
        <span class="form-label">Payment method</span>
        <select id="rnMethod" class="form-select">
          <option value="wallet">Wallet</option>
          <option value="card">Card</option>
          <option value="mpesa">M-Pesa</option>
          <option value="paypal">PayPal</option>
        </select>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rnBuy" class="btn btn-primary">Confirm</button>
    `,
  });
  document.getElementById('rnBuy').onclick = async () => {
    const btn = document.getElementById('rnBuy');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const d = await apiCall(`/api/user/packages/catalogue/${id}/purchase`, 'POST', {
        payment_method: document.getElementById('rnMethod').value,
      });
      closeModal();
      await _loadPackages({ force: true });
      rerenderRoleContent();
      if (d?.payment_url) window.location.href = d.payment_url;
      else showToast('Renewal processed', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
    }
  };
});

window.ExpertHubUser.registerAction('complete-package-payment', async (id) => {
  try {
    const d = await apiCall(`/api/user/packages/${id}/payment-intent`, 'POST').catch(() => null);
    if (d?.payment_url) return void (window.location.href = d.payment_url);
    if (d?.instructions) {
      return openModal({
        title: 'Complete Payment',
        body: `<p>${esc(d.instructions)}</p>${d.reference ? `<p>Reference: <code class="code">${esc(d.reference)}</code></p>` : ''}`,
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
    }
    showToast('Payment cannot be initiated', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('download-package-receipt', async (id) => {
  try {
    const d = await apiCall(`/api/user/packages/history/${id}/receipt`).catch(() => null);
    if (d?.url) window.open(d.url, '_blank', 'noopener,noreferrer');
    else showToast('Receipt not available', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});

/* ============================================================ */
/* Browse (existing action preserved)                           */
/* ============================================================ */

window.ExpertHubUser.registerAction('browse-packages', () => {
  activeTab = 'packages';
  _setPkgFilter('tab', 'catalogue');
  rerenderRoleContent();
});

/* ============================================================ */
/* Module registration + init                                   */
/* ============================================================ */

window.ExpertHubUser.registerModule('packages', renderUserPackages);

window.ExpertHubUser.registerModule('packages', renderUserPackages, {
  init() {
    const rerender = debounce(() => rerenderRoleContent(), 250);
    const $set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    $set('pkg-search',   el => el.oninput  = () => { _setPkgFilter('q', el.value); rerender(); });
    $set('pkg-category', el => el.onchange = () => { _setPkgFilter('category', el.value); rerenderRoleContent(); });
    $set('pkg-sort',     el => el.onchange = () => { _setPkgFilter('sort', el.value); rerenderRoleContent(); });
  },
});

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-pkg-tab]');
  if (!t) return;
  _setPkgFilter('tab', t.dataset.pkgTab);
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('pkg-page', (_, el) => {
  _setPkgFilter('page', Number(el?.dataset?.page || 1));
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('reload-packages', async () => {
  S.packageState = 'idle';
  await _loadPackages({ force: true });
  rerenderRoleContent();
  showToast('Packages refreshed', S.packageState === 'error' ? 'warning' : 'success');
});