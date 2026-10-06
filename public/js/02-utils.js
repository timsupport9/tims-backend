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

/* + new — query + map in one pass */
const $$map = (s, fn, c = document) => Array.from(c.querySelectorAll(s), fn);

/* + new — DocumentFragment builder (faster bulk inserts than repeated append) */
function frag(...children) {
  const f = document.createDocumentFragment();
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    f.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return f;
}

/* + new — safe HTML → Node (strips <script> and <style>) */
function parseHtml(str) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(str ?? '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  return tpl.content;
}

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

/* + new — mount/unmount helpers */
function mount(parent, ...nodes) {
  if (!parent) return parent;
  parent.append(frag(...nodes));
  return parent;
}
function unmount(node) {
  if (node && node.parentNode) node.parentNode.removeChild(node);
  return node;
}

/* + new — relational insertion */
const before  = (node, ref) => ref?.parentNode?.insertBefore(node, ref) ?? node;
const after   = (node, ref) => ref?.parentNode?.insertBefore(node, ref.nextSibling) ?? node;
const replace = (oldNode, newNode) => { oldNode?.parentNode?.replaceChild(newNode, oldNode); return newNode; };

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

/* + new — DOM-ready guard (safe to load in <head>) */
function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

/* + new — Promise-based element wait */
function waitFor(selector, { timeout = 5000, root = document } = {}) {
  return new Promise((resolve, reject) => {
    const existing = root.querySelector(selector);
    if (existing) return resolve(existing);
    let done = false;
    const obs = new MutationObserver(() => {
      const found = root.querySelector(selector);
      if (found && !done) {
        done = true;
        obs.disconnect();
        resolve(found);
      }
    });
    obs.observe(root === document ? document.documentElement : root, { childList: true, subtree: true });
    setTimeout(() => {
      if (done) return;
      done = true;
      obs.disconnect();
      reject(new Error(`waitFor("${selector}") timed out`));
    }, timeout);
  });
}

const addClass    = (el, ...cls) => el && el.classList.add(...cls.flat().filter(Boolean));
const removeClass = (el, ...cls) => el && el.classList.remove(...cls.flat().filter(Boolean));
const toggleClass = (el, cls, force) => el && el.classList.toggle(cls, force);
const hasClass    = (el, cls) => !!el && el.classList.contains(cls);

/* + new — boolean attribute shorthand */
const toggleAttr = (el, k, on) => {
  if (!el) return;
  if (on) el.setAttribute(k, '');
  else el.removeAttribute(k);
};

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

/* + new — isVisible (checks display + visibility + opacity + offsetParent) */
function isVisible(node) {
  if (!node || !(node instanceof Element)) return false;
  if (node.offsetParent === null && getComputedStyle(node).position !== 'fixed') return false;
  const cs = getComputedStyle(node);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0;
}

/* + new — cached layout reads */
const rect   = (node) => node?.getBoundingClientRect?.() || null;
const offset = (node) => ({ x: node?.offsetLeft ?? 0, y: node?.offsetTop ?? 0 });
const size   = (node) => ({ w: node?.offsetWidth ?? 0, h: node?.offsetHeight ?? 0 });

/* + new — traversal without round-trips */
const closest = (node, sel) => node?.closest?.(sel) || null;
function parents(node, sel) {
  const out = [];
  let p = node?.parentElement;
  while (p) { if (!sel || p.matches(sel)) out.push(p); p = p.parentElement; }
  return out;
}
function children(node, sel) {
  return Array.from(node?.children || []).filter((c) => !sel || c.matches(sel));
}

/* + new — shared focusables selector (used by trapFocus in Section 18) */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const focusables = (root) => $$(FOCUSABLE_SELECTOR, root || document);

/* + new — smooth scroll */
function scrollToEl(node, { behavior = 'smooth', block = 'start' } = {}) {
  node?.scrollIntoView?.({ behavior, block });
}

/* + new — css var/prop accessors */
const css    = (node, prop, value) => { if (node) node.style.setProperty(prop, value); return node; };
const getCss = (node, prop) => node ? getComputedStyle(node).getPropertyValue(prop) : '';

/* + new — form serialisation */
function serializeForm(form) {
  if (!form) return {};
  const out = {};
  for (const field of form.elements) {
    if (!field.name || field.disabled) continue;
    const t = field.type;
    if (t === 'checkbox') {
      if (field.name in out && Array.isArray(out[field.name])) {
        if (field.checked) out[field.name].push(field.value);
      } else {
        out[field.name] = field.checked ? [field.value] : (field.name in out ? out[field.name] : false);
      }
      // Simplify single-checkbox booleans
      if (Array.isArray(out[field.name]) && out[field.name].length === 1 && form.querySelectorAll(`[name="${field.name}"]`).length === 1) {
        // keep array form; caller can coerce
      }
    } else if (t === 'radio') {
      if (field.checked) out[field.name] = field.value;
    } else if (field.multiple) {
      out[field.name] = Array.from(field.selectedOptions).map((o) => o.value);
    } else {
      out[field.name] = field.value;
    }
  }
  // Collapse single-checkbox arrays to booleans
  for (const k of Object.keys(out)) {
    if (Array.isArray(out[k]) && out[k].length === 0) out[k] = false;
  }
  return out;
}

function fillForm(form, data = {}) {
  if (!form) return;
  for (const field of form.elements) {
    if (!field.name || !(field.name in data)) continue;
    const v = data[field.name];
    const t = field.type;
    if (t === 'checkbox') field.checked = Array.isArray(v) ? v.includes(field.value) : !!v;
    else if (t === 'radio') field.checked = String(v) === String(field.value);
    else field.value = v == null ? '' : v;
  }
}

/* + new — IntersectionObserver / MutationObserver thin wrappers with auto-disconnect */
function observeIntersection(node, cb, opts = {}) {
  if (!node || typeof IntersectionObserver === 'undefined') return () => {};
  const io = new IntersectionObserver(cb, opts);
  io.observe(node);
  return () => io.disconnect();
}
function observeMutations(node, cb, opts = { childList: true, subtree: true }) {
  if (!node || typeof MutationObserver === 'undefined') return () => {};
  const mo = new MutationObserver(cb);
  mo.observe(node, opts);
  return () => mo.disconnect();
}

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

/* + new — strip accents (extracted from slugify for reuse) */
const stripAccents = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

/** URL-friendly slug. */
const slugify = (s) =>
  stripAccents(s)
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/** Truncate with ellipsis. (fixed: suffix > n case) */
const truncate = (s, n = 40, suffix = '…') => {
  const str = String(s ?? '');
  if (str.length <= n) return str;
  if (suffix.length >= n) return suffix.slice(0, n);
  return str.slice(0, Math.max(0, n - suffix.length)) + suffix;
};

/* + new — middle truncation for hashes/IDs */
const truncateMiddle = (s, n = 20, sep = '…') => {
  const str = String(s ?? '');
  if (str.length <= n) return str;
  const keep = n - sep.length;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return str.slice(0, head) + sep + str.slice(-tail);
};

/* + new — tag-aware truncation */
function truncateHtml(html, n = 100) {
  const tmp = document.createElement('div');
  tmp.innerHTML = String(html ?? '');
  const text = tmp.textContent || '';
  return text.length <= n ? text : text.slice(0, n - 1) + '…';
}

/** Strip HTML tags. */
const stripHtml = (s) => String(s ?? '').replace(/<[^>]*>/g, '');

/* + new — highlight matches, returns escaped HTML with <mark> wrappers */
function highlight(text, query) {
  const str = String(text ?? '');
  const q = String(query ?? '').trim();
  if (!q) return esc(str);
  try {
    return esc(str).replace(new RegExp(`(${escapeRegex(esc(q))})`, 'gi'), '<mark>$1</mark>');
  } catch { return esc(str); }
}

/** Initials: "Jane Marie Doe" → "JD" (or first N initials). */
function initials(name, max = 2) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).slice(0, max).toUpperCase();
}

/** Pad numbers with zeros. */
const pad = (n, len = 2, ch = '0') => String(n).padStart(len, ch);
/* + new aliases */
const padStartSafe = (n, len, ch = '0') => String(n).padStart(len, ch);
const padEndSafe   = (n, len, ch = '0') => String(n).padEnd(len, ch);

/* + new — locale-aware pluralisation */
let _pluralRules = null;
const pluralize = (count, singular, plural) => {
  const n = Number(count);
  if (n === 1) return singular;
  if (plural) return plural;
  try {
    _pluralRules = _pluralRules || (typeof Intl !== 'undefined' ? new Intl.PluralRules(APP.LOCALE) : null);
    if (_pluralRules) {
      const cat = _pluralRules.select(n);
      if (cat === 'one') return singular;
    }
  } catch {}
  return `${singular}s`;
};

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

/* + new — base62 short id (no ambiguous chars) */
const B62_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
const shortId = (len = 10) => {
  const buf = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
  else for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 256);
  return Array.from(buf, (b) => B62_ALPHABET[b % B62_ALPHABET.length]).join('');
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

/* + new — normalised similarity 0..1 */
const similarity = (a, b) => {
  const sa = String(a ?? ''), sb = String(b ?? '');
  const max = Math.max(sa.length, sb.length);
  if (!max) return 1;
  return 1 - levenshtein(sa, sb) / max;
};

/* + new — subsequence fuzzy match with score */
function fuzzyMatch(text, query) {
  const t = String(text ?? '').toLowerCase();
  const q = String(query ?? '').toLowerCase().trim();
  if (!q) return { matched: true, score: 0, indices: [] };
  const indices = [];
  let ti = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return { matched: false, score: -1, indices: [] };
    indices.push(found);
    ti = found + 1;
  }
  // Penalise distance between matches
  const span = indices[indices.length - 1] - indices[0] + 1;
  const score = 1 - span / t.length;
  return { matched: true, score, indices };
}

/* + new — email/phone/secret masking */
const maskEmail = (s) => {
  const str = String(s ?? '');
  const at = str.indexOf('@');
  if (at < 1) return str;
  const local = str.slice(0, at);
  const domain = str.slice(at + 1);
  const l = local.length <= 2 ? local[0] + '•' : local[0] + '•'.repeat(Math.max(1, local.length - 2)) + local.slice(-1);
  const dParts = domain.split('.');
  const dHead = dParts[0] || '';
  const d = dHead.length <= 2 ? dHead : dHead[0] + '•'.repeat(dHead.length - 2) + dHead.slice(-1);
  return `${l}@${d}${dParts.length > 1 ? '.' + dParts.slice(1).join('.') : ''}`;
};
const maskPhone = (s) => {
  const str = String(s ?? '');
  const digits = str.replace(/\D/g, '');
  if (digits.length < 4) return str;
  return '•'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
};
const maskSecret = (s, keep = 4) => {
  const str = String(s ?? '');
  if (str.length <= keep) return '•'.repeat(str.length);
  return '•'.repeat(str.length - keep) + str.slice(-keep);
};

/* + new — normalised whitespace / lines */
const normalizeWhitespace = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const collapseLines       = (s) => String(s ?? '').replace(/\n{3,}/g, '\n\n').trim();
const splitLines          = (s) => String(s ?? '').split(/\r?\n/);
const joinLines           = (arr) => (arr ?? []).join('\n');

/* + new — simple template interpolation: "Hi {name}" */
function template(str, data = {}) {
  return String(str ?? '').replace(/\{(\w+)(?::([^}]+))?\}/g, (_, k, fallback) => {
    const v = data[k];
    return v == null ? (fallback ?? '') : String(v);
  });
}

/* + new — word count + reading time */
const wordCount   = (s) => (String(s ?? '').trim().match(/\S+/g) || []).length;
const readingTime = (s, wpm = 220) => Math.max(1, Math.ceil(wordCount(s) / wpm));

/* + new — natural sort comparator (reuses Intl.Collator) */
const _naturalCollator = (() => {
  try { return new Intl.Collator(undefined, { sensitivity: 'base', numeric: true }); }
  catch { return null; }
})();
const naturalCompare = (a, b) =>
  _naturalCollator ? _naturalCollator.compare(String(a), String(b))
                   : String(a).localeCompare(String(b));

/* + new — UTF-8 byte length + Base64 helpers */
const bytesOf = (s) => new Blob([String(s ?? '')]).size;
function base64Encode(str) {
  try { return btoa(unescape(encodeURIComponent(String(str ?? '')))); }
  catch { return ''; }
}
function base64Decode(b64) {
  try { return decodeURIComponent(escape(atob(String(b64 ?? '')))); }
  catch { return ''; }
}

