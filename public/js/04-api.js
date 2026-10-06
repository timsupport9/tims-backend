/* ============================================================
   ExpertHub 2.0 — 04-api.js  (expanded)
   Fetch wrapper · SWR cache · single-flight auth refresh ·
   circuit breaker · rate limit · uploads · socket lifecycle ·
   reconnect/resync · rooms · presence · optimistic chat ·
   offline outbox · debug inspector · mock/chaos mode.
   ============================================================ */

/* ============================================================
   SECTION 0 — MODULE STATE
   ============================================================ */

const _api = {
  /* auth */
  refreshPromise: null,
  refreshTimer: null,

  /* request plumbing */
  inflight: new Map(),          // dedupe: key -> promise
  aborters: new Map(),          // route -> AbortController

  /* cache */
  cache: new Map(),             // endpoint -> { data, at, promise }

  /* rate limit: key -> { tokens, last } */
  buckets: new Map(),

  /* circuit breaker: prefix -> { failures, openedAt } */
  breakers: new Map(),

  /* socket */
  socketRooms: new Set(),
  outbox: [],                   // queued emits while offline
  typingTimers: {},             // consultation_id -> timeout
  presence: {},                 // user_id -> { status, at }
  presenceSweeper: null,
  wasDisconnected: false,

  /* inspector */
  log: [],                      // ring buffer of request records
  inspectorEl: null,

  /* metrics */
  metrics: { count: 0, errors: 0, totalMs: 0 },
};

const _sleep = ms => new Promise(r => setTimeout(r, ms));

const _uuid = () =>
  (self.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

const _now = () =>
  (self.performance?.now?.() ?? Date.now());

/* ============================================================
   SECTION 1 — CONFIG DEFAULTS
   ============================================================ */

const API_DEFAULTS = {
  API_BASE: CONFIG?.API_BASE ?? '',
  API_TIMEOUT: 15000,
  CACHE_TTL: 30000,
  DEBUG: false,
  CHAOS: null,                  // { failRate, slowRate } in dev
  MOCK: false,                  // serve from MOCK_ROUTES
  RETRY_GET: 2,
  RETRY_MUTATION: 0,
  TOAST_GROUP_MS: 2500,
  PRESENCE_TTL: 45000,
  HEARTBEAT_MS: 25000,
  BREAKER_THRESHOLD: 5,
  BREAKER_COOLDOWN: 30000,
  RATE_DEFAULT: { rate: 10, burst: 20 },  // per second / bucket size
};

const AC = Object.assign({}, API_DEFAULTS, CONFIG?.API ?? {});
const API_BASE = AC.API_BASE;

/* ============================================================
   SECTION 2 — ERRORS
   ============================================================ */

class ApiError extends Error {
  constructor(message, opts = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
    this.requestId = opts.requestId;
    this.retryable = !!opts.retryable;
    this.endpoint = opts.endpoint;
    this.method = opts.method;
  }
}

const ERROR_COPY = {
  TIMEOUT: 'That took too long — check your connection and try again.',
  NETWORK: "You're offline. We'll retry when you reconnect.",
  AUTH_EXPIRED: 'Your session ended. Please sign in again.',
  RATE_LIMITED: "You're going a bit fast — try again in a moment.",
  OFFLINE: "You're offline right now.",
  CIRCUIT_OPEN: 'The service is temporarily unavailable. Retrying shortly.',
  ACK_TIMEOUT: 'No response from the server. Please try again.',
  SERVER: 'Something went wrong on our end. Please try again.',
};

function userMessage(err) {
  if (!(err instanceof ApiError)) return err?.message || 'Unexpected error';
  return ERROR_COPY[err.code] || err.message;
}

async function _parseError(res, endpoint, method) {
  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON body */ }
  return new ApiError(
    payload?.error || payload?.message || `HTTP ${res.status}`,
    {
      status: res.status,
      code: payload?.code || (res.status === 429 ? 'RATE_LIMITED' : res.status >= 500 ? 'SERVER' : undefined),
      details: payload?.details,
      requestId: res.headers.get('x-request-id'),
      retryable: res.status >= 500 || res.status === 429,
      endpoint, method,
    }
  );
}

/* ============================================================
   SECTION 3 — ABORT / TIMEOUT
   ============================================================ */

function _makeAbort(ms, external) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    try { ctrl.abort(new DOMException('Request timeout', 'TimeoutError')); }
    catch { ctrl.abort(); }
  }, ms);

  if (external) {
    if (external.aborted) ctrl.abort(external.reason);
    else external.addEventListener('abort', () => ctrl.abort(external.reason), { once: true });
  }
  return { signal: ctrl.signal, done: () => clearTimeout(timer) };
}

