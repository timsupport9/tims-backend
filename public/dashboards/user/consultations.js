/* ============================================================
   ExpertHub 2.0 — dashboards/user/consultations.js
   My Consultations: upcoming, pending, past; reschedule, cancel,
   dispute, tip, review, detail, chat, join.
   ============================================================ */

function renderUserConsultations() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const upcoming = mine.filter(c =>
    c.scheduled_at && new Date(c.scheduled_at) > new Date() &&
    !['cancelled','expired','no_show'].includes(c.status)
  );
  const pending = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation'].includes(c.status)
  );
  const past = mine.filter(c =>
    ['completed','cancelled','no_show','expired','refunded','disputed'].includes(c.status)
  );
  const totalCredits = (S.userPackages || []).reduce((s, p) => s + Number(p.sessions_remaining || 0), 0);

  return UserUI.page({
    title: 'My Consultations',
    breadcrumb: 'Consultations',
    actions: `
      <button class="btn btn-secondary" data-action="instant-consultation">
        <i class="fas fa-bolt"></i> Talk Now</button>
      <button class="btn btn-primary" data-action="find-expert-wizard">
        <i class="fas fa-plus"></i> Book Session</button>
    `,
    content: `
      ${totalCredits ? `
        <div class="alert alert-info">
          <i class="fas fa-ticket-alt"></i>
          <div>You have <strong>${totalCredits} session credits</strong> across ${S.userPackages.length} package${S.userPackages.length === 1 ? '' : 's'}.</div>
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
          ${UserUI.empty({
            icon: 'fa-comments',
            title: 'No consultations yet',
            desc: 'Book your first expert session, or get matched with the perfect expert.',
          })}
          <div style="text-align:center;margin-top:12px">
            <button class="btn btn-primary" data-action="find-expert-wizard">
              <i class="fas fa-magic"></i> Find Me an Expert</button>
          </div>
        </section>
      ` : ''}
    `,
  });
}

function renderUserConsultationCard(c) {
  const tz = currentUser?.timezone || 'UTC';
  const canCancel     = ['pending_expert_confirmation','confirmed','scheduled'].includes(c.status);
  const canReschedule = ['confirmed','scheduled'].includes(c.status) &&
                        (c.reschedule_count || 0) < CONFIG.MAX_RESCHEDULES;
  const canJoin       = ['confirmed','in_grace','in_session'].includes(c.status);
  const canReview     = c.status === 'completed' && !c.reviewed;
  const canDispute    = ['completed','awaiting_completion'].includes(c.status) && !c.disputed;
  const canTip        = c.status === 'completed';

  return `
    <div class="consultation-card">
      <header class="consultation-card-header">
        <div>
          <h4 class="consultation-card-title">${esc(c.title)}</h4>
          <p class="consultation-card-meta">
            ${UserUI.statusPill(c.status)}
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
            <strong>${UserHelpers.fmtInTz(c.scheduled_at, tz)}</strong>
            <span class="consultation-card-countdown">${UserHelpers.timeUntil(c.scheduled_at)}</span>
          </div>
        ` : ''}

        <div class="consultation-card-duration">
          <i class="fas fa-clock"></i> ${c.duration_minutes || 30} min · ${esc(c.consultation_type || 'video')}
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
        ${canJoin ? `<button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}">
          <i class="fas fa-video"></i> Join</button>` : ''}
        <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
          <i class="fas fa-comments"></i> Chat</button>
        ${canReschedule ? `<button class="btn btn-secondary btn-sm" data-action="reschedule-consultation" data-id="${c.id}">
          <i class="fas fa-calendar-alt"></i> Reschedule</button>` : ''}
        ${canCancel ? `<button class="btn btn-danger btn-sm" data-action="cancel-consultation" data-id="${c.id}">
          <i class="fas fa-times"></i> Cancel</button>` : ''}
        ${canReview ? `<button class="btn btn-success btn-sm" data-action="review-consultation"
          data-id="${c.id}" data-expert="${c.expert_id}">
          <i class="fas fa-star"></i> Rate</button>` : ''}
        ${canDispute ? `<button class="btn btn-warning btn-sm" data-action="open-dispute" data-id="${c.id}">
          <i class="fas fa-gavel"></i> File Dispute</button>` : ''}
        ${canTip ? `
          <button class="btn btn-primary btn-sm" data-action="tip-expert" data-id="${c.id}">
            <i class="fas fa-hand-holding-usd"></i> Tip</button>
          <button class="btn btn-secondary btn-sm" data-action="book-expert"
                  data-id="${c.expert_id}" data-name="${esc(c.expert_name || '')}">
            <i class="fas fa-redo"></i> Book Again</button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
          <i class="fas fa-eye"></i> Details</button>
      </footer>
    </div>
  `;
}

