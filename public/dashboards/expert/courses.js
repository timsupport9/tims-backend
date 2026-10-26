/* ============================================================
   dashboards/expert/courses.js
   ============================================================ */

function renderExpertCourses() {
  const mine = S.courses.filter(c => c.expert_id === currentUser?.id);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Courses</span></div>
    <section class="page-header">
      <h1 class="page-title">My Courses</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-expert-action="create-course">
          <i class="fas fa-plus"></i> New Course</button>
      </div>
    </section>

    <section class="card-grid">
      ${mine.map(c => `
        <article class="program-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <span class="chip chip-blue">${esc(c.level || 'beginner')}</span>
            <span class="${statusClass(c.status || 'draft')}">${esc(c.status || 'draft')}</span>
          </div>
          <h4 class="program-title">${esc(c.title || '')}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price || 0)}</span>
            <span class="program-meta">${c.enrolled_count || 0} enrolled · ${c.lesson_count || 0} lessons</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-expert-action="open-course-builder" data-id="${c.id}">
              <i class="fas fa-pen-ruler"></i> Build</button>
            <button class="btn btn-secondary btn-sm" data-expert-action="edit-course" data-id="${c.id}">
              <i class="fas fa-pen"></i> Edit</button>
            ${c.status !== 'published'
              ? `<button class="btn btn-success btn-sm" data-expert-action="publish-course" data-id="${c.id}">
                   <i class="fas fa-upload"></i> Publish</button>`
              : `<button class="btn btn-warning btn-sm" data-expert-action="unpublish-course" data-id="${c.id}">
                   <i class="fas fa-eye-slash"></i> Unpublish</button>`}
            <button class="btn btn-info btn-sm" data-expert-tab="course-analytics" data-id="${c.id}">
              <i class="fas fa-chart-simple"></i> Analytics</button>
            <button class="btn btn-danger btn-sm" data-expert-action="delete-course" data-id="${c.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-book"></i>
          <h3>No courses yet</h3>
          <p>Create your first course to start earning.</p>
          <button class="btn btn-primary" data-expert-action="create-course">
            <i class="fas fa-plus"></i> Create Course</button>
        </div>
      `}
    </section>
  `;
}

function openCreateCourseModal() {
  openCourseModal();
}

function openEditCourseModal(id) {
  openCourseModal(id);
}

function openCourseModal(id = null) {
  const c = id ? S.courses.find(x => String(x.id) === String(id)) : {};
  openModal({
    title: id ? 'Edit Course' : 'New Course',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ccTitle" class="form-input" value="${esc(c.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ccDesc" class="form-textarea" rows="3">${esc(c.description || '')}</textarea></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="ccType" class="form-select">
          ${['short_course','bootcamp','tuition','exam_prep','career'].map(t => `
            <option value="${t}" ${c.course_type === t ? 'selected' : ''}>${t.replace('_',' ')}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Level</span>
        <select id="ccLevel" class="form-select">
          ${['beginner','intermediate','advanced'].map(l => `
            <option value="${l}" ${c.level === l ? 'selected' : ''}>${l}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="ccPrice" type="number" class="form-input" value="${c.price || 0}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ccSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  document.getElementById('ccSave').onclick = async () => {
    const payload = {
      title: document.getElementById('ccTitle').value,
      description: document.getElementById('ccDesc').value,
      course_type: document.getElementById('ccType').value,
      level: document.getElementById('ccLevel').value,
      price: Number(document.getElementById('ccPrice').value || 0),
    };
    if (!payload.title) return showToast('Title is required', 'error');
    if (id) await apiCall(`/api/expert/courses/${id}`, 'PUT', payload);
    else    await apiCall('/api/expert/courses', 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(id ? 'Course updated' : 'Course created', 'success');
    rerenderExpertContent();
  };
}
