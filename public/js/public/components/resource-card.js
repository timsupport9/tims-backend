/* ============================================================
   public/components/resource-card.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(resource) {
    return `
      <article class="program-card public-resource-card">
        <span class="chip chip-neutral">${EH.Fmt.esc(resource.category || 'Resource')}</span>
        <h4 class="program-title">${EH.Fmt.esc(resource.title)}</h4>
        <p class="program-desc">${EH.Fmt.esc(EH.Fmt.truncate(resource.description || '', 130))}</p>
        <div class="panel-actions" style="margin-top:10px">
          <a href="#/resources" class="btn btn-secondary btn-sm">
            <i class="fas fa-book-open"></i> Read</a>
        </div>
      </article>`;
  }

  EH.ResourceCard = { render };
})(window);
