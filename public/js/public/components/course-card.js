/* ============================================================
   public/components/course-card.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(course) {
    const price = EH.PublicFormat.price(course.price);
    const duration = EH.PublicFormat.duration(course);
    const type = EH.PublicFormat.courseType(course.course_type);
    return `
      <article class="program-card public-course-card">
        <span class="chip chip-blue">${EH.Fmt.esc(type)}</span>
        <h4 class="program-title">${EH.Fmt.esc(course.title)}</h4>
        <p class="program-desc">${EH.Fmt.esc(EH.Fmt.truncate(course.description, 130))}</p>
        ${course.expert_name ? `
          <p class="program-meta"><i class="fas fa-user-tie"></i> ${EH.Fmt.esc(course.expert_name)}</p>` : ''}
        <footer class="program-footer">
          <span class="program-price">${EH.Fmt.esc(price)}</span>
          <span class="program-meta">
            ${duration ? EH.Fmt.esc(duration) + ' · ' : ''}${EH.Fmt.esc(course.level || '')}
          </span>
        </footer>
        <div class="panel-actions" style="margin-top:10px">
          <a href="#/course/${course.id}" class="btn btn-primary btn-sm">
            <i class="fas fa-eye"></i> View</a>
          <a href="#/register" class="btn btn-secondary btn-sm">
            <i class="fas fa-shopping-cart"></i> Enroll</a>
        </div>
      </article>`;
  }

  EH.CourseCard = { render };
})(window);
