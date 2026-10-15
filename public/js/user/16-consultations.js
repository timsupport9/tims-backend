/* ============================================================
   ExpertHub 2.0 — 16-consultations.js
   Learner consultation list + consultation card renderer.
   ============================================================ */

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
