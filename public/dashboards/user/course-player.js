/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/course-player.js */
/* Digital classroom: 5-region layout, accessible playback, */
/* debounced progress sync, resume position, offline-safe notes, */
/* backend-determined completion. */
/* ============================================================ */

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

    const [lessonData, notesData, qaData, discData] = await Promise.all([
      apiCall(`/api/eschool/lessons/${currentLesson.id}`).catch(() => ({ lesson: currentLesson, progress: null })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/notes`).catch(() => ({ notes: [] })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/questions`).catch(() => ({ questions: [] })),
      apiCall(`/api/eschool/courses/${courseId}/discussions`).catch(() => ({ discussions: [] })),
    ]);

    S.currentLesson         = lessonData.lesson || currentLesson;
    S.currentLessonProgress = lessonData.progress || null;
    S.lessonNotes           = notesData.notes || [];
    S.lessonQuestions       = qaData.questions || [];
    S.courseDiscussions     = discData.discussions || [];

    // Completion eligibility is determined by server; default false
    __lessonCanComplete = !!lessonData.can_complete || S.currentLessonProgress?.status === 'in_progress';

    __playerState.courseId = courseId;
    __playerState.lessonId = currentLesson.id;

    const completedLessons = allLessons.filter(l => l.progress?.status === 'completed').map(l => l.id);
    const idx = allLessons.findIndex(l => String(l.id) === String(currentLesson.id));
    const prev = idx > 0 ? allLessons[idx - 1] : null;
    const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

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
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </aside>

          <main class="course-player-main">
            <div id="lesson-content-host">${renderLessonContent(S.currentLesson, S.currentLessonProgress)}</div>

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
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function renderLessonContent(lesson, progress) {
  if (!lesson) return '<p class="empty-row">No lesson data</p>';
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

function bindPlayerInteractions(courseId, lessonId) {
  // Sidebar lesson navigation
  document.querySelectorAll('.player-lesson').forEach(el => {
    const go = () => { closeModal(); openCoursePlayer(courseId, el.dataset.lessonId); };
    el.onclick = go;
    el.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    };
  });

  // Tabs
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

  // Video: resume, debounced progress sync, error handling
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
        showToast('Lesson ended. Click "Mark Complete" to finish.', 'info', 4000);
      }
    });
  }

  // Audio progress
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
  // Flush any pending progress before leaving
  if (__playerState.lessonId) {
    try { _flushPlayerProgress(__playerState.lessonId); } catch {}
  }
  __playerState.courseId = null;
  __playerState.lessonId = null;
  __playerState.videoEl = null;
  __playerState.pendingSeconds = 0;
  __playerState.lastFlushedAt = 0;
  __playerState.dirty = false;
  __lessonCanComplete = false;
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

window.ExpertHubUser.registerAction('mark-lesson-complete', async (lessonId) => {
  try {
    const r = await apiCall(`/api/eschool/lessons/${lessonId}/complete`, 'POST');
    // Backend may reject if requirements not met
    if (r?.completed === false) {
      return showToast(r.reason || 'Completion requirements not met yet', 'warning');
    }
    showToast('Lesson marked complete', 'success');
    const courseId = __playerState.courseId;
    if (courseId) {
      __cleanupPlayer();
      closeModal();
      openCoursePlayer(courseId, lessonId);
    }
    // Refresh enrollments to reflect progress
    apiCall('/api/user/enrollments').then(d => {
      S.enrollments = d.enrollments || [];
      S.enrolledCourseIds = new Set(S.enrollments.map(e => String(e.course_id)));
    }).catch(() => {});
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('upvote-discussion', async (id) => {
  try {
    await apiCall(`/api/eschool/discussions/${id}/upvote`, 'POST');
    showToast('Upvoted', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});