/** Register a controller for a logical "route" so navigation can cancel it. */
function registerRoute(name) {
  const ctrl = new AbortController();
  cancelRoute(name);            // replace any prior one
  _api.aborters.set(name, ctrl);
  return ctrl.signal;
}

function cancelRoute(name) {
  const prev = _api.aborters.get(name);
  if (prev) { prev.abort(new DOMException('Navigation', 'AbortError')); _api.aborters.delete(name); }
}

function cancelAllRoutes() {
  for (const [k] of _api.aborters) cancelRoute(k);
}

/* ============================================================
   SECTION 4 — LOGGER / METRICS / INSPECTOR
   ============================================================ */

function _record(entry) {
  _api.log.push(entry);
  if (_api.log.length > 200) _api.log.shift();

  _api.metrics.count++;
  if (entry.status >= 400 || entry.error) _api.metrics.errors++;
  _api.metrics.totalMs += entry.ms;

  if (AC.DEBUG) {
    const lvl = entry.error ? 'error' : entry.status >= 400 ? 'warn' : 'debug';
    console[lvl](`[api] ${entry.method} ${entry.endpoint} ${entry.status ?? '-'} ${entry.ms.toFixed(0)}ms`);
  }
  if (entry.ms > 3000) console.warn(`[api] slow: ${entry.method} ${entry.endpoint} ${entry.ms.toFixed(0)}ms`);
  if (_api.inspectorEl) _renderInspector();
}

function toggleNetworkInspector(force) {
  const on = force ?? !_api.inspectorEl;
  if (!on) { _api.inspectorEl?.remove(); _api.inspectorEl = null; return; }
  const el = document.createElement('div');
  el.id = 'network-inspector';
  Object.assign(el.style, {
    position: 'fixed', right: '12px', bottom: '12px', width: '420px',
    maxHeight: '45vh', overflow: 'auto', zIndex: 99999,
    background: 'rgba(12,14,18,.94)', color: '#d7dce5', fontSize: '11px',
    fontFamily: 'ui-monospace,Menlo,monospace', border: '1px solid #2a2f3a',
    borderRadius: '8px', padding: '8px', backdropFilter: 'blur(6px)',
  });
  document.body.appendChild(el);
  _api.inspectorEl = el;
  _renderInspector();
}

function _renderInspector() {
  if (!_api.inspectorEl) return;
  const rows = _api.log.slice(-50).reverse().map(e => {
    const color = e.error ? '#ff6b6b' : e.status >= 400 ? '#ffb454' : '#7ee787';
    return `<div style="display:flex;gap:6px;padding:2px 0;border-bottom:1px solid #1b1f27">
      <span style="color:${color};width:38px">${e.status ?? 'ERR'}</span>
      <span style="width:52px;opacity:.7">${e.method}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(e.endpoint)}</span>
      <span style="width:56px;text-align:right;opacity:.7">${e.ms.toFixed(0)}ms</span>
      <span data-replay="${_esc(e.method)} ${_esc(e.endpoint)}"
            style="cursor:pointer;color:#58a6ff">↻</span>
    </div>`;
  }).join('');
  const m = _api.metrics;
  _api.inspectorEl.innerHTML =
    `<div style="display:flex;justify-content:space-between;margin-bottom:6px">
       <b>network</b>
       <span style="opacity:.7">${m.count} req · ${m.errors} err · ${(m.totalMs / Math.max(1, m.count)).toFixed(0)}ms avg</span>
       <span id="net-clear" style="cursor:pointer;color:#58a6ff">clear</span>
     </div>${rows}`;

  _api.inspectorEl.querySelector('#net-clear').onclick = () => {
    _api.log = []; _api.metrics = { count: 0, errors: 0, totalMs: 0 }; _renderInspector();
  };
  _api.inspectorEl.querySelectorAll('[data-replay]').forEach(n => {
    n.onclick = () => {
      const [m2, ...rest] = n.dataset.replay.split(' ');
      apiCall(rest.join(' '), m2).then(() => showToast('Replayed', 'info')).catch(e => showToast(userMessage(e), 'error'));
    };
  });
}

const _esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ============================================================
   SECTION 5 — CACHE (STALE-WHILE-REVALIDATE)
   ============================================================ */

