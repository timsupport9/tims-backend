/* ============================================================
   auth/reset-password.js — Reset password screen
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(token) {
    EH.state.appPhase = 'reset';
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <main class="auth-page">
        <section class="auth-card">
          <header class="auth-header">
            <div class="auth-logo"><i class="fas fa-lock"></i></div>
            <h2 class="auth-title">Choose a new password</h2>
          </header>
          <label class="form-group"><span class="form-label">New password</span>
            <input id="rsPassword" type="password" class="form-input" placeholder="Minimum 8 characters" /></label>
          <label class="form-group"><span class="form-label">Confirm password</span>
            <input id="rsPassword2" type="password" class="form-input" /></label>
          <button id="rsBtn" class="btn btn-primary btn-block" style="margin-top:14px">Reset password</button>
        </section>
      </main>`;

    document.getElementById('rsBtn').onclick = async () => {
      const p1 = document.getElementById('rsPassword').value;
      const p2 = document.getElementById('rsPassword2').value;
      if (!p1 || p1 !== p2) return EH.Toast.error('Passwords do not match');
      if (p1.length < 8) return EH.Toast.error('Password must be at least 8 characters');
      try {
        EH.Loading.show();
        await EH.Auth.reset(token, p1);
        EH.Toast.success('Password updated. Please sign in.');
        location.hash = '#/login';
      } catch (e) {
        EH.Toast.error(EH.Errors.friendlyMessage(e));
      } finally {
        EH.Loading.hide();
      }
    };
  }

  EH.ResetView = { render };
  global.renderReset = render;
})(window);
