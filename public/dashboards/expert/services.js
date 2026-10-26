/* ============================================================
   dashboards/expert/services.js
   ============================================================ */

function renderExpertServices() {
  const tiers = S.consultationTiers || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Services & Packages</span></div>
    <section class="page-header">
      <h1 class="page-title">Services & Packages</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-expert-action="create-service">
          <i class="fas fa-plus"></i> New Service</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Offer different service types at different price points.
        Clients pick a tier when booking.
      </div>
    </div>

    <section class="card-grid">
      ${tiers.map(t => `
        <article class="program-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <span class="chip chip-blue">${esc(t.category || 'Consultation')}</span>
            <span class="${t.active ? 'status-active' : 'status-archived'}">
              ${t.active ? 'Active' : 'Hidden'}</span>
          </div>
          <h4 class="program-title">${esc(t.name || '')}</h4>
          <p class="program-desc">${esc(t.description || 'No description')}</p>
          <div class="pricing-price" style="margin:12px 0">${fmtCur(t.price || 0)}</div>
          <p class="program-meta"><i class="fas fa-clock"></i> ${t.duration_minutes || 30} minutes</p>
          ${t.deliverables ? `
            <p class="program-meta"><i class="fas fa-list-check"></i> ${esc(t.deliverables)}</p>
          ` : ''}
          <footer class="program-footer" style="margin-top:10px">
            <button class="btn btn-secondary btn-sm" data-expert-action="toggle-service" data-id="${t.id}">
              <i class="fas fa-eye${t.active ? '-slash' : ''}"></i>
              ${t.active ? 'Hide' : 'Show'}</button>
            <button class="btn btn-info btn-sm" data-expert-action="edit-services" data-id="${t.id}">
              <i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-danger btn-sm" data-expert-action="delete-service" data-id="${t.id}">
              <i class="fas fa-trash"></i></button>
          </footer>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-layer-group"></i>
          <h3>No services defined</h3>
          <p>Create your first service to start accepting bookings.</p>
          <button class="btn btn-primary" data-expert-action="create-service">
            <i class="fas fa-plus"></i> Create Service</button>
        </div>
      `}
    </section>
  `;
}

function openEditServicesModal(id = null) {
  const tier = id ? (S.consultationTiers || []).find(t => String(t.id) === String(id)) : {};
  openModal({
    title: id ? 'Edit Service' : 'New Service',
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="svcName" class="form-input" value="${esc(tier.name || '')}" placeholder="Quick Consultation" /></label>
      <label class="form-group"><span class="form-label">Category</span>
        <input id="svcCategory" class="form-input" value="${esc(tier.category || 'Consultation')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="svcDesc" class="form-textarea" rows="3">${esc(tier.description || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Price ($)</span>
          <input id="svcPrice" type="number" class="form-input" value="${tier.price || 50}" /></label>
        <label class="form-group"><span class="form-label">Duration (minutes)</span>
          <input id="svcDuration" type="number" class="form-input" value="${tier.duration_minutes || 30}" /></label>
      </div>
      <label class="form-group"><span class="form-label">Deliverables</span>
        <input id="svcDeliverables" class="form-input" value="${esc(tier.deliverables || '')}"
               placeholder="e.g. Recording + summary PDF" /></label>
      <label class="checkbox-row">
        <input type="checkbox" id="svcActive" ${tier.active === undefined || tier.active ? 'checked' : ''} />
        Visible to clients
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="svcSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  document.getElementById('svcSave').onclick = async () => {
    const payload = {
      name: document.getElementById('svcName').value,
      category: document.getElementById('svcCategory').value,
      description: document.getElementById('svcDesc').value,
      price: Number(document.getElementById('svcPrice').value || 0),
      duration_minutes: Number(document.getElementById('svcDuration').value || 30),
      deliverables: document.getElementById('svcDeliverables').value,
      active: document.getElementById('svcActive').checked,
    };
    if (!payload.name) return showToast('Name required', 'error');
    if (id) await apiCall(`/api/expert/services/${id}`, 'PUT', payload);
    else    await apiCall('/api/expert/services', 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(id ? 'Service updated' : 'Service created', 'success');
    rerenderExpertContent();
  };
}
