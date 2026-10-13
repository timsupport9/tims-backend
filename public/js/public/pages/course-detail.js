/* ============================================================
   public/pages/course-detail.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  async function render(id) {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <div class="skeleton skeleton-line" style="height:60px;margin:20px 0"></div>
        <div class="skeleton skeleton-line" style="height:120px"></div>
      </div>`;

    const c = await EH.CoursesService.detail(id);
    if (!c) {
      root.innerHTML = `
        <div class="public-page">
          ${EH.PublicNavbar.render()}
          <section class="public-content">
            ${EH.EmptyState.render({
              icon: 'fa-book', title: 'Course not found',
              description: 'This course may have been removed.',
            })}
          </section>
          ${EH.PublicFooter.render()}
        </div>`;
      EH.PublicNavbar.attach(root);
      EH.PublicFooter.attach(root);
      return;
    }

    const course = c.course || c;
    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <header class="public-page-header">
          <span class="chip chip-blue">${EH.Fmt.esc(EH.PublicFormat.courseType(course.course_type))}</span>
          <h1>${EH.Fmt.esc(course.title)}</h1>
          ${course.expert_name ? `<p>By ${EH.Fmt.esc(course.expert_name)}</p>` : ''}
        </header>
        <section class="public-content detail-layout">
          <article class="detail-main">
            <p>${EH.Fmt.esc(course.description || '')}</p>
          </article>
          <aside class="detail-sidebar">
            <div class="panel">
              <p class="detail-price">${EH.PublicFormat.price(course.price)}</p>
              <ul class="detail-facts">
                ${course.level ? `<li><strong>Level:</strong> ${EH.Fmt.esc(course.level)}</li>` : ''}
                ${course.duration_weeks ? `<li><strong>Duration:</strong> ${course.duration_weeks} weeks</li>` : ''}
                ${course.duration_hours ? `<li><strong>Hours:</strong> ${course.duration_hours}</li>` : ''}
              </ul>
              <a href="#/register" class="btn btn-primary btn-block">
                <i class="fas fa-shopping-cart"></i> Enroll now</a>
              <a href="#/courses" class="btn btn-secondary btn-block">
                <i class="fas fa-arrow-left"></i> All courses</a>
            </div>
          </aside>
        </section>
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);
  }

  EH.CourseDetailPage = { render };
})(window);
