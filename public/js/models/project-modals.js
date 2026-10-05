/* ============================================================
   ExpertHub 2.0 — project-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function openProjectModal() {
  openModal({
    title: 'New Project',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="pjTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="pjDesc" class="form-textarea" rows="3"></textarea></label>
      <label class="form-group">
        <span class="form-label">Cohort</span>
        <select id="pjCohort" class="form-select">
          ${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option>No cohorts</option>'}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="pjCat" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Max score</span>
          <input id="pjMaxScore" type="number" class="form-input" value="100" /></label>
      </div>
      <label class="form-group"><span class="form-label">Deadline</span>
        <input id="pjDeadline" type="datetime-local" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="pjSave" class="btn btn-primary">Create</button>`,
  });
  $('#pjSave').onclick = async () => {
    await apiCall('/api/institution/projects', 'POST', {
      title: $('#pjTitle').value,
      description: $('#pjDesc').value,
      cohort_id: Number($('#pjCohort').value),
      category: $('#pjCat').value || null,
      max_score: Number($('#pjMaxScore').value || 100),
      deadline: $('#pjDeadline').value || null,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Project created', 'success');
  };
}
