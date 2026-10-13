/* ============================================================
   dashboards/expert/overview.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const me = S.currentUser || {};
    const mine = S.consultations.filter(c => c.expert_id === me.id);
    const active = mine.filter(c => ['assigned', 'in_progress'].includes(c.status)).length;
    const pending = mine.filter(c => c.status === 'pending').length;
    const completed = mine.filter(c => c.status === 'completed').length;
    const st = S.expertStats || {};
    const earnings = S.earnings || {};
    const rating = Number(me.average_rating || 0);

    const nextSessions = mine
      .filter(c => ['assigned', 'in_progress'].includes(c.status))
      .slice(0, 3);

    const recentReviews = (S.reviews || []).slice(0, 3);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Dashboard' }])}
      ${EH.Layout.pageHeader(`Welcome, ${EH.Fmt.esc(me.name || 'Expert')}`, {
        actions: `
          <button class="btn btn-secondary" data-action="view-public-profile">
            <i class="fas fa-eye"></i> Preview Public Profile</button>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="availability">
            <i class="fas fa-clock"></i> Update Availability</button>`,
      })}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({
          label: 'Total Consultations',
          value: st.total_consultations ?? mine.length,
          sub: `${completed} completed`,
          icon: 'fa-comments', tone: 'blue',
        }),
        EH.Layout.statCard({
          label: 'Active Now',
          value: active,
          sub: pending > 0 ? `${pending} awaiting response` : '',
          icon: 'fa-clock', tone: 'green',
        }),
        EH.Layout.statCard({
          label: 'Total Earnings',
          value: EH.Fmt.cur(earnings.total_earned || 0),
          sub: `Available: ${EH.Fmt.cur(earnings.available_balance || 0)}`,
          icon: 'fa-dollar-sign', tone: 'yellow',
        }),
        EH.Layout.statCard({
          label: 'Rating',
          value: rating.toFixed(1),
          sub: `${(S.reviews || []).length} review${(S.reviews || []).length === 1 ? '' : 's'}`,
          icon: 'fa-star', tone: 'purple',
        }),
      ])}

      ${active > 0 ? `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <div>
            You have <strong>${active} active consultation${active === 1 ? '' : 's'}</strong>.
            <a href="#" data-action="switch-tab" data-tab="consultations" style="margin-left:6px">View all</a>
          </div>
        </div>` : ''}

      <section class="dashboard-columns">
        <div class="panel">
          <h3 class="panel-title">Next Consultations</h3>
          ${nextSessions.length ? nextSessions.map(c => `
            <div class="case-card">
              <header class="case-header">
                <h3 class="case-title">${EH.Fmt.esc(c.title || '')}</h3>
                <span class="${EH.Fmt.statusClass(c.status)}">${EH.Fmt.esc(c.status || '')}</span>
              </header>
              <p class="case-client">Client: ${EH.Fmt.esc(c.client_name || 'Client')}</p>
              <p class="case-type">
                ${EH.Fmt.esc(c.consultation_type || '')} · Priority: ${EH.Fmt.esc(c.priority || 'normal')}
              </p>
              <footer class="case-footer">
                <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}">
                  <i class="fas fa-comments"></i> Open Chat</button>
                <button class="btn btn-info btn-sm" data-action="video-call" data-id="${c.id}">
                  <i class="fas fa-video"></i> Video</button>
              </footer>
            </div>`).join('') : '<p class="empty-row">No active consultations</p>'}
        </div>

        <div class="panel">
          <h3 class="panel-title">Quick Actions</h3>
          <button class="btn btn-primary btn-block" data-action="switch-tab" data-tab="availability">
            <i class="fas fa-clock"></i> Update Availability</button>
          <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="earnings">
            <i class="fas fa-money-bill"></i> Request Withdrawal</button>
          <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="portfolio">
            <i class="fas fa-briefcase"></i> Manage Portfolio</button>
          <button class="btn btn-secondary btn-block" data-action="switch-tab" data-tab="reviews">
            <i class="fas fa-star"></i> View Reviews</button>
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
                <span class="review-author">${EH.Fmt.esc(r.author_name || 'Anonymous')}</span>
                <span class="star-rating">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
                <span class="review-date">${EH.Dates.fmtDate(r.created_at)}</span>
              </header>
              <p class="review-body">${EH.Fmt.esc(r.comment || '')}</p>
            </div>`).join('')}
        </section>` : ''}`;
  }

  EH.ExpertOverview = { render };
})(window);
