/* ============================================================
   ExpertHub 2.0 — 13j-expert-settings.js
   Expert dashboard settings actions that don't have dedicated
   modals in 13-modals.js.
   ============================================================ */

/* ---------- Availability (reads inline form on Expert → Availability tab) ---------- */
async function saveAvailability() {
  const days = ['mon','tue','wed','thu','fri','sat','sun'];
  const availability = {};
  days.forEach(d => {
    const el = $(`#avail-${d}`);
    if (!el) return;
    availability[d] = {
      enabled: !!el.querySelector('.avail-enabled')?.checked,
      start:   el.querySelector('.avail-start')?.value || '09:00',
      end:     el.querySelector('.avail-end')?.value   || '17:00',
    };
  });

  if (!Object.keys(availability).length) {
    return showToast('No availability form found', 'error');
  }

  try {
    await apiCall('/api/experts/me/availability', 'PUT', { availability });
    showToast('Availability saved', 'success');
  } catch (e) {
    showToast(e.message || 'Save failed', 'error');
  }
}

/* ---------- Request time off ---------- */
async function requestTimeOff() {
  openModal({
    title: 'Request Time Off',
    body: `
      <label class="form-group"><span class="form-label">Start date</span>
        <input id="toStart" type="date" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End date</span>
        <input id="toEnd" type="date" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Reason (optional)</span>
        <textarea id="toReason" class="form-textarea" rows="3"
                  placeholder="Annual leave, conference, etc."></textarea></label>
      <p class="form-hint">Any active bookings in this window must be rescheduled first.</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="toSave" class="btn btn-primary">Request</button>`,
  });

  $('#toSave').onclick = async () => {
    const start = $('#toStart').value;
    const end   = $('#toEnd').value;
    if (!start || !end) return showToast('Both dates are required', 'error');
    if (new Date(end) < new Date(start)) return showToast('End must be after start', 'error');
    try {
      await apiCall('/api/experts/me/time-off', 'POST', {
        start_date: start,
        end_date:   end,
        reason:     $('#toReason').value || null,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Time-off requested', 'success');
    } catch (e) { showToast(e.message || 'Request failed', 'error'); }
  };
}

/* ---------- Withdrawal request ---------- */
async function requestWithdrawal() {
  const available = Number(
    S.wallet?.available_balance ??
    S.wallet?.balance ??
    0
  );
  const minPayout = Number(CONFIG?.MIN_PAYOUT ?? CONFIG?.min_payout ?? 50);
  const holdDays  = Number(CONFIG?.WITHDRAWAL_HOLD_DAYS ?? 3);

  openModal({
    title: 'Request Withdrawal',
    body: `
      <p>Available balance: <strong>${fmtCur(available)}</strong></p>
      <p class="form-hint">
        Minimum payout: ${fmtCur(minPayout)}.
        Funds are typically released within ${holdDays} business day${holdDays === 1 ? '' : 's'}.
      </p>
      <label class="form-group"><span class="form-label">Amount</span>
        <input id="wdAmount" type="number" class="form-input"
               min="${minPayout}" max="${available}" step="0.01" /></label>
      <label class="form-group"><span class="form-label">Payout method</span>
        <select id="wdMethod" class="form-select">
          <option value="bank">Bank transfer</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
          <option value="mobile_money">Mobile money</option>
        </select></label>
      <label class="form-group"><span class="form-label">Destination (account no. or email)</span>
        <input id="wdDest" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="wdSave" class="btn btn-primary">Request</button>`,
  });

  $('#wdSave').onclick = async () => {
    const amount = Number($('#wdAmount').value || 0);
    if (amount < minPayout) return showToast(`Minimum is ${fmtCur(minPayout)}`, 'error');
    if (amount > available) return showToast('Amount exceeds balance', 'error');
    const dest = $('#wdDest').value.trim();
    if (!dest) return showToast('Destination is required', 'error');

    try {
      await apiCall('/api/experts/me/withdrawals', 'POST', {
        amount,
        method:      $('#wdMethod').value,
        destination: dest,
      });
      closeModal();
      await reloadWallet();
      rerenderRoleContent();
      showToast('Withdrawal requested', 'success');
    } catch (e) { showToast(e.message || 'Withdrawal failed', 'error'); }
  };
}

/* ---------- Update expert profile (from inline profile form) ---------- */
async function updateExpertProfile() {
  const payload = {
    name:             $('#epName')?.value?.trim(),
    headline:         $('#epHeadline')?.value?.trim()         || null,
    bio:              $('#epBio')?.value?.trim()              || null,
    specialization:   $('#epSpec')?.value?.trim()             || null,
    hourly_rate:      Number($('#epRate')?.value || 0),
    years_experience: Number($('#epYears')?.value || 0),
    languages:        $('#epLanguages')?.value?.trim()        || null,
    phone:            $('#epPhone')?.value?.trim()            || null,
  };

  if (!payload.name) return showToast('Name is required', 'error');

  try {
    showLoading(true);
    await apiCall('/api/expert/profile', 'PUT', payload);

    /* Refresh the in-memory user so the header reflects the change */
    const me = await apiCall('/api/auth/me');
    if (me?.user) {
      currentUser = me.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }

    await loadAllData();
    rerenderRoleContent();
    showToast('Expert profile updated', 'success');
  } catch (e) {
    showToast(e.message || 'Update failed', 'error');
  } finally {
    showLoading(false);
  }
}
