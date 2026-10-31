/* ============================================================
   ExpertHub 2.0 — 12a-eschool-course-detail.js
   Course detail modal for learners (preview / view-course-detail).
   ============================================================ */

async function openCourseDetailModal(courseId) {
  const id = Number(courseId);
  if (!id) return showToast('No course selected', 'error');

  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${id}`);
    const c = d.course || {};
    const modules = d.modules || [];
    const reviews = d.reviews || [];
    const enrolled = !!d.enrolled;

    openModal({
      title: c.title || 'Course',
      className: 'modal-lg',
      body: `
        <div class="course-detail-hero">
          ${c.cover_image_url
            ? `<img src="${esc(c.cover_image_url)}" alt="" class="course-cover"
                    style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-bottom:12px" />`
            : ''}
          <h2>${esc(c.title || '')}</h2>
          <p class="form-hint">${esc(c.description || 'No description provided.')}</p>
          <div class="course-meta" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
            ${c.course_type ? `<span class="chip chip-neutral">${esc(c.course_type)}</span>` : ''}
            ${c.level ? `<span class="chip chip-neutral">${esc(c.level)}</span>` : ''}
            ${c.duration_hours ? `<span class="chip chip-neutral">${c.duration_hours}h</span>` : ''}
            <span class="chip chip-blue">${fmtCur(c.price || 0)}</span>
            ${c.average_rating
              ? `<span class="chip chip-green"><i class="fas fa-star"></i> ${Number(c.average_rating).toFixed(1)}</span>`
              : ''}
          </div>
        </div>

        <h3 class="panel-title" style="margin-top:20px">
          Curriculum · ${modules.length} module${modules.length === 1 ? '' : 's'}
        </h3>
        ${modules.length ? `
          <ul class="list-stack">
            ${modules.map(m => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(m.title)}</span>
                  <span class="list-row-sub">
                    ${(m.lessons || []).length} lesson${(m.lessons || []).length === 1 ? '' : 's'}
                    · ${m.duration_hours || 0}h
                  </span>
                </div>
              </li>
            `).join('')}
          </ul>` : '<p class="empty-row">No modules yet</p>'}

        ${reviews.length ? `
          <h3 class="panel-title" style="margin-top:20px">Reviews</h3>
          <ul class="list-stack">
            ${reviews.slice(0, 5).map(r => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">
                    ${esc(r.user_name || r.reviewer_name || 'Anonymous')}
                    · ${'★'.repeat(Math.max(0, Number(r.rating) || 0))}
                  </span>
                  <span class="list-row-sub">${esc(r.comment || '')}</span>
                </div>
              </li>
            `).join('')}
          </ul>` : ''}`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${enrolled
          ? `<button class="btn btn-primary"
                     data-action="open-course-player" data-id="${c.id}">
               <i class="fas fa-play"></i> Continue Learning</button>`
          : `<button class="btn btn-primary"
                     data-action="enroll-modal" data-id="${c.id}">
               <i class="fas fa-shopping-cart"></i> Enroll · ${fmtCur(c.price || 0)}</button>`}`,
    });
  } catch (e) {
    showToast(e.message || 'Failed to load course', 'error');
  } finally {
    showLoading(false);
  }
}
