/* ============================================================
   ExpertHub — js/public/components/resource-card.js
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var F = P.format, esc = F.esc;

  P.components.resourceCard = function (r) {
    if (!r) return '';
    return '' +
      '<article class="pub-card" data-action="resource-open" ' +
        'data-url="' + esc(r.url || '') + '" style="cursor:pointer">' +
        '<div class="pub-card-media" style="aspect-ratio:16/10">' +
          (r.cover
            ? '<img src="' + esc(r.cover) + '" alt="" loading="lazy">'
            : '<img src="' + esc(F.avatar(r.title, '0ea5e9')) + '" alt="" loading="lazy">') +
          '<span class="pub-card-tag">' + esc(r.type || 'Article') + '</span>' +
        '</div>' +
        '<div class="pub-card-body">' +
          '<h3 class="pub-card-title">' + esc(r.title) + '</h3>' +
          '<p class="pub-card-text">' + esc(r.summary || '') + '</p>' +
          '<div class="pub-card-meta">' +
            '<span>' + esc(r.author || 'ExpertHub') + '</span>' +
            (r.readMinutes ? '<span>· ' + r.readMinutes + ' min read</span>' : '') +
          '</div>' +
        '</div>' +
      '</article>';
  };
})();
