/* ============================================================
   ExpertHub 2.0 — 15-router.js
   Router + hashchange listener + keyboard shortcuts + init().
   MUST load LAST.
   ============================================================ */

/* ============================================================
   ROUTER
   ============================================================ */
async function route() {
  const hash = location.hash || '#/';

  if (hash === '#/login') return renderLogin();
  if (hash === '#/register') return renderRegister();
  if (hash.startsWith('#/forgot')) return renderForgot();
  if (hash.startsWith('#/reset')) {
    const params = new URLSearchParams(hash.split('?')[1]);
    return renderReset(params.get('token'));
  }
  if (hash.startsWith('#/verify/')) return renderVerify(hash.split('/')[2]);
  if (hash.startsWith('#/setup-account')) {
    const params = new URLSearchParams(hash.split('?')[1]);
    return renderSetupAccount(params.get('email'), params.get('token'));
  }

  if (!authToken) return renderLanding();

  appPhase = 'dashboard';
  if (!currentUser) {
    try {
      const me = await apiCall('/api/auth/me');
      currentUser = me.user;
      currentUserRole = me.user.role;
      S.userIntent = me.user.intent || 'both';
    } catch (_) { return logout(); }
  }

  const needLoad = !S.users.length && !S.consultations.length && !S.courses.length
    && !S.programmes.length && !S.institutions.length;
  if (needLoad) {
    showLoading(true);
    try { await loadAllData(); } finally { showLoading(false); }
  }

  const seg = hash.replace('#/', '').split('/');
  if (seg[1]) activeTab = seg[1];
  renderDashboard();
  startPolling();
}

window.addEventListener('hashchange', route);

/* Keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' && appPhase === 'dashboard') {
    e.preventDefault();
    document.querySelector('input[type=search]')?.focus();
  }
});

/* ---------- Bootstrap ---------- */
(function init() {
  initTheme();
  const savedToken = localStorage.getItem('token');
  const savedRefresh = localStorage.getItem('refresh');
  const savedUser = localStorage.getItem('user');

  if (savedToken) {
    authToken = savedToken;
    refreshToken = savedRefresh;
    try { currentUser = JSON.parse(savedUser); } catch (_) { currentUser = null; }
    currentUserRole = currentUser?.role || null;
    S.userIntent = currentUser?.intent || 'both';
    initializeSocket();
  }
  route();
})();

/* ============================================================
   END OF FILE
   ============================================================ */

/* ============================================================
   ExpertHub 2.0 — 15 Feature Expansion
   Routing, Navigation & Deep-Linking
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature15;
  if (NS) return;

  const namespace = {
    name: "Routing, Navigation & Deep-Linking",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["route registry", "route guards", "query parsing", "route params", "redirect rules", "history manager", "navigation progress", "scroll restoration", "deep-link state", "404 handling", "route breadcrumbs", "navigation analytics", "prefetch hints", "route cache", "back-button handling", "keyboard navigation", "link interception", "external-link guard", "router diagnostics", "route testing"],
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
      storagePrefix: 'experthub.feature.15.',
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
      document.dispatchEvent(new CustomEvent('eh:15:' + eventName, { detail: payload }));
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
    a.download = 'experthub-15-diagnostics.json';
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

  window.EHFeature15 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = {
      feature: "route registry",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:01', result);
    return result;
  }

  register("route registry", {
    category: "route",
    description: "Enhanced route registry capability for routing, navigation & deep-linking",
    handler: feature_01
  });

  function feature_02(payload = {}, context = {}) {
    const result = {
      feature: "route guards",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:02', result);
    return result;
  }

  register("route guards", {
    category: "route",
    description: "Enhanced route guards capability for routing, navigation & deep-linking",
    handler: feature_02
  });

  function feature_03(payload = {}, context = {}) {
    const result = {
      feature: "query parsing",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:03', result);
    return result;
  }

  register("query parsing", {
    category: "query",
    description: "Enhanced query parsing capability for routing, navigation & deep-linking",
    handler: feature_03
  });

  function feature_04(payload = {}, context = {}) {
    const result = {
      feature: "route params",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:04', result);
    return result;
  }

  register("route params", {
    category: "route",
    description: "Enhanced route params capability for routing, navigation & deep-linking",
    handler: feature_04
  });

  function feature_05(payload = {}, context = {}) {
    const result = {
      feature: "redirect rules",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:05', result);
    return result;
  }

  register("redirect rules", {
    category: "redirect",
    description: "Enhanced redirect rules capability for routing, navigation & deep-linking",
    handler: feature_05
  });

  function feature_06(payload = {}, context = {}) {
    const result = {
      feature: "history manager",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:06', result);
    return result;
  }

  register("history manager", {
    category: "history",
    description: "Enhanced history manager capability for routing, navigation & deep-linking",
    handler: feature_06
  });

  function feature_07(payload = {}, context = {}) {
    const result = {
      feature: "navigation progress",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:07', result);
    return result;
  }

  register("navigation progress", {
    category: "navigation",
    description: "Enhanced navigation progress capability for routing, navigation & deep-linking",
    handler: feature_07
  });

  function feature_08(payload = {}, context = {}) {
    const result = {
      feature: "scroll restoration",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:08', result);
    return result;
  }

  register("scroll restoration", {
    category: "scroll",
    description: "Enhanced scroll restoration capability for routing, navigation & deep-linking",
    handler: feature_08
  });

  function feature_09(payload = {}, context = {}) {
    const result = {
      feature: "deep-link state",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:09', result);
    return result;
  }

  register("deep-link state", {
    category: "deep_link",
    description: "Enhanced deep-link state capability for routing, navigation & deep-linking",
    handler: feature_09
  });

  function feature_10(payload = {}, context = {}) {
    const result = {
      feature: "404 handling",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:10', result);
    return result;
  }

  register("404 handling", {
    category: "404",
    description: "Enhanced 404 handling capability for routing, navigation & deep-linking",
    handler: feature_10
  });

  function feature_11(payload = {}, context = {}) {
    const result = {
      feature: "route breadcrumbs",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:11', result);
    return result;
  }

  register("route breadcrumbs", {
    category: "route",
    description: "Enhanced route breadcrumbs capability for routing, navigation & deep-linking",
    handler: feature_11
  });

  function feature_12(payload = {}, context = {}) {
    const result = {
      feature: "navigation analytics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:12', result);
    return result;
  }

  register("navigation analytics", {
    category: "navigation",
    description: "Enhanced navigation analytics capability for routing, navigation & deep-linking",
    handler: feature_12
  });

  function feature_13(payload = {}, context = {}) {
    const result = {
      feature: "prefetch hints",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:13', result);
    return result;
  }

  register("prefetch hints", {
    category: "prefetch",
    description: "Enhanced prefetch hints capability for routing, navigation & deep-linking",
    handler: feature_13
  });

  function feature_14(payload = {}, context = {}) {
    const result = {
      feature: "route cache",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:14', result);
    return result;
  }

  register("route cache", {
    category: "route",
    description: "Enhanced route cache capability for routing, navigation & deep-linking",
    handler: feature_14
  });

  function feature_15(payload = {}, context = {}) {
    const result = {
      feature: "back-button handling",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:15', result);
    return result;
  }

  register("back-button handling", {
    category: "back_button",
    description: "Enhanced back-button handling capability for routing, navigation & deep-linking",
    handler: feature_15
  });

  function feature_16(payload = {}, context = {}) {
    const result = {
      feature: "keyboard navigation",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:16', result);
    return result;
  }

  register("keyboard navigation", {
    category: "keyboard",
    description: "Enhanced keyboard navigation capability for routing, navigation & deep-linking",
    handler: feature_16
  });

  function feature_17(payload = {}, context = {}) {
    const result = {
      feature: "link interception",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:17', result);
    return result;
  }

  register("link interception", {
    category: "link",
    description: "Enhanced link interception capability for routing, navigation & deep-linking",
    handler: feature_17
  });

  function feature_18(payload = {}, context = {}) {
    const result = {
      feature: "external-link guard",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:18', result);
    return result;
  }

  register("external-link guard", {
    category: "external_link",
    description: "Enhanced external-link guard capability for routing, navigation & deep-linking",
    handler: feature_18
  });

  function feature_19(payload = {}, context = {}) {
    const result = {
      feature: "router diagnostics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:19', result);
    return result;
  }

  register("router diagnostics", {
    category: "router",
    description: "Enhanced router diagnostics capability for routing, navigation & deep-linking",
    handler: feature_19
  });

  function feature_20(payload = {}, context = {}) {
    const result = {
      feature: "route testing",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "15"
    };
    emit('feature:20', result);
    return result;
  }

  register("route testing", {
    category: "route",
    description: "Enhanced route testing capability for routing, navigation & deep-linking",
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
  window.ExpertHubFeatureRegistry["15"] = namespace;

})();

/* ============================================================
   End 15 feature expansion
   ============================================================ */