/* + new — markdown stripper */
const stripMarkdown = (s) =>
  String(s ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .trim();

/* + new — CSV-safe escape (hoisted from downloadCsv) */
const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/* + new — seeded hash (for stable colours/avatars) */
function hashString(str, seed = 0) {
  let h = seed >>> 0;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/* + new — random string over custom alphabet */
function randomString(len = 12, alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
  const buf = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
  else for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 256);
  return Array.from(buf, (b) => alphabet[b % alphabet.length]).join('');
}

/* ============================================================
   SECTION 3 — NUMBER & CURRENCY FORMATTING
   ============================================================ */

/** Format a number as currency, respecting CONFIG and locale. (fixed: dead assignment) */
function fmtCur(n, cur = CONFIG.CURRENCY, locale = APP.LOCALE) {
  const num = Number(n);
  const safe = isFinite(num) ? num : 0;
  const meta = (CONFIG.CURRENCIES && CONFIG.CURRENCIES[cur]) || null;
  try {
    return new Intl.NumberFormat(meta?.locale || locale, {
      style: 'currency', currency: cur,
      minimumFractionDigits: meta?.decimals ?? 2,
      maximumFractionDigits: meta?.decimals ?? 2,
    }).format(safe);
  } catch {
    const sym = meta?.symbol || CONFIG.CURRENCY_SYMBOL;
    return `${sym}${safe.toFixed(meta?.decimals ?? 2)}`;
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

/** Compact number (1.2K, 3.4M). (+ new: long form option) */
function fmtCompact(n, locale = APP.LOCALE, { long = false } = {}) {
  const num = Number(n) || 0;
  try {
    if (long) {
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'long',
        maximumFractionDigits: 1,
      }).format(num);
    }
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

/* + new — signed number ("+5" / "-3") */
const fmtSigned = (n, digits = 0) => {
  const num = Number(n) || 0;
  const s = num > 0 ? '+' : '';
  return s + fmtNumber(num, digits);
};

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

/** Duration in ms → "1h 23m 4s". (+ new: long form option) */
function formatDuration(ms, { long = false } = {}) {
  const n = Math.max(0, Number(ms) || 0);
  const s = Math.floor(n / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (long) {
    const unit = (v, sing, plur) => `${v} ${pluralize(v, sing, plur)}`;
    const parts = [];
    if (d) parts.push(unit(d, 'day'));
    if (h) parts.push(unit(h, 'hour'));
    if (m) parts.push(unit(m, 'minute'));
    if (!d && !h && (sec || !parts.length)) parts.push(unit(sec, 'second'));
    return parts.join(' ');
  }
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

/* + new — round to step / nearest step */
const roundTo        = (n, step = 1) => { const s = Number(step) || 1; return Math.round(Number(n) / s) * s; };
const roundToNearest = roundTo;

/* + new — format a numeric range ("10–20") */
function formatRange(a, b, fmt = (x) => String(x)) {
  if (a == null && b == null) return '';
  if (a == null) return fmt(b);
  if (b == null || a === b) return fmt(a);
  return `${fmt(a)}–${fmt(b)}`;
}

/* + new — decimal → fraction ("0.75" → "3/4") */
function fmtFraction(n, maxDen = 100) {
  const x = Number(n) || 0;
  let bestN = 0, bestD = 1, bestErr = Infinity;
  for (let d = 1; d <= maxDen; d++) {
    const num = Math.round(x * d);
    const err = Math.abs(x - num / d);
    if (err < bestErr) { bestErr = err; bestN = num; bestD = d; if (err < 1e-6) break; }
  }
  return `${bestN}/${bestD}`;
}

/* + new — decimal → words (receipts, accessibility) */
function numberToWords(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return 'zero';
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
                'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const chunks = [];
  let x = num;
  const units = ['', ' thousand', ' million', ' billion', ' trillion'];
  let u = 0;
  while (x > 0) {
    const c = x % 1000;
    if (c) {
      const cparts = [];
      const h = Math.floor(c / 100);
      const r = c % 100;
      if (h) cparts.push(ones[h] + ' hundred');
      if (r) {
        if (r < 20) cparts.push(ones[r]);
        else cparts.push(tens[Math.floor(r / 10)] + (r % 10 ? '-' + ones[r % 10] : ''));
      }
      chunks.unshift(cparts.join(' ') + units[u]);
    }
    x = Math.floor(x / 1000);
    u++;
  }
  return (Number(n) < 0 ? 'negative ' : '') + chunks.join(' ');
}

/* + new — roman numerals */
function toRoman(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (!v) return '';
  const table = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let out = '', x = v;
  for (const [k, r] of table) while (x >= k) { out += r; x -= k; }
  return out;
}
function fromRoman(s) {
  const map = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let total = 0;
  const str = String(s || '').toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const cur = map[str[i]] || 0;
    const next = map[str[i + 1]] || 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

/* + new — tax helpers */
function applyTax(amount, rate, { inclusive = false } = {}) {
  const a = Number(amount) || 0;
  const r = Number(rate) || 0;
  if (inclusive) {
    const net = a / (1 + r);
    return { net: +net.toFixed(2), tax: +(a - net).toFixed(2), gross: +a.toFixed(2) };
  }
  const tax = a * r;
  return { net: +a.toFixed(2), tax: +tax.toFixed(2), gross: +(a + tax).toFixed(2) };
}

/* + new — clamp money (never negative, 2dp) */
const clampMoney = (n) => Math.max(0, +(Number(n) || 0).toFixed(2));

/* + new — price breakdown for checkout */
function formatPriceBreakdown(items = [], { taxRate = 0, platformFee = 0, currency = CONFIG.CURRENCY } = {}) {
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
  const { tax, gross } = applyTax(subtotal, taxRate);
  const total = gross + platformFee;
  return {
    subtotal: clampMoney(subtotal),
    tax: clampMoney(tax),
    platformFee: clampMoney(platformFee),
    total: clampMoney(total),
    items: items.map((i) => ({ ...i, lineTotal: clampMoney((Number(i.price) || 0) * (Number(i.qty) || 1)) })),
    currency,
  };
}

/* + new — parse currency string back to a number */
function parseCurrency(str, cur = CONFIG.CURRENCY, locale = APP.LOCALE) {
  const s = String(str ?? '').trim();
  if (!s) return NaN;
  const meta = (CONFIG.CURRENCIES && CONFIG.CURRENCIES[cur]) || null;
  const sym = meta?.symbol || CONFIG.CURRENCY_SYMBOL || '$';
  const digits = s
    .replace(new RegExp(escapeRegex(sym), 'g'), '')
    .replace(/[^\d.,\-]/g, '');
  // Heuristic: if both . and , appear, the last one is the decimal sep
  const lastDot = digits.lastIndexOf('.');
  const lastComma = digits.lastIndexOf(',');
  let norm = digits;
  if (lastDot > -1 && lastComma > -1) {
    if (lastDot > lastComma) norm = digits.replace(/,/g, '');
    else norm = digits.replace(/\./g, '').replace(',', '.');
  } else if (lastComma > -1 && digits.split(',').pop().length <= 2) {
    norm = digits.replace(',', '.');
  } else {
    norm = digits.replace(/,/g, '');
  }
  const n = Number(norm);
  return isFinite(n) ? n : NaN;
}

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

/** Relative time: "just now", "3m ago", "2d ago", "Jan 5". (+ new: short option) */
function timeAgo(d, { short = false } = {}) {
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
  if (short) return future ? `in ${label}` : `${label} ago`;
  const unitMap = { m: 'minute', h: 'hour', d: 'day', w: 'week', mo: 'month', y: 'year' };
  const num = parseInt(label, 10);
  const unit = label.replace(/\d+/g, '');
  const word = unitMap[unit] || unit;
  const words = `${num} ${pluralize(num, word)}`;
  return future ? `in ${words}` : `${words} ago`;
}

/* + new — live-updating timeAgo helper */
function timeAgoLive(node, date, intervalMs = 30000) {
  if (!node) return () => {};
  const tick = () => { node.textContent = timeAgo(date); };
  tick();
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}

/* + new — human relative date ("Yesterday", "Last Tuesday") */
function humanDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  const todayStart = startOfDay(new Date());
  const dayStart = startOfDay(x);
  const diff = Math.round((todayStart - dayStart) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return `Last ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][x.getDay()]}`;
  if (diff < -1 && diff > -7) return `Next ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][x.getDay()]}`;
  return fmtDate(x);
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

/* + new — safe month/year arithmetic (avoids JS overflow on the 31st) */
function addMonths(d, n) {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + Number(n));
  const dim = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, dim));
  return x;
}
const addYears = (d, n) => addMonths(d, Number(n) * 12);

/* + new — leap year, days in month, week number, quarter */
const isLeapYear   = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysInMonth  = (y, m) => new Date(y, m + 1, 0).getDate();
function weekNumber(d, { iso = true } = {}) {
  const x = startOfDay(d);
  if (iso) {
    const target = new Date(x.valueOf());
    const dayNr = (x.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const fDayNr = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - fDayNr + 3);
    return 1 + Math.round((target - firstThursday) / (7 * 86400000));
  }
  const start = startOfDay(new Date(x.getFullYear(), 0, 1));
  return Math.ceil((((x - start) / 86400000) + start.getDay() + 1) / 7);
}
const quarterOf = (d) => Math.floor(new Date(d).getMonth() / 3) + 1;

/* + new — business-day helpers (holidays as ISO strings or Dates) */
function isBusinessDay(d, holidays = []) {
  const x = new Date(d);
  if ([0, 6].includes(x.getDay())) return false;
  const key = isoDate(x);
  const set = holidays instanceof Set ? holidays : new Set(holidays.map((h) => isoDate(h)));
  return !set.has(key);
}
function addBusinessDays(d, n, holidays = []) {
  let x = new Date(d);
  let remaining = Math.abs(Number(n) || 0);
  const dir = (Number(n) || 0) < 0 ? -1 : 1;
  while (remaining > 0) {
    x = addDays(x, dir);
    if (isBusinessDay(x, holidays)) remaining--;
  }
  return x;
}
function businessDaysBetween(a, b, holidays = []) {
  let cur = startOfDay(a);
  const end = startOfDay(b);
  let count = 0;
  const dir = cur <= end ? 1 : -1;
  while ((dir > 0 && cur < end) || (dir < 0 && cur > end)) {
    cur = addDays(cur, dir);
    if (isBusinessDay(cur, holidays)) count += dir;
  }
  return count;
}

/** Human "5 min" for duration ms. */
function fmtMinutes(ms) {
  const min = Math.round((Number(ms) || 0) / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/* + new — duration between two dates in human form */
const durationBetween = (a, b) => fmtMinutes(Math.abs(new Date(b) - new Date(a)));

/* + new — overlap check for two intervals */
function overlap(aStart, aEnd, bStart, bEnd) {
  const aS = new Date(aStart).getTime();
  const aE = new Date(aEnd).getTime();
  const bS = new Date(bStart).getTime();
  const bE = new Date(bEnd).getTime();
  return aS < bE && bS < aE;
}

/* + new — isWithin */
const isWithin = (d, start, end) => {
  const t = new Date(d).getTime();
  return t >= new Date(start).getTime() && t <= new Date(end).getTime();
};

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

/* + new — format a date range ("Jan 5 – Jan 9, 2026") */
function formatDateRange(a, b, opts = {}) {
  if (!a && !b) return '—';
  if (!b || isSameDay(a, b)) return fmtDate(a, opts);
  const xa = new Date(a), xb = new Date(b);
  const sameYear = xa.getFullYear() === xb.getFullYear();
  try {
    if (sameYear) {
      const left = xa.toLocaleDateString(APP.LOCALE, { month: 'short', day: 'numeric' });
      const right = xb.toLocaleDateString(APP.LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
      return `${left} – ${right}`;
    }
    return `${fmtDate(xa, opts)} – ${fmtDate(xb, opts)}`;
  } catch { return `${fmtDate(xa)} – ${fmtDate(xb)}`; }
}

/* + new — calendar grid for a month (array of weeks) */
function calendarGrid(month = new Date(), { weekStart = 1 } = {}) {
  const first = startOfMonth(month);
  const last  = endOfMonth(month);
  const gridStart = startOfWeek(first, weekStart);
  const gridEnd   = endOfWeek(last, weekStart);
  const weeks = [];
  let cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/* + new — bucket dates into Today / Yesterday / This week / Earlier */
function dateBuckets(arr = [], keyFn = (x) => x, { weekStart = 1 } = {}) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yStart = addDays(todayStart, -1);
  const weekStartD = startOfWeek(now, weekStart);
  const buckets = { today: [], yesterday: [], thisWeek: [], earlier: [], future: [] };
  for (const item of arr) {
    const d = new Date(keyFn(item));
    if (isNaN(d.getTime())) continue;
    if (d > todayStart) buckets.future.push(item);
    else if (isSameDay(d, todayStart)) buckets.today.push(item);
    else if (isSameDay(d, yStart)) buckets.yesterday.push(item);
    else if (d >= weekStartD) buckets.thisWeek.push(item);
    else buckets.earlier.push(item);
  }
  return buckets;
}

/* + new — timezone helpers */
function timezoneOffsetLabel(tz, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, timeZoneName: 'shortOffset',
    }).formatToParts(at);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : tz;
  } catch { return tz; }
}

function listTimezones() {
  try {
    if (Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone');
  } catch {}
  return ['UTC'];
}

/* + new — ISO 8601 clock format for media ("01:23:45") */
function fmtClock(totalSeconds, { hours = 'auto' } = {}) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const showH = hours === 'always' || (hours === 'auto' && h > 0);
  return (showH ? `${pad(h)}:` : '') + `${pad(m)}:${pad(sec)}`;
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
const unique = (arr) => Array.from(new Set(arr ?? []));

/** Array: unique by key fn or property. */
function uniqueBy(arr, key) {
  const seen = new Set();
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  return (arr ?? []).filter((x) => { const k = fn(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Group by key or fn. (fixed: __proto__ hazard) */
function groupBy(arr, key) {
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  const acc = Object.create(null);
  for (const item of arr ?? []) {
    const k = String(fn(item));
    (acc[k] = acc[k] || []).push(item);
  }
  return acc;
}

/* + new — groupBy returning a Map (safer for non-string keys) */
function groupToMap(arr, key) {
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  const m = new Map();
  for (const item of arr ?? []) {
    const k = fn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

/* + new — keyBy / indexBy */
function keyBy(arr, key) {
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  const out = Object.create(null);
  for (const item of arr ?? []) out[String(fn(item))] = item;
  return out;
}
const indexBy = keyBy;

/* + new — countBy */
function countBy(arr, key) {
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  const out = Object.create(null);
  for (const item of arr ?? []) {
    const k = String(fn(item));
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

/** Sort by one or more keys. (fixed: nulls no longer flip with direction) */
function sortBy(arr, key, dir = 'asc', { nullsLast = true } = {}) {
  const copy = [...(arr ?? [])];
  const keys = Array.isArray(key) ? key : [key];
  copy.sort((a, b) => {
    for (const k of keys) {
      let field = k, sign = 1;
      if (typeof k === 'string' && k.startsWith('-')) { field = k.slice(1); sign = -1; }
      const av = typeof field === 'function' ? field(a) : a?.[field];
      const bv = typeof field === 'function' ? field(b) : b?.[field];
      if (av == null && bv == null) continue;
      if (av == null) return nullsLast ? 1 : -1;
      if (bv == null) return nullsLast ? -1 : 1;
      if (typeof av === 'string' && typeof bv === 'string') {
        const cmp = naturalCompare(av, bv);
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

/** Chunk. (fixed: size <= 0 infinite loop) */
const chunk = (arr, size) => {
  const s = Math.max(1, Math.floor(Number(size) || 1));
  const out = [];
  for (let i = 0; i < (arr?.length ?? 0); i += s) out.push(arr.slice(i, i + s));
  return out;
};

const flatten   = (arr, depth = 1) => (arr ?? []).flat(depth);
const flattenDeep = (arr) => (arr ?? []).flat(Infinity);

const range = (start, end, step = 1, { inclusive = false } = {}) => {
  if (end === undefined) { end = start; start = 0; }
  const out = [];
  const s = Number(step) || 1;
  if (s > 0) for (let i = start; inclusive ? i <= end : i < end; i += s) out.push(i);
  else for (let i = start; inclusive ? i >= end : i > end; i += s) out.push(i);
  return out;
};

const shuffle   = (arr) => { const a = [...(arr ?? [])]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const intersect = (a, b) => unique((a ?? []).filter((x) => (b ?? []).includes(x)));
const difference= (a, b) => (a ?? []).filter((x) => !(b ?? []).includes(x));
const union     = (...arrs) => unique(arrs.flat());
const compact   = (arr) => (arr ?? []).filter(Boolean);

const sum = (arr) => (arr ?? []).reduce((a, b) => a + (Number(b) || 0), 0);
const avg = (arr) => (arr?.length ? sum(arr) / arr.length : 0);
const min = (arr) => (arr?.length ? Math.min(...arr.map(Number).filter(isFinite)) : undefined);
const max = (arr) => (arr?.length ? Math.max(...arr.map(Number).filter(isFinite)) : undefined);

/* + new — sumBy / avgBy / minBy / maxBy */
function sumBy(arr, key) {
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  return (arr ?? []).reduce((s, x) => s + (Number(fn(x)) || 0), 0);
}
function avgBy(arr, key) {
  const list = arr ?? [];
  return list.length ? sumBy(list, key) / list.length : 0;
}
function minBy(arr, key) {
  const list = arr ?? [];
  if (!list.length) return undefined;
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  return list.reduce((best, x) => (Number(fn(x)) < Number(fn(best)) ? x : best));
}
function maxBy(arr, key) {
  const list = arr ?? [];
  if (!list.length) return undefined;
  const fn = typeof key === 'function' ? key : (x) => x?.[key];
  return list.reduce((best, x) => (Number(fn(x)) > Number(fn(best)) ? x : best));
}

/* + new — pluck / without / move / insertAt / removeAt */
const pluck = (arr, key) => (arr ?? []).map((x) => (typeof key === 'function' ? key(x) : x?.[key]));
const without = (arr, ...vals) => (arr ?? []).filter((x) => !vals.includes(x));
function move(arr, from, to) {
  const copy = [...(arr ?? [])];
  if (from < 0 || from >= copy.length) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(Math.max(0, Math.min(copy.length, to)), 0, item);
  return copy;
}
const insertAt = (arr, i, v) => { const c = [...(arr ?? [])]; c.splice(i, 0, v); return c; };
const removeAt = (arr, i) => { const c = [...(arr ?? [])]; c.splice(i, 1); return c; };

/* + new — take / drop / takeWhile / dropWhile */
const take     = (arr, n) => (arr ?? []).slice(0, Math.max(0, n));
const drop     = (arr, n) => (arr ?? []).slice(Math.max(0, n));
const takeWhile = (arr, fn) => { const out = []; for (const x of arr ?? []) { if (!fn(x)) break; out.push(x); } return out; };
const dropWhile = (arr, fn) => { const a = arr ?? []; let i = 0; while (i < a.length && fn(a[i])) i++; return a.slice(i); };

/* + new — findLast / findLastIndex */
const findLast      = (arr, fn) => { const a = arr ?? []; for (let i = a.length - 1; i >= 0; i--) if (fn(a[i], i)) return a[i]; return undefined; };
const findLastIndex = (arr, fn) => { const a = arr ?? []; for (let i = a.length - 1; i >= 0; i--) if (fn(a[i], i)) return i; return -1; };

/* + new — zip / unzip */
const zip   = (...arrs) => {
  const len = Math.min(...arrs.map((a) => a?.length ?? 0));
  return Array.from({ length: len }, (_, i) => arrs.map((a) => a[i]));
};
const unzip = (arr) => (arr ?? []).reduce((acc, row) => {
  row.forEach((v, i) => { (acc[i] = acc[i] || []).push(v); });
  return acc;
}, []);

/* + new — toggle array membership */
const toggleIn = (arr, val) => (arr ?? []).includes(val) ? arr.filter((x) => x !== val) : [...(arr ?? []), val];

/* + new — sampleSize / weightedSample */
const sampleSize = (arr, n) => shuffle(arr).slice(0, Math.max(0, Math.min(n, (arr ?? []).length)));
function weightedSample(items, weightFn = (x) => x.weight ?? 1) {
  const list = items ?? [];
  if (!list.length) return undefined;
  const total = list.reduce((s, x) => s + Math.max(0, Number(weightFn(x)) || 0), 0);
  if (total <= 0) return list[Math.floor(Math.random() * list.length)];
  let r = Math.random() * total;
  for (const item of list) {
    r -= Math.max(0, Number(weightFn(item)) || 0);
    if (r <= 0) return item;
  }
  return list[list.length - 1];
}

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

/* + new — partitionBy */
function partitionBy(arr, keyFn) {
  const groups = new Map();
  for (const x of arr ?? []) {
    const k = keyFn(x);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  return groups;
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

/* + new — deepGet path exists */
const pathExists = (obj, path) => {
  try {
    const parts = Array.isArray(path) ? path : String(path).split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null || !(p in Object(cur))) return false;
      cur = cur[p];
    }
    return true;
  } catch { return false; }
};
const deepHas = pathExists;

/* + new — deepPick / deepOmit (path-based) */
function deepPick(obj, paths) {
  const out = {};
  for (const p of paths) {
    const parts = Array.isArray(p) ? p : String(p).split('.');
    let src = obj, dst = out, ok = true;
    for (let i = 0; i < parts.length - 1; i++) {
      if (src == null || !(parts[i] in src)) { ok = false; break; }
      src = src[parts[i]];
      if (!isObject(dst[parts[i]])) dst[parts[i]] = {};
      dst = dst[parts[i]];
    }
    if (ok && src != null && parts.length) dst[parts[parts.length - 1]] = src[parts[parts.length - 1]];
  }
  return out;
}
function deepOmit(obj, paths) {
  const clone = deepClone(obj);
  for (const p of paths) {
    const parts = Array.isArray(p) ? p : String(p).split('.');
    let cur = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur == null) break;
      cur = cur[parts[i]];
    }
    if (cur && parts.length) delete cur[parts[parts.length - 1]];
  }
  return clone;
}

/* + new — flattenObject / unflattenObject */
function flattenObject(obj, { delimiter = '.' } = {}) {
  const out = {};
  const walk = (node, prefix) => {
    if (isPlainObject(node)) {
      const keys = Object.keys(node);
      if (!keys.length) { out[prefix] = {}; return; }
      for (const k of keys) {
        const p = prefix ? `${prefix}${delimiter}${k}` : k;
        walk(node[k], p);
      }
    } else {
      out[prefix] = node;
    }
  };
  walk(obj, '');
  return out;
}
function unflattenObject(obj, { delimiter = '.' } = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const parts = k.split(delimiter);
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!isObject(cur[p])) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = v;
  }
  return out;
}

/** Deep clone (structured, handles Date/Map/Set). */
function deepClone(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  if (obj instanceof Map) return new Map([...obj].map(([k, v]) => [k, deepClone(v)]));
  if (obj instanceof Set) return new Set([...obj].map(deepClone));
  if (Array.isArray(obj)) return obj.map(deepClone);
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepClone(v)]));
}

/** Deep merge (arrays replaced by default). (fixed: explicit mergeArrays option) */
function deepMerge(target, ...sources) {
  const opts = sources.length && isPlainObject(sources[sources.length - 1]) && '__mergeArrays' in sources[sources.length - 1]
    ? sources.pop()
    : { __mergeArrays: false };
  const out = isObject(target) ? { ...target } : {};
  for (const src of sources) {
    if (!isObject(src)) continue;
    for (const [k, v] of Object.entries(src)) {
      if (isObject(v) && isObject(out[k])) out[k] = deepMerge(out[k], v, opts);
      else if (opts.__mergeArrays && Array.isArray(v) && Array.isArray(out[k])) out[k] = [...out[k], ...deepClone(v)];
      else out[k] = deepClone(v);
    }
  }
  return out;
}

/* + new — array-aware merge by key */
function mergeBy(arrA, arrB, keyFn = (x) => x.id) {
  const map = new Map();
  for (const item of arrA ?? []) map.set(keyFn(item), item);
  for (const item of arrB ?? []) {
    const k = keyFn(item);
    map.set(k, map.has(k) ? { ...map.get(k), ...item } : item);
  }
  return Array.from(map.values());
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

/* + new — deepUnset */
function deepUnset(obj, path) {
  const parts = Array.isArray(path) ? path : String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null) return obj;
    cur = cur[parts[i]];
  }
  if (cur && parts.length) delete cur[parts[parts.length - 1]];
  return obj;
}

/* + new — stableStringify (key-order-independent — the correct memo key) */
function stableStringify(value, space = 0) {
  const seen = new WeakSet();
  const walk = (v) => {
    if (v && typeof v === 'object') {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
      if (v instanceof Date) return v.toISOString();
      if (v instanceof RegExp) return `[RegExp:${v.source}/${v.flags}]`;
      if (Array.isArray(v)) return v.map(walk);
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = walk(v[k]);
      return out;
    }
    if (typeof v === 'bigint') return v.toString();
    if (typeof v === 'function') return `[Fn:${v.name || 'anonymous'}]`;
    return v;
  };
  return JSON.stringify(walk(value), null, space);
}

/* + new — deepEqual */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (a instanceof Date)   return b instanceof Date && a.getTime() === b.getTime();
  if (a instanceof RegExp) return b instanceof RegExp && a.source === b.source && a.flags === b.flags;

  if (a instanceof Map) {
    if (!(b instanceof Map) || a.size !== b.size) return false;
    for (const [k, v] of a) { if (!b.has(k) || !deepEqual(v, b.get(k))) return false; }
    return true;
  }
  if (a instanceof Set) {
    if (!(b instanceof Set) || a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }

  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

/* + new — shallowEqual */
const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
};

/* + new — diffObjects */
function diffObjects(before, after) {
  const changed = {}, added = {}, removed = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const k of keys) {
    const inB = before && Object.prototype.hasOwnProperty.call(before, k);
    const inA = after  && Object.prototype.hasOwnProperty.call(after, k);
    if (!inB) added[k] = after[k];
    else if (!inA) removed.push(k);
    else if (!deepEqual(before[k], after[k])) changed[k] = [before[k], after[k]];
  }
  return { changed, added, removed };
}

/* + new — deepFreeze (protects CONFIG) */
function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
}

/* + new — comparator with nested path support */
const comparator = (field, dir = 'asc') => (a, b) => {
  const sign = dir === 'desc' ? -1 : 1;
  const av = typeof field === 'function' ? field(a) : deepGet(a, field);
  const bv = typeof field === 'function' ? field(b) : deepGet(b, field);
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  if (typeof av === 'string' && typeof bv === 'string') return naturalCompare(av, bv) * sign;
  return (av < bv ? -1 : av > bv ? 1 : 0) * sign;
};

/* + new — set to array */
const setToArray = (s) => Array.from(s ?? []);

/* ============================================================
   SECTION 6 — FUNCTION UTILITIES
   ============================================================ */

/** Debounce (with .cancel() and .flush()). (+ new: maxWait) */
function debounce(fn, ms = 350, { leading = false, maxWait = 0 } = {}) {
  let t = null, lastArgs = null, lastCall = 0, firstCall = 0;
  const invoke = () => {
    t = null;
    firstCall = 0;
    lastCall = Date.now();
    fn(...(lastArgs || []));
    lastArgs = null;
  };
  const wrapped = (...args) => {
    lastArgs = args;
    const now = Date.now();
    if (!firstCall) firstCall = now;
    if (leading && now - lastCall > ms) {
      lastCall = now;
      firstCall = 0;
      fn(...args);
      return;
    }
    clearTimeout(t);
    if (maxWait && now - firstCall >= maxWait) {
      invoke();
      return;
    }
    t = setTimeout(invoke, ms);
  };
  wrapped.cancel = () => { clearTimeout(t); t = null; lastArgs = null; firstCall = 0; };
  wrapped.flush  = () => { if (t) { clearTimeout(t); invoke(); } };
  Object.defineProperty(wrapped, 'pending', { get: () => t !== null });
  return wrapped;
}

/** Throttle. (+ new: leading/trailing options) */
function throttle(fn, ms = 200, { leading = true, trailing = true } = {}) {
  let last = 0, t = null, lastArgs = null;
  const invoke = () => {
    t = null;
    last = Date.now();
    fn(...lastArgs);
    lastArgs = null;
  };
  return (...args) => {
    const now = Date.now();
    lastArgs = args;
    if (!last && !leading) last = now;
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      clearTimeout(t); t = null;
      last = now;
      fn(...args);
    } else if (trailing && !t) {
      t = setTimeout(invoke, remaining);
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

/* + new — before / after */
function before(n, fn) {
  let count = 0, result;
  return (...args) => {
    count++;
    if (count < n) result = fn(...args);
    return result;
  };
}
function after(n, fn) {
  let count = 0;
  return (...args) => {
    count++;
    if (count >= n) return fn(...args);
  };
}

/** Memoise. (+ new: TTL + LRU + correct stable key) */
function memoize(fn, { keyFn = (args) => stableStringify(args), ttl = 0, maxSize = 200 } = {}) {
  const cache = new Map();
  return (...args) => {
    const k = keyFn(args);
    const hit = cache.get(k);
    if (hit && (!ttl || hit.exp > Date.now())) return hit.v;
    const v = fn(...args);
    if (cache.size >= maxSize) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
    cache.set(k, { v, exp: ttl ? Date.now() + ttl : 0 });
    return v;
  };
}

/* + new — memoizeAsync (dedupes in-flight promises) */
function memoizeAsync(fn, { keyFn = (args) => stableStringify(args), ttl = 0 } = {}) {
  const cache = new Map();
  return async (...args) => {
    const k = keyFn(args);
    const hit = cache.get(k);
    if (hit && (!ttl || hit.exp > Date.now())) return hit.p;
    const p = Promise.resolve().then(() => fn(...args));
    cache.set(k, { p, exp: ttl ? Date.now() + ttl : 0 });
    try { return await p; }
    catch (err) { cache.delete(k); throw err; }
  };
}

const noop     = () => {};
const identity = (x) => x;
const constant = (v) => () => v;
const negate   = (fn) => (...a) => !fn(...a);
const tap      = (fn) => (x) => { fn(x); return x; };
const times    = (n, fn) => Array.from({ length: Math.max(0, n) }, (_, i) => fn(i));

const pipe    = (...fns) => (input) => fns.reduce((acc, fn) => fn(acc), input);
const compose = (...fns) => (input) => fns.reduceRight((acc, fn) => fn(acc), input);

/* + new — async pipe/compose */
const pipeAsync    = (...fns) => async (input) => { let acc = input; for (const fn of fns) acc = await fn(acc); return acc; };
const composeAsync = (...fns) => async (input) => { let acc = input; for (let i = fns.length - 1; i >= 0; i--) acc = await fns[i](acc); return acc; };

/* + new — curry / partial */
function curry(fn, arity = fn.length) {
  return function curried(...args) {
    if (args.length >= arity) return fn.apply(this, args);
    return (...more) => curried.apply(this, [...args, ...more]);
  };
}
const partial      = (fn, ...pre) => (...post) => fn(...pre, ...post);
const partialRight = (fn, ...suf) => (...pre) => fn(...pre, ...suf);

/* + new — safeCall / tryCatch */
const safeCall = (fn, fallback = undefined) => {
  try { return fn(); } catch { return fallback; }
};
const tryCatch = async (fn) => {
  try { return [null, await fn()]; }
  catch (err) { return [err, null]; }
};

/* + new — promisify a Node-style callback fn */
const promisify = (fn) => (...args) => new Promise((resolve, reject) => {
  fn(...args, (err, result) => (err ? reject(err) : resolve(result)));
});

/* + new — defer / nextTick */
const defer     = (fn, ms = 0) => setTimeout(fn, ms);
const nextTick  = (fn) => Promise.resolve().then(fn);

/* + new — lazy invoke-and-cache */
function lazy(fn) {
  let called = false, value;
  return (...args) => {
    if (!called) { called = true; value = fn(...args); }
    return value;
  };
}

/* + new — serial queue */
function queue(fn) {
  let chain = Promise.resolve();
  return (...args) => {
    const run = chain.then(() => fn(...args));
    chain = run.catch(() => {});
    return run;
  };
}

/* + new — concurrency limiter */
function createLimiter(concurrency = 5) {
  let active = 0;
  const pending = [];
  const next = () => {
    if (active >= concurrency || !pending.length) return;
    active++;
    const { fn, args, resolve, reject } = pending.shift();
    Promise.resolve()
      .then(() => fn(...args))
      .then(resolve, reject)
      .finally(() => { active--; next(); });
  };
  return (fn, ...args) => new Promise((resolve, reject) => {
    pending.push({ fn, args, resolve, reject });
    next();
  });
}

/* + new — rate limit (calls per window) */
function rateLimit(fn, perWindow = 10, windowMs = 1000) {
  const calls = [];
  return async (...args) => {
    const now = Date.now();
    while (calls.length && calls[0] <= now - windowMs) calls.shift();
    if (calls.length >= perWindow) {
      await sleep(calls[0] + windowMs - now);
      return rateLimit(fn, perWindow, windowMs)(...args);
    }
    calls.push(now);
    return fn(...args);
  };
}

/* ============================================================
   SECTION 7 — PROMISES / ASYNC
   ============================================================ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* + new — isThenable / isPromise */
const isThenable = (x) => x != null && (typeof x === 'object' || typeof x === 'function') && typeof x.then === 'function';
const isPromise  = (x) => x instanceof Promise || isThenable(x);

/* + new — deferred */
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/* + new — createAbort (AbortController + cleanup) */
function createAbort() {
  const ctrl = new AbortController();
  return { signal: ctrl.signal, abort: (reason) => ctrl.abort(reason) };
}

/* + new — createCancellation (token-based) */
function createCancellation() {
  let cancelled = false;
  const callbacks = [];
  return {
    get isCancelled() { return cancelled; },
    cancel() {
      if (cancelled) return;
      cancelled = true;
      callbacks.forEach((cb) => { try { cb(); } catch {} });
      callbacks.length = 0;
    },
    onCancel(cb) { if (cancelled) cb(); else callbacks.push(cb); return () => {
      const i = callbacks.indexOf(cb); if (i > -1) callbacks.splice(i, 1);
    }; },
    throwIfCancelled() { if (cancelled) throw new Error('cancelled'); },
  };
}

/** Retry an async fn with exponential backoff. (+ new: jitter + onRetry + signal) */
async function retry(fn, { attempts = 3, backoffMs = 500, shouldRetry = () => true, signal, onRetry } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    if (signal?.aborted) throw new Error('aborted');
    try { return await fn(i); }
    catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !shouldRetry(err, i)) throw err;
      const delay = backoffMs * Math.pow(2, i) * (0.5 + Math.random() * 0.5);
      if (onRetry) onRetry(err, i, delay);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/* + new — retryJittered (named entry point matching the plan) */
const retryJittered = (fn, opts) => retry(fn, opts);

/** Promise timeout guard. (+ new: signal-aware + AbortError) */
function withTimeout(promise, ms, message = 'Operation timed out', { signal } = {}) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const err = new Error(message);
      err.name = 'TimeoutError';
      reject(err);
    }, ms);
    if (signal) {
      if (signal.aborted) { clearTimeout(t); return reject(new Error('aborted')); }
      signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, { once: true });
    }
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** Run promises in batches of `size`. (kept for compatibility — prefer pool) */
async function runBatched(items, fn, size = 5) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

/* + new — pool (real concurrency limit, slow items don't block slots) */
async function pool(items, fn, concurrency = 5) {
  const list = items ?? [];
  if (!list.length) return [];
  const results = new Array(list.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), list.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= list.length) return;
      results[i] = await fn(list[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/* + new — sequential / series */
async function sequential(items, fn) {
  const out = [];
  let i = 0;
  for (const item of items ?? []) out.push(await fn(item, i++));
  return out;
}
const series = sequential;

/* + new — allSettledMap */
async function allSettledMap(items, fn) {
  const settled = await Promise.allSettled((items ?? []).map(fn));
  const fulfilled = [], rejected = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') fulfilled.push({ index: i, value: r.value });
    else rejected.push({ index: i, reason: r.reason });
  });
  return { fulfilled, rejected };
}

/* + new — pollUntil */
async function pollUntil(fn, { interval = 1000, timeout = 30000, signal, onTick } = {}) {
  const started = Date.now();
  let attempt = 0;
  while (true) {
    if (signal?.aborted) throw new Error('pollUntil aborted');
    attempt++;
    const value = await fn(attempt);
    if (value) return value;
    if (typeof onTick === 'function') onTick(attempt, Date.now() - started);
    if (Date.now() - started + interval > timeout) throw new Error('pollUntil timed out');
    await sleep(interval);
  }
}

/* + new — waitForCondition (poll a sync/async predicate) */
const waitForCondition = (predicate, opts = {}) =>
  pollUntil(async () => (await predicate()) || null, opts);

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

/* + new — debounceAsync */
function debounceAsync(fn, ms = 300) {
  let t = null;
  return (...args) => new Promise((resolve, reject) => {
    clearTimeout(t);
    t = setTimeout(() => { Promise.resolve().then(() => fn(...args)).then(resolve, reject); }, ms);
  });
}

/* + new — backoffGenerator */
function* backoffGenerator({ base = 400, max = 30000, jitter = 0.3 } = {}) {
  let i = 0;
  while (true) {
    const raw = Math.min(max, base * 2 ** i);
    yield raw * (1 - jitter + Math.random() * jitter * 2);
    i++;
  }
}

/* ============================================================
   SECTION 8 — VALIDATION
   ============================================================ */

const isEmail    = (s) => CONFIG.EMAIL_REGEX.test(String(s || '').trim());
const isPhone    = (s) => CONFIG.PHONE_REGEX.test(String(s || '').trim());
const isUrl      = (s) => CONFIG.URL_REGEX.test(String(s || '').trim());
const isUuid     = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ''));
const isHex      = (s) => /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(s || ''));
const isHexColor = isHex;
const isNumeric  = (s) => s !== '' && s !== null && !isNaN(Number(s));
const isInt      = (s) => Number.isInteger(Number(s));
const isPositive = (s) => isNumeric(s) && Number(s) > 0;
const isStrongPassword = (s) => CONFIG.PASSWORD_REGEX.test(String(s || ''));
const isSafePath = (s) => {
  const str = String(s || '');
  if (str.includes('\0')) return false;
  if (str.includes('..') || str.includes('//')) return false;
  if (str.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(str)) return false;
  if (/%(2e|2f|5c)/i.test(str)) return false; // encoded . / \
  return true;
};

/* + new — character class validators */
const isAlpha         = (s) => /^[a-zA-Z]+$/.test(String(s || ''));
const isAlphanumeric  = (s) => /^[a-zA-Z0-9]+$/.test(String(s || ''));
const isSlug          = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(s || ''));
const isBase64        = (s) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(String(s || ''));
const isJson          = (s) => { try { JSON.parse(String(s || '')); return true; } catch { return false; } };
const isIsoDate       = (s) => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(String(s || ''));
const isDateString    = (s) => !isNaN(new Date(String(s || '')).getTime());
const isTime          = (s) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(s || ''));
const isSemver        = (s) => /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(String(s || ''));

/* + new — Luhn credit card */
function isCreditCard(s) {
  const digits = String(s || '').replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/* + new — IP / domain */
const isIpv4 = (s) => /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/.test(String(s || ''));
const isIpv6 = (s) => /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/.test(String(s || ''));
const isIpAddress = (s) => isIpv4(s) || isIpv6(s);
const isDomain = (s) => /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.[A-Za-z]{2,}$/.test(String(s || ''));

/* + new — postal code (loose, country-keyed) */
const POSTAL_PATTERNS = {
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i,
  UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  AU: /^\d{4}$/,
  IN: /^\d{6}$/,
  JP: /^\d{3}-\d{4}$/,
};
const isPostalCode = (s, country = 'US') => {
  const re = POSTAL_PATTERNS[String(country).toUpperCase()];
  return re ? re.test(String(s || '').trim()) : /^[A-Za-z0-9 -]{3,10}$/.test(String(s || '').trim());
};

/* + new — file type checks */
const isImageFile = (file) => !!file && /^image\//.test(file.type || '');
const isPdf       = (file) => !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));
const isFileType  = (file, types = []) => !!file && types.some((t) =>
  t.endsWith('/*') ? (file.type || '').startsWith(t.slice(0, -1)) : file.type === t);

/* + new — normalisers */
const normalizeEmail = (s) => String(s || '').trim().toLowerCase();
const normalizePhone = (s) => String(s || '').replace(/[^\d+]/g, '');
function toE164(s, defaultCountry = '1') {
  const digits = normalizePhone(s).replace(/^\+/, '');
  if (!digits) return '';
  if (digits.length === 10) return `+${defaultCountry}${digits}`;
  return `+${digits}`;
}

/** Return first validation error message, or '' if valid. */
function validate(value, rules = []) {
  for (const rule of rules) {
    const { test, message } = typeof rule === 'function' ? { test: rule, message: 'Invalid' } : rule;
    if (!test(value)) return message;
  }
  return '';
}

/* + new — rule builders */
const rules = {
  required: (msg = 'Required') => ({ test: (v) => v != null && v !== '' && (!Array.isArray(v) || v.length > 0), message: msg }),
  minLen:   (n, msg) => ({ test: (v) => String(v ?? '').length >= n, message: msg || `Must be at least ${n} characters` }),
  maxLen:   (n, msg) => ({ test: (v) => String(v ?? '').length <= n, message: msg || `Must be at most ${n} characters` }),
  min:      (n, msg) => ({ test: (v) => Number(v) >= n, message: msg || `Must be at least ${n}` }),
  max:      (n, msg) => ({ test: (v) => Number(v) <= n, message: msg || `Must be at most ${n}` }),
  pattern:  (re, msg = 'Invalid format') => ({ test: (v) => re.test(String(v ?? '')), message: msg }),
  oneOf:    (list, msg) => ({ test: (v) => list.includes(v), message: msg || `Must be one of: ${list.join(', ')}` }),
  email:    (msg = 'Invalid email') => ({ test: isEmail, message: msg }),
  url:      (msg = 'Invalid URL') => ({ test: isUrl, message: msg }),
  phone:    (msg = 'Invalid phone number') => ({ test: isPhone, message: msg }),
  int:      (msg = 'Must be an integer') => ({ test: isInt, message: msg }),
  positive: (msg = 'Must be positive') => ({ test: isPositive, message: msg }),
  custom:   (fn, msg = 'Invalid') => ({ test: fn, message: msg }),
};

/* + new — validateSchema */
function validateSchema(obj, schema) {
  const errors = {};
  for (const [key, fieldRules] of Object.entries(schema || {})) {
    const msg = validate(obj?.[key], fieldRules);
    if (msg) errors[key] = msg;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/* + new — assertOrThrow */
function assertOrThrow(value, checkFn, message = 'Assertion failed') {
  const ok = typeof checkFn === 'function' ? checkFn(value) : !!value;
  if (!ok) throw new Error(message);
  return value;
}

/* + new — grouped validators namespace (tree-shakeable) */
const validators = {
  isEmail, isPhone, isUrl, isUuid, isHex, isHexColor, isNumeric, isInt, isPositive,
  isStrongPassword, isSafePath, isAlpha, isAlphanumeric, isSlug, isBase64, isJson,
  isIsoDate, isDateString, isTime, isSemver, isCreditCard,
  isIpv4, isIpv6, isIpAddress, isDomain, isPostalCode,
  isImageFile, isPdf, isFileType,
};
/* ============================================================
   SECTION 9 — COLOUR
   ============================================================ */

/* + new — shared hex parser (fixes the 4× duplication in original) */
function hexToRgb(hex) {
  const h = String(hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha)})`;
}

function rgbaToHex(rgba) {
  const m = String(rgba || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return '#000000';
  const toHex = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
}

function rgbToHex({ r, g, b }) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(Number(n) || 0))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function lighten(hex, amount = 0.15) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return rgbToHex({ r: mix(r), g: mix(g), b: mix(b) });
}

function darken(hex, amount = 0.15) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c * (1 - amount));
  return rgbToHex({ r: mix(r), g: mix(g), b: mix(b) });
}

/* + new — HSL conversions */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToRgb(h, s, l) {
  h = ((Number(h) % 360) + 360) % 360 / 360;
  s = Math.max(0, Math.min(100, Number(s))) / 100;
  l = Math.max(0, Math.min(100, Number(l))) / 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}
const hexToHsl = (hex) => { const { r, g, b } = hexToRgb(hex); return rgbToHsl(r, g, b); };
const hslToHex = (h, s, l) => { const { r, g, b } = hslToRgb(h, s, l); return rgbToHex({ r, g, b }); };

/* + new — parse any colour format */
function parseColor(input) {
  const s = String(input || '').trim();
  if (!s) return { r: 0, g: 0, b: 0, a: 1 };
  if (s.startsWith('#')) { const { r, g, b } = hexToRgb(s); return { r, g, b, a: 1 }; }
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(/[,/\s]+/).map(Number);
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts[3] ?? 1 };
  }
  const hm = s.match(/^hsla?\(([^)]+)\)$/i);
  if (hm) {
    const parts = hm[1].split(/[,/\s]+/).map(Number);
    const { r, g, b } = hslToRgb(parts[0], parts[1], parts[2]);
    return { r, g, b, a: parts[3] ?? 1 };
  }
  // CSS named colour fallback via browser
  try {
    const ctx = (parseColor._ctx || (parseColor._ctx = document.createElement('canvas').getContext('2d')));
    ctx.fillStyle = '#000';
    ctx.fillStyle = s;
    const computed = ctx.fillStyle;
    if (computed.startsWith('#')) { const { r, g, b } = hexToRgb(computed); return { r, g, b, a: 1 }; }
  } catch {}
  return { r: 0, g: 0, b: 0, a: 1 };
}

/* + new — colour mixing */
function mixColors(a, b, t = 0.5) {
  const ca = parseColor(a), cb = parseColor(b);
  const k = Math.max(0, Math.min(1, Number(t)));
  const r = Math.round(ca.r + (cb.r - ca.r) * k);
  const g = Math.round(ca.g + (cb.g - ca.g) * k);
  const bl = Math.round(ca.b + (cb.b - ca.b) * k);
  return rgbToHex({ r, g, b: bl });
}
function blendColors(colours = []) {
  if (!colours.length) return '#000000';
  const rgbs = colours.map(parseColor);
  const r = Math.round(rgbs.reduce((s, c) => s + c.r, 0) / rgbs.length);
  const g = Math.round(rgbs.reduce((s, c) => s + c.g, 0) / rgbs.length);
  const b = Math.round(rgbs.reduce((s, c) => s + c.b, 0) / rgbs.length);
  return rgbToHex({ r, g, b });
}

/* + new — saturation */
function saturate(hex, amount = 0.15) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, Math.min(100, s * (1 + amount)), l);
}
function desaturate(hex, amount = 0.15) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, Math.max(0, s * (1 - amount)), l);
}

/* + new — alpha helper (alias that reads naturally next to hexToRgba) */
const withAlpha = (hex, a) => hexToRgba(hex, a);

/* + new — luminance + contrast ratio (WCAG) */
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const chan = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}
function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
}
function meetsContrast(fg, bg, level = 'AA') {
  const r = contrastRatio(fg, bg);
  const threshold = level === 'AAA' ? 7 : level === 'AA-large' ? 3 : 4.5;
  return r >= threshold;
}

const isLight = (hex) => luminance(hex) > 0.5;
const isDark  = (hex) => !isLight(hex);

/** Best-contrast text colour for a given background. */
function contrastColor(hex) {
  return isLight(hex) ? '#111827' : '#ffffff';
}

/* + new — colour harmony */
function complementary(hex) { const { h, s, l } = hexToHsl(hex); return hslToHex((h + 180) % 360, s, l); }
function analogous(hex, count = 2, step = 30) {
  const { h, s, l } = hexToHsl(hex);
  const out = [];
  for (let i = -count; i <= count; i++) if (i) out.push(hslToHex((h + i * step + 360) % 360, s, l));
  return out;
}
function triadic(hex) {
  const { h, s, l } = hexToHsl(hex);
  return [hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)];
}

/* + new — palette generation for charts */
function paletteFrom(hex, n = 6) {
  const { h, s, l } = hexToHsl(hex);
  const out = [];
  for (let i = 0; i < n; i++) {
    const shift = (i * 360) / n;
    out.push(hslToHex((h + shift) % 360, Math.min(100, s * 0.9 + 10), Math.max(20, Math.min(80, l))));
  }
  return out;
}

const randomHex = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;

/* + new — deterministic colour from a string (avatars, tags) */
function hashColor(str) {
  const h = hashString(str) % 360;
  return hslToHex(h, 62, 52);
}

/* + new — normalise to a CSS-safe colour string */
function toCssColor(input) {
  const c = parseColor(input);
  return c.a < 1 ? `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})` : rgbToHex(c);
}

/** Read a CSS variable's value. */
const getCssVar = (name, fallback = '') =>
  (typeof getComputedStyle !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : '') || fallback;

/** Set a CSS variable on :root. */
const setCssVar = (name, value) => document.documentElement.style.setProperty(name, value);

/* + new — numeric css var read */
function getCssVarNum(name, fallback = 0) {
  const raw = getCssVar(name, '');
  const n = parseFloat(raw);
  return isFinite(n) ? n : fallback;
}

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

/* + new — bulk namespace clear */
function lsKeys(prefix = '') {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
  } catch {}
  return out;
}
function lsClear(prefix = '') {
  try { lsKeys(prefix).forEach((k) => localStorage.removeItem(k)); return true; }
  catch { return false; }
}

/* + new — storage availability probe (private mode / quota) */
function storageAvailable(kind = 'localStorage') {
  try {
    const s = window[kind];
    const probe = '__eh_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return true;
  } catch { return false; }
}

/* + new — approx storage size in bytes */
function storageSize(kind = 'localStorage') {
  try {
    const s = window[kind];
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      total += (k || '').length + (s.getItem(k) || '').length;
    }
    return total * 2; // UTF-16
  } catch { return 0; }
}

/* + new — TTL-aware localStorage helpers */
function lsSetWithTtl(key, value, ms) {
  return lsSet(key, { __v: value, __e: ms ? Date.now() + ms : 0 });
}
function lsGetWithTtl(key, fallback = null) {
  const wrapped = lsGet(key, null);
  if (!wrapped || typeof wrapped !== 'object' || !('__e' in wrapped)) return wrapped ?? fallback;
  if (wrapped.__e && wrapped.__e < Date.now()) { lsRemove(key); return fallback; }
  return wrapped.__v;
}

/* + new — cross-tab storage watcher */
function watchStorage(key, cb) {
  const handler = (e) => {
    if (e.key !== key) return;
    cb(safeJsonParse(e.newValue, e.newValue), safeJsonParse(e.oldValue, e.oldValue));
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/* + new — namespaced store factory with TTL + versioning */
function createStore(namespace, { storage = localStorage, ttl = 0, version = 1 } = {}) {
  const prefix = `${namespace}:`;
  const wrap = (value, exp) => JSON.stringify({ __v: version, __t: Date.now(), __e: exp || 0, d: value });
  const unwrap = (raw) => {
    if (raw == null) return { ok: false };
    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== 'object' || !('__v' in parsed)) return { ok: true, value: parsed };
    if (parsed.__e && parsed.__e < Date.now()) return { ok: false, expired: true };
    return { ok: true, value: parsed.d, version: parsed.__v };
  };
  return {
    get(key, fallback = null) {
      try {
        const { ok, value, expired } = unwrap(storage.getItem(prefix + key));
        if (expired) storage.removeItem(prefix + key);
        return ok ? value : fallback;
      } catch { return fallback; }
    },
    set(key, value, { ttl: localTtl } = {}) {
      try {
        const exp = (localTtl ?? ttl) ? Date.now() + (localTtl ?? ttl) : 0;
        storage.setItem(prefix + key, wrap(value, exp));
        return true;
      } catch { return false; }
    },
    remove(key) { try { storage.removeItem(prefix + key); return true; } catch { return false; } },
    clear() {
      try {
        const doomed = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(prefix)) doomed.push(k);
        }
        doomed.forEach((k) => storage.removeItem(k));
        return true;
      } catch { return false; }
    },
    keys() {
      const out = [];
      try {
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
        }
      } catch {}
      return out;
    },
    merge(key, patch) {
      const cur = this.get(key, {});
      const next = isObject(cur) ? { ...cur, ...patch } : patch;
      this.set(key, next);
      return next;
    },
  };
}

/* + new — cookie upgrades */
function cookieGet(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + escapeRegex(name) + '=([^;]*)'));
  if (!m) return null;
  const raw = decodeURIComponent(m[1]);
  // typed parse
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return safeJsonParse(raw, raw);
}
function cookieGetAll() {
  const out = {};
  String(document.cookie || '').split(/;\s*/).forEach((pair) => {
    const eq = pair.indexOf('=');
    if (eq < 0) return;
    const k = pair.slice(0, eq).trim();
    if (k) out[k] = cookieGet(k);
  });
  return out;
}
function cookieSet(name, value, days = 7, path = '/', { sameSite = 'Lax', secure } = {}) {
  const expires = days ? `; expires=${new Date(Date.now() + days * 864e5).toUTCString()}` : '';
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  const s = sameSite ? `; SameSite=${sameSite}` : '';
  const sec = (secure ?? (sameSite === 'None')) && isHttps ? '; Secure' : '';
  const encoded = typeof value === 'string' ? value : JSON.stringify(value);
  document.cookie = `${name}=${encodeURIComponent(encoded)}${expires}; path=${path}${s}${sec}`;
}
function cookieRemove(name, path = '/') {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
}

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

/* + new — removeQueryParam / updateQueryParams */
function removeQueryParam(name, { replace = true } = {}) {
  setQueryParam(name, null, { replace });
}
function updateQueryParams(patch = {}, { replace = true } = {}) {
  const url = new URL(location.href);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, String(v));
  }
  const state = { path: url.pathname + url.search };
  if (replace) history.replaceState(state, '', url);
  else history.pushState(state, '', url);
  return url.toString();
}

/* + new — path/origin helpers */
const getOrigin = () => (typeof location !== 'undefined' ? location.origin : '');
const getBaseUrl = () => (typeof location !== 'undefined' ? location.origin + location.pathname : '');
const getPathSegments = () => (typeof location !== 'undefined'
  ? location.pathname.split('/').filter(Boolean)
  : []);

/* + new — hash routing */
const getHash = () => (typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : '');
function setHash(h, { replace = false } = {}) {
  const next = h ? `#${h}` : '';
  if (replace) history.replaceState(null, '', next || ' ');
  else location.hash = h;
}
function onHashChange(cb) {
  const handler = () => cb(getHash());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

/* + new — popstate */
function onPopState(cb) {
  const handler = (e) => cb(e.state, e);
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}

/* + new — safe URL parse + resolve */
function parseUrl(href) {
  try { return new URL(String(href), typeof location !== 'undefined' ? location.href : 'http://localhost'); }
  catch { return null; }
}
const resolveUrl = (base, rel) => {
  try { return new URL(rel, base).toString(); }
  catch { return String(rel ?? ''); }
};
const isSameOrigin = (url) => {
  const u = parseUrl(url);
  return !!u && u.origin === getOrigin();
};
const isExternalUrl = (url) => !isSameOrigin(url);
const urlJoin = (...parts) =>
  parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? String(p).replace(/\/+$/, '') : String(p).replace(/^\/+|\/+$/g, '')))
    .join('/');

