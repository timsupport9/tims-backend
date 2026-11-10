/* ============================================================
   ExpertHub 2.0 — 08-shell.js
   Dashboard dispatcher, app shell, sidebar, topbar,
   notifications panel, chat modal, command palette,
   user menu, keyboard shortcuts, video/audio panel.
   ============================================================ */

/* ============================================================
   DASHBOARD DISPATCHER
   ============================================================ */
function renderDashboard() {
  if (!currentUser) return renderLogin();
  if (currentUserRole === 'admin')       return renderAdminDashboard();
  if (currentUserRole === 'expert')      return renderExpertDashboard();
  if (currentUserRole === 'institution') return renderInstitutionDashboard();
  return renderUserDashboard();
}

/* ============================================================
   SHELL PIECES
   ============================================================ */
function sidebarItem(id, label, icon, badge = 0) {
  const active = activeTab === id;
  return `
    <button class="sidebar-item ${active ? 'sidebar-item-active' : ''}" data-tab="${id}" title="${esc(label)}">
      <i class="fas ${icon} sidebar-icon"></i>
      <span class="sidebar-label">${label}</span>
      ${badge > 0 ? `<span class="sidebar-badge">${badge}</span>` : ''}
      ${active ? '<i class="fas fa-chevron-right sidebar-chevron"></i>' : ''}
    </button>`;
}

function topbar(roleLabel) {
  const roleBadge = {
    admin:       { cls: 'badge-danger',  label: 'Admin' },
    expert:      { cls: 'badge-primary', label: 'Expert' },
    institution: { cls: 'badge-success', label: 'Institution' },
    user:        { cls: 'badge-info',    label: 'Learner' },
  }[currentUserRole] || { cls: 'badge-muted', label: 'User' };

  return `
    <header class="topbar">
      <div class="topbar-left">
        <button class="topbar-toggle" data-sidebar-toggle aria-label="Toggle sidebar">
          <i class="fas fa-bars"></i>
        </button>
        <span class="live-indicator" data-status="online" title="Connection"></span>
        <span class="topbar-label">${roleLabel}</span>
        <span class="badge ${roleBadge.cls}">${roleBadge.label}</span>
      </div>

      <div class="topbar-center">
        <div class="topbar-search">
          <i class="fas fa-search"></i>
          <input id="global-search" placeholder="Search… (Ctrl+K)" autocomplete="off" />
          <div id="global-search-results" class="global-search-results hidden"></div>
        </div>
      </div>

      <div class="topbar-right" style="position:relative">
        <button class="icon-btn" data-command-palette title="Command palette (Ctrl+K)">
          <i class="fas fa-terminal"></i>
        </button>
        <button class="icon-btn" data-theme-toggle title="Toggle theme (Ctrl+Shift+T)">
          <i class="fas fa-moon"></i>
        </button>
        <button class="icon-btn" data-notif-toggle title="Notifications (Ctrl+J)">
          <i class="fas fa-bell"></i>
          <span id="notif-badge" class="notif-badge hidden">0</span>
        </button>
        <button class="user-avatar-btn" data-user-menu-toggle title="${esc(currentUser?.name || '')}">
          <img src="${currentUser?.avatar_url || (CONFIG.DEFAULT_AVATAR + encodeURIComponent(currentUser?.name || 'U'))}"
               alt="avatar" />
          <i class="fas fa-caret-down"></i>
        </button>
        <div id="notif-panel-host"></div>
        <div id="user-menu-host"></div>
      </div>
    </header>`;
}

