/* ============================================================
   ExpertHub 2.0 — js/admin/04-experts.js
   Admin expert management.
   ============================================================ */

function adminExperts() {
  const list = S.experts.slice();
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header">
      <h1 class="page-title">Expert Management</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="show-create-expert"><i class="fas fa-plus"></i> Create Expert</button>
      </div>
    </section>

    <section class="panel hidden" id="createExpertPanel">
      <h3 class="panel-title">Create New Expert</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span><input id="newExpertName" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Email</span><input id="newExpertEmail" type="email" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Phone</span><input id="newExpertPhone" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Specialization</span><input id="newExpertSpec" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Hourly rate ($)</span><input id="newExpertRate" type="number" class="form-input" /></label>
        <label class="form-group form-group-full"><span class="form-label">Bio</span><input id="newExpertBio" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="submit-create-expert">Create</button>
        <button class="btn btn-secondary" data-action="hide-create-expert">Cancel</button>
      </div>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Expert</th><th>Specialization</th><th>Rate</th><th>Rating</th><th>Earnings</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${list.map(e => `
              <tr>
                <td>
                  <div class="user-cell">
                    <img class="user-avatar" src="${avatar(e)}" alt="" />
                    <div>
                      <div class="user-name">${esc(e.name || '')}</div>
                      <div class="user-email">${esc(e.email || '')}</div>
                    </div>
                  </div>
                </td>
                <td>${esc(e.specialization || '—')}</td>
                <td>${fmtCur(e.hourly_rate || 0)}</td>
                <td>${e.average_rating ? Number(e.average_rating).toFixed(1) + ' / 5' : '—'}</td>
                <td>${fmtCur(e.total_earnings || 0)}</td>
                <td><span class="${statusClass(e.status || 'active')}">${esc(e.status || '')}</span></td>
                <td class="actions-cell">
                  ${e.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${e.id}">Suspend</button>` : ''}
                  ${e.status === 'suspended' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${e.id}">Reactivate</button>` : ''}
                  <button class="btn btn-info btn-xs" data-action="verify-expert-badge" data-id="${e.id}">
                    <i class="fas fa-check-circle"></i> Verify</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${e.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No experts</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}