/* ============================================================
   utils/performance.js — Timing helpers, debounce, throttle
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function debounce(fn, ms = 300) {
    let t;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function throttle(fn, ms = 200) {
    let last = 0, timer = null, lastArgs;
    return function throttled(...args) {
      const now = Date.now();
      const wait = ms - (now - last);
      lastArgs = args;
      if (wait <= 0) {
        if (timer) { clearTimeout(timer); timer = null; }
        last = now;
        fn.apply(this, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = null;
          fn.apply(this, lastArgs);
        }, wait);
      }
    };
  }

  function rafThrottle(fn) {
    let scheduled = false, lastArgs;
    return function throttled(...args) {
      lastArgs = args;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        fn.apply(this, lastArgs);
      });
    };
  }

  function once(fn) {
    let called = false, result;
    return function (...args) {
      if (!called) {
        called = true;
        result = fn.apply(this, args);
      }
      return result;
    };
  }

  function memoize(fn, resolver) {
    const cache = new Map();
    return function memoized(...args) {
      const key = resolver ? resolver.apply(this, args) : JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const v = fn.apply(this, args);
      cache.set(key, v);
      return v;
    };
  }

  function now() {
    return (global.performance && performance.now) ? performance.now() : Date.now();
  }

  function mark(label) {
    if (global.performance?.mark) performance.mark(label);
  }

  function measure(label, startLabel, endLabel) {
    if (!global.performance?.measure) return null;
    try { return performance.measure(label, startLabel, endLabel).duration; }
    catch (_) { return null; }
  }

  async function timed(label, fn) {
    const t0 = now();
    try { return await fn(); }
    finally {
      const dur = now() - t0;
      EH.Logger?.debug?.(`[timed] ${label}: ${dur.toFixed(1)}ms`);
    }
  }

  EH.Perf = { debounce, throttle, rafThrottle, once, memoize, now, mark, measure, timed };
  global.debounce = debounce;
})(window);
