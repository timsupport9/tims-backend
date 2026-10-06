/* ============================================================
   ExpertHub 2.0 — 05-auth.js  (expanded ×2)
   Auth actions + all auth screens. Delegates token state and
   teardown to 04-api.js (setToken, performLogoutCleanup).

   Contents
   ---------
   0   Module state
   1   Shared form utilities
   1b  Validation primitives
   1c  UI primitives (modals, countdowns, clipboard, banners)
   2   Remember-me / multi-account / return-url
   3   Auth actions
   4   Session expiry + idle watcher
   5   Cross-tab auth sync
   6   Login screen
   7   2FA screen
   7b  TOTP enrolment + recovery codes
   8   Register screen
   9   Forgot / reset
   10  Setup account (invited users)
   11  Certificate verification
   12  Auth router
   13  Init
   ============================================================ */

/* ============================================================
   SECTION 0 — MODULE STATE
   ============================================================ */

const _auth = {
  /* login throttling */
  attempts: 0,
  lockedUntil: 0,

  /* pending verifications */
  pending2FA: null,      // { challengeId, email, methods: ['totp','sms'] }
  pendingMagicEmail: null,

  /* subscriptions */
  channel: null,         // BroadcastChannel('auth')

  /* route signal */
  route: null,

  /* registration draft timer */
  draftTimer: null,

  /* --- expanded state --- */
  idleTimer: null,           // setTimeout handle for idle warning
  idleWarningShown: false,
  lastActivity: Date.now(),
  trustedDevice: false,      // did the user tick "trust this device"?

  /* resend cooldowns keyed by purpose: { 'magic': ts, 'sms': ts, 'reset': ts } */
  resendUntil: Object.create(null),
  resendTimers: Object.create(null),

  /* in-flight aborts, keyed by purpose */
  aborters: new Map(),

  /* passkey availability cached */
  passkeySupported: null,

  /* last breach-check result cache: { password: hash, count: n, at: ts } */
  breachCache: null,

  /* recovery codes shown after enrolment (one-shot display) */
  recoveryCodes: null,
};

const AUTH_CFG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_MS: 60_000,
  PWD_MIN: 8,
  PWD_MAX: 128,
  DRAFT_KEY: 'auth.register.draft',
  LAST_EMAIL_KEY: 'auth.last.email',
  REMEMBER_KEY: 'auth.remember',
  ACCOUNTS_KEY: 'auth.accounts',
  DEVICE_TRUST_KEY: 'auth.device.trusted',
  IDLE_WARN_MS: 25 * 60 * 1000,      // warn at 25 min idle
  IDLE_LOGOUT_MS: 30 * 60 * 1000,    // hard logout at 30 min idle
  RESEND_COOLDOWN_MS: 30_000,
  OTP_LENGTH: 6,
  OTP_TTL_MS: 10 * 60 * 1000,
  EMAIL_DOMAINS: ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'proton.me', 'protonmail.com'],
  COMMON_TYPOS: {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
    'gmail.con': 'gmail.com', 'gnail.com': 'gmail.com',
    'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'hotmial.com': 'hotmail.com',
    'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
    'iclod.com': 'icloud.com', 'iclould.com': 'icloud.com',
  },
};

const _sleep2 = ms => new Promise(r => setTimeout(r, ms));
const _emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const _phoneRe = /^\+?[0-9\s\-()]{7,20}$/;

/* ============================================================
   SECTION 1 — SHARED FORM UTILITIES
   ============================================================ */

/** Wire a submit handler safely: prevents double-submit, shows spinner, surfaces errors. */
function onSubmit(formSel, handler) {
  const form = $(formSel);
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn?.dataset.busy === '1') return;
    setBusy(btn, true);
    try {
      await handler(e, form);
    } catch (err) {
      showToast(userMessage(err), 'error', 6000);
    } finally {
      setBusy(btn, false);
    }
  });
}

/** Toggle a button's busy state, preserving its original label. */
function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.dataset.label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner spinner-xs"></span> ${label || btn.dataset.label}`;
  } else {
    if (btn.dataset.busy !== '1') return;
    btn.dataset.busy = '0';
    btn.disabled = false;
    btn.innerHTML = btn.dataset.label || btn.innerHTML;
  }
}

/**
 * Add a caps-lock warning + toggle-visibility button to every password input
 * in a container. Also enforces maxlength and offers a paste guard.
 */
function wirePasswordInputs(root, { maxLength = AUTH_CFG.PWD_MAX } = {}) {
  $$('input[type="password"]', root).forEach(inp => {
    if (inp.dataset.wired === '1') return;
    inp.dataset.wired = '1';

    if (maxLength && !inp.maxLength) inp.maxLength = maxLength;

    const wrap = document.createElement('div');
    wrap.className = 'input-wrap';
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'input-trailing';
    toggle.setAttribute('aria-label', 'Show password');
    toggle.setAttribute('tabindex', '-1');
    toggle.innerHTML = '<i class="fas fa-eye"></i>';
    toggle.onclick = () => {
      const showing = inp.type === 'text';
      inp.type = showing ? 'password' : 'text';
      toggle.innerHTML = `<i class="fas fa-eye${showing ? '' : '-slash'}"></i>`;
      toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      /* Preserve caret position when toggling */
      const pos = inp.selectionStart;
      inp.focus();
      try { inp.setSelectionRange(pos, pos); } catch {}
    };
    wrap.appendChild(toggle);

    const warn = document.createElement('p');
    warn.className = 'form-hint text-warning';
    warn.hidden = true;
    warn.textContent = 'Caps Lock is on';
    wrap.parentNode.insertBefore(warn, wrap.nextSibling);

    inp.addEventListener('keyup', e => {
      warn.hidden = !(e.getModifierState && e.getModifierState('CapsLock'));
    });
    inp.addEventListener('blur', () => { warn.hidden = true; });
  });
}

/** Compute a 0–4 strength score. */
function passwordScore(v) {
  let s = 0;
  if (v.length >= AUTH_CFG.PWD_MIN) s++;
  if (v.length >= 12) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return Math.min(4, s);
}

/** Detailed rule-by-rule breakdown, useful for a checklist UI. */
function passwordChecks(v) {
  return [
    { id: 'len',  label: `At least ${AUTH_CFG.PWD_MIN} characters`, ok: v.length >= AUTH_CFG.PWD_MIN },
    { id: 'long', label: 'At least 12 characters',                 ok: v.length >= 12 },
    { id: 'case', label: 'Upper and lower case',                   ok: /[A-Z]/.test(v) && /[a-z]/.test(v) },
    { id: 'num',  label: 'At least one number',                    ok: /[0-9]/.test(v) },
    { id: 'sym',  label: 'At least one symbol',                    ok: /[^A-Za-z0-9]/.test(v) },
  ];
}

const PWD_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const PWD_COLORS = ['#dc2626', '#dc2626', '#f59e0b', '#65a30d', '#059669'];

function renderStrength(barEl, hintEl, value) {
  const score = passwordScore(value);
  if (barEl) {
    barEl.style.width = `${score * 25}%`;
    barEl.style.background = PWD_COLORS[score];
  }
  if (hintEl) {
    hintEl.textContent = value ? PWD_LABELS[score] : '';
    hintEl.style.color = PWD_COLORS[score];
  }
}

/** Render an accessible rule checklist beside a password field. */
function renderChecklist(listEl, value) {
  if (!listEl) return;
  const checks = passwordChecks(value);
  listEl.innerHTML = checks.map(c =>
    `<li class="pwd-rule ${c.ok ? 'pwd-rule-ok' : ''}" data-rule="${c.id}">
       <i class="fas fa-${c.ok ? 'check' : 'circle'}"></i> ${esc(c.label)}
     </li>`).join('');
}

/** Debounce helper (small, local — avoids depending on lodash). */
function debounce(fn, ms = 400) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** Throttle helper — at most one call per `ms`, trailing edge guaranteed. */
function throttle(fn, ms = 250) {
  let last = 0, timer = null, lastArgs = null;
  return (...a) => {
    lastArgs = a;
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...a);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...lastArgs);
      }, remaining);
    }
  };
}

/** Small, XSS-safe field error renderer. */
function setFieldError(inputEl, message) {
  if (!inputEl) return;
  const id = inputEl.id + 'Error';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('p');
    el.id = id;
    el.className = 'form-hint form-hint-error';
    el.setAttribute('role', 'alert');
    inputEl.parentNode.insertBefore(el, inputEl.nextSibling);
  }
  if (message) {
    el.textContent = message;
    el.hidden = false;
    inputEl.setAttribute('aria-invalid', 'true');
  } else {
    el.textContent = '';
    el.hidden = true;
    inputEl.removeAttribute('aria-invalid');
  }
}

/** Mark an input as successfully validated (green tick, no text). */
function setFieldSuccess(inputEl, message) {
  if (!inputEl) return;
  const id = inputEl.id + 'Ok';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('p');
    el.id = id;
    el.className = 'form-hint form-hint-success';
    el.setAttribute('aria-live', 'polite');
    inputEl.parentNode.insertBefore(el, inputEl.nextSibling);
  }
  el.textContent = message || '';
  el.hidden = !message;
  if (message) inputEl.removeAttribute('aria-invalid');
}

