/* ============================================================
   dashboards/shared/sidebar.js — Sidebar component
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function brand({ icon = 'fa-graduation-cap', title = 'ExpertHub', subtitle = '' }) {
    return `
      <div class="sidebar-brand">
        <i class="fas ${icon} sidebar-brand-icon"></i>
        <div class="sidebar-brand-text">
          <span class="sidebar-brand-title">${EH.Fmt.esc(title)}</span>
          ${subtitle ? `<span class="sidebar-brand-subtitle">${EH.Fmt.esc(subtitle)}</span>` : ''}
        </div>
      </div>`;
  }

  function item(id, label, icon, badge = 0, activeTab = null) {
    const active = activeTab === id || EH.state.activeTab === id;
    return `
      <button class="sidebar-item ${active ? 'sidebar-item-active' : ''}"
              data-tab="${id}" aria-current="${active ? 'page' : 'false'}">
        <i class="fas ${icon} sidebar-icon"></i>
        <span class="sidebar-label">${EH.Fmt.esc(label)}</span>
        ${badge > 0 ? `<span class="sidebar-badge">${badge}</span>` : ''}
        ${active ? '<i class="fas fa-chevron-right sidebar-chevron"></i>' : ''}
      </button>`;
  }

  function footer() {
    return `
      <div class="sidebar-footer">
        <a href="#" class="sidebar-footer-link" data-action="help">
          <i class="fas fa-circle-question"></i> Help and Support
        </a>
      </div>`;
  }

  function attach(root) {
    if (!root) return;
    root.querySelectorAll('.sidebar-item').forEach(item => {
      item.onclick = () => {
        EH.state.activeTab = item.dataset.tab;
        document.getElementById('sidebar')?.classList.remove('open');
        if (typeof EH.RerenderContent === 'function') EH.RerenderContent();
        else if (typeof global.rerenderRoleContent === 'function') global.rerenderRoleContent();
      };
    });
    const toggles = root.querySelectorAll('[data-sidebar-toggle]');
    toggles.forEach(t => {
      t.onclick = () => document.getElementById('sidebar')?.classList.toggle('open');
    });
  }

  EH.Sidebar = { brand, item, footer, attach };
  // Legacy
  global.sidebarItem = item;
})(window);
