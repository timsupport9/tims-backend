/* ============================================================
   ExpertHub 2.0 — js/admin/01-dashboard.js
   Admin dashboard shell + content dispatcher.
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