function cacheGet(endpoint, { ttl = AC.CACHE_TTL, force = false, signal } = {}) {
  const hit = _api.cache.get(endpoint);

  if (!force && hit && !hit.promise && Date.now() - hit.at < ttl) {
    return Promise.resolve(hit.data);
  }
  if (hit?.promise) return hit.promise;

  const promise = apiCall(endpoint, 'GET', null, false, { signal })
    .then(data => {
      _api.cache.set(endpoint, { data, at: Date.now(), promise: null });
      return data;
    })
    .catch(err => {
      if (hit?.data) { _api.cache.set(endpoint, { data: hit.data, at: hit.at, promise: null }); return hit.data; }
      _api.cache.delete(endpoint);
      throw err;
    });

  _api.cache.set(endpoint, { ...(hit || {}), promise, data: hit?.data });
  return promise;
}

function invalidateCache(prefix = '') {
  for (const k of [..._api.cache.keys()]) if (k.startsWith(prefix)) _api.cache.delete(k);
}

function clearCache() { _api.cache.clear(); }

function prefetch(endpoint) {
  if (_api.cache.has(endpoint)) return;
  cacheGet(endpoint).catch(() => {});
}

/* ============================================================
   SECTION 6 — RATE LIMIT + CIRCUIT BREAKER
   ============================================================ */

function _bucketKey(method, endpoint) {
  return `${method}:${endpoint.split('?')[0].split('/').slice(0, 4).join('/')}`;
}

function _allow(key, { rate = AC.RATE_DEFAULT.rate, burst = AC.RATE_DEFAULT.burst } = {}) {
  const now = Date.now();
  const b = _api.buckets.get(key) || { tokens: burst, last: now };
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(burst, b.tokens + elapsed * rate);
  b.last = now;
  if (b.tokens < 1) { _api.buckets.set(key, b); return false; }
  b.tokens -= 1;
  _api.buckets.set(key, b);
  return true;
}

function _breakerKey(endpoint) {
  return endpoint.split('?')[0].split('/').slice(0, 4).join('/');
}

function _breakerOpen(endpoint) {
  const b = _api.breakers.get(_breakerKey(endpoint));
  if (!b) return false;
  if (b.failures < AC.BREAKER_THRESHOLD) return false;
  if (Date.now() - b.openedAt > AC.BREAKER_COOLDOWN) {  // half-open
    b.failures = AC.BREAKER_THRESHOLD - 1;
    return false;
  }
  return true;
}

function _breakerRecord(endpoint, ok) {
  const key = _breakerKey(endpoint);
  const b = _api.breakers.get(key) || { failures: 0, openedAt: 0 };
  if (ok) b.failures = 0;
  else { b.failures++; if (b.failures === AC.BREAKER_THRESHOLD) b.openedAt = Date.now(); }
  _api.breakers.set(key, b);
}

/* ============================================================
   SECTION 7 — AUTH
   ============================================================ */

let authToken = localStorage.getItem('token') || null;
let refreshToken = localStorage.getItem('refresh') || null;
let currentUser = null;
let capabilities = new Set();

function jwtExp(token) {
  try {
    const p = token.split('.')[1];
    return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000;
  } catch { return 0; }
}

function setToken(token, refresh) {
  authToken = token || null;
  if (authToken) localStorage.setItem('token', authToken);
  else localStorage.removeItem('token');

  if (refresh !== undefined) {
    refreshToken = refresh;
    if (refresh) localStorage.setItem('refresh', refresh);
    else localStorage.removeItem('refresh');
  }

  scheduleRefresh();

  /* keep live socket credentials fresh */
  if (socket) {
    socket.auth = { token: authToken };
    if (!socket.connected && authToken) socket.connect();
  }
}

/** Single-flight refresh — concurrent 401s share one network call. */
function refreshAuth() {
  if (!refreshToken) return Promise.resolve(false);
  if (_api.refreshPromise) return _api.refreshPromise;

  _api.refreshPromise = (async () => {
    try {
      const r = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!r.ok) return false;
      const d = await r.json();
      setToken(d.token, d.refresh);
      return true;
    } catch { return false; }
    finally { _api.refreshPromise = null; }
  })();

  return _api.refreshPromise;
}

/** Refresh ~60s before the access token expires. */
function scheduleRefresh() {
  clearTimeout(_api.refreshTimer);
  const exp = jwtExp(authToken);
  if (!exp || !refreshToken) return;
  const delay = Math.max(5000, exp - Date.now() - 60000);
  _api.refreshTimer = setTimeout(() => { refreshAuth(); }, delay);
}

