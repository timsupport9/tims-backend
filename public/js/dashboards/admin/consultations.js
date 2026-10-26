/* ============================================================
   admin/consultations.js — Consultation monitoring
   ============================================================ */
(function () {
  AdminDash.reg('consultations', {
    nav: { label: 'Consultations', icon: 'fa-comments' },
    render() {
      const f = $('#admin-consult-filter')?.value || '';
      const list = f ? S.consultations.filter(c => c.status === f) : S.consultations;
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
        <section class="page-header">
          <h1 class="page-title">All Consultations</h1>
          <div class="page-actions">
            <select id="admin-consult-filter" class="form-select" style="max-width:200px">
              <option value="">All statuses</option>
              ${CONFIG.CONSULTATION_STATUSES.map(s => `<option value="${s}" ${f===s?'selected':''}>${s.replace(/_/g,' ')}</option>`).join('')}
            </select>
          </div>
        </section>
        <section class="panel">
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Title</th><th>Client</th><th>Expert</th><th>Type</th><th>Scheduled</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${list.map(c => `
                  <tr>
                    <td>${esc(c.title||'')}</td>
                    <td>${esc(c.client_name||'—')}</td>
                    <td>${esc(c.expert_name||'—')}</td>
                    <td><span class="chip chip-neutral">${esc(c.consultation_type||'')}</span></td>
                    <td>${c.scheduled_at ? fmtInTz(c.scheduled_at) : '—'}</td>
                    <td><span class="${consultationStatusClass(c.status)}">${esc((c.status||'').replace(/_/g,' '))}</span></td>
                    <td class="actions-cell">
                      <button class="btn btn-secondary btn-xs" data-action="view-consultation" data-id="${c.id}">View</button>
                      ${!c.expert_id ? `<button class="btn btn-primary btn-xs" data-action="assign-consultation" data-id="${c.id}">Assign</button>` : ''}
                      ${c.status === 'disputed' ? `<button class="btn btn-danger btn-xs" data-action="open-dispute-detail" data-id="${c.id}">Dispute</button>` : ''}
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="7" class="empty-row">No consultations</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>`;
    },
    actions: {
      'view-consultation': ({ id }) => {
        const c = S.consultations.find(x => String(x.id) === id); if (!c) return;
        openModal({
          title: c.title || 'Consultation',
          body: `
            <p><strong>Client:</strong> ${esc(c.client_name || '-')}</p>
            <p><strong>Expert:</strong> ${esc(c.expert_name || 'Unassigned')}</p>
            <p><strong>Status:</strong> <span class="${statusClass(c.status)}">${esc(c.status)}</span></p>
            <p><strong>Type:</strong> ${esc(c.consultation_type || '')}</p>
            <p><strong>Priority:</strong> ${esc(c.priority || '')}</p>
            <p><strong>Description:</strong> ${esc(c.description || '')}</p>
            <p><strong>Created:</strong> ${fmtDT(c.created_at)}</p>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
        });
      },
      'assign-consultation': ({ id }) => {
        const opts = S.experts.map(e => `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization||'')})</option>`).join('');
        openModal({
          title: 'Assign Expert',
          body: `<label class="form-group"><span class="form-label">Expert</span><select id="assignExp" class="form-select">${opts}</select></label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="assignSave" class="btn btn-primary">Assign</button>`,
        });
        $('#assignSave').onclick = async () => {
          await apiCall(`/api/common/consultations/${id}/assign`, 'PUT', { expert_id: Number($('#assignExp').value) });
          closeModal(); await reloadConsultations(); showToast('Assigned','success'); rerenderRoleContent();
        };
      },
    },
  });
})();
