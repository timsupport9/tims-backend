/* ============================================================
   ui/error-state.js — Error state renderer
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render({ title = 'Something went wrong', message = '', retryAction = 'retry' } = {}) {
    return `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message || 'Please try again in a moment.')}</p>
        ${retryAction ? `<button class="btn btn-primary" data-action="${escapeHtml(retryAction)}">
          <i class="fas fa-rotate"></i> Retry</button>` : ''}
      </div>`;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  EH.ErrorState = { render };
})(window);
