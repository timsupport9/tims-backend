/* ============================================================
   public/search/search-results.js — Search results renderer
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const SearchResults = {
    render(container, results, { emptyMessage = 'No results found' } = {}) {
      if (!container) return;
      if (!results || !results.length) {
        container.innerHTML = EH.EmptyState.render({
          icon: 'fa-search', title: 'Nothing found', description: emptyMessage,
        });
        return;
      }
      container.innerHTML = results.map(r => {
        if (r.kind === 'course') return EH.CourseCard.render(r);
        if (r.kind === 'expert') return EH.ExpertCard.render(r);
        if (r.kind === 'event')  return EH.EventCard.render(r);
        return '';
      }).join('');
    },
  };

  EH.SearchResults = SearchResults;
})(window);
