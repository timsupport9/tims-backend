/* ============================================================
   ExpertHub 2.0 — shared-modal-helpers.js
   Foundation of the ExpertHub Modal Framework.

   Sections
   --------
    1.  Framework config, version, feature flags
    2.  Dependency validation
    3.  Logging & debug
    4.  Modal stack management
    5.  Modal dialogs (confirm / delete / success / error / info /
        warning / loading / prompt / toast-in-modal)
    6.  Form helpers (get / set / reset / dirty / serialize)
    7.  Validators (atomic + composite)
    8.  Security helpers (sanitize / escape / safe URL / safe HTML)
    9.  API helpers (request / create / update / patch / delete /
        batch / retry)
    10. State helpers (refresh / reload / cache / current user / role)
    11. Permission helpers
    12. UI helpers (submit lock / inline errors / spinner / skeleton /
        focus)
    13. Error handling (status → message / categories / retry)
    14. Unsaved-change guard
    15. Accessibility (role / aria / focus trap / ESC / restore)
    16. Mobile helpers (sticky footer / safe-area / swipe-to-dismiss)
    17. Analytics & audit hooks
    18. Utilities (debounce / throttle / uuid / dates / money / clone)
    19. Clipboard & downloads
    20. Keyboard shortcuts
    21. Wizard / multi-step forms
    22. Auto-save drafts
    23. File & image upload helpers
    24. Course curriculum loader (existing)
   ============================================================ */

/* ------------------------------------------------------------------
 * 1. Framework config, version, feature flags
 * ---------------------------------------------------------------- */

const ModalFramework = {
  version: '2.0.0',
  debug: false,
  flags: {
    confirmDestructive: true,
    unsavedChangeGuard: true,
    enableAnalytics:    false,
    enableAuditLog:     false,
    enableAutosave:     true,
    enableFocusTrap:    true,
    enableEscapeClose:  true,
    enableSwipeClose:   true,
  },
  defaults: {
    autosaveIntervalMs: 10000,
    apiRetryCount:      2,
    apiRetryBackoffMs:  500,
    toastDurationMs:    3500,
    loadingDelayMs:     150,
  },
  routes: {
    portfolio:    '/api/expert/portfolio',
    tiers:        '/api/experts/me/tiers',
    profile:      '/api/experts/me/profile',
    verification: '/api/experts/me/verification',
    earnings:     '/api/experts/me/earnings',
    withdrawals:  '/api/experts/me/withdrawals',
    transactions: '/api/experts/me/transactions',
  },
};

/* ------------------------------------------------------------------
 * 2. Dependency validation
 * ---------------------------------------------------------------- */

(function validateModalDependencies() {
  const required = ['apiCall', 'openModal', 'closeModal', 'showToast', '$', 'S'];
  const missing = [];
  required.forEach(name => {
    const t = typeof window[name];
    if (t !== 'function' && t !== 'object') missing.push(name);
  });
  if (missing.length) console.warn('[ModalFramework] Missing dependencies:', missing.join(', '));
  window.ExpertHubModalVersion = ModalFramework.version;
})();

function modalHasDependency(name) {
  const t = typeof window[name];
  return t === 'function' || t === 'object';
}

/* ------------------------------------------------------------------
 * 3. Logging & debug
 * ---------------------------------------------------------------- */

function mfLog(...args)  { if (ModalFramework.debug) console.log('[ModalFramework]', ...args); }
function mfWarn(...args) { console.warn('[ModalFramework]', ...args); }
function mfError(...args){ console.error('[ModalFramework]', ...args); }

/* ------------------------------------------------------------------
 * 4. Modal stack management
 * ---------------------------------------------------------------- */

const _modalStack = {
  items: [],
  push(id, meta = {}) {
    this.items.push({ id, meta, openedAt: Date.now() });
    mfLog('modal push', id, meta);
  },
  pop(id) {
    const idx = this.items.findIndex(x => x.id === id);
    if (idx >= 0) this.items.splice(idx, 1);
    mfLog('modal pop', id);
  },
  current() { return this.items[this.items.length - 1]; },
  depth()   { return this.items.length; },
  clear()   { this.items.length = 0; },
};

