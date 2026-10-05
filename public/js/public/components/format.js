/* ============================================================
   ExpertHub — js/public/components/format.js
   Shared formatting helpers for the public front door.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pick(obj) {
    if (!obj) return undefined;
    for (var i = 1; i < arguments.length; i++) {
      var k = arguments[i];
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return undefined;
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }

  function money(amount, currency) {
    var n = num(amount, 0);
    if (!n) return 'Free';
    var cur = (currency || 'USD').toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency', currency: cur,
        maximumFractionDigits: n % 1 ? 2 : 0
      }).format(n);
    } catch (_) { return cur + ' ' + n.toLocaleString(); }
  }

  function date(iso) {
    if (!iso) return 'Date TBA';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    try { return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (_) { return d.toDateString(); }
  }

  function dateTime(iso) {
    if (!iso) return 'Date TBA';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    try {
      return d.toLocaleString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (_) { return d.toString(); }
  }

  function avatar(name, bg) {
    var safe = encodeURIComponent(name || 'ExpertHub');
    var colour = String(bg || '6366f1').replace('#', '');
    return 'https://ui-avatars.com/api/?background=' + colour +
           '&color=fff&bold=true&name=' + safe;
  }

  function safeImage(url, fallback) {
    if (url && /^(https?:|\/|data:)/i.test(url)) return url;
    return avatar(fallback || 'ExpertHub');
  }

  function stars(rating) {
    var r = Math.round(num(rating, 0));
    var out = '';
    for (var i = 1; i <= 5; i++) out += '<i class="' + (i <= r ? 'fas' : 'far') + ' fa-star"></i>';
    return out;
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function cleanParams(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      if (v !== undefined && v !== null && v !== '' && v !== 'all') out[k] = v;
    });
    return out;
  }

  function listOf(payload, keys) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    var d = payload.data !== undefined ? payload.data : payload;
    if (Array.isArray(d)) return d;
    var cands = ['items', 'results', 'rows', 'records', 'docs'].concat(keys || []);
    for (var i = 0; i < cands.length; i++) {
      if (d && Array.isArray(d[cands[i]])) return d[cands[i]];
    }
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }

  function oneOf(payload, keys) {
    if (!payload) return null;
    var d = payload.data !== undefined ? payload.data : payload;
    if (Array.isArray(d)) return d[0] || null;
    for (var i = 0; i < (keys || []).length; i++) {
      if (d && d[keys[i]]) return d[keys[i]];
    }
    return d && typeof d === 'object' ? d : null;
  }

  function skeletons(n, minH) {
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<div class="pub-skeleton" style="min-height:' + (minH || 220) + 'px"></div>';
    }
    return out;
  }

  function empty(message, actionLabel, actionAttrs) {
    return '<div class="pub-empty">' +
      '<i class="fas fa-inbox"></i>' +
      '<p style="margin:0 0 12px">' + esc(message) + '</p>' +
      (actionLabel
        ? '<button class="btn btn-secondary" ' + (actionAttrs || '') + '>' + esc(actionLabel) + '</button>'
        : '') +
    '</div>';
  }

  P.format = {
    esc: esc, pick: pick, num: num,
    money: money, date: date, dateTime: dateTime,
    avatar: avatar, safeImage: safeImage,
    stars: stars, debounce: debounce,
    cleanParams: cleanParams, listOf: listOf, oneOf: oneOf,
    skeletons: skeletons, empty: empty
  };
})();
