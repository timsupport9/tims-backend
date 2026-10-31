/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/course-player.js              */
/* Digital classroom: full-page 2-column layout, accessible      */
/* playback, debounced progress sync, resume position,           */
/* offline-safe notes, backend-determined completion.           */
/*                                                               */
/* Rendered via UserUI.page() — NOT a modal.                    */
/* Registered as module "course-player" and routed by            */
/* setting `activeTab = 'course-player'` + rerenderRoleContent() */
/* ============================================================ */

/* ---------------- Global module state ---------------- */

let activeCoursePlayerId = null;
let activeLessonId       = null;
let __playerActiveTab    = 'overview';   // overview | notes | qa | discussion | resources

const __playerState = {
  courseId: null,
  lessonId: null,
  videoEl: null,
  pendingSeconds: 0,
  lastFlushedAt: 0,
  dirty: false,
};

/* Track lesson completion eligibility returned by server */
let __lessonCanComplete = false;

/* ============================================================ */
/* Helpers                                                       */
/* ============================================================ */

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/* Safely escape and render a course thumbnail */
function courseThumb(course) {
  return course?.thumbnail || '/assets/default-course.png';
}

/* ============================================================ */
/* Actions — entry points                                        */
/* ============================================================ */

window.ExpertHubUser.registerAction('open-course-player', async (id, el) => {
  const targetLesson = el?.dataset?.lesson || null;
  const sameCourse   = String(id) === String(activeCoursePlayerId) && __playerState.courseId;

  if (sameCourse && targetLesson && String(targetLesson) === String(__playerState.lessonId)) {
    return; // Already viewing this lesson
  }

  __cleanupPlayer();
  activeCoursePlayerId = id;
  activeLessonId       = targetLesson;

  if (sameCourse) {
    // Same course — only fetch the new lesson; keep curriculum in memory.
    await switchToLesson(targetLesson || activeLessonId);
  } else {
    await loadAndShowCoursePlayer(id, targetLesson);
  }
});

window.ExpertHubUser.registerAction('open-lesson', (_, el) => {
  const courseId = el?.dataset?.course || activeCoursePlayerId || __playerState.courseId;
  const lessonId = el?.dataset?.lesson;
  __cleanupPlayer();
  activeCoursePlayerId = courseId;
  activeLessonId       = lessonId;
  loadAndShowCoursePlayer(courseId, lessonId);
});

