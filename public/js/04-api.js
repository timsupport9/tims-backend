/* ============================================================
   ExpertHub 2.0 — 04-api.js
   Fetch wrapper with auth-header + refresh-token retry + Socket.io init.
   ============================================================ */

/* ---------- API ---------- */
async function apiCall(endpoint, method='GET', body=null, isFormData=false, _retry=false) {
  const headers = {};
  if (!isFormData && body !== null) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const options = { method, headers };
  if (body !== null) options.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, options);

  if (res.status === 401 && !_retry && refreshToken) {
    try {
      const r = await fetch(`${CONFIG.API_BASE}/api/auth/refresh`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ refresh: refreshToken }),
      });
      if (r.ok) {
        const d = await r.json();
        authToken = d.token;
        localStorage.setItem('token', authToken);
        return apiCall(endpoint, method, body, isFormData, true);
      }
    } catch (_) {}
    return logout();
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error || j.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ---------- SOCKET ---------- */
function initializeSocket() {
  if (socket) socket.disconnect();
  if (!authToken || typeof io === 'undefined') return;
  socket = io({ auth: { token: authToken } });
  socket.on('connect', () => console.log('[socket] connected'));
  socket.on('disconnect', () => console.log('[socket] disconnected'));
  socket.on('notification', n => {
    S.notifications.unshift(n);
    showToast(n.title || 'New notification', 'info');
    updateNotificationBadge();
    if (notificationsPanelOpen) renderNotificationsPanel();
  });
  socket.on('broadcast', b => showToast(`${b.title}: ${b.message}`, 'info', 6000));
  socket.on('new_message', msg => {
    const cid = msg.consultation_id;
    if (!S.chatMessages[cid]) S.chatMessages[cid] = [];
    S.chatMessages[cid].push(msg);
    if (currentChatId === cid) renderChatMessages(cid);
  });
  socket.on('typing', ({ consultation_id, user_id, is_typing }) => {
    if (currentChatId !== consultation_id) return;
    const el = $('#chat-typing');
    if (!el) return;
    el.textContent = (is_typing && user_id !== currentUser?.id) ? 'typing...' : '';
  });
  socket.on('presence', () => {});
  socket.on('institution:approval', d => {
    showToast(`New approval request: ${d.title}`, 'info');
    loadAllData().then(rerenderRoleContent);
  });
  socket.on('institution:assessment_due', d => {
    showToast(`Assessment due: ${d.title}`, 'warning', 6000);
  });
  socket.on('institution:certificate_expiring', d => {
    showToast(`Certificate expiring soon: ${d.serial}`, 'warning', 6000);
  });
  socket.on('consultation:reminder', d => {
    showToast(d.message || 'Session reminder', 'info', 6000);
  });
  socket.on('consultation:escrow_released', d => {
    showToast(`Escrow released: ${fmtCur(d.amount)}`, 'success');
    loadAllData().then(rerenderRoleContent);
  });
  socket.on('enrollment:certificate_issued', d => {
    showToast(`Certificate ready: ${d.course_title}`, 'success');
    loadAllData().then(rerenderRoleContent);
  });
  socket.on('wellness:alert', d => {
    showToast(`Wellness alert: ${d.trainee_name}`, 'warning', 6000);
  });
}
