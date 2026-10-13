/* ============================================================
   ExpertHub — js/public/components/expert-card.js
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var F = P.format, esc = F.esc;

  P.components.expertCard = function (e) {
    if (!e) return '';
    var specs = Array.isArray(e.specializations) ? e.specializations : [];

    return '' +
      '<article class="pub-card pub-expert" data-goto="#/experts/' +
        encodeURIComponent(e.id) + '" style="cursor:pointer">' +
        '<img class="pub-expert-avatar" src="' + esc(F.safeImage(e.avatar, e.name)) + '" alt="" loading="lazy">' +
        '<h3>' + esc(e.name) +
          (e.verified ? ' <i class="fas fa-circle-check pub-verified" title="Verified by ExpertHub"></i>' : '') +
        '</h3>' +
        '<p class="pub-expert-role">' + esc(e.headline || 'ExpertHub consultant') + '</p>' +
        (specs.length
          ? '<div class="pub-tags">' + specs.slice(0, 3).map(function (s) {
              return '<span class="pub-tag">' + esc(s) + '</span>';
            }).join('') + '</div>'
          : '') +
        '<div class="pub-stars">' + F.stars(e.rating) +
          ' <span style="color:inherit;opacity:.55;margin-left:4px">' +
          (e.rating ? Number(e.rating).toFixed(1) : 'New') +
          (e.reviews ? ' · ' + e.reviews + ' reviews' : '') + '</span>' +
        '</div>' +
        '<div class="pub-card-meta" style="justify-content:center;padding-top:0">' +
          (e.rate
            ? '<span><b>' + esc(F.money(e.rate, e.currency)) + '</b> / session</span>'
            : '<span>Contact for rate</span>') +
          (e.experienceYears ? '<span>· ' + e.experienceYears + ' yrs exp</span>' : '') +
        '</div>' +
      '</article>';
  };
})();
