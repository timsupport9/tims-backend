/* ============================================================
   ui/loading.js — Global + inline loading overlays
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  let activeCount = 0;
  let el = null;

  function ensureEl() {
    if (el) return el;
    el = document.createElement('div');
    el.id = 'globalLoader';
    el.className = 'loading-overlay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="spinner" aria-hidden="true"></div><span class="sr-only">Loading…</span>';
    document.body.appendChild(el);
    return el;
  }

  function show(force = false) {
    activeCount = force ? 1 : activeCount + 1;
    ensureEl().classList.remove('hidden');
  }

  function hide(force = false) {
    activeCount = force ? 0 : Math.max(0, activeCount - 1);
    if (activeCount === 0 && el) el.classList.add('hidden');
  }

  function button(btn, on = true) {
    if (!btn) return;
    if (on) {
      btn.dataset.loadingOriginal = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('btn-loading');
      btn.innerHTML = '<span class="btn-spinner"></span> Please wait…';
    } else {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      if (btn.dataset.loadingOriginal) {
        btn.innerHTML = btn.dataset.loadingOriginal;
        delete btn.dataset.loadingOriginal;
      }
    }
  }

  function skeleton(container, lines = 3) {
    if (!container) return;
    container.innerHTML = Array.from({ length: lines }, () =>
      '<div class="skeleton skeleton-line"></div>').join('');
  }

  EH.Loading = { show, hide, button, skeleton };
  global.showLoading = (on) => (on ? show() : hide());
})(window);
