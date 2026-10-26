/* ============================================================
   ExpertHub 2.0 — dashboards/user/assessments.js
   Learner assessments: attempt limits, server grading,
   answer review, no duplicate submissions.
   ============================================================ */

S.userAssessments = S.userAssessments || [];
S.userAttempts    = S.userAttempts    || [];
let __assessmentsLoaded = false;

async function _loadUserAssessments() {
  const [a, b] = await Promise.allSettled([
    apiCall('/api/user/assessments').then(d => { S.userAssessments = d.assessments || []; }),
    apiCall('/api/user/attempts').then(d => { S.userAttempts = d.attempts || []; }),
  ]);
  if (a.status === 'rejected') S.userAssessments = S.userAssessments || [];
  if (b.status === 'rejected') S.userAttempts = S.userAttempts || [];
  __assessmentsLoaded = true;
}

function renderUserAssessments() {
  if (!__assessmentsLoaded) {
    _loadUserAssessments().then(() => rerenderRoleContent()).catch(() => {});
    return UserUI.page({
      title: 'Assessments',
      breadcrumb: 'Assessments',
      content: UserUI.loading('Loading assessments…'),
    });
  }

  const pending  = S.userAssessments.filter(a => ['assigned','available','scheduled'].includes(a.status));
  const attempts = S.userAttempts.slice(0, 20);
  const avg = S.userAttempts.length
    ? Math.round(S.userAttempts.reduce((s, a) => s + Number(a.score || 0), 0) / S.userAttempts.length) + '%'
    : '—';

  return UserUI.page({
    title: 'Assessments',
    breadcrumb: 'Assessments',
    actions: `<button class="btn btn-secondary" data-action="reload-assessments">
                <i class="fas fa-rotate-right"></i> Refresh</button>`,
    content: `
      ${UserUI.stats([
        { label: 'Pending',    value: pending.length,   icon: 'fa-clock',        tone: 'yellow' },
        { label: 'Completed',  value: S.userAttempts.filter(a => a.status === 'completed').length, icon: 'fa-check-circle', tone: 'green' },
        { label: 'Avg. Score', value: avg, icon: 'fa-star', tone: 'blue' },
      ])}

      <section class="panel">
        <h3 class="panel-title">Pending Assessments</h3>
        ${pending.length ? pending.map(a => `
          <div class="enrollment-card">
            <h3 class="enrollment-title">${esc(a.title)}</h3>
            <p class="enrollment-type">
              ${esc(a.course_title || '')} · ${a.questions_count || 0} questions ·
              ${a.duration_minutes || '—'} min
              ${a.attempt_limit ? ` · ${a.attempts_used || 0}/${a.attempt_limit} attempts used` : ''}
            </p>
            ${a.attempt_limit && (a.attempts_used || 0) >= a.attempt_limit
              ? '<p class="form-hint" style="color:var(--danger)">No attempts remaining</p>'
              : `<div class="panel-actions" style="margin-top:10px">
                  <button class="btn btn-primary btn-sm" data-action="start-assessment" data-id="${a.id}">
                    <i class="fas fa-play"></i> Start</button>
                 </div>`}
          </div>
        `).join('') : '<p class="empty-row">No pending assessments</p>'}
      </section>

      <section class="panel">
        <h3 class="panel-title">Recent Attempts</h3>
        ${UserUI.table(
          ['Assessment', 'Score', 'Result', 'Submitted', ''],
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
              <td><button class="btn btn-secondary btn-xs" data-action="view-attempt" data-id="${a.id}">
                    <i class="fas fa-eye"></i> Review</button></td>
            </tr>
          `),
          'No attempts yet'
        )}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('assessments', renderUserAssessments);

window.ExpertHubUser.registerAction('reload-assessments', async () => {
  await _loadUserAssessments();
  rerenderRoleContent();
  showToast('Assessments refreshed', 'success');
});

