/* ============================================================
   dashboards/institution/question-bank.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const qs = S.institutionQuestions || [];

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Question Bank' }])}
      ${EH.Layout.pageHeader('Question Bank', {
        actions: `<button class="btn btn-primary" data-action="create-question">
          <i class="fas fa-plus"></i> New Question</button>`,
      })}

      <section class="panel">
        ${qs.length ? `
          <ul class="list-stack">
            ${qs.map(q => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${EH.Fmt.esc(EH.Fmt.truncate(q.question_text || '', 100))}</span>
                  <span class="list-row-sub">
                    ${EH.Fmt.esc(q.question_type)} · ${EH.Fmt.esc(q.difficulty)} ·
                    ${q.category ? EH.Fmt.esc(q.category) : 'Uncategorised'} ·
                    ${q.points} point${q.points === 1 ? '' : 's'}
                  </span>
                </div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-secondary btn-xs" data-action="edit-question" data-id="${q.id}">Edit</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-question" data-id="${q.id}">Delete</button>
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
      </section>`;
  }

  EH.InstQuestionBank = { render };
})(window);