function clearFieldErrors(form) {
  $$('.form-hint-error', form).forEach(n => { n.hidden = true; n.textContent = ''; });
  $$('[aria-invalid]', form).forEach(n => n.removeAttribute('aria-invalid'));
}

function clearFieldSuccess(form) {
  $$('.form-hint-success', form).forEach(n => { n.hidden = true; n.textContent = ''; });
}

/** Simple phone formatter: keeps digits, spaces, dashes, plus, parens. */
function normalizePhone(raw) {
  if (!raw) return '';
  let v = String(raw).trim();
  /* Preserve a leading plus; strip everything else non-numeric */
  const plus = v.startsWith('+');
  v = v.replace(/[^\d]/g, '');
  return (plus ? '+' : '') + v;
}

/** Render phone with grouping for readability, e.g. +254 712 345 678. */
function prettyPhone(raw) {
  const n = normalizePhone(raw);
  if (!n) return '';
  const plus = n.startsWith('+');
  const digits = plus ? n.slice(1) : n;
  const groups = [];
  let i = 0;
  /* First group: country code (1-3 digits), remaining groups of 3 */
  const firstLen = digits.length > 10 ? 3 : digits.length > 7 ? 3 : 0;
  if (firstLen) { groups.push(digits.slice(0, firstLen)); i = firstLen; }
  while (i < digits.length) { groups.push(digits.slice(i, i + 3)); i += 3; }
  return (plus ? '+' : '') + groups.join(' ');
}

/* ============================================================
   SECTION 1b — VALIDATION PRIMITIVES
   ============================================================ */

const validators = {
  required: v => (v != null && String(v).trim().length > 0) || 'This field is required',
  email: v => _emailRe.test(String(v).trim()) || 'Enter a valid email address',
  phone: v => !v || _phoneRe.test(String(v).trim()) || 'Enter a valid phone number',
  minLen: n => v => String(v).length >= n || `Must be at least ${n} characters`,
  maxLen: n => v => String(v).length <= n || `Must be at most ${n} characters`,
  sameAs: (getOther, label) => v => v === getOther() || `Must match ${label}`,
  strongPwd: v => passwordScore(v) >= 2 || 'Choose a stronger password',
  checked: v => v === true || 'You must accept this to continue',
};

/**
 * Run a map of { inputEl|selector: validatorOrArray } and return true if valid.
 * Focuses the first invalid field.
 */
function validateFields(form, rules) {
  clearFieldErrors(form);
  let firstBad = null;
  for (const [key, rule] of Object.entries(rules)) {
    const el = typeof key === 'string' && key.startsWith('#')
      ? $(key, form)
      : key;
    if (!el) continue;
    const list = Array.isArray(rule) ? rule : [rule];
    const value = el.type === 'checkbox' ? el.checked : el.value;
    for (const fn of list) {
      const res = fn(value);
      if (res !== true) {
        setFieldError(el, typeof res === 'string' ? res : 'Invalid value');
        if (!firstBad) firstBad = el;
        break;
      }
    }
  }
  if (firstBad) {
    firstBad.focus({ preventScroll: false });
    firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  return true;
}

/** Suggest a corrected email domain for common typos. */
function emailDomainSuggestion(email) {
  const at = String(email).lastIndexOf('@');
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase();
  const fix = AUTH_CFG.COMMON_TYPOS[domain];
  if (fix) return email.slice(0, at + 1) + fix;
  return null;
}

/** A rough "is this plausibly a mailbox" check that avoids hard-failing. */
function looksDeliverable(email) {
  if (!_emailRe.test(email)) return false;
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (domain.endsWith('.con') || domain.endsWith('.cm')) return false;
  return true;
}

/* ============================================================
   SECTION 1c — UI PRIMITIVES
   ============================================================ */

/**
 * Render a countdown into an element and resolve when it reaches 0.
 * Returns a cancel function.
 */
function countdown(el, seconds, { prefix = '', suffix = 's', onDone } = {}) {
  let remaining = Math.max(0, Math.floor(seconds));
  const paint = () => { el.textContent = `${prefix}${remaining}${suffix}`; };
  paint();
  const iv = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(iv);
      paint();
      onDone?.();
      return;
    }
    paint();
  }, 1000);
  return () => clearInterval(iv);
}

/** Start (or restart) a resend cooldown for a given purpose. Returns seconds. */
function beginResendCooldown(purpose, seconds = AUTH_CFG.RESEND_COOLDOWN_MS / 1000) {
  _auth.resendUntil[purpose] = Date.now() + seconds * 1000;
  return seconds;
}

