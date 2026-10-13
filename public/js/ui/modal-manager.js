/* ============================================================
   ui/modal-manager.js — Modal stack manager
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { bus, EVENTS } = EH;
  const stack = [];

  function ensureRoot() {
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function open({ title = '', body = '', footer = '', className = '', onClose = null, size = 'md' }) {
    const root = ensureRoot();
    const layer = document.createElement('div');
    layer.className = 'modal-overlay';
    const sizeClass = size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : '';
    layer.innerHTML = `
      <div class="modal-content ${className} ${sizeClass}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="modal-header">
          <h3 class="modal-title">${escapeHtml(title)}</h3>
          <button class="modal-close" type="button" aria-label="Close">&times;</button>
        </header>
        <section class="modal-body">${body}</section>
        ${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}
      </div>`;

    const close = () => {
      layer.classList.add('modal-exit');
      setTimeout(() => {
        layer.remove();
        const idx = stack.indexOf(handle);
        if (idx > -1) stack.splice(idx, 1);
        if (stack.length === 0) document.body.classList.remove('modal-open');
        if (typeof onClose === 'function') onClose();
        bus?.emit(EVENTS?.MODAL_CLOSE || 'modal:close');
      }, 180);
    };

    const handle = { layer, close, $: (sel) => layer.querySelector(sel), $$: (sel) => Array.from(layer.querySelectorAll(sel)) };
    stack.push(handle);

    layer.addEventListener('click', (e) => {
      if (e.target === layer) close();
    });
    layer.querySelector('.modal-close').onclick = close;
    layer.querySelectorAll('[data-close-modal]').forEach(b => { b.onclick = close; });

    root.appendChild(layer);
    document.body.classList.add('modal-open');

    const autofocus = layer.querySelector('[autofocus], input, select, textarea, button:not(.modal-close)');
    if (autofocus) setTimeout(() => autofocus.focus(), 40);

    if (EH.A11y?.trapFocus) {
      handle.releaseFocus = EH.A11y.trapFocus(layer.querySelector('.modal-content'), { onEscape: close });
    }
    bus?.emit(EVENTS?.MODAL_OPEN || 'modal:open', { title });
    return handle;
  }

  function close() {
    const top = stack[stack.length - 1];
    if (top) top.close();
  }

  function closeAll() {
    while (stack.length) stack[stack.length - 1].close();
  }

  function current() {
    return stack[stack.length - 1] || null;
  }

  function confirm(message, { title = 'Confirm', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
    return new Promise((resolve) => {
      const m = open({
        title,
        body: `<p class="modal-message">${escapeHtml(message)}</p>`,
        footer: `
          <button class="btn btn-secondary" data-close-modal>${escapeHtml(cancelText)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modalConfirmBtn">${escapeHtml(confirmText)}</button>`,
        size: 'sm',
        onClose: () => resolve(false),
      });
      m.$('#modalConfirmBtn').onclick = () => {
        m.$('#modalConfirmBtn').onclick = null;
        m.close();
        resolve(true);
      };
    });
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length) close();
  });

  EH.Modal = { open, close, closeAll, current, confirm };
  // Legacy
  global.openModal = open;
  global.closeModal = close;
  global.confirmDialog = (msg, title) => confirm(msg, { title });
})(window);