/* ------------------------------------------------------------------
 * 5. Modal dialogs
 * ---------------------------------------------------------------- */

/**
 * Generic confirm with optional reason capture.
 * @returns {Promise<{confirmed:boolean, reason?:string}>}
 */
function openConfirmModal(opts = {}) {
  const {
    title = 'Confirm',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
    requireReason = false,
    reasonLabel = 'Reason',
    minReasonLength = 3,
  } = opts;

  return new Promise(resolve => {
    openModal({
      title,
      body: `
        <p class="modal-message">${esc(message)}</p>
        ${requireReason ? `
          <label class="form-group">
            <span class="form-label">${esc(reasonLabel)} *</span>
            <textarea id="mfReason" class="form-textarea" rows="3" maxlength="500"></textarea>
          </label>` : ''}`,
      footer: `
        <button class="btn btn-secondary" data-mf-cancel>${esc(cancelText)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-mf-confirm>${esc(confirmText)}</button>`,
    });
    enhanceModalAccessibility();

    $('[data-mf-cancel]').onclick = () => { closeModal(); resolve({ confirmed: false }); };
    $('[data-mf-confirm]').onclick = () => {
      if (requireReason) {
        const reason = ($('#mfReason')?.value || '').trim();
        if (reason.length < minReasonLength) {
          showToast(`Please provide at least ${minReasonLength} characters`, 'error');
          return;
        }
        closeModal(); resolve({ confirmed: true, reason });
      } else {
        closeModal(); resolve({ confirmed: true });
      }
    };
  });
}

async function openDeleteConfirmModal(opts = {}) {
  if (!ModalFramework.flags.confirmDestructive) return { confirmed: true };
  return openConfirmModal({
    title: opts.title || 'Delete',
    message: opts.message || 'This action cannot be undone. Continue?',
    confirmText: 'Delete',
    danger: true,
    ...opts,
  });
}

async function openWarningModal(title, message, confirmText = 'Proceed') {
  return openConfirmModal({ title, message, confirmText, danger: true });
}

function openSuccessModal(title, message, opts = {}) {
  openModal({
    title: title || 'Success',
    body: `
      <div class="modal-feedback modal-feedback-success">
        <i class="fas fa-check-circle"></i>
        <p>${esc(message || 'Done.')}</p>
      </div>`,
    footer: `<button class="btn btn-primary" data-close-modal>${esc(opts.okText || 'OK')}</button>`,
  });
  enhanceModalAccessibility();
}

function openErrorModal(title, message, opts = {}) {
  openModal({
    title: title || 'Error',
    body: `
      <div class="modal-feedback modal-feedback-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${esc(message || 'Something went wrong.')}</p>
      </div>`,
    footer: `
      ${opts.retry ? `<button class="btn btn-secondary" data-mf-retry>Retry</button>` : ''}
      <button class="btn btn-primary" data-close-modal>Close</button>`,
  });
  enhanceModalAccessibility();
  if (opts.retry) $('[data-mf-retry]').onclick = () => { closeModal(); opts.retry(); };
}

function openInfoModal(title, message, opts = {}) {
  openModal({
    title: title || 'Information',
    body: `
      <div class="modal-feedback modal-feedback-info">
        <i class="fas fa-info-circle"></i>
        <p>${esc(message || '')}</p>
      </div>`,
    footer: `<button class="btn btn-primary" data-close-modal>${esc(opts.okText || 'OK')}</button>`,
  });
  enhanceModalAccessibility();
}

function openLoadingModal(message = 'Loading…') {
  openModal({
    title: '',
    body: `
      <div class="modal-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>${esc(message)}</span>
      </div>`,
    footer: '',
  });
}

/**
 * Prompt for a single value.
 * @returns {Promise<string|null>}
 */
