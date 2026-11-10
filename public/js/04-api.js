/* ============================================================
   ExpertHub 2.0 — 04-api.js
   Fetch wrapper (timeout, retry, offline queue, caching) +
   Socket.io init with full event surface + WebRTC signaling.
   ============================================================ */

/* ---------- API ERROR TYPE ---------- */
class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/* ---------- CORE FETCH ---------- */
async function apiCall(endpoint, method='GET', body=null, isFormData=false, _retry=false) {
  // Offline mutation guard
  if (connectionStatus === 'offline' && method !== 'GET' && CONFIG.FEATURES.offlineQueue) {
    OFFLINE_QUEUE.push({ endpoint, method, body, isFormData });
    showToast('Queued — will sync when online', 'warning');
    return { queued: true };
  }

  const headers = {};
  if (!isFormData && body !== null) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (method === 'GET') headers['X-Cache-Avoid'] = '1';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

  const options = { method, headers, signal: controller.signal };
  if (body !== null) options.body = isFormData ? body : JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${CONFIG.API_BASE}${endpoint}`, options);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new ApiError('Request timed out', 0);
    if (CONFIG.API_RETRY.statuses.includes(0) && !_retry) {
      await new Promise(r => setTimeout(r, CONFIG.API_RETRY.backoffMs));
      return apiCall(endpoint, method, body, isFormData, true);
    }
    throw new ApiError(err.message || 'Network error', 0);
  }
  clearTimeout(timer);

  // Retry on transient statuses
  if (CONFIG.API_RETRY.statuses.includes(res.status) && !_retry) {
    await new Promise(r => setTimeout(r, CONFIG.API_RETRY.backoffMs));
    return apiCall(endpoint, method, body, isFormData, true);
  }

  // Auth refresh path
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
    let payload = null;
    try {
      payload = await res.json();
      msg = payload.error || payload.message || msg;
    } catch (_) {}
    throw new ApiError(msg, res.status, payload);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ---------- PAGINATED GET WITH CACHE ---------- */
async function apiGet(endpoint, { cache = true, ttlMs = 30000 } = {}) {
  const key = `GET:${endpoint}`;
  if (cache) {
    const hit = API_CACHE.get(key);
    if (hit) return hit;
  }
  const data = await apiCall(endpoint, 'GET');
  if (cache) API_CACHE.set(key, data, ttlMs);
  return data;
}

/* ---------- UPLOAD WITH PROGRESS ---------- */
function apiUpload(endpoint, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${CONFIG.API_BASE}${endpoint}`);
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.upload.onprogress = e => {
      if (onProgress && e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText || 'null')); }
        catch { resolve(null); }
      } else {
        try {
          const p = JSON.parse(xhr.responseText || '{}');
          reject(new ApiError(p.error || `HTTP ${xhr.status}`, xhr.status, p));
        } catch {
          reject(new ApiError(`HTTP ${xhr.status}`, xhr.status));
        }
      }
    };
    xhr.onerror = () => reject(new ApiError('Upload failed', 0));
    xhr.send(formData);
  });
}