/* + new — safe redirect with allow-list */
function safeRedirect(url, { allowOrigins = [], fallback = '/' } = {}) {
  const target = parseUrl(url);
  const allowed = new Set([getOrigin(), ...allowOrigins]);
  if (!target || !allowed.has(target.origin)) {
    location.href = fallback;
    return false;
  }
  location.href = target.toString();
  return true;
}

/* + new — append query to an existing URL */
function appendQuery(url, params = {}) {
  const u = parseUrl(url);
  if (!u) return url;
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => u.searchParams.append(k, x));
    else u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/* + new — diff query strings */
function queryDiff(before, after) {
  const a = typeof before === 'string' ? parseQuery(before) : (before || {});
  const b = typeof after  === 'string' ? parseQuery(after)  : (after  || {});
  const changed = {}, added = {}, removed = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const inA = k in a, inB = k in b;
    if (inA && !inB) removed.push(k);
    else if (!inA && inB) added[k] = b[k];
    else if (a[k] !== b[k]) changed[k] = [a[k], b[k]];
  }
  return { changed, added, removed };
}

/* + new — thin pushState / replaceState wrappers */
function pushState(state, url)  { try { history.pushState(state, '', url); return true; } catch { return false; } }
function replaceState(state, url) { try { history.replaceState(state, '', url); return true; } catch { return false; } }