function openPromptModal(opts = {}) {
  const {
    title = 'Enter value',
    label = 'Value',
    placeholder = '',
    value = '',
    inputType = 'text',
    required = true,
    maxLength = 200,
  } = opts;

  return new Promise(resolve => {
    openModal({
      title,
      body: `
        <label class="form-group"><span class="form-label">${esc(label)}${required ? ' *' : ''}</span>
          <input id="mfPrompt" type="${inputType}" class="form-input"
                 value="${esc(value)}" placeholder="${esc(placeholder)}"
                 maxlength="${maxLength}" /></label>`,
      footer: `
        <button class="btn btn-secondary" data-mf-cancel>Cancel</button>
        <button class="btn btn-primary" data-mf-ok>OK</button>`,
    });
    enhanceModalAccessibility();
    setTimeout(() => document.getElementById('mfPrompt')?.focus(), 50);

    $('[data-mf-cancel]').onclick = () => { closeModal(); resolve(null); };
    $('[data-mf-ok]').onclick = () => {
      const v = ($('#mfPrompt')?.value || '').trim();
      if (required && !v) { showToast('Value is required', 'error'); return; }
      closeModal(); resolve(v);
    };
  });
}

/* ------------------------------------------------------------------
 * 6. Form helpers
 * ---------------------------------------------------------------- */

function getFormData(rootSelector = '.modal-body') {
  const root = document.querySelector(rootSelector) || document;
  const data = {};
  root.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
    if (el.type === 'checkbox') data[el.id] = el.checked;
    else if (el.type === 'number') data[el.id] = el.value === '' ? null : Number(el.value);
    else if (el.multiple) data[el.id] = Array.from(el.selectedOptions).map(o => o.value);
    else data[el.id] = el.value;
  });
  return data;
}

function setFormData(values, rootSelector = '.modal-body') {
  const root = document.querySelector(rootSelector) || document;
  Object.entries(values || {}).forEach(([id, v]) => {
    const el = root.querySelector(`#${CSS.escape(id)}`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.multiple && Array.isArray(v)) {
      Array.from(el.options).forEach(o => { o.selected = v.includes(o.value); });
    } else {
      el.value = v == null ? '' : v;
    }
  });
}

function resetForm(rootSelector = '.modal-body') {
  const root = document.querySelector(rootSelector) || document;
  root.querySelectorAll('form').forEach(f => f.reset());
  clearFormErrors();
}

function clearFormErrors(rootSelector = '.modal-body') {
  const root = document.querySelector(rootSelector) || document;
  root.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  root.querySelectorAll('.form-error').forEach(el => el.remove());
}

function setFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.add('is-invalid');
  let err = el.parentNode.querySelector('.form-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'form-error';
    el.parentNode.appendChild(err);
  }
  err.textContent = message;
}

function focusFirstInvalidField(rootSelector = '.modal-body') {
  const root = document.querySelector(rootSelector) || document;
  const el = root.querySelector('.is-invalid');
  if (el) { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }
}

/* ------------------------------------------------------------------
 * 7. Validators
 * ---------------------------------------------------------------- */

