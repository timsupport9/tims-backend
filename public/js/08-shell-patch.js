/* ============================================================
   08-shell-patch.js
   Additive helpers for shell navigation — group headers,
   collapsible sections, active-group auto-expand.
   Include AFTER 08-shell.js.
   ============================================================ */

window.navGroup = function (title, items) {
  if (!items || !items.length) return '';
  const visible = items.filter(Boolean);
  if (!visible.length) return '';

  /* Auto-expand a group if it contains the active item */
  const hasActive = visible.some(html => html.includes('sidebar-item-active'));
  const isOpen = !title || hasActive;

  const header = title ? `
    <button class="sidebar-group-toggle" data-group-toggle aria-expanded="${isOpen ? 'true' : 'false'}">
      <span>${esc(title)}</span>
      <i class="fas fa-chevron-down sidebar-group-chevron"></i>
    </button>` : '';

  return `
    <div class="sidebar-group ${isOpen ? 'sidebar-group-open' : ''}">
      ${header}
      <div class="sidebar-group-body">
        ${visible.join('')}
      </div>
    </div>`;
};

/* Click handler for group toggle headers */
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-group-toggle]');
  if (!toggle) return;
  const group = toggle.closest('.sidebar-group');
  if (!group) return;
  const isOpen = group.classList.toggle('sidebar-group-open');
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});

/* Remember open/closed group state per role — pure UX polish */
(function persistGroupState() {
  const KEY = 'admin_nav_groups_v1';
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (!Object.keys(saved).length) return;
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-group-toggle]');
      if (!toggle) return;
      const group = toggle.closest('.sidebar-group');
      const title = toggle.textContent.trim();
      saved[title] = group.classList.contains('sidebar-group-open');
      localStorage.setItem(KEY, JSON.stringify(saved));
    }, true);
  } catch (_) {}
})();
