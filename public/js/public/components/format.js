/* ============================================================
   PublicUI.format — the "batteries-included" formatting toolkit
   Load order: 1 of N. Everything downstream depends on this.
   ------------------------------------------------------------------
   TABLE OF CONTENTS
     §0.  Constants & shared Intl instances
     §1.  Internal coercion helpers
     §2.  String manipulation
     §3.  Case conversion
     §4.  HTML & escaping
     §5.  Masking & redaction
     §6.  Number formatting
     §7.  Number parsing
     §8.  Math & statistics
     §9.  Date formatting
     §10. Date parsing & comparison
     §11. Date arithmetic
     §12. Duration & intervals
     §13. Color
     §14. Safe access & flow control
     §15. Comparators & sorting
     §16. Input value formatters
     §17. Misc utilities
     §18. Exposed constants
   ------------------------------------------------------------------
   @module  PublicUI.format
   @version 3.0.0
   ============================================================ */
(() => {
  'use strict';

  window.PublicUI = window.PublicUI || {};

  /* ============================================================
     §0. Constants & shared Intl instances
     ============================================================ */

  const NUMBER_FMT       = new Intl.NumberFormat('en-US');
  const NUMBER_FMT_2DP   = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const CURRENCY_FMT_USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const CURRENCY_COMPACT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
  const PERCENT_FMT      = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });

  /** Locale-aware string comparator (case- and accent-insensitive). */
  const COLLATOR = new Intl.Collator('en-US', { sensitivity: 'base', numeric: true });

  const DATE_PRESETS = Object.freeze({
    short:     { month: 'short', day: 'numeric', year: 'numeric' },
    medium:    { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    long:      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    full:      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' },
    day:       { day: 'numeric' },
    month:     { month: 'short' },
    monthLong: { month: 'long' },
    year:      { year: 'numeric' },
    time:      { hour: '2-digit', minute: '2-digit' },
    timeShort: { hour: 'numeric', minute: '2-digit' },
    iso:       { year: 'numeric', month: '2-digit', day: '2-digit' },
    weekday:   { weekday: 'short' },
    weekdayLong: { weekday: 'long' },
  });

  const HTML_ESCAPES = Object.freeze({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;', '`': '&#96;',
  });

  const HTML_UNESCAPES = Object.freeze({
    '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&#96;': '`', '&nbsp;': ' ',
  });

  const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const ORDINAL_SUFFIXES = Object.freeze({ 1: 'st', 2: 'nd', 3: 'rd' });

  const MS = Object.freeze({
    SECOND: 1000,
    MINUTE: 60_000,
    HOUR:   3_600_000,
    DAY:    86_400_000,
    WEEK:   604_800_000,
  });

  /* ============================================================
     §1. Internal coercion helpers
     ============================================================ */

  /** Coerce to a finite number, defaulting to `fallback`. */
  const toNumber = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  /** Coerce to a valid Date, or null if invalid. */
  const toDate = (v) => {
    if (!v && v !== 0) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  /** Coerce to string safely. */
  const toStr = (v) => (v === null || v === undefined ? '' : String(v));

  /** Coerce to array safely. */
  const toArr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

  /** Is null / undefined / empty-string / NaN. */
  const isBlank = (v) =>
    v === null || v === undefined ||
    (typeof v === 'string' && v.trim() === '') ||
    (typeof v === 'number' && Number.isNaN(v));

  /* ============================================================
     §2. String manipulation
     ============================================================ */

  const stringOps = {
    /**
     * Escape a string for safe HTML interpolation.
     * Handles & < > " ' `
     * @example escapeHtml('<b>Hi</b>') // "&lt;b&gt;Hi&lt;/b&gt;"
     */
    escapeHtml(str) {
      return toStr(str).replace(/[&<>"'`]/g, (c) => HTML_ESCAPES[c]);
    },

    /**
     * Alias for `escapeHtml` with an explicit intent for attributes.
     * Same rules (quotes are escaped too).
     */
    escapeAttr(str) {
      return stringOps.escapeHtml(str);
    },

    /**
     * Reverse of `escapeHtml` — decode common HTML entities.
     */
    unescapeHtml(str) {
      return toStr(str).replace(/&(?:amp|lt|gt|quot|#39|#96|nbsp);/g, (m) => HTML_UNESCAPES[m] ?? m);
    },

    /**
     * Strip every HTML tag from a string.
     */
    stripHtml(str) {
      return toStr(str).replace(/<[^>]*>/g, '');
    },

    /** Alias for `stripHtml` (common name in template libs). */
    striptags(str) {
      return stringOps.stripHtml(str);
    },

    /**
     * Escape for embedding in a JavaScript string literal.
     * Escapes backslash, quotes, control chars, and U+2028/2029.
     */
    escapeJs(str) {
      return toStr(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
    },

    /**
     * Escape common Markdown metacharacters.
     */
    escapeMarkdown(str) {
      return toStr(str).replace(/([\\`*_{}[\]()#+\-.!>~|])/g, '\\$1');
    },

    /** Escape for use inside a RegExp pattern. */
    escapeRegex(str) {
      return toStr(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /** Alias for `escapeRegex`. */
    regexEscape(str) {
      return stringOps.escapeRegex(str);
    },

    /** Escape for use in a CSS attribute selector. */
    escapeCss(str) {
      return toStr(str).replace(/([^\w-])/g, '\\$1');
    },

    /**
     * Truncate to `n` chars, appending an ellipsis.
     * @example truncate('Hello world', 8) // "Hello w…"
     */
    truncate(str, n = 80) {
      const s = toStr(str);
      return s.length <= n ? s : `${s.slice(0, Math.max(0, n - 1)).trimEnd()}…`;
    },

    /**
     * Truncate the *middle* of a string — keeps prefix & suffix.
     * @example truncateMiddle('0x1234abcd5678ef90', 11) // "0x123…f90"
     */
    truncateMiddle(str, n = 32, ellipsis = '…') {
      const s = toStr(str);
      if (s.length <= n) return s;
      const keep = Math.max(2, Math.floor((n - ellipsis.length) / 2));
      return s.slice(0, keep) + ellipsis + s.slice(-keep);
    },

    /**
     * Truncate to a whole-word boundary.
     */
    truncateWords(str, n = 80) {
      const s = toStr(str);
      if (s.length <= n) return s;
      const cut = s.slice(0, n);
      const lastSpace = cut.lastIndexOf(' ');
      return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
    },

    /**
     * Tag-aware HTML truncate: counts only visible characters,
     * and does not split a tag in half.
     * @example truncateHtml('<p>Hello <b>world</b></p>', 7) // "<p>Hello <b>w…"
     */
    truncateHtml(str, n = 80, ellipsis = '…') {
      const s = toStr(str);
      if (s.length <= n) return s;
      let out = '';
      let inTag = false;
      let count = 0;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '<') inTag = true;
        if (!inTag) {
          if (count >= n) break;
          count++;
        }
        out += c;
        if (c === '>') inTag = false;
      }
      return out + ellipsis;
    },

    /**
     * Slug: ASCII-safe, dash-separated, deduplicated.
     * @example slugify('Café de Flore!') // "cafe-de-flore"
     */
    slugify(str) {
      return toStr(str)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    },

    /**
     * Remove diacritics / combining marks.
     * @example deburr('résumé') // "resume"
     */
    deburr(str) {
      return toStr(str).normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    },

    /** Alias for `deburr`. */
    removeAccents(str) {
      return stringOps.deburr(str);
    },

    /**
     * Unicode-normalize a string.
     * @param {'NFC'|'NFD'|'NFKC'|'NFKD'} [form='NFC']
     */
    normalize(str, form = 'NFC') {
      try { return toStr(str).normalize(form); }
      catch { return toStr(str); }
    },

    /**
     * Up to 2 initials extracted from a name.
     * @example initials('Ada Lovelace') // "AL"
     */
    initials(name) {
      const parts = toStr(name).trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '?';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts.at(-1)[0]).toUpperCase();
    },

    /** Capitalize the first letter only. */
    capitalize(str) {
      const s = toStr(str);
      return s ? s[0].toUpperCase() + s.slice(1) : '';
    },

    /** Capitalize the first letter of each word. */
    titleCase(str) {
      return toStr(str).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    },

    /** Sentence case — capitalize first word only. */
    sentenceCase(str) {
      const s = toStr(str).toLowerCase();
      return s ? s[0].toUpperCase() + s.slice(1) : '';
    },

    /** camelCase from any spaced/dashed/underscored input. */
    camelCase(str) {
      return toStr(str)
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
    },

    /** PascalCase from any input. */
    pascalCase(str) {
      const cc = stringOps.camelCase(str);
      return cc ? cc[0].toUpperCase() + cc.slice(1) : '';
    },

    /** kebab-case from any input. */
    kebabCase(str) {
      return toStr(str)
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .toLowerCase()
        .replace(/^-|-$/g, '');
    },

    /** snake_case from any input. */
    snakeCase(str) {
      return stringOps.kebabCase(str).replace(/-/g, '_');
    },

    /** CONSTANT_CASE from any input. */
    constantCase(str) {
      return stringOps.snakeCase(str).toUpperCase();
    },

    /** Repeat a string n times (clamped). */
    repeat(str, n) {
      return toStr(str).repeat(Math.max(0, Math.floor(toNumber(n))));
    },

    /**
     * Pad a string to width `n` on a chosen side.
     * @param {'start'|'end'|'both'} [side='start']
     */
    pad(str, n, char = ' ', side = 'start') {
      const s = toStr(str);
      const target = Math.max(0, Math.floor(toNumber(n)));
      const short = target - s.length;
      if (short <= 0) return s;
      const fill = toStr(char).slice(0, 1) || ' ';
      if (side === 'end') return s + fill.repeat(short);
      if (side === 'both') {
        const left = Math.floor(short / 2);
        return fill.repeat(left) + s + fill.repeat(short - left);
      }
      return fill.repeat(short) + s;
    },

    /** Center-pad shortcut. */
    padCenter(str, n, char = ' ') {
      return stringOps.pad(str, n, char, 'both');
    },

    /** Zero-pad a number. */
    zpad(n, width = 2) {
      return String(toNumber(n)).padStart(width, '0');
    },

    /**
     * Trim specific characters from both ends.
     * @example trimChars('--hello--', '-') // "hello"
     */
    trimChars(str, chars) {
      const s = toStr(str);
      const set = toStr(chars);
      if (!set) return s;
      const esc = stringOps.escapeRegex(set);
      return s.replace(new RegExp(`^[${esc}]+|[${esc}]+$`, 'g'), '');
    },

    /** Trim specific chars from the start. */
    trimStartChars(str, chars) {
      const set = toStr(chars);
      if (!set) return toStr(str);
      return toStr(str).replace(new RegExp(`^[${stringOps.escapeRegex(set)}]+`), '');
    },

    /** Trim specific chars from the end. */
    trimEndChars(str, chars) {
      const set = toStr(chars);
      if (!set) return toStr(str);
      return toStr(str).replace(new RegExp(`[${stringOps.escapeRegex(set)}]+$`), '');
    },

    /** Wrap a string in prefix/suffix (only if non-empty). */
    wrap(str, prefix, suffix = prefix) {
      const s = toStr(str);
      return s ? `${toStr(prefix)}${s}${toStr(suffix)}` : '';
    },

    /** Conditionally prepend. */
    prefix(str, p, when = true) {
      return when ? `${toStr(p)}${toStr(str)}` : toStr(str);
    },

    /** Conditionally append. */
    suffix(str, s, when = true) {
      return when ? `${toStr(str)}${toStr(s)}` : toStr(str);
    },

    /**
     * Replace all occurrences of `find` with `replace`.
     * Uses RegExp under the hood with proper escaping.
     */
    replaceAll(str, find, replace) {
      const s = toStr(str);
      const f = toStr(find);
      if (!f) return s;
      return s.replace(new RegExp(stringOps.escapeRegex(f), 'g'), toStr(replace));
    },

    /**
     * Split a string by a delimiter, optionally trimming and
     * dropping empty segments.
     */
    split(str, sep = ',', { trim = true, dropEmpty = true } = {}) {
      const parts = toStr(str).split(sep);
      return parts
        .map((p) => (trim ? p.trim() : p))
        .filter((p) => !dropEmpty || p.length > 0);
    },

    /** Case- and accent-insensitive substring check. */
    contains(haystack, needle) {
      return COLLATOR.compare(toStr(needle), toStr(haystack)) === 0
        || stringOps.deburr(toStr(haystack)).toLowerCase()
            .includes(stringOps.deburr(toStr(needle)).toLowerCase());
    },

    /** Join a list with natural-language separators. */
    listJoin(arr, sep = ', ', last = ' and ') {
      const list = toArr(arr).map(toStr).filter(Boolean);
      if (list.length === 0) return '';
      if (list.length === 1) return list[0];
      if (list.length === 2) return list.join(last);
      return list.slice(0, -1).join(sep) + last + list.at(-1);
    },

    /** Reverse a string (unicode-safe via spread). */
    reverse(str) {
      return [...toStr(str)].reverse().join('');
    },

    /** Word count. */
    wordCount(str) {
      const s = toStr(str).trim();
      return s ? s.split(/\s+/).length : 0;
    },

    /** Estimate reading time in minutes from a word count. */
    readTime(words, wpm = 220) {
      return Math.max(1, Math.round(toNumber(words) / wpm));
    },

    /**
     * Possessive form: "James" → "James'", "Ada" → "Ada's".
     */
    possessive(name) {
      const s = toStr(name).trim();
      if (!s) return '';
      return s.endsWith('s') || s.endsWith('S') ? `${s}'` : `${s}'s`;
    },

    /**
     * Choose "a" or "an" for the given word.
     * @example article('hour') // "an"
     */
    article(word) {
      const w = toStr(word).trim().toLowerCase();
      if (!w) return 'a';
      return /^[aeiou]/.test(w) || /^(hour|honest|heir)/.test(w) ? 'an' : 'a';
    },

    /**
     * Wrap matched terms in `<mark>`.
     * Escaping is done in two passes: once to HTML-escape,
     * then again to build the highlight regex against the
     * *already-escaped* text so `&`, `<`, etc. match correctly.
     */
    highlight(text, query, className = '') {
      const safe = stringOps.escapeHtml(text);
      const terms = toArr(query)
        .map((t) => toStr(t).trim())
        .filter(Boolean)
        .map((t) => stringOps.escapeRegex(stringOps.escapeHtml(t)));
      if (terms.length === 0) return safe;
      const re = new RegExp(`(${terms.join('|')})`, 'gi');
      const cls = className ? ` class="${stringOps.escapeHtml(className)}"` : '';
      return safe.replace(re, `<mark${cls}>$1</mark>`);
    },
  };

  /* ============================================================
     §5. Masking & redaction
     ============================================================ */

  const maskingOps = {
    /**
     * Mask an email — keeps first char of user + whole domain.
     */
    maskEmail(email) {
      const s = toStr(email);
      const [user, domain] = s.split('@');
      if (!user || !domain) return s;
      if (user.length === 1) return `${user}•@${domain}`;
      const head = user[0];
      const tail = user.at(-1);
      const dots = Math.max(1, user.length - 2);
      return `${head}${'•'.repeat(dots)}${tail}@${domain}`;
    },

    /** Mask a phone — keeps last 4 digits. */
    maskPhone(phone) {
      const digits = toStr(phone).replace(/\D/g, '');
      if (digits.length <= 4) return digits;
      return '•'.repeat(digits.length - 4) + digits.slice(-4);
    },

    /**
     * Keep only the first `visible` characters; rest become bullets.
     * @example maskStart('4242424242424242', 4) // "4242••••••••••••"
     */
    maskStart(value, visible = 4, bullet = '•') {
      const s = toStr(value);
      if (s.length <= visible) return s;
      return s.slice(0, visible) + bullet.repeat(s.length - visible);
    },

    /**
     * Keep only the last `visible` characters.
     */
    maskEnd(value, visible = 4, bullet = '•') {
      const s = toStr(value);
      if (s.length <= visible) return s;
      return bullet.repeat(s.length - visible) + s.slice(-visible);
    },

    /**
     * Generic mask with a bullet count equal to the input length.
     */
    mask(value, bullet = '•') {
      return bullet.repeat(toStr(value).length);
    },

    /** Fixed-length bullet string, e.g. for "••••••". */
    hiddenText(length, bullet = '•') {
      return bullet.repeat(Math.max(0, Math.floor(toNumber(length))));
    },
  };

  /* ============================================================
     §6. Number formatting
     ============================================================ */

  const numberFmt = {
    /** Locale-formatted integer/float. */
    number(n, decimals) {
      const num = toNumber(n);
      return decimals === undefined ? NUMBER_FMT.format(num) : num.toFixed(decimals);
    },

    /** Fixed-decimal string. */
    fixed(n, d = 2) {
      return toNumber(n).toFixed(Math.max(0, Math.floor(d)));
    },

    /**
     * Currency with optional symbol override.
     * Omit symbol → full Intl output (locale-aware).
     */
    currency(n, symbol) {
      const num = toNumber(n);
      if (!symbol) return CURRENCY_FMT_USD.format(num);
      const decimals = Number.isInteger(num) ? 0 : 2;
      return symbol + num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: 2,
      });
    },

    /** Compact currency: "$1.2K", "$3.4M". */
    currencyCompact(n) {
      return CURRENCY_COMPACT.format(toNumber(n));
    },

    /** Compact number: 1.2K / 3.4M / 5.6B / 7.8T. */
    compact(n) {
      const num = toNumber(n);
      const abs = Math.abs(num);
      const sign = num < 0 ? '-' : '';
      const v = Math.abs(num);
      if (abs >= 1e12) return `${sign}${(v / 1e12).toFixed(1).replace(/\.0$/, '')}T`;
      if (abs >= 1e9)  return `${sign}${(v / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
      if (abs >= 1e6)  return `${sign}${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
      if (abs >= 1e3)  return `${sign}${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
      return String(num);
    },

    /** Percentage: 0.42 → "42%". */
    percent(n, decimals = 0) {
      return `${(toNumber(n) * 100).toFixed(Math.max(0, Math.floor(decimals)))}%`;
    },

    /** Percentage when input is already 0–100: 42 → "42%". */
    percentRaw(n, decimals = 0) {
      return `${toNumber(n).toFixed(Math.max(0, Math.floor(decimals)))}%`;
    },

    /** Human-readable byte size. */
    bytes(bytes, decimals = 1) {
      const n = Math.abs(toNumber(bytes));
      if (n === 0) return '0 B';
      const i = Math.min(SIZE_UNITS.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
      const value = n / Math.pow(1024, i);
      return `${value.toFixed(i === 0 ? 0 : decimals)} ${SIZE_UNITS[i]}`;
    },

    /** Alias: fileSize === bytes. */
    fileSize(bytes, decimals = 1) {
      return numberFmt.bytes(bytes, decimals);
    },

    /** Rate formatter, e.g. "1.2 MB/s". */
    bytesRate(bytes, seconds, decimals = 1) {
      const secs = Math.max(1, toNumber(seconds));
      return `${numberFmt.bytes(toNumber(bytes) / secs, decimals)}/s`;
    },

    /** Ordinal: 1 → "1st", 22 → "22nd". */
    ordinal(n) {
      const num = Math.floor(toNumber(n));
      const abs = Math.abs(num) % 100;
      if (abs >= 11 && abs <= 13) return `${num}th`;
      return `${num}${ORDINAL_SUFFIXES[Math.abs(num) % 10] ?? 'th'}`;
    },

    /** Roman numeral for 1–3999. */
    roman(n) {
      const num = Math.floor(toNumber(n));
      if (num <= 0 || num > 3999) return String(num);
      const table = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
      ];
      let out = '';
      let rest = num;
      for (const [v, s] of table) {
        while (rest >= v) { out += s; rest -= v; }
      }
      return out;
    },

    /**
     * Signed display: 5 → "+5", -3 → "−3".
     */
    signed(n, { plus = '+', minus = '−', zero = '' } = {}) {
      const num = toNumber(n);
      if (num > 0) return `${plus}${num}`;
      if (num < 0) return `${minus}${Math.abs(num)}`;
      return zero;
    },

    /**
     * Signed percentage: 0.12 → "+12%", -0.03 → "−3%".
     */
    signedPercent(n, decimals = 0) {
      const num = toNumber(n) * 100;
      const sign = num > 0 ? '+' : num < 0 ? '−' : '';
      return `${sign}${Math.abs(num).toFixed(decimals)}%`;
    },

    /**
     * Direction label for a delta value.
     * @returns {'up'|'down'|'flat'}
     */
    trendDirection(delta) {
      const d = toNumber(delta);
      if (d > 0) return 'up';
      if (d < 0) return 'down';
      return 'flat';
    },

    /**
     * Arrow + value: "↑ 12%", "↓ 3%", "→ 0%".
     * @param {number} current
     * @param {number} [previous]
     * @param {object} [opts]
     */
    trendLabel(current, previous, { decimals = 1, unit = '%' } = {}) {
      const cur = toNumber(current);
      const prev = toNumber(previous);
      if (prev === 0) return '—';
      const pct = ((cur - prev) / prev) * 100;
      const dir = pct > 0 ? '↑' : pct < 0 ? '↓' : '→';
      return `${dir} ${Math.abs(pct).toFixed(decimals)}${unit}`;
    },

    /**
     * Absolute delta between two numbers: "12", "−5".
     */
    delta(current, previous, { decimals = 0, signed: withSign = true } = {}) {
      const cur = toNumber(current);
      const prev = toNumber(previous);
      const d = cur - prev;
      const s = d.toFixed(decimals);
      if (!withSign) return s;
      return d > 0 ? `+${s}` : d < 0 ? `−${Math.abs(Number(s))}` : s;
    },

    /**
     * Percentage delta between two numbers (as a fraction).
     * @returns {number} — 0.12 for +12%
     */
    deltaPercent(current, previous) {
      const prev = toNumber(previous);
      if (prev === 0) return 0;
      return (toNumber(current) - prev) / prev;
    },
  };

  /* ============================================================
     §7. Number parsing
     ============================================================ */

  const numberParse = {
    /**
     * Parse a formatted number string back to a number.
     * Handles "1,234.56", "1.2K", "$3.4M", "12%", etc.
     * @returns {number} — NaN if unparseable
     * @example parseNumber('1.2K') // 1200
     */
    parseNumber(str) {
      const s = toStr(str).trim();
      if (!s) return NaN;
      // Strip currency, whitespace, and thousands separators.
      let cleaned = s.replace(/[^\d.eE+\-KMBTkmbt%]/g, '');
      let mult = 1;
      if (/[Kk]$/.test(cleaned)) { mult = 1e3; cleaned = cleaned.slice(0, -1); }
      else if (/[Mm]$/.test(cleaned)) { mult = 1e6; cleaned = cleaned.slice(0, -1); }
      else if (/[Bb]$/.test(cleaned)) { mult = 1e9; cleaned = cleaned.slice(0, -1); }
      else if (/[Tt]$/.test(cleaned)) { mult = 1e12; cleaned = cleaned.slice(0, -1); }
      if (/%$/.test(cleaned)) { mult = 0.01; cleaned = cleaned.slice(0, -1); }
      const n = Number(cleaned);
      return Number.isFinite(n) ? n * mult : NaN;
    },

    /**
     * Parse a byte-size string back to bytes.
     * @example parseBytes('1.2 MB') // 1258291
     */
    parseBytes(str) {
      const s = toStr(str).trim();
      const m = s.match(/^([\d.]+)\s*(B|KB|MB|GB|TB|PB)$/i);
      if (!m) return NaN;
      const value = Number(m[1]);
      const unit = m[2].toUpperCase();
      const idx = SIZE_UNITS.indexOf(unit);
      if (idx < 0 || !Number.isFinite(value)) return NaN;
      return value * Math.pow(1024, idx);
    },

    /**
     * Parse a duration string to minutes.
     * Understands "1h 30m", "90min", "1.5h", "150 minutes".
     * @returns {number} minutes, or NaN if unparseable
     * @example parseDuration('1h 30m') // 90
     */
    parseDuration(str) {
      const s = toStr(str).trim().toLowerCase();
      if (!s) return NaN;
      if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
      const h = s.match(/(\d+(?:\.\d+)?)\s*h/);
      const m = s.match(/(\d+(?:\.\d+)?)\s*m(?:in)?/);
      const sec = s.match(/(\d+(?:\.\d+)?)\s*s(?:ec)?/);
      if (!h && !m && !sec) return NaN;
      return (h ? Number(h[1]) * 60 : 0)
           + (m ? Number(m[1]) : 0)
           + (sec ? Number(sec[1]) / 60 : 0);
    },

    /**
     * Parse a boolean-ish string.
     * @returns {boolean|null} — null if ambiguous
     */
    parseBool(v) {
      if (typeof v === 'boolean') return v;
      const s = toStr(v).trim().toLowerCase();
      if (['true', 'yes', 'on', '1'].includes(s)) return true;
      if (['false', 'no', 'off', '0'].includes(s)) return false;
      return null;
    },
  };

  /* ============================================================
     §8. Math & statistics
     ============================================================ */

  const mathOps = {
    /** Clamp a number. */
    clamp(n, min, max) {
      return Math.min(max, Math.max(min, toNumber(n)));
    },

    /** Linear interpolation. */
    lerp(a, b, t) {
      const num = toNumber(t);
      return toNumber(a) + (toNumber(b) - toNumber(a)) * num;
    },

    /** Round to n decimals. */
    round(n, d = 0) {
      const f = Math.pow(10, d);
      return Math.round(toNumber(n) * f) / f;
    },

    /** Random integer in [min, max]. */
    randomInt(min, max) {
      const lo = Math.ceil(toNumber(min));
      const hi = Math.floor(toNumber(max));
      return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    },

    /** Range array: range(1, 5) → [1,2,3,4]. */
    range(start, end, step = 1) {
      const s = toNumber(start);
      const e = end === undefined ? s : toNumber(end);
      const [from, to] = end === undefined ? [0, s] : [s, e];
      const st = step === 0 ? 1 : toNumber(step);
      const out = [];
      if (st > 0) for (let i = from; i < to; i += st) out.push(i);
      else for (let i = from; i > to; i += st) out.push(i);
      return out;
    },

    sum(arr) { return toArr(arr).reduce((a, b) => a + toNumber(b), 0); },

    avg(arr) {
      const a = toArr(arr);
      return a.length === 0 ? 0 : mathOps.sum(a) / a.length;
    },

    median(arr) {
      const a = [...toArr(arr)].map(toNumber).sort((x, y) => x - y);
      if (a.length === 0) return 0;
      const mid = Math.floor(a.length / 2);
      return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
    },

    /** Largest value in an array (or -Infinity for empty). */
    max(arr) {
      const a = toArr(arr);
      return a.length === 0 ? -Infinity : Math.max(...a.map(toNumber));
    },

    /** Smallest value in an array (or +Infinity for empty). */
    min(arr) {
      const a = toArr(arr);
      return a.length === 0 ? Infinity : Math.min(...a.map(toNumber));
    },

    /** True when the string/number parses to a finite number. */
    isNumeric(v) {
      if (typeof v === 'number') return Number.isFinite(v);
      const s = toStr(v).trim();
      return s !== '' && Number.isFinite(Number(s));
    },
  };

  /* ============================================================
     §9. Date formatting
     ============================================================ */

  const dateFmt = {
    /** Format a date with a named preset. */
    date(d, style = 'short') {
      const date = toDate(d);
      if (!date) return '';
      return date.toLocaleDateString('en-US', DATE_PRESETS[style] ?? DATE_PRESETS.short);
    },

    /** Full datetime string. */
    datetime(d) {
      return dateFmt.date(d, 'medium');
    },

    /** Time-only string. */
    time(d) {
      return dateFmt.date(d, 'time');
    },

    /**
     * Date range: "Jan 1 – Jan 5, 2025" (year collapses if same).
     */
    dateRange(a, b) {
      const da = toDate(a);
      const db = toDate(b);
      if (!da) return db ? dateFmt.date(db) : '';
      if (!db) return dateFmt.date(da);
      const sameYear = da.getFullYear() === db.getFullYear();
      const left = da.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' }),
      });
      const right = db.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
      return `${left} – ${right}`;
    },

    /** Relative past time: "3m ago", "2d ago". */
    relativeTime(d) {
      const date = toDate(d);
      if (!date) return '';
      const sec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (sec < 45) return 'just now';
      if (sec < 90) return '1m ago';
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min}m ago`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr}h ago`;
      const day = Math.floor(hr / 24);
      if (day < 7) return `${day}d ago`;
      const wk = Math.floor(day / 7);
      if (wk < 5) return `${wk}w ago`;
      const mo = Math.floor(day / 30);
      if (mo < 12) return `${mo}mo ago`;
      return `${Math.floor(day / 365)}y ago`;
    },

    /** Relative future time: "in 3d". */
    relativeFuture(d) {
      const date = toDate(d);
      if (!date) return '';
      const diff = date.getTime() - Date.now();
      if (diff < 0) return dateFmt.relativeTime(date);
      const sec = Math.floor(diff / 1000);
      if (sec < 60) return 'in a moment';
      const min = Math.floor(sec / 60);
      if (min < 60) return `in ${min}m`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `in ${hr}h`;
      const day = Math.floor(hr / 24);
      if (day < 7) return `in ${day}d`;
      const wk = Math.floor(day / 7);
      if (wk < 5) return `in ${wk}w`;
      const mo = Math.floor(day / 30);
      if (mo < 12) return `in ${mo}mo`;
      return `in ${Math.floor(day / 365)}y`;
    },

    /** Smart calendar label. */
    calendarLabel(d) {
      if (dateFmt.isToday(d)) return 'Today';
      if (dateFmt.isYesterday(d)) return 'Yesterday';
      if (dateFmt.isTomorrow(d)) return 'Tomorrow';
      return dateFmt.date(d, 'short');
    },

    /** ISO date (YYYY-MM-DD). */
    isoDate(d) {
      const date = toDate(d);
      return date ? date.toISOString().slice(0, 10) : '';
    },

    /** Full ISO timestamp. */
    iso(d) {
      const date = toDate(d);
      return date ? date.toISOString() : '';
    },

    /** ISO week number (1–53). */
    weekNumber(d) {
      const date = toDate(d);
      if (!date) return 0;
      const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      return Math.ceil((((tmp - yearStart) / MS.DAY) + 1) / 7);
    },

    /** Day of year (1–366). */
    dayOfYear(d) {
      const date = toDate(d);
      if (!date) return 0;
      const start = new Date(date.getFullYear(), 0, 0);
      return Math.floor((date - start) / MS.DAY);
    },

    /** Quarter (1–4). */
    quarter(d) {
      const date = toDate(d);
      return date ? Math.floor(date.getMonth() / 3) + 1 : 0;
    },

    /** "Q1 2025" */
    quarterLabel(d) {
      const date = toDate(d);
      if (!date) return '';
      return `Q${dateFmt.quarter(date)} ${date.getFullYear()}`;
    },

    /** Age in whole years from a birthdate. */
    age(birth) {
      const b = toDate(birth);
      if (!b) return 0;
      const now = new Date();
      let years = now.getFullYear() - b.getFullYear();
      const m = now.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
      return Math.max(0, years);
    },
  };

  /* ============================================================
     §10. Date parsing & comparison
     ============================================================ */

  const dateParse = {
    /** True if `d` is today (local time). */
    isToday(d) {
      const date = toDate(d);
      if (!date) return false;
      return date.toDateString() === new Date().toDateString();
    },

    isYesterday(d) {
      const date = toDate(d);
      if (!date) return false;
      return date.toDateString() === new Date(Date.now() - MS.DAY).toDateString();
    },

    isTomorrow(d) {
      const date = toDate(d);
      if (!date) return false;
      return date.toDateString() === new Date(Date.now() + MS.DAY).toDateString();
    },

    isPast(d) {
      const date = toDate(d);
      return !!date && date.getTime() < Date.now();
    },

    isFuture(d) {
      const date = toDate(d);
      return !!date && date.getTime() > Date.now();
    },

    isWeekend(d) {
      const date = toDate(d);
      return !!date && [0, 6].includes(date.getDay());
    },

    /** Same calendar day (local time). */
    sameDay(a, b) {
      const da = toDate(a); const db = toDate(b);
      return !!da && !!db && da.toDateString() === db.toDateString();
    },

    /** Same year + month. */
    sameMonth(a, b) {
      const da = toDate(a); const db = toDate(b);
      return !!da && !!db &&
        da.getFullYear() === db.getFullYear() &&
        da.getMonth() === db.getMonth();
    },

    /** Same calendar year. */
    sameYear(a, b) {
      const da = toDate(a); const db = toDate(b);
      return !!da && !!db && da.getFullYear() === db.getFullYear();
    },

    /**
     * Signed difference in days: b − a (rounded).
     * Use `addDays(a, daysBetween(a,b))` to reconstruct b.
     */
    daysBetween(a, b) {
      const da = toDate(a); const db = toDate(b);
      if (!da || !db) return 0;
      return Math.round((db - da) / MS.DAY);
    },

    /** Hours between two dates (b − a, floored). */
    hoursBetween(a, b) {
      const da = toDate(a); const db = toDate(b);
      if (!da || !db) return 0;
      return Math.floor((db - da) / MS.HOUR);
    },

    /** Minutes between two dates (b − a, floored). */
    minutesBetween(a, b) {
      const da = toDate(a); const db = toDate(b);
      if (!da || !db) return 0;
      return Math.floor((db - da) / MS.MINUTE);
    },
  };

  /* ============================================================
     §11. Date arithmetic
     ============================================================ */

  const dateArith = {
    /** Midnight (local) of the given day. */
    startOfDay(d) {
      const date = toDate(d);
      if (!date) return null;
      const out = new Date(date);
      out.setHours(0, 0, 0, 0);
      return out;
    },

    /** 23:59:59.999 (local) of the given day. */
    endOfDay(d) {
      const date = toDate(d);
      if (!date) return null;
      const out = new Date(date);
      out.setHours(23, 59, 59, 999);
      return out;
    },

    /**
     * First day of the week.
     * @param {0|1|2|3|4|5|6} [weekStartsOn=0] — Sunday default
     */
    startOfWeek(d, weekStartsOn = 0) {
      const date = toDate(d);
      if (!date) return null;
      const out = new Date(date);
      out.setHours(0, 0, 0, 0);
      const diff = (out.getDay() - weekStartsOn + 7) % 7;
      out.setDate(out.getDate() - diff);
      return out;
    },

    endOfWeek(d, weekStartsOn = 0) {
      const start = dateArith.startOfWeek(d, weekStartsOn);
      if (!start) return null;
      const out = new Date(start);
      out.setDate(out.getDate() + 6);
      out.setHours(23, 59, 59, 999);
      return out;
    },

    startOfMonth(d) {
      const date = toDate(d);
      if (!date) return null;
      return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    },

    endOfMonth(d) {
      const date = toDate(d);
      if (!date) return null;
      return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    },

    startOfYear(d) {
      const date = toDate(d);
      if (!date) return null;
      return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
    },

    endOfYear(d) {
      const date = toDate(d);
      if (!date) return null;
      return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
    },

    /** Add/subtract days. */
    addDays(d, n) {
      const date = toDate(d);
      return date ? new Date(date.getTime() + toNumber(n) * MS.DAY) : null;
    },

    /** Add/subtract hours. */
    addHours(d, n) {
      const date = toDate(d);
      return date ? new Date(date.getTime() + toNumber(n) * MS.HOUR) : null;
    },

    /** Add/subtract minutes. */
    addMinutes(d, n) {
      const date = toDate(d);
      return date ? new Date(date.getTime() + toNumber(n) * MS.MINUTE) : null;
    },

    /** Add/subtract months (day-clamped). */
    addMonths(d, n) {
      const date = toDate(d);
      if (!date) return null;
      const out = new Date(date);
      const targetDay = out.getDate();
      out.setDate(1);
      out.setMonth(out.getMonth() + toNumber(n));
      const days = dateArith.daysInMonth(out);
      out.setDate(Math.min(targetDay, days));
      return out;
    },

    /** Add/subtract years. */
    addYears(d, n) {
      return dateArith.addMonths(d, toNumber(n) * 12);
    },

    /** Days in the month containing `d`. */
    daysInMonth(d) {
      const date = toDate(d);
      if (!date) return 0;
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    },

    /** True if `d`'s year is a leap year. */
    isLeapYear(d) {
      const date = toDate(d);
      if (!date) return false;
      const y = date.getFullYear();
      return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    },

    /**
     * Parse an input-style date string.
     * Accepts YYYY-MM-DD, YYYY-MM-DDTHH:mm[:ss],
     * and "MM/DD/YYYY" as a fallback.
     * @returns {Date|null}
     */
    parseDate(input) {
      if (!input) return null;
      if (input instanceof Date) return input;
      const s = String(input).trim();

      // ISO date or datetime
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return toDate(s);

      // Slash-separated: MM/DD/YYYY or DD/MM/YYYY (US-first default)
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (m) {
        const [, a, b, y] = m;
        const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);
        return new Date(year, Number(a) - 1, Number(b));
      }

      return toDate(s);
    },
  };

  /* ============================================================
     §12. Duration & intervals
     ============================================================ */

  const durationOps = {
    /** Human duration from milliseconds: "1h 20m". */
    humanDuration(ms) {
      const total = Math.max(0, toNumber(ms));
      const sec = Math.floor(total / 1000);
      if (sec < 60) return `${sec}s`;
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min}m`;
      const hr = Math.floor(min / 60);
      const remM = min % 60;
      if (hr < 24) return remM ? `${hr}h ${remM}m` : `${hr}h`;
      const day = Math.floor(hr / 24);
      const remH = hr % 24;
      return remH ? `${day}d ${remH}h` : `${day}d`;
    },

    /** Human duration from *minutes*: "1h 30m". */
    duration(minutes) {
      const m = Math.max(0, Math.floor(toNumber(minutes)));
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem ? `${h}h ${rem}m` : `${h}h`;
    },

    /** Compact duration from minutes: "1h30m", "45m". */
    durationCompact(minutes) {
      const m = Math.max(0, Math.floor(toNumber(minutes)));
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem ? `${h}h${rem}m` : `${h}h`;
    },

    /** Clock format: 1500s → "25:00". */
    clock(seconds, { pad = true, hours = false } = {}) {
      const s = Math.max(0, Math.floor(toNumber(seconds)));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const p = (n) => (pad ? String(n).padStart(2, '0') : String(n));
      return hours || h > 0
        ? `${p(h)}:${p(m)}:${p(sec)}`
        : `${p(m)}:${p(sec)}`;
    },
  };

  /* ============================================================
     §13. Color
     ============================================================ */

  const colorOps = {
    /** "#6366f1" → { r, g, b }. Returns null on invalid input. */
    hexToRgb(hex) {
      const s = toStr(hex).replace(/^#/, '');
      if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(s)) return null;
      const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
      return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16),
      };
    },

    /** { r, g, b } → "#6366f1". */
    rgbToHex(rgb) {
      const c = (n) => mathOps.clamp(Math.round(toNumber(n)), 0, 255).toString(16).padStart(2, '0');
      return `#${c(rgb?.r)}${c(rgb?.g)}${c(rgb?.b)}`;
    },

    /** "#6366f1", 0.4 → "rgba(99,102,241,0.4)". */
    addAlpha(hex, alpha = 1) {
      const rgb = colorOps.hexToRgb(hex);
      if (!rgb) return hex;
      return `rgba(${rgb.r},${rgb.g},${rgb.b},${mathOps.clamp(alpha, 0, 1)})`;
    },

    /** Perceived luminance (0–1). */
    luminance(hex) {
      const rgb = colorOps.hexToRgb(hex);
      if (!rgb) return 0;
      const channel = (c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
    },

    /** Return "#fff" or "#111" for best contrast on `hex`. */
    contrastColor(hex) {
      return colorOps.luminance(hex) > 0.5 ? '#111827' : '#ffffff';
    },

    /** Blend two hex colors. `t = 0` → a, `t = 1` → b. */
    mix(hexA, hexB, t = 0.5) {
      const A = colorOps.hexToRgb(hexA);
      const B = colorOps.hexToRgb(hexB);
      if (!A || !B) return hexA;
      const amt = mathOps.clamp(toNumber(t), 0, 1);
      return colorOps.rgbToHex({
        r: A.r + (B.r - A.r) * amt,
        g: A.g + (B.g - A.g) * amt,
        b: A.b + (B.b - A.b) * amt,
      });
    },

    /** Blend toward white by `amount` (0..1). */
    lighten(hex, amount = 0.1) {
      return colorOps.mix(hex, '#ffffff', amount);
    },

    /** Blend toward black by `amount` (0..1). */
    darken(hex, amount = 0.1) {
      return colorOps.mix(hex, '#000000', amount);
    },
  };

  /* ============================================================
     §14. Safe access & flow control
     ============================================================ */

  const accessOps = {
    /**
     * Safe deep access by dot/bracket path.
     * @example get({ a:{ b:{ c: 1 } } }, 'a.b.c') // 1
     */
    get(obj, path, fallback) {
      if (obj == null) return fallback;
      const parts = Array.isArray(path) ? path : String(path).split('.');
      let cur = obj;
      for (const p of parts) {
        if (cur == null) return fallback;
        cur = cur[p];
      }
      return cur === undefined ? fallback : cur;
    },

    /** First item of an array, or fallback. */
    first(arr, fallback) {
      const a = toArr(arr);
      return a.length ? a[0] : fallback;
    },

    /** Last item of an array, or fallback. */
    last(arr, fallback) {
      const a = toArr(arr);
      return a.length ? a[a.length - 1] : fallback;
    },

    /** First non-null/undefined value. Like `??` but variadic. */
    coalesce(...values) {
      for (const v of values) if (v !== null && v !== undefined) return v;
      return undefined;
    },

    /** First non-blank value. */
    fallback(...values) {
      for (const v of values) if (!isBlank(v)) return v;
      return undefined;
    },

    /** Ternary shorthand: `tern(cond, yes, no)`. */
    tern(cond, yes, no) {
      return cond ? yes : no;
    },

    /** Return `value` if `cond` is truthy, else undefined. */
    when(cond, value) {
      return cond ? value : undefined;
    },

    /** Pipe a value through a series of unary functions. */
    pipe(value, ...fns) {
      return fns.reduce((v, fn) => (typeof fn === 'function' ? fn(v) : v), value);
    },

    /** True if value is null / undefined / blank string / NaN. */
    isBlank(v) {
      return isBlank(v);
    },

    /** Inverse of `isBlank`. */
    isPresent(v) {
      return !isBlank(v);
    },
  };

  /* ============================================================
     §15. Comparators & sorting
     ============================================================ */

  const compareOps = {
    /**
     * Locale-aware string compare. Suitable for `Array.sort`.
     * @example ['b','A','c'].sort(byString) // ['A','b','c']
     */
    byString(getter, { desc = false } = {}) {
      const fn = typeof getter === 'function' ? getter : (x) => accessOps.get(x, getter);
      const sign = desc ? -1 : 1;
      return (a, b) => sign * COLLATOR.compare(toStr(fn(a)), toStr(fn(b)));
    },

    /** Numeric ascending/descending compare. */
    byNumber(getter, { desc = false } = {}) {
      const fn = typeof getter === 'function' ? getter : (x) => accessOps.get(x, getter);
      const sign = desc ? -1 : 1;
      return (a, b) => {
        const av = toNumber(fn(a));
        const bv = toNumber(fn(b));
        return sign * (av - bv);
      };
    },

    /** Date ascending/descending compare. */
    byDate(getter, { desc = false } = {}) {
      const fn = typeof getter === 'function' ? getter : (x) => accessOps.get(x, getter);
      const sign = desc ? -1 : 1;
      return (a, b) => {
        const av = toDate(fn(a))?.getTime() ?? 0;
        const bv = toDate(fn(b))?.getTime() ?? 0;
        return sign * (av - bv);
      };
    },

    /** Boolean compare — `true` sorts before `false` by default. */
    byBool(getter, { desc = false } = {}) {
      const fn = typeof getter === 'function' ? getter : (x) => accessOps.get(x, getter);
      const sign = desc ? -1 : 1;
      return (a, b) => sign * (Number(Boolean(fn(a))) - Number(Boolean(fn(b))));
    },

    /**
     * Compose multiple comparators (stable sort).
     * @example [byString('name'), byNumber('age', { desc: true })]
     */
    compose(...comparators) {
      const list = comparators.filter((c) => typeof c === 'function');
      return (a, b) => {
        for (const cmp of list) {
          const r = cmp(a, b);
          if (r !== 0) return r;
        }
        return 0;
      };
    },
  };

  /* ============================================================
     §16. Input value formatters
     ============================================================ */

  const inputOps = {
    /**
     * Value for `<input type="date">`.
     * @returns {string} "YYYY-MM-DD"
     */
    dateValue(d) {
      const date = toDate(d);
      if (!date) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },

    /**
     * Value for `<input type="time">`.
     * @returns {string} "HH:mm"
     */
    timeValue(d, { seconds = false } = {}) {
      const date = toDate(d);
      if (!date) return '';
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');
      return seconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
    },

    /**
     * Value for `<input type="datetime-local">`.
     * @returns {string} "YYYY-MM-DDTHH:mm"
     */
    datetimeLocalValue(d, { seconds = false } = {}) {
      const date = toDate(d);
      if (!date) return '';
      const sep = 'T';
      return `${inputOps.dateValue(date)}${sep}${inputOps.timeValue(date, { seconds })}`;
    },

    /**
     * Value for `<input type="month">`.
     * @returns {string} "YYYY-MM"
     */
    monthValue(d) {
      const date = toDate(d);
      if (!date) return '';
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    },

    /**
     * Value for `<input type="week">`.
     * @returns {string} "YYYY-Www"
     */
    weekValue(d) {
      const date = toDate(d);
      if (!date) return '';
      const y = date.getFullYear();
      const w = String(dateFmt.weekNumber(date)).padStart(2, '0');
      return `${y}-W${w}`;
    },

    /**
     * US-style phone: "(415) 555-0199".
     * Non-US numbers are returned with their digits grouped loosely.
     */
    phone(phone, { country = 'us' } = {}) {
      const digits = toStr(phone).replace(/\D/g, '');
      if (country === 'us') {
        if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        return toStr(phone);
      }
      return toStr(phone);
    },

    /**
     * Credit card number in 4-digit groups: "4242 4242 4242 4242".
     */
    cardNumber(value) {
      const digits = toStr(value).replace(/\D/g, '');
      return digits.replace(/(.{4})/g, '$1 ').trim();
    },

    /**
     * SSN: "123-45-6789".
     */
    ssn(value) {
      const d = toStr(value).replace(/\D/g, '');
      if (d.length !== 9) return toStr(value);
      return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    },

    /**
     * US ZIP: "94103" or "94103-1234".
     */
    zip(value) {
      const d = toStr(value).replace(/\D/g, '');
      if (d.length === 5) return d;
      if (d.length === 9) return `${d.slice(0, 5)}-${d.slice(5)}`;
      return toStr(value);
    },
  };

  /* ============================================================
     §17. Misc utilities
     ============================================================ */

  const miscOps = {
    /** Star rating as HTML (filled + empty spans). */
    stars(rating, max = 5) {
      const r = Math.round(toNumber(rating));
      return Array.from({ length: max }, (_, i) =>
        i < r ? '★' : '<span class="empty">★</span>',
      ).join('');
    },

    /** Star rating with half-star support. */
    starsHalf(rating, max = 5) {
      const r = toNumber(rating);
      return Array.from({ length: max }, (_, i) => {
        const pos = i + 1;
        if (r >= pos) return '★';
        if (r >= pos - 0.5) return '<span class="half">★</span>';
        return '<span class="empty">★</span>';
      }).join('');
    },

    /** Pluralize based on count. */
    pluralize(n, singular, plural) {
      return n === 1 ? singular : (plural ?? `${singular}s`);
    },

    /** Pluralize + prefix count: "3 courses". */
    count(n, singular, plural) {
      const num = toNumber(n);
      return `${numberFmt.number(num)} ${miscOps.pluralize(num, singular, plural)}`;
    },

    /** Compact UID. */
    uid(prefix = 'id') {
      const rand = Math.random().toString(36).slice(2, 10);
      const t = Date.now().toString(36);
      return `${prefix}-${t}-${rand}`;
    },

    /** Deterministic 32-bit string hash (djb2 variant). */
    hash(str) {
      let h = 5381;
      const s = toStr(str);
      for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
      return (h >>> 0).toString(36);
    },

    /** Same as `initials` — kept for semantic clarity. */
    initialsFrom(name) {
      return stringOps.initials(name);
    },

    /** "First Last" → "Last, First". */
    lastNameFirst(name) {
      const parts = toStr(name).trim().split(/\s+/).filter(Boolean);
      if (parts.length < 2) return parts[0] ?? '';
      const last = parts.pop();
      return `${last}, ${parts.join(' ')}`;
    },

    /** Wrap in typographic quotes by default. */
    quote(str, open = '“', close = '”') {
      return `${open}${toStr(str)}${close}`;
    },

    /** Append "…" if not present. */
    withEllipsis(str, n = 0) {
      const s = n > 0 ? stringOps.truncate(str, n) : toStr(str);
      return s.endsWith('…') ? s : `${s}…`;
    },

    /** Safe toString for arbitrary values. */
    stringify(v) {
      if (v === null) return 'null';
      if (v === undefined) return 'undefined';
      if (typeof v === 'string') return v;
      if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
      if (v instanceof Date) return dateFmt.iso(v);
      try { return JSON.stringify(v); }
      catch { return String(v); }
    },

    /** Truncate data URIs for logging. */
    logSafe(str, n = 40) {
      const s = toStr(str);
      return s.startsWith('data:') ? `${s.slice(0, n)}…(${s.length} chars)` : s;
    },

    /** Truthiness check with explicit strings. */
    truthy(v) {
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (['', '0', 'false', 'no', 'off', 'null', 'undefined', 'nan'].includes(s)) return false;
      }
      return Boolean(v);
    },

    /**
     * Build a CSV row string from an array of cell values.
     * Properly quotes values that contain commas, quotes, or newlines.
     */
    csvRow(cells, { delimiter = ',', quote = '"' } = {}) {
      return toArr(cells).map((v) => {
        const s = toStr(v);
        if (s.includes(delimiter) || s.includes(quote) || /[\r\n]/.test(s)) {
          return `${quote}${s.split(quote).join(quote + quote)}${quote}`;
        }
        return s;
      }).join(delimiter);
    },
  };

  /* ============================================================
     §18. Public API — one frozen surface
     ============================================================ */

  const format = Object.freeze({
    /* §2  — String manipulation */
    escapeHtml:      stringOps.escapeHtml,
    escapeAttr:      stringOps.escapeAttr,
    unescapeHtml:    stringOps.unescapeHtml,
    stripHtml:       stringOps.stripHtml,
    striptags:       stringOps.striptags,
    escapeJs:        stringOps.escapeJs,
    escapeMarkdown:  stringOps.escapeMarkdown,
    escapeRegex:     stringOps.escapeRegex,
    regexEscape:     stringOps.regexEscape,
    escapeCss:       stringOps.escapeCss,
    truncate:        stringOps.truncate,
    truncateMiddle:  stringOps.truncateMiddle,
    truncateWords:   stringOps.truncateWords,
    truncateHtml:    stringOps.truncateHtml,
    slugify:         stringOps.slugify,
    deburr:          stringOps.deburr,
    removeAccents:   stringOps.removeAccents,
    normalize:       stringOps.normalize,
    initials:        stringOps.initials,
    capitalize:      stringOps.capitalize,
    titleCase:       stringOps.titleCase,
    sentenceCase:    stringOps.sentenceCase,
    camelCase:       stringOps.camelCase,
    pascalCase:      stringOps.pascalCase,
    kebabCase:       stringOps.kebabCase,
    snakeCase:       stringOps.snakeCase,
    constantCase:    stringOps.constantCase,
    repeat:          stringOps.repeat,
    pad:             stringOps.pad,
    padCenter:       stringOps.padCenter,
    zpad:            stringOps.zpad,
    trimChars:       stringOps.trimChars,
    trimStartChars:  stringOps.trimStartChars,
    trimEndChars:    stringOps.trimEndChars,
    wrap:            stringOps.wrap,
    prefix:          stringOps.prefix,
    suffix:          stringOps.suffix,
    replaceAll:      stringOps.replaceAll,
    split:           stringOps.split,
    contains:        stringOps.contains,
    listJoin:        stringOps.listJoin,
    reverse:         stringOps.reverse,
    wordCount:       stringOps.wordCount,
    readTime:        stringOps.readTime,
    possessive:      stringOps.possessive,
    article:         stringOps.article,
    highlight:       stringOps.highlight,

    /* §5  — Masking */
    maskEmail:       maskingOps.maskEmail,
    maskPhone:       maskingOps.maskPhone,
    maskStart:       maskingOps.maskStart,
    maskEnd:         maskingOps.maskEnd,
    mask:            maskingOps.mask,
    hiddenText:      maskingOps.hiddenText,

    /* §6  — Number formatting */
    number:          numberFmt.number,
    fixed:           numberFmt.fixed,
    currency:        numberFmt.currency,
    currencyCompact: numberFmt.currencyCompact,
    compact:         numberFmt.compact,
    percent:         numberFmt.percent,
    percentRaw:      numberFmt.percentRaw,
    bytes:           numberFmt.bytes,
    fileSize:        numberFmt.fileSize,
    bytesRate:       numberFmt.bytesRate,
    ordinal:         numberFmt.ordinal,
    roman:           numberFmt.roman,
    signed:          numberFmt.signed,
    signedPercent:   numberFmt.signedPercent,
    trendDirection:  numberFmt.trendDirection,
    trendLabel:      numberFmt.trendLabel,
    delta:           numberFmt.delta,
    deltaPercent:    numberFmt.deltaPercent,

    /* §7  — Number parsing */
    parseNumber:     numberParse.parseNumber,
    parseBytes:      numberParse.parseBytes,
    parseDuration:   numberParse.parseDuration,
    parseBool:       numberParse.parseBool,

    /* §8  — Math */
    clamp:           mathOps.clamp,
    lerp:            mathOps.lerp,
    round:           mathOps.round,
    randomInt:       mathOps.randomInt,
    range:           mathOps.range,
    sum:             mathOps.sum,
    avg:             mathOps.avg,
    median:          mathOps.median,
    max:             mathOps.max,
    min:             mathOps.min,
    isNumeric:       mathOps.isNumeric,

    /* §9  — Date formatting */
    date:            dateFmt.date,
    datetime:        dateFmt.datetime,
    time:            dateFmt.time,
    dateRange:       dateFmt.dateRange,
    relativeTime:    dateFmt.relativeTime,
    relativeFuture:  dateFmt.relativeFuture,
    calendarLabel:   dateFmt.calendarLabel,
    isoDate:         dateFmt.isoDate,
    iso:             dateFmt.iso,
    weekNumber:      dateFmt.weekNumber,
    dayOfYear:       dateFmt.dayOfYear,
    quarter:         dateFmt.quarter,
    quarterLabel:    dateFmt.quarterLabel,
    age:             dateFmt.age,

    /* §10 — Date parsing & comparison */
    isToday:         dateParse.isToday,
    isYesterday:     dateParse.isYesterday,
    isTomorrow:      dateParse.isTomorrow,
    isPast:          dateParse.isPast,
    isFuture:        dateParse.isFuture,
    isWeekend:       dateParse.isWeekend,
    sameDay:         dateParse.sameDay,
    sameMonth:       dateParse.sameMonth,
    sameYear:        dateParse.sameYear,
    daysBetween:     dateParse.daysBetween,
    hoursBetween:    dateParse.hoursBetween,
    minutesBetween:  dateParse.minutesBetween,

    /* §11 — Date arithmetic */
    startOfDay:      dateArith.startOfDay,
    endOfDay:        dateArith.endOfDay,
    startOfWeek:     dateArith.startOfWeek,
    endOfWeek:       dateArith.endOfWeek,
    startOfMonth:    dateArith.startOfMonth,
    endOfMonth:      dateArith.endOfMonth,
    startOfYear:     dateArith.startOfYear,
    endOfYear:       dateArith.endOfYear,
    addDays:         dateArith.addDays,
    addHours:        dateArith.addHours,
    addMinutes:      dateArith.addMinutes,
    addMonths:       dateArith.addMonths,
    addYears:        dateArith.addYears,
    daysInMonth:     dateArith.daysInMonth,
    isLeapYear:      dateArith.isLeapYear,
    parseDate:       dateArith.parseDate,

    /* §12 — Duration */
    humanDuration:   durationOps.humanDuration,
    duration:        durationOps.duration,
    durationCompact: durationOps.durationCompact,
    clock:           durationOps.clock,

    /* §13 — Color */
    hexToRgb:        colorOps.hexToRgb,
    rgbToHex:        colorOps.rgbToHex,
    addAlpha:        colorOps.addAlpha,
    luminance:       colorOps.luminance,
    contrastColor:   colorOps.contrastColor,
    mix:             colorOps.mix,
    lighten:         colorOps.lighten,
    darken:          colorOps.darken,

    /* §14 — Safe access & flow */
    get:             accessOps.get,
    first:           accessOps.first,
    last:            accessOps.last,
    coalesce:        accessOps.coalesce,
    fallback:        accessOps.fallback,
    tern:            accessOps.tern,
    when:            accessOps.when,
    pipe:            accessOps.pipe,
    isBlank:         accessOps.isBlank,
    isPresent:       accessOps.isPresent,

    /* §15 — Comparators */
    byString:        compareOps.byString,
    byNumber:        compareOps.byNumber,
    byDate:          compareOps.byDate,
    byBool:          compareOps.byBool,
    compose:         compareOps.compose,

    /* §16 — Input value formatters */
    dateValue:       inputOps.dateValue,
    timeValue:       inputOps.timeValue,
    datetimeLocalValue: inputOps.datetimeLocalValue,
    monthValue:      inputOps.monthValue,
    weekValue:       inputOps.weekValue,
    phone:           inputOps.phone,
    cardNumber:      inputOps.cardNumber,
    ssn:             inputOps.ssn,
    zip:             inputOps.zip,

    /* §17 — Misc */
    stars:           miscOps.stars,
    starsHalf:       miscOps.starsHalf,
    pluralize:       miscOps.pluralize,
    count:           miscOps.count,
    uid:             miscOps.uid,
    hash:            miscOps.hash,
    initialsFrom:    miscOps.initialsFrom,
    lastNameFirst:   miscOps.lastNameFirst,
    quote:           miscOps.quote,
    withEllipsis:    miscOps.withEllipsis,
    stringify:       miscOps.stringify,
    logSafe:         miscOps.logSafe,
    truthy:          miscOps.truthy,
    csvRow:          miscOps.csvRow,

    /* §18 — Exposed constants */
    PRESETS:         DATE_PRESETS,
    MS,
  });

  window.PublicUI.format = format;
})();