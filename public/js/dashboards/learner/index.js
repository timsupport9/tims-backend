/* ============================================================
   dashboards/learner/index.js — Learner dashboard entry
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const mine = S.consultations.filter(c => c.user_id === S.currentUser?.id);
    const intent = S.userIntent || S.currentUser?.intent || 'both';
    const showLearn   = intent === 'learn'   || intent === 'both';
    const showConsult = intent === 'consult' || intent === 'both';

    const nav = [
      EH.Sidebar.item('dashboard',   'Dashboard',       'fa-chart-line'),
      showLearn   ? EH.Sidebar.item('eschool',      'E-School',         'fa-school') : '',
      showLearn   ? EH.Sidebar.item('my-learning',  'My Learning',      'fa-graduation-cap') : '',
      showLearn   ? EH.Sidebar.item('wishlist',     'Wishlist',         'fa-heart') : '',
      showLearn   ? EH.Sidebar.item('certificates', 'Certificates',     'fa-certificate') : '',
      EH.Sidebar.item('events',        'Events',            'fa-calendar-alt'),
      showConsult ? EH.Sidebar.item('experts',      'Find Experts',     'fa-search') : '',
      EH.Sidebar.item('consultations', 'My Consultations',  'fa-comments', mine.length),
      EH.Sidebar.item('wallet',        'Wallet',            'fa-wallet'),
      EH.Sidebar.item('transactions',  'Transactions',      'fa-receipt'),
      EH.Sidebar.item('claims',        'Claims',            'fa-gavel'),
      EH.Sidebar.item('support',       'Support',           'fa-headset'),
      EH.Sidebar.item('profile',       'Profile',           'fa-user'),
    ].filter(Boolean).join('');

    EH.DashboardShell.render({
      roleClass: 'role-user',
      brandIcon: 'fa-user-circle',
      brandTitle: 'My Panel',
      brandSubtitle: 'ExpertHub',
      nav,
      roleLabel: 'User Panel',
      content: content(),
    });

    EH.LearnerInteractions?.attach?.();
  }

  function content() {
    switch (S.activeTab) {
      case 'dashboard':     return EH.LearnerOverview?.render?.()      || '';
      case 'eschool':       return EH.LearnerESchool?.render?.()       || '';
      case 'my-learning':   return EH.LearnerMyLearning?.render?.()    || '';
      case 'wishlist':      return EH.LearnerWishlist?.render?.()      || '';
      case 'certificates':  return EH.LearnerCertificates?.render?.()  || '';
      case 'events':        return EH.LearnerEvents?.render?.()        || '';
      case 'experts':       return EH.LearnerFindExperts?.render?.()   || '';
      case 'consultations': return EH.LearnerConsultations?.render?.() || '';
      case 'wallet':        return EH.LearnerWallet?.render?.()        || '';
      case 'transactions':  return EH.LearnerTransactions?.render?.()  || '';
      case 'claims':        return EH.LearnerClaims?.render?.()        || '';
      case 'support':       return EH.LearnerSupport?.render?.()       || '';
      case 'profile':       return EH.LearnerProfile?.render?.()       || '';
      default:              return EH.LearnerOverview?.render?.()      || '';
    }
  }

  EH.LearnerDashboard = { render, content };
  global.renderUserDashboard = render;
})(window);
