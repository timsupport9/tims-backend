/* ============================================================
   public/interactions/dropdowns.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function init(root = document) {
    root.querySelectorAll('[data-dropdown]').forEach(trigger => {
      const panelSelector = trigger.dataset.dropdown;
      const panel = panelSelector ? root.querySelector(panelSelector) : trigger.nextElementSibling;
      if (panel) EH.Dropdown.attach(trigger, panel);
    });
  }

  EH.PublicDropdowns = { init };
})(window);
