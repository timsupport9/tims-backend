/* ============================================================
   ExpertHub 2.0 — js/admin/05-consultations.js
   Admin consultations list.
   ============================================================ */

function adminConsultations() {
  const filter = $('#admin-consult-filter')?.value || '';
  const list = filter
    ? S.consultations.filter(c => c.status === filter)
    : S.consultations;
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">All Consultations</h1>
      <div class="page-actions">
        <select id="admin-consult-filter" class="form-select" style="max-width:200px">
          <option value="">All statuses</option>
          ${CONFIG.CONSULTATION_STATUSES.map(s => `
            <option value="${s}" ${filter === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>
          `).join('')}
        </select>
      </div>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th><th>Client</th><th>Expert</th><th>Type</th>
              <th>Scheduled</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => `
              <tr>
                <td>${esc(c.title || '')}</td>
                <td>${esc(c.client_name || '—')}</td>
                <td>${esc(c.expert_name || '—')}</td>
                <td><span class="chip chip-neutral">${esc(c.consultation_type || '')}</span></td>
                <td>${c.scheduled_at ? fmtInTz(c.scheduled_at) : '—'}</td>
                <td><span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' ') || '')}</span></td>
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
    </section>
  `;
}