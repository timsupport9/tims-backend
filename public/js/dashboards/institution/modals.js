/* ============================================================
   ExpertHub 2.0 — Institution Modal Builders
   Provides openModal() consumers for every INSTITUTION_ACTIONS
   handler that requires a modal. Uses foundation's openModal().
   ============================================================ */

/* ── Generic modal helpers ─────────────────────────────────── */
function _field(name, label, opts = {}) {
  const { type = 'text', value = '', placeholder = '', id = name, required = false, rows = 3 } = opts;
  if (type === 'textarea') {
    return `<label class="form-group"><span class="form-label">${esc(label)}${required ? ' *' : ''}</span>
      <textarea id="${esc(id)}" class="form-textarea" rows="${rows}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}>${esc(value)}</textarea></label>`;
  }
  if (type === 'select') {
    const options = (opts.options || []).map(o => {
      const val = typeof o === 'object' ? o.value : o;
      const lbl = typeof o === 'object' ? o.label : o;
      return `<option value="${esc(val)}" ${String(value) === String(val) ? 'selected' : ''}>${esc(lbl)}</option>`;
    }).join('');
    return `<label class="form-group"><span class="form-label">${esc(label)}${required ? ' *' : ''}</span>
      <select id="${esc(id)}" class="form-select" ${required ? 'required' : ''}>${options}</select></label>`;
  }
  return `<label class="form-group"><span class="form-label">${esc(label)}${required ? ' *' : ''}</span>
    <input id="${esc(id)}" type="${type}" class="form-input" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} /></label>`;
}

function _wrapSave(btnId, onSave) {
  const btn = document.getElementById(btnId);
  if (btn) btn.onclick = onSave;
}

function _modal(title, body, footer, opts = {}) {
  return openModal({
    title,
    body,
    footer,
    className: opts.className || '',
    onClose: opts.onClose,
  });
}

