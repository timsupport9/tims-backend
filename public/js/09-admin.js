/* ============================================================
   ExpertHub 2.0 — 09-admin.js
   Admin dashboard — every panel + analytics + settings.
   ============================================================ */

function renderAdminDashboard() {
  const pending = S.users.filter(u => u.status === 'pending').length;
  const activeCons = S.consultations.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length;
  const openDisputes = S.consultationDisputes.filter(d => ['open','investigating'].includes(d.status)).length;
  const pendingRefunds = S.userRefunds.filter(r => r.status === 'requested').length;
  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('users','User Management','fa-users', pending)}
    ${sidebarItem('experts','Expert Management','fa-user-tie')}
    ${sidebarItem('consultations','Consultations','fa-comments', activeCons)}
    ${sidebarItem('disputes','Consultation Disputes','fa-gavel', openDisputes)}
    ${sidebarItem('events','Events','fa-calendar-alt')}
    ${sidebarItem('institutions','Institutions','fa-building-columns')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
    ${sidebarItem('payouts','Payouts','fa-money-check-dollar')}
    ${sidebarItem('refunds','Refunds','fa-rotate-left', pendingRefunds)}
    ${sidebarItem('coupons','Coupons','fa-tag')}
    ${sidebarItem('claims','Claims','fa-scale-balanced')}
    ${sidebarItem('tickets','Support','fa-headset')}
    ${sidebarItem('reviews','Reviews','fa-star')}
    ${sidebarItem('broadcasts','Broadcasts','fa-bullhorn')}
    ${sidebarItem('audit','Audit Log','fa-clipboard-list')}
    ${sidebarItem('consultation-analytics','Consultation Analytics','fa-chart-pie')}
    ${sidebarItem('analytics','Platform Analytics','fa-chart-bar')}
    ${sidebarItem('settings','Settings','fa-gear')}
    ${sidebarItem('profile','Profile','fa-user')}
  `;
  shell({
    roleClass: 'role-admin',
    brandIcon: 'fa-graduation-cap',
    brandTitle: 'ExpertHub',
    brandSubtitle: 'Admin Panel',
    nav,
    roleLabel: 'Admin Panel',
    content: renderAdminContent(),
  });
  attachRoleEvents();
  renderCharts();
}

function renderAdminContent() {
  switch (activeTab) {
    case 'dashboard':                return adminOverview();
    case 'users':                    return adminUsers();
    case 'experts':                  return adminExperts();
    case 'consultations':            return adminConsultations();
    case 'disputes':                 return adminDisputes();
    case 'events':                   return adminEvents();
    case 'institutions':             return adminInstitutions();
    case 'transactions':             return adminTransactions();
    case 'payouts':                  return adminPayouts();
    case 'refunds':                  return adminRefunds();
    case 'coupons':                  return adminCoupons();
    case 'claims':                   return adminClaims();
    case 'tickets':                  return adminTickets();
    case 'reviews':                  return adminReviews();
    case 'broadcasts':               return adminBroadcasts();
    case 'audit':                    return adminAudit();
    case 'consultation-analytics':   return adminConsultationAnalytics();
    case 'analytics':                return adminAnalytics();
    case 'settings':                 return adminSettings();
    case 'profile':                  return adminProfile();
    default:                         return adminOverview();
  }
}

function adminOverview() {
  const pending = S.users.filter(u => u.status === 'pending').length;
  const activeExperts = S.experts.filter(e => e.status === 'active').length;
  const activeCons = S.consultations.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length;
  const openDisputes = S.consultationDisputes.filter(d => ['open','investigating'].includes(d.status)).length;
  const t = S.analytics?.totals || {};
  const newThisMonth = S.users.filter(u => {
    const d = new Date(u.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Platform Overview</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-dashboard"><i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="refresh-all"><i class="fas fa-rotate"></i> Refresh</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Users</p>
          <p class="stat-value">${t.total_users ?? S.users.length}</p>
          <p class="stat-sub">${newThisMonth} new this month</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Experts</p>
          <p class="stat-value">${activeExperts}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-user-tie"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Consultations</p>
          <p class="stat-value">${activeCons}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Open Disputes</p>
          <p class="stat-value">${openDisputes}</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-gavel"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Revenue</p>
          <p class="stat-value">${fmtCur(t.total_revenue || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Pending Approvals</p>
          <p class="stat-value">${pending}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
    </section>

    ${pending || openDisputes ? `
      <section class="dashboard-columns">
        ${pending ? `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-circle"></i>
            <div>
              <strong>${pending} user${pending === 1 ? '' : 's'} awaiting approval.</strong>
              <a href="#" data-action="switch-tab" data-tab="users" style="margin-left:8px">Review now</a>
            </div>
          </div>
        ` : ''}
        ${openDisputes ? `
          <div class="alert alert-error">
            <i class="fas fa-gavel"></i>
            <div>
              <strong>${openDisputes} open dispute${openDisputes === 1 ? '' : 's'}.</strong>
              <a href="#" data-action="switch-tab" data-tab="disputes" style="margin-left:8px">Investigate</a>
            </div>
          </div>
        ` : ''}
      </section>
    ` : ''}

    <section class="dashboard-columns">
      <div class="panel panel-quick-actions">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="switch-tab" data-tab="experts"><i class="fas fa-user-plus"></i> Create Expert</button>
        <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="events"><i class="fas fa-calendar-plus"></i> Manage Events</button>
        <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="users"><i class="fas fa-user-check"></i> Approve Users</button>
        <button class="btn btn-warning btn-block" data-action="switch-tab" data-tab="institutions"><i class="fas fa-building"></i> Review Institutions</button>
        <button class="btn btn-secondary btn-block" data-action="switch-tab" data-tab="coupons"><i class="fas fa-tag"></i> Manage Coupons</button>
      </div>
      <div class="panel">
        <h3 class="panel-title">Recent Notifications</h3>
        <ul class="notif-list">
          ${S.notifications.slice(0,5).map(n => `
            <li class="notif-item">
              <i class="fas fa-bell"></i>
              <div class="notif-info">
                <p class="notif-title">${esc(n.title || '')}</p>
                <p class="notif-message">${esc(n.message || '')}</p>
              </div>
              <span class="notif-date">${timeAgo(n.created_at)}</span>
            </li>
          `).join('') || '<li class="empty-row">No notifications</li>'}
        </ul>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">User Growth</h3><canvas id="chartUserGrowth" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Revenue Overview</h3><canvas id="chartRevenue" height="200"></canvas></div>
    </section>
  `;
}

