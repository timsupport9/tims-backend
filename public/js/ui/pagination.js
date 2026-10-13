/* ============================================================
   ui/pagination.js — Pagination bar renderer
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function bar(resource, page, per, total) {
    const pages = Math.max(1, Math.ceil((total || 0) / (per || 20)));
    if (pages <= 1) return '';
    const start = Math.max(1, page - 2);
    const end = Math.min(pages, start + 4);
    const links = [];
    for (let i = start; i <= end; i++) {
      links.push(`
        <button class="btn btn-xs ${i === page ? 'btn-primary' : 'btn-secondary'}"
                data-action="paginate" data-resource="${resource}" data-page="${i}"
                ${i === page ? 'disabled' : ''}>${i}</button>`);
    }
    return `
      <div class="table-footer">
        <span>Page ${page} of ${pages} · ${total} record${total === 1 ? '' : 's'}</span>
        <div class="pagination-controls">
          <button class="btn btn-secondary btn-xs" ${page <= 1 ? 'disabled' : ''}
                  data-action="paginate" data-resource="${resource}" data-page="${page - 1}">
            <i class="fas fa-chevron-left"></i>
          </button>
          ${links.join('')}
          <button class="btn btn-secondary btn-xs" ${page >= pages ? 'disabled' : ''}
                  data-action="paginate" data-resource="${resource}" data-page="${page + 1}">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>`;
  }

  EH.Pagination = { bar };
  global.paginationBar = bar;
})(window);