/* Cross-tab sync */
window.addEventListener('storage', e => {
  if (e.key === 'token' && e.newValue !== authToken) {
    authToken = e.newValue;
    if (e.newValue) { scheduleRefresh(); initializeSocket(); }
    else performLogoutCleanup();
  }
  if (e.key === 'refresh') refreshToken = e.newValue;
});

/* Capabilities */
async function loadCapabilities() {
  try {
    const d = await apiCall('/api/me/permissions');
    capabilities = new Set(d.permissions || []);
  } catch { capabilities = new Set(); }
  return capabilities;
}
const can = cap => capabilities.has('*') || capabilities.has(cap);

/* ============================================================
   SECTION 8 — UPLOADS (chunked, resumable, progress, cancel)
   ============================================================ */

/**
 * Upload a file in chunks so a dropped connection resumes from the
 * last confirmed offset instead of starting over.
 */
async function uploadFile(file, {
  endpoint = '/api/uploads',
  chunkSize = 2 * 1024 * 1024,
  onProgress = () => {},
  signal,
  concurrency = 1,
} = {}) {
  const session = await apiCall(`${endpoint}/init`, 'POST', {
    filename: file.name, size: file.size, mime: file.type,
  }, false, { signal });

  const { upload_id, chunk_size = chunkSize, uploaded = [] } = session;
  const size = chunk_size;
  const total = Math.ceil(file.size / size);
  const done = new Set(uploaded);
  let sent = done.size * size;

  onProgress({ loaded: sent, total: file.size, pct: sent / file.size });

  const queue = [];
  for (let i = 0; i < total; i++) if (!done.has(i)) queue.push(i);

  const worker = async () => {
    while (queue.length) {
      if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError');
      const i = queue.shift();
      const blob = file.slice(i * size, Math.min(file.size, (i + 1) * size));
      await apiCall(`${endpoint}/${upload_id}/chunk?index=${i}`, 'PUT', blob, true, { signal });
      sent += blob.size;
      onProgress({ loaded: sent, total: file.size, pct: sent / file.size });
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  return apiCall(`${endpoint}/${upload_id}/complete`, 'POST', null, false, { signal });
}

/* ============================================================
   SECTION 9 — apiCall CORE
   ============================================================ */

async function apiCall(endpoint, method = 'GET', body = null, isFormData = false, opts = {}) {
  const {
    _retry = false,
    timeout = AC.API_TIMEOUT,
    signal: callerSignal,
    dedupe = false,
    idempotencyKey,
    retries,
    rateKey,
    skipCache = false,
    validate,
    meta,
  } = opts;

  /* ---- mock mode ---- */
  if (AC.MOCK) return _mockCall(endpoint, method, body);

  /* ---- chaos (dev only) ---- */
  if (AC.CHAOS) await _applyChaos();

  /* ---- rate limit (protects against double-click, not abuse) ---- */
  if (!_allow(rateKey || _bucketKey(method, endpoint))) {
    throw new ApiError('Rate limited locally', { code: 'RATE_LIMITED', endpoint, method });
  }

  /* ---- circuit breaker (reads only — never block a write) ---- */
  if (method === 'GET' && _breakerOpen(endpoint)) {
    const cached = _api.cache.get(endpoint)?.data;
    if (cached !== undefined) return cached;
    throw new ApiError('Circuit open', { code: 'CIRCUIT_OPEN', endpoint, method });
  }

  const key = `${method}:${endpoint}`;
  if (dedupe && _api.inflight.has(key)) return _api.inflight.get(key);

  const run = async () => {
    const started = _now();
    const headers = {};
    if (!isFormData && body !== null) headers['Content-Type'] = 'application/json';
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (AC.ACTIVE_INSTITUTION) headers['X-Institution-Id'] = AC.ACTIVE_INSTITUTION;
    const csrf = _readCookie('csrf');
    if (csrf && method !== 'GET') headers['X-CSRF-Token'] = csrf;
    headers['X-Request-Id'] = _uuid();

    const { signal, done } = _makeAbort(timeout, callerSignal);

    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, {
        method, headers, signal,
        body: body === null ? undefined : (isFormData ? body : JSON.stringify(body)),
      });
    } catch (err) {
      done();
      const ms = _now() - started;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        _breakerRecord(endpoint, false);
        _record({ method, endpoint, ms, error: true, status: null, meta });
        if (callerSignal?.aborted) {
          throw new ApiError('Aborted', { code: 'ABORTED', endpoint, method });
        }
        throw new ApiError('Request timed out', { code: 'TIMEOUT', retryable: true, endpoint, method });
      }
      _breakerRecord(endpoint, false);
      _record({ method, endpoint, ms, error: true, status: null, meta });
      throw new ApiError(err.message || 'Network error', { code: 'NETWORK', retryable: true, endpoint, method });
    }
    done();

    const ms = _now() - started;

    /* ---- 401 → single-flight refresh → retry once ---- */
    if (res.status === 401 && !_retry && refreshToken) {
      const ok = await refreshAuth();
      if (!ok) {
        _record({ method, endpoint, ms, status: 401, meta });
        performLogoutCleanup();
        throw new ApiError('Session expired', { status: 401, code: 'AUTH_EXPIRED', endpoint, method });
      }
      return apiCall(endpoint, method, body, isFormData, { ...opts, _retry: true });
    }

    /* ---- error path ---- */
    if (!res.ok) {
      const err = await _parseError(res, endpoint, method);
      _breakerRecord(endpoint, false);
      _record({ method, endpoint, ms, status: res.status, error: true, meta });

      const maxRetries = retries ?? (method === 'GET' ? AC.RETRY_GET : AC.RETRY_MUTATION);
      if (err.retryable && maxRetries > 0) {
        const retryAfter = Number(res.headers.get('retry-after')) * 1000;
        const backoff = retryAfter || (2 ** (AC.RETRY_GET - maxRetries) * 300 + Math.random() * 200);
        await _sleep(backoff);
        return apiCall(endpoint, method, body, isFormData, { ...opts, retries: maxRetries - 1, _retry });
      }
      throw err;
    }

    /* ---- success ---- */
    _breakerRecord(endpoint, true);
    _record({ method, endpoint, ms, status: res.status, meta });

    if (res.status === 204) return null;

    const text = await res.text();
    if (!text) return null;

    let data;
    try { data = JSON.parse(text); }
    catch { throw new ApiError('Malformed JSON response', { status: res.status, endpoint, method }); }

    if (validate) {
      const parsed = validate(data);
      if (parsed && typeof parsed.then === 'function') return parsed; // async validator
      return parsed === undefined ? data : parsed;
    }
    return data;
  };

  const p = run().finally(() => _api.inflight.delete(key));
  if (dedupe) _api.inflight.set(key, p);
  return p;
}

