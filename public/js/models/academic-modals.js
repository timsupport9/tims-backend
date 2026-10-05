/* ============================================================
   ExpertHub 2.0 — academic-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function openAssessmentModal() {
  openModal({
    title: 'Schedule Assessment',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="asTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="asDesc" class="form-textarea" rows="2"></textarea></label>
      <label class="form-group">
        <span class="form-label">Cohort</span>
        <select id="asCohort" class="form-select">
          ${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option>No cohorts</option>'}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="asType" class="form-select">
            ${CONFIG.ASSESSMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Weight (%)</span>
          <input id="asWeight" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Pass mark (%)</span>
          <input id="asPass" type="number" class="form-input" value="70" /></label>
        <label class="form-group"><span class="form-label">Max attempts</span>
          <input id="asAttempts" type="number" class="form-input" value="1" /></label>
        <label class="form-group"><span class="form-label">Time limit in minutes</span>
          <input id="asTime" type="number" class="form-input" value="0" /></label>
        <label class="form-group"><span class="form-label">Due date</span>
          <input id="asDue" type="datetime-local" class="form-input" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="asSave" class="btn btn-primary">Schedule</button>`,
  });
  $('#asSave').onclick = async () => {
    await apiCall('/api/institution/assessments', 'POST', {
      title: $('#asTitle').value,
      description: $('#asDesc').value || null,
      cohort_id: Number($('#asCohort').value),
      type: $('#asType').value,
      weight: Number($('#asWeight').value || 0),
      pass_mark: Number($('#asPass').value || 70),
      max_attempts: Number($('#asAttempts').value || 1),
      time_limit_minutes: Number($('#asTime').value || 0),
      due_date: $('#asDue').value || null,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Assessment scheduled', 'success');
  };
}
async function openGradingModal(assessmentId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/assessments/${assessmentId}/submissions`);
    openModal({
      title: 'Grade Submissions',
      className: 'modal-lg',
      body: `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Trainee</th><th>Submitted</th><th>Score</th><th>Passed</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${(d.submissions || []).map(s => `
                <tr>
                  <td>${esc(s.trainee_name)}</td>
                  <td>${fmtDT(s.submitted_at)}</td>
                  <td>${s.score != null ? s.score : '-'}</td>
                  <td>${s.passed === 1
                    ? '<span class="status-active">Yes</span>'
                    : s.passed === 0
                    ? '<span class="status-rejected">No</span>'
                    : '-'}</td>
                  <td>
                    <button class="btn btn-info btn-xs" data-grade-sub="${s.id}"
                            data-score="${s.score || ''}">Grade</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="empty-row">No submissions yet</td></tr>'}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    document.querySelectorAll('[data-grade-sub]').forEach(b => {
      b.onclick = async () => {
        const score = prompt('Enter score:', b.dataset.score || '');
        if (score === null) return;
        const feedback = prompt('Feedback (optional):') || '';
        try {
          await apiCall(`/api/institution/assessments/submissions/${b.dataset.gradeSub}/grade`, 'PUT', {
            score: Number(score),
            feedback,
            passed: Number(score) >= 70,
          });
          closeModal();
          openGradingModal(assessmentId);
          showToast('Submission graded', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
function openQuestionModal(questionId) {
  const q = questionId ? (S.institutionQuestions.find(x => x.id === questionId) || {}) : {};
  let options = [];
  try { options = q.options ? JSON.parse(q.options) : []; } catch (_) {}

  openModal({
    title: questionId ? 'Edit Question' : 'New Question',
    className: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="qCat" class="form-input" value="${esc(q.category || '')}" /></label>
        <label class="form-group">
          <span class="form-label">Difficulty</span>
          <select id="qDiff" class="form-select">
            ${['easy', 'medium', 'hard'].map(d => `
              <option value="${d}" ${q.difficulty === d ? 'selected' : ''}>${d}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="qType" class="form-select">
            ${['mcq', 'true_false', 'short_answer', 'essay', 'file_upload'].map(t => `
              <option value="${t}" ${q.question_type === t ? 'selected' : ''}>${t.replace('_', ' ')}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Points</span>
          <input id="qPoints" type="number" class="form-input" value="${q.points || 1}" /></label>
      </div>
      <label class="form-group"><span class="form-label">Question</span>
        <textarea id="qText" class="form-textarea" rows="3" required>${esc(q.question_text || '')}</textarea></label>
      <div id="qOptionsBlock">
        <label class="form-label">Answer options (one per line)</label>
        <textarea id="qOptions" class="form-textarea" rows="4">${options.map(o => esc(o)).join('\n')}</textarea>
      </div>
      <label class="form-group"><span class="form-label">Correct answer</span>
        <input id="qCorrect" class="form-input" value="${esc(q.correct_answer || '')}" /></label>
      <label class="form-group"><span class="form-label">Explanation</span>
        <textarea id="qExplanation" class="form-textarea" rows="2">${esc(q.explanation || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Tags (comma separated)</span>
        <input id="qTags" class="form-input" value="${esc(q.tags || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="qSave" class="btn btn-primary">${questionId ? 'Save' : 'Create'}</button>`,
  });
  $('#qSave').onclick = async () => {
    const optionsRaw = $('#qOptions').value;
    const payload = {
      question_text: $('#qText').value,
      question_type: $('#qType').value,
      difficulty: $('#qDiff').value,
      category: $('#qCat').value || null,
      points: Number($('#qPoints').value || 1),
      options: optionsRaw ? optionsRaw.split('\n').map(s => s.trim()).filter(Boolean) : null,
      correct_answer: $('#qCorrect').value || null,
      explanation: $('#qExplanation').value || null,
      tags: $('#qTags').value || null,
    };
    if (!payload.question_text) return showToast('Question text is required', 'error');
    try {
      await apiCall('/api/institution/question-bank', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Question saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
async function uploadMaterial() {
  const title = $('#matTitle').value;
  const fileInput = $('#matFile');
  const file = fileInput && fileInput.files[0];
  if (!file) return showToast('Select a file to upload', 'error');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title || file.name);
  fd.append('cohort_id', $('#matCohort').value || '');
  try {
    showLoading(true);
    await apiCall('/api/institution/materials', 'POST', fd, true);
    await loadAllData();
    rerenderRoleContent();
    showToast('Material uploaded', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
