/* ============================================================
   ExpertHub 2.0 — 13f-modals-institution-settings.js
   Institution settings, branding, integrations (SSO/API/webhooks),
   budgets, report definitions, and announcements.
   ============================================================ */

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
