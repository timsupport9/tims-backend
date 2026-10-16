/* ============================================================
   ExpertHub 2.0 — js/admin/03-users.js
   Admin user management (filters, bulk actions, table).
   ============================================================ */

function adminUsers() {
  const roleFilter = $('#users-role-filter')?.value || '';
  const statusFilter = $('#users-status-filter')?.value || '';
  const q = ($('#users-q')?.value || '').toLowerCase();

  let list = S.users.slice();
  if (roleFilter)   list = list.filter(u => u.role === roleFilter);
  if (statusFilter) list = list.filter(u => u.status === statusFilter);
  if (q) list = list.filter(u =>
    (u.name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  );

  const allSelected = list.length > 0 && list.every(u => selectedRows.users.has(String(u.id)));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Users</span></div>
    <section class="page-header">
      <h1 class="page-title">User Management</h1>
      <div class="page-actions">
        <input type="search" id="users-q" class="form-input" placeholder="Search users..." value="${esc(q)}" />
        <select id="users-status-filter" class="form-select">
          <option value="">All statuses</option>
          <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
          <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="suspended" ${statusFilter === 'suspended' ? 'selected' : ''}>Suspended</option>
          <option value="rejected" ${statusFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
        <select id="users-role-filter" class="form-select">
          <option value="">All roles</option>
          <option value="admin" ${roleFilter === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="expert" ${roleFilter === 'expert' ? 'selected' : ''}>Expert</option>
          <option value="institution" ${roleFilter === 'institution' ? 'selected' : ''}>Institution</option>
          <option value="learner" ${roleFilter === 'learner' ? 'selected' : ''}>Learner</option>
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
          <thead>
            <tr>
              <th style="width:36px">
                <input type="checkbox" id="users-select-all" ${allSelected ? 'checked' : ''} />
              </th>
              <th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Last login</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(u => `
              <tr>
                <td>
                  <input type="checkbox" class="user-check" data-id="${u.id}"
                         ${selectedRows.users.has(String(u.id)) ? 'checked' : ''} />
                </td>
                <td>
                  <div class="user-cell">
                    <img class="user-avatar" src="${avatar(u)}" alt="" />
                    <div>
                      <div class="user-name">${esc(u.name || '')}</div>
                      <div class="user-email">${esc(u.email || '')}</div>
                    </div>
                  </div>
                </td>
                <td><span class="chip chip-neutral">${esc(u.role || 'learner')}</span></td>
                <td><span class="${statusClass(u.status)}">${esc(u.status || '')}</span></td>
                <td>${fmtDate(u.created_at)}</td>
                <td>${u.last_login_at ? timeAgo(u.last_login_at) : '—'}</td>
                <td class="actions-cell">
                  ${u.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Approve</button>` : ''}
                  ${u.status === 'pending' ? `<button class="btn btn-danger btn-xs" data-action="reject-user" data-id="${u.id}">Reject</button>` : ''}
                  ${u.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${u.id}">Suspend</button>` : ''}
                  ${(u.status === 'suspended' || u.status === 'rejected') ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Reactivate</button>` : ''}
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
      document.querySelectorAll('.user-check').forEach(cb => {
        cb.onchange = () => {
          if (cb.checked) selectedRows.users.add(cb.dataset.id);
          else selectedRows.users.delete(cb.dataset.id);
          rerenderRoleContent();
        };
      });
      const selAll = document.getElementById('users-select-all');
      if (selAll) selAll.onchange = () => {
        if (selAll.checked) list.forEach(u => selectedRows.users.add(String(u.id)));
        else selectedRows.users.clear();
        rerenderRoleContent();
      };
    </script>
  `;
}