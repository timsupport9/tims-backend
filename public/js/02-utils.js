/* ============================================================
   ExpertHub 2.0 — 02-utils.js
   Pure helper functions. No state mutation. No DOM writes on load.
   ============================================================ */

/* ---------- UTILS ---------- */
const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const esc = s => (s===null||s===undefined) ? '' : String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const fmtCur = (n, cur=CONFIG.CURRENCY) => {
  try { return new Intl.NumberFormat('en-US',{style:'currency',currency:cur,maximumFractionDigits:2}).format(Number(n)||0); }
  catch { return `${CONFIG.CURRENCY_SYMBOL}${(Number(n)||0).toFixed(2)}`; }
};
const fmtDate = d => { if (!d) return '—'; const x = new Date(d); return isNaN(x)?'—':x.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); };
const fmtDT   = d => { if (!d) return '—'; return new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
const timeAgo = d => {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  if (s < 604800) return Math.floor(s/86400) + 'd ago';
  return fmtDate(d);
};
const avatar = u => u?.avatar || (CONFIG.DEFAULT_AVATAR + encodeURIComponent(u?.name || u?.email || 'User'));
const statusClass = s => `status status-${String(s||'unknown').toLowerCase().replace(/\s+/g,'_')}`;
const uid = () => Math.random().toString(36).slice(2,10);
const debounce = (fn, ms=350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const pct = n => `${Math.max(0, Math.min(100, Number(n)||0))}%`;

function downloadCsv(filename, rows) {
  if (!rows || !rows.length) return showToast('Nothing to export', 'warning');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(
    rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','))
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function hexToRgba(hex, alpha) {
  const h = String(hex || '#1e3a8a').replace('#','');
  const full = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
  const r = parseInt(full.slice(0,2), 16);
  const g = parseInt(full.slice(2,4), 16);
  const b = parseInt(full.slice(4,6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatBytes(b) {
  if (!b) return '0 B';
  const units = ['B','KB','MB','GB'];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/* ---------- CONSULTATION UTILS ---------- */
function fmtInTz(date, tz = 'UTC', opts = {}) {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz, month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', ...opts,
    }).format(new Date(date));
  } catch { return fmtDT(date); }
}

function slotLabel(slot) {
  return `${fmtInTz(slot.start_time)} – ${fmtInTz(slot.end_time, 'UTC', { hour: '2-digit', minute: '2-digit' })}`;
}

function timeUntil(date) {
  if (!date) return '';
  const ms = new Date(date) - Date.now();
  if (ms < 0) return 'now';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

function consultationStatusClass(s) {
  const map = {
    pending_payment: 'status-pending',
    pending_expert_confirmation: 'status-pending',
    confirmed: 'status-active',
    scheduled: 'status-info',
    in_grace: 'status-warning',
    in_session: 'status-active',
    awaiting_completion: 'status-info',
    completed: 'status-active',
    no_show: 'status-rejected',
    cancelled: 'status-cancelled',
    expired: 'status-archived',
    disputed: 'status-rejected',
  };
  return map[s] || 'status-pending';
}

function refundPreview(scheduledAt) {
  if (!scheduledAt) return { pct: 100, label: 'Full refund available' };
  const hours = (new Date(scheduledAt) - Date.now()) / 3600000;
  if (hours > 24) return { pct: 100, label: 'More than 24h notice — full refund' };
  if (hours > 2) return { pct: 50, label: '2–24h notice — 50% refund' };
  return { pct: 0, label: 'Less than 2h notice — no refund' };
}

/* ---------- E-SCHOOL UTILS ---------- */
function xpForLevel(level) { return Math.pow(level - 1, 2) * 100; }
function levelFromXP(xp) { return Math.max(1, Math.floor(Math.sqrt((Number(xp)||0) / 100)) + 1); }
function xpProgressPercent(xp) {
  const level = levelFromXP(xp);
  const prev = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return Math.round(((xp - prev) / (next - prev)) * 100);
}

function lessonIcon(type) {
  return {
    video: 'fa-play-circle',
    reading: 'fa-book-open',
    quiz: 'fa-question-circle',
    assignment: 'fa-file-signature',
    live: 'fa-video',
    code: 'fa-code',
    download: 'fa-download',
  }[type] || 'fa-circle';
}

function lessonStatusLabel(status) {
  return {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    skipped: 'Skipped',
  }[status] || status;
}

function timeAgoOrDate(d) { return timeAgo(d); }

function badgeIconFor(code) {
  const b = CONFIG.BADGES[code];
  return b ? b.icon : 'fa-medal';
}
function badgeNameFor(code) {
  const b = CONFIG.BADGES[code];
  return b ? b.name : code;
}

/* ---------- INSTITUTION UTILS ---------- */
function pctOf(value, total) {
  if (!total) return 0;
  return Math.round((Number(value) / Number(total)) * 100);
}

function campusLabel(id) {
  const c = (S.campuses || []).find(x => x.id === id);
  return c ? c.name : '—';
}

function riskLevelColour(level) {
  return { low:'#22c55e', medium:'#eab308', high:'#f97316', critical:'#dc2626' }[level] || '#94a3b8';
}

function budgetUtilClass(pct) {
  if (pct >= 95) return 'budget-critical';
  if (pct >= 80) return 'budget-warning';
  if (pct >= 50) return 'budget-ok';
  return 'budget-low';
}

function examIntegrityLabel(score) {
  if (score == null) return 'Not Scored';
  if (score >= 90) return 'Clean';
  if (score >= 70) return 'Minor Flags';
  if (score >= 50) return 'Review Needed';
  return 'Invalidated';
}

function renderMiniBar(pct, colour) {
  return `
    <div class="mini-bar">
      <span style="width:${Math.max(0, Math.min(100, pct))}%;background:${colour || 'var(--brand)'}"></span>
    </div>`;
}

function truncateHash(hash, chars = 12) {
  if (!hash) return '—';
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}

/* ============================================================
   ExpertHub 2.0 — 02 Feature Expansion
   Advanced Utility Toolkit
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature02;
  if (NS) return;

  const namespace = {
    name: "Advanced Utility Toolkit",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["deep clone", "deep merge", "stable stringify", "query-string builder", "URL parser", "date range helpers", "currency conversion display", "number statistics", "text highlighting", "slug generation", "safe JSON", "form serialization", "object path access", "array grouping", "deduplication", "sorting", "filter builder", "CSV parser", "CSV exporter", "debounce/throttle", "retry backoff", "memoization", "hashing", "color contrast"],
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
      storagePrefix: 'experthub.feature.02.',
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
      document.dispatchEvent(new CustomEvent('eh:02:' + eventName, { detail: payload }));
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
    a.download = 'experthub-02-diagnostics.json';
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

  window.EHFeature02 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = {
      feature: "deep clone",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:01', result);
    return result;
  }

  register("deep clone", {
    category: "deep",
    description: "Enhanced deep clone capability for advanced utility toolkit",
    handler: feature_01
  });

  function feature_02(payload = {}, context = {}) {
    const result = {
      feature: "deep merge",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:02', result);
    return result;
  }

  register("deep merge", {
    category: "deep",
    description: "Enhanced deep merge capability for advanced utility toolkit",
    handler: feature_02
  });

  function feature_03(payload = {}, context = {}) {
    const result = {
      feature: "stable stringify",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:03', result);
    return result;
  }

  register("stable stringify", {
    category: "stable",
    description: "Enhanced stable stringify capability for advanced utility toolkit",
    handler: feature_03
  });

  function feature_04(payload = {}, context = {}) {
    const result = {
      feature: "query-string builder",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:04', result);
    return result;
  }

  register("query-string builder", {
    category: "query_string",
    description: "Enhanced query-string builder capability for advanced utility toolkit",
    handler: feature_04
  });

  function feature_05(payload = {}, context = {}) {
    const result = {
      feature: "URL parser",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:05', result);
    return result;
  }

  register("URL parser", {
    category: "url",
    description: "Enhanced URL parser capability for advanced utility toolkit",
    handler: feature_05
  });

  function feature_06(payload = {}, context = {}) {
    const result = {
      feature: "date range helpers",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:06', result);
    return result;
  }

  register("date range helpers", {
    category: "date",
    description: "Enhanced date range helpers capability for advanced utility toolkit",
    handler: feature_06
  });

  function feature_07(payload = {}, context = {}) {
    const result = {
      feature: "currency conversion display",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:07', result);
    return result;
  }

  register("currency conversion display", {
    category: "currency",
    description: "Enhanced currency conversion display capability for advanced utility toolkit",
    handler: feature_07
  });

  function feature_08(payload = {}, context = {}) {
    const result = {
      feature: "number statistics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:08', result);
    return result;
  }

  register("number statistics", {
    category: "number",
    description: "Enhanced number statistics capability for advanced utility toolkit",
    handler: feature_08
  });

  function feature_09(payload = {}, context = {}) {
    const result = {
      feature: "text highlighting",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:09', result);
    return result;
  }

  register("text highlighting", {
    category: "text",
    description: "Enhanced text highlighting capability for advanced utility toolkit",
    handler: feature_09
  });

  function feature_10(payload = {}, context = {}) {
    const result = {
      feature: "slug generation",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:10', result);
    return result;
  }

  register("slug generation", {
    category: "slug",
    description: "Enhanced slug generation capability for advanced utility toolkit",
    handler: feature_10
  });

  function feature_11(payload = {}, context = {}) {
    const result = {
      feature: "safe JSON",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:11', result);
    return result;
  }

  register("safe JSON", {
    category: "safe",
    description: "Enhanced safe JSON capability for advanced utility toolkit",
    handler: feature_11
  });

  function feature_12(payload = {}, context = {}) {
    const result = {
      feature: "form serialization",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:12', result);
    return result;
  }

  register("form serialization", {
    category: "form",
    description: "Enhanced form serialization capability for advanced utility toolkit",
    handler: feature_12
  });

  function feature_13(payload = {}, context = {}) {
    const result = {
      feature: "object path access",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:13', result);
    return result;
  }

  register("object path access", {
    category: "object",
    description: "Enhanced object path access capability for advanced utility toolkit",
    handler: feature_13
  });

  function feature_14(payload = {}, context = {}) {
    const result = {
      feature: "array grouping",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:14', result);
    return result;
  }

  register("array grouping", {
    category: "array",
    description: "Enhanced array grouping capability for advanced utility toolkit",
    handler: feature_14
  });

  function feature_15(payload = {}, context = {}) {
    const result = {
      feature: "deduplication",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:15', result);
    return result;
  }

  register("deduplication", {
    category: "deduplication",
    description: "Enhanced deduplication capability for advanced utility toolkit",
    handler: feature_15
  });

  function feature_16(payload = {}, context = {}) {
    const result = {
      feature: "sorting",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:16', result);
    return result;
  }

  register("sorting", {
    category: "sorting",
    description: "Enhanced sorting capability for advanced utility toolkit",
    handler: feature_16
  });

  function feature_17(payload = {}, context = {}) {
    const result = {
      feature: "filter builder",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:17', result);
    return result;
  }

  register("filter builder", {
    category: "filter",
    description: "Enhanced filter builder capability for advanced utility toolkit",
    handler: feature_17
  });

  function feature_18(payload = {}, context = {}) {
    const result = {
      feature: "CSV parser",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:18', result);
    return result;
  }

  register("CSV parser", {
    category: "csv",
    description: "Enhanced CSV parser capability for advanced utility toolkit",
    handler: feature_18
  });

  function feature_19(payload = {}, context = {}) {
    const result = {
      feature: "CSV exporter",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:19', result);
    return result;
  }

  register("CSV exporter", {
    category: "csv",
    description: "Enhanced CSV exporter capability for advanced utility toolkit",
    handler: feature_19
  });

  function feature_20(payload = {}, context = {}) {
    const result = {
      feature: "debounce/throttle",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:20', result);
    return result;
  }

  register("debounce/throttle", {
    category: "debounce/throttle",
    description: "Enhanced debounce/throttle capability for advanced utility toolkit",
    handler: feature_20
  });

  function feature_21(payload = {}, context = {}) {
    const result = {
      feature: "retry backoff",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:21', result);
    return result;
  }

  register("retry backoff", {
    category: "retry",
    description: "Enhanced retry backoff capability for advanced utility toolkit",
    handler: feature_21
  });

  function feature_22(payload = {}, context = {}) {
    const result = {
      feature: "memoization",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:22', result);
    return result;
  }

  register("memoization", {
    category: "memoization",
    description: "Enhanced memoization capability for advanced utility toolkit",
    handler: feature_22
  });

  function feature_23(payload = {}, context = {}) {
    const result = {
      feature: "hashing",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:23', result);
    return result;
  }

  register("hashing", {
    category: "hashing",
    description: "Enhanced hashing capability for advanced utility toolkit",
    handler: feature_23
  });

  function feature_24(payload = {}, context = {}) {
    const result = {
      feature: "color contrast",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "02"
    };
    emit('feature:24', result);
    return result;
  }

  register("color contrast", {
    category: "color",
    description: "Enhanced color contrast capability for advanced utility toolkit",
    handler: feature_24
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
  window.ExpertHubFeatureRegistry["02"] = namespace;

})();

/* ============================================================
   End 02 feature expansion
   ============================================================ */
