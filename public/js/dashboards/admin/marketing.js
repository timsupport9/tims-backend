/* ============================================================
   admin/marketing.js — Marketing & Growth Center
   ============================================================ */
(function () {
  AdminDash.reg('marketing', {
    nav: { label: 'Marketing', icon: 'fa-bullhorn' },
    render() {
      const coupons = S.coupons || [];
      const active = coupons.filter(c => c.active).length;
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Marketing</span></div>
        <section class="page-header">
          <h1 class="page-title">Marketing & Growth</h1>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="create-coupon"><i class="fas fa-plus"></i> New Coupon</button>
          </div>
        </section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Total Coupons</p><p class="stat-value">${coupons.length}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-tag"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Active</p><p class="stat-value">${active}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div></div>
        </section>

        <section class="dashboard-columns">
          <div class="panel">
            <h3 class="panel-title">Coupons</h3>
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${coupons.map(c => `
                    <tr>
                      <td><code class="code">${esc(c.code||'')}</code></td>
                      <td>${c.discount_type === 'percent' ? c.discount_value + '%' : fmtCur(c.discount_value)}</td>
                      <td>${c.used_count||0}${c.max_uses?' / '+c.max_uses:''}</td>
                      <td><span class="${statusClass(c.active?'active':'disabled')}">${c.active?'Active':'Disabled'}</span></td>
                      <td class="actions-cell">
                        <button class="btn btn-secondary btn-xs" data-action="toggle-coupon" data-id="${c.id}">Toggle</button>
                        <button class="btn btn-danger btn-xs" data-action="delete-coupon" data-id="${c.id}">Delete</button>
                      </td>
                    </tr>
                  `).join('') || '<tr><td colspan="5" class="empty-row">No coupons</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="panel">
            <h3 class="panel-title">Growth Metrics</h3>
            <ul class="list-stack">
              <li class="list-row"><div class="list-row-main"><span class="list-row-title">New users this month</span></div>
                <span class="list-row-price">${S.users.filter(u => { const d = new Date(u.created_at), n = new Date(); return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear(); }).length}</span></li>
              <li class="list-row"><div class="list-row-main"><span class="list-row-title">Total enrollments</span></div>
                <span class="list-row-price">${S.enrollments.length}</span></li>
              <li class="list-row"><div class="list-row-main"><span class="list-row-title">Total consultations</span></div>
                <span class="list-row-price">${S.consultations.length}</span></li>
            </ul>
          </div>
        </section>`;
    },
    actions: {
      'create-coupon': () => {
        openModal({
          title: 'New Coupon',
          body: `
            <label class="form-group"><span class="form-label">Code</span><input id="cpCode" class="form-input" placeholder="WELCOME10" /></label>
            <label class="form-group"><span class="form-label">Type</span><select id="cpType" class="form-select"><option value="percent">Percent</option><option value="fixed">Fixed</option></select></label>
            <label class="form-group"><span class="form-label">Value</span><input id="cpValue" type="number" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Max uses</span><input id="cpMax" type="number" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Min spend</span><input id="cpMin" type="number" class="form-input" value="0" /></label>
            <label class="form-group"><span class="form-label">Applies to</span><select id="cpApply" class="form-select"><option value="all">All</option><option value="bootcamp">Bootcamps</option><option value="short_course">Short courses</option><option value="event">Events</option><option value="consultation">Consultations</option></select></label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="cpSave" class="btn btn-primary">Create</button>`,
        });
        $('#cpSave').onclick = async () => {
          await apiCall('/api/admin/coupons', 'POST', {
            code: $('#cpCode').value, discount_type: $('#cpType').value,
            discount_value: Number($('#cpValue').value||0),
            max_uses: $('#cpMax').value ? Number($('#cpMax').value) : null,
            min_spend: Number($('#cpMin').value||0), applies_to: $('#cpApply').value,
          });
          closeModal(); await loadAllData(); showToast('Coupon created','success'); rerenderRoleContent();
        };
      },
      'toggle-coupon': async ({ id }) => { await apiCall(`/api/admin/coupons/${id}/toggle`,'PUT'); await loadAllData(); rerenderRoleContent(); },
      'delete-coupon': async ({ id }) => { if (!await confirmDialog('Delete coupon?')) return; await apiCall(`/api/admin/coupons/${id}`,'DELETE'); await loadAllData(); rerenderRoleContent(); },
    },
  });
})();