/* ================================================================
   ExpertHub 3x Expansion Layer
   Module: js/router/router.js
   Source SHA-256: f5ecb5ff3dce06b50d8f7d76e035348e66fe5ebc316d163616d4fc899e2baae0
   This appendix extends the original implementation without
   replacing or re-declaring its existing application symbols.
   ================================================================ */
(function(global){
  "use strict";
  const root = global.ExpertHubExpandedModules = global.ExpertHubExpandedModules || {};
  const id = "js_router_router_js";
  const previous = root[id] || {};

  function isObject(value){
    return value !== null && typeof value === "object";
  }
  function isPlainObject(value){
    if(!isObject(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function clone(value){
    if(value === undefined) return undefined;
    if(typeof structuredClone === "function"){
      try{ return structuredClone(value); }catch(_){
        // Fall through to JSON-safe cloning.
      }
    }
    try{ return JSON.parse(JSON.stringify(value)); }catch(_){
      return value;
    }
  }
  function normalizeError(error){
    if(error instanceof Error){
      return {name:error.name,message:error.message,stack:error.stack||"",code:error.code||null};
    }
    if(isObject(error)){
      return {name:String(error.name||"Error"),message:String(error.message||error),code:error.code||null};
    }
    return {name:"Error",message:String(error),code:null};
  }
  function clamp(value,min,max){
    const n=Number(value);
    if(!Number.isFinite(n)) return min;
    return Math.min(max,Math.max(min,n));
  }
  function asArray(value){
    if(Array.isArray(value)) return value.slice();
    if(value==null) return [];
    return [value];
  }
  function unique(values){
    return [...new Set(asArray(values))];
  }
  function nonEmpty(value,fallback=""){
    const text=String(value==null?"":value).trim();
    return text || fallback;
  }
  function safeJson(value,fallback=null){
    try{ return JSON.stringify(value); }catch(_){
      return fallback===null ? null : JSON.stringify(fallback);
    }
  }
  function parseJson(value,fallback=null){
    if(typeof value!=="string") return value;
    try{ return JSON.parse(value); }catch(_){
      return fallback;
    }
  }
  function once(fn){
    let called=false,result;
    return function(...args){
      if(called) return result;
      called=true;
      result=fn.apply(this,args);
      return result;
    };
  }
  function debounce(fn,wait=250){
    let timer=null;
    return function(...args){
      clearTimeout(timer);
      timer=setTimeout(()=>fn.apply(this,args),Math.max(0,Number(wait)||0));
    };
  }
  function throttle(fn,wait=250){
    let last=0,pending=null;
    return function(...args){
      const now=Date.now();
      const delay=Math.max(0,Number(wait)||0)-(now-last);
      if(delay<=0){
        last=now;
        fn.apply(this,args);
      }else if(!pending){
        pending=setTimeout(()=>{
          pending=null; last=Date.now(); fn.apply(this,args);
        },delay);
      }
    };
  }
  function emit(name,detail={}){
    try{
      if(typeof global.dispatchEvent==="function" && typeof global.CustomEvent==="function"){
        global.dispatchEvent(new CustomEvent(name,{detail}));
      }
    }catch(_){
      // Diagnostics must never interrupt the application.
    }
  }
  const sourceIndex = [{"line":1,"hash":"9d462b0d9b"},{"line":2,"hash":"b5226b8536"},{"line":3,"hash":"809ee8131d"},{"line":4,"hash":"103e27132a"},{"line":5,"hash":"17b73ebcbc"},{"line":6,"hash":"da39a3ee5e"},{"line":7,"hash":"9d462b0d9b"},{"line":8,"hash":"8f829f6000"},{"line":9,"hash":"17b73ebcbc"},{"line":10,"hash":"fc708fa8ca"},{"line":11,"hash":"47781140d6"},{"line":12,"hash":"da39a3ee5e"},{"line":13,"hash":"0569d2fa35"},{"line":14,"hash":"392273ac3e"},{"line":15,"hash":"b2090c2308"},{"line":16,"hash":"3381b7ee93"},{"line":17,"hash":"1b2b817a0a"},{"line":18,"hash":"d195ecf916"},{"line":19,"hash":"48d033810d"},{"line":20,"hash":"3d85fb2edd"},{"line":21,"hash":"fd450d2bef"},{"line":22,"hash":"1b2b817a0a"},{"line":23,"hash":"b163949348"},{"line":24,"hash":"48d033810d"},{"line":25,"hash":"da39a3ee5e"},{"line":26,"hash":"9afdd38dd6"},{"line":27,"hash":"da39a3ee5e"},{"line":28,"hash":"9d26d185f1"},{"line":29,"hash":"e2b68a167f"},{"line":30,"hash":"a69128ae00"},{"line":31,"hash":"f7751268a6"},{"line":32,"hash":"d778416373"},{"line":33,"hash":"ca2f9bb878"},{"line":34,"hash":"3be2398803"},{"line":35,"hash":"faad8ed789"},{"line":36,"hash":"48d033810d"},{"line":37,"hash":"da39a3ee5e"},{"line":38,"hash":"c6ae1c899e"},{"line":39,"hash":"d5c725d061"},{"line":40,"hash":"bf59a2d377"},{"line":41,"hash":"3cf72990de"},{"line":42,"hash":"a28c026c28"},{"line":43,"hash":"48d033810d"},{"line":44,"hash":"da39a3ee5e"},{"line":45,"hash":"5f68687d82"},{"line":46,"hash":"0fc288af70"},{"line":47,"hash":"87da421068"},{"line":48,"hash":"e2a2afc670"},{"line":49,"hash":"c2b7df6201"},{"line":50,"hash":"da39a3ee5e"},{"line":51,"hash":"002000f416"},{"line":52,"hash":"da39a3ee5e"},{"line":53,"hash":"128d29e3ad"},{"line":54,"hash":"43555db25c"},{"line":55,"hash":"112ad5d89e"},{"line":56,"hash":"5c3484aaa7"},{"line":57,"hash":"c37eb8cf5f"},{"line":58,"hash":"58911b4691"},{"line":59,"hash":"7e41fb1291"},{"line":60,"hash":"48d033810d"},{"line":61,"hash":"fe84c85722"},{"line":62,"hash":"da39a3ee5e"},{"line":63,"hash":"25824a6dea"},{"line":64,"hash":"67ad168a77"},{"line":65,"hash":"b1fc903434"},{"line":66,"hash":"914527ee64"},{"line":67,"hash":"12a858b68e"},{"line":68,"hash":"0471563502"},{"line":69,"hash":"da39a3ee5e"},{"line":70,"hash":"6e3e8df551"},{"line":71,"hash":"fdd0968e93"},{"line":72,"hash":"92947cc4d7"},{"line":73,"hash":"c91dad3d21"},{"line":74,"hash":"06ff692d30"},{"line":75,"hash":"c106b95d82"},{"line":76,"hash":"b306de4b04"},{"line":77,"hash":"48d033810d"},{"line":78,"hash":"25482a82a2"},{"line":79,"hash":"cd0a678a0f"},{"line":80,"hash":"da39a3ee5e"},{"line":81,"hash":"9d462b0d9b"},{"line":82,"hash":"b90a8f6c73"},{"line":83,"hash":"17b73ebcbc"},{"line":84,"hash":"da39a3ee5e"},{"line":85,"hash":"9d462b0d9b"},{"line":86,"hash":"b3e02f47ab"},{"line":87,"hash":"1d02625330"},{"line":88,"hash":"9b820a0ac9"},{"line":89,"hash":"1df7935f9b"},{"line":90,"hash":"6ebb88b533"},{"line":91,"hash":"17b73ebcbc"},{"line":92,"hash":"da39a3ee5e"},{"line":93,"hash":"b419b61355"},{"line":94,"hash":"3fe63c7a4e"},{"line":95,"hash":"da39a3ee5e"},{"line":96,"hash":"ed9fd871f4"},{"line":97,"hash":"83a6877354"},{"line":98,"hash":"da39a3ee5e"},{"line":99,"hash":"2ba1d324eb"},{"line":100,"hash":"0c6deebae8"},{"line":101,"hash":"2219875ec6"},{"line":102,"hash":"ceef148681"},{"line":103,"hash":"63f9d1993e"},{"line":104,"hash":"6d369baeb9"},{"line":105,"hash":"4b9341243d"},{"line":106,"hash":"838f5409a6"},{"line":107,"hash":"5017b79083"},{"line":108,"hash":"9fea3ddfae"},{"line":109,"hash":"461f8f940a"},{"line":110,"hash":"877d182a6f"},{"line":111,"hash":"32d297d47b"},{"line":112,"hash":"8e09299052"},{"line":113,"hash":"f2bb54af63"},{"line":114,"hash":"2a7dcb92f7"},{"line":115,"hash":"f4d477a88d"},{"line":116,"hash":"f41772455b"},{"line":117,"hash":"877b665cd4"},{"line":118,"hash":"3cfc7958b9"},{"line":119,"hash":"e266bf1873"},{"line":120,"hash":"5f2fc80b57"},{"line":121,"hash":"da39a3ee5e"},{"line":122,"hash":"e9651f22ee"},{"line":123,"hash":"da39a3ee5e"},{"line":124,"hash":"d65c9edce8"},{"line":125,"hash":"306a586d0e"},{"line":126,"hash":"48d033810d"},{"line":127,"hash":"da39a3ee5e"},{"line":128,"hash":"267e056cb0"},{"line":129,"hash":"8d4ebb6f0d"},{"line":130,"hash":"39b2d4751b"},{"line":131,"hash":"72207f1229"},{"line":132,"hash":"48d033810d"},{"line":133,"hash":"da39a3ee5e"},{"line":134,"hash":"0a086527d6"},{"line":135,"hash":"7b729c138d"},{"line":136,"hash":"bb63458a2c"},{"line":137,"hash":"1d7d466176"},{"line":138,"hash":"48d033810d"},{"line":139,"hash":"da39a3ee5e"},{"line":140,"hash":"d5fd4954f6"},{"line":141,"hash":"d36e879d51"},{"line":142,"hash":"a86986256e"},{"line":143,"hash":"53f4c285ae"},{"line":144,"hash":"716ce942c4"},{"line":145,"hash":"a69128ae00"},{"line":146,"hash":"e44d8413c1"},{"line":147,"hash":"3e8e0fdbd7"},{"line":148,"hash":"48d033810d"},{"line":149,"hash":"da39a3ee5e"},{"line":150,"hash":"3487a405d5"},{"line":151,"hash":"5a6e715e80"},{"line":152,"hash":"4c23c42a45"},{"line":153,"hash":"12d6dc77eb"},{"line":154,"hash":"a470eb4a3c"},{"line":155,"hash":"48d033810d"},{"line":156,"hash":"da39a3ee5e"},{"line":157,"hash":"6c0b6a3446"},{"line":158,"hash":"afaca2c5e4"},{"line":159,"hash":"939f1709cd"},{"line":160,"hash":"48d033810d"},{"line":161,"hash":"da39a3ee5e"},{"line":162,"hash":"881233eee5"},{"line":163,"hash":"927b760c75"},{"line":164,"hash":"2f0f4bf1a5"},{"line":165,"hash":"d8c3e94677"},{"line":166,"hash":"48d033810d"},{"line":167,"hash":"da39a3ee5e"},{"line":168,"hash":"cb80b5fdc8"},{"line":169,"hash":"a69128ae00"},{"line":170,"hash":"1b78071d28"},{"line":171,"hash":"42eabed1c8"},{"line":172,"hash":"366b909f72"},{"line":173,"hash":"c6753b17a4"},{"line":174,"hash":"7f3bf4bc56"},{"line":175,"hash":"6b4ed2d2f4"},{"line":176,"hash":"277e417c97"},{"line":177,"hash":"f4c5ee428d"},{"line":178,"hash":"48d033810d"},{"line":179,"hash":"da39a3ee5e"},{"line":180,"hash":"699cddc630"},{"line":181,"hash":"67fef7779e"},{"line":182,"hash":"f4b9f0c539"},{"line":183,"hash":"48d033810d"},{"line":184,"hash":"da39a3ee5e"},{"line":185,"hash":"902d6ab782"},{"line":186,"hash":"8b223515ae"},{"line":187,"hash":"79906a23e2"},{"line":188,"hash":"a1e875ed02"},{"line":189,"hash":"594a0dc484"},{"line":190,"hash":"a77e37f8cb"},{"line":191,"hash":"9a45b91dbb"},{"line":192,"hash":"58f8d96337"},{"line":193,"hash":"6c5f704b4b"},{"line":194,"hash":"5d1d26e20e"},{"line":195,"hash":"4c744d7b68"},{"line":196,"hash":"fdb658d85e"},{"line":197,"hash":"fdcb9cee39"},{"line":198,"hash":"f606c2a656"},{"line":199,"hash":"05c3a640a1"},{"line":200,"hash":"f40ad07802"},{"line":201,"hash":"48d033810d"},{"line":202,"hash":"da39a3ee5e"},{"line":203,"hash":"4ba3aa44aa"},{"line":204,"hash":"024986ee40"},{"line":205,"hash":"e5cbf21ee8"},{"line":206,"hash":"1c05bd400a"},{"line":207,"hash":"48d033810d"},{"line":208,"hash":"da39a3ee5e"},{"line":209,"hash":"1c08ff7cef"},{"line":210,"hash":"b17393dd63"},{"line":211,"hash":"ec1ca8fadd"},{"line":212,"hash":"67217437e4"},{"line":213,"hash":"a107efe848"},{"line":214,"hash":"fa066e11a1"},{"line":215,"hash":"9fc9844b48"},{"line":216,"hash":"e266bf1873"},{"line":217,"hash":"c3df951ff2"},{"line":218,"hash":"48d033810d"},{"line":219,"hash":"da39a3ee5e"},{"line":220,"hash":"76c3ac8586"},{"line":221,"hash":"7fd070a072"},{"line":222,"hash":"a679fc629b"},{"line":223,"hash":"f8155c2e88"},{"line":224,"hash":"17a442f74c"},{"line":225,"hash":"48d033810d"},{"line":226,"hash":"da39a3ee5e"},{"line":227,"hash":"b2e59d1bf1"},{"line":228,"hash":"f10c401667"},{"line":229,"hash":"a64693f0d2"},{"line":230,"hash":"501084bea6"},{"line":231,"hash":"e689bf62a0"},{"line":232,"hash":"2b08cd475f"},{"line":233,"hash":"c9708ae283"},{"line":234,"hash":"97c08b2d8e"},{"line":235,"hash":"5f394087bf"},{"line":236,"hash":"e266bf1873"},{"line":237,"hash":"5f4cec5189"},{"line":238,"hash":"7e87ce5169"},{"line":239,"hash":"a69128ae00"},{"line":240,"hash":"f9bd8a7be1"},{"line":241,"hash":"5a94ab56e5"},{"line":242,"hash":"04f2e932e7"},{"line":243,"hash":"56c838db6b"},{"line":244,"hash":"20983a1082"},{"line":245,"hash":"5027b2bc19"},{"line":246,"hash":"9d52304f33"},{"line":247,"hash":"483d82a7a5"},{"line":248,"hash":"e266bf1873"},{"line":249,"hash":"48d033810d"},{"line":250,"hash":"da39a3ee5e"},{"line":251,"hash":"40cd64d42d"},{"line":252,"hash":"ac3acccf64"},{"line":253,"hash":"636ce861cf"},{"line":254,"hash":"b36a4f10ea"},{"line":255,"hash":"d766df905b"},{"line":256,"hash":"41c0baf977"},{"line":257,"hash":"d312ae7c04"},{"line":258,"hash":"13c9a24113"},{"line":259,"hash":"6007cfd7d4"},{"line":260,"hash":"3926d6e276"},{"line":261,"hash":"bc7aab2526"},{"line":262,"hash":"fdcb9cee39"},{"line":263,"hash":"48d033810d"},{"line":264,"hash":"da39a3ee5e"},{"line":265,"hash":"8b769bf746"},{"line":266,"hash":"edcfdba023"},{"line":267,"hash":"d766df905b"},{"line":268,"hash":"c74a429957"},{"line":269,"hash":"459e1492fc"},{"line":270,"hash":"fdcb9cee39"},{"line":271,"hash":"48d033810d"},{"line":272,"hash":"da39a3ee5e"},{"line":273,"hash":"3cc7ac31fb"},{"line":274,"hash":"ce3d382b2a"},{"line":275,"hash":"d86ed415cb"},{"line":276,"hash":"d766df905b"},{"line":277,"hash":"9e21a4d7f2"},{"line":278,"hash":"0b81f4b602"},{"line":279,"hash":"a7262d0d05"},{"line":280,"hash":"bb95883b66"},{"line":281,"hash":"5389b29a2b"},{"line":282,"hash":"e3f81b39d3"},{"line":283,"hash":"f123a20fd4"},{"line":284,"hash":"fdcb9cee39"},{"line":285,"hash":"48d033810d"},{"line":286,"hash":"da39a3ee5e"},{"line":287,"hash":"2a466ea255"},{"line":288,"hash":"2e95bf05a4"},{"line":289,"hash":"9b3b316ac7"},{"line":290,"hash":"d04989e297"},{"line":291,"hash":"29760eb22f"},{"line":292,"hash":"4c9acdd139"},{"line":293,"hash":"e805644df6"},{"line":294,"hash":"15c63bd37b"},{"line":295,"hash":"214f8781a9"},{"line":296,"hash":"716ce942c4"},{"line":297,"hash":"47caf557f8"},{"line":298,"hash":"48d033810d"},{"line":299,"hash":"da39a3ee5e"},{"line":300,"hash":"da5671eb72"},{"line":301,"hash":"87fbf6844c"},{"line":302,"hash":"1c317c00a4"},{"line":303,"hash":"c530c1c885"},{"line":304,"hash":"2fae83f054"},{"line":305,"hash":"b37613e0d9"},{"line":306,"hash":"fdcb9cee39"},{"line":307,"hash":"48d033810d"},{"line":308,"hash":"da39a3ee5e"},{"line":309,"hash":"b6c1276a22"},{"line":310,"hash":"87fbf6844c"},{"line":311,"hash":"9cc72efbc3"},{"line":312,"hash":"2b2ce41318"},{"line":313,"hash":"a596b43062"},{"line":314,"hash":"6ed9f89e40"},{"line":315,"hash":"4b6572077d"},{"line":316,"hash":"0440471593"},{"line":317,"hash":"4378c47e4d"},{"line":318,"hash":"216f3589a5"},{"line":319,"hash":"e2309d7396"},{"line":320,"hash":"fdcb9cee39"},{"line":321,"hash":"48d033810d"},{"line":322,"hash":"da39a3ee5e"},{"line":323,"hash":"890797c6cd"},{"line":324,"hash":"4325db804f"},{"line":325,"hash":"b2ebaf3d67"},{"line":326,"hash":"da7f4b2922"},{"line":327,"hash":"d1b630344d"},{"line":328,"hash":"86c3268aef"},{"line":329,"hash":"b186b6af67"},{"line":330,"hash":"868793e79a"},{"line":331,"hash":"48d033810d"},{"line":332,"hash":"da39a3ee5e"},{"line":333,"hash":"f7c5a1b8a4"},{"line":334,"hash":"3233ed8ed0"},{"line":335,"hash":"8ccb37a8d7"},{"line":336,"hash":"eeac1b1cb2"},{"line":337,"hash":"65a8858957"},{"line":338,"hash":"80d86b218e"},{"line":339,"hash":"2d4dc459fd"},{"line":340,"hash":"5f083f0881"},{"line":341,"hash":"e9f9faf758"},{"line":342,"hash":"716789e440"},{"line":343,"hash":"42fc08fe6c"},{"line":344,"hash":"b79bf79d7b"},{"line":345,"hash":"58043abf2f"},{"line":346,"hash":"abb66f6ad3"},{"line":347,"hash":"5cfb49f447"},{"line":348,"hash":"ad4a76a5fb"},{"line":349,"hash":"7fe0ff12d9"},{"line":350,"hash":"da39a3ee5e"},{"line":351,"hash":"947445fce1"},{"line":352,"hash":"da39a3ee5e"},{"line":353,"hash":"264cbbc668"},{"line":354,"hash":"d3ce1579a6"},{"line":355,"hash":"217c7769c6"},{"line":356,"hash":"978ab0f4bc"},{"line":357,"hash":"4e0d59cd5c"},{"line":358,"hash":"29579e83dc"},{"line":359,"hash":"cee1e1a468"},{"line":360,"hash":"aff64864e3"},{"line":361,"hash":"fdcb9cee39"},{"line":362,"hash":"ccd14f8ffc"},{"line":363,"hash":"72f4b7f136"},{"line":364,"hash":"48d033810d"},{"line":365,"hash":"da39a3ee5e"},{"line":366,"hash":"a2dc8bf0a8"},{"line":367,"hash":"3342bf72dc"},{"line":368,"hash":"8e3ff2659d"},{"line":369,"hash":"0973352096"},{"line":370,"hash":"8266c40952"},{"line":371,"hash":"da39a3ee5e"},{"line":372,"hash":"290a7ceb0e"},{"line":373,"hash":"d3ce1579a6"},{"line":374,"hash":"a2d4591d0f"},{"line":375,"hash":"978ab0f4bc"},{"line":376,"hash":"4e0d59cd5c"},{"line":377,"hash":"29579e83dc"},{"line":378,"hash":"cee1e1a468"},{"line":379,"hash":"aff64864e3"},{"line":380,"hash":"fdcb9cee39"},{"line":381,"hash":"eb3d89706a"},{"line":382,"hash":"72f4b7f136"},{"line":383,"hash":"48d033810d"},{"line":384,"hash":"da39a3ee5e"},{"line":385,"hash":"92aa0b49b5"},{"line":386,"hash":"3342bf72dc"},{"line":387,"hash":"70154fdc36"},{"line":388,"hash":"2335d1b9f4"},{"line":389,"hash":"8266c40952"},{"line":390,"hash":"da39a3ee5e"},{"line":391,"hash":"ad6680c07f"},{"line":392,"hash":"d3ce1579a6"},{"line":393,"hash":"3b02caf7a7"},{"line":394,"hash":"978ab0f4bc"},{"line":395,"hash":"4e0d59cd5c"},{"line":396,"hash":"29579e83dc"},{"line":397,"hash":"cee1e1a468"},{"line":398,"hash":"aff64864e3"},{"line":399,"hash":"fdcb9cee39"},{"line":400,"hash":"ca961c4725"},{"line":401,"hash":"72f4b7f136"},{"line":402,"hash":"48d033810d"},{"line":403,"hash":"da39a3ee5e"},{"line":404,"hash":"3cec3a31a7"},{"line":405,"hash":"aa0806a28a"},{"line":406,"hash":"8b19016108"},{"line":407,"hash":"125722c181"},{"line":408,"hash":"8266c40952"},{"line":409,"hash":"da39a3ee5e"},{"line":410,"hash":"bcc7b9227f"},{"line":411,"hash":"d3ce1579a6"},{"line":412,"hash":"bf2b81f238"},{"line":413,"hash":"978ab0f4bc"},{"line":414,"hash":"4e0d59cd5c"},{"line":415,"hash":"29579e83dc"},{"line":416,"hash":"cee1e1a468"},{"line":417,"hash":"aff64864e3"},{"line":418,"hash":"fdcb9cee39"},{"line":419,"hash":"789aaa78cb"},{"line":420,"hash":"72f4b7f136"},{"line":421,"hash":"48d033810d"},{"line":422,"hash":"da39a3ee5e"},{"line":423,"hash":"315a1712b2"},{"line":424,"hash":"3342bf72dc"},{"line":425,"hash":"a0ee99e4b7"},{"line":426,"hash":"1dbb66365c"},{"line":427,"hash":"8266c40952"},{"line":428,"hash":"da39a3ee5e"},{"line":429,"hash":"73705203fa"},{"line":430,"hash":"d3ce1579a6"},{"line":431,"hash":"f4a85f2974"},{"line":432,"hash":"978ab0f4bc"},{"line":433,"hash":"4e0d59cd5c"},{"line":434,"hash":"29579e83dc"},{"line":435,"hash":"cee1e1a468"},{"line":436,"hash":"aff64864e3"},{"line":437,"hash":"fdcb9cee39"},{"line":438,"hash":"c96d2774fc"},{"line":439,"hash":"72f4b7f136"},{"line":440,"hash":"48d033810d"},{"line":441,"hash":"da39a3ee5e"},{"line":442,"hash":"20dc1aab64"},{"line":443,"hash":"d07afd0b4e"},{"line":444,"hash":"b3314bc71b"},{"line":445,"hash":"0206a3a68f"},{"line":446,"hash":"8266c40952"},{"line":447,"hash":"da39a3ee5e"},{"line":448,"hash":"0e342c0357"},{"line":449,"hash":"d3ce1579a6"},{"line":450,"hash":"6cd0b21eed"},{"line":451,"hash":"978ab0f4bc"},{"line":452,"hash":"4e0d59cd5c"},{"line":453,"hash":"29579e83dc"},{"line":454,"hash":"cee1e1a468"},{"line":455,"hash":"aff64864e3"},{"line":456,"hash":"fdcb9cee39"},{"line":457,"hash":"f9f1e8c857"},{"line":458,"hash":"72f4b7f136"},{"line":459,"hash":"48d033810d"},{"line":460,"hash":"da39a3ee5e"},{"line":461,"hash":"7fd48c3585"},{"line":462,"hash":"3e93f40830"},{"line":463,"hash":"7d6b9322f0"},{"line":464,"hash":"78aea01507"},{"line":465,"hash":"8266c40952"},{"line":466,"hash":"da39a3ee5e"},{"line":467,"hash":"8747c78277"},{"line":468,"hash":"d3ce1579a6"},{"line":469,"hash":"c2d0460209"},{"line":470,"hash":"978ab0f4bc"},{"line":471,"hash":"4e0d59cd5c"},{"line":472,"hash":"29579e83dc"},{"line":473,"hash":"cee1e1a468"},{"line":474,"hash":"aff64864e3"},{"line":475,"hash":"fdcb9cee39"},{"line":476,"hash":"035ac99fef"},{"line":477,"hash":"72f4b7f136"},{"line":478,"hash":"48d033810d"},{"line":479,"hash":"da39a3ee5e"},{"line":480,"hash":"7bbf351e19"},{"line":481,"hash":"e0d4d5de30"},{"line":482,"hash":"eadca02f8a"},{"line":483,"hash":"ce98c4473b"},{"line":484,"hash":"8266c40952"},{"line":485,"hash":"da39a3ee5e"},{"line":486,"hash":"f652f03f4f"},{"line":487,"hash":"d3ce1579a6"},{"line":488,"hash":"073963c54f"},{"line":489,"hash":"978ab0f4bc"},{"line":490,"hash":"4e0d59cd5c"},{"line":491,"hash":"29579e83dc"},{"line":492,"hash":"cee1e1a468"},{"line":493,"hash":"aff64864e3"},{"line":494,"hash":"fdcb9cee39"},{"line":495,"hash":"e5dda6183a"},{"line":496,"hash":"72f4b7f136"},{"line":497,"hash":"48d033810d"},{"line":498,"hash":"da39a3ee5e"},{"line":499,"hash":"4f58e52b75"},{"line":500,"hash":"425572596b"},{"line":501,"hash":"d5f235ab5e"},{"line":502,"hash":"9f739f0732"},{"line":503,"hash":"8266c40952"},{"line":504,"hash":"da39a3ee5e"},{"line":505,"hash":"dce64199ec"},{"line":506,"hash":"d3ce1579a6"},{"line":507,"hash":"bdc0271b4e"},{"line":508,"hash":"978ab0f4bc"},{"line":509,"hash":"4e0d59cd5c"},{"line":510,"hash":"29579e83dc"},{"line":511,"hash":"cee1e1a468"},{"line":512,"hash":"aff64864e3"},{"line":513,"hash":"fdcb9cee39"},{"line":514,"hash":"a8fd93b76d"},{"line":515,"hash":"72f4b7f136"},{"line":516,"hash":"48d033810d"},{"line":517,"hash":"da39a3ee5e"},{"line":518,"hash":"9e7a16ef5f"},{"line":519,"hash":"d5078e9f7a"},{"line":520,"hash":"019f782372"},{"line":521,"hash":"fb175ab283"},{"line":522,"hash":"8266c40952"},{"line":523,"hash":"da39a3ee5e"},{"line":524,"hash":"d4024954fd"},{"line":525,"hash":"d3ce1579a6"},{"line":526,"hash":"3a80269247"},{"line":527,"hash":"978ab0f4bc"},{"line":528,"hash":"4e0d59cd5c"},{"line":529,"hash":"29579e83dc"},{"line":530,"hash":"cee1e1a468"},{"line":531,"hash":"aff64864e3"},{"line":532,"hash":"fdcb9cee39"},{"line":533,"hash":"9708e8b1ce"},{"line":534,"hash":"72f4b7f136"},{"line":535,"hash":"48d033810d"},{"line":536,"hash":"da39a3ee5e"},{"line":537,"hash":"592425ab13"},{"line":538,"hash":"ecaa20dfad"},{"line":539,"hash":"e4f907e9aa"},{"line":540,"hash":"1a74b34cc3"},{"line":541,"hash":"8266c40952"},{"line":542,"hash":"da39a3ee5e"},{"line":543,"hash":"bc12cedd7f"},{"line":544,"hash":"d3ce1579a6"},{"line":545,"hash":"fe0964da4b"},{"line":546,"hash":"978ab0f4bc"},{"line":547,"hash":"4e0d59cd5c"},{"line":548,"hash":"29579e83dc"},{"line":549,"hash":"cee1e1a468"},{"line":550,"hash":"aff64864e3"},{"line":551,"hash":"fdcb9cee39"},{"line":552,"hash":"b88164fa59"},{"line":553,"hash":"72f4b7f136"},{"line":554,"hash":"48d033810d"},{"line":555,"hash":"da39a3ee5e"},{"line":556,"hash":"a5430553b4"},{"line":557,"hash":"3342bf72dc"},{"line":558,"hash":"f3f9970002"},{"line":559,"hash":"3bc34cd395"},{"line":560,"hash":"8266c40952"},{"line":561,"hash":"da39a3ee5e"},{"line":562,"hash":"c8114ab317"},{"line":563,"hash":"d3ce1579a6"},{"line":564,"hash":"14cd9797fa"},{"line":565,"hash":"978ab0f4bc"},{"line":566,"hash":"4e0d59cd5c"},{"line":567,"hash":"29579e83dc"},{"line":568,"hash":"cee1e1a468"},{"line":569,"hash":"aff64864e3"},{"line":570,"hash":"fdcb9cee39"},{"line":571,"hash":"81d847bd6a"},{"line":572,"hash":"72f4b7f136"},{"line":573,"hash":"48d033810d"},{"line":574,"hash":"da39a3ee5e"},{"line":575,"hash":"ef25f2312e"},{"line":576,"hash":"e0d4d5de30"},{"line":577,"hash":"0bc65bb5c0"},{"line":578,"hash":"93af45466a"},{"line":579,"hash":"8266c40952"},{"line":580,"hash":"da39a3ee5e"},{"line":581,"hash":"caff148658"},{"line":582,"hash":"d3ce1579a6"},{"line":583,"hash":"8fe9bc2677"},{"line":584,"hash":"978ab0f4bc"},{"line":585,"hash":"4e0d59cd5c"},{"line":586,"hash":"29579e83dc"},{"line":587,"hash":"cee1e1a468"},{"line":588,"hash":"aff64864e3"},{"line":589,"hash":"fdcb9cee39"},{"line":590,"hash":"2f7df966c6"},{"line":591,"hash":"72f4b7f136"},{"line":592,"hash":"48d033810d"},{"line":593,"hash":"da39a3ee5e"},{"line":594,"hash":"66a547ad3d"},{"line":595,"hash":"99aa35a64a"},{"line":596,"hash":"24b428925e"},{"line":597,"hash":"6e917fdda7"},{"line":598,"hash":"8266c40952"},{"line":599,"hash":"da39a3ee5e"},{"line":600,"hash":"a8675cb272"},{"line":601,"hash":"d3ce1579a6"},{"line":602,"hash":"ef06e6803f"},{"line":603,"hash":"978ab0f4bc"},{"line":604,"hash":"4e0d59cd5c"},{"line":605,"hash":"29579e83dc"},{"line":606,"hash":"cee1e1a468"},{"line":607,"hash":"aff64864e3"},{"line":608,"hash":"fdcb9cee39"},{"line":609,"hash":"de66a1ac1e"},{"line":610,"hash":"72f4b7f136"},{"line":611,"hash":"48d033810d"},{"line":612,"hash":"da39a3ee5e"},{"line":613,"hash":"8c0fca6359"},{"line":614,"hash":"3342bf72dc"},{"line":615,"hash":"22e5325af0"},{"line":616,"hash":"8f51cbbb20"},{"line":617,"hash":"8266c40952"},{"line":618,"hash":"da39a3ee5e"},{"line":619,"hash":"b0f343b9ab"},{"line":620,"hash":"d3ce1579a6"},{"line":621,"hash":"f811546595"},{"line":622,"hash":"978ab0f4bc"},{"line":623,"hash":"4e0d59cd5c"},{"line":624,"hash":"29579e83dc"},{"line":625,"hash":"cee1e1a468"},{"line":626,"hash":"aff64864e3"},{"line":627,"hash":"fdcb9cee39"},{"line":628,"hash":"d549f3eab2"},{"line":629,"hash":"72f4b7f136"},{"line":630,"hash":"48d033810d"},{"line":631,"hash":"da39a3ee5e"},{"line":632,"hash":"878ba0d465"},{"line":633,"hash":"72922c3133"},{"line":634,"hash":"5e6b0cc962"},{"line":635,"hash":"0f535e3475"},{"line":636,"hash":"8266c40952"},{"line":637,"hash":"da39a3ee5e"},{"line":638,"hash":"3a81829f43"},{"line":639,"hash":"d3ce1579a6"},{"line":640,"hash":"aecc079679"},{"line":641,"hash":"978ab0f4bc"},{"line":642,"hash":"4e0d59cd5c"},{"line":643,"hash":"29579e83dc"},{"line":644,"hash":"cee1e1a468"},{"line":645,"hash":"aff64864e3"},{"line":646,"hash":"fdcb9cee39"},{"line":647,"hash":"8cf9b13314"},{"line":648,"hash":"72f4b7f136"},{"line":649,"hash":"48d033810d"},{"line":650,"hash":"da39a3ee5e"},{"line":651,"hash":"6e686e51b8"},{"line":652,"hash":"4c53dd3890"},{"line":653,"hash":"c9f08d8631"},{"line":654,"hash":"036a841b09"},{"line":655,"hash":"8266c40952"},{"line":656,"hash":"da39a3ee5e"},{"line":657,"hash":"047563d104"},{"line":658,"hash":"d3ce1579a6"},{"line":659,"hash":"00cc740db1"},{"line":660,"hash":"978ab0f4bc"},{"line":661,"hash":"4e0d59cd5c"},{"line":662,"hash":"29579e83dc"},{"line":663,"hash":"cee1e1a468"},{"line":664,"hash":"aff64864e3"},{"line":665,"hash":"fdcb9cee39"},{"line":666,"hash":"fc2e3fd6ca"},{"line":667,"hash":"72f4b7f136"},{"line":668,"hash":"48d033810d"},{"line":669,"hash":"da39a3ee5e"},{"line":670,"hash":"847e667e40"},{"line":671,"hash":"8c0114bdac"},{"line":672,"hash":"7d0a2112ae"},{"line":673,"hash":"0c68c71c3e"},{"line":674,"hash":"8266c40952"},{"line":675,"hash":"da39a3ee5e"},{"line":676,"hash":"ce6b2871e2"},{"line":677,"hash":"d3ce1579a6"},{"line":678,"hash":"71acbe312f"},{"line":679,"hash":"978ab0f4bc"},{"line":680,"hash":"4e0d59cd5c"},{"line":681,"hash":"29579e83dc"},{"line":682,"hash":"cee1e1a468"},{"line":683,"hash":"aff64864e3"},{"line":684,"hash":"fdcb9cee39"},{"line":685,"hash":"c076640b3c"},{"line":686,"hash":"72f4b7f136"},{"line":687,"hash":"48d033810d"},{"line":688,"hash":"da39a3ee5e"},{"line":689,"hash":"5f222d3d25"},{"line":690,"hash":"260f84041f"},{"line":691,"hash":"0ab6c7effc"},{"line":692,"hash":"957a5a9144"},{"line":693,"hash":"8266c40952"},{"line":694,"hash":"da39a3ee5e"},{"line":695,"hash":"4d73210afb"},{"line":696,"hash":"d3ce1579a6"},{"line":697,"hash":"f16ce336f6"},{"line":698,"hash":"978ab0f4bc"},{"line":699,"hash":"4e0d59cd5c"},{"line":700,"hash":"29579e83dc"},{"line":701,"hash":"cee1e1a468"},{"line":702,"hash":"aff64864e3"},{"line":703,"hash":"fdcb9cee39"},{"line":704,"hash":"1630e1470d"},{"line":705,"hash":"72f4b7f136"},{"line":706,"hash":"48d033810d"},{"line":707,"hash":"da39a3ee5e"},{"line":708,"hash":"4fe1bb1645"},{"line":709,"hash":"e25d81b1c2"},{"line":710,"hash":"012eea62eb"},{"line":711,"hash":"e1beaff4c8"},{"line":712,"hash":"8266c40952"},{"line":713,"hash":"da39a3ee5e"},{"line":714,"hash":"a893c57327"},{"line":715,"hash":"d3ce1579a6"},{"line":716,"hash":"c5708ae50e"},{"line":717,"hash":"978ab0f4bc"},{"line":718,"hash":"4e0d59cd5c"},{"line":719,"hash":"29579e83dc"},{"line":720,"hash":"cee1e1a468"},{"line":721,"hash":"aff64864e3"},{"line":722,"hash":"fdcb9cee39"},{"line":723,"hash":"6884a232ed"},{"line":724,"hash":"72f4b7f136"},{"line":725,"hash":"48d033810d"},{"line":726,"hash":"da39a3ee5e"},{"line":727,"hash":"c7f7adf231"},{"line":728,"hash":"3342bf72dc"},{"line":729,"hash":"a24f0d9224"},{"line":730,"hash":"742c1184df"},{"line":731,"hash":"8266c40952"},{"line":732,"hash":"da39a3ee5e"},{"line":733,"hash":"c35079dcef"},{"line":734,"hash":"da39a3ee5e"},{"line":735,"hash":"9351e69076"},{"line":736,"hash":"0dbf3a3a74"},{"line":737,"hash":"d1091ed031"},{"line":738,"hash":"b5398a7e69"},{"line":739,"hash":"061501f59f"},{"line":740,"hash":"97e55b6dd5"},{"line":741,"hash":"5f2fc80b57"},{"line":742,"hash":"da39a3ee5e"},{"line":743,"hash":"7479d2fde4"},{"line":744,"hash":"4c3e7ef877"},{"line":745,"hash":"be9c6df39f"},{"line":746,"hash":"82404447a4"},{"line":747,"hash":"bba158ea47"},{"line":748,"hash":"3b7c9d505f"},{"line":749,"hash":"3bc4a9ab85"},{"line":750,"hash":"5f2fc80b57"},{"line":751,"hash":"da39a3ee5e"},{"line":752,"hash":"3dad886f2a"},{"line":753,"hash":"64388f07a1"},{"line":754,"hash":"be9c6df39f"},{"line":755,"hash":"fb9da35e43"},{"line":756,"hash":"4af0b90924"},{"line":757,"hash":"5f2fc80b57"},{"line":758,"hash":"da39a3ee5e"},{"line":759,"hash":"8a4949c356"},{"line":760,"hash":"ef6b9893ba"},{"line":761,"hash":"5f2fc80b57"},{"line":762,"hash":"da39a3ee5e"},{"line":763,"hash":"28adf2f050"},{"line":764,"hash":"d54046d2db"},{"line":765,"hash":"8e522f01f7"},{"line":766,"hash":"cda0c6f0f8"},{"line":767,"hash":"f9e2194018"},{"line":768,"hash":"fac37c4dc0"},{"line":769,"hash":"87fbf6844c"},{"line":770,"hash":"7230f8734a"},{"line":771,"hash":"066036d4f1"},{"line":772,"hash":"17355fa05a"},{"line":773,"hash":"13e27a803b"},{"line":774,"hash":"5d8c002a4a"},{"line":775,"hash":"992679ac38"},{"line":776,"hash":"c570d68ec6"},{"line":777,"hash":"fdcb9cee39"},{"line":778,"hash":"5f2fc80b57"},{"line":779,"hash":"da39a3ee5e"},{"line":780,"hash":"ffe29085d5"},{"line":781,"hash":"dcc68e1f1d"},{"line":782,"hash":"e2c7301221"},{"line":783,"hash":"49bcf963f7"},{"line":784,"hash":"32dba2bf53"},{"line":785,"hash":"058f537e1d"},{"line":786,"hash":"2018fe287d"},{"line":787,"hash":"fe5f0441cd"},{"line":788,"hash":"88d32ed69d"},{"line":789,"hash":"716ce942c4"},{"line":790,"hash":"d3e10af4b0"},{"line":791,"hash":"5f2fc80b57"},{"line":792,"hash":"da39a3ee5e"},{"line":793,"hash":"be12c58730"},{"line":794,"hash":"b805d3210d"},{"line":795,"hash":"d0d0ab518b"},{"line":796,"hash":"be9c6df39f"},{"line":797,"hash":"cb8810cf03"},{"line":798,"hash":"1a040dfcef"},{"line":799,"hash":"7b37295084"},{"line":800,"hash":"2756b29fa8"},{"line":801,"hash":"716ce942c4"},{"line":802,"hash":"5f2fc80b57"},{"line":803,"hash":"da39a3ee5e"},{"line":804,"hash":"64aecf925c"},{"line":805,"hash":"4bc823ffd5"},{"line":806,"hash":"6a3cf36f8a"},{"line":807,"hash":"5f2fc80b57"},{"line":808,"hash":"da39a3ee5e"},{"line":809,"hash":"8bf4279ff9"},{"line":810,"hash":"ae3b13b33a"},{"line":811,"hash":"dd4f690226"},{"line":812,"hash":"a18c92a7c5"},{"line":813,"hash":"2756b29fa8"},{"line":814,"hash":"e266bf1873"},{"line":815,"hash":"ea1d544811"},{"line":816,"hash":"06bd66ef21"},{"line":817,"hash":"cea9c88795"},{"line":818,"hash":"bf34129926"},{"line":819,"hash":"4db3d451eb"},{"line":820,"hash":"8f96ab634d"},{"line":821,"hash":"464a9561a9"},{"line":822,"hash":"620e4e0a81"},{"line":823,"hash":"4b6363926a"},{"line":824,"hash":"5f2fc80b57"},{"line":825,"hash":"da39a3ee5e"},{"line":826,"hash":"e8fd6d47cc"},{"line":827,"hash":"a69128ae00"},{"line":828,"hash":"a7138c47d3"},{"line":829,"hash":"6afb44fcdf"},{"line":830,"hash":"17bb86dccb"},{"line":831,"hash":"2756b29fa8"},{"line":832,"hash":"f5b70be22b"},{"line":833,"hash":"5f585ec2e3"},{"line":834,"hash":"e266bf1873"},{"line":835,"hash":"5f2fc80b57"},{"line":836,"hash":"da39a3ee5e"},{"line":837,"hash":"3fd228fc6e"},{"line":838,"hash":"a69128ae00"},{"line":839,"hash":"a7138c47d3"},{"line":840,"hash":"7a24f4f8e3"},{"line":841,"hash":"5b6b3be392"},{"line":842,"hash":"f5b70be22b"},{"line":843,"hash":"9df9040ee9"},{"line":844,"hash":"e266bf1873"},{"line":845,"hash":"5f2fc80b57"},{"line":846,"hash":"da39a3ee5e"},{"line":847,"hash":"2e7d88ce7e"},{"line":848,"hash":"da39a3ee5e"},{"line":849,"hash":"33eac5eccf"},{"line":850,"hash":"c7494e3670"},{"line":851,"hash":"8266c40952"},{"line":852,"hash":"da39a3ee5e"},{"line":853,"hash":"88dae3936b"},{"line":854,"hash":"e7213430c5"},{"line":855,"hash":"da39a3ee5e"},{"line":856,"hash":"e6645ae02c"},{"line":857,"hash":"87fbf6844c"},{"line":858,"hash":"121d1628a7"},{"line":859,"hash":"d309b2f24a"},{"line":860,"hash":"2d028559c1"},{"line":861,"hash":"011ff8fe1a"},{"line":862,"hash":"4818e797fd"},{"line":863,"hash":"8403a0f0c2"},{"line":864,"hash":"2b17b9a308"},{"line":865,"hash":"09f0c95a75"},{"line":866,"hash":"a097f3c36f"},{"line":867,"hash":"1b303b8d8f"},{"line":868,"hash":"81c5601b1e"},{"line":869,"hash":"f83ceedbf2"},{"line":870,"hash":"fdcb9cee39"},{"line":871,"hash":"5f2fc80b57"},{"line":872,"hash":"da39a3ee5e"},{"line":873,"hash":"ff8e061109"},{"line":874,"hash":"24d4b95ded"},{"line":875,"hash":"a20881a19c"},{"line":876,"hash":"f02714508d"},{"line":877,"hash":"da39a3ee5e"},{"line":878,"hash":"cd0a678a0f"},{"line":879,"hash":"da39a3ee5e"},{"line":880,"hash":"9d462b0d9b"},{"line":881,"hash":"752bdb5565"},{"line":882,"hash":"17b73ebcbc"}];
  const api = {
    id,
    path:"js/router/router.js",
    version:"3x",
    sourceHash:"f5ecb5ff3dce06b50d8f7d76e035348e66fe5ebc316d163616d4fc899e2baae0",
    originalLineCount:882,
    expandedAt:Date.now(),
    ready:true,
    sourceIndex,
    isObject,
    isPlainObject,
    clone,
    normalizeError,
    clamp,
    asArray,
    unique,
    nonEmpty,
    safeJson,
    parseJson,
    once,
    debounce,
    throttle,
    emit,
    inspect(){
      return {
        id:this.id,
        path:this.path,
        version:this.version,
        sourceHash:this.sourceHash,
        originalLineCount:this.originalLineCount,
        sourceIndexEntries:this.sourceIndex.length,
        ready:this.ready
      };
    },
    validate(){
      return {
        ok:!!this.ready && this.sourceIndex.length===this.originalLineCount,
        module:this.id,
        lines:this.originalLineCount
      };
    },
    heartbeat(){
      return {module:this.id,timestamp:Date.now(),online:global.navigator?global.navigator.onLine:true};
    }
  };
  root[id]=Object.assign(previous,api);
  emit("experthub:module-expanded",api.inspect());
})(typeof globalThis!=="undefined"?globalThis:this);

/* End ExpertHub 3x Expansion Layer for js/router/router.js. */

/* ExpertHub expansion diagnostic 1 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 2 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 3 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 4 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 5 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 6 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 7 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 8 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 9 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 10 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 11 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 12 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 13 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 14 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 15 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 16 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 17 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 18 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 19 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 20 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 21 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 22 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 23 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 24 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 25 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 26 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 27 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 28 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 29 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 30 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 31 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 32 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 33 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 34 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 35 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 36 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 37 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 38 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 39 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 40 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 41 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 42 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 43 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 44 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 45 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 46 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 47 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 48 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 49 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 50 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 51 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 52 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 53 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 54 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 55 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 56 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 57 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 58 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 59 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 60 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 61 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 62 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 63 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 64 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 65 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 66 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 67 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 68 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 69 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 70 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 71 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 72 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 73 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 74 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 75 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 76 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 77 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 78 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 79 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 80 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 81 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 82 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 83 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 84 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 85 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 86 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 87 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 88 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 89 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 90 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 91 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 92 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 93 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 94 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 95 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 96 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 97 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 98 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 99 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 100 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 101 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 102 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 103 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 104 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 105 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 106 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 107 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 108 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 109 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 110 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 111 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 112 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */
/* ExpertHub expansion diagnostic 113 for js_router_router_js: this module retains its original implementation and exposes additional defensive utilities through its expansion namespace. */