/* ============================================================
   public/pages/courses.js — Public course listing page
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  let state = { query: '', type: 'all', level: 'all', courses: [] };

  async function render() {
    const root = document.getElementById('app-root');
    if (!root) return;

    state.query = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
    state.type = new URLSearchParams(location.hash.split('?')[1] || '').get('type') || 'all';

    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <header class="public-page-header">
          <h1>All Courses</h1>
          <p>${EH.PublicConfig.brand.description}</p>
        </header>
        <section class="public-filters">
          ${EH.PublicSearch.render({ id: 'courseSearch', value: state.query })}
          <select id="courseTypeFilter" class="form-select">
            <option value="all">All types</option>
            <option value="bootcamp">Bootcamps</option>
            <option value="short_course">Short Courses</option>
            <option value="tuition">Tuition</option>
            <option value="exam_prep">Exam Prep</option>
            <option value="career">Career</option>
          </select>
          <select id="courseLevelFilter" class="form-select">
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </section>
        <section class="public-content">
          <div id="coursesGrid" class="card-grid">
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
          </div>
        </section>
        ${EH.PublicCTA.render()}
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.PublicCTA.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);

    const d = await EH.CoursesService.list();
    state.courses = d.courses || [];

    EH.PublicSearch.attach(root, (q) => { state.query = q; paint(); });

    document.getElementById('courseTypeFilter').onchange = (e) => {
      state.type = e.target.value; paint();
    };
    document.getElementById('courseLevelFilter').onchange = (e) => {
      state.level = e.target.value; paint();
    };

    paint();
  }

  function paint() {
    const filtered = EH.CoursesService.filter(state.courses, {
      type: state.type, level: state.level, query: state.query,
    });
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;
    if (!filtered.length) {
      grid.innerHTML = EH.EmptyState.render({
        icon: 'fa-book-open', title: 'No courses found',
        description: 'Try adjusting your filters.',
      });
      return;
    }
    grid.innerHTML = filtered.map(c => EH.CourseCard.render(c)).join('');
  }

  EH.CoursesPage = { render };
})(window);
