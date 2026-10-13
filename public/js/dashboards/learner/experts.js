/* ============================================================
   dashboards/learner/experts.js — Find experts
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  let query = '';

  function render() {
    const filtered = query
      ? S.experts.filter(e =>
          (e.name || '').toLowerCase().includes(query.toLowerCase()) ||
          (e.specialization || '').toLowerCase().includes(query.toLowerCase()))
      : S.experts;

    const html = `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Experts' }])}
      ${EH.Layout.pageHeader('Find Experts', {
        actions: `
          <input type="search" id="expert-search" class="form-input"
                 placeholder="Search by name or specialization"
                 value="${EH.Fmt.esc(query)}" style="max-width:280px" />`,
      })}

      <section class="card-grid">
        ${filtered.map(e => {
          const avatar = e.avatar || EH.PublicFormat.avatar(e.name);
          return `
            <article class="expert-card">
              <img class="expert-avatar" src="${EH.Fmt.esc(avatar)}" alt="" />
              <h4 class="expert-name">${EH.Fmt.esc(e.name || '')}</h4>
              <p class="expert-expertise">${EH.Fmt.esc(e.specialization || '—')}</p>
              <p class="expert-rate">${EH.Fmt.cur(e.hourly_rate || 0)} / hr</p>
              <p class="expert-rating">
                <i class="fas fa-star" style="color:#f59e0b"></i>
                <span class="expert-rating-value">${Number(e.average_rating || 0).toFixed(1)}</span>
              </p>
              <button class="btn btn-primary btn-block" data-action="book-expert"
                      data-id="${e.id}" data-name="${EH.Fmt.esc(e.name || '')}">
                <i class="fas fa-calendar-plus"></i> Book Consultation</button>
              <button class="btn btn-secondary btn-block"
                      data-action="view-expert-profile" data-id="${e.id}">
                <i class="fas fa-eye"></i> View Profile</button>
            </article>`;
        }).join('') || `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-search"></i>
            <h3>No experts found</h3>
            <p>Try a different search term.</p>
          </div>`}
      </section>`;

    setTimeout(() => {
      const input = document.getElementById('expert-search');
      if (input) input.oninput = EH.Perf.debounce(() => {
        query = input.value;
        rerender();
      }, 250);
    }, 0);

    return html;
  }

  function rerender() {
    const host = document.getElementById('role-content');
    if (host) host.innerHTML = render();
  }

  EH.LearnerFindExperts = { render };
})(window);
