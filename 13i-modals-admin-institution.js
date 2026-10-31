/* ============================================================
   ExpertHub 2.0 — 13i-modals-admin-institution.js
   Admin-side institution create/edit modal (was missing from
   13-modals.js but called by 14-actions.js).
   ============================================================ */

function openInstitutionModal(instId = null) {
  const inst = instId
    ? (S.institutions.find(x => String(x.id) === String(instId)) || {})
    : {};

  openModal({
    title: instId ? `Edit ${esc(inst.name || 'Institution')}` : 'New Institution',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="instName" class="form-input" value="${esc(inst.name || '')}" required /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Type</span>
          <select id="instType" class="form-select">
            ${['university','college','corporate','government','training_provider','ngo']
              .map(t => `<option value="${t}" ${inst.type === t ? 'selected' : ''}>${t.replace(/_/g,' ')}</option>`)
              .join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Industry</span>
          <input id="instIndustry" class="form-input" value="${esc(inst.industry || '')}" /></label>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Contact email</span>
          <input id="instEmail" type="email" class="form-input" value="${esc(inst.contact_email || '')}" /></label>
        <label class="form-group"><span class="form-label">Contact phone</span>
          <input id="instPhone" class="form-input" value="${esc(inst.contact_phone || '')}" /></label>
      </div>
      <label class="form-group"><span class="form-label">Website</span>
        <input id="instWebsite" class="form-input" value="${esc(inst.website || '')}" placeholder="https://" /></label>
      <label class="form-group"><span class="form-label">Address</span>
        <textarea id="instAddress" class="form-textarea" rows="2">${esc(inst.address || '')}</textarea></label>
      <label class="checkbox-row">
        <input type="checkbox" id="instVerified" ${inst.verified ? 'checked' : ''} />
        Verified institution (badge shown publicly)
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="instSave" class="btn btn-primary">${instId ? 'Save' : 'Create'}</button>`,
  });

  $('#instSave').onclick = async () => {
    const payload = {
      name: $('#instName').value.trim(),
      type: $('#instType').value,
      industry: $('#instIndustry').value || null,
      contact_email: $('#instEmail').value || null,
      contact_phone: $('#instPhone').value || null,
      website: $('#instWebsite').value || null,
      address: $('#instAddress').value || null,
      verified: $('#instVerified').checked,
    };
    if (!payload.name) return showToast('Name is required', 'error');
    try {
      showLoading(true);
      if (instId) await apiCall(`/api/admin/institutions/${instId}`, 'PUT', payload);
      else        await apiCall('/api/admin/institutions', 'POST', payload);
      closeModal();
      await reloadInstitutions();
      rerenderRoleContent();
      showToast(instId ? 'Institution updated' : 'Institution created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}
