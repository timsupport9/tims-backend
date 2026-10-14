/* ============================================================
   ExpertHub 2.0 — 16-notifications.js
   Real-time notifications: bell UI + Socket.IO bridge + Web Push.
   Bridges to socket.io when available; degrades to polling.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHNotifications = window.EHNotifications || {};

  const state = {
    items: [],
    unread: 0,
    panelOpen: false,
    socket: null,
    pollTimer: null,
    mounted: false,
  };

  /* ---------- persistence ---------- */

  const STORE_KEY = 'eh.notifications.v1';

  function loadStored() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, 100) : [];
    } catch (_) { return []; }
  }

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.items.slice(0, 100)));
    } catch (_) {}
  }

  /* ---------- mutation ---------- */

  function push(item) {
    if (!item || !item.id) {
      item = Object.assign({ id: 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) }, item || {});
    }
    item.created_at = item.created_at || new Date().toISOString();
    item.read = !!item.read;

    // dedupe by id
    if (state.items.some(x => x.id === item.id)) return;

    state.items.unshift(item);
    state.items = state.items.slice(0, 100);
    recompute();
    persist();
    render();
    flashBell();

    if (!item.read && item.toast !== false && typeof window.showToast === 'function') {
      window.showToast(item.title || 'New notification', item.level || 'info');
    }
  }

  function markRead(id) {
    const it = state.items.find(x => x.id === id);
    if (!it || it.read) return;
    it.read = true;
    recompute();
    persist();
    render();
  }

  function markAllRead() {
    state.items.forEach(x => { x.read = true; });
    recompute();
    persist();
    render();
  }

  function clearAll() {
    state.items = [];
    recompute();
    persist();
    render();
  }

  function recompute() {
    state.unread = state.items.filter(x => !x.read).length;
  }

  /* ---------- bell UI ---------- */

  function findHeader() {
    return document.querySelector(
      '.shell-topbar, .shell-header, .app-header, .topbar, .navbar, header'
    );
  }

  function ensureBell() {
    if (state.mounted && document.getElementById('eh-bell')) return;
    const header = findHeader();
    if (!header) return;

    let bell = document.getElementById('eh-bell');
    if (!bell) {
      bell = document.createElement('button');
      bell.id = 'eh-bell';
      bell.className = 'eh-bell';
      bell.setAttribute('aria-label', 'Notifications');
      bell.innerHTML = `
        <i class="fas fa-bell"></i>
        <span class="eh-bell__badge" data-unread hidden>0</span>`;
      bell.addEventListener('click', togglePanel);
      header.appendChild(bell);
    }

    let panel = document.getElementById('eh-bell-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'eh-bell-panel';
      panel.className = 'eh-bell-panel';
      panel.setAttribute('aria-hidden', 'true');
      panel.innerHTML = `
        <header class="eh-bell-panel__head">
          <strong>Notifications</strong>
          <div>
            <button class="btn btn-ghost btn-xs" data-notif="mark-all">Mark all read</button>
            <button class="btn btn-ghost btn-xs" data-notif="clear">Clear</button>
          </div>
        </header>
        <ul id="eh-bell-list" class="eh-bell-panel__list"></ul>`;
      document.body.appendChild(panel);

      panel.addEventListener('click', e => {
        const b = e.target.closest('[data-notif]');
        if (!b) return;
        if (b.dataset.notif === 'mark-all') markAllRead();
        if (b.dataset.notif === 'clear')    clearAll();
      });

      document.addEventListener('click', e => {
        if (state.panelOpen &&
            !panel.contains(e.target) &&
            !document.getElementById('eh-bell')?.contains(e.target)) {
          closePanel();
        }
      });
    }

    state.mounted = true;
  }

  function flashBell() {
    const bell = document.getElementById('eh-bell');
    if (!bell) return;
    bell.classList.remove('eh-bell--flash');
    void bell.offsetWidth;
    bell.classList.add('eh-bell--flash');
  }

  function render() {
    const badge = document.querySelector('#eh-bell .eh-bell__badge');
    if (badge) {
      if (state.unread > 0) {
        badge.hidden = false;
        badge.textContent = state.unread > 99 ? '99+' : String(state.unread);
      } else {
        badge.hidden = true;
      }
    }

    const list = document.getElementById('eh-bell-list');
    if (!list) return;

    if (!state.items.length) {
      list.innerHTML = `<li class="eh-bell-panel__empty">You're all caught up.</li>`;
      return;
    }

    list.innerHTML = state.items.map(n => `
      <li class="eh-bell-panel__item ${n.read ? '' : 'is-unread'}"
          data-notif-id="${escapeAttr(n.id)}">
        <i class="fas ${iconFor(n.kind)}"></i>
        <div class="eh-bell-panel__body">
          <div class="eh-bell-panel__title">${escapeHtml(n.title || 'Notification')}</div>
          ${n.body ? `<div class="eh-bell-panel__msg">${escapeHtml(n.body)}</div>` : ''}
          <div class="eh-bell-panel__time">${timeAgo(n.created_at)}</div>
        </div>
      </li>`).join('');

    list.querySelectorAll('[data-notif-id]').forEach(el => {
      el.addEventListener('click', () => {
        const n = state.items.find(x => x.id === el.dataset.notifId);
        if (!n) return;
        markRead(n.id);
        if (n.action && n.action.href) {
          location.hash = n.action.href;
          closePanel();
        } else if (typeof n.action?.run === 'function') {
          try { n.action.run(); } catch (_) {}
          closePanel();
        }
      });
    });
  }

  function iconFor(kind) {
    switch (kind) {
      case 'consultation': return 'fa-comments';
      case 'achievement':  return 'fa-trophy';
      case 'payment':      return 'fa-wallet';
      case 'course':       return 'fa-graduation-cap';
      case 'quiz':         return 'fa-question-circle';
      case 'recording':    return 'fa-video';
      case 'reminder':     return 'fa-clock';
      default:             return 'fa-circle-info';
    }
  }

  function togglePanel() {
    state.panelOpen ? closePanel() : openPanel();
  }
  function openPanel() {
    ensureBell();
    const panel = document.getElementById('eh-bell-panel');
    if (!panel) return;
    state.panelOpen = true;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    render();
  }
  function closePanel() {
    const panel = document.getElementById('eh-bell-panel');
    if (!panel) return;
    state.panelOpen = false;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function timeAgo(iso) {
    if (typeof window.timeAgo === 'function') return window.timeAgo(iso);
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]
    ));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  /* ---------- socket bridge ---------- */

  function bindSocket() {
    if (typeof window.io !== 'function') return;

    try {
      // Reuse existing socket if the app created one
      const existing = window.socket || window._socket;
      state.socket = existing || window.io({ withCredentials: true });
    } catch (err) {
      console.warn('[notifications] socket init failed', err);
      return;
    }

    const s = state.socket;
    const onEvent = (kind) => (payload) => {
      payload = payload || {};
      push({
        id: payload.id || (kind + ':' + Date.now()),
        kind,
        title: payload.title || defaultTitle(kind),
        body: payload.body || payload.message || '',
        action: payload.action || null,
        level: payload.level || 'info',
      });
    };

    s.on('notification',           (p) => push(p));
    s.on('consultation:confirmed', onEvent('consultation'));
    s.on('consultation:reminder',  onEvent('reminder'));
    s.on('consultation:recording', onEvent('recording'));
    s.on('achievement:earned',     onEvent('achievement'));
    s.on('payment:credited',       onEvent('payment'));
    s.on('course:updated',         onEvent('course'));
    s.on('quiz:graded',            onEvent('quiz'));

    if (typeof s.emit === 'function' && window.currentUser?.id) {
      s.emit('notifications:subscribe', { user_id: window.currentUser.id });
    }
  }

  function defaultTitle(kind) {
    switch (kind) {
      case 'consultation': return 'Consultation update';
      case 'reminder':     return 'Upcoming session';
      case 'recording':    return 'Session recording ready';
      case 'achievement':  return 'Achievement unlocked';
      case 'payment':      return 'Payment received';
      case 'course':       return 'Course updated';
      case 'quiz':         return 'Quiz graded';
      default:             return 'New notification';
    }
  }

  /* ---------- polling fallback ---------- */

  function startPolling() {
    if (state.socket) return;
    if (typeof window.apiCall !== 'function') return;
    stopPolling();
    const tick = async () => {
      try {
        const d = await window.apiCall('/api/notifications?since=' + encodeURIComponent(state.items[0]?.created_at || ''));
        (d?.notifications || []).forEach(n => push(n));
      } catch (_) {}
    };
    state.pollTimer = setInterval(tick, 30000);
    tick();
  }
  function stopPolling() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  }

  /* ---------- web push (optional) ---------- */

  async function enableWebPush() {
    if (!('Notification' in window)) return { ok: false, reason: 'unsupported' };
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'denied' };
    // Server-side subscription exchange (implement server endpoint to store subscription)
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (!reg || !reg.pushManager) return { ok: true, reason: 'no-push-support' };
      // In production you'd pass your VAPID public key:
      // const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) });
      // await window.apiCall('/api/push/subscribe', 'POST', sub.toJSON());
      return { ok: true, reason: 'granted-no-key' };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  /* ---------- init ---------- */

  function init() {
    state.items = loadStored();
    recompute();
    ensureBell();
    render();
    bindSocket();
    if (!state.socket) startPolling();

    // Re-mount if the shell re-renders (SPA tab switches often replace DOM)
    const mo = new MutationObserver(() => {
      if (!document.getElementById('eh-bell')) {
        state.mounted = false;
        ensureBell();
        render();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  NS.push = push;
  NS.open = openPanel;
  NS.close = closePanel;
  NS.markRead = markRead;
  NS.markAllRead = markAllRead;
  NS.clear = clearAll;
  NS.items = () => state.items.slice();
  NS.enableWebPush = enableWebPush;
  NS.init = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }