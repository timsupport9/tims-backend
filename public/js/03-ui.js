/* ============================================================
   ExpertHub 2.0 — 03-ui.js
   Theme, toast, loading overlay, modal plumbing, pagination bar,
   plus extended UI primitives (tooltips, dropdowns, tabs,
   accordions, drawers, wizards, shortcuts, clipboard, avatars,
   chips, timelines, progress, scroll utilities).
   ------------------------------------------------------------
   Layering contract:
     • Loaded third, after 01-state.js and 02-utils.js.
     • Declares ONLY globals — no ES modules, no imports.
     • Depends on the following earlier globals:
         $    (02-utils.js) — querySelector shortcut
         esc  (02-utils.js) — HTML escaping helper
     • Everything declared here is consumed by later modules
       (04-api.js … 15-router.js) and by 13-modals.js heavily.
   ------------------------------------------------------------
   Expansion notes (v3.0):
     • Theme engine: system preference, override, live OS tracking,
       theme cycling, accent palette, density and font scale.
     • Toast system: stacking limits, per-toast dismissal, progress
       bars, pause-on-hover, ARIA live, typed wrappers, grouping,
       optional audible cue.
     • Loading overlay: reference counting, progress mode, message
       updates, skeleton helpers, inline spinner, button busy.
     • Modal system: stacking, focus trapping, ESC handling,
       backdrop policy, size variants, lifecycle hooks.
     • Drawers/panels: left/right/bottom, backdrop policy, ESC.
     • Dropdown/popover/tooltip: positioning, outside-click,
       ESC close, arrow variants.
     • Tabs, accordions, wizards, timelines, chips, avatars.
     • Form helpers: validate feedback, inline field errors.
     • Table helpers: sortable headers, bulk selection, sticky.
     • Keyboard shortcuts registry, clipboard helpers, scroll
       lock, back-to-top, copy-to-clipboard.
     • Global error boundary surface for unhandled rejections.
   ============================================================ */

/* ---------- PRIVATE QUERY HELPERS ----------
   Intentionally private so this module keeps working even if a
   later module redefines a global shorthand. Do not call these
   from other files. */
const _uiAll = (sel, root) =>
  Array.prototype.slice.call((root || document).querySelectorAll(sel));
const _uiOne = (sel, root) => (root || document).querySelector(sel);
const _uiUid = (prefix) => (prefix || 'ui') + '-' + Math.random().toString(36).slice(2, 9);

/* ============================================================
   SECTION 1A — THEME ENGINE
   ============================================================ */

const THEME_STORAGE_KEY = 'theme';
const THEME_MODES = ['light', 'dark'];
const THEME_META_COLOR = { light: '#ffffff', dark: '#0f172a' };

const ACCENT_STORAGE_KEY = 'accent';
const ACCENTS = {
  blue:   { name: 'Ocean',   hex: '#2563eb' },
  violet: { name: 'Violet',  hex: '#7c3aed' },
  green:  { name: 'Emerald', hex: '#059669' },
  amber:  { name: 'Amber',   hex: '#d97706' },
  rose:   { name: 'Rose',    hex: '#e11d48' },
  slate:  { name: 'Slate',   hex: '#475569' },
};

const DENSITY_STORAGE_KEY = 'density';
const DENSITIES = ['comfortable', 'compact', 'spacious'];

const FONT_SCALE_STORAGE_KEY = 'fontScale';
const FONT_SCALES = [0.9, 1, 1.1, 1.2];

function uiSystemPrefersDark() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) { return false; }
}

function getStoredTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_MODES.indexOf(raw) !== -1 ? raw : null;
  } catch (e) { return null; }
}

function getActiveTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function resolvePreferredTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return uiSystemPrefersDark() ? 'dark' : 'light';
}

function uiSyncMetaThemeColor(mode) {
  const meta = _uiOne('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute('content', THEME_META_COLOR[mode] || THEME_META_COLOR.light);
}

function uiSyncThemeToggles(mode) {
  _uiAll('[data-theme-toggle]').forEach(btn => {
    btn.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    btn.setAttribute('title', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    const icon = _uiOne('i', btn);
    if (icon) {
      icon.classList.toggle('fa-moon', mode !== 'dark');
      icon.classList.toggle('fa-sun', mode === 'dark');
    }
  });
}

function applyTheme(mode, persist) {
  const next = THEME_MODES.indexOf(mode) !== -1 ? mode : 'light';
  document.documentElement.classList.toggle('dark', next === 'dark');
  if (persist !== false) {
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch (e) { /* quota */ }
  }
  uiSyncMetaThemeColor(next);
  uiSyncThemeToggles(next);
  try {
    document.dispatchEvent(new CustomEvent('experthub:theme', { detail: { theme: next } }));
  } catch (e) { /* CustomEvent unsupported */ }
  return next;
}

function setTheme(mode) { return applyTheme(mode, true); }
function initTheme() { applyTheme(resolvePreferredTheme(), false); uiWatchSystemTheme(); }
function toggleTheme() {
  const next = getActiveTheme() === 'dark' ? 'light' : 'dark';
  return applyTheme(next, true);
}
function cycleTheme() {
  const idx = THEME_MODES.indexOf(getActiveTheme());
  return applyTheme(THEME_MODES[(idx + 1) % THEME_MODES.length], true);
}

function uiWatchSystemTheme() {
  if (!window.matchMedia || uiWatchSystemTheme._bound) return;
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (getStoredTheme()) return;
      applyTheme(mq.matches ? 'dark' : 'light', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
    uiWatchSystemTheme._bound = true;
  } catch (e) { /* matchMedia unavailable */ }
}

/* ---------- ACCENT PALETTE ---------- */
function getStoredAccent() {
  try {
    const raw = localStorage.getItem(ACCENT_STORAGE_KEY);
    return ACCENTS[raw] ? raw : 'blue';
  } catch (e) { return 'blue'; }
}

function getActiveAccent() {
  return document.documentElement.getAttribute('data-accent') || 'blue';
}

function setAccent(name, persist) {
  const key = ACCENTS[name] ? name : 'blue';
  document.documentElement.setAttribute('data-accent', key);
  const hex = ACCENTS[key].hex;
  document.documentElement.style.setProperty('--accent', hex);
  if (persist !== false) {
    try { localStorage.setItem(ACCENT_STORAGE_KEY, key); } catch (e) { /* quota */ }
  }
  try {
    document.dispatchEvent(new CustomEvent('experthub:accent', { detail: { accent: key, hex } }));
  } catch (e) { /* noop */ }
  return key;
}

function initAccent() { setAccent(getStoredAccent(), false); }

function listAccents() {
  return Object.keys(ACCENTS).map(k => ({ key: k, name: ACCENTS[k].name, hex: ACCENTS[k].hex }));
}

/* ---------- DENSITY ---------- */
function getStoredDensity() {
  try {
    const raw = localStorage.getItem(DENSITY_STORAGE_KEY);
    return DENSITIES.indexOf(raw) !== -1 ? raw : 'comfortable';
  } catch (e) { return 'comfortable'; }
}

function setDensity(mode, persist) {
  const next = DENSITIES.indexOf(mode) !== -1 ? mode : 'comfortable';
  document.documentElement.setAttribute('data-density', next);
  if (persist !== false) {
    try { localStorage.setItem(DENSITY_STORAGE_KEY, next); } catch (e) { /* quota */ }
  }
  return next;
}

function initDensity() { setDensity(getStoredDensity(), false); }

/* ---------- FONT SCALE ---------- */
function getStoredFontScale() {
  try {
    const raw = parseFloat(localStorage.getItem(FONT_SCALE_STORAGE_KEY));
    return FONT_SCALES.indexOf(raw) !== -1 ? raw : 1;
  } catch (e) { return 1; }
}

function setFontScale(scale, persist) {
  const next = FONT_SCALES.indexOf(scale) !== -1 ? scale : 1;
  document.documentElement.style.setProperty('--font-scale', String(next));
  if (persist !== false) {
    try { localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(next)); } catch (e) { /* quota */ }
  }
  return next;
}

function initFontScale() { setFontScale(getStoredFontScale(), false); }

/* ---------- UNIFIED THEME SETTINGS ---------- */
function initThemeSystem() {
  initTheme();
  initAccent();
  initDensity();
  initFontScale();
}

function exportThemePreferences() {
  return {
    theme: getActiveTheme(),
    accent: getActiveAccent(),
    density: document.documentElement.getAttribute('data-density') || 'comfortable',
    fontScale: getStoredFontScale(),
  };
}

/* ============================================================
   SECTION 1B — TOAST / NOTIFICATION SYSTEM
   ============================================================ */

const TOAST_ICONS = {
  success: 'check-circle',
  error: 'times-circle',
  warning: 'exclamation-triangle',
  info: 'bell',
};

const TOAST_DEFAULT_TIMEOUT = 3400;
const TOAST_MAX_VISIBLE = 5;
const TOAST_PROGRESS_TICK = 50;

function toastContainer() {
  let c = _uiOne('#toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    c.setAttribute('role', 'status');
    c.setAttribute('aria-live', 'polite');
    c.setAttribute('aria-atomic', 'false');
    document.body.appendChild(c);
  }
  return c;
}

function dismissToast(el) {
  if (!el || el._dismissed) return;
  el._dismissed = true;
  if (el._timer) clearInterval(el._timer);
  if (el._timeout) clearTimeout(el._timeout);
  el.classList.add('toast-exit');
  setTimeout(() => el.remove(), 180);
}

function clearToasts() {
  _uiAll('#toast-container .toast').forEach(dismissToast);
}

function uiEnforceToastLimit() {
  const c = toastContainer();
  const all = _uiAll('.toast', c);
  const overflow = all.length - TOAST_MAX_VISIBLE;
  for (let i = 0; i < overflow; i++) dismissToast(all[i]);
}

function uiStartToastProgress(el, timeout) {
  const bar = _uiOne('.toast-progress', el);
  if (!bar || timeout <= 0) return;
  let elapsed = 0;
  el._timer = setInterval(() => {
    if (el._paused) return;
    elapsed += TOAST_PROGRESS_TICK;
    const pct = Math.min(100, (elapsed / timeout) * 100);
    bar.style.width = (100 - pct) + '%';
    if (pct >= 100) clearInterval(el._timer);
  }, TOAST_PROGRESS_TICK);
}

function uiPlayToastSound(kind) {
  try {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = kind === 'error' ? 220 : kind === 'warning' ? 330 : kind === 'success' ? 660 : 440;
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = 0.05;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => ctx.close && ctx.close(), 200);
  } catch (e) { /* autoplay blocked or audio unsupported */ }
}

function showToast(msg, type, timeout, options) {
  const kind = TOAST_ICONS[type] ? type : 'info';
  const opts = options || {};
  const life = opts.sticky ? 0 : (typeof timeout === 'number' ? timeout : TOAST_DEFAULT_TIMEOUT);

  const c = toastContainer();
  if (opts.id && _uiOne('#toast-' + opts.id)) return null;

  const el = document.createElement('div');
  el.className = 'toast toast-' + kind;
  if (opts.id) el.id = 'toast-' + opts.id;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');

  const icon = TOAST_ICONS[kind];
  const actionHtml = opts.action
    ? `<button class="toast-action" data-toast-action>${esc(opts.action)}</button>`
    : '';

  el.innerHTML = `
    <i class="fas fa-${icon} toast-icon" aria-hidden="true"></i>
    <span class="toast-message">${esc(msg)}</span>
    ${actionHtml}
    <button class="toast-close" data-toast-close aria-label="Dismiss notification">&times;</button>
    ${life > 0 ? '<div class="toast-progress-wrap"><div class="toast-progress"></div></div>' : ''}
  `;

  const closeBtn = _uiOne('[data-toast-close]', el);
  if (closeBtn) closeBtn.addEventListener('click', () => dismissToast(el));

  const actionBtn = _uiOne('[data-toast-action]', el);
  if (actionBtn) {
    actionBtn.addEventListener('click', () => {
      try { if (typeof opts.onAction === 'function') opts.onAction(); } catch (e) { /* noop */ }
      dismissToast(el);
    });
  }

  el.addEventListener('mouseenter', () => { el._paused = true; });
  el.addEventListener('mouseleave', () => { el._paused = false; });

  c.appendChild(el);
  uiEnforceToastLimit();

  if (opts.sound) uiPlayToastSound(kind);

  if (life > 0) {
    uiStartToastProgress(el, life);
    el._timeout = setTimeout(() => dismissToast(el), life);
  }
  return el;
}

function toastSuccess(msg, options) { return showToast(msg, 'success', undefined, options); }
function toastError(msg, options)   { return showToast(msg, 'error', 6000, options); }
function toastWarning(msg, options) { return showToast(msg, 'warning', 4600, options); }
function toastInfo(msg, options)    { return showToast(msg, 'info', undefined, options); }

function toastFromError(err, fallback) {
  const msg = (err && (err.message || err.error)) || fallback || 'Something went wrong.';
  return showToast(msg, 'error', 6000);
}

/* Grouped toasts: update an existing toast by id instead of stacking. */
function upsertToast(id, msg, type, options) {
  const existing = _uiOne('#toast-' + id);
  if (existing) dismissToast(existing);
  return showToast(msg, type, undefined, Object.assign({ id }, options || {}));
}

/* ============================================================
   SECTION 2A — LOADING OVERLAY
   ============================================================ */

let _uiLoadingDepth = 0;

