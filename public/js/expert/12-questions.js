/* ============================================================
   ExpertHub 2.0 — js/expert/12-questions.js
   Expert public Q&A.
   ============================================================ */

function expertPublicQuestions() {
  const questions = S.expertQuestions || [];
  const unanswered = questions.filter(q => !q.answer);
  const answered = questions.filter(q => q.answer);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Public Q&A</span></div>
    <section class="page-header">
      <h1 class="page-title">Public Q&A</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Answer public questions to attract clients. Your answers appear on your profile.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Awaiting Answer (${unanswered.length})</h3>
      ${unanswered.length ? unanswered.map(q => `
        <div class="qa-item">
          <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
          <p class="qa-pending">
            Asked ${timeAgo(q.created_at)} by ${esc(q.asker_name || 'Anonymous')}
          </p>
          <div style="margin-top:8px">
            <button class="btn btn-primary btn-sm" data-action="answer-question" data-id="${q.id}">
              <i class="fas fa-reply"></i> Answer</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No pending questions</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Answered (${answered.length})</h3>
      ${answered.length ? answered.map(q => `
        <div class="qa-item">
          <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
          <p class="qa-a"><strong>You:</strong> ${esc(q.answer)}</p>
          <p class="qa-pending" style="margin-top:4px">
            Answered ${timeAgo(q.answered_at)}
          </p>
        </div>
      `).join('') : '<p class="empty-row">No answered questions yet</p>'}
    </section>
  `;
}
