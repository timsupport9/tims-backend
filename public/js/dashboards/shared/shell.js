/* ============================================================
   dashboards/shared/shell.js — App shell wrapper
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const Sidebar = EH.Sidebar;
  const Topbar  = EH.Topbar;
  const Footer  = EH.DashboardFooter || { render: () => '' };

  function render({ roleClass, brandIcon, brandTitle, brandSubtitle, nav, roleLabel, content }) {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="app-shell ${roleClass || ''}">
        <aside class="sidebar" id="sidebar">
          ${Sidebar.brand({ icon: brandIcon, title: brandTitle, subtitle: brandSubtitle })}
          <nav class="sidebar-nav" aria-label="Main navigation">
            ${nav}
          </nav>
          ${Sidebar.footer()}
        </aside>
        <div class="app-main">
          ${Topbar.render(roleLabel)}
          <div class="app-content" id="role-content" role="region" aria-live="polite">
            ${content}
          </div>
          <footer class="app-footer">
            <span>${new Date().getFullYear()} ExpertHub</span>
            <span class="app-footer-version">v${EH.CONFIG.APP_VERSION}</span>
          </footer>
        </div>
      </div>
      ${EH.ChatModal?.render?.() || ''}`;

    Topbar.attach(root);
    Sidebar.attach(root);
    EH.NotificationCenter?.updateBadge?.();
    EH.Tooltip?.init?.(root);
  }

  EH.DashboardShell = { render };
})(window);