function shell({ roleClass, brandIcon, brandTitle, brandSubtitle, nav, roleLabel, content }) {
  $('#app-root').innerHTML = `
    <div class="app-shell ${roleClass} ${UI.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <i class="fas ${brandIcon} sidebar-brand-icon"></i>
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-title">${brandTitle}</span>
            <span class="sidebar-brand-subtitle">${brandSubtitle}</span>
          </div>
        </div>
        <nav class="sidebar-nav">${nav}</nav>
        <div class="sidebar-footer">
          <a href="#" class="sidebar-footer-link" data-action="shortcuts">
            <i class="fas fa-keyboard"></i> Shortcuts
          </a>
          <a href="#" class="sidebar-footer-link" data-action="help">
            <i class="fas fa-circle-question"></i> Help and Support
          </a>
          <a href="#" class="sidebar-footer-link" data-action="logout">
            <i class="fas fa-right-from-bracket"></i> Logout
          </a>
        </div>
      </aside>
      <div class="app-main">
        ${topbar(roleLabel)}
        ${renderFeatureBanner()}
        <div class="app-content" id="role-content">${content}</div>
        <footer class="app-footer">
          <span>${new Date().getFullYear()} ExpertHub</span>
          <span class="app-footer-version">v2.0</span>
        </footer>
      </div>
    </div>
    ${renderChatModal()}
    ${renderCommandPalette()}
    ${renderShortcutsHelp()}
    ${renderVideoPanel()}
    ${renderUserMenu()}`;

  attachCommonEvents();
  attachSidebarEvents();
  attachKeyboardShortcuts();
  attachGlobalSearch();
  updateNotificationBadge();
  hydrateUIState();
}

/* ---------- Common event wiring ---------- */
function attachCommonEvents() {
  $('#logoutBtn')?.addEventListener('click', logout);
  $$('[data-sidebar-toggle]').forEach(b => b.onclick = toggleSidebar);
  $$('[data-theme-toggle]').forEach(b => b.onclick = toggleTheme);
  $$('[data-notif-toggle]').forEach(b => b.onclick = toggleNotificationsPanel);
  $$('[data-command-palette]').forEach(b => b.onclick = openCommandPalette);
  $$('[data-user-menu-toggle]').forEach(b => b.onclick = toggleUserMenu);
  $$('[data-action="logout"]').forEach(a => a.onclick = e => { e.preventDefault(); logout(); });
  $$('[data-action="help"]').forEach(a => a.onclick = e => { e.preventDefault(); openHelp(); });
  $$('[data-action="shortcuts"]').forEach(a => a.onclick = e => { e.preventDefault(); toggleShortcutsHelp(); });
}

function attachSidebarEvents() {
  $$('.sidebar-item').forEach(item => item.onclick = () => {
    activeTab = item.dataset.tab;
    $('#sidebar')?.classList.remove('open');
    API_CACHE.invalidate('GET:/api');
    rerenderRoleContent();
  });
}

/* ---------- Sidebar collapse ---------- */
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    $('#sidebar')?.classList.toggle('open');
    return;
  }
  UI.sidebarCollapsed = !UI.sidebarCollapsed;
  localStorage.setItem('sidebar_collapsed', UI.sidebarCollapsed ? '1' : '0');
  document.querySelector('.app-shell')?.classList.toggle('sidebar-collapsed', UI.sidebarCollapsed);
}

/* ============================================================
   NOTIFICATIONS PANEL
   ============================================================ */
function toggleNotificationsPanel() {
  notificationsPanelOpen = !notificationsPanelOpen;
  if (notificationsPanelOpen) renderNotificationsPanel();
  else $('#notif-panel-host').innerHTML = '';
}

