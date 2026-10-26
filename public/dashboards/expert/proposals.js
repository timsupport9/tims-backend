/* ============================================================
   dashboards/expert/proposals.js
   ============================================================ */

function renderExpertProposals() {
  const proposals = S.expertProposals || [];
  const filter = document.getElementById('proposalFilter')?.value || '';
  let list = proposals;
  if (filter) list = list.filter(p => p.status === filter);

  const totalValue = list.reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = list.filter(p => p.status === 'sent').length;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Proposals</span></div>
    <section class="page-header">
      <h1 class="page-title">Proposals & Invoices</h1>
      <div class="page-actions">
        <select id="proposalFilter" class="form-select" style="max-width:180px">
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="paid">Paid</option>
        </select>
        <button class="btn btn-primary" data-expert-action="create-proposal">
          <i class="fas fa-plus"></i> New Proposal</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Value</p>
          <p class="stat-value">${fmtCur(totalValue)}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Sent</p>
          <p class="stat-value">${pending}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-paper-plane"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Accepted</p>
          <p class="stat-value">${list.filter(p => p.status === 'accepted' || p.status === 'paid').length}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-check"></i></div>
      </div>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th><th>Client</th><th>Amount</th>
              <th>Status</th><th>Valid until</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td>${esc(p.title || '')}</td>
                <td>${esc(p.client_name || '')}</td>
                <td>${fmtCur(p.amount || 0)}</td>
                <td><span class="${statusClass(p.status)}">${esc(p.status || '')}</span></td>
                <td>${fmtDate(p.valid_until)}</td>
                <td class="actions-cell">
                  <button class="btn btn-info btn-xs" data-expert-action="view-proposal" data-id="${p.id}">View</button>
                  ${p.status === 'draft' ? `
                    <button class="btn btn-primary btn-xs" data-expert-action="send-proposal" data-id="${p.id}">Send</button>
                    <button class="btn btn-secondary btn-xs" data-expert-action="edit-proposal" data-id="${p.id}">Edit</button>
                  ` : ''}
                  ${p.status === 'accepted' ? `
                    <button class="btn btn-success btn-xs" data-expert-action="proposal-to-invoice" data-id="${p.id}">Invoice</button>
                  ` : ''}
                  <button class="btn btn-secondary btn-xs" data-expert-action="download-proposal" data-id="${p.id}">PDF</button>
                  <button class="btn btn-danger btn-xs" data-expert-action="delete-proposal" data-id="${p.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No proposals yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function openProposalModal(id = null) {
  const p = id ? (S.expertProposals || []).find(x => String(x.id) === String(id)) : {};
  openModal({
    title: id ? 'Edit Proposal' : 'New Proposal',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="prTitle" class="form-input" value="${esc(p?.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Client</span>
        <select id="prClient" class="form-select">
          <option value="">Select client</option>
          ${(S.expertClients || []).map(c => `
            <option value="${c.id}" ${p?.client_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>
          `).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Amount ($)</span>
        <input id="prAmount" type="number" class="form-input" value="${p?.amount || 0}" /></label>
      <label class="form-group"><span class="form-label">Valid until</span>
        <input id="prValid" type="date" class="form-input"
               value="${p?.valid_until ? new Date(p.valid_until).toISOString().slice(0,10) : ''}" /></label>
      <label class="form-group"><span class="form-label">Scope / description</span>
        <textarea id="prScope" class="form-textarea" rows="5">${esc(p?.scope || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Terms (optional)</span>
        <textarea id="prTerms" class="form-textarea" rows="3">${esc(p?.terms || '')}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="prSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  document.getElementById('prSave').onclick = async () => {
    const payload = {
      title: document.getElementById('prTitle').value,
      client_id: Number(document.getElementById('prClient').value) || null,
      amount: Number(document.getElementById('prAmount').value || 0),
      valid_until: document.getElementById('prValid').value || null,
      scope: document.getElementById('prScope').value,
      terms: document.getElementById('prTerms').value,
    };
    if (!payload.title) return showToast('Title required', 'error');
    if (id) await apiCall(`/api/expert/proposals/${id}`, 'PUT', payload);
    else    await apiCall('/api/expert/proposals', 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(id ? 'Proposal updated' : 'Proposal created', 'success');
    rerenderExpertContent();
  };
}

function openProposalViewModal(id) {
  const p = (S.expertProposals || []).find(x => String(x.id) === String(id));
  if (!p) return;
  openModal({
    title: p.title,
    className: 'modal-lg',
    body: `
      <p><strong>Client:</strong> ${esc(p.client_name || '')}</p>
      <p><strong>Amount:</strong> ${fmtCur(p.amount || 0)}</p>
      <p><strong>Status:</strong> <span class="${statusClass(p.status)}">${esc(p.status)}</span></p>
      <p><strong>Valid until:</strong> ${fmtDate(p.valid_until)}</p>
      <hr style="margin:16px 0">
      <p><strong>Scope:</strong></p>
      <p>${esc(p.scope || '')}</p>
      ${p.terms ? `<p><strong>Terms:</strong></p><p>${esc(p.terms)}</p>` : ''}
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-primary" data-expert-action="download-proposal" data-id="${id}"
                     onclick="closeModal()">
               <i class="fas fa-file-pdf"></i> Download PDF</button>`,
  });
}
