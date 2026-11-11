/* ============================================================
   ExpertHub 2.0 — dashboards/user/assessments.js
   Learner assessments: list, attempt, results.
   ============================================================ */

S.userAssessments  = S.userAssessments  || [];
S.userAttempts     = S.userAttempts     || [];

async function _loadUserAssessments() {
  const [a, b] = await Promise.allSettled([
    apiCall('/api/user/assessments').then(d => { S.userAssessments = d.assessments || []; }),
    apiCall('/api/user/attempts').then(d => { S.userAttempts = d.attempts || []; }),
  ]);
  if (a.status === 'rejected') S.userAssessments = S.userAssessments || [];
  if (b.status === 'rejected') S.userAttempts = S.userAttempts || [];
}

function renderUserAssessments() {
  if (!S.userAssessments) S.userAssessments = [];
  if (!S.userAttempts)    S.userAttempts = [];
  _loadUserAssessments().then(() => rerenderRoleContent()).catch(() => {});

  const pending  = S.userAssessments.filter(a => ['assigned','available','scheduled'].includes(a.status));
  const attempts = S.userAttempts.slice(0, 20);

  return UserUI.page({
    title: 'Assessments',
    breadcrumb: 'Assessments',
    content: `
      ${UserUI.stats([
        { label: 'Pending',    value: pending.length,   icon: 'fa-clock',        tone: 'yellow' },
        { label: 'Completed',  value: S.userAttempts.filter(a => a.status === 'completed').length, icon: 'fa-check-circle', tone: 'green' },
        { label: 'Avg. Score', value: S.userAttempts.length
            ? Math.round(S.userAttempts.reduce((s, a) => s + Number(a.score || 0), 0) / S.userAttempts.length) + '%'
            : '—', icon: 'fa-star', tone: 'blue' },
      ])}

      <section class="panel">
        <h3 class="panel-title">Pending Assessments</h3>
        ${pending.length ? pending.map(a => `
          <div class="enrollment-card">
            <h3 class="enrollment-title">${esc(a.title)}</h3>
            <p class="enrollment-type">${esc(a.course_title || '')} · ${a.questions_count || 0} questions · ${a.duration_minutes || '—'} min</p>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="start-assessment" data-id="${a.id}">
                <i class="fas fa-play"></i> Start</button>
            </div>
          </div>
        `).join('') : '<p class="empty-row">No pending assessments</p>'}
      </section>

      <section class="panel">
        <h3 class="panel-title">Recent Attempts</h3>
        ${UserUI.table(
          ['Assessment', 'Score', 'Result', 'Submitted'],
          attempts.map(a => `
            <tr>
              <td>${esc(a.assessment_title || '')}</td>
              <td>${a.score != null ? a.score + '%' : '—'}</td>
              <td>${a.passed === 1
                ? '<span class="status status-active">Passed</span>'
                : a.passed === 0
                ? '<span class="status status-rejected">Failed</span>'
                : '<span class="status status-pending">Pending</span>'}</td>
              <td>${fmtDT(a.submitted_at)}</td>
            </tr>
          `),
          'No attempts yet'
        )}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('assessments', renderUserAssessments);

window.ExpertHubUser.registerAction('start-assessment', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/assessments/${id}/start`, 'POST');
    closeModal();
    openModal({
      title: d.assessment?.title || 'Assessment',
      className: 'modal-lg',
      body: `
        <div id="assessment-host">
          ${(d.questions || []).map((q, i) => `
            <div class="panel" style="margin-bottom:14px">
              <p><strong>Q${i + 1}.</strong> ${esc(q.question_text)}</p>
              ${q.question_type === 'mcq' ? (q.options || []).map(o => `
                <label class="checkbox-row">
                  <input type="radio" name="q_${q.id}" value="${esc(o)}" />
                  ${esc(o)}
                </label>
              `).join('') : `<textarea class="form-textarea" rows="3" data-q="${q.id}"></textarea>`}
            </div>
          `).join('') || '<p class="empty-row">No questions</p>'}
        </div>`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="asSubmit" class="btn btn-primary">Submit Answers</button>
      `,
    });
    $('#asSubmit').onclick = async () => {
      const answers = {};
      document.querySelectorAll('input[type=radio]:checked').forEach(el => {
        const qid = el.name.replace('q_', '');
        answers[qid] = el.value;
      });
      document.querySelectorAll('textarea[data-q]').forEach(el => {
        answers[el.dataset.q] = el.value;
      });
      try {
        const r = await apiCall(`/api/user/assessments/${id}/submit`, 'POST', { answers });
        closeModal();
        showToast(`Submitted. Score: ${r.score}% — ${r.passed ? 'Passed' : 'Not passed'}`, 'success', 8000);
        await _loadUserAssessments();
        rerenderRoleContent();
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});
