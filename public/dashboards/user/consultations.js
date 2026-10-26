/* ============================================================
   ExpertHub 2.0 — dashboards/user/consultations.js
   Consultation lifecycle with exclusive categorization,
   server-verified eligibility, pagination, and history.
   ============================================================ */

const CONSULT_PAGE_SIZE = 10;

function _categorizeConsultations(list) {
  const upcoming = [], pending = [], past = [];
  for (const c of list) {
    const s = c.status;
    if (['completed','cancelled','no_show','expired','refunded','disputed'].includes(s)) {
      past.push(c);
    } else if (['pending_payment','pending_expert_confirmation'].includes(s)) {
      pending.push(c);
    } else if (c.scheduled_at && new Date(c.scheduled_at) > new Date() &&
               ['confirmed','scheduled','in_grace'].includes(s)) {
      upcoming.push(c);
    } else if (s === 'in_session') {
      upcoming.push(c);
    } else {
      pending.push(c); // any other state -> treat as pending to avoid drop
    }
  }
  upcoming.sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  past.sort((a,b) => new Date(b.scheduled_at || b.updated_at || 0) - new Date(a.scheduled_at || a.updated_at || 0));
  return { upcoming, pending, past };
}

function renderUserConsultations() {
  const mine = (S.consultations || []).filter(c => c.user_id === currentUser?.id);
  const { upcoming, pending, past } = _categorizeConsultations(mine);
  const totalCredits = (S.userPackages || []).reduce((s, p) => s + Number(p.sessions_remaining || 0), 0);
  const pastPage = Number(UserFilters.get('consultations', 'pastPage', 1)) || 1;
  const pastTotal = past.length;
  const pastPaged = past.slice((pastPage - 1) * CONSULT_PAGE_SIZE, pastPage * CONSULT_PAGE_SIZE);

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
          <h3 class="panel-title">Upcoming Sessions (${upcoming.length})</h3>
          ${upcoming.map(c => renderUserConsultationCard(c)).join('')}
        </section>
      ` : ''}

      ${pending.length ? `
        <section class="panel">
          <h3 class="panel-title">Awaiting Confirmation (${pending.length})</h3>
          ${pending.map(c => renderUserConsultationCard(c)).join('')}
        </section>
      ` : ''}

      ${past.length ? `
        <section class="panel">
          <h3 class="panel-title">Past Sessions (${pastTotal})</h3>
          ${pastPaged.map(c => renderUserConsultationCard(c)).join('')}
          ${UserUI.pagination({
            page: pastPage, pageSize: CONSULT_PAGE_SIZE, total: pastTotal,
            action: 'consultation-history-page', key: 'past',
          })}
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
  const isJoinable = window.UserHelpers.canJoinSessionNow(c);
  const cancelable = window.UserHelpers.canCancelSession(c);
  const reschedulable = window.UserHelpers.canRescheduleSession(c);
  const canReview  = c.status === 'completed' && !c.reviewed;
  const canDispute = ['completed','awaiting_completion'].includes(c.status) && !c.disputed;
  const canTip     = c.status === 'completed';

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
          ${c.payment_status === 'pending' ? '<div class="consultation-card-escrow">Payment pending</div>' : ''}
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
          ${c.reschedule_count > 0 ? ` · <span class="form-hint">${c.reschedule_count} reschedule${c.reschedule_count === 1 ? '' : 's'}</span>` : ''}
        </div>

        ${c.description ? `<p class="consultation-card-desc">${esc(c.description.slice(0, 200))}</p>` : ''}

        ${c.payment_status === 'held' ? `
          <div class="consultation-card-escrow-info">
            <i class="fas fa-shield-alt"></i>
            Payment held in escrow. Released after session completion.
          </div>
        ` : ''}

        ${c.cancellation_policy_hours ? `
          <p class="form-hint" style="margin-top:6px">
            <i class="fas fa-info-circle"></i>
            Free cancellation up to ${c.cancellation_policy_hours}h before session start.
          </p>
        ` : ''}
      </div>

      <footer class="consultation-card-actions">
        ${['confirmed','in_grace','in_session'].includes(c.status) ? `
          <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}"
                  ${isJoinable ? '' : 'disabled aria-disabled="true" title="Session not open yet"'}>
            <i class="fas fa-video"></i> Join</button>
        ` : ''}
        <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
          <i class="fas fa-comments"></i> Chat</button>
        ${reschedulable ? `
          <button class="btn btn-secondary btn-sm" data-action="reschedule-consultation" data-id="${c.id}">
            <i class="fas fa-calendar-alt"></i> Reschedule</button>
        ` : ''}
        ${cancelable ? `
          <button class="btn btn-danger btn-sm" data-action="cancel-consultation" data-id="${c.id}">
            <i class="fas fa-times"></i> Cancel</button>
        ` : ''}
        ${canReview ? `
          <button class="btn btn-success btn-sm" data-action="review-consultation"
                  data-id="${c.id}" data-expert="${c.expert_id}">
            <i class="fas fa-star"></i> Rate</button>
        ` : ''}
        ${canDispute ? `
          <button class="btn btn-warning btn-sm" data-action="open-dispute" data-id="${c.id}">
            <i class="fas fa-gavel"></i> File Dispute</button>
        ` : ''}
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

/* ---------------- Actions ---------------- */
window.ExpertHubUser.registerAction('consultation-history-page', (id, el) => {
  const p = Number(el?.dataset?.page || 1);
  UserFilters.set('consultations', 'pastPage', p);
  rerenderRoleContent();
});

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
      ${c.reschedule_count ? `<p><strong>Reschedules:</strong> ${c.reschedule_count} / ${CONFIG.MAX_RESCHEDULES}</p>` : ''}
      <p><strong>Description:</strong></p>
      <p>${esc(c.description || '—')}</p>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
});

