/* ============================================================
   router/routes.js — Application route table
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const Routes = {
    // Public / auth (unauthenticated)
    public: [
      { path: '#/',                 handler: () => EH.Landing?.render() },
      { path: '#/login',            handler: () => EH.LoginView?.render() },
      { path: '#/register',         handler: () => EH.RegisterView?.render() },
      { path: '#/forgot',           handler: () => EH.ForgotView?.render() },
    ],

    // Dynamic
    dynamic: [
      { pattern: /^#\/reset\/?(?:\?(.*))?$/,  handler: (m) => {
        const params = new URLSearchParams(m[1] || '');
        EH.ResetView?.render(params.get('token'));
      }},
      { pattern: /^#\/verify\/(.+)$/,        handler: (m) => EH.VerifyView?.render(m[1]) },
      { pattern: /^#\/setup-account\/?(?:\?(.*))?$/, handler: (m) => {
        const params = new URLSearchParams(m[1] || '');
        EH.SetupView?.render(params.get('email'), params.get('token'));
      }},
    ],

    // Authenticated
    authenticated: [
      { path: '#/dashboard',            handler: () => renderDashboard() },
      { path: '#/admin/dashboard',      handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/expert/dashboard',     handler: () => renderDashboard(), guard: 'expert' },
      { path: '#/institution/dashboard',handler: () => renderDashboard(), guard: 'institution' },
      { path: '#/dashboard/users',         handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/dashboard/experts',       handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/dashboard/consultations', handler: () => renderDashboard() },
      { path: '#/dashboard/events',        handler: () => renderDashboard() },
      { path: '#/dashboard/institutions',  handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/dashboard/transactions',  handler: () => renderDashboard() },
      { path: '#/dashboard/payouts',       handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/dashboard/coupons',       handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/dashboard/claims',        handler: () => renderDashboard() },
      { path: '#/dashboard/tickets',       handler: () => renderDashboard() },
      { path: '#/dashboard/reviews',       handler: () => renderDashboard() },
      { path: '#/dashboard/broadcasts',    handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/dashboard/audit',         handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/dashboard/analytics',     handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/dashboard/settings',      handler: () => renderDashboard(), guard: 'admin' },
      { path: '#/dashboard/profile',       handler: () => renderDashboard() },
    ],
  };

  EH.Routes = Routes;

  function renderDashboard() {
    if (typeof EH.DashboardDispatch?.render === 'function') {
      EH.DashboardDispatch.render();
    } else if (typeof global.renderDashboard === 'function') {
      global.renderDashboard();
    }
  }

  EH.RouterRenderDashboard = renderDashboard;
})(window);
