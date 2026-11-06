/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/learning.js                    */
/* Learning Dashboard + Course Discovery + Enrolment Management   */
/* + Learning Analytics.                                         */
/* Preserves: learning, eschool, my-learning modules & actions.   */
/* ============================================================ */

const USER_ESCHOOL_TABS = [
  { id: 'courses',       label: 'All Courses',     icon: 'fa-th-large' },
  { id: 'bootcamp',      label: 'Bootcamps',       icon: 'fa-fire' },
  { id: 'short_course',  label: 'Short Courses',   icon: 'fa-bolt' },
  { id: 'tuition',       label: 'Tuition',         icon: 'fa-chalkboard-teacher' },
  { id: 'exam_prep',     label: 'Exam Prep',       icon: 'fa-file-alt' },
  { id: 'career',        label: 'Career',          icon: 'fa-briefcase' },
  { id: 'certification', label: 'Certifications',  icon: 'fa-certificate' },
];

const ESCHOOL_SUBVIEWS = [
  { id: 'home',      label: 'Home',         icon: 'fa-home' },
  { id: 'catalog',   label: 'Discover',     icon: 'fa-compass' },
  { id: 'my',        label: 'My Learning',  icon: 'fa-graduation-cap' },
  { id: 'paths',     label: 'Paths',        icon: 'fa-route' },
  { id: 'saved',     label: 'Saved',        icon: 'fa-heart' },
  { id: 'activity',  label: 'Activity',     icon: 'fa-history' },
];

const ESCHOOL_PAGE_SIZE = 12;

/* ---------------- filter persistence ---------------- */
function _eschoolFilters() {
  return {
    view:     UserFilters.get('eschool', 'view', 'home') || 'home',
    tab:      UserFilters.get('eschool', 'tab', 'courses') || 'courses',
    query:    UserFilters.get('eschool', 'q', '') || '',
    category: UserFilters.get('eschool', 'category', '') || '',
    level:    UserFilters.get('eschool', 'level', '') || '',
    instructor: UserFilters.get('eschool', 'instructor', '') || '',
    language: UserFilters.get('eschool', 'lang', '') || '',
    format:   UserFilters.get('eschool', 'format', '') || '',
    workload: UserFilters.get('eschool', 'workload', '') || '',
    price:    UserFilters.get('eschool', 'price', '') || '',
    duration: UserFilters.get('eschool', 'duration', '') || '',
    rating:   UserFilters.get('eschool', 'rating', '') || '',
    cert:     UserFilters.get('eschool', 'cert', '') || '',
    sort:     UserFilters.get('eschool', 'sort', 'popular') || 'popular',
    page:     Number(UserFilters.get('eschool', 'page', 1)) || 1,
  };
}

function _setESchoolFilter(k, v) {
  UserFilters.set('eschool', k, v);
  if (k !== 'page') UserFilters.set('eschool', 'page', 1);
}

/* ---------------- background data refresh ---------------- */
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
      apiCall('/api/user/learning/recent').then(d => { S.recentlyAccessed = d.items || []; }).catch(() => {}),
      apiCall('/api/user/learning/recommendations').then(d => { S.recommendations = d.items || []; }).catch(() => {}),
      apiCall('/api/user/learning/live-classes').then(d => { S.liveClasses = d.classes || []; }).catch(() => {}),
      apiCall('/api/user/learning/upcoming-lessons').then(d => { S.upcomingLessons = d.lessons || []; }).catch(() => {}),
      apiCall('/api/user/learning/upcoming-assessments').then(d => { S.upcomingAssessments = d.assessments || []; }).catch(() => {}),
      apiCall('/api/user/learning/activity').then(d => { S.recentActivity = d.activity || []; }).catch(() => {}),
      apiCall('/api/user/learning/analytics').then(d => { S.learningAnalytics = d.analytics || null; }).catch(() => {}),
      apiCall('/api/user/learning/awaiting-activation').then(d => { S.awaitingActivation = d.items || []; }).catch(() => {}),
      apiCall('/api/user/wishlist').then(d => {
        S.wishlist = d.items || [];
        S.wishlistIds = new Set(S.wishlist.map(w => String(w.course_id)));
      }).catch(() => {}),
      apiCall('/api/user/certificates').then(d => { S.certificates = d.certificates || []; }).catch(() => {}),
      apiCall('/api/eschool/learning-paths').then(d => { S.coursePaths = d.paths || []; }).catch(() => {}),
      apiCall('/api/eschool/course-languages').then(d => { S.courseLanguages = d.languages || []; }).catch(() => {}),
    ];
    await Promise.allSettled(tasks);
  })().finally(() => { __eschoolRefreshing = null; });
  return __eschoolRefreshing;
}

