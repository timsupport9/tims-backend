/* ============================================================
   public/interactions/mobile-navigation.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const MobileNavigation = {
    attach(root) {
      if (!root) return;
      const toggle = root.querySelector('#publicNavToggle, [data-mobile-nav-toggle]');
      const menu = root.querySelector('#publicNavLinks, .landing-nav-links');
      if (!toggle || !menu) return;
      toggle.onclick = () => {
        const open = menu.classList.toggle('mobile-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      // Close on link tap
      menu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => menu.classList.remove('mobile-open'));
      });
    },
  };

  EH.MobileNavigation = MobileNavigation;
})(window);
