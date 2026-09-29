/* ============================================================
   ExpertHub 2.0 — 11-user.js
   Learner dashboard — every panel, E-School player, course detail.
   ============================================================ */

/* ============================================================
   USER / LEARNER DASHBOARD
   ============================================================ */
function renderUserDashboard() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const intent = S.userIntent || currentUser?.intent || 'both';
  const showLearn   = intent === 'learn'   || intent === 'both';
  const showConsult = intent === 'consult' || intent === 'both';

  const activeCons = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session'].includes(c.status)
  ).length;
  const unreadBadges = S.userBadges.length;

  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${showLearn ? sidebarItem('eschool','E-School','fa-school') : ''}
    ${showLearn ? sidebarItem('my-learning','My Learning','fa-graduation-cap') : ''}
    ${showLearn ? sidebarItem('learning-paths','Learning Paths','fa-route') : ''}
    ${showLearn ? sidebarItem('bundles','Bundles','fa-box-open') : ''}
    ${showLearn ? sidebarItem('wishlist','Wishlist','fa-heart') : ''}
    ${showLearn ? sidebarItem('certificates','Certificates','fa-certificate') : ''}
    ${showLearn ? sidebarItem('achievements','Achievements','fa-trophy', unreadBadges) : ''}
    ${showLearn ? sidebarItem('course-notes','My Notes','fa-sticky-note') : ''}
    ${sidebarItem('events','Events','fa-calendar-alt')}
    ${showConsult ? sidebarItem('experts','Find Experts','fa-search') : ''}
    ${sidebarItem('consultations','My Consultations','fa-comments', activeCons)}
    ${showConsult ? sidebarItem('packages','Session Packages','fa-ticket-alt') : ''}
    ${showConsult ? sidebarItem('shortlist','Shortlist','fa-bookmark') : ''}
    ${sidebarItem('wallet','Wallet','fa-wallet')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
    ${showLearn ? sidebarItem('refunds','Refund Requests','fa-rotate-left') : ''}
    ${sidebarItem('claims','Claims','fa-gavel')}
    ${sidebarItem('support','Support','fa-headset')}
    ${sidebarItem('profile','Profile','fa-user')}
  `;
  shell({
    roleClass: 'role-user',
    brandIcon: 'fa-user-circle',
    brandTitle: 'My Panel',
    brandSubtitle: 'ExpertHub',
    nav,
    roleLabel: 'User Panel',
    content: renderUserContent(),
  });
  attachRoleEvents();
}

function renderUserContent() {
  switch (activeTab) {
    case 'dashboard':       return userOverview();
    case 'eschool':         return userESchool();
    case 'my-learning':     return userMyLearning();
    case 'learning-paths':  return userLearningPaths();
    case 'bundles':         return userBundles();
    case 'wishlist':        return userWishlist();
    case 'certificates':    return userCertificates();
    case 'achievements':    return userAchievements();
    case 'course-notes':    return userCourseNotes();
    case 'events':          return userEvents();
    case 'experts':         return userFindExperts();
    case 'consultations':   return userConsultations();
    case 'packages':        return userPackages();
    case 'shortlist':       return userShortlist();
    case 'wallet':          return userWallet();
    case 'transactions':    return userTransactions();
    case 'refunds':         return userRefundRequests();
    case 'claims':          return userClaims();
    case 'support':         return userSupport();
    case 'profile':         return userProfile();
    default:                return userOverview();
  }
}

function userOverview() {
  const intent = S.userIntent || currentUser?.intent || 'both';
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const activeCons = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session'].includes(c.status)
  ).length;

  const inProgress = S.enrollments.filter(e => e.progress > 0 && e.progress < 100).slice(0, 3);
  const completedCount = S.enrollments.filter(e => Number(e.progress) >= 100).length;
  const totalProgress = S.enrollments.length
    ? Math.round(S.enrollments.reduce((s, e) => s + Number(e.progress || 0), 0) / S.enrollments.length)
    : 0;

  const xp = S.userXP || 0;
  const level = S.userLevel || levelFromXP(xp);
  const streak = S.userStreak?.current || 0;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Welcome, ${esc(currentUser?.name || 'User')}</h1>
      <div class="page-actions">
        <span class="chip chip-neutral">
          Mode: ${intent === 'both' ? 'Learning and Consulting' : intent === 'learn' ? 'Learning' : 'Consulting'}
        </span>
        <button class="btn btn-secondary btn-sm" data-action="change-intent">
          <i class="fas fa-sliders"></i> Change Mode</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Level</p>
          <p class="stat-value">${level}</p>
          <p class="stat-sub">${xp} XP total</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-medal"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Current Streak</p>
          <p class="stat-value">${streak}</p>
          <p class="stat-sub">Longest: ${S.userStreak?.longest || 0} days</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-fire"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Enrollments</p>
          <p class="stat-value">${S.enrollments.length}</p>
          <p class="stat-sub">${completedCount} completed</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-graduation-cap"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Consultations</p>
          <p class="stat-value">${activeCons}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Wallet Balance</p>
          <p class="stat-value">${fmtCur(S.wallet.balance || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-wallet"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Badges Earned</p>
          <p class="stat-value">${S.userBadges.length}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-award"></i></div>
      </div>
    </section>

    ${inProgress.length ? `
      <section class="panel">
        <h3 class="panel-title">Continue Learning</h3>
        ${inProgress.map(e => `
          <div class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
            <p class="enrollment-progress">${e.progress || 0}% complete</p>
            <button class="btn btn-primary btn-sm" data-action="resume-course" data-id="${e.id}">
              <i class="fas fa-play"></i> Resume</button>
          </div>
        `).join('')}
      </section>
    ` : ''}

    <section class="dashboard-columns">
      ${intent !== 'consult' ? `
        <article class="dashboard-card tile-card">
          <i class="fas fa-school tile-icon"></i>
          <h3 class="tile-title">E-School</h3>
          <p class="tile-desc">Bootcamps, courses, tuition and exam prep</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">Explore</button>
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-graduation-cap tile-icon"></i>
          <h3 class="tile-title">My Learning</h3>
          <p class="tile-desc">Continue where you left off</p>
          <button class="btn btn-info" data-action="switch-tab" data-tab="my-learning">Open</button>
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-trophy tile-icon"></i>
          <h3 class="tile-title">Achievements</h3>
          <p class="tile-desc">${S.userBadges.length} badge${S.userBadges.length === 1 ? '' : 's'} earned</p>
          <button class="btn btn-warning" data-action="switch-tab" data-tab="achievements">View</button>
        </article>
      ` : ''}
      ${intent !== 'learn' ? `
        <article class="dashboard-card tile-card">
          <i class="fas fa-user-tie tile-icon"></i>
          <h3 class="tile-title">Find Experts</h3>
          <p class="tile-desc">Book 1-on-1 consultations</p>
          <button class="btn btn-success" data-action="switch-tab" data-tab="experts">Browse</button>
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-comments tile-icon"></i>
          <h3 class="tile-title">Consultations</h3>
          <p class="tile-desc">${activeCons} active request${activeCons === 1 ? '' : 's'}</p>
          <button class="btn btn-purple" data-action="switch-tab" data-tab="consultations">Open</button>
        </article>
      ` : ''}
      <article class="dashboard-card tile-card">
        <i class="fas fa-certificate tile-icon"></i>
        <h3 class="tile-title">Certificates</h3>
        <p class="tile-desc">${S.certificates.length} earned</p>
        <button class="btn btn-info" data-action="switch-tab" data-tab="certificates">View</button>
      </article>
    </section>
  `;
}

