/* ============================================================
   public/pages/events.js
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
          <h1>Events & Workshops</h1>
          <p>Workshops, career fairs and hands-on training events.</p>
        </header>
        <section class="public-content">
          <div id="eventsList" class="list-stack">
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>
          </div>
        </section>
        ${EH.PublicCTA.render()}
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.PublicCTA.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);

    const d = await EH.EventsService.list();
    const events = d.events || [];
    const host = document.getElementById('eventsList');
    if (!events.length) {
      host.innerHTML = EH.EmptyState.render({
        icon: 'fa-calendar', title: 'No events yet',
        description: 'Check back soon for upcoming events.',
      });
      return;
    }
    host.innerHTML = events.map(ev => EH.EventCard.render(ev)).join('');
  }

  EH.EventsPage = { render };
})(window);