function _readCookie(name) {
  return document.cookie.split('; ').reduce((acc, c) => {
    const [k, v] = c.split('=');
    return k === name ? decodeURIComponent(v) : acc;
  }, null);
}

/* ============================================================
   SECTION 10 — HIGH-LEVEL HELPERS
   ============================================================ */

/** Optimistic mutation with rollback + cache invalidation. */
async function mutate({ endpoint, method = 'POST', body, optimistic, invalidate, signal, idempotencyKey }) {
  const rollback = optimistic ? optimistic() : null;
  try {
    const result = await apiCall(endpoint, method, body, false, {
      signal,
      idempotencyKey: idempotencyKey ?? (method === 'POST' ? _uuid() : undefined),
    });
    if (invalidate) invalidateCache(invalidate);
    return result;
  } catch (err) {
    try { rollback?.(); } catch (_) {}
    throw err;
  }
}

/** Async iterator over a cursor-paginated endpoint. */
async function* paginate(endpoint, { limit = 50, signal, params = {} } = {}) {
  let cursor = null;
  do {
    const qs = new URLSearchParams({ ...params, limit, ...(cursor ? { cursor } : {}) });
    const page = await apiCall(`${endpoint}?${qs}`, 'GET', null, false, { signal });
    yield page.items ?? page;
    cursor = page.next_cursor ?? null;
  } while (cursor);
}

/** Load every page into one array (use only for small collections). */
async function paginateAll(endpoint, opts) {
  const out = [];
  for await (const chunk of paginate(endpoint, opts)) out.push(...chunk);
  return out;
}

/* ============================================================
   SECTION 11 — ENDPOINT REGISTRY
   ============================================================ */