window.ExpertHubUser.registerAction('player-tab', (tab) => {
  if (!tab) return;
  __playerActiveTab = tab;
  document.querySelectorAll('[data-player-tab]').forEach(b => {
    const on = b.dataset.playerTab === tab;
    b.classList.toggle('tab-btn-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const host = $('#player-tab-content');
  if (host) {
    host.innerHTML = renderPlayerTabContent(tab, __playerState.courseId, __playerState.lessonId);
    bindPlayerTabEvents(__playerState.courseId, __playerState.lessonId);
  }
});

window.ExpertHubUser.registerAction('mark-lesson-complete', async (lessonId) => {
  try {
    const r = await apiCall(`/api/eschool/lessons/${lessonId}/complete`, 'POST');
    if (r?.completed === false) {
      return showToast(r.reason || 'Completion requirements not met yet', 'warning');
    }
    showToast('Lesson marked complete', 'success');

    // Refresh lesson progress locally
    if (__playerState.courseId) {
      await refreshLessonState(__playerState.courseId, lessonId);
      rerenderRoleContent();
      requestAnimationFrame(() => bindCoursePlayerPage());
    }

    // Refresh enrollments to reflect progress
    apiCall('/api/user/enrollments').then(d => {
      S.enrollments        = d.enrollments || [];
      S.enrolledCourseIds  = new Set(S.enrollments.map(e => String(e.course_id)));
    }).catch(() => {});
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('upvote-discussion', async (id) => {
  try {
    await apiCall(`/api/eschool/discussions/${id}/upvote`, 'POST');
    showToast('Upvoted', 'success');
    // Re-fetch discussions so the count updates
    if (__playerState.courseId) {
      const d = await apiCall(`/api/eschool/courses/${__playerState.courseId}/discussions`).catch(() => null);
      if (d) {
        S.courseDiscussions = d.discussions || [];
        const host = $('#player-tab-content');
        if (host && __playerActiveTab === 'discussion') {
          host.innerHTML = renderLessonDiscussion(__playerState.lessonId);
          bindPlayerTabEvents(__playerState.courseId, __playerState.lessonId);
        }
      }
    }
  } catch (e) { showToast(e.message, 'error'); }
});

/* ============================================================ */
/* Data loading                                                  */
/* ============================================================ */

async function loadAndShowCoursePlayer(courseId, lessonId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    if (d?.forbidden) {
      showLoading(false);
      return showToast('You do not have access to this course', 'error');
    }

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

    const [lessonData, notesData, qaData, discData] = await Promise.all([
      apiCall(`/api/eschool/lessons/${currentLesson.id}`).catch(() => ({ lesson: currentLesson, progress: null })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/notes`).catch(() => ({ notes: [] })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/questions`).catch(() => ({ questions: [] })),
      apiCall(`/api/eschool/courses/${courseId}/discussions`).catch(() => ({ discussions: [] })),
    ]);

    // Populate shared dashboard state
    S.currentCourse         = course;
    S.courseModules         = modules;
    S.allLessons            = allLessons;
    S.currentLesson         = lessonData.lesson || currentLesson;
    S.currentLessonProgress = lessonData.progress || null;
    S.lessonNotes           = notesData.notes || [];
    S.lessonQuestions       = qaData.questions || [];
    S.courseDiscussions     = discData.discussions || [];

    // Completion eligibility: server-determined, default false
    __lessonCanComplete = !!lessonData.can_complete
      || S.currentLessonProgress?.status === 'in_progress';

    __playerState.courseId = courseId;
    __playerState.lessonId = currentLesson.id;
    activeCoursePlayerId   = courseId;
    activeLessonId         = currentLesson.id;
    __playerActiveTab      = 'overview';

    // Route the dashboard to the player view
    if (typeof activeTab !== 'undefined') activeTab = 'course-player';
    if (typeof rerenderRoleContent === 'function') {
      rerenderRoleContent();
      requestAnimationFrame(() => bindCoursePlayerPage());
    } else {
      console.warn('rerenderRoleContent() not found; course player will not render.');
    }
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    showLoading(false);
  }
}

/* Lightweight refresh — used after marking a lesson complete */
async function refreshLessonState(courseId, lessonId) {
  const [lessonData, discData] = await Promise.all([
    apiCall(`/api/eschool/lessons/${lessonId}`).catch(() => ({ lesson: null, progress: null })),
    apiCall(`/api/eschool/courses/${courseId}/discussions`).catch(() => ({ discussions: [] })),
  ]);
  if (lessonData.lesson) S.currentLesson = lessonData.lesson;
  S.currentLessonProgress = lessonData.progress || S.currentLessonProgress;
  S.courseDiscussions     = discData.discussions || S.courseDiscussions;

  // Refresh the in-memory lesson row too, so the curriculum sidebar reflects status
  if (S.allLessons) {
    const row = S.allLessons.find(l => String(l.id) === String(lessonId));
    if (row && S.currentLessonProgress) row.progress = S.currentLessonProgress;
  }
  __lessonCanComplete = !!lessonData.can_complete
    || S.currentLessonProgress?.status === 'in_progress';
}

/* Same-course lesson switch — avoids re-fetching the curriculum */
async function switchToLesson(lessonId) {
  try {
    showLoading(true);
    const allLessons = S.allLessons || [];
    const target = allLessons.find(l => String(l.id) === String(lessonId)) || allLessons[0];
    if (!target) return;

    const [lessonData, notesData, qaData] = await Promise.all([
      apiCall(`/api/eschool/lessons/${target.id}`).catch(() => ({ lesson: target, progress: null })),
      apiCall(`/api/eschool/lessons/${target.id}/notes`).catch(() => ({ notes: [] })),
      apiCall(`/api/eschool/lessons/${target.id}/questions`).catch(() => ({ questions: [] })),
    ]);

    S.currentLesson         = lessonData.lesson || target;
    S.currentLessonProgress = lessonData.progress || null;
    S.lessonNotes           = notesData.notes || [];
    S.lessonQuestions       = qaData.questions || [];

    __lessonCanComplete    = !!lessonData.can_complete
      || S.currentLessonProgress?.status === 'in_progress';
    __playerState.lessonId = target.id;
    activeLessonId         = target.id;
    __playerActiveTab      = 'overview';

    rerenderRoleContent();
    requestAnimationFrame(() => bindCoursePlayerPage());
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    showLoading(false);
  }
}

/* ============================================================ */
/* Full-page renderer                                            */
/* ============================================================ */

function renderCoursePlayerPage() {
  if (!activeCoursePlayerId) {
    return UserUI.empty({
      title: 'No course selected',
      message: 'Please pick a course from your learning dashboard.',
    });
  }

  const course        = S.currentCourse || S.courses?.find(c => String(c.id) === String(activeCoursePlayerId)) || {};
  const modules       = S.courseModules || [];
  const allLessons    = S.allLessons || modules.flatMap(m => m.lessons || []);
  const currentLesson = S.currentLesson || {};
  const progress      = S.currentLessonProgress || {};
  const isCompleted   = progress.status === 'completed';

  const completedIds = allLessons
    .filter(l => l.progress?.status === 'completed')
    .map(l => String(l.id));
  const completedCount = completedIds.length;
  const totalLessons   = allLessons.length;
  const progressPct    = totalLessons > 0
    ? Math.round((completedCount / totalLessons) * 100)
    : 0;

  const idx  = allLessons.findIndex(l => String(l.id) === String(currentLesson.id));
  const prev = idx > 0 ? allLessons[idx - 1] : null;
  const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

  return UserUI.page({
    title: course.title || 'Course Player',
    breadcrumb: `<a href="#/learning">My Courses</a> &gt; ${esc(course.title || '')}`,
    content: `
      <!-- ================================ -->
      <!-- Course header bar                -->
      <!-- ================================ -->
      <section class="panel course-player-header" style="margin-bottom:20px;display:flex;align-items:center;gap:20px;padding:16px;">
        <img src="${esc(courseThumb(course))}" alt=""
             style="width:120px;height:70px;border-radius:8px;object-fit:cover;" />
        <div style="flex:1;min-width:0;">
          <h2 style="margin:0 0 4px 0;">${esc(course.title || '')}</h2>
          <p class="form-hint" style="margin:0 0 6px 0;">${esc(course.description || '')}</p>
          <div style="display:flex;gap:15px;font-size:0.85rem;color:var(--text-muted);flex-wrap:wrap;">
            ${course.level ? `<span><i class="fas fa-signal"></i> ${esc(course.level)}</span>` : ''}
            <span><i class="fas fa-folder"></i> ${modules.length} modules</span>
            <span><i class="fas fa-book-open"></i> ${totalLessons} lessons</span>
            ${course.duration_hours ? `<span><i class="fas fa-clock"></i> ${esc(course.duration_hours)} hours</span>` : ''}
          </div>
        </div>
        <div style="width:250px;flex-shrink:0;">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:5px;">
            <span>Course Progress</span>
            <strong>${progressPct}%</strong>
          </div>
          <div class="progress-bar" style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden;">
            <span style="display:block;height:100%;width:${progressPct}%;background:var(--accent);"></span>
          </div>
          <p class="form-hint" style="margin:6px 0 0 0;font-size:0.75rem;">
            ${completedCount} of ${totalLessons} lessons completed
          </p>
        </div>
      </section>

      <!-- ================================ -->
      <!-- Two-column main layout           -->
      <!-- ================================ -->
      <div class="course-player-layout" style="display:flex;gap:24px;align-items:flex-start;">

        <!-- ============ LEFT: lesson content ============ -->
        <div class="course-player-main" style="flex:1;min-width:0;">

          <!-- Title row -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:15px;margin-bottom:15px;">
            <div style="min-width:0;">
              <a href="#/learning" class="btn-ghost btn-xs">
                <i class="fas fa-arrow-left"></i> Back to Course
              </a>
              <h1 style="margin:10px 0 5px 0;font-size:1.5rem;">${esc(currentLesson.title || '')}</h1>
              <div class="lesson-meta-row" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <span class="chip chip-neutral">${esc(currentLesson.lesson_type || 'video')}</span>
                <span class="program-meta">${currentLesson.duration_minutes || 0} min</span>
                ${isCompleted
                  ? '<span class="status status-active">Completed</span>'
                  : progress.status === 'in_progress'
                  ? '<span class="status status-pending">In Progress</span>'
                  : ''}
              </div>
            </div>
            <button class="btn btn-primary"
                    data-action="mark-lesson-complete"
                    data-lesson="${currentLesson.id}"
                    ${isCompleted || !__lessonCanComplete ? 'disabled' : ''}
                    title="${!__lessonCanComplete && !isCompleted ? 'Complete playback requirements first' : ''}">
              <i class="fas fa-check"></i>
              ${isCompleted ? 'Completed' : 'Mark as Complete'}
            </button>
          </div>

          <!-- Video / audio / slides player -->
          <div id="lesson-content-host">
            ${renderLessonContent(currentLesson, progress)}
          </div>

          <!-- Prev / Next navigation -->
          <nav class="course-player-nav" aria-label="Lesson navigation"
               style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin:16px 0;">
            ${prev
              ? `<button class="btn btn-secondary btn-sm"
                        data-action="open-course-player"
                        data-id="${activeCoursePlayerId}"
                        data-lesson="${prev.id}">
                  <i class="fas fa-arrow-left"></i> ${esc(prev.title)}</button>`
              : '<span></span>'}
            ${next
              ? `<button class="btn btn-secondary btn-sm"
                        data-action="open-course-player"
                        data-id="${activeCoursePlayerId}"
                        data-lesson="${next.id}">
                  ${esc(next.title)} <i class="fas fa-arrow-right"></i></button>`
              : '<span></span>'}
          </nav>

          <!-- Tabs -->
          <div class="tabs-course-player" role="tablist"
               style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:15px;">
            ${playerTabBtn('overview',   'fa-book-open',           'Lesson Overview')}
            ${playerTabBtn('notes',      'fa-sticky-note',         'Notes')}
            ${playerTabBtn('qa',         'fa-question-circle',     'Q&amp;A')}
            ${playerTabBtn('discussion', 'fa-comments',            'Discussion')}
            ${playerTabBtn('resources',  'fa-download',            'Resources')}
          </div>

          <!-- Tab content -->
          <div id="player-tab-content" role="tabpanel"
               aria-label="Lesson tabs content"></div>

        </div>

        <!-- ============ RIGHT: sticky curriculum ============ -->
        <aside class="course-player-sidebar" aria-label="Course curriculum"
               style="width:320px;flex-shrink:0;">
          <div class="panel" style="position:sticky;top:20px;max-height:calc(100vh - 80px);overflow-y:auto;">
            <h3 class="panel-title" style="margin-bottom:15px;">
              <i class="fas fa-list-check"></i> Course Curriculum
            </h3>
            ${modules.map(m => `
              <div class="player-module" style="margin-bottom:15px;">
                <div class="player-module-header"
                     style="font-weight:600;font-size:0.9rem;margin-bottom:8px;">
                  ${esc(m.title)}
                </div>
                ${(m.lessons || []).map(l => {
                  const isActive    = String(l.id) === String(currentLesson.id);
                  const isDone      = completedIds.includes(String(l.id));
                  return `
                    <div class="player-lesson ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}"
                         data-action="open-course-player"
                         data-id="${activeCoursePlayerId}"
                         data-lesson="${l.id}"
                         role="button"
                         tabindex="0"
                         aria-label="${esc(l.title)}${isDone ? ', completed' : ''}"
                         aria-current="${isActive ? 'true' : 'false'}"
                         style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;cursor:pointer;font-size:0.85rem;"
                         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
                      <i class="fas ${isDone ? 'fa-check-circle' : isActive ? 'fa-play-circle' : lessonIcon(l.lesson_type)}"
                         style="color:${isDone ? 'var(--accent)' : isActive ? 'var(--brand)' : 'var(--text-muted)'};"
                         aria-hidden="true"></i>
                      <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${esc(l.title)}
                      </span>
                      ${isActive ? '<span class="chip chip-blue" style="font-size:0.65rem;">Now</span>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `).join('')}
          </div>
        </aside>

      </div>
    `,
  });
}

/* Helper: render a single tab button */
function playerTabBtn(key, icon, label) {
  const on = __playerActiveTab === key;
  return `<button class="tab-btn ${on ? 'tab-btn-active' : ''}"
                  role="tab"
                  aria-selected="${on ? 'true' : 'false'}"
                  data-action="player-tab"
                  data-player-tab="${key}">
            <i class="fas ${icon}" aria-hidden="true"></i> ${label}
          </button>`;
}

/* ============================================================ */
/* Lesson media renderer (video / audio / slides / text)         */
/* ============================================================ */

function renderLessonContent(lesson, progress) {
  if (!lesson) return '<p class="empty-row">No lesson data</p>';

  const content    = lesson.content || lesson.description || '';
  const resumeAt   = Number(progress?.position_seconds || 0);
  const isDone     = progress?.status === 'completed';
  const showResume = resumeAt > 5 && !isDone;
  const transcript = lesson.transcript_url || '';

  return `
    <div class="lesson-content">

      ${lesson.lesson_type === 'video' && lesson.video_url ? `
        <div class="lesson-video-wrap"
             style="background:#000;border-radius:12px;overflow:hidden;margin-bottom:14px;aspect-ratio:16/9;">
          <video id="lesson-video"
                 controls preload="metadata" playsinline
                 poster="${esc(lesson.thumbnail || '')}"
                 style="width:100%;height:100%;"
                 data-resume="${resumeAt}"
                 aria-label="Lesson video: ${esc(lesson.title)}">
            <source src="${esc(lesson.video_url)}" />
            ${lesson.captions_url
              ? `<track kind="captions" src="${esc(lesson.captions_url)}" srclang="en" label="English" default />`
              : ''}
            Your browser does not support video playback.
          </video>
          <p id="video-error" class="form-hint"
             style="display:none;color:var(--danger);padding:8px 0;" role="alert"></p>
          <div class="player-aux-controls"
               style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:8px 0;">
            ${transcript
              ? `<a href="${esc(transcript)}" target="_blank" rel="noopener"
                    class="btn btn-ghost btn-xs">
                   <i class="fas fa-file-alt"></i> Transcript</a>`
              : ''}
            ${showResume
              ? `<span class="chip chip-blue">
                   <i class="fas fa-history"></i> Resume at ${formatClock(resumeAt)}
                 </span>`
              : ''}
            <label class="form-hint"
                   style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;">
              Playback speed
              <select id="lesson-speed" class="form-select"
                      style="width:auto;padding:2px 6px;">
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </label>
          </div>
        </div>
      ` : ''}

      ${lesson.lesson_type === 'audio' && lesson.audio_url ? `
        <div style="background:var(--surface-2);border-radius:12px;padding:20px;margin-bottom:14px;">
          <audio id="lesson-audio"
                 controls preload="metadata"
                 style="width:100%;"
                 data-resume="${resumeAt}"
                 aria-label="Lesson audio: ${esc(lesson.title)}">
            <source src="${esc(lesson.audio_url)}" />
          </audio>
          ${showResume
            ? `<p class="form-hint" style="margin:10px 0 0 0;">
                 <i class="fas fa-history"></i> Resume at ${formatClock(resumeAt)}
               </p>`
            : ''}
          ${transcript
            ? `<a href="${esc(transcript)}" target="_blank" rel="noopener"
                  class="btn btn-ghost btn-xs" style="margin-top:10px;">
                 <i class="fas fa-file-alt"></i> Transcript</a>`
            : ''}
        </div>
      ` : ''}

      ${lesson.lesson_type === 'slides' && lesson.slides_url ? `
        <div class="lesson-slides"
             style="background:var(--surface-2);border-radius:12px;padding:20px;margin-bottom:14px;text-align:center;">
          <p class="form-hint" style="margin-top:0;">
            This lesson is a slide deck. Open it in a new tab to view.
          </p>
          <a class="btn btn-primary"
             href="${esc(lesson.slides_url)}"
             target="_blank" rel="noopener">
            <i class="fas fa-file-powerpoint"></i> Open Slides
          </a>
        </div>
      ` : ''}

      ${content
        ? `<div class="lesson-body" style="line-height:1.7;margin-top:8px;">
             ${content.replace(/\n/g, '<br/>')}
           </div>`
        : ''}
    </div>
  `;
}

/* ============================================================ */
/* Tab renderers                                                 */
/* ============================================================ */

function renderPlayerTabContent(tab, courseId, lessonId) {
  switch (tab) {
    case 'notes':      return renderLessonNotes();
    case 'qa':         return renderLessonQA();
    case 'discussion': return renderLessonDiscussion(lessonId);
    case 'resources':  return renderLessonResources();
    case 'overview':
    default:           return renderLessonOverview();
  }
}

/* Overview tab — "What you'll learn" + lesson meta */
function renderLessonOverview() {
  const lesson   = S.currentLesson || {};
  const progress = S.currentLessonProgress || {};
  const content  = lesson.content || lesson.description || '';
  const isDone   = progress.status === 'completed';
  const resumeAt = Number(progress.position_seconds || 0);

  return `
    <div class="overview-panel">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">

        <div>
          <h4 style="margin-top:0;">What you'll learn</h4>
          <ul style="list-style:none;padding:0;line-height:1.9;margin:0;">
            <li><i class="fas fa-check" style="color:var(--accent);margin-right:6px;"></i>
                Understand the core concepts of "${esc(lesson.title || '')}"</li>
            <li><i class="fas fa-check" style="color:var(--accent);margin-right:6px;"></i>
                Apply the techniques demonstrated in this lesson</li>
            <li><i class="fas fa-check" style="color:var(--accent);margin-right:6px;"></i>
                Complete the practice exercise to reinforce learning</li>
            ${lesson.duration_minutes
              ? `<li><i class="fas fa-clock" style="color:var(--brand);margin-right:6px;"></i>
                   Estimated duration: ${lesson.duration_minutes} minutes</li>`
              : ''}
          </ul>

          ${content
            ? `<div class="lesson-body" style="margin-top:20px;padding:14px;background:var(--surface-2);border-radius:8px;">
                 ${content.replace(/\n/g, '<br/>')}
               </div>`
            : ''}
        </div>

        <div class="panel" style="background:var(--surface-2);padding:16px;border-radius:8px;">
          <h4 style="margin-top:0;">Lesson Details</h4>
          <p class="form-hint" style="margin:0 0 6px 0;">
            <i class="fas fa-layer-group"></i>
            Type: <strong>${esc(lesson.lesson_type || 'video')}</strong>
          </p>
          <p class="form-hint" style="margin:0 0 6px 0;">
            <i class="fas fa-clock"></i>
            Duration: <strong>${lesson.duration_minutes || 0} min</strong>
          </p>
          <p class="form-hint" style="margin:0 0 6px 0;">
            <i class="fas fa-info-circle"></i>
            Status:
            <strong>
              ${isDone
                ? '<span style="color:var(--accent);">Completed</span>'
                : progress.status === 'in_progress'
                ? '<span style="color:var(--warning);">In Progress</span>'
                : 'Not Started'}
            </strong>
          </p>
          ${resumeAt > 5 && !isDone
            ? `<p class="form-hint" style="margin:0;">
                 <i class="fas fa-history"></i>
                 Resume point: <strong>${formatClock(resumeAt)}</strong>
               </p>`
            : ''}
        </div>

      </div>
    </div>
  `;
}

/* Notes tab */
function renderLessonNotes() {
  return `
    <div class="notes-panel">
      <div class="notes-add" style="margin-bottom:14px;">
        <textarea id="new-note-text" class="form-textarea" rows="3"
                  placeholder="Write a note for this lesson..."></textarea>
        <button class="btn btn-primary btn-sm" id="add-note-btn" style="margin-top:8px;">
          <i class="fas fa-plus"></i> Add Note
        </button>
      </div>
      <ul class="notes-list" style="list-style:none;padding:0;margin:0;">
        ${(S.lessonNotes || []).map(n => `
          <li class="note-item"
              style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">
            <p class="note-content" style="margin:0 0 6px 0;">${esc(n.content)}</p>
            <span class="note-time form-hint" style="font-size:0.75rem;">
              ${timeAgo(n.created_at)}
              ${n.timestamp_seconds
                ? ` &middot; <i class="fas fa-clock"></i> @ ${formatClock(n.timestamp_seconds)}`
                : ''}
            </span>
          </li>
        `).join('') || '<li class="empty-row">No notes yet. Be the first to add one!</li>'}
      </ul>
    </div>
  `;
}

/* Q&A tab */
function renderLessonQA() {
  return `
    <div class="qa-panel">
      <div class="qa-add" style="margin-bottom:14px;display:flex;gap:8px;">
        <input id="lesson-q-input" class="form-input"
               placeholder="Ask a question about this lesson..."
               style="flex:1;" />
        <button class="btn btn-primary btn-sm" id="lesson-q-btn">
          <i class="fas fa-paper-plane"></i> Ask
        </button>
      </div>
      <ul class="qa-list" style="list-style:none;padding:0;margin:0;">
        ${(S.lessonQuestions || []).map(q => `
          <li class="qa-item"
              style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">
            <p class="qa-q" style="margin:0 0 8px 0;">
              <i class="fas fa-question-circle" style="color:var(--brand);"></i>
              <strong>${esc(q.question)}</strong>
            </p>
            ${q.answer
              ? `<p class="qa-a" style="margin:0;padding-left:20px;color:var(--text-muted);">
                   <strong>Answer:</strong> ${esc(q.answer)}
                 </p>`
              : '<p class="qa-pending form-hint" style="margin:0;padding-left:20px;">Awaiting answer from instructor</p>'}
          </li>
        `).join('') || '<li class="empty-row">No questions yet. Be the first to ask!</li>'}
      </ul>
    </div>
  `;
}

/* Discussion tab */
function renderLessonDiscussion(lessonId) {
  const discussions = (S.courseDiscussions || [])
    .filter(d => String(d.lesson_id) === String(lessonId));

  return `
    <div class="discussion-panel">
      <div class="discussion-add" style="margin-bottom:14px;">
        <textarea id="discussion-input" class="form-textarea" rows="2"
                  placeholder="Start a discussion..."></textarea>
        <button class="btn btn-primary btn-sm" id="discussion-post-btn" style="margin-top:8px;">
          <i class="fas fa-comment"></i> Post
        </button>
      </div>
      <ul class="discussion-list" style="list-style:none;padding:0;margin:0;">
        ${discussions.map(d => `
          <li class="discussion-item"
              style="display:flex;gap:10px;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">
            <img class="user-avatar" src="${avatar({ name: d.author_name })}" alt=""
                 style="width:36px;height:36px;border-radius:50%;flex-shrink:0;" />
            <div class="discussion-body" style="flex:1;min-width:0;">
              <div class="discussion-author"
                   style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
                <strong>${esc(d.author_name || 'Anonymous')}</strong>
                <span class="discussion-time form-hint" style="font-size:0.75rem;">
                  ${timeAgo(d.created_at)}
                </span>
              </div>
              <p style="margin:0 0 8px 0;">${esc(d.body)}</p>
              <div class="discussion-actions">
                <button class="btn btn-ghost btn-xs"
                        data-action="upvote-discussion"
                        data-id="${d.id}">
                  <i class="fas fa-arrow-up"></i> ${d.upvotes || 0}
                </button>
              </div>
            </div>
          </li>
        `).join('') || '<li class="empty-row">No discussions yet. Start the conversation!</li>'}
      </ul>
    </div>
  `;
}

/* Resources tab */
function renderLessonResources() {
  const lesson    = S.currentLesson || {};
  const resources = safeJsonArray(lesson.resources);
  const transcript = lesson.transcript_url || '';

  const items = [
    ...(transcript ? [{ name: 'Transcript', url: transcript, icon: 'fa-file-alt' }] : []),
    ...resources,
  ];

  if (!items.length) {
    return '<div class="empty-row">No resources for this lesson.</div>';
  }

  return `
    <div class="resources-panel">
      <ul style="list-style:none;padding:0;margin:0;">
        ${items.map(r => `
          <li style="margin-bottom:10px;">
            <a class="btn btn-secondary btn-sm lesson-resource-link"
               href="${esc(r.url)}" target="_blank" rel="noopener"
               style="width:100%;justify-content:flex-start;text-align:left;">
              <i class="fas ${r.icon || 'fa-download'}"
                 style="color:${r.icon ? 'var(--brand)' : '#ef4444'};margin-right:8px;"></i>
              ${esc(r.name || 'Download')}
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

/* ============================================================ */
/* Post-render bindings                                          */
/* ============================================================ */

function bindCoursePlayerPage() {
  const courseId = __playerState.courseId;
  const lessonId = __playerState.lessonId;
  if (!courseId || !lessonId) return;

  // -------- Video playback --------
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
    if (speedSel) {
      speedSel.onchange = () => {
        try { video.playbackRate = Number(speedSel.value); } catch {}
      };
    }

    // Debounced progress update — accumulate and flush every 10s
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
        showToast('Lesson ended. Click "Mark as Complete" to finish.', 'info', 4000);
      }
    });
  }

  // -------- Audio playback --------
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

  // -------- Initial tab content --------
  const host = $('#player-tab-content');
  if (host) {
    host.innerHTML = renderPlayerTabContent(__playerActiveTab, courseId, lessonId);
    bindPlayerTabEvents(courseId, lessonId);
  }
}

/* Bind tab content form events */
function bindPlayerTabEvents(courseId, lessonId) {
  // Add note
  const addBtn = $('#add-note-btn');
  if (addBtn) {
    addBtn.onclick = async () => {
      const text = ($('#new-note-text')?.value || '').trim();
      if (!text || addBtn.disabled) return;
      addBtn.disabled = true;
      try {
        const v  = __playerState.videoEl;
        const ts = v ? Math.floor(v.currentTime) : null;
        await apiCall(`/api/eschool/lessons/${lessonId}/notes`, 'POST', {
          content: text,
          timestamp_seconds: ts,
        });
        const d = await apiCall(`/api/eschool/lessons/${lessonId}/notes`);
        S.lessonNotes = d.notes || [];
        $('#player-tab-content').innerHTML = renderLessonNotes();
        bindPlayerTabEvents(courseId, lessonId);
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        addBtn.disabled = false;
      }
    };
  }

  // Ask question
  const askBtn = $('#lesson-q-btn');
  if (askBtn) {
    askBtn.onclick = async () => {
      const q = ($('#lesson-q-input')?.value || '').trim();
      if (!q || askBtn.disabled) return;
      askBtn.disabled = true;
      try {
        await apiCall(`/api/eschool/lessons/${lessonId}/questions`, 'POST', { question: q });
        const d = await apiCall(`/api/eschool/lessons/${lessonId}/questions`);
        S.lessonQuestions = d.questions || [];
        $('#player-tab-content').innerHTML = renderLessonQA();
        bindPlayerTabEvents(courseId, lessonId);
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        askBtn.disabled = false;
      }
    };
  }

  // Post discussion
  const postBtn = $('#discussion-post-btn');
  if (postBtn) {
    postBtn.onclick = async () => {
      const body = ($('#discussion-input')?.value || '').trim();
      if (!body || postBtn.disabled) return;
      postBtn.disabled = true;
      try {
        await apiCall('/api/eschool/discussions', 'POST', {
          course_id: courseId,
          lesson_id: lessonId,
          body,
        });
        const d = await apiCall(`/api/eschool/courses/${courseId}/discussions`);
        S.courseDiscussions = d.discussions || [];
        $('#player-tab-content').innerHTML = renderLessonDiscussion(lessonId);
        bindPlayerTabEvents(courseId, lessonId);
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        postBtn.disabled = false;
      }
    };
  }
}

/* ============================================================ */
/* Progress sync                                                 */
/* ============================================================ */

function _flushPlayerProgress(lessonId) {
  if (!__playerState.dirty) return;
  if (!lessonId) return;
  const current = __playerState.pendingSeconds;
  __playerState.dirty = false;
  __playerState.lastFlushedAt = Date.now();
  apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', {
    position_seconds: current,
    time_spent_seconds: 10,
  }).catch(() => {});
}

/* ============================================================ */
/* Lifecycle cleanup                                             */
/* ============================================================ */

function __cleanupPlayer() {
  // Flush any pending progress before leaving
  if (__playerState.lessonId) {
    try { _flushPlayerProgress(__playerState.lessonId); } catch {}
  }
  __playerState.courseId       = null;
  __playerState.lessonId       = null;
  __playerState.videoEl        = null;
  __playerState.pendingSeconds = 0;
  __playerState.lastFlushedAt  = 0;
  __playerState.dirty          = false;
  __lessonCanComplete          = false;
}

/* ============================================================ */
/* Module registration                                           */
/* ============================================================ */

if (window.ExpertHubUser?.registerModule) {
  window.ExpertHubUser.registerModule('course-player', renderCoursePlayerPage);
} else {
  console.warn('ExpertHubUser.registerModule not available; course-player page will not route.');
}