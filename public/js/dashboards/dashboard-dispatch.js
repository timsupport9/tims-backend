/* ============================================================
   dashboards/dashboard-dispatch.js — Role-based dashboard entry
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    if (!EH.state.currentUser) return EH.LoginView.render();
    switch (EH.state.currentUserRole) {
      case 'admin':       return EH.AdminDashboard?.render();
      case 'expert':      return EH.ExpertDashboard?.render();
      case 'institution': return EH.InstitutionDashboard?.render();
      default:            return EH.LearnerDashboard?.render();
    }
  }

  EH.DashboardDispatch = { render };
  global.renderDashboard = render;
})(window);
