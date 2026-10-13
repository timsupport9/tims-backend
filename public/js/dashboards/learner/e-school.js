/* ============================================================
   dashboards/learner/e-school.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  const TABS = [
    { id: 'courses',      label: 'All Courses' },
    { id: 'bootcamp',     label: 'Bootcamps' },
    { id: 'short_course', label: 'Short Courses' },
    { id: 'tuition',      label: 'Tuition' },
    { id: 'exam_prep',    label: 'Exam Prep' },
    { id: 'career',       label: 'Career' },
  ];

  function render() {
    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'E-School' }])}
      ${EH.Layout.pageHeader('E-School Learning Hub')}
      <nav class="tab-bar">
        ${TABS.map(t => `
          <button class="tab-btn ${S.activeESchoolTab === t.id ? 'tab-btn-active' : ''}"
                  data-eschool-tab="${t.id}">${t.label}</button>
        `).join('')}
      </nav>
      <section class="panel" id="eschool-panel">${panel()}</section>`;
  }

  function panel() {
    const filter = S.activeESchoolTab === 'courses' ? null : S.activeESchoolTab;
    const list = filter ? S.courses.filter(c => c.course_type === filter) : S.courses;

    if (!list.length) {
      return EH.EmptyState.render({
        icon: 'fa-book-open',
        title: 'No courses available',
        description: 'Check back soon for new courses.',
      });
    }

    const wishlistIds = new Set((S.wishlist || []).map(w => String(w.course_id)));

    return `
      <div class="card-grid">
        ${list.map(c => `
          <article class="program-card">
            <span class="chip chip-blue">${EH.Fmt.esc(EH.PublicFormat.courseType(c.course_type))}</span>
            <h4 class="program-title">${EH.Fmt.esc(c.title || '')}</h4>
            <p class="program-desc">${EH.Fmt.esc(EH.Fmt.truncate(c.description, 120))}</p>
            <footer class="program-footer">
              <span class="program-price">${EH.Fmt.cur(c.price || 0)}</span>
              <span class="program-meta">
                ${c.duration_weeks ? c.duration_weeks + 'w' : (c.duration_hours || 0) + 'h'} ·
                ${EH.Fmt.esc(c.level || '')}
              </span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
              <button class="btn btn-primary btn-sm" data-action="enroll-modal" data-id="${c.id}">
                <i class="fas fa-shopping-cart"></i> Enroll</button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
                <i class="fas fa-heart"
                   style="color:${wishlistIds.has(String(c.id)) ? 'var(--danger)' : 'inherit'}"></i>
              </button>
            </div>
          </article>
        `).join('')}
      </div>`;
  }

  EH.LearnerESchool = { render };
})(window);
