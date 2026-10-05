/* ============================================================
   ExpertHub — js/public/components/category-card.js
   Small tile for browsing by category.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var esc = P.format.esc;

  P.components.categoryCard = function (cat) {
    var name = cat.name || cat;
    var icon = cat.icon || 'fa-graduation-cap';
    var tint = cat.tint || '#6366f1';

    return '<a class="pub-card" href="#/courses?q=' + encodeURIComponent(name) + '" ' +
      'style="padding:20px;text-decoration:none;color:inherit;align-items:center;text-align:center">' +
      '<div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;' +
        'justify-content:center;background:' + tint + '1a;color:' + tint + ';margin-bottom:12px">' +
        '<i class="fas ' + icon + '" style="font-size:1.2rem"></i>' +
      '</div>' +
      '<b style="font-size:.92rem">' + esc(name) + '</b>' +
      (cat.count ? '<span style="font-size:.76rem;opacity:.6;margin-top:4px">' +
        cat.count + ' courses</span>' : '') +
    '</a>';
  };

  P.components.defaultCategories = function () {
    return [
      { name: 'Web Development', icon: 'fa-code', tint: '#6366f1' },
      { name: 'Data Science',    icon: 'fa-chart-line', tint: '#0ea5e9' },
      { name: 'Business',        icon: 'fa-briefcase', tint: '#10b981' },
      { name: 'Exam Prep',       icon: 'fa-book', tint: '#f59e0b' },
      { name: 'Design',          icon: 'fa-palette', tint: '#8b5cf6' },
      { name: 'Languages',       icon: 'fa-language', tint: '#ef4444' }
    ];
  };
})();
