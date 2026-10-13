/* ============================================================
   actions/navigation-actions.js — Tab & navigation actions
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function switchTab(tab, el) {
    EH.state.activeTab = tab || el?.dataset?.tab;
    if (typeof global.rerenderRoleContent === 'function') {
      global.rerenderRoleContent();
    } else if (typeof EH.RerenderContent === 'function') {
      EH.RerenderContent();
    }
  }

  function refreshAll() {
    EH.Loading.show();
    EH.Data.loadAll().then(() => {
      switchTab(EH.state.activeTab);
      EH.Loading.hide();
      EH.Toast.success('Refreshed');
    });
  }

  function paginate(el) {
    const resource = el.dataset.resource;
    const page = Number(el.dataset.page);
    if (EH.state.page[resource] !== undefined) {
      EH.state.page[resource] = page;
      EH.Data.loadAll().then(() => switchTab(EH.state.activeTab));
    }
  }

  function clearSelection(el) {
    const target = el.dataset.target;
    EH.state.selectedRows[target]?.clear();
    switchTab(EH.state.activeTab);
  }

  function exportDashboard() {
    EH.Files.downloadJson('dashboard.json', {
      users: EH.state.users,
      experts: EH.state.experts,
      generated: new Date().toISOString(),
    });
  }

  function exportUsers() {
    global.downloadCsv('users.csv', EH.state.users);
  }

  EH.NavigationActions = {
    switchTab, refreshAll, paginate, clearSelection, exportDashboard, exportUsers,
  };
})(window);