const api = {
  auth: {
    login: (email, password) => apiCall('/api/auth/login', 'POST', { email, password }),
    logout: () => apiCall('/api/auth/logout', 'POST'),
    me: () => cacheGet('/api/auth/me'),
    permissions: () => apiCall('/api/me/permissions'),
  },
  consultations: {
    list: (params = {}) => cacheGet(`/api/consultations?${new URLSearchParams(params)}`),
    get: id => cacheGet(`/api/consultations/${id}`),
    create: payload => mutate({ endpoint: '/api/consultations', body: payload, invalidate: '/api/consultations' }),
    messages: (id, since = 0) => apiCall(`/api/consultations/${id}/messages?since=${since}`),
    send: (id, text) => mutate({
      endpoint: `/api/consultations/${id}/messages`,
      body: { body: text },
      idempotencyKey: _uuid(),
    }),
  },
  notifications: {
    list: () => cacheGet('/api/notifications'),
    markRead: id => mutate({ endpoint: `/api/notifications/${id}/read`, method: 'PATCH', invalidate: '/api/notifications' }),
    markAllRead: () => mutate({ endpoint: '/api/notifications/read-all', method: 'POST', invalidate: '/api/notifications' }),
  },
  sync: {
    since: cursor => apiCall(`/api/sync?since=${cursor}`),
  },
  uploads: {
    file: uploadFile,
  },
};

/* ============================================================
   SECTION 12 — SOCKET LAYER
   ============================================================ */

let socket = null;

/* ---- 12.1 toast grouping ---------------------------------- */

const _toastGroups = new Map();

function toastOnce(key, message, level = 'info', ttl = 4000) {
  const g = _toastGroups.get(key);
  if (g) {
    g.count++;
    g.message = message;
    clearTimeout(g.timer);
    g.timer = setTimeout(() => _toastGroups.delete(key), AC.TOAST_GROUP_MS);
    if (g.el) g.el.textContent = `${message} (${g.count})`;
    return;
  }
  const el = showToast(message, level, ttl, true); // returns node if supported
  const group = { count: 1, message, el, timer: setTimeout(() => _toastGroups.delete(key), AC.TOAST_GROUP_MS) };
  _toastGroups.set(key, group);
}

/* ---- 12.2 rooms ------------------------------------------- */

function syncRooms(desired) {
  if (!socket) return;
  const next = desired instanceof Set ? desired : new Set(desired);
  for (const r of _api.socketRooms) if (!next.has(r)) socket.emit('leave', r);
  for (const r of next) if (!_api.socketRooms.has(r)) socket.emit('join', r);
  _api.socketRooms = next;
}

/* ---- 12.3 presence ---------------------------------------- */

function _presenceSet(userId, status) {
  _api.presence[userId] = { status, at: Date.now() };
  if (typeof renderPresence === 'function') renderPresence(userId, status);
}

function _startPresenceSweeper() {
  clearInterval(_api.presenceSweeper);
  _api.presenceSweeper = setInterval(() => {
    const now = Date.now();
    for (const [uid, p] of Object.entries(_api.presence)) {
      if (now - p.at > AC.PRESENCE_TTL && p.status !== 'offline') {
        _presenceSet(uid, 'offline');
      }
    }
  }, AC.PRESENCE_TTL / 2);
}

/* ---- 12.4 chat helpers ------------------------------------ */

function _messageList(cid) {
  if (!S.chatMessages[cid]) S.chatMessages[cid] = [];
  return S.chatMessages[cid];
}

/** Insert a message by sequence, deduping by id. Safe against replays/out-of-order. */
function insertMessage(msg) {
  const list = _messageList(msg.consultation_id);
  if (list.some(m => m.id === msg.id)) return false;
  if (msg.seq != null) {
    const idx = list.findIndex(m => m.seq != null && m.seq > msg.seq);
    if (idx === -1) list.push(msg); else list.splice(idx, 0, msg);
  } else {
    list.push(msg);
  }
  return true;
}

function markUnread(cid) {
  S.unread = S.unread || {};
  S.unread[cid] = (S.unread[cid] || 0) + 1;
  if (typeof updateUnreadBadges === 'function') updateUnreadBadges();
}

function clearUnread(cid) {
  if (S.unread?.[cid]) {
    S.unread[cid] = 0;
    if (typeof updateUnreadBadges === 'function') updateUnreadBadges();
    socket?.emit('mark_read', { consultation_id: cid });
  }
}

/* ---- 12.5 socket event registry --------------------------- */

const _reload = (() => {
  let timer = null;
  return () => new Promise(resolve => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try { await loadAllData(); rerenderRoleContent(); }
      finally { resolve(); }
    }, 200);
  });
})();

