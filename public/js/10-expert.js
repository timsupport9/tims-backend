/* ============================================================
   ExpertHub 2.0 — 10-expert.js
   Expert dashboard — overview, consultations, calendar, slots,
   tiers, course builder, analytics, earnings, reviews, profile.
   ============================================================ */

function renderExpertDashboard() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const activeCons = mine.filter(c => ['pending_expert_confirmation','confirmed','in_grace','in_session'].includes(c.status)).length;
  const myCourses = S.courses.filter(c => c.expert_id === currentUser?.id);
  const draftCourses = myCourses.filter(c => c.status === 'draft').length;

  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('consultations','Consultations','fa-comments', activeCons)}
    ${sidebarItem('consultation-calendar','Calendar','fa-calendar-day')}
    ${sidebarItem('slots','Availability Slots','fa-clock')}
    ${sidebarItem('tiers','Pricing Tiers','fa-layer-group')}
    ${sidebarItem('courses','My Courses','fa-book', draftCourses)}
    ${sidebarItem('course-builder','Course Builder','fa-pen-ruler')}
    ${sidebarItem('course-analytics','Course Analytics','fa-chart-simple')}
    ${sidebarItem('events','My Events','fa-calendar-alt')}
    ${sidebarItem('portfolio','Portfolio','fa-briefcase')}
    ${sidebarItem('questions','Public Q&A','fa-question-circle')}
    ${sidebarItem('earnings','Earnings','fa-dollar-sign')}
    ${sidebarItem('withdrawals','Withdrawals','fa-money-bill-transfer')}
    ${sidebarItem('reviews','Reviews','fa-star')}
    ${sidebarItem('consultation-analytics','Consultation Stats','fa-chart-pie')}
    ${sidebarItem('profile','Profile','fa-user')}
  `;
  shell({
    roleClass: 'role-expert',
    brandIcon: 'fa-user-tie',
    brandTitle: 'Expert Panel',
    brandSubtitle: 'ExpertHub',
    nav,
    roleLabel: 'Expert Panel',
    content: renderExpertContent(),
  });
  attachRoleEvents();
}

function renderExpertContent() {
  switch (activeTab) {
    case 'dashboard':                return expertOverview();
    case 'consultations':            return expertConsultations();
    case 'consultation-calendar':    return expertConsultationCalendar();
    case 'slots':                    return expertSlots();
    case 'tiers':                    return expertTiers();
    case 'courses':                  return expertCourses();
    case 'course-builder':           return expertCourseBuilder();
    case 'course-analytics':         return expertCourseAnalytics();
    case 'events':                   return expertEvents();
    case 'portfolio':                return expertPortfolioView();
    case 'questions':                return expertPublicQuestions();
    case 'earnings':                 return expertEarnings();
    case 'withdrawals':              return expertWithdrawals();
    case 'reviews':                  return expertReviews();
    case 'consultation-analytics':   return expertConsultationAnalytics();
    case 'profile':                  return expertProfile();
    default:                         return expertOverview();
  }
}

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

function expertConsultations() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const filter = $('#expert-consult-filter')?.value || '';
  const filtered = filter ? mine.filter(c => c.status === filter) : mine;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">My Consultations</h1>
      <div class="page-actions">
        <select id="expert-consult-filter" class="form-select" style="max-width:200px">
          <option value="">All statuses</option>
          ${CONFIG.CONSULTATION_STATUSES.map(s => `
            <option value="${s}" ${filter === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>
          `).join('')}
        </select>
      </div>
    </section>

    <section class="list-stack">
      ${filtered.map(c => `
        <article class="consultation-card">
          <header class="consultation-card-header">
            <div>
              <h4 class="consultation-card-title">${esc(c.title || '')}</h4>
              <p class="consultation-card-meta">
                <span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' ') || '')}</span>
                ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
              </p>
            </div>
            <div class="consultation-card-price">
              ${fmtCur(c.price || 0)}
            </div>
          </header>

          <div class="consultation-card-body">
            <div class="consultation-card-expert">
              <img class="user-avatar" src="${avatar({ name: c.client_name, email: c.client_email })}" alt="" />
              <div>
                <div class="user-name">${esc(c.client_name || 'Client')}</div>
                <div class="user-email">${esc(c.client_email || '')}</div>
              </div>
            </div>
            ${c.scheduled_at ? `
              <div class="consultation-card-time">
                <i class="fas fa-calendar"></i>
                <strong>${fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC')}</strong>
                <span class="consultation-card-countdown">${timeUntil(c.scheduled_at)}</span>
              </div>
            ` : ''}
            <div class="consultation-card-duration">
              <i class="fas fa-clock"></i> ${c.duration_minutes || 30} min · ${esc(c.consultation_type || 'video')}
            </div>
            ${c.description ? `<p class="consultation-card-desc">${esc(c.description.slice(0, 200))}</p>` : ''}
          </div>

          <footer class="consultation-card-actions">
            ${c.status === 'pending_expert_confirmation' ? `
              <button class="btn btn-success btn-sm" data-action="confirm-consultation" data-id="${c.id}">
                <i class="fas fa-check"></i> Confirm Booking</button>
              <button class="btn btn-danger btn-sm" data-action="cancel-consultation" data-id="${c.id}">
                <i class="fas fa-times"></i> Decline</button>
            ` : ''}
            ${['confirmed','scheduled','in_grace'].includes(c.status) ? `
              <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}">
                <i class="fas fa-play"></i> Start Session</button>
            ` : ''}
            ${c.status === 'in_session' ? `
              <button class="btn btn-success btn-sm" data-action="end-session" data-id="${c.id}">
                <i class="fas fa-stop"></i> End Session</button>
            ` : ''}
            <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
              <i class="fas fa-comments"></i> Chat</button>
            ${['confirmed','scheduled'].includes(c.status) && (c.reschedule_count || 0) < CONFIG.MAX_RESCHEDULES ? `
              <button class="btn btn-secondary btn-sm" data-action="reschedule-consultation" data-id="${c.id}">
                <i class="fas fa-calendar-alt"></i> Reschedule</button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
              <i class="fas fa-eye"></i> Details</button>
          </footer>
        </article>
      `).join('') || `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No consultations</h3>
          <p>Consultations assigned by admin will appear here.</p>
        </div>
      `}
    </section>
  `;
}

function expertConsultationCalendar() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: '', other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
  while (cells.length % 7) cells.push({ day: '', other: true });

  const byDay = {};
  mine.forEach(c => {
    if (!c.scheduled_at) return;
    const dt = new Date(c.scheduled_at);
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      const k = dt.getDate();
      (byDay[k] = byDay[k] || []).push(c);
    }
  });

  const upcoming = mine
    .filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 5);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Calendar</span></div>
    <section class="page-header">
      <h1 class="page-title">Consultation Calendar</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="block-time">
          <i class="fas fa-ban"></i> Block Time</button>
        <button class="btn btn-primary" data-action="manage-slots">
          <i class="fas fa-plus"></i> Manage Slots</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">${today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
      <div class="calendar-header">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendar-grid">
        ${cells.map(c => {
          const isToday = c.date && c.date.toDateString() === today.toDateString();
          const sessions = c.day ? (byDay[c.day] || []) : [];
          return `
            <div class="calendar-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
              <div class="calendar-day-num">${c.day || ''}</div>
              ${sessions.slice(0, 2).map(s => `
                <div class="calendar-event" title="${esc(s.title)}">
                  ${new Date(s.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ${esc(s.title.slice(0, 16))}
                </div>
              `).join('')}
              ${sessions.length > 2 ? `<div class="calendar-event-more">+${sessions.length - 2}</div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Upcoming Sessions</h3>
      ${upcoming.length ? upcoming.map(s => `
        <div class="consultation-row">
          <div class="consultation-row-time">
            <div class="consultation-row-day">${fmtDate(s.scheduled_at)}</div>
            <div class="consultation-row-hour">${fmtInTz(s.scheduled_at, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div class="consultation-row-body">
            <div class="consultation-row-title">${esc(s.title || '')}</div>
            <div class="consultation-row-meta">
              <span class="${consultationStatusClass(s.status)}">${esc(s.status?.replace(/_/g,' ') || '')}</span>
              · ${esc(s.client_name || 'Client')}
              · ${s.duration_minutes || 30} min
            </div>
          </div>
          <div class="consultation-row-actions">
            <button class="btn btn-primary btn-sm" data-action="consultation-detail" data-id="${s.id}">View</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No upcoming sessions</p>'}
    </section>
  `;
}

function expertSlots() {
  const slots = S.consultationSlots || [];
  const available = slots.filter(s => s.status === 'available');
  const booked = slots.filter(s => s.status === 'booked');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Availability Slots</span></div>
    <section class="page-header">
      <h1 class="page-title">Availability Slots</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="manage-slots">
          <i class="fas fa-plus"></i> Generate Slots</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Slots define when clients can book you. Generate them in batches by date range.
        Booked slots show which consultation they belong to.
      </div>
    </div>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Open Slots</p><p class="stat-value">${available.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-door-open"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Booked</p><p class="stat-value">${booked.length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Next 7 Days</p>
          <p class="stat-value">${available.filter(s => {
            const d = new Date(s.start_time);
            return d > new Date() && d < new Date(Date.now() + 7 * 86400000);
          }).length}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-calendar-week"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Slot Value (open)</p>
          <p class="stat-value">${fmtCur(available.reduce((sum, s) => sum + Number(s.price || 0), 0))}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-dollar-sign"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Open Slots</h3>
      ${available.length ? `
        <div class="slot-grid">
          ${available.map(s => `
            <div class="slot-card">
              <div class="slot-time">${slotLabel(s)}</div>
              <div class="slot-meta">${s.duration_minutes} min · ${fmtCur(s.price)}</div>
              <button class="btn btn-danger btn-xs" data-action="remove-slot" data-id="${s.id}">
                <i class="fas fa-times"></i></button>
            </div>
          `).join('')}
        </div>
      ` : '<p class="empty-row">No open slots. Click "Generate Slots" to create some.</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Booked Slots</h3>
      ${booked.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>Time</th><th>Duration</th><th>Price</th><th>Consultation</th></tr>
            </thead>
            <tbody>
              ${booked.map(s => {
                const c = S.consultations.find(x => x.slot_id === s.id);
                return `
                  <tr>
                    <td>${fmtDate(s.start_time)}</td>
                    <td>${fmtInTz(s.start_time, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${s.duration_minutes} min</td>
                    <td>${fmtCur(s.price)}</td>
                    <td>${c ? `<a href="#" data-action="consultation-detail" data-id="${c.id}">${esc(c.title)}</a>` : '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No booked slots yet</p>'}
    </section>
  `;
}

function expertTiers() {
  const tiers = S.consultationTiers || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Pricing Tiers</span></div>
    <section class="page-header">
      <h1 class="page-title">Pricing Tiers</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="edit-tiers">
          <i class="fas fa-pen"></i> Edit Tiers</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Offer different session types (Quick, Standard, Deep Dive) at different price points.
        Clients pick a tier when booking.
      </div>
    </div>

    ${tiers.length ? `
      <section class="card-grid">
        ${tiers.map(t => `
          <article class="program-card">
            <h4 class="program-title">${esc(t.name)}</h4>
            <p class="program-desc">${esc(t.description || 'No description')}</p>
            <div class="pricing-price" style="margin:12px 0">${fmtCur(t.price)}</div>
            <p class="program-meta"><i class="fas fa-clock"></i> ${t.duration_minutes} minutes</p>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-layer-group"></i>
          <h3>No pricing tiers configured</h3>
          <p>Set up Quick, Standard and Deep Dive tiers to give clients more choice.</p>
          <button class="btn btn-primary" data-action="edit-tiers">
            <i class="fas fa-plus"></i> Create Tiers</button>
        </div>
      </section>
    `}
  `;
}

function expertCourses() {
  const mine = S.courses.filter(c => c.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Courses</span></div>
    <section class="page-header">
      <h1 class="page-title">My Courses</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-course-modal">
          <i class="fas fa-plus"></i> New Course</button>
      </div>
    </section>

    ${selectedRows.courses?.size ? `
      <div class="alert alert-info" style="justify-content:space-between">
        <span><strong>${selectedRows.courses.size}</strong> course${selectedRows.courses.size === 1 ? '' : 's'} selected</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success btn-sm" data-action="bulk-publish-courses">Publish All</button>
          <button class="btn btn-secondary btn-sm" data-action="clear-selection" data-target="courses">Clear</button>
        </div>
      </div>
    ` : ''}

    <section class="card-grid">
      ${mine.map(c => `
        <article class="program-card">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <span class="chip chip-blue">${esc(c.level || 'beginner')}</span>
            <span class="${statusClass(c.status || 'draft')}">${esc(c.status || 'draft')}</span>
          </div>
          <h4 class="program-title">${esc(c.title || '')}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price || 0)}</span>
            <span class="program-meta">
              ${c.enrolled_count || 0} enrolled · ${c.lesson_count || 0} lessons
            </span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-action="open-course-builder" data-id="${c.id}">
              <i class="fas fa-pen-ruler"></i> Build</button>
            <button class="btn btn-secondary btn-sm" data-action="view-course-analytics" data-id="${c.id}">
              <i class="fas fa-chart-simple"></i> Analytics</button>
            <button class="btn btn-info btn-sm" data-action="edit-course" data-id="${c.id}">
              <i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-danger btn-sm" data-action="delete-course" data-id="${c.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-book"></i>
          <h3>No courses yet</h3>
          <p>Create your first course to start earning.</p>
          <button class="btn btn-primary" data-action="create-course-modal">
            <i class="fas fa-plus"></i> Create Course</button>
        </div>
      `}
    </section>
  `;
}

function expertCourseBuilder() {
  const courseId = $('#course-builder-id')?.value || S.__activeCourseId;
  const course = S.courses.find(c => String(c.id) === String(courseId));
  if (!course) {
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Builder</span></div>
      <section class="page-header"><h1 class="page-title">Course Builder</h1></section>
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-pen-ruler"></i>
          <h3>Select a course to build</h3>
          <p>Choose one of your courses or create a new one.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="courses">
            <i class="fas fa-book"></i> Go to My Courses</button>
        </div>
      </section>
    `;
  }

  const curriculum = S.courseCurriculum[courseId] || { modules: [] };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Builder</span></div>
    <section class="page-header">
      <h1 class="page-title">${esc(course.title)} — Builder</h1>
      <div class="page-actions">
        <input type="hidden" id="course-builder-id" value="${courseId}" />
        <button class="btn btn-secondary" data-action="preview-course" data-id="${courseId}">
          <i class="fas fa-eye"></i> Preview</button>
        <button class="btn btn-primary" data-action="add-module" data-id="${courseId}">
          <i class="fas fa-plus"></i> New Module</button>
      </div>
    </section>

    <div class="course-builder">
      <div class="builder-column">
        <h3 class="panel-title">Modules & Lessons</h3>
        ${curriculum.modules.length ? curriculum.modules.map(m => `
          <div class="builder-module" data-module-id="${m.id}">
            <header class="builder-module-header">
              <span class="builder-drag-handle"><i class="fas fa-grip-vertical"></i></span>
              <strong>${esc(m.title)}</strong>
              <div class="builder-actions">
                <button class="icon-btn btn-xs" data-action="edit-module" data-id="${m.id}">
                  <i class="fas fa-pen"></i></button>
                <button class="icon-btn btn-xs" data-action="add-lesson" data-module="${m.id}">
                  <i class="fas fa-plus"></i></button>
                <button class="icon-btn btn-xs" data-action="delete-module" data-id="${m.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </header>
            <div class="builder-lessons">
              ${(m.lessons || []).map(l => `
                <div class="builder-lesson" data-lesson-id="${l.id}">
                  <i class="fas ${lessonIcon(l.lesson_type)}"></i>
                  <span>${esc(l.title)}</span>
                  <span class="builder-lesson-type">${esc(l.lesson_type)}</span>
                  <div class="builder-lesson-actions">
                    <button class="icon-btn btn-xs" data-action="edit-lesson" data-id="${l.id}">
                      <i class="fas fa-pen"></i></button>
                    <button class="icon-btn btn-xs" data-action="delete-lesson" data-id="${l.id}">
                      <i class="fas fa-trash"></i></button>
                  </div>
                </div>
              `).join('') || '<p class="empty-row">No lessons in this module</p>'}
            </div>
          </div>
        `).join('') : `
          <div class="empty-state">
            <i class="fas fa-layer-group"></i>
            <h3>No modules yet</h3>
            <p>Start by creating your first module.</p>
            <button class="btn btn-primary" data-action="add-module" data-id="${courseId}">
              <i class="fas fa-plus"></i> Create First Module</button>
          </div>
        `}
      </div>

      <div class="builder-sidebar">
        <div class="panel">
          <h3 class="panel-title">Course Settings</h3>
          <label class="form-group"><span class="form-label">Status</span>
            <select id="builder-course-status" class="form-select">
              ${['draft','active','paused','completed','archived'].map(s => `
                <option value="${s}" ${course.status === s ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
          </label>
          <label class="form-group"><span class="form-label">Price ($)</span>
            <input id="builder-course-price" type="number" class="form-input" value="${course.price || 0}" />
          </label>
          <label class="form-group"><span class="form-label">Level</span>
            <select id="builder-course-level" class="form-select">
              ${['beginner','intermediate','advanced'].map(l => `
                <option value="${l}" ${course.level === l ? 'selected' : ''}>${l}</option>
              `).join('')}
            </select>
          </label>
          <div class="panel-actions">
            <button class="btn btn-primary btn-block" data-action="save-course-settings" data-id="${courseId}">
              <i class="fas fa-save"></i> Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function expertCourseAnalytics() {
  const a = S.courseAnalytics || {};
  const courses = a.courses || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Analytics</span></div>
    <section class="page-header">
      <h1 class="page-title">Course Analytics</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-course-analytics">
          <i class="fas fa-download"></i> Export</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Enrollments</p><p class="stat-value">${a.totalEnrollments || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completion Rate</p><p class="stat-value">${a.avgCompletion || 0}%</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Rating</p><p class="stat-value">${a.avgRating || 0}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Revenue (30d)</p><p class="stat-value">${fmtCur(a.revenue30d || 0)}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-dollar-sign"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Course Performance</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Course</th><th>Enrolled</th><th>Completed</th>
              <th>Avg. Progress</th><th>Rating</th><th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${courses.map(c => `
              <tr>
                <td>${esc(c.title)}</td>
                <td>${c.enrolled || 0}</td>
                <td>${c.completed || 0}</td>
                <td>${renderMiniBar(c.avg_progress, '#1e3a8a')} ${c.avg_progress || 0}%</td>
                <td>${Number(c.avg_rating || 0).toFixed(1)} / 5</td>
                <td>${fmtCur(c.revenue || 0)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No course data</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Enrollment Trend</h3>
        <canvas id="chartCourseEnrollment" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Completion by Course</h3>
        <canvas id="chartCourseCompletion" height="200"></canvas>
      </div>
    </section>
  `;
}

function expertEvents() {
  const mine = S.events.filter(e => e.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Events</span></div>
    <section class="page-header"><h1 class="page-title">My Events</h1></section>
    <section class="panel">
      ${mine.map(ev => `
        <article class="event-card">
          <div class="event-date">
            <span class="event-day">${new Date(ev.date || ev.created_at).getDate()}</span>
            <span class="event-month">${new Date(ev.date || ev.created_at).toLocaleString('en-US', { month: 'short' })}</span>
          </div>
          <div class="event-body">
            <h4 class="event-title">${esc(ev.title || '')}</h4>
            <p class="event-desc">${esc(ev.description || '')}</p>
            <p class="event-meta">${ev.registered_count || 0} registered of ${ev.capacity || 0}</p>
          </div>
        </article>
      `).join('') || '<p class="empty-row">No events assigned to you</p>'}
    </section>
  `;
}

function expertPortfolioView() {
  const items = S.expertPortfolio || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Portfolio</span></div>
    <section class="page-header">
      <h1 class="page-title">Portfolio and Case Studies</h1>
      <button class="btn btn-primary" data-action="add-portfolio-item">
        <i class="fas fa-plus"></i> Add Item</button>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Your portfolio appears on your public profile.
        Share case studies, client outcomes and testimonials to build credibility.
      </div>
    </div>

    <section class="card-grid">
      ${items.map(item => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(item.category || 'Case Study')}</span>
          <h4 class="program-title">${esc(item.title || '')}</h4>
          <p class="program-desc">${esc((item.description || '').slice(0, 140))}</p>
          <footer class="program-footer">
            <span class="program-meta">${fmtDate(item.created_at)}</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-secondary btn-sm" data-action="edit-portfolio-item" data-id="${item.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-action="delete-portfolio-item" data-id="${item.id}">Delete</button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-briefcase"></i>
          <h3>No portfolio items yet</h3>
          <p>Add case studies to showcase your expertise.</p>
          <button class="btn btn-primary" data-action="add-portfolio-item">
            <i class="fas fa-plus"></i> Add First Item</button>
        </div>
      `}
    </section>
  `;
}

function expertPublicQuestions() {
  const questions = S.expertQuestions || [];
  const unanswered = questions.filter(q => !q.answer);
  const answered = questions.filter(q => q.answer);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Public Q&A</span></div>
    <section class="page-header">
      <h1 class="page-title">Public Q&A</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Answer public questions to attract clients. Your answers appear on your profile.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Awaiting Answer (${unanswered.length})</h3>
      ${unanswered.length ? unanswered.map(q => `
        <div class="qa-item">
          <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
          <p class="qa-pending">
            Asked ${timeAgo(q.created_at)} by ${esc(q.asker_name || 'Anonymous')}
          </p>
          <div style="margin-top:8px">
            <button class="btn btn-primary btn-sm" data-action="answer-question" data-id="${q.id}">
              <i class="fas fa-reply"></i> Answer</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No pending questions</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Answered (${answered.length})</h3>
      ${answered.length ? answered.map(q => `
        <div class="qa-item">
          <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
          <p class="qa-a"><strong>You:</strong> ${esc(q.answer)}</p>
          <p class="qa-pending" style="margin-top:4px">
            Answered ${timeAgo(q.answered_at)}
          </p>
        </div>
      `).join('') : '<p class="empty-row">No answered questions yet</p>'}
    </section>
  `;
}

function expertEarnings() {
  const s = S.earnings || {};
  const ledger = S.wallet.ledger || [];
  const last30 = ledger.filter(l => {
    const d = new Date(l.created_at);
    return (Date.now() - d.getTime()) < 30 * 86400000;
  });
  const earned30 = last30
    .filter(l => Number(l.amount) > 0)
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Earnings</span></div>
    <section class="page-header"><h1 class="page-title">My Earnings</h1></section>

    <section class="stat-grid">
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Total Earned</p>
          <p class="stat-value">${fmtCur(s.total_earned || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Available Balance</p>
          <p class="stat-value">${fmtCur(s.available_balance || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-wallet"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Paid Out</p>
          <p class="stat-value">${fmtCur(s.total_paid_out || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-money-bill-transfer"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Last 30 Days</p>
          <p class="stat-value">${fmtCur(earned30)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-chart-line"></i></div>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      Platform commission: <strong>${CONFIG.PLATFORM_COMMISSION}%</strong> ·
      Withdrawal hold: <strong>${CONFIG.WITHDRAWAL_HOLD_DAYS} days</strong> ·
      Minimum payout: <strong>${fmtCur(CONFIG.MIN_PAYOUT)}</strong>
    </div>

    <section class="panel">
      <h3 class="panel-title">Request Withdrawal</h3>
      <div class="form-inline">
        <input type="number" id="withdrawAmount" class="form-input"
               placeholder="Amount (min ${fmtCur(CONFIG.MIN_PAYOUT)})" />
        <select id="withdrawMethod" class="form-select">
          <option value="bank_transfer">Bank Transfer</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
        </select>
        <button class="btn btn-primary" data-action="request-withdrawal">
          <i class="fas fa-paper-plane"></i> Request</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Wallet Activity</h3>
      <ul class="list-stack">
        ${ledger.slice(0, 30).map(l => `
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

function expertWithdrawals() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Withdrawals</span></div>
    <section class="page-header"><h1 class="page-title">Withdrawals</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${S.payouts.map(w => `
              <tr>
                <td>${fmtDate(w.created_at)}</td>
                <td>${fmtCur(w.amount || 0)}</td>
                <td>${esc(w.method || '')}</td>
                <td><span class="${statusClass(w.status)}">${esc(w.status || '')}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="4" class="empty-row">No withdrawals yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function expertReviews() {
  const reviews = S.reviews || [];
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reviews</span></div>
    <section class="page-header"><h1 class="page-title">My Reviews</h1></section>

    <div class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Average Rating</p><p class="stat-value">${avg}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Reviews</p><p class="stat-value">${reviews.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comment"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">5-Star Reviews</p><p class="stat-value">${reviews.filter(r => r.rating === 5).length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-thumbs-up"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">With Replies</p><p class="stat-value">${reviews.filter(r => r.reply).length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-reply"></i></div>
      </div>
    </div>

    <section class="panel">
      ${reviews.length ? reviews.map(r => `
        <article class="review-card">
          <header class="review-header">
            <span class="review-author">${esc(r.author_name || 'Anonymous')}</span>
            <span class="star-rating">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
            <span class="review-date">${fmtDate(r.created_at)}</span>
          </header>
          <p class="review-body">${esc(r.comment || '')}</p>
          ${r.reply
            ? `<div class="alert alert-info" style="margin-top:10px">
                <i class="fas fa-reply"></i>
                <strong>Your reply:</strong> ${esc(r.reply)}
              </div>`
            : `<footer class="review-actions">
                <button class="btn btn-secondary btn-sm" data-action="reply-review" data-id="${r.id}">
                  <i class="fas fa-reply"></i> Reply</button>
              </footer>`
          }
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-star"></i>
          <h3>No reviews yet</h3>
          <p>Complete consultations to receive reviews from clients.</p>
        </div>
      `}
    </section>
  `;
}

function expertConsultationAnalytics() {
  const a = S.expertConsultationAnalytics || { stats: {}, peak_hours: [] };
  const s = a.stats || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Stats</span></div>
    <section class="page-header"><h1 class="page-title">Consultation Statistics</h1></section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed Sessions</p><p class="stat-value">${s.completed_sessions || 0}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Unique Clients</p><p class="stat-value">${s.unique_clients || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Duration</p><p class="stat-value">${Math.round(s.avg_duration || 0)}m</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Cancellations</p><p class="stat-value">${s.cancelled || 0}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-times"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Peak Booking Hours</h3>
      <ul class="list-stack">
        ${(a.peak_hours || []).map(h => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${String(h.hr).padStart(2, '0')}:00</span>
            </div>
            <span class="chip chip-neutral">${h.c} booking${h.c === 1 ? '' : 's'}</span>
          </li>
        `).join('') || '<li class="empty-row">No booking data</li>'}
      </ul>
    </section>
  `;
}

function expertProfile() {
  const portfolioCount = (S.expertPortfolio || []).length;
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header">
      <h1 class="page-title">My Profile</h1>
      <button class="btn btn-secondary" data-action="view-public-profile">
        <i class="fas fa-eye"></i> Preview Public Profile</button>
    </section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
          <p style="margin-top:6px">
            <span class="chip chip-neutral">${esc(currentUser?.specialization || 'No specialization')}</span>
            <span class="chip chip-blue" style="margin-left:6px">
              ${portfolioCount} portfolio item${portfolioCount === 1 ? '' : 's'}
            </span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Specialization</span>
          <input id="profileSpecialization" class="form-input"
                 value="${esc(currentUser?.specialization || '')}" />
        </label>
        <label class="form-group">
          <span class="form-label">Hourly rate ($)</span>
          <input id="profileRate" type="number" class="form-input"
                 value="${currentUser?.hourly_rate || ''}" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Bio</span>
          <textarea id="profileBio" class="form-textarea" rows="4">${esc(currentUser?.bio || '')}</textarea>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" />
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-expert-profile">
          <i class="fas fa-save"></i> Update Profile</button>
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
    </section>
  `;
}
