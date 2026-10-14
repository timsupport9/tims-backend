/* ============================================================
   ExpertHub 2.0 — 11-user-consulting.js
   Events, Find Experts, Consultations, Packages, Shortlist.
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

/* ============================================================
   USER — FIND EXPERTS
   ============================================================ */
function userFindExperts() {
  const query = ($('#expert-search')?.value || '').toLowerCase();
  const budget = Number($('#expert-budget')?.value || 0);
  const instantOnly = $('#expert-instant')?.checked || false;

  let filtered = query
    ? S.experts.filter(e =>
        (e.name || '').toLowerCase().includes(query) ||
        (e.specialization || '').toLowerCase().includes(query)
      )
    : S.experts.slice();
  if (budget) filtered = filtered.filter(e => Number(e.hourly_rate || 0) <= budget);
  if (instantOnly) filtered = filtered.filter(e => e.instant_available);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header">
      <h1 class="page-title">Find Experts</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="find-expert-wizard">
          <i class="fas fa-magic"></i> Match Me</button>
        <button class="btn btn-primary" data-action="instant-consultation">
          <i class="fas fa-bolt"></i> Talk Now</button>
      </div>
    </section>

    <section class="panel">
      <div class="page-actions" style="margin-bottom:14px">
        <input type="search" id="expert-search" class="form-input"
               placeholder="Search by name or specialization"
               value="${esc(query)}" style="max-width:260px" />
        <input type="number" id="expert-budget" class="form-input"
               placeholder="Max $/hour" value="${budget || ''}" style="max-width:120px" />
        <label class="checkbox-row">
          <input type="checkbox" id="expert-instant" ${instantOnly ? 'checked' : ''} />
          Online now
        </label>
      </div>

      <section class="card-grid">
        ${filtered.map(e => `
          <article class="expert-card">
            <div style="position:relative">
              <img class="expert-avatar" src="${avatar(e)}" alt="" />
              ${e.is_online ? '<span class="expert-online-dot"></span>' : ''}
            </div>
            <h4 class="expert-name">
              ${esc(e.name || '')}
              ${e.verified_badge ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
            </h4>
            <p class="expert-expertise">${esc(e.specialization || '—')}</p>
            <p class="expert-rate">${fmtCur(e.hourly_rate || 0)} / hr</p>
            <p class="expert-rating">
              <i class="fas fa-star" style="color:#f59e0b"></i>
              <span class="expert-rating-value">${Number(e.average_rating || 0).toFixed(1)}</span>
              ${e.response_time_minutes ? `<span class="expert-response">· ~${e.response_time_minutes}m response</span>` : ''}
            </p>
            <div class="expert-card-actions">
              <button class="btn btn-primary btn-sm flex-1" data-action="book-slot-with"
                      data-id="${e.id}" data-name="${esc(e.name || '')}">
                <i class="fas fa-calendar-plus"></i> Book</button>
              <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${e.id}">
                <i class="fas fa-eye"></i></button>
            </div>
          </article>
        `).join('') || `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-search"></i>
            <h3>No experts found</h3>
            <p>Try adjusting your filters.</p>
          </div>
        `}
      </section>
    </section>
  `;
}

/* ============================================================
   USER — CONSULTATIONS
   ============================================================ */
function userConsultations() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const upcoming = mine.filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date() && !['cancelled','expired','no_show'].includes(c.status));
  const pending = mine.filter(c => ['pending_payment','pending_expert_confirmation'].includes(c.status));
  const past = mine.filter(c => ['completed','cancelled','no_show','expired'].includes(c.status));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">My Consultations</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="instant-consultation">
          <i class="fas fa-bolt"></i> Talk Now</button>
        <button class="btn btn-primary" data-action="find-expert-wizard">
          <i class="fas fa-plus"></i> Book Session</button>
      </div>
    </section>

    ${S.userPackages.length ? `
      <div class="alert alert-info">
        <i class="fas fa-ticket-alt"></i>
        <div>
          You have <strong>${S.userPackages.reduce((s, p) => s + p.sessions_remaining, 0)} session credits</strong>
          across ${S.userPackages.length} package${S.userPackages.length === 1 ? '' : 's'}.
        </div>
      </div>
    ` : ''}

    ${upcoming.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Sessions</h3>
        ${upcoming.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${pending.length ? `
      <section class="panel">
        <h3 class="panel-title">Awaiting Confirmation</h3>
        ${pending.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${past.length ? `
      <section class="panel">
        <h3 class="panel-title">Past Sessions</h3>
        ${past.slice(0, 20).map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${!mine.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No consultations yet</h3>
          <p>Book your first expert session, or get matched with the perfect expert.</p>
          <button class="btn btn-primary" data-action="find-expert-wizard">
            <i class="fas fa-magic"></i> Find Me an Expert</button>
        </div>
      </section>
    ` : ''}
  `;
}

function renderUserConsultationCard(c) {
  const tz = currentUser?.timezone || 'UTC';
  const canCancel = ['pending_expert_confirmation','confirmed','scheduled'].includes(c.status);
  const canReschedule = ['confirmed','scheduled'].includes(c.status) && (c.reschedule_count || 0) < CONFIG.MAX_RESCHEDULES;
  const canJoin = ['confirmed','in_grace','in_session'].includes(c.status);
  const canReview = c.status === 'completed' && !c.reviewed;
  const canDispute = ['completed','awaiting_completion'].includes(c.status) && !c.disputed;
  const canTip = c.status === 'completed';

  return `
    <div class="consultation-card">
      <header class="consultation-card-header">
        <div>
          <h4 class="consultation-card-title">${esc(c.title)}</h4>
          <p class="consultation-card-meta">
            <span class="${consultationStatusClass(c.status)}">${esc(c.status.replace(/_/g, ' '))}</span>
            ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
            ${c.is_group ? '<span class="chip chip-purple">Group</span>' : ''}
          </p>
        </div>
        <div class="consultation-card-price">
          ${fmtCur(c.price || 0)}
          ${c.payment_status === 'held' ? '<div class="consultation-card-escrow">In escrow</div>' : ''}
        </div>
      </header>

      <div class="consultation-card-body">
        <div class="consultation-card-expert">
          <img class="user-avatar" src="${avatar({ name: c.expert_name, email: c.expert_email })}" alt="" />
          <div>
            <div class="user-name">${esc(c.expert_name || 'Expert')}</div>
            <div class="user-email">${esc(c.expert_specialization || '')}</div>
          </div>
        </div>

        ${c.scheduled_at ? `
          <div class="consultation-card-time">
            <i class="fas fa-calendar"></i>
            <strong>${fmtInTz(c.scheduled_at, tz)}</strong>
            <span class="consultation-card-countdown">${timeUntil(c.scheduled_at)}</span>
          </div>
        ` : ''}

        <div class="consultation-card-duration">
          <i class="fas fa-clock"></i> ${c.duration_minutes || 30} minutes · ${esc(c.consultation_type || 'video')}
        </div>

        ${c.description ? `<p class="consultation-card-desc">${esc(c.description.slice(0, 200))}</p>` : ''}

        ${c.payment_status === 'held' ? `
          <div class="consultation-card-escrow-info">
            <i class="fas fa-shield-alt"></i>
            Payment held in escrow. Released after session completion.
          </div>
        ` : ''}
      </div>

      <footer class="consultation-card-actions">
        ${canJoin ? `
          <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}">
            <i class="fas fa-video"></i> Join</button>
        ` : ''}
        <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
          <i class="fas fa-comments"></i> Chat</button>
        ${canReschedule ? `
          <button class="btn btn-secondary btn-sm" data-action="reschedule-consultation" data-id="${c.id}">
            <i class="fas fa-calendar-alt"></i> Reschedule</button>
        ` : ''}
        ${canCancel ? `
          <button class="btn btn-danger btn-sm" data-action="cancel-consultation" data-id="${c.id}">
            <i class="fas fa-times"></i> Cancel</button>
        ` : ''}
        ${canReview ? `
          <button class="btn btn-success btn-sm" data-action="review-consultation"
                  data-id="${c.id}" data-expert="${c.expert_id}">
            <i class="fas fa-star"></i> Rate Session</button>
        ` : ''}
        ${canDispute ? `
          <button class="btn btn-warning btn-sm" data-action="open-dispute" data-id="${c.id}">
            <i class="fas fa-gavel"></i> File Dispute</button>
        ` : ''}
        ${canTip ? `
          <button class="btn btn-primary btn-sm" data-action="tip-expert" data-id="${c.id}">
            <i class="fas fa-hand-holding-usd"></i> Tip</button>
          <button class="btn btn-secondary btn-sm" data-action="book-followup" data-expert="${c.expert_id}">
            <i class="fas fa-redo"></i> Book Again</button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
          <i class="fas fa-eye"></i> Details</button>
      </footer>
    </div>
  `;
}

/* ============================================================
   USER — SESSION PACKAGES
   ============================================================ */
function userPackages() {
  const packages = S.userPackages || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Session Packages</span></div>
    <section class="page-header">
      <h1 class="page-title">Session Packages</h1>
    </section>

    ${packages.length ? `
      <section class="card-grid">
        ${packages.map(p => `
          <article class="program-card">
            <span class="chip chip-blue">${p.sessions_remaining} of ${p.sessions_total || p.sessions_remaining} left</span>
            <h4 class="program-title">${esc(p.package_name)}</h4>
            <p class="program-desc">with ${esc(p.expert_name)}</p>
            <footer class="program-footer">
              <span class="program-meta">Expires: ${fmtDate(p.expires_at)}</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="use-package-credit"
                      data-expert="${p.package_id}">
                <i class="fas fa-calendar-plus"></i> Book Next Session</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-ticket-alt"></i>
          <h3>No packages purchased</h3>
          <p>Packages save you money on multi-session bookings. Browse experts to find packages.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Browse Experts</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   USER — SHORTLIST
   ============================================================ */
function userShortlist() {
  const shortlist = S.userShortlist || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Shortlist</span></div>
    <section class="page-header">
      <h1 class="page-title">Saved Experts</h1>
    </section>

    ${shortlist.length ? `
      <section class="card-grid">
        ${shortlist.map(e => `
          <article class="expert-card">
            <img class="expert-avatar" src="${avatar(e)}" alt="" />
            <h4 class="expert-name">${esc(e.name)}</h4>
            <p class="expert-expertise">${esc(e.specialization || '')}</p>
            <p class="expert-rate">${fmtCur(e.hourly_rate)}/hr</p>
            <div class="expert-card-actions">
              <button class="btn btn-primary btn-sm flex-1" data-action="book-slot-with"
                      data-id="${e.expert_id}" data-name="${esc(e.name)}">
                <i class="fas fa-calendar-plus"></i> Book</button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-shortlist" data-id="${e.expert_id}">
                <i class="fas fa-bookmark"></i></button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-bookmark"></i>
          <h3>Your shortlist is empty</h3>
          <p>Save experts you want to work with later.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Browse Experts</button>
        </div>
      </section>
    `}
  `;