/* ============================================================
   ExpertHub — js/public/components/public-navbar.js
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var esc = P.format.esc;

  var LINKS = [
    ['courses', 'Courses', '#/courses'],
    ['experts', 'Experts', '#/experts'],
    ['events', 'Events', '#/events'],
    ['resources', 'Resources', '#/resources'],
    ['institutions', 'For institutions', '#/institutions'],
    ['about', 'About', '#/about']
  ];

  P.components.navbar = function (active) {
    return '' +
      '<nav class="landing-nav">' +
        '<div class="landing-brand" data-goto="#/" style="cursor:pointer">' +
          '<div class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></div>' +
          '<span>ExpertHub</span>' +
        '</div>' +
        '<div class="pub-nav-links">' +
          LINKS.map(function (l) {
            return '<button class="pub-nav-link' + (active === l[0] ? ' is-active' : '') + '" ' +
                   'data-goto="' + l[2] + '">' + esc(l[1]) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="landing-nav-actions">' +
          '<button class="btn btn-ghost" data-goto="#/login">' +
            '<i class="fas fa-right-to-bracket"></i> Sign in</button>' +
          '<button class="btn btn-primary" data-goto="#/register">' +
            '<i class="fas fa-user-plus"></i> Create account</button>' +
        '</div>' +
      '</nav>';
  };
})();
