/* ============================================================
   ui/dropdown.js — Dropdown menus
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const openDrop = new WeakMap();

  function attach(trigger, panel) {
    if (!trigger || !panel) return () => {};
    const close = () => {
      panel.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      openDrop.delete(trigger);
      document.removeEventListener('click', onOutside, true);
    };
    const onOutside = (e) => {
      if (!panel.contains(e.target) && !trigger.contains(e.target)) close();
    };
    const toggle = () => {
      const isOpen = panel.classList.toggle('open');
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) {
        openDrop.set(trigger, { close });
        setTimeout(() => document.addEventListener('click', onOutside, true), 0);
      }
    };
    trigger.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    panel.querySelectorAll('[data-close-dropdown]').forEach(b => b.addEventListener('click', close));
    return close;
  }

  function closeAll() {
    document.querySelectorAll('.dropdown-panel.open').forEach(p => {
      p.classList.remove('open');
      const trigger = p.previousElementSibling;
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  EH.Dropdown = { attach, closeAll };
})(window);