function renderNotificationsPanel() {
  const host = $('#notif-panel-host');
  if (!host) return;
  const groups = ['all','unread','consultations','courses','institution','system'];
  const group = UI.notifGroup || 'all';
  const items = S.notifications.filter(n => {
    if (group === 'all') return true;
    if (group === 'unread') return !n.is_read;
    return (n.category || 'system') === group;
  }).slice(0, CONFIG.NOTIFICATION_GROUP_LIMIT);

  const unread = S.notifications.filter(n => !n.is_read).length;

  host.innerHTML = `
    <div class="notif-panel">
      <div class="notif-panel-header">
        <span>Notifications ${unread ? `(${unread})` : ''}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-xs" data-notif-readall>Mark all read</button>
          <button class="btn btn-ghost btn-xs" data-notif-close>&times;</button>
        </div>
      </div>
      <div class="notif-panel-tabs">
        ${groups.map(g => `
          <button class="notif-tab ${g === group ? 'active' : ''}" data-notif-group="${g}">
            ${g[0].toUpperCase() + g.slice(1)}
          </button>`).join('')}
      </div>
      <div class="notif-panel-list">
        ${items.length ? items.map(n => `
          <div class="notif-panel-item ${n.is_read ? '' : 'unread'}" data-notif-id="${n.id}">
            <p class="notif-panel-item-title">${esc(n.title || '')}</p>
            <p class="notif-panel-item-msg">${esc(n.message || '')}</p>
            <p class="notif-panel-item-date">${timeAgo(n.created_at)}</p>
          </div>`).join('')
          : '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>'}
      </div>
    </div>`;

  host.querySelector('[data-notif-close]').onclick = toggleNotificationsPanel;
  host.querySelector('[data-notif-readall]').onclick = async () => {
    try {
      await apiCall('/api/common/notifications/read-all', 'PUT');
      S.notifications.forEach(n => n.is_read = 1);
      Object.keys(UI.unreadByGroup).forEach(k => UI.unreadByGroup[k] = 0);
      renderNotificationsPanel();
      updateNotificationBadge();
    } catch (e) { showToast(e.message, 'error'); }
  };
  host.querySelectorAll('[data-notif-group]').forEach(el => el.onclick = () => {
    UI.notifGroup = el.dataset.notifGroup;
    renderNotificationsPanel();
  });
  host.querySelectorAll('[data-notif-id]').forEach(el => el.onclick = async () => {
    const id = el.dataset.notifId;
    const n = S.notifications.find(x => String(x.id) === id);
    if (n && !n.is_read) {
      try { await apiCall(`/api/common/notifications/${id}/read`, 'PUT'); n.is_read = 1; } catch (_) {}
      renderNotificationsPanel();
      updateNotificationBadge();
    }
    if (n?.link) {
      location.hash = n.link.startsWith('#') ? n.link : `#${n.link}`;
      toggleNotificationsPanel();
    }
  });
}

/* ============================================================
   USER MENU
   ============================================================ */
function renderUserMenu() {
  return `<div id="user-menu" class="user-menu hidden"></div>`;
}
function toggleUserMenu() {
  userMenuOpen = !userMenuOpen;
  const host = $('#user-menu');
  if (!host) return;
  if (!userMenuOpen) { host.classList.add('hidden'); host.innerHTML = ''; return; }
  host.classList.remove('hidden');
  host.innerHTML = `
    <div class="user-menu-header">
      <img src="${currentUser?.avatar_url || (CONFIG.DEFAULT_AVATAR + encodeURIComponent(currentUser?.name || 'U'))}" alt="avatar"/>
      <div>
        <p class="user-menu-name">${esc(currentUser?.name || 'User')}</p>
        <p class="user-menu-email">${esc(currentUser?.email || '')}</p>
      </div>
    </div>
    <button class="user-menu-item" data-um="profile"><i class="fas fa-user"></i> My Profile</button>
    <button class="user-menu-item" data-um="settings"><i class="fas fa-cog"></i> Settings</button>
    <button class="user-menu-item" data-um="billing"><i class="fas fa-credit-card"></i> Billing</button>
    <button class="user-menu-item" data-um="help"><i class="fas fa-circle-question"></i> Help</button>
    <div class="user-menu-divider"></div>
    <button class="user-menu-item danger" data-um="logout"><i class="fas fa-right-from-bracket"></i> Logout</button>`;

  host.querySelectorAll('[data-um]').forEach(b => b.onclick = () => {
    const action = b.dataset.um;
    if (action === 'logout') return logout();
    if (action === 'help') return openHelp();
    activeTab = action;
    userMenuOpen = false;
    toggleUserMenu();
    rerenderRoleContent();
  });
  document.addEventListener('click', function _close(e) {
    if (!host.contains(e.target) && !e.target.closest('[data-user-menu-toggle]')) {
      userMenuOpen = false;
      host.classList.add('hidden');
      document.removeEventListener('click', _close);
    }
  });
}

