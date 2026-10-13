/* ============================================================
   auth/login.js — Login screen
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    EH.state.appPhase = 'login';
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <main class="auth-page">
        <section class="auth-card">
          <header class="auth-header">
            <div class="auth-logo"><i class="fas fa-graduation-cap"></i></div>
            <h1 class="auth-title">Expert<span class="auth-title-accent">Hub</span></h1>
            <p class="auth-subtitle">Sign in to your account</p>
            <p class="auth-status"><span class="live-indicator"></span> Secure connection</p>
          </header>

          <div id="loginError" class="alert alert-error hidden" role="alert"></div>

          <form id="loginForm" class="auth-form" novalidate>
            <label class="form-group">
              <span class="form-label">Email</span>
              <input id="loginEmail" name="email" type="email" required
                     class="form-input" placeholder="you@example.com" autocomplete="email" />
              <span class="form-error" data-error-for="email"></span>
            </label>
            <label class="form-group">
              <span class="form-label">Password</span>
              <div class="input-wrap">
                <input id="loginPassword" name="password" type="password" required
                       class="form-input" placeholder="Password" autocomplete="current-password" />
                <button type="button" class="input-trailing" id="toggleLoginPwd"
                        aria-label="Show password">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </label>
            <div class="form-row">
              <label class="checkbox-row">
                <input type="checkbox" id="rememberMe" checked /> Remember me
              </label>
              <a href="#/forgot" class="link">Forgot password?</a>
            </div>
            <button type="submit" class="btn btn-primary btn-block" id="loginSubmit">Sign in</button>
          </form>

          <p class="auth-footer">Don't have an account? <a href="#/register" class="link">Create one</a></p>
          <p class="auth-footer" style="margin-top:6px">
            <a href="#/" class="link"><i class="fas fa-arrow-left"></i> Back to home</a></p>

          <div class="alert alert-info demo-accounts">
            <strong>Demo accounts</strong>
            <span>admin@platform.com / admin123</span>
            <span>expert@platform.com / expert123</span>
            <span>learner@platform.com / learner123</span>
            <span>ops@acme.com / ops123 (Institution Ops Manager)</span>
          </div>
        </section>
      </main>`;

    bindEvents();
  }

  function bindEvents() {
    const toggle = document.getElementById('toggleLoginPwd');
    if (toggle) {
      toggle.onclick = () => {
        const i = document.getElementById('loginPassword');
        const showing = i.type === 'text';
        i.type = showing ? 'password' : 'text';
        toggle.querySelector('i').className = showing ? 'fas fa-eye' : 'fas fa-eye-slash';
      };
    }

    const form = document.getElementById('loginForm');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pwd = document.getElementById('loginPassword').value;
      const errEl = document.getElementById('loginError');
      const submit = document.getElementById('loginSubmit');

      errEl.classList.add('hidden');
      if (!email || !pwd) {
        errEl.textContent = 'Please fill in all fields.';
        errEl.classList.remove('hidden');
        return;
      }
      if (!EH.Validation.isEmail(email)) {
        errEl.textContent = 'Please enter a valid email address.';
        errEl.classList.remove('hidden');
        return;
      }

      try {
        EH.Loading.button(submit, true);
        EH.Loading.show();
        await EH.Auth.login(email, pwd);
        await EH.Data.loadAll();
        EH.state.appPhase = 'dashboard';
        EH.state.activeTab = 'dashboard';
        const role = EH.state.currentUserRole;
        location.hash = role === 'institution' ? '#/institution/dashboard' : '#/dashboard';
        if (typeof renderDashboard === 'function') renderDashboard();
        EH.Toast.success(`Welcome back, ${EH.state.currentUser.name}!`);
        EH.Polling?.start?.();
      } catch (ex) {
        errEl.textContent = EH.Errors.friendlyMessage(ex) || ex.message;
        errEl.classList.remove('hidden');
      } finally {
        EH.Loading.hide();
        EH.Loading.button(submit, false);
      }
    };
  }

  EH.LoginView = { render };
  global.renderLogin = render;
})(window);
