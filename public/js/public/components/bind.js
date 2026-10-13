/* ============================================================
   public/components/bind.js — Safe click binding with delegation
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function bind(root, selector, handler) {
    if (!root) return;
    root.querySelectorAll(selector).forEach(el => {
      el.onclick = handler;
    });
  }

  function bindActions(root, actionMap) {
    if (!root) return;
    root.querySelectorAll('[data-action]').forEach(el => {
      const fn = actionMap[el.dataset.action];
      if (typeof fn === 'function') el.onclick = (e) => fn(e, el);
    });
  }

  EH.PublicBind = { bind, bindActions };
})(window);
