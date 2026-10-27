/* ============================================================
   Institution — Modal Builders
   Add to 13-modals.js or load as extension.
   ============================================================ */

function openCampusModal(id = null) {
  const c = id ? (S.campuses || []).find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Campus' : 'New Campus',
    body: `
      <label class="form-group"><span class="form-label">Campus name</span>
        <input id="camName" class="form-input" value="${esc(c.name || '')}" /></label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="camType" class="form-select">
            ${['main','branch','satellite','partner'].map(t =>
              `<option value="${t}" ${c.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Capacity</span>
          <input id="camCapacity" type="number" class="form-input" value="${c.capacity || 0}" /></label>
      </div>
      <label class="form-group form-group-full"><span class="form-label">Address</span>
        <input id="camAddress" class="form-input" value="${esc(c.address || '')}" /></label>
      <label class="form-group"><span class="form-label">Contact phone</span>
        <input id="camPhone" class="form-input" value="${esc(c.contact_phone || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Manager</span>
        <select id="camManager" class="form-select">
          <option value="">Unassigned</option>
          ${(S.institutionTeam || []).map(t =>
            `<option value="${t.id}" ${c.manager_id === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
        </select>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" id="camMain" ${c.is_main ? 'checked' : ''} />
        Mark as main campus</label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="camSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#camSave').onclick = async () => {
    const payload = {
      name: $('#camName').value,
      type: $('#camType').value,
      capacity: Number($('#camCapacity').value || 0),
      address: $('#camAddress').value || null,
      contact_phone: $('#camPhone').value || null,
      manager_id: $('#camManager').value ? Number($('#camManager').value) : null,
      is_main: $('#camMain').checked,
    };
    if (!payload.name) return showToast('Name is required', 'error');
    try {
      if (id) await apiCall(`/api/institution/campuses/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/campuses', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Campus saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openPathBuilderModal(id) {
  const lp = (S.institutionLearningPaths || []).find(x => x.id === id);
  if (!lp) return;
  openModal({
    title: `Path Builder — ${esc(lp.title)}`,
    className: 'modal-lg',
    body: `
      <p class="form-hint">Steps are executed in order. Trainees unlock each next step after completing the previous.</p>
      <ul class="list-stack" style="margin-top:16px">
        ${(lp.steps || []).map((s, i) => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">Step ${i + 1}: ${esc(s.programme_title || 'Programme')}</span>
              <span class="list-row-sub">${esc(s.requirement || 'Complete all modules')}</span>
            </div>
            <button class="btn btn-danger btn-xs" data-remove-step="${s.id}">Remove</button>
          </li>`).join('') || '<li class="empty-row">No steps yet</li>'}
      </ul>
      <div class="panel-actions" style="margin-top:16px">
        <select id="pathProgramme" class="form-select">
          <option value="">Add programme...</option>
          ${(S.programmes || []).map(p =>
            `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="pathAddStep">Add Step</button>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
  $('#pathAddStep').onclick = async () => {
    const pid = $('#pathProgramme').value;
    if (!pid) return;
    try {
      await apiCall(`/api/institution/learning-paths/${id}/steps`, 'POST', { programme_id: Number(pid) });
      closeModal(); openPathBuilderModal(id);
    } catch (e) { showToast(e.message, 'error'); }
  };
  document.querySelectorAll('[data-remove-step]').forEach(b => {
    b.onclick = async () => {
      if (!await confirmDialog('Remove this step?')) return;
      await apiCall(`/api/institution/learning-paths/${id}/steps/${b.dataset.removeStep}`, 'DELETE');
      closeModal(); openPathBuilderModal(id);
    };
  });
}

function openProctorSessionModal() {
  openModal({
    title: 'Schedule Proctored Exam',
    body: `
      <label class="form-group"><span class="form-label">Trainee</span>
        <select id="psTrainee" class="form-select">
          ${(S.trainees || []).map(t =>
            `<option value="${t.id}">${esc(t.name)} — ${esc(t.email)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Assessment</span>
        <select id="psAssessment" class="form-select">
          ${(S.assessments || []).map(a =>
            `<option value="${a.id}">${esc(a.title)}</option>`).join('')}
        </select></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Scheduled</span>
          <input id="psWhen" type="datetime-local" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Duration (min)</span>
          <input id="psDuration" type="number" class="form-input" value="60" /></label>
      </div>
      <label class="form-group">
        <span class="form-label">Proctor mode</span>
        <select id="psMode" class="form-select">
          <option value="webcam">Webcam</option>
          <option value="screen">Screen share</option>
          <option value="ai">AI-only</option>
          <option value="live">Live human proctor</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="psSave" class="btn btn-primary">Schedule</button>`,
  });
  $('#psSave').onclick = async () => {
    const payload = {
      trainee_id: Number($('#psTrainee').value),
      assessment_id: Number($('#psAssessment').value),
      scheduled_at: $('#psWhen').value,
      duration_minutes: Number($('#psDuration').value),
      proctor_mode: $('#psMode').value,
    };
    if (!payload.trainee_id || !payload.assessment_id || !payload.scheduled_at)
      return showToast('Fill all required fields', 'error');
    try {
      await apiCall('/api/institution/proctor-sessions', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Proctored exam scheduled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openWellnessInterventionModal(alertId) {
  openModal({
    title: 'Wellness Intervention',
    body: `
      <label class="form-group"><span class="form-label">Intervention plan</span>
        <textarea id="wiPlan" class="form-textarea" rows="4"
                  placeholder="e.g. Schedule 1-on-1 check-in, share extra resources"></textarea></label>
      <label class="form-group"><span class="form-label">Follow-up date</span>
        <input id="wiFollowup" type="date" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="wiSave" class="btn btn-primary">Save & Notify</button>`,
  });
  $('#wiSave').onclick = async () => {
    try {
      await apiCall(`/api/institution/wellness/alerts/${alertId}/intervene`, 'POST', {
        plan: $('#wiPlan').value,
        follow_up: $('#wiFollowup').value || null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Intervention recorded', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openSuccessionAssignmentModal() {
  openModal({
    title: 'Assign Trainee to 9-Box',
    body: `
      <label class="form-group"><span class="form-label">Trainee</span>
        <select id="saTrainee" class="form-select">
          ${(S.trainees || []).map(t =>
            `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
        </select></label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Performance</span>
          <select id="saPerf" class="form-select">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select></label>
        <label class="form-group">
          <span class="form-label">Potential</span>
          <select id="saPot" class="form-select">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="saSave" class="btn btn-primary">Assign</button>`,
  });
  $('#saSave').onclick = async () => {
    try {
      await apiCall('/api/institution/succession/assign', 'POST', {
        trainee_id: Number($('#saTrainee').value),
        performance: $('#saPerf').value,
        potential: $('#saPot').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Trainee placed on grid', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openBudgetModal(id = null) {
  const b = id ? (S.budgetAllocations || []).find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Budget' : 'New Budget',
    body: `
      <label class="form-group"><span class="form-label">Department</span>
        <input id="budDept" class="form-input" value="${esc(b.department || '')}" /></label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Period</span>
          <select id="budPeriod" class="form-select">
            ${CONFIG.BUDGET_PERIODS.map(p =>
              `<option value="${p}" ${b.period === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Allocated</span>
          <input id="budAlloc" type="number" class="form-input" value="${b.allocated || 0}" /></label>
        <label class="form-group"><span class="form-label">Spent</span>
          <input id="budSpent" type="number" class="form-input" value="${b.spent || 0}" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="budSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#budSave').onclick = async () => {
    const payload = {
      department: $('#budDept').value,
      period: $('#budPeriod').value,
      allocated: Number($('#budAlloc').value || 0),
      spent: Number($('#budSpent').value || 0),
    };
    if (!payload.department) return showToast('Department required', 'error');
    try {
      if (id) await apiCall(`/api/institution/budgets/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/budgets', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Budget saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openBudgetTransactionsModal(budgetId) {
  const txns = (S.budgetTransactions || []).filter(t => t.budget_id === budgetId);
  openModal({
    title: 'Budget Transactions',
    body: `
      <ul class="list-stack">
        ${txns.map(t => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(t.description || 'Transaction')}</span>
              <span class="list-row-sub">${fmtDT(t.created_at)}</span>
            </div>
            <span class="list-row-price" style="color:${t.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
              ${t.amount >= 0 ? '+' : ''}${fmtCur(t.amount)}
            </span>
          </li>`).join('') || '<li class="empty-row">No transactions</li>'}
      </ul>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openReportDefinitionModal(id = null) {
  const d = id ? (S.savedReportDefinitions || []).find(x => x.id === id) : {};
  const fields = d.data_source ? CONFIG.REPORT_FIELD_LIBRARY[d.data_source] || [] : [];
  openModal({
    title: id ? 'Edit Report Definition' : 'New Report Definition',
    body: `
      <label class="form-group"><span class="form-label">Report name</span>
        <input id="rdName" class="form-input" value="${esc(d.name || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Data source</span>
        <select id="rdSource" class="form-select">
          <option value="">Select...</option>
          ${Object.keys(CONFIG.REPORT_FIELD_LIBRARY).map(k =>
            `<option value="${k}" ${d.data_source === k ? 'selected' : ''}>${k}</option>`).join('')}
        </select></label>
      <label class="form-group form-group-full">
        <span class="form-label">Columns (comma separated)</span>
        <input id="rdColumns" class="form-input"
               value="${esc((d.columns || []).join(', '))}"
               placeholder="name, email, department, progress" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rdSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#rdSave').onclick = async () => {
    const payload = {
      name: $('#rdName').value,
      data_source: $('#rdSource').value,
      columns: $('#rdColumns').value.split(',').map(s => s.trim()).filter(Boolean),
    };
    if (!payload.name || !payload.data_source) return showToast('Fill all required fields', 'error');
    try {
      if (id) await apiCall(`/api/institution/report-definitions/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/report-definitions', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Report definition saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openReportPreviewModalByData(d) {
  const rows = d.rows || [];
  const cols = d.columns || (rows[0] ? Object.keys(rows[0]) : []);
  openModal({
    title: d.name || 'Report Preview',
    className: 'modal-lg',
    body: `
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(r => `<tr>${cols.map(c => `<td>${esc(r[c] ?? '')}</td>`).join('')}</tr>`).join('') ||
              '<tr><td colspan="100%" class="empty-row">No rows</td></tr>'}
          </tbody>
        </table>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-primary" id="rpExport">
               <i class="fas fa-download"></i> Export CSV</button>`,
  });
  $('#rpExport').onclick = () => downloadCsv(`${d.name || 'report'}-${Date.now()}.csv`, rows);
}

function openAnnouncementModal(id = null) {
  const a = id ? (S.announcements || []).find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Announcement' : 'New Announcement',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="annTitle" class="form-input" value="${esc(a.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Body</span>
        <textarea id="annBody" class="form-textarea" rows="4">${esc(a.body || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Scope</span>
          <select id="annScope" class="form-select">
            ${CONFIG.ANNOUNCEMENT_SCOPES.map(s =>
              `<option value="${s}" ${a.scope === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></label>
        <label class="form-group">
          <span class="form-label">Priority</span>
          <select id="annPriority" class="form-select">
            ${CONFIG.ANNOUNCEMENT_PRIORITIES.map(p =>
              `<option value="${p}" ${a.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="annSave" class="btn btn-primary">${id ? 'Save' : 'Publish'}</button>`,
  });
  $('#annSave').onclick = async () => {
    const payload = {
      title: $('#annTitle').value,
      body: $('#annBody').value,
      scope: $('#annScope').value,
      priority: $('#annPriority').value,
    };
    if (!payload.title) return showToast('Title required', 'error');
    try {
      if (id) await apiCall(`/api/institution/announcements/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/announcements', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Announcement published', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openApiKeyModal() {
  openModal({
    title: 'New API Key',
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="akName" class="form-input" placeholder="e.g. HRIS Integration" /></label>
      <label class="form-group">
        <span class="form-label">Scopes</span>
        <select id="akScopes" class="form-select" multiple size="6">
          ${CONFIG.API_SCOPES.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select></label>
      <p class="form-hint">The full key will only be shown once after creation.</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="akSave" class="btn btn-primary">Create Key</button>`,
  });
  $('#akSave').onclick = async () => {
    const scopes = Array.from($('#akScopes').selectedOptions).map(o => o.value);
    try {
      const d = await apiCall('/api/institution/api-keys', 'POST', {
        name: $('#akName').value, scopes,
      });
      closeModal();
      await loadAllData(); rerenderRoleContent();
      openModal({
        title: 'API Key Created',
        body: `
          <p class="alert alert-warning" style="margin-bottom:12px">
            <i class="fas fa-exclamation-triangle"></i>
            Copy this key now. It cannot be shown again.</p>
          <textarea class="form-textarea" rows="2" readonly>${esc(d.key)}</textarea>`,
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openWebhookModal(id = null) {
  const h = id ? (S.webhooks || []).find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Webhook' : 'New Webhook',
    body: `
      <label class="form-group"><span class="form-label">URL</span>
        <input id="whUrl" class="form-input" value="${esc(h.url || '')}" placeholder="https://" /></label>
      <label class="form-group">
        <span class="form-label">Events</span>
        <select id="whEvents" class="form-select" multiple size="6">
          ${CONFIG.WEBHOOK_EVENTS.map(e =>
            `<option value="${e}" ${(h.events || []).includes(e) ? 'selected' : ''}>${e}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Signing secret</span>
        <input id="whSecret" class="form-input" value="${esc(h.secret || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="whSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#whSave').onclick = async () => {
    const payload = {
      url: $('#whUrl').value,
      events: Array.from($('#whEvents').selectedOptions).map(o => o.value),
      secret: $('#whSecret').value || null,
    };
    if (!payload.url) return showToast('URL required', 'error');
    try {
      if (id) await apiCall(`/api/institution/webhooks/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/webhooks', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Webhook saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openHireInstructorModal(id, name) {
  openModal({
    title: `Hire ${esc(name)}`,
    body: `
      <label class="form-group"><span class="form-label">Programme</span>
        <select id="hiProgramme" class="form-select">
          ${(S.programmes || []).map(p =>
            `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Rate per hour ($)</span>
          <input id="hiRate" type="number" class="form-input" /></label>
        <label class="form-group"><span class="form-label">NDA required?</span>
          <select id="hiNda" class="form-select">
            <option value="yes">Yes</option><option value="no">No</option>
          </select></label>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start date</span>
          <input id="hiStart" type="date" class="form-input" /></label>
        <label class="form-group"><span class="form-label">End date</span>
          <input id="hiEnd" type="date" class="form-input" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="hiSave" class="btn btn-primary">Create Contract</button>`,
  });
  $('#hiSave').onclick = async () => {
    try {
      await apiCall('/api/institution/instructor-contracts', 'POST', {
        instructor_id: id,
        programme_id: Number($('#hiProgramme').value),
        rate: Number($('#hiRate').value || 0),
        nda_required: $('#hiNda').value === 'yes',
        start_date: $('#hiStart').value || null,
        end_date: $('#hiEnd').value || null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Contract created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openInstructorRequestModal() {
  openModal({
    title: 'Post Instructor Requirement',
    body: `
      <label class="form-group"><span class="form-label">Specialization needed</span>
        <input id="irSpec" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Programme</span>
        <select id="irProgramme" class="form-select">
          <option value="">Any</option>
          ${(S.programmes || []).map(p =>
            `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Budget rate ($/hr)</span>
          <input id="irRate" type="number" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Start date</span>
          <input id="irStart" type="date" class="form-input" /></label>
      </div>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="irDesc" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="irSave" class="btn btn-primary">Post</button>`,
  });
  $('#irSave').onclick = async () => {
    try {
      await apiCall('/api/institution/marketplace/requests', 'POST', {
        specialization: $('#irSpec').value,
        programme_id: $('#irProgramme').value ? Number($('#irProgramme').value) : null,
        rate: Number($('#irRate').value || 0),
        start_date: $('#irStart').value || null,
        description: $('#irDesc').value || null,
      });
      closeModal(); showToast('Requirement posted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
