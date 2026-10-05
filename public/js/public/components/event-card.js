/* ============================================================
   ExpertHub — js/public/components/event-card.js
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var F = P.format, esc = F.esc;

  P.components.eventRow = function (ev) {
    if (!ev) return '';
    var d = ev.startsAt ? new Date(ev.startsAt) : null;
    var day = d && !isNaN(d) ? d.getDate() : '—';
    var mon = d && !isNaN(d) ? d.toLocaleDateString(undefined, { month: 'short' }) : '';

    return '' +
      '<article class="pub-row-card" data-goto="#/events/' +
        encodeURIComponent(ev.id) + '" style="cursor:pointer">' +
        '<div class="pub-date-chip"><b>' + esc(day) + '</b><span>' + esc(mon) + '</span></div>' +
        '<div style="flex:1;min-width:0">' +
          '<h3 class="pub-card-title" style="margin-bottom:4px">' + esc(ev.title) + '</h3>' +
          '<p class="pub-card-text" style="margin-bottom:6px">' + esc(ev.summary || '') + '</p>' +
          '<div class="pub-card-meta" style="padding-top:0">' +
            '<span><i class="fas fa-' + (ev.mode === 'physical' ? 'location-dot' : 'video') + '"></i> ' +
              esc(ev.mode === 'physical' ? (ev.location || 'In person') : 'Online') + '</span>' +
            '<span><i class="fas fa-clock"></i> ' + esc(F.dateTime(ev.startsAt)) + '</span>' +
            '<span><i class="fas fa-tag"></i> ' + esc(F.money(ev.price, ev.currency)) + '</span>' +
          '</div>' +
        '</div>' +
        '<i class="fas fa-chevron-right" style="opacity:.35"></i>' +
      '</article>';
  };
})();