window.ExpertHubUser.registerAction('cancel-consultation', async (id) => {
  // Verify eligibility server-side before asking the user
  try {
    const el = await apiCall(`/api/user/consultations/${id}/cancel-eligibility`).catch(() => null);
    const eligible = el?.eligible !== false;
    const fee = el?.cancellation_fee || 0;
    const msg = eligible
      ? (fee > 0
        ? `A cancellation fee of ${fmtCur(fee)} may apply. Continue?`
        : 'Cancel this consultation?')
      : (el?.reason || 'Not eligible for cancellation.');
    if (!eligible) return showToast(msg, 'warning');
    if (!await confirmDialog(msg)) return;
    const r = await apiCall(`/api/common/consultations/${id}/status`, 'PUT', { status: 'cancelled' });
    await reloadConsultations();
    await refreshUserSnapshot();
    rerenderRoleContent();
    showToast(r?.refund_status ? `Cancelled — ${r.refund_status}` : 'Consultation cancelled', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('reschedule-consultation', async (id) => {
  try {
    const el = await apiCall(`/api/user/consultations/${id}/reschedule-eligibility`).catch(() => null);
    if (el?.eligible === false) return showToast(el.reason || 'Not eligible for reschedule', 'warning');
  } catch {}

  openModal({
    title: 'Reschedule Consultation',
    body: `
      <label class="form-group">
        <span class="form-label">New Date &amp; Time</span>
        <input id="rsWhen" type="datetime-local" class="form-input" min="${new Date().toISOString().slice(0,16)}" required />
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
        scheduled_at: new Date(when).toISOString(),
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
        <textarea id="dpDesc" class="form-textarea" rows="4" required></textarea></label>
      <label class="form-group"><span class="form-label">Evidence (optional)</span>
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
      const payload = {
        consultation_id: Number(id),
        claim_title: $('#dpReason').value.replace(/_/g, ' '),
        claim_description: desc,
      };
      const file = $('#dpFile').files[0];
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k,v]) => fd.append(k, v));
        fd.append('evidence', file);
        await apiCall('/api/user/claims', 'POST', fd, true);
      } else {
        await apiCall('/api/user/claims', 'POST', payload);
      }
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
        <input id="tpAmount" type="number" class="form-input" min="1" step="1" value="5" required />
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
    const amt = Number($('#tpAmount').value || 0);
    if (amt <= 0) return showToast('Enter a valid amount', 'error');
    try {
      await apiCall(`/api/common/consultations/${id}/tip`, 'POST', {
        amount: amt, message: $('#tpMsg').value || null,
      });
      closeModal();
      await refreshUserSnapshot();
      rerenderRoleContent();
      showToast('Tip sent — thank you!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('start-session', async (id) => {
  // Server grants join URL only when eligible.
  try {
    const d = await apiCall(`/api/user/consultations/${id}/join`).catch(() => null);
    if (d?.join_url) return void (location.hash = d.join_url.startsWith('#') ? d.join_url : `#/consultation/${id}`);
    location.hash = `#/consultation/${id}`;
  } catch (e) { showToast(e.message, 'error'); }
});