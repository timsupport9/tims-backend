/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/course-player.js (FINAL)     */
/*                                                              */
/* SPRINT 1:                                                    */
/*   - A: bindPreviewInteractions + play-lesson-preview         */
/*                                                              */
/* SPRINT 2:                                                    */
/*   - C: Assignment lessons render a submission form;          */
/*        submission status, grade, feedback displayed          */
/*   - D: On final lesson completion, server returns course    */
/*        state — we surface certificate issuance or pending    */
/*                                                              */
/* EXPANSION (final):                                           */
/*   - Keyboard shortcuts: Space play/pause, ←/→ seek, F full,  */
/*     M mute, Esc close                                        */
/*   - Assignment draft auto-save to localStorage (per lesson)  */
/*   - Direct certificate download from player after completion */
/*   - Robust cleanup, no orphan listeners                      */
/* ============================================================ */

const __playerState = {
  courseId: null,
  lessonId: null,
  videoEl: null,
  pendingSeconds: 0,
  lastFlushedAt: 0,
  dirty: false,
  keyHandler: null,
};

let __lessonCanComplete = false;

/* SPRINT 2 / Item C — currently-loaded assignment payload */
S.currentAssignment = S.currentAssignment || null;

/* EXPANSION — draft key helper */
function __draftKey(lessonId) {
  return `expertHub.draft.assignment.${lessonId}`;
}

function __loadDraft(lessonId) {
  try { return localStorage.getItem(__draftKey(lessonId)) || ''; }
  catch { return ''; }
}

function __saveDraft(lessonId, text) {
  try {
    if (text && text.trim()) localStorage.setItem(__draftKey(lessonId), text);
    else localStorage.removeItem(__draftKey(lessonId));
  } catch {}
}

function __clearDraft(lessonId) {
  try { localStorage.removeItem(__draftKey(lessonId)); } catch {}
}