/** Seconds left on a cooldown, 0 if none. */
function resendCooldownLeft(purpose) {
  const until = _auth.resendUntil[purpose] || 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

/** Simple focus trap for modal dialogs. Returns a teardown function. */
function trapFocus(container) {
  const sel = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  const onKey = e => {
    if (e.key !== 'Tab') return;
    const nodes = $$(sel, container).filter(n => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}

/** Open a generic modal with content and wire close behaviour. */
function openModal({ id, title, body, actions = [], onClose } = {}) {
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  if (id) el.id = id;
  el.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id || 'm'}-title">
      <h3 id="${id || 'm'}-title" class="modal-title">${esc(title || '')}</h3>
      <div class="modal-body">${body || ''}</div>
      <div class="modal-actions"></div>
    </div>`;
  const actionsEl = $('.modal-actions', el);
  const close = () => {
    teardown?.();
    el.remove();
    onClose?.();
  };
  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = `btn ${a.className || ''}`;
    btn.textContent = a.label;
    btn.onclick = () => { a.onClick?.(close); if (a.autoClose !== false) close(); };
    actionsEl.appendChild(btn);
  });
  document.body.appendChild(el);
  const teardown = trapFocus(el);
  const esc_ = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc_); } };
  document.addEventListener('keydown', esc_);
  requestAnimationFrame(() => $('button, [href], input', actionsEl)?.focus?.() || $('button, [href], input', el)?.focus?.());
  return { el, close };
}

/** Promise-based confirmation dialog. */
function confirmDialog({ title = 'Are you sure?', body = '', okLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  return new Promise(resolve => {
    let settled = false;
    const { close } = openModal({
      id: 'confirmModal',
      title,
      body: `<p>${esc(body)}</p>`,
      actions: [
        { label: cancelLabel, className: '', onClick: c => { settled = true; c(); resolve(false); } },
        { label: okLabel, className: danger ? 'btn-danger' : 'btn-primary', onClick: c => { settled = true; c(); resolve(true); } },
      ],
      onClose: () => { if (!settled) resolve(false); },
    });
  });
}

/** Copy text with a secure-context fallback. */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    return true;
  } catch {
    return false;
  }
}

/** Show a persistent inline banner inside a container. */
function showBanner(container, message, { kind = 'info', id = 'authBanner', dismissible = true } = {}) {
  if (!container) return null;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = `alert alert-${kind}`;
    el.setAttribute('role', 'status');
    container.prepend(el);
  } else {
    el.className = `alert alert-${kind}`;
  }
  el.innerHTML = `<span>${esc(message)}</span>`;
  if (dismissible) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'alert-close';
    b.setAttribute('aria-label', 'Dismiss');
    b.innerHTML = '<i class="fas fa-times"></i>';
    b.onclick = () => el.remove();
    el.appendChild(b);
  }
  return el;
}

/* ============================================================
   SECTION 2 — REMEMBER-ME / MULTI-ACCOUNT / RETURN-URL
   ============================================================ */

function getReturnPath() {
  const params = new URLSearchParams(location.search);
  const q = params.get('next');
  if (q && q.startsWith('/')) return q;
  const h = location.hash.match(/^#\/(?:login|register)\?next=(.+)$/);
  if (h) return decodeURIComponent(h[1]);
  return null;
}

function setReturnPathAfterLogin(role) {
  const next = getReturnPath();
  if (next && !next.startsWith('/login') && !next.startsWith('/register')) {
    location.hash = '#' + next;
  } else {
    location.hash = role === 'institution' ? '#/institution/dashboard' : '#/dashboard';
  }
}

function rememberEmail(email) {
  if (localStorage.getItem(AUTH_CFG.REMEMBER_KEY) === '0') return;
  localStorage.setItem(AUTH_CFG.LAST_EMAIL_KEY, email);
}

function getRememberedEmail() {
  return localStorage.getItem(AUTH_CFG.LAST_EMAIL_KEY) || '';
}

/* --- multi-account list --- */

function getRememberedAccounts() {
  try {
    const raw = JSON.parse(localStorage.getItem(AUTH_CFG.ACCOUNTS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(a => a && a.email) : [];
  } catch { return []; }
}

function rememberAccount({ email, name, role, avatar }) {
  if (!email) return;
  if (localStorage.getItem(AUTH_CFG.REMEMBER_KEY) === '0') return;
  const list = getRememberedAccounts().filter(a => a.email !== email);
  list.unshift({ email, name: name || '', role: role || '', avatar: avatar || '', at: Date.now() });
  /* keep the list to a sane size */
  localStorage.setItem(AUTH_CFG.ACCOUNTS_KEY, JSON.stringify(list.slice(0, 5)));
}

function forgetAccount(email) {
  const list = getRememberedAccounts().filter(a => a.email !== email);
  localStorage.setItem(AUTH_CFG.ACCOUNTS_KEY, JSON.stringify(list));
  if (getRememberedEmail() === email) localStorage.removeItem(AUTH_CFG.LAST_EMAIL_KEY);
}

/* --- device trust --- */

function isDeviceTrusted() {
  return localStorage.getItem(AUTH_CFG.DEVICE_TRUST_KEY) === '1';
}

function setDeviceTrusted(flag) {
  if (flag) localStorage.setItem(AUTH_CFG.DEVICE_TRUST_KEY, '1');
  else localStorage.removeItem(AUTH_CFG.DEVICE_TRUST_KEY);
}

/* ============================================================
   SECTION 3 — AUTH ACTIONS
   ============================================================ */

/**
 * Full login: credentials → (optional 2FA challenge) → session hydration.
 * Returns { user } or { mfa_required, challenge }.
 */
async function login(email, password, { remember = true, otp = null, challengeId = null, trustDevice = false } = {}) {
  /* ---- client-side lockout ---- */
  const now = Date.now();
  if (now < _auth.lockedUntil) {
    const s = Math.ceil((_auth.lockedUntil - now) / 1000);
    throw new ApiError(`Too many attempts. Try again in ${s}s.`, { code: 'RATE_LIMITED' });
  }

  const body = { email, password };
  if (otp && challengeId) { body.otp = otp; body.challenge_id = challengeId; }
  if (trustDevice) body.trust_device = true;

  let data;
  try {
    data = await apiCall('/api/auth/login', 'POST', body, false, {
      rateKey: 'auth:login',
      retries: 0,
    });
  } catch (err) {
    if (err.status === 401 || err.code === 'INVALID_CREDENTIALS') {
      _auth.attempts++;
      if (_auth.attempts >= AUTH_CFG.MAX_ATTEMPTS) {
        _auth.lockedUntil = Date.now() + AUTH_CFG.LOCKOUT_MS;
        _auth.attempts = 0;
        throw new ApiError(
          `Too many failed attempts. Locked for ${AUTH_CFG.LOCKOUT_MS / 1000}s.`,
          { code: 'RATE_LIMITED' });
      }
      const left = AUTH_CFG.MAX_ATTEMPTS - _auth.attempts;
      throw new ApiError(`${err.message || 'Invalid credentials'} — ${left} attempt${left === 1 ? '' : 's'} left`,
        { status: 401, code: 'INVALID_CREDENTIALS' });
    }
    throw err;
  }
  _auth.attempts = 0;

  /* ---- server asked for 2FA ---- */
  if (data.mfa_required) {
    _auth.pending2FA = {
      challengeId: data.challenge_id,
      email,
      methods: data.methods || ['totp'],
      remember,
      trustDevice,
      expiresAt: Date.now() + AUTH_CFG.OTP_TTL_MS,
    };
    return { mfa_required: true, challenge: _auth.pending2FA };
  }

  /* ---- success: hydrate session ---- */
  await _completeLogin(data, { email, remember });
  return { user: currentUser };
}

/** Called after successful password + (optional) 2FA. */
async function _completeLogin(data, { email, remember = true } = {}) {
  /* Persistence scope */
  localStorage.setItem(AUTH_CFG.REMEMBER_KEY, remember ? '1' : '0');
  if (_auth.trustedDevice) setDeviceTrusted(true);

  /* Hand token persistence to 04-api.js */
  setToken(data.token, data.refresh);

  currentUser = data.user;
  currentUserRole = data.user.role;
  S.userIntent = data.user.intent || 'both';
  localStorage.setItem('user', JSON.stringify(currentUser));
  if (email) rememberEmail(email);
  rememberAccount({
    email: currentUser.email,
    name: currentUser.name,
    role: currentUser.role,
    avatar: currentUser.avatar,
  });

  /* Theme */
  if (data.user.theme) {
    document.documentElement.classList.toggle('dark', data.user.theme === 'dark');
  }

  /* Institution branding */
  if (data.user.role === 'institution') {
    try {
      const b = await apiCall('/api/institution/branding');
      const branding = b?.branding || {};
      if (branding.primary_color) {
        document.documentElement.style.setProperty('--brand', branding.primary_color);
      }
      if (branding.accent_color) {
        document.documentElement.style.setProperty('--accent', branding.accent_color);
      }
      if (branding.logo_url) {
        const link = document.querySelector('link[rel~="icon"]') || document.createElement('link');
        link.rel = 'icon';
        link.href = branding.logo_url;
        document.head.appendChild(link);
      }
    } catch (_) { /* branding is best-effort */ }
  }

  /* Capabilities */
  await loadCapabilities().catch(() => {});

  /* Realtime + initial data */
  initializeSocket();
  await loadAllData();

  /* Route */
  appPhase = 'dashboard';
  activeTab = 'dashboard';
  setReturnPathAfterLogin(currentUserRole);
  renderDashboard();

  showToast(`Welcome back, ${currentUser.name}!`, 'success');
  startPolling();
  startIdleWatcher();

  /* Cross-tab sync */
  _auth.channel?.postMessage({ type: 'login', email: currentUser.email });
}

/** Registration. Saves a draft, validates, and posts. */
async function register(payload) {
  const data = await apiCall('/api/auth/register', 'POST', payload, false, { retries: 0 });
  localStorage.removeItem(AUTH_CFG.DRAFT_KEY);
  showToast(data.message || 'Registration submitted', 'success');
  return data;
}

/** Passwordless: request a magic link. */
async function requestMagicLink(email) {
  await apiCall('/api/auth/magic-link', 'POST', { email }, false, { retries: 0 });
  _auth.pendingMagicEmail = email;
  showToast(`If an account exists for ${email}, a sign-in link is on the way.`, 'success', 6000);
}

/** Consume a magic link token from the URL. */
async function consumeMagicLink(token) {
  const data = await apiCall('/api/auth/magic-link/consume', 'POST', { token }, false, { retries: 0 });
  await _completeLogin(data, { email: data.user?.email, remember: true });
  return data.user;
}

/** Request a password reset email. */
async function requestPasswordReset(email) {
  await apiCall('/api/auth/forgot', 'POST', { email }, false, { retries: 0 });
  showToast('If the email exists, a reset link was sent.', 'success', 6000);
}

/** Complete password reset. */
async function completePasswordReset(token, password) {
  await apiCall('/api/auth/reset', 'POST', { token, password }, false, { retries: 0 });
  showToast('Password updated. Please sign in.', 'success');
  location.hash = '#/login';
}

/** Account activation for invited users. */
async function setupAccount({ email, password, token }) {
  await apiCall('/api/auth/setup-account', 'POST', { email, password, token }, false, { retries: 0 });
  showToast('Account activated. Redirecting to sign in...', 'success');
  setTimeout(() => { location.hash = '#/login'; }, 1000);
}

/** Verify an OTP / recovery code against a pending 2FA challenge. */
async function verify2FA({ challengeId, email, otp, recoveryCode }) {
  const body = { email, challenge_id: challengeId };
  if (otp) body.otp = otp;
  if (recoveryCode) body.recovery_code = recoveryCode;
  const data = await apiCall('/api/auth/login', 'POST', body, false, { retries: 0 });
  _auth.pending2FA = null;
  return data;
}

/** Ask the server to send an SMS code for the pending 2FA challenge. */
async function send2FASms(challengeId) {
  await apiCall('/api/auth/2fa/sms', 'POST', { challenge_id: challengeId }, false, { retries: 0 });
}

/* --- passkeys (WebAuthn) --- */

function passkeySupported() {
  if (_auth.passkeySupported != null) return _auth.passkeySupported;
  _auth.passkeySupported = !!(window.PublicKeyCredential &&
    navigator.credentials &&
    typeof navigator.credentials.get === 'function');
  return _auth.passkeySupported;
}

/** Begin a passkey sign-in. Throws if unsupported or cancelled. */
async function loginWithPasskey(email) {
  if (!passkeySupported()) {
    throw new ApiError('Passkeys are not supported in this browser.', { code: 'UNSUPPORTED' });
  }
  /* Fetch a challenge from the server */
  const { challenge, allowCredentials } = await apiCall('/api/auth/passkey/begin', 'POST',
    { email }, false, { retries: 0 });

  const b64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const publicKey = {
    challenge: b64(challenge),
    allowCredentials: (allowCredentials || []).map(c => ({ id: b64(c.id), type: 'public-key', transports: c.transports })),
    timeout: 60_000,
    userVerification: 'preferred',
  };
  const credential = await navigator.credentials.get({ publicKey });
  if (!credential) throw new ApiError('Passkey sign-in was cancelled.', { code: 'CANCELLED' });

  const toB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const payload = {
    id: credential.id,
    rawId: toB64(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: toB64(credential.response.authenticatorData),
      clientDataJSON: toB64(credential.response.clientDataJSON),
      signature: toB64(credential.response.signature),
      userHandle: credential.response.userHandle ? toB64(credential.response.userHandle) : null,
    },
  };
  const data = await apiCall('/api/auth/passkey/finish', 'POST', payload, false, { retries: 0 });
  await _completeLogin(data, { email: data.user?.email, remember: true });
  return data.user;
}

/* --- breach check (k-anonymity, no plaintext leaves the device) --- */

async function checkPasswordBreach(password) {
  if (!password || password.length < 4) return 0;
  if (!window.crypto?.subtle) return 0;
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-1', enc);
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const prefix = hex.slice(0, 5);
  const suffix = hex.slice(5);
  if (_auth.breachCache && _auth.breachCache.prefix === prefix && Date.now() - _auth.breachCache.at < 60_000) {
    return _auth.breachCache.hits[suffix] || 0;
  }
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { cache: 'no-store' });
    const text = await res.text();
    const hits = Object.create(null);
    let count = 0;
    text.split('\n').forEach(line => {
      const [sfx, n] = line.trim().split(':');
      if (!sfx) return;
      const num = parseInt(n, 10) || 0;
      hits[sfx] = num;
      if (sfx === suffix) count = num;
    });
    _auth.breachCache = { prefix, hits, at: Date.now() };
    return count;
  } catch {
    return 0;
  }
}

/* --- account switching (same browser) --- */

async function switchAccount(email) {
  if (currentUser?.email === email) return;
  await logout({ silent: true });
  location.hash = `#/login?email=${encodeURIComponent(email)}`;
}

/** Logout — UI teardown only; 04-api.js owns token/data cleanup. */
async function logout({ silent = false } = {}) {
  try {
    if (authToken) await apiCall('/api/auth/logout', 'POST', { refresh: refreshToken });
  } catch (_) { /* server may already be gone */ }

  _auth.channel?.postMessage({ type: 'logout' });

  stopPolling();
  stopIdleWatcher();
  performLogoutCleanup();   // clears tokens, cache, socket, outbox, routes

  appPhase = 'landing';
  location.hash = '#/';
  renderLanding();
  if (!silent) showToast('Signed out', 'info');
}

/* ============================================================
   SECTION 4 — SESSION EXPIRY + IDLE WATCHER
   ============================================================ */

function showSessionExpiredModal() {
  if ($('#sessionExpiredModal')) return;
  const el = document.createElement('div');
  el.id = 'sessionExpiredModal';
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="sxTitle">
      <h3 id="sxTitle" class="modal-title">Session expired</h3>
      <p class="modal-body">For your security, we signed you out. Please sign in again to continue.</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="sxLogin">Sign in</button>
        <button class="btn" id="sxLater">Later</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  $('#sxLogin', el).onclick = () => { close(); location.hash = '#/login'; };
  $('#sxLater', el).onclick = close;
}

/** Begin watching for user inactivity once logged in. */
function startIdleWatcher() {
  stopIdleWatcher();
  _auth.lastActivity = Date.now();
  _auth.idleWarningShown = false;
  const touch = throttle(() => {
    _auth.lastActivity = Date.now();
    if (_auth.idleWarningShown) {
      _auth.idleWarningShown = false;
      $('#idleWarningModal')?.remove();
    }
  }, 5_000, { leading: true });
  ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(ev =>
    window.addEventListener(ev, touch, { passive: true }));
  _auth.idleTimer = setInterval(() => {
    if (!authToken) return;
    const idle = Date.now() - _auth.lastActivity;
    if (idle >= AUTH_CFG.IDLE_LOGOUT_MS) {
      showSessionExpiredModal();
      logout({ silent: true });
    } else if (idle >= AUTH_CFG.IDLE_WARN_MS && !_auth.idleWarningShown) {
      _auth.idleWarningShown = true;
      showIdleWarning();
    }
  }, 15_000);
  _auth._idleTouch = touch;
}

function stopIdleWatcher() {
  if (_auth.idleTimer) { clearInterval(_auth.idleTimer); _auth.idleTimer = null; }
  if (_auth._idleTouch) {
    ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(ev =>
      window.removeEventListener(ev, _auth._idleTouch));
    _auth._idleTouch = null;
  }
  $('#idleWarningModal')?.remove();
}

function showIdleWarning() {
  if ($('#idleWarningModal')) return;
  const el = document.createElement('div');
  el.id = 'idleWarningModal';
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="idleTitle">
      <h3 id="idleTitle" class="modal-title">Still there?</h3>
      <p class="modal-body">You've been idle for a while. We'll sign you out soon to keep your account safe.</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="idleStay">Stay signed in</button>
        <button class="btn" id="idleOut">Sign out</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  $('#idleStay', el).onclick = () => {
    _auth.lastActivity = Date.now();
    _auth.idleWarningShown = false;
    el.remove();
  };
  $('#idleOut', el).onclick = () => { el.remove(); logout(); };
}

/* ============================================================
   SECTION 5 — CROSS-TAB AUTH SYNC
   ============================================================ */

function _initCrossTab() {
  if (typeof BroadcastChannel === 'undefined') return;
  _auth.channel = new BroadcastChannel('expertHub.auth');
  _auth.channel.onmessage = ev => {
    const { type, email } = ev.data || {};
    switch (type) {
      case 'logout':
        if (authToken) logout({ silent: true });
        break;
      case 'login':
        if (!authToken) location.reload();
        else if (email && currentUser?.email !== email) {
          showToast(`Signed in as ${email} in another tab`, 'info');
        }
        break;
      case 'token-refresh':
        /* another tab rotated the token — mirror the new one locally */
        if (ev.data.token) setToken(ev.data.token, ev.data.refresh);
        break;
      case 'theme':
        document.documentElement.classList.toggle('dark', ev.data.dark === true);
        break;
      case 'settings-changed':
        if (typeof loadAllData === 'function') loadAllData().catch(() => {});
        break;
      default:
        break;
    }
  };
}

/* ============================================================
   SECTION 6 — LOGIN SCREEN
   ============================================================ */

function renderLogin() {
  appPhase = 'login';
  const qEmail = new URLSearchParams(location.search).get('email');
  const remembered = qEmail || getRememberedEmail();
  const rememberedOn = localStorage.getItem(AUTH_CFG.REMEMBER_KEY) !== '0';
  const accounts = getRememberedAccounts();

  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-graduation-cap"></i></div>
          <h1 class="auth-title">Expert<span class="auth-title-accent">Hub</span></h1>
          <p class="auth-subtitle">Sign in to your account</p>
          <p class="auth-status"><span class="live-indicator"></span> Secure connection</p>
        </header>

        <div id="authBannerSlot"></div>
        <div id="loginError" class="alert alert-error hidden" role="alert" aria-live="polite"></div>

        ${accounts.length ? `
          <div class="account-switcher" id="accountSwitcher" role="list">
            ${accounts.map(a => `
              <button type="button" class="account-chip" data-email="${esc(a.email)}" role="listitem">
                <span class="account-avatar">${esc((a.name || a.email).slice(0, 1).toUpperCase())}</span>
                <span class="account-meta">
                  <span class="account-name">${esc(a.name || a.email)}</span>
                  <span class="account-email">${esc(a.email)}</span>
                </span>
              </button>`).join('')}
          </div>
          <p class="form-hint" style="text-align:center">Or sign in with another account</p>
        ` : ''}

        <div class="sso-row">
          <button type="button" class="btn btn-oauth" data-sso="google">
            <i class="fab fa-google"></i> Continue with Google
          </button>
          <button type="button" class="btn btn-oauth" data-sso="microsoft">
            <i class="fab fa-microsoft"></i> Continue with Microsoft
          </button>
        </div>
        <div class="divider"><span>or</span></div>

        <form id="loginForm" class="auth-form" novalidate>
          <label class="form-group" for="loginEmail">
            <span class="form-label">Email</span>
            <input id="loginEmail" type="email" required autocomplete="email"
                   inputmode="email" autocapitalize="off" spellcheck="false"
                   class="form-input" placeholder="you@example.com"
                   value="${esc(remembered)}" />
            <p id="loginEmailHint" class="form-hint" aria-live="polite"></p>
          </label>

          <label class="form-group" for="loginPassword">
            <span class="form-label">Password</span>
            <input id="loginPassword" type="password" required autocomplete="current-password"
                   class="form-input" placeholder="Password" />
          </label>

          <div class="form-row">
            <label class="checkbox-row">
              <input type="checkbox" id="rememberMe" ${rememberedOn ? 'checked' : ''} />
              Remember me
            </label>
            <a href="#/forgot" class="link">Forgot password?</a>
          </div>

          <label class="checkbox-row" id="trustRow" hidden>
            <input type="checkbox" id="trustDevice" />
            Trust this device for 30 days
          </label>

          <button type="submit" class="btn btn-primary btn-block" id="loginBtn">Sign in</button>
        </form>

        <button type="button" class="btn btn-block" id="passkeyBtn" hidden style="margin-top:10px">
          <i class="fas fa-fingerprint"></i> Sign in with a passkey
        </button>

        <p class="auth-footer">
          <a href="#" id="magicLink" class="link">Email me a sign-in link instead</a>
        </p>
        <p class="auth-footer">Don't have an account? <a href="#/register" class="link">Create one</a></p>
        <p class="auth-footer" style="margin-top:6px"><a href="#/" class="link"><i class="fas fa-arrow-left"></i> Back to home</a></p>

        ${CONFIG.DEMO_MODE ? `
          <div class="alert alert-info" style="margin-top:18px;font-size:.8rem;flex-direction:column;align-items:flex-start;gap:6px">
            <strong>Demo accounts</strong>
            <span>admin@platform.com / admin123</span>
            <span>expert@platform.com / expert123</span>
            <span>learner@platform.com / learner123</span>
            <span>ops@acme.com / ops123 (Institution Ops Manager)</span>
          </div>` : ''}
      </section>
    </main>`;

  wirePasswordInputs($('#app-root'));

  /* Show lockout banner if still locked */
  const now = Date.now();
  if (now < _auth.lockedUntil) {
    const el = showBanner($('#authBannerSlot')?.parentNode, '', { kind: 'warning', id: 'lockBanner' });
    const secs = Math.ceil((_auth.lockedUntil - now) / 1000);
    countdown(el.querySelector('span'), secs, {
      prefix: 'Too many attempts. Try again in ',
      suffix: 's',
      onDone: () => { el.remove(); },
    });
  }

  /* Account switcher */
  $$('.account-chip', $('#app-root')).forEach(btn => {
    btn.onclick = () => {
      $('#loginEmail').value = btn.dataset.email;
      $('#loginPassword').focus();
    };
  });

  /* SSO */
  $$('[data-sso]', $('#app-root')).forEach(btn => {
    btn.onclick = () => {
      const provider = btn.dataset.sso;
      const next = getReturnPath() || '';
      location.href = `${API_BASE}/api/auth/oauth/${provider}/start?next=${encodeURIComponent(next)}`;
    };
  });

  /* Magic link */
  $('#magicLink').onclick = async e => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    if (!_emailRe.test(email)) return showToast('Enter your email first', 'error');
    const left = resendCooldownLeft('magic');
    if (left > 0) return showToast(`Please wait ${left}s before requesting another link`, 'info');
    try {
      await requestMagicLink(email);
      beginResendCooldown('magic');
      $('#loginPassword').closest('.form-group').style.display = 'none';
    } catch (err) { showToast(userMessage(err), 'error'); }
  };

  /* Passkey button (if supported and a remembered account exists) */
  if (passkeySupported() && remembered) {
    const pkb = $('#passkeyBtn');
    pkb.hidden = false;
    pkb.onclick = async () => {
      setBusy(pkb, true);
      try {
        await loginWithPasskey(remembered);
      } catch (e) {
        if (e.code !== 'CANCELLED') showToast(userMessage(e), 'error');
      } finally {
        setBusy(pkb, false);
      }
    };
  }

  /* Focus the first field so keyboard users land in the right place */
  requestAnimationFrame(() => {
    (remembered ? $('#loginPassword') : $('#loginEmail')).focus();
  });

  /* Email typo suggestion */
  const emailHint = debounce(() => {
    const email = $('#loginEmail').value.trim();
    const fix = emailDomainSuggestion(email);
    const hint = $('#loginEmailHint');
    if (fix && fix !== email) {
      hint.innerHTML = `Did you mean <a href="#" class="link" id="fixEmail">${esc(fix)}</a>?`;
      $('#fixEmail').onclick = ev => {
        ev.preventDefault();
        $('#loginEmail').value = fix;
        hint.textContent = '';
      };
    } else {
      hint.textContent = '';
    }
  }, 500);
  $('#loginEmail').addEventListener('input', emailHint);

  onSubmit('#loginForm', async () => {
    clearFieldErrors($('#loginForm'));
    const email = $('#loginEmail').value.trim();
    const pwd = $('#loginPassword').value;
    const remember = $('#rememberMe').checked;
    const trustDevice = $('#trustDevice').checked;

    let bad = false;
    if (!_emailRe.test(email)) { setFieldError($('#loginEmail'), 'Enter a valid email'); bad = true; }
    if (!pwd) { setFieldError($('#loginPassword'), 'Password is required'); bad = true; }
    if (bad) return;

    const err = $('#loginError');
    err.classList.add('hidden');

    try {
      const res = await login(email, pwd, { remember, trustDevice });
      if (res.mfa_required) {
        location.hash = '#/2fa';
        render2FA(res.challenge);
      }
    } catch (ex) {
      err.textContent = userMessage(ex);
      err.classList.remove('hidden');
      err.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      /* Reveal the trust-device option after a failed attempt hints the account exists */
      if (ex.code === 'INVALID_CREDENTIALS') $('#trustRow').hidden = false;
    }
  });
}

/* ============================================================
   SECTION 7 — 2FA SCREEN
   ============================================================ */

function render2FA(challenge) {
  appPhase = '2fa';
  const c = challenge || _auth.pending2FA;
  if (!c) { location.hash = '#/login'; return; }

  const methods = c.methods || ['totp'];
  const hasSms = methods.includes('sms');

  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-shield-alt"></i></div>
          <h1 class="auth-title">Two-factor verification</h1>
          <p class="auth-subtitle">
            Enter the ${AUTH_CFG.OTP_LENGTH}-digit code from your authenticator app for
            <strong>${esc(c.email)}</strong>.
          </p>
        </header>

        <div id="otpError" class="alert alert-error hidden" role="alert" aria-live="polite"></div>

        <form id="otpForm" class="auth-form" novalidate>
          <label class="form-group" for="otpCode">
            <span class="form-label">Verification code</span>
            <input id="otpCode" type="text" inputmode="numeric" pattern="[0-9]*"
                   maxlength="${AUTH_CFG.OTP_LENGTH}" autocomplete="one-time-code" autocapitalize="off"
                   class="form-input otp-input" placeholder="${'0'.repeat(AUTH_CFG.OTP_LENGTH)}" autofocus />
            <p class="form-hint" id="otpExpiryHint"></p>
          </label>
          <button type="submit" class="btn btn-primary btn-block" id="otpBtn">Verify</button>
        </form>

        ${hasSms ? `
          <button type="button" class="btn btn-block" id="otpSms" style="margin-top:10px">
            Send code via SMS
          </button>` : ''}

        <p class="auth-footer" style="margin-top:8px">
          <a href="#" id="otpRecovery" class="link">Use a recovery code</a>
        </p>
        <p class="auth-footer">
          <a href="#/login" class="link"><i class="fas fa-arrow-left"></i> Back to sign in</a>
        </p>
      </section>
    </main>`;

  const codeEl = $('#otpCode');
  codeEl.addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, AUTH_CFG.OTP_LENGTH);
    if (e.target.value.length === AUTH_CFG.OTP_LENGTH) $('#otpForm').requestSubmit();
  });

  /* Expiry hint */
  const hint = $('#otpExpiryHint');
  if (c.expiresAt) {
    const leftSecs = Math.max(0, Math.floor((c.expiresAt - Date.now()) / 1000));
    countdown(hint, leftSecs, { prefix: 'Code expires in ', suffix: 's' });
  }

  onSubmit('#otpForm', async () => {
    const otp = codeEl.value.trim();
    const err = $('#otpError');
    err.classList.add('hidden');
    if (otp.length !== AUTH_CFG.OTP_LENGTH) {
      err.textContent = `Enter all ${AUTH_CFG.OTP_LENGTH} digits`;
      err.classList.remove('hidden');
      return;
    }

    try {
      const data = await verify2FA({ challengeId: c.challengeId, email: c.email, otp });
      await _completeLogin(data, { email: c.email, remember: c.remember });
    } catch (ex) {
      err.textContent = userMessage(ex);
      err.classList.remove('hidden');
      codeEl.select();
    }
  });

  const smsBtn = $('#otpSms');
  if (smsBtn) {
    smsBtn.onclick = async () => {
      const left = resendCooldownLeft('sms');
      if (left > 0) return showToast(`Wait ${left}s before requesting another code`, 'info');
      setBusy(smsBtn, true);
      try {
        await send2FASms(c.challengeId);
        beginResendCooldown('sms');
        showToast('Code sent via SMS', 'success');
        const secs = beginResendCooldown('sms', AUTH_CFG.RESEND_COOLDOWN_MS / 1000);
        const orig = smsBtn.innerHTML;
        setBusy(smsBtn, false);
        countdown(smsBtn, secs, {
          prefix: 'Resend in ',
          suffix: 's',
          onDone: () => { smsBtn.disabled = false; smsBtn.innerHTML = orig; },
        });
        smsBtn.disabled = true;
      } catch (e) {
        setBusy(smsBtn, false);
        showToast(userMessage(e), 'error');
      }
    };
  }

  $('#otpRecovery').onclick = async e => {
    e.preventDefault();
    const code = prompt('Enter a recovery code:');
    if (!code) return;
    try {
      const data = await verify2FA({
        challengeId: c.challengeId,
        email: c.email,
        recoveryCode: code.trim(),
      });
      await _completeLogin(data, { email: c.email, remember: c.remember });
    } catch (ex) { showToast(userMessage(ex), 'error'); }
  };
}

