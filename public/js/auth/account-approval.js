/* ============================================================
   auth/account-approval.js — Setup-account screen (activation)
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(email = '', token = '') {
    EH.state.appPhase = 'setup';
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <main class="auth-page">
        <section class="auth-card">
          <header class="auth-header">
            <div class="auth-logo"><i class="fas fa-user-check"></i></div>
            <h1 class="auth-title">Activate Your Account</h1>
            <p class="auth-subtitle">Set a password to begin your training.</p>
          </header>
          <label class="form-group">
            <span class="form-label">Email</span>
            <input id="saEmail" type="email" class="form-input"
                   value="${EH.Fmt.esc(email)}" ${email ? 'readonly' : ''} />
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

    document.getElementById('saPass').oninput = (e) => {
      const score = EH.Validation.passwordScore(e.target.value);
      document.getElementById('saPwdBar').style.width = (score * 25) + '%';
    };

    document.getElementById('saBtn').onclick = async () => {
      const emailVal = document.getElementById('saEmail').value.trim();
      const p1 = document.getElementById('saPass').value;
      const p2 = document.getElementById('saPass2').value;
      if (!emailVal || !p1) return EH.Toast.error('Email and password are required');
      if (p1.length < 8) return EH.Toast.error('Password must be at least 8 characters');
      if (p1 !== p2) return EH.Toast.error('Passwords do not match');
      try {
        EH.Loading.show();
        await EH.Auth.setupAccount(emailVal, p1, token);
        EH.Toast.success('Account activated. Redirecting to sign in...');
        setTimeout(() => { location.hash = '#/login'; }, 1200);
      } catch (e) {
        EH.Toast.error(EH.Errors.friendlyMessage(e));
      } finally {
        EH.Loading.hide();
      }
    };
  }

  EH.SetupView = { render };
  global.renderSetupAccount = render;
})(window);
