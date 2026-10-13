/* ============================================================
   ExpertHub — js/public/components/public-footer.js
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var esc = P.format.esc;

  var COLS = [
    ['Explore', [
      ['Courses', '#/courses'],
      ['Experts', '#/experts'],
      ['Events', '#/events'],
      ['Resources', '#/resources']
    ]],
    ['Platform', [
      ['For institutions', '#/institutions'],
      ['Pricing', '#/#pricing'],
      ['About us', '#/about'],
      ['Contact', '#/contact']
    ]],
    ['Account', [
      ['Sign in', '#/login'],
      ['Create account', '#/register']
    ]]
  ];

  P.components.footer = function () {
    return '' +
      '<footer class="pub-footer">' +
        '<div>' +
          '<div class="landing-brand" style="margin-bottom:12px">' +
            '<div class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></div>' +
            '<span>ExpertHub</span>' +
          '</div>' +
          '<p style="opacity:.65;line-height:1.6;margin:0;max-width:34ch">' +
            'E-School, 1-on-1 expert consultations and corporate training — in one modern platform.' +
          '</p>' +
        '</div>' +
        COLS.map(function (col) {
          return '<div><h4>' + esc(col[0]) + '</h4><ul>' +
            col[1].map(function (item) {
              return '<li><button data-goto="' + item[1] + '">' + esc(item[0]) + '</button></li>';
            }).join('') +
          '</ul></div>';
        }).join('') +
        '<div class="pub-copy">© ' + new Date().getFullYear() +
          ' ExpertHub. E-School, Consultation and Corporate Training Platform.</div>' +
      '</footer>';
  };
})();