/* + new — encode/decode query values */
const encodeQueryValue = (v) => encodeURIComponent(String(v ?? ''));
const decodeQueryValue = (v) => { try { return decodeURIComponent(String(v ?? '')); } catch { return String(v ?? ''); } };

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

/** CSV export. (fixed: uses hoisted escapeCsv) */
function downloadCsv(filename, rows) {
  if (!rows || !rows.length) {
    if (typeof showToast === 'function') showToast('Nothing to export', 'warning');
    return;
  }
  const headers = unique(rows.flatMap((r) => Object.keys(r)));
  const csv = [headers.map(escapeCsv).join(',')]
    .concat(rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(',')))
    .join('\r\n');
  downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), filename);
}

/** JSON export. */
function downloadJson(filename, data) {
  downloadBlob(new Blob([safeJsonStringify(data, 2)], { type: 'application/json;charset=utf-8' }), filename);
}

/* + new — CSV parser (string → rows of objects) */
function parseCsv(text, { delimiter = ',', header = true } = {}) {
  const str = String(text ?? '').replace(/^\ufeff/, '');
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inQuotes) {
      if (c === '"' && str[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delimiter) { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!header) return rows;
  const heads = rows.shift() || [];
  return rows.map((r) => Object.fromEntries(heads.map((h, i) => [h, r[i] ?? ''])));
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

/* + new — blob ⇄ data URL */
const blobToDataURL = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(blob);
});
function dataURLToBlob(dataURL) {
  const [meta, b64] = String(dataURL || '').split(',');
  if (!meta || !b64) return new Blob();
  const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/* + new — file helpers */
const getExtension = (name) => {
  const s = String(name ?? '');
  const dot = s.lastIndexOf('.');
  return dot > -1 ? s.slice(dot + 1).toLowerCase() : '';
};
function fileIcon(name, mime = '') {
  const ext = getExtension(name);
  if (/^image\//.test(mime) || ['png','jpg','jpeg','gif','webp','svg','avif'].includes(ext)) return 'fa-image';
  if (ext === 'pdf' || mime === 'application/pdf') return 'fa-file-pdf';
  if (['doc','docx'].includes(ext)) return 'fa-file-word';
  if (['xls','xlsx','csv'].includes(ext)) return 'fa-file-excel';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'fa-file-archive';
  if (['mp3','wav','ogg','m4a'].includes(ext)) return 'fa-file-audio';
  if (['mp4','mov','webm','mkv'].includes(ext)) return 'fa-file-video';
  if (['js','ts','py','html','css','json','jsx','tsx'].includes(ext)) return 'fa-file-code';
  return 'fa-file';
}
function getMimeType(name) {
  const ext = getExtension(name);
  const map = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    json: 'application/json',
    txt: 'text/plain',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
    mp3: 'audio/mpeg', wav: 'audio/wav',
    mp4: 'video/mp4', webm: 'video/webm',
  };
  return map[ext] || 'application/octet-stream';
}

/* + new — file picker promise */
function openFilePicker({ accept = '', multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = el('input', { type: 'file', accept, multiple, style: { display: 'none' } });
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      input.remove();
      resolve(multiple ? files : (files[0] || null));
    });
    document.body.appendChild(input);
    input.click();
  });
}

