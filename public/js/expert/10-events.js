/* ============================================================
   ExpertHub 2.0 — js/expert/10-events.js
   Expert's assigned events.
   ============================================================ */

function expertEvents() {
  const mine = S.events.filter(e => e.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Events</span></div>
    <section class="page-header"><h1 class="page-title">My Events</h1></section>
    <section class="panel">
      ${mine.map(ev => `
        <article class="event-card">
          <div class="event-date">
            <span class="event-day">${new Date(ev.date || ev.created_at).getDate()}</span>
            <span class="event-month">${new Date(ev.date || ev.created_at).toLocaleString('en-US', { month: 'short' })}</span>
          </div>
          <div class="event-body">
            <h4 class="event-title">${esc(ev.title || '')}</h4>
            <p class="event-desc">${esc(ev.description || '')}</p>
            <p class="event-meta">${ev.registered_count || 0} registered of ${ev.capacity || 0}</p>
          </div>
        </article>
      `).join('') || '<p class="empty-row">No events assigned to you</p>'}
    </section>
  `;
}
