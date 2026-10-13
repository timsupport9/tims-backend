/* ============================================================
   public/components/format.js — Shared public-site formatters
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const PublicFormat = {
    price(n) {
      if (!n || n === 0) return 'Free';
      return EH.Fmt.cur(n);
    },
    duration(c) {
      if (!c) return '';
      if (c.duration_weeks) return `${c.duration_weeks} week${c.duration_weeks > 1 ? 's' : ''}`;
      if (c.duration_hours) return `${c.duration_hours} hour${c.duration_hours > 1 ? 's' : ''}`;
      return '';
    },
    courseType(t) {
      return String(t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },
    rating(r) {
      return Number(r || 0).toFixed(1);
    },
    avatar(name, bg = '1e3a8a') {
      return `https://ui-avatars.com/api/?background=${bg}&color=fff&name=${encodeURIComponent(name || 'User')}`;
    },
  };

  EH.PublicFormat = PublicFormat;
})(window);
