/* ============================================================
   public/components/event-card.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(ev) {
    const d = new Date(ev.date || ev.created_at || Date.now());
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const price = (ev.price || 0) > 0 ? EH.Fmt.cur(ev.price) : 'Free';
    return `
      <article class="event-card public-event-card">
        <div class="event-date">
          <span class="event-day">${day}</span>
          <span class="event-month">${month}</span>
        </div>
        <div class="event-body">
          <h4 class="event-title">${EH.Fmt.esc(ev.title)}</h4>
          <p class="event-desc">${EH.Fmt.esc(EH.Fmt.truncate(ev.description, 140))}</p>
          <p class="event-meta">
            ${ev.registered_count || 0}/${ev.capacity || 0} registered · ${price}
          </p>
        </div>
        <div class="event-actions">
          <a href="#/event/${ev.id}" class="btn btn-primary btn-sm">Details</a>
        </div>
      </article>`;
  }

  EH.EventCard = { render };
})(window);
