/* ============================================================
   auth/forgot-password.js — Forgot password screen
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    EH.state.appPhase = 'forgot';
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <main class="auth-page">
        <section class="auth-card">
          <header class="auth-header">
            <div class="auth-logo"><i class="fas fa-key"></i></div>
            <h2 class="auth-title">Reset your password</h2>
            <p class="auth-subtitle">We will send a reset link to your email.</p>
          </header>
          <label class="form-group">
            <span class="form-label">Email</span>
            <input id="fpEmail" type="email" class="form-input" placeholder="you@example.com" />
          </label>
          <button id="fpBtn" class="btn btn-primary btn-block" style="margin-top:14px">Send reset link</button>
          <a href="#/login" class="link link-center"><i class="fas fa-arrow-left"></i> Back to sign in</a>
        </section>
      </main>`;

    document.getElementById('fpBtn').onclick = async () => {
      const email = document.getElementById('fpEmail').value.trim();
      const btn = document.getElementById('fpBtn');
      if (!email) return EH.Toast.error('Enter your email');
      if (!EH.Validation.isEmail(email)) return EH.Toast.error('Enter a valid email');
      try {
        EH.Loading.button(btn, true);
        await EH.Auth.forgot(email);
        EH.Toast.success('If the email exists, a reset link was sent.');
      } catch (e) {
        EH.Toast.error(EH.Errors.friendlyMessage(e));
      } finally {
        EH.Loading.button(btn, false);
      }
    };
  }

  EH.ForgotView = { render };
  global.renderForgot = render;
})(window);
