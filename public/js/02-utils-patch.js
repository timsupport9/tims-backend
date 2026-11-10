/* ============================================================
   02-utils-patch.js
   Additional pure helpers. Load AFTER 02-utils.js.
   ============================================================ */

/* Consistent empty state across all dashboards */
window.emptyState = function (icon, title, sub, actionHtml) {
  return `
    <div class="empty-state">
      <i class="fas ${esc(icon || 'fa-inbox')}"></i>
      <h3>${esc(title || 'Nothing here yet')}</h3>
      ${sub ? `<p>${esc(sub)}</p>` : ''}
      ${actionHtml || ''}
    </div>`;
};

/* Escape helper for attribute values */
window.escAttr = function (s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
};

/* Toggle text (used by buttons that flip state) */
window.toggleText = function (el, a, b) {
  if (!el) return;
  el.textContent = el.textContent.trim() === a ? b : a;
};

/* Safe HTML truncation that preserves entities */
window.truncate = function (s, n) {
  const t = String(s ?? '');
  if (t.length <= n) return t;
  return t.slice(0, n).trimEnd() + '…';
};
