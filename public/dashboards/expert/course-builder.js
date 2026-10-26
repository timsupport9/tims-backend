/* ============================================================
   dashboards/expert/course-builder.js
   ============================================================ */

function renderExpertCourseBuilder() {
  const courseId = S.__activeCourseId;
  const course = courseId ? S.courses.find(c => String(c.id) === String(courseId)) : null;

  if (!course) {
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Builder</span></div>
      <section class="page-header"><h1 class="page-title">Course Builder</h1></section>
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-pen-ruler"></i>
          <h3>Select a course to build</h3>
          <p>Choose one of your courses or create a new one.</p>
          <button class="btn btn-primary" data-expert-tab="courses">
            <i class="fas fa-book"></i> Go to My Courses</button>
        </div>
      </section>
    `;
  }

  const curriculum = S.courseCurriculum?.[courseId] || { modules: [] };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Builder</span></div>
    <section class="page-header">
      <h1 class="page-title">${esc(course.title)} — Builder</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-expert-action="preview-course" data-id="${courseId}">
          <i class="fas fa-eye"></i> Preview</button>
        <button class="btn btn-primary" data-expert-action="add-module" data-id="${courseId}">
          <i class="fas fa-plus"></i> New Module</button>
      </div>
    </section>

    <div class="course-builder">
      <div class="builder-column">
        <h3 class="panel-title">Modules & Lessons</h3>
        ${curriculum.modules.length ? curriculum.modules.map(m => `
          <div class="builder-module" data-module-id="${m.id}">
            <header class="builder-module-header">
              <span class="builder-drag-handle"><i class="fas fa-grip-vertical"></i></span>
              <strong>${esc(m.title)}</strong>
              <div class="builder-actions">
                <button class="icon-btn btn-xs" data-expert-action="edit-module" data-id="${m.id}">
                  <i class="fas fa-pen"></i></button>
                <button class="icon-btn btn-xs" data-expert-action="add-lesson" data-module="${m.id}">
                  <i class="fas fa-plus"></i></button>
                <button class="icon-btn btn-xs" data-expert-action="delete-module" data-id="${m.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </header>
            <div class="builder-lessons">
              ${(m.lessons || []).map(l => `
                <div class="builder-lesson" data-lesson-id="${l.id}">
                  <i class="fas fa-file-alt"></i>
                  <span>${esc(l.title)}</span>
                  <span class="builder-lesson-type">${esc(l.lesson_type || 'video')}</span>
                  <div class="builder-lesson-actions">
                    <button class="icon-btn btn-xs" data-expert-action="edit-lesson" data-id="${l.id}">
                      <i class="fas fa-pen"></i></button>
                    <button class="icon-btn btn-xs" data-expert-action="delete-lesson" data-id="${l.id}">
                      <i class="fas fa-trash"></i></button>
                  </div>
                </div>
              `).join('') || '<p class="empty-row">No lessons in this module</p>'}
            </div>
          </div>
        `).join('') : `
          <div class="empty-state">
            <i class="fas fa-layer-group"></i>
            <h3>No modules yet</h3>
            <p>Start by creating your first module.</p>
            <button class="btn btn-primary" data-expert-action="add-module" data-id="${courseId}">
              <i class="fas fa-plus"></i> Create First Module</button>
          </div>
        `}
      </div>

      <div class="builder-sidebar">
        <div class="panel">
          <h3 class="panel-title">Course Settings</h3>
          <label class="form-group"><span class="form-label">Title</span>
            <input id="builderCourseTitle" class="form-input" value="${esc(course.title || '')}" /></label>
          <label class="form-group"><span class="form-label">Description</span>
            <textarea id="builderCourseDesc" class="form-textarea" rows="3">${esc(course.description || '')}</textarea></label>
          <label class="form-group"><span class="form-label">Status</span>
            <select id="builderCourseStatus" class="form-select">
              ${['draft','active','paused','completed','archived','published'].map(s => `
                <option value="${s}" ${course.status === s ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
          </label>
          <label class="form-group"><span class="form-label">Price ($)</span>
            <input id="builderCoursePrice" type="number" class="form-input" value="${course.price || 0}" /></label>
          <label class="form-group"><span class="form-label">Level</span>
            <select id="builderCourseLevel" class="form-select">
              ${['beginner','intermediate','advanced'].map(l => `
                <option value="${l}" ${course.level === l ? 'selected' : ''}>${l}</option>
              `).join('')}
            </select>
          </label>
          <div class="panel-actions">
            <button class="btn btn-primary btn-block" data-expert-action="save-course-settings">
              <i class="fas fa-save"></i> Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function openModuleModal(courseId, moduleId) {
  const mod = moduleId
    ? (S.courseCurriculum?.[S.__activeCourseId]?.modules || []).find(m => String(m.id) === String(moduleId))
    : {};
  openModal({
    title: moduleId ? 'Edit Module' : 'New Module',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="mdTitle" class="form-input" value="${esc(mod?.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="mdDesc" class="form-textarea" rows="3">${esc(mod?.description || '')}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="mdSave" class="btn btn-primary">Save</button>`,
  });
  document.getElementById('mdSave').onclick = async () => {
    const payload = {
      title: document.getElementById('mdTitle').value,
      description: document.getElementById('mdDesc').value,
    };
    if (!payload.title) return showToast('Title required', 'error');
    if (moduleId) await apiCall(`/api/expert/modules/${moduleId}`, 'PUT', payload);
    else          await apiCall(`/api/expert/courses/${courseId}/modules`, 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(moduleId ? 'Module updated' : 'Module created', 'success');
    rerenderExpertContent();
  };
}

function openLessonModal(moduleId, lessonId) {
  const lesson = lessonId
    ? (S.courseCurriculum?.[S.__activeCourseId]?.modules || [])
        .flatMap(m => m.lessons || [])
        .find(l => String(l.id) === String(lessonId))
    : {};
  openModal({
    title: lessonId ? 'Edit Lesson' : 'New Lesson',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="lsTitle" class="form-input" value="${esc(lesson?.title || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="lsType" class="form-select">
          ${['video','text','quiz','assignment','resource'].map(t => `
            <option value="${t}" ${lesson?.lesson_type === t ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Content</span>
        <textarea id="lsContent" class="form-textarea" rows="5">${esc(lesson?.content || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Duration (minutes)</span>
        <input id="lsDuration" type="number" class="form-input" value="${lesson?.duration_minutes || 10}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="lsSave" class="btn btn-primary">Save</button>`,
  });
  document.getElementById('lsSave').onclick = async () => {
    const payload = {
      title: document.getElementById('lsTitle').value,
      lesson_type: document.getElementById('lsType').value,
      content: document.getElementById('lsContent').value,
      duration_minutes: Number(document.getElementById('lsDuration').value || 0),
    };
    if (!payload.title) return showToast('Title required', 'error');
    if (lessonId) await apiCall(`/api/expert/lessons/${lessonId}`, 'PUT', payload);
    else          await apiCall(`/api/expert/modules/${moduleId}/lessons`, 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(lessonId ? 'Lesson updated' : 'Lesson created', 'success');
    rerenderExpertContent();
  };
}
