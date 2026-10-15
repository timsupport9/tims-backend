/* ============================================================
   ExpertHub 2.0 — 03-eschool.js
   E-School catalog listing, filtering, sorting, compare.

   Enhancements (v2):
   - Debounced search (300ms) with caret preservation
   - Persistent filters per user (localStorage)
   - Sort control: popular / newest / price ↑↓ / rating
   - Price range filter (min/max)
   - Category chips
   - Course badges: New / Trending / Bestseller / Free
   - Preview video button (opens modal, if preview_video_url set)
   - "Enrolled" ribbon
   - Compare mode (up to 3 courses, side-by-side modal)
   - "Recommended for you" row (derived from enrolled categories)
   - "Load more" pagination
   - Simple "Add to cart" toggle (S.cart)
   ============================================================ */

/* ============================================================
   Module state (session-scoped, with localStorage persistence)
   ============================================================ */
const ESCHOOL_PAGE_SIZE  = 12;
const ESCHOOL_PREFS_KEY  = 'eh.eschoolPrefs';
const ESCHOOL_COMPARE_MAX = 3;

S.__eschoolVisible  = Number.isFinite(S.__eschoolVisible)  ? S.__eschoolVisible  : ESCHOOL_PAGE_SIZE;
S.__eschoolSort     = S.__eschoolSort     || 'popular';
S.__eschoolCategory = S.__eschoolCategory || '';
S.__eschoolPriceMin = (S.__eschoolPriceMin === undefined) ? '' : S.__eschoolPriceMin;
S.__eschoolPriceMax = (S.__eschoolPriceMax === undefined) ? '' : S.__eschoolPriceMax;
S.__eschoolCompare  = Array.isArray(S.__eschoolCompare) ? S.__eschoolCompare : [];
S.__eschoolSearch   = S.__eschoolSearch   || '';
S.__eschoolLevel    = S.__eschoolLevel    || '';
S.cart              = Array.isArray(S.cart) ? S.cart : [];

/* Load persisted prefs on first file load */
(function restoreESchoolPrefs() {
  try {
    const raw = localStorage.getItem(ESCHOOL_PREFS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) || {};
    if (p.sort)     S.__eschoolSort     = p.sort;
    if (p.level)    S.__eschoolLevel    = p.level;
    if (p.category) S.__eschoolCategory = p.category;
    if (p.priceMin !== undefined) S.__eschoolPriceMin = p.priceMin;
    if (p.priceMax !== undefined) S.__eschoolPriceMax = p.priceMax;
    if (p.search)   S.__eschoolSearch   = p.search;
  } catch (_) {}
})();

function persistESchoolPrefs() {
  try {
    localStorage.setItem(ESCHOOL_PREFS_KEY, JSON.stringify({
      sort:     S.__eschoolSort,
      level:    S.__eschoolLevel,
      category: S.__eschoolCategory,
      priceMin: S.__eschoolPriceMin,
      priceMax: S.__eschoolPriceMax,
      search:   S.__eschoolSearch,
    }));
  } catch (_) {}
}

