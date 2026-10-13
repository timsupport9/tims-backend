/* ============================================================
   public/pages/experts.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  let state = { query: '', experts: [] };

  async function render() {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <header class="public-page-header">
          <h1>Find an Expert</h1>
          <p>Book 1-on-1 consultations with verified professionals.</p>
        </header>
        <section class="public-filters">
          ${EH.PublicSearch.render({ id: 'expertSearch', placeholder: 'Search by name or specialization' })}
        </section>
        <section class="public-content">
          <div id="expertsGrid" class="card-grid">
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

    const d = await EH.ExpertsService.list();
    state.experts = d.experts || [];

    EH.PublicSearch.attach(root, (q) => { state.query = q; paint(); });
    paint();
  }

  function paint() {
    const filtered = EH.ExpertsService.filter(state.experts, state.query);
    const grid = document.getElementById('expertsGrid');
    if (!grid) return;
    if (!filtered.length) {
      grid.innerHTML = EH.EmptyState.render({
        icon: 'fa-user-tie', title: 'No experts found',
        description: 'Try a different search.',
      });
      return;
    }
    grid.innerHTML = filtered.map(e => EH.ExpertCard.render(e)).join('');
  }

  EH.ExpertsPage = { render };
})(window);
