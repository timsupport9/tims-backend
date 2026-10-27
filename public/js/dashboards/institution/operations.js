/* ============================================================
   ExpertHub 2.0 — Operations Control (Operations Manager only)
   Approval workflow builder, staff role management, escalation
   rules, task assignment, operational checklists, SLA tracking,
   institutional activity monitoring.
   ============================================================ */

function instOperations() {
  const isOps = currentUser && currentUser.institution_role === 'operations_manager';
  if (!isOps) {
    return `
      <div class="empty-state">
        <i class="fas fa-lock"></i>
        <h3>Access Restricted</h3>
        <p>Only the Operations Manager can access this area.</p>
      </div>`;
  }

  const pendingApprovals = (S.institutionApprovals || []).filter(a => a.status === 'pending');
  const inst = S.myInstitution || {};
  const workflows = S.approvalWorkflows || [];
  const tasks = S.operationalTasks || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Operations Control</span></div>
    <section class="page-header"><h1 class="page-title">Operations Control</h1></section>

    <section class="panel">
      <h3 class="panel-title">Institution Settings</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Display name</span>
          <input id="instSetName" class="form-input" value="${esc(inst.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Contact email</span>
          <input id="instSetEmail" class="form-input" value="${esc(inst.contact_email || '')}" /></label>
        <label class="form-group"><span class="form-label">Default programme capacity</span>
          <input id="instSetCap" type="number" class="form-input" value="${inst.default_capacity || 30}" /></label>
        <label class="form-group"><span class="form-label">Assessment pass mark (%)</span>
          <input id="instSetPass" type="number" class="form-input" value="${inst.pass_mark || 70}" /></label>
        <label class="form-group"><span class="form-label">Seat allocation</span>
          <input id="instSetSeats" type="number" class="form-input" value="${inst.seat_allocation || 0}" /></label>
        <label class="form-group">
          <span class="form-label">Billing cycle</span>
          <select id="instSetBilling" class="form-select">
            <option value="monthly" ${inst.billing_cycle === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="quarterly" ${inst.billing_cycle === 'quarterly' ? 'selected' : ''}>Quarterly</option>
            <option value="annual" ${inst.billing_cycle === 'annual' ? 'selected' : ''}>Annual</option>
          </select>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-institution-settings">
          <i class="fas fa-save"></i> Save Settings</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Approval Queue ${pendingApprovals.length ? `(${pendingApprovals.length})` : ''}</h3>
      <ul class="list-stack">
        ${pendingApprovals.map(a => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">
                ${esc((a.request_type || '').replace(/_/g, ' '))}
                ${a.total_steps > 1
                  ? `<span class="chip chip-neutral" style="margin-left:6px">Step ${a.current_step} of ${a.total_steps}</span>`
                  : ''}
              </span>
              <span class="list-row-sub">
                Requested by ${esc(a.requested_by_name || 'Unknown')} · ${fmtDT(a.created_at)}
                ${a.sla_deadline ? ` · SLA: ${fmtDate(a.sla_deadline)}` : ''}
              </span>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-success btn-xs" data-action="approve-request" data-id="${a.id}">Approve</button>
              <button class="btn btn-danger btn-xs" data-action="reject-request" data-id="${a.id}">Reject</button>
            </div>
          </li>`).join('') || '<li class="empty-row">No pending approvals</li>'}
      </ul>
    </section>

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 class="panel-title" style="margin:0">Approval Workflows</h3>
        <button class="btn btn-secondary btn-sm" data-action="manage-workflows">
          <i class="fas fa-sliders"></i> Manage</button>
      </div>
      ${workflows.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Workflow</th><th>Steps</th><th>SLA</th>
              <th>Threshold</th><th>Active</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${workflows.map(w => `
                <tr>
                  <td>${esc(w.name)}</td>
                  <td>${(w.steps || []).length}</td>
                  <td>${w.sla_hours}h</td>
                  <td>${w.threshold != null ? fmtCur(w.threshold) : '—'}</td>
                  <td>${w.active ? '<span class="status-active">Active</span>' : '<span class="status-archived">Off</span>'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="edit-workflow" data-id="${w.id}">
                      Edit</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `
        <p class="empty-row">Default workflows from CONFIG.APPROVAL_WORKFLOWS are active.</p>`}
    </section>

    <section class="panel">
      <h3 class="panel-title">Team and Roles</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Member</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${(S.institutionTeam || []).map(t => `
              <tr>
                <td><div class="user-cell">
                  <img class="user-avatar" src="${avatar(t)}" alt="" />
                  <div class="user-name">${esc(t.name || '')}</div>
                </div></td>
                <td><span class="chip chip-neutral">${esc((t.institution_role || '').replace(/_/g, ' '))}</span></td>
                <td>${esc(t.email || '')}</td>
                <td><span class="${statusClass(t.status || 'active')}">${esc(t.status || '')}</span></td>
                <td class="actions-cell" style="white-space:nowrap">
                  <button class="btn btn-info btn-xs" data-action="change-team-role" data-id="${t.id}">Change Role</button>
                  <button class="btn btn-secondary btn-xs" data-action="manage-team-permissions" data-id="${t.id}">Permissions</button>
                  <button class="btn btn-danger btn-xs" data-action="remove-team-member" data-id="${t.id}">Remove</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="5" class="empty-row">No team members yet</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="invite-team-member">
          <i class="fas fa-user-plus"></i> Invite Team Member</button>
      </div>
    </section>

    ${tasks.length ? `
      <section class="panel">
        <h3 class="panel-title">Operational Tasks</h3>
        <ul class="list-stack">
          ${tasks.slice(0, 15).map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.title)}</span>
                <span class="list-row-sub">
                  ${esc(t.assigned_to_name || 'Unassigned')} · ${fmtDate(t.due_date)}
                  ${t.sla_breached ? ' · <span class="chip chip-red" style="font-size:.65rem">SLA breached</span>' : ''}
                </span>
              </div>
              <span class="${statusClass(t.status || 'open')}">${esc(t.status || 'open')}</span>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="panel">
      <h3 class="panel-title">Institution Audit Log</h3>
      <ul class="list-stack">
        ${((S.institutionStats || {}).auditLog || []).slice(0, 20).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.action || '')}</span>
              <span class="list-row-sub">by ${esc(l.actor_name || 'System')}</span>
            </div>
            <span class="list-row-meta">${fmtDT(l.created_at)}</span>
          </li>`).join('') || '<li class="empty-row">No entries</li>'}
      </ul>
    </section>
  `;
}
