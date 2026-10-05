/* ============================================================
   ExpertHub — js/public/pages/expert-detail.js
   #/experts/:id  —  public expert profile.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.pages = P.pages || {};
  var F = P.format, esc = F.esc;

  function render(params) {
    try { appPhase = 'landing'; } catch (_) {}
    P.ensureStyles();

    var root = document.getElementById('app-root');
    root.innerHTML = '' +
      '<div class="landing">' +
        P.components.navbar('experts') +
        '<div class="pub-page" id="pubExpertDetail">' + F.skeletons(1, 360) + '</div>' +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);
    load(params && params.id);
  }

  async function load(id) {
    var host = document.getElementById('pubExpertDetail');
    if (!id || !host) return;

    var expert;
    try {
      var raw = await P.api.fetch('/experts/' + encodeURIComponent(id));
      var e = F.oneOf(raw, ['expert']);
      expert = e ? P.normalize.expert(e) : null;
    } catch (_) { expert = null; }
    if (!expert) {
      for (var i = 0; i < P.demo.experts.length; i++) {
        if (String(P.demo.experts[i].id) === String(id)) { expert = P.normalize.expert(P.demo.experts[i]); break; }
      }
    }
    if (!document.body.contains(host)) return;

    if (!expert) {
      host.innerHTML = F.empty('That expert could not be found.',
                               'Back to experts',
                               'data-goto="#/experts"');
      P.bindGoto(host);
      return;
    }

    var authed = !!(window.S && (S.user || S.token));

    host.innerHTML = '' +
      '<button class="pub-link" data-goto="#/experts" style="margin-bottom:20px">' +
        '<i class="fas fa-arrow-left"></i> All experts</button>' +

      '<div class="pub-detail-hero">' +
        '<div>' +
          '<div class="pub-author" style="margin-bottom:16px">' +
            '<img src="' + esc(F.safeImage(expert.avatar, expert.name)) + '" alt="" ' +
              'style="width:86px;height:86px;border-radius:50%;object-fit:cover">' +
            '<div>' +
              '<h1 class="section-title" style="margin:0 0 4px;font-size:1.7rem">' + esc(expert.name) +
                (expert.verified ? ' <i class="fas fa-circle-check pub-verified"></i>' : '') + '</h1>' +
              '<p style="margin:0;opacity:.68">' + esc(expert.headline || 'ExpertHub consultant') + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="pub-stars" style="font-size:.95rem;margin-bottom:14px">' + F.stars(expert.rating) +
            ' <span style="color:inherit;opacity:.6;margin-left:6px">' +
            (expert.rating ? Number(expert.rating).toFixed(1) : 'New') +
            (expert.reviews ? ' · ' + expert.reviews + ' reviews' : '') + '</span>' +
          '</div>' +
          (expert.specializations.length
            ? '<div class="pub-tags" style="justify-content:flex-start;margin-bottom:20px">' +
              expert.specializations.map(function (s) {
                return '<span class="pub-tag">' + esc(s) + '</span>';
              }).join('') + '</div>'
            : '') +
          '<p style="line-height:1.75;opacity:.76">' + esc(expert.headline) + '</p>' +
        '</div>' +

        '<aside class="pub-side">' +
          '<div class="pub-side-price">' +
            (expert.rate ? esc(F.money(expert.rate, expert.currency)) : 'Contact') +
            (expert.rate ? '<span style="font-size:.82rem;font-weight:500;opacity:.6"> / session</span>' : '') +
          '</div>' +
          '<button class="btn btn-primary btn-block" data-goto="' +
            (authed ? '#/messages' : '#/register') + '">' +
            '<i class="fas fa-comments"></i> ' +
            (authed ? 'Book a consultation' : 'Sign up to book') + '</button>' +
          '<button class="btn btn-secondary btn-block" data-goto="#/contact">' +
            '<i class="fas fa-envelope"></i> Send a message</button>' +
        '</aside>' +
      '</div>';

    P.bindGoto(host);
  }

  P.pages.expertDetail = { render: render, load: load };
})();
