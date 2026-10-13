/* ============================================================
   dashboards/admin/index.js — Admin dashboard entry
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const pending = S.users.filter(u => u.status === 'pending').length;
    const activeCons = S.consultations.filter(c =>
      ['pending', 'assigned', 'in_progress'].includes(c.status)).length;

    const nav = [
      EH.Sidebar.item('dashboard',     'Dashboard',        'fa-chart-line'),
      EH.Sidebar.item('users',         'User Management',  'fa-users',        pending),
      EH.Sidebar.item('experts',       'Expert Management','fa-user-tie'),
      EH.Sidebar.item('consultations', 'Consultations',    'fa-comments',     activeCons),
      EH.Sidebar.item('events',        'Events',           'fa-calendar-alt'),
      EH.Sidebar.item('institutions',  'Institutions',     'fa-building-columns'),
      EH.Sidebar.item('transactions',  'Transactions',     'fa-receipt'),
      EH.Sidebar.item('payouts',       'Payouts',          'fa-money-check-dollar'),
      EH.Sidebar.item('coupons',       'Coupons',          'fa-tag'),
      EH.Sidebar.item('claims',        'Claims',           'fa-gavel'),
      EH.Sidebar.item('tickets',       'Support',          'fa-headset'),
      EH.Sidebar.item('reviews',       'Reviews',          'fa-star'),
      EH.Sidebar.item('broadcasts',    'Broadcasts',       'fa-bullhorn'),
      EH.Sidebar.item('audit',         'Audit Log',        'fa-clipboard-list'),
      EH.Sidebar.item('analytics',     'Analytics',        'fa-chart-bar'),
      EH.Sidebar.item('settings',      'Settings',         'fa-gear'),
      EH.Sidebar.item('profile',       'Profile',          'fa-user'),
    ].join('');

    EH.DashboardShell.render({
      roleClass: 'role-admin',
      brandIcon: 'fa-graduation-cap',
      brandTitle: 'ExpertHub',
      brandSubtitle: 'Admin Panel',
      nav,
      roleLabel: 'Admin Panel',
      content: content(),
    });

    EH.AdminCharts?.render?.();
    EH.DashboardActions?.attach?.();
  }

  function content() {
    switch (S.activeTab) {
      case 'dashboard':     return EH.AdminOverview?.render?.() || '';
      case 'users':         return EH.AdminUsers?.render?.() || '';
      case 'experts':       return EH.AdminExperts?.render?.() || '';
      case 'consultations': return EH.AdminConsultations?.render?.() || '';
      case 'events':        return EH.AdminEvents?.render?.() || '';
      case 'institutions':  return EH.AdminInstitutions?.render?.() || '';
      case 'transactions':  return EH.AdminTransactions?.render?.() || '';
      case 'payouts':       return EH.AdminPayouts?.render?.() || '';
      case 'coupons':       return EH.AdminCoupons?.render?.() || '';
      case 'claims':        return EH.AdminClaims?.render?.() || '';
      case 'tickets':       return EH.AdminTickets?.render?.() || '';
      case 'reviews':       return EH.AdminReviews?.render?.() || '';
      case 'broadcasts':    return EH.AdminBroadcasts?.render?.() || '';
      case 'audit':         return EH.AdminAudit?.render?.() || '';
      case 'analytics':     return EH.AdminAnalytics?.render?.() || '';
      case 'settings':      return EH.AdminSettings?.render?.() || '';
      case 'profile':       return EH.AdminProfile?.render?.() || '';
      default:              return EH.AdminOverview?.render?.() || '';
    }
  }

  EH.AdminDashboard = { render, content };
  global.renderAdminDashboard = render;
})(window);
