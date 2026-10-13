/* ============================================================
   public/services/events-service.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const EventsService = {
    list(params = {}) {
      return EH.PublicCache.get('events:' + JSON.stringify(params),
        () => EH.PublicAPI.events(params));
    },
    detail(id) {
      return EH.PublicCache.get('event:' + id, () => EH.PublicAPI.eventDetail(id));
    },
    filter(events, { category } = {}) {
      if (!category || category === 'all') return events || [];
      return (events || []).filter(e => e.category === category);
    },
  };

  EH.EventsService = EventsService;
})(window);
