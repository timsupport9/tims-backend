/* ============================================================
   ExpertHub 2.0 — 11-user-learning.js
   My Learning, Learning Paths, Bundles, Wishlist,
   Certificates, Achievements, Notes, Refunds.
   ============================================================ */

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