/* ---------- DOWNLOAD HELPER ---------- */
async function apiDownload(endpoint, filename) {
  const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) throw new ApiError(`Download failed (${res.status})`, res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'download';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ============================================================
   SOCKET.IO
   ============================================================ */
function initializeSocket() {
  if (socket) { try { socket.disconnect(); } catch (_) {} }
  if (!authToken || typeof io === 'undefined') return;

  socket = io({
    auth: { token: authToken },
    reconnection: true,
    reconnectionAttempts: CONFIG.SOCKET_RECONNECT.attempts,
    reconnectionDelay: CONFIG.SOCKET_RECONNECT.delayMs,
    reconnectionDelayMax: CONFIG.SOCKET_RECONNECT.delayMaxMs,
  });

  /* ---------- Connection lifecycle ---------- */
  socket.on('connect', () => {
    socketConnected = true; UI.wsBackoff = 0;
    console.log('[socket] connected');
    updateConnectionBadge('online');
  });
  socket.on('disconnect', reason => {
    socketConnected = false;
    console.log('[socket] disconnected:', reason);
    updateConnectionBadge('offline');
  });
  socket.io?.on('reconnect_attempt', n => {
    updateConnectionBadge('reconnecting', n);
  });
  socket.on('connect_error', err => {
    updateConnectionBadge('error', err?.message);
  });

  /* ---------- Presence ---------- */
  socket.on('presence', ({ user_id, status }) => {
    if (status === 'online') UI.onlineUserIds.add(user_id);
    else UI.onlineUserIds.delete(user_id);
    refreshOnlineBadges();
  });

  /* ---------- Generic notifications ---------- */
  socket.on('notification', n => {
    S.notifications.unshift(n);
    const group = n.category || 'system';
    if (UI.unreadByGroup[group] !== undefined) UI.unreadByGroup[group]++;
    showToast(n.title || 'New notification', n.level || 'info');
    updateNotificationBadge();
    if (notificationsPanelOpen) renderNotificationsPanel();
  });
  socket.on('broadcast', b =>
    showToast(`${b.title}: ${b.message}`, 'info', 6000));

  /* ---------- Chat / messages ---------- */
  socket.on('new_message', msg => {
    const cid = msg.consultation_id;
    if (!S.chatMessages[cid]) S.chatMessages[cid] = [];
    S.chatMessages[cid].push(msg);
    if (currentChatId === cid) renderChatMessages(cid);
    else if (msg.sender_id !== currentUser?.id) {
      showToast(`New message: ${msg.sender_name || 'someone'}`, 'info');
    }
  });
  socket.on('typing', ({ consultation_id, user_id, is_typing }) => {
    if (!UI.typingIn[consultation_id]) UI.typingIn[consultation_id] = new Set();
    if (is_typing) UI.typingIn[consultation_id].add(user_id);
    else UI.typingIn[consultation_id].delete(user_id);
    if (currentChatId === consultation_id) {
      const el = document.querySelector('#chat-typing');
      if (!el) return;
      const others = [...UI.typingIn[consultation_id]].filter(id => id !== currentUser?.id);
      el.textContent = others.length ? 'typing...' : '';
    }
  });
  socket.on('message_read', ({ consultation_id, message_ids }) => {
    const arr = S.chatMessages[consultation_id] || [];
    arr.forEach(m => { if (message_ids.includes(m.id)) m.read_at = new Date().toISOString(); });
    if (currentChatId === consultation_id) renderChatMessages(consultation_id);
  });
  socket.on('message_deleted', ({ consultation_id, message_id }) => {
    const arr = S.chatMessages[consultation_id] || [];
    const idx = arr.findIndex(m => m.id === message_id);
    if (idx >= 0) arr.splice(idx, 1);
    if (currentChatId === consultation_id) renderChatMessages(consultation_id);
  });

  /* ---------- WebRTC signaling ---------- */
  socket.on('webrtc:offer', handleWebRTCOffer);
  socket.on('webrtc:answer', handleWebRTCAnswer);
  socket.on('webrtc:ice', handleWebRTCIce);
  socket.on('webrtc:hangup', () => endVideoSession(true));
  socket.on('webrtc:screen_share_started', () => {
    showToast('Peer started screen sharing', 'info');
  });
  socket.on('webrtc:screen_share_stopped', () => {
    showToast('Peer stopped screen sharing', 'info');
  });
  socket.on('webrtc:recording_started', ({ consultation_id }) => {
    showToast('Session recording started', 'info');
    UI.recordingActive = consultation_id;
  });
  socket.on('webrtc:recording_stopped', () => { UI.recordingActive = null; });

  /* ---------- Institution ---------- */
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
  socket.on('institution:budget_threshold', d => {
    showToast(`Budget alert — ${d.department} at ${d.utilization_pct}%`, 'warning', 6000);
  });
  socket.on('institution:compliance_breach', d => {
    showToast(`Compliance breach: ${d.rule}`, 'error', 8000);
  });
  socket.on('institution:announcement', d => {
    S.announcements.unshift(d);
    showToast(`Announcement: ${d.title}`, 'info');
  });
  socket.on('institution:report_ready', d => {
    showToast(`Report ready: ${d.name}`, 'success');
  });
  socket.on('institution:trainee_at_risk', d => {
    showToast(`Wellness alert: ${d.trainee_name}`, 'warning', 6000);
  });
  socket.on('institution:succession_updated', () => {
    if (typeof renderInstitutionSuccession === 'function') renderInstitutionSuccession();
  });
  socket.on('institution:webhook_failed', d => {
    showToast(`Webhook failed: ${d.event}`, 'error', 6000);
  });

  /* ---------- Consultation ---------- */
  socket.on('consultation:reminder', d => {
    showToast(d.message || 'Session reminder', 'info', 6000);
    S.consultationReminders.push(d);
  });
  socket.on('consultation:escrow_released', d => {
    showToast(`Escrow released: ${fmtCur(d.amount)}`, 'success');
    loadAllData().then(rerenderRoleContent);
  });
  socket.on('consultation:status', d => {
    const c = S.consultations.find(x => x.id === d.id);
    if (c) c.status = d.status;
    if (typeof renderConsultationRow === 'function') renderConsultationRow(d.id);
    showToast(`Consultation status: ${d.status}`, 'info');
  });
  socket.on('consultation:starting_soon', d => {
    showToast(`Session starting soon: ${d.title}`, 'warning', 8000);
  });
  socket.on('consultation:dispute_opened', d => {
    showToast(`Dispute opened: ${d.reason}`, 'warning');
    S.consultationDisputes.unshift(d);
  });

  /* ---------- E-School ---------- */
  socket.on('enrollment:certificate_issued', d => {
    showToast(`Certificate ready: ${d.course_title}`, 'success');
    loadAllData().then(rerenderRoleContent);
  });
  socket.on('enrollment:progress', d => {
    if (typeof refreshCourseProgress === 'function') refreshCourseProgress(d);
  });
  socket.on('course:published', d => {
    showToast(`New course: ${d.title}`, 'info');
  });
  socket.on('quiz:graded', d => {
    showToast(`Quiz graded: ${d.score}%`, 'success');
  });
  socket.on('assignment:graded', d => {
    showToast(`Assignment graded: ${d.grade}`, 'success');
  });
  socket.on('user:xp_awarded', d => {
    showToast(`+${d.amount} XP`, 'success');
    if (S.userXP) S.userXP.total = (S.userXP.total || 0) + d.amount;
  });
  socket.on('user:badge_earned', d => {
    showToast(`Badge earned: ${d.name}`, 'success');
    S.userBadges.push(d);
  });
  socket.on('user:level_up', d => {
    showToast(`Level up! Now level ${d.level}`, 'success', 6000);
  });

  /* ---------- Global / misc ---------- */
  socket.on('force_logout', () => { logout(); });
  socket.on('session_revoked', () => { showToast('Session ended elsewhere', 'warning'); logout(); });
  socket.on('maintenance', d => {
    showFeatureBanner({ text: d.message, level: 'warning', dismissible: true });
  });
}

/* ---------- Connection indicator hook ---------- */
function updateConnectionBadge(status, extra) {
  const el = document.querySelector('.live-indicator');
  if (el) {
    el.dataset.status = status;
    el.title = status === 'online' ? 'Connected'
      : status === 'offline' ? 'Disconnected'
      : status === 'reconnecting' ? `Reconnecting (${extra || ''})`
      : 'Connection error';
  }
}

function refreshOnlineBadges() {
  document.querySelectorAll('[data-online-user]').forEach(el => {
    const uid = el.dataset.onlineUser;
    el.classList.toggle('is-online', UI.onlineUserIds.has(uid));
  });
}

/* ---------- WebRTC plumbing (stubs ready for real implementation) ---------- */
async function startVideoSession(consultationId, type = 'video') {
  activeVideoSession = { consultationId, type, pc: null };
  showToast(`Starting ${type} session…`, 'info');
  if (socket) socket.emit('webrtc:join', { consultation_id: consultationId, type });
  if (typeof showVideoPanel === 'function') showVideoPanel(consultationId, type);
}
async function startScreenShare(consultationId) {
  if (!CONFIG.FEATURES.screenShare) return showToast('Screen share unavailable', 'warning');
  try {
    screenShareStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    if (socket) socket.emit('webrtc:screen_share_started', { consultation_id: consultationId });
    showToast('Screen sharing started', 'success');
  } catch (e) { showToast('Screen share cancelled', 'warning'); }
}
function stopScreenShare(consultationId) {
  screenShareStream?.getTracks().forEach(t => t.stop());
  screenShareStream = null;
  if (socket) socket.emit('webrtc:screen_share_stopped', { consultation_id: consultationId });
}
function endVideoSession(remote = false) {
  localMediaStream?.getTracks().forEach(t => t.stop());
  remoteMediaStream?.getTracks().forEach(t => t.stop());
  screenShareStream?.getTracks().forEach(t => t.stop());
  localMediaStream = remoteMediaStream = screenShareStream = null;
  if (activeVideoSession?.pc) { try { activeVideoSession.pc.close(); } catch (_) {} }
  activeVideoSession = null;
  if (!remote) showToast('Session ended', 'info');
  if (typeof hideVideoPanel === 'function') hideVideoPanel();
}
function handleWebRTCOffer() { /* wired by 12-consultation.js */ }
function handleWebRTCAnswer() { /* wired by 12-consultation.js */ }
function handleWebRTCIce() { /* wired by 12-consultation.js */ }