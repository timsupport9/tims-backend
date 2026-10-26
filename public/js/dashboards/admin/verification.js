/* ============================================================
   admin/verification.js — Verification Center
   ============================================================ */
(function () {
  AdminDash.reg('verification', {
    nav: { label: 'Verification', icon: 'fa-shield-halved' },
    render() {
      const pendingUsers = S.users.filter(u => u.status === 'pending');
      const pendingExperts = S.experts.filter(e => e.status === 'pending' || !e.verified);
      const pendingInsts = S.institutions.filter(i => i.status === 'pending');

      const row = (type, item) => `
        <tr>
          <td><span class="chip chip-blue">${type}</span></td>
          <td><div class="user-cell"><img class="user-avatar" src="${avatar(item)}" alt="" /><div><div class="user-name">${esc(item.name||'')}</div><div class="user-email">${esc(item.email||item.contact_email||'')}</div></div></div></td>
          <td>${fmtDate(item.created_at)}</td>
          <td class="actions-cell">
            <button class="btn btn-success btn-xs" data-action="verify-approve" data-type="${type}" data-id="${item.id}">Approve</button>
            <button class="btn btn-danger btn-xs" data-action="verify-reject" data-type="${type}" data-id="${item.id}">Reject</button>
            <button class="btn btn-info btn-xs" data-action="verify-inspect" data-type="${type}" data-id="${item.id}">Inspect</button>
          </td>
        </tr>`;

      const rows = [
        ...pendingUsers.map(u => row('user', u)),
        ...pendingExperts.map(e => row('expert', e)),
        ...pendingInsts.map(i => row('institution', i)),
      ].join('');

      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Verification</span></div>
        <section class="page-header"><h1 class="page-title">Verification Center</h1></section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Pending Users</p><p class="stat-value">${pendingUsers.length}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-user-clock"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Pending Experts</p><p class="stat-value">${pendingExperts.length}</p></div><div class="stat-icon stat-icon-purple"><i class="fas fa-user-tie"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Pending Institutions</p><p class="stat-value">${pendingInsts.length}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-building"></i></div></div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Verification Queue</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Type</th><th>Account</th><th>Submitted</th><th>Actions</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="4" class="empty-row">Nothing pending</td></tr>'}</tbody>
            </table>
          </div>
        </section>`;
    },
    actions: {
      'verify-approve': async ({ el }) => {
        const type = el.dataset.type, id = el.dataset.id;
        const url = type === 'user' ? `/api/admin/users/${id}/approve` : type === 'expert' ? `/api/admin/experts/${id}/verify` : `/api/admin/institutions/${id}/approve`;
        await apiCall(url, 'PUT');
        await loadAllData(); showToast('Approved', 'success'); rerenderRoleContent();
      },
      'verify-reject': async ({ el }) => {
        const type = el.dataset.type, id = el.dataset.id;
        const r = prompt('Reason for rejection?') || '';
        const url = type === 'user' ? `/api/admin/users/${id}/reject` : type === 'expert' ? `/api/admin/experts/${id}/reject` : `/api/admin/institutions/${id}/reject`;
        await apiCall(url, 'PUT', { reason: r });
        await loadAllData(); showToast('Rejected', 'warning'); rerenderRoleContent();
      },
      'verify-inspect': ({ el }) => {
        const type = el.dataset.type, id = el.dataset.id;
        let item;
        if (type === 'user') item = S.users.find(u => String(u.id) === id);
        else if (type === 'expert') item = S.experts.find(e => String(e.id) === id);
        else item = S.institutions.find(i => String(i.id) === id);
        if (!item) return;
        openModal({
          title: 'Account Details',
          body: `
            <p><strong>Name:</strong> ${esc(item.name || '')}</p>
            <p><strong>Email:</strong> ${esc(item.email || item.contact_email || '')}</p>
            <p><strong>Created:</strong> ${fmtDate(item.created_at)}</p>
            ${item.bio ? `<p><strong>Bio:</strong> ${esc(item.bio)}</p>` : ''}
            ${item.specialization ? `<p><strong>Specialization:</strong> ${esc(item.specialization)}</p>` : ''}
            ${item.industry ? `<p><strong>Industry:</strong> ${esc(item.industry)}</p>` : ''}
            ${item.documents ? `<p><strong>Documents:</strong> ${item.documents}</p>` : '<p><em>No documents attached.</em></p>'}
          `,
          footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
        });
      },
    },
  });
})();