const Validators = {
  required:  (v) => (v !== undefined && v !== null && String(v).trim() !== '') || 'This field is required',
  email:     (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email address',
  phone:     (v) => !v || /^[+0-9 ()\-]{7,20}$/.test(v) || 'Invalid phone number',
  number:    (v) => v === null || v === undefined || v === '' || !isNaN(Number(v)) || 'Must be a number',
  integer:   (v) => v === null || v === undefined || v === '' || Number.isInteger(Number(v)) || 'Must be a whole number',
  minLength: (n) => (v) => !v || String(v).length >= n || `Must be at least ${n} characters`,
  maxLength: (n) => (v) => !v || String(v).length <= n || `Must be at most ${n} characters`,
  min:       (n) => (v) => v === '' || v === null || v === undefined || Number(v) >= n || `Must be ≥ ${n}`,
  max:       (n) => (v) => v === '' || v === null || v === undefined || Number(v) <= n || `Must be ≤ ${n}`,
  url:       (v) => !v || /^https?:\/\/.+/.test(v) || 'Must be a valid URL',
  password:  (v) => !v || v.length >= 8 || 'Password must be at least 8 characters',
  match:     (otherId) => (v) => {
    const other = document.getElementById(otherId);
    if (!other) return true;
    return v === other.value || 'Values do not match';
  },
  oneOf:     (list) => (v) => !v || list.includes(v) || `Must be one of: ${list.join(', ')}`,
  currency:  (v) => v === '' || v === null || v === undefined || /^\d+(\.\d{1,2})?$/.test(String(v)) || 'Invalid amount',
  date:      (v) => !v || !isNaN(Date.parse(v)) || 'Invalid date',
  futureDate:(v) => !v || Date.parse(v) > Date.now() || 'Date must be in the future',
  pastDate:  (v) => !v || Date.parse(v) < Date.now() || 'Date must be in the past',
};

/**
 * @param {object} data
 * @param {object} rules  e.g. { fieldId: [Validators.required, Validators.minLength(3)] }
 * @returns {{ valid:boolean, errors:Object }}
 */
function validateForm(data, rules) {
  const errors = {};
  for (const fieldId of Object.keys(rules)) {
    const list = rules[fieldId];
    for (const fn of list) {
      const r = fn(data[fieldId]);
      if (r !== true) { errors[fieldId] = r; break; }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function applyValidationErrors(errors, fieldIdMap = {}) {
  Object.entries(errors).forEach(([key, msg]) => {
    const target = fieldIdMap[key] || key;
    setFieldError(target, msg);
  });
  focusFirstInvalidField();
}

/* ------------------------------------------------------------------
 * 8. Security helpers
 * ---------------------------------------------------------------- */

function sanitizeInput(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/<[^>]*>/g, '').trim();
}

function sanitizeMultiline(str) {
  if (!str) return '';
  return String(str).replace(/<[^>]*>/g, '').trim();
}

function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.origin);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return u.toString();
  } catch { return ''; }
}

function safeSetText(el, text) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) el.textContent = text == null ? '' : String(text);
}

function safeSetHtml(el, html) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) el.innerHTML = html; // caller must sanitize
}

/* ------------------------------------------------------------------
 * 9. API helpers
 * ---------------------------------------------------------------- */

async function modalApiRequest(method, url, payload, opts = {}) {
  const {
    loadingMessage   = 'Working…',
    successMessage   = null,
    errorMessage     = null,
    showLoadingModal = false,
    loadingDelayMs   = ModalFramework.defaults.loadingDelayMs,
    refresh          = true,
    rerender         = true,
    toast            = true,
    retries          = ModalFramework.defaults.apiRetryCount,
    retryBackoffMs   = ModalFramework.defaults.apiRetryBackoffMs,
    signal           = null,
  } = opts;

  let loadingTimer = null;
  let loadingOpen = false;

  const showLoad = () => {
    loadingTimer = setTimeout(() => { openLoadingModal(loadingMessage); loadingOpen = true; }, loadingDelayMs);
  };
  const hideLoad = () => {
    if (loadingTimer) clearTimeout(loadingTimer);
    if (loadingOpen) closeModal();
  };

  if (showLoadingModal) showLoad();

  let attempt = 0;
  const maxAttempts = Math.max(1, retries + 1);

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const result = await apiCall(url, method, payload, { signal });
      hideLoad();
      if (refresh)   await loadAllData();
      if (rerender && typeof rerenderRoleContent === 'function') rerenderRoleContent();
      if (toast && successMessage) showToast(successMessage, 'success');
      mfLog(method, url, 'OK');
      trackModalAnalytics('modal_api_success', { method, url });
      return { ok: true, data: result };
    } catch (e) {
      const status = e?.status || e?.response?.status;
      const retriable = !status || status >= 500 || status === 429;
      if (attempt < maxAttempts && retriable) {
        mfWarn(`Retrying ${method} ${url} (${attempt}/${maxAttempts})`);
        await mfSleep(retryBackoffMs * attempt);
        continue;
      }
      hideLoad();
      handleModalError(e, errorMessage);
      trackModalAnalytics('modal_api_error', { method, url, status });
      return { ok: false, error: e };
    }
  }
  hideLoad();
  return { ok: false, error: new Error('Request failed') };
}

