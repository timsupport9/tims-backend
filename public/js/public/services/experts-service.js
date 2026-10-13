/* ============================================================
   public/services/experts-service.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const ExpertsService = {
    list(params = {}) {
      return EH.PublicCache.get('experts:' + JSON.stringify(params),
        () => EH.PublicAPI.experts(params));
    },
    detail(id) {
      return EH.PublicCache.get('expert:' + id, () => EH.PublicAPI.expertDetail(id));
    },
    filter(experts, query) {
      if (!query) return experts || [];
      const q = query.toLowerCase();
      return (experts || []).filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.specialization || '').toLowerCase().includes(q));
    },
  };

  EH.ExpertsService = ExpertsService;
})(window);
