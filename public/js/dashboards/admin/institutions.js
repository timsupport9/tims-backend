/* ============================================================
   admin/institutions.js — Institutional accounts
   ============================================================ */
(function () {
  AdminDash.reg('institutions', {
    nav: { label: 'Institutions', icon: 'fa-building-columns' },
    render() {
      const list = S.institutions.slice();
      const activeProgs = S.programmes.filter(p => p.status === 'active').length;
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Institutions</span></div>
        <section class="page-header">
          <h1 class="page-title">Institutional Accounts</h1>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="create-institution"><i class="fas fa-plus"></i> New Institution</button>
          </div>
        </section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Institutions</p><p class="stat-value">${list.length}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-building"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Active Programmes</p><p class="stat-value">${activeProgs}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-diagram-project"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Total Trainees</p><p class="stat-value">${S.trainees.length}</p></div><div class="stat-icon stat-icon-purple"><i class="fas fa-user-graduate"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Pending</p><p class="stat-value">${list.filter(i => i.status === 'pending').length}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div></div>
        </section>

        <section class="panel">
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Institution</th><th>Type</th><th>Industry</th><th>Ops Manager</th><th>Programmes</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${list.map(i => `
                  <tr>
                    <td><div class="user-cell"><div class="user-avatar" style="background:var(--brand);display:flex;align-items:center;justify-content:center;color:#fff"><i class="fas fa-building"></i></div><div><div class="user-name">${esc(i.name||'')}</div><div class="user-email">${esc(i.contact_email||'')}</div></div></div></td>
                    <td><span class="chip chip-neutral">${esc(i.type||'corporate')}</span></td>
                    <td>${esc(i.industry||'—')}</td>
                    <td>${esc(i.ops_manager_name||'—')}<br><small class="user-email">${esc(i.ops_manager_email||'')}</small></td>
                    <td>${i.programme_count||0}</td>
                    <td><span class="${statusClass(i.status||'pending')}">${esc(i.status||'')}</span></td>
                    <td class="actions-cell">
                      ${i.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-institution" data-id="${i.id}">Verify</button><button class="btn btn-danger btn-xs" data-action="reject-institution" data-id="${i.id}">Reject</button>` : ''}
                      ${i.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-institution" data-id="${i.id}">Suspend</button>` : ''}
                      <button class="btn btn-info btn-xs" data-action="assign-ops-manager" data-id="${i.id}">Assign Ops</button>
                      <button class="btn btn-secondary btn-xs" data-action="edit-institution" data-id="${i.id}">Edit</button>
                      <button class="btn btn-danger btn-xs" data-action="delete-institution" data-id="${i.id}">Delete</button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="7" class="empty-row">No institutions</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>`;
    },
    actions: {
      'create-institution': () => openModal({
        title: 'New Institution',
        body: `
          <label class="form-group"><span class="form-label">Institution name</span><input id="instName" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Type</span><select id="instType" class="form-select">${CONFIG.INSTITUTION_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')}</select></label>
          <label class="form-group"><span class="form-label">Industry</span><input id="instIndustry" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Contact email</span><input id="instEmail" type="email" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Contact phone</span><input id="instPhone" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Address</span><input id="instAddress" class="form-input" /></label>`,
        footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="instSave" class="btn btn-primary">Create</button>`,
      }) || ($('#instSave').onclick = async () => {
        await apiCall('/api/admin/institutions', 'POST', {
          name: $('#instName').value, type: $('#instType').value, industry: $('#instIndustry').value,
          contact_email: $('#instEmail').value, contact_phone: $('#instPhone').value, address: $('#instAddress').value,
        });
        closeModal(); await reloadInstitutions(); showToast('Institution created','success'); rerenderRoleContent();
      }),
      'edit-institution': ({ id }) => {
        const i = S.institutions.find(x => String(x.id) === id); if (!i) return;
        openModal({
          title: 'Edit Institution',
          body: `
            <label class="form-group"><span class="form-label">Name</span><input id="instName" class="form-input" value="${esc(i.name||'')}" /></label>
            <label class="form-group"><span class="form-label">Industry</span><input id="instIndustry" class="form-input" value="${esc(i.industry||'')}" /></label>
            <label class="form-group"><span class="form-label">Contact email</span><input id="instEmail" class="form-input" value="${esc(i.contact_email||'')}" /></label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="instSave" class="btn btn-primary">Save</button>`,
        });
        $('#instSave').onclick = async () => {
          await apiCall(`/api/admin/institutions/${id}`, 'PUT', {
            name: $('#instName').value, industry: $('#instIndustry').value, contact_email: $('#instEmail').value,
          });
          closeModal(); await reloadInstitutions(); showToast('Updated','success'); rerenderRoleContent();
        };
      },
      'approve-institution': async ({ id }) => { await apiCall(`/api/admin/institutions/${id}/approve`,'PUT'); await reloadInstitutions(); showToast('Verified','success'); rerenderRoleContent(); },
      'reject-institution': async ({ id }) => { const r = prompt('Reason?')||''; await apiCall(`/api/admin/institutions/${id}/reject`,'PUT',{reason:r}); await reloadInstitutions(); showToast('Rejected','warning'); rerenderRoleContent(); },
      'suspend-institution': async ({ id }) => { await apiCall(`/api/admin/institutions/${id}/suspend`,'PUT'); await reloadInstitutions(); showToast('Suspended','warning'); rerenderRoleContent(); },
      'delete-institution': async ({ id }) => {
        if (!await confirmDialog('Delete permanently?')) return;
        await apiCall(`/api/admin/institutions/${id}`, 'DELETE'); await reloadInstitutions(); showToast('Deleted','success'); rerenderRoleContent();
      },
      'assign-ops-manager': ({ id }) => {
        openModal({
          title: 'Assign Operations Manager',
          body: `
            <label class="form-group"><span class="form-label">Name</span><input id="omName" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Email</span><input id="omEmail" type="email" class="form-input" /></label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="omSave" class="btn btn-primary">Assign</button>`,
        });
        $('#omSave').onclick = async () => {
          const d = await apiCall(`/api/admin/institutions/${id}/ops-manager`, 'POST', { name: $('#omName').value, email: $('#omEmail').value });
          closeModal(); await reloadInstitutions(); rerenderRoleContent();
          showToast(`Ops manager created. Temp password: ${d.temp_password}`, 'success', 8000);
        };
      },
    },
  });
})();