/* + new — image compression (canvas-based, great for avatars) */
async function compressImage(file, { maxWidth = 512, maxHeight = 512, quality = 0.85, type = 'image/jpeg' } = {}) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  let { width: w, height: h } = img;
  const ratio = Math.min(1, maxWidth / w, maxHeight / h);
  w = Math.round(w * ratio); h = Math.round(h * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
  return blob || file;
}

/* + new — image preview (returns URL + revoke handle) */
function imagePreview(file) {
  if (!file) return { url: '', revoke: () => {} };
  const url = URL.createObjectURL(file);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

/* + new — download from a remote URL (with click-through anchor) */
function downloadFromUrl(url, filename = '') {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.rel = 'noopener';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* + new — print a specific element (receipts, certificates) */
function printElement(node) {
  if (!node) return;
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return;
  const styles = $$('link[rel="stylesheet"], style').map((s) => s.outerHTML).join('');
  w.document.write(`<!doctype html><html><head><title>Print</title>${styles}</head><body>${node.outerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 250);
}

/* + new — drag-and-drop zone */
function dropZone(node, { onFiles, activeClass = 'is-drop-target' } = {}) {
  if (!node) return () => {};
  const over = (e) => { e.preventDefault(); node.classList.add(activeClass); };
  const out  = (e) => { e.preventDefault(); node.classList.remove(activeClass); };
  const drop = (e) => {
    e.preventDefault();
    node.classList.remove(activeClass);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length && onFiles) onFiles(files, e);
  };
  node.addEventListener('dragover', over);
  node.addEventListener('dragleave', out);
  node.addEventListener('drop', drop);
  return () => {
    node.removeEventListener('dragover', over);
    node.removeEventListener('dragleave', out);
    node.removeEventListener('drop', drop);
  };
}

/* + new — paste handler */
function onPaste(handler, { target = document } = {}) {
  const h = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items.filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
    const text = e.clipboardData?.getData('text/plain') || '';
    handler({ files, text, raw: e });
  };
  target.addEventListener('paste', h);
  return () => target.removeEventListener('paste', h);
}

/** Copy text to clipboard. (+ new: returns { ok, error } ) */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text));
      return { ok: true };
    }
    const ta = document.createElement('textarea');
    ta.value = String(text);
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok ? { ok: true } : { ok: false, error: new Error('execCommand failed') };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/* + new — rich clipboard (HTML + text) */
async function copyRich(html, text) {
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([String(html)], { type: 'text/html' }),
        'text/plain': new Blob([String(text ?? stripHtml(html))], { type: 'text/plain' }),
      })]);
      return { ok: true };
    }
    return copyToClipboard(text ?? stripHtml(html));
  } catch (err) { return { ok: false, error: err }; }
}

/** Validate a file against config rules. */
function validateFile(file, { maxMb = CONFIG.MAX_UPLOAD_MB, allowedTypes = [] } = {}) {
  if (!file) return 'No file';
  if (file.size > maxMb * 1024 * 1024) return `File exceeds ${maxMb} MB`;
  if (allowedTypes.length && !isFileType(file, allowedTypes)) return `Unsupported type: ${file.type || 'unknown'}`;
  return '';
}

/* + new — chunked read with progress */
function readFileChunked(file, { chunkSize = 1 << 20, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let offset = 0;
    const readNext = () => {
      const slice = file.slice(offset, offset + chunkSize);
      const r = new FileReader();
      r.onload = () => {
        chunks.push(r.result);
        offset += chunkSize;
        if (onProgress) onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
        if (offset < file.size) readNext();
        else resolve(new Blob(chunks));
      };
      r.onerror = () => reject(r.error);
      r.readAsArrayBuffer(slice);
    };
    readNext();
  });
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

/* + new — browser/OS/device info */
function browserInfo() {
  const ua = UADATA;
  const match = (re) => (ua.match(re) || [])[1] || '';
  if (isEdge)     return { name: 'Edge',    version: match(/edg\/([\d.]+)/i),    engine: 'Blink' };
  if (isChrome)   return { name: 'Chrome',  version: match(/chrome\/([\d.]+)/i) || match(/crios\/([\d.]+)/i), engine: 'Blink' };
  if (isFirefox)  return { name: 'Firefox', version: match(/(?:firefox|fxios)\/([\d.]+)/i), engine: 'Gecko' };
  if (isSafari)   return { name: 'Safari',  version: match(/version\/([\d.]+)/i), engine: 'WebKit' };
  return { name: 'Unknown', version: '', engine: '' };
}
function osInfo() {
  if (isIOS)     return { name: 'iOS',     version: ((UADATA.match(/OS (\d+[_.]\d+)/) || [])[1] || '').replace('_', '.') };
  if (isAndroid) return { name: 'Android', version: ((UADATA.match(/Android ([\d.]+)/) || [])[1] || '') };
  if (/Windows NT/.test(UADATA)) return { name: 'Windows', version: ((UADATA.match(/Windows NT ([\d.]+)/) || [])[1] || '') };
  if (/Mac OS X/.test(UADATA))   return { name: 'macOS',   version: ((UADATA.match(/Mac OS X ([\d_.]+)/) || [])[1] || '').replace(/_/g, '.') };
  if (/Linux/.test(UADATA))      return { name: 'Linux',   version: '' };
  return { name: 'Unknown', version: '' };
}
function deviceType() {
  if (isMobile && /iPad|Tablet/i.test(UADATA)) return 'tablet';
  if (isMobile) return 'mobile';
  if (isIOS && navigator?.maxTouchPoints > 1) return 'tablet';
  return 'desktop';
}

/* + new — breakpoint helper (matches CSS conventions) */
const BREAKPOINTS = { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
function breakpoint() {
  const w = window.innerWidth;
  const keys = Object.keys(BREAKPOINTS).sort((a, b) => BREAKPOINTS[b] - BREAKPOINTS[a]);
  for (const k of keys) if (w >= BREAKPOINTS[k]) return k;
  return 'xs';
}
function onBreakpointChange(cb) {
  let last = breakpoint();
  const handler = () => {
    const next = breakpoint();
    if (next !== last) { const prev = last; last = next; cb(next, prev); }
  };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}

/* + new — PWA / standalone detection */
const isStandalone = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)')?.matches) ||
  (typeof navigator !== 'undefined' && navigator.standalone === true);
const isPWA       = isStandalone;
const isInstalled = isStandalone;

/* + new — feature detection table */
const supports = (() => {
  const cache = new Map();
  return (feature) => {
    if (cache.has(feature)) return cache.get(feature);
    const canvas = document.createElement('canvas');
    const test = {
      webp: () => canvas.toDataURL('image/webp').startsWith('data:image/webp'),
      avif: () => canvas.toDataURL('image/avif').startsWith('data:image/avif'),
      intersectionObserver: () => typeof IntersectionObserver !== 'undefined',
      mutationObserver: () => typeof MutationObserver !== 'undefined',
      resizeObserver: () => typeof ResizeObserver !== 'undefined',
      clipboard: () => !!(navigator.clipboard && navigator.clipboard.writeText),
      share: () => typeof navigator.share === 'function',
      geolocation: () => 'geolocation' in navigator,
      notifications: () => 'Notification' in window,
      serviceWorker: () => 'serviceWorker' in navigator,
      webWorker: () => typeof Worker !== 'undefined',
      indexedDB: () => !!window.indexedDB,
      localStorage: () => storageAvailable('localStorage'),
      sessionStorage: () => storageAvailable('sessionStorage'),
      cssHas: () => typeof CSS !== 'undefined' && CSS.supports?.('selector(:has(*))'),
      containerQueries: () => typeof CSS !== 'undefined' && CSS.supports?.('container-type: inline-size'),
      dialog: () => typeof HTMLDialogElement !== 'undefined',
      abortsignal: () => typeof AbortController !== 'undefined',
      structuredClone: () => typeof structuredClone === 'function',
      intl: () => typeof Intl !== 'undefined',
      intlRelative: () => typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat !== 'undefined',
      intlPlural: () => typeof Intl !== 'undefined' && typeof Intl.PluralRules !== 'undefined',
    };
    const fn = test[feature];
    const result = fn ? safeCall(fn, false) : false;
    cache.set(feature, result);
    return result;
  };
})();

/* + new — color scheme listener */
function onColorSchemeChange(cb) {
  if (typeof matchMedia === 'undefined') return () => {};
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const handler = () => cb(mq.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/* + new — contrast preference */
const prefersContrast = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-contrast: more)').matches;
const prefersReducedData = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-data: reduce)').matches;

/* + new — connection info */
function connectionInfo() {
  const c = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection;
  if (!c) return { effectiveType: 'unknown', downlink: null, rtt: null, saveData: false };
  return {
    effectiveType: c.effectiveType || 'unknown',
    downlink: c.downlink ?? null,
    rtt: c.rtt ?? null,
    saveData: !!c.saveData,
  };
}

const deviceMemory      = () => navigator?.deviceMemory ?? null;
const hardwareConcurrency = () => navigator?.hardwareConcurrency ?? null;

/* + new — screen info */
function screenInfo() {
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    screenW: screen.width,
    screenH: screen.height,
    dpr: window.devicePixelRatio || 1,
    orientation: screen.orientation?.type || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
  };
}

/* + new — safe-area insets (CSS env()) */
function safeAreaInsets() {
  if (typeof getComputedStyle === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  const root = document.documentElement;
  root.style.setProperty('--eh-safe-top', 'env(safe-area-inset-top, 0px)');
  root.style.setProperty('--eh-safe-right', 'env(safe-area-inset-right, 0px)');
  root.style.setProperty('--eh-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
  root.style.setProperty('--eh-safe-left', 'env(safe-area-inset-left, 0px)');
  const cs = getComputedStyle(root);
  const num = (v) => parseFloat(v) || 0;
  return {
    top: num(cs.getPropertyValue('--eh-safe-top')),
    right: num(cs.getPropertyValue('--eh-safe-right')),
    bottom: num(cs.getPropertyValue('--eh-safe-bottom')),
    left: num(cs.getPropertyValue('--eh-safe-left')),
  };
}

/* ============================================================
   SECTION 14 — MISC FORMATTERS
   ============================================================ */

const pct     = (n) => `${clamp(Number(n) || 0, 0, 100)}%`;
const clamp   = (n, lo, hi) => Math.min(Math.max(Number(n) || 0, lo), hi);
const lerp    = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const toBool  = (v) => v === true || v === 'true' || v === '1' || v === 1;
const safeNum = (v, fallback = 0) => (isFinite(Number(v)) ? Number(v) : fallback);

/* + new — random floats / chance / seeded rng */
const randFloat = (min, max, decimals = 2) => +(Math.random() * (max - min) + min).toFixed(decimals);
const chance = (p = 0.5) => Math.random() < p;
const randomBool = () => Math.random() < 0.5;

function seedRandom(seed) {
  let a = (hashString(String(seed)) || 1) >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* + new — status class (works with any status→class map) */
function statusClass(s, map) {
  const key = String(s ?? 'unknown').toLowerCase().replace(/[\s-]+/g, '_');
  if (map && map[key]) return map[key];
  return `status status-${key}`;
}

/* + new — avatar (offline-safe: hash colour + initials) */
function avatar(u) {
  if (u?.avatar) return u.avatar;
  if (CONFIG.DEFAULT_AVATAR) return CONFIG.DEFAULT_AVATAR + encodeURIComponent(u?.name || u?.email || 'User');
  return ''; // caller should use renderAvatar
}

/* + new — renderAvatar element (uses el(), no innerHTML, works offline) */
function renderAvatar(u, { size = 32, className = '' } = {}) {
  const name = u?.name || u?.email || 'User';
  if (u?.avatar) {
    return el('img', {
      src: u.avatar, alt: name,
      class: cn('avatar', className),
      style: { width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'cover' },
    });
  }
  return el('div', {
    class: cn('avatar avatar-fallback', className),
    'aria-label': name,
    style: {
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: hashColor(name), color: contrastColor(hashColor(name)),
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${Math.round(size * 0.4)}px`, fontWeight: 600,
    },
  }, initials(name));
}

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

