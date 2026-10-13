/* ============================================================
   actions/action-dispatcher.js — Global click delegation
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  let boundHandler = null;

  function attach() {
    if (boundHandler) document.removeEventListener('click', boundHandler);
    boundHandler = async (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const action = t.dataset.action;
      const id = t.dataset.id;
      if (typeof EH.handleAction !== 'function') return;
      try {
        await EH.handleAction(action, id, t, e);
      } catch (ex) {
        EH.Logger?.error?.('Action failed', { action, err: ex.message });
        EH.Toast.error(ex.message || 'Action failed');
      }
    };
    document.addEventListener('click', boundHandler);
  }

  EH.DashboardActions = { attach };
  global.attachRoleEvents = attach;
})(window);
