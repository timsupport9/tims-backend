/* ============================================================
   router/not-found.js — 404 page
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <main class="auth-page">
        <section class="auth-card" style="text-align:center">
          <div class="auth-logo" style="background:linear-gradient(135deg,#f59e0b,#d97706)">
            <i class="fas fa-compass"></i>
          </div>
          <h1 class="auth-title" style="font-size:3rem;line-height:1">404</h1>
          <p class="auth-subtitle">We couldn't find that page.</p>
          <div class="hero-cta" style="margin-top:20px;justify-content:center">
            <a href="#/" class="btn btn-primary">
              <i class="fas fa-home"></i> Back to home</a>
            <button class="btn btn-secondary" onclick="history.back()">
              <i class="fas fa-arrow-left"></i> Go back</button>
          </div>
        </section>
      </main>`;
  }

  EH.NotFound = { render };
})(window);
