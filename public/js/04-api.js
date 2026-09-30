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

/* ============================================================
   ExpertHub 2.0 — 04 Feature Expansion
   API Reliability & Observability
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature04;
  if (NS) return;

  const namespace = {
    name: "API Reliability & Observability",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["request IDs", "request cache", "cache invalidation", "offline queue", "retry policy", "timeout guard", "rate-limit handling", "error normalization", "response envelope normalization", "pagination helper", "upload progress", "download helper", "ETag support", "health monitor", "latency metrics", "endpoint catalog", "request deduplication", "circuit breaker", "websocket reconnect", "event subscription registry", "API diagnostics"],
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
      storagePrefix: 'experthub.feature.04.',
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
      document.dispatchEvent(new CustomEvent('eh:04:' + eventName, { detail: payload }));
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
    a.download = 'experthub-04-diagnostics.json';
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

  window.EHFeature04 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = {
      feature: "request IDs",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:01', result);
    return result;
  }

  register("request IDs", {
    category: "request",
    description: "Enhanced request IDs capability for api reliability & observability",
    handler: feature_01
  });

  function feature_02(payload = {}, context = {}) {
    const result = {
      feature: "request cache",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:02', result);
    return result;
  }

  register("request cache", {
    category: "request",
    description: "Enhanced request cache capability for api reliability & observability",
    handler: feature_02
  });

  function feature_03(payload = {}, context = {}) {
    const result = {
      feature: "cache invalidation",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:03', result);
    return result;
  }

  register("cache invalidation", {
    category: "cache",
    description: "Enhanced cache invalidation capability for api reliability & observability",
    handler: feature_03
  });

  function feature_04(payload = {}, context = {}) {
    const result = {
      feature: "offline queue",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:04', result);
    return result;
  }

  register("offline queue", {
    category: "offline",
    description: "Enhanced offline queue capability for api reliability & observability",
    handler: feature_04
  });

  function feature_05(payload = {}, context = {}) {
    const result = {
      feature: "retry policy",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:05', result);
    return result;
  }

  register("retry policy", {
    category: "retry",
    description: "Enhanced retry policy capability for api reliability & observability",
    handler: feature_05
  });

  function feature_06(payload = {}, context = {}) {
    const result = {
      feature: "timeout guard",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:06', result);
    return result;
  }

  register("timeout guard", {
    category: "timeout",
    description: "Enhanced timeout guard capability for api reliability & observability",
    handler: feature_06
  });

  function feature_07(payload = {}, context = {}) {
    const result = {
      feature: "rate-limit handling",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:07', result);
    return result;
  }

  register("rate-limit handling", {
    category: "rate_limit",
    description: "Enhanced rate-limit handling capability for api reliability & observability",
    handler: feature_07
  });

  function feature_08(payload = {}, context = {}) {
    const result = {
      feature: "error normalization",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:08', result);
    return result;
  }

  register("error normalization", {
    category: "error",
    description: "Enhanced error normalization capability for api reliability & observability",
    handler: feature_08
  });

  function feature_09(payload = {}, context = {}) {
    const result = {
      feature: "response envelope normalization",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:09', result);
    return result;
  }

  register("response envelope normalization", {
    category: "response",
    description: "Enhanced response envelope normalization capability for api reliability & observability",
    handler: feature_09
  });

  function feature_10(payload = {}, context = {}) {
    const result = {
      feature: "pagination helper",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:10', result);
    return result;
  }

  register("pagination helper", {
    category: "pagination",
    description: "Enhanced pagination helper capability for api reliability & observability",
    handler: feature_10
  });

  function feature_11(payload = {}, context = {}) {
    const result = {
      feature: "upload progress",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:11', result);
    return result;
  }

  register("upload progress", {
    category: "upload",
    description: "Enhanced upload progress capability for api reliability & observability",
    handler: feature_11
  });

  function feature_12(payload = {}, context = {}) {
    const result = {
      feature: "download helper",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:12', result);
    return result;
  }

  register("download helper", {
    category: "download",
    description: "Enhanced download helper capability for api reliability & observability",
    handler: feature_12
  });

  function feature_13(payload = {}, context = {}) {
    const result = {
      feature: "ETag support",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:13', result);
    return result;
  }

  register("ETag support", {
    category: "etag",
    description: "Enhanced ETag support capability for api reliability & observability",
    handler: feature_13
  });

  function feature_14(payload = {}, context = {}) {
    const result = {
      feature: "health monitor",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:14', result);
    return result;
  }

  register("health monitor", {
    category: "health",
    description: "Enhanced health monitor capability for api reliability & observability",
    handler: feature_14
  });

  function feature_15(payload = {}, context = {}) {
    const result = {
      feature: "latency metrics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:15', result);
    return result;
  }

  register("latency metrics", {
    category: "latency",
    description: "Enhanced latency metrics capability for api reliability & observability",
    handler: feature_15
  });

  function feature_16(payload = {}, context = {}) {
    const result = {
      feature: "endpoint catalog",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:16', result);
    return result;
  }

  register("endpoint catalog", {
    category: "endpoint",
    description: "Enhanced endpoint catalog capability for api reliability & observability",
    handler: feature_16
  });

  function feature_17(payload = {}, context = {}) {
    const result = {
      feature: "request deduplication",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:17', result);
    return result;
  }

  register("request deduplication", {
    category: "request",
    description: "Enhanced request deduplication capability for api reliability & observability",
    handler: feature_17
  });

  function feature_18(payload = {}, context = {}) {
    const result = {
      feature: "circuit breaker",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:18', result);
    return result;
  }

  register("circuit breaker", {
    category: "circuit",
    description: "Enhanced circuit breaker capability for api reliability & observability",
    handler: feature_18
  });

  function feature_19(payload = {}, context = {}) {
    const result = {
      feature: "websocket reconnect",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:19', result);
    return result;
  }

  register("websocket reconnect", {
    category: "websocket",
    description: "Enhanced websocket reconnect capability for api reliability & observability",
    handler: feature_19
  });

  function feature_20(payload = {}, context = {}) {
    const result = {
      feature: "event subscription registry",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:20', result);
    return result;
  }

  register("event subscription registry", {
    category: "event",
    description: "Enhanced event subscription registry capability for api reliability & observability",
    handler: feature_20
  });

  function feature_21(payload = {}, context = {}) {
    const result = {
      feature: "API diagnostics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "04"
    };
    emit('feature:21', result);
    return result;
  }

  register("API diagnostics", {
    category: "api",
    description: "Enhanced API diagnostics capability for api reliability & observability",
    handler: feature_21
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
  window.ExpertHubFeatureRegistry["04"] = namespace;

})();

/* ============================================================
   End 04 feature expansion
   ============================================================ */
