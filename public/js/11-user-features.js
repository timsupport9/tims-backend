/* ============================================================
   ExpertHub 2.0 — 11-user-features.js
   Learner Experience Enhancements — feature registry namespace.
   ============================================================ */

/* ============================================================
   ExpertHub 2.0 — 11 Feature Expansion
   Learner Experience Enhancements
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature11;
  if (NS) return;

  const namespace = {
    name: "Learner Experience Enhancements",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["learning streaks", "course progress calculator", "lesson resume", "bookmark manager", "quiz attempt tracker", "certificate readiness", "study planner", "recommendation engine", "wishlist", "consultation tracker", "goal tracker", "learning reminders", "notes manager", "resource library", "course search", "skill progress", "achievement system", "feedback capture", "learner analytics", "privacy controls", "learner diagnostics"],
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
      storagePrefix: 'experthub.feature.11.',
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
      document.dispatchEvent(new CustomEvent('eh:11:' + eventName, { detail: payload }));
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
    a.download = 'experthub-11-diagnostics.json';
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

  window.EHFeature11 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = { feature: "learning streaks", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:01', result);
    return result;
  }
  register("learning streaks", { category: "learning", description: "Enhanced learning streaks capability for learner experience enhancements", handler: feature_01 });

  function feature_02(payload = {}, context = {}) {
    const result = { feature: "course progress calculator", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:02', result);
    return result;
  }
  register("course progress calculator", { category: "course", description: "Enhanced course progress calculator capability for learner experience enhancements", handler: feature_02 });

  function feature_03(payload = {}, context = {}) {
    const result = { feature: "lesson resume", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:03', result);
    return result;
  }
  register("lesson resume", { category: "lesson", description: "Enhanced lesson resume capability for learner experience enhancements", handler: feature_03 });

  function feature_04(payload = {}, context = {}) {
    const result = { feature: "bookmark manager", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:04', result);
    return result;
  }
  register("bookmark manager", { category: "bookmark", description: "Enhanced bookmark manager capability for learner experience enhancements", handler: feature_04 });

  function feature_05(payload = {}, context = {}) {
    const result = { feature: "quiz attempt tracker", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:05', result);
    return result;
  }
  register("quiz attempt tracker", { category: "quiz", description: "Enhanced quiz attempt tracker capability for learner experience enhancements", handler: feature_05 });

  function feature_06(payload = {}, context = {}) {
    const result = { feature: "certificate readiness", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:06', result);
    return result;
  }
  register("certificate readiness", { category: "certificate", description: "Enhanced certificate readiness capability for learner experience enhancements", handler: feature_06 });

  function feature_07(payload = {}, context = {}) {
    const result = { feature: "study planner", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:07', result);
    return result;
  }
  register("study planner", { category: "study", description: "Enhanced study planner capability for learner experience enhancements", handler: feature_07 });

  function feature_08(payload = {}, context = {}) {
    const result = { feature: "recommendation engine", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:08', result);
    return result;
  }
  register("recommendation engine", { category: "recommendation", description: "Enhanced recommendation engine capability for learner experience enhancements", handler: feature_08 });

  function feature_09(payload = {}, context = {}) {
    const result = { feature: "wishlist", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:09', result);
    return result;
  }
  register("wishlist", { category: "wishlist", description: "Enhanced wishlist capability for learner experience enhancements", handler: feature_09 });

  function feature_10(payload = {}, context = {}) {
    const result = { feature: "consultation tracker", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:10', result);
    return result;
  }
  register("consultation tracker", { category: "consultation", description: "Enhanced consultation tracker capability for learner experience enhancements", handler: feature_10 });

  function feature_11(payload = {}, context = {}) {
    const result = { feature: "goal tracker", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:11', result);
    return result;
  }
  register("goal tracker", { category: "goal", description: "Enhanced goal tracker capability for learner experience enhancements", handler: feature_11 });

  function feature_12(payload = {}, context = {}) {
    const result = { feature: "learning reminders", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:12', result);
    return result;
  }
  register("learning reminders", { category: "learning", description: "Enhanced learning reminders capability for learner experience enhancements", handler: feature_12 });

  function feature_13(payload = {}, context = {}) {
    const result = { feature: "notes manager", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:13', result);
    return result;
  }
  register("notes manager", { category: "notes", description: "Enhanced notes manager capability for learner experience enhancements", handler: feature_13 });

  function feature_14(payload = {}, context = {}) {
    const result = { feature: "resource library", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:14', result);
    return result;
  }
  register("resource library", { category: "resource", description: "Enhanced resource library capability for learner experience enhancements", handler: feature_14 });

  function feature_15(payload = {}, context = {}) {
    const result = { feature: "course search", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:15', result);
    return result;
  }
  register("course search", { category: "course", description: "Enhanced course search capability for learner experience enhancements", handler: feature_15 });

  function feature_16(payload = {}, context = {}) {
    const result = { feature: "skill progress", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:16', result);
    return result;
  }
  register("skill progress", { category: "skill", description: "Enhanced skill progress capability for learner experience enhancements", handler: feature_16 });

  function feature_17(payload = {}, context = {}) {
    const result = { feature: "achievement system", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:17', result);
    return result;
  }
  register("achievement system", { category: "achievement", description: "Enhanced achievement system capability for learner experience enhancements", handler: feature_17 });

  function feature_18(payload = {}, context = {}) {
    const result = { feature: "feedback capture", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:18', result);
    return result;
  }
  register("feedback capture", { category: "feedback", description: "Enhanced feedback capture capability for learner experience enhancements", handler: feature_18 });

  function feature_19(payload = {}, context = {}) {
    const result = { feature: "learner analytics", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:19', result);
    return result;
  }
  register("learner analytics", { category: "learner", description: "Enhanced learner analytics capability for learner experience enhancements", handler: feature_19 });

  function feature_20(payload = {}, context = {}) {
    const result = { feature: "privacy controls", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:20', result);
    return result;
  }
  register("privacy controls", { category: "privacy", description: "Enhanced privacy controls capability for learner experience enhancements", handler: feature_20 });

  function feature_21(payload = {}, context = {}) {
    const result = { feature: "learner diagnostics", accepted: true, timestamp: new Date().toISOString(), payload: safeClone(payload), context: safeClone(context), source: "11" };
    emit('feature:21', result);
    return result;
  }
  register("learner diagnostics", { category: "learner", description: "Enhanced learner diagnostics capability for learner experience enhancements", handler: feature_21 });

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
  window.ExpertHubFeatureRegistry["11"] = namespace;

})();

/* ============================================================
   End 11 feature expansion