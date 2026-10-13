/* ============================================================
   dashboards/admin/events.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const events = (S.events || []).map(ev => {
      const d = new Date(ev.date || ev.created_at || Date.now());
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      return `
        <article class="event-card">
          <div class="event-date">
            <span class="event-day">${day}</span>
            <span class="event-month">${month}</span>
          </div>
          <div class="event-body">
            <h4 class="event-title">${EH.Fmt.esc(ev.title || '')}</h4>
            <p class="event-desc">${EH.Fmt.esc(EH.Fmt.truncate(ev.description || '', 120))}</p>
            <p class="event-meta">
              ${EH.Fmt.esc(ev.category || '')} · ${ev.registered_count || 0}/${ev.capacity || 0} registered · 
              ${ev.price > 0 ? EH.Fmt.cur(ev.price) : 'Free'}
            </p>
          </div>
          <div class="event-actions">
            <button class="btn btn-secondary btn-sm" data-action="edit-event" data-id="${ev.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-action="delete-event" data-id="${ev.id}">Delete</button>
          </div>
        </article>`;
    });

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Events' }])}
      ${EH.Layout.pageHeader('Events and Training', {
        actions: `<button class="btn btn-primary" data-action="create-event">
          <i class="fas fa-calendar-plus"></i> New Event</button>`,
      })}
      <section class="panel">
        <div class="event-list">
          ${events.join('') || '<p class="empty-row">No events yet</p>'}
        </div>
      </section>`;
  }

  EH.AdminEvents = { render };
})(window);
