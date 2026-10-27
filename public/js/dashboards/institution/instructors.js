/* ============================================================
   Institution — Instructors
   ============================================================ */
function instInstructors() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Instructors</span></div>
    <section class="page-header">
      <h1 class="page-title">Instructors</h1>
      <button class="btn btn-primary" data-action="assign-instructor">
        <i class="fas fa-plus"></i> Assign Instructor</button>
    </section>

    <section class="card-grid">
      ${S.instructors.map(i => `
        <article class="expert-card">
          <img class="expert-avatar" src="${avatar(i)}" alt="" />
          <h4 class="expert-name">${esc(i.name || '')}</h4>
          <p class="expert-expertise">${esc(i.specialization || '-')}</p>
          <p class="expert-rate">${i.programme_count || 0} programme${(i.programme_count || 0) === 1 ? '' : 's'}</p>
          <button class="btn btn-secondary btn-block" data-action="view-instructor" data-id="${i.id}">
            View Profile</button>
        </article>`).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-user-tie"></i>
          <h3>No instructors assigned</h3>
          <p>Assign expert instructors to your programmes and cohorts.</p>
          <button class="btn btn-primary" data-action="assign-instructor">
            <i class="fas fa-plus"></i> Assign Instructor</button>
        </div>`}
    </section>
  `;
}
