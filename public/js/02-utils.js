/* ============================================================
   ExpertHub 2.0 — 02-utils.js
   Pure helper functions. No state mutation. No DOM writes on load.
   Depends on: 01-state.js (CONFIG, APP, S, UI, ASYNC, FLAGS)
   ============================================================ */

'use strict';

/* ============================================================
   SECTION 1 — DOM SELECTORS & MANIPULATION
   ============================================================ */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

/** Create an element from a spec. */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') node.className = Array.isArray(v) ? v.filter(Boolean).join(' ') : v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Attach event listener, return unsubscribe function. */
function on(target, event, handler, options) {
  if (!target) return () => {};
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

/** Event delegation. Returns unsubscribe. */
function delegate(root, event, selector, handler) {
  if (!root) return () => {};
  const fn = (e) => {
    const match = e.target.closest(selector);
    if (match && root.contains(match)) handler.call(match, e, match);
  };
  root.addEventListener(event, fn);
  return () => root.removeEventListener(event, fn);
}

const addClass    = (el, ...cls) => el && el.classList.add(...cls.flat().filter(Boolean));
const removeClass = (el, ...cls) => el && el.classList.remove(...cls.flat().filter(Boolean));
const toggleClass = (el, cls, force) => el && el.classList.toggle(cls, force);
const hasClass    = (el, cls) => !!el && el.classList.contains(cls);
const show        = (el, display = '') => el && (el.style.display = display);
const hide        = (el) => el && (el.style.display = 'none');
const toggle      = (el, force) => {
  if (!el) return;
  const hidden = force === undefined ? el.style.display !== 'none' : !force;
  el.style.display = hidden ? 'none' : '';
};
const empty       = (el) => { while (el && el.firstChild) el.removeChild(el.firstChild); return el; };
const attr        = (el, k, v) => {
  if (!el) return;
  if (v === undefined) return el.getAttribute(k);
  if (v === null) el.removeAttribute(k);
  else el.setAttribute(k, v);
};
const dataAttr    = (el, k, v) => {
  if (!el) return;
  if (v === undefined) return el.dataset[k];
  if (v === null) delete el.dataset[k];
  else el.dataset[k] = v;
};

/* ============================================================
   SECTION 2 — STRING UTILITIES
   ============================================================ */

/** HTML-escape a value. */
const esc = (s) =>
  s === null || s === undefined ? '' :
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Escape a string for safe use inside a RegExp. */
const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Capitalise first letter. */
const capitalize = (s) => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '';

/** Title Case ("hello world" → "Hello World"). */
const titleCase = (s) =>
  String(s || '').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

/** camelCase ("hello world" → "helloWorld"). */
const camelCase = (s) =>
  String(s || '').replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (m) => m.toLowerCase());

/** kebab-case ("Hello World" → "hello-world"). */
const kebabCase = (s) =>
  String(s || '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

/** snake_case ("Hello World" → "hello_world"). */
const snakeCase = (s) => kebabCase(s).replace(/-/g, '_');

/** URL-friendly slug. */
const slugify = (s) =>
  String(s || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/** Truncate with ellipsis. */
const truncate = (s, n = 40, suffix = '…') => {
  const str = String(s ?? '');
  return str.length <= n ? str : str.slice(0, Math.max(0, n - suffix.length)) + suffix;
};

/** Strip HTML tags. */
const stripHtml = (s) => String(s ?? '').replace(/<[^>]*>/g, '');

/** Initials: "Jane Marie Doe" → "JD" (or first N initials). */
function initials(name, max = 2) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).slice(0, max).toUpperCase();
}

/** Pad numbers with zeros. */
const pad = (n, len = 2, ch = '0') => String(n).padStart(len, ch);

/** Pluralise based on count. */
const pluralize = (count, singular, plural) => (Number(count) === 1 ? singular : (plural || `${singular}s`));

/** Safe JSON parse. */
function safeJsonParse(str, fallback = null) {
  if (str == null || str === '') return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/** Safe JSON stringify (handles cycles). */
function safeJsonStringify(obj, space = 0) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (k, v) => {
    if (typeof v === 'object' && v !== null) {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
    }
    if (typeof v === 'bigint') return v.toString();
    return v;
  }, space);
}