window.ExpertHubUser.registerAction('start-assessment', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/assessments/${id}/start`, 'POST');
    closeModal();

    if (d?.attempt_id && d?.questions) {
      __openAssessmentAttempt(d.attempt_id, d.assessment || {}, d.questions, d.duration_minutes || 0);
    } else {
      showToast('Assessment could not be started', 'error');
    }
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

function __openAssessmentAttempt(attemptId, assessment, questions, durationMinutes) {
  let submitted = false;
  let timerHandle = null;
  let secondsLeft = (durationMinutes || 0) * 60;

  openModal({
    title: assessment.title || 'Assessment',
    className: 'modal-lg',
    body: `
      ${durationMinutes ? `<div class="alert alert-info">
          <i class="fas fa-clock"></i> Time remaining: <strong id="assess-timer">${formatSecs(secondsLeft)}</strong>
        </div>` : ''}
      <div id="assessment-host">
        ${questions.map((q, i) => `
          <div class="panel" style="margin-bottom:14px">
            <p><strong>Q${i + 1}.</strong> ${esc(q.question_text)}</p>
            ${q.question_type === 'mcq' ? (q.options || []).map(o => `
              <label class="checkbox-row">
                <input type="radio" name="q_${q.id}" value="${esc(o)}" />
                ${esc(o)}
              </label>
            `).join('') : q.question_type === 'multi' ? (q.options || []).map(o => `
              <label class="checkbox-row">
                <input type="checkbox" name="q_${q.id}" value="${esc(o)}" />
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

  if (durationMinutes) {
    timerHandle = setInterval(() => {
      secondsLeft--;
      const el = $('#assess-timer');
      if (el) el.textContent = formatSecs(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(timerHandle);
        const btn = $('#asSubmit');
        if (btn && !submitted) {
          showToast('Time up — submitting automatically', 'warning');
          btn.click();
        }
      }
    }, 1000);
  }

  $('#asSubmit').onclick = async () => {
    if (submitted) return;
    submitted = true;
    if (timerHandle) clearInterval(timerHandle);
    const btn = $('#asSubmit');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Submitting…'; }

    const answers = {};
    document.querySelectorAll('input[type=radio]:checked').forEach(el => {
      answers[el.name.replace('q_', '')] = el.value;
    });
    document.querySelectorAll('input[type=checkbox]:checked').forEach(el => {
      const qid = el.name.replace('q_', '');
      if (!Array.isArray(answers[qid])) answers[qid] = [];
      answers[qid].push(el.value);
    });
    document.querySelectorAll('textarea[data-q]').forEach(el => {
      answers[el.dataset.q] = el.value;
    });

    try {
      const r = await apiCall(`/api/user/assessments/${id}/submit`, 'POST', {
        attempt_id: attemptId, answers,
      });
      closeModal();
      showToast(`Submitted. Score: ${r.score}% — ${r.passed ? 'Passed' : 'Not passed'}`, r.passed ? 'success' : 'warning', 8000);
      await _loadUserAssessments();
      rerenderRoleContent();
    } catch (e) {
      submitted = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Submit Answers'; }
      showToast(e.message, 'error');
    }
  };
}

function formatSecs(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

window.ExpertHubUser.registerAction('view-attempt', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/attempts/${id}`).catch(() => ({ attempt: null, answers: [] }));
    const attempt = d.attempt || (S.userAttempts || []).find(x => String(x.id) === String(id));
    if (!attempt) return showToast('Attempt not found', 'error');

    openModal({
      title: `Attempt — ${attempt.assessment_title || ''}`,
      className: 'modal-lg',
      body: `
        <p><strong>Score:</strong> ${attempt.score}% · <strong>Result:</strong>
          ${attempt.passed === 1
            ? '<span class="status status-active">Passed</span>'
            : '<span class="status status-rejected">Failed</span>'}</p>
        <p><strong>Submitted:</strong> ${fmtDT(attempt.submitted_at)}</p>
        <h3 class="panel-title" style="margin-top:16px">Answer Review</h3>
        ${(d.answers || []).length ? (d.answers || []).map(a => `
          <div class="panel" style="margin-bottom:10px">
            <p><strong>${esc(a.question_text)}</strong></p>
            <p>Your answer: <em>${esc(a.your_answer || '—')}</em></p>
            <p>Correct answer: <em>${esc(a.correct_answer || '—')}</em></p>
            <p>${a.correct ? '<span class="status status-active">Correct</span>' : '<span class="status status-rejected">Incorrect</span>'}</p>
          </div>
        `).join('') : '<p class="empty-row">Detailed review not available.</p>'}
      `,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});