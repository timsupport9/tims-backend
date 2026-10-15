/* ============================================================
   ExpertHub 2.0 — 05-course-player.js
   E-School lesson player + notes + Q&A + discussion.
   ============================================================ */

/* ============================================================
   E-SCHOOL — COURSE PLAYER
   ============================================================ */
async function openCoursePlayer(courseId, lessonId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    const course = d.course || {};
    const modules = d.modules || [];
    const allLessons = modules.flatMap(m => m.lessons || []);
    const currentLesson = lessonId
      ? allLessons.find(l => String(l.id) === String(lessonId))
      : allLessons[0];
    if (!currentLesson) {
      return showToast('No lessons in this course yet', 'warning');
    }

    S.__currentCourseId = courseId;
    S.__currentLessonId = currentLesson.id;

    const [lessonData, notesData, qaData] = await Promise.all([
      apiCall(`/api/eschool/lessons/${currentLesson.id}`).catch(() => ({ lesson: currentLesson, progress: null })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/notes`).catch(() => ({ notes: [] })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/questions`).catch(() => ({ questions: [] })),
    ]);

    S.currentLesson = lessonData.lesson || currentLesson;
    S.currentLessonProgress = lessonData.progress || null;
    S.lessonNotes = notesData.notes || [];
    S.lessonQuestions = qaData.questions || [];

    const completedLessons = allLessons.filter(l => l.progress?.status === 'completed').map(l => l.id);
    const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

    openModal({
      title: `${course.title} — Lesson ${currentIndex + 1} of ${allLessons.length}`,
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
                       data-lesson-id="${l.id}">
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
              ${prevLesson
                ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${prevLesson.id}">
                    <i class="fas fa-arrow-left"></i> Previous</button>`
                : '<span></span>'}
              <button class="btn btn-primary btn-sm" data-action="mark-lesson-complete" data-lesson="${currentLesson.id}">
                <i class="fas fa-check"></i> Mark Complete</button>
              ${nextLesson
                ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${nextLesson.id}">
                    Next <i class="fas fa-arrow-right"></i></button>`
                : '<span></span>'}
            </nav>

            <div class="tabs-course-player">
              <button class="tab-btn tab-btn-active" data-player-tab="notes">
                <i class="fas fa-sticky-note"></i> Notes</button>
              <button class="tab-btn" data-player-tab="qa">
                <i class="fas fa-question-circle"></i> Q&A</button>
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
  const videoUrl = lesson.video_url || '';
  const content = lesson.content || lesson.description || '';

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
      </div>

      ${lesson.lesson_type === 'video' && videoUrl ? `
        <div class="lesson-video-wrap">
          <video id="lesson-video" controls preload="metadata" poster="${esc(lesson.thumbnail || '')}" style="width:100%">
            <source src="${esc(videoUrl)}" />
          </video>
        </div>
      ` : ''}

      ${lesson.lesson_type === 'reading' || content ? `
        <div class="lesson-body">
          ${content.replace(/\n/g, '<br/>')}
        </div>
      ` : ''}

      ${lesson.resources && JSON.parse(lesson.resources || '[]').length ? `
        <div class="lesson-resources">
          <h4>Resources</h4>
          ${JSON.parse(lesson.resources).map(r => `
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
  document.querySelectorAll('.player-lesson').forEach(el => {
    el.onclick = () => {
      const lid = el.dataset.lessonId;
      closeModal();
      openCoursePlayer(courseId, lid);
    };
  });

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

  $('#player-tab-content').innerHTML = renderLessonNotes();
  bindPlayerTabEvents(courseId, lessonId);

  const video = $('#lesson-video');
  if (video) {
    let lastSaved = 0;
    video.addEventListener('timeupdate', () => {
      const current = Math.floor(video.currentTime);
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
        ${S.lessonNotes.map(n => `
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
        ${S.lessonQuestions.map(q => `
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
  const discussions = (S.courseDiscussions || []).filter(d => String(d.lesson_id) === String(lessonId));
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
  const addNoteBtn = $('#add-note-btn');
  if (addNoteBtn) addNoteBtn.onclick = async () => {
    const text = $('#new-note-text').value.trim();
    if (!text) return;
    try {
      await apiCall(`/api/eschool/lessons/${lessonId}/notes`, 'POST', { content: text });
      const d = await apiCall(`/api/eschool/lessons/${lessonId}/notes`);
      S.lessonNotes = d.notes || [];
      $('#player-tab-content').innerHTML = renderLessonNotes();
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const askBtn = $('#lesson-q-btn');
  if (askBtn) askBtn.onclick = async () => {
    const q = $('#lesson-q-input').value.trim();
    if (!q) return;
    try {
      await apiCall(`/api/eschool/lessons/${lessonId}/questions`, 'POST', { question: q });
      const d = await apiCall(`/api/eschool/lessons/${lessonId}/questions`);
      S.lessonQuestions = d.questions || [];
      $('#player-tab-content').innerHTML = renderLessonQA();
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const postBtn = $('#discussion-post-btn');
  if (postBtn) postBtn.onclick = async () => {
    const body = $('#discussion-input').value.trim();
    if (!body) return;
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
    } catch (e) { showToast(e.message, 'error'); }
  };
}
