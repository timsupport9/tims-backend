/* ============================================================
   ui/tooltip.js — Lightweight tooltip via title attribute
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  let tipEl = null;
  let showTimer = null;

  function ensure() {
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.className = 'tooltip';
    tipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function showFor(target) {
    const text = target.dataset.tooltip || target.getAttribute('title');
    if (!text) return;
    if (target.hasAttribute('title')) {
      target.dataset.tooltip = text;
      target.removeAttribute('title');
    }
    const el = ensure();
    el.textContent = text;
    const r = target.getBoundingClientRect();
    el.style.top = `${r.top + window.scrollY - 36}px`;
    el.style.left = `${r.left + window.scrollX + r.width / 2}px`;
    el.classList.add('tooltip-show');
  }

  function hide() {
    if (tipEl) tipEl.classList.remove('tooltip-show');
  }

  function init(root = document) {
    root.querySelectorAll('[data-tooltip], [title]').forEach(el => {
      if (el.dataset.tooltipBound) return;
      el.dataset.tooltipBound = '1';
      el.addEventListener('mouseenter', () => {
        clearTimeout(showTimer);
        showTimer = setTimeout(() => showFor(el), 350);
      });
      el.addEventListener('mouseleave', () => {
        clearTimeout(showTimer);
        hide();
      });
      el.addEventListener('focus', () => showFor(el));
      el.addEventListener('blur', hide);
    });
  }

  EH.Tooltip = { init, hide };
})(window);
