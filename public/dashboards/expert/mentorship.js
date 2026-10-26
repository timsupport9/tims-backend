/* ============================================================
   dashboards/expert/mentorship.js
   ============================================================ */

function renderExpertMentorship() {
  const mentorships = S.expertMentorships || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Mentorship</span></div>
    <section class="page-header">
      <h1 class="page-title">Mentorship Programs</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-expert-action="create-mentorship">
          <i class="fas fa-plus"></i> New Mentorship</button>
      </div>
    </section>

    <section class="card-grid">
      ${mentorships.map(m => `
        <article class="program-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <span class="chip chip-blue">${m.sessions_completed || 0}/${m.sessions_total || 12} sessions</span>
            <span class="${statusClass(m.status)}">${esc(m.status || 'active')}</span>
          </div>
          <h4 class="program-title">${esc(m.title || '')}</h4>
          <p class="program-desc">${esc(m.client_name || '')}</p>
          <div class="progress-bar">
            <span style="width:${m.sessions_total ? Math.round((m.sessions_completed || 0) / m.sessions_total * 100) : 0}%"></span>
          </div>
          <footer class="program-footer" style="margin-top:10px">
            <span class="program-meta">Next: ${m.next_session_at ? fmtDate(m.next_session_at) : '—'}</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm" data-expert-action="mentorship-detail" data-id="${m.id}">
              <i class="fas fa-eye"></i> Open</button>
            <button class="btn btn-info btn-sm" data-expert-action="mentorship-session" data-id="${m.id}">
              <i class="fas fa-calendar-plus"></i> Schedule</button>
            <button class="btn btn-danger btn-sm" data-expert-action="delete-mentorship" data-id="${m.id}">
              <i class="fas fa-times"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-hand-holding-heart"></i>
          <h3>No active mentorships</h3>
          <p>Structured mentorship programs with recurring sessions.</p>
          <button class="btn btn-primary" data-expert-action="create-mentorship">
            <i class="fas fa-plus"></i> Start Mentorship</button>
        </div>
      `}
    </section>
  `;
}

function openMentorshipModal(id = null) {
  const m = id ? (S.expertMentorships || []).find(x => String(x.id) === String(id)) : {};
  openModal({
    title: id ? 'Edit Mentorship' : 'New Mentorship',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="mnTitle" class="form-input" value="${esc(m?.title || '')}"
               placeholder="e.g. 12-week career mentorship" /></label>
      <label class="form-group"><span class="form-label">Client / Mentee</span>
        <select id="mnClient" class="form-select">
          <option value="">Select mentee</option>
          ${(S.expertClients || []).map(c => `
            <option value="${c.id}" ${m?.client_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>
          `).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Goals / outcomes</span>
        <textarea id="mnGoals" class="form-textarea" rows="3">${esc(m?.goals || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Total sessions</span>
          <input id="mnTotal" type="number" class="form-input" value="${m?.sessions_total || 12}" /></label>
        <label class="form-group"><span class="form-label">Session length (minutes)</span>
          <input id="mnLength" type="number" class="form-input" value="${m?.session_length || 45}" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="mnSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  document.getElementById('mnSave').onclick = async () => {
    const payload = {
      title: document.getElementById('mnTitle').value,
      client_id: Number(document.getElementById('mnClient').value) || null,
      goals: document.getElementById('mnGoals').value,
      sessions_total: Number(document.getElementById('mnTotal').value || 0),
      session_length: Number(document.getElementById('mnLength').value || 45),
    };
    if (!payload.title) return showToast('Title required', 'error');
    if (id) await apiCall(`/api/expert/mentorships/${id}`, 'PUT', payload);
    else    await apiCall('/api/expert/mentorships', 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(id ? 'Mentorship updated' : 'Mentorship created', 'success');
    rerenderExpertContent();
  };
}

function openMentorshipDetailModal(id) {
  const m = (S.expertMentorships || []).find(x => String(x.id) === String(id));
  if (!m) return;
  const sessions = (S.expertMentorshipSessions || []).filter(s => String(s.mentorship_id) === String(id));
  openModal({
    title: m.title,
    className: 'modal-lg',
    body: `
      <p><strong>Mentee:</strong> ${esc(m.client_name || '')}</p>
      <p><strong>Sessions:</strong> ${m.sessions_completed || 0} / ${m.sessions_total || 12}</p>
      <p><strong>Goals:</strong> ${esc(m.goals || '')}</p>

      <h3 class="panel-title" style="margin-top:20px">Session History</h3>
      ${sessions.length ? `
        <ul class="list-stack">
          ${sessions.map(s => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">Session ${s.number || ''}</span>
                <span class="list-row-sub">${fmtDT(s.scheduled_at)}</span>
              </div>
              <span class="${statusClass(s.status)}">${esc(s.status || '')}</span>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No sessions yet</p>'}
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-primary" data-expert-action="mentorship-session"
                     data-id="${id}" onclick="closeModal()">
               <i class="fas fa-calendar-plus"></i> Schedule Session</button>`,
  });
}

function openMentorshipSessionModal(mentorshipId) {
  openModal({
    title: 'Schedule Mentorship Session',
    body: `
      <label class="form-group"><span class="form-label">When</span>
        <input id="msWhen" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Focus / topic</span>
        <input id="msFocus" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="msSave" class="btn btn-primary">Schedule</button>`,
  });
  document.getElementById('msSave').onclick = async () => {
    const when = document.getElementById('msWhen').value;
    if (!when) return showToast('Pick a date', 'error');
    await apiCall(`/api/expert/mentorships/${mentorshipId}/sessions`, 'POST', {
      scheduled_at: new Date(when).toISOString(),
      focus: document.getElementById('msFocus').value,
    });
    closeModal();
    await loadAllData();
    showToast('Session scheduled', 'success');
    rerenderExpertContent();
  };
}
