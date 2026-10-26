/* ============================================================
   dashboards/expert/clients.js
   ============================================================ */

function renderExpertClients() {
  const query = (document.getElementById('clientSearch')?.value || '').toLowerCase();
  let list = S.expertClients || [];
  if (query) list = list.filter(c =>
    (c.name || '').toLowerCase().includes(query) ||
    (c.email || '').toLowerCase().includes(query)
  );

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Clients</span></div>
    <section class="page-header">
      <h1 class="page-title">Clients</h1>
      <div class="page-actions">
        <input type="search" id="clientSearch" class="form-input"
               value="${esc(query)}" placeholder="Search clients..." style="max-width:240px" />
        <button class="btn btn-primary" data-expert-action="client-add">
          <i class="fas fa-user-plus"></i> Add Client</button>
      </div>
    </section>

    <section class="card-grid">
      ${list.map(c => `
        <article class="program-card">
          <div class="user-cell">
            <img class="user-avatar" src="${avatar(c)}" alt="" />
            <div>
              <div class="user-name">${esc(c.name || '')}</div>
              <div class="user-email">${esc(c.email || '')}</div>
            </div>
          </div>
          <p class="program-desc" style="margin-top:10px">
            ${c.company ? esc(c.company) + ' · ' : ''}${c.total_consultations || 0} session${(c.total_consultations || 0) === 1 ? '' : 's'}
          </p>
          <p class="program-meta">
            <i class="fas fa-clock"></i> Last: ${c.last_session_at ? fmtDate(c.last_session_at) : '—'}
          </p>
          <footer class="program-footer" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-expert-action="client-detail" data-id="${c.id}">
              <i class="fas fa-eye"></i> View</button>
            <button class="btn btn-secondary btn-sm" data-expert-action="client-note" data-id="${c.id}">
              <i class="fas fa-notes-medical"></i> Note</button>
            <button class="btn btn-info btn-sm" data-expert-action="client-followup" data-id="${c.id}">
              <i class="fas fa-bell"></i> Follow up</button>
          </footer>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-address-book"></i>
          <h3>No clients yet</h3>
          <p>Clients are created when they book a consultation with you.</p>
        </div>
      `}
    </section>
  `;
}

function openClientDetailModal(clientId) {
  const client = (S.expertClients || []).find(c => Number(c.id) === clientId);
  if (!client) return;
  const sessions = S.consultations
    .filter(c => c.client_id === clientId && c.expert_id === currentUser?.id)
    .sort((a, b) => new Date(b.scheduled_at || b.created_at) - new Date(a.scheduled_at || a.created_at))
    .slice(0, 10);
  const notes = (S.expertNotes || []).filter(n => n.client_id === clientId);

  openModal({
    title: client.name,
    className: 'modal-lg',
    body: `
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(client)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(client.name || '')}</h2>
          <p class="profile-email">${esc(client.email || '')}</p>
          ${client.company ? `<p class="form-hint">${esc(client.company)}</p>` : ''}
        </div>
      </div>
      <div class="form-grid" style="margin-top:16px">
        <div><p class="form-label">Total sessions</p><p>${client.total_consultations || 0}</p></div>
        <div><p class="form-label">Total spent</p><p>${fmtCur(client.total_spent || 0)}</p></div>
        <div><p class="form-label">First session</p><p>${client.first_session_at ? fmtDate(client.first_session_at) : '—'}</p></div>
        <div><p class="form-label">Last session</p><p>${client.last_session_at ? fmtDate(client.last_session_at) : '—'}</p></div>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Recent Sessions</h3>
      ${sessions.length ? `
        <ul class="list-stack">
          ${sessions.map(s => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(s.title || '')}</span>
                <span class="list-row-sub">${s.scheduled_at ? fmtDT(s.scheduled_at) : fmtDT(s.created_at)}</span>
              </div>
              <span class="${consultationStatusClass(s.status)}">${esc(s.status?.replace(/_/g,' '))}</span>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No sessions yet</p>'}

      <h3 class="panel-title" style="margin-top:24px">Notes</h3>
      ${notes.length ? `
        <ul class="list-stack">
          ${notes.slice(0, 8).map(n => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc((n.note || '').slice(0, 100))}</span>
                <span class="list-row-sub">${fmtDT(n.created_at)}</span>
              </div>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No notes yet</p>'}
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-primary" data-expert-action="client-note" data-id="${client.id}"
                     onclick="closeModal()">
               <i class="fas fa-plus"></i> Add Note</button>`,
  });
}

function openClientNoteModal(clientId) {
  openModal({
    title: 'Add Client Note',
    body: `
      <label class="form-group"><span class="form-label">Note</span>
        <textarea id="clientNoteText" class="form-textarea" rows="5"
                  placeholder="Observations, preferences, goals, context…"></textarea></label>
      <label class="checkbox-row">
        <input type="checkbox" id="clientNoteShared" />
        Share with client
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="clientNoteSave" class="btn btn-primary">Save</button>`,
  });
  document.getElementById('clientNoteSave').onclick = async () => {
    const note = document.getElementById('clientNoteText').value;
    if (!note.trim()) return showToast('Note is empty', 'error');
    await apiCall('/api/expert/notes', 'POST', {
      client_id: clientId,
      note,
      shared: document.getElementById('clientNoteShared').checked,
    });
    closeModal();
    await loadAllData();
    showToast('Note saved', 'success');
    rerenderExpertContent();
  };
}

function openAddClientModal() {
  openModal({
    title: 'Add Client',
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="acName" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Email</span>
        <input id="acEmail" type="email" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Company</span>
        <input id="acCompany" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="acSave" class="btn btn-primary">Add</button>`,
  });
  document.getElementById('acSave').onclick = async () => {
    const name  = document.getElementById('acName').value;
    const email = document.getElementById('acEmail').value;
    if (!name || !email) return showToast('Name and email required', 'error');
    await apiCall('/api/expert/clients', 'POST', {
      name, email, company: document.getElementById('acCompany').value,
    });
    closeModal();
    await loadAllData();
    showToast('Client added', 'success');
    rerenderExpertContent();
  };
}
