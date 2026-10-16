/* ============================================================
   ExpertHub 2.0 — js/expert/02-overview.js
   Expert dashboard overview (KPIs, next sessions, quick actions).
   ============================================================ */

function expertOverview() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const active = mine.filter(c => ['assigned','confirmed','in_progress','in_grace','in_session'].includes(c.status)).length;
  const pending = mine.filter(c => c.status === 'pending_expert_confirmation').length;
  const completed = mine.filter(c => c.status === 'completed').length;
  const st = S.expertStats || {};
  const earnings = S.earnings || {};
  const rating = Number(currentUser?.average_rating || 0);
  const myCourses = S.courses.filter(c => c.expert_id === currentUser?.id);
  const publishedCourses = myCourses.filter(c => c.status === 'published').length;

  const nextSession = mine
    .filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date())
    .filter(c => ['confirmed','scheduled','in_grace','in_session'].includes(c.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 3);

  const recentReviews = (S.reviews || []).slice(0, 3);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Welcome, ${esc(currentUser?.name || 'Expert')}</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="view-public-profile">
          <i class="fas fa-eye"></i> Preview Public Profile</button>
        <button class="btn btn-primary" data-action="switch-tab" data-tab="consultation-calendar">
          <i class="fas fa-calendar"></i> Open Calendar</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Consultations</p>
          <p class="stat-value">${st.total_consultations ?? mine.length}</p>
          <p class="stat-sub">${completed} completed</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Now</p>
          <p class="stat-value">${active}</p>
          ${pending > 0 ? `<p class="stat-sub" style="color:var(--warning-dark)">${pending} awaiting your confirmation</p>` : ''}
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Earnings</p>
          <p class="stat-value">${fmtCur(earnings.total_earned || 0)}</p>
          <p class="stat-sub">Available: ${fmtCur(earnings.available_balance || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Rating</p>
          <p class="stat-value">${rating.toFixed(1)}</p>
          <p class="stat-sub">${S.reviews.length} review${S.reviews.length === 1 ? '' : 's'}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Published Courses</p>
          <p class="stat-value">${publishedCourses}</p>
          <p class="stat-sub">${myCourses.length} total</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-book"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Portfolio Items</p>
          <p class="stat-value">${(S.expertPortfolio || []).length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-briefcase"></i></div>
      </div>
    </section>

    ${pending ? `
      <div class="alert alert-warning">
        <i class="fas fa-clock"></i>
        <div>
          You have <strong>${pending} booking request${pending === 1 ? '' : 's'}</strong> awaiting confirmation.
          Confirm within 2 hours or they auto-expire.
          <a href="#" data-action="switch-tab" data-tab="consultations" style="margin-left:6px">Review now</a>
        </div>
      </div>
    ` : ''}

    <section class="dashboard-columns">
      <div class="panel">
        <h3 class="panel-title">Next Consultations</h3>
        ${nextSession.length ? nextSession.map(c => `
          <div class="case-card">
            <header class="case-header">
              <h3 class="case-title">${esc(c.title || '')}</h3>
              <span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' ') || '')}</span>
            </header>
            <p class="case-client">Client: ${esc(c.client_name || 'Client')}</p>
            <p class="case-type">${c.scheduled_at ? fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC') : '—'} · ${c.duration_minutes || 30} min</p>
            <footer class="case-footer">
              <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}">
                <i class="fas fa-comments"></i> Open Chat</button>
              <button class="btn btn-info btn-sm" data-action="video-call" data-id="${c.id}">
                <i class="fas fa-video"></i> Video</button>
              <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
                <i class="fas fa-eye"></i> Details</button>
            </footer>
          </div>
        `).join('') : '<p class="empty-row">No upcoming consultations</p>'}
      </div>

      <div class="panel">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="manage-slots">
          <i class="fas fa-plus"></i> Manage Availability Slots</button>
        <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="tiers">
          <i class="fas fa-layer-group"></i> Pricing Tiers</button>
        <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="earnings">
          <i class="fas fa-money-bill"></i> Request Withdrawal</button>
        <button class="btn btn-secondary btn-block" data-action="switch-tab" data-tab="portfolio">
          <i class="fas fa-briefcase"></i> Manage Portfolio</button>
        <button class="btn btn-purple btn-block" data-action="create-course-modal">
          <i class="fas fa-plus"></i> Create New Course</button>
      </div>
    </section>

    ${recentReviews.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Reviews</h3>
        ${recentReviews.map(r => `
          <div class="review-card">
            <header class="review-header">
              <span class="review-author">${esc(r.author_name || 'Anonymous')}</span>
              <span class="star-rating">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
              <span class="review-date">${fmtDate(r.created_at)}</span>
            </header>
            <p class="review-body">${esc(r.comment || '')}</p>
          </div>
        `).join('')}
      </section>
    ` : ''}
  `;
}
