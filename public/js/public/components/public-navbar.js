/* ============================================================
   ExpertHub — js/public/components/public-navbar.js
   Public navigation bar.

   Layout (desktop):   [brand]  [links centered]  [sign in · create]
   Layout (mobile):    [brand]  …                 [hamburger]
                       Drawer slides open with links + actions.

   All actions go through the global [data-goto] / [data-action]
   delegation in bind.js — nothing here attaches listeners.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var esc = P.format.esc;

  var LINKS = [
    ['courses',      'Courses',         '#/courses'],
    ['experts',      'Experts',         '#/experts'],
    ['events',       'Events',          '#/events'],
    ['resources',    'Resources',       '#/resources'],
    ['institutions', 'For institutions', '#/institutions'],
    ['about',        'About',           '#/about']
  ];

  P.components.navbar = function (active) {
    var links = LINKS.map(function (l) {
      return '<button class="pub-nav-link' + (active === l[0] ? ' is-active' : '') + '" ' +
             'data-goto="' + l[2] + '">' + esc(l[1]) + '</button>';
    }).join('');

    var drawerLinks = LINKS.map(function (l) {
      return '<button class="pub-nav-link' + (active === l[0] ? ' is-active' : '') + '" ' +
             'data-goto="' + l[2] + '">' + esc(l[1]) + '</button>';
    }).join('');

    return '' +
      '<nav class="pub-nav" role="navigation" aria-label="ExpertHub">' +

        /* ---- top row: brand · links · actions ---- */
        '<div class="pub-nav-inner">' +

          '<button class="pub-nav-brand" data-goto="#/" aria-label="ExpertHub home">' +
            '<span class="pub-nav-brand-mark"><i class="fas fa-graduation-cap"></i></span>' +
            '<span class="pub-nav-brand-name">ExpertHub</span>' +
          '</button>' +

          '<div class="pub-nav-links" role="menubar">' + links + '</div>' +

          '<div class="pub-nav-actions">' +
            '<button class="btn btn-ghost" data-goto="#/login">' +
              '<i class="fas fa-right-to-bracket"></i> Sign in</button>' +
            '<button class="btn btn-primary" data-goto="#/register">' +
              '<i class="fas fa-user-plus"></i> Create account</button>' +
            '<button class="pub-nav-toggle" type="button" ' +
              'data-action="nav-toggle" aria-label="Open menu" aria-expanded="false">' +
              '<i class="fas fa-bars"></i>' +
            '</button>' +
          '</div>' +

        '</div>' +

        /* ---- mobile drawer ---- */
        '<div class="pub-nav-drawer" id="pubNavDrawer" data-open="false">' +
          '<div class="pub-nav-drawer-inner">' +
            drawerLinks +
            '<div class="pub-nav-drawer-actions">' +
              '<button class="btn btn-secondary" data-goto="#/login">' +
                '<i class="fas fa-right-to-bracket"></i> Sign in</button>' +
              '<button class="btn btn-primary" data-goto="#/register">' +
                '<i class="fas fa-user-plus"></i> Create account</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

      '</nav>';
  };
})();