window.ExpertHubUser.registerModule('consultations', renderUserConsultations);

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */
window.ExpertHubUser.registerAction('consultation-detail', (id) => {
  const c = S.consultations.find(x => String(x.id) === String(id));
  if (!c) return showToast('Consultation not found', 'error');
  openModal({
    title: c.title || 'Consultation',
    body: `
      <p><strong>Status:</strong> ${UserUI.statusPill(c.status)}</p>
      <p><strong>Expert:</strong> ${esc(c.expert_name || 'Unassigned')}</p>
      <p><strong>Type:</strong> ${esc(c.consultation_type || '')}</p>
      <p><strong>Duration:</strong> ${c.duration_minutes || 30} min</p>
      <p><strong>Scheduled:</strong> ${c.scheduled_at ? UserHelpers.fmtInTz(c.scheduled_at, currentUser?.timezone) : '—'}</p>
      <p><strong>Price:</strong> ${fmtCur(c.price || 0)}</p>
      <p><strong>Payment:</strong> ${esc(c.payment_status || '')}</p>
      <p><strong>Description:</strong></p>
      <p>${esc(c.description || '—')}</p>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
});

window.ExpertHubUser.registerAction('cancel-consultation', async (id) => {
  if (!await confirmDialog('Cancel this consultation?')) return;
  try {
    await apiCall(`/api/common/consultations/${id}/status`, 'PUT', { status: 'cancelled' });
    await reloadConsultations();
    rerenderRoleContent();
    showToast('Consultation cancelled', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('reschedule-consultation', (id) => {
  openModal({
    title: 'Reschedule Consultation',
    body: `
      <label class="form-group">
        <span class="form-label">New Date &amp; Time</span>
        <input id="rsWhen" type="datetime-local" class="form-input" />
      </label>
      <label class="form-group">
        <span class="form-label">Reason (optional)</span>
        <textarea id="rsReason" class="form-textarea" rows="2"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rsSave" class="btn btn-primary">Confirm</button>
    `,
  });
  $('#rsSave').onclick = async () => {
    const when = $('#rsWhen').value;
    if (!when) return showToast('Pick a new date', 'error');
    try {
      await apiCall(`/api/common/consultations/${id}/reschedule`, 'PUT', {
        scheduled_at: when,
        reason: $('#rsReason').value || null,
      });
      closeModal();
      await reloadConsultations();
      rerenderRoleContent();
      showToast('Reschedule request sent', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('review-consultation', (id, el) => {
  const expertId = el?.dataset?.expert;
  openModal({
    title: 'Rate Expert',
    body: `
      <label class="form-group">
        <span class="form-label">Rating</span>
        <select id="rvRating" class="form-select">
          ${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Comment</span>
        <textarea id="rvComment" class="form-textarea" rows="4"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rvSave" class="btn btn-primary">Submit</button>
    `,
  });
  $('#rvSave').onclick = async () => {
    try {
      await apiCall('/api/user/reviews', 'POST', {
        consultation_id: Number(id),
        expert_id: Number(expertId),
        rating: Number($('#rvRating').value),
        comment: $('#rvComment').value,
      });
      closeModal();
      await reloadConsultations();
      rerenderRoleContent();
      showToast('Review submitted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('open-dispute', (id) => {
  openModal({
    title: 'File a Dispute',
    body: `
      <label class="form-group"><span class="form-label">Reason</span>
        <select id="dpReason" class="form-select">
          <option value="no_show">Expert did not show up</option>
          <option value="poor_quality">Poor quality session</option>
          <option value="incomplete">Session ended early</option>
          <option value="billing">Billing issue</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label class="form-group"><span class="form-label">Describe the issue</span>
        <textarea id="dpDesc" class="form-textarea" rows="4"></textarea></label>
      <label class="form-group"><span class="form-label">Evidence (optional, upload after submit)</span>
        <input type="file" id="dpFile" class="form-input" /></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="dpSave" class="btn btn-primary">Submit Dispute</button>
    `,
  });
  $('#dpSave').onclick = async () => {
    const desc = $('#dpDesc').value.trim();
    if (!desc) return showToast('Please describe the issue', 'error');
    try {
      await apiCall('/api/user/claims', 'POST', {
        consultation_id: Number(id),
        claim_title: $('#dpReason').value.replace(/_/g, ' '),
        claim_description: desc,
      });
      closeModal();
      showToast('Dispute filed. Our team will review within 3 business days.', 'success', 6000);
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('tip-expert', (id) => {
  openModal({
    title: 'Tip Expert',
    body: `
      <label class="form-group">
        <span class="form-label">Amount (USD)</span>
        <input id="tpAmount" type="number" class="form-input" min="1" step="1" value="5" />
      </label>
      <label class="form-group">
        <span class="form-label">Message (optional)</span>
        <textarea id="tpMsg" class="form-textarea" rows="2"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="tpSave" class="btn btn-primary">Send Tip</button>
    `,
  });
  $('#tpSave').onclick = async () => {
    try {
      await apiCall(`/api/common/consultations/${id}/tip`, 'POST', {
        amount: Number($('#tpAmount').value || 0),
        message: $('#tpMsg').value || null,
      });
      closeModal();
      showToast('Tip sent — thank you!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('start-session', (id) => {
  location.hash = `#/consultation/${id}`;
});
