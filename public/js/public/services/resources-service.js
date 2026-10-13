/* ============================================================
   public/services/resources-service.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const ResourcesService = {
    list(params = {}) {
      return EH.PublicCache.get('resources:' + JSON.stringify(params),
        () => EH.PublicAPI.resources(params));
    },
    filter(resources, { category } = {}) {
      if (!category || category === 'all') return resources || [];
      return (resources || []).filter(r => r.category === category);
    },
  };

  EH.ResourcesService = ResourcesService;
})(window);
