/* ============================================================
   dashboards/expert/overview.js
   ============================================================ */

function renderExpertOverview() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const active   = mine.filter(c => ['assigned','confirmed','in_progress','in_grace','in_session'].includes(c.status)).length;
  const pending  = mine.filter(c => ['pending_expert_confirmation','pending'].includes(c.status)).length;
  const completed = mine.filter(c => c.status === 'completed').length;
  const earnings = S.earnings || {};
  const rating   = Number(currentUser?.average_rating || 0);
  const myCourses = S.courses.filter(c => c.expert_id === currentUser?.id);
  const published = myCourses.filter(c => c.status === 'published').length;
  const nextSessions = mine
    .filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date())
    .sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 3);
  const recentReviews = (S.reviews || []).slice(0, 3);
  const reminders = (S.expertReminders || []).filter(r => !r.completed).slice(0, 4);
  const tasks = (S.expertTasks || []).filter(t => t.status !== 'completed').slice(0, 4);
  const proposals = (S.expertProposals || []).slice(0, 3);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Overview</span></div>

    <section class="page-header">
      <h1 class="page-title">Welcome back, ${esc(currentUser?.name || 'Expert')}</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-expert-action="view-public-profile">
          <i class="fas fa-eye"></i> Preview Profile</button>
        <button class="btn btn-primary" data-expert-action="edit-services">
          <i class="fas fa-layer-group"></i> Manage Services</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Consultations</p>
          <p class="stat-value">${S.expertStats?.total_consultations ?? mine.length}</p>
          <p class="stat-sub">${completed} completed</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Now</p>
          <p class="stat-value">${active}</p>
          ${pending > 0
            ? `<p class="stat-sub" style="color:var(--warning-dark)">${pending} awaiting confirmation</p>`
            : ''}
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
          <p class="stat-sub">${(S.reviews || []).length} review${(S.reviews || []).length === 1 ? '' : 's'}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Published Courses</p>
          <p class="stat-value">${published}</p>
          <p class="stat-sub">${myCourses.length} total</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-book"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Clients</p>
          <p class="stat-value">${(S.expertClients || []).length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-address-book"></i></div>
      </div>
    </section>

    ${pending ? `
      <div class="alert alert-warning">
        <i class="fas fa-clock"></i>
        <div>
          You have <strong>${pending} booking request${pending === 1 ? '' : 's'}</strong>
          awaiting your confirmation.
          <a href="#" data-expert-tab="consultations" style="margin-left:6px">Review now</a>
        </div>
      </div>
    ` : ''}

    <section class="dashboard-columns">
      <div class="panel">
        <h3 class="panel-title">Next Consultations</h3>
        ${nextSessions.length ? nextSessions.map(c => `
          <div class="case-card">
            <header class="case-header">
              <h3 class="case-title">${esc(c.title || '')}</h3>
              <span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' '))}</span>
            </header>
            <p class="case-client">Client: ${esc(c.client_name || 'Client')}</p>
            <p class="case-type">
              ${c.scheduled_at ? fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC') : '—'}
              · ${c.duration_minutes || 30} min
              · ${timeUntil(c.scheduled_at)}
            </p>
            <footer class="case-footer">
              <button class="btn btn-primary btn-sm" data-expert-action="start-consultation" data-id="${c.id}">
                <i class="fas fa-play"></i> Start</button>
              <button class="btn btn-info btn-sm" data-expert-action="consultation-detail" data-id="${c.id}">
                <i class="fas fa-eye"></i> Details</button>
              <button class="btn btn-secondary btn-sm" data-expert-action="reschedule-consultation" data-id="${c.id}">
                <i class="fas fa-calendar-alt"></i> Reschedule</button>
            </footer>
          </div>
        `).join('') : '<p class="empty-row">No upcoming consultations</p>'}
      </div>

      <div class="panel">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-expert-action="create-proposal">
          <i class="fas fa-file-invoice"></i> New Proposal</button>
        <button class="btn btn-info btn-block" data-expert-action="create-project">
          <i class="fas fa-list-check"></i> New Project</button>
        <button class="btn btn-success btn-block" data-expert-action="create-mentorship">
          <i class="fas fa-hand-holding-heart"></i> Start Mentorship</button>
        <button class="btn btn-warning btn-block" data-expert-action="create-course">
          <i class="fas fa-plus"></i> Create Course</button>
        <button class="btn btn-secondary btn-block" data-expert-tab="availability">
          <i class="fas fa-clock"></i> Update Availability</button>
      </div>
    </section>

    ${reminders.length ? `
      <section class="panel">
        <h3 class="panel-title">Reminders</h3>
        <ul class="list-stack">
          ${reminders.map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.title || '')}</span>
                <span class="list-row-sub">${esc(r.client_name || '')} · ${fmtDT(r.remind_at)}</span>
              </div>
              <button class="btn btn-success btn-xs" data-expert-action="crm-reminder-complete" data-id="${r.id}">
                <i class="fas fa-check"></i> Done</button>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    ${tasks.length ? `
      <section class="panel">
        <h3 class="panel-title">Open Tasks</h3>
        <ul class="list-stack">
          ${tasks.map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.title || '')}</span>
                <span class="list-row-sub">${t.project_name ? esc(t.project_name) + ' · ' : ''}Due ${fmtDate(t.due_date)}</span>
              </div>
              <button class="btn btn-success btn-xs" data-expert-action="complete-task" data-id="${t.id}">
                <i class="fas fa-check"></i> Complete</button>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    ${proposals.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Proposals</h3>
        <ul class="list-stack">
          ${proposals.map(p => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(p.title || '')}</span>
                <span class="list-row-sub">${esc(p.client_name || '')} · ${fmtCur(p.amount || 0)}</span>
              </div>
              <span class="${statusClass(p.status)}">${esc(p.status || '')}</span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

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
