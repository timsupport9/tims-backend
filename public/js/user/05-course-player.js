/* ============================================================
   ExpertHub 2.0 — 05-course-player.js
   E-School lesson player + notes + Q&A + discussion.

   Enhancements (v2):
   - Auto-resume from last video position (+ "Resumed" toast with Undo)
   - Playback speed control (0.5x – 2x), persisted per user
   - Auto-advance toggle on video end (persisted)
   - Theater / focus mode toggle
   - Transcript panel with click-to-seek
   - Bookmark current timestamp (per lesson, localStorage)
   - Keyboard shortcuts: space, ←/→, M, N, F, T
   - Throttled progress heartbeat + sendBeacon on unload
   - Draft note autosave per lesson
   - Q&A upvotes with optimistic UI
   - "Summarize lesson" button (uses backend if available)
   - Threaded discussion replies (parent_id)
   - Confetti on course completion (last lesson)
   ============================================================ */

/* ============================================================
   Module state (session-scoped)
   ============================================================ */
S.__currentCourseId       = S.__currentCourseId       || null;
S.__currentLessonId       = S.__currentLessonId       || null;
S.__nextLessonId          = S.__nextLessonId          || null;
S.__prevLessonId          = S.__prevLessonId          || null;
S.__lastVideoPosition     = S.__lastVideoPosition     || 0;
S.__playerTheater         = S.__playerTheater         || false;
S.__playerBookmarksOpen   = S.__playerBookmarksOpen   || false;
S.__playerTranscriptOpen  = S.__playerTranscriptOpen  || false;
S.__lessonTranscript      = S.__lessonTranscript      || null;

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
    S.__lessonTranscript = parseTranscript(S.currentLesson.transcript);

    const completedLessons = allLessons.filter(l => l.progress?.status === 'completed').map(l => l.id);
    const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
    const isLastLesson = !nextLesson;

    S.__prevLessonId = prevLesson ? prevLesson.id : null;
    S.__nextLessonId = nextLesson ? nextLesson.id : null;

    const resumeAt = Number(S.currentLessonProgress?.position_seconds || 0);
    S.__lastVideoPosition = resumeAt;

    const lessonTitle = `${course.title || 'Course'} — Lesson ${currentIndex + 1} of ${allLessons.length}`;

    openModal({
      title: lessonTitle,
      className: 'course-player-modal' + (S.__playerTheater ? ' is-theater' : ''),
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
            <div id="lesson-content-host">
              ${renderLessonContent(S.currentLesson, S.currentLessonProgress, { resumeAt, isLastLesson })}
            </div>

            <nav class="course-player-nav">
              ${prevLesson
                ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${prevLesson.id}">
                    <i class="fas fa-arrow-left"></i> Previous</button>`
                : '<span></span>'}
              <button class="btn btn-primary btn-sm"
                      data-action="mark-lesson-complete"
                      data-lesson="${currentLesson.id}"
                      onclick="maybeCelebrateLessonCompletion('${esc(String(currentLesson.id))}', ${isLastLesson ? 'true' : 'false'}); return true;">
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
      footer: `
        <div class="course-player-footer-tools">
          <button class="btn btn-ghost btn-xs" id="toggle-theater-btn" title="Toggle theater mode (T)">
            <i class="fas fa-expand"></i> Theater</button>
          <label class="checkbox-row" style="margin-left:8px">
            <input type="checkbox" id="auto-advance-toggle"
                   ${getPlayerPref('autoAdvance', false) ? 'checked' : ''} />
            Auto-advance
          </label>
        </div>
        <button class="btn btn-secondary" data-close-modal>Close Course</button>
      `,
    });

    bindPlayerInteractions(courseId, currentLesson.id);

    /* Register once-per-open cleanup + beforeunload beacon */
    installPlayerUnloadBeacon();
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

/* ============================================================
   Lesson content renderer (with resume + transcript + bookmarks)
   ============================================================ */
function renderLessonContent(lesson, progress, opts = {}) {
  if (!lesson) return '<p class="empty-row">No lesson data</p>';
  const videoUrl = lesson.video_url || '';
  const content  = lesson.content || lesson.description || '';
  const resumeAt = Number(opts.resumeAt || 0);
  const isLast   = !!opts.isLastLesson;

  const transcript = S.__lessonTranscript || parseTranscript(lesson.transcript);
  const hasTranscript = transcript && transcript.length > 0;
  const bookmarks = loadLessonBookmarks(lesson.id);
  const speed = getPlayerPref('speed', 1);

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
        ${isLast ? '<span class="chip chip-purple">Final lesson</span>' : ''}
      </div>

      ${lesson.lesson_type === 'video' && videoUrl ? `
        <div class="lesson-video-wrap">
          <video id="lesson-video" controls preload="metadata"
                 poster="${esc(lesson.thumbnail || '')}" style="width:100%"
                 data-resume="${resumeAt}">
            <source src="${esc(videoUrl)}" />
          </video>

          <div class="lesson-video-toolbar">
            <label class="lesson-speed-control" title="Playback speed">
              <i class="fas fa-gauge-high"></i>
              <select id="lesson-speed" class="form-select form-select-xs">
                ${[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(v => `
                  <option value="${v}" ${Math.abs(v - speed) < 0.001 ? 'selected' : ''}>${v}x</option>
                `).join('')}
              </select>
            </label>

            <button class="btn btn-ghost btn-xs" id="bookmark-time-btn"
                    title="Bookmark current time (B)">
              <i class="fas fa-bookmark"></i> Bookmark
            </button>

            ${hasTranscript ? `
              <button class="btn btn-ghost btn-xs" id="toggle-transcript-btn"
                      title="Show transcript">
                <i class="fas fa-closed-captioning"></i> Transcript
              </button>
            ` : ''}

            <button class="btn btn-ghost btn-xs" id="toggle-bookmarks-btn"
                    title="Show bookmarks">
              <i class="fas fa-list"></i> Bookmarks (${bookmarks.length})
            </button>

            ${lesson.summarizable !== false ? `
              <button class="btn btn-ghost btn-xs" id="summarize-lesson-btn"
                      title="Summarize this lesson">
                <i class="fas fa-wand-magic-sparkles"></i> Summarize
              </button>
            ` : ''}
          </div>

          ${resumeAt > 30 ? `
            <div class="lesson-resume-hint" id="lesson-resume-hint">
              <i class="fas fa-history"></i>
              Resumed at <strong>${fmtClock(resumeAt)}</strong>
              <button class="btn btn-ghost btn-xs" onclick="seekLessonVideo(0); hideResumeHint(); return false;">
                Start over
              </button>
              <button class="btn btn-ghost btn-xs" onclick="hideResumeHint(); return false;">
                Dismiss
              </button>
            </div>
          ` : ''}

          <div class="lesson-transcript" id="lesson-transcript" style="display:none">
            ${hasTranscript ? transcript.map((seg, i) => `
              <div class="lesson-transcript-seg" data-seek="${Number(seg.start_seconds || seg.start || 0)}">
                <span class="lesson-transcript-time">${fmtClock(Number(seg.start_seconds || seg.start || 0))}</span>
                <span class="lesson-transcript-text">${esc(String(seg.text || '').trim())}</span>
              </div>
            `).join('') : '<p class="empty-row">No transcript available.</p>'}
          </div>

          <div class="lesson-bookmarks" id="lesson-bookmarks" style="display:none">
            ${bookmarks.length ? bookmarks.map(b => `
              <div class="lesson-bookmark">
                <button class="lesson-bookmark-seek" onclick="seekLessonVideo(${Number(b.seconds)}); return false;">
                  <i class="fas fa-play"></i> ${fmtClock(Number(b.seconds))}
                </button>
                <input class="lesson-bookmark-label" type="text"
                       value="${esc(b.label || '')}"
                       placeholder="Add a label…"
                       onchange="renameLessonBookmark('${esc(String(lesson.id))}', ${Number(b.seconds)}, this.value)" />
                <button class="btn btn-ghost btn-xs"
                        onclick="deleteLessonBookmark('${esc(String(lesson.id))}', ${Number(b.seconds)}); return false;"
                        title="Delete bookmark">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            `).join('') : '<p class="empty-row">No bookmarks yet. Click "Bookmark" while watching.</p>'}
          </div>
        </div>
      ` : ''}

      ${lesson.lesson_type === 'reading' || content ? `
        <div class="lesson-body">
          ${content.replace(/\n/g, '<br/>')}
        </div>
      ` : ''}

      ${lesson.resources && safeArrayFromJson(lesson.resources).length ? `
        <div class="lesson-resources">
          <h4>Resources</h4>
          ${safeArrayFromJson(lesson.resources).map(r => `
            <a class="lesson-resource-link" href="${esc(r.url)}" target="_blank" rel="noopener">
              <i class="fas fa-download"></i> ${esc(r.name || 'Download')}
              ${r.size ? `<span class="form-hint">· ${formatBytes(r.size)}</span>` : ''}
            </a>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/* ============================================================
   Player bindings
   ============================================================ */
function bindPlayerInteractions(courseId, lessonId) {
  /* --- Curriculum sidebar navigation --- */
  document.querySelectorAll('.player-lesson').forEach(el => {
    el.onclick = () => {
      const lid = el.dataset.lessonId;
      closeModal();
      openCoursePlayer(courseId, lid);
    };
  });

  /* --- Tabs --- */
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

  /* --- Video: resume, speed, heartbeat, auto-advance, keyboard --- */
  const video = $('#lesson-video');
  if (video) {
    /* Apply persisted playback speed */
    const savedSpeed = getPlayerPref('speed', 1);
    try { video.playbackRate = Number(savedSpeed) || 1; } catch (_) {}

    /* Seek to resume position once metadata is ready */
    const resumeAt = Number(video.dataset.resume || 0);
    if (resumeAt > 5) {
      const doSeek = () => {
        try { video.currentTime = resumeAt; } catch (_) {}
      };
      if (video.readyState >= 1) doSeek();
      else video.addEventListener('loadedmetadata', doSeek, { once: true });
    }

    /* Speed selector */
    const speedSel = $('#lesson-speed');
    if (speedSel) {
      speedSel.onchange = () => {
        const v = Number(speedSel.value) || 1;
        try { video.playbackRate = v; } catch (_) {}
        setPlayerPref('speed', v);
      };
    }

    /* Throttled heartbeat: save every 15s and on pause/ended */
    let lastSaved = Number(resumeAt) || 0;
    const saveProgress = (opts = {}) => {
      const pos = Math.floor(video.currentTime || 0);
      if (!opts.force && Math.abs(pos - lastSaved) < 15) return;
      lastSaved = pos;
      S.__lastVideoPosition = pos;
      apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', {
        position_seconds: pos,
        time_spent_seconds: Math.max(1, Math.abs(pos - (opts.prevPos ?? 0))) || 1,
      }).catch(() => {});
    };

    video.addEventListener('timeupdate', () => {
      if (document.hidden) return;
      saveProgress();
    });
    video.addEventListener('pause', () => saveProgress({ force: true }));
    video.addEventListener('ended', () => {
      saveProgress({ force: true });
      const autoAdvance = getPlayerPref('autoAdvance', false);
      if (autoAdvance && S.__nextLessonId) {
        const nid = S.__nextLessonId;
        closeModal();
        setTimeout(() => openCoursePlayer(courseId, nid), 150);
      }
    });

    /* --- Toolbar actions --- */
    const bookmarkBtn = $('#bookmark-time-btn');
    if (bookmarkBtn) {
      bookmarkBtn.onclick = () => {
        const sec = Math.floor(video.currentTime || 0);
        const label = window.prompt('Label for this bookmark (optional):', '') || '';
        addLessonBookmark(lessonId, sec, label.trim());
        refreshBookmarksPanel(lessonId);
      };
    }

    const toggleTranscript = $('#toggle-transcript-btn');
    if (toggleTranscript) {
      toggleTranscript.onclick = () => {
        const box = $('#lesson-transcript');
        if (!box) return;
        const show = box.style.display === 'none';
        box.style.display = show ? 'block' : 'none';
      };
    }

    const toggleBookmarks = $('#toggle-bookmarks-btn');
    if (toggleBookmarks) {
      toggleBookmarks.onclick = () => {
        const box = $('#lesson-bookmarks');
        if (!box) return;
        const show = box.style.display === 'none';
        box.style.display = show ? 'block' : 'none';
      };
    }

    /* Transcript click-to-seek */
    document.querySelectorAll('.lesson-transcript-seg').forEach(seg => {
      seg.onclick = () => {
        const s = Number(seg.dataset.seek || 0);
        if (!isNaN(s)) seekLessonVideo(s);
      };
    });

    /* Summarize lesson */
    const summarizeBtn = $('#summarize-lesson-btn');
    if (summarizeBtn) {
      summarizeBtn.onclick = async () => {
        summarizeBtn.disabled = true;
        summarizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Summarizing…';
        try {
          const d = await apiCall(`/api/eschool/lessons/${lessonId}/summary`, 'GET');
          const summary = d.summary || d.text || '';
          showToast('Summary ready', 'success');
          openModal({
            title: 'Lesson summary',
            body: `<div class="lesson-summary-body">${esc(summary || 'No summary available.')}</div>`,
            footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
          });
        } catch (e) {
          showToast(e.message || 'Summary unavailable', 'warning');
        } finally {
          summarizeBtn.disabled = false;
          summarizeBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Summarize';
        }
      };
    }

    /* --- Global player keyboard shortcuts --- */
    installPlayerKeyboardShortcuts(courseId, lessonId);

    /* --- Theater toggle --- */
    const theaterBtn = $('#toggle-theater-btn');
    if (theaterBtn) {
      theaterBtn.onclick = () => {
        S.__playerTheater = !S.__playerTheater;
        const modalEl = document.querySelector('.course-player-modal');
        if (modalEl) modalEl.classList.toggle('is-theater', S.__playerTheater);
      };
    }

    /* --- Auto-advance toggle --- */
    const autoAdv = $('#auto-advance-toggle');
    if (autoAdv) {
      autoAdv.onchange = () => setPlayerPref('autoAdvance', !!autoAdv.checked);
    }
  }

  /* --- Right-hand player nav buttons (data-action) are handled elsewhere --- */
}

/* ============================================================
   Notes panel (with draft autosave)
   ============================================================ */
function renderLessonNotes() {
  const draftKey = `eh.lessonDraft.${S.__currentLessonId}`;
  let draft = '';
  try { draft = localStorage.getItem(draftKey) || ''; } catch (_) {}

  return `
    <div class="notes-panel">
      <div class="notes-add">
        <textarea id="new-note-text" class="form-textarea" rows="3"
                  placeholder="Write a note for this lesson…">${esc(draft)}</textarea>
        <div class="notes-add-actions">
          <button class="btn btn-primary btn-sm" id="add-note-btn">
            <i class="fas fa-plus"></i> Add Note</button>
          <button class="btn btn-secondary btn-sm" id="clear-note-draft-btn">
            <i class="fas fa-eraser"></i> Clear draft</button>
          <span class="form-hint" id="note-draft-status"></span>
        </div>
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

/* ============================================================
   Q&A panel (with upvotes)
   ============================================================ */
function renderLessonQA() {
  return `
    <div class="qa-panel">
      <div class="qa-add">
        <input id="lesson-q-input" class="form-input" placeholder="Ask a question about this lesson…" />
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
            <div class="qa-item-actions">
              <button class="btn btn-ghost btn-xs" data-action="upvote-question" data-id="${esc(String(q.id))}"
                      onclick="upvoteLessonQuestion('${esc(String(q.id))}'); return false;">
                <i class="fas fa-arrow-up"></i> <span class="qa-upvote-count">${Number(q.upvotes || 0)}</span>
              </button>
              <span class="form-hint">${timeAgo(q.created_at)}</span>
            </div>
          </li>
        `).join('') || '<li class="empty-row">No questions yet. Be the first to ask!</li>'}
      </ul>
    </div>
  `;
}

/* ============================================================
   Discussion panel (with threaded replies)
   ============================================================ */
function renderLessonDiscussion(lessonId) {
  const discussions = (S.courseDiscussions || []).filter(d => String(d.lesson_id) === String(lessonId));
  const topLevel = discussions.filter(d => !d.parent_id);
  const childrenOf = (parentId) => discussions.filter(d => String(d.parent_id) === String(parentId));

  const renderOne = (d, depth = 0) => `
    <li class="discussion-item ${depth ? 'discussion-reply' : ''}" style="margin-left:${depth ? 24 : 0}px">
      <img class="user-avatar" src="${avatar({ name: d.author_name })}" alt="" />
      <div class="discussion-body">
        <div class="discussion-author">
          <strong>${esc(d.author_name || 'Anonymous')}</strong>
          ${d.author_role === 'instructor' ? '<span class="chip chip-blue">Instructor</span>' : ''}
          <span class="discussion-time">${timeAgo(d.created_at)}</span>
        </div>
        <p>${esc(d.body)}</p>
        <div class="discussion-actions">
          <button class="btn btn-ghost btn-xs"
                  onclick="upvoteDiscussion('${esc(String(d.id))}'); return false;">
            <i class="fas fa-arrow-up"></i> ${d.upvotes || 0}</button>
          ${depth < 2 ? `
            <button class="btn btn-ghost btn-xs"
                    onclick="toggleReplyBox('${esc(String(d.id))}'); return false;">
              <i class="fas fa-reply"></i> Reply</button>
          ` : ''}
        </div>
        <div class="discussion-reply-box" id="reply-box-${esc(String(d.id))}" style="display:none">
          <textarea class="form-textarea" rows="2"
                    placeholder="Write a reply…"
                    id="reply-text-${esc(String(d.id))}"></textarea>
          <button class="btn btn-primary btn-xs"
                  onclick="postReply('${esc(String(lessonId))}', '${esc(String(d.id))}'); return false;">
            <i class="fas fa-paper-plane"></i> Post reply</button>
        </div>
        ${childrenOf(d.id).length ? `
          <ul class="discussion-list">
            ${childrenOf(d.id).map(ch => renderOne(ch, depth + 1)).join('')}
          </ul>
        ` : ''}
      </div>
    </li>
  `;

  return `
    <div class="discussion-panel">
      <div class="discussion-add">
        <textarea id="discussion-input" class="form-textarea" rows="2"
                  placeholder="Start a discussion…"></textarea>
        <button class="btn btn-primary btn-sm" id="discussion-post-btn">
          <i class="fas fa-comment"></i> Post</button>
      </div>
      <ul class="discussion-list">
        ${topLevel.map(d => renderOne(d)).join('') || '<li class="empty-row">No discussions yet</li>'}
      </ul>
    </div>
  `;
}

/* ============================================================
   Player tab events (notes, Q&A, discussion)
   ============================================================ */
function bindPlayerTabEvents(courseId, lessonId) {
  /* ----- Notes ----- */
  const addNoteBtn = $('#add-note-btn');
  if (addNoteBtn) addNoteBtn.onclick = async () => {
    const ta = $('#new-note-text');
    const text = (ta?.value || '').trim();
    if (!text) return;
    try {
      await apiCall(`/api/eschool/lessons/${lessonId}/notes`, 'POST', { content: text });
      const d = await apiCall(`/api/eschool/lessons/${lessonId}/notes`);
      S.lessonNotes = d.notes || [];
      clearLessonDraft(lessonId);
      $('#player-tab-content').innerHTML = renderLessonNotes();
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const clearDraftBtn = $('#clear-note-draft-btn');
  if (clearDraftBtn) clearDraftBtn.onclick = () => {
    clearLessonDraft(lessonId);
    const ta = $('#new-note-text');
    if (ta) ta.value = '';
    showToast('Draft cleared', 'info');
  };

  /* Draft autosave with debounce */
  const noteTextarea = $('#new-note-text');
  if (noteTextarea) {
    const status = $('#note-draft-status');
    if (typeof EHFeature11 !== 'undefined' && typeof EHFeature11.debounce === 'function') {
      const save = EHFeature11.debounce(() => {
        saveLessonDraft(lessonId, noteTextarea.value);
        if (status) {
          status.textContent = 'Draft saved';
          setTimeout(() => { if (status) status.textContent = ''; }, 1500);
        }
      }, 400);
      noteTextarea.addEventListener('input', save);
    } else {
      let t = null;
      noteTextarea.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => saveLessonDraft(lessonId, noteTextarea.value), 400);
      });
    }
  }

  /* ----- Q&A ----- */
  const askBtn = $('#lesson-q-btn');
  if (askBtn) askBtn.onclick = async () => {
    const q = ($('#lesson-q-input')?.value || '').trim();
    if (!q) return;
    try {
      await apiCall(`/api/eschool/lessons/${lessonId}/questions`, 'POST', { question: q });
      const d = await apiCall(`/api/eschool/lessons/${lessonId}/questions`);
      S.lessonQuestions = d.questions || [];
      $('#player-tab-content').innerHTML = renderLessonQA();
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  /* ----- Discussion ----- */
  const postBtn = $('#discussion-post-btn');
  if (postBtn) postBtn.onclick = async () => {
    const body = ($('#discussion-input')?.value || '').trim();
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

/* ============================================================
   Discussion helpers (replies, upvotes)
   ============================================================ */
function toggleReplyBox(discussionId) {
  const box = document.getElementById(`reply-box-${discussionId}`);
  if (!box) return;
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
  const ta = document.getElementById(`reply-text-${discussionId}`);
  if (ta) ta.focus();
}

async function postReply(lessonId, parentId) {
  const ta = document.getElementById(`reply-text-${parentId}`);
  const body = (ta?.value || '').trim();
  if (!body) return;
  try {
    await apiCall('/api/eschool/discussions', 'POST', {
      course_id: S.__currentCourseId,
      lesson_id: lessonId,
      parent_id: parentId,
      body,
    });
    const d = await apiCall(`/api/eschool/courses/${S.__currentCourseId}/discussions`);
    S.courseDiscussions = d.discussions || [];
    $('#player-tab-content').innerHTML = renderLessonDiscussion(lessonId);
    bindPlayerTabEvents(S.__currentCourseId, lessonId);
  } catch (e) { showToast(e.message, 'error'); }
}

async function upvoteDiscussion(discussionId) {
  /* Optimistic UI */
  const row = (S.courseDiscussions || []).find(d => String(d.id) === String(discussionId));
  if (row) row.upvotes = Number(row.upvotes || 0) + 1;
  if (S.__currentLessonId) {
    $('#player-tab-content').innerHTML = renderLessonDiscussion(S.__currentLessonId);
    bindPlayerTabEvents(S.__currentCourseId, S.__currentLessonId);
  }
  try {
    await apiCall(`/api/eschool/discussions/${discussionId}/upvote`, 'POST', {});
  } catch (_) {
    /* Roll back on failure */
    if (row) row.upvotes = Math.max(0, Number(row.upvotes || 1) - 1);
    if (S.__currentLessonId) {
      $('#player-tab-content').innerHTML = renderLessonDiscussion(S.__currentLessonId);
      bindPlayerTabEvents(S.__currentCourseId, S.__currentLessonId);
    }
  }
}

async function upvoteLessonQuestion(questionId) {
  const q = (S.lessonQuestions || []).find(x => String(x.id) === String(questionId));
  if (!q) return;
  q.upvotes = Number(q.upvotes || 0) + 1;
  /* Update count in place */
  const btn = document.querySelector(`[data-id="${cssEscape(questionId)}"] .qa-upvote-count`);
  if (btn) btn.textContent = q.upvotes;
  try {
    await apiCall(`/api/eschool/questions/${questionId}/upvote`, 'POST', {});
  } catch (_) {
    q.upvotes = Math.max(0, Number(q.upvotes || 1) - 1);
    if (btn) btn.textContent = q.upvotes;
  }
}

/* ============================================================
   Lesson helpers
   ============================================================ */

/* --- Transcript parsing --- */
function parseTranscript(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    /* Fallback: "[00:30] line" format */
    return String(input).split(/\r?\n/).map(line => {
      const m = line.match(/^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*(.*)$/);
      if (!m) return { start_seconds: 0, text: line };
      const h = m[3] ? Number(m[1]) : 0;
      const min = m[3] ? Number(m[2]) : Number(m[1]);
      const sec = m[3] ? Number(m[3]) : Number(m[2]);
      return { start_seconds: h * 3600 + min * 60 + sec, text: m[4] };
    }).filter(s => s.text.trim());
  }
}

/* --- Resume helpers --- */
function seekLessonVideo(seconds) {
  const video = $('#lesson-video');
  if (!video) return;
  try { video.currentTime = Number(seconds) || 0; } catch (_) {}
  try { video.play().catch(() => {}); } catch (_) {}
}
function hideResumeHint() {
  const hint = $('#lesson-resume-hint');
  if (hint) hint.style.display = 'none';
}

/* --- Playback prefs --- */
function getPlayerPref(name, fallback) {
  try {
    const raw = localStorage.getItem(`eh.playerPref.${name}`);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (_) { return fallback; }
}
function setPlayerPref(name, value) {
  try { localStorage.setItem(`eh.playerPref.${name}`, JSON.stringify(value)); } catch (_) {}
}

/* --- Bookmark helpers --- */
function lessonBookmarksKey(lessonId) { return `eh.lessonBookmarks.${lessonId}`; }
function loadLessonBookmarks(lessonId) {
  try {
    const raw = localStorage.getItem(lessonBookmarksKey(lessonId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}
function saveLessonBookmarks(lessonId, list) {
  try { localStorage.setItem(lessonBookmarksKey(lessonId), JSON.stringify(list)); } catch (_) {}
}
function addLessonBookmark(lessonId, seconds, label) {
  const list = loadLessonBookmarks(lessonId);
  if (list.some(b => Number(b.seconds) === Number(seconds))) {
    showToast('Bookmark at this time already exists', 'info');
    return;
  }
  list.push({ seconds: Number(seconds), label: label || '' });
  list.sort((a, b) => a.seconds - b.seconds);
  saveLessonBookmarks(lessonId, list);
  showToast('Bookmarked', 'success');
}
function renameLessonBookmark(lessonId, seconds, label) {
  const list = loadLessonBookmarks(lessonId);
  const b = list.find(x => Number(x.seconds) === Number(seconds));
  if (b) { b.label = label; saveLessonBookmarks(lessonId, list); }
}
function deleteLessonBookmark(lessonId, seconds) {
  const list = loadLessonBookmarks(lessonId).filter(x => Number(x.seconds) !== Number(seconds));
  saveLessonBookmarks(lessonId, list);
  refreshBookmarksPanel(lessonId);
}
function refreshBookmarksPanel(lessonId) {
  const box = $('#lesson-bookmarks');
  if (!box) return;
  const list = loadLessonBookmarks(lessonId);
  box.innerHTML = list.length ? list.map(b => `
    <div class="lesson-bookmark">
      <button class="lesson-bookmark-seek" onclick="seekLessonVideo(${Number(b.seconds)}); return false;">
        <i class="fas fa-play"></i> ${fmtClock(Number(b.seconds))}
      </button>
      <input class="lesson-bookmark-label" type="text"
             value="${esc(b.label || '')}"
             placeholder="Add a label…"
             onchange="renameLessonBookmark('${esc(String(lessonId))}', ${Number(b.seconds)}, this.value)" />
      <button class="btn btn-ghost btn-xs"
              onclick="deleteLessonBookmark('${esc(String(lessonId))}', ${Number(b.seconds)}); return false;"
              title="Delete bookmark">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('') : '<p class="empty-row">No bookmarks yet. Click "Bookmark" while watching.</p>';

  const toggle = $('#toggle-bookmarks-btn');
  if (toggle) toggle.innerHTML = `<i class="fas fa-list"></i> Bookmarks (${list.length})`;
}

/* --- Note draft helpers --- */
function saveLessonDraft(lessonId, text) {
  try { localStorage.setItem(`eh.lessonDraft.${lessonId}`, text || ''); } catch (_) {}
}
function clearLessonDraft(lessonId) {
  try { localStorage.removeItem(`eh.lessonDraft.${lessonId}`); } catch (_) {}
}

/* ============================================================
   Keyboard shortcuts (active only while player is open)
   ============================================================ */
function installPlayerKeyboardShortcuts(courseId, lessonId) {
  if (window.__playerKeyHandler) {
    document.removeEventListener('keydown', window.__playerKeyHandler, true);
  }
  const handler = (e) => {
    const video = $('#lesson-video');
    if (!video) return;
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
    if (typing) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, (video.currentTime || 0) - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime = Math.min((video.duration || 1e9), (video.currentTime || 0) + 5);
        break;
      case 'm': case 'M':
        video.muted = !video.muted;
        break;
      case 'n': case 'N':
        if (S.__nextLessonId) {
          const nid = S.__nextLessonId;
          closeModal();
          setTimeout(() => openCoursePlayer(courseId, nid), 100);
        }
        break;
      case 'p': case 'P':
        if (S.__prevLessonId) {
          const pid = S.__prevLessonId;
          closeModal();
          setTimeout(() => openCoursePlayer(courseId, pid), 100);
        }
        break;
      case 'f': case 'F':
        if (video.requestFullscreen) {
          if (document.fullscreenElement) document.exitFullscreen?.();
          else video.requestFullscreen().catch(() => {});
        }
        break;
      case 't': case 'T': {
        const modalEl = document.querySelector('.course-player-modal');
        if (modalEl) {
          S.__playerTheater = !S.__playerTheater;
          modalEl.classList.toggle('is-theater', S.__playerTheater);
        }
        break;
      }
      case 'b': case 'B': {
        const btn = $('#bookmark-time-btn');
        if (btn) btn.click();
        break;
      }
      case 'Escape':
        /* Let default modal handling close if implemented */
        break;
      default: break;
    }
  };
  window.__playerKeyHandler = handler;
  document.addEventListener('keydown', handler, true);
}

/* ============================================================
   Unload beacon (saves progress on tab close / navigation)
   ============================================================ */
function installPlayerUnloadBeacon() {
  if (window.__playerUnloadInstalled) return;
  window.__playerUnloadInstalled = true;
  window.addEventListener('beforeunload', () => {
    const lessonId = S.__currentLessonId;
    const pos = S.__lastVideoPosition || 0;
    if (!lessonId || !pos) return;
    try {
      const body = JSON.stringify({
        position_seconds: Math.floor(pos),
        time_spent_seconds: 1,
        beacon: true,
      });
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(`/api/eschool/lessons/${lessonId}/progress`, blob);
      }
    } catch (_) {}
  });
}

/* ============================================================
   Completion confetti (lightweight, no dependency)
   ============================================================ */
function maybeCelebrateLessonCompletion(lessonId, isLastLesson) {
  if (!isLastLesson) return;
  try { fireCourseCompletionConfetti(); } catch (_) {}
}

function fireCourseCompletionConfetti() {
  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];
  const N = 60;
  const container = document.createElement('div');
  container.className = 'eh-confetti-container';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  for (let i = 0; i < N; i++) {
    const piece = document.createElement('span');
    piece.className = 'eh-confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 3000);
  if (typeof showToast === 'function') showToast('Course completed! 🎉', 'success');
}

/* ============================================================
   Utilities
   ============================================================ */
function safeArrayFromJson(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
  catch (_) { return []; }
}
function fmtClock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n || isNaN(n)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
function cssEscape(s) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(String(s));
  return String(s).replace(/["\\]/g, '\\$&');
}