/* ── PROGRAMMES ────────────────────────────────────────────── */
function openProgrammeModal(id = null) {
  const p = id ? (S.programmes || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Programme' : 'New Programme',
    `
      <div class="form-grid">
        ${_field('progTitle', 'Title', { value: p.title, required: true })}
        ${_field('progCode', 'Code', { value: p.code, placeholder: 'e.g. PROG-101' })}
        ${_field('progCategory', 'Category', { type: 'select', value: p.category, options: CONFIG.PROGRAMME_CATEGORIES.map(c => ({ value: c, label: capitalize(c.replace(/_/g, ' ')) })) })}
        ${_field('progStatus', 'Status', { type: 'select', value: p.status || 'draft', options: CONFIG.PROGRAMME_STATUSES.map(s => ({ value: s, label: capitalize(s.replace(/_/g, ' ')) })) })}
        ${_field('progStart', 'Start date', { type: 'date', value: p.start_date })}
        ${_field('progEnd', 'End date', { type: 'date', value: p.end_date })}
        ${_field('progCapacity', 'Capacity', { type: 'number', value: p.capacity || 30 })}
        ${_field('progPrice', 'Price', { type: 'number', value: p.price || 0 })}
      </div>
      ${_field('progDescription', 'Description', { type: 'textarea', value: p.description })}
      ${_field('progOutcomes', 'Learning outcomes (one per line)', { type: 'textarea', rows: 4, value: (p.learning_outcomes || []).join('\n') })}
    `,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="progSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('progSave', async () => {
    const payload = {
      title: $('#progTitle').value,
      code: $('#progCode').value,
      category: $('#progCategory').value,
      status: $('#progStatus').value,
      start_date: $('#progStart').value || null,
      end_date: $('#progEnd').value || null,
      capacity: Number($('#progCapacity').value || 0),
      price: Number($('#progPrice').value || 0),
      description: $('#progDescription').value,
      learning_outcomes: $('#progOutcomes').value.split('\n').map(s => s.trim()).filter(Boolean),
    };
    if (!payload.title) return showToast('Title required', 'error');
    try {
      if (id) await apiCall(`/api/institution/programmes/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/programmes', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Programme saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function openProgrammeDetailModal(id) {
  const p = (S.programmes || []).find(x => x.id === id);
  if (!p) return showToast('Programme not found', 'error');
  _modal(
    p.title || 'Programme',
    `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <span class="chip chip-blue">${esc(p.category || 'general')}</span>
        <span class="${statusClass(p.status)}">${esc(p.status)}</span>
        ${p.code ? `<span class="chip chip-neutral"><code>${esc(p.code)}</code></span>` : ''}
      </div>
      <p style="color:var(--text-soft)">${esc(p.description || '')}</p>
      <div class="form-grid">
        <div><p class="form-label">Start</p><p>${fmtDate(p.start_date)}</p></div>
        <div><p class="form-label">End</p><p>${fmtDate(p.end_date)}</p></div>
        <div><p class="form-label">Capacity</p><p>${p.capacity || 0}</p></div>
        <div><p class="form-label">Enrolled</p><p>${p.enrolled_count || 0}</p></div>
        <div><p class="form-label">Price</p><p>${p.price != null ? fmtCur(p.price) : '—'}</p></div>
        <div><p class="form-label">Cost per seat</p><p>${p.cost_per_seat != null ? fmtCur(p.cost_per_seat) : '—'}</p></div>
      </div>
      ${(p.learning_outcomes || []).length ? `
        <h4 class="form-label" style="margin-top:14px">Learning Outcomes</h4>
        <ul style="margin-top:6px">${p.learning_outcomes.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
    `,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    { className: 'modal-lg' }
  );
}

function openCurriculumModal(id) {
  _modal(
    'Curriculum',
    `<p class="form-hint">Module builder for programme #${id}. Curriculum steps appear in trainee portal.</p>
     <p class="empty-row">Load curriculum via <code>/api/institution/programmes/${id}/curriculum</code></p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}

function openProgrammeVersionsModal(id) {
  _modal(
    'Version History',
    `<p class="empty-row">Version history for programme #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}

function openProgrammeEvaluationsModal(id) {
  _modal(
    'Programme Evaluations',
    `<p class="empty-row">Evaluations for programme #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}

/* ── LEARNING PATHS ────────────────────────────────────────── */
function openLearningPathModal(id = null) {
  const lp = id ? (S.institutionLearningPaths || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Learning Path' : 'New Learning Path',
    `
      ${_field('lpTitle', 'Title', { value: lp.title, required: true })}
      ${_field('lpDescription', 'Description', { type: 'textarea', value: lp.description })}
      ${_field('lpBadge', 'Badge icon (e.g. fa-award)', { value: lp.badge_icon })}
      <label class="checkbox-row">
        <input type="checkbox" id="lpAutoEnroll" ${lp.auto_enroll ? 'checked' : ''} />
        Enable automated enrolment when prerequisites met
      </label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="lpSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('lpSave', async () => {
    const payload = {
      title: $('#lpTitle').value,
      description: $('#lpDescription').value,
      badge_icon: $('#lpBadge').value,
      auto_enroll: $('#lpAutoEnroll').checked,
    };
    if (!payload.title) return showToast('Title required', 'error');
    try {
      if (id) await apiCall(`/api/institution/learning-paths/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/learning-paths', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Learning path saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function openLearningPathDetailModal(id) {
  const lp = (S.institutionLearningPaths || []).find(x => x.id === id);
  if (!lp) return;
  _modal(
    lp.title || 'Learning Path',
    `<p>${esc(lp.description || '')}</p>
     <ul class="list-stack">
       ${(lp.steps || []).map((s, i) => `
         <li class="list-row">
           <div class="list-row-main">
             <span class="list-row-title">Step ${i + 1}: ${esc(s.programme_title || s.title || 'Programme')}</span>
             ${s.condition ? `<span class="list-row-sub">If: ${esc(s.condition)}</span>` : ''}
           </div>
         </li>`).join('')}
     </ul>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    { className: 'modal-lg' }
  );
}

function openPathBuilderModal(id) {
  const lp = (S.institutionLearningPaths || []).find(x => x.id === id);
  if (!lp) return;
  _modal(
    `Path Builder — ${esc(lp.title)}`,
    `
      <p class="form-hint">Steps execute in order. Trainees unlock the next step after the previous completes.</p>
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
          ${(S.programmes || []).map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="pathAddStep">Add Step</button>
      </div>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    { className: 'modal-lg' }
  );
  _wrapSave('pathAddStep', async () => {
    const pid = $('#pathProgramme').value;
    if (!pid) return;
    try {
      await apiCall(`/api/institution/learning-paths/${id}/steps`, 'POST', { programme_id: Number(pid) });
      closeModal(); openPathBuilderModal(id);
    } catch (e) { showToast(e.message, 'error'); }
  });
  document.querySelectorAll('[data-remove-step]').forEach(b => {
    b.onclick = async () => {
      if (!await confirmDialog('Remove this step?')) return;
      await apiCall(`/api/institution/learning-paths/${id}/steps/${b.dataset.removeStep}`, 'DELETE');
      closeModal(); openPathBuilderModal(id);
    };
  });
}

/* ── COHORTS ───────────────────────────────────────────────── */
function openCohortModal(id = null) {
  const c = id ? (S.cohorts || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Cohort' : 'New Cohort',
    `<div class="form-grid">
      ${_field('chName', 'Cohort name', { value: c.name, required: true })}
      ${_field('chProgramme', 'Programme', { type: 'select', value: c.programme_id, options: [{ value: '', label: '— Select —' }].concat((S.programmes || []).map(p => ({ value: p.id, label: p.title }))), required: true })}
      ${_field('chInstructor', 'Instructor', { type: 'select', value: c.instructor_id, options: [{ value: '', label: 'Unassigned' }].concat((S.instructors || []).map(i => ({ value: i.id, label: i.name }))) })}
      ${_field('chLocation', 'Location', { value: c.location })}
      ${_field('chStart', 'Start date', { type: 'date', value: c.start_date })}
      ${_field('chEnd', 'End date', { type: 'date', value: c.end_date })}
      ${_field('chCapacity', 'Capacity', { type: 'number', value: c.capacity || 30 })}
      ${_field('chStatus', 'Status', { type: 'select', value: c.status || 'draft', options: CONFIG.COHORT_STATUSES.map(s => ({ value: s, label: capitalize(s) })) })}
    </div>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="chSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('chSave', async () => {
    const payload = {
      name: $('#chName').value,
      programme_id: Number($('#chProgramme').value) || null,
      instructor_id: Number($('#chInstructor').value) || null,
      location: $('#chLocation').value || null,
      start_date: $('#chStart').value || null,
      end_date: $('#chEnd').value || null,
      capacity: Number($('#chCapacity').value || 0),
      status: $('#chStatus').value,
    };
    if (!payload.name) return showToast('Name required', 'error');
    try {
      if (id) await apiCall(`/api/institution/cohorts/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/cohorts', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Cohort saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function openCohortDetailModal(id) {
  const c = (S.cohorts || []).find(x => x.id === id);
  if (!c) return;
  _modal(
    c.name || 'Cohort',
    `<div class="form-grid">
      <div><p class="form-label">Programme</p><p>${esc(c.programme_title || '—')}</p></div>
      <div><p class="form-label">Instructor</p><p>${esc(c.instructor_name || 'Unassigned')}</p></div>
      <div><p class="form-label">Start</p><p>${fmtDate(c.start_date)}</p></div>
      <div><p class="form-label">End</p><p>${fmtDate(c.end_date)}</p></div>
      <div><p class="form-label">Capacity</p><p>${c.trainee_count || 0} / ${c.capacity || 0}</p></div>
      <div><p class="form-label">Status</p><p>${esc(c.status)}</p></div>
    </div>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}

function openWaitlistModal(id) {
  _modal(
    'Waitlist',
    `<p class="empty-row">Waitlist for cohort #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}
function openCohortTransferModal(id) {
  _modal(
    'Transfer Trainees',
    `<p class="empty-row">Transfer workflow for cohort #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}
function openGroupMessageModal() {
  _modal(
    'Group Message',
    `<label class="form-group"><span class="form-label">Message</span>
       <textarea id="gmBody" class="form-textarea" rows="5"></textarea></label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="gmSend" class="btn btn-primary">Send</button>`
  );
  _wrapSave('gmSend', () => {
    showToast('Message sent', 'success');
    closeModal();
  });
}
function openCohortAttendanceModal(id) {
  _modal(
    'Cohort Attendance',
    `<p class="empty-row">Attendance overview for cohort #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}
function openBulkAssignTraineesModal() {
  _modal(
    'Bulk Assign Trainees',
    `<label class="form-group"><span class="form-label">Target cohort</span>
       <select id="baCohort" class="form-select">
         ${(S.cohorts || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
       </select></label>
     <label class="form-group"><span class="form-label">Trainee emails (one per line)</span>
       <textarea id="baEmails" class="form-textarea" rows="6" placeholder="jane@example.com&#10;john@example.com"></textarea></label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="baSave" class="btn btn-primary">Assign</button>`
  );
  _wrapSave('baSave', async () => {
    const emails = $('#baEmails').value.split('\n').map(e => e.trim()).filter(Boolean);
    try {
      await apiCall(`/api/institution/cohorts/${$('#baCohort').value}/bulk-assign`, 'POST', { emails });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast(`${emails.length} trainee(s) assigned`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

/* ── SESSIONS ──────────────────────────────────────────────── */
function openSessionModal(id = null) {
  const s = id ? (S.institutionSessions || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Session' : 'Schedule Session',
    `<div class="form-grid">
      ${_field('sTitle', 'Session title', { value: s.title, required: true })}
      ${_field('sCohort', 'Cohort', { type: 'select', value: s.cohort_id, options: [{ value: '', label: '— Select —' }].concat((S.cohorts || []).map(c => ({ value: c.id, label: c.name }))) })}
      ${_field('sInstructor', 'Instructor', { type: 'select', value: s.instructor_id, options: [{ value: '', label: 'Unassigned' }].concat((S.instructors || []).map(i => ({ value: i.id, label: i.name }))) })}
      ${_field('sWhen', 'Scheduled at', { type: 'datetime-local', value: s.scheduled_at })}
      ${_field('sDuration', 'Duration (min)', { type: 'number', value: s.duration_minutes || 60 })}
      ${_field('sMode', 'Mode', { type: 'select', value: s.mode || 'in_person', options: CONFIG.SESSION_MODES.map(m => ({ value: m, label: capitalize(m.replace(/_/g, ' ')) })) })}
    </div>
    ${_field('sMeetingUrl', 'Meeting URL (if online)', { value: s.meeting_url, placeholder: 'https://' })}
    <label class="checkbox-row">
      <input type="checkbox" id="sQr" ${s.qr_checkin_enabled ? 'checked' : ''} />
      Enable QR check-in for attendance
    </label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="sSave" class="btn btn-primary">${id ? 'Save' : 'Schedule'}</button>`,
    { className: 'modal-lg' }
  );
  _wrapSave('sSave', async () => {
    const payload = {
      title: $('#sTitle').value,
      cohort_id: Number($('#sCohort').value) || null,
      instructor_id: Number($('#sInstructor').value) || null,
      scheduled_at: $('#sWhen').value,
      duration_minutes: Number($('#sDuration').value),
      mode: $('#sMode').value,
      meeting_url: $('#sMeetingUrl').value || null,
      qr_checkin_enabled: $('#sQr').checked,
    };
    if (!payload.title || !payload.scheduled_at) return showToast('Fill all required fields', 'error');
    try {
      if (id) await apiCall(`/api/institution/sessions/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/sessions', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Session saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function openRescheduleModal(id) {
  _modal(
    'Reschedule Session',
    `<label class="form-group"><span class="form-label">New date/time</span>
       <input id="rsWhen" type="datetime-local" class="form-input" /></label>
     ${_field('rsReason', 'Reason', { type: 'textarea', rows: 2 })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="rsSave" class="btn btn-primary">Reschedule</button>`
  );
  _wrapSave('rsSave', async () => {
    try {
      await apiCall(`/api/institution/sessions/${id}/reschedule`, 'POST', {
        scheduled_at: $('#rsWhen').value,
        reason: $('#rsReason').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Session rescheduled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function openAttendanceModal(id) {
  _modal(
    'Mark Attendance',
    `<p class="empty-row">Attendance for session #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    { className: 'modal-lg' }
  );
}

function openSessionQrModal(id) {
  _modal(
    'Session QR',
    `<div style="text-align:center">
       <img src="/api/institution/sessions/${id}/qr" alt="Session QR code"
            style="max-width:280px;margin:0 auto" />
       <p class="form-hint">Scan to check in.</p>
     </div>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}

function openEvaluationsModal(id) {
  _modal(
    'Session Evaluations',
    `<p class="empty-row">Evaluations for session #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}

function uploadMaterialFromForm() {
  const title = $('#matTitle')?.value;
  const cohortId = $('#matCohort')?.value;
  const file = $('#matFile')?.files?.[0];
  if (!title || !file) return showToast('Title and file required', 'error');
  showToast(`Upload started for "${title}"`, 'info');
}
function openMaterialAccessModal(id) {
  _modal(
    'Material Access',
    `<p class="empty-row">Access rules for material #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`
  );
}

/* ── ASSESSMENTS ───────────────────────────────────────────── */
function openAssessmentModal(id = null) {
  const a = id ? (S.assessments || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Assessment' : 'New Assessment',
    `<div class="form-grid">
      ${_field('asTitle', 'Title', { value: a.title, required: true })}
      ${_field('asType', 'Type', { type: 'select', value: a.type || 'exam', options: CONFIG.ASSESSMENT_TYPES.map(t => ({ value: t, label: capitalize(t) })) })}
      ${_field('asCohort', 'Cohort', { type: 'select', value: a.cohort_id, options: [{ value: '', label: '— Select —' }].concat((S.cohorts || []).map(c => ({ value: c.id, label: c.name }))) })}
      ${_field('asWeight', 'Weight (%)', { type: 'number', value: a.weight || 20 })}
      ${_field('asDue', 'Due date', { type: 'date', value: a.due_date })}
      ${_field('asScale', 'Grading scale', { type: 'select', value: a.grading_scale || 'percentage', options: Object.entries(CONFIG.GRADING_POLICIES).map(([k, v]) => ({ value: k, label: v.label })) })}
    </div>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="asSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('asSave', async () => {
    const payload = {
      title: $('#asTitle').value,
      type: $('#asType').value,
      cohort_id: Number($('#asCohort').value) || null,
      weight: Number($('#asWeight').value),
      due_date: $('#asDue').value,
      grading_scale: $('#asScale').value,
    };
    if (!payload.title) return showToast('Title required', 'error');
    try {
      if (id) await apiCall(`/api/institution/assessments/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/assessments', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Assessment saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function openAssessmentDetailModal(id) {
  _modal('Assessment Detail', `<p class="empty-row">Assessment #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openGradingModal(id) {
  _modal('Grade Submissions', `<p class="empty-row">Grading UI for assessment #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openModerationModal(id) {
  _modal('Moderation', `<p class="empty-row">Moderation workflow for assessment #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openRubricsModal(id) {
  _modal('Rubrics', `<p class="empty-row">Rubrics for assessment #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openResitModal(id) {
  _modal('Resit Management', `<p class="empty-row">Resit setup for assessment #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openAppealsModal(id) {
  _modal('Appeals', `<p class="empty-row">Appeals for assessment #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}

/* ── PROCTOR ───────────────────────────────────────────────── */
function openProctorSessionModal() {
  _modal(
    'Schedule Proctored Exam',
    `<label class="form-group"><span class="form-label">Trainee</span>
       <select id="psTrainee" class="form-select">
         ${(S.trainees || []).map(t => `<option value="${t.id}">${esc(t.name)} — ${esc(t.email)}</option>`).join('')}
       </select></label>
     <label class="form-group"><span class="form-label">Assessment</span>
       <select id="psAssessment" class="form-select">
         ${(S.assessments || []).map(a => `<option value="${a.id}">${esc(a.title)}</option>`).join('')}
       </select></label>
     <div class="form-grid">
       ${_field('psWhen', 'Scheduled', { type: 'datetime-local' })}
       ${_field('psDuration', 'Duration (min)', { type: 'number', value: 60 })}
     </div>
     ${_field('psMode', 'Proctor mode', { type: 'select', value: 'webcam', options: ['webcam','screen','ai','live'].map(v => ({ value: v, label: capitalize(v) })) })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="psSave" class="btn btn-primary">Schedule</button>`
  );
  _wrapSave('psSave', async () => {
    const payload = {
      trainee_id: Number($('#psTrainee').value),
      assessment_id: Number($('#psAssessment').value),
      scheduled_at: $('#psWhen').value,
      duration_minutes: Number($('#psDuration').value),
      proctor_mode: $('#psMode').value,
    };
    if (!payload.scheduled_at) return showToast('Schedule time required', 'error');
    try {
      await apiCall('/api/institution/proctor-sessions', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Proctored exam scheduled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openProctorSessionDetailModal(id) {
  _modal('Proctor Session', `<p class="empty-row">Session #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openIdentityVerificationModal(id) {
  _modal('Identity Verification', `<p class="empty-row">Verify identity for session #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openAccessibilityModal(id) {
  _modal('Accessibility Accommodations',
    `<p class="form-hint">Accommodations are confidential and shown only to the proctor.</p>
     <label class="checkbox-row"><input type="checkbox" /> Extra time (50%)</label>
     <label class="checkbox-row"><input type="checkbox" /> Screen reader</label>
     <label class="checkbox-row"><input type="checkbox" /> Frequent breaks</label>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openIncidentTimelineModal(id) {
  _modal('Incident Timeline', `<p class="empty-row">Timeline for session #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openFlagReviewModal(id) {
  _modal('Review Flag',
    `<p class="empty-row">Flag #${id}</p>
     <label class="form-group"><span class="form-label">Human review decision</span>
       <textarea id="frNotes" class="form-textarea" rows="4" placeholder="Document your review..."></textarea></label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="frSave" class="btn btn-primary">Submit Review</button>`);
  _wrapSave('frSave', async () => {
    try {
      await apiCall(`/api/institution/proctor-flags/${id}/review`, 'POST', { notes: $('#frNotes').value });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Review saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openEvidenceReviewModal(id) {
  _modal('Evidence Review', `<p class="empty-row">Evidence for flag #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openRetentionSettingsModal() {
  _modal('Retention Settings',
    `<p class="form-hint">Enforced policy: <strong>${CONFIG.RETENTION_POLICIES.exam_recordings_days} days</strong> for exam recordings.</p>
     <p class="form-hint">Changing requires escalation to compliance.</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openAppealDetailModal(id) {
  _modal('Appeal', `<p class="empty-row">Appeal #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openResolveAppealModal(id) {
  _modal('Resolve Appeal',
    `<label class="form-group"><span class="form-label">Decision</span>
       <select id="raDecision" class="form-select">
         <option value="uphold">Uphold original</option>
         <option value="overturn">Overturn — re-grade</option>
         <option value="partial">Partial — adjust</option>
       </select></label>
     ${_field('raNotes', 'Notes', { type: 'textarea' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="raSave" class="btn btn-primary">Submit</button>`);
  _wrapSave('raSave', async () => {
    try {
      await apiCall(`/api/institution/appeals/${id}/resolve`, 'POST', {
        decision: $('#raDecision').value,
        notes: $('#raNotes').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Appeal resolved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

/* ── QUESTION BANK ─────────────────────────────────────────── */
function openQuestionModal(id = null) {
  const q = id ? (S.institutionQuestions || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Question' : 'New Question',
    `${_field('qText', 'Question text', { type: 'textarea', value: q.question_text, required: true })}
     <div class="form-grid">
       ${_field('qType', 'Type', { type: 'select', value: q.question_type || 'multiple_choice', options: ['multiple_choice','true_false','short_answer','essay','matching','fill_blank'].map(t => ({ value: t, label: capitalize(t.replace(/_/g, ' ')) })) })}
       ${_field('qDifficulty', 'Difficulty', { type: 'select', value: q.difficulty || 'medium', options: ['easy','medium','hard','expert'].map(d => ({ value: d, label: capitalize(d) })) })}
       ${_field('qCategory', 'Category', { value: q.category })}
       ${_field('qPoints', 'Points', { type: 'number', value: q.points || 1 })}
     </div>
     ${_field('qTags', 'Tags (comma separated)', { value: (q.tags || []).join(', ') })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="qSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
    { className: 'modal-lg' }
  );
  _wrapSave('qSave', async () => {
    const payload = {
      question_text: $('#qText').value,
      question_type: $('#qType').value,
      difficulty: $('#qDifficulty').value,
      category: $('#qCategory').value,
      points: Number($('#qPoints').value || 1),
      tags: $('#qTags').value.split(',').map(t => t.trim()).filter(Boolean),
    };
    if (!payload.question_text) return showToast('Question text required', 'error');
    try {
      if (id) await apiCall(`/api/institution/questions/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/questions', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Question saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openItemAnalysisModal(id) {
  _modal('Item Analysis', `<p class="empty-row">Analysis for question #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openQuestionHistoryModal(id) {
  _modal('Question History', `<p class="empty-row">Version history for question #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openRejectQuestionModal(id) {
  _modal('Reject Question',
    `${_field('rqReason', 'Reason', { type: 'textarea', required: true })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="rqSave" class="btn btn-danger">Reject</button>`);
  _wrapSave('rqSave', async () => {
    try {
      await apiCall(`/api/institution/questions/${id}/reject`, 'POST', { reason: $('#rqReason').value });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Question rejected', 'info');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openBulkImportQuestionsModal() {
  _modal('Bulk Import Questions',
    `<p class="form-hint">Upload CSV with columns: question_text, type, difficulty, category, points</p>
     <input type="file" id="bqFile" class="form-input" accept=".csv" />`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="bqSave" class="btn btn-primary">Import</button>`);
  _wrapSave('bqSave', () => { showToast('Bulk import queued', 'success'); closeModal(); });
}

/* ── PROJECTS ──────────────────────────────────────────────── */
function openProjectModal(id = null) {
  const p = id ? (S.projects || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Project' : 'New Project',
    `<div class="form-grid">
      ${_field('prTitle', 'Title', { value: p.title, required: true })}
      ${_field('prCategory', 'Category', { value: p.category || 'Capstone' })}
      ${_field('prCohort', 'Cohort', { type: 'select', value: p.cohort_id, options: [{ value: '', label: '— Select —' }].concat((S.cohorts || []).map(c => ({ value: c.id, label: c.name }))) })}
      ${_field('prDeadline', 'Deadline', { type: 'date', value: p.deadline })}
    </div>
    ${_field('prDescription', 'Description', { type: 'textarea', value: p.description })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="prSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('prSave', async () => {
    const payload = {
      title: $('#prTitle').value,
      category: $('#prCategory').value,
      cohort_id: Number($('#prCohort').value) || null,
      deadline: $('#prDeadline').value,
      description: $('#prDescription').value,
    };
    if (!payload.title) return showToast('Title required', 'error');
    try {
      if (id) await apiCall(`/api/institution/projects/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/projects', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Project saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openProjectDetailModal(id) {
  _modal('Project', `<p class="empty-row">Project #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openProjectGradingModal(id) {
  _modal('Grade Project', `<p class="empty-row">Grading UI for project #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openMilestonesModal(id) {
  _modal('Milestones', `<p class="empty-row">Milestones for project #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openProjectTeamsModal(id) {
  _modal('Teams', `<p class="empty-row">Teams for project #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openUploadEvidenceModal(id) {
  _modal('Upload Evidence',
    `<input type="file" class="form-input" />`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button class="btn btn-primary" onclick="showToast('Upload queued','success');closeModal()">Upload</button>`);
}
function openProjectRubricsModal(id) {
  _modal('Rubrics', `<p class="empty-row">Rubrics for project #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openPeerEvaluationsModal(id) {
  _modal('Peer Evaluations', `<p class="empty-row">Peer evaluations for project #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}

/* ── CERTIFICATIONS ────────────────────────────────────────── */
function openIssueCertificateModal() {
  _modal(
    'Issue Certificate',
    `<div class="form-grid">
      ${_field('icTrainee', 'Trainee', { type: 'select', options: [{ value: '', label: '— Select —' }].concat((S.trainees || []).map(t => ({ value: t.id, label: t.name }))) })}
      ${_field('icProgramme', 'Programme', { type: 'select', options: [{ value: '', label: '— Select —' }].concat((S.programmes || []).map(p => ({ value: p.id, label: p.title }))) })}
      ${_field('icTemplate', 'Template', { type: 'select', value: 'standard', options: CONFIG.CERTIFICATE_TEMPLATES.map(t => ({ value: t.code, label: t.label })) })}
      ${_field('icExpires', 'Expires (optional)', { type: 'date' })}
      ${_field('icCpd', 'CPD points', { type: 'number', value: 0 })}
    </div>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="icSave" class="btn btn-primary">Issue</button>`
  );
  _wrapSave('icSave', async () => {
    const payload = {
      trainee_id: Number($('#icTrainee').value),
      programme_id: Number($('#icProgramme').value),
      template_code: $('#icTemplate').value,
      expires_at: $('#icExpires').value || null,
      cpd_points: Number($('#icCpd').value || 0),
    };
    if (!payload.trainee_id || !payload.programme_id) return showToast('Select trainee & programme', 'error');
    try {
      await apiCall('/api/institution/certificates', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Certificate issued', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openRenewCertificateModal(id) {
  _modal('Renew Certificate',
    `<label class="form-group"><span class="form-label">New expiry</span>
       <input id="rcDate" type="date" class="form-input" /></label>
     ${_field('rcReason', 'Reason', { type: 'textarea' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="rcSave" class="btn btn-primary">Renew</button>`);
  _wrapSave('rcSave', async () => {
    try {
      await apiCall(`/api/institution/certificates/${id}/renew`, 'POST', {
        expires_at: $('#rcDate').value,
        reason: $('#rcReason').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Certificate renewed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openRevokeCertificateModal(id) {
  _modal('Revoke Certificate',
    `${_field('rvReason', 'Revocation reason', { type: 'textarea', required: true })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="rvSave" class="btn btn-danger">Revoke</button>`);
  _wrapSave('rvSave', async () => {
    try {
      await apiCall(`/api/institution/certificates/${id}/revoke`, 'POST', { reason: $('#rvReason').value });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Certificate revoked', 'info');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openCertificateQrModal(id) {
  _modal('Certificate QR',
    `<div style="text-align:center">
       <img src="/api/institution/certificates/${id}/qr" alt="QR" style="max-width:240px;margin:0 auto"/>
       <p class="form-hint">Scan to verify authenticity.</p>
     </div>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openShareCredentialModal(id) {
  _modal('Share Credential',
    `<p class="form-hint">Copy a verifiable share link.</p>
     <input id="scUrl" class="form-input" readonly
            value="${window.location.origin}/verify/${id}" />`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>
     <button class="btn btn-primary"
        onclick="navigator.clipboard.writeText(document.getElementById('scUrl').value);showToast('Copied','success');closeModal()">Copy Link</button>`);
}
function openDigitalSignatureModal(id) {
  _modal('Digital Signature',
    `<p class="form-hint">Sign certificate with your institution key.</p>
     <p class="empty-row">Key signer for certificate #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button class="btn btn-primary" onclick="showToast('Signed','success');closeModal()">Sign</button>`);
}
function openRevocationAuditModal(id) {
  _modal('Revocation Audit', `<p class="empty-row">Audit for certificate #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openCertTemplatesModal() {
  _modal('Certificate Templates',
    `<ul class="list-stack">
      ${CONFIG.CERTIFICATE_TEMPLATES.map(t => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(t.label)}</span>
            <span class="list-row-sub">Fields: ${t.fields.join(', ')}</span>
          </div>
          <button class="btn btn-secondary btn-xs" onclick="showToast('Template editor','info')">Edit</button>
        </li>`).join('')}
    </ul>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}

/* ── TRAINEES ──────────────────────────────────────────────── */
function openInviteTraineeModal() {
  _modal('Invite Trainees',
    `<label class="form-group"><span class="form-label">Emails (one per line)</span>
       <textarea id="invEmails" class="form-textarea" rows="6"></textarea></label>
     <label class="form-group"><span class="form-label">Cohort (optional)</span>
       <select id="invCohort" class="form-select">
         <option value="">— None —</option>
         ${(S.cohorts || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
       </select></label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="invSave" class="btn btn-primary">Send Invites</button>`);
  _wrapSave('invSave', async () => {
    const emails = $('#invEmails').value.split('\n').map(e => e.trim()).filter(Boolean);
    try {
      await apiCall('/api/institution/trainees/invite', 'POST', { emails, cohort_id: $('#invCohort').value || null });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast(`${emails.length} invitation(s) sent`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openImportHistoryModal() {
  _modal('Import History',
    `<p class="empty-row">Past bulk imports will appear here.</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openValidateBulkImportModal() {
  _modal('Validate CSV Import',
    `<p class="form-hint">Upload CSV with columns: name, email, department, job_title, employee_id</p>
     <input type="file" id="vbiFile" class="form-input" accept=".csv" />`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="vbiSave" class="btn btn-primary">Validate</button>`);
  _wrapSave('vbiSave', () => { showToast('Validation running', 'info'); closeModal(); });
}
function openRejectEnrolmentModal(id) {
  _modal('Reject Enrolment',
    `${_field('reReason', 'Reason', { type: 'textarea', required: true })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="reSave" class="btn btn-danger">Reject</button>`);
  _wrapSave('reSave', async () => {
    try {
      await apiCall(`/api/institution/enrollments/${id}/reject`, 'PUT', { reason: $('#reReason').value });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Enrolment rejected', 'info');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openTraineeDetailModal(id) {
  _modal('Trainee Profile', `<p class="empty-row">Trainee #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openTraineeTransferModal(id) {
  _modal('Transfer Trainee',
    `<label class="form-group"><span class="form-label">Target cohort</span>
       <select id="ttCohort" class="form-select">
         ${(S.cohorts || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
       </select></label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="ttSave" class="btn btn-primary">Transfer</button>`);
  _wrapSave('ttSave', async () => {
    try {
      await apiCall(`/api/institution/trainees/${id}/transfer`, 'POST', { cohort_id: Number($('#ttCohort').value) });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Trainee transferred', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openTraineeNotesModal(id) {
  _modal('Intervention Notes',
    `${_field('tnNotes', 'Notes', { type: 'textarea', rows: 6 })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="tnSave" class="btn btn-primary">Save</button>`);
  _wrapSave('tnSave', async () => {
    try {
      await apiCall(`/api/institution/trainees/${id}/notes`, 'POST', { notes: $('#tnNotes').value });
      closeModal();
      showToast('Notes saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openTraineeHistoryModal(id) {
  _modal('Enrolment History', `<p class="empty-row">History for trainee #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openTraineeContactsModal(id) {
  _modal('Guardian & Employer Contacts', `<p class="empty-row">Contacts for trainee #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openTraineeAchievementsModal(id) {
  _modal('Achievements', `<p class="empty-row">Achievements for trainee #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}

/* ── WELLNESS ──────────────────────────────────────────────── */
function openWellnessInterventionModal(id) {
  _modal('Wellness Intervention',
    `${_field('wiPlan', 'Intervention plan', { type: 'textarea', rows: 4 })}
     ${_field('wiFollowup', 'Follow-up date', { type: 'date' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="wiSave" class="btn btn-primary">Save & Notify</button>`);
  _wrapSave('wiSave', async () => {
    try {
      await apiCall(`/api/institution/wellness/alerts/${id}/intervene`, 'POST', {
        plan: $('#wiPlan').value, follow_up: $('#wiFollowup').value || null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Intervention recorded', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openWellnessFollowupModal(id) {
  _modal('Wellness Follow-up',
    `${_field('wfuNotes', 'Follow-up notes', { type: 'textarea', rows: 4 })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="wfuSave" class="btn btn-primary">Save</button>`);
  _wrapSave('wfuSave', () => { showToast('Follow-up saved', 'success'); closeModal(); });
}
function openWellnessReferralModal() {
  _modal('Confidential Referral',
    `<p class="alert alert-warning"><i class="fas fa-lock"></i> This referral is confidential.</p>
     ${_field('wrTrainee', 'Trainee (optional)', { type: 'select', options: [{ value: '', label: 'Anonymous' }].concat((S.trainees || []).map(t => ({ value: t.id, label: t.name }))) })}
     ${_field('wrReason', 'Reason', { type: 'textarea', rows: 3 })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="wrSave" class="btn btn-primary">Refer</button>`);
  _wrapSave('wrSave', async () => {
    try {
      await apiCall('/api/institution/wellness/referrals', 'POST', {
        trainee_id: $('#wrTrainee').value || null,
        reason: $('#wrReason').value,
      });
      closeModal();
      showToast('Referral submitted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openInterventionDetailModal(id) {
  _modal('Intervention', `<p class="empty-row">Intervention #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openEngagementSurveyModal() {
  _modal('New Survey',
    `${_field('svTitle', 'Title', { required: true })}
     ${_field('svStarts', 'Starts', { type: 'date' })}
     ${_field('svEnds', 'Ends', { type: 'date' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="svSave" class="btn btn-primary">Create Draft</button>`);
  _wrapSave('svSave', async () => {
    try {
      await apiCall('/api/institution/surveys', 'POST', {
        title: $('#svTitle').value,
        starts_at: $('#svStarts').value || null,
        ends_at: $('#svEnds').value || null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Survey created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openSurveyDetailModal(id) {
  _modal('Survey', `<p class="empty-row">Survey #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}

/* ── SKILLS ────────────────────────────────────────────────── */
function openManageSkillsModal() {
  _modal('Manage Skills',
    `<p class="empty-row">Skill list editor</p>
     ${_field('msName', 'New skill name', { placeholder: 'e.g. Project Management' })}`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>
     <button id="msSave" class="btn btn-primary">Add Skill</button>`);
  _wrapSave('msSave', async () => {
    try {
      await apiCall('/api/institution/skills', 'POST', { name: $('#msName').value });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Skill added', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openFrameworksModal() {
  _modal('Competency Frameworks', `<p class="empty-row">Framework manager</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openRoleRequirementsModal() {
  _modal('Role Requirements', `<p class="empty-row">Role-based skill requirements</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openBulkAssessSkillsModal() {
  _modal('Bulk Assess Skills',
    `<p class="form-hint">Upload CSV with trainee email, skill, level</p>
     <input type="file" class="form-input" accept=".csv" />`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button class="btn btn-primary" onclick="showToast('Bulk assessment queued','success');closeModal()">Upload</button>`);
}

/* ── SKILLS GAP ────────────────────────────────────────────── */
function openClosureTargetsModal() {
  _modal('Gap Closure Targets', `<p class="empty-row">Configure targets</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openGapDetailModal(id) {
  _modal('Gap Detail', `<p class="empty-row">Gap #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openAssignTrainingModal(programmeId, skillId) {
  _modal('Assign Training',
    `<p class="form-hint">Assign programme <strong>#${programmeId}</strong> to close skill gap.</p>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="atSave" class="btn btn-primary">Assign</button>`);
  _wrapSave('atSave', async () => {
    try {
      await apiCall('/api/institution/skills-gap/assign-training', 'POST', {
        programme_id: programmeId, skill_id: skillId,
      });
      closeModal();
      showToast('Training assigned', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

/* ── COMPLIANCE ────────────────────────────────────────────── */
function openComplianceRuleModal(id = null) {
  const r = id ? (S.institutionComplianceRules || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Rule' : 'New Compliance Rule',
    `<div class="form-grid">
      ${_field('crTitle', 'Title', { value: r.title, required: true })}
      ${_field('crCategory', 'Category', { value: r.category })}
      ${_field('crRecurrence', 'Recurrence (months)', { type: 'number', value: r.recurrence_months || 12 })}
    </div>
    <label class="checkbox-row">
      <input type="checkbox" id="crMandatory" ${r.mandatory ? 'checked' : ''} /> Mandatory
    </label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="crSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('crSave', async () => {
    const payload = {
      title: $('#crTitle').value,
      category: $('#crCategory').value,
      recurrence_months: Number($('#crRecurrence').value),
      mandatory: $('#crMandatory').checked,
    };
    if (!payload.title) return showToast('Title required', 'error');
    try {
      if (id) await apiCall(`/api/institution/compliance/rules/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/compliance/rules', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Rule saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openComplianceEvidenceModal(id) {
  _modal('Compliance Evidence',
    `<input type="file" class="form-input" />`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openRuleHistoryModal(id) {
  _modal('Rule Run History', `<p class="empty-row">History for rule #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openAuditModal() {
  _modal('New Audit',
    `${_field('auTitle', 'Title', { required: true })}
     ${_field('auDue', 'Due date', { type: 'date' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="auSave" class="btn btn-primary">Create</button>`);
  _wrapSave('auSave', async () => {
    try {
      await apiCall('/api/institution/compliance/audits', 'POST', {
        title: $('#auTitle').value, due_date: $('#auDue').value || null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Audit created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openAuditDetailModal(id) {
  _modal('Audit', `<p class="empty-row">Audit #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openEscalationModal(id) {
  _modal('Escalation', `<p class="empty-row">Escalation #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openCorrectiveActionModal(id) {
  _modal('Corrective Action', `<p class="empty-row">Action #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}

/* ── SUCCESSION ────────────────────────────────────────────── */
function openSuccessionAssignmentModal() {
  _modal('Assign Trainee to 9-Box',
    `<label class="form-group"><span class="form-label">Trainee</span>
       <select id="saTrainee" class="form-select">
         ${(S.trainees || []).map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
       </select></label>
     <div class="form-grid">
       ${_field('saPerf', 'Performance', { type: 'select', options: ['low','medium','high'].map(v => ({ value: v, label: capitalize(v) })) })}
       ${_field('saPot', 'Potential', { type: 'select', options: ['low','medium','high'].map(v => ({ value: v, label: capitalize(v) })) })}
     </div>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="saSave" class="btn btn-primary">Assign</button>`);
  _wrapSave('saSave', async () => {
    try {
      await apiCall('/api/institution/succession/assign', 'POST', {
        trainee_id: Number($('#saTrainee').value),
        performance: $('#saPerf').value,
        potential: $('#saPot').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Trainee placed on grid', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openCriticalRolesModal() { _modal('Critical Roles', `<p class="empty-row">Critical roles manager</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openTalentPoolsModal() { _modal('Talent Pools', `<p class="empty-row">Talent pool manager</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openMentoringModal() { _modal('Mentoring', `<p class="empty-row">Mentoring manager</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openCriticalRoleDetailModal(id) { _modal('Role', `<p class="empty-row">Role #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openSuccessionScenarioModal(id) { _modal('Succession Scenario', `<p class="empty-row">Scenario for role #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openTalentPoolDetailModal(id) { _modal('Talent Pool', `<p class="empty-row">Pool #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openMentoringDetailModal(id) { _modal('Mentoring', `<p class="empty-row">Pair #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openReviewDecisionModal(id) { _modal('Review Decision', `<p class="empty-row">Decision #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }

/* ── IDP ───────────────────────────────────────────────────── */
function openIDPModal(id, traineeId) {
  const p = id ? (S.individualDevelopmentPlans || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit IDP' : 'New Development Plan',
    `<div class="form-grid">
      ${_field('idpTrainee', 'Trainee', { type: 'select', value: p.trainee_id || traineeId, options: (S.trainees || []).map(t => ({ value: t.id, label: t.name })), required: true })}
      ${_field('idpTarget', 'Target date', { type: 'date', value: p.target_date })}
    </div>
    ${_field('idpGoal', 'Development goal', { type: 'textarea', value: p.goal, required: true })}
    ${_field('idpSkills', 'Target skills (comma separated)', { value: (p.target_skills || []).join(', ') })}
    ${_field('idpPath', 'Learning path', { type: 'select', value: p.learning_path_id, options: [{ value: '', label: '— None —' }].concat((S.institutionLearningPaths || []).map(lp => ({ value: lp.id, label: lp.title }))) })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="idpSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
    { className: 'modal-lg' }
  );
  _wrapSave('idpSave', async () => {
    const payload = {
      trainee_id: Number($('#idpTrainee').value),
      goal: $('#idpGoal').value,
      target_date: $('#idpTarget').value || null,
      target_skills: $('#idpSkills').value.split(',').map(s => s.trim()).filter(Boolean),
      learning_path_id: $('#idpPath').value ? Number($('#idpPath').value) : null,
    };
    if (!payload.goal) return showToast('Goal required', 'error');
    try {
      if (id) await apiCall(`/api/institution/idp/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/idp', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Development plan saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

/* ── INSTRUCTORS ───────────────────────────────────────────── */
function openInstructorModal() {
  _modal('Add Instructor',
    `<div class="form-grid">
      ${_field('inName', 'Name', { required: true })}
      ${_field('inEmail', 'Email', { type: 'email' })}
      ${_field('inSpecialization', 'Specialization', {})}
      ${_field('inRate', 'Hourly rate', { type: 'number' })}
    </div>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="inSave" class="btn btn-primary">Add</button>`);
  _wrapSave('inSave', async () => {
    try {
      await apiCall('/api/institution/instructors', 'POST', {
        name: $('#inName').value,
        email: $('#inEmail').value,
        specialization: $('#inSpecialization').value,
        hourly_rate: Number($('#inRate').value || 0),
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Instructor added', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openInstructorDetailModal(id) { _modal('Instructor', `<p class="empty-row">Instructor #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openQualificationsModal(id) { _modal('Qualifications', `<p class="empty-row">Quals for #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openAvailabilityModal(id) { _modal('Availability', `<p class="empty-row">Availability for #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openWorkloadModal(id) { _modal('Workload', `<p class="empty-row">Workload for #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openInstructorContractsModal(id) { _modal('Contracts', `<p class="empty-row">Contracts for #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openInstructorEvaluationsModal(id) { _modal('Evaluations', `<p class="empty-row">Evaluations for #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openInstructorPaymentsModal(id) { _modal('Payments', `<p class="empty-row">Payments for #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openInstructorCPDModal(id) { _modal('CPD', `<p class="empty-row">CPD for #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openInstructorReplacementModal(id) { _modal('Replacement', `<p class="empty-row">Replacement for #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }

/* ── MARKETPLACE ───────────────────────────────────────────── */
function openInstructorRequestModal() {
  _modal('Post Instructor Requirement',
    `${_field('irSpec', 'Specialization needed', { required: true })}
     ${_field('irRate', 'Budget rate ($/hr)', { type: 'number' })}
     ${_field('irStart', 'Start date', { type: 'date' })}
     ${_field('irDesc', 'Description', { type: 'textarea' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="irSave" class="btn btn-primary">Post</button>`);
  _wrapSave('irSave', async () => {
    try {
      await apiCall('/api/institution/marketplace/requests', 'POST', {
        specialization: $('#irSpec').value,
        rate: Number($('#irRate').value || 0),
        start_date: $('#irStart').value || null,
        description: $('#irDesc').value,
      });
      closeModal(); showToast('Requirement posted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openHireInstructorModal(id, name) {
  _modal(`Hire ${esc(name || 'Instructor')}`,
    `${_field('hiProgramme', 'Programme', { type: 'select', options: (S.programmes || []).map(p => ({ value: p.id, label: p.title })) })}
     ${_field('hiRate', 'Rate/hour', { type: 'number' })}
     ${_field('hiStart', 'Start', { type: 'date' })}
     ${_field('hiEnd', 'End', { type: 'date' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="hiSave" class="btn btn-primary">Create Contract</button>`);
  _wrapSave('hiSave', async () => {
    try {
      await apiCall('/api/institution/instructor-contracts', 'POST', {
        instructor_id: id,
        programme_id: Number($('#hiProgramme').value),
        rate: Number($('#hiRate').value || 0),
        start_date: $('#hiStart').value || null,
        end_date: $('#hiEnd').value || null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Contract created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openRequestQuoteModal(id) {
  _modal('Request Quote',
    `${_field('rqNotes', 'Requirements', { type: 'textarea' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button class="btn btn-primary" onclick="showToast('Quote requested','success');closeModal()">Send</button>`);
}
function openCompareQuotesModal(id) {
  _modal('Compare Quotes', `<p class="empty-row">Quotes for RFP #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}
function openContractDetailModal(id) { _modal('Contract', `<p class="empty-row">#${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openAmendContractModal(id) { _modal('Amend Contract', `<p class="empty-row">#${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Cancel</button>
   <button class="btn btn-primary" onclick="showToast('Amended','success');closeModal()">Save</button>`); }
function openRateInstructorModal(id) { _modal('Rate Instructor',
  `<label class="form-group"><span class="form-label">Rating</span>
     <select id="rtVal" class="form-select">
       ${[1,2,3,4,5].map(n => `<option value="${n}">${n} star${n === 1 ? '' : 's'}</option>`).join('')}
     </select></label>
   ${_field('rtNotes', 'Notes', { type: 'textarea' })}`,
  `<button class="btn btn-secondary" data-close-modal>Cancel</button>
   <button class="btn btn-primary" onclick="showToast('Rating saved','success');closeModal()">Submit</button>`); }

/* ── BUDGETS ───────────────────────────────────────────────── */
function openBudgetModal(id = null) {
  const b = id ? (S.budgetAllocations || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Budget' : 'New Budget',
    `${_field('budDept', 'Department', { value: b.department, required: true })}
     <div class="form-grid">
       ${_field('budPeriod', 'Period', { type: 'select', value: b.period || 'monthly', options: CONFIG.BUDGET_PERIODS.map(p => ({ value: p, label: capitalize(p) })) })}
       ${_field('budAlloc', 'Allocated', { type: 'number', value: b.allocated || 0 })}
       ${_field('budSpent', 'Spent', { type: 'number', value: b.spent || 0 })}
     </div>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="budSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('budSave', async () => {
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
  });
}
function openBudgetTransactionsModal(budgetId) {
  const txns = (S.budgetTransactions || []).filter(t => t.budget_id === budgetId);
  _modal('Budget Transactions',
    `<ul class="list-stack">
       ${txns.map(t => `
         <li class="list-row">
           <div class="list-row-main">
             <span class="list-row-title">${esc(t.description || '—')}</span>
             <span class="list-row-sub">${fmtDT(t.created_at)}</span>
           </div>
           <span style="color:${t.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
             ${t.amount >= 0 ? '+' : ''}${fmtCur(t.amount)}
           </span>
         </li>`).join('') || '<li class="empty-row">No transactions</li>'}
     </ul>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
function openBudgetForecastModal(id) { _modal('Forecast vs Actual', `<p class="empty-row">#${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openBudgetRoiModal(id) { _modal('Training ROI', `<p class="empty-row">#${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }
function openBudgetRequestModal() {
  _modal('Budget Request',
    `${_field('brDept', 'Department', { required: true })}
     ${_field('brAmount', 'Amount', { type: 'number', required: true })}
     ${_field('brPurpose', 'Purpose', { type: 'textarea' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="brSave" class="btn btn-primary">Submit</button>`);
  _wrapSave('brSave', async () => {
    try {
      await apiCall('/api/institution/budgets/requests', 'POST', {
        department: $('#brDept').value,
        amount: Number($('#brAmount').value),
        purpose: $('#brPurpose').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Request submitted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openInvoiceModal(id) { _modal('Invoice', `<p class="empty-row">#${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }

/* ── CAMPUSES ──────────────────────────────────────────────── */
function openCampusModal(id = null) {
  const c = id ? (S.campuses || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Campus' : 'New Campus',
    `${_field('camName', 'Campus name', { value: c.name, required: true })}
     <div class="form-grid">
       ${_field('camType', 'Type', { type: 'select', value: c.type || 'main', options: ['main','branch','satellite','partner'].map(t => ({ value: t, label: capitalize(t) })) })}
       ${_field('camCapacity', 'Capacity', { type: 'number', value: c.capacity || 0 })}
     </div>
     ${_field('camAddress', 'Address', { value: c.address })}
     ${_field('camPhone', 'Phone', { value: c.contact_phone })}
     <label class="checkbox-row">
       <input type="checkbox" id="camMain" ${c.is_main ? 'checked' : ''} /> Mark as main campus
     </label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="camSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('camSave', async () => {
    const payload = {
      name: $('#camName').value,
      type: $('#camType').value,
      capacity: Number($('#camCapacity').value || 0),
      address: $('#camAddress').value || null,
      contact_phone: $('#camPhone').value || null,
      is_main: $('#camMain').checked,
    };
    if (!payload.name) return showToast('Name required', 'error');
    try {
      if (id) await apiCall(`/api/institution/campuses/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/campuses', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Campus saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openCampusResourcesModal(id) { _modal('Campus Resources', `<p class="empty-row">#${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openCampusDashboardModal(id) { _modal('Campus Dashboard', `<p class="empty-row">#${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openCrossCampusEnrolModal(id) { _modal('Cross-Campus Enrolment', `<p class="empty-row">#${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`); }

/* ── REPORTS ───────────────────────────────────────────────── */
function openScheduleReportModal(id = null, definitionId = null) {
  _modal(
    id ? 'Edit Scheduled Report' : 'Schedule Report',
    `${_field('srTemplate', 'Report template', { value: '', required: true, placeholder: 'e.g. Monthly Compliance' })}
     ${_field('srFreq', 'Frequency', { type: 'select', value: 'monthly', options: ['daily','weekly','monthly','quarterly'].map(f => ({ value: f, label: capitalize(f) })) })}
     ${_field('srFormat', 'Format', { type: 'select', value: 'pdf', options: ['pdf','excel','csv'].map(f => ({ value: f, label: f.toUpperCase() })) })}
     ${_field('srRecipients', 'Recipients (comma separated emails)', { value: '' })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="srSave" class="btn btn-primary">Save</button>`
  );
  _wrapSave('srSave', async () => {
    try {
      await apiCall('/api/institution/scheduled-reports', 'POST', {
        template_name: $('#srTemplate').value,
        frequency: $('#srFreq').value,
        format: $('#srFormat').value,
        recipients: $('#srRecipients').value.split(',').map(r => r.trim()).filter(Boolean),
        definition_id: definitionId,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Report scheduled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openQuickReport(type) {
  showLoading(true);
  apiCall(`/api/institution/reports/quick/${type}`)
    .then(d => {
      showLoading(false);
      openReportPreviewModalByData({ name: type, columns: d.columns, rows: d.rows });
    })
    .catch(e => { showLoading(false); showToast(e.message, 'error'); });
}

/* ── REPORT BUILDER ────────────────────────────────────────── */
function openReportDefinitionModal(id = null) {
  const d = id ? (S.savedReportDefinitions || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Report Definition' : 'New Report Definition',
    `${_field('rdName', 'Report name', { value: d.name, required: true })}
     ${_field('rdSource', 'Data source', { type: 'select', value: d.data_source, options: [{ value: '', label: '— Select —' }].concat(Object.keys(CONFIG.REPORT_FIELD_LIBRARY).map(k => ({ value: k, label: capitalize(k) }))), required: true })}
     ${_field('rdColumns', 'Columns (comma separated)', { value: (d.columns || []).join(', ') })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="rdSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('rdSave', async () => {
    const payload = {
      name: $('#rdName').value,
      data_source: $('#rdSource').value,
      columns: $('#rdColumns').value.split(',').map(s => s.trim()).filter(Boolean),
    };
    if (!payload.name || !payload.data_source) return showToast('Fill required fields', 'error');
    try {
      if (id) await apiCall(`/api/institution/report-definitions/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/report-definitions', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Report saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openReportPreviewModalByData(d) {
  const rows = d.rows || [];
  const cols = d.columns || (rows[0] ? Object.keys(rows[0]) : []);
  _modal(
    d.name || 'Report Preview',
    `<div class="table-wrapper">
       <table class="data-table">
         <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
         <tbody>
           ${rows.map(r => `<tr>${cols.map(c => `<td>${esc(r[c] ?? '')}</td>`).join('')}</tr>`).join('') ||
             '<tr><td colspan="100%" class="empty-row">No rows</td></tr>'}
         </tbody>
       </table>
     </div>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>
     <button class="btn btn-primary" id="rpExport"><i class="fas fa-download"></i> Export CSV</button>`,
    { className: 'modal-lg' }
  );
  _wrapSave('rpExport', () => downloadCsv(`${d.name || 'report'}-${Date.now()}.csv`, rows, cols));
}

/* ── ANNOUNCEMENTS ─────────────────────────────────────────── */
function openAnnouncementModal(id = null) {
  const a = id ? (S.announcements || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Announcement' : 'New Announcement',
    `${_field('annTitle', 'Title', { value: a.title, required: true })}
     ${_field('annBody', 'Body', { type: 'textarea', value: a.body, rows: 4 })}
     <div class="form-grid">
       ${_field('annScope', 'Scope', { type: 'select', value: a.scope || 'all', options: CONFIG.ANNOUNCEMENT_SCOPES.map(s => ({ value: s, label: capitalize(s) })) })}
       ${_field('annPriority', 'Priority', { type: 'select', value: a.priority || 'normal', options: CONFIG.ANNOUNCEMENT_PRIORITIES.map(p => ({ value: p, label: capitalize(p) })) })}
       ${_field('annScheduledAt', 'Schedule at (optional)', { type: 'datetime-local', value: a.scheduled_at })}
     </div>
     <label class="checkbox-row">
       <input type="checkbox" id="annAck" ${a.requires_acknowledgement ? 'checked' : ''} />
       Require acknowledgement from recipients
     </label>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="annSave" class="btn btn-primary">${id ? 'Save' : 'Publish'}</button>`,
    { className: 'modal-lg' }
  );
  _wrapSave('annSave', async () => {
    const payload = {
      title: $('#annTitle').value,
      body: $('#annBody').value,
      scope: $('#annScope').value,
      priority: $('#annPriority').value,
      scheduled_at: $('#annScheduledAt').value || null,
      requires_acknowledgement: $('#annAck').checked,
    };
    if (!payload.title) return showToast('Title required', 'error');
    try {
      if (id) await apiCall(`/api/institution/announcements/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/announcements', 'POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Announcement saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openAcknowledgementsModal(id) {
  _modal('Acknowledgements', `<p class="empty-row">Acks for announcement #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}

/* ── INTEGRATIONS ──────────────────────────────────────────── */
function openApiKeyModal() {
  _modal('New API Key',
    `${_field('akName', 'Name', { required: true })}
     <label class="form-group"><span class="form-label">Scopes</span>
       <select id="akScopes" class="form-select" multiple size="6">
         ${CONFIG.API_SCOPES.map(s => `<option value="${s}">${esc(s)}</option>`).join('')}
       </select></label>
     <p class="form-hint">The full key will only be shown once.</p>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="akSave" class="btn btn-primary">Create Key</button>`);
  _wrapSave('akSave', async () => {
    const scopes = Array.from($('#akScopes').selectedOptions).map(o => o.value);
    try {
      const d = await apiCall('/api/institution/api-keys', 'POST', { name: $('#akName').value, scopes });
      closeModal(); await loadAllData(); rerenderRoleContent();
      _modal('API Key Created',
        `<p class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Copy now. Cannot be shown again.</p>
         <textarea class="form-textarea" rows="2" readonly>${esc(d.key)}</textarea>`,
        `<button class="btn btn-secondary" data-close-modal>Close</button>`);
    } catch (e) { showToast(e.message, 'error'); }
  });
}
function openWebhookModal(id = null) {
  const h = id ? (S.webhooks || []).find(x => x.id === id) : {};
  _modal(
    id ? 'Edit Webhook' : 'New Webhook',
    `${_field('whUrl', 'URL', { value: h.url, required: true, placeholder: 'https://' })}
     <label class="form-group"><span class="form-label">Events</span>
       <select id="whEvents" class="form-select" multiple size="6">
         ${CONFIG.WEBHOOK_EVENTS.map(e =>
           `<option value="${e}" ${(h.events || []).includes(e) ? 'selected' : ''}>${esc(e)}</option>`).join('')}
       </select></label>
     ${_field('whSecret', 'Signing secret', { value: h.secret })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="whSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`
  );
  _wrapSave('whSave', async () => {
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
  });
}
function openWebhookQueueModal(id) {
  _modal('Webhook Retry Queue', `<p class="empty-row">Queue for webhook #${id}</p>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' });
}

/* ── SECURITY ──────────────────────────────────────────────── */
function openSessionPolicyModal() {
  _modal('Session Policy',
    `${_field('spTimeout', 'Idle timeout (minutes)', { type: 'number', value: 480 })}
     ${_field('spMaxSessions', 'Max concurrent sessions', { type: 'number', value: 3 })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button class="btn btn-primary" onclick="showToast('Session policy saved','success');closeModal()">Save</button>`);
}

/* ── OPERATIONS ────────────────────────────────────────────── */
function openWorkflowsModal() { _modal('Approval Workflows',
  `<ul class="list-stack">
     ${Object.entries(CONFIG.APPROVAL_WORKFLOWS).map(([name, wf]) => `
       <li class="list-row">
         <div class="list-row-main">
           <span class="list-row-title">${esc(capitalize(name.replace(/_/g, ' ')))}</span>
           <span class="list-row-sub">Steps: ${wf.steps.join(' → ')} · SLA ${wf.sla_hours}h</span>
         </div>
       </li>`).join('')}
   </ul>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openWorkflowEditorModal(id) { _modal('Workflow Editor', `<p class="empty-row">#${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openChangeRoleModal(id) {
  _modal('Change Role',
    `${_field('croleRole', 'New role', { type: 'select', options: CONFIG.INSTITUTION_ROLES.map(r => ({ value: r, label: capitalize(r.replace(/_/g, ' ')) })) })}`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button class="btn btn-primary" onclick="showToast('Role updated','success');closeModal()">Save</button>`);
}
function openManagePermissionsModal(id) { _modal('Permissions', `<p class="empty-row">Permissions for #${id}</p>`,
  `<button class="btn btn-secondary" data-close-modal>Close</button>`, { className: 'modal-lg' }); }
function openInviteTeamMemberModal() {
  _modal('Invite Team Member',
    `<div class="form-grid">
      ${_field('itName', 'Name', { required: true })}
      ${_field('itEmail', 'Email', { type: 'email', required: true })}
      ${_field('itRole', 'Role', { type: 'select', options: CONFIG.INSTITUTION_ROLES.map(r => ({ value: r, label: capitalize(r.replace(/_/g, ' ')) })) })}
    </div>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="itSave" class="btn btn-primary">Invite</button>`);
  _wrapSave('itSave', async () => {
    try {
      await apiCall('/api/institution/team/invite', 'POST', {
        name: $('#itName').value,
        email: $('#itEmail').value,
        role: $('#itRole').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Invitation sent', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

/* ── PROFILE ───────────────────────────────────────────────── */
function openAddAccreditationModal() {
  _modal('Add Accreditation',
    `<div class="form-grid">
      ${_field('acBody', 'Accrediting body', { required: true })}
      ${_field('acNumber', 'Number', {})}
      ${_field('acIssued', 'Issued', { type: 'date' })}
      ${_field('acExpires', 'Expires', { type: 'date' })}
    </div>`,
    `<button class="btn btn-secondary" data-close-modal>Cancel</button>
     <button id="acSave" class="btn btn-primary">Add</button>`);
  _wrapSave('acSave', async () => {
    try {
      await apiCall('/api/institution/accreditations', 'POST', {
        body: $('#acBody').value,
        number: $('#acNumber').value,
        issued_at: $('#acIssued').value || null,
        expires_at: $('#acExpires').value || null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Accreditation added', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

/* ── GLOBAL SEARCH / NOTIFICATIONS ─────────────────────────── */
function openGlobalSearchModal() {
  _modal('Search',
    `<input id="global-search-input" class="form-input" placeholder="Search trainees, programmes, cohorts, certificates…"
            style="margin-bottom:12px" />
     <div id="globalSearchResults"></div>`,
    `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    { className: 'modal-lg' }
  );
  setTimeout(() => document.getElementById('global-search-input')?.focus(), 100);
}

function openNotificationCenterModal() {
  const notifs = S.notifications || [];
  _modal('Notifications',
    notifs.length ? `<ul class="list-stack">
      ${notifs.map(n => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(n.title)}</span>
            <span class="list-row-sub">${fmtDT(n.created_at)}</span>
          </div>
          ${n.read ? '' : `<span class="chip chip-blue" style="font-size:.65rem">New</span>`}
        </li>`).join('')}
    </ul>` : '<p class="empty-row">You have no notifications.</p>',
    `<button class="btn btn-secondary" data-close-modal>Close</button>`);
}
