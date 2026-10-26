/* ============================================================
   dashboards/expert/development.js
   ============================================================ */

function renderExpertDevelopment() {
  const credentials = S.expertCredentials || [];
  const cpd = S.expertCPD || [];
  const totalCpd = cpd.reduce((s, c) => s + Number(c.points || 0), 0);
  const skills = S.expertSkills || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Professional Development</span></div>
    <section class="page-header">
      <h1 class="page-title">Professional Development</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-expert-action="add-credential">
          <i class="fas fa-plus"></i> Add Credential</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Credentials</p><p class="stat-value">${credentials.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-award"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">CPD Points</p><p class="stat-value">${totalCpd.toFixed(1)}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Skills tracked</p><p class="stat-value">${skills.length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-puzzle-piece"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Credentials & Certifications</h3>
      ${credentials.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Title</th><th>Issuer</th><th>Issued</th><th>Expires</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${credentials.map(c => `
                <tr>
                  <td>${esc(c.title || '')}</td>
                  <td>${esc(c.issuer || '')}</td>
                  <td>${fmtDate(c.issued_at)}</td>
                  <td>${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-expert-action="edit-credential" data-id="${c.id}">Edit</button>
                    <button class="btn btn-danger btn-xs" data-expert-action="delete-credential" data-id="${c.id}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No credentials yet</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">CPD Log</h3>
      <div class="panel-actions" style="margin-bottom:12px">
        <button class="btn btn-primary btn-sm" data-expert-action="add-cpd">
          <i class="fas fa-plus"></i> Log CPD</button>
      </div>
      ${cpd.length ? `
        <ul class="list-stack">
          ${cpd.map(c => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(c.title || '')}</span>
                <span class="list-row-sub">${fmtDate(c.date)} · ${c.points || 0} pts</span>
              </div>
              <button class="btn btn-danger btn-xs" data-expert-action="delete-cpd" data-id="${c.id}">
                <i class="fas fa-trash"></i></button>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No CPD entries</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Skills</h3>
      <div class="panel-actions" style="margin-bottom:12px">
        <button class="btn btn-primary btn-sm" data-expert-action="update-skills">
          <i class="fas fa-pen"></i> Update Skills</button>
      </div>
      ${skills.length ? `
        <div class="chip-row">
          ${skills.map(s => `<span class="chip chip-blue">${esc(s.name)} · L${s.level}</span>`).join('')}
        </div>
      ` : '<p class="empty-row">No skills listed</p>'}
    </section>
  `;
}

function openCredentialModal(id = null) {
  const c = id ? (S.expertCredentials || []).find(x => String(x.id) === String(id)) : {};
  openModal({
    title: id ? 'Edit Credential' : 'Add Credential',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="crTitle" class="form-input" value="${esc(c?.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Issuer</span>
        <input id="crIssuer" class="form-input" value="${esc(c?.issuer || '')}" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Issued</span>
          <input id="crIssued" type="date" class="form-input"
                 value="${c?.issued_at ? new Date(c.issued_at).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">Expires</span>
          <input id="crExpires" type="date" class="form-input"
                 value="${c?.expires_at ? new Date(c.expires_at).toISOString().slice(0,10) : ''}" /></label>
      </div>
      <label class="form-group"><span class="form-label">Credential URL (optional)</span>
        <input id="crUrl" class="form-input" value="${esc(c?.url || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="crSave" class="btn btn-primary">${id ? 'Save' : 'Add'}</button>`,
  });
  document.getElementById('crSave').onclick = async () => {
    const payload = {
      title: document.getElementById('crTitle').value,
      issuer: document.getElementById('crIssuer').value,
      issued_at: document.getElementById('crIssued').value || null,
      expires_at: document.getElementById('crExpires').value || null,
      url: document.getElementById('crUrl').value,
    };
    if (!payload.title) return showToast('Title required', 'error');
    if (id) await apiCall(`/api/expert/credentials/${id}`, 'PUT', payload);
    else    await apiCall('/api/expert/credentials', 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(id ? 'Credential saved' : 'Credential added', 'success');
    rerenderExpertContent();
  };
}

function openCPDModal() {
  openModal({
    title: 'Log CPD Activity',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="cpdTitle" class="form-input" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Points</span>
          <input id="cpdPoints" type="number" step="0.5" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Date</span>
          <input id="cpdDate" type="date" class="form-input" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="cpdSave" class="btn btn-primary">Log</button>`,
  });
  document.getElementById('cpdSave').onclick = async () => {
    await apiCall('/api/expert/cpd', 'POST', {
      title: document.getElementById('cpdTitle').value,
      points: Number(document.getElementById('cpdPoints').value || 0),
      date: document.getElementById('cpdDate').value || null,
    });
    closeModal();
    await loadAllData();
    showToast('CPD logged', 'success');
    rerenderExpertContent();
  };
}

function openSkillsModal() {
  const current = (S.expertSkills || []).map(s => s.name).join(', ');
  openModal({
    title: 'Update Skills',
    body: `
      <label class="form-group"><span class="form-label">Skills (comma separated)</span>
        <input id="sklList" class="form-input" value="${esc(current)}"
               placeholder="Python, Data analysis, Career coaching" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="sklSave" class="btn btn-primary">Save</button>`,
  });
  document.getElementById('sklSave').onclick = async () => {
    const names = document.getElementById('sklList').value
      .split(',').map(s => s.trim()).filter(Boolean);
    await apiCall('/api/expert/skills', 'PUT', { skills: names });
    closeModal();
    await loadAllData();
    showToast('Skills saved', 'success');
    rerenderExpertContent();
  };
}