/* + new — element-based mini bar (no innerHTML) */
function renderMiniBar(percent, colour) {
  const p = clamp(percent, 0, 100);
  return el('div', { class: 'mini-bar' },
    el('span', { style: { width: `${p}%`, background: colour || 'var(--brand)' } }),
  );
}

/* + new — stars for reviews */
function renderStars(rating, max = 5) {
  const r = clamp(rating, 0, max);
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  const parts = [];
  for (let i = 0; i < full; i++) parts.push(el('i', { class: 'fas fa-star', 'aria-hidden': 'true' }));
  if (half) parts.push(el('i', { class: 'fas fa-star-half-alt', 'aria-hidden': 'true' }));
  for (let i = full + (half ? 1 : 0); i < max; i++) parts.push(el('i', { class: 'far fa-star', 'aria-hidden': 'true' }));
  return el('span', { class: 'stars', 'aria-label': `${r} out of ${max}` }, ...parts);
}

/* + new — badge/chip builder */
function renderBadge(label, { variant = 'default', className = '' } = {}) {
  return el('span', { class: cn('badge', `badge-${variant}`, className) }, label);
}

/* + new — empty state builder */
function renderEmptyState({ icon = 'fa-inbox', title = 'Nothing here', message = '', action } = {}) {
  return el('div', { class: 'empty-state' },
    el('i', { class: cn('fas', icon), 'aria-hidden': 'true' }),
    el('h3', { class: 'empty-title' }, title),
    message ? el('p', { class: 'empty-message' }, message) : null,
    action || null,
  );
}

/* + new — skeleton loader */
function renderSkeleton(lines = 3, { className = '' } = {}) {
  return el('div', { class: cn('skeleton', className), 'aria-hidden': 'true' },
    ...range(lines).map(() => el('div', { class: 'skeleton-line' })),
  );
}

/* + new — PII redaction before logging */
function redact(obj, keys = ['password', 'token', 'secret', 'authorization', 'apiKey', 'api_key']) {
  const lower = new Set(keys.map((k) => k.toLowerCase()));
  const walk = (v, seen = new WeakSet()) => {
    if (v == null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map((x) => walk(x, seen));
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = lower.has(k.toLowerCase()) ? '***' : walk(val, seen);
    }
    return out;
  };
  return walk(obj);
}

const truncateHash = (hash, chars = 12) => {
  if (!hash) return '—';
  const h = String(hash);
  return h.length <= chars * 2 ? h : `${h.slice(0, chars)}…${h.slice(-chars)}`;
};