/* ============================================================
   SECTION 7b — TOTP ENROLMENT + RECOVERY CODES
   ============================================================ */

async function renderEnrol2FA() {
  appPhase = 'enrol-2fa';

  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-qrcode"></i></div>
          <h1 class="auth-title">Set up two-factor auth</h1>
          <p class="auth-subtitle">Scan the QR code with your authenticator app.</p>
        </header>
        <div style="text-align:center">
          <div class="spinner" style="margin:40px auto"></div>
          <p class="form-hint">Preparing your secret...</p>
        </div>
      </section>
    </main>`;

  let data;
  try {
    data = await apiCall('/api/auth/2fa/enrol', 'POST', {}, false, { retries: 0 });
  } catch (err) {
    showToast(userMessage(err), 'error');
    location.hash = '#/dashboard';
    return;
  }

  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card" style="max-width:560px">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-qrcode"></i></div>
          <h1 class="auth-title">Set up two-factor auth</h1>
          <p class="auth-subtitle">Scan the QR code with your authenticator app, then enter the code to confirm.</p>
        </header>

        <div style="text-align:center;margin:16px 0">
          ${data.qr_svg
            ? `<div class="totp-qr">${data.qr_svg}</div>`
            : `<img alt="TOTP QR code" class="totp-qr" src="${esc(data.qr_url)}" />`}
          <details style="margin-top:12px">
            <summary class="link" style="cursor:pointer">Can't scan? Show setup key</summary>
            <p style="margin-top:8px">
              <code class="code" id="totpSecret">${esc(data.secret)}</code>
              <button type="button" class="btn btn-xs" data-copy="${esc(data.secret)}"><i class="fas fa-copy"></i></button>
            </p>
          </details>
        </div>

        <form id="enrolForm" class="auth-form" novalidate>
          <label class="form-group" for="enrolCode">
            <span class="form-label">Enter the ${AUTH_CFG.OTP_LENGTH}-digit code</span>
            <input id="enrolCode" type="text" inputmode="numeric" pattern="[0-9]*"
                   maxlength="${AUTH_CFG.OTP_LENGTH}" class="form-input otp-input" placeholder="000000" autofocus />
          </label>
          <div id="enrolError" class="alert alert-error hidden" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-block">Confirm</button>
        </form>
        <a href="#/dashboard" class="link link-center">Cancel</a>
      </section>
    </main>`;

  $('#enrolCode').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, AUTH_CFG.OTP_LENGTH);
  });

  $$('[data-copy]').forEach(btn => {
    btn.onclick = async () => {
      const ok = await copyToClipboard(btn.dataset.copy);
      showToast(ok ? 'Copied' : 'Copy failed', ok ? 'success' : 'error', 1500);
    };
  });

  onSubmit('#enrolForm', async () => {
    const code = $('#enrolCode').value.trim();
    const err = $('#enrolError');
    err.classList.add('hidden');
    if (code.length !== AUTH_CFG.OTP_LENGTH) {
      err.textContent = `Enter all ${AUTH_CFG.OTP_LENGTH} digits`;
      err.classList.remove('hidden');
      return;
    }
    try {
      const res = await apiCall('/api/auth/2fa/confirm', 'POST',
        { code, secret: data.secret }, false, { retries: 0 });
      _auth.recoveryCodes = res.recovery_codes || [];
      renderRecoveryCodes();
    } catch (ex) {
      err.textContent = userMessage(ex);
      err.classList.remove('hidden');
    }
  });
}

