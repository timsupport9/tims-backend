/* ============================================================
   public/interactions/accordions.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function init(root = document) {
    root.querySelectorAll('[data-accordion]').forEach(container => {
      EH.Accordion.init(container, {
        multiple: container.dataset.accordion === 'multiple',
      });
    });
  }

  EH.PublicAccordions = { init };
})(window);
