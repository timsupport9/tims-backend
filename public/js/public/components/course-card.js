/* ============================================================
   ExpertHub — js/public/components/course-card.js
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var F = P.format, esc = F.esc;

  P.components.courseCard = function (c) {
    if (!c) return '';
    var img = c.thumbnail
      ? '<img src="' + esc(c.thumbnail) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<img src="' + esc(F.avatar(c.title, '4f46e5')) + '" alt="" loading="lazy">';

    var expert = c.expert || {};

    return '' +
      '<article class="pub-card" data-goto="#/courses/' + encodeURIComponent(c.id) + '" style="cursor:pointer">' +
        '<div class="pub-card-media">' + img +
          '<span class="pub-card-tag">' + esc(c.category || 'Course') + '</span>' +
          '<span class="pub-card-price">' + esc(F.money(c.price, c.currency)) + '</span>' +
        '</div>' +
        '<div class="pub-card-body">' +
          '<h3 class="pub-card-title">' + esc(c.title) + '</h3>' +
          '<p class="pub-card-text">' + esc(c.summary || '') + '</p>' +
          (expert.name
            ? '<div class="pub-card-meta">' +
                '<span class="pub-author">' +
                  '<img src="' + esc(F.safeImage(expert.avatar, expert.name)) + '" alt="">' +
                  esc(expert.name) +
                  (expert.verified ? ' <i class="fas fa-circle-check pub-verified"></i>' : '') +
                '</span>' +
              '</div>'
            : '') +
          '<div class="pub-card-meta" style="padding-top:0">' +
            (c.rating ? '<span><i class="fas fa-star" style="color:#f59e0b"></i> ' + Number(c.rating).toFixed(1) + '</span>' : '') +
            (c.lessons ? '<span><i class="fas fa-book-open"></i> ' + c.lessons + ' lessons</span>' : '') +
            (c.durationWeeks ? '<span><i class="fas fa-clock"></i> ' + c.durationWeeks + ' weeks</span>' : '') +
            (c.level ? '<span><i class="fas fa-signal"></i> ' + esc(c.level) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</article>';
  };
})();
