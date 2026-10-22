/* ============================================================
   ExpertHub 2.0 — 08-shell.js
   Dashboard dispatcher, app shell, sidebar, notifications panel,
   chat modal.
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

/* ---------- SHELL PIECES ---------- */
function sidebarItem(id, label, icon, badge=0) {
  const active = activeTab === id;
  return `
    <button class="sidebar-item ${active ? 'sidebar-item-active' : ''}" data-tab="${id}">
      <i class="fas ${icon} sidebar-icon"></i>
      <span class="sidebar-label">${label}</span>
      ${badge > 0 ? `<span class="sidebar-badge">${badge}</span>` : ''}
      ${active ? '<i class="fas fa-chevron-right sidebar-chevron"></i>' : ''}
    </button>`;
}
function topbar(roleLabel) {
  return `
    <header class="topbar">
      <div class="topbar-left">
        <button class="topbar-toggle" data-sidebar-toggle><i class="fas fa-bars"></i></button>
        <span class="live-indicator"></span>
        <span class="topbar-label">${roleLabel}</span>
      </div>
      <div class="topbar-right" style="position:relative">
        <button class="icon-btn" data-theme-toggle title="Toggle theme"><i class="fas fa-moon"></i></button>
        <button class="icon-btn" data-notif-toggle title="Notifications">
          <i class="fas fa-bell"></i>
          <span id="notif-badge" class="notif-badge hidden">0</span>
        </button>
        <span class="topbar-user">${esc(currentUser?.name || roleLabel)}</span>
        <button class="btn btn-danger btn-sm" id="logoutBtn">Logout</button>
        <div id="notif-panel-host"></div>
      </div>
    </header>`;
}
function shell({ roleClass, brandIcon, brandTitle, brandSubtitle, nav, roleLabel, content }) {
  $('#app-root').innerHTML = `
    <div class="app-shell ${roleClass}">
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
          <a href="#" class="sidebar-footer-link" data-action="help"><i class="fas fa-circle-question"></i> Help and Support</a>
        </div>
      </aside>
      <div class="app-main">
        ${topbar(roleLabel)}
        <div class="app-content" id="role-content">${content}</div>
        <footer class="app-footer">
          <span>${new Date().getFullYear()} ExpertHub</span>
          <span class="app-footer-version">v2.0</span>
        </footer>
      </div>
    </div>
    ${renderChatModal()}`;
  attachCommonEvents();
  attachSidebarEvents();
  updateNotificationBadge();
}
function attachCommonEvents() {
  $('#logoutBtn')?.addEventListener('click', logout);
  $$('[data-sidebar-toggle]').forEach(b => b.onclick = () => $('#sidebar')?.classList.toggle('open'));
  $$('[data-theme-toggle]').forEach(b => b.onclick = toggleTheme);
  $$('[data-notif-toggle]').forEach(b => b.onclick = toggleNotificationsPanel);
}
function attachSidebarEvents() {
  $$('.sidebar-item').forEach(item => item.onclick = () => {
    activeTab = item.dataset.tab;
    $('#sidebar')?.classList.remove('open');
    rerenderRoleContent();
  });
}

/* ---------- Notification panel ---------- */
function toggleNotificationsPanel() {
  notificationsPanelOpen = !notificationsPanelOpen;
  if (notificationsPanelOpen) renderNotificationsPanel();
  else $('#notif-panel-host').innerHTML = '';
}
function renderNotificationsPanel() {
  const host = $('#notif-panel-host');
  if (!host) return;
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
      <div class="notif-panel-list">
        ${S.notifications.length ? S.notifications.slice(0,30).map(n => `
          <div class="notif-panel-item ${n.is_read ? '' : 'unread'}" data-notif-id="${n.id}">
            <p class="notif-panel-item-title">${esc(n.title || '')}</p>
            <p class="notif-panel-item-msg">${esc(n.message || '')}</p>
            <p class="notif-panel-item-date">${timeAgo(n.created_at)}</p>
          </div>`).join('') : '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>'}
      </div>
    </div>`;
  host.querySelector('[data-notif-close]').onclick = toggleNotificationsPanel;
  host.querySelector('[data-notif-readall]').onclick = async () => {
    try {
      await apiCall('/api/common/notifications/read-all', 'PUT');
      S.notifications.forEach(n => n.is_read = 1);
      renderNotificationsPanel();
      updateNotificationBadge();
    } catch (e) { showToast(e.message, 'error'); }
  };
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
   CHAT MODAL
   ============================================================ */
function renderChatModal() {
  return `
    <div id="chat-modal" class="modal-overlay hidden">
      <div class="modal-content chat-modal">
        <header class="chat-header">
          <div>
            <h3 class="chat-title" id="chat-title">Consultation</h3>
            <p class="chat-sub" id="chat-sub"></p>
          </div>
          <div class="chat-header-actions">
            <button class="icon-btn" data-action="open-video" title="Video call">
              <i class="fas fa-video"></i></button>
            <button class="icon-btn" data-chat-close title="Close">
              <i class="fas fa-times"></i></button>
          </div>
        </header>
        <div id="chat-messages" class="chat-messages"></div>
        <div class="chat-typing" id="chat-typing"></div>
        <div class="chat-input-row">
          <label class="chat-attach">
            <i class="fas fa-paperclip"></i>
            <input type="file" hidden id="chat-file" />
          </label>
          <input id="chat-input" class="form-input" placeholder="Type your message..." />
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
          <i class="fas fa-paperclip"></i> Attachment</a>
      ` : ''}
      <p class="chat-text">${esc(m.message || '')}</p>
      <span class="chat-meta">${esc(m.sender_name || '')} · ${timeAgo(m.created_at)}${m.read_at ? ' - Read' : ''}</span>
    </div>
  `).join('') || '<p class="empty-row">No messages yet.</p>';
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
  if (socket) socket.emit('join_consultation', cid);
  try {
    const d = await apiCall(`/api/common/consultations/${cid}/messages`);
    S.chatMessages[cid] = d.messages || [];
  } catch (_) { S.chatMessages[cid] = []; }
  renderChatMessages(cid);
  const input = $('#chat-input');
  input.onkeydown = e => {
    if (e.key === 'Enter') { sendMessage(cid, e.target.value); return; }
    if (socket) socket.emit('typing', { consultation_id: cid, is_typing: true });
    clearTimeout(chatTypingTimer);
    chatTypingTimer = setTimeout(() => socket && socket.emit('typing', { consultation_id: cid, is_typing: false }), 1200);
  };
  $('#chat-file').onchange = e => uploadChatFile(cid, e.target.files[0]);
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
  const fd = new FormData();
  fd.append('attachments', file);
  try {
    showLoading(true);
    await apiCall(`/api/common/consultations/${cid}/attachments`, 'POST', fd, true);
    showToast('File uploaded', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
