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
            <button type="button" data-role="learner" class="role-pick role-pick-active">Client</button>
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
