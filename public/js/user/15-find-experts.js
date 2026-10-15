/* ============================================================
   ExpertHub 2.0 — 15-find-experts.js
   Expert discovery, filtering and instant consultation entry.
   ============================================================ */

/* ============================================================
   USER — FIND EXPERTS
   ============================================================ */
function userFindExperts() {
  const query = ($('#expert-search')?.value || '').toLowerCase();
  const budget = Number($('#expert-budget')?.value || 0);
  const instantOnly = $('#expert-instant')?.checked || false;

  let filtered = query
    ? S.experts.filter(e =>
        (e.name || '').toLowerCase().includes(query) ||
        (e.specialization || '').toLowerCase().includes(query)
      )
    : S.experts.slice();
  if (budget) filtered = filtered.filter(e => Number(e.hourly_rate || 0) <= budget);
  if (instantOnly) filtered = filtered.filter(e => e.instant_available);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header">
      <h1 class="page-title">Find Experts</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="find-expert-wizard">
          <i class="fas fa-magic"></i> Match Me</button>
        <button class="btn btn-primary" data-action="instant-consultation">
          <i class="fas fa-bolt"></i> Talk Now</button>
      </div>
    </section>

    <section class="panel">
      <div class="page-actions" style="margin-bottom:14px">
        <input type="search" id="expert-search" class="form-input"
               placeholder="Search by name or specialization"
               value="${esc(query)}" style="max-width:260px" />
        <input type="number" id="expert-budget" class="form-input"
               placeholder="Max $/hour" value="${budget || ''}" style="max-width:120px" />
        <label class="checkbox-row">
          <input type="checkbox" id="expert-instant" ${instantOnly ? 'checked' : ''} />
          Online now
        </label>
      </div>

      <section class="card-grid">
        ${filtered.map(e => `
          <article class="expert-card">
            <div style="position:relative">
              <img class="expert-avatar" src="${avatar(e)}" alt="" />
              ${e.is_online ? '<span class="expert-online-dot"></span>' : ''}
            </div>
            <h4 class="expert-name">
              ${esc(e.name || '')}
              ${e.verified_badge ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
            </h4>
            <p class="expert-expertise">${esc(e.specialization || '—')}</p>
            <p class="expert-rate">${fmtCur(e.hourly_rate || 0)} / hr</p>
            <p class="expert-rating">
              <i class="fas fa-star" style="color:#f59e0b"></i>
              <span class="expert-rating-value">${Number(e.average_rating || 0).toFixed(1)}</span>
              ${e.response_time_minutes ? `<span class="expert-response">· ~${e.response_time_minutes}m response</span>` : ''}
            </p>
            <div class="expert-card-actions">
              <button class="btn btn-primary btn-sm flex-1" data-action="book-slot-with"
                      data-id="${e.id}" data-name="${esc(e.name || '')}">
                <i class="fas fa-calendar-plus"></i> Book</button>
              <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${e.id}">
                <i class="fas fa-eye"></i></button>
            </div>
          </article>
        `).join('') || `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-search"></i>
            <h3>No experts found</h3>
            <p>Try adjusting your filters.</p>
          </div>
        `}
      </section>
    </section>
  `;
}