/** Generate a random string id (browser-friendly). */
const uid = (len = 8) => {
  const buf = new Uint8Array(Math.ceil(len / 2));
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
  else for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, len);
};

/** RFC4122-ish UUID v4. */
function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}

/** Simple deterministic 32-bit hash of a string. */
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) {
    h = ((h << 5) - h + String(str).charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Levenshtein distance (short strings only). */
function levenshtein(a, b) {
  a = String(a); b = String(b);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/* ============================================================
   SECTION 3 — NUMBER & CURRENCY FORMATTING
   ============================================================ */

/** Format a number as currency, respecting CONFIG and locale. */
function fmtCur(n, cur = CONFIG.CURRENCY, locale = APP.LOCALE) {
  const num = Number(n);
  if (!isFinite(num)) n = 0;
  const meta = (CONFIG.CURRENCIES && CONFIG.CURRENCIES[cur]) || null;
  try {
    return new Intl.NumberFormat(meta?.locale || locale, {
      style: 'currency', currency: cur,
      minimumFractionDigits: meta?.decimals ?? 2,
      maximumFractionDigits: meta?.decimals ?? 2,
    }).format(Number(n) || 0);
  } catch {
    const sym = meta?.symbol || CONFIG.CURRENCY_SYMBOL;
    return `${sym}${(Number(n) || 0).toFixed(meta?.decimals ?? 2)}`;
  }
}

/** Format a plain number with thousand separators. */
function fmtNumber(n, digits = 0, locale = APP.LOCALE) {
  const num = Number(n);
  if (!isFinite(num)) return '0';
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(num);
  } catch {
    return num.toFixed(digits);
  }
}

/** Compact number (1.2K, 3.4M). */
function fmtCompact(n, locale = APP.LOCALE) {
  const num = Number(n) || 0;
  try {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(num);
  } catch {
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
  }
}

/** Percent formatting (0.42 → "42%"). */
function fmtPercent(n, digits = 0) {
  const num = Number(n);
  if (!isFinite(num)) return '0%';
  return `${num.toFixed(digits)}%`;
}

/** Ordinal ("1st", "2nd", "3rd"). */
function ordinal(n) {
  const v = Number(n) || 0;
  const s = ['th', 'st', 'nd', 'rd'];
  const k = v % 100;
  return v + (s[(k - 20) % 10] || s[k] || s[0]);
}

/** Bytes → "1.5 MB". */
function formatBytes(b, decimals = 1) {
  const num = Number(b);
  if (!isFinite(num) || num <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0, v = num;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

/** Duration in ms → "1h 23m 4s". */
function formatDuration(ms) {
  const n = Math.max(0, Number(ms) || 0);
  const s = Math.floor(n / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!d && !h && (sec || !parts.length)) parts.push(`${sec}s`);
  return parts.join(' ');
}

/** Convert major → minor currency units. */
const toMinorUnits = (amount, decimals = 2) => Math.round((Number(amount) || 0) * Math.pow(10, decimals));
/** Convert minor → major currency units. */
const fromMinorUnits = (amount, decimals = 2) => (Number(amount) || 0) / Math.pow(10, decimals);

/* ============================================================
   SECTION 4 — DATE & TIME
   ============================================================ */

/** Format date as "Jan 5, 2026". */
function fmtDate(d, opts = {}) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  try {
    return x.toLocaleDateString(APP.LOCALE, { year: 'numeric', month: 'short', day: 'numeric', ...opts });
  } catch {
    return x.toDateString();
  }
}

/** Format datetime as "Jan 5, 14:30". */
function fmtDT(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  try {
    return x.toLocaleString(APP.LOCALE, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return x.toString();
  }
}

/** Format time only ("14:30"). */
function fmtTime(d, opts = {}) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  try {
    return x.toLocaleTimeString(APP.LOCALE, { hour: '2-digit', minute: '2-digit', ...opts });
  } catch { return x.toTimeString().slice(0, 5); }
}

/** Relative time: "just now", "3m ago", "2d ago", "Jan 5". */
function timeAgo(d) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (!isFinite(diff)) return '';
  const future = diff < 0;
  const s = Math.abs(diff);
  let label;
  if (s < 45) label = 'just now';
  else if (s < 3600) label = `${Math.floor(s / 60)}m`;
  else if (s < 86400) label = `${Math.floor(s / 3600)}h`;
  else if (s < 604800) label = `${Math.floor(s / 86400)}d`;
  else if (s < 2592000) label = `${Math.floor(s / 604800)}w`;
  else if (s < 31536000) label = `${Math.floor(s / 2592000)}mo`;
  else label = `${Math.floor(s / 31536000)}y`;
  if (label === 'just now') return label;
  return future ? `in ${label}` : `${label} ago`;
}

/** Relative time in the future ("in 2h") or "now". */
function timeUntil(date) {
  if (!date) return '';
  const ms = new Date(date) - Date.now();
  if (ms <= 0) return 'now';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `in ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `in ${months}mo`;
  return `in ${Math.floor(months / 12)}y`;
}

const isDate           = (d) => d instanceof Date && !isNaN(d.getTime());
const isSameDay        = (a, b) => { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); };
const isToday          = (d) => isSameDay(d, new Date());
const isPast           = (d) => new Date(d).getTime() < Date.now();
const isFuture         = (d) => new Date(d).getTime() > Date.now();
const startOfDay       = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay         = (d = new Date()) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const startOfWeek      = (d = new Date(), weekStart = 1) => { const x = startOfDay(d); const day = (x.getDay() + 7 - weekStart) % 7; x.setDate(x.getDate() - day); return x; };
const endOfWeek        = (d = new Date(), weekStart = 1) => { const x = startOfWeek(d, weekStart); x.setDate(x.getDate() + 6); return endOfDay(x); };
const startOfMonth     = (d = new Date()) => { const x = new Date(d); x.setDate(1); x.setHours(0, 0, 0, 0); return x; };
const endOfMonth       = (d = new Date()) => { const x = new Date(d); x.setMonth(x.getMonth() + 1, 0); x.setHours(23, 59, 59, 999); return x; };
const addDays          = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + Number(n)); return x; };
const addMinutes       = (d, n) => new Date(new Date(d).getTime() + Number(n) * 60000);
const diffDays         = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 86400000);
const diffHours        = (a, b) => (new Date(a) - new Date(b)) / 3600000;
const toIso            = (d = new Date()) => new Date(d).toISOString();
const nowIso           = () => new Date().toISOString();
const isWeekend        = (d) => [0, 6].includes(new Date(d).getDay());
const isoDate          = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
const isoTime          = (d = new Date()) => new Date(d).toISOString().slice(11, 19);

/** Human "5 min" for duration ms. */
function fmtMinutes(ms) {
  const min = Math.round((Number(ms) || 0) / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Format date in a given IANA timezone (kept for consultation module). */
function fmtInTz(date, tz = 'UTC', opts = {}) {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat(APP.LOCALE, {
      timeZone: tz, month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', ...opts,
    }).format(new Date(date));
  } catch { return fmtDT(date); }
}

/* ============================================================
   SECTION 5 — ARRAY / OBJECT UTILITIES
   ============================================================ */

const isArray     = Array.isArray;
const isObject    = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isFunction  = (v) => typeof v === 'function';
const isString    = (v) => typeof v === 'string';
const isNumber    = (v) => typeof v === 'number' && !isNaN(v);
const isPlainObject = (v) => {
  if (!isObject(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};
const isEmpty = (v) => {
  if (v == null) return true;
  if (Array.isArray(v) || typeof v === 'string') return v.length === 0;
  if (v instanceof Map || v instanceof Set) return v.size === 0;
  if (isObject(v)) return Object.keys(v).length === 0;
  return false;
};

/** Array: unique by strict equality. */
const unique     = (arr) => Array.from(new Set(arr ?? []));
/** Array: unique by key fn or property. */
function uniqueBy(arr, key) {
  const seen = new Set();
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  return (arr ?? []).filter((x) => { const k = fn(x); if (seen.has(k)) return false; seen.add(k); return true; });
}
/** Group by key or fn. */
function groupBy(arr, key) {
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  return (arr ?? []).reduce((acc, item) => {
    const k = fn(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}
/** Sort by one or more keys. Key format: 'name' | '-name' | fn. */
function sortBy(arr, key, dir = 'asc') {
  const copy = [...(arr ?? [])];
  const keys = Array.isArray(key) ? key : [key];
  copy.sort((a, b) => {
    for (const k of keys) {
      let field = k, sign = 1;
      if (typeof k === 'string' && k.startsWith('-')) { field = k.slice(1); sign = -1; }
      const av = typeof field === 'function' ? field(a) : a?.[field];
      const bv = typeof field === 'function' ? field(b) : b?.[field];
      if (av == null && bv == null) continue;
      if (av == null) return -1 * sign;
      if (bv == null) return 1 * sign;
      if (typeof av === 'string' && typeof bv === 'string') {
        const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' });
        if (cmp) return cmp * sign;
      } else {
        if (av < bv) return -1 * sign;
        if (av > bv) return 1 * sign;
      }
    }
    return 0;
  });
  return copy;
}
const chunk     = (arr, size) => { const out = []; for (let i = 0; i < (arr?.length ?? 0); i += size) out.push(arr.slice(i, i + size)); return out; };
const flatten   = (arr, depth = 1) => (arr ?? []).flat(depth);
const range     = (start, end, step = 1) => {
  if (end === undefined) { end = start; start = 0; }
  const out = [];
  if (step === 0) return out;
  if (step > 0) for (let i = start; i < end; i += step) out.push(i);
  else for (let i = start; i > end; i += step) out.push(i);
  return out;
};
const shuffle   = (arr) => { const a = [...(arr ?? [])]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const intersect = (a, b) => unique((a ?? []).filter((x) => (b ?? []).includes(x)));
const difference= (a, b) => (a ?? []).filter((x) => !(b ?? []).includes(x));
const union     = (...arrs) => unique(arrs.flat());
const compact   = (arr) => (arr ?? []).filter(Boolean);
const sum       = (arr) => (arr ?? []).reduce((a, b) => a + (Number(b) || 0), 0);
const avg       = (arr) => (arr?.length ? sum(arr) / arr.length : 0);
const min       = (arr) => (arr?.length ? Math.min(...arr.map(Number).filter(isFinite)) : undefined);
const max       = (arr) => (arr?.length ? Math.max(...arr.map(Number).filter(isFinite)) : undefined);
function median(arr) {
  const a = (arr ?? []).map(Number).filter(isFinite).sort((x, y) => x - y);
  if (!a.length) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function partition(arr, predicate) {
  const pass = [], fail = [];
  for (const x of arr ?? []) (predicate(x) ? pass : fail).push(x);
  return [pass, fail];
}

/** Object: pick keys. */
const pick  = (obj, keys) => keys.reduce((acc, k) => (k in (obj ?? {}) && (acc[k] = obj[k]), acc), {});
/** Object: omit keys. */
const omit  = (obj, keys) => Object.fromEntries(Object.entries(obj ?? {}).filter(([k]) => !keys.includes(k)));
/** Map object values. */
const mapValues = (obj, fn) => Object.fromEntries(Object.entries(obj ?? {}).map(([k, v]) => [k, fn(v, k)]));
/** Map object keys. */
const mapKeys   = (obj, fn) => Object.fromEntries(Object.entries(obj ?? {}).map(([k, v]) => [fn(k, v), v]));
/** Invert object (values → keys). */
const invert    = (obj) => Object.fromEntries(Object.entries(obj ?? {}).map(([k, v]) => [v, k]));

/** Deep clone (structured, handles Date/Map/Set). */
function deepClone(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Map) return new Map([...obj].map(([k, v]) => [k, deepClone(v)]));
  if (obj instanceof Set) return new Set([...obj].map(deepClone));
  if (Array.isArray(obj)) return obj.map(deepClone);
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepClone(v)]));
}

/** Recursive shallow-then-deep merge (arrays are replaced). */
function deepMerge(target, ...sources) {
  const out = isObject(target) ? { ...target } : {};
  for (const src of sources) {
    if (!isObject(src)) continue;
    for (const [k, v] of Object.entries(src)) {
      if (isObject(v) && isObject(out[k])) out[k] = deepMerge(out[k], v);
      else out[k] = deepClone(v);
    }
  }
  return out;
}

/** Deep get by dotted path. */
function deepGet(obj, path, fallback = undefined) {
  if (!obj) return fallback;
  const parts = Array.isArray(path) ? path : String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return fallback;
    cur = cur[p];
  }
  return cur === undefined ? fallback : cur;
}

/** Deep set by dotted path (creates intermediate objects). */
function deepSet(obj, path, value) {
  const parts = Array.isArray(path) ? path : String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!isObject(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}

/* ============================================================
   SECTION 6 — FUNCTION UTILITIES
   ============================================================ */

/** Debounce (with .cancel() and .flush()). */
function debounce(fn, ms = 350, { leading = false } = {}) {
  let t = null, lastArgs = null, lastCall = 0;
  const invoke = () => {
    t = null;
    lastCall = Date.now();
    fn(...(lastArgs || []));
    lastArgs = null;
  };
  const wrapped = (...args) => {
    lastArgs = args;
    const now = Date.now();
    if (leading && now - lastCall > ms) {
      lastCall = now;
      fn(...args);
      return;
    }
    clearTimeout(t);
    t = setTimeout(invoke, ms);
  };
  wrapped.cancel = () => { clearTimeout(t); t = null; lastArgs = null; };
  wrapped.flush = () => { if (t) { clearTimeout(t); invoke(); } };
  return wrapped;
}

/** Throttle (trailing). */
function throttle(fn, ms = 200) {
  let last = 0, t = null, lastArgs = null;
  return (...args) => {
    const now = Date.now();
    lastArgs = args;
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      clearTimeout(t); t = null;
      last = now;
      fn(...args);
    } else if (!t) {
      t = setTimeout(() => { t = null; last = Date.now(); fn(...lastArgs); }, remaining);
    }
  };
}

/** requestAnimationFrame throttle. */
function rafThrottle(fn) {
  let queued = false, lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
  };
}

/** Run only once. */
function once(fn) {
  let called = false, result;
  return (...args) => {
    if (called) return result;
    called = true;
    result = fn(...args);
    return result;
  };
}

/** Memoise by stringified args (single-arg only for perf). */
function memoize(fn, keyFn = (a) => JSON.stringify(a)) {
  const cache = new Map();
  return (...args) => {
    const k = keyFn(args);
    if (cache.has(k)) return cache.get(k);
    const v = fn(...args);
    cache.set(k, v);
    return v;
  };
}

const noop     = () => {};
const identity = (x) => x;
const pipe     = (...fns) => (input) => fns.reduce((acc, fn) => fn(acc), input);
const compose  = (...fns) => (input) => fns.reduceRight((acc, fn) => fn(acc), input);
const constant = (v) => () => v;
const negate   = (fn) => (...a) => !fn(...a);

/* ============================================================
   SECTION 7 — PROMISES / ASYNC
   ============================================================ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Retry an async fn with exponential backoff. */
async function retry(fn, { attempts = 3, backoffMs = 500, shouldRetry = () => true } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !shouldRetry(err, i)) throw err;
      await sleep(backoffMs * Math.pow(2, i));
    }
  }
  throw lastErr;
}

/** Promise timeout guard. */
function withTimeout(promise, ms, message = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(message)), ms)),
  ]);
}

/** Run promises in batches of `size`. */
async function runBatched(items, fn, size = 5) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

/** Cancellable delay. */
function delay(ms) {
  let cancel;
  const p = new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    cancel = () => { clearTimeout(t); reject(new Error('cancelled')); };
  });
  p.cancel = cancel;
  return p;
}

/* ============================================================
   SECTION 8 — VALIDATION
   ============================================================ */

const isEmail    = (s) => CONFIG.EMAIL_REGEX.test(String(s || '').trim());
const isPhone    = (s) => CONFIG.PHONE_REGEX.test(String(s || '').trim());
const isUrl      = (s) => CONFIG.URL_REGEX.test(String(s || '').trim());
const isUuid     = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ''));
const isHex      = (s) => /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(s || ''));
const isNumeric  = (s) => s !== '' && s !== null && !isNaN(Number(s));
const isInt      = (s) => Number.isInteger(Number(s));
const isPositive = (s) => isNumeric(s) && Number(s) > 0;
const isStrongPassword = (s) => CONFIG.PASSWORD_REGEX.test(String(s || ''));
const isSafePath = (s) => !String(s || '').includes('..') && !String(s || '').includes('//');

/** Return first validation error message, or '' if valid. */
function validate(value, rules = []) {
  for (const rule of rules) {
    const { test, message } = typeof rule === 'function' ? { test: rule, message: 'Invalid' } : rule;
    if (!test(value)) return message;
  }
  return '';
}

/* ============================================================
   SECTION 9 — COLOUR
   ============================================================ */

function hexToRgba(hex, alpha = 1) {
  const h = String(hex || '#1e3a8a').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha)})`;
}

function rgbaToHex(rgba) {
  const m = String(rgba || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return '#000000';
  const toHex = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
}

function lighten(hex, amount = 0.15) {
  const h = String(hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function darken(hex, amount = 0.15) {
  const h = String(hex || '#ffffff').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const mix = (c) => Math.round(c * (1 - amount));
  return `#${[mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Best-contrast text colour for a given background. */
function contrastColor(hex) {
  const h = String(hex || '#ffffff').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

const randomHex = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;

/** Read a CSS variable's value. */
const getCssVar = (name, fallback = '') =>
  (typeof getComputedStyle !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : '') || fallback;

/** Set a CSS variable on :root. */
const setCssVar = (name, value) => document.documentElement.style.setProperty(name, value);

/* ============================================================
   SECTION 10 — STORAGE / COOKIES
   ============================================================ */

const lsGet = (k, fallback = null) => {
  try { const v = localStorage.getItem(k); return v == null ? fallback : safeJsonParse(v, v); }
  catch { return fallback; }
};
const lsSet = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch { return false; } };
const lsRemove = (k) => { try { localStorage.removeItem(k); return true; } catch { return false; } };

const ssGet = (k, fallback = null) => {
  try { const v = sessionStorage.getItem(k); return v == null ? fallback : safeJsonParse(v, v); }
  catch { return fallback; }
};
const ssSet = (k, v) => { try { sessionStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch { return false; } };
const ssRemove = (k) => { try { sessionStorage.removeItem(k); return true; } catch { return false; } };

function cookieGet(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + escapeRegex(name) + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function cookieSet(name, value, days = 7, path = '/') {
  const expires = days ? `; expires=${new Date(Date.now() + days * 864e5).toUTCString()}` : '';
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=${path}; SameSite=Lax`;
}
function cookieRemove(name, path = '/') { document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`; }

/* ============================================================
   SECTION 11 — URL / QUERY
   ============================================================ */

function parseQuery(str = (typeof location !== 'undefined' ? location.search : '')) {
  const out = {};
  new URLSearchParams(str).forEach((v, k) => { out[k] = v; });
  return out;
}
function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else sp.set(k, String(v));
  }
  return sp.toString();
}
function buildUrl(base, params = {}) {
  const qs = buildQuery(params);
  return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;
}
function getQueryParam(name, fallback = null) {
  return new URLSearchParams(location.search).get(name) ?? fallback;
}
function setQueryParam(name, value, { replace = false } = {}) {
  const url = new URL(location.href);
  if (value === null || value === undefined || value === '') url.searchParams.delete(name);
  else url.searchParams.set(name, String(value));
  const state = { path: url.pathname + url.search };
  if (replace) history.replaceState(state, '', url);
  else history.pushState(state, '', url);
}

/* ============================================================
   SECTION 12 — FILE / CLIPBOARD
   ============================================================ */

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

/** CSV export. Falls back to a warning toast if available. */
function downloadCsv(filename, rows) {
  if (!rows || !rows.length) {
    if (typeof showToast === 'function') showToast('Nothing to export', 'warning');
    return;
  }
  const headers = unique(rows.flatMap((r) => Object.keys(r)));
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(',')]
    .concat(rows.map((r) => headers.map((h) => escape(r[h])).join(',')))
    .join('\r\n');
  downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), filename);
}

/** JSON export. */
function downloadJson(filename, data) {
  downloadBlob(new Blob([safeJsonStringify(data, 2)], { type: 'application/json;charset=utf-8' }), filename);
}

/** Read a File as text. */
const readFileAsText = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  r.readAsText(file);
});

/** Read a File as data URL. */
const readFileAsDataURL = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(file);
});

/** Read a File as ArrayBuffer. */
const readFileAsArrayBuffer = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  r.readAsArrayBuffer(file);
});

/** Copy text to clipboard. */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(String(text)); return true; }
    const ta = document.createElement('textarea');
    ta.value = String(text);
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

/** Validate a file against config rules. */
function validateFile(file, { maxMb = CONFIG.MAX_UPLOAD_MB, allowedTypes = [] } = {}) {
  if (!file) return 'No file';
  if (file.size > maxMb * 1024 * 1024) return `File exceeds ${maxMb} MB`;
  if (allowedTypes.length && !allowedTypes.includes(file.type)) return `Unsupported type: ${file.type || 'unknown'}`;
  return '';
}

/* ============================================================
   SECTION 13 — PLATFORM / BROWSER DETECTION
   ============================================================ */

const UADATA = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
const isTouch      = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator?.maxTouchPoints ?? 0) > 0);
const isMobile     = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(UADATA);
const isIOS        = /iPad|iPhone|iPod/i.test(UADATA) || (navigator?.platform === 'MacIntel' && (navigator?.maxTouchPoints ?? 0) > 1);
const isAndroid    = /Android/i.test(UADATA);
const isSafari     = /^((?!chrome|android).)*safari/i.test(UADATA);
const isChrome     = /chrome|crios/i.test(UADATA) && !/edge|edg/i.test(UADATA);
const isFirefox    = /firefox|fxios/i.test(UADATA);
const isEdge       = /edg/i.test(UADATA);
const isOnline     = () => (typeof navigator !== 'undefined' ? navigator.onLine : true);
const prefersDark  = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   SECTION 14 — MISC FORMATTERS
   ============================================================ */

const pct       = (n) => `${clamp(Number(n) || 0, 0, 100)}%`;
const clamp     = (n, lo, hi) => Math.min(Math.max(Number(n) || 0, lo), hi);
const lerp      = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const randInt   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample    = (arr) => arr[Math.floor(Math.random() * arr.length)];
const toBool    = (v) => v === true || v === 'true' || v === '1' || v === 1;
const safeNum   = (v, fallback = 0) => (isFinite(Number(v)) ? Number(v) : fallback);

const statusClass = (s) => `status status-${String(s ?? 'unknown').toLowerCase().replace(/[\s-]+/g, '_')}`;

const avatar = (u) =>
  u?.avatar ||
  (CONFIG.DEFAULT_AVATAR + encodeURIComponent(u?.name || u?.email || 'User'));

/** Simple classnames helper. */
function cn(...args) {
  const out = [];
  for (const a of args.flat(Infinity)) {
    if (!a) continue;
    if (typeof a === 'string' || typeof a === 'number') out.push(String(a));
    else if (isObject(a)) for (const [k, v] of Object.entries(a)) if (v) out.push(k);
  }
  return out.join(' ');
}

/** Mini inline bar (kept for institution module). */
function renderMiniBar(percent, colour) {
  return `
    <div class="mini-bar">
      <span style="width:${clamp(percent, 0, 100)}%;background:${colour || 'var(--brand)'}"></span>
    </div>`;
}

const truncateHash = (hash, chars = 12) => {
  if (!hash) return '—';
  const h = String(hash);
  return h.length <= chars * 2 ? h : `${h.slice(0, chars)}…${h.slice(-chars)}`;
};

/* ============================================================
   SECTION 15 — CONSULTATION HELPERS
   ============================================================ */

function slotLabel(slot) {
  return `${fmtInTz(slot.start_time)} – ${fmtInTz(slot.end_time, 'UTC', { hour: '2-digit', minute: '2-digit' })}`;
}

function consultationStatusClass(s) {
  return ({
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
  }[s]) || 'status-pending';
}

function refundPreview(scheduledAt) {
  if (!scheduledAt) return { pct: 100, label: 'Full refund available' };
  const hours = (new Date(scheduledAt) - Date.now()) / 3600000;
  if (hours > 24) return { pct: 100, label: 'More than 24h notice — full refund' };
  if (hours > 2)  return { pct: 50,  label: '2–24h notice — 50% refund' };
  return { pct: 0, label: 'Less than 2h notice — no refund' };
}

/* ============================================================
   SECTION 16 — E-SCHOOL HELPERS
   ============================================================ */

function xpForLevel(level) { return Math.pow(Math.max(1, level) - 1, 2) * 100; }
function levelFromXP(xp)   { return Math.max(1, Math.floor(Math.sqrt((Number(xp) || 0) / 100)) + 1); }
function xpProgressPercent(xp) {
  const level = levelFromXP(xp);
  const prev  = xpForLevel(level);
  const next  = xpForLevel(level + 1);
  if (next === prev) return 100;
  return Math.round(((xp - prev) / (next - prev)) * 100);
}
function levelMeta(xp) {
  const lvl = levelFromXP(xp);
  const def = (CONFIG.XP_LEVELS || []).reduce((acc, cur) => (cur.level <= lvl && cur.level > (acc?.level || 0) ? cur : acc), null);
  return def || { level: lvl, title: `Level ${lvl}`, min: xpForLevel(lvl) };
}

function lessonIcon(type) {
  return ({
    video: 'fa-play-circle',
    reading: 'fa-book-open',
    quiz: 'fa-question-circle',
    assignment: 'fa-file-signature',
    live: 'fa-video',
    code: 'fa-code',
    download: 'fa-download',
  }[type]) || 'fa-circle';
}

function lessonStatusLabel(status) {
  return ({
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    skipped: 'Skipped',
  }[status]) || status;
}

const timeAgoOrDate = timeAgo;

const badgeIconFor = (code) => CONFIG.BADGES?.[code]?.icon || 'fa-medal';
const badgeNameFor = (code) => CONFIG.BADGES?.[code]?.name || code;

/* ============================================================
   SECTION 17 — INSTITUTION HELPERS
   ============================================================ */

function pctOf(value, total) {
  if (!total) return 0;
  return Math.round((Number(value) / Number(total)) * 100);
}

function campusLabel(id) {
  const c = (S.campuses || []).find((x) => x.id === id);
  return c ? c.name : '—';
}

const riskLevelColour = (level) =>
  ({ low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#dc2626' }[level]) || '#94a3b8';

function budgetUtilClass(p) {
  const n = Number(p) || 0;
  if (n >= 95) return 'budget-critical';
  if (n >= 80) return 'budget-warning';
  if (n >= 50) return 'budget-ok';
  return 'budget-low';
}

function examIntegrityLabel(score) {
  if (score == null) return 'Not Scored';
  if (score >= 90) return 'Clean';
  if (score >= 70) return 'Minor Flags';
  if (score >= 50) return 'Review Needed';
  return 'Invalidated';
}

/* ============================================================
   SECTION 18 — ACCESSIBILITY
   ============================================================ */

/** Trap focus inside a container (returns release()). */
function trapFocus(container) {
  if (!container) return () => {};
  const SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const handler = (e) => {
    if (e.key !== 'Tab') return;
    const focusables = $$(SELECTOR, container).filter((el) => el.offsetParent !== null);
    if (!focusables.length) { e.preventDefault(); return; }
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

/** Announce a message to screen readers. */
function announce(message, politeness = 'polite') {
  let region = $('#a11y-live-' + politeness);
  if (!region) {
    region = el('div', { id: 'a11y-live-' + politeness, 'aria-live': politeness, 'aria-atomic': 'true', class: 'sr-only' });
    document.body.appendChild(region);
  }
  region.textContent = '';
  setTimeout(() => { region.textContent = String(message); }, 30);
}

/** Focus the first focusable element within `scope`. */
function focusFirst(scope = document) {
  const first = $('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', scope);
  first?.focus();
  return first;
}

/* ============================================================
   SECTION 19 — MISC ID / CLASS HELPERS
   ============================================================ */

/** Format a phone number loosely. */
function fmtPhone(s) {
  const digits = String(s || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return String(s || '—');
}

/** Build a full name from parts. */
const fullName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || u?.name || u?.email || 'Unknown';

/** Sort comparator for object arrays. */
const comparator = (field, dir = 'asc') => (a, b) => {
  const sign = dir === 'desc' ? -1 : 1;
  const av = a?.[field], bv = b?.[field];
  if (av == null && bv == null) return 0;
  if (av == null) return -1 * sign;
  if (bv == null) return 1 * sign;
  if (typeof av === 'string') return av.localeCompare(bv) * sign;
  return (av < bv ? -1 : av > bv ? 1 : 0) * sign;
};

/** Intersection of two sets as array. */
const setToArray = (s) => Array.from(s ?? []);

/** Format a duration of minutes as "01:23:45" for media. */
function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return (h ? `${pad(h)}:` : '') + `${pad(m)}:${pad(sec)}`;
}