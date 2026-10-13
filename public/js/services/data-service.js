/* ============================================================
   services/data-service.js — Domain data loaders & reloaders
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { API, State, Logger } = EH;

  async function safe(promise, fallback = null) {
    try { return await promise; }
    catch (err) {
      Logger?.warn?.('DataService load failed:', err.message);
      return fallback;
    }
  }

  async function loadAll() {
    const role = State.currentUserRole;
    const tasks = [
      safe(API.get('/api/common/notifications')).then(d => { if (d) State.notifications = d.notifications || []; }),
      safe(API.get('/api/common/events')).then(d => { if (d) State.events = d.events || []; }),
      safe(API.get('/api/common/consultations')).then(d => { if (d) State.consultations = d.consultations || []; }),
      safe(API.get('/api/eschool/courses')).then(d => { if (d) State.courses = d.courses || []; }),
    ];

    if (role === 'admin') {
      tasks.push(
        safe(API.get('/api/admin/users')).then(d => { if (d) State.users = d.users || []; }),
        safe(API.get('/api/admin/experts')).then(d => { if (d) State.experts = d.experts || []; }),
        safe(API.get('/api/admin/analytics')).then(d => { if (d) State.analytics = d; }),
        safe(API.get('/api/admin/transactions')).then(d => { if (d) State.transactions = d.transactions || []; }),
        safe(API.get('/api/admin/payouts')).then(d => { if (d) State.payouts = d.payouts || []; }),
        safe(API.get('/api/admin/coupons')).then(d => { if (d) State.coupons = d.coupons || []; }),
        safe(API.get('/api/admin/claims')).then(d => { if (d) State.claims = d.claims || []; }),
        safe(API.get('/api/admin/tickets')).then(d => { if (d) State.tickets = d.tickets || []; }),
        safe(API.get('/api/admin/reviews')).then(d => { if (d) State.reviews = d.reviews || []; }),
        safe(API.get('/api/admin/audit-logs')).then(d => { if (d) State.auditLogs = d.logs || []; }),
        safe(API.get('/api/admin/institutions')).then(d => { if (d) State.institutions = d.institutions || []; }),
      );
    } else if (role === 'expert') {
      tasks.push(
        safe(API.get('/api/expert/earnings')).then(d => { if (d) { State.earnings = d.summary; State.wallet.ledger = d.ledger || []; } }),
        safe(API.get('/api/expert/reviews')).then(d => { if (d) State.reviews = d.reviews || []; }),
        safe(API.get('/api/expert/withdrawals')).then(d => { if (d) State.payouts = d.payouts || []; }),
        safe(API.get('/api/expert/availability')).then(d => { if (d) State.availability = d.availability || []; }),
        safe(API.get('/api/expert/time-off')).then(d => { if (d) State.timeOff = d.timeOff || []; }),
        safe(API.get('/api/expert/dashboard-stats')).then(d => { if (d) State.expertStats = d.stats; }),
        safe(API.get('/api/expert/portfolio')).then(d => { if (d) State.expertPortfolio = d.items || []; }),
      );
    } else if (role === 'institution') {
      tasks.push(
        safe(API.get('/api/institution/me')).then(d => { if (d) State.myInstitution = d.institution; }),
        safe(API.get('/api/institution/stats')).then(d => { if (d) State.institutionStats = d.stats; }),
        safe(API.get('/api/institution/branding')).then(d => { if (d) State.institutionBranding = d.branding; }),
        safe(API.get('/api/institution/programmes')).then(d => { if (d) State.programmes = d.programmes || []; }),
        safe(API.get('/api/institution/cohorts')).then(d => { if (d) State.cohorts = d.cohorts || []; }),
        safe(API.get('/api/institution/trainees?per=100')).then(d => {
          if (d) { State.trainees = d.trainees || []; State.institutionTraineeTotal = d.total || State.trainees.length; }
        }),
        safe(API.get('/api/institution/instructors')).then(d => { if (d) State.instructors = d.instructors || []; }),
        safe(API.get('/api/institution/enrollments?per=100')).then(d => {
          if (d) { State.institutionEnrollments = d.enrollments || []; State.institutionEnrollmentTotal = d.total || State.institutionEnrollments.length; }
        }),
        safe(API.get('/api/institution/sessions')).then(d => { if (d) State.institutionSessions = d.sessions || []; }),
        safe(API.get('/api/institution/certificates')).then(d => { if (d) State.institutionCertificates = d.certificates || []; }),
        safe(API.get('/api/institution/skills')).then(d => { if (d) State.institutionSkills = d.skills || []; }),
        safe(API.get('/api/institution/skills/matrix')).then(d => { if (d) State.institutionSkillsMatrix = d; }),
        safe(API.get('/api/institution/approvals')).then(d => { if (d) State.institutionApprovals = d.approvals || []; }),
        safe(API.get('/api/institution/assessments')).then(d => { if (d) State.assessments = d.assessments || []; }),
        safe(API.get('/api/institution/projects')).then(d => { if (d) State.projects = d.projects || []; }),
        safe(API.get('/api/institution/org-units')).then(d => { if (d) State.institutionOrgUnits = d.units || []; }),
        safe(API.get('/api/institution/learning-paths')).then(d => { if (d) State.institutionLearningPaths = d.paths || []; }),
        safe(API.get('/api/institution/question-bank')).then(d => { if (d) State.institutionQuestions = d.questions || []; }),
        safe(API.get('/api/institution/materials')).then(d => { if (d) State.institutionMaterials = d.materials || []; }),
        safe(API.get('/api/institution/compliance-rules')).then(d => { if (d) State.institutionComplianceRules = d.rules || []; }),
        safe(API.get('/api/institution/report-templates')).then(d => { if (d) State.institutionReportTemplates = d.templates || []; }),
        safe(API.get('/api/institution/scheduled-reports')).then(d => { if (d) State.institutionScheduledReports = d.reports || []; }),
      );
      if (State.currentUser?.institution_role === 'operations_manager') {
        tasks.push(safe(API.get('/api/institution/team')).then(d => { if (d) State.institutionTeam = d.team || []; }));
      }
    } else {
      tasks.push(
        safe(API.get('/api/user/experts')).then(d => { if (d) State.experts = d.experts || []; }),
        safe(API.get('/api/user/enrollments')).then(d => { if (d) State.enrollments = d.enrollments || []; }),
        safe(API.get('/api/user/wallet')).then(d => { if (d) { State.wallet.balance = d.balance; State.wallet.ledger = d.ledger || []; } }),
        safe(API.get('/api/user/transactions')).then(d => { if (d) State.transactions = d.transactions || []; }),
        safe(API.get('/api/user/claims')).then(d => { if (d) State.claims = d.claims || []; }),
        safe(API.get('/api/user/tickets')).then(d => { if (d) State.tickets = d.tickets || []; }),
        safe(API.get('/api/user/certificates')).then(d => { if (d) State.certificates = d.certificates || []; }),
        safe(API.get('/api/user/preferences')).then(d => { if (d) State.userIntent = d.intent || State.userIntent; }),
        safe(API.get('/api/user/wishlist')).then(d => { if (d) State.wishlist = d.items || []; }),
        safe(API.get('/api/user/event-registrations')).then(d => { if (d) State.eventRegistrations = d.registrations || []; }),
      );
    }

    await Promise.allSettled(tasks);
  }

  const reloaders = {
    users:          () => API.get('/api/admin/users').then(d => { State.users = d.users || []; }),
    experts:        () => API.get('/api/admin/experts').then(d => { State.experts = d.experts || []; }),
    consultations:  () => API.get('/api/common/consultations').then(d => { State.consultations = d.consultations || []; }),
    notifications:  () => API.get('/api/common/notifications').then(d => { State.notifications = d.notifications || []; }),
    wallet:         () => API.get('/api/user/wallet').then(d => { State.wallet.balance = d.balance; State.wallet.ledger = d.ledger || []; }),
    earnings:       () => API.get('/api/expert/earnings').then(d => { State.earnings = d.summary; State.wallet.ledger = d.ledger || []; }),
    programmes:     () => API.get('/api/institution/programmes').then(d => { State.programmes = d.programmes || []; }),
    cohorts:        () => API.get('/api/institution/cohorts').then(d => { State.cohorts = d.cohorts || []; }),
    institutions:   () => API.get('/api/admin/institutions').then(d => { State.institutions = d.institutions || []; }),
    payouts:        () => API.get('/api/admin/payouts').then(d => { State.payouts = d.payouts || []; }),
    tickets:        () => API.get('/api/user/tickets').then(d => { State.tickets = d.tickets || []; }),
    reviews:        () => API.get('/api/expert/reviews').then(d => { State.reviews = d.reviews || []; }).catch(() => API.get('/api/admin/reviews').then(d => { State.reviews = d.reviews || []; })),
  };

  const DataService = {
    loadAll,
    reload: reloaders,
    async reloadAll() { return loadAll(); },
  };

  EH.Data = DataService;
  global.loadAllData = loadAll;
})(window);
