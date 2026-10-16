/* ============================================================
   ExpertHub 2.0 — js/expert/07-courses.js
   Expert course list.
   ============================================================ */

function expertCourses() {
  const mine = S.courses.filter(c => c.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Courses</span></div>
    <section class="page-header">
      <h1 class="page-title">My Courses</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-course-modal">
          <i class="fas fa-plus"></i> New Course</button>
      </div>
    </section>

    ${selectedRows.courses?.size ? `
      <div class="alert alert-info" style="justify-content:space-between">
        <span><strong>${selectedRows.courses.size}</strong> course${selectedRows.courses.size === 1 ? '' : 's'} selected</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success btn-sm" data-action="bulk-publish-courses">Publish All</button>
          <button class="btn btn-secondary btn-sm" data-action="clear-selection" data-target="courses">Clear</button>
        </div>
      </div>
    ` : ''}

    <section class="card-grid">
      ${mine.map(c => `
        <article class="program-card">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <span class="chip chip-blue">${esc(c.level || 'beginner')}</span>
            <span class="${statusClass(c.status || 'draft')}">${esc(c.status || 'draft')}</span>
          </div>
          <h4 class="program-title">${esc(c.title || '')}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price || 0)}</span>
            <span class="program-meta">
              ${c.enrolled_count || 0} enrolled · ${c.lesson_count || 0} lessons
            </span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-action="open-course-builder" data-id="${c.id}">
              <i class="fas fa-pen-ruler"></i> Build</button>
            <button class="btn btn-secondary btn-sm" data-action="view-course-analytics" data-id="${c.id}">
              <i class="fas fa-chart-simple"></i> Analytics</button>
            <button class="btn btn-info btn-sm" data-action="edit-course" data-id="${c.id}">
              <i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-danger btn-sm" data-action="delete-course" data-id="${c.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-book"></i>
          <h3>No courses yet</h3>
          <p>Create your first course to start earning.</p>
          <button class="btn btn-primary" data-action="create-course-modal">
            <i class="fas fa-plus"></i> Create Course</button>
        </div>
      `}
    </section>
  `;
}
