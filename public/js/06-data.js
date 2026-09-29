/* ============================================================
   ExpertHub 2.0 — 06-data.js
   All data-loading functions + polling + notification badge.
   ============================================================ */

/* ============================================================
   DATA LOADERS
   ============================================================ */
async function loadAllData() {
  const tasks = [
    apiCall('/api/common/notifications').then(d => { S.notifications = d.notifications || []; }).catch(() => {}),
    apiCall('/api/common/events').then(d => { S.events = d.events || []; }).catch(() => {}),
    apiCall('/api/common/consultations').then(d => { S.consultations = d.consultations || []; }).catch(() => {}),
    apiCall('/api/eschool/courses').then(d => { S.courses = d.courses || []; }).catch(() => {}),
  ];

  if (currentUserRole === 'admin') {
    tasks.push(apiCall('/api/admin/users').then(d => { S.users = d.users || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/experts').then(d => { S.experts = d.experts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/analytics').then(d => { S.analytics = d; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/transactions').then(d => { S.transactions = d.transactions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/payouts').then(d => { S.payouts = d.payouts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/coupons').then(d => { S.coupons = d.coupons || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/claims').then(d => { S.claims = d.claims || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/tickets').then(d => { S.tickets = d.tickets || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/reviews').then(d => { S.reviews = d.reviews || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/audit-logs').then(d => { S.auditLogs = d.logs || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/institutions').then(d => { S.institutions = d.institutions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/disputes').then(d => { S.consultationDisputes = d.disputes || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/consultation-analytics').then(d => { S.adminConsultationAnalytics = d; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/refunds').then(d => { S.userRefunds = d.refunds || []; }).catch(() => {}));
  } else if (currentUserRole === 'expert') {
    tasks.push(apiCall('/api/expert/earnings').then(d => { S.earnings = d.summary; S.wallet.ledger = d.ledger || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/reviews').then(d => { S.reviews = d.reviews || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/withdrawals').then(d => { S.payouts = d.payouts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/availability').then(d => { S.availability = d.availability || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/time-off').then(d => { S.timeOff = d.timeOff || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/dashboard-stats').then(d => { S.expertStats = d.stats; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/portfolio').then(d => { S.expertPortfolio = d.items || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/consultation-analytics').then(d => { S.expertConsultationAnalytics = d; }).catch(() => {}));
    tasks.push(apiCall('/api/experts/me/slots').then(d => { S.consultationSlots = d.slots || []; }).catch(() => {}));
    tasks.push(apiCall('/api/experts/me/tiers').then(d => { S.consultationTiers = d.tiers || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/course-analytics').then(d => { S.courseAnalytics = d; }).catch(() => {}));
  } else if (currentUserRole === 'institution') {
    /* Base institution data */
    tasks.push(apiCall('/api/institution/me').then(d => { S.myInstitution = d.institution; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/stats').then(d => { S.institutionStats = d.stats; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/branding').then(d => { S.institutionBranding = d.branding; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/programmes').then(d => { S.programmes = d.programmes || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/cohorts').then(d => { S.cohorts = d.cohorts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/trainees?per=100').then(d => {
      S.trainees = d.trainees || [];
      S.institutionTraineeTotal = d.total || S.trainees.length;
    }).catch(() => {}));
    tasks.push(apiCall('/api/institution/instructors').then(d => { S.instructors = d.instructors || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/enrollments?per=100').then(d => {
      S.institutionEnrollments = d.enrollments || [];
      S.institutionEnrollmentTotal = d.total || S.institutionEnrollments.length;
    }).catch(() => {}));
    tasks.push(apiCall('/api/institution/sessions').then(d => { S.institutionSessions = d.sessions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/certificates').then(d => { S.institutionCertificates = d.certificates || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/skills').then(d => { S.institutionSkills = d.skills || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/skills/matrix').then(d => { S.institutionSkillsMatrix = d || { skills: [], matrix: [] }; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/approvals').then(d => { S.institutionApprovals = d.approvals || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/assessments').then(d => { S.assessments = d.assessments || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/projects').then(d => { S.projects = d.projects || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/org-units').then(d => { S.institutionOrgUnits = d.units || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/learning-paths').then(d => { S.institutionLearningPaths = d.paths || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/question-bank').then(d => { S.institutionQuestions = d.questions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/materials').then(d => { S.institutionMaterials = d.materials || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/compliance-rules').then(d => { S.institutionComplianceRules = d.rules || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/report-templates').then(d => { S.institutionReportTemplates = d.templates || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/scheduled-reports').then(d => { S.institutionScheduledReports = d.reports || []; }).catch(() => {}));

    /* Institution extensions */
    tasks.push(apiCall('/api/institution/analytics').then(d => { S.institutionAnalytics = d; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/campuses').then(d => { S.campuses = d.campuses || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/budgets').then(d => { S.budgetAllocations = d.budgets || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/budget-transactions').then(d => { S.budgetTransactions = d.transactions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/instructor-marketplace').then(d => { S.instructorMarketplace = d.instructors || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/instructor-contracts').then(d => { S.instructorContracts = d.contracts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/wellness').then(d => { S.wellnessScores = d.scores || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/wellness-alerts').then(d => { S.wellnessAlerts = d.alerts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/succession').then(d => { S.successionMatrix = d || { boxes: [], trainees: [], assignments: [] }; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/sso').then(d => { S.ssoConfiguration = d.config; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/api-keys').then(d => { S.apiKeys = d.keys || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/webhooks').then(d => { S.webhooks = d.webhooks || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/announcements').then(d => { S.announcements = d.announcements || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/report-definitions').then(d => { S.savedReportDefinitions = d.definitions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/skills-gap').then(d => { S.skillsGapAnalysis = d; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/compliance-runs').then(d => { S.complianceRuns = d.runs || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/exam-proctor-sessions').then(d => { S.examProctorSessions = d.sessions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/blockchain-certs').then(d => { S.blockchainCerts = d.certificates || []; }).catch(() => {}));

    if (currentUser?.institution_role === 'operations_manager') {
      tasks.push(apiCall('/api/institution/team').then(d => { S.institutionTeam = d.team || []; }).catch(() => {}));
    }
  } else {
    /* Learner */
    tasks.push(apiCall('/api/user/experts').then(d => { S.experts = d.experts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/enrollments').then(d => { S.enrollments = d.enrollments || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/wallet').then(d => {
      S.wallet.balance = d.balance;
      S.wallet.ledger = d.ledger || [];
    }).catch(() => {}));
    tasks.push(apiCall('/api/user/transactions').then(d => { S.transactions = d.transactions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/claims').then(d => { S.claims = d.claims || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/tickets').then(d => { S.tickets = d.tickets || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/certificates').then(d => { S.certificates = d.certificates || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/preferences').then(d => { S.userIntent = d.intent || S.userIntent; }).catch(() => {}));

    /* Consultation extensions */
    tasks.push(apiCall('/api/user/shortlist').then(d => { S.userShortlist = d.shortlist || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/packages').then(d => { S.userPackages = d.packages || []; }).catch(() => {}));

    /* E-School extensions */
    tasks.push(apiCall('/api/user/wishlist').then(d => {
      S.wishlist = d.items || [];
      S.wishlistIds = new Set((d.items || []).map(w => String(w.course_id)));
    }).catch(() => {}));
    tasks.push(apiCall('/api/user/xp').then(d => {
      S.userXP = d.xp || 0;
      S.userLevel = d.level || 1;
      S.userStreak = { current: d.current_streak || 0, longest: d.longest_streak || 0 };
    }).catch(() => {}));
    tasks.push(apiCall('/api/user/badges').then(d => { S.userBadges = d.badges || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/learning-paths').then(d => { S.coursePaths = d.paths || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/bundles').then(d => { S.courseBundles = d.bundles || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/refunds').then(d => { S.userRefunds = d.refunds || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/watch-history').then(d => { S.recentWatchHistory = d.history || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/course-reviews').then(d => { S.courseReviews = d.reviews || []; }).catch(() => {}));

    S.enrolledCourseIds = new Set((S.enrollments || []).map(e => String(e.course_id)));
  }

  await Promise.allSettled(tasks);

  if (currentUserRole === 'learner' || currentUserRole === 'expert' || currentUserRole === 'admin') {
    S.enrolledCourseIds = new Set((S.enrollments || []).map(e => String(e.course_id)));
  }
}

async function reloadUsers()            { try { const d = await apiCall('/api/admin/users');          S.users = d.users || []; } catch (_) {} }
async function reloadExperts()          { try { const d = await apiCall('/api/admin/experts');        S.experts = d.experts || []; } catch (_) {} }
async function reloadConsultations()    { try { const d = await apiCall('/api/common/consultations'); S.consultations = d.consultations || []; } catch (_) {} }
async function reloadNotifications()    { try { const d = await apiCall('/api/common/notifications'); S.notifications = d.notifications || []; } catch (_) {} }
async function reloadWallet()           { try { const d = await apiCall('/api/user/wallet');          S.wallet.balance = d.balance; S.wallet.ledger = d.ledger || []; } catch (_) {} }
async function reloadEarnings()         { try { const d = await apiCall('/api/expert/earnings');      S.earnings = d.summary; S.wallet.ledger = d.ledger || []; } catch (_) {} }
async function reloadInstitutionProgrammes() { try { const d = await apiCall('/api/institution/programmes'); S.programmes = d.programmes || []; } catch (_) {} }
async function reloadInstitutionCohorts()    { try { const d = await apiCall('/api/institution/cohorts');    S.cohorts    = d.cohorts || []; } catch (_) {} }
async function reloadInstitutions()          { try { const d = await apiCall('/api/admin/institutions');     S.institutions = d.institutions || []; } catch (_) {} }

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    reloadNotifications().then(updateNotificationBadge);
  }, CONFIG.POLL_INTERVAL);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
function updateNotificationBadge() {
  const b = $('#notif-badge');
  if (!b) return;
  const unread = S.notifications.filter(n => !n.is_read).length;
  b.textContent = unread;
  b.classList.toggle('hidden', unread === 0);
}
