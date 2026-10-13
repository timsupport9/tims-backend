/* ============================================================
   ExpertHub — js/public/pages/experts.js
   #/experts  —  browse experts.
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
        P.components.navbar('experts') +
        '<div class="pub-page">' +
          '<h1 class="section-title" style="margin-bottom:6px">Find an expert</h1>' +
          '<p class="section-sub">Verified professionals for 1-on-1 consultations, coaching and mentoring.</p>' +
          '<div class="pub-search" style="margin:22px 0;max-width:520px">' +
            '<i class="fas fa-magnifying-glass"></i>' +
            '<input type="search" id="pubExpertQuery" placeholder="Search by name, skill or field…">' +
          '</div>' +
          '<div class="pub-grid pub-grid-4" id="pubExpertList">' + F.skeletons(8, 250) + '</div>' +
        '</div>' +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);

    var input = root.querySelector('#pubExpertQuery');
    if (input) input.addEventListener('input', F.debounce(function () { load(input.value); }, 280));
    load('');
  }

  async function load(q) {
    var el = document.getElementById('pubExpertList');
    if (!el) return;
    el.innerHTML = F.skeletons(8, 250);

    var params = ['limit=24'];
    if (q) params.push('q=' + encodeURIComponent(q));

    var list;
    try {
      var raw = await P.api.fetch('/experts?' + params.join('&'));
      list = F.listOf(raw, ['experts']).map(P.normalize.expert);
    } catch (_) { list = []; }
    if (!list.length) list = P.demo.experts.map(P.normalize.expert);

    if (!document.body.contains(el)) return;
    el.innerHTML = list.length
      ? list.map(P.components.expertCard).join('')
      : F.empty('No experts match your search.');
  }

  P.pages.experts = { render: render, load: load };
})();