/* ============================================================
   FEATURE ANNOUNCEMENT BANNER
   ============================================================ */
function showFeatureBanner({ text, level = 'info', dismissible = true, id = 'default' }) {
  UI.featureBanner = { text, level, dismissible, id };
  renderFeatureBanner(true);
}
function renderFeatureBanner(replace = false) {
  const b = UI.featureBanner;
  if (!b) return '';
  if (b.dismissible && announceBannerDismissed === b.id) return '';
  return `
    <div class="feature-banner feature-banner-${b.level}" data-banner-id="${b.id}">
      <span>${esc(b.text)}</span>
      ${b.dismissible ? `<button class="icon-btn" data-banner-dismiss="1" title="Dismiss"><i class="fas fa-times"></i></button>` : ''}
    </div>`;
}
function hydrateUIState() {
  $$('[data-banner-dismiss]').forEach(btn => btn.onclick = () => {
    announceBannerDismissed = btn.closest('.feature-banner').dataset.bannerId;
    localStorage.setItem('announce_dismissed', announceBannerDismissed);
    btn.closest('.feature-banner')?.remove();
  });
  document.documentElement.dataset.theme = UI.theme;
  updateConnectionBadge(socketConnected ? 'online' : 'offline');
}

/* ============================================================
   COMMAND PALETTE
   ============================================================ */
function renderCommandPalette() {
  return `
    <div id="command-palette" class="command-palette hidden" role="dialog">
      <div class="command-palette-inner">
        <div class="command-palette-input-row">
          <i class="fas fa-terminal"></i>
          <input id="command-input" placeholder="Type a command or search…" autocomplete="off" />
          <kbd>Esc</kbd>
        </div>
        <div id="command-list" class="command-list"></div>
      </div>
    </div>`;
}

function openCommandPalette() {
  if (!CONFIG.FEATURES.commandPalette) return;
  const host = $('#command-palette');
  if (!host) return;
  host.classList.remove('hidden');
  UI.paletteOpen = true;
  const input = $('#command-input');
  input.value = '';
  input.focus();
  input.oninput = () => renderCommandList(input.value);
  input.onkeydown = e => handleCommandKey(e, input.value);
  renderCommandList('');
}

function closeCommandPalette() {
  UI.paletteOpen = false;
  $('#command-palette')?.classList.add('hidden');
}

