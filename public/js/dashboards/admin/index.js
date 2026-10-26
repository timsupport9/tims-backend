/* ============================================================
   admin/index.js — Admin dashboard module registry & dispatcher
   ============================================================ */
(function () {
  const AD = window.AdminDash = window.AdminDash || { modules: {}, order: [], nav: [] };

  AD.reg = function (id, mod) {
    AD.modules[id] = mod;
    if (!AD.order.includes(id)) AD.order.push(id);
    if (mod.nav) AD.nav.push({ id, ...mod.nav });
  };

  AD.render = function (tab) {
    const mod = AD.modules[tab] || AD.modules.overview;
    return mod ? mod.render() : '<p class="empty-row">Module not loaded.</p>';
  };

  AD.title = function (tab) {
    return AD.modules[tab]?.nav?.label || 'Dashboard';
  };

  AD.sidebarItems = function (badges = {}) {
    return AD.nav.map(n =>
      sidebarItem(n.id, n.label, n.icon, badges[n.id] || 0)
    ).join('');
  };

  AD.handleAction = async function (action, id, el) {
    for (const key of AD.order) {
      const mod = AD.modules[key];
      if (mod.actions && mod.actions[action]) {
        return mod.actions[action]({ id, el, action });
      }
    }
    return false;
  };
})();
