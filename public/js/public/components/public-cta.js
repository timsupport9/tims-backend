/* ============================================================
   ExpertHub — js/public/components/public-cta.js
   Closing call-to-action band.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var esc = P.format.esc;

  P.components.cta = function (opts) {
    opts = opts || {};
    var title = opts.title || 'Ready to start?';
    var text  = opts.text  || 'Join thousands of learners, experts and institutions already growing on ExpertHub.';
    var label = opts.label || 'Create your free account';
    var href  = opts.href  || '#/register';
    var icon  = opts.icon  || 'fa-rocket';

    return '' +
      '<section class="section alt">' +
        '<div class="pub-cta">' +
          '<h2>' + esc(title) + '</h2>' +
          '<p>' + esc(text) + '</p>' +
          '<button class="btn btn-primary" data-goto="' + href + '">' +
            '<i class="fas ' + icon + '"></i> ' + esc(label) + '</button>' +
        '</div>' +
      '</section>';
  };
})();
