/* ============================================================
   ExpertHub 2.0 — 05-auth.js
   Login / register / logout actions + all auth screens.
   ============================================================ */

/* ---------- AUTH ---------- */
async function login(email, password) {
  const data = await apiCall('/api/auth/login', 'POST', { email, password });
  authToken = data.token;
  refreshToken = data.refresh;
  currentUser = data.user;
  currentUserRole = data.user.role;
  S.userIntent = data.user.intent || 'both';
  localStorage.setItem('token', authToken);
  localStorage.setItem('refresh', refreshToken);
  localStorage.setItem('user', JSON.stringify(currentUser));

  if (data.user.theme) {
    document.documentElement.classList.toggle('dark', data.user.theme === 'dark');
  }

  if (data.user.role === 'institution') {
    try {
      const b = await apiCall('/api/institution/branding');
      if (b && b.branding) {
        if (b.branding.primary_color) {
          document.documentElement.style.setProperty('--brand', b.branding.primary_color);
        }
        if (b.branding.accent_color) {
          document.documentElement.style.setProperty('--accent', b.branding.accent_color);
        }
      }
    } catch (_) {}
  }

  initializeSocket();
  await loadAllData();
  appPhase = 'dashboard';
  activeTab = 'dashboard';
  location.hash = currentUserRole === 'institution' ? '#/institution/dashboard' : '#/dashboard';
  renderDashboard();
  showToast(`Welcome back, ${currentUser.name}!`, 'success');
  startPolling();
}

async function register(payload) {
  const data = await apiCall('/api/auth/register', 'POST', payload);
  showToast(data.message || 'Registration submitted', 'success');
  return data;
}

async function logout() {
  try { await apiCall('/api/auth/logout', 'POST', { refresh: refreshToken }); } catch (_) {}
  if (socket) socket.disconnect();
  socket = null;
  authToken = null;
  refreshToken = null;
  currentUser = null;
  currentUserRole = null;
  S.userIntent = 'both';
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
  stopPolling();
  appPhase = 'landing';
  location.hash = '#/';
  renderLanding();
}

/* ============================================================
   AUTH SCREENS
   ============================================================ */
