/* ============================================================
   public/components/public-navbar.js — Marketing site navbar
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    const nav = EH.PublicNav?.primary || [];
    return `
      <nav class="landing-nav" role="navigation">
        <a href="#/" class="landing-brand" aria-label="ExpertHub home">
          <div class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></div>
          <span>ExpertHub</span>
        </a>

        <ul class="landing-nav-links" id="publicNavLinks">
          ${nav.map(item => `
            <li><a href="${item.href}" class="landing-nav-link">${EH.Fmt.esc(item.label)}</a></li>
          `).join('')}
        </ul>

        <div class="landing-nav-actions">
          <button class="landing-mobile-toggle" id="publicNavToggle" aria-label="Toggle menu">
            <i class="fas fa-bars"></i>
          </button>
          <button class="btn btn-ghost" id="navLogin">
            <i class="fas fa-right-to-bracket"></i> Sign in
          </button>
          <button class="btn btn-primary" id="navRegister">
            <i class="fas fa-user-plus"></i> Create account
          </button>
        </div>
      </nav>`;
  }

  function attach(root) {
    if (!root) return;
    const login = root.querySelector('#navLogin');
    const reg = root.querySelector('#navRegister');
    const toggle = root.querySelector('#publicNavToggle');
    const links = root.querySelector('#publicNavLinks');
    if (login) login.onclick = () => { location.hash = '#/login'; };
    if (reg) reg.onclick = () => { location.hash = '#/register'; };
    if (toggle && links) toggle.onclick = () => links.classList.toggle('mobile-open');
  }

  EH.PublicNavbar = { render, attach };
})(window);