function renderRecoveryCodes() {
  appPhase = 'recovery-codes';
  const codes = _auth.recoveryCodes || [];
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card" style="max-width:560px">
        <header class="auth-header">
          <div class="auth-logo" style="background:linear-gradient(135deg,#059669,#065f46)">
            <i class="fas fa-check"></i>
          </div>
          <h1 class="auth-title">Two-factor enabled</h1>
          <p class="auth-subtitle">Save these recovery codes somewhere safe. Each works once.</p>
        </header>

        <div class="recovery-codes" id="recoveryList">
          ${codes.map(c => `<code class="code">${esc(c)}</code>`).join('')}
        </div>

        <div class="modal-actions" style="justify-content:center;gap:8px;margin-top:16px">
          <button class="btn" id="copyCodes"><i class="fas fa-copy"></i> Copy</button>
          <button class="btn" id="downloadCodes"><i class="fas fa-download"></i> Download</button>
        </div>

        <p class="form-hint" style="text-align:center;margin-top:12px">
          You won't be able to see these again.
        </p>

        <a href="#/dashboard" class="btn btn-primary btn-block" style="margin-top:16px">Continue to dashboard</a>
      </section>
    </main>`;

  $('#copyCodes').onclick = async () => {
    const ok = await copyToClipboard(codes.join('\n'));
    showToast(ok ? 'Codes copied' : 'Copy failed', ok ? 'success' : 'error', 1500);
  };

  $('#downloadCodes').onclick = () => {
    const blob = new Blob(
      [`ExpertHub recovery codes\nGenerated: ${new Date().toISOString()}\n\n${codes.join('\n')}\n`],
      { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'experthub-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

/* ============================================================
   SECTION 8 — REGISTER SCREEN
   ============================================================ */

function renderRegister() {
  appPhase = 'register';

  const draft = (() => {
    try { return JSON.parse(localStorage.getItem(AUTH_CFG.DRAFT_KEY) || '{}'); }
    catch { return {}; }
  })();

  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-user-plus"></i></div>
          <h1 class="auth-title">Create your <span class="auth-title-accent">account</span></h1>
          <p class="auth-subtitle">Learners are auto-approved. Experts and institutions need admin approval.</p>
        </header>

        <form id="registerForm" class="auth-form" novalidate>
          <div class="role-picker" role="tablist">
            <button type="button" role="tab" data-role="learner" class="role-pick role-pick-active" aria-selected="true">Client</button>
            <button type="button" role="tab" data-role="expert"  class="role-pick" aria-selected="false">Expert</button>
            <button type="button" role="tab" data-role="institution" class="role-pick" aria-selected="false">Institution</button>
          </div>

          <label class="form-group" for="regName">
            <span class="form-label">Full name</span>
            <input id="regName" required autocomplete="name" class="form-input" placeholder="Jane Doe"
                   value="${esc(draft.name || '')}" />
          </label>

          <label class="form-group" for="regEmail">
            <span class="form-label">Email</span>
            <input id="regEmail" type="email" required autocomplete="email" inputmode="email"
                   autocapitalize="off" spellcheck="false" class="form-input"
                   placeholder="you@example.com" value="${esc(draft.email || '')}" />
            <p id="regEmailStatus" class="form-hint" aria-live="polite"></p>
          </label>

          <label class="form-group" for="regPhone">
            <span class="form-label">Phone (optional)</span>
            <input id="regPhone" type="tel" autocomplete="tel" inputmode="tel"
                   class="form-input" placeholder="+254..." value="${esc(draft.phone || '')}" />
          </label>

          <label class="form-group" for="regPassword">
            <span class="form-label">Password</span>
            <input id="regPassword" type="password" required autocomplete="new-password"
                   class="form-input" placeholder="Minimum ${AUTH_CFG.PWD_MIN} characters" />
            <div class="progress-bar"><span id="pwdBar"></span></div>
            <p id="pwdHint" class="form-hint"></p>
            <ul class="pwd-checklist" id="pwdChecklist"></ul>
          </label>

          <label class="form-group" for="regPassword2">
            <span class="form-label">Confirm password</span>
            <input id="regPassword2" type="password" required autocomplete="new-password"
                   class="form-input" />
          </label>

          <div id="expertExtra" class="hidden" style="display:grid;gap:12px">
            <label class="form-group" for="regSpec">
              <span class="form-label">Specialization</span>
              <input id="regSpec" class="form-input" placeholder="e.g. Data Science" />
            </label>
            <label class="form-group" for="regRate">
              <span class="form-label">Hourly rate ($)</span>
              <input id="regRate" type="number" min="0" step="1" class="form-input" placeholder="50" />
            </label>
            <label class="form-group" for="regBio">
              <span class="form-label">Short bio</span>
              <textarea id="regBio" class="form-textarea" rows="3" maxlength="500"></textarea>
              <p class="form-hint"><span id="bioCount">0</span>/500</p>
            </label>
          </div>

          <div id="institutionExtra" class="hidden" style="display:grid;gap:12px">
            <label class="form-group" for="regInstName">
              <span class="form-label">Institution name</span>
              <input id="regInstName" class="form-input" placeholder="Acme Corp Academy" />
            </label>
            <label class="form-group" for="regInstType">
              <span class="form-label">Institution type</span>
              <select id="regInstType" class="form-select">
                ${CONFIG.INSTITUTION_TYPES.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
              </select>
            </label>
            <label class="form-group" for="regInstIndustry">
              <span class="form-label">Industry / Sector</span>
              <input id="regInstIndustry" class="form-input" placeholder="e.g. Banking, Healthcare" />
            </label>
            <label class="form-group" for="regInstOpsEmail">
              <span class="form-label">Operations manager email</span>
              <input id="regInstOpsEmail" type="email" class="form-input" placeholder="ops@acme.com" />
            </label>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" id="regTerms" />
            I agree to the <a href="#/terms" target="_blank" class="link">Terms</a>
            and <a href="#/privacy" target="_blank" class="link">Privacy Policy</a>
          </label>

          <button type="submit" class="btn btn-primary btn-block" id="regBtn">Create account</button>
        </form>

        <p class="auth-footer">Already have an account? <a href="#/login" class="link">Sign in</a></p>
        <p class="auth-footer" style="margin-top:6px"><a href="#/" class="link"><i class="fas fa-arrow-left"></i> Back to home</a></p>
      </section>
    </main>`;

  wirePasswordInputs($('#app-root'));

  /* Role picker */
  $$('.role-pick').forEach(b => b.onclick = () => {
    $$('.role-pick').forEach(x => {
      x.classList.remove('role-pick-active');
      x.setAttribute('aria-selected', 'false');
    });
    b.classList.add('role-pick-active');
    b.setAttribute('aria-selected', 'true');
    const r = b.dataset.role;
    $('#expertExtra').classList.toggle('hidden', r !== 'expert');
    $('#institutionExtra').classList.toggle('hidden', r !== 'institution');
  });

  /* Password strength + checklist */
  $('#regPassword').addEventListener('input', e => {
    renderStrength($('#pwdBar'), $('#pwdHint'), e.target.value);
    renderChecklist($('#pwdChecklist'), e.target.value);
  });

  /* Bio counter */
  $('#regBio').addEventListener('input', e => { $('#bioCount').textContent = e.target.value.length; });

  /* Email availability check — debounced */
  const checkEmail = debounce(async email => {
    const status = $('#regEmailStatus');
    if (!_emailRe.test(email)) { status.textContent = ''; status.className = 'form-hint'; return; }
    const suggestion = emailDomainSuggestion(email);
    if (suggestion && suggestion !== email) {
      status.innerHTML = `Did you mean <a href="#" class="link" id="fixRegEmail">${esc(suggestion)}</a>?`;
      $('#fixRegEmail').onclick = ev => {
        ev.preventDefault();
        $('#regEmail').value = suggestion;
        status.textContent = '';
        checkEmail(suggestion);
      };
      return;
    }
    status.textContent = 'Checking availability...';
    status.className = 'form-hint';
    try {
      const { available } = await apiCall(`/api/auth/email-available?email=${encodeURIComponent(email)}`);
      if (available) {
        status.textContent = 'Email is available';
        status.className = 'form-hint form-hint-success';
        setFieldError($('#regEmail'), '');
      } else {
        status.textContent = 'This email is already registered';
        status.className = 'form-hint form-hint-error';
        setFieldError($('#regEmail'), 'Email already in use');
      }
    } catch {
      status.textContent = '';
    }
  }, 500);

  $('#regEmail').addEventListener('input', e => checkEmail(e.target.value.trim()));

  /* Phone formatting on blur */
  $('#regPhone').addEventListener('blur', e => {
    const pretty = prettyPhone(e.target.value);
    if (pretty) e.target.value = pretty;
  });

  /* Draft persistence */
  const saveDraft = debounce(() => {
    const draft = {
      name: $('#regName').value,
      email: $('#regEmail').value,
      phone: $('#regPhone').value,
      role: $('.role-pick-active')?.dataset.role,
    };
    try { localStorage.setItem(AUTH_CFG.DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, 600);
  $('#registerForm').addEventListener('input', saveDraft);

  /* Submit */
  onSubmit('#registerForm', async () => {
    clearFieldErrors($('#registerForm'));
    clearFieldSuccess($('#registerForm'));
    const role = $('.role-pick-active')?.dataset.role || 'learner';
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const phone = $('#regPhone').value.trim();
    const pwd = $('#regPassword').value;
    const pwd2 = $('#regPassword2').value;
    const terms = $('#regTerms').checked;

    let bad = false;
    if (!name) { setFieldError($('#regName'), 'Name is required'); bad = true; }
    if (!_emailRe.test(email)) { setFieldError($('#regEmail'), 'Enter a valid email'); bad = true; }
    if (phone && !_phoneRe.test(phone)) { setFieldError($('#regPhone'), 'Enter a valid phone'); bad = true; }
    if (pwd.length < AUTH_CFG.PWD_MIN) { setFieldError($('#regPassword'), `At least ${AUTH_CFG.PWD_MIN} characters`); bad = true; }
    if (pwd !== pwd2) { setFieldError($('#regPassword2'), 'Passwords do not match'); bad = true; }
    if (!terms) { showToast('Accept the terms to continue', 'error'); bad = true; }
    if (bad) return;

    /* Optional breach check — best-effort, never blocks if the API is down */
    if (pwd.length >= 8) {
      const hits = await checkPasswordBreach(pwd).catch(() => 0);
      if (hits > 100) {
        const ok = await confirmDialog({
          title: 'This password has appeared in data breaches',
          body: `It has been seen ${hits.toLocaleString()} times in known breaches. We strongly recommend choosing a different password.`,
          okLabel: 'Use anyway',
          cancelLabel: 'Choose another',
          danger: true,
        });
        if (!ok) { $('#regPassword').focus(); return; }
      }
    }

    const extra = role === 'expert'
      ? {
          specialization: $('#regSpec').value.trim(),
          hourly_rate: Number($('#regRate').value || 0),
          bio: $('#regBio').value.trim(),
        }
      : role === 'institution'
      ? {
          institution_name: $('#regInstName').value.trim(),
          institution_type: $('#regInstType').value,
          industry: $('#regInstIndustry').value.trim(),
          ops_manager_email: $('#regInstOpsEmail').value.trim(),
        }
      : {};

    await register({ name, email, password: pwd, phone, role, extra });

    if (role === 'learner') {
      location.hash = '#/login';
    } else if (role === 'institution') {
      showToast('Institution registered. Awaiting admin verification.', 'info', 6000);
      location.hash = '#/login';
    } else {
      showToast('Awaiting admin approval before you can log in.', 'info', 6000);
      location.hash = '#/login';
    }
  });
}

/* ============================================================
   SECTION 9 — FORGOT / RESET
   ============================================================ */

function renderForgot() {
  appPhase = 'forgot';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-key"></i></div>
          <h2 class="auth-title">Reset your password</h2>
          <p class="auth-subtitle">We will send a reset link to your email.</p>
        </header>

        <div id="forgotSent" class="alert alert-success hidden" role="status"></div>

        <form id="forgotForm" class="auth-form" novalidate>
          <label class="form-group" for="fpEmail">
            <span class="form-label">Email</span>
            <input id="fpEmail" type="email" required autocomplete="email"
                   inputmode="email" class="form-input" placeholder="you@example.com"
                   value="${esc(getRememberedEmail())}" autofocus />
          </label>
          <button type="submit" class="btn btn-primary btn-block">Send reset link</button>
        </form>

        <a href="#/login" class="link link-center"><i class="fas fa-arrow-left"></i> Back to sign in</a>
      </section>
    </main>`;

  onSubmit('#forgotForm', async () => {
    const email = $('#fpEmail').value.trim();
    if (!_emailRe.test(email)) { setFieldError($('#fpEmail'), 'Enter a valid email'); return; }
    const left = resendCooldownLeft('reset');
    if (left > 0) return showToast(`Wait ${left}s before trying again`, 'info');
    await requestPasswordReset(email);
    beginResendCooldown('reset', 60);
    const sent = $('#forgotSent');
    sent.textContent = `If an account exists for ${email}, a reset link is on the way. Check your spam folder too.`;
    sent.classList.remove('hidden');
  });
}

function renderReset(token) {
  appPhase = 'reset';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-lock"></i></div>
          <h2 class="auth-title">Choose a new password</h2>
        </header>

        <form id="resetForm" class="auth-form" novalidate>
          <label class="form-group" for="rsPassword">
            <span class="form-label">New password</span>
            <input id="rsPassword" type="password" required autocomplete="new-password" class="form-input" autofocus />
            <div class="progress-bar"><span id="rsPwdBar"></span></div>
            <p id="rsPwdHint" class="form-hint"></p>
          </label>
          <label class="form-group" for="rsPassword2">
            <span class="form-label">Confirm password</span>
            <input id="rsPassword2" type="password" required autocomplete="new-password" class="form-input" />
          </label>
          <button type="submit" class="btn btn-primary btn-block">Reset password</button>
        </form>
      </section>
    </main>`;

  wirePasswordInputs($('#app-root'));
  $('#rsPassword').addEventListener('input', e =>
    renderStrength($('#rsPwdBar'), $('#rsPwdHint'), e.target.value));

  onSubmit('#resetForm', async () => {
    const p1 = $('#rsPassword').value;
    const p2 = $('#rsPassword2').value;
    if (p1.length < AUTH_CFG.PWD_MIN) { setFieldError($('#rsPassword'), `At least ${AUTH_CFG.PWD_MIN} characters`); return; }
    if (p1 !== p2) { setFieldError($('#rsPassword2'), 'Passwords do not match'); return; }
    await completePasswordReset(token, p1);
  });
}

/* ============================================================
   SECTION 10 — SETUP ACCOUNT (invited users)
   ============================================================ */

function renderSetupAccount(email, token) {
  appPhase = 'setup';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-user-check"></i></div>
          <h1 class="auth-title">Activate Your Account</h1>
          <p class="auth-subtitle">Set a password to begin your training.</p>
        </header>

        <form id="setupForm" class="auth-form" novalidate>
          <label class="form-group" for="saEmail">
            <span class="form-label">Email</span>
            <input id="saEmail" type="email" autocomplete="email" class="form-input"
                   value="${esc(email || '')}" ${email ? 'readonly' : ''} autofocus />
          </label>
          <label class="form-group" for="saPass">
            <span class="form-label">New password</span>
            <input id="saPass" type="password" required autocomplete="new-password"
                   class="form-input" placeholder="Minimum ${AUTH_CFG.PWD_MIN} characters" />
            <div class="progress-bar"><span id="saPwdBar"></span></div>
            <p id="saPwdHint" class="form-hint"></p>
          </label>
          <label class="form-group" for="saPass2">
            <span class="form-label">Confirm password</span>
            <input id="saPass2" type="password" required autocomplete="new-password" class="form-input" />
          </label>
          <button type="submit" class="btn btn-primary btn-block">Activate Account</button>
        </form>

        <a href="#/login" class="link link-center">Already activated? Sign in</a>
      </section>
    </main>`;

  wirePasswordInputs($('#app-root'));
  $('#saPass').addEventListener('input', e =>
    renderStrength($('#saPwdBar'), $('#saPwdHint'), e.target.value));

  onSubmit('#setupForm', async () => {
    const emailVal = $('#saEmail').value.trim();
    const p1 = $('#saPass').value;
    const p2 = $('#saPass2').value;
    if (!_emailRe.test(emailVal)) { setFieldError($('#saEmail'), 'Enter a valid email'); return; }
    if (p1.length < AUTH_CFG.PWD_MIN) { setFieldError($('#saPass'), `At least ${AUTH_CFG.PWD_MIN} characters`); return; }
    if (p1 !== p2) { setFieldError($('#saPass2'), 'Passwords do not match'); return; }
    await setupAccount({ email: emailVal, password: p1, token });
  });
}

/* ============================================================
   SECTION 11 — CERTIFICATE VERIFICATION
   ============================================================ */

async function renderVerify(serial) {
  appPhase = 'verify';

  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card" style="max-width:640px">
        <div style="text-align:center">
          <div class="spinner" style="margin:40px auto"></div>
          <p class="form-hint">Verifying certificate...</p>
        </div>
      </section>
    </main>`;

  let d;
  try {
    d = await apiCall(`/api/verify/${encodeURIComponent(serial)}`, 'GET', null, false, { retries: 0 });
  } catch (err) {
    const status = err.status;
    const title = status === 404 ? 'Certificate Not Found'
      : status >= 500 ? 'Verification Unavailable'
      : 'Certificate ' + (err.details?.status === 'expired' ? 'Expired' : 'Not Verified');
    $('#app-root').innerHTML = `
      <main class="auth-page">
        <section class="auth-card" style="text-align:center">
          <div class="auth-logo" style="background:linear-gradient(135deg,#dc2626,#b91c1c)">
            <i class="fas fa-times"></i>
          </div>
          <h1 class="auth-title">${esc(title)}</h1>
          <p class="auth-subtitle">${esc(userMessage(err))}</p>
          <a href="#/" class="link link-center">Back to ExpertHub</a>
        </section>
      </main>`;
    return;
  }

  const valid = !!d.valid;
  const c = d.certificate || {};
  const copyId = 'copy-' + Math.random().toString(36).slice(2, 8);

  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card" style="max-width:640px;text-align:center">
        <div class="auth-logo" style="background:${valid
          ? 'linear-gradient(135deg,#059669,#065f46)'
          : 'linear-gradient(135deg,#dc2626,#b91c1c)'}">
          <i class="fas fa-${valid ? 'check' : 'times'}"></i>
        </div>
        <h1 class="auth-title">
          ${valid ? 'Certificate Verified'
                  : 'Certificate ' + (d.status === 'expired' ? 'Expired' : 'Not Found')}
        </h1>
        <p class="auth-subtitle">
          ${valid ? 'This certificate is authentic and currently valid.'
                  : 'This certificate is not currently valid.'}
        </p>

        ${c.serial ? `
          <div style="text-align:left;margin-top:24px;padding:20px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2)">
            <p><strong>Holder:</strong> ${esc(c.trainee_name)}</p>
            <p><strong>Awarded:</strong> ${esc(c.title)}</p>
            <p><strong>Issued by:</strong> ${esc(c.institution_name || 'ExpertHub')}</p>
            ${c.awarding_body ? `<p><strong>Awarding body:</strong> ${esc(c.awarding_body)}</p>` : ''}
            ${c.cpd_points ? `<p><strong>CPD points:</strong> ${esc(c.cpd_points)}</p>` : ''}
            <p>
              <strong>Serial:</strong>
              <code class="code" id="${copyId}">${esc(c.serial)}</code>
              <button type="button" class="btn btn-xs" data-copy="${esc(c.serial)}" aria-label="Copy serial">
                <i class="fas fa-copy"></i>
              </button>
            </p>
            <p><strong>Issued:</strong> ${esc(fmtDate(c.issued_at))}</p>
            <p><strong>Expires:</strong> ${c.expires_at ? esc(fmtDate(c.expires_at)) : 'Never'}</p>
            ${c.blockchain_hash ? `
              <p style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
                <strong>Blockchain:</strong>
                <code class="code">${esc(truncateHash(c.blockchain_hash))}</code>
                <span class="chip chip-green" style="margin-left:6px">
                  <i class="fas fa-cube"></i> On-chain
                </span>
                <button type="button" class="btn btn-xs" data-copy="${esc(c.blockchain_hash)}" aria-label="Copy hash">
                  <i class="fas fa-copy"></i>
                </button>
              </p>` : ''}
          </div>` : ''}

        <a href="#/" class="link link-center">Back to ExpertHub</a>
      </section>
    </main>`;

  /* Wire copy-to-clipboard buttons */
  $$('[data-copy]').forEach(btn => {
    btn.onclick = async () => {
      const ok = await copyToClipboard(btn.dataset.copy);
      showToast(ok ? 'Copied' : 'Copy failed', ok ? 'success' : 'error', 1500);
    };
  });
}

/* ============================================================
   SECTION 12 — AUTH ROUTER
   ============================================================ */

/**
 * Central auth-route dispatcher. The main app router can call this for any
 * hash that belongs to the auth family, or hook it via `onAuthRoute`.
 *
 * Recognised routes:
 *   #/login                        → renderLogin()
 *   #/register                     → renderRegister()
 *   #/forgot                       → renderForgot()
 *   #/reset?token=...              → renderReset(token)
 *   #/2fa                          → render2FA(_auth.pending2FA)
 *   #/2fa/enrol                    → renderEnrol2FA()
 *   #/setup?email=..&token=..      → renderSetupAccount(email, token)
 *   #/verify/:serial               → renderVerify(serial)
 */
function handleAuthRoute(hash = location.hash) {
  const raw = (hash || '').replace(/^#/, '');
  const [path, queryStr] = raw.split('?');
  const query = new URLSearchParams(queryStr || '');
  const parts = path.split('/').filter(Boolean);

  switch (parts[0]) {
    case undefined:
      return false;
    case 'login':
      renderLogin();
      return true;
    case 'register':
      renderRegister();
      return true;
    case 'forgot':
      renderForgot();
      return true;
    case 'reset':
      renderReset(query.get('token') || '');
      return true;
    case '2fa':
      if (parts[1] === 'enrol') {
        renderEnrol2FA();
      } else {
        render2FA(_auth.pending2FA);
      }
      return true;
    case 'setup':
      renderSetupAccount(query.get('email') || '', query.get('token') || '');
      return true;
    case 'verify':
      renderVerify(decodeURIComponent(parts.slice(1).join('/')));
      return true;
    default:
      return false;
  }
}

/* ============================================================
   SECTION 13 — INIT
   ============================================================ */

(function initAuth() {
  _initCrossTab();

  /* Detect session-expired events from 04-api.js and show a modal */
  window.addEventListener('auth:session-expired', showSessionExpiredModal);

  /* Detect magic-link token in URL: /?magic=... or /#/magic?token=... */
  const params = new URLSearchParams(location.search);
  const magic = params.get('magic');
  if (magic) {
    history.replaceState({}, '', location.pathname + location.hash);
    consumeMagicLink(magic)
      .then(() => showToast('Signed in', 'success'))
      .catch(err => showToast(userMessage(err), 'error'));
  }

  /* Restore user from localStorage on boot (04-api.js handles token) */
  try {
    const cached = localStorage.getItem('user');
    if (cached && authToken) {
      currentUser = JSON.parse(cached);
      currentUserRole = currentUser.role;
      S.userIntent = currentUser.intent || 'both';
      if (authToken) startIdleWatcher();
    }
  } catch {}

  /* Cheap "online/offline" indicator for the auth pages */
  window.addEventListener('offline', () =>
    showBanner($('#app-root'), 'You appear to be offline. Some actions may fail.', { kind: 'warning', id: 'netBanner' }));
  window.addEventListener('online', () => $('#netBanner')?.remove());
})();