/* + new — format phone */
function fmtPhone(s) {
  const digits = String(s || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return String(s || '—');
}
/* + new — tel: href */
const telHref = (s) => `tel:${normalizePhone(s)}`;

/* + new — full name */
const fullName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || u?.name || u?.email || 'Unknown';
const formatName = (u, { style = 'full' } = {}) => {
  const first = u?.first_name || '';
  const last = u?.last_name || '';
  if (style === 'short') return first ? `${first} ${last ? last[0] + '.' : ''}`.trim() : fullName(u);
  if (style === 'lastFirst') return last ? `${last}, ${first}` : fullName(u);
  return fullName(u);
};
/* ============================================================
   SECTION 15 — CONSULTATION HELPERS
   ============================================================ */

/* fixed — slotLabel previously called fmtInTz(slot.end_time, 'UTC', ...) which forced
   the *start's* tz on the end. Now both format in the slot's own timezone. */
function slotLabel(slot, tz) {
  if (!slot) return '—';
  const zone = tz || slot.timezone || 'UTC';
  const start = fmtInTz(slot.start_time, zone);
  const end   = fmtInTz(slot.end_time, zone, { hour: '2-digit', minute: '2-digit' });
  return `${start} – ${end}`;
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
  if (!scheduledAt) return { pct: 100, label: 'Full refund available', hours: null };
  const hours = (new Date(scheduledAt) - Date.now()) / 3600000;
  if (hours > 24) return { pct: 100, label: 'More than 24h notice — full refund', hours };
  if (hours > 2)  return { pct: 50,  label: '2–24h notice — 50% refund',        hours };
  return { pct: 0, label: 'Less than 2h notice — no refund', hours };
}

/* + new — cancellation policy object (localizable) */
function cancellationPolicy(scheduledAt) {
  const { pct, hours } = refundPreview(scheduledAt);
  return {
    pct,
    hours,
    tier: pct === 100 ? 'full' : pct === 50 ? 'partial' : 'none',
    label: refundPreview(scheduledAt).label,
  };
}

/* + new — overlap using the §4 helper */
const slotsOverlap = (a, b) => overlap(a?.start_time, a?.end_time, b?.start_time, b?.end_time);

/* + new — generate bookable slots from an expert's availability window.
   availability: [{ day: 1, start: '09:00', end: '12:00' }, ...] (day: 0=Sun)
   existing: booked slots to exclude
   returns: array of { start_time, end_time, duration, timezone } ISO strings */
function generateSlots({ date, duration = 30, availability = [], existing = [], timezone = 'UTC', step = null } = {}) {
  if (!date || !availability.length) return [];
  const day = new Date(date).getDay();
  const window = availability.filter((w) => Number(w.day) === day);
  const stepMin = step || duration;
  const out = [];
  for (const w of window) {
    const [sh, sm] = String(w.start).split(':').map(Number);
    const [eh, em] = String(w.end).split(':').map(Number);
    const base = startOfDay(new Date(date));
    let cursor = addMinutes(base, sh * 60 + sm);
    const end = addMinutes(base, eh * 60 + em);
    while (addMinutes(cursor, duration) <= end) {
      const slot = {
        start_time: cursor.toISOString(),
        end_time: addMinutes(cursor, duration).toISOString(),
        duration,
        timezone,
      };
      const clash = existing.some((e) => overlap(slot.start_time, slot.end_time, e.start_time, e.end_time));
      if (!clash && isFuture(slot.start_time)) out.push(slot);
      cursor = addMinutes(cursor, stepMin);
    }
  }
  return out;
}

/* + new — next available slot across the next N days */
function nextAvailableSlot(expert, { from = new Date(), days = 14 } = {}) {
  const availability = expert?.availability || [];
  const existing   = expert?.booked_slots || [];
  const tz = expert?.timezone || 'UTC';
  const duration = expert?.session_duration || 30;
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const slots = generateSlots({ date, duration, availability, existing, timezone: tz });
    if (slots.length) return slots[0];
  }
  return null;
}

/* + new — group slots by day ("Today", "Tomorrow", ...) */
function groupSlotsByDay(slots = []) {
  const groups = new Map();
  for (const s of slots) {
    const k = isoDate(s.start_time);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, label: humanDate(date), slots: items }));
}

/* + new — countdown to a session */
function sessionCountdown(startAt, { urgentMinutes = 5 } = {}) {
  const ms = new Date(startAt).getTime() - Date.now();
  const isUrgent = ms > 0 && ms <= urgentMinutes * 60000;
  if (ms <= 0) return { label: 'Now', msRemaining: ms, isUrgent: false, isOver: true };
  return { label: timeUntil(startAt), msRemaining: ms, isUrgent, isOver: false };
}

/* + new — grace period countdown */
function gracePeriodRemaining(confirmedAt, graceMinutes = 15) {
  if (!confirmedAt) return { msRemaining: 0, isOver: true, label: '—' };
  const deadline = addMinutes(confirmedAt, graceMinutes);
  const ms = new Date(deadline) - Date.now();
  return {
    msRemaining: Math.max(0, ms),
    isOver: ms <= 0,
    label: ms <= 0 ? 'Grace ended' : `${fmtMinutes(ms)} left`,
    deadline: deadline.toISOString(),
  };
}

/* + new — no-show detection */
function isNoShow(session, { graceMinutes = 15 } = {}) {
  if (!session) return false;
  if (session.status === 'no_show') return true;
  if (['completed', 'cancelled', 'in_session'].includes(session.status)) return false;
  const deadline = addMinutes(session.start_time, graceMinutes);
  return isPast(deadline) && !session.joined_at;
}

/* + new — duration label for a slot */
const sessionDurationLabel = (slot) => slot?.duration ? `${slot.duration} min` : '—';

/* + new — meeting link validation (host allow-list) */
const MEETING_HOSTS = ['zoom.us', 'meet.google.com', 'teams.microsoft.com', 'whereby.com', 'around.co', 'jitsi.org'];
function meetingLinkValid(url) {
  const u = parseUrl(url);
  if (!u) return false;
  return MEETING_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h));
}

/* + new — ICS event generation for calendar invites */
function toIcsEvent(session, { organizer = {}, attendees = [] } = {}) {
  const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = session.id || uuid();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ExpertHub//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(session.start_time)}`,
    `DTEND:${dt(session.end_time)}`,
    `SUMMARY:${(session.title || 'Consultation').replace(/[\r\n]/g, ' ')}`,
    session.description ? `DESCRIPTION:${session.description.replace(/[\r\n]/g, '\\n')}` : '',
    session.location ? `LOCATION:${session.location}` : '',
    session.meeting_url ? `URL:${session.meeting_url}` : '',
    organizer.email ? `ORGANIZER;CN=${organizer.name || ''}:mailto:${organizer.email}` : '',
    ...attendees.map((a) => `ATTENDEE;CN=${a.name || ''};RSVP=TRUE:mailto:${a.email}`),
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

/* + new — full price breakdown for checkout */
function consultationPriceBreakdown(session, { taxRate = 0, platformFee = 0 } = {}) {
  const base = safeNum(session?.price, 0);
  const { tax, gross } = applyTax(base, taxRate);
  return {
    base: clampMoney(base),
    tax: clampMoney(tax),
    platformFee: clampMoney(platformFee),
    total: clampMoney(gross + platformFee),
    currency: session?.currency || CONFIG.CURRENCY,
  };
}

/* + new — reminder schedule (24h, 1h, 10m before) */
function reminderSchedule(session) {
  if (!session?.start_time) return [];
  const start = new Date(session.start_time).getTime();
  return [
    { at: new Date(start - 24 * 3600e3).toISOString(), kind: '24h', label: 'Reminder: tomorrow' },
    { at: new Date(start -      3600e3).toISOString(), kind: '1h',  label: 'Starts in 1 hour' },
    { at: new Date(start -       600e3).toISOString(), kind: '10m', label: 'Starts in 10 minutes' },
  ].filter((r) => isFuture(r.at));
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

/* + new — course progress */
function courseProgress(lessons = []) {
  const total = lessons.length;
  const completed = lessons.filter((l) => l.status === 'completed' || l.completed === true).length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

/* + new — grade scale */
const GRADE_SCALE = Object.freeze([
  { min: 90, letter: 'A', points: 4.0 },
  { min: 80, letter: 'B', points: 3.0 },
  { min: 70, letter: 'C', points: 2.0 },
  { min: 60, letter: 'D', points: 1.0 },
  { min: 0,  letter: 'F', points: 0.0 },
]);

const gradeFromScore = (score, scale = GRADE_SCALE) => {
  const s = safeNum(score, 0);
  return scale.find((g) => s >= g.min) || scale[scale.length - 1];
};

function gpaFromGrades(grades = [], scale = GRADE_SCALE) {
  const pts = grades
    .map((g) => (typeof g === 'number' ? gradeFromScore(g, scale).points : safeNum(g?.points, 0)))
    .filter(isFinite);
  return pts.length ? +(pts.reduce((a, b) => a + b, 0) / pts.length).toFixed(2) : 0;
}

function weightedAverage(items = [], weights = []) {
  let sw = 0, sv = 0;
  for (let i = 0; i < items.length; i++) {
    const w = safeNum(weights[i], 1);
    sw += w;
    sv += safeNum(items[i], 0) * w;
  }
  return sw ? +(sv / sw).toFixed(2) : 0;
}

/* + new — quiz scoring (with optional negative marking) */
function quizScore(answers = {}, key = {}, { negativeMarking = 0 } = {}) {
  let correct = 0, wrong = 0, blank = 0;
  for (const q of Object.keys(key)) {
    const a = answers[q];
    if (a == null || a === '') blank++;
    else if (String(a) === String(key[q])) correct++;
    else wrong++;
  }
  const raw = correct - wrong * negativeMarking;
  const total = Object.keys(key).length || 1;
  return { correct, wrong, blank, total, raw, percent: Math.max(0, Math.round((raw / total) * 100)) };
}

/* + new — streak tracking */
function calculateStreak(activityDates = []) {
  const days = unique(activityDates.map((d) => isoDate(d))).sort().reverse();
  if (!days.length) return { current: 0, longest: 0, lastActive: null };

  let longest = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = diffDays(new Date(days[i - 1]), new Date(days[i]));
    if (gap === 1) run++;
    else { longest = Math.max(longest, run); run = 1; }
  }
  longest = Math.max(longest, run);

  const last = days[0];
  const lastGap = diffDays(new Date(), new Date(last));
  let current = 0;
  if (lastGap <= 1) {
    current = 1;
    for (let i = 1; i < days.length; i++) {
      if (diffDays(new Date(days[i - 1]), new Date(days[i])) === 1) current++;
      else break;
    }
  }
  return { current, longest, lastActive: last };
}

/* + new — lesson unlock + next lesson */
function isLessonUnlocked(lesson, lessons = []) {
  if (!lesson?.prerequisites?.length) return true;
  const done = new Set(lessons.filter((l) => l.status === 'completed').map((l) => l.id));
  return lesson.prerequisites.every((id) => done.has(id));
}

function nextLesson(lessons = []) {
  return lessons.find((l) => l.status === 'in_progress')
      || lessons.find((l) => l.status !== 'completed' && isLessonUnlocked(l, lessons))
      || null;
}

/* + new — certificate eligibility */
function certificateEligible(enrollment) {
  if (!enrollment) return false;
  const p = courseProgress(enrollment.lessons || []);
  const avg = enrollment.averageScore ?? 0;
  return p.percent >= 100 && avg >= (CONFIG.PASS_MARK ?? 70);
}

/* + new — passed threshold */
const passed = (score, threshold = CONFIG.PASS_MARK ?? 70) => safeNum(score, 0) >= threshold;

/* + new — time estimate to finish a course */
function estimateTimeRemaining(lessons = [], { wpm = 220 } = {}) {
  const remaining = lessons.filter((l) => l.status !== 'completed');
  const minutes = remaining.reduce((sum, l) => sum + safeNum(l.estimated_minutes, 10), 0);
  return { minutes, label: fmtMinutes(minutes * 60000), lessons: remaining.length };
}

/* + new — mastery / percentile / rank */
function percentile(value, values = []) {
  if (!values.length) return 0;
  const below = values.filter((v) => v < value).length;
  return Math.round((below / values.length) * 100);
}
function leaderboardRank(userId, users = [], keyFn = (u) => u.xp ?? 0) {
  const sorted = sortBy(users, (u) => keyFn(u), 'desc');
  const idx = sorted.findIndex((u) => u.id === userId);
  return { rank: idx < 0 ? null : idx + 1, total: sorted.length };
}

/* + new — SM-2 spaced repetition scheduling */
function reviewSchedule(item = {}, { quality = 3 } = {}) {
  let { ease = 2.5, interval = 1, reps = 0 } = item;
  if (quality < 3) { reps = 0; interval = 1; }
  else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);
    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }
  return { ease: +ease.toFixed(2), interval, reps, nextReview: addDays(new Date(), interval).toISOString() };
}

/* + new — badge progress */
function badgeProgress(user, badgeCode) {
  const badge = CONFIG.BADGES?.[badgeCode];
  if (!badge) return null;
  const have = user?.badges?.includes(badgeCode);
  const required = badge.requires || 0;
  const current = required && badge.metric ? safeNum(user?.[badge.metric], 0) : 0;
  return {
    have,
    badge,
    current,
    required,
    percent: required ? clamp(Math.round((current / required) * 100), 0, 100) : (have ? 100 : 0),
  };
}

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

/* fixed — budgetUtilClass now returns an object so callers can use label/colour too */
function budgetUtilClass(p) {
  const n = Number(p) || 0;
  if (n >= 95) return { class: 'budget-critical', label: 'Critical', colour: '#dc2626' };
  if (n >= 80) return { class: 'budget-warning',  label: 'Warning',  colour: '#f97316' };
  if (n >= 50) return { class: 'budget-ok',       label: 'On Track', colour: '#22c55e' };
  return         { class: 'budget-low',       label: 'Under',    colour: '#0ea5e9' };
}

function examIntegrityLabel(score) {
  if (score == null) return 'Not Scored';
  if (score >= 90) return 'Clean';
  if (score >= 70) return 'Minor Flags';
  if (score >= 50) return 'Review Needed';
  return 'Invalidated';
}

/* + new — enrollment stats */
function enrollmentStats(students = []) {
  const byStatus = Object.create(null);
  for (const s of students) {
    const k = s.status || 'unknown';
    byStatus[k] = (byStatus[k] || 0) + 1;
  }
  return { total: students.length, byStatus };
}

/* + new — attendance rate */
function attendanceRate(records = []) {
  const total = records.length;
  if (!total) return 0;
  const present = records.filter((r) => r.status === 'present' || r.attended === true).length;
  return Math.round((present / total) * 100);
}

/* + new — room capacity utilisation */
const capacityUtilization = (enrolled, capacity) => {
  const c = Number(capacity) || 0;
  return c ? Math.min(100, Math.round((Number(enrolled) / c) * 100)) : 0;
};

/* + new — schedule clash detector */
function detectScheduleConflicts(sessions = [], { byRoom = true } = {}) {
  const sorted = [...sessions].sort((a, b) => new Date(a.start) - new Date(b.start));
  const conflicts = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j];
      if (new Date(b.start) >= new Date(a.end)) break;
      if (byRoom && a.room && b.room && a.room !== b.room) continue;
      conflicts.push({ a, b });
    }
  }
  return conflicts;
}

