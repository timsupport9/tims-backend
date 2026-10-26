/* ============================================================
   admin/staff.js — Staff & permission management
   ============================================================ */
(function () {
  AdminDash.reg('staff', {
    nav: { label: 'Staff', icon: 'fa-user-shield' },
    render() {
      const staff = (S.users || []).filter(u => u.role === 'admin');
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Staff</span></div>
        <section class="page-header">
          <h1 class="page-title">Staff & Permissions</h1>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="staff-invite"><i class="fas fa-user-plus"></i> Invite Staff</button>
          </div>
        </section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Super Admins</p><p class="stat-value">${staff.filter(s => s.admin_role === 'super_admin').length}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-crown"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Moderators</p><p class="stat-value">${staff.filter(s => s.admin_role === 'moderator').length}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-shield"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Finance Officers</p><p class="stat-value">${staff.filter(s => s.admin_role === 'finance').length}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-coins"></i></div></div>
        </section>

        <section class="panel">
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Active</th><th>Actions</th></tr></thead>
              <tbody>
                ${staff.map(s => `
                  <tr>
                    <td><div class="user-cell"><img class="user-avatar" src="${avatar(s)}" alt="" /><div><div class="user-name">${esc(s.name||'')}</div></div></div></td>
                    <td>${esc(s.email||'')}</td>
                    <td><span class="chip chip-neutral">${esc((s.admin_role||'admin').replace('_',' '))}</span></td>
                    <td><span class="${statusClass(s.status)}">${esc(s.status||'')}</span></td>
                    <td>${s.last_login_at ? timeAgo(s.last_login_at) : '—'}</td>
                    <td class="actions-cell">
                      <button class="btn btn-info btn-xs" data-action="staff-permissions" data-id="${s.id}">Permissions</button>
                      <button class="btn btn-warning btn-xs" data-action="staff-demote" data-id="${s.id}">Demote</button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6" class="empty-row">No staff</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>`;
    },
    actions: {
      'staff-invite': () => {
        openModal({
          title: 'Invite Staff',
          body: `
            <label class="form-group"><span class="form-label">Full name</span><input id="staffName" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Email</span><input id="staffEmail" type="email" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Role</span><select id="staffRole" class="form-select">
              <option value="super_admin">Super Admin</option>
              <option value="moderator">Moderator</option>
              <option value="finance">Finance</option>
              <option value="support">Support</option>
            </select></label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="staffSave" class="btn btn-primary">Send Invite</button>`,
        });
        $('#staffSave').onclick = async () => {
          const d = await apiCall('/api/admin/staff/invite', 'POST', {
            name: $('#staffName').value, email: $('#staffEmail').value, admin_role: $('#staffRole').value,
          });
          closeModal(); await loadAllData(); showToast(`Invite sent. Temp password: ${d.temp_password}`,'success',8000); rerenderRoleContent();
        };
      },
      'staff-permissions': ({ id }) => {
        openModal({
          title: 'Staff Permissions',
          body: `
            <p class="form-hint">Toggle granular permissions for this staff member.</p>
            ${['manage_users','manage_experts','manage_finance','manage_content','manage_support','view_analytics','manage_settings'].map(p => `
              <label class="checkbox-row" style="margin-bottom:8px"><input type="checkbox" data-staff-perm="${p}" /> ${p.replace(/_/g,' ')}</label>
            `).join('')}`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="spSave" class="btn btn-primary">Save</button>`,
        });
        $('#spSave').onclick = async () => {
          const perms = Array.from(document.querySelectorAll('[data-staff-perm]')).map(el => ({ key: el.dataset.staffPerm, granted: el.checked }));
          await apiCall(`/api/admin/staff/${id}/permissions`, 'PUT', { permissions: perms });
          closeModal(); showToast('Permissions saved','success');
        };
      },
      'staff-demote': async ({ id }) => {
        if (!await confirmDialog('Demote this staff member to learner?')) return;
        await apiCall(`/api/admin/staff/${id}/demote`, 'PUT');
        await loadAllData(); showToast('Demoted','success'); rerenderRoleContent();
      },
    },
  });
})();
