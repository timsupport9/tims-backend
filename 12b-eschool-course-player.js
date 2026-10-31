/* ============================================================
   ExpertHub 2.0 — 12b-eschool-course-player.js
   Modern, accessible course player:
   - Responsive 3-column layout (curriculum / lesson / assistance)
   - Collapsible modules, completion + locked states
   - Video player with position saving & error handling
   - Tabs: Overview, Resources, Notes, Discussion
   - Backend-authoritative progress + mark complete
   - Prev/Next navigation, notes autosave, resource downloads
   - Focus management, keyboard nav, ARIA, full cleanup on close

   PRESERVES:
   - openCoursePlayer(courseId, lessonId)
   - S.__currentCourseId  (for 13c markLessonComplete refresh)
   - S.courseCurriculum[id], loadCourseCurriculum(id)
   - apiCall, openModal, closeModal, showToast, showLoading, esc
   - data-action="mark-lesson-complete"
   - data-action="review-course"
   ============================================================ */

/* ===================== Player state ===================== */
const EHCP = {
  st: {
    courseId: null,
    lessonId: null,
    course: null,
    modules: [],
    lesson: null,
    activeTab: 'overview',
    busy: { lesson: false, complete: false, notes: false },
    reqSeq: 0,
    videoSaveTimer: null,
    notesSaveTimer: null,
    notesDirty: false,
    notesLessonId: null,
    moduleOpen: Object.create(null),
    lastFocus: null,
    opened: false,
    video: null,
    videoListeners: [],
    cleanupFns: [],
  },
  cache: {
    notes: Object.create(null),
    resources: Object.create(null),
    discussion: Object.create(null),
  },
};

/* ===================== Small helpers ===================== */