function uiEnsureLoader() {
  let l = _uiOne('#globalLoader');
  if (!l) {
    l = document.createElement('div');
    l.id = 'globalLoader';
    l.className = 'loading-overlay';
    l.setAttribute('role', 'progressbar');
    l.setAttribute('aria-busy', 'true');
    l.setAttribute('aria-label', 'Loading');
    l.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(l);
  }
  return l;
}

function setLoadingMessage(message) {
  const l = _uiOne('#globalLoader');
  if (!l) return;
  let label = _uiOne('.loading-message', l);
  if (!message) { if (label) label.remove(); return; }
  if (!label) {
    label = document.createElement('div');
    label.className = 'loading-message';
    l.appendChild(label);
  }
  label.textContent = message;
}

function showLoading(show, message) {
  if (show && typeof show === 'object') {
    message = show.message;
    show = show.show !== false;
  }

  if (show) {
    _uiLoadingDepth += 1;
    uiEnsureLoader();
    if (message) setLoadingMessage(message);
    document.documentElement.classList.add('is-loading');
  } else {
    _uiLoadingDepth = Math.max(0, _uiLoadingDepth - 1);
    if (_uiLoadingDepth === 0) {
      const l = _uiOne('#globalLoader');
      if (l) l.remove();
      document.documentElement.classList.remove('is-loading');
    }
  }
}

function hideLoading() {
  _uiLoadingDepth = 0;
  const l = _uiOne('#globalLoader');
  if (l) l.remove();
  document.documentElement.classList.remove('is-loading');
}

function inlineSpinner(size) {
  const px = size || 14;
  return `<span class="spinner spinner-inline" style="width:${px}px;height:${px}px" aria-hidden="true"></span>`;
}

function setButtonBusy(btn, busy, busyLabel) {
  if (!btn) return;
  if (busy) {
    if (!btn._originalHtml) btn._originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('is-busy');
    btn.innerHTML = inlineSpinner(14) + ' ' + esc(busyLabel || 'Working…');
  } else {
    btn.disabled = false;
    btn.classList.remove('is-busy');
    if (btn._originalHtml) { btn.innerHTML = btn._originalHtml; btn._originalHtml = null; }
  }
}

function skeletonRows(rows, cols) {
  const n = rows || 4;
  const c = cols || 5;
  let html = '';
  for (let i = 0; i < n; i++) {
    html += '<tr class="skeleton-row">';
    for (let j = 0; j < c; j++) html += '<td><span class="skeleton-bar"></span></td>';
    html += '</tr>';
  }
  return html;
}

/* Generic progress bar markup. */
function progressBar(value, max, tone, label) {
  const m = max || 100;
  const v = Math.max(0, Math.min(m, value || 0));
  const pct = m === 0 ? 0 : Math.round((v / m) * 100);
  return `
    <div class="progress-wrap" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="${m}">
      ${label ? `<div class="progress-label">${esc(label)} <span>${pct}%</span></div>` : ''}
      <div class="progress-track">
        <div class="progress-fill progress-${tone || 'info'}" style="width:${pct}%"></div>
      </div>
    </div>`;
}

/* Circular progress ring — used for compact score displays. */
function progressRing(percent, size, tone) {
  const p = Math.max(0, Math.min(100, percent || 0));
  const s = size || 48;
  const stroke = Math.max(4, Math.round(s / 10));
  const r = (s - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - p / 100);
  return `
    <svg class="progress-ring progress-${tone || 'info'}" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="${stroke}"></circle>
      <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="currentColor" stroke-width="${stroke}"
              stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round"
              transform="rotate(-90 ${s / 2} ${s / 2})"></circle>
      <text x="${s / 2}" y="${s / 2}" text-anchor="middle" dominant-baseline="middle"
            font-size="${s / 4}" fill="currentColor">${p}%</text>
    </svg>`;
}

/* ============================================================
   SECTION 2B — MODAL PLUMBING
   ============================================================ */

const _uiModalStack = [];
let _uiModalSeq = 0;
let _uiModalKeyBound = false;

function uiFocusable(root) {
  return _uiAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), ' +
    'input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"])',
    root
  ).filter(el => el.offsetParent !== null || el === document.activeElement);
}

