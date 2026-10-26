/* ============================================================
   ExpertHub 2.0 — dashboards/user/course-player.js
   Full course player with notes/Q&A/discussion, debounced
   progress sync, resume from last position, access gating.
   ============================================================ */

/* Track active player state for cleanup + resume */
const __playerState = {
  courseId: null,
  lessonId: null,
  videoEl: null,
  timeHandler: null,
  lastSaved: 0,
  pendingSeconds: 0,
};

async function openCoursePlayer(courseId, lessonId) {
  // Cleanup any previous player before opening a new one
  __cleanupPlayer();

  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    if (d?.forbidden) { showLoading(false); return showToast('You do not have access to this course', 'error'); }

    const course  = d.course || {};
    const modules = d.modules || [];
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

    __playerState.courseId = courseId;
    __playerState.lessonId = currentLesson.id;

    const completedLessons = allLessons.filter(l => l.progress?.status === 'completed').map(l => l.id);
    const idx = allLessons.findIndex(l => l.id === currentLesson.id);
    const prev = idx > 0 ? allLessons[idx - 1] : null;
    const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

    openModal({
      title: `${course.title || ''} — Lesson ${idx + 1} of ${allLessons.length}`,
      className: 'course-player-modal',
      body: `
        <div class="course-player-layout">
          <aside class="course-player-sidebar">
            <h3 class="panel-title">Curriculum</h3>
            ${modules.map(m => `
              <div class="player-module">
                <div class="player-module-header">${esc(m.title)}</div>
                ${(m.lessons || []).map(l => `
                  <div class="player-lesson ${l.id === currentLesson.id ? 'active' : ''} ${completedLessons.includes(l.id) ? 'completed' : ''}"
                       data-lesson-id="${l.id}" role="button" tabindex="0">
                    <i class="fas ${completedLessons.includes(l.id) ? 'fa-check-circle' : lessonIcon(l.lesson_type)}"></i>
                    <span>${esc(l.title)}</span>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </aside>

          <main class="course-player-main">
            <div id="lesson-content-host">${renderLessonContent(S.currentLesson, S.currentLessonProgress)}</div>

            <nav class="course-player-nav">
              ${prev
                ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${prev.id}">
                    <i class="fas fa-arrow-left"></i> Previous</button>`
                : '<span></span>'}
              <button class="btn btn-primary btn-sm" data-action="mark-lesson-complete" data-lesson="${currentLesson.id}"
                      ${S.currentLessonProgress?.status === 'completed' ? 'disabled' : ''}>
                <i class="fas fa-check"></i> ${S.currentLessonProgress?.status === 'completed' ? 'Completed' : 'Mark Complete'}</button>
              ${next
                ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${next.id}">
                    Next <i class="fas fa-arrow-right"></i></button>`
                : '<span></span>'}
            </nav>

            <div class="tabs-course-player">
              <button class="tab-btn tab-btn-active" data-player-tab="notes">
                <i class="fas fa-sticky-note"></i> Notes</button>
              <button class="tab-btn" data-player-tab="qa">
                <i class="fas fa-question-circle"></i> Q&amp;A</button>
              <button class="tab-btn" data-player-tab="discussion">
                <i class="fas fa-comments"></i> Discussion</button>
            </div>

            <div id="player-tab-content"></div>
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
  const content = lesson.content || lesson.description || '';
  const resources = safeJsonArray(lesson.resources);
  const resumeAt = Number(progress?.position_seconds || 0);

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
        ${resumeAt > 5 && progress?.status !== 'completed' ? `<span class="chip chip-blue">Resume at ${Math.floor(resumeAt/60)}:${String(resumeAt%60).padStart(2,'0')}</span>` : ''}
      </div>

      ${lesson.lesson_type === 'video' && lesson.video_url ? `
        <div class="lesson-video-wrap">
          <video id="lesson-video" controls preload="metadata" playsinline
                 poster="${esc(lesson.thumbnail || '')}" style="width:100%"
                 data-resume="${resumeAt}">
            <source src="${esc(lesson.video_url)}" />
            <track kind="captions" src="${esc(lesson.captions_url || '')}" srclang="en" label="English" default />
            Your browser does not support video.
          </video>
          <p id="video-error" class="form-hint" style="display:none;color:var(--danger)"></p>
        </div>
      ` : ''}

      ${lesson.lesson_type === 'audio' && lesson.audio_url ? `
        <audio id="lesson-audio" controls preload="metadata" style="width:100%;margin-top:12px"
               data-resume="${resumeAt}">
          <source src="${esc(lesson.audio_url)}" />
        </audio>
      ` : ''}

      ${content ? `<div class="lesson-body">${content.replace(/\n/g, '<br/>')}</div>` : ''}

      ${resources.length ? `
        <div class="lesson-resources">
          <h4>Resources</h4>
          ${resources.map(r => `
            <a class="lesson-resource-link" href="${esc(r.url)}" target="_blank" rel="noopener">
              <i class="fas fa-download"></i> ${esc(r.name || 'Download')}
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
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });

  // Tabs
  document.querySelectorAll('[data-player-tab]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-player-tab]').forEach(b => b.classList.remove('tab-btn-active'));
      btn.classList.add('tab-btn-active');
      const tab = btn.dataset.playerTab;
      const host = $('#player-tab-content');
      if (tab === 'notes') host.innerHTML = renderLessonNotes();
      else if (tab === 'qa') host.innerHTML = renderLessonQA();
      else if (tab === 'discussion') host.innerHTML = renderLessonDiscussion(lessonId);
      bindPlayerTabEvents(courseId, lessonId);
    };
  });

  const host = $('#player-tab-content');
  if (host) {
    host.innerHTML = renderLessonNotes();
    bindPlayerTabEvents(courseId, lessonId);
  }

  // Video: resume, progress sync (debounced server-side), error handling
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

    let lastSaved = 0;
    let pending = 0;
    const save = () => {
      const current = Math.floor(video.currentTime);
      if (current === lastSaved) return;
      const delta = Math.max(0, current - lastSaved);
      lastSaved = current;
      apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', {
        position_seconds: current,
        time_spent_seconds: delta,
      }).catch(() => {});
    };
    video.addEventListener('timeupdate', () => {
      pending = Math.floor(video.currentTime);
      if (pending - lastSaved >= 10) save();
    });
    video.addEventListener('pause', save);
    video.addEventListener('ended', () => {
      save();
      // Auto-suggest completion
      if (S.currentLessonProgress?.status !== 'completed') {
        showToast('Lesson ended. Click "Mark Complete" to finish.', 'info', 4000);
      }
    });
    video.addEventListener('seeked', save);

    __playerState.timeHandler = save;
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

function __cleanupPlayer() {
  if (__playerState.timeHandler) {
    try { __playerState.timeHandler(); } catch {}
  }
  __playerState.courseId = null;
  __playerState.lessonId = null;
  __playerState.videoEl = null;
  __playerState.timeHandler = null;
  __playerState.lastSaved = 0;
}

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
      await apiCall(`/api/eschool/lessons/${lessonId}/notes`, 'POST', { content: text });
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

/* ---------------- Actions ---------------- */
window.ExpertHubUser.registerAction('open-course-player', (id) => openCoursePlayer(id));

window.ExpertHubUser.registerAction('open-lesson', (id, el) => {
  const courseId = el?.dataset?.course || __playerState.courseId;
  const lessonId = el?.dataset?.lesson || id;
  __cleanupPlayer();
  closeModal();
  openCoursePlayer(courseId, lessonId);
});

window.ExpertHubUser.registerAction('mark-lesson-complete', async (lessonId) => {
  try {
    await apiCall(`/api/eschool/lessons/${lessonId}/complete`, 'POST');
    showToast('Lesson marked complete', 'success');
    const courseId = __playerState.courseId || S.__currentCourseId;
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