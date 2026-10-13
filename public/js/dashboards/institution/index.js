/* ============================================================
   dashboards/institution/index.js — Institution dashboard entry
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    if (!S.currentUser) return EH.LoginView.render();
    const inst = S.myInstitution || {};
    const isOpsManager = S.currentUser.institution_role === 'operations_manager';

    const pendingApprovals = (S.institutionApprovals || []).filter(a => a.status === 'pending').length;
    const expiringCerts = (S.institutionCertificates || []).filter(c => {
      if (!c.expires_at || c.revoked) return false;
      const days = (new Date(c.expires_at) - Date.now()) / 86400000;
      return days > 0 && days < 90;
    }).length;
    const upcomingSessions = (S.institutionSessions || []).filter(s =>
      s.status === 'scheduled' && new Date(s.scheduled_at) > new Date()).length;

    const nav = [
      EH.Sidebar.item('dashboard',      'Dashboard',           'fa-chart-line'),
      EH.Sidebar.item('programmes',     'Programmes',          'fa-diagram-project'),
      EH.Sidebar.item('learning-paths', 'Learning Paths',      'fa-route'),
      EH.Sidebar.item('cohorts',        'Cohorts & Batches',   'fa-layer-group', upcomingSessions),
      EH.Sidebar.item('training',       'Training Delivery',   'fa-chalkboard-user'),
      EH.Sidebar.item('assessments',    'Assessments',         'fa-clipboard-check'),
      EH.Sidebar.item('question-bank',  'Question Bank',       'fa-database'),
      EH.Sidebar.item('projects',       'Capstone Projects',   'fa-briefcase'),
      EH.Sidebar.item('trainees',       'Trainees',            'fa-users'),
      EH.Sidebar.item('certifications', 'Certifications',      'fa-award', expiringCerts),
      EH.Sidebar.item('skills',         'Skills Matrix',       'fa-puzzle-piece'),
      EH.Sidebar.item('compliance',     'Compliance',          'fa-shield-halved'),
      EH.Sidebar.item('instructors',    'Instructors',         'fa-user-tie'),
      EH.Sidebar.item('reports',        'Reports & Insights',  'fa-file-lines'),
      EH.Sidebar.item('org-structure',  'Org Structure',       'fa-sitemap'),
      isOpsManager ? EH.Sidebar.item('operations', 'Operations Control', 'fa-sliders', pendingApprovals) : '',
      isOpsManager ? EH.Sidebar.item('branding',   'Custom Branding',    'fa-palette') : '',
      EH.Sidebar.item('profile',        'Institution Profile', 'fa-building'),
    ].filter(Boolean).join('');

    EH.DashboardShell.render({
      roleClass: 'role-institution',
      brandIcon: 'fa-building-columns',
      brandTitle: EH.Fmt.esc(inst.name || S.currentUser.institution_name || 'Institution'),
      brandSubtitle: 'Corporate Training Hub',
      nav,
      roleLabel: isOpsManager ? 'Operations Manager' : 'Institution Panel',
      content: content(),
    });

    EH.InstitutionCharts?.render?.();
    EH.InstitutionInteractions?.attach?.();
  }

  function content() {
    switch (S.activeTab) {
      case 'dashboard':      return EH.InstOverview?.render?.()      || '';
      case 'programmes':     return EH.InstProgrammes?.render?.()    || '';
      case 'learning-paths': return EH.InstLearningPaths?.render?.() || '';
      case 'cohorts':        return EH.InstCohorts?.render?.()       || '';
      case 'training':       return EH.InstTraining?.render?.()      || '';
      case 'assessments':    return EH.InstAssessments?.render?.()   || '';
      case 'question-bank':  return EH.InstQuestionBank?.render?.()  || '';
      case 'projects':       return EH.InstProjects?.render?.()      || '';
      case 'trainees':       return EH.InstTrainees?.render?.()      || '';
      case 'certifications': return EH.InstCertifications?.render?.()|| '';
      case 'skills':         return EH.InstSkills?.render?.()        || '';
      case 'compliance':     return EH.InstCompliance?.render?.()    || '';
      case 'instructors':    return EH.InstInstructors?.render?.()   || '';
      case 'reports':        return EH.InstReports?.render?.()       || '';
      case 'org-structure':  return EH.InstOrgStructure?.render?.()  || '';
      case 'operations':     return EH.InstOperations?.render?.()    || '';
      case 'branding':       return EH.InstBranding?.render?.()      || '';
      case 'profile':        return EH.InstProfile?.render?.()       || '';
      default:               return EH.InstOverview?.render?.()      || '';
    }
  }

  EH.InstitutionDashboard = { render, content };
  global.renderInstitutionDashboard = render;
})(window);
