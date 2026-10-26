/* ============================================================
   dashboards/expert/events.js
   ============================================================ */

function renderExpertEvents() {
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
            <p class="event-meta">
              ${ev.registered_count || 0} / ${ev.capacity || 0} registered
              · ${ev.price > 0 ? fmtCur(ev.price) : 'Free'}
            </p>
          </div>
          <div class="event-actions">
            <button class="btn btn-secondary btn-sm" data-expert-action="event-detail" data-id="${ev.id}">
              <i class="fas fa-eye"></i> Details</button>
            <button class="btn btn-info btn-sm" data-expert-action="event-registrations" data-id="${ev.id}">
              <i class="fas fa-users"></i> Registrations</button>
          </div>
        </article>
      `).join('') || '<p class="empty-row">No events assigned to you</p>'}
    </section>
  `;
}

function openEventRegistrationsModal(eventId) {
  const ev = S.events.find(e => String(e.id) === String(eventId));
  if (!ev) return;
  apiCall(`/api/expert/events/${eventId}/registrations`)
    .then(d => {
      const regs = d.registrations || [];
      openModal({
        title: `Registrations — ${ev.title}`,
        className: 'modal-lg',
        body: regs.length ? `
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Registered</th><th>Attended</th></tr>
              </thead>
              <tbody>
                ${regs.map(r => `
                  <tr>
                    <td>${esc(r.name || '')}</td>
                    <td>${esc(r.email || '')}</td>
                    <td>${fmtDT(r.registered_at)}</td>
                    <td>${r.attended ? '<span class="status-active">Yes</span>' : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : '<p class="empty-row">No registrations yet</p>',
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
    })
    .catch(e => showToast(e.message, 'error'));
}
