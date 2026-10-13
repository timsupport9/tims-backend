/* ============================================================
   public/components/styles.js — Inline style helpers for public
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function featureIconBg(color) {
    if (!color) return '';
    const [a, b] = color.split(',');
    return `background:linear-gradient(135deg,${a},${b})`;
  }

  EH.PublicStyles = { featureIconBg };
})(window);