const SOCKET_HANDLERS = {
  notification: n => {
    S.notifications.unshift(n);
    toastOnce(`notif:${n.id}`, n.title || 'New notification', 'info');
    updateNotificationBadge();
    if (notificationsPanelOpen) renderNotificationsPanel();
  },

  broadcast: b => {
    toastOnce(`broadcast:${b.id}`, `${b.title}: ${b.message}`, 'info', 6000);
  },

  new_message: msg => {
    const cid = msg.consultation_id;
    if (!insertMessage(msg)) return;
    if (currentChatId === cid) {
      renderChatMessages(cid);
      clearUnread(cid);
    } else {
      markUnread(cid);
    }
  },

  message_ack: ({ temp_id, message }) => {
    const list = S.chatMessages[message.consultation_id] || [];
    const tmp = list.find(m => m.id === temp_id);
    if (tmp) Object.assign(tmp, message, { pending: false, failed: false });
    if (currentChatId === message.consultation_id) renderChatMessages(message.consultation_id);
  },

  typing: ({ consultation_id, user_id, is_typing }) => {
    if (currentChatId !== consultation_id) return;
    const el = $('#chat-typing');
    if (!el) return;
    if (is_typing && user_id !== currentUser?.id) {
      el.textContent = 'typing...';
      clearTimeout(_api.typingTimers[consultation_id]);
      _api.typingTimers[consultation_id] = setTimeout(() => {
        const e2 = $('#chat-typing'); if (e2) e2.textContent = '';
      }, 5000);
    } else {
      clearTimeout(_api.typingTimers[consultation_id]);
      el.textContent = '';
    }
  },

  presence: ({ user_id, status }) => _presenceSet(user_id, status),

  'institution:approval': d => {
    toastOnce(`approval:${d.id}`, `New approval request: ${d.title}`, 'info');
    invalidateCache('/api/approvals');
    _reload();
  },

  'institution:assessment_due': d =>
    toastOnce(`assess:${d.id}`, `Assessment due: ${d.title}`, 'warning', 6000),

  'institution:certificate_expiring': d =>
    toastOnce(`cert:${d.serial}`, `Certificate expiring soon: ${d.serial}`, 'warning', 6000),

  'consultation:reminder': d =>
    toastOnce(`remind:${d.consultation_id}`, d.message || 'Session reminder', 'info', 6000),

  'consultation:escrow_released': d => {
    toastOnce(`escrow:${d.consultation_id}`, `Escrow released: ${fmtCur(d.amount)}`, 'success');
    invalidateCache('/api/consultations');
    _reload();
  },

  'enrollment:certificate_issued': d => {
    toastOnce(`enroll:${d.course_id}`, `Certificate ready: ${d.course_title}`, 'success');
    invalidateCache('/api/enrollments');
    _reload();
  },

  'wellness:alert': d =>
    toastOnce(`wellness:${d.trainee_id}`, `Wellness alert: ${d.trainee_name}`, 'warning', 6000),
};

/* ---- 12.6 ack-based emit + offline outbox ------------------ */

function emitAck(event, payload, timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      if (event !== 'join' && event !== 'leave' && event !== 'mark_read') {
        _api.outbox.push({ event, payload });
      }
      reject(new ApiError('Not connected', { code: 'OFFLINE' }));
      return;
    }
    const t = setTimeout(
      () => reject(new ApiError(`${event} timed out`, { code: 'ACK_TIMEOUT' })), timeout);
    socket.emit(event, payload, ack => {
      clearTimeout(t);
      if (ack?.error) reject(new ApiError(ack.error, { code: ack.code }));
      else resolve(ack);
    });
  });
}

async function _flushOutbox() {
  const pending = _api.outbox.splice(0);
  for (const item of pending) {
    try { await emitAck(item.event, item.payload); }
    catch (e) { if (e.code === 'OFFLINE') { _api.outbox.unshift(item); break; } }
  }
}

/* ---- 12.7 optimistic chat send ---------------------------- */

async function sendChatMessage(cid, text) {
  const list = _messageList(cid);
  const tempId = `tmp-${_uuid()}`;
  const optimistic = {
    id: tempId, consultation_id: cid, body: text,
    sender_id: currentUser?.id, created_at: new Date().toISOString(),
    pending: true,
  };
  list.push(optimistic);
  if (currentChatId === cid) renderChatMessages(cid);

  try {
    const saved = await emitAck('send_message', {
      consultation_id: cid, body: text, temp_id: tempId,
    });
    const real = saved?.message ?? saved;
    if (real) {
      const i = list.findIndex(m => m.id === tempId);
      if (i !== -1) list[i] = { ...real, pending: false };
    }
  } catch (err) {
    optimistic.pending = false;
    optimistic.failed = true;
    toastOnce(`sendfail:${cid}`, userMessage(err), 'error');
  } finally {
    if (currentChatId === cid) renderChatMessages(cid);
  }
}

/* ---- 12.8 resync after reconnect -------------------------- */

