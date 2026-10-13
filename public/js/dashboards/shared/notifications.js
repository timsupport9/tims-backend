/* ============================================================
   dashboards/shared/notifications.js — Notification panel
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function togglePanel() {
    EH.state.notificationsPanelOpen = !EH.state.notificationsPanelOpen;
    if (EH.state.notificationsPanelOpen) renderPanel();
    else {
      const host = document.getElementById('notif-panel-host');
      if (host) host.innerHTML = '';
    }
  }

  function renderPanel() {
    const host = document.getElementById('notif-panel-host');
    if (!host) return;
    const notifs = EH.state.notifications || [];
    const unread = notifs.filter(n => !n.is_read).length;

    host.innerHTML = `
      <div class="notif-panel">
        <div class="notif-panel-header">
          <span>Notifications ${unread ? `(${unread})` : ''}</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-xs" data-notif-readall>Mark all read</button>
            <button class="btn btn-ghost btn-xs" data-notif-close aria-label="Close">&times;</button>
          </div>
        </div>
        <div class="notif-panel-list">
          ${notifs.length ? notifs.slice(0, 30).map(n => `
            <div class="notif-panel-item ${n.is_read ? '' : 'unread'}" data-notif-id="${n.id}">
              <p class="notif-panel-item-title">${EH.Fmt.esc(n.title || '')}</p>
              <p class="notif-panel-item-msg">${EH.Fmt.esc(n.message || '')}</p>
              <p class="notif-panel-item-date">${EH.Dates.timeAgo(n.created_at)}</p>
            </div>`).join('')
            : '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>'}
        </div>
      </div>`;

    host.querySelector('[data-notif-close]').onclick = togglePanel;
    host.querySelector('[data-notif-readall]').onclick = async () => {
      await EH.NotificationService.markAllRead();
      renderPanel();
    };
    host.querySelectorAll('[data-notif-id]').forEach(el => {
      el.onclick = async () => {
        const id = el.dataset.notifId;
        const n = notifs.find(x => String(x.id) === String(id));
        if (n && !n.is_read) {
          await EH.NotificationService.markRead(id);
          renderPanel();
        }
        if (n?.link) {
          location.hash = n.link.startsWith('#') ? n.link : '#' + n.link;
          togglePanel();
        }
      };
    });
  }

  function updateBadge() {
    EH.NotificationService.updateBadge();
  }

  function startPolling() {
    stopPolling();
    EH.state.pollTimer = setInterval(() => {
      EH.NotificationService.reload();
    }, EH.CONFIG.POLL_INTERVAL);
  }

  function stopPolling() {
    if (EH.state.pollTimer) {
      clearInterval(EH.state.pollTimer);
      EH.state.pollTimer = null;
    }
  }

  EH.NotificationCenter = { togglePanel, renderPanel, updateBadge, startPolling, stopPolling };
  EH.Polling = { start: startPolling, stop: stopPolling };

  global.toggleNotificationsPanel = togglePanel;
  global.renderNotificationsPanel = renderPanel;
  global.startPolling = startPolling;
  global.stopPolling = stopPolling;
  global.updateNotificationBadge = updateBadge;
})(window);