function commandItems() {
  const items = [];
  const roleMenus = {
    admin: [
      ['dashboard','Dashboard','fa-gauge'], ['users','Users','fa-users'],
      ['experts','Experts','fa-user-tie'], ['consultations','Consultations','fa-comments'],
      ['transactions','Transactions','fa-receipt'], ['payouts','Payouts','fa-money-bill-transfer'],
      ['institutions','Institutions','fa-building'], ['claims','Claims','fa-file-shield'],
      ['tickets','Tickets','fa-life-ring'], ['auditLogs','Audit Logs','fa-clipboard-list'],
    ],
    expert: [
      ['dashboard','Dashboard','fa-gauge'], ['consultations','Consultations','fa-comments'],
      ['availability','Availability','fa-calendar'], ['questions','Questions','fa-question'],
      ['earnings','Earnings','fa-chart-line'], ['portfolio','Portfolio','fa-briefcase'],
      ['reviews','Reviews','fa-star'],
    ],
    user: [
      ['dashboard','Dashboard','fa-gauge'], ['experts','Find Experts','fa-user-tie'],
      ['consultations','My Consultations','fa-comments'], ['courses','Courses','fa-book'],
      ['certificates','Certificates','fa-award'], ['wallet','Wallet','fa-wallet'],
    ],
    institution: [
      ['overview','Overview','fa-gauge'], ['programmes','Programmes','fa-book'],
      ['cohorts','Cohorts','fa-users-rectangle'], ['trainees','Trainees','fa-users'],
      ['instructors','Instructors','fa-user-tie'], ['assessments','Assessments','fa-file-pen'],
      ['certificates','Certificates','fa-award'], ['analytics','Analytics','fa-chart-pie'],
      ['budgets','Budgets','fa-coins'], ['compliance','Compliance','fa-shield'],
      ['succession','Succession','fa-sitemap'], ['wellness','Wellness','fa-heart-pulse'],
      ['apiKeys','API & Webhooks','fa-key'], ['announcements','Announcements','fa-bullhorn'],
      ['settings','Settings','fa-cog'],
    ],
  };
  (roleMenus[currentUserRole] || roleMenus.user).forEach(([id, label, icon]) => {
    items.push({ kind: 'nav', id, label, icon, run: () => { activeTab = id; rerenderRoleContent(); closeCommandPalette(); } });
  });

  items.push(
    { kind: 'action', id: 'toggle-theme', label: 'Toggle theme', icon: 'fa-moon', run: () => { toggleTheme(); closeCommandPalette(); } },
    { kind: 'action', id: 'toggle-notifications', label: 'Open notifications', icon: 'fa-bell', run: () => { toggleNotificationsPanel(); closeCommandPalette(); } },
    { kind: 'action', id: 'shortcuts', label: 'Keyboard shortcuts', icon: 'fa-keyboard', run: () => { toggleShortcutsHelp(); closeCommandPalette(); } },
    { kind: 'action', id: 'help', label: 'Help & support', icon: 'fa-circle-question', run: () => { openHelp(); closeCommandPalette(); } },
    { kind: 'action', id: 'logout', label: 'Logout', icon: 'fa-right-from-bracket', run: () => logout() },
  );
  return items;
}

