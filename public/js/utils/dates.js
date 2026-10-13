/* ============================================================
   utils/dates.js — Date manipulation & formatting
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const MS = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };

  function parse(d) {
    if (!d) return null;
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
    const x = new Date(d);
    return isNaN(x.getTime()) ? null : x;
  }

  function fmtDate(d) {
    const x = parse(d);
    if (!x) return '—';
    return x.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function fmtDateTime(d) {
    const x = parse(d);
    if (!x) return '—';
    return x.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function fmtTime(d) {
    const x = parse(d);
    if (!x) return '—';
    return x.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function fmtLong(d) {
    const x = parse(d);
    if (!x) return '—';
    return x.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function timeAgo(d) {
    const x = parse(d);
    if (!x) return '';
    const s = (Date.now() - x.getTime()) / 1000;
    if (s < 5)       return 'just now';
    if (s < 60)      return `${Math.floor(s)}s ago`;
    if (s < 3600)    return `${Math.floor(s / 60)}m ago`;
    if (s < 86400)   return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800)  return `${Math.floor(s / 86400)}d ago`;
    if (s < 2592000) return `${Math.floor(s / 604800)}w ago`;
    return fmtDate(d);
  }

  function fromNow(d, unit = 'days') {
    const x = parse(d);
    if (!x) return '';
    const diff = x.getTime() - Date.now();
    const u = MS[unit[0]] || MS.d;
    const n = Math.round(diff / u);
    if (n === 0) return 'today';
    if (n === 1) return `in 1 ${unit.replace(/s$/, '')}`;
    if (n === -1) return `1 ${unit.replace(/s$/, '')} ago`;
    if (n > 0) return `in ${n} ${unit}`;
    return `${Math.abs(n)} ${unit} ago`;
  }

  function daysBetween(a, b) {
    const x = parse(a), y = parse(b);
    if (!x || !y) return 0;
    return Math.round((y - x) / MS.d);
  }

  function startOfDay(d = new Date()) {
    const x = parse(d) || new Date();
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function endOfDay(d = new Date()) {
    const x = parse(d) || new Date();
    x.setHours(23, 59, 59, 999);
    return x;
  }

  function addDays(d, n) {
    const x = parse(d) || new Date();
    const y = new Date(x);
    y.setDate(y.getDate() + n);
    return y;
  }

  function addMonths(d, n) {
    const x = parse(d) || new Date();
    const y = new Date(x);
    y.setMonth(y.getMonth() + n);
    return y;
  }

  function isoDate(d) {
    const x = parse(d);
    if (!x) return '';
    return x.toISOString().slice(0, 10);
  }

  function isoLocalDateTime(d) {
    const x = parse(d);
    if (!x) return '';
    const off = x.getTimezoneOffset();
    return new Date(x.getTime() - off * 60000).toISOString().slice(0, 16);
  }

  function isToday(d) {
    const x = parse(d);
    if (!x) return false;
    const now = new Date();
    return x.getFullYear() === now.getFullYear()
        && x.getMonth() === now.getMonth()
        && x.getDate() === now.getDate();
  }

  function isPast(d) {
    const x = parse(d);
    return x ? x.getTime() < Date.now() : false;
  }

  function isFuture(d) {
    const x = parse(d);
    return x ? x.getTime() > Date.now() : false;
  }

  EH.Dates = {
    MS, parse, fmtDate, fmtDateTime, fmtTime, fmtLong,
    timeAgo, fromNow, daysBetween, startOfDay, endOfDay,
    addDays, addMonths, isoDate, isoLocalDateTime,
    isToday, isPast, isFuture,
  };
})(window);