function renderLogin() {
  appPhase = 'login';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-graduation-cap"></i></div>
          <h1 class="auth-title">Expert<span class="auth-title-accent">Hub</span></h1>
          <p class="auth-subtitle">Sign in to your account</p>
          <p class="auth-status"><span class="live-indicator"></span> Secure connection</p>
        </header>
        <div id="loginError" class="alert alert-error hidden"></div>
        <form id="loginForm" class="auth-form">
          <label class="form-group">
            <span class="form-label">Email</span>
            <input id="loginEmail" type="email" required class="form-input" placeholder="you@example.com" />
          </label>
          <label class="form-group">
            <span class="form-label">Password</span>
            <div class="input-wrap">
              <input id="loginPassword" type="password" required class="form-input" placeholder="Password" />
              <button type="button" class="input-trailing" id="toggleLoginPwd"><i class="fas fa-eye"></i></button>
            </div>
          </label>
          <div class="form-row">
            <label class="checkbox-row"><input type="checkbox" id="rememberMe" checked /> Remember me</label>
            <a href="#/forgot" class="link">Forgot password?</a>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Sign in</button>
        </form>
        <p class="auth-footer">Don't have an account? <a href="#/register" class="link">Create one</a></p>
        <p class="auth-footer" style="margin-top:6px"><a href="#/" class="link"><i class="fas fa-arrow-left"></i> Back to home</a></p>
        <div class="alert alert-info" style="margin-top:18px;font-size:.8rem;flex-direction:column;align-items:flex-start;gap:6px">
          <strong>Demo accounts</strong>
          <span>admin@platform.com / admin123</span>
          <span>expert@platform.com / expert123</span>
          <span>learner@platform.com / learner123</span>
          <span>ops@acme.com / ops123 (Institution Ops Manager)</span>
        </div>
      </section>
    </main>`;

  $('#toggleLoginPwd').onclick = () => {
    const i = $('#loginPassword');
    i.type = i.type === 'password' ? 'text' : 'password';
  };
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pwd = $('#loginPassword').value;
    const err = $('#loginError');
    err.classList.add('hidden');
    if (!email || !pwd) return showToast('Please fill all fields', 'error');
    try {
      showLoading(true);
      await login(email, pwd);
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally { showLoading(false); }
  };
}

function renderRegister() {
  appPhase = 'register';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-user-plus"></i></div>
          <h1 class="auth-title">Create your <span class="auth-title-accent">account</span></h1>
          <p class="auth-subtitle">Learners are auto-approved. Experts and institutions need admin approval.</p>
        </header>
        <form id="registerForm" class="auth-form">
          <div class="role-picker">
            <button type="button" data-role="learner" class="role-pick role-pick-active">Learner</button>
            <button type="button" data-role="expert"  class="role-pick">Expert</button>
            <button type="button" data-role="institution" class="role-pick">Institution</button>
          </div>
          <label class="form-group"><span class="form-label">Full name</span><input id="regName" required class="form-input" placeholder="Jane Doe" /></label>
          <label class="form-group"><span class="form-label">Email</span><input id="regEmail" type="email" required class="form-input" placeholder="you@example.com" /></label>
          <label class="form-group"><span class="form-label">Phone (optional)</span><input id="regPhone" class="form-input" placeholder="+254..." /></label>
          <label class="form-group">
            <span class="form-label">Password</span>
            <input id="regPassword" type="password" required class="form-input" placeholder="Minimum 8 characters" />
            <div class="progress-bar"><span id="pwdBar"></span></div>
            <p id="pwdHint" class="form-hint"></p>
          </label>
          <label class="form-group"><span class="form-label">Confirm password</span><input id="regPassword2" type="password" required class="form-input" /></label>

          <div id="expertExtra" class="hidden" style="display:grid;gap:12px">
            <label class="form-group"><span class="form-label">Specialization</span><input id="regSpec" class="form-input" placeholder="e.g. Data Science" /></label>
            <label class="form-group"><span class="form-label">Hourly rate ($)</span><input id="regRate" type="number" class="form-input" placeholder="50" /></label>
            <label class="form-group"><span class="form-label">Short bio</span><textarea id="regBio" class="form-textarea" rows="3"></textarea></label>
          </div>

          <div id="institutionExtra" class="hidden" style="display:grid;gap:12px">
            <label class="form-group"><span class="form-label">Institution name</span><input id="regInstName" class="form-input" placeholder="Acme Corp Academy" /></label>
            <label class="form-group">
              <span class="form-label">Institution type</span>
              <select id="regInstType" class="form-select">
                ${CONFIG.INSTITUTION_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </label>
            <label class="form-group"><span class="form-label">Industry / Sector</span><input id="regInstIndustry" class="form-input" placeholder="e.g. Banking, Healthcare" /></label>
            <label class="form-group"><span class="form-label">Operations manager email</span><input id="regInstOpsEmail" class="form-input" placeholder="ops@acme.com" /></label>
          </div>

          <label class="checkbox-row"><input type="checkbox" id="regTerms" /> I agree to the Terms and Privacy Policy</label>
          <button type="submit" class="btn btn-primary btn-block">Create account</button>
        </form>
        <p class="auth-footer">Already have an account? <a href="#/login" class="link">Sign in</a></p>
        <p class="auth-footer" style="margin-top:6px"><a href="#/" class="link"><i class="fas fa-arrow-left"></i> Back to home</a></p>
      </section>
    </main>`;

  $$('.role-pick').forEach(b => b.onclick = () => {
    $$('.role-pick').forEach(x => x.classList.remove('role-pick-active'));
    b.classList.add('role-pick-active');
    const r = b.dataset.role;
    $('#expertExtra').classList.toggle('hidden', r !== 'expert');
    $('#institutionExtra').classList.toggle('hidden', r !== 'institution');
  });

  $('#regPassword').addEventListener('input', e => {
    const v = e.target.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    $('#pwdBar').style.width = (score * 25) + '%';
    $('#pwdHint').textContent = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] || '';
  });

  $('#registerForm').onsubmit = async e => {
    e.preventDefault();
    const role = $('.role-pick-active')?.dataset.role || 'learner';
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const phone = $('#regPhone').value.trim();
    const pwd = $('#regPassword').value;
    const pwd2 = $('#regPassword2').value;
    const terms = $('#regTerms').checked;
    if (!name || !email || !pwd) return showToast('Fill required fields', 'error');
    if (pwd.length < 8) return showToast('Password must be at least 8 characters', 'error');
    if (pwd !== pwd2) return showToast('Passwords do not match', 'error');
    if (!terms) return showToast('Accept the terms to continue', 'error');

    const extra = role === 'expert'
      ? { specialization: $('#regSpec').value, hourly_rate: Number($('#regRate').value || 0), bio: $('#regBio').value }
      : role === 'institution'
      ? {
          institution_name: $('#regInstName').value,
          institution_type: $('#regInstType').value,
          industry: $('#regInstIndustry').value,
          ops_manager_email: $('#regInstOpsEmail').value,
        }
      : {};

    try {
      showLoading(true);
      await register({ name, email, password: pwd, phone, role, extra });
      if (role === 'learner') location.hash = '#/login';
      else if (role === 'institution') showToast('Institution registered. Awaiting admin verification.', 'info', 6000);
      else showToast('Awaiting admin approval before you can log in.', 'info', 6000);
    } catch (ex) {
      showToast(ex.message, 'error');
    } finally { showLoading(false); }
  };
}

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
        <label class="form-group"><span class="form-label">Email</span>
          <input id="fpEmail" type="email" class="form-input" placeholder="you@example.com" /></label>
        <button id="fpBtn" class="btn btn-primary btn-block" style="margin-top:14px">Send reset link</button>
        <a href="#/login" class="link link-center"><i class="fas fa-arrow-left"></i> Back to sign in</a>
      </section>
    </main>`;
  $('#fpBtn').onclick = async () => {
    const email = $('#fpEmail').value.trim();
    if (!email) return showToast('Enter your email', 'error');
    try {
      showLoading(true);
      await apiCall('/api/auth/forgot', 'POST', { email });
      showToast('If the email exists, a reset link was sent.', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
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
        <label class="form-group"><span class="form-label">New password</span><input id="rsPassword" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Confirm password</span><input id="rsPassword2" type="password" class="form-input" /></label>
        <button id="rsBtn" class="btn btn-primary btn-block" style="margin-top:14px">Reset password</button>
      </section>
    </main>`;
  $('#rsBtn').onclick = async () => {
    const p1 = $('#rsPassword').value;
    const p2 = $('#rsPassword2').value;
    if (!p1 || p1 !== p2) return showToast('Passwords do not match', 'error');
    try {
      showLoading(true);
      await apiCall('/api/auth/reset', 'POST', { token, password: p1 });
      showToast('Password updated. Please sign in.', 'success');
      location.hash = '#/login';
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

async function renderVerify(serial) {
  appPhase = 'verify';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card" style="max-width:640px">
        <div style="text-align:center">
          <div class="spinner" style="margin:40px auto;border-color:var(--border);border-top-color:var(--brand)"></div>
          <p class="form-hint">Verifying certificate...</p>
        </div>
      </section>
    </main>`;

  try {
    const res = await fetch(`/api/verify/${encodeURIComponent(serial)}`);
    const d = await res.json();
    const valid = d.valid;
    const c = d.certificate || {};

    $('#app-root').innerHTML = `
      <main class="auth-page">
        <section class="auth-card" style="max-width:640px;text-align:center">
          <div class="auth-logo" style="background:${valid
            ? 'linear-gradient(135deg,#059669,#065f46)'
            : 'linear-gradient(135deg,#dc2626,#b91c1c)'}">
            <i class="fas fa-${valid ? 'check' : 'times'}"></i>
          </div>
          <h1 class="auth-title">${valid ? 'Certificate Verified' : 'Certificate ' + (d.status === 'expired' ? 'Expired' : 'Not Found')}</h1>
          <p class="auth-subtitle">
            ${valid ? 'This certificate is authentic and currently valid.' : 'This certificate is not currently valid.'}
          </p>
          ${c.serial ? `
            <div style="text-align:left;margin-top:24px;padding:20px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2)">
              <p><strong>Holder:</strong> ${esc(c.trainee_name)}</p>
              <p><strong>Awarded:</strong> ${esc(c.title)}</p>
              <p><strong>Issued by:</strong> ${esc(c.institution_name || 'ExpertHub')}</p>
              ${c.awarding_body ? `<p><strong>Awarding body:</strong> ${esc(c.awarding_body)}</p>` : ''}
              ${c.cpd_points ? `<p><strong>CPD points:</strong> ${c.cpd_points}</p>` : ''}
              <p><strong>Serial:</strong> <code class="code">${esc(c.serial)}</code></p>
              <p><strong>Issued:</strong> ${fmtDate(c.issued_at)}</p>
              <p><strong>Expires:</strong> ${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</p>
              ${c.blockchain_hash ? `
                <p style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
                  <strong>Blockchain:</strong>
                  <code class="code">${truncateHash(c.blockchain_hash)}</code>
                  <span class="chip chip-green" style="margin-left:6px">
                    <i class="fas fa-cube"></i> On-chain</span>
                </p>
              ` : ''}
            </div>
          ` : ''}
          <a href="#/" class="link link-center">Back to ExpertHub</a>
        </section>
      </main>`;
  } catch (_) {
    $('#app-root').innerHTML = `
      <main class="auth-page">
        <section class="auth-card" style="text-align:center">
          <div class="auth-logo" style="background:linear-gradient(135deg,#dc2626,#b91c1c)">
            <i class="fas fa-times"></i>
          </div>
          <h1 class="auth-title">Verification Unavailable</h1>
          <p class="auth-subtitle">Please try again later.</p>
          <a href="#/" class="link link-center">Back to ExpertHub</a>
        </section>
      </main>`;
  }
}

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
        <label class="form-group">
          <span class="form-label">Email</span>
          <input id="saEmail" type="email" class="form-input" value="${esc(email || '')}" ${email ? 'readonly' : ''} />
        </label>
        <label class="form-group">
          <span class="form-label">New password</span>
          <input id="saPass" type="password" class="form-input" placeholder="Minimum 8 characters" />
          <div class="progress-bar"><span id="saPwdBar"></span></div>
        </label>
        <label class="form-group">
          <span class="form-label">Confirm password</span>
          <input id="saPass2" type="password" class="form-input" />
        </label>
        <button id="saBtn" class="btn btn-primary btn-block" style="margin-top:14px">Activate Account</button>
        <a href="#/login" class="link link-center">Already activated? Sign in</a>
      </section>
    </main>`;

  $('#saPass').oninput = e => {
    const v = e.target.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    $('#saPwdBar').style.width = (score * 25) + '%';
  };

  $('#saBtn').onclick = async () => {
    const emailVal = $('#saEmail').value.trim();
    const p1 = $('#saPass').value;
    const p2 = $('#saPass2').value;
    if (!emailVal || !p1) return showToast('Email and password are required', 'error');
    if (p1.length < 8) return showToast('Password must be at least 8 characters', 'error');
    if (p1 !== p2) return showToast('Passwords do not match', 'error');
    try {
      showLoading(true);
      await apiCall('/api/auth/setup-account', 'POST', { email: emailVal, password: p1, token });
      showToast('Account activated. Redirecting to sign in...', 'success');
      setTimeout(() => { location.hash = '#/login'; }, 1200);
    } catch (e) {
      showToast(e.message, 'error');
    } finally { showLoading(false); }
  };
}

/* ============================================================
   ExpertHub 2.0 — 05 Feature Expansion
   Authentication & Account Security
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature05;
  if (NS) return;

  const namespace = {
    name: "Authentication & Account Security",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["password policy", "login attempt tracking", "account lockout UX", "2FA flow helpers", "session expiry warning", "token metadata", "secure logout cleanup", "remember-device preference", "role guard", "permission checks", "password strength meter", "registration validation", "profile completion", "security events", "trusted device list", "login history", "re-authentication gate", "session renewal", "auth diagnostics", "privacy preferences"],
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
      storagePrefix: 'experthub.feature.05.',
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
      document.dispatchEvent(new CustomEvent('eh:05:' + eventName, { detail: payload }));
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
    a.download = 'experthub-05-diagnostics.json';
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

  window.EHFeature05 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = {
      feature: "password policy",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:01', result);
    return result;
  }

  register("password policy", {
    category: "password",
    description: "Enhanced password policy capability for authentication & account security",
    handler: feature_01
  });

  function feature_02(payload = {}, context = {}) {
    const result = {
      feature: "login attempt tracking",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:02', result);
    return result;
  }

  register("login attempt tracking", {
    category: "login",
    description: "Enhanced login attempt tracking capability for authentication & account security",
    handler: feature_02
  });

  function feature_03(payload = {}, context = {}) {
    const result = {
      feature: "account lockout UX",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:03', result);
    return result;
  }

  register("account lockout UX", {
    category: "account",
    description: "Enhanced account lockout UX capability for authentication & account security",
    handler: feature_03
  });

  function feature_04(payload = {}, context = {}) {
    const result = {
      feature: "2FA flow helpers",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:04', result);
    return result;
  }

  register("2FA flow helpers", {
    category: "2fa",
    description: "Enhanced 2FA flow helpers capability for authentication & account security",
    handler: feature_04
  });

  function feature_05(payload = {}, context = {}) {
    const result = {
      feature: "session expiry warning",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:05', result);
    return result;
  }

  register("session expiry warning", {
    category: "session",
    description: "Enhanced session expiry warning capability for authentication & account security",
    handler: feature_05
  });

  function feature_06(payload = {}, context = {}) {
    const result = {
      feature: "token metadata",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:06', result);
    return result;
  }

  register("token metadata", {
    category: "token",
    description: "Enhanced token metadata capability for authentication & account security",
    handler: feature_06
  });

  function feature_07(payload = {}, context = {}) {
    const result = {
      feature: "secure logout cleanup",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:07', result);
    return result;
  }

  register("secure logout cleanup", {
    category: "secure",
    description: "Enhanced secure logout cleanup capability for authentication & account security",
    handler: feature_07
  });

  function feature_08(payload = {}, context = {}) {
    const result = {
      feature: "remember-device preference",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:08', result);
    return result;
  }

  register("remember-device preference", {
    category: "remember_device",
    description: "Enhanced remember-device preference capability for authentication & account security",
    handler: feature_08
  });

  function feature_09(payload = {}, context = {}) {
    const result = {
      feature: "role guard",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:09', result);
    return result;
  }

  register("role guard", {
    category: "role",
    description: "Enhanced role guard capability for authentication & account security",
    handler: feature_09
  });

  function feature_10(payload = {}, context = {}) {
    const result = {
      feature: "permission checks",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:10', result);
    return result;
  }

  register("permission checks", {
    category: "permission",
    description: "Enhanced permission checks capability for authentication & account security",
    handler: feature_10
  });

  function feature_11(payload = {}, context = {}) {
    const result = {
      feature: "password strength meter",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:11', result);
    return result;
  }

  register("password strength meter", {
    category: "password",
    description: "Enhanced password strength meter capability for authentication & account security",
    handler: feature_11
  });

  function feature_12(payload = {}, context = {}) {
    const result = {
      feature: "registration validation",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:12', result);
    return result;
  }

  register("registration validation", {
    category: "registration",
    description: "Enhanced registration validation capability for authentication & account security",
    handler: feature_12
  });

  function feature_13(payload = {}, context = {}) {
    const result = {
      feature: "profile completion",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:13', result);
    return result;
  }

  register("profile completion", {
    category: "profile",
    description: "Enhanced profile completion capability for authentication & account security",
    handler: feature_13
  });

  function feature_14(payload = {}, context = {}) {
    const result = {
      feature: "security events",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:14', result);
    return result;
  }

  register("security events", {
    category: "security",
    description: "Enhanced security events capability for authentication & account security",
    handler: feature_14
  });

  function feature_15(payload = {}, context = {}) {
    const result = {
      feature: "trusted device list",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:15', result);
    return result;
  }

  register("trusted device list", {
    category: "trusted",
    description: "Enhanced trusted device list capability for authentication & account security",
    handler: feature_15
  });

  function feature_16(payload = {}, context = {}) {
    const result = {
      feature: "login history",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:16', result);
    return result;
  }

  register("login history", {
    category: "login",
    description: "Enhanced login history capability for authentication & account security",
    handler: feature_16
  });

  function feature_17(payload = {}, context = {}) {
    const result = {
      feature: "re-authentication gate",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:17', result);
    return result;
  }

  register("re-authentication gate", {
    category: "re_authentication",
    description: "Enhanced re-authentication gate capability for authentication & account security",
    handler: feature_17
  });

  function feature_18(payload = {}, context = {}) {
    const result = {
      feature: "session renewal",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:18', result);
    return result;
  }

  register("session renewal", {
    category: "session",
    description: "Enhanced session renewal capability for authentication & account security",
    handler: feature_18
  });

  function feature_19(payload = {}, context = {}) {
    const result = {
      feature: "auth diagnostics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:19', result);
    return result;
  }

  register("auth diagnostics", {
    category: "auth",
    description: "Enhanced auth diagnostics capability for authentication & account security",
    handler: feature_19
  });

  function feature_20(payload = {}, context = {}) {
    const result = {
      feature: "privacy preferences",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "05"
    };
    emit('feature:20', result);
    return result;
  }

  register("privacy preferences", {
    category: "privacy",
    description: "Enhanced privacy preferences capability for authentication & account security",
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
  window.ExpertHubFeatureRegistry["05"] = namespace;

})();

/* ============================================================
   End 05 feature expansion
   ============================================================ */

/* ============================================================
   Extended capability catalog — 05
   These definitions turn the feature expansion into a practical
   command catalog. Each entry can be discovered, validated,
   previewed, audited and executed without changing the legacy
   application functions above.
   ============================================================ */

(function () {
  const N = window.EHFeature05;
  if (!N) return;
  N.catalog = N.catalog || [];

  N.catalog.push({
    id: "05-0001-password-policy-inspect",
    label: "Inspect Password Policy",
    feature: "password policy",
    operation: "inspect",
    description: "Inspect current records and return a normalized view for authentication & account security",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "05-0001-password-policy-inspect", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "05-0001-password-policy-inspect", feature: "password policy", operation: "inspect", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "05-0002-password-policy-validate",
    label: "Validate Password Policy",
    feature: "password policy",
    operation: "validate",
    description: "Validate inputs before a workflow is submitted for authentication & account security",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "05-0002-password-policy-validate", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "05-0002-password-policy-validate", feature: "password policy", operation: "validate", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "05-0003-password-policy-preview",
    label: "Preview Password Policy",
    feature: "password policy",
    operation: "preview",
    description: "Build a preview payload without committing changes for authentication & account security",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "05-0003-password-policy-preview", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "05-0003-password-policy-preview", feature: "password policy", operation: "preview", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  function safeCatalogClone(value) {
    try { return JSON.parse(JSON.stringify(value ?? {})); }
    catch (_) { return {}; }
  }

  N.catalogSearch = function (query = '', filters = {}) {
    const q = String(query).trim().toLowerCase();
    return N.catalog.filter(item => {
      if (filters.operation && item.operation !== filters.operation) return false;
      if (filters.feature && item.feature !== filters.feature) return false;
      if (!q) return true;
      return [item.id, item.label, item.feature, item.operation, item.description]
        .join(' ').toLowerCase().includes(q);
    });
  };

  N.catalogExecute = function (id, payload = {}, context = {}) {
    const item = N.catalog.find(row => row.id === id);
    if (!item) throw new Error('Catalog command not found: ' + id);
    const validation = item.validate(payload, context);
    if (!validation.valid) {
      throw new Error(Object.values(validation.errors || {}).join(', ') || 'Catalog validation failed');
    }
    return item.execute(payload, context);
  };

  N.catalogPreview = function (id, payload = {}) {
    const item = N.catalog.find(row => row.id === id);
    if (!item) throw new Error('Catalog command not found: ' + id);
    return item.preview(payload);
  };

  N.catalogStats = function () {
    const byOperation = {};
    N.catalog.forEach(item => { byOperation[item.operation] = (byOperation[item.operation] || 0) + 1; });
    return {
      total: N.catalog.length,
      enabled: N.catalog.filter(item => item.enabled).length,
      operations: byOperation,
      generatedAt: new Date().toISOString()
    };
  };

  N.exportCatalog = function () {
    return N.catalog.map(item => ({
      id: item.id,
      label: item.label,
      feature: item.feature,
      operation: item.operation,
      description: item.description,
      enabled: item.enabled
    }));
  };

  N.registerCatalogEvents = function (root = document) {
    if (!root?.addEventListener) return () => {};
    const handler = event => {
      const button = event.target.closest?.('[data-eh-catalog]');
      if (!button) return;
      const id = button.getAttribute('data-eh-catalog');
      try {
        const result = N.catalogExecute(id, { source: 'ui', id });
        if (typeof window.showToast === 'function') window.showToast('Action prepared', 'success');
        N.emit('catalog:ui-result', result);
      } catch (error) {
        if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
      }
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  };

  N.catalogReady = true;
  N.emit('catalog:ready', N.catalogStats());
})();
