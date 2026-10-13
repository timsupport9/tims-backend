/* ============================================================
   dashboards/expert/events.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const me = S.currentUser || {};
    const mine = (S.events || []).filter(e => e.expert_id === me.id);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Events' }])}
      ${EH.Layout.pageHeader('My Events')}
      <section class="panel">
        ${mine.map(ev => {
          const d = new Date(ev.date || ev.created_at || Date.now());
          return `
            <article class="event-card">
              <div class="event-date">
                <span class="event-day">${d.getDate()}</span>
                <span class="event-month">${d.toLocaleString('en-US', { month: 'short' })}</span>
              </div>
              <div class="event-body">
                <h4 class="event-title">${EH.Fmt.esc(ev.title || '')}</h4>
                <p class="event-desc">${EH.Fmt.esc(ev.description || '')}</p>
                <p class="event-meta">${ev.registered_count || 0} registered of ${ev.capacity || 0}</p>
              </div>
            </article>`;
        }).join('') || '<p class="empty-row">No events assigned to you</p>'}
      </section>`;
  }

  EH.ExpertEvents = { render };
})(window);
