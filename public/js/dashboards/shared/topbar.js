/* ============================================================
   dashboards/shared/topbar.js — Topbar component
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(roleLabel = 'Dashboard') {
    const user = EH.state.currentUser || {};
    return `
      <header class="topbar">
        <div class="topbar-left">
          <button class="topbar-toggle" data-sidebar-toggle aria-label="Toggle sidebar">
            <i class="fas fa-bars"></i>
          </button>
          <span class="live-indicator"></span>
          <span class="topbar-label">${EH.Fmt.esc(roleLabel)}</span>
        </div>
        <div class="topbar-right">
          <button class="icon-btn" data-theme-toggle aria-label="Toggle theme">
            <i class="fas fa-moon"></i>
          </button>
          <button class="icon-btn" data-notif-toggle aria-label="Notifications">
            <i class="fas fa-bell"></i>
            <span id="notif-badge" class="notif-badge hidden">0</span>
          </button>
          <span class="topbar-user">${EH.Fmt.esc(user.name || roleLabel)}</span>
          <button class="btn btn-danger btn-sm" id="logoutBtn">Logout</button>
          <div id="notif-panel-host"></div>
        </div>
      </header>`;
  }

  function attach(root) {
    if (!root) return;
    const logoutBtn = root.querySelector('#logoutBtn');
    if (logoutBtn) logoutBtn.onclick = () => EH.Auth.logout();

    root.querySelectorAll('[data-theme-toggle]').forEach(b => {
      b.onclick = () => EH.Theme.toggle();
    });

    root.querySelectorAll('[data-notif-toggle]').forEach(b => {
      b.onclick = () => EH.NotificationCenter?.togglePanel?.();
    });
  }

  EH.Topbar = { render, attach };
  // Legacy
  global.topbar = render;
})(window);
