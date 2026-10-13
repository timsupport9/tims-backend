/* ============================================================
   dashboards/expert/courses.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const me = S.currentUser || {};
    const mine = (S.courses || []).filter(c => c.expert_id === me.id);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Courses' }])}
      ${EH.Layout.pageHeader('My Courses', {
        actions: `<button class="btn btn-primary" data-action="create-course-modal">
          <i class="fas fa-plus"></i> New Course</button>`,
      })}

      <section class="card-grid">
        ${mine.map(c => `
          <article class="program-card">
            <span class="chip chip-blue">${EH.Fmt.esc(c.level || 'beginner')}</span>
            <h4 class="program-title">${EH.Fmt.esc(c.title || '')}</h4>
            <p class="program-desc">${EH.Fmt.esc(EH.Fmt.truncate(c.description || '', 110))}</p>
            <footer class="program-footer">
              <span class="program-price">${EH.Fmt.cur(c.price || 0)}</span>
              <span class="program-meta">
                ${c.duration_weeks || c.duration_hours || 0}${c.duration_weeks ? 'w' : 'h'}
              </span>
            </footer>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-secondary btn-sm" data-action="edit-course" data-id="${c.id}">Edit</button>
              <button class="btn btn-info btn-sm" data-action="view-course-analytics" data-id="${c.id}">Analytics</button>
            </div>
          </article>`).join('') || `
            <div class="empty-state" style="grid-column:1/-1">
              <i class="fas fa-book"></i>
              <h3>No courses yet</h3>
              <p>Create your first course to start earning.</p>
              <button class="btn btn-primary" data-action="create-course-modal">
                <i class="fas fa-plus"></i> Create Course</button>
            </div>`}
      </section>`;
  }

  EH.ExpertCourses = { render };
})(window);
