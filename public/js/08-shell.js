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

/* ============================================================
   ExpertHub 2.0 — 08 Feature Expansion
   Application Shell Enhancements
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature08;
  if (NS) return;

  const namespace = {
    name: "Application Shell Enhancements",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["sidebar state", "breadcrumb builder", "global search", "command palette", "notification drawer", "chat state", "recent pages", "favorite pages", "quick actions", "workspace switcher", "responsive sidebar", "session banner", "connection banner", "unsaved changes guard", "keyboard shortcuts", "activity timeline", "help center launcher", "support widget", "shell diagnostics", "workspace preferences"],
    registry: new Map(),
    listeners: new Map(),
    metrics: {
      calls: 0,
      successes: 0,
      failures: 0,
      startedAt: Date.now(),
      lastActionAt: null
    },
    config: {
      storagePrefix: 'experthub.feature.08.',
      maxHistory: 80,
      debounceMs: 250,
      staleAfterMs: 5 * 60 * 1000,
      debug: false
    }
  };

  function now() { return Date.now(); }

  function key(name) {
    return namespace.config.storagePrefix + String(name);
  }

  function safeClone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function safeParse(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value); }
    catch (_) { return fallback; }
  }

  function emit(eventName, payload) {
    const handlers = namespace.listeners.get(eventName) || [];
    handlers.slice().forEach(fn => {
      try { fn(payload); } catch (error) { console.error('[ExpertHub]', eventName, error); }
    });
    try {
      document.dispatchEvent(new CustomEvent('eh:08:' + eventName, { detail: payload }));
    } catch (_) {}
  }

  function on(eventName, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!namespace.listeners.has(eventName)) namespace.listeners.set(eventName, []);
    namespace.listeners.get(eventName).push(handler);
    return () => off(eventName, handler);
  }

  function off(eventName, handler) {
    const list = namespace.listeners.get(eventName) || [];
    namespace.listeners.set(eventName, list.filter(fn => fn !== handler));
  }

  function save(name, value, ttl = null) {
    const packet = { value: safeClone(value), savedAt: now(), expiresAt: ttl ? now() + ttl : null };
    try { localStorage.setItem(key(name), JSON.stringify(packet)); emit('saved', { name, packet }); return true; }
    catch (error) { console.warn('[ExpertHub] storage save failed', error); return false; }
  }

  function load(name, fallback = null) {
    try {
      const packet = safeParse(localStorage.getItem(key(name)), null);
      if (!packet) return fallback;
      if (packet.expiresAt && packet.expiresAt < now()) {
        localStorage.removeItem(key(name));
        return fallback;
      }
      return packet.value;
    } catch (_) { return fallback; }
  }

  function remove(name) {
    try { localStorage.removeItem(key(name)); emit('removed', { name }); return true; }
    catch (_) { return false; }
  }

  function register(name, definition = {}) {
    if (!name) throw new Error('Feature name is required');
    const item = {
      name,
      enabled: definition.enabled !== false,
      category: definition.category || 'general',
      description: definition.description || '',
      permissions: Array.isArray(definition.permissions) ? definition.permissions : [],
      handler: typeof definition.handler === 'function' ? definition.handler : null,
      validate: typeof definition.validate === 'function' ? definition.validate : null,
      metadata: definition.metadata || {},
      createdAt: new Date().toISOString()
    };
    namespace.registry.set(name, item);
    emit('registered', item);
    return item;
  }

  function unregister(name) {
    const existed = namespace.registry.delete(name);
    if (existed) emit('unregistered', { name });
    return existed;
  }

  function list(filter = {}) {
    let rows = Array.from(namespace.registry.values());
    if (filter.category) rows = rows.filter(x => x.category === filter.category);
    if (filter.enabled !== undefined) rows = rows.filter(x => x.enabled === filter.enabled);
    if (filter.query) {
      const q = String(filter.query).toLowerCase();
      rows = rows.filter(x => (x.name + ' ' + x.description).toLowerCase().includes(q));
    }
    return rows;
  }

  function hasPermission(item) {
    if (!item.permissions.length) return true;
    const role = window.currentUserRole || window.currentUser?.role || '';
    const permissions = window.currentUser?.permissions || [];
    return item.permissions.includes(role) || item.permissions.some(p => permissions.includes(p));
  }

  async function execute(name, payload = {}, context = {}) {
    const item = namespace.registry.get(name);
    if (!item) throw new Error('Unknown feature: ' + name);
    if (!item.enabled) throw new Error('Feature disabled: ' + name);
    if (!hasPermission(item)) throw new Error('Permission denied: ' + name);
    if (item.validate) {
      const result = await item.validate(payload, context);
      if (result === false) throw new Error('Validation failed: ' + name);
      if (typeof result === 'string') throw new Error(result);
    }
    namespace.metrics.calls++;
    namespace.metrics.lastActionAt = new Date().toISOString();
    try {
      const result = item.handler ? await item.handler(payload, context) : payload;
      namespace.metrics.successes++;
      emit('executed', { name, payload, result });
      return result;
    } catch (error) {
      namespace.metrics.failures++;
      emit('failed', { name, payload, error });
      throw error;
    }
  }

  function memoize(fn, ttl = 30000) {
    let timestamp = 0;
    let cached;
    let cachedArgs = '';
    return function (...args) {
      const signature = JSON.stringify(args);
      if (signature === cachedArgs && now() - timestamp < ttl) return cached;
      cachedArgs = signature;
      timestamp = now();
      cached = fn.apply(this, args);
      return cached;
    };
  }

  function debounce(fn, wait = namespace.config.debounceMs) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, wait = namespace.config.debounceMs) {
    let ready = true;
    let queued = null;
    return function (...args) {
      if (!ready) { queued = args; return; }
      ready = false;
      fn.apply(this, args);
      setTimeout(() => {
        ready = true;
        if (queued) { const next = queued; queued = null; fn.apply(this, next); }
      }, wait);
    };
  }

  function validateObject(value, rules = {}) {
    const errors = {};
    Object.entries(rules).forEach(([field, rule]) => {
      const v = value?.[field];
      if (rule.required && (v === undefined || v === null || String(v).trim() === '')) errors[field] = 'Required';
      if (v !== undefined && v !== null && rule.minLength && String(v).length < rule.minLength) errors[field] = 'Too short';
      if (v !== undefined && v !== null && rule.maxLength && String(v).length > rule.maxLength) errors[field] = 'Too long';
      if (v && rule.pattern && !rule.pattern.test(String(v))) errors[field] = 'Invalid format';
      if (v !== undefined && v !== null && rule.type === 'number' && Number.isNaN(Number(v))) errors[field] = 'Must be a number';
    });
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function metricSnapshot() {
    return {
      ...namespace.metrics,
      uptimeMs: now() - namespace.metrics.startedAt,
      registeredFeatures: namespace.registry.size,
      featureCount: namespace.features.length
    };
  }

  function exportDiagnostics() {
    return {
      namespace: namespace.name,
      version: namespace.version,
      features: namespace.features.slice(),
      registered: list().map(x => ({ name: x.name, category: x.category, enabled: x.enabled })),
      metrics: metricSnapshot(),
      url: location.href,
      online: navigator.onLine,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };
  }

  function downloadDiagnostics() {
    const blob = new Blob([JSON.stringify(exportDiagnostics(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experthub-08-diagnostics.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  namespace.on = on;
  namespace.off = off;
  namespace.emit = emit;
  namespace.save = save;
  namespace.load = load;
  namespace.remove = remove;
  namespace.register = register;
  namespace.unregister = unregister;
  namespace.list = list;
  namespace.execute = execute;
  namespace.memoize = memoize;
  namespace.debounce = debounce;
  namespace.throttle = throttle;
  namespace.validateObject = validateObject;
  namespace.metrics = metricSnapshot;
  namespace.diagnostics = exportDiagnostics;
  namespace.downloadDiagnostics = downloadDiagnostics;

  window.EHFeature08 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = {
      feature: "sidebar state",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:01', result);
    return result;
  }

  register("sidebar state", {
    category: "sidebar",
    description: "Enhanced sidebar state capability for application shell enhancements",
    handler: feature_01
  });

  function feature_02(payload = {}, context = {}) {
    const result = {
      feature: "breadcrumb builder",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:02', result);
    return result;
  }

  register("breadcrumb builder", {
    category: "breadcrumb",
    description: "Enhanced breadcrumb builder capability for application shell enhancements",
    handler: feature_02
  });

  function feature_03(payload = {}, context = {}) {
    const result = {
      feature: "global search",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:03', result);
    return result;
  }

  register("global search", {
    category: "global",
    description: "Enhanced global search capability for application shell enhancements",
    handler: feature_03
  });

  function feature_04(payload = {}, context = {}) {
    const result = {
      feature: "command palette",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:04', result);
    return result;
  }

  register("command palette", {
    category: "command",
    description: "Enhanced command palette capability for application shell enhancements",
    handler: feature_04
  });

  function feature_05(payload = {}, context = {}) {
    const result = {
      feature: "notification drawer",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:05', result);
    return result;
  }

  register("notification drawer", {
    category: "notification",
    description: "Enhanced notification drawer capability for application shell enhancements",
    handler: feature_05
  });

  function feature_06(payload = {}, context = {}) {
    const result = {
      feature: "chat state",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:06', result);
    return result;
  }

  register("chat state", {
    category: "chat",
    description: "Enhanced chat state capability for application shell enhancements",
    handler: feature_06
  });

  function feature_07(payload = {}, context = {}) {
    const result = {
      feature: "recent pages",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:07', result);
    return result;
  }

  register("recent pages", {
    category: "recent",
    description: "Enhanced recent pages capability for application shell enhancements",
    handler: feature_07
  });

  function feature_08(payload = {}, context = {}) {
    const result = {
      feature: "favorite pages",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:08', result);
    return result;
  }

  register("favorite pages", {
    category: "favorite",
    description: "Enhanced favorite pages capability for application shell enhancements",
    handler: feature_08
  });

  function feature_09(payload = {}, context = {}) {
    const result = {
      feature: "quick actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:09', result);
    return result;
  }

  register("quick actions", {
    category: "quick",
    description: "Enhanced quick actions capability for application shell enhancements",
    handler: feature_09
  });

  function feature_10(payload = {}, context = {}) {
    const result = {
      feature: "workspace switcher",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:10', result);
    return result;
  }

  register("workspace switcher", {
    category: "workspace",
    description: "Enhanced workspace switcher capability for application shell enhancements",
    handler: feature_10
  });

  function feature_11(payload = {}, context = {}) {
    const result = {
      feature: "responsive sidebar",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:11', result);
    return result;
  }

  register("responsive sidebar", {
    category: "responsive",
    description: "Enhanced responsive sidebar capability for application shell enhancements",
    handler: feature_11
  });

  function feature_12(payload = {}, context = {}) {
    const result = {
      feature: "session banner",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:12', result);
    return result;
  }

  register("session banner", {
    category: "session",
    description: "Enhanced session banner capability for application shell enhancements",
    handler: feature_12
  });

  function feature_13(payload = {}, context = {}) {
    const result = {
      feature: "connection banner",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:13', result);
    return result;
  }

  register("connection banner", {
    category: "connection",
    description: "Enhanced connection banner capability for application shell enhancements",
    handler: feature_13
  });

  function feature_14(payload = {}, context = {}) {
    const result = {
      feature: "unsaved changes guard",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:14', result);
    return result;
  }

  register("unsaved changes guard", {
    category: "unsaved",
    description: "Enhanced unsaved changes guard capability for application shell enhancements",
    handler: feature_14
  });

  function feature_15(payload = {}, context = {}) {
    const result = {
      feature: "keyboard shortcuts",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:15', result);
    return result;
  }

  register("keyboard shortcuts", {
    category: "keyboard",
    description: "Enhanced keyboard shortcuts capability for application shell enhancements",
    handler: feature_15
  });

  function feature_16(payload = {}, context = {}) {
    const result = {
      feature: "activity timeline",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:16', result);
    return result;
  }

  register("activity timeline", {
    category: "activity",
    description: "Enhanced activity timeline capability for application shell enhancements",
    handler: feature_16
  });

  function feature_17(payload = {}, context = {}) {
    const result = {
      feature: "help center launcher",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:17', result);
    return result;
  }

  register("help center launcher", {
    category: "help",
    description: "Enhanced help center launcher capability for application shell enhancements",
    handler: feature_17
  });

  function feature_18(payload = {}, context = {}) {
    const result = {
      feature: "support widget",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:18', result);
    return result;
  }

  register("support widget", {
    category: "support",
    description: "Enhanced support widget capability for application shell enhancements",
    handler: feature_18
  });

  function feature_19(payload = {}, context = {}) {
    const result = {
      feature: "shell diagnostics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:19', result);
    return result;
  }

  register("shell diagnostics", {
    category: "shell",
    description: "Enhanced shell diagnostics capability for application shell enhancements",
    handler: feature_19
  });

  function feature_20(payload = {}, context = {}) {
    const result = {
      feature: "workspace preferences",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "08"
    };
    emit('feature:20', result);
    return result;
  }

  register("workspace preferences", {
    category: "workspace",
    description: "Enhanced workspace preferences capability for application shell enhancements",
    handler: feature_20
  });

  /* ---------- Built-in browser integrations ---------- */

  namespace.search = function (query, source = list()) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return source.slice();
    return source.filter(item =>
      JSON.stringify(item).toLowerCase().includes(q)
    );
  };

  namespace.groupBy = function (items, selector) {
    return items.reduce((groups, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const key = value === undefined || value === null ? 'unknown' : String(value);
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
  };

  namespace.sum = function (items, selector) {
    return items.reduce((total, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      return total + (Number(value) || 0);
    }, 0);
  };

  namespace.average = function (items, selector) {
    return items.length ? namespace.sum(items, selector) / items.length : 0;
  };

  namespace.paginate = function (items, page = 1, pageSize = 20) {
    const size = Math.max(1, Number(pageSize) || 20);
    const current = Math.max(1, Number(page) || 1);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const safePage = Math.min(current, pages);
    return {
      items: items.slice((safePage - 1) * size, safePage * size),
      page: safePage,
      pageSize: size,
      total,
      pages,
      hasNext: safePage < pages,
      hasPrevious: safePage > 1
    };
  };

  namespace.sortBy = function (items, selector, direction = 'asc') {
    const list = items.slice();
    list.sort((a, b) => {
      const av = typeof selector === 'function' ? selector(a) : a?.[selector];
      const bv = typeof selector === 'function' ? selector(b) : b?.[selector];
      const left = av ?? '';
      const right = bv ?? '';
      const result = left > right ? 1 : left < right ? -1 : 0;
      return direction === 'desc' ? -result : result;
    });
    return list;
  };

  namespace.unique = function (items, selector = item => item) {
    const seen = new Set();
    return items.filter(item => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const keyValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (seen.has(keyValue)) return false;
      seen.add(keyValue);
      return true;
    });
  };

  namespace.whenIdle = function (callback, timeout = 1000) {
    if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout });
    return setTimeout(callback, Math.min(timeout, 100));
  };

  namespace.copy = async function (value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  };

  namespace.broadcast = function (name, payload) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.postMessage(payload);
      channel.close();
      return true;
    } catch (_) {
      return false;
    }
  };

  namespace.listenBroadcast = function (name, handler) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.onmessage = event => handler(event.data);
      return () => channel.close();
    } catch (_) {
      return () => {};
    }
  };

  /* ---------- Automatic lifecycle hooks ---------- */

  document.addEventListener('visibilitychange', () => {
    emit('visibility', { hidden: document.hidden, timestamp: Date.now() });
  });

  window.addEventListener('online', () => emit('network', { online: true }));
  window.addEventListener('offline', () => emit('network', { online: false }));

  namespace.healthCheck = function () {
    return {
      ok: true,
      storage: (() => {
        try {
          const k = key('health');
          localStorage.setItem(k, 'ok');
          localStorage.removeItem(k);
          return true;
        } catch (_) { return false; }
      })(),
      dom: !!document.body,
      network: navigator.onLine,
      registeredFeatures: namespace.registry.size
    };
  };

  /* Keep the feature registry discoverable without changing the
     application's existing global functions. */
  window.ExpertHubFeatureRegistry = window.ExpertHubFeatureRegistry || {};
  window.ExpertHubFeatureRegistry["08"] = namespace;

})();

/* ============================================================
   End 08 feature expansion
   ============================================================ */
