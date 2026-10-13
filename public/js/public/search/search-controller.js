/* ============================================================
   public/search/search-controller.js — Site-wide search
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const SearchController = {
    async query(q, type = 'all') {
      if (!q || q.trim().length < 2) return { results: [] };
      return EH.PublicAPI.search(q.trim(), type);
    },

    async fetchSuggestions(q) {
      if (!q || q.trim().length < 2) return [];
      try {
        const { results } = await this.query(q, 'all');
        return (results || []).slice(0, 8);
      } catch (_) {
        return [];
      }
    },
  };

  EH.SearchController = SearchController;
})(window);
