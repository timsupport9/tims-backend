/* ============================================================
   ExpertHub 2.0 — dashboards/user/learning.js
   E-School catalog + My Learning.
   Persistent filters, pagination, verified enrollment gating.
   ============================================================ */

const USER_ESCHOOL_TABS = [
  { id: 'courses',      label: 'All Courses',    icon: 'fa-th-large' },
  { id: 'bootcamp',     label: 'Bootcamps',      icon: 'fa-fire' },
  { id: 'short_course', label: 'Short Courses',  icon: 'fa-bolt' },
  { id: 'tuition',      label: 'Tuition',        icon: 'fa-chalkboard-teacher' },
  { id: 'exam_prep',    label: 'Exam Prep',      icon: 'fa-file-alt' },
  { id: 'career',       label: 'Career',         icon: 'fa-briefcase' },
  { id: 'certification',label: 'Certifications', icon: 'fa-certificate' },
];

const ESCHOOL_PAGE_SIZE = 12;

function _eschoolFilters() {
  return {
    tab:   UserFilters.get('eschool', 'tab', 'courses') || 'courses',
    query: UserFilters.get('eschool', 'q', '') || '',
    level: UserFilters.get('eschool', 'level', '') || '',
    sort:  UserFilters.get('eschool', 'sort', 'popular') || 'popular',
    page:  Number(UserFilters.get('eschool', 'page', 1)) || 1,
  };
}

function _setESchoolFilter(k, v) {
  UserFilters.set('eschool', k, v);
  if (k !== 'page') UserFilters.set('eschool', 'page', 1);
}

function renderUserLearning(tab) {
  if (tab === 'my-learning') return renderUserMyLearning();

  const f = _eschoolFilters();

  return UserUI.page({
    title: 'E-School Learning Hub',
    breadcrumb: 'E-School',
    content: `
      ${UserUI.tabs(USER_ESCHOOL_TABS, f.tab, 'data-eschool-tab')}

      <section class="panel">
        <div class="expert-filters">
          <input type="search" id="eschool-search" class="form-input"
                 placeholder="Search courses..." value="${esc(f.query)}" style="max-width:240px"
                 aria-label="Search courses" />
          <select id="eschool-level" class="form-select" style="max-width:150px" aria-label="Level">
            <option value="">All levels</option>
            <option value="beginner"     ${f.level === 'beginner' ? 'selected' : ''}>Beginner</option>
            <option value="intermediate" ${f.level === 'intermediate' ? 'selected' : ''}>Intermediate</option>
            <option value="advanced"     ${f.level === 'advanced' ? 'selected' : ''}>Advanced</option>
          </select>
          <select id="eschool-sort" class="form-select" style="max-width:170px" aria-label="Sort">
            <option value="popular"    ${f.sort === 'popular' ? 'selected' : ''}>Most popular</option>
            <option value="price_asc"  ${f.sort === 'price_asc' ? 'selected' : ''}>Price: low → high</option>
            <option value="price_desc" ${f.sort === 'price_desc' ? 'selected' : ''}>Price: high → low</option>
            <option value="newest"     ${f.sort === 'newest' ? 'selected' : ''}>Newest</option>
          </select>
          <button class="btn btn-ghost btn-sm" data-action="clear-eschool-filters">
            <i class="fas fa-eraser"></i> Clear</button>
        </div>

        <div id="eschool-panel">${renderESchoolPanel(f)}</div>
      </section>
    `,
  });
}

