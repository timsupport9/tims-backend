/* ============================================================
   ExpertHub — js/public/pages/resources.js
   #/resources  —  public resources index.
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
        P.components.navbar('resources') +
        '<div class="pub-page">' +
          '<h1 class="section-title" style="margin-bottom:6px">Resources</h1>' +
          '<p class="section-sub">Free articles, guides, templates and learning materials.</p>' +
          '<div class="pub-grid pub-grid-4" id="pubResourceList" style="margin-top:24px">' +
            F.skeletons(8, 240) + '</div>' +
        '</div>' +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);
    load();
  }

  async function load() {
    var el = document.getElementById('pubResourceList');
    if (!el) return;

    var list;
    try {
      var raw = await P.api.fetch('/resources?limit=32');
      list = F.listOf(raw, ['resources']).map(P.normalize.resource);
    } catch (_) { list = []; }
    if (!list.length) list = P.demo.resources.map(P.normalize.resource);

    if (!document.body.contains(el)) return;
    el.innerHTML = list.length
      ? list.map(P.components.resourceCard).join('')
      : F.empty('No resources published yet.');
  }

  P.pages.resources = { render: render, load: load };
})();
