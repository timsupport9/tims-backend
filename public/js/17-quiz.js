/* ============================================================
   ExpertHub 2.0 — 17-quiz.js
   Quiz engine: fetch, attempt, auto-grade, review, resume.
   Falls back to S.quizzes local data when the API is unavailable.
   ============================================================ */

/* ============================================================
   PUBLIC ENTRY POINT
   ============================================================ */
async function openQuiz(quizId) {
  try {
    showLoading(true);
    const [quiz, attempts] = await Promise.all([
      fetchQuiz(quizId),
      fetchQuizAttempts(quizId).catch(() => ({ attempts: [] })),
    ]);
    if (!quiz) return showToast('Quiz not found', 'warning');

    const past = (attempts.attempts || []).slice();
    const best = past.reduce((m, a) => Math.max(m, Number(a.score || 0)), 0);
    const attemptsUsed = past.length;
    const attemptsLeft = Math.max(0, (quiz.max_attempts || 99) - attemptsUsed);
    const canStart = attemptsLeft > 0;

    openModal({
      title: quiz.title || 'Quiz',
      className: 'modal-lg',
      body: renderQuizIntro({ quiz, past, best, attemptsLeft, canStart }),
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${canStart ? `
          <button class="btn btn-primary" data-quiz-start="${esc(quiz.id)}">
            <i class="fas fa-play"></i> Start Attempt
          </button>` : `
          <button class="btn btn-secondary" disabled>
            <i class="fas fa-ban"></i> No attempts left</button>`}
      `,
    });

    bindQuizIntro(quiz);
  } catch (err) {
    showToast(err.message || 'Failed to load quiz', 'error');
  } finally {
    showLoading(false);
  }
}

/* ============================================================
   DATA LAYER
   ============================================================ */
async function fetchQuiz(quizId) {
  if (typeof apiCall === 'function') {
    try {
      const d = await apiCall(`/api/eschool/quizzes/${quizId}`);
      if (d?.quiz) return normalizeQuiz(d.quiz);
    } catch (_) {}
  }
  // Local fallback
  const local = (S.quizzes || []).find(q => String(q.id) === String(quizId));
  return local ? normalizeQuiz(local) : null;
}

async function fetchQuizAttempts(quizId) {
  if (typeof apiCall === 'function') {
    try { return await apiCall(`/api/eschool/quizzes/${quizId}/attempts`); }
    catch (_) {}
  }
  return { attempts: (S.quizAttempts || []).filter(a => String(a.quiz_id) === String(quizId)) };
}

async function startAttempt(quizId) {
  if (typeof apiCall === 'function') {
    try {
      const d = await apiCall(`/api/eschool/quizzes/${quizId}/attempts`, 'POST', {});
      if (d?.attempt) return d.attempt;
    } catch (_) {}
  }
  // Local fallback
  const attempt = {
    id: 'att-' + Date.now(),
    quiz_id: quizId,
    started_at: new Date().toISOString(),
    answers: {},
    status: 'in_progress',
  };
  S.quizAttempts = S.quizAttempts || [];
  S.quizAttempts.push(attempt);
  return attempt;
}

async function submitAttempt(quizId, attemptId, answers, timedOut = false) {
  if (typeof apiCall === 'function') {
    try {
      const d = await apiCall(
        `/api/eschool/quizzes/${quizId}/attempts/${attemptId}/submit`,
        'POST',
        { answers, timed_out: !!timedOut }
      );
      if (d?.attempt) return d.attempt;
    } catch (_) {}
  }
  // Local grading fallback
  const quiz = await fetchQuiz(quizId);
  const graded = gradeAttemptLocally(quiz, answers);
  const attempt = (S.quizAttempts || []).find(a => a.id === attemptId);
  if (attempt) Object.assign(attempt, graded, { submitted_at: new Date().toISOString(), status: 'completed' });
  return attempt || graded;
}

function normalizeQuiz(q) {
  const questions = (q.questions || []).map((qq, i) => ({
    id: qq.id || ('q' + i),
    type: qq.type || 'single',           // single | multi | text | code
    prompt: qq.prompt || qq.question || '',
    options: Array.isArray(qq.options) ? qq.options.slice() : [],
    answer: qq.answer ?? qq.correct ?? null,
    explanation: qq.explanation || '',
    points: Number(qq.points || 1),
  }));
  const totalPoints = questions.reduce((s, x) => s + x.points, 0);
  return {
    id: q.id,
    title: q.title || 'Quiz',
    description: q.description || '',
    lesson_id: q.lesson_id || null,
    course_id: q.course_id || null,
    passing_score: Number(q.passing_score ?? 70),
    max_attempts: Number(q.max_attempts ?? 3),
    time_limit_minutes: Number(q.time_limit_minutes || 0),
    shuffle_questions: !!q.shuffle_questions,
    shuffle_options: !!q.shuffle_options,
    total_points: totalPoints,
    questions,
  };
}

/* ============================================================
   INTRO SCREEN
   ============================================================ */
function renderQuizIntro({ quiz, past, best, attemptsLeft, canStart }) {
  return `
    <div class="quiz-intro">
      <p class="quiz-intro__desc">${esc(quiz.description || '')}</p>

      <div class="stat-grid" style="margin:16px 0">
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Questions</p>
            <p class="stat-value">${quiz.questions.length}</p>
          </div>
          <div class="stat-icon stat-icon-blue"><i class="fas fa-question"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Passing score</p>
            <p class="stat-value">${quiz.passing_score}%</p>
          </div>
          <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Attempts left</p>
            <p class="stat-value">${attemptsLeft}</p>
          </div>
          <div class="stat-icon stat-icon-yellow"><i class="fas fa-redo"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Best score</p>
            <p class="stat-value">${best ? best + '%' : '—'}</p>
          </div>
          <div class="stat-icon stat-icon-purple"><i class="fas fa-trophy"></i></div>
        </div>
      </div>

      ${quiz.time_limit_minutes ? `
        <div class="alert alert-info">
          <i class="fas fa-clock"></i>
          <div>Time limit: <strong>${quiz.time_limit_minutes} minutes</strong>.
          The attempt auto-submits when time runs out.</div>
        </div>` : ''}

      ${past.length ? `
        <h3 class="panel-title" style="margin-top:20px">Previous attempts</h3>
        <ul class="list-stack">
          ${past.slice(0, 10).map(a => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">Score: ${a.score || 0}%</span>
                <span class="list-row-sub">${a.submitted_at ? fmtDT(a.submitted_at) : fmtDT(a.started_at || '')}</span>
              </div>
              <span class="${a.passed ? 'status status-active' : 'status status-failed'}">
                ${a.passed ? 'Passed' : 'Not passed'}
              </span>
            </li>
          `).join('')}
        </ul>` : ''}

      ${!canStart ? `
        <div class="alert alert-warning" style="margin-top:16px">
          <i class="fas fa-ban"></i>
          <div>You have used all attempts for this quiz.</div>
        </div>` : ''}
    </div>`;
}

function bindQuizIntro(quiz) {
  document.querySelector(`[data-quiz-start="${quiz.id}"]`)?.addEventListener('click', async () => {
    closeModal();
    await beginQuizAttempt(quiz);
  });
}

/* ============================================================
   ATTEMPT RUNNER
   ============================================================ */
async function beginQuizAttempt(quiz) {
  const attempt = await startAttempt(quiz.id);
  const questions = quiz.shuffle_questions ? shuffle(quiz.questions.slice()) : quiz.questions.slice();
  const endsAt = quiz.time_limit_minutes
    ? Date.now() + quiz.time_limit_minutes * 60 * 1000
    : null;

  const runtime = {
    quiz,
    attempt,
    questions,
    index: 0,
    answers: {},
    endsAt,
    timerId: null,
  };

  openModal({
    title: quiz.title,
    className: 'modal-lg',
    body: `<div id="quiz-runner"></div>`,
    footer: `
      <div class="quiz-footer" style="display:flex;justify-content:space-between;align-items:center;width:100%">
        <div id="quiz-timer" class="quiz-timer" hidden></div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary" data-quiz-prev>‹ Previous</button>
          <button class="btn btn-primary" data-quiz-next>Next ›</button>
          <button class="btn btn-success" data-quiz-submit>Submit</button>
        </div>
      </div>`,
  });

  window.__ehQuizRuntime = runtime;

  document.querySelector('[data-quiz-prev]').onclick = () => moveQuiz(-1);
  document.querySelector('[data-quiz-next]').onclick = () => moveQuiz(1);
  document.querySelector('[data-quiz-submit]').onclick = () => confirmSubmitQuiz();

  if (runtime.endsAt) {
    const t = document.getElementById('quiz-timer');
    t.hidden = false;
    runtime.timerId = setInterval(() => {
      const left = Math.max(0, runtime.endsAt - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      t.textContent = `⏱ ${m}:${s.toString().padStart(2, '0')}`;
      t.classList.toggle('is-low', left < 60000);
      if (left <= 0) {
        clearInterval(runtime.timerId);
        submitQuiz(true);
      }
    }, 250);
  }

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const rt = window.__ehQuizRuntime;
  if (!rt) return;
  const { quiz, questions, index, answers } = rt;
  const q = questions[index];
  const host = document.getElementById('quiz-runner');
  if (!host) return;

  const opts = quiz.shuffle_options ? shuffle(q.options.slice()) : q.options;

  host.innerHTML = `
    <div class="quiz-question">
      <div class="quiz-progress">
        <span>Question ${index + 1} of ${questions.length}</span>
        <div class="progress-bar"><span style="width:${((index + 1) / questions.length) * 100}%"></span></div>
      </div>
      <h3 class="quiz-prompt">${esc(q.prompt)}</h3>
      ${renderQuizInput(q, opts, answers[q.id])}
    </div>
  `;

  bindQuizInputs(q);
}

function renderQuizInput(q, opts, current) {
  if (q.type === 'single') {
    return `<ul class="quiz-options">${opts.map((o, i) => `
      <li><label class="quiz-option">
        <input type="radio" name="qz-${q.id}" value="${i}"
               ${Number(current) === i ? 'checked' : ''}>
        <span>${esc(String(o))}</span>
      </label></li>`).join('')}</ul>`;
  }
  if (q.type === 'multi') {
    const chosen = new Set((current || []).map(Number));
    return `<ul class="quiz-options">${opts.map((o, i) => `
      <li><label class="quiz-option">
        <input type="checkbox" name="qz-${q.id}" value="${i}"
               ${chosen.has(i) ? 'checked' : ''}>
        <span>${esc(String(o))}</span>
      </label></li>`).join('')}</ul>`;
  }
  if (q.type === 'code') {
    return `<textarea class="form-textarea quiz-code" rows="8" data-qid="${q.id}"
      placeholder="// your code">${esc(current || '')}</textarea>`;
  }
  // text
  return `<textarea class="form-textarea" rows="4" data-qid="${q.id}"
    placeholder="Type your answer…">${esc(current || '')}</textarea>`;
}

function bindQuizInputs(q) {
  const rt = window.__ehQuizRuntime;
  if (!rt) return;

  if (q.type === 'single') {
    document.querySelectorAll(`input[name="qz-${q.id}"]`).forEach(el => {
      el.onchange = () => { rt.answers[q.id] = Number(el.value); };
    });
  } else if (q.type === 'multi') {
    document.querySelectorAll(`input[name="qz-${q.id}"]`).forEach(el => {
      el.onchange = () => {
        const set = new Set(rt.answers[q.id] || []);
        el.checked ? set.add(Number(el.value)) : set.delete(Number(el.value));
        rt.answers[q.id] = Array.from(set);
      };
    });
  } else {
    const ta = document.querySelector(`[data-qid="${q.id}"]`);
    if (ta) ta.oninput = () => { rt.answers[q.id] = ta.value; };
  }
}

function moveQuiz(delta) {
  const rt = window.__ehQuizRuntime;
  if (!rt) return;
  const next = rt.index + delta;
  if (next < 0 || next >= rt.questions.length) return;
  rt.index = next;
  renderQuizQuestion();
}

function confirmSubmitQuiz() {
  const rt = window.__ehQuizRuntime;
  if (!rt) return;
  const unanswered = rt.questions.filter(q => {
    const a = rt.answers[q.id];
    if (q.type === 'multi') return !Array.isArray(a) || a.length === 0;
    return a === undefined || a === '' || a === null;
  }).length;
  if (unanswered && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
  submitQuiz(false);
}

async function submitQuiz(timedOut) {
  const rt = window.__ehQuizRuntime;
  if (!rt) return;
  if (rt.timerId) clearInterval(rt.timerId);
  try {
    showLoading(true);
    const result = await submitAttempt(rt.quiz.id, rt.attempt.id, rt.answers, timedOut);
    closeModal();
    openQuizResults(rt.quiz, result);
    window.EHNotifications?.push({
      kind: 'quiz',
      title: `Quiz ${result.passed ? 'passed' : 'completed'}`,
      body: `${rt.quiz.title} — ${result.score}%`,
    });
  } catch (err) {
    showToast(err.message || 'Submission failed', 'error');
  } finally {
    showLoading(false);
    window.__ehQuizRuntime = null;
  }
}

/* ============================================================
   LOCAL GRADING (fallback)
   ============================================================ */
function gradeAttemptLocally(quiz, answers) {
  let earned = 0, total = 0;
  const review = [];

  quiz.questions.forEach(q => {
    total += q.points;
    const given = answers[q.id];
    let correct = false;

    if (q.type === 'single') {
      correct = Number(given) === Number(q.answer);
    } else if (q.type === 'multi') {
      const a = (q.answer || []).map(Number).sort().join(',');
      const g = (given || []).map(Number).sort().join(',');
      correct = a && a === g;
    } else {
      // text/code: case-insensitive substring match against expected answer
      const expected = String(q.answer ?? '').trim().toLowerCase();
      const got = String(given ?? '').trim().toLowerCase();
      correct = expected && got && (got === expected || got.includes(expected));
    }

    if (correct) earned += q.points;
    review.push({ qid: q.id, correct, given, expected: q.answer });
  });

  const score = total ? Math.round((earned / total) * 100) : 0;
  return {
    id: 'att-result-' + Date.now(),
    quiz_id: quiz.id,
    score,
    points_earned: earned,
    points_total: total,
    passed: score >= quiz.passing_score,
    review,
  };
}

/* ============================================================
   RESULTS
   ============================================================ */
function openQuizResults(quiz, result) {
  const review = result.review || buildReviewFromQuiz(quiz, result);
  openModal({
    title: `Results — ${quiz.title}`,
    className: 'modal-lg',
    body: `
      <div class="quiz-result-hero ${result.passed ? 'is-pass' : 'is-fail'}">
        <div class="quiz-result-badge">
          <i class="fas ${result.passed ? 'fa-check-circle' : 'fa-times-circle'}"></i>
          <div class="quiz-result-score">${result.score}%</div>
        </div>
        <div class="quiz-result-summary">
          <h3>${result.passed ? 'Passed' : 'Not passed'}</h3>
          <p>Passing score is ${quiz.passing_score}%.
             You scored ${result.points_earned ?? '—'} / ${result.points_total ?? '—'} points.</p>
        </div>
      </div>

      <h3 class="panel-title" style="margin-top:20px">Question review</h3>
      <ul class="quiz-review-list">
        ${review.map((r, i) => {
          const q = quiz.questions.find(x => x.id === r.qid) || quiz.questions[i];
          return `
            <li class="quiz-review ${r.correct ? 'is-correct' : 'is-wrong'}">
              <div class="quiz-review-head">
                <span class="quiz-review-num">Q${i + 1}</span>
                <span class="quiz-review-prompt">${esc(q?.prompt || '')}</span>
                <span class="quiz-review-mark">
                  <i class="fas ${r.correct ? 'fa-check' : 'fa-times'}"></i>
                </span>
              </div>
              <div class="quiz-review-answer">
                <div><strong>Your answer:</strong> ${formatAnswer(q, r.given)}</div>
                ${r.correct ? '' : `<div><strong>Correct answer:</strong> ${formatAnswer(q, r.expected)}</div>`}
                ${q?.explanation ? `<div class="quiz-review-explain"><i class="fas fa-lightbulb"></i> ${esc(q.explanation)}</div>` : ''}
              </div>
            </li>`;
        }).join('')}
      </ul>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-primary" data-quiz-retry="${esc(quiz.id)}">
        <i class="fas fa-redo"></i> Retry
      </button>
    `,
  });

  document.querySelector(`[data-quiz-retry="${quiz.id}"]`)?.addEventListener('click', async () => {
    closeModal();
    await openQuiz(quiz.id);
  });
}

function buildReviewFromQuiz(quiz, result) {
  return quiz.questions.map(q => ({ qid: q.id, correct: null, given: null, expected: q.answer }));
}

function formatAnswer(q, value) {
  if (value === undefined || value === null || value === '') return '<em class="muted">No answer</em>';
  if (q?.type === 'single') return esc(String(q.options[Number(value)] ?? value));
  if (q?.type === 'multi') {
    const arr = (value || []).map(i => q.options[Number(i)] ?? i);
    return esc(arr.join(', '));
  }
  return esc(String(value));
}

/* ============================================================
   HELPERS
   ============================================================ */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---- delegated entry: `[data-action="take-quiz"]` anywhere in the app ---- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action="take-quiz"]');
  if (!el) return;
  const id = el.getAttribute('data-id');
  if (id) openQuiz(id);