function renderCommandList(query) {
  const host = $('#command-list');
  if (!host) return;
  const q = (query || '').trim().toLowerCase();
  const items = commandItems()
    .filter(i => !q || i.label.toLowerCase().includes(q))
    .slice(0, CONFIG.COMMAND_PALETTE_LIMIT);
  UI.commandCursor = 0;
  if (!items.length) {
    host.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>No commands match</p></div>`;
    return;
  }
  host.innerHTML = items.map((i, idx) => `
    <button class="command-item ${idx === 0 ? 'active' : ''}" data-cmd="${i.id}">
      <i class="fas ${i.icon}"></i>
      <span>${esc(i.label)}</span>
      <span class="command-kind">${i.kind}</span>
    </button>`).join('');
  host.querySelectorAll('[data-cmd]').forEach((el, idx) => {
    el.onclick = () => items[idx].run();
    el.onmouseenter = () => {
      UI.commandCursor = idx;
      host.querySelectorAll('.command-item').forEach((n, j) => n.classList.toggle('active', j === idx));
    };
  });
  host._items = items;
}

function handleCommandKey(e, query) {
  const items = $('#command-list')?._items || [];
  if (e.key === 'Escape') { closeCommandPalette(); return; }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    UI.commandCursor = Math.min(UI.commandCursor + 1, items.length - 1);
    applyCommandCursor();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    UI.commandCursor = Math.max(UI.commandCursor - 1, 0);
    applyCommandCursor();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    items[UI.commandCursor]?.run();
  }
}

function applyCommandCursor() {
  $$('#command-list .command-item').forEach((el, i) =>
    el.classList.toggle('active', i === UI.commandCursor));
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
function attachKeyboardShortcuts() {
  if (!CONFIG.FEATURES.keyboardShortcuts) return;
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();

    if (mod && k === 'k') { e.preventDefault(); openCommandPalette(); return; }
    if (mod && k === 'j') { e.preventDefault(); toggleNotificationsPanel(); return; }
    if (mod && k === 'b') { e.preventDefault(); toggleSidebar(); return; }
    if (mod && e.shiftKey && k === 't') { e.preventDefault(); toggleTheme(); return; }
    if (mod && k === '/') { e.preventDefault(); toggleShortcutsHelp(); return; }
    if (k === 'escape') {
      closeCommandPalette();
      if (userMenuOpen) toggleUserMenu();
      if (shortcutsHelpOpen) toggleShortcutsHelp();
      if (notificationsPanelOpen) toggleNotificationsPanel();
      closeChat();
      if (activeVideoSession) endVideoSession();
    }
  });
}

/* ============================================================
   SHORTCUTS HELP
   ============================================================ */
function renderShortcutsHelp() {
  return `
    <div id="shortcuts-help" class="modal-overlay hidden">
      <div class="modal-content modal-sm">
        <header class="modal-header">
          <h3>Keyboard shortcuts</h3>
          <button class="icon-btn" data-close-shortcuts><i class="fas fa-times"></i></button>
        </header>
        <div class="modal-body">
          <table class="shortcuts-table">
            <tr><td><kbd>Ctrl</kbd>+<kbd>K</kbd></td><td>Command palette</td></tr>
            <tr><td><kbd>Ctrl</kbd>+<kbd>J</kbd></td><td>Toggle notifications</td></tr>
            <tr><td><kbd>Ctrl</kbd>+<kbd>B</kbd></td><td>Toggle sidebar</td></tr>
            <tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd></td><td>Toggle theme</td></tr>
            <tr><td><kbd>Ctrl</kbd>+<kbd>/</kbd></td><td>This help</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>Close overlays</td></tr>
          </table>
        </div>
      </div>
    </div>`;
}
function toggleShortcutsHelp() {
  shortcutsHelpOpen = !shortcutsHelpOpen;
  const el = $('#shortcuts-help');
  if (!el) return;
  el.classList.toggle('hidden', !shortcutsHelpOpen);
  if (shortcutsHelpOpen) {
    el.querySelector('[data-close-shortcuts]')?.addEventListener('click', toggleShortcutsHelp, { once: true });
  }
}

/* ============================================================
   GLOBAL SEARCH
   ============================================================ */
function attachGlobalSearch() {
  const input = $('#global-search');
  const results = $('#global-search-results');
  if (!input || !results) return;
  input.oninput = () => {
    clearTimeout(globalSearchTimer);
    const q = input.value.trim();
    globalSearchTimer = setTimeout(() => runGlobalSearch(q, results), CONFIG.DEBOUNCE_SEARCH_MS);
  };
  input.onfocus = () => { if (input.value.trim()) runGlobalSearch(input.value.trim(), results); };
  input.onkeydown = e => {
    if (e.key === 'Escape') { results.classList.add('hidden'); input.blur(); }
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) {
        globalSearchQuery = q;
        location.hash = `#search?q=${encodeURIComponent(q)}`;
        results.classList.add('hidden');
      }
    }
  };
  document.addEventListener('click', e => {
    if (!e.target.closest('.topbar-search')) results.classList.add('hidden');
  });
}

async function runGlobalSearch(q, host) {
  if (!q) { host.classList.add('hidden'); return; }
  try {
    const data = await apiCall(`/api/common/search?q=${encodeURIComponent(q)}`, 'GET');
    globalSearchResults = data.results || [];
  } catch (e) {
    globalSearchResults = [];
  }
  host.innerHTML = globalSearchResults.length
    ? globalSearchResults.slice(0, 10).map(r => `
        <a class="search-result-item" href="#${r.link || '#'}">
          <i class="fas ${r.icon || 'fa-search'}"></i>
          <div>
            <p class="search-result-title">${esc(r.title)}</p>
            <p class="search-result-sub">${esc(r.subtitle || '')}</p>
          </div>
        </a>`).join('')
    : `<div class="empty-row">No matches for “${esc(q)}”</div>`;
  host.classList.remove('hidden');
}

/* ============================================================
   CHAT MODAL (expanded: audio/video/screen-share + attachments)
   ============================================================ */
