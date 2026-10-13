/* ============================================================
   public/search/search-filters.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const SearchFilters = {
    apply(items, { type, level, category, priceMin, priceMax, q } = {}) {
      let out = items || [];
      if (type && type !== 'all') out = out.filter(i => i.course_type === type);
      if (level && level !== 'all') out = out.filter(i => i.level === level);
      if (category && category !== 'all') out = out.filter(i => i.category === category);
      if (priceMin != null) out = out.filter(i => Number(i.price || 0) >= priceMin);
      if (priceMax != null) out = out.filter(i => Number(i.price || 0) <= priceMax);
      if (q) {
        const s = q.toLowerCase();
        out = out.filter(i =>
          (i.title || '').toLowerCase().includes(s) ||
          (i.description || '').toLowerCase().includes(s));
      }
      return out;
    },
  };

  EH.SearchFilters = SearchFilters;
})(window);
