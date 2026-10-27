/* ============================================================
   Institution — Question Bank
   ============================================================ */
function instQuestionBank() {
  const q = ($('#qb-search')?.value || '').toLowerCase();
  let questions = S.institutionQuestions || [];
  if (q) questions = questions.filter(x =>
    (x.question_text || '').toLowerCase().includes(q));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Question Bank</span></div>
    <section class="page-header">
      <h1 class="page-title">Question Bank</h1>
      <div class="page-actions">
        <input type="search" id="qb-search" class="form-input"
               placeholder="Search questions..." value="${esc(q)}" style="max-width:240px" />
        <button class="btn btn-primary" data-action="create-question">
          <i class="fas fa-plus"></i> New Question</button>
      </div>
    </section>

    <section class="panel">
      ${questions.length ? `
        <ul class="list-stack">
          ${questions.map(x => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc((x.question_text || '').slice(0, 100))}</span>
                <span class="list-row-sub">
                  ${esc(x.question_type)} - ${esc(x.difficulty)} -
                  ${x.category ? esc(x.category) : 'Uncategorised'} - ${x.points} point${x.points === 1 ? '' : 's'}
                </span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-xs" data-action="edit-question" data-id="${x.id}">Edit</button>
                <button class="btn btn-danger btn-xs" data-action="delete-question" data-id="${x.id}">Delete</button>
              </div>
            </li>`).join('')}
        </ul>` : `
        <div class="empty-state">
          <i class="fas fa-database"></i>
          <h3>No questions yet</h3>
          <p>Build a reusable bank of questions for your assessments.</p>
          <button class="btn btn-primary" data-action="create-question">
            <i class="fas fa-plus"></i> Create First Question</button>
        </div>`}
    </section>
  `;
}
