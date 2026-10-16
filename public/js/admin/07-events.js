/* ============================================================
   ExpertHub 2.0 — js/admin/07-events.js
   Admin events management.
   ============================================================ */

function adminEvents() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
    <section class="page-header">
      <h1 class="page-title">Events and Training</h1>
      <button class="btn btn-primary" data-action="create-event"><i class="fas fa-calendar-plus"></i> New Event</button>
    </section>
    <section class="panel">
      <div class="event-list">
        ${S.events.map(ev => `
          <article class="event-card">
            <div class="event-date">
              <span class="event-day">${new Date(ev.date || ev.created_at).getDate()}</span>
              <span class="event-month">${new Date(ev.date || ev.created_at).toLocaleString('en-US', { month: 'short' })}</span>
            </div>
            <div class="event-body">
              <h4 class="event-title">${esc(ev.title || '')}</h4>
              <p class="event-desc">${esc((ev.description || '').slice(0, 120))}</p>
              <p class="event-meta">${esc(ev.category || '')} · ${ev.registered_count || 0}/${ev.capacity || 0} registered · ${ev.price > 0 ? fmtCur(ev.price) : 'Free'}</p>
            </div>
            <div class="event-actions">
              <button class="btn btn-secondary btn-sm" data-action="edit-event" data-id="${ev.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete-event" data-id="${ev.id}">Delete</button>
            </div>
          </article>
        `).join('') || '<p class="empty-row">No events</p>'}
      </div>
    </section>
  `;
}