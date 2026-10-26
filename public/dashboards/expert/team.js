/* ============================================================
   dashboards/expert/team.js
   ============================================================ */

function renderExpertTeam() {
  const team = S.expertTeam || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Team</span></div>
    <section class="page-header">
      <h1 class="page-title">Team Workspace</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-expert-action="invite-team">
          <i class="fas fa-user-plus"></i> Invite Member</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Delegate scheduling, project work or client communication to assistants.
        All actions are scoped and audited.
      </div>
    </div>

    <section class="panel">
      ${team.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${team.map(t => `
                <tr>
                  <td>${esc(t.name || '')}</td>
                  <td>${esc(t.email || '')}</td>
                  <td><span class="chip chip-neutral">${esc(t.role || 'assistant')}</span></td>
                  <td><span class="${statusClass(t.status || 'active')}">${esc(t.status || '')}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-expert-action="team-change-role" data-id="${t.id}">
                      Role</button>
                    <button class="btn btn-secondary btn-xs" data-expert-action="team-permissions" data-id="${t.id}">
                      Permissions</button>
                    <button class="btn btn-danger btn-xs" data-expert-action="team-remove" data-id="${t.id}">
                      Remove</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <i class="fas fa-users-gear"></i>
          <h3>No team members yet</h3>
          <p>Invite assistants to help you manage your practice.</p>
          <button class="btn btn-primary" data-expert-action="invite-team">
            <i class="fas fa-user-plus"></i> Invite First Member</button>
        </div>
      `}
    </section>
  `;
}

function openInviteTeamModal() {
  openModal({
    title: 'Invite Team Member',
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="tmName" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Email</span>
        <input id="tmEmail" type="email" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Role</span>
        <select id="tmRole" class="form-select">
          <option value="assistant">Assistant</option>
          <option value="scheduler">Scheduler</option>
          <option value="accountant">Accountant</option>
          <option value="viewer">Viewer</option>
        </select></label>
      <p class="form-hint">Temporary password will be generated once.</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tmSave" class="btn btn-primary">Invite</button>`,
  });
  document.getElementById('tmSave').onclick = async () => {
    const payload = {
      name: document.getElementById('tmName').value,
      email: document.getElementById('tmEmail').value,
      role: document.getElementById('tmRole').value,
    };
    if (!payload.name || !payload.email) return showToast('Fill all fields', 'error');
    const d = await apiCall('/api/expert/team/invite', 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(`Invite sent. Temp password: ${d.temp_password}`, 'success', 8000);
    rerenderExpertContent();
  };
}

function openChangeRoleModal(userId) {
  const t = (S.expertTeam || []).find(x => String(x.id) === String(userId));
  if (!t) return;
  openModal({
    title: 'Change Role',
    body: `
      <p><strong>${esc(t.name)}</strong></p>
      <label class="form-group"><span class="form-label">New role</span>
        <select id="crtRole" class="form-select">
          ${['assistant','scheduler','accountant','viewer'].map(r => `
            <option value="${r}" ${t.role === r ? 'selected' : ''}>${r}</option>
          `).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="crtSave" class="btn btn-primary">Update</button>`,
  });
  document.getElementById('crtSave').onclick = async () => {
    await apiCall(`/api/expert/team/${userId}/role`, 'PUT', {
      role: document.getElementById('crtRole').value,
    });
    closeModal();
    await loadAllData();
    showToast('Role updated', 'success');
    rerenderExpertContent();
  };
}

function openTeamPermissionsModal(userId) {
  const permissions = ['manage_calendar','manage_clients','send_invoices','view_earnings','manage_courses','manage_portfolio'];
  openModal({
    title: 'Team Permissions',
    body: `
      ${permissions.map(p => `
        <label class="checkbox-row" style="margin-bottom:8px">
          <input type="checkbox" data-perm="${p}" />
          ${p.replace(/_/g, ' ')}
        </label>
      `).join('')}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tpSave" class="btn btn-primary">Save</button>`,
  });
  document.getElementById('tpSave').onclick = async () => {
    const list = Array.from(document.querySelectorAll('[data-perm]')).map(el => ({
      key: el.dataset.perm, granted: el.checked,
    }));
    await apiCall(`/api/expert/team/${userId}/permissions`, 'PUT', { permissions: list });
    closeModal();
    showToast('Permissions saved', 'success');
  };
}