function rerenderESchool() {
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

/* ============================================================
   Filter / sort / search setters (called from inline handlers)
   ============================================================ */
function setESchoolSearch(value) {
  S.__eschoolSearch = String(value || '');
  S.__eschoolVisible = ESCHOOL_PAGE_SIZE;
  persistESchoolPrefs();
  if (window.__eschoolSearchTimer) clearTimeout(window.__eschoolSearchTimer);
  window.__eschoolSearchTimer = setTimeout(() => {
    const active = document.activeElement;
    const wasSearch = !!(active && active.id === 'eschool-search');
    const caret = wasSearch && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    rerenderESchool();
    if (wasSearch) {
      const input = document.getElementById('eschool-search');
      if (input) {
        input.focus();
        if (caret !== null) {
          try { input.setSelectionRange(caret, caret); } catch (_) {}
        }
      }
    }
  }, 300);
}

function setESchoolLevel(value) {
  S.__eschoolLevel = String(value || '');
  S.__eschoolVisible = ESCHOOL_PAGE_SIZE;
  persistESchoolPrefs();
  rerenderESchool();
}

function setESchoolSort(value) {
  const valid = ['popular', 'newest', 'price_asc', 'price_desc', 'rating'];
  S.__eschoolSort = valid.includes(value) ? value : 'popular';
  S.__eschoolVisible = ESCHOOL_PAGE_SIZE;
  persistESchoolPrefs();
  rerenderESchool();
}

function setESchoolCategory(value) {
  S.__eschoolCategory = String(value || '');
  S.__eschoolVisible = ESCHOOL_PAGE_SIZE;
  persistESchoolPrefs();
  rerenderESchool();
}

function setESchoolPrice() {
  const minEl = document.getElementById('eschool-price-min');
  const maxEl = document.getElementById('eschool-price-max');
  S.__eschoolPriceMin = minEl ? minEl.value : '';
  S.__eschoolPriceMax = maxEl ? maxEl.value : '';
  S.__eschoolVisible = ESCHOOL_PAGE_SIZE;
  persistESchoolPrefs();
  rerenderESchool();
}

function clearESchoolFilters() {
  S.__eschoolSearch   = '';
  S.__eschoolLevel    = '';
  S.__eschoolCategory = '';
  S.__eschoolPriceMin = '';
  S.__eschoolPriceMax = '';
  S.__eschoolSort     = 'popular';
  S.__eschoolVisible  = ESCHOOL_PAGE_SIZE;
  persistESchoolPrefs();
  rerenderESchool();
}

function loadMoreESchool() {
  S.__eschoolVisible = (S.__eschoolVisible || ESCHOOL_PAGE_SIZE) + ESCHOOL_PAGE_SIZE;
  rerenderESchool();
}

/* ============================================================
   Compare mode
   ============================================================ */
function toggleESchoolCompare(courseId) {
  const id = String(courseId);
  const idx = S.__eschoolCompare.indexOf(id);
  if (idx >= 0) {
    S.__eschoolCompare.splice(idx, 1);
  } else {
    if (S.__eschoolCompare.length >= ESCHOOL_COMPARE_MAX) {
      if (typeof showToast === 'function') {
        showToast(`Compare up to ${ESCHOOL_COMPARE_MAX} courses at a time.`, 'info');
      }
      return;
    }
    S.__eschoolCompare.push(id);
  }
  rerenderESchool();
}

function clearESchoolCompare() {
  S.__eschoolCompare = [];
  rerenderESchool();
}

function openESchoolCompare() {
  const ids = S.__eschoolCompare.map(String);
  const courses = (S.courses || []).filter(c => ids.includes(String(c.id)));
  if (courses.length < 2) {
    if (typeof showToast === 'function') showToast('Select at least 2 courses to compare.', 'info');
    return;
  }
  if (typeof openModal !== 'function') return;

  const rows = [
    { label: 'Price',       get: c => fmtCur(c.price || 0) },
    { label: 'Level',       get: c => esc(c.level || '—') },
    { label: 'Type',        get: c => esc(String(c.course_type || '').replace('_', ' ')) },
    { label: 'Category',    get: c => esc(c.category || '—') },
    { label: 'Duration',    get: c => c.duration_weeks ? `${c.duration_weeks}w` : `${c.duration_hours || 0}h` },
    { label: 'Enrolled',    get: c => String(c.enrolled_count || 0) },
    { label: 'Rating',      get: c => Number(c.average_rating || 0).toFixed(1) },
    { label: 'Instructor',  get: c => esc(c.expert_name || '—') },
    { label: 'Certificate', get: c => (c.has_certificate ? 'Yes' : 'No') },
  ];

  openModal({
    title: `Compare ${courses.length} Courses`,
    className: 'modal-lg',
    body: `
      <div class="eschool-compare-grid" style="display:grid;grid-template-columns:180px repeat(${courses.length},minmax(0,1fr));gap:12px">
        <div></div>
        ${courses.map(c => `
          <div class="eschool-compare-head">
            ${c.thumbnail ? `<img src="${esc(c.thumbnail)}" alt="" style="width:100%;border-radius:8px;margin-bottom:6px" />` : ''}
            <strong>${esc(c.title || '')}</strong>
          </div>
        `).join('')}
        ${rows.map(r => `
          <div class="eschool-compare-label" style="font-weight:600;color:var(--text-muted)">${r.label}</div>
          ${courses.map(c => `<div class="eschool-compare-cell">${r.get(c)}</div>`).join('')}
        `).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="clearESchoolCompare(); if (typeof closeModal === 'function') closeModal(); return false;">
        Clear selection</button>
      <button class="btn btn-secondary" data-close-modal>Close</button>
    `,
  });
}

/* ============================================================
   Preview video
   ============================================================ */
function openCoursePreviewVideo(courseId) {
  const c = (S.courses || []).find(x => String(x.id) === String(courseId));
  if (!c || !c.preview_video_url) {
    if (typeof showToast === 'function') showToast('No preview video for this course.', 'info');
    return;
  }
  if (typeof openModal !== 'function') return;
  openModal({
    title: `${c.title || 'Course'} — Preview`,
    className: 'modal-lg',
    body: `
      <div class="lesson-video-wrap">
        <video controls autoplay preload="metadata" style="width:100%">
          <source src="${esc(c.preview_video_url)}" />
        </video>
      </div>
      <p class="form-hint" style="margin-top:8px">Preview content only. Full curriculum unlocks on enrollment.</p>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      ${S.enrolledCourseIds && S.enrolledCourseIds.has(String(c.id))
        ? `<button class="btn btn-success" data-action="open-course-player" data-id="${esc(String(c.id))}" onclick="closeModal()">
            <i class="fas fa-play"></i> Continue Learning</button>`
        : `<button class="btn btn-primary" data-action="enroll-modal" data-id="${esc(String(c.id))}" onclick="closeModal()">
            <i class="fas fa-shopping-cart"></i> Enroll for ${fmtCur(c.price || 0)}</button>`}
    `,
  });
}

/* ============================================================
   Cart
   ============================================================ */
function toggleCourseCart(courseId) {
  const id = String(courseId);
  const idx = S.cart.indexOf(id);
  if (idx >= 0) {
    S.cart.splice(idx, 1);
    if (typeof showToast === 'function') showToast('Removed from cart', 'info');
  } else {
    S.cart.push(id);
    if (typeof showToast === 'function') showToast('Added to cart', 'success');
  }
  rerenderESchool();
}

/* ============================================================
   USER — E-SCHOOL
   ============================================================ */
function userESchool() {
  const tabs = [
    { id:'courses',      label:'All Courses',     icon:'fa-th-large' },
    { id:'bootcamp',     label:'Bootcamps',       icon:'fa-fire' },
    { id:'short_course', label:'Short Courses',   icon:'fa-bolt' },
    { id:'tuition',      label:'Tuition',         icon:'fa-chalkboard-teacher' },
    { id:'exam_prep',    label:'Exam Prep',       icon:'fa-file-alt' },
    { id:'career',       label:'Career',          icon:'fa-briefcase' },
    { id:'certification',label:'Certifications',  icon:'fa-certificate' },
  ];

  const categories = Array.from(new Set((S.courses || []).map(c => c.category).filter(Boolean))).slice(0, 10);

  const sortOptions = [
    { id: 'popular',    label: 'Most popular' },
    { id: 'newest',     label: 'Newest' },
    { id: 'price_asc',  label: 'Price: low to high' },
    { id: 'price_desc', label: 'Price: high to low' },
    { id: 'rating',     label: 'Highest rated' },
  ];

  const cartCount = (S.cart || []).length;
  const compareCount = S.__eschoolCompare.length;
  const hasAnyFilter = S.__eschoolSearch || S.__eschoolLevel || S.__eschoolCategory
                    || S.__eschoolPriceMin !== '' || S.__eschoolPriceMax !== ''
                    || S.__eschoolSort !== 'popular';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>E-School</span></div>
    <section class="page-header">
      <h1 class="page-title">E-School Learning Hub</h1>
      <div class="page-actions">
        ${cartCount ? `
          <button class="btn btn-secondary btn-sm" title="Cart">
            <i class="fas fa-shopping-cart"></i> Cart (${cartCount})</button>
        ` : ''}
        <input type="search" id="eschool-search" class="form-input"
               placeholder="Search courses…"
               value="${esc(S.__eschoolSearch || '')}"
               oninput="setESchoolSearch(this.value)"
               style="max-width:240px" />
        <select id="eschool-level" class="form-select" style="max-width:150px"
                onchange="setESchoolLevel(this.value)">
          <option value="">All levels</option>
          <option value="beginner"     ${S.__eschoolLevel === 'beginner'     ? 'selected' : ''}>Beginner</option>
          <option value="intermediate" ${S.__eschoolLevel === 'intermediate' ? 'selected' : ''}>Intermediate</option>
          <option value="advanced"     ${S.__eschoolLevel === 'advanced'     ? 'selected' : ''}>Advanced</option>
        </select>
        <select id="eschool-sort" class="form-select" style="max-width:170px"
                onchange="setESchoolSort(this.value)">
          ${sortOptions.map(s => `
            <option value="${s.id}" ${S.__eschoolSort === s.id ? 'selected' : ''}>${s.label}</option>
          `).join('')}
        </select>
      </div>
    </section>

    <nav class="tab-bar">
      ${tabs.map(t => `
        <button class="tab-btn ${activeESchoolTab === t.id ? 'tab-btn-active' : ''}"
                data-eschool-tab="${t.id}">
          <i class="fas ${t.icon}"></i> ${t.label}</button>
      `).join('')}
    </nav>

    <div class="panel eschool-filters-panel">
      <div class="eschool-filters">
        <div class="eschool-filter-group">
          <label class="form-label">Price range</label>
          <div class="eschool-price-range">
            <input type="number" id="eschool-price-min" class="form-input" min="0" step="1"
                   placeholder="Min"
                   value="${esc(String(S.__eschoolPriceMin ?? ''))}"
                   onchange="setESchoolPrice()" />
            <span class="form-hint">–</span>
            <input type="number" id="eschool-price-max" class="form-input" min="0" step="1"
                   placeholder="Max"
                   value="${esc(String(S.__eschoolPriceMax ?? ''))}"
                   onchange="setESchoolPrice()" />
            <button class="btn btn-secondary btn-xs" onclick="setESchoolPrice(); return false;">
              Apply
            </button>
          </div>
        </div>

        ${categories.length ? `
          <div class="eschool-filter-group">
            <label class="form-label">Category</label>
            <div class="eschool-category-chips">
              <button class="chip ${!S.__eschoolCategory ? 'chip-blue' : 'chip-neutral'}"
                      onclick="setESchoolCategory(''); return false;">All</button>
              ${categories.map(cat => `
                <button class="chip ${S.__eschoolCategory === cat ? 'chip-blue' : 'chip-neutral'}"
                        onclick="setESchoolCategory('${esc(cat).replace(/'/g, '&#39;')}'); return false;">
                  ${esc(cat)}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${hasAnyFilter ? `
          <div class="eschool-filter-group eschool-filter-clear">
            <button class="btn btn-secondary btn-sm"
                    onclick="clearESchoolFilters(); return false;">
              <i class="fas fa-times"></i> Clear all filters
            </button>
          </div>
        ` : ''}
      </div>
    </div>

    <section class="panel" id="eschool-panel">${renderESchoolPanel()}</section>

    ${compareCount ? `
      <div class="eschool-compare-bar">
        <i class="fas fa-balance-scale"></i>
        <span>${compareCount} of ${ESCHOOL_COMPARE_MAX} courses selected</span>
        <button class="btn btn-primary btn-sm"
                onclick="openESchoolCompare(); return false;"
                ${compareCount < 2 ? 'disabled' : ''}>
          Compare
        </button>
        <button class="btn btn-secondary btn-sm"
                onclick="clearESchoolCompare(); return false;">
          Clear
        </button>
      </div>
    ` : ''}
  `;
}

/* ============================================================
   Panel renderer (filtered, sorted, paginated)
   ============================================================ */
function renderESchoolPanel() {
  const filter = activeESchoolTab === 'courses' ? null : activeESchoolTab;
  const query = (S.__eschoolSearch || '').trim().toLowerCase();
  const levelFilter = S.__eschoolLevel || '';
  const category = S.__eschoolCategory || '';
  const priceMin = S.__eschoolPriceMin === '' || S.__eschoolPriceMin === null
    ? null : Number(S.__eschoolPriceMin);
  const priceMax = S.__eschoolPriceMax === '' || S.__eschoolPriceMax === null
    ? null : Number(S.__eschoolPriceMax);

  let list = (S.courses || []).slice();
  if (filter) list = list.filter(c => c.course_type === filter);

  if (query) {
    list = list.filter(c =>
      (c.title || '').toLowerCase().includes(query) ||
      (c.description || '').toLowerCase().includes(query) ||
      (c.category || '').toLowerCase().includes(query) ||
      (c.expert_name || '').toLowerCase().includes(query)
    );
  }
  if (levelFilter) list = list.filter(c => c.level === levelFilter);
  if (category)    list = list.filter(c => c.category === category);
  if (priceMin !== null && !isNaN(priceMin)) list = list.filter(c => Number(c.price || 0) >= priceMin);
  if (priceMax !== null && !isNaN(priceMax)) list = list.filter(c => Number(c.price || 0) <= priceMax);

  /* Sort */
  const sorter = {
    popular:    (a, b) => (b.enrolled_count || 0) - (a.enrolled_count || 0),
    newest:     (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    price_asc:  (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
    price_desc: (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0),
    rating:     (a, b) => (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0),
  }[S.__eschoolSort] || ((a, b) => 0);
  list.sort(sorter);

  /* Recommended row (only for "All Courses" tab, only if user has enrollments) */
  let recommended = [];
  if (activeESchoolTab === 'courses' && (S.enrollments || []).length && !query) {
    const enrolledCats = new Set();
    (S.enrollments || []).forEach(e => {
      const c = (S.courses || []).find(x => String(x.id) === String(e.course_id));
      if (c && c.category) enrolledCats.add(c.category);
    });
    recommended = (S.courses || [])
      .filter(c => enrolledCats.has(c.category))
      .filter(c => !(S.enrolledCourseIds && S.enrolledCourseIds.has(String(c.id))))
      .sort((a, b) => (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0))
      .slice(0, 4);
  }

  if (!list.length) {
    return `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No courses found</h3>
        <p>Try adjusting your filters or search term.</p>
        <button class="btn btn-secondary" onclick="clearESchoolFilters(); return false;">
          <i class="fas fa-times"></i> Clear all filters
        </button>
      </div>`;
  }

  const visible = list.slice(0, S.__eschoolVisible || ESCHOOL_PAGE_SIZE);
  const remaining = Math.max(0, list.length - visible.length);

  return `
    ${recommended.length ? `
      <div class="eschool-recommended">
        <div class="eschool-recommended-head">
          <i class="fas fa-star" style="color:var(--accent)"></i>
          <strong>Recommended for you</strong>
          <span class="form-hint">based on your enrolled categories</span>
        </div>
        <div class="card-grid">
          ${recommended.map(c => renderCourseCard(c)).join('')}
        </div>
      </div>
    ` : ''}

    <div class="card-grid">
      ${visible.map(c => renderCourseCard(c)).join('')}
    </div>

    ${remaining ? `
      <div class="eschool-load-more">
        <button class="btn btn-secondary" onclick="loadMoreESchool(); return false;">
          <i class="fas fa-chevron-down"></i>
          Load ${Math.min(ESCHOOL_PAGE_SIZE, remaining)} more
          <span class="form-hint">(${remaining} remaining)</span>
        </button>
      </div>
    ` : `
      <p class="form-hint eschool-list-end">All ${list.length} course${list.length === 1 ? '' : 's'} shown.</p>
    `}
  `;
}

/* ============================================================
   Course card
   ============================================================ */
function renderCourseCard(c) {
  const enrolled   = S.enrolledCourseIds && S.enrolledCourseIds.has(String(c.id));
  const inWishlist = S.wishlistIds && S.wishlistIds.has(String(c.id));
  const inCart     = (S.cart || []).includes(String(c.id));
  const comparing  = S.__eschoolCompare.includes(String(c.id));

  const badges = computeCourseBadges(c);

  return `
    <article class="program-card ${comparing ? 'is-comparing' : ''}">
      <div class="program-card-media">
        ${c.thumbnail
          ? `<img class="program-thumb" src="${esc(c.thumbnail)}" alt="" loading="lazy" />`
          : `<div class="program-thumb program-thumb-placeholder"><i class="fas fa-book-open"></i></div>`}
        ${c.preview_video_url ? `
          <button class="program-preview-btn"
                  title="Watch preview"
                  onclick="openCoursePreviewVideo('${esc(String(c.id))}'); return false;">
            <i class="fas fa-play"></i>
          </button>
        ` : ''}
        ${enrolled ? `<span class="program-ribbon program-ribbon-enrolled">Enrolled</span>` : ''}
        ${badges.length ? `
          <div class="program-badges">
            ${badges.map(b => `<span class="chip ${b.cls}">${esc(b.label)}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
        <span class="chip chip-blue">${esc(String(c.course_type || '').replace('_', ' '))}</span>
        <span class="chip chip-neutral">${esc(c.level || '')}</span>
      </div>

      <h4 class="program-title">${esc(c.title || '')}</h4>
      <p class="program-desc">${esc((c.description || '').slice(0, 120))}</p>

      ${c.expert_name ? `<p class="program-meta"><i class="fas fa-user-tie"></i> ${esc(c.expert_name)}</p>` : ''}

      <footer class="program-footer">
        <span class="program-price">${fmtCur(c.price || 0)}</span>
        <span class="program-meta">
          ${c.duration_weeks ? c.duration_weeks + 'w' : (c.duration_hours || 0) + 'h'} ·
          ${c.enrolled_count || 0} enrolled
        </span>
      </footer>

      <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        ${enrolled
          ? `<button class="btn btn-success btn-sm flex-1" data-action="open-course-player" data-id="${esc(String(c.id))}">
              <i class="fas fa-play"></i> Continue</button>`
          : `<button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${esc(String(c.id))}">
              <i class="fas fa-shopping-cart"></i> Enroll</button>`
        }
        <button class="btn btn-secondary btn-sm" data-action="view-course-detail" data-id="${esc(String(c.id))}">
          <i class="fas fa-eye"></i></button>
        <button class="btn btn-secondary btn-sm" data-action="toggle-wishlist" data-id="${esc(String(c.id))}">
          <i class="fas fa-heart" style="color:${inWishlist ? 'var(--danger)' : 'inherit'}"></i>
        </button>
      </div>

      <div class="program-card-tools">
        <label class="checkbox-row" title="Add to compare">
          <input type="checkbox" ${comparing ? 'checked' : ''}
                 onchange="toggleESchoolCompare('${esc(String(c.id))}')" />
          <span class="form-hint">Compare</span>
        </label>
        ${!enrolled ? `
          <button class="btn btn-ghost btn-xs ${inCart ? 'is-active' : ''}"
                  onclick="toggleCourseCart('${esc(String(c.id))}'); return false;"
                  title="${inCart ? 'Remove from cart' : 'Add to cart'}">
            <i class="fas fa-shopping-cart"></i>
            <span>${inCart ? 'In cart' : 'Add to cart'}</span>
          </button>
        ` : ''}
      </div>
    </article>
  `;
}

/* ============================================================
   Badge logic
   ============================================================ */
function computeCourseBadges(c) {
  const badges = [];
  const price = Number(c.price || 0);
  const enrolled = Number(c.enrolled_count || 0);
  const rating = Number(c.average_rating || 0);

  if (price === 0) badges.push({ label: 'Free', cls: 'chip-green' });

  if (c.created_at) {
    const ageDays = (Date.now() - new Date(c.created_at).getTime()) / 86400000;
    if (ageDays >= 0 && ageDays <= 21) badges.push({ label: 'New', cls: 'chip-purple' });
  }

  if (enrolled >= 500)      badges.push({ label: 'Bestseller', cls: 'chip-yellow' });
  else if (enrolled >= 100) badges.push({ label: 'Trending',   cls: 'chip-blue' });

  if (rating >= 4.7 && enrolled >= 30) badges.push({ label: 'Top rated', cls: 'chip-green' });

  return badges.slice(0, 3);
}