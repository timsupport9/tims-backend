/* ============================================================
   ui/accordion.js — Accordion component
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function init(container, { multiple = false } = {}) {
    if (!container) return;
    container.querySelectorAll('.accordion-item').forEach(item => {
      const header = item.querySelector('.accordion-header');
      if (!header) return;
      header.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
      header.onclick = () => {
        const willOpen = !item.classList.contains('open');
        if (!multiple) {
          container.querySelectorAll('.accordion-item.open').forEach(x => {
            x.classList.remove('open');
            x.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'false');
          });
        }
        item.classList.toggle('open', willOpen);
        header.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      };
    });
  }

  function initFaq(container) {
    if (!container) return;
    container.querySelectorAll('.faq-q').forEach(q => {
      q.onclick = () => {
        const parent = q.parentElement;
        const wasOpen = parent.classList.contains('open');
        container.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
        if (!wasOpen) parent.classList.add('open');
      };
    });
  }

  EH.Accordion = { init, initFaq };
  // Legacy: window handles FAQ inline
  global.initFaq = initFaq;
})(window);
