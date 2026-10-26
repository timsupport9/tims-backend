/* ============================================================
   admin/workflows.js — Workflow & Automation Center
   ============================================================ */
(function () {
  AdminDash.reg('workflows', {
    nav: { label: 'Workflows', icon: 'fa-diagram-project' },
    render() {
      const workflows = S.workflows || [];
      const failed = workflows.filter(w => w.last_run_status === 'failed');
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Workflows</span></div>
        <section class="page-header">
          <h1 class="page-title">Workflow & Automation</h1>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="workflow-new"><i class="fas fa-plus"></i> New Workflow</button>
          </div>
        </section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Total Workflows</p><p class="stat-value">${workflows.length}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-sitemap"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Active</p><p class="stat-value">${workflows.filter(w => w.active).length}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Failed Runs</p><p class="stat-value">${failed.length}</p></div><div class="stat-icon stat-icon-red"><i class="fas fa-triangle-exclamation"></i></div></div>
        </section>

        <section class="panel">
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Trigger</th><th>Action</th><th>Last Run</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${workflows.map(w => `
                  <tr>
                    <td>${esc(w.name||'')}</td>
                    <td><span class="chip chip-neutral">${esc(w.trigger_type||'')}</span></td>
                    <td>${esc(w.action_type||'')}</td>
                    <td>${w.last_run_at ? fmtDT(w.last_run_at) : '—'}</td>
                    <td><span class="${statusClass(w.last_run_status||'active')}">${esc(w.last_run_status||'')}</span></td>
                    <td class="actions-cell">
                      <button class="btn btn-info btn-xs" data-action="workflow-run" data-id="${w.id}">Run Now</button>
                      <button class="btn btn-secondary btn-xs" data-action="workflow-toggle" data-id="${w.id}">Toggle</button>
                      <button class="btn btn-danger btn-xs" data-action="workflow-delete" data-id="${w.id}">Delete</button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6" class="empty-row">No workflows</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>`;
    },
    actions: {
      'workflow-new': () => {
        openModal({
          title: 'New Workflow',
          body: `
            <label class="form-group"><span class="form-label">Name</span><input id="wfName" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Trigger</span><select id="wfTrigger" class="form-select">
              <option value="user_registered">User Registered</option>
              <option value="consultation_completed">Consultation Completed</option>
              <option value="payment_succeeded">Payment Succeeded</option>
              <option value="daily">Daily Schedule</option>
              <option value="weekly">Weekly Schedule</option>
            </select></label>
            <label class="form-group"><span class="form-label">Action</span><select id="wfAction" class="form-select">
              <option value="send_email">Send Email</option>
              <option value="send_notification">Send Notification</option>
              <option value="webhook">Call Webhook</option>
            </select></label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="wfSave" class="btn btn-primary">Create</button>`,
        });
        $('#wfSave').onclick = async () => {
          await apiCall('/api/admin/workflows', 'POST', {
            name: $('#wfName').value, trigger_type: $('#wfTrigger').value, action_type: $('#wfAction').value,
          });
          closeModal(); await loadAllData(); showToast('Workflow created','success'); rerenderRoleContent();
        };
      },
      'workflow-run': async ({ id }) => { await apiCall(`/api/admin/workflows/${id}/run`, 'POST'); await loadAllData(); showToast('Workflow executed','success'); rerenderRoleContent(); },
      'workflow-toggle': async ({ id }) => { await apiCall(`/api/admin/workflows/${id}/toggle`, 'PUT'); await loadAllData(); rerenderRoleContent(); },
      'workflow-delete': async ({ id }) => { if (!await confirmDialog('Delete workflow?')) return; await apiCall(`/api/admin/workflows/${id}`, 'DELETE'); await loadAllData(); rerenderRoleContent(); },
    },
  });
})();
