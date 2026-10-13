/* ============================================================
   ui/tabs.js — Tab component
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function init(root, { onChange = null, active = null } = {}) {
    if (!root) return () => {};
    const buttons = Array.from(root.querySelectorAll('[data-tab-target]'));
    const panels = Array.from(root.querySelectorAll('[data-tab-panel]'));

    function activate(id) {
      buttons.forEach(b => {
        const on = b.dataset.tabTarget === id;
        b.classList.toggle('tab-btn-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.setAttribute('tabindex', on ? '0' : '-1');
      });
      panels.forEach(p => {
        p.classList.toggle('hidden', p.dataset.tabPanel !== id);
      });
      if (typeof onChange === 'function') onChange(id);
    }

    buttons.forEach(b => {
      b.addEventListener('click', () => activate(b.dataset.tabTarget));
      b.addEventListener('keydown', (e) => {
        const i = buttons.indexOf(b);
        if (e.key === 'ArrowRight') activate(buttons[(i + 1) % buttons.length].dataset.tabTarget);
        if (e.key === 'ArrowLeft')  activate(buttons[(i - 1 + buttons.length) % buttons.length].dataset.tabTarget);
      });
    });

    const initial = active || buttons[0]?.dataset.tabTarget;
    if (initial) activate(initial);
    return { activate };
  }

  EH.Tabs = { init };
})(window);
