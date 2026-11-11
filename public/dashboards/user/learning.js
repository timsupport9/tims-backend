/* ============================================================
   ExpertHub 2.0 — dashboards/user/learning.js
   E-School catalog + My Learning.
   Shared renderer for tabs: eschool, my-learning.
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

let _activeESchoolTab = 'courses';

function renderUserLearning(tab) {
  if (tab === 'my-learning') return renderUserMyLearning();

  const query = ($('#eschool-search')?.value || '').toLowerCase();
  const level = $('#eschool-level')?.value || '';

  return UserUI.page({
    title: 'E-School Learning Hub',
    breadcrumb: 'E-School',
    actions: `
      <input type="search" id="eschool-search" class="form-input"
             placeholder="Search courses..." value="${esc(query)}" style="max-width:240px" />
      <select id="eschool-level" class="form-select" style="max-width:150px">
        <option value="">All levels</option>
        <option value="beginner"     ${level === 'beginner' ? 'selected' : ''}>Beginner</option>
        <option value="intermediate" ${level === 'intermediate' ? 'selected' : ''}>Intermediate</option>
        <option value="advanced"     ${level === 'advanced' ? 'selected' : ''}>Advanced</option>
      </select>
    `,
    content: `
      ${UserUI.tabs(USER_ESCHOOL_TABS, _activeESchoolTab, 'data-eschool-tab')}
      <section class="panel" id="eschool-panel">${renderESchoolPanel(query, level)}</section>
    `,
  });
}

function renderESchoolPanel(query = '', level = '') {
  const filter = _activeESchoolTab === 'courses' ? null : _activeESchoolTab;
  let list = filter ? S.courses.filter(c => c.course_type === filter) : S.courses;
  if (query) list = list.filter(c =>
    (c.title || '').toLowerCase().includes(query) ||
    (c.description || '').toLowerCase().includes(query) ||
    (c.category || '').toLowerCase().includes(query)
  );
  if (level) list = list.filter(c => c.level === level);

  if (!list.length) return UserUI.empty({
    icon: 'fa-book-open',
    title: 'No courses found',
    desc: 'Try adjusting filters or search term.',
  });

  return `<div class="card-grid">
    ${list.map(c => {
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
            <button class="btn btn-secondary btn-sm" data-action="view-course-detail" data-id="${c.id}">
              <i class="fas fa-eye"></i></button>
            <button class="btn btn-secondary btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
              <i class="fas fa-heart" style="color:${inWishlist ? 'var(--danger)' : 'inherit'}"></i></button>
          </div>
        </article>
      `;
    }).join('')}
  </div>`;
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

/* ------------------------------------------------------------------ */
/*  E-School tab + filter bindings                                     */
/* ------------------------------------------------------------------ */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-eschool-tab]');
  if (!t) return;
  _activeESchoolTab = t.dataset.eschoolTab;
  const host = document.getElementById('eschool-panel');
  if (host) host.innerHTML = renderESchoolPanel(
    ($('#eschool-search')?.value || '').toLowerCase(),
    $('#eschool-level')?.value || ''
  );
  document.querySelectorAll('[data-eschool-tab]').forEach(x => x.classList.remove('tab-btn-active'));
  t.classList.add('tab-btn-active');
}, true);

document.addEventListener('input', debounce((e) => {
  if (!e.target.matches('#eschool-search, #eschool-level')) return;
  const host = document.getElementById('eschool-panel');
  if (host) host.innerHTML = renderESchoolPanel(
    ($('#eschool-search')?.value || '').toLowerCase(),
    $('#eschool-level')?.value || ''
  );
}, 250));

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */
window.ExpertHubUser.registerAction('toggle-wishlist', async (courseId) => {
  try {
    await apiCall('/api/user/wishlist/toggle', 'POST', { course_id: Number(courseId) });
    const d = await apiCall('/api/user/wishlist').catch(() => ({ items: [] }));
    S.wishlist = d.items || [];
    S.wishlistIds = new Set(S.wishlist.map(w => String(w.course_id)));
    rerenderRoleContent();
    showToast('Wishlist updated', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('enroll-modal', (courseId) => {
  const c = S.courses.find(x => String(x.id) === String(courseId));
  if (!c) return showToast('Course not found', 'error');
  openModal({
    title: `Enroll in ${c.title}`,
    body: `
      <p>Price: <strong>${fmtCur(c.price || 0)}</strong></p>
      <p>Your balance: <strong>${fmtCur(S.wallet.balance || 0)}</strong></p>
      <label class="form-group"><span class="form-label">Coupon (optional)</span>
        <input id="enCoupon" class="form-input" placeholder="WELCOME10" /></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="enSave" class="btn btn-primary">Confirm Enroll</button>
    `,
  });
  $('#enSave').onclick = async () => {
    try {
      showLoading(true);
      const d = await apiCall('/api/eschool/enroll', 'POST', {
        course_id: Number(courseId),
        coupon_code: $('#enCoupon').value || undefined,
      });
      closeModal();
      await loadAllData();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast(`Enrolled! Paid ${fmtCur(d.paid || 0)} (discount ${fmtCur(d.discount || 0)})`, 'success', 6000);
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
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
