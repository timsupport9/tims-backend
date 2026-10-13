/* ============================================================
   public/pages/event-detail.js
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
      </div>`;

    const d = await EH.EventsService.detail(id);
    const ev = d?.event || d || null;

    if (!ev) {
      root.innerHTML = `
        <div class="public-page">
          ${EH.PublicNavbar.render()}
          <section class="public-content">
            ${EH.EmptyState.render({
              icon: 'fa-calendar', title: 'Event not found',
            })}
          </section>
          ${EH.PublicFooter.render()}
        </div>`;
      EH.PublicNavbar.attach(root);
      EH.PublicFooter.attach(root);
      return;
    }

    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <header class="public-page-header">
          <h1>${EH.Fmt.esc(ev.title)}</h1>
          <p>${EH.Dates.fmtLong(ev.date)}</p>
        </header>
        <section class="public-content detail-layout">
          <article class="detail-main">
            <p>${EH.Fmt.esc(ev.description || '')}</p>
          </article>
          <aside class="detail-sidebar">
            <div class="panel">
              <p class="detail-price">${(ev.price || 0) > 0 ? EH.Fmt.cur(ev.price) : 'Free'}</p>
              <ul class="detail-facts">
                <li><strong>Registered:</strong> ${ev.registered_count || 0} / ${ev.capacity || 0}</li>
                <li><strong>Category:</strong> ${EH.Fmt.esc(ev.category || '')}</li>
              </ul>
              <a href="#/register" class="btn btn-primary btn-block">
                <i class="fas fa-plus"></i> Register</a>
              <a href="#/events" class="btn btn-secondary btn-block">
                <i class="fas fa-arrow-left"></i> All events</a>
            </div>
          </aside>
        </section>
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);
  }

  EH.EventDetailPage = { render };
})(window);
