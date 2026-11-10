/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/consultations.js */
/* Consultation lifecycle: list + filter + search, reschedule */
/* with slot picker, cancel with stale-check, receipt, payment */
/* completion, follow-up resources, richer detail. */
/* ============================================================ */

const CONSULT_PAGE_SIZE = 10;
const CONSULT_FILTER_KEY = 'consultations';

function _consultFilters() {
  return {
    q:      UserFilters.get(CONSULT_FILTER_KEY, 'q', '') || '',
    status: UserFilters.get(CONSULT_FILTER_KEY, 'status', 'all') || 'all',
    sort:   UserFilters.get(CONSULT_FILTER_KEY, 'sort', 'scheduled_asc') || 'scheduled_asc',
    pastPage: Number(UserFilters.get(CONSULT_FILTER_KEY, 'pastPage', 1)) || 1,
  };
}

function _setConsultFilter(k, v) {
  UserFilters.set(CONSULT_FILTER_KEY, k, v);
  if (k !== 'pastPage') UserFilters.set(CONSULT_FILTER_KEY, 'pastPage', 1);
}

/* Categorize consultations using the guidance status taxonomy.
   Both legacy and guidance-named statuses are handled. */
function _categorizeConsultations(list) {
  const upcoming = [], pending = [], past = [];
  const upcomingStatuses = ['confirmed', 'scheduled', 'in_grace', 'in_session', 'in_progress'];
  const pendingStatuses  = ['requested', 'pending_payment', 'pending_expert_confirmation',
                            'awaiting_completion', 'reschedule_requested'];
  const pastStatuses     = ['completed', 'cancelled', 'no_show', 'expired', 'refunded', 'disputed'];

  for (const c of list) {
    const s = c.status;
    if (pastStatuses.includes(s)) past.push(c);
    else if (pendingStatuses.includes(s)) pending.push(c);
    else if (upcomingStatuses.includes(s)) {
      if (c.scheduled_at && new Date(c.scheduled_at) < new Date() && s !== 'in_session') {
        // Past but not marked complete yet — keep visible as upcoming-ish
        upcoming.push(c);
      } else upcoming.push(c);
    } else pending.push(c);
  }
  upcoming.sort((a,b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0));
  past.sort((a,b) => new Date(b.scheduled_at || b.updated_at || 0) - new Date(a.scheduled_at || a.updated_at || 0));
  return { upcoming, pending, past };
}

function _matchConsultFilter(c, q, statusFilter, category) {
  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'upcoming' && category !== 'upcoming') return false;
    if (statusFilter === 'pending'  && category !== 'pending')  return false;
    if (statusFilter === 'past'     && category !== 'past')     return false;
    if (statusFilter === 'completed' && !(category === 'past' && c.status === 'completed')) return false;
    if (statusFilter === 'cancelled' && !(category === 'past' && c.status === 'cancelled')) return false;
  }
  if (q) {
    const s = q.toLowerCase();
    return (c.title || '').toLowerCase().includes(s) ||
           (c.expert_name || '').toLowerCase().includes(s) ||
           (c.booking_reference || '').toLowerCase().includes(s);
  }
  return true;
}

async function _refreshSingleConsultation(id) {
  try {
    const d = await apiCall(`/api/user/consultations/${id}`).catch(() => null);
    if (d?.consultation) {
      const idx = (S.consultations || []).findIndex(x => String(x.id) === String(id));
      if (idx >= 0) S.consultations[idx] = { ...S.consultations[idx], ...d.consultation };
      else S.consultations = [...(S.consultations || []), d.consultation];
    }
  } catch {}
}

/* ============================================================ */
/* List renderer */
/* ============================================================ */

