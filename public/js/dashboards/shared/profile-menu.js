/* ============================================================
   dashboards/shared/profile-menu.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    const user = EH.state.currentUser || {};
    return `
      <div class="profile-menu dropdown">
        <button class="profile-menu-trigger" data-dropdown-toggle aria-expanded="false">
          <img src="${EH.Fmt.esc(user.avatar || EH.PublicFormat.avatar(user.name))}" alt="" class="profile-menu-avatar" />
          <span class="profile-menu-name">${EH.Fmt.esc(user.name || '')}</span>
          <i class="fas fa-chevron-down"></i>
        </button>
        <div class="dropdown-panel profile-menu-panel">
          <a href="#/dashboard/profile" class="dropdown-item">
            <i class="fas fa-user"></i> Profile
          </a>
          <button class="dropdown-item" onclick="EH.Theme.toggle()">
            <i class="fas fa-moon"></i> Toggle theme
          </button>
          <button class="dropdown-item dropdown-item-danger" onclick="EH.Auth.logout()">
            <i class="fas fa-right-from-bracket"></i> Sign out
          </button>
        </div>
      </div>`;
  }

  EH.ProfileMenu = { render };
})(window);
