/* ============================================================
   ExpertHub 2.0 — js/expert/01-dashboard.js
   Expert dashboard shell + content dispatcher.
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