function uiBindModalKeys() {
  if (_uiModalKeyBound) return;
  _uiModalKeyBound = true;

  document.addEventListener('keydown', e => {
    const top = _uiModalStack[_uiModalStack.length - 1];
    if (!top) return;

    if (e.key === 'Escape' && top.closeOnEsc) {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = uiFocusable(top.el);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });
}

function currentModal() { return _uiModalStack[_uiModalStack.length - 1] || null; }
function isModalOpen() { return _uiModalStack.length > 0; }
function modalBody()   { const m = currentModal(); return m ? _uiOne('.modal-body', m.el)   : null; }
function modalFooter() { const m = currentModal(); return m ? _uiOne('.modal-footer', m.el) : null; }
function modalTitle()  { const m = currentModal(); return m ? _uiOne('.modal-title', m.el)  : null; }

function setModalBody(html) {
  const b = modalBody();
  if (b) b.innerHTML = html || '';
  return b;
}

function setModalFooter(html) {
  const m = currentModal();
  if (!m) return null;
  let f = _uiOne('.modal-footer', m.el);
  if (!html) { if (f) f.remove(); return null; }
  if (!f) {
    f = document.createElement('footer');
    f.className = 'modal-footer';
    _uiOne('.modal-content', m.el).appendChild(f);
  }
  f.innerHTML = html;
  return f;
}

function openModal(config) {
  const cfg = config || {};
  const root = _uiOne('#modal-root');
  if (!root) {
    console.warn('[ui] #modal-root is missing — cannot open modal.');
    return null;
  }

  uiBindModalKeys();

  const seq = ++_uiModalSeq;
  const closeOnBackdrop = cfg.closeOnBackdrop !== false;
  const closeOnEsc = cfg.closeOnEsc !== false;
  const sizeClass = cfg.size ? ('modal-' + cfg.size) : '';
  const extraClass = cfg.className || '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  if (cfg.id) overlay.id = cfg.id;
  overlay.setAttribute('data-modal-seq', String(seq));

  overlay.innerHTML = `
    <div class="modal-content ${sizeClass} ${extraClass}" role="dialog" aria-modal="true"
         aria-labelledby="modalTitle-${seq}">
      <header class="modal-header">
        <h3 class="modal-title" id="modalTitle-${seq}">${esc(cfg.title || '')}</h3>
        <button class="modal-close" data-close-modal aria-label="Close dialog">&times;</button>
      </header>
      <section class="modal-body">${cfg.body || ''}</section>
      ${cfg.footer ? `<footer class="modal-footer">${cfg.footer}</footer>` : ''}
    </div>
  `;

  overlay.addEventListener('mousedown', e => {
    if (e.target === overlay && closeOnBackdrop) closeModal();
  });

  _uiAll('[data-close-modal]', overlay).forEach(b => {
    b.addEventListener('click', () => closeModal());
  });

  root.appendChild(overlay);

  const descriptor = {
    el: overlay,
    seq,
    closeOnEsc,
    closeOnBackdrop,
    onClose: typeof cfg.onClose === 'function' ? cfg.onClose : null,
    opener: document.activeElement || null,
  };
  _uiModalStack.push(descriptor);

  const focusables = uiFocusable(overlay);
  if (focusables.length) focusables[0].focus();
  else { overlay.setAttribute('tabindex', '-1'); overlay.focus(); }

  if (typeof cfg.onMount === 'function') {
    try { cfg.onMount(overlay, descriptor); }
    catch (e) { console.error('[ui] modal onMount failed', e); }
  }

  return overlay;
}

function closeModal(all) {
  if (!_uiModalStack.length) {
    const root = _uiOne('#modal-root');
    if (root) root.innerHTML = '';
    return;
  }

  const targets = all ? _uiModalStack.slice().reverse() : [_uiModalStack[_uiModalStack.length - 1]];

  targets.forEach(desc => {
    const idx = _uiModalStack.indexOf(desc);
    if (idx !== -1) _uiModalStack.splice(idx, 1);

    if (desc.el && desc.el.parentNode) desc.el.remove();

    if (typeof desc.onClose === 'function') {
      try { desc.onClose(); } catch (e) { console.error('[ui] modal onClose failed', e); }
    }

    if (!all && desc.opener && typeof desc.opener.focus === 'function') {
      try { desc.opener.focus(); } catch (e) { /* element gone */ }
    }
  });

  if (!_uiModalStack.length) {
    const root = _uiOne('#modal-root');
    if (root) root.innerHTML = '';
  }
}

function closeAllModals() { closeModal(true); }

function simulateModalBackdrop() {
  const m = currentModal();
  if (m && m.closeOnBackdrop) closeModal();
}

/* ============================================================
   SECTION 3A — CONFIRM / PROMPT / FORM MODAL HELPERS
   ============================================================ */

async function confirmDialog(msg, options) {
  const opts = (typeof options === 'string') ? { title: options } : (options || {});
  const title = opts.title || 'Confirm';
  const confirmLabel = opts.confirmLabel || 'Confirm';
  const cancelLabel = opts.cancelLabel || 'Cancel';
  const danger = opts.danger !== false;

  return new Promise(resolve => {
    let settled = false;
    const settle = v => { if (!settled) { settled = true; resolve(v); } };

    openModal({
      title,
      size: opts.size || 'sm',
      className: danger ? 'modal-danger' : '',
      body: `<p class="confirm-message">${esc(msg)}</p>`,
      footer: `
        <button id="cfmNo" class="btn btn-secondary">${esc(cancelLabel)}</button>
        <button id="cfmYes" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(confirmLabel)}</button>
      `,
      onMount(el) {
        const yes = _uiOne('#cfmYes', el);
        const no  = _uiOne('#cfmNo', el);
        if (no)  no.onclick  = () => { closeModal(); settle(false); };
        if (yes) yes.onclick = () => { closeModal(); settle(true);  };
      },
      onClose() { settle(false); },
    });
  });
}

function promptDialog(message, options) {
  const opts = options || {};
  const title = opts.title || 'Input required';
  const label = opts.label || message || '';
  const placeholder = opts.placeholder || '';
  const value = opts.value || '';
  const type = opts.type || 'text';
  const required = opts.required !== false;

  return new Promise(resolve => {
    let settled = false;
    const settle = v => { if (!settled) { settled = true; resolve(v); } };

    openModal({
      title,
      size: opts.size || 'sm',
      body: `
        <label class="form-label" for="promptInput">${esc(label)}</label>
        <input id="promptInput" class="form-input" type="${esc(type)}"
               value="${esc(value)}" placeholder="${esc(placeholder)}" />
        ${opts.hint ? `<small class="form-hint">${esc(opts.hint)}</small>` : ''}
      `,
      footer: `
        <button id="promptNo" class="btn btn-secondary">Cancel</button>
        <button id="promptYes" class="btn btn-primary">${esc(opts.confirmLabel || 'Save')}</button>
      `,
      onMount(el) {
        const input = _uiOne('#promptInput', el);
        if (input) {
          input.focus();
          input.select();
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
          });
        }
        _uiOne('#promptNo', el).onclick  = () => { closeModal(); settle(null); };
        _uiOne('#promptYes', el).onclick = submit;

        function submit() {
          const v = input ? input.value.trim() : '';
          if (required && !v) { showToast('A value is required.', 'warning'); return; }
          closeModal();
          settle(v);
        }
      },
      onClose() { settle(null); },
    });
  });
}

