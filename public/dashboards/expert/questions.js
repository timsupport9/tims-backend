/* ============================================================
   dashboards/expert/questions.js
   ============================================================ */

function renderExpertQuestions() {
  const questions = S.expertQuestions || [];
  const unanswered = questions.filter(q => !q.answer);
  const answered = questions.filter(q => q.answer);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Public Q&A</span></div>
    <section class="page-header"><h1 class="page-title">Public Q&A</h1></section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Answer public questions to attract clients.
        Your answers appear on your profile.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Awaiting Answer (${unanswered.length})</h3>
      ${unanswered.length ? unanswered.map(q => `
        <div class="qa-item">
          <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question || '')}</p>
          <p class="qa-pending">
            Asked ${timeAgo(q.created_at)} by ${esc(q.asker_name || 'Anonymous')}
          </p>
          <div style="margin-top:8px">
            <button class="btn btn-primary btn-sm" data-expert-action="answer-question" data-id="${q.id}">
              <i class="fas fa-reply"></i> Answer</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No pending questions</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Answered (${answered.length})</h3>
      ${answered.length ? answered.map(q => `
        <div class="qa-item">
          <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question || '')}</p>
          <p class="qa-a"><strong>You:</strong> ${esc(q.answer || '')}</p>
          <p class="qa-pending" style="margin-top:4px">
            Answered ${timeAgo(q.answered_at)}
          </p>
          <div style="margin-top:6px">
            <button class="btn btn-secondary btn-xs" data-expert-action="edit-answer" data-id="${q.id}">
              <i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-danger btn-xs" data-expert-action="delete-question" data-id="${q.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No answered questions yet</p>'}
    </section>
  `;
}

function openAnswerQuestionModal(questionId, existingAnswer = '') {
  openModal({
    title: 'Answer Question',
    body: `
      <label class="form-group"><span class="form-label">Your answer</span>
        <textarea id="aqAnswer" class="form-textarea" rows="6">${esc(existingAnswer)}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="aqSave" class="btn btn-primary">Post Answer</button>`,
  });
  document.getElementById('aqSave').onclick = async () => {
    const answer = document.getElementById('aqAnswer').value;
    if (!answer.trim()) return showToast('Answer is empty', 'error');
    await apiCall(`/api/expert/questions/${questionId}/answer`, 'POST', { answer });
    closeModal();
    await loadAllData();
    showToast('Answer posted', 'success');
    rerenderExpertContent();
  };
}