/* ---------------- entry renderer ---------------- */
function renderUserLearning(tab) {
  if (tab === 'my-learning') return renderUserMyLearning();

  const f = _eschoolFilters();

  if (!S.continueLearning || !S.recommendations || !S.recentActivity || !S.courses) {
    _refreshLearningData().then(() => rerenderRoleContent()).catch(() => {});
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

      ${f.view === 'home'     ? renderESchoolHome(f)         : ''}
      ${f.view === 'catalog'  ? renderESchoolCatalog(f)      : ''}
      ${f.view === 'my'       ? renderESchoolMyCompact()     : ''}
      ${f.view === 'paths'    ? renderESchoolPathsCompact()  : ''}
      ${f.view === 'saved'    ? renderESchoolSaved(f)        : ''}
      ${f.view === 'activity' ? renderESchoolActivity()      : ''}
    `,
  });
}

/* ---------------- Home view ---------------- */
function renderESchoolHome(f) {
  const cont      = (S.continueLearning || []).slice(0, 4);
  const recent    = (S.recentlyAccessed || []).slice(0, 4);
  const recs      = (S.recommendations || []).slice(0, 6);
  const live      = (S.liveClasses || []).slice(0, 3);
  const paths     = (S.coursePaths || []).filter(p => (p.progress || 0) > 0 && (p.progress || 0) < 100).slice(0, 3);
  const upcomingA = (S.upcomingAssessments || []).slice(0, 4);
  const upcomingL = (S.upcomingLessons || []).slice(0, 4);
  const awaiting  = (S.awaitingActivation || []).slice(0, 3);
  const activity  = (S.recentActivity || []).slice(0, 8);
  const savedCount = (S.wishlist || []).length;
  const completed  = (S.enrollments || []).filter(e => _clampPct(e.progress) >= 100);
  const certCount  = (S.certificates || []).length;
  const analytics  = S.learningAnalytics || {};
  const hours      = Number(analytics.hours_learned || 0);
  const avgProgress = (S.enrollments || []).length
    ? Math.round((S.enrollments || []).reduce((s, e) => s + _clampPct(e.progress), 0) / S.enrollments.length)
    : 0;

  return `
    ${UserUI.stats([
      { label: 'Enrolled',       value: (S.enrollments || []).length, icon: 'fa-graduation-cap', tone: 'blue' },
      { label: 'Completed',      value: completed.length,             icon: 'fa-check-circle',   tone: 'green' },
      { label: 'Learning Hours', value: hours.toFixed(1),             icon: 'fa-clock',          tone: 'purple' },
      { label: 'Avg. Progress',  value: avgProgress + '%',            icon: 'fa-chart-line',     tone: 'yellow' },
    ])}

    ${awaiting.length ? `
      <div class="alert alert-warning">
        <i class="fas fa-hourglass-half"></i>
        <div>
          <strong>${awaiting.length} enrolment${awaiting.length === 1 ? '' : 's'} awaiting activation</strong>
          — complete payment or await approval to access content.
        </div>
      </div>
    ` : ''}

    ${cont.length ? `
      <section class="panel">
        <div class="panel-header-row">
          <h3 class="panel-title">Continue Learning</h3>
          <button class="btn btn-ghost btn-sm" data-action="switch-tab" data-tab="my-learning">
            View all <i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="card-grid">
          ${cont.map(e => _renderContinueCard(e)).join('')}
        </div>
      </section>
    ` : ''}

    ${recent.length ? `
      <section class="panel">
        <h3 class="panel-title">Recently Accessed</h3>
        <div class="card-grid">
          ${recent.map(e => _renderContinueCard(e, 'Open')).join('')}
        </div>
      </section>
    ` : ''}

    ${recs.length ? `
      <section class="panel">
        <h3 class="panel-title">Recommended For You</h3>
        <div class="card-grid">
          ${recs.map(c => `
            <article class="program-card">
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <h4 class="program-title">${esc(c.title || '')}</h4>
              <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
              ${c.recommendation_reason ? `
                <p class="form-hint"><i class="fas fa-lightbulb"></i> ${esc(c.recommendation_reason)}</p>
              ` : ''}
              <footer class="program-footer">
                <span class="program-price">${fmtCur(c.price || 0)}</span>
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

    ${upcomingL.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Lessons</h3>
        ${upcomingL.map(l => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.title)}</span>
              <span class="list-row-sub">${esc(l.course_title || '')} · ${l.scheduled_at ? fmtDT(l.scheduled_at) : 'Self-paced'}</span>
            </div>
            <button class="btn btn-primary btn-sm" data-action="open-course-player"
                    data-id="${l.course_id}" data-lesson="${l.id}">
              <i class="fas fa-play"></i> Start</button>
          </div>
        `).join('')}
      </section>
    ` : ''}

    ${upcomingA.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Assessments</h3>
        ${upcomingA.map(a => `
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

    ${paths.length ? `
      <section class="panel">
        <h3 class="panel-title">My Learning Paths</h3>
        ${paths.map(p => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(p.title)}</span>
              <span class="list-row-sub">${_clampPct(p.progress)}% complete</span>
            </div>
            <button class="btn btn-secondary btn-sm" data-action="open-path-detail" data-id="${p.id}">
              Continue <i class="fas fa-arrow-right"></i></button>
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
        <i class="fas fa-certificate tile-icon"></i>
        <h3 class="tile-title">Certificates</h3>
        <p class="tile-desc">${certCount} earned</p>
        <button class="btn btn-success" data-action="switch-tab" data-tab="certificates">View</button>
      </article>
    </section>
  `;
}

function _renderContinueCard(e, label = 'Resume') {
  const pct = _clampPct(e.progress);
  return `
    <article class="program-card">
      <span class="chip chip-blue">${esc(e.enrollment_type || 'Course')}</span>
      <h4 class="program-title">${esc(e.title || '')}</h4>
      <p class="program-desc">${e.last_lesson_title ? 'Next: ' + esc(e.last_lesson_title) : 'Pick up where you left off'}</p>
      <div class="progress-bar"><span style="width:${pct}%"></span></div>
      <p class="program-meta">${pct}% complete</p>
      <button class="btn btn-primary btn-sm" data-action="open-course-player"
              data-id="${e.course_id}" data-lesson="${e.last_lesson_id || ''}">
        <i class="fas fa-play"></i> ${esc(label)}</button>
    </article>
  `;
}

/* ---------------- Catalog view ---------------- */
function renderESchoolCatalog(f) {
  const categories  = Array.from(new Set((S.courses || []).map(c => c.category).filter(Boolean))).sort();
  const instructors = Array.from(new Set((S.courses || []).map(c => c.instructor_name).filter(Boolean))).sort();

  return `
    ${UserUI.tabs(USER_ESCHOOL_TABS, f.tab, 'data-eschool-tab')}
    <section class="panel">
      <div class="expert-filters">
        <input type="search" id="eschool-search" class="form-input"
               placeholder="Search courses..." value="${esc(f.query)}" style="max-width:220px"
               aria-label="Search courses" />
        <select id="eschool-category" class="form-select" style="max-width:160px" aria-label="Category">
          <option value="">All categories</option>
          ${categories.map(c => `<option value="${esc(c)}" ${f.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <select id="eschool-level" class="form-select" style="max-width:140px" aria-label="Level">
          <option value="">All levels</option>
          ${['beginner','intermediate','advanced'].map(l =>
            `<option value="${l}" ${f.level === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select id="eschool-instructor" class="form-select" style="max-width:170px" aria-label="Instructor">
          <option value="">Any instructor</option>
          ${instructors.map(i => `<option value="${esc(i)}" ${f.instructor === i ? 'selected' : ''}>${esc(i)}</option>`).join('')}
        </select>
        <select id="eschool-language" class="form-select" style="max-width:140px" aria-label="Language">
          <option value="">Any language</option>
          ${(S.courseLanguages || ['English','Kiswahili']).map(l =>
            `<option value="${esc(l)}" ${f.language === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
        </select>
        <select id="eschool-format" class="form-select" style="max-width:150px" aria-label="Format">
          <option value="">Any format</option>
          <option value="self_paced" ${f.format === 'self_paced' ? 'selected' : ''}>Self-paced</option>
          <option value="live"       ${f.format === 'live'       ? 'selected' : ''}>Live</option>
          <option value="blended"    ${f.format === 'blended'    ? 'selected' : ''}>Blended</option>
          <option value="cohort"     ${f.format === 'cohort'     ? 'selected' : ''}>Cohort</option>
        </select>
        <select id="eschool-workload" class="form-select" style="max-width:150px" aria-label="Workload">
          <option value="">Any workload</option>
          <option value="light"  ${f.workload === 'light'  ? 'selected' : ''}>Light (&lt;5h/week)</option>
          <option value="medium" ${f.workload === 'medium' ? 'selected' : ''}>Medium (5–10h)</option>
          <option value="heavy"  ${f.workload === 'heavy'  ? 'selected' : ''}>Heavy (10h+)</option>
        </select>
        <select id="eschool-price" class="form-select" style="max-width:150px" aria-label="Price">
          <option value="">Any price</option>
          <option value="free"  ${f.price === 'free'  ? 'selected' : ''}>Free</option>
          <option value="paid"  ${f.price === 'paid'  ? 'selected' : ''}>Paid</option>
        </select>
        <select id="eschool-duration" class="form-select" style="max-width:150px" aria-label="Duration">
          <option value="">Any duration</option>
          <option value="short" ${f.duration === 'short' ? 'selected' : ''}>≤ 4 weeks</option>
          <option value="mid"   ${f.duration === 'mid'   ? 'selected' : ''}>5–12 weeks</option>
          <option value="long"  ${f.duration === 'long'  ? 'selected' : ''}>12+ weeks</option>
        </select>
        <select id="eschool-rating" class="form-select" style="max-width:150px" aria-label="Rating">
          <option value="">Any rating</option>
          <option value="4.5" ${f.rating === '4.5' ? 'selected' : ''}>4.5+</option>
          <option value="4"   ${f.rating === '4'   ? 'selected' : ''}>4.0+</option>
          <option value="3"   ${f.rating === '3'   ? 'selected' : ''}>3.0+</option>
        </select>
        <select id="eschool-cert" class="form-select" style="max-width:150px" aria-label="Certificate">
          <option value="">Any certificate</option>
          <option value="yes" ${f.cert === 'yes' ? 'selected' : ''}>With certificate</option>
        </select>
        <select id="eschool-sort" class="form-select" style="max-width:170px" aria-label="Sort">
          <option value="popular"     ${f.sort === 'popular'     ? 'selected' : ''}>Most popular</option>
          <option value="newest"      ${f.sort === 'newest'      ? 'selected' : ''}>Newest</option>
          <option value="recommended" ${f.sort === 'recommended' ? 'selected' : ''}>Recommended</option>
          <option value="rating"      ${f.sort === 'rating'      ? 'selected' : ''}>Highest rated</option>
          <option value="price_asc"   ${f.sort === 'price_asc'   ? 'selected' : ''}>Price: low → high</option>
          <option value="price_desc"  ${f.sort === 'price_desc'  ? 'selected' : ''}>Price: high → low</option>
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
  if (f.category)   list = list.filter(c => c.category === f.category);
  if (f.level)      list = list.filter(c => c.level === f.level);
  if (f.instructor) list = list.filter(c => c.instructor_name === f.instructor);
  if (f.language)   list = list.filter(c => (c.language || '').toLowerCase() === f.language.toLowerCase());
  if (f.format)     list = list.filter(c => c.delivery_format === f.format);
  if (f.cert === 'yes') list = list.filter(c => c.certificate_available !== false);

  if (f.workload) {
    list = list.filter(c => {
      const h = Number(c.weekly_hours || c.duration_hours || 0);
      if (f.workload === 'light')  return h < 5;
      if (f.workload === 'medium') return h >= 5 && h <= 10;
      return h > 10;
    });
  }
  if (f.price === 'free') list = list.filter(c => Number(c.price || 0) === 0);
  if (f.price === 'paid') list = list.filter(c => Number(c.price || 0) > 0);
  if (f.rating) list = list.filter(c => Number(c.average_rating || 0) >= Number(f.rating));
  if (f.duration) {
    list = list.filter(c => {
      const weeks = Number(c.duration_weeks || 0);
      if (f.duration === 'short') return weeks > 0 && weeks <= 4;
      if (f.duration === 'mid')   return weeks > 4 && weeks <= 12;
      return weeks > 12;
    });
  }

  list = list.slice().sort((a, b) => {
    if (f.sort === 'price_asc')   return Number(a.price||0) - Number(b.price||0);
    if (f.sort === 'price_desc')  return Number(b.price||0) - Number(a.price||0);
    if (f.sort === 'newest')      return new Date(b.created_at||0) - new Date(a.created_at||0);
    if (f.sort === 'rating')      return Number(b.average_rating||0) - Number(a.average_rating||0);
    if (f.sort === 'recommended') return Number(b.recommendation_score||0) - Number(a.recommendation_score||0);
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
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <span class="chip chip-neutral">${esc(c.level || '')}</span>
            </div>
            <h4 class="program-title">${esc(c.title || '')}</h4>
            <p class="program-desc">${esc((c.description || '').slice(0, 120))}</p>
            ${c.instructor_name ? `<p class="program-meta"><i class="fas fa-user-tie"></i> ${esc(c.instructor_name)}</p>` : ''}
            <footer class="program-footer">
              <span class="program-price">${fmtCur(c.price || 0)}</span>
              <span class="program-meta">
                ${c.duration_weeks ? c.duration_weeks + 'w' : (c.duration_hours || 0) + 'h'} ·
                ${c.enrolled_count || 0} enrolled ·
                ★ ${Number(c.average_rating || 0).toFixed(1)}
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

/* ---------------- My Learning compact ---------------- */
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
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <h4 class="program-title">${esc(c.title || '')}</h4>
              <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
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

function renderESchoolActivity() {
  const activity = S.recentActivity || [];
  return `
    <section class="panel">
      <h3 class="panel-title">Learning Activity History</h3>
      ${activity.length ? `
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
      ` : UserUI.empty({
        icon: 'fa-history',
        title: 'No activity yet',
        desc: 'Your learning activity will appear here.',
      })}
    </section>
  `;
}

/* ---------------- My Learning full page ---------------- */
function renderUserMyLearning() {
  const enrollments = S.enrollments || [];
  const inProgress  = enrollments.filter(e => _clampPct(e.progress) > 0 && _clampPct(e.progress) < 100);
  const notStarted  = enrollments.filter(e => _clampPct(e.progress) === 0);
  const completed   = enrollments.filter(e => _clampPct(e.progress) >= 100);
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
          ${inProgress.map(e => `
            <article class="enrollment-card">
              <h3 class="enrollment-title">${esc(e.title || '')}</h3>
              <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
              <div class="progress-bar"><span style="width:${_clampPct(e.progress)}%"></span></div>
              <p class="enrollment-progress">${_clampPct(e.progress)}% complete</p>
              <div class="panel-actions" style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" data-action="open-course-player" data-id="${e.course_id}">
                  <i class="fas fa-play"></i> Resume</button>
                <button class="btn btn-secondary btn-sm" data-action="request-refund" data-id="${e.id}">
                  <i class="fas fa-rotate-left"></i> Request Refund</button>
                <button class="btn btn-secondary btn-sm" data-action="withdraw-enrollment"
                        data-id="${e.id}" data-course="${e.course_id}">
                  <i class="fas fa-times"></i> Withdraw</button>
              </div>
            </article>
          `).join('')}
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
          ${completed.map(e => `
            <article class="enrollment-card">
              <h3 class="enrollment-title">${esc(e.title || '')}</h3>
              <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
              <div class="progress-bar"><span style="width:100%;background:var(--accent)"></span></div>
              <p class="enrollment-progress">Completed ${e.completed_at ? 'on ' + fmtDate(e.completed_at) : ''}</p>
              <div class="panel-actions" style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-secondary btn-sm" data-action="review-course" data-id="${e.course_id}">
                  <i class="fas fa-star"></i> Review Course</button>
                <button class="btn btn-info btn-sm" data-action="view-certificate" data-course="${e.course_id}">
                  <i class="fas fa-certificate"></i> Certificate</button>
              </div>
            </article>
          `).join('')}
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

/* ---------------- helpers ---------------- */
function _clampPct(v) {
  const n = Number(v) || 0;
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/* ---------------- module registration ---------------- */
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
    $set('eschool-search',     el => el.oninput  = () => { _setESchoolFilter('q', el.value); rerender(); });
    $set('eschool-category',   el => el.onchange = () => { _setESchoolFilter('category', el.value); rerender(); });
    $set('eschool-level',      el => el.onchange = () => { _setESchoolFilter('level', el.value); rerender(); });
    $set('eschool-instructor', el => el.onchange = () => { _setESchoolFilter('instructor', el.value); rerender(); });
    $set('eschool-language',   el => el.onchange = () => { _setESchoolFilter('language', el.value); rerender(); });
    $set('eschool-format',     el => el.onchange = () => { _setESchoolFilter('format', el.value); rerender(); });
    $set('eschool-workload',   el => el.onchange = () => { _setESchoolFilter('workload', el.value); rerender(); });
    $set('eschool-price',      el => el.onchange = () => { _setESchoolFilter('price', el.value); rerender(); });
    $set('eschool-duration',   el => el.onchange = () => { _setESchoolFilter('duration', el.value); rerender(); });
    $set('eschool-rating',     el => el.onchange = () => { _setESchoolFilter('rating', el.value); rerender(); });
    $set('eschool-cert',       el => el.onchange = () => { _setESchoolFilter('cert', el.value); rerender(); });
    $set('eschool-sort',       el => el.onchange = () => { _setESchoolFilter('sort', el.value); rerender(); });
  },
});

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-eschool-tab]');
  if (t) { _setESchoolFilter('tab', t.dataset.eschoolTab); rerenderRoleContent(); return; }
  const v = e.target.closest('[data-eschool-view]');
  if (v) { _setESchoolFilter('view', v.dataset.eschoolView); rerenderRoleContent(); }
}, true);

/* ---------------- actions ---------------- */
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

window.ExpertHubUser.registerAction('enroll-modal', async (courseId) => {
  try {
    const d = await apiCall(`/api/eschool/courses/${courseId}/enroll-info`).catch(() => null);
    const c = d?.course || (S.courses || []).find(x => String(x.id) === String(courseId));
    if (!c) return showToast('Course not found', 'error');
    if (d && d.available === false) return showToast(d.reason || 'Not available for enrollment', 'warning');
    if (S.enrolledCourseIds.has(String(courseId))) return showToast('You are already enrolled', 'info');
    const price = d?.final_price ?? c.price ?? 0;
    const balance = S.wallet?.balance || 0;

    openModal({
      title: `Enroll in ${c.title}`,
      body: `
        <p>Price: <strong>${fmtCur(price)}</strong></p>
        <p>Your balance: <strong>${fmtCur(balance)}</strong></p>
        ${balance < price ? '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Insufficient wallet balance — you will be redirected to payment.</div>' : ''}
        ${(d?.prerequisites || c.prerequisites || []).length ? `
          <div class="alert alert-info"><strong>Prerequisites:</strong> ${(d?.prerequisites || c.prerequisites || []).map(esc).join(', ')}</div>
        ` : ''}
        <label class="form-group"><span class="form-label">Coupon (optional)</span>
          <input id="enCoupon" class="form-input" placeholder="WELCOME10" /></label>
        <p class="form-hint">Enrolment is confirmed only when the server confirms payment/activation.</p>
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
          coupon_code: $('#enCoupon').value || undefined,
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

window.ExpertHubUser.registerAction('withdraw-enrollment', async (_, el) => {
  const enrollmentId = el?.dataset?.id;
  if (!enrollmentId) return;
  if (!await confirmDialog('Withdraw from this course? You will lose access to course content.')) return;
  try {
    await apiCall(`/api/user/enrollments/${enrollmentId}/withdraw`, 'POST');
    await _refreshLearningData({ force: true });
    rerenderRoleContent();
    showToast('Withdrawal request submitted', 'success');
  } catch (e) { showToast(e.message, 'error'); }
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