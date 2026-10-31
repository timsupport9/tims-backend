/* ============================================================
   ExpertHub 2.0 — 13d-modals-expert.js
   Expert-facing modal builders (portfolio, slots, courses, tiers).
   ============================================================ */

function openPortfolioItemModal(itemId) {
  const item = itemId ? (S.expertPortfolio.find(x => x.id === itemId) || {}) : {};
  openModal({
    title: itemId ? 'Edit Portfolio Item' : 'Add Portfolio Item',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="piTitle" class="form-input" value="${esc(item.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Category</span>
        <input id="piCat" class="form-input" value="${esc(item.category || 'Case Study')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="piDesc" class="form-textarea" rows="4">${esc(item.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Link (optional)</span>
        <input id="piLink" class="form-input" value="${esc(item.link || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="piSave" class="btn btn-primary">${itemId ? 'Save' : 'Add'}</button>`,
  });
  $('#piSave').onclick = async () => {
    await apiCall('/api/expert/portfolio', 'POST', {
      title: $('#piTitle').value, category: $('#piCat').value,
      description: $('#piDesc').value, link: $('#piLink').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Portfolio saved', 'success');
  };
}

function openManageSlotsModal() {
  openModal({
    title: 'Generate Slots',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Date</span>
        <input id="msDate" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start hour</span>
          <input id="msStartHour" type="number" class="form-input" value="9" min="0" max="23" /></label>
        <label class="form-group"><span class="form-label">End hour</span>
          <input id="msEndHour" type="number" class="form-input" value="17" min="1" max="24" /></label>
        <label class="form-group"><span class="form-label">Slot duration (min)</span>
          <select id="msDuration" class="form-select">
            ${[15,30,45,60,90].map(d => `<option value="${d}" ${d === 30 ? 'selected' : ''}>${d}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Price per slot</span>
          <input id="msPrice" type="number" class="form-input" value="${currentUser?.hourly_rate || 50}" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="msSave" class="btn btn-primary">Generate Slots</button>`,
  });
  $('#msSave').onclick = async () => {
    const date = $('#msDate').value;
    const startHour = Number($('#msStartHour').value);
    const endHour = Number($('#msEndHour').value);
    const duration = Number($('#msDuration').value);
    const price = Number($('#msPrice').value);
    if (startHour >= endHour) return showToast('Invalid hours', 'error');
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += duration) {
        const start = new Date(`${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
        const end = new Date(start.getTime() + duration * 60000);
        if (end.getHours() > endHour || (end.getHours() === endHour && end.getMinutes() > 0)) continue;
        slots.push({ start: start.toISOString(), end: end.toISOString(), duration, price, type: 'video' });
      }
    }
    if (!slots.length) return showToast('No valid slots', 'error');
    showLoading(true);
    const d = await apiCall('/api/experts/me/slots', 'POST', { slots });
    closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
    showToast(`Created ${d.created || slots.length} slots`, 'success');
  };
}

function openBlockTimeModal() {
  openModal({
    title: 'Block Time',
    body: `
      <label class="form-group"><span class="form-label">Start</span>
        <input id="btStart" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End</span>
        <input id="btEnd" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Reason</span>
        <input id="btReason" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="btSave" class="btn btn-warning">Block Time</button>`,
  });
  $('#btSave').onclick = async () => {
    await apiCall('/api/experts/me/block-time', 'POST', {
      start: $('#btStart').value, end: $('#btEnd').value,
      reason: $('#btReason').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Time blocked', 'success');
  };
}

function openEditTiersModal() {
  const tiers = S.consultationTiers.length ? S.consultationTiers : [
    { name: 'Quick', duration_minutes: 15, price: 30, description: '' },
    { name: 'Standard', duration_minutes: 30, price: 60, description: '' },
    { name: 'Deep Dive', duration_minutes: 60, price: 110, description: '' },
  ];
  openModal({
    title: 'Edit Pricing Tiers',
    className: 'modal-lg',
    body: `
      <p class="form-hint">Define your session tiers. Clients choose a tier when booking.</p>
      ${[0, 1, 2].map(i => `
        <div class="form-grid" style="margin-bottom:12px;padding:12px;background:var(--surface-2);border-radius:8px">
          <label class="form-group"><span class="form-label">Tier ${i+1} name</span>
            <input id="tier${i}Name" class="form-input" value="${esc(tiers[i]?.name || '')}" /></label>
          <label class="form-group"><span class="form-label">Duration (min)</span>
            <input id="tier${i}Duration" type="number" class="form-input" value="${tiers[i]?.duration_minutes || ''}" /></label>
          <label class="form-group"><span class="form-label">Price ($)</span>
            <input id="tier${i}Price" type="number" class="form-input" value="${tiers[i]?.price || ''}" /></label>
          <label class="form-group form-group-full"><span class="form-label">Description</span>
            <input id="tier${i}Desc" class="form-input" value="${esc(tiers[i]?.description || '')}" /></label>
        </div>
      `).join('')}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tiersSave" class="btn btn-primary">Save Tiers</button>`,
  });
  $('#tiersSave').onclick = async () => {
    const list = [0,1,2].map(i => ({
      name: $(`#tier${i}Name`).value,
      duration_minutes: Number($(`#tier${i}Duration`).value || 0),
      price: Number($(`#tier${i}Price`).value || 0),
      description: $(`#tier${i}Desc`).value,
    })).filter(t => t.name && t.duration_minutes);
    await apiCall('/api/experts/me/tiers', 'PUT', { tiers: list });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Tiers saved', 'success');
  };
}

function openCreateCourseModal() {
  openModal({
    title: 'New Course',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ccTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ccDesc" class="form-textarea" rows="3"></textarea></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="ccType" class="form-select">
          ${CONFIG.COURSE_TYPES.map(t => `<option value="${t}">${t.replace('_',' ')}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Level</span>
        <select id="ccLevel" class="form-select">
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select></label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="ccPrice" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ccSave" class="btn btn-primary">Create</button>`,
  });
  $('#ccSave').onclick = async () => {
    await apiCall('/api/expert/courses', 'POST', {
      title: $('#ccTitle').value, description: $('#ccDesc').value,
      course_type: $('#ccType').value, level: $('#ccLevel').value,
      price: Number($('#ccPrice').value || 0),
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Course created', 'success');
  };
}

function openEditCourseModal(courseId) {
  const c = S.courses.find(x => String(x.id) === String(courseId));
  if (!c) return;
  openModal({
    title: `Edit ${c.title}`,
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ecTitle" class="form-input" value="${esc(c.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ecDesc" class="form-textarea" rows="3">${esc(c.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="ecPrice" type="number" class="form-input" value="${c.price || 0}" /></label>
      <label class="form-group"><span class="form-label">Status</span>
        <select id="ecStatus" class="form-select">
          ${['draft','published','archived'].map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ecSave" class="btn btn-primary">Save</button>`,
  });
  $('#ecSave').onclick = async () => {
    await apiCall(`/api/expert/courses/${courseId}`, 'PUT', {
      title: $('#ecTitle').value,
      description: $('#ecDesc').value,
      price: Number($('#ecPrice').value || 0),
      status: $('#ecStatus').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Course updated', 'success');
  };
}

function openAddModuleModal(courseId) {
  openModal({
    title: 'New Module',
    body: `
      <label class="form-group"><span class="form-label">Module title</span>
        <input id="amTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration in hours</span>
        <input id="amDuration" type="number" class="form-input" value="2" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="amDesc" class="form-textarea" rows="2"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="amSave" class="btn btn-primary">Add Module</button>`,
  });
  $('#amSave').onclick = async () => {
    await apiCall(`/api/institution/programmes/${courseId}/modules`, 'POST', {
      title: $('#amTitle').value,
      duration_hours: Number($('#amDuration').value || 0),
      description: $('#amDesc').value,
    });
    closeModal(); await loadCourseCurriculum(courseId); rerenderRoleContent(); showToast('Module added', 'success');
  };
}

function openEditModuleModal(moduleId) {
  openModal({
    title: 'Edit Module',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="emTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration (hours)</span>
        <input id="emDuration" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="emSave" class="btn btn-primary">Save</button>`,
  });
  $('#emSave').onclick = async () => {
    await apiCall(`/api/institution/programmes/modules/${moduleId}`, 'PUT', {
      title: $('#emTitle').value,
      duration_hours: Number($('#emDuration').value || 0),
    });
    closeModal(); rerenderRoleContent(); showToast('Module updated', 'success');
  };
}

function openAddLessonModal(moduleId) {
  const courseId = S.__activeCourseId;
  openModal({
    title: 'New Lesson',
    body: `
      <label class="form-group"><span class="form-label">Lesson title</span>
        <input id="alTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="alType" class="form-select">
          ${CONFIG.LESSON_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Duration (min)</span>
        <input id="alDuration" type="number" class="form-input" value="15" /></label>
      <label class="form-group"><span class="form-label">Content</span>
        <textarea id="alContent" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="alSave" class="btn btn-primary">Add Lesson</button>`,
  });
  $('#alSave').onclick = async () => {
    await apiCall(`/api/expert/courses/${courseId}/lessons`, 'POST', {
      module_id: moduleId,
      title: $('#alTitle').value,
      lesson_type: $('#alType').value,
      duration_minutes: Number($('#alDuration').value || 0),
      content: $('#alContent').value,
    });
    closeModal(); await loadCourseCurriculum(courseId); rerenderRoleContent(); showToast('Lesson added', 'success');
  };
}

function openEditLessonModal(lessonId) {
  openModal({
    title: 'Edit Lesson',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="elTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Content</span>
        <textarea id="elContent" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="elSave" class="btn btn-primary">Save</button>`,
  });
  $('#elSave').onclick = async () => {
    await apiCall(`/api/expert/lessons/${lessonId}`, 'PUT', {
      title: $('#elTitle').value,
      content: $('#elContent').value,
    });
    closeModal(); rerenderRoleContent(); showToast('Lesson updated', 'success');
  };
}

async function saveCourseSettings(courseId) {
  await apiCall(`/api/expert/courses/${courseId}`, 'PUT', {
    status: $('#builder-course-status').value,
    price: Number($('#builder-course-price').value || 0),
    level: $('#builder-course-level').value,
  });
  await loadAllData(); rerenderRoleContent(); showToast('Course settings saved', 'success');
}
