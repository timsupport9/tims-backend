/* ============================================================
   ui/toast.js — Toast notifications
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const ICONS = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-bell',
  };

  function show(message, type = 'info', timeout = 3400) {
    const container = document.getElementById('toast-container');
    if (!container) return null;

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `
      <i class="fas ${ICONS[type] || ICONS.info} toast-icon"></i>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Close"><i class="fas fa-times"></i></button>`;

    const close = () => {
      el.classList.add('toast-exit');
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector('.toast-close').onclick = close;
    container.appendChild(el);

    if (timeout > 0) setTimeout(close, timeout);
    return { close, el };
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  const Toast = {
    show,
    success: (m, t) => show(m, 'success', t),
    error:   (m, t) => show(m, 'error', t ?? 5000),
    warning: (m, t) => show(m, 'warning', t ?? 4500),
    info:    (m, t) => show(m, 'info', t),
    dismissAll() {
      const c = document.getElementById('toast-container');
      if (c) c.innerHTML = '';
    },
  };

  EH.Toast = Toast;
  global.showToast = show;
})(window);
