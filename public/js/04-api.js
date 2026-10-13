/* ============================================================
   ExpertHub 2.0 — 04-api.js
   Fetch wrapper with auth-header + refresh-token retry + Socket.io init.
   ============================================================ */

const API_STATE = {
  refreshPromise: null,
};

function getStorageValue(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function setStorageValue(key, value) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

async function refreshAccessToken() {
  if (!refreshToken) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (API_STATE.refreshPromise) {
    return API_STATE.refreshPromise;
  }

  API_STATE.refreshPromise = (async function () {
    const res = await fetch(`${CONFIG.API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) {
      authToken = null;
      refreshToken = null;
      currentUser = null;
      currentUserRole = null;
      setStorageValue(CONFIG.STORAGE_KEYS.AUTH_TOKEN, null);
      setStorageValue(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, null);
      setStorageValue(CONFIG.STORAGE_KEYS.USER, null);
      throw new Error('Session refresh failed. Please sign in again.');
    }

    const data = await res.json();
    authToken = data.token || data.access_token || authToken;
    refreshToken = data.refresh || data.refresh_token || refreshToken;
    if (data.user) {
      currentUser = data.user;
      currentUserRole = data.user.role || currentUserRole;
      S.userIntent = data.user.intent || 'both';
    }

    setStorageValue(CONFIG.STORAGE_KEYS.AUTH_TOKEN, authToken);
    setStorageValue(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (currentUser) setStorageValue(CONFIG.STORAGE_KEYS.USER, currentUser);
    return authToken;
  })();

  try {
    return await API_STATE.refreshPromise;
  } finally {
    API_STATE.refreshPromise = null;
  }
}

async function apiCall(endpoint, method = 'GET', body = null, isFormData = false, _retry = false) {
  const headers = {};
  const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE}${endpoint}`;

  if (!isFormData && body !== null && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers,
    credentials: 'same-origin',
  };

  if (body !== null && body !== undefined) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('Request was cancelled.');
    }
    throw new Error('Network error. Please check your connection and try again.');
  }

  if (response.status === 401 && !_retry && refreshToken) {
    try {
      await refreshAccessToken();
      return apiCall(endpoint, method, body, isFormData, true);
    } catch (error) {
      if (typeof logout === 'function') {
        await logout();
      }
      throw error;
    }
  }

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        msg = json.error || json.message || msg;
      } else {
        const text = await response.text();
        msg = text || msg;
      }
    } catch (_) {}

    throw new Error(msg || 'Request failed');
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

/* ---------- SOCKET ---------- */
function initializeSocket() {
  if (!authToken) {
    if (socket) socket.disconnect();
    socket = null;
    return;
  }

  if (typeof io === 'undefined') return;
  if (socket) socket.disconnect();

  socket = io({
    path: CONFIG.SOCKET_PATH || '/socket.io',
    auth: { token: authToken },
    reconnection: true,
    reconnectionAttempts: CONFIG.SOCKET_RECONNECT_ATTEMPTS || 10,
    reconnectionDelay: CONFIG.SOCKET_RECONNECT_DELAY_MS || 2000,
  });

  socket.on('connect', () => {
    socketStatus = 'connected';
    console.log('[socket] connected');
  });

  socket.on('disconnect', () => {
    socketStatus = 'disconnected';
    console.log('[socket] disconnected');
  });

  socket.on('connect_error', () => {
    socketStatus = 'error';
  });

  socket.on('notification', n => {
    if (n && !Array.isArray(S.notifications)) S.notifications = [];
    S.notifications.unshift(n);
    if (typeof showToast === 'function') showToast(n.title || 'New notification', 'info');
    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
    if (notificationsPanelOpen && typeof renderNotificationsPanel === 'function') renderNotificationsPanel();
  });

  socket.on('broadcast', b => {
    if (typeof showToast === 'function') showToast(`${b.title}: ${b.message}`, 'info', 6000);
  });

  socket.on('new_message', msg => {
    const cid = msg.consultation_id;
    if (!S.chatMessages[cid]) S.chatMessages[cid] = [];
    S.chatMessages[cid].push(msg);
    if (currentChatId === cid && typeof renderChatMessages === 'function') renderChatMessages(cid);
  });

  socket.on('typing', ({ consultation_id, user_id, is_typing }) => {
    if (currentChatId !== consultation_id) return;
    const el = typeof $('#chat-typing') === 'undefined' ? null : $('#chat-typing');
    if (!el) return;
    el.textContent = (is_typing && user_id !== currentUser?.id) ? 'typing...' : '';
  });

  socket.on('presence', () => {});
  socket.on('institution:approval', d => {
    if (typeof showToast === 'function') showToast(`New approval request: ${d.title}`, 'info');
    if (typeof loadAllData === 'function') loadAllData().then(() => { if (typeof rerenderRoleContent === 'function') rerenderRoleContent(); });
  });

  socket.on('institution:assessment_due', d => {
    if (typeof showToast === 'function') showToast(`Assessment due: ${d.title}`, 'warning', 6000);
  });

  socket.on('institution:certificate_expiring', d => {
    if (typeof showToast === 'function') showToast(`Certificate expiring soon: ${d.serial}`, 'warning', 6000);
  });

  socket.on('consultation:reminder', d => {
    if (typeof showToast === 'function') showToast(d.message || 'Session reminder', 'info', 6000);
  });

  socket.on('consultation:escrow_released', d => {
    if (typeof showToast === 'function') showToast(`Escrow released: ${fmtCur(d.amount)}`, 'success');
    if (typeof loadAllData === 'function') loadAllData().then(() => { if (typeof rerenderRoleContent === 'function') rerenderRoleContent(); });
  });

  socket.on('enrollment:certificate_issued', d => {
    if (typeof showToast === 'function') showToast(`Certificate ready: ${d.course_title}`, 'success');
    if (typeof loadAllData === 'function') loadAllData().then(() => { if (typeof rerenderRoleContent === 'function') rerenderRoleContent(); });
  });

  socket.on('wellness:alert', d => {
    if (typeof showToast === 'function') showToast(`Wellness alert: ${d.trainee_name}`, 'warning', 6000);
  });
}

if (typeof window !== 'undefined') {
  window.apiCall = apiCall;
  window.refreshAccessToken = refreshAccessToken;
  window.initializeSocket = initializeSocket;
}