function modalApiCreate(url, payload, opts = {}) { return modalApiRequest('POST',   url, payload, opts); }
function modalApiUpdate(url, payload, opts = {}) { return modalApiRequest('PUT',    url, payload, opts); }
function modalApiPatch (url, payload, opts = {}) { return modalApiRequest('PATCH',  url, payload, opts); }
function modalApiDelete(url, payload, opts = {}) { return modalApiRequest('DELETE', url, payload, opts); }

/**
 * Batch multiple API calls. Runs in parallel by default.
 * @param {Array<{method, url, payload, opts?}>} ops
 * @returns {Promise<Array<{ok, data?, error?}>>}
 */
async function modalApiBatch(ops, { parallel = true } = {}) {
  const run = (op) => modalApiRequest(op.method, op.url, op.payload, { refresh: false, rerender: false, ...op.opts });
  const results = parallel ? await Promise.all(ops.map(run)) : [];
  if (!parallel) for (const op of ops) results.push(await run(op));
  if (results.some(r => r.ok)) {
    await refreshModalData(true);
    if (typeof rerenderRoleContent === 'function') rerenderRoleContent();
  }
  return results;
}

/* ------------------------------------------------------------------
 * 10. State helpers
 * ---------------------------------------------------------------- */

async function refreshModalData(silent = true) {
  try { await loadAllData(); }
  catch (e) { if (!silent) showToast(e.message || 'Refresh failed', 'error'); }
}

async function refreshAfterMutation(opts = {}) {
  await refreshModalData(true);
  if (typeof rerenderRoleContent === 'function') rerenderRoleContent();
  if (opts.clearCache) clearModalCache();
}

function getCurrentUser() { return S?.me || S?.user || null; }
function getCurrentRole() { return S?.role || S?.me?.role || null; }

function isRole(...roles) {
  const r = getCurrentRole();
  return roles.includes(r);
}

/* ------------------------------------------------------------------
 * 11. Permission helpers
 * ---------------------------------------------------------------- */

function can(permission) {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.is_admin || user.role === 'admin') return true;
  const perms = user.permissions || [];
  return perms.includes(permission) || perms.includes('*');
}

function requirePermission(permission, action = 'perform this action') {
  if (can(permission)) return true;
  showToast(`You do not have permission to ${action}`, 'error');
  return false;
}

function ownsResource(resource, ownerKey = 'user_id') {
  const user = getCurrentUser();
  if (!user || !resource) return false;
  if (user.is_admin) return true;
  return String(resource[ownerKey]) === String(user.id);
}

/* ------------------------------------------------------------------
 * 12. UI helpers
 * ---------------------------------------------------------------- */

function disableModalSubmit(selector = '.modal-footer button.btn-primary, .modal-footer button.btn-danger') {
  document.querySelectorAll(selector).forEach(b => {
    b.disabled = true;
    b.dataset.mfOriginalText = b.textContent;
    b.textContent = 'Working…';
  });
}

function enableModalSubmit(selector = '.modal-footer button.btn-primary, .modal-footer button.btn-danger') {
  document.querySelectorAll(selector).forEach(b => {
    b.disabled = false;
    if (b.dataset.mfOriginalText) { b.textContent = b.dataset.mfOriginalText; delete b.dataset.mfOriginalText; }
  });
}

function setModalError(message) {
  let el = document.getElementById('mfModalError');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mfModalError';
    el.className = 'modal-error';
    el.setAttribute('role', 'alert');
    document.querySelector('.modal-body')?.prepend(el);
  }
  el.textContent = message;
  el.style.display = 'block';
}

