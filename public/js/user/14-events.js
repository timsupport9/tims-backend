/* ============================================================
   ExpertHub 2.0 — 14-events.js
   Upcoming events list & registration.
   ============================================================ */

/* ============================================================
   USER — EVENTS
   ============================================================ */
function userEvents() {
  const registered = new Set((S.eventRegistrations || []).map(r => String(r.event_id)));
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
    <section class="page-header"><h1 class="page-title">Events</h1></section>
    <section class="panel">
      ${S.events.map(ev => {
        const isRegistered = registered.has(String(ev.id));
        return `
          <article class="event-card">
            <div class="event-date">
              <span class="event-day">${new Date(ev.date || ev.created_at).getDate()}</span>
              <span class="event-month">${new Date(ev.date || ev.created_at).toLocaleString('en-US', { month: 'short' })}</span>
            </div>
            <div class="event-body">
              <h4 class="event-title">${esc(ev.title || '')}</h4>
              <p class="event-desc">${esc(ev.description || '')}</p>
              <p class="event-meta">
                ${ev.registered_count || 0} of ${ev.capacity || 0} registered ·
                ${ev.price > 0 ? fmtCur(ev.price) : 'Free'}
              </p>
            </div>
            <div class="event-actions">
              <button class="btn ${isRegistered ? 'btn-secondary' : 'btn-primary'} btn-sm"
                      data-action="register-event" data-id="${ev.id}"
                      ${isRegistered ? 'disabled' : ''}>
                ${isRegistered ? '<i class="fas fa-check"></i> Registered' : '<i class="fas fa-plus"></i> Register'}
              </button>
            </div>
          </article>
        `;
      }).join('') || '<p class="empty-row">No events available</p>'}
    </section>
  `;
}
