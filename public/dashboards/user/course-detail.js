/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/course-detail.js */
/* Course detail — verified pricing, outcomes, prerequisites, */
/* expandable syllabus, certificate requirements, access rules. */
/* ============================================================ */

async function openCourseDetailModal(courseId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`)
      .catch(() => ({ course: (S.courses || []).find(c => String(c.id) === String(courseId)), modules: [] }));
    const course   = d.course || {};
    const modules  = d.modules || [];
    const enrolled = S.enrolledCourseIds.has(String(courseId));

    const totalLessons = modules.reduce((s, m) => s + (m.lessons || []).length, 0);
    const totalMin     = modules.reduce((s, m) =>
      s + (m.lessons || []).reduce((ss, l) => ss + (l.duration_minutes || 0), 0), 0);

    const outcomes      = safeJsonArray(course.outcomes);
    const prerequisites = safeJsonArray(course.prerequisites);
    const audience      = safeJsonArray(course.target_audience);
    const assessment    = safeJsonArray(course.assessment_methods);
    const accessibility = safeJsonArray(course.accessibility_features);
    const reviews       = Array.isArray(course.reviews) ? course.reviews.slice(0, 5) : [];

    openModal({
      title: course.title || 'Course',
      className: 'modal-lg',
      body: `
        <div class="course-detail-hero">
          <div>
            <span class="chip chip-blue">${esc(course.course_type || '')}</span>
            <span class="chip chip-neutral" style="margin-left:6px">${esc(course.level || '')}</span>
            ${course.instructor_name ? `<span class="chip chip-purple" style="margin-left:6px">
              <i class="fas fa-user-tie"></i> ${esc(course.instructor_name)}</span>` : ''}
            ${course.language ? `<span class="chip chip-neutral" style="margin-left:6px">${esc(course.language)}</span>` : ''}
            ${course.delivery_format ? `<span class="chip chip-neutral" style="margin-left:6px">${esc(course.delivery_format.replace('_',' '))}</span>` : ''}
          </div>
          <p class="course-detail-desc">${esc(course.description || '')}</p>
          <div class="course-detail-stats">
            <div><strong>${totalLessons}</strong><span>Lessons</span></div>
            <div><strong>${Math.round(totalMin / 60)}h</strong><span>Est. video</span></div>
            <div><strong>${course.enrolled_count || 0}</strong><span>Enrolled</span></div>
            <div><strong>${Number(course.average_rating || 0).toFixed(1)}</strong><span>Rating</span></div>
            ${course.weekly_hours ? `<div><strong>${course.weekly_hours}h</strong><span>Per week</span></div>` : ''}
          </div>
        </div>

        ${outcomes.length ? `
          <h3 class="panel-title" style="margin-top:20px">What you'll learn</h3>
          <ul class="outcomes-list">
            ${outcomes.map(o => `<li><i class="fas fa-check-circle" style="color:var(--accent)"></i> ${esc(o)}</li>`).join('')}
          </ul>
        ` : ''}

        ${audience.length ? `
          <h3 class="panel-title" style="margin-top:20px">Who this is for</h3>
          <ul class="prereq-list">
            ${audience.map(a => `<li><i class="fas fa-user"></i> ${esc(a)}</li>`).join('')}
          </ul>
        ` : ''}

        ${prerequisites.length ? `
          <h3 class="panel-title" style="margin-top:20px">Prerequisites</h3>
          <ul class="prereq-list">
            ${prerequisites.map(p => `<li><i class="fas fa-lock"></i> ${esc(p)}</li>`).join('')}
          </ul>
        ` : ''}

        ${assessment.length ? `
          <h3 class="panel-title" style="margin-top:20px">Assessment &amp; completion</h3>
          <ul class="prereq-list">
            ${assessment.map(a => `<li><i class="fas fa-clipboard-check"></i> ${esc(a)}</li>`).join('')}
          </ul>
        ` : ''}

        <h3 class="panel-title" style="margin-top:20px">Curriculum</h3>
        <div class="curriculum-list" id="curriculum-host">
          ${modules.map((m, i) => `
            <details class="curriculum-module" ${i === 0 ? 'open' : ''}>
              <summary class="curriculum-module-header">
                <strong>${esc(m.title)}</strong>
                <span class="program-meta">${(m.lessons || []).length} lesson${(m.lessons || []).length === 1 ? '' : 's'}</span>
              </summary>
              ${(m.lessons || []).map(l => `
                <div class="curriculum-lesson ${l.is_preview ? 'is-preview' : ''}">
                  <i class="fas ${lessonIcon(l.lesson_type)}"></i>
                  <span class="curriculum-lesson-title">${esc(l.title)}</span>
                  <span class="curriculum-lesson-meta">${l.duration_minutes || 0} min</span>
                  ${l.is_preview
                    ? '<span class="chip chip-green">Preview</span>'
                    : '<i class="fas fa-lock curriculum-lock"></i>'}
                </div>
              `).join('')}
            </details>
          `).join('') || '<p class="empty-row">Curriculum coming soon.</p>'}
        </div>

        ${reviews.length ? `
          <h3 class="panel-title" style="margin-top:20px">Reviews</h3>
          <ul class="reviews-list">
            ${reviews.map(r => `
              <li class="review-item">
                <div class="review-header">
                  <strong>${esc(r.reviewer_name || 'Learner')}</strong>
                  <span class="review-stars">${'★'.repeat(Number(r.rating || 0))}${'☆'.repeat(5 - Number(r.rating || 0))}</span>
                </div>
                <p class="review-comment">${esc(r.comment || '')}</p>
              </li>
            `).join('')}
          </ul>
        ` : ''}

        ${accessibility.length ? `
          <h3 class="panel-title" style="margin-top:20px">Accessibility</h3>
          <ul class="prereq-list">
            ${accessibility.map(a => `<li><i class="fas fa-universal-access"></i> ${esc(a)}</li>`).join('')}
          </ul>
        ` : ''}

        <div class="course-detail-pricing" style="margin-top:20px;padding:16px;background:var(--surface-2);border-radius:8px">
          <p><strong style="font-size:1.2rem">${fmtCur(course.price || 0)}</strong> ${course.currency || 'USD'}</p>
          ${course.certificate_available !== false ? `
            <p class="form-hint"><i class="fas fa-certificate"></i> Certificate available on completion
              ${course.certificate_requirements ? ' — ' + esc(course.certificate_requirements) : ''}
            </p>
          ` : ''}
          ${course.refund_policy ? `<p class="form-hint"><i class="fas fa-rotate-left"></i> ${esc(course.refund_policy)}</p>` : ''}
          ${course.enrollment_available === false ? `<p class="form-hint" style="color:var(--danger)">
            <i class="fas fa-exclamation-triangle"></i> ${esc(course.unavailable_reason || 'Not currently accepting enrollments')}
          </p>` : ''}
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${!enrolled ? `
          ${course.enrollment_available !== false ? `
            <button class="btn btn-secondary" data-action="start-free-trial" data-id="${courseId}">
              <i class="fas fa-hourglass-half"></i> Free Trial</button>
            <button class="btn btn-primary" data-action="enroll-modal" data-id="${courseId}"
                    onclick="closeModal()">
              <i class="fas fa-shopping-cart"></i> Enroll for ${fmtCur(course.price || 0)}</button>
          ` : '<button class="btn btn-secondary" disabled>Unavailable</button>'}
        ` : `
          <button class="btn btn-success" data-action="open-course-player" data-id="${courseId}"
                  onclick="closeModal()">
            <i class="fas fa-play"></i> Continue Learning</button>
        `}
      `,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

/* Safe JSON parse for fields that may be strings */
function safeJsonArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/* Shared: lesson icons used in detail + player */
function lessonIcon(t) {
  return ({
    video:      'fa-play-circle',
    reading:    'fa-book-open',
    quiz:       'fa-question-circle',
    assignment: 'fa-file-alt',
    live:       'fa-video',
    audio:      'fa-headphones',
    pdf:        'fa-file-pdf',
    code:       'fa-code',
    slides:     'fa-file-powerpoint',
  }[t] || 'fa-file-alt');
}

window.ExpertHubUser.registerAction('view-course-detail', (id) => openCourseDetailModal(id));

window.ExpertHubUser.registerAction('start-free-trial', async (id) => {
  try {
    const d = await apiCall(`/api/eschool/courses/${id}/free-trial`, 'POST');
    closeModal();
    await _refreshLearningData({ force: true });
    rerenderRoleContent();
    const msg = d?.expires_at
      ? `Free trial started — access until ${fmtDT(d.expires_at)}`
      : 'Free trial started';
    showToast(msg, 'success');
  } catch (e) { showToast(e.message, 'error'); }
});
