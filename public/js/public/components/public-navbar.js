/* ============================================================
   ExpertHub — js/public/components/public-navbar.js
   Public navigation bar.

   Desktop (>1024px):  [brand]   [links centered]   [sign in · create]
   Tablet + Mobile:    [brand]                    [sign in · ☰]

   The hamburger is three <span> lines that morph into an X when
   the drawer is open. Drawer + backdrop + body-scroll-lock are
   driven entirely by [data-action] attributes and delegation in
   bind.js — this file only produces markup.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var esc = P.format.esc;

  var LINKS = [
    ['courses',      'Courses',          '#/courses'],
    ['experts',      'Experts',          '#/experts'],
    ['events',       'Events',           '#/events'],
    ['resources',    'Resources',        '#/resources'],
    ['institutions', 'For institutions', '#/institutions'],
    ['about',        'About',            '#/about']
  ];

  function linkList(active, extraClass) {
    return LINKS.map(function (l) {
      return '<button class="pub-nav-link' + (active === l[0] ? ' is-active' : '') +
             (extraClass ? ' ' + extraClass : '') + '" ' +
             'data-goto="' + l[2] + '">' + esc(l[1]) + '</button>';
    }).join('');
  }

  P.components.navbar = function (active) {
    return '' +
      '<nav class="pub-nav" role="navigation" aria-label="ExpertHub">' +

        '<div class="pub-nav-inner">' +

          /* ---------- brand ---------- */
          '<button class="pub-nav-brand" data-goto="#/" aria-label="ExpertHub home">' +
            '<span class="pub-nav-brand-mark"><i class="fas fa-graduation-cap"></i></span>' +
            '<span class="pub-nav-brand-name">ExpertHub</span>' +
          '</button>' +

          /* ---------- desktop links ---------- */
          '<div class="pub-nav-links" role="menubar">' + linkList(active) + '</div>' +

          /* ---------- actions + hamburger ---------- */
          '<div class="pub-nav-actions">' +
            '<button class="btn btn-ghost pub-nav-signin" data-goto="#/login">' +
              '<i class="fas fa-right-to-bracket"></i> Sign in</button>' +
            '<button class="btn btn-primary pub-nav-register" data-goto="#/register">' +
              '<i class="fas fa-user-plus"></i> Create account</button>' +

            '<button class="pub-nav-toggle" type="button" ' +
              'data-action="nav-toggle" ' +
              'aria-label="Toggle navigation" aria-expanded="false" ' +
              'aria-controls="pubNavDrawer">' +
              '<span class="pub-nav-toggle-line"></span>' +
              '<span class="pub-nav-toggle-line"></span>' +
              '<span class="pub-nav-toggle-line"></span>' +
            '</button>' +
          '</div>' +

        '</div>' +

        /* ---------- slide-down drawer (tablet + mobile) ---------- */
        '<div class="pub-nav-drawer" id="pubNavDrawer" data-open="false" role="menu">' +
          '<div class="pub-nav-drawer-inner">' +

            '<div class="pub-nav-drawer-links">' + linkList(active) + '</div>' +

            '<div class="pub-nav-drawer-actions">' +
              '<button class="btn btn-secondary" data-goto="#/login">' +
                '<i class="fas fa-right-to-bracket"></i> Sign in</button>' +
              '<button class="btn btn-primary" data-goto="#/register">' +
                '<i class="fas fa-user-plus"></i> Create account</button>' +
            '</div>' +

          '</div>' +
        '</div>' +

      '</nav>' +

      /* ---------- backdrop (dim page behind open drawer) ---------- */
      '<div class="pub-nav-backdrop" data-action="nav-close" aria-hidden="true"></div>';
  };
})();