function formModal(title, fields, options) {
  const opts = options || {};
  const list = fields || [];

  const fieldHtml = list.map(f => {
    const id = 'fm-' + f.name;
    const req = f.required ? ' required' : '';
    const label = `<label class="form-label" for="${id}">${esc(f.label || f.name)}${f.required ? ' *' : ''}</label>`;
    let control = '';

    if (f.type === 'textarea') {
      control = `<textarea id="${id}" name="${esc(f.name)}" class="form-input" rows="${f.rows || 4}"
                   placeholder="${esc(f.placeholder || '')}"${req}>${esc(f.value || '')}</textarea>`;
    } else if (f.type === 'select') {
      const optsHtml = (f.options || []).map(o => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return `<option value="${esc(v)}"${String(f.value) === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
      }).join('');
      control = `<select id="${id}" name="${esc(f.name)}" class="form-input"${req}>${optsHtml}</select>`;
    } else {
      control = `<input id="${id}" name="${esc(f.name)}" class="form-input"
                   type="${esc(f.type || 'text')}" value="${esc(f.value || '')}"
                   placeholder="${esc(f.placeholder || '')}"${req} />`;
    }
    return `<div class="form-group">${label}${control}</div>`;
  }).join('');

  return new Promise(resolve => {
    let settled = false;
    const settle = v => { if (!settled) { settled = true; resolve(v); } };

    openModal({
      title,
      size: opts.size || 'md',
      body: `<form id="formModalForm" class="form-grid">${fieldHtml}</form>`,
      footer: `
        <button id="formModalNo" class="btn btn-secondary">Cancel</button>
        <button id="formModalYes" class="btn btn-primary">${esc(opts.confirmLabel || 'Submit')}</button>
      `,
      onMount(el) {
        _uiOne('#formModalNo', el).onclick = () => { closeModal(); settle(null); };
        _uiOne('#formModalYes', el).onclick = () => {
          const form = _uiOne('#formModalForm', el);
          if (form && !form.reportValidity()) return;
          const data = {};
          _uiAll('input,textarea,select', form).forEach(inp => { data[inp.name] = inp.value; });
          closeModal();
          settle(data);
        };
      },
      onClose() { settle(null); },
    });
  });
}

/* ============================================================
   SECTION 3B — PAGINATION BAR
   ============================================================ */

function paginationRange(page, pages, span) {
  const window = span || 1;
  const out = [];
  const push = v => { if (out[out.length - 1] !== v) out.push(v); };

  push(1);
  for (let p = page - window; p <= page + window; p++) {
    if (p > 1 && p < pages) push(p);
  }
  if (pages > 1) push(pages);

  const withGaps = [];
  for (let i = 0; i < out.length; i++) {
    if (i > 0 && out[i] - out[i - 1] > 1) withGaps.push('…');
    withGaps.push(out[i]);
  }
  return withGaps;
}

function paginationBar(resource, page, per, total, options) {
  const opts = options || {};
  const size = per || 25;
  const count = total || 0;
  const current = Math.max(1, page || 1);
  const pages = Math.max(1, Math.ceil(count / size));

  if (pages <= 1 && !opts.alwaysShow) return '';

  const label = opts.label || 'record';
  const from = count === 0 ? 0 : (current - 1) * size + 1;
  const to = Math.min(count, current * size);

  const btn = (target, text, disabled, extra) => `
    <button class="btn btn-secondary btn-xs page-btn${extra || ''}"
            ${disabled ? 'disabled' : ''}
            data-action="paginate"
            data-resource="${esc(resource)}"
            data-page="${target}">${text}</button>`;

  let numbers = '';
  if (opts.showNumbers) {
    numbers = paginationRange(current, pages, opts.windowSpan || 1).map(p => {
      if (p === '…') return '<span class="page-ellipsis">…</span>';
      const active = p === current ? ' page-btn-active' : '';
      return btn(p, String(p), false, active);
    }).join('');
  }

  let perPage = '';
  if (opts.showPerPage) {
    const choices = opts.perOptions || [10, 25, 50, 100];
    perPage = `
      <select class="page-size-select" data-action="paginate-size" data-resource="${esc(resource)}">
        ${choices.map(n => `<option value="${n}"${n === size ? ' selected' : ''}>${n} / page</option>`).join('')}
      </select>`;
  }

  return `
    <div class="table-footer">
      <span class="table-footer-info">
        ${count === 0
          ? `No ${esc(label)}s`
          : `Showing <strong>${from}–${to}</strong> of <strong>${count}</strong> ${esc(label)}${count === 1 ? '' : 's'}`}
      </span>
      <div class="table-footer-controls">
        ${perPage}
        ${btn(1, '<i class="fas fa-angle-double-left"></i>', current <= 1)}
        ${btn(current - 1, '<i class="fas fa-chevron-left"></i> Prev', current <= 1)}
        ${numbers}
        ${btn(current + 1, 'Next <i class="fas fa-chevron-right"></i>', current >= pages)}
        ${btn(pages, '<i class="fas fa-angle-double-right"></i>', current >= pages)}
      </div>
    </div>`;
}

/* ============================================================
   SECTION 3C — SHARED PRESENTATIONAL HELPERS
   ============================================================ */

function emptyState(message, icon, actionHtml) {
  return `
    <div class="empty-state">
      <i class="fas fa-${icon || 'inbox'} empty-state-icon" aria-hidden="true"></i>
      <p class="empty-state-text">${esc(message || 'Nothing to show yet.')}</p>
      ${actionHtml ? `<div class="empty-state-actions">${actionHtml}</div>` : ''}
    </div>`;
}

function statusPill(text, tone) {
  const map = {
    success: 'pill-success', warn: 'pill-warn', warning: 'pill-warn',
    danger: 'pill-danger', error: 'pill-danger', info: 'pill-info',
    muted: 'pill-muted', neutral: 'pill-muted',
  };
  const cls = map[tone] || map.info;
  return `<span class="pill ${cls}">${esc(text)}</span>`;
}

function sectionHeader(title, subtitle, actionsHtml) {
  return `
    <div class="section-header">
      <div>
        <h2 class="section-title">${esc(title || '')}</h2>
        ${subtitle ? `<p class="section-subtitle">${esc(subtitle)}</p>` : ''}
      </div>
      ${actionsHtml ? `<div class="section-actions">${actionsHtml}</div>` : ''}
    </div>`;
}

function statCard(label, value, icon, tone) {
  return `
    <div class="stat-card stat-${tone || 'info'}">
      <div class="stat-icon"><i class="fas fa-${icon || 'chart-line'}"></i></div>
      <div class="stat-body">
        <div class="stat-value">${esc(String(value == null ? '—' : value))}</div>
        <div class="stat-label">${esc(label || '')}</div>
      </div>
    </div>`;
}

function toggleCollapse(selector, force) {
  const el = typeof selector === 'string' ? _uiOne(selector) : selector;
  if (!el) return false;
  const shouldOpen = typeof force === 'boolean' ? force : el.classList.contains('is-collapsed');
  el.classList.toggle('is-collapsed', !shouldOpen);
  return shouldOpen;
}

/* ============================================================
   SECTION 3D — AVATAR / CHIP / BADGE / TAG HELPERS
   ============================================================ */

function initialsOf(name) {
  if (!name) return '?';
  return String(name).trim().split(/\s+/).slice(0, 2)
    .map(w => w.charAt(0).toUpperCase()).join('');
}

/* Deterministic colour picker so the same user keeps the same tint. */
function avatarTint(seed) {
  const palette = ['blue', 'violet', 'green', 'amber', 'rose', 'slate'];
  if (!seed) return palette[0];
  let hash = 0;
  for (let i = 0; i < String(seed).length; i++) {
    hash = (hash * 31 + String(seed).charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function avatar(name, src, size) {
  const s = size || 36;
  const tint = avatarTint(name || src || '');
  if (src) {
    return `<img class="avatar avatar-${tint}" src="${esc(src)}" alt="${esc(name || '')}"
              style="width:${s}px;height:${s}px" loading="lazy" />`;
  }
  return `<span class="avatar avatar-${tint} avatar-initials"
                style="width:${s}px;height:${s}px;font-size:${Math.round(s / 2.5)}px"
                title="${esc(name || '')}">${esc(initialsOf(name))}</span>`;
}

function avatarStack(list, max) {
  const items = list || [];
  const cap = max || 4;
  const visible = items.slice(0, cap).map(u => avatar(u.name, u.src, 32)).join('');
  const overflow = items.length - cap;
  return `<div class="avatar-stack">${visible}${
    overflow > 0 ? `<span class="avatar avatar-more">+${overflow}</span>` : ''
  }</div>`;
}

function chip(label, tone, removable) {
  const toneCls = tone ? ' chip-' + tone : '';
  return `<span class="chip${toneCls}">${esc(label)}${
    removable ? '<button class="chip-remove" data-chip-remove aria-label="Remove">&times;</button>' : ''
  }</span>`;
}

function tagBadge(label, tone) {
  return `<span class="tag tag-${tone || 'info'}">${esc(label)}</span>`;
}

function countBadge(n, tone) {
  if (!n) return '';
  return `<span class="count-badge count-${tone || 'danger'}">${n > 99 ? '99+' : n}</span>`;
}

/* ============================================================
   SECTION 3E — TOOLTIP SYSTEM
   ============================================================ */

let _uiTooltipEl = null;

function ensureTooltipEl() {
  if (_uiTooltipEl && _uiTooltipEl.parentNode) return _uiTooltipEl;
  _uiTooltipEl = document.createElement('div');
  _uiTooltipEl.className = 'ui-tooltip';
  _uiTooltipEl.setAttribute('role', 'tooltip');
  _uiTooltipEl.hidden = true;
  document.body.appendChild(_uiTooltipEl);
  return _uiTooltipEl;
}

function positionTooltip(target, tip, placement) {
  const r = target.getBoundingClientRect();
  const tr = tip.getBoundingClientRect();
  const gap = 8;
  const place = placement || target.getAttribute('data-tooltip-placement') || 'top';

  let top, left;
  if (place === 'bottom') {
    top = r.bottom + gap; left = r.left + (r.width - tr.width) / 2;
  } else if (place === 'left') {
    top = r.top + (r.height - tr.height) / 2; left = r.left - tr.width - gap;
  } else if (place === 'right') {
    top = r.top + (r.height - tr.height) / 2; left = r.right + gap;
  } else {
    top = r.top - tr.height - gap; left = r.left + (r.width - tr.width) / 2;
  }

  const padding = 8;
  left = Math.max(padding, Math.min(window.innerWidth - tr.width - padding, left));
  top  = Math.max(padding, Math.min(window.innerHeight - tr.height - padding, top));

  tip.style.top = top + 'px';
  tip.style.left = left + 'px';
}

function showTooltip(target) {
  const text = target.getAttribute('data-tooltip');
  if (!text) return;
  const tip = ensureTooltipEl();
  tip.textContent = text;
  tip.className = 'ui-tooltip ui-tooltip-' + (target.getAttribute('data-tooltip-placement') || 'top');
  tip.hidden = false;
  tip.style.opacity = '1';
  positionTooltip(target, tip);
}

function hideTooltip() {
  if (!_uiTooltipEl) return;
  _uiTooltipEl.hidden = true;
  _uiTooltipEl.style.opacity = '0';
}

function initTooltips() {
  document.addEventListener('mouseover', e => {
    const t = e.target.closest && e.target.closest('[data-tooltip]');
    if (t) showTooltip(t);
  });
  document.addEventListener('mouseout', e => {
    const t = e.target.closest && e.target.closest('[data-tooltip]');
    if (t) hideTooltip();
  });
  document.addEventListener('scroll', hideTooltip, true);
}

/* ============================================================
   SECTION 3F — DROPDOWN MENU SYSTEM
   ============================================================ */

let _uiOpenDropdown = null;

function closeDropdown() {
  if (!_uiOpenDropdown) return;
  _uiOpenDropdown.remove();
  _uiOpenDropdown = null;
}

function openDropdown(anchor, items, options) {
  const opts = options || {};
  closeDropdown();

  const menu = document.createElement('div');
  menu.className = 'ui-dropdown' + (opts.className ? ' ' + opts.className : '');
  menu.innerHTML = (items || []).map(it => {
    if (it.divider) return '<div class="ui-dropdown-divider"></div>';
    const icon = it.icon ? `<i class="fas fa-${it.icon}"></i>` : '';
    const danger = it.danger ? ' ui-dropdown-danger' : '';
    const disabled = it.disabled ? ' disabled' : '';
    return `<button class="ui-dropdown-item${danger}" data-key="${esc(it.key || '')}"${disabled}>
              ${icon}<span>${esc(it.label || '')}</span>
            </button>`;
  }).join('');

  document.body.appendChild(menu);
  _uiOpenDropdown = menu;

  const r = anchor.getBoundingClientRect();
  const mr = menu.getBoundingClientRect();
  let top = r.bottom + 6;
  let left = r.right - mr.width;
  if (top + mr.height > window.innerHeight) top = r.top - mr.height - 6;
  left = Math.max(8, Math.min(window.innerWidth - mr.width - 8, left));
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';

  menu.addEventListener('click', e => {
    const b = e.target.closest('[data-key]');
    if (!b || b.disabled) return;
    const key = b.getAttribute('data-key');
    const item = (items || []).find(x => String(x.key) === key);
    closeDropdown();
    if (item && typeof item.onSelect === 'function') item.onSelect(item);
  });

  setTimeout(() => {
    const off = ev => {
      if (!menu.contains(ev.target) && ev.target !== anchor) {
        closeDropdown();
        document.removeEventListener('mousedown', off);
      }
    };
    document.addEventListener('mousedown', off);
  }, 0);

  return menu;
}

function initDropdowns() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDropdown();
  });
}

/* ============================================================
   SECTION 3G — TABS AND ACCORDION
   ============================================================ */

function tabs(id, items, activeKey) {
  const uid = id || _uiUid('tabs');
  const active = activeKey || (items[0] && items[0].key);
  const header = (items || []).map(it => `
    <button class="ui-tab${it.key === active ? ' ui-tab-active' : ''}"
            role="tab" data-tab-key="${esc(it.key)}"
            aria-selected="${it.key === active ? 'true' : 'false'}">
      ${it.icon ? `<i class="fas fa-${it.icon}"></i>` : ''}<span>${esc(it.label)}</span>
      ${it.badge ? countBadge(it.badge) : ''}
    </button>`).join('');
  return `
    <div class="ui-tabs" id="${esc(uid)}" data-active-tab="${esc(active)}">
      <div class="ui-tab-header" role="tablist">${header}</div>
      <div class="ui-tab-body" data-tab-body></div>
    </div>`;
}

function bindTabs(root, onSwitch) {
  const tabsEl = typeof root === 'string' ? _uiOne(root) : root;
  if (!tabsEl) return;
  tabsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-tab-key]');
    if (!b) return;
    const key = b.getAttribute('data-tab-key');
    _uiAll('.ui-tab', tabsEl).forEach(t => {
      const on = t.getAttribute('data-tab-key') === key;
      t.classList.toggle('ui-tab-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    tabsEl.setAttribute('data-active-tab', key);
    if (typeof onSwitch === 'function') onSwitch(key);
  });
}

function accordion(items) {
  return `<div class="ui-accordion">${
    (items || []).map((it, i) => `
      <details class="ui-accordion-item"${it.open ? ' open' : ''}>
        <summary class="ui-accordion-summary">
          <i class="fas fa-chevron-right ui-accordion-chevron"></i>
          <span>${esc(it.title)}</span>
        </summary>
        <div class="ui-accordion-body">${it.body || ''}</div>
      </details>`).join('')
  }</div>`;
}

/* ============================================================
   SECTION 3H — DRAWER / SIDE PANEL
   ============================================================ */

const _uiDrawerStack = [];

function openDrawer(config) {
  const cfg = config || {};
  const side = ['left', 'right', 'bottom'].indexOf(cfg.side) !== -1 ? cfg.side : 'right';
  const overlay = document.createElement('div');
  overlay.className = 'ui-drawer-overlay';
  overlay.setAttribute('data-side', side);

  overlay.innerHTML = `
    <aside class="ui-drawer ui-drawer-${side}" role="dialog" aria-modal="true">
      <header class="ui-drawer-header">
        <h3 class="ui-drawer-title">${esc(cfg.title || '')}</h3>
        <button class="ui-drawer-close" data-drawer-close aria-label="Close">&times;</button>
      </header>
      <div class="ui-drawer-body">${cfg.body || ''}</div>
      ${cfg.footer ? `<footer class="ui-drawer-footer">${cfg.footer}</footer>` : ''}
    </aside>`;

  overlay.addEventListener('click', e => {
    if (e.target === overlay && cfg.closeOnBackdrop !== false) closeDrawer();
  });
  _uiAll('[data-drawer-close]', overlay).forEach(b => b.addEventListener('click', closeDrawer));

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  const desc = {
    el: overlay,
    side,
    closeOnEsc: cfg.closeOnEsc !== false,
    onClose: typeof cfg.onClose === 'function' ? cfg.onClose : null,
  };
  _uiDrawerStack.push(desc);

  if (typeof cfg.onMount === 'function') {
    try { cfg.onMount(overlay); } catch (e) { console.error('[ui] drawer onMount failed', e); }
  }
  return overlay;
}

function closeDrawer() {
  const desc = _uiDrawerStack.pop();
  if (!desc) return;
  desc.el.classList.remove('is-open');
  setTimeout(() => desc.el.remove(), 200);
  if (typeof desc.onClose === 'function') {
    try { desc.onClose(); } catch (e) { console.error('[ui] drawer onClose failed', e); }
  }
}

function initDrawers() {
  document.addEventListener('keydown', e => {
    const top = _uiDrawerStack[_uiDrawerStack.length - 1];
    if (top && top.closeOnEsc && e.key === 'Escape') closeDrawer();
  });
}

/* ============================================================
   SECTION 3I — MULTI-STEP WIZARD
   ============================================================ */

function wizardShell(steps, options) {
  const opts = options || {};
  const uid = opts.id || _uiUid('wizard');
  const header = steps.map((s, i) => `
    <li class="wizard-step" data-step="${i}">
      <span class="wizard-step-index">${i + 1}</span>
      <span class="wizard-step-label">${esc(s.title)}</span>
    </li>`).join('');

  return `
    <div class="ui-wizard" id="${esc(uid)}" data-current-step="0">
      <ol class="ui-wizard-header">${header}</ol>
      <div class="ui-wizard-body" data-wizard-body></div>
      <footer class="ui-wizard-footer">
        <button class="btn btn-secondary" data-wizard-prev>Back</button>
        <span class="wizard-progress-text" data-wizard-progress>Step 1 of ${steps.length}</span>
        <button class="btn btn-primary" data-wizard-next>Next</button>
      </footer>
    </div>`;
}

function wizardController(rootEl, steps, options) {
  const opts = options || {};
  const state = { index: 0, data: {} };
  const el = typeof rootEl === 'string' ? _uiOne(rootEl) : rootEl;
  if (!el) return null;

  function render() {
    el.setAttribute('data-current-step', String(state.index));
    _uiAll('.wizard-step', el).forEach((li, i) => {
      li.classList.toggle('wizard-step-active', i === state.index);
      li.classList.toggle('wizard-step-done', i < state.index);
    });
    const body = _uiOne('[data-wizard-body]', el);
    const step = steps[state.index];
    body.innerHTML = typeof step.render === 'function' ? step.render(state.data) : (step.body || '');
    const progress = _uiOne('[data-wizard-progress]', el);
    if (progress) progress.textContent = `Step ${state.index + 1} of ${steps.length}`;
    const prev = _uiOne('[data-wizard-prev]', el);
    const next = _uiOne('[data-wizard-next]', el);
    if (prev) prev.disabled = state.index === 0;
    if (next) next.textContent = state.index === steps.length - 1 ? 'Finish' : 'Next';
    if (typeof step.onMount === 'function') step.onMount(body, state);
  }

  function collect() {
    const body = _uiOne('[data-wizard-body]', el);
    if (!body) return;
    _uiAll('input[name],textarea[name],select[name]', body).forEach(inp => {
      state.data[inp.name] = inp.value;
    });
  }

  _uiOne('[data-wizard-next]', el).addEventListener('click', () => {
    const step = steps[state.index];
    if (typeof step.validate === 'function' && !step.validate(state.data)) return;
    collect();
    if (state.index === steps.length - 1) {
      if (typeof opts.onFinish === 'function') opts.onFinish(state.data, state);
      return;
    }
    state.index++;
    render();
  });

  _uiOne('[data-wizard-prev]', el).addEventListener('click', () => {
    if (state.index === 0) return;
    collect();
    state.index--;
    render();
  });

  render();
  return {
    getState: () => state,
    goTo: i => { state.index = Math.max(0, Math.min(steps.length - 1, i)); render(); },
    setData: d => Object.assign(state.data, d || {}),
  };
}

/* ============================================================
   SECTION 3J — TIMELINE AND LIST PRESENTATION
   ============================================================ */

function timeline(items) {
  return `<ul class="ui-timeline">${
    (items || []).map(it => `
      <li class="ui-timeline-item ui-timeline-${it.tone || 'info'}">
        <span class="ui-timeline-dot"><i class="fas fa-${it.icon || 'circle'}"></i></span>
        <div class="ui-timeline-body">
          <div class="ui-timeline-title">${esc(it.title || '')}</div>
          ${it.time ? `<div class="ui-timeline-time">${esc(it.time)}</div>` : ''}
          ${it.text ? `<p class="ui-timeline-text">${esc(it.text)}</p>` : ''}
        </div>
      </li>`).join('')
  }</ul>`;
}

/* ============================================================
   SECTION 3K — FORM VALIDATION HELPERS
   ============================================================ */

function setFieldError(input, message) {
  const el = typeof input === 'string' ? _uiOne(input) : input;
  if (!el) return;
  const wrap = el.closest('.form-group') || el.parentNode;
  let err = _uiOne('.form-error', wrap);
  if (!message) {
    if (err) err.remove();
    el.classList.remove('is-invalid');
    return;
  }
  if (!err) {
    err = document.createElement('small');
    err.className = 'form-error';
    wrap.appendChild(err);
  }
  err.textContent = message;
  el.classList.add('is-invalid');
}

function clearFieldError(input) { setFieldError(input, null); }

function validateRequired(formEl) {
  const form = typeof formEl === 'string' ? _uiOne(formEl) : formEl;
  if (!form) return true;
  let ok = true;
  _uiAll('[required]', form).forEach(el => {
    if (!el.value || !String(el.value).trim()) {
      setFieldError(el, 'This field is required.');
      ok = false;
    } else clearFieldError(el);
  });
  return ok;
}

/* ============================================================
   SECTION 3L — TABLE HELPERS
   ============================================================ */

function sortableHeader(label, key, activeKey, direction) {
  const active = key === activeKey;
  const icon = active ? (direction === 'asc' ? 'sort-up' : 'sort-down') : 'sort';
  return `<th class="th-sortable${active ? ' th-sorted' : ''}"
             data-sort-key="${esc(key)}"
             data-sort-dir="${active && direction === 'asc' ? 'desc' : 'asc'}">
            ${esc(label)} <i class="fas fa-${icon}"></i>
          </th>`;
}

function tableToolbar(opts) {
  const o = opts || {};
  return `
    <div class="table-toolbar">
      ${o.search ? `<input class="form-input table-search" type="search"
                       placeholder="${esc(o.searchPlaceholder || 'Search…')}"
                       value="${esc(o.search)}" data-table-search />` : ''}
      <div class="table-toolbar-spacer"></div>
      ${o.actions || ''}
    </div>`;
}

function bulkActionsBar(count, actionsHtml) {
  if (!count) return '';
  return `<div class="bulk-actions-bar">
            <span><strong>${count}</strong> selected</span>
            <div>${actionsHtml || ''}</div>
          </div>`;
}

/* ============================================================
   SECTION 3M — KEYBOARD SHORTCUT REGISTRY
   ============================================================ */

const _uiShortcuts = new Map();
let _uiShortcutsBound = false;

function bindShortcut(combo, handler, options) {
  const opts = options || {};
  _uiShortcuts.set(combo.toLowerCase(), { handler, opts });
  if (!_uiShortcutsBound) {
    _uiShortcutsBound = true;
    document.addEventListener('keydown', uiShortcutDispatcher);
  }
}

function unbindShortcut(combo) {
  _uiShortcuts.delete(String(combo).toLowerCase());
}

function uiShortcutDispatcher(e) {
  const tag = (e.target && e.target.tagName) || '';
  const editing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  const key = e.key.toLowerCase();
  if (['control', 'alt', 'shift', 'meta'].indexOf(key) === -1) parts.push(key);
  const combo = parts.join('+');

  const entry = _uiShortcuts.get(combo);
  if (!entry) return;
  if (editing && !entry.opts.allowInInput) return;
  if (entry.opts.preventDefault !== false) e.preventDefault();
  try { entry.handler(e); } catch (err) { console.error('[ui] shortcut failed', err); }
}

/* ============================================================
   SECTION 3N — CLIPBOARD AND SCROLL UTILITIES
   ============================================================ */

async function copyToClipboard(text, successMessage) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(successMessage || 'Copied to clipboard.', 'success', 2000);
    return true;
  } catch (e) {
    showToast('Could not copy to clipboard.', 'error');
    return false;
  }
}

function copyButton(text, label) {
  const uid = _uiUid('copy');
  return `<button class="btn btn-secondary btn-xs" id="${uid}"
                  data-copy-text="${esc(text)}">${esc(label || 'Copy')}</button>`;
}

function initCopyButtons() {
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-copy-text]');
    if (!b) return;
    copyToClipboard(b.getAttribute('data-copy-text'));
  });
}

function lockScroll(lock) {
  if (lock) document.documentElement.classList.add('no-scroll');
  else document.documentElement.classList.remove('no-scroll');
}

function scrollToTop(smooth) {
  window.scrollTo({ top: 0, behavior: smooth === false ? 'auto' : 'smooth' });
}

function scrollIntoViewSafe(selector, options) {
  const el = typeof selector === 'string' ? _uiOne(selector) : selector;
  if (!el) return;
  el.scrollIntoView(Object.assign({ behavior: 'smooth', block: 'start' }, options || {}));
}

function backToTopButton() {
  return `<button class="back-to-top" data-back-to-top aria-label="Back to top">
            <i class="fas fa-arrow-up"></i>
          </button>`;
}

function initBackToTop() {
  const btn = _uiOne('[data-back-to-top]');
  if (!btn) return;
  btn.addEventListener('click', () => scrollToTop(true));
  const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 400);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================================
   SECTION 3O — GLOBAL ERROR BOUNDARY
   ============================================================ */

let _uiErrorBound = false;

function initErrorBoundary() {
  if (_uiErrorBound) return;
  _uiErrorBound = true;
  window.addEventListener('unhandledrejection', e => {
    const reason = e && e.reason;
    const msg = (reason && (reason.message || reason.error)) || 'Unexpected error.';
    console.error('[ui] unhandled rejection', reason);
    showToast(msg, 'error', 6000, { id: 'unhandled-error' });
  });
  window.addEventListener('error', e => {
    if (!e || !e.message) return;
    if (/ResizeObserver loop/.test(e.message)) return;
    console.error('[ui] runtime error', e.message);
  });
}

/* ============================================================
   SECTION 3P — SIDEBAR / NAV HELPERS
   ============================================================ */

function sidebarItem(opts) {
  const o = opts || {};
  const active = o.active ? ' is-active' : '';
  return `
    <a class="sidebar-item${active}" href="${esc(o.href || '#')}"
       data-route="${esc(o.route || '')}">
      <i class="fas fa-${o.icon || 'circle'}"></i>
      <span>${esc(o.label || '')}</span>
      ${o.badge ? countBadge(o.badge) : ''}
    </a>`;
}

function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${
    (items || []).map((it, i) => {
      const last = i === items.length - 1;
      return last
        ? `<span class="breadcrumb-current">${esc(it.label)}</span>`
        : `<a class="breadcrumb-link" href="${esc(it.href || '#')}">${esc(it.label)}</a>
           <i class="fas fa-chevron-right breadcrumb-sep"></i>`;
    }).join('')
  }</nav>`;
}

/* ============================================================
   SECTION 3Q — INITIALISATION
   ============================================================ */

function initUI() {
  initThemeSystem();
  initTooltips();
  initDropdowns();
  initDrawers();
  initCopyButtons();
  initErrorBoundary();

  document.addEventListener('click', e => {
    const toggle = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (toggle) { e.preventDefault(); toggleTheme(); }
  });

  document.addEventListener('experthub:rerender', () => {
    uiSyncThemeToggles(getActiveTheme());
    initBackToTop();
  });
}