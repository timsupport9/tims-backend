/* ============================================================
   ExpertHub 2.0 — 01-dashboard.js
   Learner dashboard shell + content router.
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
