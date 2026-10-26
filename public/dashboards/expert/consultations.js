/* ============================================================
   dashboards/expert/consultations.js
   ============================================================ */

function renderExpertConsultations() {
  const filter = document.getElementById('expertConsultFilter')?.value || '';
  const query  = (document.getElementById('expertConsultSearch')?.value || '').toLowerCase();
  const mine   = S.consultations.filter(c => c.expert_id === currentUser?.id);

  let list = mine;
  if (filter) list = list.filter(c => c.status === filter);
  if (query) list = list.filter(c =>
    (c.title || '').toLowerCase().includes(query) ||
    (c.client_name || '').toLowerCase().includes(query)
  );
  list = list.sort((a, b) => {
    const ta = a.scheduled_at ? new Date(a.scheduled_at) : new Date(a.created_at);
    const tb = b.scheduled_at ? new Date(b.scheduled_at) : new Date(b.created_at);
    return tb - ta;
  });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>

    <section class="page-header">
      <h1 class="page-title">Consultations</h1>
      <div class="page-actions">
        <input type="search" id="expertConsultSearch" class="form-input"
               value="${esc(query)}" placeholder="Search title or client..."
               style="max-width:240px" />
        <select id="expertConsultFilter" class="form-select" style="max-width:180px">
          <option value="">All statuses</option>
          ${CONFIG.CONSULTATION_STATUSES.map(s => `
            <option value="${s}" ${filter === s ? 'selected' : ''}>
              ${s.replace(/_/g, ' ')}
            </option>
          `).join('')}
        </select>
      </div>
    </section>

    <section class="list-stack">
      ${list.map(c => {
        const canReschedule = ['confirmed','scheduled','assigned'].includes(c.status)
          && (c.reschedule_count || 0) < (CONFIG.MAX_RESCHEDULES || 3);
        return `
        <article class="consultation-card">
          <header class="consultation-card-header">
            <div>
              <h4 class="consultation-card-title">${esc(c.title || '')}</h4>
              <p class="consultation-card-meta">
                <span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' '))}</span>
                ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
                ${c.priority === 'urgent' ? '<span class="chip chip-red">Urgent</span>' : ''}
              </p>
            </div>
            <div class="consultation-card-price">${fmtCur(c.price || 0)}</div>
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
              <i class="fas fa-clock"></i>
              ${c.duration_minutes || 30} min · ${esc(c.consultation_type || 'video')}
            </div>
            ${c.description ? `<p class="consultation-card-desc">${esc(c.description.slice(0, 200))}</p>` : ''}
          </div>

          <footer class="consultation-card-actions">
            ${c.status === 'pending_expert_confirmation' ? `
              <button class="btn btn-success btn-sm" data-expert-action="confirm-consultation" data-id="${c.id}">
                <i class="fas fa-check"></i> Confirm</button>
              <button class="btn btn-danger btn-sm" data-expert-action="decline-consultation" data-id="${c.id}">
                <i class="fas fa-times"></i> Decline</button>
            ` : ''}
            ${['confirmed','scheduled','assigned','in_grace'].includes(c.status) ? `
              <button class="btn btn-primary btn-sm" data-expert-action="start-consultation" data-id="${c.id}">
                <i class="fas fa-play"></i> Start</button>
            ` : ''}
            ${c.status === 'in_progress' || c.status === 'in_session' ? `
              <button class="btn btn-success btn-sm" data-expert-action="end-consultation" data-id="${c.id}">
                <i class="fas fa-stop"></i> End</button>
            ` : ''}
            ${canReschedule ? `
              <button class="btn btn-secondary btn-sm" data-expert-action="reschedule-consultation" data-id="${c.id}">
                <i class="fas fa-calendar-alt"></i> Reschedule</button>
            ` : ''}
            <button class="btn btn-info btn-sm" data-expert-action="consultation-detail" data-id="${c.id}">
              <i class="fas fa-eye"></i> Details</button>
            <button class="btn btn-secondary btn-sm" data-expert-action="manage-notes" data-id="${c.id}">
              <i class="fas fa-notes-medical"></i> Notes</button>
            <button class="btn btn-secondary btn-sm" data-expert-action="follow-up" data-id="${c.id}">
              <i class="fas fa-bell"></i> Follow up</button>
          </footer>
        </article>
        `;
      }).join('') || `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No consultations yet</h3>
          <p>Consultations assigned by admin or booked directly will appear here.</p>
        </div>
      `}
    </section>
  `;
}

/* ---------- Consultation modals ---------- */
function openExpertRescheduleModal(consultationId) {
  openModal({
    title: 'Reschedule Consultation',
    body: `
      <label class="form-group"><span class="form-label">New date & time</span>
        <input id="rsWhen" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Reason (optional)</span>
        <textarea id="rsReason" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rsSave" class="btn btn-primary">Reschedule</button>`,
  });
  document.getElementById('rsSave').onclick = async () => {
    const when = document.getElementById('rsWhen').value;
    const reason = document.getElementById('rsReason').value;
    if (!when) return showToast('Pick a date', 'error');
    await apiCall(`/api/common/consultations/${consultationId}/reschedule`, 'PUT', {
      scheduled_at: new Date(when).toISOString(),
      reason,
    });
    closeModal();
    await reloadConsultations();
    showToast('Consultation rescheduled', 'success');
    rerenderExpertContent();
  };
}

function openSessionNotesModal(consultationId) {
  openModal({
    title: 'Session Notes',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Session summary</span>
        <textarea id="snSummary" class="form-textarea" rows="4"
                  placeholder="What was discussed, outcome, agreed next steps…"></textarea></label>
      <label class="form-group"><span class="form-label">Action items</span>
        <textarea id="snActions" class="form-textarea" rows="3"></textarea></label>
      <label class="checkbox-row">
        <input type="checkbox" id="snShared" />
        Share notes with client
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="snSave" class="btn btn-primary">Save Notes</button>`,
  });
  document.getElementById('snSave').onclick = async () => {
    await apiCall(`/api/expert/consultations/${consultationId}/notes`, 'POST', {
      summary: document.getElementById('snSummary').value,
      actions: document.getElementById('snActions').value,
      shared: document.getElementById('snShared').checked,
    });
    closeModal();
    showToast('Notes saved', 'success');
  };
}

function openFollowUpModal(consultationId) {
  openModal({
    title: 'Schedule Follow-up',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="fuTitle" class="form-input" placeholder="Follow-up call" /></label>
      <label class="form-group"><span class="form-label">When</span>
        <input id="fuWhen" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Notes</span>
        <textarea id="fuNotes" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="fuSave" class="btn btn-primary">Create</button>`,
  });
  document.getElementById('fuSave').onclick = async () => {
    const title = document.getElementById('fuTitle').value;
    const when  = document.getElementById('fuWhen').value;
    if (!title || !when) return showToast('Fill all fields', 'error');
    await apiCall('/api/expert/reminders', 'POST', {
      title,
      consultation_id: consultationId,
      remind_at: new Date(when).toISOString(),
      notes: document.getElementById('fuNotes').value,
    });
    closeModal();
    await loadAllData();
    showToast('Follow-up scheduled', 'success');
    rerenderExpertContent();
  };
}
