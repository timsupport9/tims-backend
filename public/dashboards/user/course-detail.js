/* ============================================================
   ExpertHub 2.0 — dashboards/user/course-detail.js
   Course detail modal — authoritative pricing, syllabus,
   instructor info, outcomes, prerequisites.
   ============================================================ */

async function openCourseDetailModal(courseId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`)
      .catch(() => ({ course: (S.courses || []).find(c => String(c.id) === String(courseId)), modules: [] }));
    const course  = d.course || {};
    const modules = d.modules || [];
    const enrolled = S.enrolledCourseIds.has(String(courseId));

    const totalLessons = modules.reduce((s, m) => s + (m.lessons || []).length, 0);
    const totalMin     = modules.reduce((s, m) =>
      s + (m.lessons || []).reduce((ss, l) => ss + (l.duration_minutes || 0), 0), 0);

    const outcomes = Array.isArray(course.outcomes) ? course.outcomes
                    : typeof course.outcomes === 'string' ? safeJsonArray(course.outcomes) : [];
    const prerequisites = Array.isArray(course.prerequisites) ? course.prerequisites
                        : typeof course.prerequisites === 'string' ? safeJsonArray(course.prerequisites) : [];

    openModal({
      title: course.title || 'Course',
      className: 'modal-lg',
      body: `
        <div class="course-detail-hero">
          <div>
            <span class="chip chip-blue">${esc(course.course_type || '')}</span>
            <span class="chip chip-neutral" style="margin-left:6px">${esc(course.level || '')}</span>
            ${course.expert_name ? `<span class="chip chip-purple" style="margin-left:6px">
              <i class="fas fa-user-tie"></i> ${esc(course.expert_name)}</span>` : ''}
          </div>
          <p class="course-detail-desc">${esc(course.description || '')}</p>
          <div class="course-detail-stats">
            <div><strong>${totalLessons}</strong><span>Lessons</span></div>
            <div><strong>${Math.round(totalMin / 60)}h</strong><span>Video</span></div>
            <div><strong>${course.enrolled_count || 0}</strong><span>Enrolled</span></div>
            <div><strong>${Number(course.average_rating || 0).toFixed(1)}</strong><span>Rating</span></div>
          </div>
        </div>

        ${outcomes.length ? `
          <h3 class="panel-title" style="margin-top:20px">What you'll learn</h3>
          <ul class="outcomes-list">
            ${outcomes.map(o => `<li><i class="fas fa-check-circle" style="color:var(--accent)"></i> ${esc(o)}</li>`).join('')}
          </ul>
        ` : ''}

        ${prerequisites.length ? `
          <h3 class="panel-title" style="margin-top:20px">Prerequisites</h3>
          <ul class="prereq-list">
            ${prerequisites.map(p => `<li><i class="fas fa-lock"></i> ${esc(p)}</li>`).join('')}
          </ul>
        ` : ''}

        <h3 class="panel-title" style="margin-top:20px">Curriculum</h3>
        <div class="curriculum-list">
          ${modules.map((m, i) => `
            <div class="curriculum-module">
              <div class="curriculum-module-header">
                <strong>${esc(m.title)}</strong>
                <span class="program-meta">${(m.lessons || []).length} lessons</span>
              </div>
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
            </div>
          `).join('') || '<p class="empty-row">Curriculum coming soon.</p>'}
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${!enrolled ? `
          <button class="btn btn-secondary" data-action="start-free-trial" data-id="${courseId}">
            <i class="fas fa-hourglass-half"></i> Free Trial</button>
          <button class="btn btn-primary" data-action="enroll-modal" data-id="${courseId}"
                  onclick="closeModal()">
            <i class="fas fa-shopping-cart"></i> Enroll for ${fmtCur(course.price || 0)}</button>
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
  }[t] || 'fa-file-alt');
}

window.ExpertHubUser.registerAction('view-course-detail', (id) => openCourseDetailModal(id));

window.ExpertHubUser.registerAction('start-free-trial', async (id) => {
  try {
    const d = await apiCall(`/api/eschool/courses/${id}/free-trial`, 'POST');
    closeModal();
    await loadUserExtendedData({ force: true });
    rerenderRoleContent();
    const msg = d?.expires_at ? `Free trial started — access until ${fmtDT(d.expires_at)}` : 'Free trial started';
    showToast(msg, 'success');
  } catch (e) { showToast(e.message, 'error'); }
});