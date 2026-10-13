/* ============================================================
   services/socket-client.js — Realtime websocket client
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { State, bus, EVENTS, CONFIG, Toast } = EH;

  let socket = null;
  let reconnectTimer = null;

  function connect() {
    if (typeof global.io === 'undefined') return null;
    if (!State.authToken) return null;
    if (socket) socket.disconnect();

    socket = global.io({
      auth: { token: State.authToken },
      reconnectionDelay: CONFIG?.SOCKET_RECONNECT_DELAY || 2000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      EH.Logger?.info?.('[socket] connected', socket.id);
      State.socket = socket;
    });

    socket.on('disconnect', (reason) => {
      EH.Logger?.info?.('[socket] disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      EH.Logger?.warn?.('[socket] connect_error', err.message);
    });

    socket.on('notification', (n) => {
      State.notifications.unshift(n);
      Toast?.show?.(n.title || 'New notification', 'info');
      EH.NotificationService?.updateBadge?.();
      bus?.emit(EVENTS?.NOTIFICATION_NEW || 'notification:new', n);
    });

    socket.on('broadcast', (b) => {
      Toast?.show?.(`${b.title}: ${b.message}`, 'info', 6000);
    });

    socket.on('new_message', (msg) => {
      const cid = msg.consultation_id;
      if (!State.chatMessages[cid]) State.chatMessages[cid] = [];
      State.chatMessages[cid].push(msg);
      bus?.emit(EVENTS?.CHAT_MESSAGE || 'chat:message', { cid, msg });
    });

    socket.on('typing', (payload) => {
      bus?.emit(EVENTS?.CHAT_TYPING || 'chat:typing', payload);
    });

    socket.on('presence', (payload) => {
      EH.Presence?.update?.(payload);
      bus?.emit('presence:update', payload);
    });

    socket.on('institution:approval', (d) => {
      Toast?.show?.(`New approval request: ${d.title}`, 'info');
      bus?.emit(EVENTS?.INSTITUTION_APPROVAL || 'institution:approval', d);
    });

    socket.on('institution:assessment_due', (d) => {
      Toast?.show?.(`Assessment due: ${d.title}`, 'warning', 6000);
      bus?.emit(EVENTS?.INSTITUTION_ASSESSMENT_DUE || 'institution:assessment_due', d);
    });

    socket.on('institution:certificate_expiring', (d) => {
      Toast?.show?.(`Certificate expiring soon: ${d.serial}`, 'warning', 6000);
      bus?.emit(EVENTS?.INSTITUTION_CERT_EXPIRING || 'institution:certificate_expiring', d);
    });

    return socket;
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (socket) { socket.disconnect(); socket = null; }
    State.socket = null;
  }

  function emit(event, payload) {
    if (socket && socket.connected) socket.emit(event, payload);
  }

  function join(room)   { emit('join_consultation', room); }
  function leave(room)  { emit('leave_consultation', room); }
  function typing(room, isTyping) {
    emit('typing', { consultation_id: room, is_typing: isTyping });
  }

  const Socket = {
    connect, disconnect, emit, join, leave, typing,
    isConnected() { return !!socket && socket.connected; },
    instance() { return socket; },
  };

  EH.Socket = Socket;
  global.initializeSocket = connect;
})(window);
