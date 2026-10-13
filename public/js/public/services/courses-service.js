/* ============================================================
   public/services/courses-service.js — Public courses
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const CoursesService = {
    list(params = {}) {
      return EH.PublicCache.get('courses:' + JSON.stringify(params),
        () => EH.PublicAPI.courses(params));
    },
    detail(id) {
      return EH.PublicCache.get('course:' + id, () => EH.PublicAPI.courseDetail(id));
    },
    filter(courses, { type, level, query } = {}) {
      let out = courses || [];
      if (type && type !== 'all') out = out.filter(c => c.course_type === type);
      if (level && level !== 'all') out = out.filter(c => c.level === level);
      if (query) {
        const q = query.toLowerCase();
        out = out.filter(c =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q));
      }
      return out;
    },
  };

  EH.CoursesService = CoursesService;
})(window);
