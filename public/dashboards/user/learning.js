/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/learning.js (FINAL)          */
/* E-School home + catalog + My Learning + Analytics.           */
/*                                                              */
/* SPRINT 1:                                                    */
/*   - A: Free preview badge                                    */
/*   - E: Price-drop display                                    */
/*   - J: Coupon pre-fill on enroll-modal                       */
/*                                                              */
/* SPRINT 2:                                                    */
/*   - D: Certificate-ready indicator on completed cards +      */
/*        "certificate pending" state when requirements unmet   */
/*   - I: Analytics subview with period selector, weekly        */
/*        activity chart, per-course breakdown, streak display  */
/*                                                              */
/* EXPANSION (final):                                           */
/*   - Analytics CSV export + print-friendly view               */
/*   - Certificate PDF download action                          */
/*   - Robust empty/error states everywhere                     */
/*   - Debounced catalog search preserved; ARIA labels kept     */
/* ============================================================ */

const USER_ESCHOOL_TABS = [
  { id: 'courses',       label: 'All Courses',    icon: 'fa-th-large' },
  { id: 'bootcamp',      label: 'Bootcamps',      icon: 'fa-fire' },
  { id: 'short_course',  label: 'Short Courses',  icon: 'fa-bolt' },
  { id: 'tuition',       label: 'Tuition',        icon: 'fa-chalkboard-teacher' },
  { id: 'exam_prep',     label: 'Exam Prep',      icon: 'fa-file-alt' },
  { id: 'career',        label: 'Career',         icon: 'fa-briefcase' },
  { id: 'certification', label: 'Certifications', icon: 'fa-certificate' },
];

const ESCHOOL_PAGE_SIZE = 12;

/* SPRINT 2 / Item I — analytics added to subviews */
const ESCHOOL_SUBVIEWS = [
  { id: 'home',      label: 'Home',           icon: 'fa-home' },
  { id: 'catalog',   label: 'Discover',       icon: 'fa-compass' },
  { id: 'my',        label: 'My Learning',    icon: 'fa-graduation-cap' },
  { id: 'paths',     label: 'Paths',          icon: 'fa-route' },
  { id: 'saved',     label: 'Saved',          icon: 'fa-heart' },
  { id: 'analytics', label: 'Analytics',      icon: 'fa-chart-line' },
];

function _eschoolFilters() {
  return {
    view:     UserFilters.get('eschool', 'view', 'home') || 'home',
    tab:      UserFilters.get('eschool', 'tab', 'courses') || 'courses',
    query:    UserFilters.get('eschool', 'q', '') || '',
    level:    UserFilters.get('eschool', 'level', '') || '',
    language: UserFilters.get('eschool', 'lang', '') || '',
    format:   UserFilters.get('eschool', 'format', '') || '',
    workload: UserFilters.get('eschool', 'workload', '') || '',
    price:    UserFilters.get('eschool', 'price', '') || '',
    cert:     UserFilters.get('eschool', 'cert', '') || '',
    sort:     UserFilters.get('eschool', 'sort', 'popular') || 'popular',
    page:     Number(UserFilters.get('eschool', 'page', 1)) || 1,
    period:   UserFilters.get('eschool', 'period', '30d') || '30d',
  };
}

function _setESchoolFilter(k, v) {
  UserFilters.set('eschool', k, v);
  if (k !== 'page') UserFilters.set('eschool', 'page', 1);
}

/* ============================================================ */
/* Price-drop renderer (shared) */
/* ============================================================ */
function _renderCoursePrice(c, { compact = false } = {}) {
  const current  = Number(c?.price || 0);
  const previous = c?.previous_price != null ? Number(c.previous_price) : null;

  if (previous && previous > current && current >= 0) {
    const pct = Math.round(((previous - current) / previous) * 100);
    if (compact) {
      return `<span class="program-price">
        ${fmtCur(current)}
        <span class="price-strike" title="Was ${fmtCur(previous)}">${fmtCur(previous)}</span>
        <span class="chip chip-red price-drop-chip">↓ ${pct}%</span>
      </span>`;
    }
    return `
      <span class="program-price">
        ${fmtCur(current)}
        <span class="price-strike" title="Was ${fmtCur(previous)}">${fmtCur(previous)}</span>
      </span>
      <span class="chip chip-red price-drop-chip">↓ ${pct}% from ${fmtCur(previous)}</span>`;
  }

  return `<span class="program-price">${fmtCur(current)}</span>`;
}

/* ============================================================ */
/* SPRINT 2 / Item D — certificate status helper                */
/* ============================================================ */
/**
 * Returns { state, label, tone } describing the certificate situation
 * for an enrollment. Uses local S.certificates and enrollment fields —
 * server remains authoritative for issuance.
 */
function _certificateState(enrollment) {
  if (!enrollment) return { state: 'none', label: '', tone: 'neutral' };

  const cert = (S.certificates || []).find(
    c => String(c.course_id) === String(enrollment.course_id)
  );
  if (cert) return { state: 'issued', label: 'Certificate ready', tone: 'green', certId: cert.id };

  const progress = Number(enrollment.progress || 0);
  if (progress >= 100) {
    return { state: 'pending', label: 'Certificate pending review', tone: 'yellow' };
  }

  const reqs = enrollment.requirements || [];
  if (reqs.length) {
    const met = reqs.filter(r => r.met).length;
    return {
      state: 'in_progress',
      label: `Requirements ${met}/${reqs.length}`,
      tone: 'blue',
    };
  }
  return { state: 'none', label: '', tone: 'neutral' };
}

/* ============================================================ */
/* Data refresh */
/* ============================================================ */

