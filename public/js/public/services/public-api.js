/* ============================================================
   public/services/public-api.js — Public unauthenticated API calls
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const PublicAPI = {
    async courses(params = {}) {
      try {
        return await EH.API.get('/api/public/courses?' + new URLSearchParams(params));
      } catch (_) {
        return { courses: EH.FallbackContent.courses };
      }
    },
    async experts(params = {}) {
      try {
        return await EH.API.get('/api/public/experts?' + new URLSearchParams(params));
      } catch (_) {
        return { experts: EH.FallbackContent.experts };
      }
    },
    async events(params = {}) {
      try {
        return await EH.API.get('/api/public/events?' + new URLSearchParams(params));
      } catch (_) {
        return { events: EH.FallbackContent.events };
      }
    },
    async resources(params = {}) {
      try {
        return await EH.API.get('/api/public/resources?' + new URLSearchParams(params));
      } catch (_) {
        return { resources: EH.FallbackContent.resources };
      }
    },
    async institutions(params = {}) {
      try {
        return await EH.API.get('/api/public/institutions?' + new URLSearchParams(params));
      } catch (_) {
        return { institutions: [] };
      }
    },
    async search(query, type = 'all') {
      try {
        return await EH.API.get('/api/public/search?' + new URLSearchParams({ q: query, type }));
      } catch (_) {
        return { results: [] };
      }
    },
    async contact(payload) {
      try {
        return await EH.API.post('/api/public/contact', payload);
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    async newsletter(email) {
      try {
        return await EH.API.post('/api/public/newsletter', { email });
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    async courseDetail(id) {
      try { return await EH.API.get(`/api/public/courses/${id}`); }
      catch (_) { return null; }
    },
    async expertDetail(id) {
      try { return await EH.API.get(`/api/public/experts/${id}`); }
      catch (_) { return null; }
    },
    async eventDetail(id) {
      try { return await EH.API.get(`/api/public/events/${id}`); }
      catch (_) { return null; }
    },
  };

  EH.PublicAPI = PublicAPI;
})(window);
