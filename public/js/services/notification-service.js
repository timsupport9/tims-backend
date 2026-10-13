/* ============================================================
   services/notification-service.js — Notification badge & panel
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { API, State, bus, EVENTS, $ } = EH;

  const NotificationService = {
    unreadCount() {
      return (State.notifications || []).filter(n => !n.is_read).length;
    },

    updateBadge() {
      const b = $('#notif-badge');
      if (!b) return;
      const unread = this.unreadCount();
      b.textContent = unread > 99 ? '99+' : unread;
      b.classList.toggle('hidden', unread === 0);
      b.setAttribute('aria-label', `${unread} unread notifications`);
    },

    async markRead(id) {
      try {
        await API.put(`/api/common/notifications/${id}/read`);
        const n = State.notifications.find(x => String(x.id) === String(id));
        if (n) n.is_read = 1;
        this.updateBadge();
        bus?.emit('notification:read', { id });
      } catch (_) {}
    },

    async markAllRead() {
      try {
        await API.put('/api/common/notifications/read-all');
        State.notifications.forEach(n => { n.is_read = 1; });
        this.updateBadge();
        bus?.emit('notification:read-all');
      } catch (_) {}
    },

    async reload() {
      try {
        const d = await API.get('/api/common/notifications');
        State.notifications = d.notifications || [];
        this.updateBadge();
      } catch (_) {}
    },

    async broadcast(title, message, audience = 'all') {
      return API.post('/api/admin/notifications/broadcast', { title, message, audience });
    },
  };

  EH.NotificationService = NotificationService;
  global.updateNotificationBadge = () => NotificationService.updateBadge();
})(window);
