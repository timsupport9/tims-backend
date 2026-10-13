/* ============================================================
   dashboards/institution/instructors.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const list = S.instructors || [];

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Instructors' }])}
      ${EH.Layout.pageHeader('Instructors', {
        actions: `<button class="btn btn-primary" data-action="assign-instructor">
          <i class="fas fa-plus"></i> Assign Instructor</button>`,
      })}

      <section class="card-grid">
        ${list.map(i => {
          const avatar = i.avatar || EH.PublicFormat.avatar(i.name);
          return `
            <article class="expert-card">
              <img class="expert-avatar" src="${EH.Fmt.esc(avatar)}" alt="" />
              <h4 class="expert-name">${EH.Fmt.esc(i.name || '')}</h4>
              <p class="expert-expertise">${EH.Fmt.esc(i.specialization || '-')}</p>
              <p class="expert-rate">
                ${i.programme_count || 0} programme${(i.programme_count || 0) === 1 ? '' : 's'}
              </p>
              <button class="btn btn-secondary btn-block" data-action="view-instructor" data-id="${i.id}">
                View Profile</button>
            </article>`;
        }).join('') || `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-user-tie"></i>
            <h3>No instructors assigned</h3>
            <p>Assign expert instructors to your programmes and cohorts.</p>
            <button class="btn btn-primary" data-action="assign-instructor">
              <i class="fas fa-plus"></i> Assign Instructor</button>
          </div>`}
      </section>`;
  }

  EH.InstInstructors = { render };
})(window);
