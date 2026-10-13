/* ============================================================
   dashboards/expert/index.js — Expert dashboard entry
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const mine = S.consultations.filter(c => c.expert_id === S.currentUser?.id);
    const activeCount = mine.filter(c => ['assigned', 'in_progress'].includes(c.status)).length;

    const nav = [
      EH.Sidebar.item('dashboard',     'Dashboard',      'fa-chart-line'),
      EH.Sidebar.item('consultations', 'Consultations',  'fa-comments', activeCount),
      EH.Sidebar.item('availability',  'Availability',   'fa-clock'),
      EH.Sidebar.item('calendar',      'Calendar',       'fa-calendar'),
      EH.Sidebar.item('courses',       'My Courses',     'fa-book'),
      EH.Sidebar.item('events',        'My Events',      'fa-calendar-alt'),
      EH.Sidebar.item('portfolio',     'Portfolio',      'fa-briefcase'),
      EH.Sidebar.item('earnings',      'Earnings',       'fa-dollar-sign'),
      EH.Sidebar.item('withdrawals',   'Withdrawals',    'fa-money-bill-transfer'),
      EH.Sidebar.item('reviews',       'Reviews',        'fa-star'),
      EH.Sidebar.item('profile',       'Profile',        'fa-user'),
    ].join('');

    EH.DashboardShell.render({
      roleClass: 'role-expert',
      brandIcon: 'fa-user-tie',
      brandTitle: 'Expert Panel',
      brandSubtitle: 'ExpertHub',
      nav,
      roleLabel: 'Expert Panel',
      content: content(),
    });
  }

  function content() {
    switch (S.activeTab) {
      case 'dashboard':     return EH.ExpertOverview?.render?.() || '';
      case 'consultations': return EH.ExpertConsultations?.render?.() || '';
      case 'availability':  return EH.ExpertAvailability?.render?.() || '';
      case 'calendar':      return EH.ExpertCalendar?.render?.() || '';
      case 'courses':       return EH.ExpertCourses?.render?.() || '';
      case 'events':        return EH.ExpertEvents?.render?.() || '';
      case 'portfolio':     return EH.ExpertPortfolio?.render?.() || '';
      case 'earnings':      return EH.ExpertEarnings?.render?.() || '';
      case 'withdrawals':   return EH.ExpertWithdrawals?.render?.() || '';
      case 'reviews':       return EH.ExpertReviews?.render?.() || '';
      case 'profile':       return EH.ExpertProfile?.render?.() || '';
      default:              return EH.ExpertOverview?.render?.() || '';
    }
  }

  EH.ExpertDashboard = { render, content };
  global.renderExpertDashboard = render;
})(window);
