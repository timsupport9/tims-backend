/* ============================================================
   ExpertHub 2.0 — consultation-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function openReviewModal(consultationId, expertId) {
  openModal({
    title: 'Rate Expert',
    body: `
      <label class="form-group"><span class="form-label">Rating</span>
        <select id="rvRating" class="form-select">
          ${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Comment</span>
        <textarea id="rvComment" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvSave" class="btn btn-primary">Submit</button>`,
  });
  $('#rvSave').onclick = async () => {
    await apiCall('/api/user/reviews', 'POST', {
      expert_id: expertId,
      consultation_id: Number(consultationId),
      rating: Number($('#rvRating').value),
      comment: $('#rvComment').value,
    });
    closeModal(); showToast('Review submitted', 'success');
  };
}
function openNewConsultationModal() {
  const expertOpts = S.experts.map(e =>
    `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization || '')})</option>`
  ).join('');
  openModal({
    title: 'Request Consultation',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ncTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Expert (optional)</span>
        <select id="ncExpert" class="form-select">
          <option value="">Any available expert</option>${expertOpts}
        </select></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="ncType" class="form-select">
          <option value="career">Career</option>
          <option value="academic">Academic</option>
          <option value="business">Business</option>
          <option value="technical">Technical</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Priority</span>
        <select id="ncPriority" class="form-select">
          <option value="low">Low</option>
          <option value="normal" selected>Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ncDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ncSave" class="btn btn-primary">Submit</button>`,
  });
  $('#ncSave').onclick = async () => {
    const title = $('#ncTitle').value;
    const description = $('#ncDesc').value;
    if (!title || !description) return showToast('Fill all fields', 'error');
    try {
      await apiCall('/api/user/consultations', 'POST', {
        title, description,
        consultation_type: $('#ncType').value,
        priority: $('#ncPriority').value,
        expert_id: $('#ncExpert').value ? Number($('#ncExpert').value) : null,
      });
      closeModal(); await reloadConsultations(); rerenderRoleContent(); showToast('Consultation requested', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
function openClaimModal(consultationId) {
  openModal({
    title: 'File a Claim',
    body: `
      <label class="form-group"><span class="form-label">Claim title</span>
        <input id="clTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="clDesc" class="form-textarea" rows="4"></textarea></label>
      <label class="form-group"><span class="form-label">Amount (optional)</span>
        <input id="clAmount" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="clSave" class="btn btn-primary">Submit Claim</button>`,
  });
  $('#clSave').onclick = async () => {
    const claim_title = $('#clTitle').value;
    const claim_description = $('#clDesc').value;
    if (!claim_title || !claim_description) return showToast('Fill all fields', 'error');
    try {
      await apiCall('/api/user/claims', 'POST', {
        consultation_id: Number(consultationId) || null,
        claim_title, claim_description,
        claim_amount: $('#clAmount').value ? Number($('#clAmount').value) : null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Claim filed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
function openVideoCall(consultationId) {
  if (!consultationId) return showToast('No consultation selected', 'error');
  const room = `experthub-${consultationId}-${uid()}`;
  openModal({
    title: 'Video Call',
    className: 'chat-modal',
    body: `
      <div class="chat-video-wrap">
        <iframe src="https://meet.jit.si/${room}"
                allow="camera;microphone;fullscreen;display-capture"
                style="width:100%;height:100%;border:0" title="Video call"></iframe>
      </div>
      <p class="form-hint">
        Room ID: <code class="code">${room}</code>.
        Share this with the other party if they cannot join.
      </p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>End call</button>`,
  });
}
function openFindExpertWizard() {
  openModal({
    title: 'Find Me an Expert',
    body: `
      <div id="wizardStep1">
        <p class="form-hint">Tell us what you need help with. We'll match you with the best experts.</p>
        <label class="form-group"><span class="form-label">What do you need help with?</span>
          <textarea id="wizardProblem" class="form-textarea" rows="3"
                    placeholder="e.g. I need help designing a scalable backend"></textarea></label>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Budget per hour (max)</span>
            <input id="wizardBudget" type="number" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Session type</span>
            <select id="wizardType" class="form-select">
              <option value="video">Video call</option>
              <option value="audio">Audio call</option>
              <option value="chat">Chat only</option>
            </select></label>
        </div>
      </div>
      <div id="wizardResults" class="hidden"></div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="wizardMatchBtn" class="btn btn-primary">
               <i class="fas fa-magic"></i> Match Me</button>`,
  });
  $('#wizardMatchBtn').onclick = async () => {
    const problemText = $('#wizardProblem').value.trim();
    const budget = $('#wizardBudget').value ? Number($('#wizardBudget').value) : null;
    const type = $('#wizardType').value;
    if (!problemText) return showToast('Describe your problem', 'error');
    showLoading(true);
    const d = await apiCall('/api/consultations/match', 'POST', { problemText, budget, type });
    $('#wizardStep1').classList.add('hidden');
    $('#wizardResults').classList.remove('hidden');
    $('#wizardResults').innerHTML = `
      <h4 style="margin-bottom:12px">Top Matches</h4>
      ${d.matches.length ? d.matches.map(m => `
        <div class="match-card">
          <img class="user-avatar" src="${avatar(m)}" alt="" />
          <div class="match-body">
            <h5>${esc(m.name)}</h5>
            <p>${esc(m.specialization || '')}</p>
            <p class="match-stats">
              <span><i class="fas fa-star"></i> ${Number(m.average_rating || 0).toFixed(1)}</span>
              <span><i class="fas fa-dollar-sign"></i> ${fmtCur(m.hourly_rate)}/hr</span>
            </p>
          </div>
          <div class="match-actions">
            <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${m.id}">Profile</button>
            <button class="btn btn-primary btn-sm" data-action="book-slot-with" data-id="${m.id}" data-name="${esc(m.name)}">
              Book</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No matches found.</p>'}`;
    $('#wizardMatchBtn').classList.add('hidden');
    showLoading(false);
  };
}
function openInstantConsultationModal() {
  openModal({
    title: 'Talk to Someone Now',
    body: `
      <p class="form-hint">We'll match you with the next available expert within 15 minutes.</p>
      <label class="form-group"><span class="form-label">What do you need to talk about?</span>
        <input id="icTopic" class="form-input" placeholder="e.g. Urgent code review" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="icGo" class="btn btn-primary">
               <i class="fas fa-bolt"></i> Connect Now</button>`,
  });
  $('#icGo').onclick = async () => {
    const topic = $('#icTopic').value.trim();
    if (!topic) return showToast('Describe what you need', 'error');
    showLoading(true);
    const d = await apiCall('/api/consultations/instant', 'POST', { topic });
    closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
    showToast(`Connected with ${d.expert.name}`, 'success', 6000);
  };
}
async function openBookSlotWithExpert(expertId, expertName) {
  try {
    showLoading(true);
    const [slotsData, tiersData, packagesData] = await Promise.all([
      apiCall(`/api/experts/${expertId}/slots`).catch(() => ({ slots: [] })),
      apiCall(`/api/experts/${expertId}/tiers`).catch(() => ({ tiers: [] })),
      apiCall(`/api/experts/${expertId}/packages`).catch(() => ({ packages: [] })),
    ]);
    const slots = slotsData.slots.filter(s => s.status === 'available');
    const tiers = tiersData.tiers || [];
    const packages = packagesData.packages || [];

    openModal({
      title: `Book ${expertName}`,
      className: 'modal-lg',
      body: `
        <label class="form-group"><span class="form-label">Title</span>
          <input id="bsTitle" class="form-input" placeholder="Brief subject" /></label>
        <label class="form-group"><span class="form-label">Description</span>
          <textarea id="bsDesc" class="form-textarea" rows="3"></textarea></label>

        ${tiers.length ? `
          <div class="form-group">
            <span class="form-label">Session type</span>
            <div class="tier-list">
              ${tiers.map((t, i) => `
                <label class="tier-option">
                  <input type="radio" name="bsTier" value="${i}" data-duration="${t.duration_minutes}" data-price="${t.price}" />
                  <div>
                    <strong>${esc(t.name)}</strong>
                    <span>${t.duration_minutes} min · ${fmtCur(t.price)}</span>
                  </div>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="form-group">
          <span class="form-label">Pick a slot</span>
          ${slots.length ? `
            <div class="slot-picker">
              ${slots.slice(0, 20).map(s => `
                <button class="slot-option" data-slot-id="${s.id}" data-price="${s.price}" data-duration="${s.duration_minutes}">
                  <div class="slot-option-date">${fmtDate(s.start_time)}</div>
                  <div class="slot-option-time">${fmtInTz(s.start_time, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div class="slot-option-meta">${s.duration_minutes}m · ${fmtCur(s.price)}</div>
                </button>
              `).join('')}
            </div>
          ` : '<p class="empty-row">No open slots</p>'}
        </div>

        ${packages.length ? `
          <div class="form-group">
            <span class="form-label">Or buy a package</span>
            ${packages.map(p => `
              <div class="package-option">
                <div><strong>${esc(p.name)}</strong><span>${p.sessions_count} sessions</span></div>
                <div><span class="package-price">${fmtCur(p.price)}</span>
                  <button class="btn btn-secondary btn-sm" data-action="purchase-package" data-id="${p.id}">Buy</button></div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="booking-summary" id="bookingSummary" style="display:none">
          <p>Total: <strong id="bookingTotal">$0</strong></p>
          <p class="form-hint">Payment held in escrow until session completes.</p>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="bsSave" class="btn btn-primary" disabled>
                 <i class="fas fa-shield-alt"></i> Pay & Book</button>`,
    });

    let selectedSlot = null, selectedTier = null;
    const update = () => {
      const price = selectedSlot?.price || selectedTier?.price || 0;
      $('#bookingTotal').textContent = fmtCur(price);
      $('#bookingSummary').style.display = price ? '' : 'none';
      $('#bsSave').disabled = !selectedSlot && !selectedTier;
    };
    document.querySelectorAll('.slot-option').forEach(b => b.onclick = () => {
      document.querySelectorAll('.slot-option').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      selectedSlot = { id: Number(b.dataset.slotId), price: Number(b.dataset.price), duration: Number(b.dataset.duration) };
      update();
    });
    document.querySelectorAll('input[name="bsTier"]').forEach(r => r.onchange = () => {
      selectedTier = { duration: Number(r.dataset.duration), price: Number(r.dataset.price) };
      update();
    });

    $('#bsSave').onclick = async () => {
      const title = $('#bsTitle').value.trim() || 'Consultation';
      const description = $('#bsDesc').value.trim();
      if (!selectedSlot && !selectedTier) return showToast('Select a slot or tier', 'error');
      showLoading(true);
      const d = await apiCall('/api/consultations/book', 'POST', {
        expert_id: expertId,
        slot_id: selectedSlot?.id || null,
        title, description,
        consultation_type: 'video',
        duration_minutes: selectedSlot?.duration || selectedTier?.duration || 30,
      });
      closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
      showToast('Booked! Expert has 2 hours to confirm.', 'success', 6000);
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
async function openRescheduleModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  showLoading(true);
  const d = await apiCall(`/api/experts/${c.expert_id}/slots`);
  const slots = d.slots.filter(s => s.status === 'available');
  showLoading(false);

  openModal({
    title: 'Reschedule Session',
    body: `
      <p class="form-hint">You have ${CONFIG.MAX_RESCHEDULES - (c.reschedule_count || 0)} reschedules left.</p>
      <div class="slot-picker">
        ${slots.map(s => `
          <button class="slot-option" data-slot-id="${s.id}">
            <div class="slot-option-date">${fmtDate(s.start_time)}</div>
            <div class="slot-option-time">${fmtInTz(s.start_time, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</div>
          </button>
        `).join('') || '<p class="empty-row">No available slots</p>'}
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rsSave" class="btn btn-primary" disabled>Confirm</button>`,
  });
  let selected = null;
  document.querySelectorAll('.slot-option').forEach(b => b.onclick = () => {
    document.querySelectorAll('.slot-option').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected'); selected = Number(b.dataset.slotId);
    $('#rsSave').disabled = false;
  });
  $('#rsSave').onclick = async () => {
    if (!selected) return;
    await apiCall(`/api/consultations/${consultationId}/reschedule`, 'PUT', { new_slot_id: selected });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Rescheduled', 'success');
  };
}
function openCancelConsultationModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  const preview = refundPreview(c.scheduled_at);
  openModal({
    title: 'Cancel Consultation',
    body: `
      <div class="alert ${preview.pct === 100 ? 'alert-success' : preview.pct > 0 ? 'alert-warning' : 'alert-error'}">
        <i class="fas fa-info-circle"></i>
        <div>${preview.label}</div>
      </div>
      <label class="form-group"><span class="form-label">Reason (optional)</span>
        <textarea id="cancelReason" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Keep Session</button>
             <button id="cancelGo" class="btn btn-danger">Confirm Cancel</button>`,
  });
  $('#cancelGo').onclick = async () => {
    await apiCall(`/api/consultations/${consultationId}/cancel`, 'PUT', { reason: $('#cancelReason').value });
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(`Cancelled. Refund: ${preview.pct}%`, 'success');
  };
}
function openConsultationDetailModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  openModal({
    title: c.title || 'Consultation',
    className: 'modal-lg',
    body: `
      <div class="consultation-detail-header">
        <span class="${consultationStatusClass(c.status)}">${esc((c.status || '').replace(/_/g, ' '))}</span>
        <span class="chip chip-neutral">${esc(c.session_type || 'scheduled')}</span>
        <span class="chip chip-neutral">${c.duration_minutes || 30} min</span>
      </div>
      <div class="form-grid">
        <div><p class="form-label">Expert</p><p>${esc(c.expert_name || '—')}</p></div>
        <div><p class="form-label">Client</p><p>${esc(c.client_name || '—')}</p></div>
        <div><p class="form-label">Scheduled</p><p>${c.scheduled_at ? fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC') : '—'}</p></div>
        <div><p class="form-label">Price</p><p>${fmtCur(c.price || 0)}</p></div>
      </div>
      ${c.description ? `<p style="margin-top:12px"><strong>Description:</strong> ${esc(c.description)}</p>` : ''}
      ${c.shared_notes ? `<div class="alert alert-info" style="margin-top:12px"><i class="fas fa-sticky-note"></i>
        <div><strong>Session notes:</strong><br>${esc(c.shared_notes).replace(/\n/g, '<br>')}</div></div>` : ''}
      ${c.ai_summary ? `<div class="alert alert-success" style="margin-top:12px"><i class="fas fa-robot"></i>
        <div><strong>AI Summary:</strong><br>${esc(c.ai_summary).replace(/\n/g, '<br>')}</div></div>` : ''}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-info" data-action="open-chat" data-id="${c.id}">
               <i class="fas fa-comments"></i> Chat</button>`,
  });
}
function openConsultationReviewModal(consultationId, expertId) {
  openModal({
    title: 'Rate Your Session',
    body: `
      ${['overall', 'expertise', 'communication', 'punctuality'].map(name => `
        <div class="rating-row">
          <label>${name.charAt(0).toUpperCase() + name.slice(1)}</label>
          <div class="star-input" data-name="${name}">
            ${[5,4,3,2,1].map(n => `<span data-value="${n}">★</span>`).join('')}
          </div>
        </div>
      `).join('')}
      <label class="form-group" style="margin-top:12px"><span class="form-label">Comment</span>
        <textarea id="rvComment2" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvSave2" class="btn btn-primary">Submit Review</button>`,
  });
  const ratings = { overall: 0, expertise: 0, communication: 0, punctuality: 0 };
  document.querySelectorAll('.star-input').forEach(c => {
    c.querySelectorAll('span').forEach(s => s.onclick = () => {
      const name = c.dataset.name; const v = Number(s.dataset.value);
      ratings[name] = v;
      c.querySelectorAll('span').forEach(x => x.classList.toggle('active', Number(x.dataset.value) <= v));
    });
  });
  $('#rvSave2').onclick = async () => {
    if (!ratings.overall) return showToast('Overall rating required', 'error');
    await apiCall(`/api/consultations/${consultationId}/review`, 'POST', {
      rating: ratings.overall,
      expertise_rating: ratings.expertise || ratings.overall,
      communication_rating: ratings.communication || ratings.overall,
      punctuality_rating: ratings.punctuality || ratings.overall,
      comment: $('#rvComment2').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Review submitted', 'success');
  };
}
function openTipModal(consultationId) {
  openModal({
    title: 'Send a Tip',
    body: `
      <p class="form-hint">Tips go directly to the expert. Fully optional.</p>
      <div class="tip-options">
        ${CONFIG.TIP_PRESETS.map(a => `<button class="tip-btn" data-amount="${a}">$${a}</button>`).join('')}
      </div>
      <label class="form-group"><span class="form-label">Custom amount</span>
        <input id="tipCustom" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tipGo" class="btn btn-primary" disabled>Send Tip</button>`,
  });
  let amount = 0;
  document.querySelectorAll('.tip-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.tip-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); amount = Number(b.dataset.amount);
    $('#tipCustom').value = ''; $('#tipGo').disabled = false;
  });
  $('#tipCustom').oninput = e => {
    amount = Number(e.target.value);
    document.querySelectorAll('.tip-btn').forEach(x => x.classList.remove('active'));
    $('#tipGo').disabled = !amount || amount <= 0;
  };
  $('#tipGo').onclick = async () => {
    await apiCall(`/api/consultations/${consultationId}/tip`, 'POST', { amount });
    closeModal(); showToast(`Tipped ${fmtCur(amount)}`, 'success');
  };
}
function openDisputeModal(consultationId) {
  openModal({
    title: 'File a Dispute',
    body: `
      <div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i>
        Disputes should be filed within 7 days. Both parties will be contacted.</div>
      <label class="form-group"><span class="form-label">Reason</span>
        <select id="dpReason" class="form-select">
          ${CONFIG.DISPUTE_REASONS.map(r => `<option value="${r}">${r.replace(/_/g, ' ')}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="dpDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="dpGo" class="btn btn-warning">Open Dispute</button>`,
  });
  $('#dpGo').onclick = async () => {
    const description = $('#dpDesc').value.trim();
    if (!description) return showToast('Describe what happened', 'error');
    await apiCall(`/api/consultations/${consultationId}/dispute`, 'POST', {
      reason: $('#dpReason').value, description,
    });
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast('Dispute filed. Funds frozen pending review.', 'warning', 6000);
  };
}
