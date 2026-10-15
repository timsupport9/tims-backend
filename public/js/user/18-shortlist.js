/* ============================================================
   ExpertHub 2.0 — 18-shortlist.js
   Saved experts (user shortlist).
   ============================================================ */

/* ============================================================
   USER — SHORTLIST
   ============================================================ */
function userShortlist() {
  const shortlist = S.userShortlist || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Shortlist</span></div>
    <section class="page-header">
      <h1 class="page-title">Saved Experts</h1>
    </section>

    ${shortlist.length ? `
      <section class="card-grid">
        ${shortlist.map(e => `
          <article class="expert-card">
            <img class="expert-avatar" src="${avatar(e)}" alt="" />
            <h4 class="expert-name">${esc(e.name)}</h4>
            <p class="expert-expertise">${esc(e.specialization || '')}</p>
            <p class="expert-rate">${fmtCur(e.hourly_rate)}/hr</p>
            <div class="expert-card-actions">
              <button class="btn btn-primary btn-sm flex-1" data-action="book-slot-with"
                      data-id="${e.expert_id}" data-name="${esc(e.name)}">
                <i class="fas fa-calendar-plus"></i> Book</button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-shortlist" data-id="${e.expert_id}">
                <i class="fas fa-bookmark"></i></button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-bookmark"></i>
          <h3>Your shortlist is empty</h3>
          <p>Save experts you want to work with later.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Browse Experts</button>
        </div>
      </section>
    `}
  `;
}
