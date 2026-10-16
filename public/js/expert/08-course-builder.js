/* ============================================================
   ExpertHub 2.0 — js/expert/08-course-builder.js
   Course builder (modules, lessons, settings).
   ============================================================ */

function expertCourseBuilder() {
  const courseId = $('#course-builder-id')?.value || S.__activeCourseId;
  const course = S.courses.find(c => String(c.id) === String(courseId));
  if (!course) {
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Builder</span></div>
      <section class="page-header"><h1 class="page-title">Course Builder</h1></section>
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-pen-ruler"></i>
          <h3>Select a course to build</h3>
          <p>Choose one of your courses or create a new one.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="courses">
            <i class="fas fa-book"></i> Go to My Courses</button>
        </div>
      </section>
    `;
  }

  const curriculum = S.courseCurriculum[courseId] || { modules: [] };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Builder</span></div>
    <section class="page-header">
      <h1 class="page-title">${esc(course.title)} — Builder</h1>
      <div class="page-actions">
        <input type="hidden" id="course-builder-id" value="${courseId}" />
        <button class="btn btn-secondary" data-action="preview-course" data-id="${courseId}">
          <i class="fas fa-eye"></i> Preview</button>
        <button class="btn btn-primary" data-action="add-module" data-id="${courseId}">
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
                <button class="icon-btn btn-xs" data-action="edit-module" data-id="${m.id}">
                  <i class="fas fa-pen"></i></button>
                <button class="icon-btn btn-xs" data-action="add-lesson" data-module="${m.id}">
                  <i class="fas fa-plus"></i></button>
                <button class="icon-btn btn-xs" data-action="delete-module" data-id="${m.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </header>
            <div class="builder-lessons">
              ${(m.lessons || []).map(l => `
                <div class="builder-lesson" data-lesson-id="${l.id}">
                  <i class="fas ${lessonIcon(l.lesson_type)}"></i>
                  <span>${esc(l.title)}</span>
                  <span class="builder-lesson-type">${esc(l.lesson_type)}</span>
                  <div class="builder-lesson-actions">
                    <button class="icon-btn btn-xs" data-action="edit-lesson" data-id="${l.id}">
                      <i class="fas fa-pen"></i></button>
                    <button class="icon-btn btn-xs" data-action="delete-lesson" data-id="${l.id}">
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
            <button class="btn btn-primary" data-action="add-module" data-id="${courseId}">
              <i class="fas fa-plus"></i> Create First Module</button>
          </div>
        `}
      </div>

      <div class="builder-sidebar">
        <div class="panel">
          <h3 class="panel-title">Course Settings</h3>
          <label class="form-group"><span class="form-label">Status</span>
            <select id="builder-course-status" class="form-select">
              ${['draft','active','paused','completed','archived'].map(s => `
                <option value="${s}" ${course.status === s ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
          </label>
          <label class="form-group"><span class="form-label">Price ($)</span>
            <input id="builder-course-price" type="number" class="form-input" value="${course.price || 0}" />
          </label>
          <label class="form-group"><span class="form-label">Level</span>
            <select id="builder-course-level" class="form-select">
              ${['beginner','intermediate','advanced'].map(l => `
                <option value="${l}" ${course.level === l ? 'selected' : ''}>${l}</option>
              `).join('')}
            </select>
          </label>
          <div class="panel-actions">
            <button class="btn btn-primary btn-block" data-action="save-course-settings" data-id="${courseId}">
              <i class="fas fa-save"></i> Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
