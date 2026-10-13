/* ============================================================
   public/components/category-card.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(category) {
    return `
      <a href="#/courses?category=${EH.Fmt.esc(category.id)}"
         class="category-card" style="--cat-color:${EH.Fmt.esc(category.color)}">
        <i class="fas ${EH.Fmt.esc(category.icon)} category-icon"></i>
        <span class="category-name">${EH.Fmt.esc(category.name)}</span>
      </a>`;
  }

  function grid() {
    return `
      <section class="section">
        <h2 class="section-title">Browse by category</h2>
        <p class="section-sub">Find the right learning path for you.</p>
        <div class="category-grid">
          ${(EH.PublicCategories || []).map(render).join('')}
        </div>
      </section>`;
  }

  EH.CategoryCard = { render, grid };
})(window);
