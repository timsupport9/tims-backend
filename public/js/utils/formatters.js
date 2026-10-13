/* ============================================================
   utils/formatters.js — Currency, numbers, strings
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const CONFIG = EH.CONFIG || {};

  function fmtCur(n, cur = CONFIG.CURRENCY || 'USD') {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: cur, maximumFractionDigits: 2,
      }).format(Number(n) || 0);
    } catch (_) {
      return `${CONFIG.CURRENCY_SYMBOL || '$'}${(Number(n) || 0).toFixed(2)}`;
    }
  }

  function fmtNum(n, decimals = 0) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    }).format(Number(n) || 0);
  }

  function fmtPct(n, decimals = 0) {
    return `${(Number(n) || 0).toFixed(decimals)}%`;
  }

  function fmtCompact(n) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1,
    }).format(Number(n) || 0);
  }

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  function slug(s) {
    return String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function titleCase(s) {
    return String(s || '').replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
  }

  function truncate(s, n = 100, suffix = '...') {
    const str = String(s || '');
    return str.length <= n ? str : str.slice(0, n - suffix.length) + suffix;
  }

  function initials(name) {
    return String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || '?';
  }

  function fmtBytes(b) {
    if (!b || b < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let v = Number(b);
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function pluralize(n, singular, plural) {
    return Number(n) === 1 ? singular : (plural || singular + 's');
  }

  function hexToRgba(hex, alpha = 1) {
    const h = String(hex || '#1e3a8a').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function uid(len = 8) {
    return Math.random().toString(36).slice(2, 2 + len);
  }

  function statusClass(s) {
    return `status status-${String(s || 'unknown').toLowerCase().replace(/\s+/g, '_')}`;
  }

  EH.Fmt = {
    cur: fmtCur, num: fmtNum, pct: fmtPct, compact: fmtCompact,
    esc, slug, titleCase, truncate, initials,
    bytes: fmtBytes, pluralize, hexToRgba, uid, statusClass,
  };

  // Also attach some globally for legacy code
  global.esc = esc;
  global.uid = uid;
  global.hexToRgba = hexToRgba;
  global.fmtCur = fmtCur;
  global.statusClass = statusClass;
  global.formatBytes = fmtBytes;
  global.downloadCsv = function (filename, rows) {
    if (!rows || !rows.length) {
      EH.Toast?.show?.('Nothing to export', 'warning');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')].concat(
      rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
})(window);
