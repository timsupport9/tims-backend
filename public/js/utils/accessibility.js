/* ============================================================
   utils/accessibility.js — A11y helpers
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function announce(msg, priority = 'polite') {
    let host = document.getElementById('sr-announcer');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sr-announcer';
      host.className = 'sr-only';
      host.setAttribute('aria-live', priority);
      host.setAttribute('aria-atomic', 'true');
      document.body.appendChild(host);
    }
    host.setAttribute('aria-live', priority);
    host.textContent = '';
    setTimeout(() => { host.textContent = String(msg || ''); }, 40);
  }

  function trapFocus(container, opts = {}) {
    if (!container) return () => {};
    const selector = opts.selector
      || 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const previousActive = document.activeElement;

    function getFocusable() {
      return Array.from(container.querySelectorAll(selector))
        .filter(el => el.offsetParent !== null);
    }

    function onKeydown(e) {
      if (e.key === 'Tab') {
        const list = getFocusable();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
      if (e.key === 'Escape' && opts.onEscape) opts.onEscape();
    }

    container.addEventListener('keydown', onKeydown);
    const focusables = getFocusable();
    if (focusables.length) focusables[0].focus();

    return () => {
      container.removeEventListener('keydown', onKeydown);
      if (previousActive && previousActive.focus) previousActive.focus();
    };
  }

  function setAriaBusy(node, busy) {
    if (!node) return;
    node.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function setAriaHidden(node, hidden) {
    if (!node) return;
    if (hidden) node.setAttribute('aria-hidden', 'true');
    else node.removeAttribute('aria-hidden');
  }

  function labelInput(input, label) {
    if (!input) return;
    const id = input.id || `input-${Math.random().toString(36).slice(2, 8)}`;
    input.id = id;
    let labelEl = document.querySelector(`label[for="${id}"]`);
    if (!labelEl) {
      labelEl = document.createElement('label');
      labelEl.htmlFor = id;
      labelEl.className = 'sr-only';
      labelEl.textContent = label;
      input.parentNode.insertBefore(labelEl, input);
    }
  }

  EH.A11y = { announce, trapFocus, setAriaBusy, setAriaHidden, labelInput };
})(window);
