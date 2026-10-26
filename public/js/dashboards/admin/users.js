/* ============================================================
   admin/users.js — User management
   ============================================================ */
(function () {
  AdminDash.reg('users', {
    nav: { label: 'Users', icon: 'fa-users' },
    render() {
      const roleF = $('#users-role-filter')?.value || '';
      const statusF = $('#users-status-filter')?.value || '';
      const q = ($('#users-q')?.value || '').toLowerCase();
      let list = S.users.slice();
      if (roleF) list = list.filter(u => u.role === roleF);
      if (statusF) list = list.filter(u => u.status === statusF);
      if (q) list = list.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q));
      const allSel = list.length > 0 && list.every(u => selectedRows.users.has(String(u.id)));

      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Users</span></div>
        <section class="page-header">
          <h1 class="page-title">User Management</h1>
          <div class="page-actions">
            <input type="search" id="users-q" class="form-input" placeholder="Search users..." value="${esc(q)}" />
            <select id="users-status-filter" class="form-select">
              <option value="">All statuses</option>
              ${['active','pending','suspended','rejected'].map(s => `<option value="${s}" ${statusF===s?'selected':''}>${s}</option>`).join('')}
            </select>
            <select id="users-role-filter" class="form-select">
              <option value="">All roles</option>
              ${['admin','expert','institution','learner'].map(r => `<option value="${r}" ${roleF===r?'selected':''}>${r}</option>`).join('')}
            </select>
            <button class="btn btn-secondary" data-action="export-users"><i class="fas fa-download"></i> Export</button>
          </div>
        </section>

        ${selectedRows.users.size ? `
          <div class="alert alert-info" style="justify-content:space-between">
            <span><strong>${selectedRows.users.size}</strong> selected</span>
            <div style="display:flex;gap:8px">
              <button class="btn btn-success btn-sm" data-action="bulk-approve-users">Approve All</button>
              <button class="btn btn-danger btn-sm" data-action="bulk-suspend-users">Suspend All</button>
              <button class="btn btn-secondary btn-sm" data-action="clear-selection" data-target="users">Clear</button>
            </div>
          </div>
        ` : ''}

        <section class="panel">
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr>
                <th style="width:36px"><input type="checkbox" id="users-select-all" ${allSel?'checked':''} /></th>
                <th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Last Login</th><th>Actions</th>
              </tr></thead>
              <tbody>
                ${list.map(u => `
                  <tr>
                    <td><input type="checkbox" class="user-check" data-id="${u.id}" ${selectedRows.users.has(String(u.id))?'checked':''} /></td>
                    <td>
                      <div class="user-cell">
                        <img class="user-avatar" src="${avatar(u)}" alt="" />
                        <div><div class="user-name">${esc(u.name||'')}</div><div class="user-email">${esc(u.email||'')}</div></div>
                      </div>
                    </td>
                    <td><span class="chip chip-neutral">${esc(u.role||'learner')}</span></td>
                    <td><span class="${statusClass(u.status)}">${esc(u.status||'')}</span></td>
                    <td>${fmtDate(u.created_at)}</td>
                    <td>${u.last_login_at ? timeAgo(u.last_login_at) : '—'}</td>
                    <td class="actions-cell">
                      ${u.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Approve</button><button class="btn btn-danger btn-xs" data-action="reject-user" data-id="${u.id}">Reject</button>` : ''}
                      ${u.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${u.id}">Suspend</button>` : ''}
                      ${['suspended','rejected'].includes(u.status) ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Reactivate</button>` : ''}
                      <button class="btn btn-secondary btn-xs" data-action="edit-user" data-id="${u.id}">Edit</button>
                      <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${u.id}">Delete</button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="7" class="empty-row">No users found</td></tr>'}
              </tbody>
            </table>
          </div>
          <div class="table-footer"><span>Showing ${list.length} users</span></div>
        </section>

        <script>
          document.querySelectorAll('.user-check').forEach(cb => cb.onchange = () => {
            if (cb.checked) selectedRows.users.add(cb.dataset.id); else selectedRows.users.delete(cb.dataset.id);
            rerenderRoleContent();
          });
          const sa = document.getElementById('users-select-all');
          if (sa) sa.onchange = () => {
            if (sa.checked) list.forEach(u => selectedRows.users.add(String(u.id)));
            else selectedRows.users.clear();
            rerenderRoleContent();
          };
        </script>`;
    },
    actions: {
      'export-users': () => downloadCsv('users.csv', S.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status }))),
      'approve-user': async ({ id }) => { await apiCall(`/api/admin/users/${id}/approve`, 'PUT'); await reloadUsers(); showToast('User approved','success'); rerenderRoleContent(); },
      'suspend-user': async ({ id }) => { await apiCall(`/api/admin/users/${id}/suspend`, 'PUT'); await reloadUsers(); showToast('User suspended','warning'); rerenderRoleContent(); },
      'reject-user': async ({ id }) => { const r = prompt('Reason?') || ''; await apiCall(`/api/admin/users/${id}/reject`, 'PUT', { reason: r }); await reloadUsers(); showToast('User rejected','warning'); rerenderRoleContent(); },
      'delete-user': async ({ id }) => { if (!await confirmDialog('Delete user permanently?')) return; await apiCall(`/api/admin/users/${id}`, 'DELETE'); await reloadUsers(); showToast('User deleted','success'); rerenderRoleContent(); },
      'bulk-approve-users': async () => {
        if (!await confirmDialog(`Approve ${selectedRows.users.size} user(s)?`)) return;
        showLoading(true);
        for (const uid of [...selectedRows.users]) await apiCall(`/api/admin/users/${uid}/approve`, 'PUT').catch(()=>{});
        selectedRows.users.clear(); await reloadUsers(); showLoading(false); showToast('Approved','success'); rerenderRoleContent();
      },
      'bulk-suspend-users': async () => {
        if (!await confirmDialog(`Suspend ${selectedRows.users.size} user(s)?`)) return;
        showLoading(true);
        for (const uid of [...selectedRows.users]) await apiCall(`/api/admin/users/${uid}/suspend`, 'PUT').catch(()=>{});
        selectedRows.users.clear(); await reloadUsers(); showLoading(false); showToast('Suspended','warning'); rerenderRoleContent();
      },
      'edit-user': ({ id }) => {
        const u = S.users.find(x => String(x.id) === id); if (!u) return;
        openModal({
          title: `Edit ${u.name}`,
          body: `
            <label class="form-group"><span class="form-label">Name</span><input id="euName" class="form-input" value="${esc(u.name||'')}" /></label>
            <label class="form-group"><span class="form-label">Role</span><select id="euRole" class="form-select">
              ${['learner','expert','institution','admin'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
            </select></label>
            <label class="form-group"><span class="form-label">Status</span><select id="euStatus" class="form-select">
              ${['active','pending','suspended'].map(s=>`<option value="${s}" ${u.status===s?'selected':''}>${s}</option>`).join('')}
            </select></label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="euSave" class="btn btn-primary">Save</button>`,
        });
        $('#euSave').onclick = async () => {
          await apiCall(`/api/admin/users/${id}`, 'PUT', { name: $('#euName').value, role: $('#euRole').value, status: $('#euStatus').value });
          closeModal(); await reloadUsers(); showToast('User updated','success'); rerenderRoleContent();
        };
      },
    },
  });
})();