let __eschoolRefreshing = null;
async function _refreshLearningData({ force = false } = {}) {
  if (__eschoolRefreshing && !force) return __eschoolRefreshing;
  __eschoolRefreshing = (async () => {
    const tasks = [
      apiCall('/api/user/enrollments').then(d => {
        S.enrollments = d.enrollments || [];
        S.enrolledCourseIds = new Set(S.enrollments.map(e => String(e.course_id)));
      }).catch(() => {}),
      apiCall('/api/eschool/courses').then(d => { S.courses = d.courses || []; }).catch(() => {}),
      apiCall('/api/user/learning/continue').then(d => { S.continueLearning = d.items || []; }).catch(() => {}),
      apiCall('/api/user/learning/recommendations').then(d => { S.recommendations = d.items || []; }).catch(() => {}),
      apiCall('/api/user/learning/live-classes').then(d => { S.liveClasses = d.classes || []; }).catch(() => {}),
      apiCall('/api/user/learning/upcoming-assessments').then(d => { S.upcomingAssessments = d.assessments || []; }).catch(() => {}),
      apiCall('/api/user/learning/activity').then(d => { S.recentActivity = d.activity || []; }).catch(() => {}),
      apiCall('/api/user/wishlist').then(d => {
        S.wishlist = d.items || [];
        S.wishlistIds = new Set(S.wishlist.map(w => String(w.course_id)));
      }).catch(() => {}),
      apiCall('/api/eschool/learning-paths').then(d => { S.coursePaths = d.paths || []; }).catch(() => {}),
    ];
    await Promise.allSettled(tasks);
  })().finally(() => { __eschoolRefreshing = null; });
  return __eschoolRefreshing;
}

/* ============================================================ */
/* SPRINT 2 / Item I — analytics loader (lazy, per-period)      */
/* ============================================================ */
let __analyticsLoading = null;
async function _loadLearningAnalytics(period = '30d', { force = false } = {}) {
  const key = String(period);
  S.learningAnalytics = S.learningAnalytics || {};
  if (!force && S.learningAnalytics[key]) return S.learningAnalytics[key];
  if (__analyticsLoading) return __analyticsLoading;

  __analyticsLoading = (async () => {
    const d = await apiCall(`/api/user/learning/analytics?period=${encodeURIComponent(period)}`)
      .catch(() => null);
    if (d) S.learningAnalytics[key] = d;
    return d;
  })().finally(() => { __analyticsLoading = null; });

  return __analyticsLoading;
}

/* ============================================================ */
/* Entry renderer */
/* ============================================================ */

function renderUserLearning(tab) {
  if (tab === 'my-learning') return renderUserMyLearning();

  const f = _eschoolFilters();

  if (!S.continueLearning || !S.recommendations || !S.recentActivity) {
    _refreshLearningData().then(() => rerenderRoleContent()).catch(() => {});
  }

  if (f.view === 'analytics') {
    const cached = (S.learningAnalytics || {})[f.period];
    if (!cached) {
      _loadLearningAnalytics(f.period)
        .then(() => rerenderRoleContent())
        .catch(() => {});
    }
  }

  return UserUI.page({
    title: 'E-School',
    breadcrumb: 'E-School',
    actions: `
      <button class="btn btn-secondary" data-action="eschool-refresh">
        <i class="fas fa-rotate-right"></i> Refresh</button>
      <button class="btn btn-primary" data-action="switch-tab" data-tab="my-learning">
        <i class="fas fa-graduation-cap"></i> My Learning</button>
    `,
    content: `
      ${UserUI.tabs(ESCHOOL_SUBVIEWS, f.view, 'data-eschool-view')}

      ${f.view === 'home'      ? renderESchoolHome(f)       : ''}
      ${f.view === 'catalog'   ? renderESchoolCatalog(f)    : ''}
      ${f.view === 'my'        ? renderESchoolMyCompact()   : ''}
      ${f.view === 'paths'     ? renderESchoolPathsCompact(): ''}
      ${f.view === 'saved'     ? renderESchoolSaved(f)      : ''}
      ${f.view === 'analytics' ? renderESchoolAnalytics(f)  : ''}
    `,
  });
}

/* ============================================================ */
/* Home view */
/* ============================================================ */

