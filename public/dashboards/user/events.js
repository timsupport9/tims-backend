/* ============================================================
   ExpertHub 2.0 — dashboards/user/events.js
   Event list + registration with capacity verification,
   free vs paid, cancel registration, timezone handling.
   ============================================================ */

function renderUserEvents() {
  const registered = new Set((S.eventRegistrations || []).map(r => String(r.event_id)));
  const now = Date.now();

  const upcoming = (S.events || [])
    .filter(ev => !ev.date || new Date(ev.date).getTime() >= now - 86400000)
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));
  const past = (S.events || [])
    .filter(ev => ev.date && new Date(ev.date).getTime() < now - 86400000)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderEvent = (ev) => {
    const isRegistered = registered.has(String(ev.id));
    const full = ev.capacity && (ev.registered_count || 0) >= ev.capacity;
    const isPaid = Number(ev.price || 0) > 0;
    const eventDate = new Date(ev.date || ev.created_at);
    return `
      <article class="event-card">
        <div class="event-date">
          <span class="event-day">${eventDate.getDate()}</span>
          <span class="event-month">${eventDate.toLocaleString('en-US', { month: 'short' })}</span>
        </div>
        <div class="event-body">
          <h4 class="event-title">${esc(ev.title || '')}</h4>
          <p class="event-desc">${esc(ev.description || '')}</p>
          <p class="event-meta">
            ${ev.registered_count || 0} of ${ev.capacity || 0} registered ·
            ${isPaid ? fmtCur(ev.price) : 'Free'}
            ${ev.mode ? `· ${esc(ev.mode)}` : ''}
            ${ev.location ? `· ${esc(ev.location)}` : ''}
          </p>
        </div>
        <div class="event-actions">
          ${isRegistered
            ? `
              <button class="btn btn-secondary btn-sm" data-action="cancel-event-registration" data-id="${ev.id}">
                <i class="fas fa-check"></i> Registered</button>
            `
            : full
              ? `<button class="btn btn-secondary btn-sm" disabled>Full</button>`
              : `<button class="btn btn-primary btn-sm" data-action="register-event" data-id="${ev.id}">
                  <i class="fas fa-plus"></i> ${isPaid ? 'Pay & Register' : 'Register'}</button>`}
        </div>
      </article>
    `;
  };

  return UserUI.page({
    title: 'Events',
    breadcrumb: 'Events',
    content: `
      <section class="panel">
        <h3 class="panel-title">Upcoming</h3>
        ${upcoming.length ? upcoming.map(renderEvent).join('') : '<p class="empty-row">No upcoming events</p>'}
      </section>
      ${past.length ? `
        <section class="panel">
          <h3 class="panel-title">Past Events</h3>
          ${past.slice(0, 10).map(renderEvent).join('')}
        </section>
      ` : ''}
    `,
  });
}

window.ExpertHubUser.registerModule('events', renderUserEvents);

window.ExpertHubUser.registerAction('register-event', async (id) => {
  try {
    // Verify capacity & price server-side before asking for payment
    const info = await apiCall(`/api/common/events/${id}/register-info`).catch(() => null);
    if (info?.capacity_reached) return showToast('This event is full', 'warning');
    if (info?.already_registered) return showToast('You are already registered', 'info');
    const price = Number(info?.price ?? 0);

    if (price > 0) {
      const ok = await confirmDialog(`Register for ${fmtCur(price)}? Payment will be deducted from your wallet.`);
      if (!ok) return;
    }

    const d = await apiCall(`/api/common/events/${id}/register`, 'POST');
    await loadAllData?.();
    await loadUserExtendedData({ force: true });
    rerenderRoleContent();
    showToast(d?.message || 'Registered for event', 'success');
    if (d?.payment_url) window.location.href = d.payment_url;
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('cancel-event-registration', async (id) => {
  if (!await confirmDialog('Cancel your event registration?')) return;
  try {
    await apiCall(`/api/common/events/${id}/cancel`, 'POST');
    if (S.eventRegistrations) {
      S.eventRegistrations = S.eventRegistrations.filter(r => String(r.event_id) !== String(id));
    }
    rerenderRoleContent();
    showToast('Registration cancelled', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});