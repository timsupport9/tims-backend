/* ============================================================
   router/access-denied.js — 403 page
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(reason = '') {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <main class="auth-page">
        <section class="auth-card" style="text-align:center">
          <div class="auth-logo" style="background:linear-gradient(135deg,#dc2626,#b91c1c)">
            <i class="fas fa-lock"></i>
          </div>
          <h1 class="auth-title">Access Denied</h1>
          <p class="auth-subtitle">
            ${EH.Fmt.esc(reason || "You don't have permission to view this page.")}
          </p>
          <div class="hero-cta" style="margin-top:20px;justify-content:center">
            <a href="#/dashboard" class="btn btn-primary">
              <i class="fas fa-home"></i> Go to dashboard</a>
          </div>
        </section>
      </main>`;
  }

  EH.AccessDenied = { render };
})(window);