function adminUsers() {
  const roleFilter = $('#users-role-filter')?.value || '';
  const statusFilter = $('#users-status-filter')?.value || '';
  const q = ($('#users-q')?.value || '').toLowerCase();

  let list = S.users.slice();
  if (roleFilter)   list = list.filter(u => u.role === roleFilter);
  if (statusFilter) list = list.filter(u => u.status === statusFilter);
  if (q) list = list.filter(u =>
    (u.name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  );

  const allSelected = list.length > 0 && list.every(u => selectedRows.users.has(String(u.id)));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Users</span></div>
    <section class="page-header">
      <h1 class="page-title">User Management</h1>
      <div class="page-actions">
        <input type="search" id="users-q" class="form-input" placeholder="Search users..." value="${esc(q)}" />
        <select id="users-status-filter" class="form-select">
          <option value="">All statuses</option>
          <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
          <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="suspended" ${statusFilter === 'suspended' ? 'selected' : ''}>Suspended</option>
          <option value="rejected" ${statusFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
        <select id="users-role-filter" class="form-select">
          <option value="">All roles</option>
          <option value="admin" ${roleFilter === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="expert" ${roleFilter === 'expert' ? 'selected' : ''}>Expert</option>
          <option value="institution" ${roleFilter === 'institution' ? 'selected' : ''}>Institution</option>
          <option value="learner" ${roleFilter === 'learner' ? 'selected' : ''}>Learner</option>
        </select>
        <button class="btn btn-secondary" data-action="export-users"><i class="fas fa-download"></i> Export</button>
      </div>
    </section>

    ${selectedRows.users.size ? `
      <div class="alert alert-info" style="justify-content:space-between">
        <span><strong>${selectedRows.users.size}</strong> selected</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success btn-sm" data-action="bulk-approve-users">Approve All</button>
          <button class="btn btn-danger btn-sm" data-action="bulk-suspend-users">Suspend All</button>
          <button class="btn btn-secondary btn-sm" data-action="clear-selection" data-target="users">Clear</button>
        </div>
      </div>
    ` : ''}

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:36px">
                <input type="checkbox" id="users-select-all" ${allSelected ? 'checked' : ''} />
              </th>
              <th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Last login</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(u => `
              <tr>
                <td>
                  <input type="checkbox" class="user-check" data-id="${u.id}"
                         ${selectedRows.users.has(String(u.id)) ? 'checked' : ''} />
                </td>
                <td>
                  <div class="user-cell">
                    <img class="user-avatar" src="${avatar(u)}" alt="" />
                    <div>
                      <div class="user-name">${esc(u.name || '')}</div>
                      <div class="user-email">${esc(u.email || '')}</div>
                    </div>
                  </div>
                </td>
                <td><span class="chip chip-neutral">${esc(u.role || 'learner')}</span></td>
                <td><span class="${statusClass(u.status)}">${esc(u.status || '')}</span></td>
                <td>${fmtDate(u.created_at)}</td>
                <td>${u.last_login_at ? timeAgo(u.last_login_at) : '—'}</td>
                <td class="actions-cell">
                  ${u.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Approve</button>` : ''}
                  ${u.status === 'pending' ? `<button class="btn btn-danger btn-xs" data-action="reject-user" data-id="${u.id}">Reject</button>` : ''}
                  ${u.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${u.id}">Suspend</button>` : ''}
                  ${(u.status === 'suspended' || u.status === 'rejected') ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Reactivate</button>` : ''}
                  <button class="btn btn-secondary btn-xs" data-action="edit-user" data-id="${u.id}">Edit</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${u.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No users found</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="table-footer"><span>Showing ${list.length} users</span></div>
    </section>

    <script>
      document.querySelectorAll('.user-check').forEach(cb => {
        cb.onchange = () => {
          if (cb.checked) selectedRows.users.add(cb.dataset.id);
          else selectedRows.users.delete(cb.dataset.id);
          rerenderRoleContent();
        };
      });
      const selAll = document.getElementById('users-select-all');
      if (selAll) selAll.onchange = () => {
        if (selAll.checked) list.forEach(u => selectedRows.users.add(String(u.id)));
        else selectedRows.users.clear();
        rerenderRoleContent();
      };
    </script>
  `;
}

function adminExperts() {
  const list = S.experts.slice();
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header">
      <h1 class="page-title">Expert Management</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="show-create-expert"><i class="fas fa-plus"></i> Create Expert</button>
      </div>
    </section>

    <section class="panel hidden" id="createExpertPanel">
      <h3 class="panel-title">Create New Expert</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span><input id="newExpertName" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Email</span><input id="newExpertEmail" type="email" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Phone</span><input id="newExpertPhone" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Specialization</span><input id="newExpertSpec" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Hourly rate ($)</span><input id="newExpertRate" type="number" class="form-input" /></label>
        <label class="form-group form-group-full"><span class="form-label">Bio</span><input id="newExpertBio" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="submit-create-expert">Create</button>
        <button class="btn btn-secondary" data-action="hide-create-expert">Cancel</button>
      </div>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Expert</th><th>Specialization</th><th>Rate</th><th>Rating</th><th>Earnings</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${list.map(e => `
              <tr>
                <td>
                  <div class="user-cell">
                    <img class="user-avatar" src="${avatar(e)}" alt="" />
                    <div>
                      <div class="user-name">${esc(e.name || '')}</div>
                      <div class="user-email">${esc(e.email || '')}</div>
                    </div>
                  </div>
                </td>
                <td>${esc(e.specialization || '—')}</td>
                <td>${fmtCur(e.hourly_rate || 0)}</td>
                <td>${e.average_rating ? Number(e.average_rating).toFixed(1) + ' / 5' : '—'}</td>
                <td>${fmtCur(e.total_earnings || 0)}</td>
                <td><span class="${statusClass(e.status || 'active')}">${esc(e.status || '')}</span></td>
                <td class="actions-cell">
                  ${e.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${e.id}">Suspend</button>` : ''}
                  ${e.status === 'suspended' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${e.id}">Reactivate</button>` : ''}
                  <button class="btn btn-info btn-xs" data-action="verify-expert-badge" data-id="${e.id}">
                    <i class="fas fa-check-circle"></i> Verify</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${e.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No experts</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminConsultations() {
  const filter = $('#admin-consult-filter')?.value || '';
  const list = filter
    ? S.consultations.filter(c => c.status === filter)
    : S.consultations;
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">All Consultations</h1>
      <div class="page-actions">
        <select id="admin-consult-filter" class="form-select" style="max-width:200px">
          <option value="">All statuses</option>
          ${CONFIG.CONSULTATION_STATUSES.map(s => `
            <option value="${s}" ${filter === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>
          `).join('')}
        </select>
      </div>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th><th>Client</th><th>Expert</th><th>Type</th>
              <th>Scheduled</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => `
              <tr>
                <td>${esc(c.title || '')}</td>
                <td>${esc(c.client_name || '—')}</td>
                <td>${esc(c.expert_name || '—')}</td>
                <td><span class="chip chip-neutral">${esc(c.consultation_type || '')}</span></td>
                <td>${c.scheduled_at ? fmtInTz(c.scheduled_at) : '—'}</td>
                <td><span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' ') || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-consultation" data-id="${c.id}">View</button>
                  ${!c.expert_id ? `<button class="btn btn-primary btn-xs" data-action="assign-consultation" data-id="${c.id}">Assign</button>` : ''}
                  ${c.status === 'disputed' ? `<button class="btn btn-danger btn-xs" data-action="open-dispute-detail" data-id="${c.id}">Dispute</button>` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No consultations</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminDisputes() {
  const disputes = S.consultationDisputes || [];
  const analytics = S.adminConsultationAnalytics || { totals: {}, cancellation_reasons: [] };
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Disputes</span></div>
    <section class="page-header">
      <h1 class="page-title">Consultation Disputes</h1>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Consultations</p>
          <p class="stat-value">${analytics.totals?.total || 0}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Completed</p>
          <p class="stat-value">${analytics.totals?.completed || 0}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Open Disputes</p>
          <p class="stat-value">${disputes.filter(d => ['open','investigating'].includes(d.status)).length}</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-gavel"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">No-Shows</p>
          <p class="stat-value">${analytics.totals?.no_shows || 0}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-user-slash"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Open Disputes</h3>
      ${disputes.length ? disputes.map(d => `
        <article class="dispute-card">
          <header class="dispute-header">
            <div>
              <h4>${esc(d.consultation_title || 'Consultation')}</h4>
              <p class="dispute-meta">
                Opened by ${esc(d.opener_name || '—')} against ${esc(d.expert_name || '—')}
                · ${fmtDate(d.opened_at)}
              </p>
            </div>
            <span class="${statusClass(d.status)}">${esc(d.status)}</span>
          </header>
          <p class="dispute-reason"><strong>Reason:</strong> ${esc(d.reason || '')}</p>
          <p class="dispute-desc">${esc(d.description || '')}</p>
          ${d.evidence ? `<p class="dispute-evidence"><i class="fas fa-paperclip"></i> ${typeof d.evidence === 'string' ? 'Evidence attached' : Object.keys(d.evidence).length + ' file(s)'}</p>` : ''}
          <footer class="dispute-actions">
            <button class="btn btn-info btn-sm" data-action="dispute-investigate" data-id="${d.id}">Investigate</button>
            <button class="btn btn-success btn-sm" data-action="dispute-resolve" data-id="${d.id}">Resolve</button>
            <button class="btn btn-danger btn-sm" data-action="dispute-reject" data-id="${d.id}">Reject</button>
          </footer>
        </article>
      `).join('') : '<p class="empty-row">No disputes</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Cancellation Reasons</h3>
      <ul class="list-stack">
        ${(analytics.cancellation_reasons || []).map(r => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(r.cancel_reason || 'No reason given')}</span>
            </div>
            <span class="chip chip-neutral">${r.c} time${r.c === 1 ? '' : 's'}</span>
          </li>
        `).join('') || '<li class="empty-row">No cancellations recorded</li>'}
      </ul>
    </section>
  `;
}

function adminEvents() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
    <section class="page-header">
      <h1 class="page-title">Events and Training</h1>
      <button class="btn btn-primary" data-action="create-event"><i class="fas fa-calendar-plus"></i> New Event</button>
    </section>
    <section class="panel">
      <div class="event-list">
        ${S.events.map(ev => `
          <article class="event-card">
            <div class="event-date">
              <span class="event-day">${new Date(ev.date || ev.created_at).getDate()}</span>
              <span class="event-month">${new Date(ev.date || ev.created_at).toLocaleString('en-US', { month: 'short' })}</span>
            </div>
            <div class="event-body">
              <h4 class="event-title">${esc(ev.title || '')}</h4>
              <p class="event-desc">${esc((ev.description || '').slice(0, 120))}</p>
              <p class="event-meta">${esc(ev.category || '')} · ${ev.registered_count || 0}/${ev.capacity || 0} registered · ${ev.price > 0 ? fmtCur(ev.price) : 'Free'}</p>
            </div>
            <div class="event-actions">
              <button class="btn btn-secondary btn-sm" data-action="edit-event" data-id="${ev.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete-event" data-id="${ev.id}">Delete</button>
            </div>
          </article>
        `).join('') || '<p class="empty-row">No events</p>'}
      </div>
    </section>
  `;
}

function adminInstitutions() {
  const list = S.institutions.slice();
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Institutions</span></div>
    <section class="page-header">
      <h1 class="page-title">Institutional and Corporate Accounts</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-institution"><i class="fas fa-plus"></i> New Institution</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Institutions</p><p class="stat-value">${list.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-building"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active Programmes</p><p class="stat-value">${S.programmes.filter(p => p.status === 'active').length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-diagram-project"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Trainees</p><p class="stat-value">${S.trainees.length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-graduate"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Pending Verification</p><p class="stat-value">${list.filter(i => i.status === 'pending').length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Institution</th><th>Type</th><th>Industry</th><th>Ops Manager</th><th>Programmes</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${list.map(i => `
              <tr>
                <td>
                  <div class="user-cell">
                    <div class="user-avatar" style="background:var(--brand);display:flex;align-items:center;justify-content:center;color:#fff">
                      <i class="fas fa-building"></i>
                    </div>
                    <div>
                      <div class="user-name">${esc(i.name || '')}</div>
                      <div class="user-email">${esc(i.contact_email || '')}</div>
                    </div>
                  </div>
                </td>
                <td><span class="chip chip-neutral">${esc(i.type || 'corporate')}</span></td>
                <td>${esc(i.industry || '—')}</td>
                <td>${esc(i.ops_manager_name || '—')}<br><small class="user-email">${esc(i.ops_manager_email || '')}</small></td>
                <td>${i.programme_count || 0}</td>
                <td><span class="${statusClass(i.status || 'pending')}">${esc(i.status || '')}</span></td>
                <td class="actions-cell">
                  ${i.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-institution" data-id="${i.id}">Verify</button>` : ''}
                  ${i.status === 'pending' ? `<button class="btn btn-danger btn-xs" data-action="reject-institution" data-id="${i.id}">Reject</button>` : ''}
                  ${i.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-institution" data-id="${i.id}">Suspend</button>` : ''}
                  <button class="btn btn-info btn-xs" data-action="assign-ops-manager" data-id="${i.id}">Assign Ops</button>
                  <button class="btn btn-secondary btn-xs" data-action="edit-institution" data-id="${i.id}">Edit</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-institution" data-id="${i.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No institutions registered</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminTransactions() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
    <section class="page-header"><h1 class="page-title">Transactions</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Reference</th><th>User</th><th>Description</th><th>Amount</th><th>Provider</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${S.transactions.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.user_name || '—')}</td>
                <td>${esc(t.description || '')}</td>
                <td>${fmtCur(t.amount || 0)}</td>
                <td><span class="chip chip-neutral">${esc(t.provider || '')}</span></td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td>${fmtDT(t.created_at)}</td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No transactions</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminPayouts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Payouts</span></div>
    <section class="page-header"><h1 class="page-title">Payouts</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Expert</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.payouts.map(p => `
              <tr>
                <td>${esc(p.expert_name || '—')}</td>
                <td>${fmtCur(p.amount || 0)}</td>
                <td><span class="chip chip-neutral">${esc(p.method || '')}</span></td>
                <td><span class="${statusClass(p.status)}">${esc(p.status || '')}</span></td>
                <td>${fmtDate(p.created_at)}</td>
                <td class="actions-cell">
                  ${p.status === 'pending' ? `
                    <button class="btn btn-success btn-xs" data-action="payout-approve" data-id="${p.id}">Approve</button>
                    <button class="btn btn-info btn-xs" data-action="payout-process" data-id="${p.id}">Process</button>
                    <button class="btn btn-danger btn-xs" data-action="payout-reject" data-id="${p.id}">Reject</button>
                  ` : ''}
                  ${p.status === 'processing' ? `<button class="btn btn-success btn-xs" data-action="payout-paid" data-id="${p.id}">Mark Paid</button>` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No payouts</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminRefunds() {
  const refunds = S.userRefunds || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Refunds</span></div>
    <section class="page-header">
      <h1 class="page-title">Course Refund Requests</h1>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>User</th><th>Course</th><th>Amount</th><th>Reason</th><th>Requested</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${refunds.map(r => `
              <tr>
                <td>${esc(r.user_name || '—')}</td>
                <td>${esc(r.course_title || '—')}</td>
                <td>${fmtCur(r.amount || 0)}</td>
                <td>${esc((r.reason || '').slice(0, 80))}</td>
                <td>${fmtDate(r.requested_at)}</td>
                <td><span class="${statusClass(r.status)}">${esc(r.status)}</span></td>
                <td class="actions-cell">
                  ${r.status === 'requested' ? `
                    <button class="btn btn-success btn-xs" data-action="refund-approve" data-id="${r.id}">Approve</button>
                    <button class="btn btn-danger btn-xs" data-action="refund-reject" data-id="${r.id}">Reject</button>
                  ` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No refund requests</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminCoupons() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Coupons</span></div>
    <section class="page-header">
      <h1 class="page-title">Coupons</h1>
      <button class="btn btn-primary" data-action="create-coupon"><i class="fas fa-plus"></i> New Coupon</button>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Uses</th><th>Applies to</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.coupons.map(c => `
              <tr>
                <td><code class="code">${esc(c.code || '')}</code></td>
                <td>${c.discount_type === 'percent' ? c.discount_value + '%' : fmtCur(c.discount_value)}</td>
                <td>${c.used_count || 0}${c.max_uses ? ' / ' + c.max_uses : ''}</td>
                <td><span class="chip chip-neutral">${esc(c.applies_to)}</span></td>
                <td>${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
                <td><span class="${statusClass(c.active ? 'active' : 'disabled')}">${c.active ? 'Active' : 'Disabled'}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="toggle-coupon" data-id="${c.id}">Toggle</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-coupon" data-id="${c.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No coupons</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminClaims() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Claims</span></div>
    <section class="page-header"><h1 class="page-title">Client Claims</h1></section>
    <section class="panel">
      ${S.claims.length ? S.claims.map(c => `
        <article class="claim-card">
          <header class="claim-header">
            <span class="claim-title">${esc(c.claim_title || '')}</span>
            <span class="${statusClass(c.status)}">${esc(c.status || '')}</span>
          </header>
          <p class="claim-desc">${esc(c.claim_description || '')}</p>
          ${c.claim_amount ? `<p class="claim-amount">Amount: ${fmtCur(c.claim_amount)}</p>` : ''}
          <footer class="claim-actions">
            ${c.status === 'open' ? `
              <button class="btn btn-info btn-sm" data-action="claim-investigate" data-id="${c.id}">Investigate</button>
              <button class="btn btn-success btn-sm" data-action="claim-resolve" data-id="${c.id}">Resolve</button>
              <button class="btn btn-danger btn-sm" data-action="claim-reject" data-id="${c.id}">Reject</button>
            ` : ''}
          </footer>
        </article>
      `).join('') : '<p class="empty-row">No claims</p>'}
    </section>
  `;
}

function adminTickets() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
    <section class="page-header"><h1 class="page-title">Support Tickets</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Ref</th><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.tickets.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.user_name || '—')}</td>
                <td>${esc(t.subject || '')}</td>
                <td><span class="${statusClass(t.priority || 'normal')}">${esc(t.priority || '')}</span></td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-info btn-xs" data-action="ticket-view" data-id="${t.id}">View</button>
                  <button class="btn btn-success btn-xs" data-action="ticket-resolve" data-id="${t.id}">Resolve</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No tickets</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminReviews() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reviews</span></div>
    <section class="page-header"><h1 class="page-title">Reviews</h1></section>
    <section class="panel">
      ${S.reviews.length ? S.reviews.map(r => `
        <article class="review-card">
          <header class="review-header">
            <span class="review-author">${esc(r.author_name || 'Anonymous')} → ${esc(r.expert_name || r.course_title || 'Expert')}</span>
            <span class="star-rating">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
            <span class="${statusClass(r.status)}">${esc(r.status || '')}</span>
          </header>
          <p class="review-body">${esc(r.comment || '')}</p>
          <footer class="review-actions">
            ${r.status !== 'published' ? `<button class="btn btn-success btn-xs" data-action="review-publish" data-id="${r.id}">Publish</button>` : ''}
            ${r.status !== 'hidden' ? `<button class="btn btn-danger btn-xs" data-action="review-hide" data-id="${r.id}">Hide</button>` : ''}
          </footer>
        </article>
      `).join('') : '<p class="empty-row">No reviews</p>'}
    </section>
  `;
}

function adminBroadcasts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Broadcasts</span></div>
    <section class="page-header"><h1 class="page-title">Broadcasts</h1></section>
    <section class="panel">
      <h3 class="panel-title">Send a Broadcast</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Title</span><input id="broadcastTitle" class="form-input" /></label>
        <label class="form-group">
          <span class="form-label">Audience</span>
          <select id="broadcastAudience" class="form-select">
            <option value="all">All users</option>
            <option value="experts">Experts only</option>
            <option value="learners">Learners only</option>
            <option value="institutions">Institutions only</option>
            <option value="admins">Admins only</option>
          </select>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Message</span>
          <textarea id="broadcastMessage" class="form-textarea" rows="4"></textarea>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="send-broadcast"><i class="fas fa-paper-plane"></i> Send Broadcast</button>
      </div>
    </section>
  `;
}

function adminAudit() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Audit</span></div>
    <section class="page-header"><h1 class="page-title">Audit Log</h1></section>
    <section class="panel">
      <ul class="list-stack">
        ${S.auditLogs.map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.action || '')}</span>
              <span class="list-row-sub">target ${esc(l.target || '')}${l.target_id ? ' #' + l.target_id : ''} by ${esc(l.actor_name || 'system')}</span>
            </div>
            <span class="list-row-meta">${fmtDT(l.created_at)}</span>
          </li>
        `).join('') || '<li class="empty-row">No entries</li>'}
      </ul>
    </section>
  `;
}

function adminConsultationAnalytics() {
  const a = S.adminConsultationAnalytics || { totals: {}, cancellation_reasons: [] };
  const t = a.totals || {};
  const byExpert = a.topExperts || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Analytics</span></div>
    <section class="page-header"><h1 class="page-title">Consultation Analytics</h1></section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Consultations</p><p class="stat-value">${t.total || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${t.completed || 0}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Price</p><p class="stat-value">${fmtCur(t.avg_price || 0)}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">No-Shows</p><p class="stat-value">${t.no_shows || 0}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-user-slash"></i></div>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Consultations by Status</h3>
        <canvas id="chartConsultationsByStatus" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Top Experts by Revenue</h3>
        <canvas id="chartTopExpertsRevenue" height="200"></canvas>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Top Experts</h3>
      <ul class="list-stack">
        ${byExpert.map(e => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(e.name)}</span>
              <span class="list-row-sub">${e.consultations || 0} consults · ${e.avg_rating || 0} rating</span>
            </div>
            <span class="list-row-price">${fmtCur(e.total_earnings || 0)}</span>
          </li>
        `).join('') || '<li class="empty-row">No data</li>'}
      </ul>
    </section>
  `;
}

function adminAnalytics() {
  const t = S.analytics?.totals || {};
  const top = S.analytics?.topExperts || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Analytics</span></div>
    <section class="page-header"><h1 class="page-title">Platform Analytics</h1></section>

    <section class="stat-grid">
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Total Users</p><p class="stat-value">${t.total_users || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Total Revenue</p><p class="stat-value">${fmtCur(t.total_revenue || 0)}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Published Courses</p><p class="stat-value">${t.published_courses || 0}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-book"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Published Events</p><p class="stat-value">${t.published_events || 0}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-calendar"></i></div>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">User Growth</h3><canvas id="userGrowthChart" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Revenue</h3><canvas id="revenueChart" height="200"></canvas></div>
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">Users by Role</h3><canvas id="roleChart" height="200"></canvas></div>
      <div class="chart-card">
        <h3 class="panel-title">Top Experts</h3>
        <ul class="list-stack" style="margin-top:10px">
          ${top.map(e => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(e.name)}</span>
                <span class="list-row-sub">${e.average_rating || 0} / 5</span>
              </div>
              <span class="list-row-price">${fmtCur(e.total_earnings)}</span>
            </li>
          `).join('') || '<li class="empty-row">No data</li>'}
        </ul>
      </div>
    </section>
  `;
}

function adminSettings() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Settings</span></div>
    <section class="page-header"><h1 class="page-title">Settings</h1></section>

    <section class="panel">
      <h3 class="panel-title">Platform</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Platform name</span><input id="setPlatformName" class="form-input" value="ExpertHub" /></label>
        <label class="form-group"><span class="form-label">Support email</span><input id="setSupportEmail" class="form-input" value="support@experthub.com" /></label>
        <label class="form-group">
          <span class="form-label">Default currency</span>
          <select id="setCurrency" class="form-select">
            <option>USD</option><option>KES</option><option>NGN</option><option>EUR</option>
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Timezone</span>
          <select id="setTimezone" class="form-select">
            <option>UTC</option><option>Africa/Nairobi</option><option>Africa/Lagos</option>
          </select>
        </label>
      </div>

      <h3 class="panel-title" style="margin-top:20px">Commission and Payouts</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Consultation commission (%)</span><input id="setCommCons" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Course commission (%)</span><input id="setCommCourse" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Withdrawal hold (days)</span><input id="setHold" type="number" class="form-input" value="7" /></label>
        <label class="form-group"><span class="form-label">Minimum payout ($)</span><input id="setMinPayout" type="number" class="form-input" value="50" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-settings">Save Settings</button>
      </div>
    </section>
  `;
}

function adminProfile() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">My Profile</h1></section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span><input id="profileName" class="form-input" value="${esc(currentUser?.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Phone</span><input id="profilePhone" class="form-input" value="${esc(currentUser?.phone || '')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span><input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone || 'UTC')}" /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" />
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-user-profile">Save Changes</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span><input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span><input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-warning" data-action="change-password">Update Password</button>
      </div>
    </section>
  `;
}