async function resync() {
  try {
    const cursor = S.lastEventId || 0;
    const { events = [], cursor: next } = await api.sync.since(cursor);
    for (const e of events) {
      const fn = SOCKET_HANDLERS[e.type];
      if (fn) { try { fn(e.payload); } catch (err) { console.warn('[socket] handler', e.type, err); } }
    }
    S.lastEventId = next ?? cursor;

    invalidateCache();
    await loadAllData();
    rerenderRoleContent();
    if (currentChatId) await loadChatMessages(currentChatId);
  } catch (e) {
    console.warn('[socket] resync failed', e);
  }
}

/* ---- 12.9 lifecycle --------------------------------------- */

function initializeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  _api.socketRooms = new Set();
  if (!authToken || typeof io === 'undefined') return;

  socket = io(API_BASE || undefined, {
    auth: { token: authToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 8000,
    reconnectionAttempts: Infinity,
  });

  for (const [evt, fn] of Object.entries(SOCKET_HANDLERS)) socket.on(evt, fn);

  socket.on('connect', () => {
    console.log('[socket] connected');
    _api.wasDisconnected && resync().catch(() => {});
    _api.wasDisconnected = false;
    _flushOutbox();
    _startPresenceSweeper();
  });

  socket.on('disconnect', reason => {
    _api.wasDisconnected = true;
    _api.socketRooms = new Set();     // server dropped them
    clearInterval(_api.presenceSweeper);
    console.log('[socket] disconnected:', reason);
  });

  socket.on('connect_error', async err => {
    console.warn('[socket] connect_error:', err.message);
    if (/unauthor|jwt|token/i.test(err.message)) {
      if (await refreshAuth()) initializeSocket();
      else performLogoutCleanup();
    }
  });

  /* app-level heartbeat to catch half-open connections */
  clearInterval(socket._hb);
  socket._hb = setInterval(() => {
    if (socket?.connected) socket.emit('ping', { t: Date.now() });
  }, AC.HEARTBEAT_MS);
}

/* ============================================================
   SECTION 13 — LOGOUT CLEANUP (must be total)
   ============================================================ */

function performLogoutCleanup() {
  clearTimeout(_api.refreshTimer);
  clearInterval(_api.presenceSweeper);
  cancelAllRoutes();

  authToken = null;
  refreshToken = null;
  currentUser = null;
  capabilities = new Set();

  localStorage.removeItem('token');
  localStorage.removeItem('refresh');

  clearCache();
  _api.inflight.clear();
  _api.outbox.length = 0;
  _api.presence = {};
  _api.socketRooms = new Set();

  if (socket) { socket.removeAllListeners(); socket.disconnect(); socket = null; }

  if (typeof logout === 'function') logout();
}

/* ============================================================
   SECTION 14 — MOCK + CHAOS
   ============================================================ */

const MOCK_ROUTES = {
  'GET /api/auth/me': { id: 'u1', name: 'Test User', role: 'admin' },
  'GET /api/me/permissions': { permissions: ['*'] },
  'GET /api/notifications': { items: [], next_cursor: null },
  'GET /api/consultations': { items: [], next_cursor: null },
  'GET /api/sync': { events: [], cursor: 0 },
};

function _mockCall(endpoint, method) {
  const bare = endpoint.split('?')[0];
  const hit = MOCK_ROUTES[`${method} ${bare}`] ?? MOCK_ROUTES[`${method} ${endpoint}`];
  return new Promise((resolve, reject) => setTimeout(() => {
    if (hit !== undefined) resolve(structuredClone(hit));
    else reject(new ApiError(`No mock for ${method} ${endpoint}`, { status: 404, code: 'MOCK_MISS' }));
  }, 120 + Math.random() * 200));
}

async function _applyChaos() {
  const { failRate = 0, slowRate = 0 } = AC.CHAOS || {};
  if (slowRate && Math.random() < slowRate) await _sleep(1500 + Math.random() * 2500);
  if (failRate && Math.random() < failRate) {
    throw new ApiError('Chaos failure', { status: 503, code: 'SERVER', retryable: true });
  }
}

/* ============================================================
   SECTION 15 — INIT
   ============================================================ */

(function initApi() {
  if (AC.DEBUG) window.__api = { _api, apiCall, cacheGet, invalidateCache, toggleNetworkInspector };
  if (authToken) scheduleRefresh();

  window.addEventListener('online', () => {
    _flushOutbox();
    if (socket && !socket.connected) socket.connect();
  });
  window.addEventListener('offline', () => {
    if (typeof showToast === 'function') showToast("You're offline", 'warning');
  });
})();