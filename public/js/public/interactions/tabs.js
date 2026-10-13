/* ============================================================
   public/interactions/tabs.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function init(root = document) {
    root.querySelectorAll('[data-tabs]').forEach(container => {
      EH.Tabs.init(container, {
        onChange: (id) => {
          container.dispatchEvent(new CustomEvent('tab-change', { detail: { id } }));
        },
      });
    });
  }

  EH.PublicTabs = { init };
})(window);
