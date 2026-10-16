/* ============================================================
   ExpertHub 2.0 — js/admin/08-institutions.js
   Admin institutions/corporate accounts.
   ============================================================ */

function adminInstitutions() {
  const list = S.institutions.slice();
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Institutions</span></div>
    <section class="page-header">
      <h1 class="page-title">Institutional and Corporate Accounts</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-institution"><i class="fas fa-plus"></i> New Institution</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Institutions</p><p class="stat-value">${list.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-building"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active Programmes</p><p class="stat-value">${S.programmes.filter(p => p.status === 'active').length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-diagram-project"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Trainees</p><p class="stat-value">${S.trainees.length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-graduate"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Pending Verification</p><p class="stat-value">${list.filter(i => i.status === 'pending').length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Institution</th><th>Type</th><th>Industry</th><th>Ops Manager</th><th>Programmes</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${list.map(i => `
              <tr>
                <td>
                  <div class="user-cell">
                    <div class="user-avatar" style="background:var(--brand);display:flex;align-items:center;justify-content:center;color:#fff">
                      <i class="fas fa-building"></i>
                    </div>
                    <div>
                      <div class="user-name">${esc(i.name || '')}</div>
                      <div class="user-email">${esc(i.contact_email || '')}</div>
                    </div>
                  </div>
                </td>
                <td><span class="chip chip-neutral">${esc(i.type || 'corporate')}</span></td>
                <td>${esc(i.industry || '—')}</td>
                <td>${esc(i.ops_manager_name || '—')}<br><small class="user-email">${esc(i.ops_manager_email || '')}</small></td>
                <td>${i.programme_count || 0}</td>
                <td><span class="${statusClass(i.status || 'pending')}">${esc(i.status || '')}</span></td>
                <td class="actions-cell">
                  ${i.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-institution" data-id="${i.id}">Verify</button>` : ''}
                  ${i.status === 'pending' ? `<button class="btn btn-danger btn-xs" data-action="reject-institution" data-id="${i.id}">Reject</button>` : ''}
                  ${i.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-institution" data-id="${i.id}">Suspend</button>` : ''}
                  <button class="btn btn-info btn-xs" data-action="assign-ops-manager" data-id="${i.id}">Assign Ops</button>
                  <button class="btn btn-secondary btn-xs" data-action="edit-institution" data-id="${i.id}">Edit</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-institution" data-id="${i.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No institutions registered</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}