function renderChatModal() {
  return `
    <div id="chat-modal" class="modal-overlay hidden">
      <div class="modal-content chat-modal">
        <header class="chat-header">
          <div class="chat-header-title">
            <img id="chat-avatar" class="chat-avatar" src="${CONFIG.DEFAULT_AVATAR}Peer" alt="" />
            <div>
              <h3 class="chat-title" id="chat-title">Consultation</h3>
              <p class="chat-sub" id="chat-sub"></p>
            </div>
          </div>
          <div class="chat-header-actions">
            <button class="icon-btn" data-action="chat-audio" title="Audio call">
              <i class="fas fa-phone"></i></button>
            <button class="icon-btn" data-action="open-video" title="Video call">
              <i class="fas fa-video"></i></button>
            <button class="icon-btn" data-action="chat-files" title="Shared files">
              <i class="fas fa-folder-open"></i></button>
            <button class="icon-btn" data-chat-close title="Close">
              <i class="fas fa-times"></i></button>
          </div>
        </header>
        <div id="chat-messages" class="chat-messages"></div>
        <div class="chat-typing" id="chat-typing"></div>
        <div class="chat-input-row">
          <label class="chat-attach" title="Attach file">
            <i class="fas fa-paperclip"></i>
            <input type="file" hidden id="chat-file" />
          </label>
          <input id="chat-input" class="form-input" placeholder="Type your message…" />
          <button class="btn btn-primary" data-action="send-chat">
            <i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    </div>`;
}

function renderChatMessages(cid) {
  const c = $('#chat-messages');
  if (!c) return;
  const msgs = S.chatMessages[cid] || [];
  c.innerHTML = msgs.map(m => `
    <div class="chat-message ${m.sender_id === currentUser?.id ? 'chat-message-sent' : 'chat-message-received'}">
      ${m.attachment_url ? `
        <a class="chat-attachment" href="${esc(m.attachment_url)}" target="_blank">
          <i class="fas fa-paperclip"></i> ${esc(m.attachment_name || 'Attachment')}</a>` : ''}
      <p class="chat-text">${esc(m.message || '')}</p>
      <span class="chat-meta">
        ${esc(m.sender_name || '')} · ${timeAgo(m.created_at)}${m.read_at ? ' · Read' : ''}
      </span>
    </div>`).join('') || '<p class="empty-row">No messages yet.</p>';
  c.scrollTop = c.scrollHeight;
}

