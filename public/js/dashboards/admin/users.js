/* ============================================================
   dashboards/admin/users.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  let localFilters = { q: '', status: '', role: '' };

  function render() {
    let list = S.users.slice();
    if (localFilters.role)   list = list.filter(u => u.role === localFilters.role);
    if (localFilters.status) list = list.filter(u => u.status === localFilters.status);
    if (localFilters.q) {
      const q = localFilters.q.toLowerCase();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q));
    }

    const allSelected = list.length > 0 &&
      list.every(u => S.selectedRows.users.has(String(u.id)));

    const rows = list.map(u => `
      <tr>
        <td>
          <input type="checkbox" class="user-check" data-id="${u.id}"
                 ${S.selectedRows.users.has(String(u.id)) ? 'checked' : ''} />
        </td>
        <td>
          <div class="user-cell">
            <img class="user-avatar" src="${EH.Fmt.esc(u.avatar || EH.PublicFormat.avatar(u.name))}" alt="" />
            <div>
              <div class="user-name">${EH.Fmt.esc(u.name || '')}</div>
              <div class="user-email">${EH.Fmt.esc(u.email || '')}</div>
            </div>
          </div>
        </td>
        <td><span class="chip chip-neutral">${EH.Fmt.esc(u.role || 'learner')}</span></td>
        <td><span class="${EH.Fmt.statusClass(u.status)}">${EH.Fmt.esc(u.status || '')}</span></td>
        <td>${EH.Dates.fmtDate(u.created_at)}</td>
        <td>${u.last_login_at ? EH.Dates.timeAgo(u.last_login_at) : '—'}</td>
        <td class="actions-cell">
          ${u.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Approve</button>` : ''}
          ${u.status === 'pending' ? `<button class="btn btn-danger btn-xs" data-action="reject-user" data-id="${u.id}">Reject</button>` : ''}
          ${u.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${u.id}">Suspend</button>` : ''}
          ${(u.status === 'suspended' || u.status === 'rejected')
            ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Reactivate</button>` : ''}
          <button class="btn btn-secondary btn-xs" data-action="edit-user" data-id="${u.id}">Edit</button>
          <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${u.id}">Delete</button>
        </td>
      </tr>`);

    const html = `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Users' }])}
      ${EH.Layout.pageHeader('User Management', {
        actions: `
          <input type="search" id="users-q" class="form-input"
                 placeholder="Search users..." value="${EH.Fmt.esc(localFilters.q)}" />
          <select id="users-status-filter" class="form-select">
            <option value="">All statuses</option>
            ${['active','pending','suspended','rejected'].map(s => `
              <option value="${s}" ${localFilters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <select id="users-role-filter" class="form-select">
            <option value="">All roles</option>
            ${['admin','expert','institution','learner'].map(r => `
              <option value="${r}" ${localFilters.role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
          <button class="btn btn-secondary" data-action="export-users">
            <i class="fas fa-download"></i> Export</button>`,
      })}

      ${S.selectedRows.users.size ? `
        <div class="alert alert-info" style="justify-content:space-between">
          <span><strong>${S.selectedRows.users.size}</strong> selected</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-success btn-sm" data-action="bulk-approve-users">Approve All</button>
            <button class="btn btn-danger btn-sm" data-action="bulk-suspend-users">Suspend All</button>
            <button class="btn btn-secondary btn-sm" data-action="clear-selection" data-target="users">Clear</button>
          </div>
        </div>` : ''}

      <section class="panel">
        ${EH.Layout.table(
          ['<input type="checkbox" id="users-select-all" ' + (allSelected ? 'checked' : '') + ' />', 'User', 'Role', 'Status', 'Joined', 'Last login', 'Actions'],
          rows,
          { footer: `<div class="table-footer"><span>Showing ${list.length} users</span></div>` },
        )}
      </section>`;

    setTimeout(attachFilters, 0);
    return html;
  }

  function attachFilters() {
    const q = document.getElementById('users-q');
    if (q) q.oninput = EH.Perf.debounce(() => { localFilters.q = q.value; rerender(); }, 250);

    const status = document.getElementById('users-status-filter');
    if (status) status.onchange = () => { localFilters.status = status.value; rerender(); };

    const role = document.getElementById('users-role-filter');
    if (role) role.onchange = () => { localFilters.role = role.value; rerender(); };

    document.querySelectorAll('.user-check').forEach(cb => {
      cb.onchange = () => {
        if (cb.checked) S.selectedRows.users.add(cb.dataset.id);
        else S.selectedRows.users.delete(cb.dataset.id);
        rerender();
      };
    });

    const all = document.getElementById('users-select-all');
    if (all) all.onchange = () => {
      if (all.checked) S.users.forEach(u => S.selectedRows.users.add(String(u.id)));
      else S.selectedRows.users.clear();
      rerender();
    };
  }

  function rerender() {
    const panel = document.getElementById('role-content');
    if (panel) panel.innerHTML = render();
    setTimeout(attachFilters, 0);
  }

  EH.AdminUsers = { render };
})(window);
