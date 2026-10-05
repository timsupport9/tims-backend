/* ============================================================
   ExpertHub 2.0 — institution-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function openCampusModal(campusId) {
  const c = campusId ? (S.campuses.find(x => x.id === campusId) || {}) : {};
  openModal({
    title: campusId ? 'Edit Campus' : 'New Campus',
    body: `
      <label class="form-group"><span class="form-label">Campus name</span>
        <input id="cpName" class="form-input" value="${esc(c.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="cpType" class="form-select">
          ${CONFIG.CAMPUS_TYPES.map(t => `<option value="${t}" ${c.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Address</span>
        <input id="cpAddress" class="form-input" value="${esc(c.address || '')}" /></label>
      <label class="form-group"><span class="form-label">Contact phone</span>
        <input id="cpPhone" class="form-input" value="${esc(c.contact_phone || '')}" /></label>
      <label class="form-group"><span class="form-label">Capacity</span>
        <input id="cpCapacity" type="number" class="form-input" value="${c.capacity || 50}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="cpSave" class="btn btn-primary">${campusId ? 'Save' : 'Create'}</button>`,
  });
  $('#cpSave').onclick = async () => {
    const payload = {
      name: $('#cpName').value, type: $('#cpType').value,
      address: $('#cpAddress').value, contact_phone: $('#cpPhone').value,
      capacity: Number($('#cpCapacity').value || 50),
    };
    if (campusId) await apiCall(`/api/institution/campuses/${campusId}`, 'PUT', payload);
    else await apiCall('/api/institution/campuses', 'POST', payload);
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(campusId ? 'Campus updated' : 'Campus created', 'success');
  };
}
function openPathBuilderModal(pathId) {
  const lp = S.institutionLearningPaths.find(x => x.id === pathId) || {};
  openModal({
    title: `Path: ${esc(lp.title)}`,
    className: 'modal-lg',
    body: `
      <div class="path-builder">
        <p class="form-hint">Add programmes in order. Trainees unlock them sequentially.</p>
        <div class="path-add-programme" style="margin-bottom:14px">
          <select id="pathAddSelect" class="form-select">
            <option value="">Select a programme...</option>
            ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="pathAddBtn">
            <i class="fas fa-plus"></i> Add Step</button>
        </div>
        <ul class="list-stack" id="pathStepsList">
          ${(lp.steps || []).map((s, i) => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title"><span class="chip chip-blue">${i+1}</span> ${esc(s.programme_title)}</span>
              </div>
              <button class="btn btn-danger btn-xs" data-remove-path-step="${s.id}">Remove</button>
            </li>
          `).join('') || '<li class="empty-row">No steps yet</li>'}
        </ul>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
  $('#pathAddBtn').onclick = async () => {
    const programmeId = $('#pathAddSelect').value;
    if (!programmeId) return;
    await apiCall(`/api/institution/learning-paths/${pathId}/steps`, 'POST', { programme_id: Number(programmeId) });
    closeModal(); await loadAllData(); openPathBuilderModal(pathId);
  };
  document.querySelectorAll('[data-remove-path-step]').forEach(b => b.onclick = async () => {
    await apiCall(`/api/institution/learning-paths/steps/${b.dataset.removePathStep}`, 'DELETE');
    closeModal(); await loadAllData(); openPathBuilderModal(pathId);
  });
}
function openAssignSuccessionModal() {
  openModal({
    title: 'Assign Trainee to Box',
    body: `
      <label class="form-group"><span class="form-label">Trainee</span>
        <select id="suTrainee" class="form-select">
          ${S.trainees.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Box</span>
        <select id="suBox" class="form-select">
          ${CONFIG.SUCCESSION_BOXES.map(b => `<option value="${b.code}">${b.label}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="suSave" class="btn btn-primary">Assign</button>`,
  });
  $('#suSave').onclick = async () => {
    await apiCall('/api/institution/succession/assign', 'POST', {
      trainee_id: Number($('#suTrainee').value),
      box_code: $('#suBox').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Trainee assigned', 'success');
  };
}
function openHireInstructorModal(instructorId, instructorName) {
  openModal({
    title: `Hire ${esc(instructorName)}`,
    body: `
      <label class="form-group"><span class="form-label">Programme</span>
        <select id="hiProgramme" class="form-select">
          ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Rate per hour ($)</span>
        <input id="hiRate" type="number" class="form-input" value="100" /></label>
      <label class="form-group"><span class="form-label">Start date</span>
        <input id="hiStart" type="date" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End date</span>
        <input id="hiEnd" type="date" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="hiSave" class="btn btn-primary">Create Contract</button>`,
  });
  $('#hiSave').onclick = async () => {
    await apiCall('/api/institution/instructor-contracts', 'POST', {
      instructor_id: instructorId,
      programme_id: Number($('#hiProgramme').value),
      rate: Number($('#hiRate').value),
      start_date: $('#hiStart').value,
      end_date: $('#hiEnd').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Contract created', 'success');
  };
}
function openPostInstructorRequestModal() {
  openModal({
    title: 'Post Instructor Requirement',
    body: `
      <label class="form-group"><span class="form-label">Subject expertise</span>
        <input id="pirSubject" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration</span>
        <input id="pirDuration" class="form-input" placeholder="e.g. 8 weeks" /></label>
      <label class="form-group"><span class="form-label">Budget per hour ($)</span>
        <input id="pirBudget" type="number" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="pirDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="pirSave" class="btn btn-primary">Publish</button>`,
  });
  $('#pirSave').onclick = async () => {
    await apiCall('/api/institution/instructor-requests', 'POST', {
      subject: $('#pirSubject').value,
      duration: $('#pirDuration').value,
      budget: Number($('#pirBudget').value),
      description: $('#pirDesc').value,
    });
    closeModal(); showToast('Requirement posted to marketplace', 'success');
  };
}
function openCreateBudgetModal() {
  openModal({
    title: 'New Budget',
    body: `
      <label class="form-group"><span class="form-label">Department</span>
        <input id="budDept" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Period</span>
        <select id="budPeriod" class="form-select">
          ${CONFIG.BUDGET_PERIODS.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Allocated amount ($)</span>
        <input id="budAmount" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="budSave" class="btn btn-primary">Create</button>`,
  });
  $('#budSave').onclick = async () => {
    await apiCall('/api/institution/budgets', 'POST', {
      department: $('#budDept').value,
      period: $('#budPeriod').value,
      allocated: Number($('#budAmount').value),
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Budget created', 'success');
  };
}
function openEditBudgetModal(budgetId) {
  const b = S.budgetAllocations.find(x => x.id === budgetId) || {};
  openModal({
    title: 'Edit Budget',
    body: `
      <label class="form-group"><span class="form-label">Department</span>
        <input id="ebDept" class="form-input" value="${esc(b.department || '')}" /></label>
      <label class="form-group"><span class="form-label">Allocated ($)</span>
        <input id="ebAmount" type="number" class="form-input" value="${b.allocated || 0}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ebSave" class="btn btn-primary">Save</button>`,
  });
  $('#ebSave').onclick = async () => {
    await apiCall(`/api/institution/budgets/${budgetId}`, 'PUT', {
      department: $('#ebDept').value,
      allocated: Number($('#ebAmount').value),
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Budget updated', 'success');
  };
}
function openBudgetTransactionsModal(budgetId) {
  const txns = (S.budgetTransactions || []).filter(t => String(t.budget_id) === String(budgetId));
  openModal({
    title: 'Budget Transactions',
    className: 'modal-lg',
    body: txns.length ? `
      <ul class="list-stack">
        ${txns.map(t => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(t.description || '')}</span>
              <span class="list-row-sub">${fmtDT(t.created_at)}</span>
            </div>
            <span class="list-row-price">${fmtCur(t.amount)}</span>
          </li>
        `).join('')}
      </ul>` : '<p class="empty-row">No transactions</p>',
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}
function openNewReportDefinitionModal(definitionId) {
  const d = definitionId ? (S.savedReportDefinitions.find(x => x.id === definitionId) || {}) : {};
  openModal({
    title: definitionId ? 'Edit Report' : 'New Report Definition',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Report name</span>
        <input id="rdName" class="form-input" value="${esc(d.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Data source</span>
        <select id="rdSource" class="form-select">
          ${Object.keys(CONFIG.REPORT_FIELD_LIBRARY).map(k => `
            <option value="${k}" ${d.data_source === k ? 'selected' : ''}>${k}</option>
          `).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Columns (comma separated)</span>
        <input id="rdColumns" class="form-input" value="${(d.columns || []).join(', ')}" /></label>
      <label class="form-group"><span class="form-label">Filters (JSON, optional)</span>
        <textarea id="rdFilters" class="form-textarea" rows="3">${esc(JSON.stringify(d.filters || {}))}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rdSave" class="btn btn-primary">${definitionId ? 'Save' : 'Create'}</button>`,
  });
  $('#rdSave').onclick = async () => {
    const payload = {
      name: $('#rdName').value,
      data_source: $('#rdSource').value,
      columns: $('#rdColumns').value.split(',').map(x => x.trim()).filter(Boolean),
      filters: (() => { try { return JSON.parse($('#rdFilters').value || '{}'); } catch { return {}; } })(),
    };
    if (definitionId) await apiCall(`/api/institution/report-definitions/${definitionId}`, 'PUT', payload);
    else await apiCall('/api/institution/report-definitions', 'POST', payload);
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(definitionId ? 'Report updated' : 'Report created', 'success');
  };
}
async function runSavedReport(definitionId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/report-definitions/${definitionId}/run`);
    showLoading(false);
    downloadCsv(`report-${definitionId}.csv`, d.rows || []);
    showToast(`Report generated: ${d.rows?.length || 0} rows`, 'success');
  } catch (e) { showLoading(false); showToast(e.message, 'error'); }
}
function openAnnouncementModal(announcementId) {
  const a = announcementId ? (S.announcements.find(x => x.id === announcementId) || {}) : {};
  openModal({
    title: announcementId ? 'Edit Announcement' : 'New Announcement',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="anTitle" class="form-input" value="${esc(a.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Body</span>
        <textarea id="anBody" class="form-textarea" rows="5">${esc(a.body || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Scope</span>
          <select id="anScope" class="form-select">
            ${CONFIG.ANNOUNCEMENT_SCOPES.map(s => `<option value="${s}" ${a.scope === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Priority</span>
          <select id="anPriority" class="form-select">
            ${CONFIG.ANNOUNCEMENT_PRIORITIES.map(p => `<option value="${p}" ${a.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="anSave" class="btn btn-primary">${announcementId ? 'Save' : 'Publish'}</button>`,
  });
  $('#anSave').onclick = async () => {
    const payload = {
      title: $('#anTitle').value,
      body: $('#anBody').value,
      scope: $('#anScope').value,
      priority: $('#anPriority').value,
    };
    if (announcementId) await apiCall(`/api/institution/announcements/${announcementId}`, 'PUT', payload);
    else await apiCall('/api/institution/announcements', 'POST', payload);
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(announcementId ? 'Announcement updated' : 'Announcement published', 'success');
  };
}
function openCreateApiKeyModal() {
  openModal({
    title: 'Create API Key',
    body: `
      <label class="form-group"><span class="form-label">Key name</span>
        <input id="akName" class="form-input" placeholder="e.g. HRIS Integration" /></label>
      <label class="form-group"><span class="form-label">Scopes</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:240px;overflow-y:auto">
          ${CONFIG.API_SCOPES.map(s => `
            <label class="checkbox-row">
              <input type="checkbox" class="ak-scope" value="${s}" />
              <code class="code" style="font-size:.72rem">${s}</code>
            </label>
          `).join('')}
        </div>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="akSave" class="btn btn-primary">Create Key</button>`,
  });
  $('#akSave').onclick = async () => {
    const scopes = Array.from(document.querySelectorAll('.ak-scope:checked')).map(x => x.value);
    if (!scopes.length) return showToast('Select at least one scope', 'error');
    const d = await apiCall('/api/institution/api-keys', 'POST', {
      name: $('#akName').value, scopes,
    });
    closeModal();
    await loadAllData(); rerenderRoleContent();
    openModal({
      title: 'API Key Created',
      body: `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <div>Copy this key now — you won't see it again.</div>
        </div>
        <label class="form-group"><span class="form-label">API Key</span>
          <input class="form-input" value="${esc(d.key)}" readonly onclick="this.select()" /></label>`,
      footer: `<button class="btn btn-primary" data-close-modal>Done</button>`,
    });
  };
}
function openWebhookModal(webhookId) {
  const w = webhookId ? (S.webhooks.find(x => x.id === webhookId) || {}) : {};
  openModal({
    title: webhookId ? 'Edit Webhook' : 'New Webhook',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Endpoint URL</span>
        <input id="whUrl" class="form-input" value="${esc(w.url || '')}" placeholder="https://your-app.com/hooks/experthub" /></label>
      <label class="form-group"><span class="form-label">Events</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:280px;overflow-y:auto">
          ${CONFIG.WEBHOOK_EVENTS.map(e => `
            <label class="checkbox-row">
              <input type="checkbox" class="wh-event" value="${e}" ${(w.events || []).includes(e) ? 'checked' : ''} />
              <code class="code" style="font-size:.72rem">${e}</code>
            </label>
          `).join('')}
        </div>
      </label>
      <label class="form-group"><span class="form-label">Signing secret (optional)</span>
        <input id="whSecret" class="form-input" value="${esc(w.secret || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="whSave" class="btn btn-primary">${webhookId ? 'Save' : 'Create'}</button>`,
  });
  $('#whSave').onclick = async () => {
    const events = Array.from(document.querySelectorAll('.wh-event:checked')).map(x => x.value);
    const payload = {
      url: $('#whUrl').value,
      events,
      secret: $('#whSecret').value,
    };
    if (webhookId) await apiCall(`/api/institution/webhooks/${webhookId}`, 'PUT', payload);
    else await apiCall('/api/institution/webhooks', 'POST', payload);
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(webhookId ? 'Webhook updated' : 'Webhook created', 'success');
  };
}
async function saveSsoConfig() {
  await apiCall('/api/institution/sso', 'PUT', {
    provider: $('#sso-provider').value,
    entity_id: $('#sso-entity').value,
    metadata_url: $('#sso-metadata-url').value,
    certificate: $('#sso-cert').value,
  });
  showToast('SSO configuration saved', 'success');
}
async function saveSecurityPolicy() {
  await apiCall('/api/institution/security-policy', 'PUT', {
    force_mfa: $('#sec-force-mfa').checked,
    ip_whitelist_enabled: $('#sec-ip-whitelist').checked,
    session_timeout: $('#sec-session-timeout').checked,
  });
  showToast('Security policies saved', 'success');
}
async function saveInstitutionSettings() {
  await apiCall('/api/institution/settings', 'PUT', {
    name: $('#instSetName').value,
    contact_email: $('#instSetEmail').value,
    default_capacity: Number($('#instSetCap').value),
    pass_mark: Number($('#instSetPass').value),
    seat_allocation: Number($('#instSetSeats').value || 0),
    billing_cycle: $('#instSetBilling').value,
  });
  showToast('Settings saved', 'success');
}
async function saveBranding() {
  const fd = new FormData();
  const logoInput = $('#brandLogo');
  if (logoInput && logoInput.files[0]) fd.append('logo', logoInput.files[0]);
  fd.append('primary_color', $('#brandPrimary').value);
  fd.append('accent_color', $('#brandAccent').value);
  fd.append('email_sender_name', $('#brandEmailName').value);
  fd.append('email_sender_address', $('#brandEmailAddr').value);
  fd.append('welcome_message', $('#brandWelcome').value);
  showLoading(true);
  await apiCall('/api/institution/branding', 'PUT', fd, true);
  await loadAllData();
  if ($('#brandPrimary').value) document.documentElement.style.setProperty('--brand', $('#brandPrimary').value);
  if ($('#brandAccent').value) document.documentElement.style.setProperty('--accent', $('#brandAccent').value);
  rerenderRoleContent(); showLoading(false); showToast('Branding saved', 'success');
}
async function updateInstitutionProfile() {
  await apiCall('/api/institution/profile', 'PUT', {
    name: $('#instProfileName').value,
    type: $('#instProfileType').value,
    industry: $('#instProfileIndustry').value,
    contact_phone: $('#instProfilePhone').value,
    address: $('#instProfileAddress').value,
  });
  await loadAllData(); rerenderRoleContent(); showToast('Profile updated', 'success');
}

/* ---------- Profile generic ---------- */
function openProgrammeModal(id = null) {
  const p = id ? S.programmes.find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Programme' : 'New Programme',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="prTitle" class="form-input" value="${esc(p.title || '')}" required /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="prDesc" class="form-textarea" rows="3">${esc(p.description || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="prCat" class="form-input" value="${esc(p.category || '')}" /></label>
        <label class="form-group">
          <span class="form-label">Delivery mode</span>
          <select id="prDelivery" class="form-select">
            ${CONFIG.DELIVERY_MODES.map(m => `
              <option value="${m}" ${p.delivery_mode === m ? 'selected' : ''}>${m.replace('_', ' ')}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Level</span>
          <select id="prLevel" class="form-select">
            ${['beginner', 'intermediate', 'advanced'].map(l => `
              <option value="${l}" ${p.level === l ? 'selected' : ''}>${l}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Status</span>
          <select id="prStatus" class="form-select">
            ${CONFIG.PROGRAMME_STATUSES.map(s => `
              <option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Start date</span>
          <input id="prStart" type="date" class="form-input"
                 value="${p.start_date ? new Date(p.start_date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">End date</span>
          <input id="prEnd" type="date" class="form-input"
                 value="${p.end_date ? new Date(p.end_date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">Capacity</span>
          <input id="prCap" type="number" class="form-input" value="${p.capacity || 30}" /></label>
        <label class="form-group"><span class="form-label">Duration in hours</span>
          <input id="prDuration" type="number" class="form-input" value="${p.duration_hours || 0}" /></label>
      </div>
      <h4 class="panel-title" style="margin-top:16px">Cost Tracking</h4>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Cost per seat</span>
          <input id="prCostSeat" type="number" class="form-input" value="${p.cost_per_seat || 0}" /></label>
        <label class="form-group"><span class="form-label">Trainer cost</span>
          <input id="prTrainerCost" type="number" class="form-input" value="${p.trainer_cost || 0}" /></label>
        <label class="form-group"><span class="form-label">Materials cost</span>
          <input id="prMaterialsCost" type="number" class="form-input" value="${p.materials_cost || 0}" /></label>
      </div>
      <h4 class="panel-title" style="margin-top:16px">Compliance and Prerequisites</h4>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Awarding body</span>
          <input id="prAwarding" class="form-input" value="${esc(p.accreditation_body || '')}" /></label>
        <label class="form-group"><span class="form-label">CPD points</span>
          <input id="prCpd" type="number" class="form-input" value="${p.cpd_points || 0}" step="0.5" /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Prerequisite programme</span>
          <select id="prPrereq" class="form-select">
            <option value="">None</option>
            ${S.programmes
              .filter(x => x.id !== id)
              .map(x => `<option value="${x.id}" ${p.prerequisite_programme_id === x.id ? 'selected' : ''}>${esc(x.title)}</option>`)
              .join('')}
          </select>
        </label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="prSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#prSave').onclick = async () => {
    const payload = {
      title: $('#prTitle').value,
      description: $('#prDesc').value || null,
      category: $('#prCat').value || null,
      delivery_mode: $('#prDelivery').value,
      level: $('#prLevel').value,
      status: $('#prStatus').value,
      start_date: $('#prStart').value || null,
      end_date: $('#prEnd').value || null,
      capacity: Number($('#prCap').value || 30),
      duration_hours: Number($('#prDuration').value || 0),
      cost_per_seat: Number($('#prCostSeat').value || 0),
      trainer_cost: Number($('#prTrainerCost').value || 0),
      materials_cost: Number($('#prMaterialsCost').value || 0),
      accreditation_body: $('#prAwarding').value || null,
      cpd_points: Number($('#prCpd').value || 0),
      prerequisite_programme_id: $('#prPrereq').value ? Number($('#prPrereq').value) : null,
    };
    if (!payload.title) return showToast('Title is required', 'error');
    try {
      showLoading(true);
      if (id) await apiCall(`/api/institution/programmes/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/programmes', 'POST', payload);
      closeModal();
      await reloadInstitutionProgrammes();
      rerenderRoleContent();
      showToast(id ? 'Programme updated' : 'Programme created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}
function openProgrammeViewModal(programmeId) {
  const p = S.programmes.find(x => x.id === programmeId);
  if (!p) return;
  openModal({
    title: p.title,
    body: `
      <p><strong>Category:</strong> ${esc(p.category || '-')}</p>
      <p><strong>Status:</strong> <span class="${statusClass(p.status)}">${esc(p.status)}</span></p>
      <p><strong>Delivery mode:</strong> ${esc((p.delivery_mode || '').replace('_', ' '))}</p>
      <p><strong>Dates:</strong> ${fmtDate(p.start_date)} to ${fmtDate(p.end_date)}</p>
      <p><strong>Capacity:</strong> ${p.enrolled_count || 0} of ${p.capacity || 0}</p>
      <p><strong>Duration:</strong> ${p.duration_hours || 0} hours</p>
      <p><strong>Cost per seat:</strong> ${fmtCur(p.cost_per_seat || 0)}</p>
      <p><strong>Trainer cost:</strong> ${fmtCur(p.trainer_cost || 0)}</p>
      <p><strong>Materials cost:</strong> ${fmtCur(p.materials_cost || 0)}</p>
      ${p.accreditation_body ? `<p><strong>Awarding body:</strong> ${esc(p.accreditation_body)}</p>` : ''}
      ${p.cpd_points ? `<p><strong>CPD points:</strong> ${p.cpd_points}</p>` : ''}
      <p><strong>Description:</strong></p>
      <p>${esc(p.description || '-')}</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}
async function openCurriculumModal(programmeId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/programmes/${programmeId}/modules`);
    const p = S.programmes.find(x => x.id === programmeId) || {};

    openModal({
      title: `Curriculum - ${esc(p.title || '')}`,
      className: 'modal-lg',
      body: `
        <div class="panel" style="background:var(--surface-2)">
          <h4 class="panel-title">Add Module</h4>
          <div class="form-grid">
            <label class="form-group"><span class="form-label">Module title</span>
              <input id="cmTitle" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Duration in hours</span>
              <input id="cmDuration" type="number" class="form-input" value="2" /></label>
            <label class="form-group form-group-full"><span class="form-label">Description</span>
              <textarea id="cmDesc" class="form-textarea" rows="2"></textarea></label>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary" id="cmAdd">Add Module</button>
          </div>
        </div>

        <h4 class="panel-title" style="margin-top:16px">Modules (${(d.modules || []).length})</h4>
        <ul class="list-stack">
          ${(d.modules || []).map(m => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  <span class="chip chip-neutral">${m.position}</span>
                  ${esc(m.title)}
                </span>
                <span class="list-row-sub">
                  ${m.duration_hours}h - ${esc((m.description || '').slice(0, 80))}
                </span>
              </div>
              <button class="btn btn-danger btn-xs" data-remove-module="${m.id}">Remove</button>
            </li>
          `).join('') || '<li class="empty-row">No modules yet</li>'}
        </ul>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });

    $('#cmAdd').onclick = async () => {
      const title = $('#cmTitle').value;
      if (!title) return showToast('Module title is required', 'error');
      try {
        await apiCall(`/api/institution/programmes/${programmeId}/modules`, 'POST', {
          title,
          description: $('#cmDesc').value || null,
          duration_hours: Number($('#cmDuration').value || 0),
        });
        closeModal();
        openCurriculumModal(programmeId);
      } catch (e) { showToast(e.message, 'error'); }
    };

    document.querySelectorAll('[data-remove-module]').forEach(b => {
      b.onclick = async () => {
        if (!await confirmDialog('Remove this module?')) return;
        try {
          await apiCall(`/api/institution/programmes/${programmeId}/modules/${b.dataset.removeModule}`, 'DELETE');
          closeModal();
          openCurriculumModal(programmeId);
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
function openLearningPathModal(pathId) {
  const lp = pathId ? (S.institutionLearningPaths.find(x => x.id === pathId) || {}) : {};
  openModal({
    title: pathId ? 'Edit Learning Path' : 'New Learning Path',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="lpTitle" class="form-input" value="${esc(lp.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="lpDesc" class="form-textarea" rows="3">${esc(lp.description || '')}</textarea></label>
      <label class="checkbox-row">
        <input type="checkbox" id="lpActive" ${lp.active === undefined || lp.active ? 'checked' : ''} />
        Active
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="lpSave" class="btn btn-primary">${pathId ? 'Save' : 'Create'}</button>`,
  });
  $('#lpSave').onclick = async () => {
    const title = $('#lpTitle').value;
    if (!title) return showToast('Title is required', 'error');
    try {
      await apiCall('/api/institution/learning-paths', 'POST', {
        title,
        description: $('#lpDesc').value || null,
        active: $('#lpActive').checked,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Learning path saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
function openCohortModal(id = null) {
  const c = id ? S.cohorts.find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Cohort' : 'New Cohort',
    body: `
      <label class="form-group"><span class="form-label">Cohort name</span>
        <input id="chName" class="form-input" value="${esc(c.name || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Programme</span>
        <select id="chProg" class="form-select">
          ${S.programmes.map(p => `
            <option value="${p.id}" ${c.programme_id === p.id ? 'selected' : ''}>${esc(p.title)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Instructor</span>
        <select id="chInstr" class="form-select">
          <option value="">Unassigned</option>
          ${S.instructors.map(i => `
            <option value="${i.id}" ${c.instructor_id === i.id ? 'selected' : ''}>${esc(i.name)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Substitute instructor</span>
        <select id="chSubInstr" class="form-select">
          <option value="">None</option>
          ${S.instructors.map(i => `
            <option value="${i.id}" ${c.substitute_instructor_id === i.id ? 'selected' : ''}>${esc(i.name)}</option>
          `).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start date</span>
          <input id="chStart" type="date" class="form-input"
                 value="${c.start_date ? new Date(c.start_date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">End date</span>
          <input id="chEnd" type="date" class="form-input"
                 value="${c.end_date ? new Date(c.end_date).toISOString().slice(0,10) : ''}" /></label>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Capacity</span>
          <input id="chCap" type="number" class="form-input" value="${c.capacity || 30}" /></label>
        <label class="form-group"><span class="form-label">Location</span>
          <input id="chLocation" class="form-input" value="${esc(c.location || '')}" /></label>
      </div>
      <label class="form-group">
        <span class="form-label">Status</span>
        <select id="chStatus" class="form-select">
          ${['scheduled', 'active', 'completed', 'cancelled'].map(s => `
            <option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="chSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#chSave').onclick = async () => {
    const payload = {
      name: $('#chName').value,
      programme_id: Number($('#chProg').value),
      instructor_id: $('#chInstr').value ? Number($('#chInstr').value) : null,
      substitute_instructor_id: $('#chSubInstr').value ? Number($('#chSubInstr').value) : null,
      start_date: $('#chStart').value || null,
      end_date: $('#chEnd').value || null,
      capacity: Number($('#chCap').value || 30),
      location: $('#chLocation').value || null,
      status: $('#chStatus').value,
    };
    if (!payload.name) return showToast('Name is required', 'error');
    try {
      showLoading(true);
      if (id) await apiCall(`/api/institution/cohorts/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/cohorts', 'POST', payload);
      closeModal();
      await reloadInstitutionCohorts();
      rerenderRoleContent();
      showToast(id ? 'Cohort updated' : 'Cohort created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}
function openCohortViewModal(cohortId) {
  const c = S.cohorts.find(x => x.id === cohortId);
  if (!c) return;
  openModal({
    title: c.name,
    body: `
      <p><strong>Programme:</strong> ${esc(c.programme_title || '-')}</p>
      <p><strong>Instructor:</strong> ${esc(c.instructor_name || 'Unassigned')}</p>
      <p><strong>Dates:</strong> ${fmtDate(c.start_date)} to ${fmtDate(c.end_date)}</p>
      <p><strong>Capacity:</strong> ${c.trainee_count || 0} of ${c.capacity || 0}</p>
      <p><strong>Location:</strong> ${esc(c.location || '-')}</p>
      <p><strong>Status:</strong> <span class="${statusClass(c.status)}">${esc(c.status)}</span></p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}
async function openCohortWaitlistModal(cohortId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/cohorts/${cohortId}/waitlist`);
    const c = S.cohorts.find(x => x.id === cohortId) || {};
    openModal({
      title: `Waitlist - ${esc(c.name || '')}`,
      body: `
        <p class="form-hint">When a seat opens, promote the next trainee in the queue.</p>
        <ul class="list-stack" style="margin-top:12px">
          ${(d.waitlist || []).map(w => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  <span class="chip chip-neutral">#${w.position}</span>
                  ${esc(w.name)}
                </span>
                <span class="list-row-sub">${esc(w.email)}</span>
              </div>
              <button class="btn btn-success btn-xs" data-promote-wait="${w.user_id}">Promote</button>
            </li>
          `).join('') || '<li class="empty-row">Waitlist is empty</li>'}
        </ul>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    document.querySelectorAll('[data-promote-wait]').forEach(b => {
      b.onclick = async () => {
        try {
          await apiCall('/api/institution/enrollments', 'POST', {
            user_id: Number(b.dataset.promoteWait),
            programme_id: c.programme_id,
            cohort_id: c.id,
          });
          closeModal();
          await loadAllData();
          rerenderRoleContent();
          showToast('Trainee promoted', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
async function openImportHistoryModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/institution/trainees/imports');
    openModal({
      title: 'Import History',
      className: 'modal-lg',
      body: `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th><th>File</th><th>By</th>
                <th>Total</th><th>Success</th><th>Errors</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(d.imports || []).map(i => `
                <tr>
                  <td>${fmtDT(i.created_at)}</td>
                  <td>${esc(i.filename || '-')}</td>
                  <td>${esc(i.imported_by_name || '-')}</td>
                  <td>${i.total_rows}</td>
                  <td><span class="status status-active">${i.success_count}</span></td>
                  <td>${i.error_count ? `<span class="status status-rejected">${i.error_count}</span>` : '0'}</td>
                  <td><span class="${statusClass(i.status)}">${esc(i.status)}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="7" class="empty-row">No imports yet</td></tr>'}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
function openTraineeImportModal() {
  openModal({
    title: 'Import Trainees',
    className: 'modal-lg',
    body: `
      <nav class="tab-bar" style="margin-bottom:16px">
        <button class="tab-btn tab-btn-active" data-import-mode="csv">CSV Upload</button>
        <button class="tab-btn" data-import-mode="single">Single Entry</button>
      </nav>
      <div id="import-csv-pane">
        <div class="drop-zone" id="csv-drop">
          <i class="fas fa-cloud-upload-alt"></i>
          <p><strong>Drop CSV file here</strong> or click to browse</p>
          <p class="form-hint" style="margin-top:8px">
            Required columns: <code class="code">name</code>, <code class="code">email</code><br>
            Optional: <code class="code">department</code>, <code class="code">job_title</code>,
            <code class="code">employee_id</code>, <code class="code">cost_centre</code>
          </p>
          <input type="file" id="csv-file" accept=".csv" hidden />
        </div>
        <div style="display:flex;gap:10px;margin-top:12px">
          <button class="btn btn-secondary btn-sm" id="download-template">
            <i class="fas fa-download"></i> Download Template</button>
        </div>
        <div id="import-result" style="margin-top:16px"></div>
      </div>
      <div id="import-single-pane" class="hidden">
        <label class="form-group"><span class="form-label">Full name</span>
          <input id="invName" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Email</span>
          <input id="invEmail" type="email" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Department</span>
          <input id="invDept" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Job title</span>
          <input id="invJobTitle" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Employee ID</span>
          <input id="invEmployeeId" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Cost centre</span>
          <input id="invCostCentre" class="form-input" /></label>
        <label class="form-group">
          <span class="form-label">Assign to programme</span>
          <select id="invProgramme" class="form-select">
            <option value="">None</option>
            ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
          </select>
        </label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button id="import-confirm" class="btn btn-primary" style="display:none">Import</button>`,
  });

  let mode = 'csv';
  $$('[data-import-mode]').forEach(b => {
    b.onclick = () => {
      mode = b.dataset.importMode;
      $$('[data-import-mode]').forEach(x => x.classList.remove('tab-btn-active'));
      b.classList.add('tab-btn-active');
      $('#import-csv-pane').classList.toggle('hidden', mode !== 'csv');
      $('#import-single-pane').classList.toggle('hidden', mode !== 'single');
      $('#import-confirm').style.display = mode === 'single' ? '' : 'none';
    };
  });

  const drop = $('#csv-drop');
  drop.onclick = () => $('#csv-file').click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('drop-zone-active'); };
  drop.ondragleave = () => drop.classList.remove('drop-zone-active');
  drop.ondrop = e => {
    e.preventDefault();
    drop.classList.remove('drop-zone-active');
    if (e.dataTransfer.files[0]) uploadCsv(e.dataTransfer.files[0]);
  };
  $('#csv-file').onchange = e => { if (e.target.files[0]) uploadCsv(e.target.files[0]); };

  $('#download-template').onclick = () => {
    const csv = 'name,email,department,job_title,employee_id,cost_centre\nJane Doe,jane@acme.com,Engineering,Senior Developer,EMP001,CC-ENG\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trainee-import-template.csv';
    a.click();
  };
  async function uploadCsv(file) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      showLoading(true);
      const d = await apiCall('/api/institution/trainees/import', 'POST', fd, true);
      $('#import-result').innerHTML = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          <div>
            <strong>${d.success} of ${d.total}</strong> trainees imported.
            ${d.errors.length ? `<br><small>${d.errors.length} rows failed</small>` : ''}
          </div>
        </div>
        ${d.errors.length ? `
          <details style="margin-top:10px">
            <summary style="cursor:pointer;font-size:.85rem">View errors</summary>
            <ul class="list-stack" style="margin-top:8px">
              ${d.errors.slice(0, 25).map(e => `
                <li class="list-row">
                  <div class="list-row-main">
                    <span class="list-row-title">Row ${e.row}</span>
                    <span class="list-row-sub">${esc(e.error)}${e.email ? ' - ' + esc(e.email) : ''}</span>
                  </div>
                </li>
              `).join('')}
            </ul>
          </details>
        ` : ''}`;
      await loadAllData();
      rerenderRoleContent();
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  }

  $('#import-confirm').onclick = async () => {
    if (mode !== 'single') return;
    const payload = {
      emails: [$('#invEmail').value.trim()],
      programme_id: $('#invProgramme').value ? Number($('#invProgramme').value) : undefined,
      name: $('#invName').value.trim(),
      department: $('#invDept').value.trim(),
      job_title: $('#invJobTitle').value.trim(),
      employee_id: $('#invEmployeeId').value.trim(),
      cost_centre: $('#invCostCentre').value.trim(),
    };
    if (!payload.emails[0]) return showToast('Email is required', 'error');
    try {
      showLoading(true);
      await apiCall('/api/institution/trainees/invite', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Trainee invited', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}
async function openTraineeDetailModal(traineeId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/trainees/${traineeId}`);
    const t = d.trainee || {};
    const enrollments = d.enrollments || [];
    const certs = d.certificates || [];
    const skills = d.skills || [];

    openModal({
      title: 'Trainee Profile',
      className: 'modal-lg',
      body: `
        <div class="profile-header">
          <img class="profile-avatar" src="${avatar(t)}" alt="" />
          <div>
            <h2 class="profile-name">
              ${esc(t.name || '')}
              ${t.at_risk ? '<span class="chip chip-red" style="margin-left:8px">At Risk</span>' : ''}
            </h2>
            <p class="profile-email">${esc(t.email || '')}</p>
            <p style="margin-top:6px">
              <span class="${statusClass(t.lifecycle_status || 'active')}">
                ${esc((t.lifecycle_status || '').replace('_', ' '))}
              </span>
            </p>
          </div>
        </div>
        <div class="form-grid" style="margin-top:20px">
          <div><p class="form-label">Department</p><p>${esc(t.department || '-')}</p></div>
          <div><p class="form-label">Job Title</p><p>${esc(t.job_title || '-')}</p></div>
          <div><p class="form-label">Employee ID</p><p>${esc(t.employee_id || '-')}</p></div>
          <div><p class="form-label">Cost Centre</p><p>${esc(t.cost_centre || '-')}</p></div>
          <div><p class="form-label">Phone</p><p>${esc(t.phone || '-')}</p></div>
          <div><p class="form-label">Joined</p><p>${fmtDate(t.created_at)}</p></div>
        </div>
        ${t.accessibility_notes ? `
          <div class="alert alert-info" style="margin-top:16px">
            <i class="fas fa-info-circle"></i>
            <div><strong>Accessibility notes:</strong> ${esc(t.accessibility_notes)}</div>
          </div>
        ` : ''}
        <h3 class="panel-title" style="margin-top:24px">Enrolments</h3>
        ${enrollments.length ? `
          <ul class="list-stack">
            ${enrollments.map(e => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(e.programme_title || '-')}</span>
                  <span class="list-row-sub">${esc(e.cohort_name || 'No cohort')} - ${e.progress || 0}% complete</span>
                </div>
                <span class="${statusClass(e.status)}">${esc(e.status)}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No enrolments</p>'}
        <h3 class="panel-title" style="margin-top:24px">Certificates</h3>
        ${certs.length ? `
          <ul class="list-stack">
            ${certs.map(c => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(c.title)}</span>
                  <span class="list-row-sub">${esc(c.serial)} - Issued ${fmtDate(c.issued_at)}</span>
                </div>
                <div style="display:flex;gap:6px">
                  <a class="btn btn-secondary btn-xs" href="/verify/${esc(c.serial)}" target="_blank">Verify</a>
                  <a class="btn btn-secondary btn-xs" href="/api/institution/certificates/${c.id}/pdf" target="_blank">PDF</a>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No certificates</p>'}
        <h3 class="panel-title" style="margin-top:24px">Skills</h3>
        ${skills.length ? `
          <ul class="list-stack">
            ${skills.map(s => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(s.skill_name || '')}</span>
                  <span class="list-row-sub">${esc(s.category || '')}</span>
                </div>
                <span class="chip chip-neutral">Level ${s.level}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No skill assessments recorded</p>'}`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
function openTraineeNotesModal(traineeId) {
  const t = S.trainees.find(x => String(x.id) === String(traineeId)) || {};
  openModal({
    title: 'Trainee Notes',
    body: `
      <label class="checkbox-row" style="margin-bottom:14px">
        <input type="checkbox" id="tnAtRisk" ${t.at_risk ? 'checked' : ''} />
        Flag as at-risk trainee
      </label>
      <label class="form-group"><span class="form-label">Accessibility and support notes</span>
        <textarea id="tnAccessibility" class="form-textarea" rows="3"
                  placeholder="e.g. requires extra time on assessments">${esc(t.accessibility_notes || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Internal notes</span>
        <textarea id="tnInternal" class="form-textarea" rows="4"
                  placeholder="Internal observations, follow-up actions">${esc(t.internal_notes || '')}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tnSave" class="btn btn-primary">Save</button>`,
  });
  $('#tnSave').onclick = async () => {
    try {
      const enrollmentId = t.latest_enrollment_id || t.id;
      await apiCall(`/api/institution/enrollments/${enrollmentId}/notes`, 'PUT', {
        at_risk: $('#tnAtRisk').checked,
        accessibility_notes: $('#tnAccessibility').value,
        internal_notes: $('#tnInternal').value,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Notes saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
function openTraineeTransferModal(enrollmentId) {
  openModal({
    title: 'Transfer Trainee',
    body: `
      <p class="form-hint">Move this trainee to a different cohort. Progress is preserved.</p>
      <label class="form-group">
        <span class="form-label">Target cohort</span>
        <select id="ttCohort" class="form-select">
          <option value="">Select a cohort</option>
          ${S.cohorts.map(c => `
            <option value="${c.id}">${esc(c.name)} - ${esc(c.programme_title || '')}</option>
          `).join('')}
        </select>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ttSave" class="btn btn-primary">Transfer</button>`,
  });
  $('#ttSave').onclick = async () => {
    const cohortId = $('#ttCohort').value;
    if (!cohortId) return showToast('Select a cohort', 'error');
    try {
      await apiCall(`/api/institution/enrollments/${enrollmentId}/transfer`, 'PUT', {
        cohort_id: Number(cohortId),
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Trainee transferred', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
function openManageSkillsModal() {
  const skills = S.institutionSkills || [];
  openModal({
    title: 'Manage Skills',
    className: 'modal-lg',
    body: `
      <div class="panel" style="background:var(--surface-2)">
        <h4 class="panel-title">Add New Skill</h4>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Name</span>
            <input id="newSkillName" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Category</span>
            <input id="newSkillCat" class="form-input" placeholder="e.g. Technical, Leadership" /></label>
          <label class="form-group form-group-full"><span class="form-label">Description</span>
            <input id="newSkillDesc" class="form-input" /></label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" id="addSkillBtn">Add Skill</button>
        </div>
      </div>
      <h4 class="panel-title" style="margin-top:16px">Existing Skills (${skills.length})</h4>
      <ul class="list-stack">
        ${skills.map(s => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(s.name)}</span>
              <span class="list-row-sub">${esc(s.category || 'Uncategorised')}${s.description ? ' - ' + esc(s.description) : ''}</span>
            </div>
            <button class="btn btn-danger btn-xs" data-remove-skill="${s.id}">Remove</button>
          </li>
        `).join('') || '<li class="empty-row">No skills defined yet</li>'}
      </ul>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  $('#addSkillBtn').onclick = async () => {
    const name = $('#newSkillName').value;
    if (!name) return showToast('Skill name is required', 'error');
    try {
      await apiCall('/api/institution/skills', 'POST', {
        name,
        category: $('#newSkillCat').value || null,
        description: $('#newSkillDesc').value || null,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Skill added', 'success');
      openManageSkillsModal();
    } catch (e) { showToast(e.message, 'error'); }
  };

  document.querySelectorAll('[data-remove-skill]').forEach(b => {
    b.onclick = async () => {
      if (!await confirmDialog('Remove this skill and all associated assessments?')) return;
      try {
        await apiCall(`/api/institution/skills/${b.dataset.removeSkill}`, 'DELETE');
        closeModal();
        await loadAllData();
        rerenderRoleContent();
        showToast('Skill removed', 'success');
        openManageSkillsModal();
      } catch (e) { showToast(e.message, 'error'); }
    };
  });
}
function openComplianceRuleModal() {
  openModal({
    title: 'New Compliance Rule',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="crTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="crDesc" class="form-textarea" rows="2"></textarea></label>
      <label class="form-group">
        <span class="form-label">Programme (optional)</span>
        <select id="crProgramme" class="form-select">
          <option value="">Any</option>
          ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Target department</span>
          <input id="crDept" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Recurrence in months</span>
          <input id="crMonths" type="number" class="form-input" value="12" /></label>
      </div>
      <label class="checkbox-row">
        <input type="checkbox" id="crMandatory" checked />
        Mandatory for all selected trainees
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="crSave" class="btn btn-primary">Create Rule</button>`,
  });
  $('#crSave').onclick = async () => {
    const title = $('#crTitle').value;
    if (!title) return showToast('Title is required', 'error');
    try {
      await apiCall('/api/institution/compliance-rules', 'POST', {
        title,
        description: $('#crDesc').value || null,
        programme_id: $('#crProgramme').value ? Number($('#crProgramme').value) : null,
        target_department: $('#crDept').value || null,
        recurrence_months: Number($('#crMonths').value || 12),
        mandatory: $('#crMandatory').checked,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Compliance rule created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
function openAssignInstructorModal() {
  openModal({
    title: 'Assign Instructor',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Search experts</span>
        <input id="aiSearch" class="form-input" placeholder="Name, email, or specialization" /></label>
      <div id="aiResults" class="list-stack" style="margin-top:12px">
        ${S.experts.slice(0, 30).map(e => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(e.name)}</span>
              <span class="list-row-sub">${esc(e.specialization || '')} - ${fmtCur(e.hourly_rate || 0)}/hr</span>
            </div>
            <button class="btn btn-primary btn-xs" data-pick-instructor="${e.id}">Assign</button>
          </li>
        `).join('') || '<li class="empty-row">No experts available</li>'}
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
  function bindPickButtons() {
    document.querySelectorAll('[data-pick-instructor]').forEach(b => {
      b.onclick = async () => {
        try {
          await apiCall('/api/institution/instructors', 'POST', {
            expert_id: Number(b.dataset.pickInstructor),
          });
          closeModal();
          await loadAllData();
          rerenderRoleContent();
          showToast('Instructor assigned', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  }
  bindPickButtons();

  const search = $('#aiSearch');
  if (search) {
    search.oninput = debounce(() => {
      const q = search.value.toLowerCase();
      const filtered = S.experts.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.specialization || '').toLowerCase().includes(q)
      );
      $('#aiResults').innerHTML = filtered.slice(0, 30).map(e => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(e.name)}</span>
            <span class="list-row-sub">${esc(e.specialization || '')} - ${fmtCur(e.hourly_rate || 0)}/hr</span>
          </div>
          <button class="btn btn-primary btn-xs" data-pick-instructor="${e.id}">Assign</button>
        </li>
      `).join('') || '<li class="empty-row">No matches</li>';
      bindPickButtons();
    }, 250);
  }
}
function openInviteTeamMemberModal() {
  openModal({
    title: 'Invite Team Member',
    body: `
      <label class="form-group"><span class="form-label">Full name</span>
        <input id="tmName" class="form-input" required /></label>
      <label class="form-group"><span class="form-label">Email</span>
        <input id="tmEmail" type="email" class="form-input" required /></label>
      <label class="form-group">
        <span class="form-label">Role</span>
        <select id="tmRole" class="form-select">
          ${CONFIG.INSTITUTION_ROLES.map(r => `
            <option value="${r}">${r.replace('_', ' ')}</option>
          `).join('')}
        </select>
      </label>
      <p class="form-hint">A temporary password will be generated and shown once.</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tmSave" class="btn btn-primary">Send Invite</button>`,
  });
  $('#tmSave').onclick = async () => {
    const name = $('#tmName').value;
    const email = $('#tmEmail').value;
    if (!name || !email) return showToast('Name and email are required', 'error');
    try {
      const d = await apiCall('/api/institution/team/invite', 'POST', {
        name, email,
        institution_role: $('#tmRole').value,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Invite sent. Temporary password: ${d.temp_password}`, 'success', 8000);
    } catch (e) { showToast(e.message, 'error'); }
  };
}
function openChangeTeamRoleModal(userId) {
  const t = S.institutionTeam.find(x => String(x.id) === String(userId)) || {};
  openModal({
    title: 'Change Team Role',
    body: `
      <p><strong>${esc(t.name || '')}</strong></p>
      <label class="form-group">
        <span class="form-label">New role</span>
        <select id="ctrRole" class="form-select">
          ${CONFIG.INSTITUTION_ROLES.map(r => `
            <option value="${r}" ${t.institution_role === r ? 'selected' : ''}>
              ${r.replace('_', ' ')}
            </option>
          `).join('')}
        </select>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ctrSave" class="btn btn-primary">Update</button>`,
  });
  $('#ctrSave').onclick = async () => {
    try {
      await apiCall(`/api/institution/team/${userId}/role`, 'PUT', {
        institution_role: $('#ctrRole').value,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Role updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
function openTeamPermissionsModal(userId) {
  const permissions = [
    'manage_programmes', 'manage_cohorts', 'manage_trainees',
    'manage_assessments', 'issue_certificates', 'view_reports',
    'manage_branding', 'manage_team',
  ];
  openModal({
    title: 'Team Permissions',
    body: `
      <p class="form-hint" style="margin-bottom:14px">Toggle granular permissions for this team member.</p>
      ${permissions.map(p => `
        <label class="checkbox-row" style="margin-bottom:8px">
          <input type="checkbox" data-perm="${p}" />
          ${p.replace(/_/g, ' ')}
        </label>
      `).join('')}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tpSave" class="btn btn-primary">Save</button>`,
  });
  $('#tpSave').onclick = async () => {
    const list = Array.from(document.querySelectorAll('[data-perm]')).map(el => ({
      key: el.dataset.perm,
      granted: el.checked,
    }));
    try {
      await apiCall(`/api/institution/team/${userId}/permissions`, 'PUT', { permissions: list });
      closeModal();
      showToast('Permissions saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
function openOrgUnitModal(unitId) {
  const u = unitId ? (S.institutionOrgUnits.find(x => x.id === unitId) || {}) : {};
  openModal({
    title: unitId ? 'Edit Org Unit' : 'New Org Unit',
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="ouName" class="form-input" value="${esc(u.name || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="ouType" class="form-select">
          ${['department', 'branch', 'cost_centre', 'team'].map(t => `
            <option value="${t}" ${u.unit_type === t ? 'selected' : ''}>${t.replace('_', ' ')}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Code</span>
        <input id="ouCode" class="form-input" value="${esc(u.code || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Manager</span>
        <select id="ouManager" class="form-select">
          <option value="">Unassigned</option>
          ${S.institutionTeam.map(t => `
            <option value="${t.id}" ${u.manager_id === t.id ? 'selected' : ''}>${esc(t.name)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Budget amount</span>
        <input id="ouBudget" type="number" class="form-input" value="${u.budget_amount || 0}" /></label>
      <label class="checkbox-row">
        <input type="checkbox" id="ouActive" ${u.active === undefined || u.active ? 'checked' : ''} />
        Active
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ouSave" class="btn btn-primary">${unitId ? 'Save' : 'Create'}</button>`,
  });
  $('#ouSave').onclick = async () => {
    const payload = {
      name: $('#ouName').value,
      unit_type: $('#ouType').value,
      code: $('#ouCode').value || null,
      manager_id: $('#ouManager').value ? Number($('#ouManager').value) : null,
      budget_amount: Number($('#ouBudget').value || 0),
      active: $('#ouActive').checked,
    };
    if (!payload.name) return showToast('Name is required', 'error');
    try {
      if (unitId) await apiCall(`/api/institution/org-units/${unitId}`, 'PUT', payload);
      else        await apiCall('/api/institution/org-units', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(unitId ? 'Unit updated' : 'Unit created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
async function openReportPreviewModal(type) {
  try {
    showLoading(true);
    const endpoints = {
      'programme-scorecard': '/api/institution/reports/programme-scorecard',
      'cohort-comparison':   '/api/institution/reports/cohort-comparison',
      'trainee-progress':    '/api/institution/reports/trainee-progress-heatmap',
      'compliance':          '/api/institution/reports/compliance',
      'cost':                '/api/institution/reports/cost',
    };
    const titles = {
      'programme-scorecard': 'Programme Scorecard',
      'cohort-comparison':   'Cohort Comparison',
      'trainee-progress':    'Trainee Progress Heatmap',
      'compliance':          'Compliance Report',
      'cost':                'Cost Analysis',
    };
    const endpoint = endpoints[type];
    if (!endpoint) return;

    const d = await apiCall(endpoint);
    let content = '';

    if (type === 'programme-scorecard') {
      content = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Programme</th><th>Status</th><th>Enrolled</th>
                <th>Completed</th><th>Avg. Progress</th><th>Cost per Seat</th>
              </tr>
            </thead>
            <tbody>
              ${(d.scorecard || []).map(r => `
                <tr>
                  <td>${esc(r.title)}</td>
                  <td><span class="${statusClass(r.status)}">${esc(r.status)}</span></td>
                  <td>${r.total_enrolled || 0}</td>
                  <td>${r.total_completed || 0}</td>
                  <td>${Math.round(Number(r.avg_progress) || 0)}%</td>
                  <td>${fmtCur(r.cost_per_seat || 0)}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    } else if (type === 'cohort-comparison') {
      content = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Cohort</th><th>Programme</th><th>Enrolled</th><th>Avg. Progress</th><th>Avg. Score</th><th>Attendance</th></tr>
            </thead>
            <tbody>
              ${(d.cohorts || []).map(c => {
                const att = Number(c.attendance_total)
                  ? Math.round((Number(c.presents) / Number(c.attendance_total)) * 100)
                  : 0;
                return `
                  <tr>
                    <td>${esc(c.name)}</td>
                    <td>${esc(c.programme_title || '-')}</td>
                    <td>${c.enrolled || 0}</td>
                    <td>${Math.round(Number(c.avg_progress) || 0)}%</td>
                    <td>${Math.round(Number(c.avg_score) || 0)}%</td>
                    <td>${att}%</td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="6" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    } else if (type === 'trainee-progress') {
      const paceColours = { ahead: '#22c55e', on_track: '#84cc16', behind: '#f59e0b', at_risk: '#dc2626' };
      content = `
        <ul class="list-stack">
          ${(d.heatmap || []).map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.name)}</span>
                <span class="list-row-sub">${esc(t.department || '')} - ${esc(t.programme_title || '')}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="progress-bar" style="width:100px">
                  <span style="width:${t.progress}%;background:${paceColours[t.pace] || 'var(--brand)'}"></span>
                </div>
                <span style="font-weight:600;color:${paceColours[t.pace] || 'inherit'}">${t.progress}%</span>
              </div>
            </li>
          `).join('') || '<li class="empty-row">No data</li>'}
        </ul>`;
    } else if (type === 'compliance') {
      const statusMap = {
        valid: 'status-active', expiring_soon: 'status-pending',
        expired: 'status-rejected', revoked: 'status-rejected', no_expiry: 'status-active',
      };
      content = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Department</th><th>Certificate</th><th>Expires</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${(d.compliance || []).map(r => `
                <tr>
                  <td>${esc(r.name)}</td>
                  <td>${esc(r.department || '-')}</td>
                  <td>${esc(r.title || '-')}</td>
                  <td>${r.expires_at ? fmtDate(r.expires_at) : 'Never'}</td>
                  <td><span class="${statusMap[r.compliance_status] || 'chip chip-neutral'}">
                    ${esc((r.compliance_status || '').replace('_', ' '))}
                  </span></td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    } else if (type === 'cost') {
      content = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <div>Total programme cost: <strong>${fmtCur(d.total_cost || 0)}</strong></div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Programme</th><th>Seats</th><th>Cost per Seat</th><th>Trainer</th><th>Materials</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${(d.cost || []).map(r => `
                <tr>
                  <td>${esc(r.title)}</td>
                  <td>${r.seats}</td>
                  <td>${fmtCur(r.cost_per_seat)}</td>
                  <td>${fmtCur(r.trainer_cost)}</td>
                  <td>${fmtCur(r.materials_cost)}</td>
                  <td>${fmtCur(r.total_cost)}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    }

    openModal({
      title: titles[type],
      className: 'modal-lg',
      body: content,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
               <button class="btn btn-primary" id="reportExportBtn">
                 <i class="fas fa-download"></i> Export CSV</button>`,
    });

    $('#reportExportBtn').onclick = () => {
      const rows = d.scorecard || d.cohorts || d.heatmap || d.compliance || d.cost || [];
      if (!rows.length) return showToast('No data to export', 'warning');
      downloadCsv(`${type}-${Date.now()}.csv`, rows);
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