async function openCoursePlayer(courseId, lessonId) {
  __cleanupPlayer();

  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    if (d?.forbidden) { showLoading(false); return showToast('You do not have access to this course', 'error'); }

    const course     = d.course || {};
    const modules    = d.modules || [];
    const allLessons = modules.flatMap(m => m.lessons || []);
    if (!allLessons.length) {
      showLoading(false);
      return showToast('No lessons in this course yet', 'warning');
    }

    const currentLesson = lessonId
      ? (allLessons.find(l => String(l.id) === String(lessonId)) || allLessons[0])
      : allLessons[0];

    const needsAssignment = currentLesson.lesson_type === 'assignment';
    const [lessonData, notesData, qaData, discData, assignData] = await Promise.all([
      apiCall(`/api/eschool/lessons/${currentLesson.id}`).catch(() => ({ lesson: currentLesson, progress: null })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/notes`).catch(() => ({ notes: [] })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/questions`).catch(() => ({ questions: [] })),
      apiCall(`/api/eschool/courses/${courseId}/discussions`).catch(() => ({ discussions: [] })),
      needsAssignment
        ? apiCall(`/api/eschool/lessons/${currentLesson.id}/assignment`).catch(() => null)
        : Promise.resolve(null),
    ]);

    S.currentLesson         = lessonData.lesson || currentLesson;
    S.currentLessonProgress = lessonData.progress || null;
    S.lessonNotes           = notesData.notes || [];
    S.lessonQuestions       = qaData.questions || [];
    S.courseDiscussions     = discData.discussions || [];
    S.currentAssignment     = assignData || null;

    __lessonCanComplete = !!lessonData.can_complete || S.currentLessonProgress?.status === 'in_progress';

    __playerState.courseId = courseId;
    __playerState.lessonId = currentLesson.id;

    const completedLessons = allLessons.filter(l => l.progress?.status === 'completed').map(l => l.id);
    const idx = allLessons.findIndex(l => String(l.id) === String(currentLesson.id));
    const prev = idx > 0 ? allLessons[idx - 1] : null;
    const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

    const isAssignment = currentLesson.lesson_type === 'assignment';
    const assignmentStatus = S.currentAssignment?.submission?.status;
    const isAssignmentGraded = assignmentStatus === 'graded';
    const isAssignmentSubmitted = assignmentStatus === 'submitted' || isAssignmentGraded;

    const navHtml = isAssignment
      ? `
        <nav class="course-player-nav" aria-label="Lesson navigation">
          ${prev
            ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${prev.id}">
                <i class="fas fa-arrow-left" aria-hidden="true"></i> Previous</button>`
            : '<span></span>'}
          <span class="form-hint" style="align-self:center">
            ${isAssignmentGraded
              ? `Graded: ${S.currentAssignment.submission.score != null ? S.currentAssignment.submission.score + '%' : '—'}`
              : isAssignmentSubmitted
                ? 'Submitted — awaiting review'
                : 'Submit your work to complete this lesson'}
          </span>
          ${next
            ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${next.id}">
                Next <i class="fas fa-arrow-right" aria-hidden="true"></i></button>`
            : '<span></span>'}
        </nav>
      `
      : `
        <nav class="course-player-nav" aria-label="Lesson navigation">
          ${prev
            ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${prev.id}">
                <i class="fas fa-arrow-left" aria-hidden="true"></i> Previous</button>`
            : '<span></span>'}
          <button class="btn btn-primary btn-sm" data-action="mark-lesson-complete" data-lesson="${currentLesson.id}"
                  ${S.currentLessonProgress?.status === 'completed' ? 'disabled' : ''}>
            <i class="fas fa-check" aria-hidden="true"></i>
            ${S.currentLessonProgress?.status === 'completed' ? 'Completed' : 'Mark Complete'}</button>
          ${next
            ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${next.id}">
                Next <i class="fas fa-arrow-right" aria-hidden="true"></i></button>`
            : '<span></span>'}
        </nav>
      `;

    openModal({
      title: `${course.title || ''} — Lesson ${idx + 1} of ${allLessons.length}`,
      className: 'course-player-modal',
      body: `
        <div class="course-player-layout">
          <aside class="course-player-sidebar" aria-label="Course curriculum">
            <h3 class="panel-title">Curriculum</h3>
            ${modules.map(m => `
              <div class="player-module">
                <div class="player-module-header">${esc(m.title)}</div>
                ${(m.lessons || []).map(l => `
                  <div class="player-lesson ${String(l.id) === String(currentLesson.id) ? 'active' : ''} ${completedLessons.includes(l.id) ? 'completed' : ''}"
                       data-lesson-id="${l.id}" role="button" tabindex="0"
                       aria-label="${esc(l.title)}${completedLessons.includes(l.id) ? ', completed' : ''}">
                    <i class="fas ${completedLessons.includes(l.id) ? 'fa-check-circle' : lessonIcon(l.lesson_type)}" aria-hidden="true"></i>
                    <span>${esc(l.title)}</span>
                    ${l.lesson_type === 'assignment'
                      ? '<span class="chip chip-purple" style="font-size:0.6em;margin-left:auto">A</span>' : ''}
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </aside>

          <main class="course-player-main">
            <div id="lesson-content-host">${renderLessonContent(S.currentLesson, S.currentLessonProgress)}</div>

            ${navHtml}

            <div class="tabs-course-player" role="tablist">
              <button class="tab-btn tab-btn-active" role="tab" aria-selected="true" data-player-tab="notes">
                <i class="fas fa-sticky-note" aria-hidden="true"></i> Notes</button>
              <button class="tab-btn" role="tab" aria-selected="false" data-player-tab="qa">
                <i class="fas fa-question-circle" aria-hidden="true"></i> Q&amp;A</button>
              <button class="tab-btn" role="tab" aria-selected="false" data-player-tab="discussion">
                <i class="fas fa-comments" aria-hidden="true"></i> Discussion</button>
            </div>

            <div id="player-tab-content" role="tabpanel"></div>
          </main>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close Course</button>`,
    });

    bindPlayerInteractions(courseId, currentLesson.id);
    bindPlayerKeyboardShortcuts();

    if (isAssignment) {
      bindAssignmentInteractions(courseId, currentLesson.id);
    }
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

/* ============================================================ */
/* EXPANSION — global keyboard shortcuts (scoped to open modal) */
/* ============================================================ */
function bindPlayerKeyboardShortcuts() {
  __playerState.keyHandler = (e) => {
    // Only when player modal is open
    const player = document.querySelector('.course-player-modal');
    if (!player) return;
    // Skip if focus is in an input/textarea/select
    const tag = (e.target?.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable) return;

    const v = __playerState.videoEl;
    if (!v) return;

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        v.paused ? v.play().catch(() => {}) : v.pause();
        break;
      case 'ArrowRight':
        if (e.shiftKey) { e.preventDefault(); v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); }
        break;
      case 'ArrowLeft':
        if (e.shiftKey) { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); }
        break;
      case 'm':
        v.muted = !v.muted;
        showToast(v.muted ? 'Muted' : 'Unmuted', 'info', 1500);
        break;
      case 'f':
        if (document.fullscreenElement) document.exitFullscreen?.();
        else v.requestFullscreen?.().catch(() => {});
        break;
    }
  };
  document.addEventListener('keydown', __playerState.keyHandler);
}

