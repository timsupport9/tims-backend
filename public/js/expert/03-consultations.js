/* ============================================================
   ExpertHub 2.0 — js/expert/03-consultations.js
   Expert consultations list with status filter.
   ============================================================ */

function expertConsultations() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const filter = $('#expert-consult-filter')?.value || '';
  const filtered = filter ? mine.filter(c => c.status === filter) : mine;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">My Consultations</h1>
      <div class="page-actions">
        <select id="expert-consult-filter" class="form-select" style="max-width:200px">
          <option value="">All statuses</option>
          ${CONFIG.CONSULTATION_STATUSES.map(s => `
            <option value="${s}" ${filter === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>
          `).join('')}
        </select>
      </div>
    </section>

    <section class="list-stack">
      ${filtered.map(c => `
        <article class="consultation-card">
          <header class="consultation-card-header">
            <div>
              <h4 class="consultation-card-title">${esc(c.title || '')}</h4>
              <p class="consultation-card-meta">
                <span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' ') || '')}</span>
                ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
              </p>
            </div>
            <div class="consultation-card-price">
              ${fmtCur(c.price || 0)}
            </div>
          </header>

          <div class="consultation-card-body">
            <div class="consultation-card-expert">
              <img class="user-avatar" src="${avatar({ name: c.client_name, email: c.client_email })}" alt="" />
              <div>
                <div class="user-name">${esc(c.client_name || 'Client')}</div>
                <div class="user-email">${esc(c.client_email || '')}</div>
              </div>
            </div>
            ${c.scheduled_at ? `
              <div class="consultation-card-time">
                <i class="fas fa-calendar"></i>
                <strong>${fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC')}</strong>
                <span class="consultation-card-countdown">${timeUntil(c.scheduled_at)}</span>
              </div>
            ` : ''}
            <div class="consultation-card-duration">
              <i class="fas fa-clock"></i> ${c.duration_minutes || 30} min · ${esc(c.consultation_type || 'video')}
            </div>
            ${c.description ? `<p class="consultation-card-desc">${esc(c.description.slice(0, 200))}</p>` : ''}
          </div>

          <footer class="consultation-card-actions">
            ${c.status === 'pending_expert_confirmation' ? `
              <button class="btn btn-success btn-sm" data-action="confirm-consultation" data-id="${c.id}">
                <i class="fas fa-check"></i> Confirm Booking</button>
              <button class="btn btn-danger btn-sm" data-action="cancel-consultation" data-id="${c.id}">
                <i class="fas fa-times"></i> Decline</button>
            ` : ''}
            ${['confirmed','scheduled','in_grace'].includes(c.status) ? `
              <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}">
                <i class="fas fa-play"></i> Start Session</button>
            ` : ''}
            ${c.status === 'in_session' ? `
              <button class="btn btn-success btn-sm" data-action="end-session" data-id="${c.id}">
                <i class="fas fa-stop"></i> End Session</button>
            ` : ''}
            <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
              <i class="fas fa-comments"></i> Chat</button>
            ${['confirmed','scheduled'].includes(c.status) && (c.reschedule_count || 0) < CONFIG.MAX_RESCHEDULES ? `
              <button class="btn btn-secondary btn-sm" data-action="reschedule-consultation" data-id="${c.id}">
                <i class="fas fa-calendar-alt"></i> Reschedule</button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
              <i class="fas fa-eye"></i> Details</button>
          </footer>
        </article>
      `).join('') || `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No consultations</h3>
          <p>Consultations assigned by admin will appear here.</p>
        </div>
      `}
    </section>
  `;
}
