/* ============================================================
   public/services/institutions-service.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const InstitutionsService = {
    list(params = {}) {
      return EH.PublicCache.get('institutions:' + JSON.stringify(params),
        () => EH.PublicAPI.institutions(params));
    },
  };

  EH.InstitutionsService = InstitutionsService;
})(window);