async function openChat(cid) {
  currentChatId = cid;
  const modal = $('#chat-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  const c = S.consultations.find(x => x.id === cid);
  $('#chat-title').textContent = c?.title || 'Consultation';
  $('#chat-sub').textContent = `${c?.status || ''} · ${c?.consultation_type || ''}`;
  const avatar = $('#chat-avatar');
  if (avatar) avatar.src = c?.peer_avatar || (CONFIG.DEFAULT_AVATAR + encodeURIComponent(c?.peer_name || 'Peer'));
  if (socket) socket.emit('join_consultation', cid);
  try {
    const d = await apiCall(`/api/common/consultations/${cid}/messages`);
    S.chatMessages[cid] = d.messages || [];
  } catch (_) { S.chatMessages[cid] = S.chatMessages[cid] || []; }
  renderChatMessages(cid);

  const input = $('#chat-input');
  input.onkeydown = e => {
    if (e.key === 'Enter') { sendMessage(cid, e.target.value); return; }
    if (socket) socket.emit('typing', { consultation_id: cid, is_typing: true });
    clearTimeout(chatTypingTimer);
    chatTypingTimer = setTimeout(() => socket && socket.emit('typing', { consultation_id: cid, is_typing: false }), 1200);
  };
  $('#chat-file').onchange = e => uploadChatFile(cid, e.target.files[0]);

  // Action buttons
  modal.querySelector('[data-action="chat-audio"]')?.addEventListener('click', () => startVideoSession(cid, 'audio'), { once: true });
  modal.querySelector('[data-action="open-video"]')?.addEventListener('click', () => startVideoSession(cid, 'video'), { once: true });
  modal.querySelector('[data-action="chat-files"]')?.addEventListener('click', () => showChatFiles(cid), { once: true });
  modal.querySelector('[data-action="send-chat"]')?.addEventListener('click', () => sendMessage(cid, $('#chat-input').value), { once: true });
  modal.querySelector('[data-chat-close]')?.addEventListener('click', closeChat, { once: true });
}

function closeChat() {
  if (currentChatId && socket) socket.emit('leave_consultation', currentChatId);
  $('#chat-modal')?.classList.add('hidden');
  currentChatId = null;
}

async function sendMessage(cid, text) {
  if (!text?.trim()) return;
  try {
    await apiCall(`/api/common/consultations/${cid}/messages`, 'POST', { message: text });
    const i = $('#chat-input');
    if (i) i.value = '';
  } catch (e) { showToast(e.message, 'error'); }
}

async function uploadChatFile(cid, file) {
  if (!file) return;
  if (file.size > CONFIG.UPLOAD_MAX_MB * 1024 * 1024) {
    return showToast(`File exceeds ${CONFIG.UPLOAD_MAX_MB}MB limit`, 'error');
  }
  const fd = new FormData();
  fd.append('attachments', file);
  try {
    showLoading(true);
    await apiUpload(`/api/common/consultations/${cid}/attachments`, fd, pct => {
      const btn = document.querySelector('[data-action="send-chat"]');
      if (btn) btn.textContent = `${pct}%`;
    });
    showToast('File uploaded', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

async function showChatFiles(cid) {
  try {
    const data = await apiCall(`/api/common/consultations/${cid}/attachments`);
    const files = data.attachments || [];
    showModal({
      title: 'Shared files',
      body: files.length
        ? `<ul class="file-list">${files.map(f => `
            <li>
              <a href="${esc(f.url)}" target="_blank" download>
                <i class="fas fa-file"></i> ${esc(f.name)}
              </a>
              <span class="file-list-meta">${timeAgo(f.created_at)}</span>
            </li>`).join('')}</ul>`
        : '<p class="empty-row">No shared files yet.</p>',
      actions: [{ label: 'Close', variant: 'ghost', onClick: closeModal }],
    });
  } catch (e) { showToast(e.message, 'error'); }
}

/* ============================================================
   VIDEO / AUDIO PANEL
   ============================================================ */
function renderVideoPanel() {
  return `
    <div id="video-panel" class="video-panel hidden">
      <div class="video-panel-grid">
        <div class="video-remote"><video id="video-remote" autoplay playsinline></video></div>
        <div class="video-local"><video id="video-local" autoplay playsinline muted></video></div>
      </div>
      <div class="video-controls">
        <button class="video-btn" data-video-mic><i class="fas fa-microphone"></i></button>
        <button class="video-btn" data-video-cam><i class="fas fa-video"></i></button>
        <button class="video-btn" data-video-screen><i class="fas fa-desktop"></i></button>
        <button class="video-btn" data-video-record><i class="fas fa-circle"></i></button>
        <button class="video-btn danger" data-video-end><i class="fas fa-phone-slash"></i></button>
      </div>
    </div>`;
}
function showVideoPanel(consultationId, type) {
  const panel = $('#video-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.querySelector('[data-video-end]').onclick = () => endVideoSession();
  panel.querySelector('[data-video-screen]').onclick = () => startScreenShare(consultationId);
  panel.querySelector('[data-video-mic]').onclick = e => {
    const on = e.currentTarget.classList.toggle('muted');
    localMediaStream?.getAudioTracks().forEach(t => t.enabled = !on);
  };
  panel.querySelector('[data-video-cam]').onclick = e => {
    const on = e.currentTarget.classList.toggle('muted');
    localMediaStream?.getVideoTracks().forEach(t => t.enabled = !on);
  };
  panel.querySelector('[data-video-record]').onclick = e => {
    const rec = e.currentTarget.classList.toggle('recording');
    if (socket) socket.emit(rec ? 'webrtc:recording_started' : 'webrtc:recording_stopped', { consultation_id: consultationId });
  };
}
function hideVideoPanel() {
  $('#video-panel')?.classList.add('hidden');
}