/* ============================================================
   ui/empty-state.js — Empty state renderer
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render({ icon = 'fa-inbox', title = 'Nothing here yet', description = '', action = null, actionLabel = '', cols = null } = {}) {
    return `
      <div class="empty-state" ${cols ? `style="grid-column:1/-1"` : ''}>
        <i class="fas ${icon}"></i>
        <h3>${escapeHtml(title)}</h3>
        ${description ? `<p>${escapeHtml(description)}</p>` : ''}
        ${action && actionLabel ? `
          <button class="btn btn-primary" data-action="${escapeHtml(action)}">
            <i class="fas fa-plus"></i> ${escapeHtml(actionLabel)}</button>` : ''}
      </div>`;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  EH.EmptyState = { render };
})(window);