function renderLessonContent(lesson, progress) {
  if (!lesson) return '<p class="empty-row">No lesson data</p>';

  if (lesson.lesson_type === 'assignment') {
    return renderAssignmentLesson(lesson, progress);
  }

  const content    = lesson.content || lesson.description || '';
  const resources  = safeJsonArray(lesson.resources);
  const transcript = lesson.transcript_url || '';
  const resumeAt   = Number(progress?.position_seconds || 0);

  return `
    <div class="lesson-content">
      <h2 class="lesson-title">${esc(lesson.title)}</h2>
      <div class="lesson-meta-row">
        <span class="chip chip-neutral">${esc(lesson.lesson_type || 'video')}</span>
        <span class="program-meta">${lesson.duration_minutes || 0} min</span>
        ${progress?.status === 'completed'
          ? '<span class="status status-active">Completed</span>'
          : progress?.status === 'in_progress'
          ? '<span class="status status-pending">In Progress</span>'
          : ''}
        ${resumeAt > 5 && progress?.status !== 'completed'
          ? `<span class="chip chip-blue">Resume at ${Math.floor(resumeAt/60)}:${String(resumeAt%60).padStart(2,'0')}</span>`
          : ''}
      </div>

      ${lesson.lesson_type === 'video' && lesson.video_url ? `
        <div class="lesson-video-wrap">
          <video id="lesson-video" controls preload="metadata" playsinline
                 poster="${esc(lesson.thumbnail || '')}" style="width:100%"
                 data-resume="${resumeAt}"
                 aria-label="Lesson video: ${esc(lesson.title)}">
            <source src="${esc(lesson.video_url)}" />
            ${lesson.captions_url ? `<track kind="captions" src="${esc(lesson.captions_url)}" srclang="en" label="English" default />` : ''}
            Your browser does not support video playback.
          </video>
          <p id="video-error" class="form-hint" style="display:none;color:var(--danger)" role="alert"></p>
          <div class="player-aux-controls">
            ${transcript ? `<a href="${esc(transcript)}" target="_blank" rel="noopener" class="btn btn-ghost btn-xs">
              <i class="fas fa-file-alt"></i> Transcript</a>` : ''}
            <label class="form-hint" style="display:inline-flex;align-items:center;gap:6px">
              Playback speed
              <select id="lesson-speed" class="form-select" style="width:auto;padding:2px 6px">
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </label>
            <span class="form-hint" style="margin-left:auto;font-size:0.75em">
              <i class="fas fa-keyboard"></i> Space: play · Shift+←/→: 10s · M: mute · F: fullscreen
            </span>
          </div>
        </div>
      ` : ''}

      ${lesson.lesson_type === 'audio' && lesson.audio_url ? `
        <audio id="lesson-audio" controls preload="metadata" style="width:100%;margin-top:12px"
               data-resume="${resumeAt}"
               aria-label="Lesson audio: ${esc(lesson.title)}">
          <source src="${esc(lesson.audio_url)}" />
        </audio>
      ` : ''}

      ${lesson.lesson_type === 'slides' && lesson.slides_url ? `
        <div class="lesson-slides">
          <a class="btn btn-primary" href="${esc(lesson.slides_url)}" target="_blank" rel="noopener">
            <i class="fas fa-file-powerpoint"></i> Open Slides</a>
        </div>
      ` : ''}

      ${content ? `<div class="lesson-body">${content.replace(/\n/g, '<br/>')}</div>` : ''}

      ${resources.length ? `
        <div class="lesson-resources">
          <h4>Resources</h4>
          ${resources.map(r => `
            <a class="lesson-resource-link" href="${esc(r.url)}" target="_blank" rel="noopener">
              <i class="fas fa-download" aria-hidden="true"></i> ${esc(r.name || 'Download')}
            </a>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/* ============================================================ */
/* SPRINT 2 / Item C — Assignment lesson renderer               */
/* ============================================================ */

function renderAssignmentLesson(lesson, progress) {
  const a = S.currentAssignment;
  const submission = a?.submission || null;
  const assignment = a?.assignment || a || {};

  const submittedStatus = submission?.status;
  const isGraded = submittedStatus === 'graded';
  const isSubmitted = submittedStatus === 'submitted' || isGraded;

  const score = submission?.score;
  const passed = submission?.passed === true || (isGraded && score != null && Number(score) >= Number(assignment.pass_score || 60));
  const canResubmit = submission?.can_resubmit === true || (isGraded && !passed && assignment.allow_resubmit !== false);

  /* EXPANSION — restore draft when re-rendering the form */
  const draft = !isSubmitted ? __loadDraft(lesson.id) : '';

  return `
    <div class="assignment-content">
      <h2 class="lesson-title">${esc(lesson.title)}</h2>
      <div class="lesson-meta-row">
        <span class="chip chip-purple"><i class="fas fa-file-alt"></i> Assignment</span>
        ${assignment.max_score ? `<span class="program-meta">Worth ${assignment.max_score} points</span>` : ''}
        ${assignment.due_at ? `<span class="program-meta">Due ${fmtDT(assignment.due_at)}</span>` : ''}
        ${isGraded
          ? `<span class="status ${passed ? 'status-active' : 'status-rejected'}">
              ${passed ? 'Passed' : 'Needs revision'}
             </span>`
          : isSubmitted
            ? '<span class="status status-pending">Submitted — awaiting grade</span>'
            : '<span class="status status-pending">Not submitted</span>'}
      </div>

      ${assignment.description || lesson.content ? `
        <div class="assignment-prompt">
          <h3 class="panel-title" style="margin-top:16px">Assignment</h3>
          <div class="lesson-body">${(assignment.description || lesson.content || '').replace(/\n/g, '<br/>')}</div>
        </div>
      ` : ''}

      ${(assignment.rubric || []).length ? `
        <div class="assignment-rubric" style="margin-top:16px">
          <h3 class="panel-title">Grading rubric</h3>
          <ul class="list-stack">
            ${assignment.rubric.map(r => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(r.criterion || '')}</span>
                  ${r.description ? `<span class="list-row-sub">${esc(r.description)}</span>` : ''}
                </div>
                <span class="chip chip-neutral">${r.points || 0} pts</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${isSubmitted ? `
        <div class="assignment-submission" style="margin-top:20px">
          <h3 class="panel-title">
            <i class="fas ${isGraded ? 'fa-check-circle' : 'fa-clock'}" style="color:var(--${isGraded ? 'accent' : 'warning'})"></i>
            Your submission
          </h3>
          <p class="form-hint">Submitted ${timeAgo(submission.submitted_at || submission.created_at)}</p>
          ${submission.text ? `
            <div class="lesson-body" style="margin-top:8px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2)">
              ${esc(submission.text).replace(/\n/g, '<br/>')}
            </div>
          ` : ''}
          ${(submission.files || []).length ? `
            <p style="margin-top:8px">
              ${(submission.files || []).map(f => `
                <a class="btn btn-ghost btn-xs" href="${esc(f.url)}" target="_blank" rel="noopener">
                  <i class="fas fa-paperclip"></i> ${esc(f.name || 'Attachment')}
                </a>
              `).join(' ')}
            </p>
          ` : ''}

          ${isGraded ? `
            <div class="assignment-grade" style="
              margin-top:16px;padding:16px;border-radius:8px;
              background:${passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'};
              border:1px solid ${passed ? 'var(--accent)' : 'var(--danger)'}">
              <p style="font-size:1.2rem;font-weight:600;margin-bottom:8px">
                ${esc(String(score))}${assignment.max_score ? '/' + assignment.max_score : '%'}
                <span class="chip chip-${passed ? 'green' : 'red'}" style="margin-left:8px">
                  ${passed ? 'Passed' : 'Needs revision'}
                </span>
              </p>
              ${submission.feedback ? `
                <p><strong>Feedback from ${esc(submission.grader_name || 'instructor')}:</strong></p>
                <div style="white-space:pre-wrap">${esc(submission.feedback)}</div>
              ` : '<p class="form-hint">No feedback provided.</p>'}
            </div>
            ${!passed && canResubmit ? `
              <button class="btn btn-primary btn-sm" id="assignmentResubmitBtn" style="margin-top:12px">
                <i class="fas fa-redo"></i> Resubmit
              </button>
            ` : ''}
          ` : `
            ${submission.allow_edit ? `
              <button class="btn btn-secondary btn-sm" id="assignmentEditBtn" style="margin-top:12px">
                <i class="fas fa-pen"></i> Update submission
              </button>
            ` : ''}
          `}
        </div>
      ` : `
        <div class="assignment-form" style="margin-top:20px" id="assignmentFormWrap">
          <h3 class="panel-title">Submit your work</h3>
          <label class="form-group">
            <span class="form-label">Your answer</span>
            <textarea id="assignmentText" class="form-textarea" rows="6"
                      placeholder="${esc(assignment.text_placeholder || 'Type your answer here...')}"
                      maxlength="10000">${esc(draft)}</textarea>
            <p class="form-hint" id="assignmentDraftHint" style="display:${draft ? 'block' : 'none'}">
              <i class="fas fa-save"></i> Draft restored from this device
            </p>
          </label>
          <label class="form-group">
            <span class="form-label">Attach files (optional)</span>
            <input type="file" id="assignmentFiles" class="form-input" multiple
                   accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip,.py,.js,.html,.css,.csv" />
            <p class="form-hint">
              Max ${assignment.max_file_size_mb || 25}MB per file. Accepted: PDF, DOC, TXT, images, ZIP, and code files.
            </p>
          </label>
          <div class="panel-actions">
            <button class="btn btn-primary" id="assignmentSubmitBtn">
              <i class="fas fa-paper-plane"></i> Submit Assignment</button>
          </div>
        </div>
      `}
    </div>
  `;
}

function bindAssignmentInteractions(courseId, lessonId) {
  const submitBtn = document.getElementById('assignmentSubmitBtn');
  if (submitBtn) submitBtn.onclick = () => _doSubmitAssignment(lessonId, { edit: false });

  const editBtn = document.getElementById('assignmentEditBtn');
  if (editBtn) editBtn.onclick = () => _openAssignmentEditForm(lessonId);

  const resubmitBtn = document.getElementById('assignmentResubmitBtn');
  if (resubmitBtn) resubmitBtn.onclick = () => _openAssignmentEditForm(lessonId);

  /* EXPANSION — auto-save draft as user types */
  const textEl = document.getElementById('assignmentText');
  if (textEl) {
    const saveDraft = debounce(() => __saveDraft(lessonId, textEl.value), 400);
    textEl.addEventListener('input', saveDraft);
  }
}

function _openAssignmentEditForm(lessonId) {
  const host = document.getElementById('lesson-content-host');
  if (!host) return;

  const assignment = S.currentAssignment?.assignment || S.currentAssignment || {};
  const submission = S.currentAssignment?.submission || {};
  const draft = __loadDraft(lessonId);

  host.innerHTML = `
    <div class="assignment-content">
      <h2 class="lesson-title">${esc(S.currentLesson.title)}</h2>
      <div class="assignment-form" style="margin-top:16px">
        <h3 class="panel-title">Update your submission</h3>
        <label class="form-group">
          <span class="form-label">Your answer</span>
          <textarea id="assignmentText" class="form-textarea" rows="6" maxlength="10000">${esc(submission.text || draft || '')}</textarea>
        </label>
        <label class="form-group">
          <span class="form-label">Attach files (optional)</span>
          <input type="file" id="assignmentFiles" class="form-input" multiple
                 accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip,.py,.js,.html,.css,.csv" />
          <p class="form-hint">Max ${assignment.max_file_size_mb || 25}MB per file.</p>
        </label>
        <div class="panel-actions">
          <button class="btn btn-secondary" id="assignmentCancelBtn">Cancel</button>
          <button class="btn btn-primary" id="assignmentSubmitBtn">
            <i class="fas fa-paper-plane"></i> Save &amp; Resubmit</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('assignmentSubmitBtn').onclick = () =>
    _doSubmitAssignment(lessonId, { edit: true });
  document.getElementById('assignmentCancelBtn').onclick = () =>
    rerenderCurrentPlayerLesson();

  const textEl = document.getElementById('assignmentText');
  if (textEl) {
    textEl.addEventListener('input', debounce(() => __saveDraft(lessonId, textEl.value), 400));
  }
}

function rerenderCurrentPlayerLesson() {
  const courseId = __playerState.courseId;
  const lessonId = __playerState.lessonId;
  if (!courseId || !lessonId) return;
  __cleanupPlayer();
  closeModal();
  openCoursePlayer(courseId, lessonId);
}

async function _doSubmitAssignment(lessonId, { edit = false } = {}) {
  const textEl = document.getElementById('assignmentText');
  const filesEl = document.getElementById('assignmentFiles');
  const btn = document.getElementById('assignmentSubmitBtn');
  const text = (textEl?.value || '').trim();
  const files = Array.from(filesEl?.files || []);

  if (!text && !files.length && !edit) {
    return showToast('Enter an answer or attach at least one file', 'error');
  }

  const maxMb = Number((S.currentAssignment?.assignment || S.currentAssignment || {}).max_file_size_mb || 25);
  for (const f of files) {
    if (f.size > maxMb * 1024 * 1024) {
      return showToast(`File "${f.name}" exceeds ${maxMb}MB`, 'error');
    }
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Submitting…';
  }

  try {
    let r;
    if (files.length) {
      const fd = new FormData();
      fd.append('text', text);
      files.forEach(f => fd.append('files[]', f));
      r = await apiCall(`/api/eschool/lessons/${lessonId}/submission`, 'POST', fd, true);
    } else {
      r = await apiCall(`/api/eschool/lessons/${lessonId}/submission`, 'POST', { text });
    }

    /* EXPANSION — clear draft on successful submit */
    __clearDraft(lessonId);

    showToast(
      r?.auto_graded
        ? `Submitted! Score: ${r.score != null ? r.score + '%' : '—'}`
        : 'Assignment submitted — awaiting instructor review',
      'success', 6000
    );

    await rerenderCurrentPlayerLesson();
  } catch (e) {
    showToast(e.message || 'Submission failed', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assignment';
    }
  }
}

/* ============================================================ */
/* Standard lesson interactions                                */
/* ============================================================ */

function bindPlayerInteractions(courseId, lessonId) {
  document.querySelectorAll('.player-lesson').forEach(el => {
    const go = () => { closeModal(); openCoursePlayer(courseId, el.dataset.lessonId); };
    el.onclick = go;
    el.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    };
  });

  document.querySelectorAll('[data-player-tab]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-player-tab]').forEach(b => {
        b.classList.remove('tab-btn-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('tab-btn-active');
      btn.setAttribute('aria-selected', 'true');
      const tab = btn.dataset.playerTab;
      const host = $('#player-tab-content');
      if (tab === 'notes')           host.innerHTML = renderLessonNotes();
      else if (tab === 'qa')         host.innerHTML = renderLessonQA();
      else if (tab === 'discussion') host.innerHTML = renderLessonDiscussion(lessonId);
      bindPlayerTabEvents(courseId, lessonId);
    };
  });

  const host = $('#player-tab-content');
  if (host) {
    host.innerHTML = renderLessonNotes();
    bindPlayerTabEvents(courseId, lessonId);
  }

  const video = $('#lesson-video');
  if (video) {
    __playerState.videoEl = video;
    const resume = Number(video.dataset.resume || 0);
    const onLoadedMetadata = () => {
      if (resume > 5 && video.duration && resume < video.duration - 5) {
        try { video.currentTime = resume; } catch {}
      }
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    video.addEventListener('error', () => {
      const err = $('#video-error');
      if (err) {
        err.style.display = 'block';
        err.textContent = 'Video failed to load. Check your connection or try again.';
      }
    });

    const speedSel = $('#lesson-speed');
    if (speedSel) speedSel.onchange = () => {
      try { video.playbackRate = Number(speedSel.value); } catch {}
    };

    video.addEventListener('timeupdate', () => {
      __playerState.pendingSeconds = Math.floor(video.currentTime);
      __playerState.dirty = true;
      const now = Date.now();
      if (now - __playerState.lastFlushedAt >= 10000) {
        _flushPlayerProgress(lessonId);
      }
    });
    video.addEventListener('pause', () => _flushPlayerProgress(lessonId));
    video.addEventListener('seeked', () => _flushPlayerProgress(lessonId));
    video.addEventListener('ended', () => {
      _flushPlayerProgress(lessonId);
      if (S.currentLessonProgress?.status !== 'completed') {
        showToast('Lesson ended. Click "Mark Complete" to finish.', 'info', 4000);
      }
    });
  }

  const audio = $('#lesson-audio');
  if (audio) {
    const resume = Number(audio.dataset.resume || 0);
    const onMeta = () => {
      if (resume > 5 && audio.duration && resume < audio.duration - 5) {
        try { audio.currentTime = resume; } catch {}
      }
      audio.removeEventListener('loadedmetadata', onMeta);
    };
    audio.addEventListener('loadedmetadata', onMeta);
    let lastSaved = 0;
    audio.addEventListener('timeupdate', () => {
      const current = Math.floor(audio.currentTime);
      if (current - lastSaved >= 10) {
        lastSaved = current;
        apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', {
          position_seconds: current,
          time_spent_seconds: 10,
        }).catch(() => {});
      }
    });
  }
}

function _flushPlayerProgress(lessonId) {
  if (!__playerState.dirty) return;
  const current = __playerState.pendingSeconds;
  __playerState.dirty = false;
  __playerState.lastFlushedAt = Date.now();
  apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', {
    position_seconds: current,
    time_spent_seconds: 10,
  }).catch(() => {});
}

function __cleanupPlayer() {
  if (__playerState.lessonId) {
    try { _flushPlayerProgress(__playerState.lessonId); } catch {}
  }
  if (__playerState.keyHandler) {
    try { document.removeEventListener('keydown', __playerState.keyHandler); } catch {}
    __playerState.keyHandler = null;
  }
  __playerState.courseId = null;
  __playerState.lessonId = null;
  __playerState.videoEl = null;
  __playerState.pendingSeconds = 0;
  __playerState.lastFlushedAt = 0;
  __playerState.dirty = false;
  __lessonCanComplete = false;
  S.currentAssignment = null;
}

/* ============================================================ */
/* Tab content renderers */
/* ============================================================ */

function renderLessonNotes() {
  return `
    <div class="notes-panel">
      <div class="notes-add">
        <textarea id="new-note-text" class="form-textarea" rows="3"
                  placeholder="Write a note for this lesson..."></textarea>
        <button class="btn btn-primary btn-sm" id="add-note-btn">
          <i class="fas fa-plus"></i> Add Note</button>
      </div>
      <ul class="notes-list">
        ${(S.lessonNotes || []).map(n => `
          <li class="note-item">
            <p class="note-content">${esc(n.content)}</p>
            <span class="note-time">${timeAgo(n.created_at)}</span>
          </li>
        `).join('') || '<li class="empty-row">No notes yet</li>'}
      </ul>
    </div>
  `;
}

function renderLessonQA() {
  return `
    <div class="qa-panel">
      <div class="qa-add">
        <input id="lesson-q-input" class="form-input" placeholder="Ask a question about this lesson..." />
        <button class="btn btn-primary btn-sm" id="lesson-q-btn">
          <i class="fas fa-paper-plane"></i> Ask</button>
      </div>
      <ul class="qa-list">
        ${(S.lessonQuestions || []).map(q => `
          <li class="qa-item">
            <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
            ${q.answer
              ? `<p class="qa-a"><strong>Answer:</strong> ${esc(q.answer)}</p>`
              : '<p class="qa-pending">Awaiting answer from instructor</p>'}
          </li>
        `).join('') || '<li class="empty-row">No questions yet. Be the first to ask!</li>'}
      </ul>
    </div>
  `;
}

function renderLessonDiscussion(lessonId) {
  const discussions = (S.courseDiscussions || [])
    .filter(d => String(d.lesson_id) === String(lessonId));
  return `
    <div class="discussion-panel">
      <div class="discussion-add">
        <textarea id="discussion-input" class="form-textarea" rows="2"
                  placeholder="Start a discussion..."></textarea>
        <button class="btn btn-primary btn-sm" id="discussion-post-btn">
          <i class="fas fa-comment"></i> Post</button>
      </div>
      <ul class="discussion-list">
        ${discussions.map(d => `
          <li class="discussion-item">
            <img class="user-avatar" src="${avatar({ name: d.author_name })}" alt="" />
            <div class="discussion-body">
              <div class="discussion-author">
                <strong>${esc(d.author_name || 'Anonymous')}</strong>
                <span class="discussion-time">${timeAgo(d.created_at)}</span>
              </div>
              <p>${esc(d.body)}</p>
              <div class="discussion-actions">
                <button class="btn btn-ghost btn-xs" data-action="upvote-discussion" data-id="${d.id}">
                  <i class="fas fa-arrow-up"></i> ${d.upvotes || 0}</button>
              </div>
            </div>
          </li>
        `).join('') || '<li class="empty-row">No discussions yet</li>'}
      </ul>
    </div>
  `;
}

function bindPlayerTabEvents(courseId, lessonId) {
  const addBtn = $('#add-note-btn');
  if (addBtn) addBtn.onclick = async () => {
    const text = ($('#new-note-text')?.value || '').trim();
    if (!text || addBtn.disabled) return;
    addBtn.disabled = true;
    try {
      const v = __playerState.videoEl;
      const ts = v ? Math.floor(v.currentTime) : null;
      await apiCall(`/api/eschool/lessons/${lessonId}/notes`, 'POST', {
        content: text,
        timestamp_seconds: ts,
      });
      const d = await apiCall(`/api/eschool/lessons/${lessonId}/notes`);
      S.lessonNotes = d.notes || [];
      $('#player-tab-content').innerHTML = renderLessonNotes();
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
    finally { addBtn.disabled = false; }
  };

  const askBtn = $('#lesson-q-btn');
  if (askBtn) askBtn.onclick = async () => {
    const q = ($('#lesson-q-input')?.value || '').trim();
    if (!q || askBtn.disabled) return;
    askBtn.disabled = true;
    try {
      await apiCall(`/api/eschool/lessons/${lessonId}/questions`, 'POST', { question: q });
      const d = await apiCall(`/api/eschool/lessons/${lessonId}/questions`);
      S.lessonQuestions = d.questions || [];
      $('#player-tab-content').innerHTML = renderLessonQA();
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
    finally { askBtn.disabled = false; }
  };

  const postBtn = $('#discussion-post-btn');
  if (postBtn) postBtn.onclick = async () => {
    const body = ($('#discussion-input')?.value || '').trim();
    if (!body || postBtn.disabled) return;
    postBtn.disabled = true;
    try {
      await apiCall('/api/eschool/discussions', 'POST', { course_id: courseId, lesson_id: lessonId, body });
      const d = await apiCall(`/api/eschool/courses/${courseId}/discussions`);
      S.courseDiscussions = d.discussions || [];
      $('#player-tab-content').innerHTML = renderLessonDiscussion(lessonId);
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
    finally { postBtn.disabled = false; }
  };
}

/* ============================================================ */
/* Actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('open-course-player', (id) => openCoursePlayer(id));

window.ExpertHubUser.registerAction('open-lesson', (_, el) => {
  const courseId = el?.dataset?.course || __playerState.courseId;
  const lessonId = el?.dataset?.lesson;
  __cleanupPlayer();
  closeModal();
  openCoursePlayer(courseId, lessonId);
});

/* SPRINT 2 / D — mark-lesson-complete handles course-complete + cert */
window.ExpertHubUser.registerAction('mark-lesson-complete', async (lessonId) => {
  try {
    const r = await apiCall(`/api/eschool/lessons/${lessonId}/complete`, 'POST');
    if (r?.completed === false) {
      return showToast(r.reason || 'Completion requirements not met yet', 'warning');
    }

    const courseId = __playerState.courseId;

    if (r?.course_completed) {
      if (r?.certificate_id) {
        showToast('Course complete! Certificate issued.', 'success', 6000);
        if (r.certificate_id && !S.certificates?.some(c => String(c.id) === String(r.certificate_id))) {
          S.certificates = S.certificates || [];
          S.certificates.unshift({
            id: r.certificate_id,
            course_id: courseId,
            course_title: r.course_title || '',
            serial: r.certificate_serial || '',
            issued_at: new Date().toISOString(),
          });
        }
        setTimeout(() => {
          openModal({
            title: '🎉 Course Complete!',
            body: `
              <div style="text-align:center;padding:20px">
                <i class="fas fa-certificate" style="font-size:3rem;color:var(--accent)"></i>
                <h3 style="margin-top:16px">Congratulations!</h3>
                <p>You've completed the course and earned your certificate.</p>
                ${r.certificate_serial ? `<p class="form-hint">Serial: <code class="code">${esc(r.certificate_serial)}</code></p>` : ''}
              </div>
            `,
            footer: `
              
              <button class="btn btn-secondary" data-close-modal>Close</button>
              <button class="btn btn-info" data-action="view-certificate"
                      data-course="${courseId}" onclick="closeModal()">
                <i class="fas fa-eye"></i> View Certificate</button>
              <button class="btn btn-primary" data-action="download-certificate"
                      data-course="${courseId}">
                <i class="fas fa-download"></i> Download PDF</button>
            `,
          });
        }, 800);
      } else {
        showToast('Course complete! Certificate will be issued after review.', 'info', 6000);
      }
    } else {
      showToast('Lesson completed!', 'success');
    }

    /* Refresh enrolment + certificate data so badges update everywhere */
    await _refreshLearningData({ force: true });
    rerenderRoleContent();

    /* Reload player unless we just showed the completion modal */
    if (!r?.course_completed) {
      const cid = __playerState.courseId;
      const lid = __playerState.lessonId;
      if (cid && lid) {
        closeModal();
        openCoursePlayer(cid, lid);
      }
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
});

/* ============================================================ */
/* SPRINT 1 / Item A — free preview lesson player (non-enrolled) */
/* ============================================================ */
window.ExpertHubUser.registerAction('play-lesson-preview', async (lessonId, el) => {
  const courseId = el?.dataset?.course;
  if (!lessonId) return;
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/lessons/${lessonId}/preview`).catch(() => null);
    showLoading(false);

    if (!d || d.forbidden) {
      return showToast(
        d?.reason || 'Preview is not available for this lesson.',
        'warning'
      );
    }

    const lesson = d.lesson || {};
    const modules = d.modules || [];
    const allLessons = modules.flatMap(m => m.lessons || []);

    S.currentLesson = lesson;
    S.currentLessonProgress = null;
    S.previewMode = true;

    __cleanupPlayer();
    __playerState.courseId = courseId || null;
    __playerState.lessonId = lesson.id;

    const idx = allLessons.findIndex(l => String(l.id) === String(lesson.id));
    const prev = idx > 0 ? allLessons[idx - 1] : null;
    const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

    const navHtml = `
      <nav class="course-player-nav" aria-label="Preview navigation">
        ${prev
          ? `<button class="btn btn-secondary btn-sm" data-action="play-lesson-preview"
                     data-course="${courseId}" data-id="${prev.id}">
               <i class="fas fa-arrow-left" aria-hidden="true"></i> Previous</button>`
          : '<span></span>'}
        <span class="chip chip-green" style="align-self:center">
          <i class="fas fa-play"></i> Free preview</span>
        ${next
          ? `<button class="btn btn-secondary btn-sm" data-action="play-lesson-preview"
                     data-course="${courseId}" data-id="${next.id}">
               Next <i class="fas fa-arrow-right" aria-hidden="true"></i></button>`
          : '<span></span>'}
      </nav>
    `;

    openModal({
      title: `${d.course_title || 'Preview'} — ${esc(lesson.title)}`,
      className: 'course-player-modal',
      body: `
        <div class="course-player-layout">
          <aside class="course-player-sidebar" aria-label="Preview curriculum">
            <h3 class="panel-title">Preview Lessons</h3>
            ${modules.map(m => `
              <div class="player-module">
                <div class="player-module-header">${esc(m.title)}</div>
                ${(m.lessons || []).map(l => `
                  <div class="player-lesson ${String(l.id) === String(lesson.id) ? 'active' : ''} ${l.is_preview ? 'is-preview' : ''}"
                       ${l.is_preview ? `data-action="play-lesson-preview" data-course="${courseId}" data-id="${l.id}" role="button" tabindex="0"` : ''}>
                    <i class="fas ${lessonIcon(l.lesson_type)}" aria-hidden="true"></i>
                    <span>${esc(l.title)}</span>
                    ${l.is_preview
                      ? '<span class="chip chip-green" style="font-size:0.6em;margin-left:auto"><i class="fas fa-play"></i></span>'
                      : '<i class="fas fa-lock curriculum-lock" style="margin-left:auto" aria-hidden="true"></i>'}
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </aside>

          <main class="course-player-main">
            <div id="lesson-content-host">
              ${lesson.video_url ? `
                <div class="lesson-video-wrap">
                  <video id="lesson-video" controls preload="metadata" playsinline
                         style="width:100%"
                         aria-label="Preview video: ${esc(lesson.title)}">
                    <source src="${esc(lesson.video_url)}" />
                    Your browser does not support video playback.
                  </video>
                </div>
              ` : ''}
              ${lesson.audio_url ? `
                <audio id="lesson-audio" controls preload="metadata" style="width:100%;margin-top:12px"
                       aria-label="Preview audio: ${esc(lesson.title)}">
                  <source src="${esc(lesson.audio_url)}" />
                </audio>
              ` : ''}
              ${lesson.description ? `<div class="lesson-body">${lesson.description.replace(/\n/g, '<br/>')}</div>` : ''}
            </div>

            ${navHtml}

            <div class="panel" style="margin-top:16px;padding:16px;background:var(--surface-2);border-radius:8px">
              <p class="form-hint" style="margin:0">
                <i class="fas fa-info-circle"></i>
                You're viewing a free preview. Enrol to unlock all lessons and earn a certificate.
              </p>
              <button class="btn btn-primary btn-sm" style="margin-top:10px"
                      data-action="enroll-modal" data-id="${courseId}" onclick="closeModal()">
                <i class="fas fa-shopping-cart"></i> Enroll Now</button>
            </div>
          </main>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close Preview</button>`,
    });

    /* Bind preview lesson-list navigation */
    bindPreviewInteractions(courseId);

    /* Bind video controls without progress flushing */
    const video = $('#lesson-video');
    if (video) {
      __playerState.videoEl = video;
      video.addEventListener('error', () => {
        const err = $('#video-error');
        if (err) {
          err.style.display = 'block';
          err.textContent = 'Preview video failed to load.';
        }
      });
      bindPlayerKeyboardShortcuts();
    }
  } catch (e) {
    showLoading(false);
    showToast(e.message || 'Could not load preview', 'error');
  }
});

/* Bind click/keyboard on preview lesson rows (sidebar) */
function bindPreviewInteractions(courseId) {
  document.querySelectorAll('.course-player-modal .player-lesson[data-action]').forEach(el => {
    const go = () => {
      const lessonId = el.dataset.id;
      const cid = el.dataset.course || courseId;
      closeModal();
      window.ExpertHubUser.dispatchAction?.('play-lesson-preview', lessonId, { dataset: { course: cid, id: lessonId } });
    };
    el.onclick = go;
    el.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    };
  });
}

/* ============================================================ */
/* Discussion upvote action (used by discussion tab)            */
/* ============================================================ */
window.ExpertHubUser.registerAction('upvote-discussion', async (id) => {
  try {
    const r = await apiCall(`/api/eschool/discussions/${id}/upvote`, 'POST');
    const entry = (S.courseDiscussions || []).find(d => String(d.id) === String(id));
    if (entry && r?.upvotes != null) entry.upvotes = r.upvotes;
    /* Re-render just the discussion tab, preserving other state */
    const lessonId = __playerState.lessonId;
    if (lessonId && $('#player-tab-content')) {
      $('#player-tab-content').innerHTML = renderLessonDiscussion(lessonId);
      bindPlayerTabEvents(__playerState.courseId, lessonId);
    }
  } catch (e) {
    showToast(e.message || 'Could not upvote', 'error');
  }
});

/* ============================================================ */
/* Safety: clean up keyboard handler + progress on modal close  */
/* ============================================================ */
(function installPlayerCleanupObserver() {
  if (typeof MutationObserver === 'undefined') return;
  const obs = new MutationObserver(() => {
    const open = document.querySelector('.course-player-modal');
    if (!open && __playerState.keyHandler) {
      try { __cleanupPlayer(); } catch {}
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();

/* Handle browser tab close / navigate away — flush progress */
window.addEventListener('beforeunload', () => {
  try { _flushPlayerProgress(__playerState.lessonId); } catch {}
  try { __cleanupPlayer(); } catch {}
});

/* Export for other modules */
window.CoursePlayer = {
  open: openCoursePlayer,
  preview: (lessonId, courseId) => {
    const fakeEl = { dataset: { course: String(courseId), id: String(lessonId) } };
    window.ExpertHubUser.dispatchAction?.('play-lesson-preview', lessonId, fakeEl);
  },
  cleanup: __cleanupPlayer,
};