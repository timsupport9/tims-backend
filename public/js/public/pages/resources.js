/* ============================================================
   public/pages/resources.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  async function render() {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <header class="public-page-header">
          <h1>Resources</h1>
          <p>Guides, checklists and articles to accelerate your growth.</p>
        </header>
        <section class="public-content">
          <div id="resourcesGrid" class="card-grid"></div>
        </section>
        ${EH.PublicCTA.render()}
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.PublicCTA.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);

    const d = await EH.ResourcesService.list();
    const resources = d.resources || [];
    const grid = document.getElementById('resourcesGrid');
    if (!resources.length) {
      grid.innerHTML = EH.EmptyState.render({
        icon: 'fa-book', title: 'No resources yet',
      });
      return;
    }
    grid.innerHTML = resources.map(r => EH.ResourceCard.render(r)).join('');
  }

  EH.ResourcesPage = { render };
})(window);
