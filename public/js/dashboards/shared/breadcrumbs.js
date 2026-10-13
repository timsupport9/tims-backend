/* ============================================================
   dashboards/shared/breadcrumbs.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(items = []) {
    if (!items.length) return '';
    return `
      <nav class="breadcrumbs" aria-label="Breadcrumbs">
        ${items.map((it, i) => {
          const isLast = i === items.length - 1;
          if (isLast) return `<span aria-current="page">${EH.Fmt.esc(it.label)}</span>`;
          return `<a href="${EH.Fmt.esc(it.href || '#')}">${EH.Fmt.esc(it.label)}</a>`;
        }).join('')}
      </nav>`;
  }

  EH.Breadcrumbs = { render };
})(window);