function renderESchoolHome(f) {
  const cont    = (S.continueLearning || []).slice(0, 4);
  const recs    = (S.recommendations || []).slice(0, 6);
  const live    = (S.liveClasses || []).slice(0, 3);
  const paths   = (S.coursePaths || []).filter(p => (p.progress || 0) > 0 && (p.progress || 0) < 100).slice(0, 3);
  const upcoming= (S.upcomingAssessments || []).slice(0, 4);
  const activity= (S.recentActivity || []).slice(0, 8);
  const savedCount = (S.wishlist || []).length;
  const completed = (S.enrollments || []).filter(e => Number(e.progress || 0) >= 100);
  const certCount = (S.certificates || []).length;

  return `
    ${UserUI.stats([
      { label: 'Enrolled',    value: (S.enrollments || []).length, icon: 'fa-graduation-cap', tone: 'blue' },
      { label: 'Completed',   value: completed.length,              icon: 'fa-check-circle',  tone: 'green' },
      { label: 'Active Paths', value: paths.length,                icon: 'fa-route',         tone: 'purple' },
      { label: 'Certificates',value: certCount,                    icon: 'fa-certificate',   tone: 'yellow' },
    ])}

    ${cont.length ? `
      <section class="panel">
        <div class="panel-header-row">
          <h3 class="panel-title">Continue Learning</h3>
          <button class="btn btn-ghost btn-sm" data-action="switch-tab" data-tab="my-learning">
            View all <i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="card-grid">
          ${cont.map(e => `
            <article class="program-card">
              <span class="chip chip-blue">${esc(e.enrollment_type || 'Course')}</span>
              <h4 class="program-title">${esc(e.title || '')}</h4>
              <p class="program-desc">${e.last_lesson_title ? 'Next: ' + esc(e.last_lesson_title) : 'Pick up where you left off'}</p>
              <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
              <p class="program-meta">${e.progress || 0}% complete</p>
              <button class="btn btn-primary btn-sm" data-action="open-course-player" data-id="${e.course_id}">
                <i class="fas fa-play"></i> Resume</button>
            </article>
          `).join('')}
        </div>
      </section>
    ` : ''}

    ${recs.length ? `
      <section class="panel">
        <h3 class="panel-title">Recommended For You</h3>
        <div class="card-grid">
          ${recs.map(c => `
            <article class="program-card">
              <div style="display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap">
                <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
                ${c.has_preview
                  ? '<span class="chip chip-green" title="Free preview available"><i class="fas fa-play"></i> Preview</span>'
                  : ''}
              </div>
              <h4 class="program-title">${esc(c.title || '')}</h4>
              <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
              ${c.recommendation_reason ? `
                <p class="form-hint"><i class="fas fa-lightbulb"></i> ${esc(c.recommendation_reason)}</p>
              ` : ''}
              <footer class="program-footer">
                ${_renderCoursePrice(c, { compact: true })}
                <span class="program-meta">${esc(c.level || '')}</span>
              </footer>
              <div class="panel-actions" style="margin-top:10px">
                <button class="btn btn-primary btn-sm" data-action="view-course-detail" data-id="${c.id}">
                  <i class="fas fa-eye"></i> View</button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    ` : ''}

    ${live.length ? `
      <section class="panel">
        <h3 class="panel-title">Live Classes</h3>
        ${live.map(l => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.title)}</span>
              <span class="list-row-sub">${esc(l.course_title || '')} · ${UserHelpers.fmtInTz(l.starts_at, currentUser?.timezone)}</span>
            </div>
            <button class="btn btn-primary btn-sm" data-action="join-live-class" data-id="${l.id}"
                    ${l.joinable ? '' : 'disabled'}>
              <i class="fas fa-video"></i> ${l.joinable ? 'Join' : 'Not open'}</button>
          </div>
        `).join('')}
      </section>
    ` : ''}

    ${paths.length ? `
      <section class="panel">
        <h3 class="panel-title">My Learning Paths</h3>
        ${paths.map(p => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(p.title)}</span>
              <span class="list-row-sub">${p.progress || 0}% complete</span>
            </div>
            <button class="btn btn-secondary btn-sm" data-action="open-path-detail" data-id="${p.id}">
              Continue <i class="fas fa-arrow-right"></i></button>
          </div>
        `).join('')}
      </section>
    ` : ''}

    ${upcoming.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Assessments</h3>
        ${upcoming.map(a => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(a.title)}</span>
              <span class="list-row-sub">${esc(a.course_title || '')} · Due ${fmtDate(a.due_at)}</span>
            </div>
            <button class="btn btn-primary btn-sm" data-action="start-assessment" data-id="${a.id}">
              <i class="fas fa-play"></i> Start</button>
          </div>
        `).join('')}
      </section>
    ` : ''}

    ${activity.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Activity</h3>
        <ul class="list-stack">
          ${activity.map(a => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.summary || '')}</span>
                <span class="list-row-sub">${timeAgo(a.at)}</span>
              </div>
              <span class="chip chip-neutral">${esc(a.type || '')}</span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    <section class="dashboard-columns">
      <article class="dashboard-card tile-card">
        <i class="fas fa-compass tile-icon"></i>
        <h3 class="tile-title">Discover Courses</h3>
        <p class="tile-desc">Browse the full catalog</p>
        <button class="btn btn-primary" data-action="eschool-goto" data-view="catalog">Explore</button>
      </article>
      <article class="dashboard-card tile-card">
        <i class="fas fa-heart tile-icon"></i>
        <h3 class="tile-title">Saved Courses</h3>
        <p class="tile-desc">${savedCount} course${savedCount === 1 ? '' : 's'} saved</p>
        <button class="btn btn-info" data-action="eschool-goto" data-view="saved">Open</button>
      </article>
      <article class="dashboard-card tile-card">
        <i class="fas fa-chart-line tile-icon"></i>
        <h3 class="tile-title">Learning Analytics</h3>
        <p class="tile-desc">Time invested, streaks, trends</p>
        <button class="btn btn-purple" data-action="eschool-goto" data-view="analytics">View</button>
      </article>
      <article class="dashboard-card tile-card">
        <i class="fas fa-certificate tile-icon"></i>
        <h3 class="tile-title">Certificates</h3>
        <p class="tile-desc">${certCount} earned</p>
        <button class="btn btn-success" data-action="switch-tab" data-tab="certificates">View</button>
      </article>
    </section>
  `;
}

/* ============================================================ */
/* Catalog view */
/* ============================================================ */

function renderESchoolCatalog(f) {
  return `
    ${UserUI.tabs(USER_ESCHOOL_TABS, f.tab, 'data-eschool-tab')}
    <section class="panel">
      <div class="expert-filters">
        <input type="search" id="eschool-search" class="form-input"
               placeholder="Search courses..." value="${esc(f.query)}" style="max-width:240px"
               aria-label="Search courses" />
        <select id="eschool-level" class="form-select" style="max-width:140px" aria-label="Level">
          <option value="">All levels</option>
          ${['beginner','intermediate','advanced'].map(l =>
            `<option value="${l}" ${f.level === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select id="eschool-language" class="form-select" style="max-width:140px" aria-label="Language">
          <option value="">Any language</option>
          ${(S.courseLanguages || ['English','Kiswahili']).map(l =>
            `<option value="${esc(l)}" ${f.language === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
        </select>
        <select id="eschool-format" class="form-select" style="max-width:150px" aria-label="Format">
          <option value="">Any format</option>
          <option value="self_paced" ${f.format === 'self_paced' ? 'selected' : ''}>Self-paced</option>
          <option value="live"       ${f.format === 'live' ? 'selected' : ''}>Live</option>
          <option value="blended"    ${f.format === 'blended' ? 'selected' : ''}>Blended</option>
          <option value="cohort"     ${f.format === 'cohort' ? 'selected' : ''}>Cohort</option>
        </select>
        <select id="eschool-workload" class="form-select" style="max-width:150px" aria-label="Workload">
          <option value="">Any workload</option>
          <option value="light"   ${f.workload === 'light' ? 'selected' : ''}>Light (&lt;5h/week)</option>
          <option value="medium"  ${f.workload === 'medium' ? 'selected' : ''}>Medium (5–10h)</option>
          <option value="heavy"   ${f.workload === 'heavy' ? 'selected' : ''}>Heavy (10h+)</option>
        </select>
        <select id="eschool-cert" class="form-select" style="max-width:150px" aria-label="Certificate">
          <option value="">Any certificate</option>
          <option value="yes" ${f.cert === 'yes' ? 'selected' : ''}>With certificate</option>
        </select>
        <select id="eschool-sort" class="form-select" style="max-width:170px" aria-label="Sort">
          <option value="popular"    ${f.sort === 'popular' ? 'selected' : ''}>Most popular</option>
          <option value="price_asc"  ${f.sort === 'price_asc' ? 'selected' : ''}>Price: low → high</option>
          <option value="price_desc" ${f.sort === 'price_desc' ? 'selected' : ''}>Price: high → low</option>
          <option value="newest"     ${f.sort === 'newest' ? 'selected' : ''}>Newest</option>
          <option value="rating"     ${f.sort === 'rating' ? 'selected' : ''}>Top rated</option>
        </select>
        <button class="btn btn-ghost btn-sm" data-action="clear-eschool-filters">
          <i class="fas fa-eraser"></i> Clear</button>
      </div>
      <div id="eschool-panel">${renderESchoolPanel(f)}</div>
    </section>
  `;
}

function renderESchoolPanel(f = _eschoolFilters()) {
  const filter = f.tab === 'courses' ? null : f.tab;
  let list = (S.courses || []).filter(c => !filter || c.course_type === filter);

  if (f.query) {
    const q = f.query.toLowerCase();
    list = list.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (c.instructor_name || '').toLowerCase().includes(q)
    );
  }
  if (f.level)    list = list.filter(c => c.level === f.level);
  if (f.language) list = list.filter(c => (c.language || '').toLowerCase() === f.language.toLowerCase());
  if (f.format)   list = list.filter(c => c.delivery_format === f.format);
  if (f.workload) {
    list = list.filter(c => {
      const h = Number(c.weekly_hours || c.duration_hours || 0);
      if (f.workload === 'light')  return h < 5;
      if (f.workload === 'medium') return h >= 5 && h <= 10;
      return h > 10;
    });
  }
  if (f.cert === 'yes') list = list.filter(c => c.certificate_available !== false);

  list = list.slice().sort((a, b) => {
    if (f.sort === 'price_asc')  return Number(a.price||0) - Number(b.price||0);
    if (f.sort === 'price_desc') return Number(b.price||0) - Number(a.price||0);
    if (f.sort === 'newest')     return new Date(b.created_at||0) - new Date(a.created_at||0);
    if (f.sort === 'rating')     return Number(b.average_rating||0) - Number(a.average_rating||0);
    return Number(b.enrolled_count||0) - Number(a.enrolled_count||0);
  });

  const total = list.length;
  const page = Math.min(f.page, Math.max(1, Math.ceil(total / ESCHOOL_PAGE_SIZE)));
  const paged = list.slice((page - 1) * ESCHOOL_PAGE_SIZE, page * ESCHOOL_PAGE_SIZE);

  if (!total) return UserUI.empty({
    icon: 'fa-book-open',
    title: 'No courses found',
    desc: 'Try adjusting filters or clearing the search term.',
  });

  return `
    <p class="program-meta" style="margin:8px 0">${total} course${total === 1 ? '' : 's'}</p>
    <div class="card-grid">
      ${paged.map(c => {
        const enrolled   = S.enrolledCourseIds.has(String(c.id));
        const inWishlist = S.wishlistIds.has(String(c.id));
        const available  = c.enrollment_available !== false;
        return `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <span class="chip chip-neutral">${esc(c.level || '')}</span>
            </div>
            ${c.has_preview
              ? '<span class="chip chip-green" style="margin-top:4px" title="Free preview available"><i class="fas fa-play"></i> Free preview</span>'
              : ''}
            <h4 class="program-title">${esc(c.title || '')}</h4>
            <p class="program-desc">${esc((c.description || '').slice(0, 120))}</p>
            ${c.instructor_name ? `<p class="program-meta"><i class="fas fa-user-tie"></i> ${esc(c.instructor_name)}</p>` : ''}
            <footer class="program-footer">
              <div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start">
                ${_renderCoursePrice(c, { compact: true })}
              </div>
              <span class="program-meta">
                ${c.duration_weeks ? c.duration_weeks + 'w' : (c.duration_hours || 0) + 'h'} ·
                ${c.enrolled_count || 0} enrolled
                ${c.certificate_available !== false ? ' · <i class="fas fa-certificate" title="Certificate"></i>' : ''}
              </span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              ${enrolled
                ? `<button class="btn btn-success btn-sm flex-1" data-action="open-course-player" data-id="${c.id}">
                    <i class="fas fa-play"></i> Continue</button>`
                : !available
                  ? `<button class="btn btn-secondary btn-sm flex-1" disabled>Unavailable</button>`
                  : `<button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${c.id}">
                      <i class="fas fa-shopping-cart"></i> Enroll</button>`}
              <button class="btn btn-secondary btn-sm" data-action="view-course-detail" data-id="${c.id}"
                      aria-label="View details"><i class="fas fa-eye"></i></button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-wishlist" data-id="${c.id}"
                      aria-label="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
                <i class="fas fa-heart" style="color:${inWishlist ? 'var(--danger)' : 'inherit'}"></i></button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
    ${UserUI.pagination({ page, pageSize: ESCHOOL_PAGE_SIZE, total, action: 'eschool-page', key: 'courses' })}
  `;
}

/* ============================================================ */
/* Compact views */
/* ============================================================ */

function renderESchoolMyCompact() {
  return `
    <section class="panel">
      <div class="panel-header-row">
        <h3 class="panel-title">My Learning</h3>
        <button class="btn btn-ghost btn-sm" data-action="switch-tab" data-tab="my-learning">
          Full view <i class="fas fa-arrow-right"></i></button>
      </div>
      ${renderUserMyLearning()}
    </section>
  `;
}

function renderESchoolPathsCompact() {
  return `
    <section class="panel">
      <div class="panel-header-row">
        <h3 class="panel-title">Learning Paths</h3>
        <button class="btn btn-ghost btn-sm" data-action="switch-tab" data-tab="learning-paths">
          View all <i class="fas fa-arrow-right"></i></button>
      </div>
      ${renderUserLearningPaths()}
    </section>
  `;
}

function renderESchoolSaved(f) {
  const wishlist = S.wishlist || [];
  const available = wishlist.filter(w => (S.courses || []).some(c => String(c.id) === String(w.course_id)));
  if (!available.length) return UserUI.empty({
    icon: 'fa-heart',
    title: 'No saved courses',
    desc: 'Save courses while browsing to see them here.',
  });
  return `
    <section class="panel">
      <h3 class="panel-title">Saved Courses</h3>
      <div class="card-grid">
        ${available.map(w => {
          const c = (S.courses || []).find(x => String(x.id) === String(w.course_id));
          const enrolled = S.enrolledCourseIds.has(String(c.id));
          return `
            <article class="program-card">
              <div style="display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap">
                <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
                ${c.has_preview
                  ? '<span class="chip chip-green" title="Free preview available"><i class="fas fa-play"></i> Preview</span>'
                  : ''}
              </div>
              <h4 class="program-title">${esc(c.title || '')}</h4>
              <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
              <footer class="program-footer">
                <div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start">
                  ${_renderCoursePrice(c, { compact: true })}
                </div>
              </footer>
              <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
                ${enrolled
                  ? `<button class="btn btn-success btn-sm flex-1" data-action="open-course-player" data-id="${c.id}">Continue</button>`
                  : `<button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${c.id}">Enroll</button>`}
                <button class="btn btn-secondary btn-sm" data-action="view-course-detail" data-id="${c.id}"><i class="fas fa-eye"></i></button>
                <button class="btn btn-danger btn-sm" data-action="toggle-wishlist" data-id="${c.id}"><i class="fas fa-heart"></i></button>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

/* ============================================================ */
/* My Learning (full page) — SPRINT 2: certificate state shown  */
/* ============================================================ */

function renderUserMyLearning() {
  const enrollments = S.enrollments || [];
  const inProgress  = enrollments.filter(e => Number(e.progress || 0) > 0 && Number(e.progress || 0) < 100);
  const notStarted  = enrollments.filter(e => Number(e.progress || 0) === 0);
  const completed   = enrollments.filter(e => Number(e.progress || 0) >= 100);
  const certCount   = (S.certificates || []).length;

  return UserUI.page({
    title: 'My Learning',
    breadcrumb: 'My Learning',
    content: `
      ${UserUI.stats([
        { label: 'In Progress', value: inProgress.length, icon: 'fa-play-circle',     tone: 'blue' },
        { label: 'Not Started', value: notStarted.length, icon: 'fa-hourglass-start', tone: 'yellow' },
        { label: 'Completed',   value: completed.length,  icon: 'fa-check-circle',    tone: 'green' },
        { label: 'Certificates',value: certCount,         icon: 'fa-award',           tone: 'purple' },
      ])}

      ${inProgress.length ? `
        <section class="panel">
          <h3 class="panel-title">In Progress</h3>
          ${inProgress.map(e => {
            const cert = _certificateState(e);
            return `
              <article class="enrollment-card">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap">
                  <div style="flex:1;min-width:200px">
                    <h3 class="enrollment-title">${esc(e.title || '')}</h3>
                    <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
                  </div>
                  ${cert.label
                    ? `<span class="chip chip-${cert.tone}">${esc(cert.label)}</span>`
                    : ''}
                </div>
                <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
                <p class="enrollment-progress">${e.progress || 0}% complete</p>
                <div class="panel-actions" style="display:flex;gap:6px;flex-wrap:wrap">
                  <button class="btn btn-primary btn-sm" data-action="open-course-player" data-id="${e.course_id}">
                    <i class="fas fa-play"></i> Resume</button>
                  <button class="btn btn-secondary btn-sm" data-action="view-completion-rules"
                          data-id="${e.course_id}">
                    <i class="fas fa-list-check"></i> Requirements</button>
                  <button class="btn btn-secondary btn-sm" data-action="request-refund" data-id="${e.id}">
                    <i class="fas fa-rotate-left"></i> Request Refund</button>
                </div>
              </article>
            `;
          }).join('')}
        </section>
      ` : ''}

      ${notStarted.length ? `
        <section class="panel">
          <h3 class="panel-title">Not Started</h3>
          ${notStarted.map(e => `
            <article class="enrollment-card">
              <h3 class="enrollment-title">${esc(e.title || '')}</h3>
              <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
              <button class="btn btn-success btn-sm" data-action="open-course-player" data-id="${e.course_id}">
                <i class="fas fa-play"></i> Start Learning</button>
            </article>
          `).join('')}
        </section>
      ` : ''}

      ${completed.length ? `
        <section class="panel">
          <h3 class="panel-title">Completed</h3>
          ${completed.map(e => {
            const cert = _certificateState(e);
            const isIssued = cert.state === 'issued';
            return `
              <article class="enrollment-card">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap">
                  <div style="flex:1;min-width:200px">
                    <h3 class="enrollment-title">${esc(e.title || '')}</h3>
                    <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
                  </div>
                  ${cert.label
                    ? `<span class="chip chip-${cert.tone}">
                        ${isIssued ? '<i class="fas fa-certificate"></i> ' : ''}${esc(cert.label)}
                       </span>`
                    : ''}
                </div>
                <div class="progress-bar"><span style="width:100%;background:var(--accent)"></span></div>
                <p class="enrollment-progress">Completed ${e.completed_at ? 'on ' + fmtDate(e.completed_at) : ''}</p>
                <div class="panel-actions" style="display:flex;gap:6px;flex-wrap:wrap">
                  <button class="btn btn-secondary btn-sm" data-action="review-course" data-id="${e.course_id}">
                    <i class="fas fa-star"></i> Review Course</button>
                  ${isIssued
                    ? `<button class="btn btn-info btn-sm" data-action="view-certificate" data-course="${e.course_id}">
                        <i class="fas fa-certificate"></i> Certificate</button>`
                    : cert.state === 'pending'
                      ? `<button class="btn btn-secondary btn-sm" disabled title="Pending review">
                          <i class="fas fa-hourglass-half"></i> Certificate pending</button>`
                      : `<button class="btn btn-secondary btn-sm" data-action="view-completion-rules"
                                 data-id="${e.course_id}">
                          <i class="fas fa-list-check"></i> View Requirements</button>`}
                  ${!isIssued && cert.state === 'pending'
                    ? `<button class="btn btn-secondary btn-sm" data-action="view-completion-rules"
                              data-id="${e.course_id}">
                        <i class="fas fa-list-check"></i> Requirements</button>`
                    : ''}
                </div>
              </article>
            `;
          }).join('')}
        </section>
      ` : ''}

      ${!enrollments.length ? `
        <section class="panel">${UserUI.empty({
          icon: 'fa-graduation-cap',
          title: 'No enrollments yet',
          desc: 'Explore the E-School catalog to start learning.',
          actionTab: 'eschool',
          actionLabel: 'Explore Courses',
        })}</section>
      ` : ''}
    `,
  });
}

/* ============================================================ */
/* SPRINT 2 / Item I — Analytics view                           */
/* ============================================================ */

function renderESchoolAnalytics(f) {
  const period = f.period || '30d';
  const data = (S.learningAnalytics || {})[period];

  const periodBtn = (p, label) => `
    <button class="btn ${period === p ? 'btn-primary' : 'btn-secondary'} btn-sm"
            data-action="analytics-period" data-period="${p}">
      ${esc(label)}</button>`;

  const header = `
    <div class="page-actions" style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <span class="form-label" style="margin-right:6px">Period:</span>
      ${periodBtn('7d', 'Last 7 days')}
      ${periodBtn('30d', 'Last 30 days')}
      ${periodBtn('90d', 'Last 90 days')}
      <button class="btn btn-ghost btn-sm" data-action="analytics-export" data-period="${period}"
              title="Download CSV">
        <i class="fas fa-file-csv"></i> Export</button>
      <button class="btn btn-ghost btn-sm" data-action="analytics-print" title="Print-friendly">
        <i class="fas fa-print"></i> Print</button>
      <button class="btn btn-ghost btn-sm" data-action="analytics-refresh" style="margin-left:auto">
        <i class="fas fa-rotate-right"></i> Refresh</button>
    </div>
  `;

  if (!data) {
    return `
      <section class="panel">
        ${header}
        ${UserUI.loading('Loading your learning analytics…')}
      </section>
    `;
  }

  const summary = data.summary || {};
  const weekly  = Array.isArray(data.weekly) ? data.weekly : [];
  const perCourse = Array.isArray(data.per_course) ? data.per_course : [];
  const streak  = data.streak || {};

  const totalHours = Math.round((Number(summary.total_minutes || 0) / 60) * 10) / 10;
  const lessonCount = Number(summary.total_lessons || 0);
  const avgScore    = summary.avg_score != null ? Math.round(Number(summary.avg_score)) : null;
  const completion  = summary.completion_rate != null
    ? Math.round(Number(summary.completion_rate) * 100)
    : null;

  const maxMinutes = weekly.reduce((m, w) => Math.max(m, Number(w.minutes || 0)), 1);
  const barsHtml = weekly.length ? weekly.map(w => {
    const minutes = Number(w.minutes || 0);
    const pct = Math.max(2, Math.round((minutes / maxMinutes) * 100));
    const label = w.week_start
      ? new Date(w.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : (w.label || '');
    return `
      <div class="analytics-bar-col" title="${minutes} minutes">
        <div class="analytics-bar-value">${minutes}</div>
        <div class="analytics-bar-track">
          <div class="analytics-bar-fill" style="height:${pct}%"></div>
        </div>
        <div class="analytics-bar-label">${esc(label)}</div>
      </div>
    `;
  }).join('') : '<p class="empty-row">No activity recorded in this period.</p>';

  const perCourseHtml = perCourse.length ? perCourse.map(c => {
    const mins = Number(c.minutes || 0);
    const hours = Math.round((mins / 60) * 10) / 10;
    return `
      <div class="list-row">
        <div class="list-row-main">
          <span class="list-row-title">${esc(c.title || '')}</span>
          <span class="list-row-sub">
            ${hours}h invested · ${c.progress || 0}% complete
            ${c.last_activity_at ? ' · last ' + timeAgo(c.last_activity_at) : ''}
          </span>
          <div class="progress-bar" style="margin-top:6px">
            <span style="width:${c.progress || 0}%"></span>
          </div>
        </div>
        <button class="btn btn-secondary btn-xs" data-action="open-course-player" data-id="${c.course_id}">
          Resume</button>
      </div>
    `;
  }).join('') : '<p class="empty-row">No per-course data yet.</p>';

  return `
    <section class="panel">
      ${header}
      ${UserUI.stats([
        { label: 'Time invested',  value: `${totalHours}h`,  sub: 'in this period', icon: 'fa-clock',      tone: 'blue' },
        { label: 'Lessons done',   value: lessonCount,        sub: 'in this period', icon: 'fa-check',     tone: 'green' },
        { label: 'Average score',  value: avgScore != null ? `${avgScore}%` : '—', icon: 'fa-star',   tone: 'purple' },
        { label: 'Completion rate',value: completion != null ? `${completion}%` : '—', icon: 'fa-chart-line', tone: 'yellow' },
      ])}
    </section>

    <section class="panel">
      <h3 class="panel-title">Weekly Activity</h3>
      <div class="analytics-bar-chart">
        ${barsHtml}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header-row">
        <h3 class="panel-title">Streak</h3>
      </div>
      <div class="analytics-streak">
        <div class="analytics-streak-block">
          <span class="analytics-streak-value">${streak.current || 0}</span>
          <span class="analytics-streak-label">current streak (days)</span>
        </div>
        <div class="analytics-streak-block">
          <span class="analytics-streak-value">${streak.longest || 0}</span>
          <span class="analytics-streak-label">longest streak</span>
        </div>
        <div class="analytics-streak-block">
          <span class="analytics-streak-value">${streak.days_active || 0}</span>
          <span class="analytics-streak-label">active days in period</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Time per Course</h3>
      ${perCourseHtml}
    </section>
  `;
}

/* ============================================================ */
/* Module registrations */
/* ============================================================ */

window.ExpertHubUser.registerModule('learning', renderUserLearning);
window.ExpertHubUser.registerModule('eschool', renderUserLearning);
window.ExpertHubUser.registerModule('my-learning', renderUserMyLearning);

window.ExpertHubUser.registerModule('learning', renderUserLearning, {
  init() {
    const rerender = debounce(() => {
      const host = document.getElementById('eschool-panel');
      if (host) host.innerHTML = renderESchoolPanel(_eschoolFilters());
    }, 250);

    const $set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    $set('eschool-search',   el => el.oninput  = () => { _setESchoolFilter('q', el.value); rerender(); });
    $set('eschool-level',    el => el.onchange = () => { _setESchoolFilter('level', el.value); rerender(); });
    $set('eschool-language', el => el.onchange = () => { _setESchoolFilter('language', el.value); rerender(); });
    $set('eschool-format',   el => el.onchange = () => { _setESchoolFilter('format', el.value); rerender(); });
    $set('eschool-workload', el => el.onchange = () => { _setESchoolFilter('workload', el.value); rerender(); });
    $set('eschool-cert',     el => el.onchange = () => { _setESchoolFilter('cert', el.value); rerender(); });
    $set('eschool-sort',     el => el.onchange = () => { _setESchoolFilter('sort', el.value); rerender(); });
  },
});

/* Tab click delegation */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-eschool-tab]');
  if (t) { _setESchoolFilter('tab', t.dataset.eschoolTab); rerenderRoleContent(); return; }
  const v = e.target.closest('[data-eschool-view]');
  if (v) { _setESchoolFilter('view', v.dataset.eschoolView); rerenderRoleContent(); }
}, true);

/* ============================================================ */
/* Actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('eschool-refresh', async () => {
  await _refreshLearningData({ force: true });
  rerenderRoleContent();
  showToast('E-School refreshed', 'success');
});

window.ExpertHubUser.registerAction('eschool-goto', (_, el) => {
  _setESchoolFilter('view', el?.dataset?.view || 'home');
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('clear-eschool-filters', () => {
  const view = UserFilters.get('eschool', 'view', 'catalog');
  UserFilters.clear('eschool');
  UserFilters.set('eschool', 'view', view);
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('eschool-page', (_, el) => {
  _setESchoolFilter('page', Number(el?.dataset?.page || 1));
  rerenderRoleContent();
});

/* SPRINT 2 / Item I — analytics actions */
window.ExpertHubUser.registerAction('analytics-period', (_, el) => {
  const period = el?.dataset?.period || '30d';
  _setESchoolFilter('period', period);
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('analytics-refresh', async () => {
  const period = _eschoolFilters().period || '30d';
  S.learningAnalytics = S.learningAnalytics || {};
  delete S.learningAnalytics[period];
  await _loadLearningAnalytics(period, { force: true });
  rerenderRoleContent();
  showToast('Analytics refreshed', 'success');
});

/* EXPANSION — CSV export of current period */
window.ExpertHubUser.registerAction('analytics-export', (_, el) => {
  const period = el?.dataset?.period || _eschoolFilters().period || '30d';
  const data = (S.learningAnalytics || {})[period];
  if (!data) return showToast('Analytics not loaded yet', 'warning');

  const rows = [['Section', 'Metric', 'Value']];
  const s = data.summary || {};
  rows.push(['Summary', 'Total minutes', s.total_minutes || 0]);
  rows.push(['Summary', 'Total lessons', s.total_lessons || 0]);
  rows.push(['Summary', 'Average score', s.avg_score ?? '']);
  rows.push(['Summary', 'Completion rate', s.completion_rate ?? '']);

  (data.weekly || []).forEach(w => {
    rows.push(['Weekly', w.week_start || w.label || '', w.minutes || 0]);
  });
  (data.per_course || []).forEach(c => {
    rows.push(['Per Course', c.title || c.course_id, `${c.minutes || 0} min / ${c.progress || 0}%`]);
  });

  const csv = rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `learning-analytics-${period}-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Analytics CSV downloaded', 'success');
});

/* EXPANSION — print-friendly analytics */
window.ExpertHubUser.registerAction('analytics-print', () => {
  const period = _eschoolFilters().period || '30d';
  const data = (S.learningAnalytics || {})[period];
  if (!data) return showToast('Analytics not loaded yet', 'warning');

  const w = window.open('', '_blank');
  if (!w) return showToast('Popup blocked — allow popups to print', 'warning');

  const s = data.summary || {};
  const streak = data.streak || {};
  const rows = (data.per_course || []).map(c => `
    <tr>
      <td>${esc(c.title || c.course_id)}</td>
      <td>${Math.round(((c.minutes || 0) / 60) * 10) / 10}h</td>
      <td>${c.progress || 0}%</td>
    </tr>
  `).join('');

  w.document.write(`<!doctype html><html><head><title>Learning Analytics — ${period}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:24px;color:#111}
      h1{font-size:1.4rem;margin-bottom:4px}
      .muted{color:#666;font-size:.85em;margin-bottom:16px}
      .kpis{display:flex;gap:24px;flex-wrap:wrap;margin:16px 0;padding:12px;background:#f4f4f4;border-radius:8px}
      .kpi{min-width:120px}
      .kpi-value{font-size:1.6rem;font-weight:700;color:#3b82f6}
      .kpi-label{font-size:.8em;color:#666}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;font-size:.9em}
      th{background:#f4f4f4}
    </style></head><body>
      <h1>Learning Analytics</h1>
      <p class="muted">Period: ${period} · Generated ${new Date().toLocaleString()}</p>
      <div class="kpis">
        <div class="kpi"><div class="kpi-value">${Math.round((Number(s.total_minutes||0)/60)*10)/10}h</div><div class="kpi-label">Time invested</div></div>
        <div class="kpi"><div class="kpi-value">${s.total_lessons || 0}</div><div class="kpi-label">Lessons done</div></div>
        <div class="kpi"><div class="kpi-value">${s.avg_score != null ? Math.round(Number(s.avg_score)) + '%' : '—'}</div><div class="kpi-label">Avg score</div></div>
        <div class="kpi"><div class="kpi-value">${streak.current || 0}</div><div class="kpi-label">Current streak</div></div>
      </div>
      <h2 style="font-size:1.1rem;margin-top:24px">Time per Course</h2>
      <table><thead><tr><th>Course</th><th>Time</th><th>Progress</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" class="muted">No data</td></tr>'}</tbody></table>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
});

/* SPRINT 2 / Item D — dedicated "view completion rules" action */
window.ExpertHubUser.registerAction('view-completion-rules', async (courseId) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/completion-status`)
      .catch(() => null);
    showLoading(false);

    if (!d) {
      return showToast('Completion rules not available right now', 'warning');
    }

    const reqs = d.requirements || [];
    const allMet = !!d.all_met;
    const certId = d.certificate_id || null;

    openModal({
      title: 'Completion Requirements',
      className: 'modal-lg',
      body: `
        ${allMet && certId
          ? `<div class="alert alert-success">
               <i class="fas fa-check-circle"></i>
               All requirements met — certificate #${esc(String(certId))} has been issued.
             </div>`
          : allMet
            ? `<div class="alert alert-info">
                 <i class="fas fa-hourglass-half"></i>
                 All requirements met — certificate will be issued shortly.
               </div>`
            : `<div class="alert alert-info">
                 <i class="fas fa-list-check"></i>
                 Complete all requirements below to unlock your certificate.
               </div>`}
        <ul class="list-stack">
          ${reqs.map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  ${r.met
                    ? '<i class="fas fa-check-circle" style="color:var(--accent)"></i>'
                    : '<i class="fas fa-circle" style="color:var(--border)"></i>'}
                  ${esc(r.label || '')}
                  ${r.required === false ? '<span class="chip chip-neutral">Optional</span>' : ''}
                </span>
                ${r.progress || r.score != null
                  ? `<span class="list-row-sub">
                       ${r.progress ? esc(r.progress) : ''}
                       ${r.score != null ? ' · Score ' + r.score + '%' : ''}
                     </span>`
                  : ''}
              </div>
            </li>
          `).join('') || '<li class="empty-row">No requirements defined</li>'}
        </ul>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${certId
          ? `<button class="btn btn-primary" data-action="view-certificate"
                     data-course="${courseId}" onclick="closeModal()">
               <i class="fas fa-certificate"></i> View Certificate</button>`
          : `<button class="btn btn-primary" data-action="open-course-player"
                     data-id="${courseId}" onclick="closeModal()">
               <i class="fas fa-play"></i> Continue Learning</button>`}
      `,
    });
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('toggle-wishlist', async (courseId) => {
  try {
    const d = await apiCall('/api/user/wishlist/toggle', 'POST', { course_id: Number(courseId) });
    if (Array.isArray(d?.items)) S.wishlist = d.items;
    else {
      const list = await apiCall('/api/user/wishlist').catch(() => ({ items: [] }));
      S.wishlist = list.items || [];
    }
    S.wishlistIds = new Set(S.wishlist.map(w => String(w.course_id)));
    rerenderRoleContent();
    showToast('Wishlist updated', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('enroll-modal', async (courseId, el) => {
  try {
    const prefilledCoupon = (el?.dataset?.coupon || '').trim();

    const infoUrl = `/api/eschool/courses/${courseId}/enroll-info`
      + (prefilledCoupon ? `?coupon_code=${encodeURIComponent(prefilledCoupon)}` : '');
    const d = await apiCall(infoUrl).catch(() => null);

    const c = d?.course || (S.courses || []).find(x => String(x.id) === String(courseId));
    if (!c) return showToast('Course not found', 'error');
    if (d && d.available === false) return showToast(d.reason || 'Not available for enrollment', 'warning');
    if (S.enrolledCourseIds.has(String(courseId))) return showToast('You are already enrolled', 'info');

    const price   = d?.final_price ?? c.price ?? 0;
    const balance = S.wallet?.balance || 0;
    const couponApplied = prefilledCoupon && d?.coupon_applied !== false;

    openModal({
      title: `Enroll in ${c.title}`,
      body: `
        <p>Price: <strong id="enPrice">${fmtCur(price)}</strong></p>
        <p>Your balance: <strong>${fmtCur(balance)}</strong></p>
        ${balance < price ? '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Insufficient wallet balance — you will be redirected to payment.</div>' : ''}
        ${(d?.prerequisites || c.prerequisites || []).length ? `
          <div class="alert alert-info"><strong>Prerequisites:</strong> ${(d?.prerequisites || c.prerequisites || []).map(esc).join(', ')}</div>
        ` : ''}
        <label class="form-group"><span class="form-label">Coupon (optional)</span>
          <input id="enCoupon" class="form-input" placeholder="WELCOME10" value="${esc(prefilledCoupon)}" />
          ${couponApplied ? `<p class="form-hint" style="color:var(--accent)"><i class="fas fa-check"></i> Pre-validated coupon applied</p>` : ''}
        </label>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="enSave" class="btn btn-primary">Confirm Enroll</button>
      `,
    });

    $('#enSave').onclick = async () => {
      const btn = $('#enSave');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Enrolling…';
      try {
        showLoading(true);
        const r = await apiCall('/api/eschool/enroll', 'POST', {
          course_id: Number(courseId),
          coupon_code: ($('#enCoupon')?.value || '').trim() || undefined,
        });
        closeModal();
        await loadAllData?.();
        await _refreshLearningData({ force: true });
        rerenderRoleContent();
        showToast(`Enrolled! Paid ${fmtCur(r?.paid || 0)} (discount ${fmtCur(r?.discount || 0)})`, 'success', 6000);
        if (r?.payment_url) window.location.href = r.payment_url;
      } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Confirm Enroll';
      }
      finally { showLoading(false); }
    };
  } catch (e) { showToast(e.message, 'error'); }
});

/* EXPANSION — direct certificate PDF download when cert has file_url */
window.ExpertHubUser.registerAction('download-certificate', async (courseId) => {
  const cert = (S.certificates || []).find(c => String(c.course_id) === String(courseId));
  if (!cert) return showToast('Certificate not available yet', 'warning');

  if (cert.pdf_url || cert.file_url) {
    const a = document.createElement('a');
    a.href = cert.pdf_url || cert.file_url;
    a.download = `certificate-${cert.serial || cert.id}.pdf`;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return showToast('Certificate download started', 'success');
  }

  // Fallback: server-rendered PDF endpoint
  const url = `/api/user/certificates/${cert.id}/pdf`;
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Certificate PDF not yet available');
    const blob = await res.blob();
    const link = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = link;
    a.download = `certificate-${cert.serial || cert.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(link), 1000);
    showToast('Certificate downloaded', 'success');
  } catch (e) {
    showToast(e.message || 'Could not download certificate', 'warning');
  }
});

window.ExpertHubUser.registerAction('view-certificate', (courseId) => {
  const cert = (S.certificates || []).find(c => String(c.course_id) === String(courseId));
  if (!cert) return showToast('Certificate not available yet', 'warning');
  location.hash = `#/certificate/${cert.id}`;
});

window.ExpertHubUser.registerAction('review-course', (courseId) => {
  openModal({
    title: 'Rate Course',
    body: `
      <label class="form-group">
        <span class="form-label">Rating</span>
        <select id="rcRating" class="form-select">
          ${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Comment</span>
        <textarea id="rcComment" class="form-textarea" rows="4"></textarea></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rcSave" class="btn btn-primary">Submit</button>
    `,
  });
  $('#rcSave').onclick = async () => {
    try {
      await apiCall('/api/eschool/reviews', 'POST', {
        course_id: Number(courseId),
        rating: Number($('#rcRating').value),
        comment: $('#rcComment').value,
      });
      closeModal();
      showToast('Review submitted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('join-live-class', async (id) => {
  try {
    const d = await apiCall(`/api/user/learning/live-classes/${id}/join`).catch(() => null);
    if (d?.join_url) window.location.href = d.join_url;
    else showToast('Class link not ready yet', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});