/* + new — academic standing */
function academicStanding(gpa) {
  const g = safeNum(gpa, 0);
  if (g >= 3.8) return { code: 'deans_list', label: "Dean's List",  colour: '#22c55e' };
  if (g >= 2.0) return { code: 'good',       label: 'Good Standing', colour: '#22c55e' };
  if (g >= 1.0) return { code: 'probation',  label: 'Probation',     colour: '#f97316' };
  return         { code: 'suspension', label: 'Suspension',    colour: '#dc2626' };
}

/* + new — credit hours */
const creditHours = (courses = []) => courses.reduce((s, c) => s + safeNum(c?.credits, 0), 0);

/* + new — tuition calculation */
function tuitionFor(enrollment, feeTable = {}) {
  const rate = safeNum(feeTable.perCredit, 0);
  const fees = safeNum(feeTable.mandatory, 0);
  const credits = creditHours(enrollment?.courses || []);
  const discount = safeNum(enrollment?.scholarship, 0);
  const gross = credits * rate + fees;
  const total = +(gross * (1 - Math.min(1, Math.max(0, discount)))).toFixed(2);
  return { credits, rate, fees, discount, gross, total };
}

/* + new — deterministic invoice number */
function invoiceNumber(seq, { prefix = 'INV', date = new Date() } = {}) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  return `${prefix}-${y}${m}-${pad(seq, 5)}`;
}

/* + new — waitlist position */
function waitlistPosition(studentId, waitlist = []) {
  const idx = waitlist.findIndex((w) => w.student_id === studentId || w.id === studentId);
  return idx < 0 ? null : idx + 1;
}

/* + new — faculty load */
function facultyLoad(instructor, courses = []) {
  const mine = courses.filter((c) => c.instructor_id === instructor.id);
  const students = mine.reduce((s, c) => s + safeNum(c.enrolled, 0), 0);
  const credits = creditHours(mine);
  return { courses: mine.length, students, credits, overloaded: mine.length > 5 || students > 150 };
}

/* + new — class size bucket */
function classSizeBucket(n) {
  const v = Number(n) || 0;
  if (v < 15) return { code: 'small',  label: 'Small',  colour: '#22c55e' };
  if (v < 40) return { code: 'medium', label: 'Medium', colour: '#eab308' };
  if (v < 100) return { code: 'large', label: 'Large',  colour: '#f97316' };
  return         { code: 'xl',     label: 'X-Large', colour: '#dc2626' };
}

/* + new — transcript summary */
function transcriptSummary(grades = []) {
  const gpa = gpaFromGrades(grades);
  const totalCredits = grades.reduce((s, g) => s + safeNum(g?.credits, 0), 0);
  const earned = grades.filter((g) => safeNum(g?.points, 0) > 0).reduce((s, g) => s + safeNum(g?.credits, 0), 0);
  return { gpa, totalCredits, earned, standing: academicStanding(gpa).label, count: grades.length };
}

/* ============================================================
   SECTION 18 — ACCESSIBILITY
   ============================================================ */

/* fixed — trapFocus now uses the shared FOCUSABLE_SELECTOR from §1, and is stack-aware */
const _focusTrapStack = [];
function trapFocus(container) {
  if (!container) return () => {};
  const previousActive = document.activeElement;

  const handler = (e) => {
    if (e.key !== 'Tab') return;
    const top = _focusTrapStack[_focusTrapStack.length - 1];
    if (top && top.container !== container) return; // an inner trap owns the keys
    const nodes = focusables(container).filter((el) => el.offsetParent !== null);
    if (!nodes.length) { e.preventDefault(); return; }
    const first = nodes[0];
    const last  = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const entry = { container, handler, previousActive };
  _focusTrapStack.push(entry);
  container.addEventListener('keydown', handler);

  // Autofocus first focusable inside
  setTimeout(() => { focusFirst(container); }, 0);

  return () => {
    const idx = _focusTrapStack.indexOf(entry);
    if (idx > -1) _focusTrapStack.splice(idx, 1);
    container.removeEventListener('keydown', handler);
    // Restore focus to previous if still in document
    if (previousActive && document.contains(previousActive) && typeof previousActive.focus === 'function') {
      try { previousActive.focus(); } catch {}
    }
  };
}

/* + new — restoreFocus (returns a cleanup you can pass to trapFocus caller) */
function restoreFocus(prev = document.activeElement) {
  return () => {
    if (prev && document.contains(prev) && typeof prev.focus === 'function') {
      try { prev.focus(); } catch {}
    }
  };
}

/** Announce a message to screen readers. (+ new: queueing so messages don't clobber) */
const _announceQueue = new Map();
function announce(message, politeness = 'polite') {
  let region = document.getElementById('a11y-live-' + politeness);
  if (!region) {
    region = el('div', {
      id: 'a11y-live-' + politeness,
      'aria-live': politeness,
      'aria-atomic': 'true',
      class: 'sr-only',
    });
    document.body.appendChild(region);
  }
  const text = String(message ?? '');
  const queue = _announceQueue.get(region) || [];
  queue.push(text);
  _announceQueue.set(region, queue);
  if (queue.length > 1) return;
  const flush = () => {
    const q = _announceQueue.get(region) || [];
    const next = q.shift();
    if (next == null) { _announceQueue.set(region, []); return; }
    region.textContent = '';
    setTimeout(() => {
      region.textContent = next;
      setTimeout(flush, 350);
    }, 30);
  };
  flush();
}

/** Focus the first focusable element within `scope`. */
function focusFirst(scope = document) {
  const first = focusables(scope)[0];
  first?.focus?.();
  return first;
}

/* + new — roving tabindex for menus/tab lists */
function rovingTabIndex(container, itemSelector = '[role="tab"], [role="menuitem"], button') {
  if (!container) return () => {};
  const items = () => $$(itemSelector, container).filter((n) => !n.hasAttribute('disabled'));
  const setActive = (node) => {
    items().forEach((n) => {
      if (n === node) { n.setAttribute('tabindex', '0'); n.focus(); }
      else n.setAttribute('tabindex', '-1');
    });
  };
  const initial = items()[0];
  if (initial) setActive(initial);

  const handler = (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key in map) {
      e.preventDefault();
      const next = list[(i + map[e.key] + list.length) % list.length];
      setActive(next);
    } else if (e.key === 'Home') { e.preventDefault(); setActive(list[0]); }
    else if (e.key === 'End')    { e.preventDefault(); setActive(list[list.length - 1]); }
  };
  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

/* + new — arrow key navigation */
function onArrowKeys(container, handlers = {}) {
  if (!container) return () => {};
  const map = { ArrowLeft: 'onLeft', ArrowRight: 'onRight', ArrowUp: 'onUp', ArrowDown: 'onDown', Enter: 'onEnter', Escape: 'onEscape' };
  const h = (e) => {
    const key = map[e.key];
    if (key && typeof handlers[key] === 'function') {
      handlers[key](e);
    }
  };
  container.addEventListener('keydown', h);
  return () => container.removeEventListener('keydown', h);
}

/* + new — aria bulk set */
function aria(node, attrs = {}) {
  if (!node) return;
  for (const [k, v] of Object.entries(attrs)) {
    const name = k.startsWith('aria-') ? k : `aria-${k}`;
    if (v === null || v === undefined || v === false) node.removeAttribute(name);
    else node.setAttribute(name, v === true ? 'true' : String(v));
  }
}
const setExpanded = (node, on) => aria(node, { expanded: !!on });
const setPressed  = (node, on) => aria(node, { pressed:  !!on });
const setSelected = (node, on) => aria(node, { selected: !!on });
const setBusy     = (node, on) => aria(node, { busy:     !!on });
const setDescribedBy = (node, id) => aria(node, { describedby: id || null });
const setLabelledBy  = (node, id) => aria(node, { labelledby:  id || null });

/* + new — compute accessible name (best-effort) */
function accessibleName(node) {
  if (!node) return '';
  const ariaLabel = node.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();
  const labelledBy = node.getAttribute('aria-labelledby');
  if (labelledBy) {
    return labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
  }
  if (node.tagName === 'INPUT' || node.tagName === 'SELECT' || node.tagName === 'TEXTAREA') {
    const id = node.id;
    if (id) {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label) return label.textContent.trim();
    }
    const wrapping = node.closest('label');
    if (wrapping) return wrapping.textContent.trim();
  }
  const text = (node.textContent || '').trim();
  if (text) return text;
  const title = node.getAttribute('title');
  if (title) return title.trim();
  const alt = node.getAttribute('alt');
  if (alt) return alt.trim();
  return '';
}

/* + new — skip link builder */
function skipLink(targetId, label = 'Skip to content') {
  return el('a', { href: `#${targetId}`, class: 'skip-link' }, label);
}

/* + new — sr-only text node helper */
const srOnly = (text) => el('span', { class: 'sr-only' }, text);

/* + new — respect prefers-reduced-motion */
function respectMotion(fn, fallback = () => {}) {
  if (prefersReducedMotion()) return fallback();
  return fn();
}

/* + new — dev-only audit: log missing labels / alt text */
function auditA11y(root = document, { silent = false } = {}) {
  const issues = [];
  $$('img', root).forEach((n) => { if (!n.hasAttribute('alt')) issues.push({ node: n, rule: 'img-alt' }); });
  $$('button, [role="button"]', root).forEach((n) => {
    if (!accessibleName(n)) issues.push({ node: n, rule: 'button-name' });
  });
  $$('a[href]', root).forEach((n) => {
    if (!accessibleName(n)) issues.push({ node: n, rule: 'link-name' });
  });
  $$('input, select, textarea', root).forEach((n) => {
    if (!accessibleName(n)) issues.push({ node: n, rule: 'form-label' });
  });
  if (!silent) {
    if (issues.length) console.warn(`[a11y] ${issues.length} issue(s):`, issues);
    else console.info('[a11y] no issues detected');
  }
  return issues;
}

/* ============================================================
   SECTION 19 — MISC ID / CLASS HELPERS
   ============================================================ */

/* + new — address formatting */
function formatAddress(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  return [
    addr.line1 || addr.street,
    addr.line2,
    [addr.city, addr.state || addr.region, addr.postal_code || addr.postcode].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean).join(', ');
}
function formatAddressLines(addr) {
  if (!addr) return [];
  if (typeof addr === 'string') return [addr];
  return [
    addr.line1 || addr.street,
    addr.line2,
    [addr.city, addr.state || addr.region, addr.postal_code || addr.postcode].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean);
}

/* + new — human-readable reference codes (no ambiguous 0/O/1/I) */
const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function generateReference({ prefix = '', length = 8, separator = '-' } = {}) {
  const body = randomString(length, REF_ALPHABET);
  return prefix ? `${prefix}${separator}${body}` : body;
}
const receiptNumber = (seq, { date = new Date() } = {}) =>
  `RCT-${new Date(date).getFullYear()}${pad(new Date(date).getMonth() + 1)}-${pad(seq, 5)}`;
const orderNumber = () => generateReference({ prefix: 'ORD', length: 8 });
const ticketNumber = () => generateReference({ prefix: 'TKT', length: 6 });

/* + new — base62 encode/decode for sequential IDs */
function encodeId(n, alphabet = REF_ALPHABET) {
  let x = Math.max(0, Math.floor(Number(n) || 0));
  if (x === 0) return alphabet[0];
  let out = '';
  const base = alphabet.length;
  while (x > 0) { out = alphabet[x % base] + out; x = Math.floor(x / base); }
  return out;
}
function decodeId(str, alphabet = REF_ALPHABET) {
  const s = String(str || '');
  const base = alphabet.length;
  let n = 0;
  for (const ch of s) {
    const i = alphabet.indexOf(ch);
    if (i < 0) return NaN;
    n = n * base + i;
  }
  return n;
}

/* + new — checksum for reference codes */
function checksum(str) {
  const h = hashCode(String(str || ''));
  return (h % 36).toString(36).toUpperCase();
}

/* + new — QR / barcode payload helpers */
const qrPayload = (data) => typeof data === 'string' ? data : safeJsonStringify(data);
const barcodeValue = (s) => String(s || '').replace(/[^0-9A-Za-z\-_.]/g, '').toUpperCase();

/* fixed — comparator moved to §5 (path-aware). Re-export here for compatibility. */
// const comparator = ... (defined in §5)

/* ============================================================
   SECTION 20 — EVENT BUS + STATE SUBSCRIPTIONS
   ============================================================ */

/* + new — lightweight event bus for cross-module communication */
const bus = (() => {
  const listeners = new Map();
  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event)?.delete(handler);
    },
    once(event, handler) {
      const off = this.on(event, (payload) => { off(); handler(payload); });
      return off;
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
    },
    emit(event, payload) {
      const set = listeners.get(event);
      if (!set) return 0;
      let n = 0;
      for (const fn of Array.from(set)) {
        try { fn(payload); n++; } catch (err) { console.error('[bus]', event, err); }
      }
      return n;
    },
    clear(event) {
      if (event) listeners.delete(event);
      else listeners.clear();
    },
  };
})();

/* + new — state subscriptions (watch dotted paths on S) */
const _watchers = new Map();
function watch(path, callback, { immediate = false } = {}) {
  if (!_watchers.has(path)) _watchers.set(path, new Set());
  const prev = deepGet(S, path);
  _watchers.get(path).add(callback);
  if (immediate) callback(prev, undefined, path);
  return () => _watchers.get(path)?.delete(callback);
}
function notifyWatch(path) {
  const callbacks = _watchers.get(path);
  if (!callbacks) return;
  const value = deepGet(S, path);
  for (const cb of callbacks) {
    try { cb(value, undefined, path); } catch (err) { console.error('[watch]', path, err); }
  }
}

/* + new — feature flag reader with URL override (?ff=name or ?ff=-name) */
function flag(name, fallback = false) {
  try {
    const params = parseQuery();
    const raw = params.ff;
    if (raw) {
      const parts = String(raw).split(',').map((s) => s.trim());
      if (parts.includes(name)) return true;
      if (parts.includes('-' + name)) return false;
    }
  } catch {}
  return FLAGS && name in FLAGS ? FLAGS[name] : fallback;
}

/* + new — micro i18n stub (until you wire a real one) */
const _i18nDict = Object.create(null);
function t(key, vars) {
  const str = _i18nDict[key] || key;
  return vars ? template(str, vars) : str;
}
function registerTranslations(map = {}, { merge = true } = {}) {
  if (!merge) { for (const k of Object.keys(_i18nDict)) delete _i18nDict[k]; }
  Object.assign(_i18nDict, map);
}
const plural = (key, count) => {
  const singular = _i18nDict[key] || key;
  const pluralKey = `${key}_plural`;
  return pluralize(count, singular, _i18nDict[pluralKey]);
};

/* ============================================================
   End of 02-utils.js
   ============================================================ */