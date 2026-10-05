/* ============================================================
   ExpertHub — js/public/pages/events.js
   #/events  —  browse events.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.pages = P.pages || {};
  var F = P.format;

  function render() {
    try { appPhase = 'landing'; } catch (_) {}
    P.ensureStyles();

    var root = document.getElementById('app-root');
    root.innerHTML = '' +
      '<div class="landing">' +
        P.components.navbar('events') +
        '<div class="pub-page" style="max-width:900px">' +
          '<h1 class="section-title" style="margin-bottom:6px">Events &amp; workshops</h1>' +
          '<p class="section-sub">Webinars, live workshops, open days and training sessions.</p>' +
          '<div class="pub-grid" id="pubEventList" style="gap:14px;margin-top:24px">' +
            F.skeletons(4, 90) + '</div>' +
        '</div>' +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);
    load();
  }

  async function load() {
    var el = document.getElementById('pubEventList');
    if (!el) return;

    var list;
    try {
      var raw = await P.api.fetch('/events?limit=24');
      list = F.listOf(raw, ['events']).map(P.normalize.event);
    } catch (_) { list = []; }
    if (!list.length) list = P.demo.events.map(P.normalize.event);

    if (!document.body.contains(el)) return;
    el.innerHTML = list.length
      ? list.map(P.components.eventRow).join('')
      : F.empty('No events scheduled yet. Check back soon.');
  }

  P.pages.events = { render: render, load: load };
})();