function renderUserConsultations() {
  const f = _consultFilters();
  const mine = (S.consultations || []).filter(c => c.user_id === currentUser?.id);
  const { upcoming, pending, past } = _categorizeConsultations(mine);

  const filterUpcoming = upcoming.filter(c => _matchConsultFilter(c, f.q, f.status, 'upcoming'));
  const filterPending  = pending.filter(c => _matchConsultFilter(c, f.q, f.status, 'pending'));
  const filterPast     = past.filter(c => _matchConsultFilter(c, f.q, f.status, 'past'));

  const pastTotal = filterPast.length;
  const pastPage  = Math.min(f.pastPage, Math.max(1, Math.ceil(pastTotal / CONSULT_PAGE_SIZE)));
  const pastPaged = filterPast.slice((pastPage - 1) * CONSULT_PAGE_SIZE, pastPage * CONSULT_PAGE_SIZE);

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

      <section class="panel">
        <div class="expert-filters">
          <input type="search" id="consult-search" class="form-input"
                 placeholder="Search by title, expert, or reference"
                 value="${esc(f.q)}" style="max-width:260px" aria-label="Search consultations" />
          <select id="consult-status" class="form-select" style="max-width:170px" aria-label="Status">
            <option value="all"       ${f.status === 'all'       ? 'selected' : ''}>All statuses</option>
            <option value="upcoming"  ${f.status === 'upcoming'  ? 'selected' : ''}>Upcoming</option>
            <option value="pending"   ${f.status === 'pending'   ? 'selected' : ''}>Pending</option>
            <option value="completed" ${f.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${f.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            <option value="past"      ${f.status === 'past'      ? 'selected' : ''}>All past</option>
          </select>
          <select id="consult-sort" class="form-select" style="max-width:170px" aria-label="Sort">
            <option value="scheduled_asc"  ${f.sort === 'scheduled_asc'  ? 'selected' : ''}>Soonest first</option>
            <option value="scheduled_desc" ${f.sort === 'scheduled_desc' ? 'selected' : ''}>Latest first</option>
          </select>
          <button class="btn btn-ghost btn-sm" data-action="consultations-clear-filters">
            <i class="fas fa-eraser"></i> Clear</button>
        </div>
      </section>

      ${filterUpcoming.length ? `
        <section class="panel">
          <h3 class="panel-title">Upcoming Sessions (${filterUpcoming.length})</h3>
          ${filterUpcoming.map(c => renderUserConsultationCard(c)).join('')}
        </section>
      ` : ''}

      ${filterPending.length ? `
        <section class="panel">
          <h3 class="panel-title">Awaiting Confirmation or Payment (${filterPending.length})</h3>
          ${filterPending.map(c => renderUserConsultationCard(c)).join('')}
        </section>
      ` : ''}

      ${filterPast.length ? `
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
      ` : (!filterUpcoming.length && !filterPending.length && !filterPast.length) ? `
        <section class="panel">
          ${UserUI.empty({
            icon: 'fa-filter',
            title: 'No consultations match your filters',
            desc: 'Try clearing the search or status filter.',
          })}
        </section>
      ` : ''}
    `,
  });
}

/* ============================================================ */
/* Card renderer — displays booking + payment status separately */
/* ============================================================ */

function renderUserConsultationCard(c) {
  const tz = currentUser?.timezone || 'UTC';
  const isJoinable    = window.UserHelpers.canJoinSessionNow(c);
  const cancelable    = window.UserHelpers.canCancelSession(c);
  const reschedulable = window.UserHelpers.canRescheduleSession(c);
  const canReview     = c.status === 'completed' && !c.reviewed;
  const canDispute    = ['completed','awaiting_completion'].includes(c.status) && !c.disputed;
  const canTip        = c.status === 'completed';
  const needsPayment  = c.status === 'pending_payment' || (c.payment_status === 'pending' && c.status !== 'cancelled');
  const isPaid        = ['paid','completed','held','settled'].includes(c.payment_status);

  return `
    <div class="consultation-card">
      <header class="consultation-card-header">
        <div>
          <h4 class="consultation-card-title">${esc(c.title)}</h4>
          <p class="consultation-card-meta">
            ${UserUI.statusPill(c.status)}
            ${c.payment_status ? `<span class="chip chip-${needsPayment ? 'yellow' : isPaid ? 'green' : 'neutral'}">
              ${esc(c.payment_status.replace(/_/g,' '))}</span>` : ''}
            ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
            ${c.is_group ? '<span class="chip chip-purple">Group</span>' : ''}
          </p>
          ${c.booking_reference ? `<p class="form-hint">Ref: <code class="code">${esc(c.booking_reference)}</code></p>` : ''}
        </div>
        <div class="consultation-card-price">
          ${fmtCur(c.price || 0)} ${c.currency ? esc(c.currency) : ''}
          ${c.payment_status === 'held' ? '<div class="consultation-card-escrow">In escrow</div>' : ''}
          ${needsPayment ? '<div class="consultation-card-escrow">Payment pending</div>' : ''}
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
            <span class="form-hint">(${esc(tz)})</span>
          </div>
        ` : ''}

        <div class="consultation-card-duration">
          <i class="fas fa-clock"></i> ${c.duration_minutes || 30} min · ${esc(c.consultation_type || 'video')}
          ${c.reschedule_count > 0
            ? ` · <span class="form-hint">${c.reschedule_count} reschedule${c.reschedule_count === 1 ? '' : 's'}</span>`
            : ''}
        </div>

        ${c.description ? `<p class="consultation-card-desc">${esc(c.description.slice(0, 200))}</p>` : ''}

        ${c.instructions ? `
          <div class="alert alert-info" style="margin-top:8px">
            <i class="fas fa-info-circle"></i> <strong>Instructions:</strong> ${esc(c.instructions)}
          </div>
        ` : ''}

        ${(c.follow_up_resources || []).length ? `
          <div class="consultation-follow-ups" style="margin-top:8px">
            <p class="form-hint"><i class="fas fa-paperclip"></i> Follow-up resources:</p>
            ${(c.follow_up_resources || []).map(r => `
              <button class="btn btn-ghost btn-xs" data-action="download-follow-up" data-id="${r.id}">
                <i class="fas fa-download"></i> ${esc(r.title || 'Download')}</button>
            `).join(' ')}
          </div>
        ` : ''}

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
        ${needsPayment ? `
          <button class="btn btn-primary btn-sm" data-action="complete-consultation-payment" data-id="${c.id}">
            <i class="fas fa-credit-card"></i> Complete Payment</button>
        ` : ''}
        ${['confirmed','in_grace','in_session','in_progress'].includes(c.status) ? `
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
        ${isPaid ? `
          <button class="btn btn-ghost btn-sm" data-action="view-consultation-receipt" data-id="${c.id}"
                  aria-label="Download receipt">
            <i class="fas fa-receipt"></i></button>
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

/* ---------------- Filter bindings ---------------- */

window.ExpertHubUser.registerModule('consultations', renderUserConsultations, {
  init() {
    const rerender = debounce(() => rerenderRoleContent(), 250);
    const $set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    $set('consult-search', el => el.oninput  = () => { _setConsultFilter('q', el.value); rerender(); });
    $set('consult-status', el => el.onchange = () => { _setConsultFilter('status', el.value); rerenderRoleContent(); });
    $set('consult-sort',   el => el.onchange = () => { _setConsultFilter('sort', el.value); rerenderRoleContent(); });
  },
});

window.ExpertHubUser.registerAction('consultations-clear-filters', () => {
  UserFilters.clear(CONSULT_FILTER_KEY);
  rerenderRoleContent();
});

/* ============================================================ */
/* Pagination */
/* ============================================================ */

window.ExpertHubUser.registerAction('consultation-history-page', (id, el) => {
  _setConsultFilter('pastPage', Number(el?.dataset?.page || 1));
  rerenderRoleContent();
});

/* ============================================================ */
/* Detail — stale-checked, shows booking_ref, follow-ups, receipt */
/* ============================================================ */

window.ExpertHubUser.registerAction('consultation-detail', async (id) => {
  await _refreshSingleConsultation(id);
  const c = (S.consultations || []).find(x => String(x.id) === String(id));
  if (!c) return showToast('Consultation not found', 'error');

  const isPaid = ['paid','completed','held','settled'].includes(c.payment_status);

  openModal({
    title: c.title || 'Consultation',
    className: 'modal-lg',
    body: `
      <p><strong>Booking Ref:</strong> <code class="code">${esc(c.booking_reference || '—')}</code></p>
      <p><strong>Status:</strong> ${UserUI.statusPill(c.status)}
        ${c.payment_status ? ` · <strong>Payment:</strong> ${UserUI.statusPill(c.payment_status)}` : ''}</p>
      <p><strong>Expert:</strong> ${esc(c.expert_name || 'Unassigned')}</p>
      <p><strong>Type:</strong> ${esc(c.consultation_type || '')} · <strong>Duration:</strong> ${c.duration_minutes || 30} min</p>
      <p><strong>Scheduled:</strong>
        ${c.scheduled_at
          ? `${UserHelpers.fmtInTz(c.scheduled_at, currentUser?.timezone)} (${esc(currentUser?.timezone || 'UTC')})`
          : '—'}</p>
      <p><strong>Price:</strong> ${fmtCur(c.price || 0)} ${esc(c.currency || 'USD')}</p>
      ${c.reschedule_count ? `<p><strong>Reschedules:</strong> ${c.reschedule_count} / ${CONFIG.MAX_RESCHEDULES}</p>` : ''}
      ${c.instructions ? `<div class="alert alert-info"><strong>Instructions:</strong> ${esc(c.instructions)}</div>` : ''}
      <p style="margin-top:12px"><strong>Description:</strong></p>
      <p>${esc(c.description || '—')}</p>

      ${(c.follow_up_resources || []).length ? `
        <h4 style="margin-top:16px">Follow-up Resources</h4>
        <ul class="list-stack">
          ${(c.follow_up_resources || []).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.title || 'Resource')}</span>
                ${r.shared_at ? `<span class="list-row-sub">${fmtDate(r.shared_at)}</span>` : ''}
              </div>
              <button class="btn btn-secondary btn-xs" data-action="download-follow-up" data-id="${r.id}">
                <i class="fas fa-download"></i></button>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      ${isPaid ? `<button class="btn btn-secondary" data-action="view-consultation-receipt" data-id="${c.id}">
        <i class="fas fa-receipt"></i> Receipt</button>` : ''}
      ${c.status === 'pending_payment' ? `<button class="btn btn-primary"
        data-action="complete-consultation-payment" data-id="${c.id}"
        onclick="closeModal()">
        <i class="fas fa-credit-card"></i> Complete Payment</button>` : ''}
    `,
  });
});

/* ============================================================ */
/* Cancel — stale-check + policy display */
/* ============================================================ */

window.ExpertHubUser.registerAction('cancel-consultation', async (id) => {
  // Refresh first — status may have moved server-side
  await _refreshSingleConsultation(id);
  const c = (S.consultations || []).find(x => String(x.id) === String(id));
  if (!c) return showToast('Consultation not found', 'error');

  if (!window.UserHelpers.canCancelSession(c)) {
    return showToast('This consultation can no longer be cancelled', 'warning');
  }

  try {
    const el = await apiCall(`/api/user/consultations/${id}/cancel-eligibility`).catch(() => null);
    const eligible = el?.eligible !== false;
    const fee = el?.cancellation_fee || 0;
    if (!eligible) {
      return showToast(el?.reason || 'Not eligible for cancellation', 'warning');
    }
    const msg = fee > 0
      ? `A cancellation fee of ${fmtCur(fee)} will be charged. Continue?`
      : 'Cancel this consultation?';
    if (!await confirmDialog(msg)) return;

    const r = await apiCall(`/api/common/consultations/${id}/status`, 'PUT', { status: 'cancelled' });
    await reloadConsultations?.();
    await refreshUserSnapshot?.();
    rerenderRoleContent();
    showToast(r?.refund_status ? `Cancelled — ${r.refund_status}` : 'Consultation cancelled', 'success');
  } catch (e) {
    const msg = String(e?.message || '');
    if (/status|already/i.test(msg)) {
      await _refreshSingleConsultation(id);
      rerenderRoleContent();
      showToast('This consultation has already changed state — view updated status', 'warning');
    } else {
      showToast(msg, 'error');
    }
  }
});

/* ============================================================ */
/* Reschedule — slot picker, idempotency, conflict handling */
/* ============================================================ */

window.ExpertHubUser.registerAction('reschedule-consultation', async (id) => {
  await _refreshSingleConsultation(id);
  const c = (S.consultations || []).find(x => String(x.id) === String(id));
  if (!c) return showToast('Consultation not found', 'error');

  if (!window.UserHelpers.canRescheduleSession(c)) {
    return showToast('This consultation can no longer be rescheduled', 'warning');
  }

  try {
    const el = await apiCall(`/api/user/consultations/${id}/reschedule-eligibility`).catch(() => null);
    if (el?.eligible === false) return showToast(el.reason || 'Not eligible for reschedule', 'warning');
  } catch {}

  const tz = currentUser?.timezone || 'UTC';
  let selectedSlotId = null;
  let selectedSlotStart = null;

  openModal({
    title: 'Reschedule Consultation',
    body: `
      <div class="alert alert-info">
        <i class="fas fa-calendar"></i>
        Current: ${c.scheduled_at ? UserHelpers.fmtInTz(c.scheduled_at, tz) : '—'} (${esc(tz)})
      </div>
      <label class="form-group">
        <span class="form-label">New date *</span>
        <input id="rsDate" type="date" class="form-input"
               min="${new Date(Date.now() + 3600000).toISOString().slice(0,10)}" required />
        <p class="form-hint">All times shown in <strong>${esc(tz)}</strong>.</p>
      </label>
      <div class="form-group">
        <span class="form-label">Available slots *</span>
        <div id="rsSlots" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px">
          <p class="form-hint">Select a date first.</p>
        </div>
      </div>
      <label class="form-group">
        <span class="form-label">Reason (optional)</span>
        <textarea id="rsReason" class="form-textarea" rows="2"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rsSave" class="btn btn-primary" disabled>Confirm Reschedule</button>
    `,
  });

  const updateSubmit = () => {
    const btn = document.getElementById('rsSave');
    if (btn) btn.disabled = !selectedSlotStart;
  };

  const renderSlots = async (dateISO) => {
    const host = document.getElementById('rsSlots');
    if (!host) return;
    if (!dateISO) { host.innerHTML = '<p class="form-hint">Select a date.</p>'; return; }
    host.innerHTML = '<p class="form-hint"><i class="fas fa-circle-notch fa-spin"></i> Loading…</p>';
    const data = await _fetchAvailability(c.expert_id, dateISO);
    const slots = data?.slots || [];
    if (!slots.length) {
      host.innerHTML = '<p class="form-hint">No slots available on this date.</p>';
      return;
    }
    host.innerHTML = slots.map(s => `
      <button type="button" class="btn btn-secondary btn-sm" data-slot-id="${esc(s.id || s.start_at)}"
              data-slot-start="${esc(s.start_at)}">
        ${_fmtTimeOnly(s.start_at, tz)}
      </button>
    `).join('');
    host.querySelectorAll('[data-slot-id]').forEach(btn => {
      btn.onclick = () => {
        host.querySelectorAll('[data-slot-id]').forEach(b => {
          b.classList.remove('btn-primary'); b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
        selectedSlotId = btn.dataset.slotId;
        selectedSlotStart = btn.dataset.slotStart;
        updateSubmit();
      };
    });
  };

  const dateEl = document.getElementById('rsDate');
  if (dateEl) dateEl.onchange = () => {
    selectedSlotId = null; selectedSlotStart = null;
    updateSubmit();
    renderSlots(dateEl.value);
  };

  const submit = document.getElementById('rsSave');
  if (submit) submit.onclick = async () => {
    if (!selectedSlotStart) return showToast('Select a new time slot', 'error');
    submit.disabled = true;
    submit.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Rescheduling…';
    try {
      const idempotencyKey = `rs_${id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      await apiCall(`/api/common/consultations/${id}/reschedule`, 'PUT', {
        scheduled_at: selectedSlotStart,
        slot_id:      selectedSlotId === selectedSlotStart ? undefined : selectedSlotId,
        reason:       document.getElementById('rsReason').value || null,
        idempotency_key: idempotencyKey,
      });
      closeModal();
      await reloadConsultations?.();
      rerenderRoleContent();
      showToast('Reschedule request sent', 'success');
    } catch (e) {
      const msg = String(e?.message || '');
      if (/slot|conflict|taken|no longer available/i.test(msg)) {
        showToast('That slot was just taken — please pick another', 'warning');
        selectedSlotId = null; selectedSlotStart = null;
        updateSubmit();
        const d = document.getElementById('rsDate');
        if (d?.value) renderSlots(d.value);
      } else {
        showToast(msg || 'Reschedule failed', 'error');
      }
      submit.disabled = false;
      submit.textContent = 'Confirm Reschedule';
    }
  };
});

/* ============================================================ */
/* Review / Dispute / Tip (preserved) */
/* ============================================================ */

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
        expert_id:       Number(expertId),
        rating:          Number($('#rvRating').value),
        comment:         $('#rvComment').value,
      });
      closeModal();
      await _refreshSingleConsultation(id);
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
        <input type="file" id="dpFile" class="form-input" accept=".pdf,.png,.jpg,.jpeg,.txt" /></label>
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
      const idempotencyKey = `tip_${id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      await apiCall(`/api/common/consultations/${id}/tip`, 'POST', {
        amount: amt, message: $('#tpMsg').value || null, idempotency_key: idempotencyKey,
      });
      closeModal();
      await refreshUserSnapshot?.();
      rerenderRoleContent();
      showToast('Tip sent — thank you!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});

/* ============================================================ */
/* Join — pre-flight device check + server-authoritative access */
/* ============================================================ */

window.ExpertHubUser.registerAction('start-session', async (id) => {
  const c = (S.consultations || []).find(x => String(x.id) === String(id));

  // Pre-flight device check for video sessions
  if (c?.consultation_type === 'video' && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      const ok = await confirmDialog(
        'Camera/microphone access was denied. You may not be able to fully participate. Continue?'
      );
      if (!ok) return;
    }
  }

  try {
    showLoading(true);
    const d = await apiCall(`/api/user/consultations/${id}/join`).catch(err => {
      const msg = String(err?.message || '');
      if (/not ready|not open|early/i.test(msg)) {
        showToast('Session not open yet — try again at the scheduled time', 'warning', 6000);
      } else if (/already ended|expired/i.test(msg)) {
        showToast('This session has already ended', 'warning');
      } else if (/unauthori[sz]ed|forbidden|403/i.test(msg)) {
        showToast('You are not authorized to join this session', 'error');
      } else {
        showToast(msg || 'Could not join session', 'error');
      }
      return null;
    });
    showLoading(false);
    if (!d) return;

    if (d.join_url) {
      if (d.join_url.startsWith('#')) location.hash = d.join_url;
      else window.location.href = d.join_url;
    } else {
      location.hash = `#/consultation/${id}`;
    }
  } catch (e) {
    showLoading(false);
    showToast(e.message, 'error');
  }
});

/* ============================================================ */
/* Receipt / payment-completion / follow-up download */
/* ============================================================ */

window.ExpertHubUser.registerAction('view-consultation-receipt', async (id) => {
  try {
    const d = await apiCall(`/api/user/consultations/${id}/receipt`).catch(() => null);
    if (d?.url) window.open(d.url, '_blank', 'noopener,noreferrer');
    else showToast('Receipt not available yet', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('complete-consultation-payment', async (id) => {
  try {
    showLoading(true);
    await _refreshSingleConsultation(id);
    const c = (S.consultations || []).find(x => String(x.id) === String(id));
    if (!c) { showLoading(false); return showToast('Consultation not found', 'error'); }

    const d = await apiCall(`/api/user/consultations/${id}/payment-intent`, 'POST').catch(() => null);
    showLoading(false);

    if (d?.payment_url) {
      window.location.href = d.payment_url;
      return;
    }
    if (d?.instructions || d?.reference) {
      openModal({
        title: 'Complete Payment',
        body: `
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i> Follow the instructions below to complete payment.
          </div>
          ${d.reference ? `<p><strong>Reference:</strong> <code class="code">${esc(d.reference)}</code></p>` : ''}
          ${d.instructions ? `<p>${esc(d.instructions)}</p>` : ''}
          ${d.amount ? `<p><strong>Amount:</strong> ${fmtCur(d.amount)}</p>` : ''}
        `,
        footer: `
          <button class="btn btn-secondary" data-close-modal>Close</button>
          <button class="btn btn-primary" onclick="closeModal(); rerenderRoleContent();">
            I've completed payment</button>
        `,
      });
      return;
    }
    showToast('Payment cannot be initiated — please retry', 'warning');
  } catch (e) { showLoading(false); showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('download-follow-up', async (id) => {
  try {
    const d = await apiCall(`/api/user/consultations/follow-ups/${id}/download`).catch(() => null);
    if (d?.url) window.open(d.url, '_blank', 'noopener,noreferrer');
    else showToast('Download not available', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});