function renderESchoolPanel(f = _eschoolFilters()) {
  const filter = f.tab === 'courses' ? null : f.tab;
  let list = filter ? (S.courses || []).filter(c => c.course_type === filter) : (S.courses || []);

  if (f.query) {
    const q = f.query.toLowerCase();
    list = list.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    );
  }
  if (f.level) list = list.filter(c => c.level === f.level);

  list = list.slice().sort((a, b) => {
    if (f.sort === 'price_asc')  return Number(a.price||0) - Number(b.price||0);
    if (f.sort === 'price_desc') return Number(b.price||0) - Number(a.price||0);
    if (f.sort === 'newest')     return new Date(b.created_at||0) - new Date(a.created_at||0);
    return Number(b.enrolled_count||0) - Number(a.enrolled_count||0);
  });

  const total = list.length;
  const page = Math.min(f.page, Math.max(1, Math.ceil(total / ESCHOOL_PAGE_SIZE)));
  const paged = list.slice((page - 1) * ESCHOOL_PAGE_SIZE, page * ESCHOOL_PAGE_SIZE);

  if (!total) return UserUI.empty({
    icon: 'fa-book-open',
    title: 'No courses found',
    desc: 'Try adjusting filters or search term.',
  });

  return `
    <p class="program-meta" style="margin:8px 0">${total} course${total === 1 ? '' : 's'}</p>
    <div class="card-grid">
      ${paged.map(c => {
        const enrolled   = S.enrolledCourseIds.has(String(c.id));
        const inWishlist = S.wishlistIds.has(String(c.id));
        return `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <span class="chip chip-neutral">${esc(c.level || '')}</span>
            </div>
            <h4 class="program-title">${esc(c.title || '')}</h4>
            <p class="program-desc">${esc((c.description || '').slice(0, 120))}</p>
            ${c.expert_name ? `<p class="program-meta"><i class="fas fa-user-tie"></i> ${esc(c.expert_name)}</p>` : ''}
            <footer class="program-footer">
              <span class="program-price">${fmtCur(c.price || 0)}</span>
              <span class="program-meta">${c.duration_weeks ? c.duration_weeks + 'w' : (c.duration_hours || 0) + 'h'} · ${c.enrolled_count || 0} enrolled</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              ${enrolled
                ? `<button class="btn btn-success btn-sm flex-1" data-action="open-course-player" data-id="${c.id}">
                    <i class="fas fa-play"></i> Continue</button>`
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

function renderUserMyLearning() {
  const enrollments = S.enrollments || [];
  const inProgress  = enrollments.filter(e => Number(e.progress || 0) > 0 && Number(e.progress || 0) < 100);
  const notStarted  = enrollments.filter(e => Number(e.progress || 0) === 0);
  const completed   = enrollments.filter(e => Number(e.progress || 0) >= 100);

  return UserUI.page({
    title: 'My Learning',
    breadcrumb: 'My Learning',
    content: `
      ${UserUI.stats([
        { label: 'In Progress', value: inProgress.length, icon: 'fa-play-circle', tone: 'blue' },
        { label: 'Not Started', value: notStarted.length, icon: 'fa-hourglass-start', tone: 'yellow' },
        { label: 'Completed',   value: completed.length,  icon: 'fa-check-circle', tone: 'green' },
        { label: 'Certificates',value: S.certificates.length, icon: 'fa-award', tone: 'purple' },
      ])}

      ${inProgress.length ? `
        <section class="panel">
          <h3 class="panel-title">In Progress</h3>
          ${inProgress.map(e => `
            <article class="enrollment-card">
              <h3 class="enrollment-title">${esc(e.title || '')}</h3>
              <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
              <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
              <p class="enrollment-progress">${e.progress || 0}% complete</p>
              <div class="panel-actions" style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" data-action="open-course-player" data-id="${e.course_id}">
                  <i class="fas fa-play"></i> Resume</button>
                <button class="btn btn-secondary btn-sm" data-action="request-refund" data-id="${e.id}">
                  <i class="fas fa-rotate-left"></i> Request Refund</button>
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
          desc: 'Explore the E-School to start learning.',
          actionTab: 'eschool',
          actionLabel: 'Explore Courses',
        })}</section>
      ` : ''}
    `,
  });
}

window.ExpertHubUser.registerModule('learning', renderUserLearning);
window.ExpertHubUser.registerModule('eschool', renderUserLearning);
window.ExpertHubUser.registerModule('my-learning', renderUserMyLearning);

/* ---------------- Bindings (re-attached after each render) ---------------- */
window.ExpertHubUser.registerModule('learning', renderUserLearning, {
  init() {
    const rerender = debounce(() => {
      const host = document.getElementById('eschool-panel');
      if (host) host.innerHTML = renderESchoolPanel(_eschoolFilters());
    }, 250);

    const search = $('#eschool-search');
    if (search) search.oninput = () => { _setESchoolFilter('q', search.value); rerender(); };

    const level = $('#eschool-level');
    if (level) level.onchange = () => { _setESchoolFilter('level', level.value); rerender(); };

    const sort = $('#eschool-sort');
    if (sort) sort.onchange = () => { _setESchoolFilter('sort', sort.value); rerender(); };
  },
});

/* Tab clicks handled by a single delegated listener, but tolerant of rerenders */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-eschool-tab]');
  if (!t) return;
  _setESchoolFilter('tab', t.dataset.eschoolTab);
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('clear-eschool-filters', () => {
  UserFilters.clear('eschool');
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('eschool-page', (id, el) => {
  const p = Number(el?.dataset?.page || 1);
  _setESchoolFilter('page', p);
  rerenderRoleContent();
});

/* ---------------- Actions ---------------- */
window.ExpertHubUser.registerAction('toggle-wishlist', async (courseId) => {
  try {
    const d = await apiCall('/api/user/wishlist/toggle', 'POST', { course_id: Number(courseId) });
    if (Array.isArray(d?.items)) {
      S.wishlist = d.items;
    } else {
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
    // Verify pricing & availability server-side
    const d = await apiCall(`/api/eschool/courses/${courseId}/enroll-info`).catch(() => null);
    const c = d?.course || (S.courses || []).find(x => String(x.id) === String(courseId));
    if (!c) return showToast('Course not found', 'error');
    if (d && d.available === false) return showToast(d.reason || 'Not available for enrollment', 'warning');
    if (S.enrolledCourseIds.has(String(courseId))) {
      return showToast('You are already enrolled', 'info');
    }
    const price = d?.final_price ?? c.price ?? 0;
    const balance = S.wallet?.balance || 0;

    openModal({
      title: `Enroll in ${c.title}`,
      body: `
        <p>Price: <strong>${fmtCur(price)}</strong></p>
        <p>Your balance: <strong>${fmtCur(balance)}</strong></p>
        ${balance < price ? '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Insufficient wallet balance — you will be redirected to payment.</div>' : ''}
        <label class="form-group"><span class="form-label">Coupon (optional)</span>
          <input id="enCoupon" class="form-input" placeholder="WELCOME10" /></label>
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
        await loadUserExtendedData({ force: true });
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