function ehcpEscape(s) {
  if (typeof esc === 'function') return esc(s == null ? '' : String(s));
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function ehcpFmtDur(sec) {
  const n = Number(sec);
  if (!isFinite(n) || n <= 0) return '';
  const s = Math.floor(n % 60), m = Math.floor((n / 60) % 60), h = Math.floor(n / 3600);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
               : `${m}:${String(s).padStart(2, '0')}`;
}

function ehcpFmtBytes(b) {
  const n = Number(b);
  if (!isFinite(n) || n <= 0) return '';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function ehcpFmtTime(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch { return ''; }
}

function ehcpSafeUrl(u) {
  if (!u || typeof u !== 'string') return '';
  const s = u.trim();
  if (/^(https?:)?\/\//i.test(s)) return s;
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  return '';
}

function ehcpFlatLessons(modules) {
  const out = [];
  (modules || []).forEach(m => (m.lessons || []).forEach(l => {
    out.push(Object.assign({}, l, { __moduleId: m.id, __moduleTitle: m.title }));
  }));
  return out;
}

function ehcpFindLesson(modules, id) {
  if (id == null) return null;
  return ehcpFlatLessons(modules).find(l => String(l.id) === String(id)) || null;
}

function ehcpCalcProgress(modules) {
  const all = ehcpFlatLessons(modules);
  const total = all.length;
  const done = all.filter(l => !!l.completed).length;
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

function ehcpIsLocked(l) {
  if (!l) return true;
  return l.locked === true || l.accessible === false;
}

function ehcpFindInDom(sel, root) {
  return (root || document).querySelector(sel);
}

function ehcpFindAllInDom(sel, root) {
  return Array.from((root || document).querySelectorAll(sel));
}

/* ===================== Main entry ===================== */

async function openCoursePlayer(courseId, lessonId = null) {
  const id = Number(courseId);
  if (!id) {
    if (typeof showToast === 'function') showToast('No course selected', 'error');
    return;
  }

  // Cleanup any previous player instance before opening a new one
  ehcpCleanup();

  const st = EHCP.st;
  st.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  st.courseId = id;
  st.lessonId = lessonId != null ? Number(lessonId) : null;
  st.opened = true;
  st.activeTab = 'overview';
  st.reqSeq++;
  const mySeq = st.reqSeq;

  // Preserve integration contract
  S.__currentCourseId = id;

  try {
    if (typeof showLoading === 'function') showLoading(true);

    // Load curriculum (cached)
    if (!S.courseCurriculum) S.courseCurriculum = {};
    if (!S.courseCurriculum[id] && typeof loadCourseCurriculum === 'function') {
      await loadCourseCurriculum(id);
    }
    const cur = (S.courseCurriculum && S.courseCurriculum[id]) || { modules: [] };
    st.modules = Array.isArray(cur.modules) ? cur.modules : [];
    st.modules.forEach(m => {
      if (st.moduleOpen[m.id] == null) st.moduleOpen[m.id] = true;
    });

    // Load course details (non-fatal)
    try {
      const d = await apiCall(`/api/eschool/courses/${id}`);
      st.course = (d && d.course) || {};
    } catch (e) {
      console.warn('[player] course details failed:', e);
      st.course = {};
    }

    if (mySeq !== st.reqSeq) return; // stale

    // Resolve current lesson
    const all = ehcpFlatLessons(st.modules);
    let current = st.lessonId != null
      ? all.find(l => String(l.id) === String(st.lessonId))
      : null;
    if (!current) current = all.find(l => !l.completed && !ehcpIsLocked(l)) || all[0] || null;
    st.lesson = current || null;
    st.lessonId = current ? current.id : null;
    if (current && current.__moduleId != null) st.moduleOpen[current.__moduleId] = true;

    // Render shell + bind
    ehcpRenderShell();
    ehcpBindShell();
    ehcpFocusModal();

    // Load first lesson
    if (st.lesson) await ehcpLoadLesson(st.lesson.id);
  } catch (e) {
    console.error('[player]', e);
    if (typeof showToast === 'function') {
      showToast(e && e.message ? e.message : 'Failed to load player', 'error');
    }
  } finally {
    if (typeof showLoading === 'function') showLoading(false);
  }
}

/* ===================== Shell ===================== */

function ehcpRenderShell() {
  const st = EHCP.st;
  const course = st.course || {};
  const prog = ehcpCalcProgress(st.modules);

  const bodyHTML = `
    <div class="ehcp-root course-player-layout" role="region" aria-label="Course player">
      <!-- Mobile drawers toggles -->
      <div class="ehcp-mobile-bar">
        <button type="button" class="ehcp-mbtn" data-ehcp-drawer="curriculum" aria-label="Open curriculum">
          <i class="fas fa-list"></i><span>Curriculum</span>
        </button>
        <div class="ehcp-mobile-progress" aria-label="Course progress">
          <span>${prog.pct}%</span>
          <div class="ehcp-progress-mini"><span style="width:${prog.pct}%"></span></div>
        </div>
        <button type="button" class="ehcp-mbtn" data-ehcp-drawer="assist" aria-label="Open course details">
          <i class="fas fa-info-circle"></i><span>Details</span>
        </button>
      </div>

      <!-- Sidebar -->
      <aside class="course-player-sidebar ehcp-sidebar" id="ehcp-sidebar" aria-label="Curriculum">
        ${ehcpRenderSidebar()}
      </aside>

      <!-- Main -->
      <main class="course-player-main ehcp-main" id="ehcp-main">
        <div id="ehcp-lesson-slot">${ehcpRenderLessonSkeleton()}</div>
        <footer class="ehcp-footer" id="ehcp-footer">
          <button type="button" class="btn btn-secondary" data-ehcp-prev>
            <i class="fas fa-arrow-left"></i> Previous
          </button>
          <div class="ehcp-footer-mid">
            <button type="button" class="btn btn-secondary" data-ehcp-save-later>
              <i class="fas fa-bookmark"></i> Save for Later
            </button>
          </div>
          <button type="button" class="btn btn-primary" data-ehcp-next>
            Next Lesson <i class="fas fa-arrow-right"></i>
          </button>
        </footer>
      </main>

      <!-- Assistance -->
      <aside class="course-player-assistance ehcp-assist" id="ehcp-assist" aria-label="Course information">
        ${ehcpRenderAssistance()}
      </aside>

      <!-- Mobile drawer backdrop -->
      <div class="ehcp-drawer-backdrop" data-ehcp-drawer-close hidden></div>
    </div>`;

  if (typeof openModal === 'function') {
    openModal({
      title: ehcpRenderHeaderTitle(),
      className: 'course-player-modal modal-lg',
      body: bodyHTML,
      footer: `<button class="btn btn-secondary" data-close-modal data-ehcp-close>
                 Close Player
               </button>`,
    });
  } else {
    console.error('[player] openModal() not available');
  }
}

function ehcpRenderHeaderTitle() {
  const c = EHCP.st.course || {};
  return `Player · ${ehcpEscape(c.title || '')}`;
}

function ehcpRenderSidebar() {
  const st = EHCP.st;
  const c = st.course || {};
  const prog = ehcpCalcProgress(st.modules);
  const thumb = ehcpSafeUrl(c.thumbnail_url || c.thumbnail || '');

  const summary = `
    <div class="ehcp-course-card">
      ${thumb ? `<img src="${ehcpEscape(thumb)}" alt="" class="ehcp-course-thumb" loading="lazy">` : ''}
      <div class="ehcp-course-meta">
        <h4 class="ehcp-course-title">${ehcpEscape(c.title || 'Course')}</h4>
        <div class="ehcp-status-chip">${prog.pct >= 100 ? 'Completed' : prog.done > 0 ? 'In Progress' : 'Not started'}</div>
        <div class="ehcp-progress" role="progressbar"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="${prog.pct}"
             aria-label="Course progress">
          <span style="width:${prog.pct}%"></span>
        </div>
        <small class="ehcp-progress-label">${prog.done} of ${prog.total} lessons • ${prog.pct}%</small>
      </div>
    </div>`;

  const modulesHTML = st.modules.length
    ? st.modules.map((m, mi) => ehcpRenderModule(m, mi)).join('')
    : `<p class="empty-row">No modules</p>`;

  return `
    ${summary}
    <h4 class="panel-title ehcp-curriculum-title">Curriculum</h4>
    <div class="ehcp-modules" role="tree">${modulesHTML}</div>
  `;
}

function ehcpRenderModule(m, mi) {
  const st = EHCP.st;
  const open = st.moduleOpen[m.id] !== false;
  const lessons = m.lessons || [];
  const modDone = lessons.filter(l => !!l.completed).length;
  const modTotal = lessons.length;

  const lessonsHTML = lessons.map(l => ehcpRenderLessonRow(l)).join('');

  return `
    <section class="lesson-group ehcp-module ${open ? 'is-open' : 'is-closed'}" role="treeitem"
             aria-expanded="${open}" data-ehcp-module="${ehcpEscape(m.id)}">
      <button type="button" class="ehcp-module-head" data-ehcp-toggle-module="${ehcpEscape(m.id)}"
              aria-expanded="${open}">
        <span class="ehcp-module-chev"><i class="fas fa-chevron-${open ? 'down' : 'right'}"></i></span>
        <span class="ehcp-module-title">${ehcpEscape(m.title || `Module ${mi + 1}`)}</span>
        <span class="ehcp-module-count">${modDone}/${modTotal}</span>
      </button>
      <div class="ehcp-module-body" ${open ? '' : 'hidden'}>
        ${lessonsHTML || '<p class="empty-row">No lessons</p>'}
      </div>
    </section>`;
}

function ehcpRenderLessonRow(l) {
  const st = EHCP.st;
  const active = st.lessonId != null && String(st.lessonId) === String(l.id);
  const locked = ehcpIsLocked(l);
  const done = !!l.completed;
  const dur = ehcpFmtDur(l.duration_seconds || l.duration || 0);

  const icon = locked ? 'fa-lock'
             : done   ? 'fa-check-circle'
             : active ? 'fa-play-circle'
                      : 'fa-circle';

  const stateClass = locked ? 'is-locked' : done ? 'is-done' : active ? 'is-active' : '';

  return `
    <button type="button"
            class="lesson-item ehcp-lesson ${stateClass}"
            ${locked ? 'aria-disabled="true" data-ehcp-locked="1"' : `data-ehcp-lesson="${ehcpEscape(l.id)}"`}
            role="treeitem" ${active ? 'aria-selected="true"' : ''}
            title="${locked ? 'Locked' : ehcpEscape(l.title)}">
      <i class="fas ${icon}" aria-hidden="true"></i>
      <span class="ehcp-lesson-title">${ehcpEscape(l.title)}</span>
      ${dur ? `<span class="ehcp-lesson-dur">${ehcpEscape(dur)}</span>` : ''}
      ${l.has_quiz ? '<i class="fas fa-question-circle ehcp-lesson-tag" title="Quiz"></i>' : ''}
      ${l.has_assignment ? '<i class="fas fa-file-alt ehcp-lesson-tag" title="Assignment"></i>' : ''}
    </button>`;
}

function ehcpRenderLessonSkeleton() {
  return `
    <div class="ehcp-lesson-skeleton" aria-busy="true">
      <div class="ehcp-skel-line" style="width:55%"></div>
      <div class="ehcp-skel-line" style="width:35%"></div>
      <div class="ehcp-skel-block"></div>
      <div class="ehcp-skel-line" style="width:90%"></div>
      <div class="ehcp-skel-line" style="width:80%"></div>
    </div>`;
}

function ehcpRenderAssistance() {
  const st = EHCP.st;
  const c = st.course || {};
  const prog = ehcpCalcProgress(st.modules);

  return `
    <h4 class="panel-title">Course Progress</h4>
    <div class="ehcp-assist-card">
      <div class="ehcp-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${prog.pct}" aria-label="Course progress">
        <span style="width:${prog.pct}%"></span>
      </div>
      <p class="ehcp-assist-stat"><strong>${prog.pct}%</strong> complete</p>
      <p class="ehcp-assist-stat muted">${prog.done} of ${prog.total} lessons</p>
    </div>

    <h4 class="panel-title">Course Information</h4>
    <div class="ehcp-assist-card">
      ${c.description ? `<p class="ehcp-assist-desc">${ehcpEscape(c.description)}</p>` : '<p class="empty-row">No description</p>'}
      ${c.level ? `<p class="ehcp-assist-stat muted">Level: ${ehcpEscape(c.level)}</p>` : ''}
      ${c.duration_hours ? `<p class="ehcp-assist-stat muted">Duration: ${ehcpEscape(c.duration_hours)}h</p>` : ''}
    </div>

    ${c.instructor_name ? `
      <h4 class="panel-title">Instructor</h4>
      <div class="ehcp-assist-card ehcp-instructor">
        <div class="ehcp-instructor-avatar">${ehcpEscape((c.instructor_name || '?').charAt(0).toUpperCase())}</div>
        <div>
          <strong>${ehcpEscape(c.instructor_name)}</strong>
          ${c.instructor_title ? `<p class="muted">${ehcpEscape(c.instructor_title)}</p>` : ''}
        </div>
      </div>` : ''}

    <h4 class="panel-title">Need Help?</h4>
    <div class="ehcp-assist-card">
      <p class="muted">Having trouble with this lesson? Contact support or post a question in the Discussion tab.</p>
      <button type="button" class="btn btn-secondary btn-sm" data-ehcp-switch-tab="discussion">
        <i class="fas fa-comments"></i> Ask a Question
      </button>
    </div>
  `;
}

/* ===================== Lesson loading ===================== */

async function ehcpLoadLesson(lessonId) {
  const st = EHCP.st;
  if (lessonId == null) return;
  st.lessonId = Number(lessonId);
  st.busy.lesson = true;
  const mySeq = ++st.reqSeq;

  const slot = ehcpFindInDom('#ehcp-lesson-slot');
  if (slot) slot.innerHTML = ehcpRenderLessonSkeleton();

  try {
    let lesson = ehcpFindLesson(st.modules, lessonId);
    // Try to fetch fuller lesson detail (safe fallback)
    try {
      const r = await apiCall(`/api/eschool/lessons/${lessonId}`);
      if (r && r.lesson) lesson = Object.assign({}, lesson || {}, r.lesson);
    } catch (e) {
      // non-fatal
      console.warn('[player] lesson detail failed:', e);
    }

    if (mySeq !== st.reqSeq) return;
    if (!lesson) {
      throw new Error('Lesson not found');
    }
    st.lesson = lesson;

    // Reflect active in sidebar
    ehcpRefreshSidebar();

    // Render
    ehcpRenderLesson(lesson);

    // Load initial tab content in background
    ehcpPreloadTabContent(lesson.id);
  } catch (e) {
    console.error('[player] lesson load:', e);
    if (slot) {
      slot.innerHTML = `
        <div class="ehcp-error-state">
          <h3>This lesson couldn't be loaded</h3>
          <p>${ehcpEscape(e.message || 'Please try again.')}</p>
          <button type="button" class="btn btn-secondary" data-ehcp-retry-lesson>
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>`;
    }
  } finally {
    st.busy.lesson = false;
    ehcpUpdateNavState();
  }
}

function ehcpRenderLesson(lesson) {
  const slot = ehcpFindInDom('#ehcp-lesson-slot');
  if (!slot) return;

  const st = EHCP.st;
  const tabs = ehcpAvailableTabs(lesson);
  if (!tabs.includes(st.activeTab)) st.activeTab = 'overview';

  slot.innerHTML = `
    <header class="ehcp-lesson-header">
      <nav class="ehcp-breadcrumb" aria-label="Breadcrumb">
        ${lesson.__moduleTitle ? `<span>${ehcpEscape(lesson.__moduleTitle)}</span> <span aria-hidden="true">›</span>` : ''}
        <span>${ehcpEscape(lesson.title || '')}</span>
      </nav>
      <h2 class="ehcp-lesson-title">${ehcpEscape(lesson.title || '')}</h2>
    </header>

    ${lesson.video_url ? `
      <div class="ehcp-video-wrap" data-ehcp-video-wrap>
        <video class="ehcp-video" controls playsinline preload="metadata"
               ${lesson.video_poster ? `poster="${ehcpEscape(lesson.video_poster)}"` : ''}
               aria-label="Lesson video">
          <source src="${ehcpEscape(ehcpSafeUrl(lesson.video_url))}">
          Your browser does not support video playback.
        </video>
        <div class="ehcp-video-error" hidden>
          <p>This lesson video could not be loaded. Check your connection and try again.</p>
          <button type="button" class="btn btn-secondary btn-sm" data-ehcp-video-retry>
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>
      </div>
    ` : ''}

    <div class="ehcp-tabs" role="tablist" aria-label="Lesson tools">
      ${tabs.map(t => ehcpRenderTabButton(t, st.activeTab === t)).join('')}
    </div>

    <div class="ehcp-tab-panels">
      ${tabs.map(t => ehcpRenderTabPanel(t, lesson)).join('')}
    </div>

    <div class="ehcp-lesson-actions">
      <button type="button"
              class="btn btn-primary ${lesson.completed ? 'is-done' : ''}"
              data-action="mark-lesson-complete"
              data-ehcp-mark-complete
              data-lesson="${ehcpEscape(lesson.id)}"
              data-course="${ehcpEscape(st.courseId)}"
              ${lesson.completed ? 'disabled' : ''}>
        <i class="fas ${lesson.completed ? 'fa-check-circle' : 'fa-check'}"></i>
        ${lesson.completed ? 'Completed' : 'Mark Complete'}
      </button>
      <button type="button" class="btn btn-secondary"
              data-action="review-course"
              data-id="${ehcpEscape(st.courseId)}">
        <i class="fas fa-star"></i> Rate Course
      </button>
    </div>
  `;

  // Attach video handlers
  ehcpInitVideo(lesson);

  // Focus first tab
  const firstTab = slot.querySelector('.ehcp-tab[aria-selected="true"]');
  if (firstTab) firstTab.setAttribute('tabindex', '0');
}

function ehcpAvailableTabs(lesson) {
  const tabs = ['overview'];
  tabs.push('resources');
  tabs.push('notes');
  tabs.push('discussion');
  if (lesson && (lesson.has_quiz || lesson.quiz_id)) tabs.push('quiz');
  return tabs;
}

function ehcpRenderTabButton(id, active) {
  const label = {
    overview: 'Overview',
    resources: 'Resources',
    notes: 'My Notes',
    discussion: 'Discussion',
    quiz: 'Quiz',
  }[id] || id;
  return `<button type="button" class="ehcp-tab ${active ? 'is-active' : ''}"
            role="tab" id="ehcp-tab-${id}"
            aria-controls="ehcp-panel-${id}"
            aria-selected="${active}"
            tabindex="${active ? '0' : '-1'}"
            data-ehcp-tab="${id}">${label}</button>`;
}

function ehcpRenderTabPanel(id, lesson) {
  const active = EHCP.st.activeTab === id;
  let inner = '';
  switch (id) {
    case 'overview':
      inner = ehcpRenderOverview(lesson); break;
    case 'resources':
      inner = '<div class="ehcp-panel-loading">Loading resources…</div>'; break;
    case 'notes':
      inner = ehcpRenderNotesPanel(lesson); break;
    case 'discussion':
      inner = '<div class="ehcp-panel-loading">Loading discussion…</div>'; break;
    case 'quiz':
      inner = ehcpRenderQuizPanel(lesson); break;
    default:
      inner = '';
  }
  return `<section class="ehcp-tab-panel ${active ? 'is-active' : ''}"
            role="tabpanel" id="ehcp-panel-${id}"
            aria-labelledby="ehcp-tab-${id}"
            ${active ? '' : 'hidden'}>
            ${inner}
          </section>`;
}

function ehcpRenderOverview(lesson) {
  const objectives = Array.isArray(lesson.objectives) ? lesson.objectives : [];
  return `
    ${lesson.description
      ? `<p class="ehcp-lesson-desc">${ehcpEscape(lesson.description)}</p>`
      : `<p class="form-hint">${ehcpEscape(lesson.content || 'This lesson has no written content.')}</p>`}
    ${objectives.length ? `
      <h4>Learning objectives</h4>
      <ul class="ehcp-objectives">
        ${objectives.map(o => `<li>${ehcpEscape(typeof o === 'string' ? o : o.text || '')}</li>`).join('')}
      </ul>` : ''}
    ${lesson.duration_seconds || lesson.duration
      ? `<p class="muted"><i class="fas fa-clock"></i> Estimated study time: ${ehcpEscape(ehcpFmtDur(lesson.duration_seconds || lesson.duration))}</p>`
      : ''}
  `;
}

function ehcpRenderNotesPanel(lesson) {
  const cache = EHCP.cache.notes[lesson.id];
  const initial = (cache && cache.content) || '';
  return `
    <div class="ehcp-notes">
      <textarea class="ehcp-notes-input" rows="8" placeholder="Write notes for this lesson…"
                aria-label="Lesson notes">${ehcpEscape(initial)}</textarea>
      <div class="ehcp-notes-status" data-ehcp-notes-status>Loaded</div>
    </div>
  `;
}

function ehcpRenderQuizPanel(lesson) {
  return `<p class="muted">Quiz: open the quiz module for this lesson.</p>`;
}

/* ===================== Video ===================== */

function ehcpInitVideo(lesson) {
  const wrap = ehcpFindInDom('[data-ehcp-video-wrap]');
  if (!wrap) return;
  const video = wrap.querySelector('video');
  if (!video) return;
  EHCP.st.video = video;

  const listeners = [];
  const on = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); listeners.push([el, ev, fn, opts]); };
  EHCP.st.videoListeners = listeners;

  // Restore last position
  const startAt = Number(lesson.last_position_seconds || 0);
  if (startAt > 0) {
    const onceMeta = () => {
      if (startAt < (video.duration || Infinity) - 2) {
        try { video.currentTime = startAt; } catch {}
      }
      video.removeEventListener('loadedmetadata', onceMeta);
    };
    video.addEventListener('loadedmetadata', onceMeta);
  }

  // Save playback position periodically + on pause/ended
  const savePos = () => ehcpSavePosition();
  let saveAcc = 0;
  on(video, 'timeupdate', () => {
    saveAcc++;
    if (saveAcc >= 5) { saveAcc = 0; savePos(); }
  });
  on(video, 'pause', savePos);
  on(video, 'ended', savePos);
  on(video, 'seeked', savePos);
  on(video, 'error', () => {
    const errEl = wrap.querySelector('.ehcp-video-error');
    if (errEl) errEl.hidden = false;
    video.style.display = 'none';
  });

  const retry = wrap.querySelector('[data-ehcp-video-retry]');
  if (retry) {
    retry.onclick = () => {
      const errEl = wrap.querySelector('.ehcp-video-error');
      if (errEl) errEl.hidden = true;
      video.style.display = '';
      try { video.load(); } catch {}
    };
  }
}

async function ehcpSavePosition() {
  const st = EHCP.st;
  if (!st.video || !st.lessonId) return;
  const pos = Math.floor(st.video.currentTime || 0);
  if (pos <= 0) return;
  try {
    await apiCall(`/api/eschool/lessons/${st.lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ position_seconds: pos, course_id: st.courseId }),
    });
  } catch (e) {
    // Silent — will retry on next pause
  }
}

function ehcpTeardownVideo() {
  const st = EHCP.st;
  st.videoListeners.forEach(([el, ev, fn, opts]) => {
    try { el.removeEventListener(ev, fn, opts); } catch {}
  });
  st.videoListeners = [];
  if (st.video) {
    try { st.video.pause(); } catch {}
    try { st.video.removeAttribute('src'); st.video.load(); } catch {}
    st.video = null;
  }
}

/* ===================== Tabs ===================== */

function ehcpSwitchTab(tab) {
  const st = EHCP.st;
  if (!tab || st.activeTab === tab) return;
  st.activeTab = tab;

  ehcpFindAllInDom('.ehcp-tab').forEach(el => {
    const on = el.dataset.ehcpTab === tab;
    el.classList.toggle('is-active', on);
    el.setAttribute('aria-selected', on ? 'true' : 'false');
    el.setAttribute('tabindex', on ? '0' : '-1');
  });
  ehcpFindAllInDom('.ehcp-tab-panel').forEach(el => {
    const on = el.id === `ehcp-panel-${tab}`;
    el.classList.toggle('is-active', on);
    if (on) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
  });

  // Lazy-load content
  const lesson = st.lesson;
  if (!lesson) return;
  if (tab === 'resources') ehcpLoadResources(lesson.id);
  if (tab === 'notes') ehcpLoadNotes(lesson.id);
  if (tab === 'discussion') ehcpLoadDiscussion(lesson.id);

  // Re-focus the tab
  const active = ehcpFindInDom(`.ehcp-tab[data-ehcp-tab="${tab}"]`);
  if (active) active.focus();
}

function ehcpPreloadTabContent(lessonId) {
  // Preload nothing eagerly — user opens tab → loads on demand
}

/* ===================== Notes ===================== */

async function ehcpLoadNotes(lessonId) {
  if (EHCP.cache.notes[lessonId]) return EHCP.cache.notes[lessonId];
  try {
    const r = await apiCall(`/api/eschool/lessons/${lessonId}/notes`);
    EHCP.cache.notes[lessonId] = (r && r.notes) || { content: '' };
  } catch (e) {
    EHCP.cache.notes[lessonId] = { content: '' };
  }
  // If the tab is currently open, refresh the textarea if not dirty
  if (EHCP.st.activeTab === 'notes' && !EHCP.st.notesDirty) {
    const ta = ehcpFindInDom('.ehcp-notes-input');
    if (ta) ta.value = EHCP.cache.notes[lessonId].content || '';
  }
  return EHCP.cache.notes[lessonId];
}

function ehcpScheduleNotesSave() {
  const st = EHCP.st;
  st.notesDirty = true;
  st.notesLessonId = st.lessonId;
  ehcpSetNotesStatus('Unsaved changes');
  if (st.notesSaveTimer) clearTimeout(st.notesSaveTimer);
  st.notesSaveTimer = setTimeout(ehcpSaveNotes, 1500);
}

async function ehcpSaveNotes() {
  const st = EHCP.st;
  const ta = ehcpFindInDom('.ehcp-notes-input');
  if (!ta || !st.notesLessonId) return;
  const content = ta.value;
  st.busy.notes = true;
  ehcpSetNotesStatus('Saving…');
  try {
    await apiCall(`/api/eschool/lessons/${st.notesLessonId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    EHCP.cache.notes[st.notesLessonId] = { content, updated_at: Date.now() };
    st.notesDirty = false;
    ehcpSetNotesStatus(`Saved · ${new Date().toLocaleTimeString()}`);
  } catch (e) {
    ehcpSetNotesStatus('Unable to save — retry');
  } finally {
    st.busy.notes = false;
  }
}

function ehcpSetNotesStatus(msg) {
  const el = ehcpFindInDom('[data-ehcp-notes-status]');
  if (el) el.textContent = msg;
}

/* ===================== Resources ===================== */

async function ehcpLoadResources(lessonId) {
  const panel = ehcpFindInDom('#ehcp-panel-resources');
  if (!panel) return;
  if (EHCP.cache.resources[lessonId]) {
    panel.innerHTML = ehcpRenderResources(EHCP.cache.resources[lessonId]);
    return;
  }
  try {
    const r = await apiCall(`/api/eschool/lessons/${lessonId}/resources`);
    const list = (r && (r.resources || r.items)) || [];
    EHCP.cache.resources[lessonId] = list;
    panel.innerHTML = ehcpRenderResources(list);
  } catch (e) {
    panel.innerHTML = `<div class="ehcp-error-inline">Resources couldn't be loaded. Please try again.</div>`;
  }
}

function ehcpRenderResources(list) {
  if (!list || !list.length) {
    return `<div class="ehcp-empty-state">
      <p>There are no downloadable resources for this lesson yet.</p>
    </div>`;
  }
  return `
    <ul class="ehcp-resource-list">
      ${list.map(r => {
        const type = (r.file_type || r.type || 'FILE').toUpperCase().slice(0, 5);
        const size = ehcpFmtBytes(r.size_bytes || r.size);
        const url = ehcpSafeUrl(r.url || r.download_url || '');
        return `
          <li class="ehcp-resource-card">
            <div class="ehcp-resource-type">${ehcpEscape(type)}</div>
            <div class="ehcp-resource-meta">
              <strong>${ehcpEscape(r.name || r.filename || 'Resource')}</strong>
              ${r.description ? `<p class="muted">${ehcpEscape(r.description)}</p>` : ''}
              ${size ? `<small class="muted">${ehcpEscape(size)}</small>` : ''}
            </div>
            ${url
              ? `<a class="btn btn-secondary btn-sm" href="${ehcpEscape(url)}" target="_blank" rel="noopener">
                   <i class="fas fa-download"></i> Open
                 </a>`
              : '<span class="muted">Unavailable</span>'}
          </li>`;
      }).join('')}
    </ul>`;
}

/* ===================== Discussion ===================== */

async function ehcpLoadDiscussion(lessonId) {
  const panel = ehcpFindInDom('#ehcp-panel-discussion');
  if (!panel) return;
  if (EHCP.cache.discussion[lessonId]) {
    panel.innerHTML = ehcpRenderDiscussion(EHCP.cache.discussion[lessonId]);
    return;
  }
  try {
    const r = await apiCall(`/api/eschool/lessons/${lessonId}/discussion`);
    const list = (r && r.posts) || [];
    EHCP.cache.discussion[lessonId] = list;
    panel.innerHTML = ehcpRenderDiscussion(list);
  } catch (e) {
    panel.innerHTML = `<div class="ehcp-error-inline">Discussion couldn't be loaded.</div>`;
  }
}

function ehcpRenderDiscussion(list) {
  if (!list || !list.length) {
    return `<div class="ehcp-empty-state">
      <p>No questions have been posted for this lesson yet.</p>
    </div>`;
  }
  return `
    <ul class="ehcp-discussion-list">
      ${list.map(p => `
        <li class="ehcp-discussion-item">
          <div class="ehcp-discussion-head">
            <strong>${ehcpEscape(p.author_name || 'Learner')}</strong>
            <small class="muted">${ehcpEscape(ehcpFmtTime(p.created_at))}</small>
          </div>
          <p>${ehcpEscape(p.body || p.content || '')}</p>
        </li>
      `).join('')}
    </ul>`;
}

/* ===================== Progress ===================== */

async function ehcpMarkComplete(lessonId) {
  const st = EHCP.st;
  if (st.busy.complete) return;
  const lesson = ehcpFindLesson(st.modules, lessonId);
  if (!lesson || lesson.completed) return;

  st.busy.complete = true;
  const btn = ehcpFindInDom('[data-ehcp-mark-complete]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }

  try {
    // Prefer existing global markLessonComplete (13c)
    let ok = false;
    if (typeof window.markLessonComplete === 'function') {
      const res = await window.markLessonComplete(lessonId, st.courseId);
      ok = res !== false;
    } else {
      await apiCall(`/api/eschool/lessons/${lessonId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ course_id: st.courseId }),
      });
      ok = true;
    }

    if (!ok) throw new Error('Completion rejected');

    // Update local state
    lesson.completed = true;
    const inCur = (S.courseCurriculum && S.courseCurriculum[st.courseId]);
    if (inCur && inCur.modules) {
      inCur.modules.forEach(m => (m.lessons || []).forEach(l => {
        if (String(l.id) === String(lessonId)) l.completed = true;
      }));
    }

    // Refresh UI
    ehcpRefreshSidebar();
    if (st.lesson && String(st.lesson.id) === String(lessonId)) {
      st.lesson.completed = true;
      if (btn) {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
        btn.classList.add('is-done');
        btn.disabled = true;
      }
    }

    if (typeof showToast === 'function') {
      showToast('Lesson completed. Your progress has been updated.', 'success');
    }
    ehcpUpdateNavState();

    // Auto-advance? (optional) — do not, respect user intent
  } catch (e) {
    console.error('[player] mark complete:', e);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Mark Complete';
    }
    if (typeof showToast === 'function') {
      showToast('Could not save progress. Please retry.', 'error');
    }
  } finally {
    st.busy.complete = false;
  }
}

/* ===================== Navigation ===================== */

function ehcpGoPrev() {
  const st = EHCP.st;
  const all = ehcpFlatLessons(st.modules);
  const idx = all.findIndex(l => String(l.id) === String(st.lessonId));
  if (idx > 0) {
    const prev = all[idx - 1];
    if (ehcpIsLocked(prev)) return;
    ehcpLoadLesson(prev.id);
  }
}

function ehcpGoNext() {
  const st = EHCP.st;
  const all = ehcpFlatLessons(st.modules);
  const idx = all.findIndex(l => String(l.id) === String(st.lessonId));
  if (idx >= 0 && idx < all.length - 1) {
    const next = all[idx + 1];
    if (ehcpIsLocked(next)) return;
    ehcpLoadLesson(next.id);
  }
}

function ehcpUpdateNavState() {
  const st = EHCP.st;
  const all = ehcpFlatLessons(st.modules);
  const idx = all.findIndex(l => String(l.id) === String(st.lessonId));
  const prevBtn = ehcpFindInDom('[data-ehcp-prev]');
  const nextBtn = ehcpFindInDom('[data-ehcp-next]');
  if (prevBtn) prevBtn.disabled = idx <= 0;
  if (nextBtn) nextBtn.disabled = idx < 0 || idx >= all.length - 1;
}

function ehcpRefreshSidebar() {
  const sb = ehcpFindInDom('#ehcp-sidebar');
  if (sb) sb.innerHTML = ehcpRenderSidebar();
  const asst = ehcpFindInDom('#ehcp-assist');
  if (asst) asst.innerHTML = ehcpRenderAssistance();
}

/* ===================== Event binding (delegated) ===================== */

function ehcpBindShell() {
  const modal = ehcpFindInDom('.course-player-modal');
  if (!modal) return;
  if (modal.__ehcpBound) return;
  modal.__ehcpBound = true;

  const handler = (ev) => {
    const t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;

    // Close
    if (t.closest('[data-ehcp-close]')) {
      ev.preventDefault();
      ehcpCleanup();
      if (typeof closeModal === 'function') closeModal();
      return;
    }

    // Toggle module
    const toggle = t.closest('[data-ehcp-toggle-module]');
    if (toggle) {
      ev.preventDefault();
      const id = toggle.getAttribute('data-ehcp-toggle-module');
      EHCP.st.moduleOpen[id] = EHCP.st.moduleOpen[id] === false;
      ehcpRefreshSidebar();
      return;
    }

    // Open lesson
    const lbtn = t.closest('[data-ehcp-lesson]');
    if (lbtn) {
      ev.preventDefault();
      const id = lbtn.getAttribute('data-ehcp-lesson');
      if (id != null) {
        EHCP.st.activeTab = 'overview';
        ehcpLoadLesson(id);
      }
      return;
    }
    const locked = t.closest('[data-ehcp-locked]');
    if (locked) {
      ev.preventDefault();
      if (typeof showToast === 'function') showToast('This lesson is locked.', 'info');
      return;
    }

    // Tab switch
    const tab = t.closest('[data-ehcp-tab]');
    if (tab) {
      ev.preventDefault();
      ehcpSwitchTab(tab.getAttribute('data-ehcp-tab'));
      return;
    }

    // Switch tab from assistance panel
    const switchTab = t.closest('[data-ehcp-switch-tab]');
    if (switchTab) {
      ev.preventDefault();
      ehcpSwitchTab(switchTab.getAttribute('data-ehcp-switch-tab'));
      return;
    }

    // Prev / Next / Save for later
    if (t.closest('[data-ehcp-prev]')) { ev.preventDefault(); ehcpGoPrev(); return; }
    if (t.closest('[data-ehcp-next]')) { ev.preventDefault(); ehcpGoNext(); return; }
    if (t.closest('[data-ehcp-save-later]')) {
      ev.preventDefault();
      ehcpSavePosition();
      if (typeof showToast === 'function') showToast('Playback position saved.', 'success');
      return;
    }

    // Mark complete
    if (t.closest('[data-ehcp-mark-complete]')) {
      ev.preventDefault();
      const lessonId = EHCP.st.lessonId;
      if (lessonId != null) ehcpMarkComplete(lessonId);
      return;
    }

    // Retry lesson
    if (t.closest('[data-ehcp-retry-lesson]')) {
      ev.preventDefault();
      if (EHCP.st.lessonId != null) ehcpLoadLesson(EHCP.st.lessonId);
      return;
    }

    // Mobile drawers
    const drawerBtn = t.closest('[data-ehcp-drawer]');
    if (drawerBtn) {
      ev.preventDefault();
      const which = drawerBtn.getAttribute('data-ehcp-drawer');
      ehcpToggleDrawer(which);
      return;
    }
    if (t.closest('[data-ehcp-drawer-close]')) {
      ev.preventDefault();
      ehcpToggleDrawer(null);
      return;
    }
  };

  modal.addEventListener('click', handler);
  EHCP.st.cleanupFns.push(() => modal.removeEventListener('click', handler));

  // Notes input (delegated for re-renders)
  const inputHandler = (ev) => {
    const t = ev.target;
    if (t && t.classList && t.classList.contains('ehcp-notes-input')) {
      ehcpScheduleNotesSave();
    }
  };
  modal.addEventListener('input', inputHandler);
  EHCP.st.cleanupFns.push(() => modal.removeEventListener('input', inputHandler));

  // Tab keyboard navigation
  const keyHandler = (ev) => {
    const t = ev.target;
    if (!t || !t.classList || !t.classList.contains('ehcp-tab')) return;
    const tabs = ehcpFindAllInDom('.ehcp-tab', modal);
    const idx = tabs.indexOf(t);
    if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      const next = tabs[(idx + 1) % tabs.length];
      next.focus(); ehcpSwitchTab(next.getAttribute('data-ehcp-tab'));
    } else if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
      prev.focus(); ehcpSwitchTab(prev.getAttribute('data-ehcp-tab'));
    }
  };
  modal.addEventListener('keydown', keyHandler);
  EHCP.st.cleanupFns.push(() => modal.removeEventListener('keydown', keyHandler));

  // Wrap closeModal for cleanup (best-effort)
  if (typeof window.closeModal === 'function' && !window.__ehcpWrappedClose) {
    const _orig = window.closeModal;
    window.closeModal = function (...a) {
      ehcpCleanup();
      return _orig.apply(this, a);
    };
    window.__ehcpWrappedClose = true;
  }
}

function ehcpFocusModal() {
  const modal = ehcpFindInDom('.course-player-modal');
  if (!modal) return;
  const first = modal.querySelector('[data-ehcp-tab], .ehcp-tab, button');
  if (first) first.focus();
}

function ehcpToggleDrawer(which) {
  const modal = ehcpFindInDom('.course-player-modal');
  if (!modal) return;
  const sb = modal.querySelector('#ehcp-sidebar');
  const as = modal.querySelector('#ehcp-assist');
  const bd = modal.querySelector('[data-ehcp-drawer-close]');

  if (!which) {
    if (sb) sb.classList.remove('is-open');
    if (as) as.classList.remove('is-open');
    if (bd) bd.hidden = true;
    return;
  }
  if (which === 'curriculum') {
    if (sb) sb.classList.toggle('is-open');
    if (as) as.classList.remove('is-open');
  } else if (which === 'assist') {
    if (as) as.classList.toggle('is-open');
    if (sb) sb.classList.remove('is-open');
  }
  if (bd) bd.hidden = !(sb.classList.contains('is-open') || as.classList.contains('is-open'));
}

/* ===================== Cleanup ===================== */

function ehcpCleanup() {
  const st = EHCP.st;
  if (!st.opened) return;
  st.opened = false;

  // Flush notes if dirty
  if (st.notesDirty) {
    try { ehcpSaveNotes(); } catch {}
  }
  if (st.notesSaveTimer) clearTimeout(st.notesSaveTimer);
  if (st.videoSaveTimer) clearTimeout(st.videoSaveTimer);

  // Save video position
  try { ehcpSavePosition(); } catch {}

  // Teardown video
  ehcpTeardownVideo();

  // Run stored cleanup functions
  st.cleanupFns.forEach(fn => { try { fn(); } catch {} });
  st.cleanupFns = [];

  // Restore focus
  if (st.lastFocus && st.lastFocus.focus) {
    try { st.lastFocus.focus(); } catch {}
  }

  // Reset state (except courseId which we keep briefly)
  st.lessonId = null;
  st.lesson = null;
  st.course = null;
  st.modules = [];
  st.activeTab = 'overview';
  st.busy = { lesson: false, complete: false, notes: false };
  st.notesDirty = false;
  st.notesLessonId = null;
  st.moduleOpen = Object.create(null);
  st.lastFocus = null;
  st.video = null;
}

/* ===================== Expose ===================== */
window.openCoursePlayer = openCoursePlayer;
window.ehcpCleanup = ehcpCleanup;