/* ============================================================
   E-SCHOOL — COURSE CATALOG
   ============================================================ */
function userESchool() {
  const tabs = [
    { id:'courses',     label:'All Courses',      icon:'fa-th-large' },
    { id:'bootcamp',    label:'Bootcamps',        icon:'fa-fire' },
    { id:'short_course',label:'Short Courses',    icon:'fa-bolt' },
    { id:'tuition',     label:'Tuition',          icon:'fa-chalkboard-teacher' },
    { id:'exam_prep',   label:'Exam Prep',        icon:'fa-file-alt' },
    { id:'career',      label:'Career',           icon:'fa-briefcase' },
    { id:'certification',label:'Certifications',  icon:'fa-certificate' },
  ];
  const query = ($('#eschool-search')?.value || '').toLowerCase();
  const levelFilter = $('#eschool-level')?.value || '';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>E-School</span></div>
    <section class="page-header">
      <h1 class="page-title">E-School Learning Hub</h1>
      <div class="page-actions">
        <input type="search" id="eschool-search" class="form-input"
               placeholder="Search courses..." value="${esc(query)}" style="max-width:240px" />
        <select id="eschool-level" class="form-select" style="max-width:150px">
          <option value="">All levels</option>
          <option value="beginner" ${levelFilter === 'beginner' ? 'selected' : ''}>Beginner</option>
          <option value="intermediate" ${levelFilter === 'intermediate' ? 'selected' : ''}>Intermediate</option>
          <option value="advanced" ${levelFilter === 'advanced' ? 'selected' : ''}>Advanced</option>
        </select>
      </div>
    </section>

    <nav class="tab-bar">
      ${tabs.map(t => `
        <button class="tab-btn ${activeESchoolTab === t.id ? 'tab-btn-active' : ''}"
                data-eschool-tab="${t.id}">
          <i class="fas ${t.icon}"></i> ${t.label}</button>
      `).join('')}
    </nav>

    <section class="panel" id="eschool-panel">${renderESchoolPanel()}</section>
  `;
}

function renderESchoolPanel() {
  const filter = activeESchoolTab === 'courses' ? null : activeESchoolTab;
  const query = ($('#eschool-search')?.value || '').toLowerCase();
  const levelFilter = $('#eschool-level')?.value || '';

  let list = filter ? S.courses.filter(c => c.course_type === filter) : S.courses;
  if (query) list = list.filter(c =>
    (c.title || '').toLowerCase().includes(query) ||
    (c.description || '').toLowerCase().includes(query) ||
    (c.category || '').toLowerCase().includes(query)
  );
  if (levelFilter) list = list.filter(c => c.level === levelFilter);

  if (!list.length) {
    return `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No courses found</h3>
        <p>Try adjusting your filters or search term.</p>
      </div>`;
  }

  return `
    <div class="card-grid">
      ${list.map(c => {
        const enrolled = S.enrolledCourseIds.has(String(c.id));
        const inWishlist = S.wishlistIds.has(String(c.id));
        return `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <span class="chip chip-neutral">${esc(c.level || '')}</span>
            </div>
            <h4 class="program-title">${esc(c.title || '')}</h4>
            <p class="program-desc">${esc((c.description || '').slice(0, 120))}</p>
            ${c.expert_name ? `<p class="program-meta"><i class="fas fa-user-tie"></i> ${esc(c.expert_name)}</p>` : ''}
            <footer class="program-footer">
              <span class="program-price">${fmtCur(c.price || 0)}</span>
              <span class="program-meta">
                ${c.duration_weeks ? c.duration_weeks + 'w' : (c.duration_hours || 0) + 'h'} ·
                ${c.enrolled_count || 0} enrolled
              </span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              ${enrolled
                ? `<button class="btn btn-success btn-sm flex-1" data-action="open-course-player" data-id="${c.id}">
                    <i class="fas fa-play"></i> Continue</button>`
                : `<button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${c.id}">
                    <i class="fas fa-shopping-cart"></i> Enroll</button>`
              }
              <button class="btn btn-secondary btn-sm" data-action="view-course-detail" data-id="${c.id}">
                <i class="fas fa-eye"></i></button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
                <i class="fas fa-heart" style="color:${inWishlist ? 'var(--danger)' : 'inherit'}"></i>
              </button>
            </div>
          </article>
        `;
      }).join('')}
    </div>`;
}

/* ============================================================
   E-SCHOOL — COURSE DETAIL (public preview)
   ============================================================ */
async function openCourseDetailModal(courseId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    const course = d.course || {};
    const modules = d.modules || [];
    const enrolled = S.enrolledCourseIds.has(String(courseId));

    const totalLessons = modules.reduce((s, m) => s + (m.lessons || []).length, 0);
    const totalMinutes = modules.reduce((s, m) =>
      s + (m.lessons || []).reduce((ss, l) => ss + (l.duration_minutes || 0), 0), 0);

    openModal({
      title: course.title || 'Course',
      className: 'modal-lg',
      body: `
        <div class="course-detail-hero">
          <div>
            <span class="chip chip-blue">${esc(course.course_type || '')}</span>
            <span class="chip chip-neutral" style="margin-left:6px">${esc(course.level || '')}</span>
          </div>
          <p class="course-detail-desc">${esc(course.description || '')}</p>
          <div class="course-detail-stats">
            <div><strong>${totalLessons}</strong><span>Lessons</span></div>
            <div><strong>${Math.round(totalMinutes / 60)}h</strong><span>Video</span></div>
            <div><strong>${course.enrolled_count || 0}</strong><span>Enrolled</span></div>
            <div><strong>${Number(course.average_rating || 0).toFixed(1)}</strong><span>Rating</span></div>
          </div>
        </div>

        <h3 class="panel-title" style="margin-top:20px">Curriculum</h3>
        <div class="curriculum-list">
          ${modules.map(m => `
            <div class="curriculum-module">
              <div class="curriculum-module-header">
                <strong>${esc(m.title)}</strong>
                <span class="program-meta">${(m.lessons || []).length} lesson${(m.lessons || []).length === 1 ? '' : 's'}</span>
              </div>
              ${(m.lessons || []).map(l => `
                <div class="curriculum-lesson ${l.is_preview ? 'is-preview' : ''}">
                  <i class="fas ${lessonIcon(l.lesson_type)}"></i>
                  <span class="curriculum-lesson-title">${esc(l.title)}</span>
                  <span class="curriculum-lesson-meta">${l.duration_minutes || 0} min</span>
                  ${l.is_preview
                    ? `<span class="chip chip-green">Preview</span>`
                    : `<i class="fas fa-lock curriculum-lock"></i>`}
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${!enrolled ? `
          <button class="btn btn-secondary" data-action="start-free-trial" data-id="${courseId}">
            <i class="fas fa-hourglass-half"></i> Free Trial</button>
          <button class="btn btn-primary" data-action="enroll-modal" data-id="${courseId}"
                  onclick="closeModal()">
            <i class="fas fa-shopping-cart"></i> Enroll for ${fmtCur(course.price || 0)}</button>
        ` : `
          <button class="btn btn-success" data-action="open-course-player" data-id="${courseId}"
                  onclick="closeModal()">
            <i class="fas fa-play"></i> Continue Learning</button>
        `}
      `,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

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

/* ============================================================
   E-SCHOOL — MY LEARNING
   ============================================================ */
function userMyLearning() {
  const enrollments = S.enrollments || [];
  const inProgress = enrollments.filter(e => Number(e.progress || 0) > 0 && Number(e.progress || 0) < 100);
  const notStarted = enrollments.filter(e => Number(e.progress || 0) === 0);
  const completed = enrollments.filter(e => Number(e.progress || 0) >= 100);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Learning</span></div>
    <section class="page-header">
      <h1 class="page-title">My Learning</h1>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">In Progress</p><p class="stat-value">${inProgress.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-play-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Not Started</p><p class="stat-value">${notStarted.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-hourglass-start"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${completed.length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Certificates</p><p class="stat-value">${S.certificates.length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-award"></i></div>
      </div>
    </section>

    ${inProgress.length ? `
      <section class="panel">
        <h3 class="panel-title">In Progress</h3>
        ${inProgress.map(e => `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
            <p class="enrollment-progress">${e.progress || 0}% complete</p>
            <div class="panel-actions" style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" data-action="open-course-player" data-id="${e.course_id}">
                <i class="fas fa-play"></i> Resume</button>
              <button class="btn btn-secondary btn-sm" data-action="request-refund" data-id="${e.id}">
                <i class="fas fa-rotate-left"></i> Request Refund</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${notStarted.length ? `
      <section class="panel">
        <h3 class="panel-title">Not Started</h3>
        ${notStarted.map(e => `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <button class="btn btn-success btn-sm" data-action="open-course-player" data-id="${e.course_id}">
              <i class="fas fa-play"></i> Start Learning</button>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${completed.length ? `
      <section class="panel">
        <h3 class="panel-title">Completed</h3>
        ${completed.map(e => `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:100%;background:var(--accent)"></span></div>
            <p class="enrollment-progress">Completed ${e.completed_at ? 'on ' + fmtDate(e.completed_at) : ''}</p>
            <div class="panel-actions" style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-sm" data-action="review-course" data-id="${e.course_id}">
                <i class="fas fa-star"></i> Review Course</button>
              <button class="btn btn-info btn-sm" data-action="view-certificate" data-course="${e.course_id}">
                <i class="fas fa-certificate"></i> Certificate</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${!enrollments.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-graduation-cap"></i>
          <h3>No enrollments yet</h3>
          <p>Explore the E-School to start learning.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">
            <i class="fas fa-search"></i> Explore Courses</button>
        </div>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   E-SCHOOL — LEARNING PATHS
   ============================================================ */
function userLearningPaths() {
  const paths = S.coursePaths || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Learning Paths</span></div>
    <section class="page-header">
      <h1 class="page-title">Learning Paths</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-route"></i>
      <div>
        Structured curricula that guide you through multiple courses in sequence.
        Complete prerequisites to unlock advanced content.
      </div>
    </div>

    ${paths.length ? `
      <section class="card-grid">
        ${paths.map(lp => `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span class="chip chip-blue">${lp.step_count || 0} courses</span>
              <span class="${statusClass(lp.status || 'not_started')}">${esc(lp.status || '')}</span>
            </div>
            <h4 class="program-title">${esc(lp.title)}</h4>
            <p class="program-desc">${esc((lp.description || '').slice(0, 140))}</p>
            <div class="progress-bar" style="margin-top:8px">
              <span style="width:${lp.progress || 0}%"></span>
            </div>
            <p class="program-meta">${lp.progress || 0}% complete</p>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="open-path-detail" data-id="${lp.id}">
                <i class="fas fa-route"></i> Open Path</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-route"></i>
          <h3>No learning paths available</h3>
          <p>Check back soon for curated paths.</p>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   E-SCHOOL — BUNDLES
   ============================================================ */
function userBundles() {
  const bundles = S.courseBundles || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Bundles</span></div>
    <section class="page-header">
      <h1 class="page-title">Course Bundles</h1>
    </section>

    ${bundles.length ? `
      <section class="card-grid">
        ${bundles.map(b => `
          <article class="program-card">
            ${b.discount_pct ? `<span class="chip chip-green">Save ${b.discount_pct}%</span>` : ''}
            <h4 class="program-title">${esc(b.title)}</h4>
            <p class="program-desc">${esc((b.description || '').slice(0, 120))}</p>
            <div class="pricing-price" style="margin:8px 0">
              ${fmtCur(b.price)}
              ${b.original_price ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:.9rem;margin-left:6px">${fmtCur(b.original_price)}</span>` : ''}
            </div>
            <p class="program-meta">${b.course_count || 0} courses included</p>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="purchase-bundle" data-id="${b.id}">
                <i class="fas fa-shopping-cart"></i> Buy Bundle</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-box-open"></i>
          <h3>No bundles available</h3>
          <p>Curated bundles save you money. Check back soon.</p>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   E-SCHOOL — WISHLIST
   ============================================================ */
function userWishlist() {
  const wishlist = S.wishlist || [];
  const items = wishlist
    .map(w => S.courses.find(c => String(c.id) === String(w.course_id)))
    .filter(Boolean);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wishlist</span></div>
    <section class="page-header"><h1 class="page-title">My Wishlist</h1></section>

    <section class="card-grid">
      ${items.map(c => `
        <article class="program-card">
          <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
          <h4 class="program-title">${esc(c.title || '')}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price || 0)}</span>
            <span class="program-meta">${esc(c.level || '')}</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${c.id}">
              <i class="fas fa-shopping-cart"></i> Enroll</button>
            <button class="btn btn-danger btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
              <i class="fas fa-heart"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-heart"></i>
          <h3>Your wishlist is empty</h3>
          <p>Save courses you want to take later.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">
            <i class="fas fa-search"></i> Browse Courses</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   E-SCHOOL — CERTIFICATES
   ============================================================ */
function userCertificates() {
  const certs = S.certificates || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Certificates</span></div>
    <section class="page-header">
      <h1 class="page-title">My Certificates</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-certificates">
          <i class="fas fa-download"></i> Export List</button>
      </div>
    </section>

    ${certs.length ? `
      <section class="card-grid">
        ${certs.map(c => `
          <article class="program-card certificate-card">
            <div class="certificate-badge">
              <i class="fas fa-certificate"></i>
            </div>
            <h4 class="program-title">${esc(c.course_title || '')}</h4>
            <p class="program-desc">
              Serial: <code class="code">${esc(c.serial || '')}</code>
            </p>
            <div class="certificate-meta">
              <div>
                <span class="form-label">Issued</span>
                <strong>${fmtDate(c.issued_at)}</strong>
              </div>
              ${c.final_score ? `
                <div>
                  <span class="form-label">Final Score</span>
                  <strong>${c.final_score}%</strong>
                </div>
              ` : ''}
              ${c.grade ? `
                <div>
                  <span class="form-label">Grade</span>
                  <strong>${esc(c.grade)}</strong>
                </div>
              ` : ''}
            </div>
            ${c.blockchain_hash ? `
              <div class="certificate-blockchain">
                <i class="fas fa-cube"></i>
                <span class="chip chip-green">Blockchain Verified</span>
                <code class="code" style="font-size:.65rem;margin-top:4px">
                  ${truncateHash(c.blockchain_hash, 8)}
                </code>
              </div>
            ` : ''}
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" data-action="print-certificate" data-id="${c.id}">
                <i class="fas fa-print"></i> Print</button>
              <a class="btn btn-info btn-sm" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener">
                <i class="fas fa-external-link-alt"></i> Verify</a>
              ${c.linkedin_share_url ? `
                <a class="btn btn-primary btn-sm" href="${esc(c.linkedin_share_url)}" target="_blank" rel="noopener">
                  <i class="fab fa-linkedin"></i> Share</a>
              ` : ''}
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-certificate"></i>
          <h3>No certificates yet</h3>
          <p>Complete a course to earn your first certificate.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="my-learning">
            <i class="fas fa-graduation-cap"></i> View My Learning</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   E-SCHOOL — ACHIEVEMENTS
   ============================================================ */
function userAchievements() {
  const xp = S.userXP || 0;
  const level = S.userLevel || levelFromXP(xp);
  const streak = S.userStreak || { current: 0, longest: 0 };
  const badges = S.userBadges || [];
  const allBadges = Object.entries(CONFIG.BADGES).map(([code, b]) => ({ code, ...b }));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Achievements</span></div>
    <section class="page-header"><h1 class="page-title">Achievements</h1></section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Current Level</p>
          <p class="stat-value">${level}</p>
          <p class="stat-sub">${xp} XP total</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-medal"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Current Streak</p>
          <p class="stat-value">${streak.current} days</p>
          <p class="stat-sub">Best: ${streak.longest} days</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-fire"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Badges Earned</p>
          <p class="stat-value">${badges.length}</p>
          <p class="stat-sub">of ${allBadges.length} available</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-trophy"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Courses Completed</p>
          <p class="stat-value">${S.enrollments.filter(e => e.progress >= 100).length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Level Progress</h3>
      <div class="level-progress-wrap">
        <div class="level-badge">
          <i class="fas fa-medal"></i>
          <span>Level ${level}</span>
        </div>
        <div class="progress-bar">
          <span style="width:${xpProgressPercent(xp)}%"></span>
        </div>
        <p class="form-hint">
          ${xp} / ${xpForLevel(level + 1)} XP to next level
        </p>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Badges</h3>
      <div class="badge-grid">
        ${allBadges.map(b => {
          const earned = badges.some(x => x.badge_code === b.code);
          return `
            <div class="badge-card ${earned ? 'badge-earned' : 'badge-locked'}">
              <i class="fas ${b.icon}"></i>
              <span class="badge-name">${b.name}</span>
              ${earned
                ? '<span class="badge-label">Earned</span>'
                : '<span class="badge-label">Locked</span>'}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

/* ============================================================
   E-SCHOOL — COURSE NOTES (global)
   ============================================================ */
function userCourseNotes() {
  const notes = S.lessonNotes || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Notes</span></div>
    <section class="page-header">
      <h1 class="page-title">My Course Notes</h1>
    </section>

    ${notes.length ? `
      <section class="panel">
        <ul class="notes-list">
          ${notes.map(n => `
            <li class="note-item">
              <div class="note-header">
                <strong>${esc(n.lesson_title || 'Lesson')}</strong>
                <span class="note-time">${timeAgo(n.created_at)}</span>
              </div>
              <p class="note-content">${esc(n.content)}</p>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-sticky-note"></i>
          <h3>No notes yet</h3>
          <p>Take notes while learning and they'll appear here.</p>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   E-SCHOOL — REFUND REQUESTS
   ============================================================ */
function userRefundRequests() {
  const refunds = S.userRefunds || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Refund Requests</span></div>
    <section class="page-header">
      <h1 class="page-title">Refund Requests</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Courses can be refunded within ${CONFIG.COURSE_REFUND_WINDOW_DAYS} days of purchase
        if you have completed less than 30% of the content.
      </div>
    </div>

    ${refunds.length ? `
      <section class="panel">
        <ul class="list-stack">
          ${refunds.map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.course_title)}</span>
                <span class="list-row-sub">Requested ${timeAgo(r.requested_at)} · ${esc(r.reason || 'No reason given')}</span>
              </div>
              <span class="${statusClass(r.status)}">${esc(r.status)}</span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-rotate-left"></i>
          <h3>No refund requests</h3>
          <p>Refund requests you make will appear here.</p>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   USER — EVENTS
   ============================================================ */
function userEvents() {
  const registered = new Set((S.eventRegistrations || []).map(r => String(r.event_id)));
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
    <section class="page-header"><h1 class="page-title">Events</h1></section>
    <section class="panel">
      ${S.events.map(ev => {
        const isRegistered = registered.has(String(ev.id));
        return `
          <article class="event-card">
            <div class="event-date">
              <span class="event-day">${new Date(ev.date || ev.created_at).getDate()}</span>
              <span class="event-month">${new Date(ev.date || ev.created_at).toLocaleString('en-US', { month: 'short' })}</span>
            </div>
            <div class="event-body">
              <h4 class="event-title">${esc(ev.title || '')}</h4>
              <p class="event-desc">${esc(ev.description || '')}</p>
              <p class="event-meta">
                ${ev.registered_count || 0} of ${ev.capacity || 0} registered ·
                ${ev.price > 0 ? fmtCur(ev.price) : 'Free'}
              </p>
            </div>
            <div class="event-actions">
              <button class="btn ${isRegistered ? 'btn-secondary' : 'btn-primary'} btn-sm"
                      data-action="register-event" data-id="${ev.id}"
                      ${isRegistered ? 'disabled' : ''}>
                ${isRegistered ? '<i class="fas fa-check"></i> Registered' : '<i class="fas fa-plus"></i> Register'}
              </button>
            </div>
          </article>
        `;
      }).join('') || '<p class="empty-row">No events available</p>'}
    </section>
  `;
}

/* ============================================================
   USER — FIND EXPERTS
   ============================================================ */
function userFindExperts() {
  const query = ($('#expert-search')?.value || '').toLowerCase();
  const budget = Number($('#expert-budget')?.value || 0);
  const instantOnly = $('#expert-instant')?.checked || false;

  let filtered = query
    ? S.experts.filter(e =>
        (e.name || '').toLowerCase().includes(query) ||
        (e.specialization || '').toLowerCase().includes(query)
      )
    : S.experts.slice();
  if (budget) filtered = filtered.filter(e => Number(e.hourly_rate || 0) <= budget);
  if (instantOnly) filtered = filtered.filter(e => e.instant_available);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header">
      <h1 class="page-title">Find Experts</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="find-expert-wizard">
          <i class="fas fa-magic"></i> Match Me</button>
        <button class="btn btn-primary" data-action="instant-consultation">
          <i class="fas fa-bolt"></i> Talk Now</button>
      </div>
    </section>

    <section class="panel">
      <div class="page-actions" style="margin-bottom:14px">
        <input type="search" id="expert-search" class="form-input"
               placeholder="Search by name or specialization"
               value="${esc(query)}" style="max-width:260px" />
        <input type="number" id="expert-budget" class="form-input"
               placeholder="Max $/hour" value="${budget || ''}" style="max-width:120px" />
        <label class="checkbox-row">
          <input type="checkbox" id="expert-instant" ${instantOnly ? 'checked' : ''} />
          Online now
        </label>
      </div>

      <section class="card-grid">
        ${filtered.map(e => `
          <article class="expert-card">
            <div style="position:relative">
              <img class="expert-avatar" src="${avatar(e)}" alt="" />
              ${e.is_online ? '<span class="expert-online-dot"></span>' : ''}
            </div>
            <h4 class="expert-name">
              ${esc(e.name || '')}
              ${e.verified_badge ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
            </h4>
            <p class="expert-expertise">${esc(e.specialization || '—')}</p>
            <p class="expert-rate">${fmtCur(e.hourly_rate || 0)} / hr</p>
            <p class="expert-rating">
              <i class="fas fa-star" style="color:#f59e0b"></i>
              <span class="expert-rating-value">${Number(e.average_rating || 0).toFixed(1)}</span>
              ${e.response_time_minutes ? `<span class="expert-response">· ~${e.response_time_minutes}m response</span>` : ''}
            </p>
            <div class="expert-card-actions">
              <button class="btn btn-primary btn-sm flex-1" data-action="book-slot-with"
                      data-id="${e.id}" data-name="${esc(e.name || '')}">
                <i class="fas fa-calendar-plus"></i> Book</button>
              <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${e.id}">
                <i class="fas fa-eye"></i></button>
            </div>
          </article>
        `).join('') || `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-search"></i>
            <h3>No experts found</h3>
            <p>Try adjusting your filters.</p>
          </div>
        `}
      </section>
    </section>
  `;
}

/* ============================================================
   USER — CONSULTATIONS
   ============================================================ */
function userConsultations() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const upcoming = mine.filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date() && !['cancelled','expired','no_show'].includes(c.status));
  const pending = mine.filter(c => ['pending_payment','pending_expert_confirmation'].includes(c.status));
  const past = mine.filter(c => ['completed','cancelled','no_show','expired'].includes(c.status));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">My Consultations</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="instant-consultation">
          <i class="fas fa-bolt"></i> Talk Now</button>
        <button class="btn btn-primary" data-action="find-expert-wizard">
          <i class="fas fa-plus"></i> Book Session</button>
      </div>
    </section>

    ${S.userPackages.length ? `
      <div class="alert alert-info">
        <i class="fas fa-ticket-alt"></i>
        <div>
          You have <strong>${S.userPackages.reduce((s, p) => s + p.sessions_remaining, 0)} session credits</strong>
          across ${S.userPackages.length} package${S.userPackages.length === 1 ? '' : 's'}.
        </div>
      </div>
    ` : ''}

    ${upcoming.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Sessions</h3>
        ${upcoming.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${pending.length ? `
      <section class="panel">
        <h3 class="panel-title">Awaiting Confirmation</h3>
        ${pending.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${past.length ? `
      <section class="panel">
        <h3 class="panel-title">Past Sessions</h3>
        ${past.slice(0, 20).map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${!mine.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No consultations yet</h3>
          <p>Book your first expert session, or get matched with the perfect expert.</p>
          <button class="btn btn-primary" data-action="find-expert-wizard">
            <i class="fas fa-magic"></i> Find Me an Expert</button>
        </div>
      </section>
    ` : ''}
  `;
}

function renderUserConsultationCard(c) {
  const tz = currentUser?.timezone || 'UTC';
  const canCancel = ['pending_expert_confirmation','confirmed','scheduled'].includes(c.status);
  const canReschedule = ['confirmed','scheduled'].includes(c.status) && (c.reschedule_count || 0) < CONFIG.MAX_RESCHEDULES;
  const canJoin = ['confirmed','in_grace','in_session'].includes(c.status);
  const canReview = c.status === 'completed' && !c.reviewed;
  const canDispute = ['completed','awaiting_completion'].includes(c.status) && !c.disputed;
  const canTip = c.status === 'completed';

  return `
    <div class="consultation-card">
      <header class="consultation-card-header">
        <div>
          <h4 class="consultation-card-title">${esc(c.title)}</h4>
          <p class="consultation-card-meta">
            <span class="${consultationStatusClass(c.status)}">${esc(c.status.replace(/_/g, ' '))}</span>
            ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
            ${c.is_group ? '<span class="chip chip-purple">Group</span>' : ''}
          </p>
        </div>
        <div class="consultation-card-price">
          ${fmtCur(c.price || 0)}
          ${c.payment_status === 'held' ? '<div class="consultation-card-escrow">In escrow</div>' : ''}
        </div>
      </header>

      <div class="consultation-card-body">
        <div class="consultation-card-expert">
          <img class="user-avatar" src="${avatar({ name: c.expert_name, email: c.expert_email })}" alt="" />
          <div>
            <div class="user-name">${esc(c.expert_name || 'Expert')}</div>
            <div class="user-email">${esc(c.expert_specialization || '')}</div>
          </div>
        </div>

        ${c.scheduled_at ? `
          <div class="consultation-card-time">
            <i class="fas fa-calendar"></i>
            <strong>${fmtInTz(c.scheduled_at, tz)}</strong>
            <span class="consultation-card-countdown">${timeUntil(c.scheduled_at)}</span>
          </div>
        ` : ''}

        <div class="consultation-card-duration">
          <i class="fas fa-clock"></i> ${c.duration_minutes || 30} minutes · ${esc(c.consultation_type || 'video')}
        </div>

        ${c.description ? `<p class="consultation-card-desc">${esc(c.description.slice(0, 200))}</p>` : ''}

        ${c.payment_status === 'held' ? `
          <div class="consultation-card-escrow-info">
            <i class="fas fa-shield-alt"></i>
            Payment held in escrow. Released after session completion.
          </div>
        ` : ''}
      </div>

      <footer class="consultation-card-actions">
        ${canJoin ? `
          <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}">
            <i class="fas fa-video"></i> Join</button>
        ` : ''}
        <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
          <i class="fas fa-comments"></i> Chat</button>
        ${canReschedule ? `
          <button class="btn btn-secondary btn-sm" data-action="reschedule-consultation" data-id="${c.id}">
            <i class="fas fa-calendar-alt"></i> Reschedule</button>
        ` : ''}
        ${canCancel ? `
          <button class="btn btn-danger btn-sm" data-action="cancel-consultation" data-id="${c.id}">
            <i class="fas fa-times"></i> Cancel</button>
        ` : ''}
        ${canReview ? `
          <button class="btn btn-success btn-sm" data-action="review-consultation"
                  data-id="${c.id}" data-expert="${c.expert_id}">
            <i class="fas fa-star"></i> Rate Session</button>
        ` : ''}
        ${canDispute ? `
          <button class="btn btn-warning btn-sm" data-action="open-dispute" data-id="${c.id}">
            <i class="fas fa-gavel"></i> File Dispute</button>
        ` : ''}
        ${canTip ? `
          <button class="btn btn-primary btn-sm" data-action="tip-expert" data-id="${c.id}">
            <i class="fas fa-hand-holding-usd"></i> Tip</button>
          <button class="btn btn-secondary btn-sm" data-action="book-followup" data-expert="${c.expert_id}">
            <i class="fas fa-redo"></i> Book Again</button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
          <i class="fas fa-eye"></i> Details</button>
      </footer>
    </div>
  `;
}

/* ============================================================
   USER — SESSION PACKAGES
   ============================================================ */
function userPackages() {
  const packages = S.userPackages || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Session Packages</span></div>
    <section class="page-header">
      <h1 class="page-title">Session Packages</h1>
    </section>

    ${packages.length ? `
      <section class="card-grid">
        ${packages.map(p => `
          <article class="program-card">
            <span class="chip chip-blue">${p.sessions_remaining} of ${p.sessions_total || p.sessions_remaining} left</span>
            <h4 class="program-title">${esc(p.package_name)}</h4>
            <p class="program-desc">with ${esc(p.expert_name)}</p>
            <footer class="program-footer">
              <span class="program-meta">Expires: ${fmtDate(p.expires_at)}</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="use-package-credit"
                      data-expert="${p.package_id}">
                <i class="fas fa-calendar-plus"></i> Book Next Session</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-ticket-alt"></i>
          <h3>No packages purchased</h3>
          <p>Packages save you money on multi-session bookings. Browse experts to find packages.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Browse Experts</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   USER — SHORTLIST
   ============================================================ */
function userShortlist() {
  const shortlist = S.userShortlist || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Shortlist</span></div>
    <section class="page-header">
      <h1 class="page-title">Saved Experts</h1>
    </section>

    ${shortlist.length ? `
      <section class="card-grid">
        ${shortlist.map(e => `
          <article class="expert-card">
            <img class="expert-avatar" src="${avatar(e)}" alt="" />
            <h4 class="expert-name">${esc(e.name)}</h4>
            <p class="expert-expertise">${esc(e.specialization || '')}</p>
            <p class="expert-rate">${fmtCur(e.hourly_rate)}/hr</p>
            <div class="expert-card-actions">
              <button class="btn btn-primary btn-sm flex-1" data-action="book-slot-with"
                      data-id="${e.expert_id}" data-name="${esc(e.name)}">
                <i class="fas fa-calendar-plus"></i> Book</button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-shortlist" data-id="${e.expert_id}">
                <i class="fas fa-bookmark"></i></button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-bookmark"></i>
          <h3>Your shortlist is empty</h3>
          <p>Save experts you want to work with later.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Browse Experts</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   USER — WALLET
   ============================================================ */
function userWallet() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wallet</span></div>
    <section class="page-header"><h1 class="page-title">My Wallet</h1></section>

    <div class="wallet-balance">
      <p class="wallet-balance-label">Available Balance</p>
      <p class="wallet-balance-value">${fmtCur(S.wallet.balance || 0)}</p>
    </div>

    <section class="panel">
      <h3 class="panel-title">Add Funds</h3>
      <div class="form-inline">
        <input id="topupAmount" type="number" class="form-input" placeholder="Amount ($)" />
        <select id="topupProvider" class="form-select">
          ${CONFIG.PAYMENT_PROVIDERS.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
        <button class="btn btn-primary" data-action="topup-wallet">
          <i class="fas fa-plus"></i> Add Funds</button>
      </div>
      <p class="panel-hint" style="margin-top:10px">
        Demo mode: top-ups are instantly credited.
      </p>
    </section>

    <section class="panel">
      <h3 class="panel-title">Ledger</h3>
      <ul class="list-stack">
        ${(S.wallet.ledger || []).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.reason || '')}</span>
              <span class="list-row-sub">${fmtDT(l.created_at)}</span>
            </div>
            <span class="list-row-price" style="color:${l.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
              ${l.amount >= 0 ? '+' : ''}${fmtCur(l.amount)}
            </span>
          </li>
        `).join('') || '<li class="empty-row">No activity yet</li>'}
      </ul>
    </section>
  `;
}

/* ============================================================
   USER — TRANSACTIONS
   ============================================================ */
function userTransactions() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
    <section class="page-header"><h1 class="page-title">Transactions</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Reference</th><th>Description</th><th>Amount</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${S.transactions.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.description || '')}</td>
                <td>${fmtCur(t.amount || 0)}</td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td>${fmtDT(t.created_at)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty-row">No transactions yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   USER — CLAIMS
   ============================================================ */
function userClaims() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Claims</span></div>
    <section class="page-header"><h1 class="page-title">My Claims</h1></section>
    <section class="panel">
      ${S.claims.length ? S.claims.map(c => `
        <article class="claim-card">
          <header class="claim-header">
            <span class="claim-title">${esc(c.claim_title || '')}</span>
            <span class="${statusClass(c.status)}">${esc(c.status || '')}</span>
          </header>
          <p class="claim-desc">${esc(c.claim_description || '')}</p>
          ${c.claim_amount ? `<p class="claim-amount">Amount: ${fmtCur(c.claim_amount)}</p>` : ''}
          ${c.resolution ? `
            <div class="alert alert-info" style="margin-top:10px">
              <strong>Resolution:</strong> ${esc(c.resolution)}
            </div>
          ` : ''}
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-gavel"></i>
          <h3>No claims filed</h3>
          <p>If you have an issue with a consultation, you can file a claim.</p>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   USER — SUPPORT
   ============================================================ */
function userSupport() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
    <section class="page-header">
      <h1 class="page-title">Support</h1>
      <button class="btn btn-primary" data-action="new-ticket">
        <i class="fas fa-plus"></i> New Ticket</button>
    </section>

    <section class="panel">
      ${S.tickets.length ? S.tickets.map(t => `
        <article class="ticket-card">
          <header class="ticket-header">
            <span class="ticket-ref"><code class="code">${esc(t.reference || t.id)}</code></span>
            <span class="${statusClass(t.status)}">${esc(t.status || '')}</span>
          </header>
          <h4 class="ticket-subject">${esc(t.subject || '')}</h4>
          <p class="ticket-desc">${esc(t.description || '')}</p>
          <footer class="ticket-actions">
            <button class="btn btn-secondary btn-sm" data-action="ticket-view" data-id="${t.id}">
              <i class="fas fa-eye"></i> View and Reply</button>
          </footer>
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-headset"></i>
          <h3>No support tickets</h3>
          <p>Need help? Create a ticket and our team will respond.</p>
          <button class="btn btn-primary" data-action="new-ticket">
            <i class="fas fa-plus"></i> Create Ticket</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   USER — PROFILE
   ============================================================ */
function userProfile() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">My Profile</h1></section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
          <p style="margin-top:6px">
            <span class="chip chip-neutral">Level ${S.userLevel || 1}</span>
            <span class="chip chip-blue" style="margin-left:6px">
              ${S.userXP || 0} XP</span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span>
          <input id="profileName" class="form-input" value="${esc(currentUser?.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Phone</span>
          <input id="profilePhone" class="form-input" value="${esc(currentUser?.phone || '')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span>
          <input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone || 'UTC')}" /></label>
        <label class="form-group">
          <span class="form-label">Preferred mode</span>
          <select id="profileIntent" class="form-select">
            <option value="both"    ${S.userIntent === 'both' ? 'selected' : ''}>Both - Learning and Consulting</option>
            <option value="learn"   ${S.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
            <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
          </select>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" />
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-user-profile">
          <i class="fas fa-save"></i> Save Changes</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span>
          <input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span>
          <input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-warning" data-action="change-password">
          <i class="fas fa-lock"></i> Update Password</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Privacy & Data</h3>
      <div class="panel-actions">
        <button class="btn btn-secondary" data-action="gdpr-export">
          <i class="fas fa-download"></i> Export My Data (GDPR)</button>
        <button class="btn btn-danger" data-action="gdpr-delete">
          <i class="fas fa-trash"></i> Delete Account</button>
      </div>
    </section>
  `;
}