function clearModalError() {
  const el = document.getElementById('mfModalError');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function setModalBusy(busy = true, message = 'Working…') {
  const modal = document.querySelector('.modal');
  if (!modal) return;
  if (busy) {
    modal.classList.add('is-busy');
    if (!modal.querySelector('.modal-busy-overlay')) {
      const ov = document.createElement('div');
      ov.className = 'modal-busy-overlay';
      ov.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>${esc(message)}</span>`;
      modal.appendChild(ov);
    }
  } else {
    modal.classList.remove('is-busy');
    modal.querySelector('.modal-busy-overlay')?.remove();
  }
}

/* ------------------------------------------------------------------
 * 13. Error handling
 * ---------------------------------------------------------------- */

const HTTP_ERROR_MESSAGES = {
  400: 'Invalid information. Please check the form and try again.',
  401: 'Please log in to continue.',
  403: 'You do not have permission to do this.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with existing data.',
  410: 'This resource is no longer available.',
  422: 'Validation failed. Please review your input.',
  429: 'Too many requests. Please slow down and try again.',
  500: 'Server error. Please try again later.',
  502: 'Bad gateway. Please try again.',
  503: 'Service temporarily unavailable.',
  504: 'Request timed out. Please try again.',
};

function handleModalError(e, fallback = null) {
  const status = e?.status || e?.response?.status;
  const msg = HTTP_ERROR_MESSAGES[status] || fallback || e?.message || 'Something went wrong.';
  mfWarn('Modal error:', status, msg);
  setModalError(msg);
  showToast(msg, 'error');
  if (ModalFramework.flags.enableAuditLog) {
    trackModalAudit('modal_error', { status, message: msg });
  }
}

/* ------------------------------------------------------------------
 * 14. Unsaved-change guard
 * ---------------------------------------------------------------- */

const _modalDirtyState = { baseline: null, dirty: false, formId: null };

function trackFormChanges(rootSelector = '.modal-body') {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  _modalDirtyState.baseline = getFormData(rootSelector);
  _modalDirtyState.dirty = false;
  _modalDirtyState.formId = rootSelector;
  root.addEventListener('input',  () => { _modalDirtyState.dirty = true; });
  root.addEventListener('change', () => { _modalDirtyState.dirty = true; });

  window.addEventListener('beforeunload', _beforeUnloadGuard);
}

function _beforeUnloadGuard(e) {
  if (_modalDirtyState.dirty) { e.preventDefault(); e.returnValue = ''; }
}

function untrackFormChanges() {
  window.removeEventListener('beforeunload', _beforeUnloadGuard);
  _modalDirtyState.dirty = false;
  _modalDirtyState.baseline = null;
}

function isFormDirty() { return _modalDirtyState.dirty; }

async function confirmDiscardChanges() {
  if (!ModalFramework.flags.unsavedChangeGuard || !_modalDirtyState.dirty) return true;
  const { confirmed } = await openConfirmModal({
    title: 'Unsaved changes',
    message: 'You have unsaved changes. Discard them?',
    confirmText: 'Discard',
    cancelText: 'Keep editing',
    danger: true,
  });
  if (confirmed) untrackFormChanges();
  return confirmed;
}

/* ------------------------------------------------------------------
 * 15. Accessibility
 * ---------------------------------------------------------------- */

function enhanceModalAccessibility(titleId = 'modalTitle') {
  const modal = document.querySelector('.modal');
  if (!modal) return;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', titleId);

  if (ModalFramework.flags.enableFocusTrap) {
    modal.addEventListener('keydown', _focusTrapHandler);
  }
  if (ModalFramework.flags.enableEscapeClose) {
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    });
  }
  setTimeout(() => {
    const auto = modal.querySelector('[data-autofocus]') || modal.querySelector('input:not([type=hidden]), textarea, select, button');
    auto?.focus();
  }, 60);
}

function _focusTrapHandler(e) {
  if (e.key !== 'Tab') return;
  const modal = e.currentTarget;
  const focusables = modal.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function announce(message, priority = 'polite') {
  let live = document.getElementById('mfAriaLive');
  if (!live) {
    live = document.createElement('div');
    live.id = 'mfAriaLive';
    live.setAttribute('aria-live', priority);
    live.className = 'sr-only';
    document.body.appendChild(live);
  }
  live.textContent = '';
  setTimeout(() => { live.textContent = message; }, 40);
}

/* ------------------------------------------------------------------
 * 16. Mobile helpers
 * ---------------------------------------------------------------- */

function enableSwipeToDismiss() {
  if (!ModalFramework.flags.enableSwipeClose) return;
  const modal = document.querySelector('.modal');
  if (!modal || modal.dataset.swipeBound) return;
  modal.dataset.swipeBound = '1';

  let startY = null, currentY = 0;
  const onStart = (e) => { startY = (e.touches ? e.touches[0].clientY : e.clientY); currentY = startY; };
  const onMove = (e) => {
    if (startY === null) return;
    currentY = (e.touches ? e.touches[0].clientY : e.clientY);
    const delta = currentY - startY;
    if (delta > 0) modal.style.transform = `translateY(${delta}px)`;
  };
  const onEnd = () => {
    const delta = currentY - (startY || 0);
    modal.style.transform = '';
    if (delta > 120) closeModal();
    startY = null;
  };
  modal.addEventListener('touchstart', onStart, { passive: true });
  modal.addEventListener('touchmove',  onMove,  { passive: true });
  modal.addEventListener('touchend',   onEnd);
}

/* ------------------------------------------------------------------
 * 17. Analytics & audit hooks
 * ---------------------------------------------------------------- */

function trackModalAnalytics(eventName, payload = {}) {
  if (!ModalFramework.flags.enableAnalytics) return;
  try {
    if (typeof window.trackEvent === 'function') window.trackEvent(eventName, payload);
    else mfLog('analytics', eventName, payload);
  } catch (e) { mfWarn('analytics failed', e); }
}

function trackModalAudit(eventName, payload = {}) {
  if (!ModalFramework.flags.enableAuditLog) return;
  try {
    if (typeof window.auditLog === 'function') window.auditLog(eventName, payload);
    else mfLog('audit', eventName, payload);
  } catch (e) { mfWarn('audit failed', e); }
}

/* ------------------------------------------------------------------
 * 18. Utilities
 * ---------------------------------------------------------------- */

function mfSleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function mfDebounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function mfThrottle(fn, ms = 300) {
  let last = 0; return (...a) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...a); }
  };
}

function mfUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function mfClone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function mfFormatDate(value, withTime = false) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  const opts = withTime
    ? { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: '2-digit' };
  return d.toLocaleDateString(undefined, opts);
}

function mfFormatMoney(amount, currency = 'USD') {
  const n = Number(amount || 0);
  return n.toLocaleString(undefined, { style: 'currency', currency });
}

function mfRelativeTime(value) {
  if (!value) return '';
  const d = new Date(value); if (isNaN(d)) return String(value);
  const diff = Math.round((d - Date.now()) / 1000);
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(diff, 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(diff / 2592000), 'month');
  return rtf.format(Math.round(diff / 31536000), 'year');
}

function mfEscapeRegex(str) { return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function mfQuerySelectorAllArray(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

/* ------------------------------------------------------------------
 * 19. Clipboard & downloads
 * ---------------------------------------------------------------- */

async function copyToClipboard(text, successMessage = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage, 'success');
    return true;
  } catch { showToast('Copy failed', 'error'); return false; }
}

function downloadTextFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJson(filename, obj) {
  downloadTextFile(filename, JSON.stringify(obj, null, 2), 'application/json');
}

/* ------------------------------------------------------------------
 * 20. Keyboard shortcuts
 * ---------------------------------------------------------------- */

const _modalShortcuts = new Map();

function registerModalShortcut(key, handler, opts = {}) {
  const sig = `${opts.ctrl ? 'Ctrl+' : ''}${opts.shift ? 'Shift+' : ''}${key}`;
  _modalShortcuts.set(sig, handler);
  if (!_modalShortcutListenerBound) {
    document.addEventListener('keydown', _modalShortcutListener);
    _modalShortcutListenerBound = true;
  }
}

let _modalShortcutListenerBound = false;
function _modalShortcutListener(e) {
  const sig = `${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
  const fn = _modalShortcuts.get(sig);
  if (fn) { e.preventDefault(); fn(e); }
}

/* ------------------------------------------------------------------
 * 21. Wizard / multi-step forms
 * ---------------------------------------------------------------- */

function openWizardModal({ title, steps, onComplete, submitText = 'Finish' }) {
  let index = 0;
  const total = steps.length;

  const render = () => {
    const step = steps[index];
    openModal({
      title: `${title} (${index + 1}/${total})`,
      className: 'modal-lg',
      body: `
        <div class="wizard-progress" aria-hidden="true">
          <div class="wizard-progress-bar" style="width:${((index + 1) / total) * 100}%"></div>
        </div>
        <h3 class="panel-title">${esc(step.title)}</h3>
        <div class="wizard-step-body">${step.body()}</div>`,
      footer: `
        <button class="btn btn-secondary" data-wz-back ${index === 0 ? 'disabled' : ''}>Back</button>
        <button class="btn btn-primary" data-wz-next>${index === total - 1 ? esc(submitText) : 'Next'}</button>`,
    });
    enhanceModalAccessibility();
    step.mount?.();

    $('[data-wz-back]').onclick = async () => {
      if (index > 0) { index--; render(); }
    };
    $('[data-wz-next]').onclick = async () => {
      if (step.validate) {
        const err = await step.validate();
        if (err) { setModalError(err); return; }
      }
      const data = step.collect?.();
      step.onNext?.(data);
      if (index === total - 1) {
        disableModalSubmit();
        const ok = await onComplete?.(data);
        if (ok) { closeModal(); showToast('Completed', 'success'); }
        else enableModalSubmit();
      } else { index++; render(); }
    };
  };
  render();
}

/* ------------------------------------------------------------------
 * 22. Auto-save drafts
 * ---------------------------------------------------------------- */

const _autosaveTimers = new Map();

function startAutosave(formKey, getData, saveFn, intervalMs = ModalFramework.defaults.autosaveIntervalMs) {
  if (!ModalFramework.flags.enableAutosave) return;
  stopAutosave(formKey);
  const t = setInterval(async () => {
    try {
      const data = getData();
      await saveFn(data);
      mfLog('autosave', formKey, data);
    } catch (e) { mfWarn('autosave failed', formKey, e); }
  }, intervalMs);
  _autosaveTimers.set(formKey, t);
}

function stopAutosave(formKey) {
  const t = _autosaveTimers.get(formKey);
  if (t) { clearInterval(t); _autosaveTimers.delete(formKey); }
}

/* ------------------------------------------------------------------
 * 23. File & image upload helpers
 * ---------------------------------------------------------------- */

const FILE_LIMITS = {
  imageMaxBytes: 5 * 1024 * 1024,
  docMaxBytes:   20 * 1024 * 1024,
  imageMimes:    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  docMimes:      ['application/pdf', 'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

function validateFile(file, kind = 'image') {
  if (!file) return 'No file selected';
  if (kind === 'image') {
    if (!FILE_LIMITS.imageMimes.includes(file.type)) return 'Unsupported image format';
    if (file.size > FILE_LIMITS.imageMaxBytes) return 'Image too large (max 5 MB)';
  } else if (kind === 'doc') {
    if (!FILE_LIMITS.docMimes.includes(file.type)) return 'Unsupported document format';
    if (file.size > FILE_LIMITS.docMaxBytes) return 'Document too large (max 20 MB)';
  }
  return null;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function uploadModalFile(file, endpoint, fieldName = 'file') {
  const fd = new FormData();
  fd.append(fieldName, file);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: fd,
      credentials: 'include',
      headers: mfAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    return await res.json();
  } catch (e) {
    handleModalError(e, 'Upload failed');
    throw e;
  }
}

function mfAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ------------------------------------------------------------------
 * 24. Course curriculum loader (existing, unchanged API)
 * ---------------------------------------------------------------- */

async function loadCourseCurriculum(courseId) {
  try {
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    S.courseCurriculum[courseId] = d;
  } catch (_) { S.courseCurriculum[courseId] = { modules: [] }; }
}