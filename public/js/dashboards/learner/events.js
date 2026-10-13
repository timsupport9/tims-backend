/* ============================================================
   dashboards/learner/events.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const registered = new Set((S.eventRegistrations || []).map(r => String(r.event_id)));

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Events' }])}
      ${EH.Layout.pageHeader('Events')}

      <section class="panel">
        ${S.events.map(ev => {
          const d = new Date(ev.date || ev.created_at || Date.now());
          const isRegistered = registered.has(String(ev.id));
          return `
            <article class="event-card">
              <div class="event-date">
                <span class="event-day">${d.getDate()}</span>
                <span class="event-month">${d.toLocaleString('en-US', { month: 'short' })}</span>
              </div>
              <div class="event-body">
                <h4 class="event-title">${EH.Fmt.esc(ev.title || '')}</h4>
                <p class="event-desc">${EH.Fmt.esc(ev.description || '')}</p>
                <p class="event-meta">
                  ${ev.registered_count || 0} of ${ev.capacity || 0} registered ·
                  ${ev.price > 0 ? EH.Fmt.cur(ev.price) : 'Free'}
                </p>
              </div>
              <div class="event-actions">
                <button class="btn ${isRegistered ? 'btn-secondary' : 'btn-primary'} btn-sm"
                        data-action="register-event" data-id="${ev.id}"
                        ${isRegistered ? 'disabled' : ''}>
                  ${isRegistered
                    ? '<i class="fas fa-check"></i> Registered'
                    : '<i class="fas fa-plus"></i> Register'}
                </button>
              </div>
            </article>`;
        }).join('') || '<p class="empty-row">No events available</p>'}
      </section>`;
  }

  EH.LearnerEvents = { render };
})(window);
