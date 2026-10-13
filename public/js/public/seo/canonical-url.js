/* ============================================================
   public/seo/canonical-url.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function update(hash) {
    const clean = location.origin + '/' + (hash || location.hash || '');
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', clean);
  }

  EH.CanonicalURL = { update };
})(window);
