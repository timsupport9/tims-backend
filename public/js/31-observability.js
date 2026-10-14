/* ============================================================
   ExpertHub 2.0 — 31-observability.js
   Error tracking (Sentry if configured, else local ring buffer)
   and Core Web Vitals (LCP, CLS, INP, TTFB, FCP).
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHObs = window.EHObs = window.EHObs || {};

  const CONFIG = {
    sentryDsn: window.EH_SENTRY_DSN || '', // set before this script loads
    sampleRate: 1.0,
    debug: false,
    maxLocalErrors: 50,
  };

  const errors = [];

  /* ---------- local error store ---------- */
  function recordError(err) {
    const entry = {
      id: 'err-' + Date.now().toString(36),
      at: new Date().toISOString(),
      message: String(err?.message || err),
      stack: err?.stack || '',
      filename: err?.filename || location.href,
      lineno: err?.lineno || 0,
      colno: err?.colno || 0,
      user: { id: window.currentUser?.id || null, role: window.currentUserRole || null },
      ua: navigator.userAgent,
      url: location.href,
    };
    errors.push(entry);
    if (errors.length > CONFIG.maxLocalErrors) errors.shift();
    if (CONFIG.debug) console.warn('[obs]', entry);
    return entry;
  }

  /* ---------- Sentry (optional, loaded lazily if DSN is set) ---------- */
  async function initSentry() {
    if (!CONFIG.sentryDsn) return;
    // Minimal Sentry loader — pull the bundle lazily, only when we have a DSN.
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://browser.sentry-cdn.com/7.100.0/bundle.tracing.min.js';
      s.crossOrigin = 'anonymous';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    if (window.Sentry?.init) {
      window.Sentry.init({
        dsn: CONFIG.sentryDsn,
        tracesSampleRate: CONFIG.sampleRate,
        environment: location.hostname === 'localhost' ? 'development' : 'production',
        release: 'experthub-2.0',
        beforeSend(event) {
          // Redact sensitive fields
          try {
            const req = event.request || {};
            delete req.cookies;
            delete req.headers?.Authorization;
          } catch (_) {}
          return event;
        },
      });
    }
  }

  /* ---------- global handlers ---------- */
  window.addEventListener('error', e => {
    const entry = recordError(e.error || e);
    window.Sentry?.captureException?.(e.error || new Error(e.message));
    window.EHNotifications?.push?.({
      kind: 'system',
      title: 'Something went wrong',
      body: 'The issue has been logged. We\'re on it.',
      toast: false,
    });
  });

  window.addEventListener('unhandledrejection', e => {
    const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
    recordError(err);
    window.Sentry?.captureException?.(err);
  });

  /* ---------- API error wrapper ---------- */
  function wrapApiCall() {
    if (typeof window.apiCall !== 'function' || window.apiCall.__obsWrapped) return;
    const orig = window.apiCall;
    window.apiCall = async function (...args) {
      const start = performance.now();
      try {
        const result = await orig.apply(this, args);
        return result;
      } catch (err) {
        const url = args[0];
        recordError(Object.assign(err, {
          message: `API ${url}: ${err.message}`,
        }));
        window.Sentry?.captureException?.(err, { extra: { url } });
        throw err;
      } finally {
        const ms = performance.now() - start;
        if (ms > 3000) {
          console.warn(`[obs] slow API call ${args[0]} took ${Math.round(ms)}ms`);
          window.Sentry?.addBreadcrumb?.({
            category: 'api',
            level: 'warning',
            message: `Slow: ${args[0]}`,
            data: { duration_ms: Math.round(ms) },
          });
        }
      }
    };
    window.apiCall.__obsWrapped = true;
  }

  /* ---------- Web Vitals ---------- */
  const vitals = {
    lcp: null, cls: 0, inp: null, ttfb: null, fcp: null,
  };

  function reportVital(name, value) {
    vitals[name] = value;
    if (CONFIG.debug) console.info(`[vitals] ${name}`, value);
    // Send to Sentry as measurements
    if (window.Sentry?.setMeasurement) {
      window.Sentry.setMeasurement(name, value, 'millisecond');
    }
    // Custom event for any analytics listener
    document.dispatchEvent(new CustomEvent('eh:vitals', {
      detail: { name, value, at: Date.now() },
    }));
  }

  function observeLCP() {
    try {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) reportVital('lcp', Math.round(last.startTime));
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}
  }

  function observeCLS() {
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            vitals.cls += entry.value;
            reportVital('cls', Math.round(vitals.cls * 1000) / 1000);
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
  }

  function observeINP() {
    try {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        let max = 0;
        entries.forEach(e => { if (e.duration > max) max = e.duration; });
        if (max) reportVital('inp', Math.round(max));
      }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch (_) {}
  }

  function observePaint() {
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            reportVital('fcp', Math.round(entry.startTime));
          }
        }
      }).observe({ type: 'paint', buffered: true });
    } catch (_) {}
  }

  function readNavigationTiming() {
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) reportVital('ttfb', Math.round(nav.responseStart - nav.requestStart));
    } catch (_) {}
  }

  /* ---------- manual transaction API ---------- */
  function startTransaction(name) {
    const start = performance.now();
    const txn = {
      finish() {
        const ms = performance.now() - start;
        document.dispatchEvent(new CustomEvent('eh:transaction', {
          detail: { name, durationMs: Math.round(ms), at: Date.now() },
        }));
        if (window.Sentry?.addBreadcrumb) {
          window.Sentry.addBreadcrumb({
            category: 'transaction', level: 'info', message: name,
            data: { duration_ms: Math.round(ms) },
          });
        }
        return ms;
      },
    };
    return txn;
  }

  /* ---------- health endpoint ---------- */
  NS.snapshot = function () {
    return {
      vitals: { ...vitals },
      errorCount: errors.length,
      lastErrors: errors.slice(-5),
      online: navigator.onLine,
      uptimeMs: Math.round(performance.now()),
      url: location.href,
      timestamp: new Date().toISOString(),
    };
  };

  NS.errors = () => errors.slice();
  NS.clear = () => { errors.length = 0; };
  NS.startTransaction = startTransaction;

  /* ---------- init ---------- */
  async function init() {
    wrapApiCall();
    try { await initSentry(); } catch (_) {}
    observeLCP();
    observeCLS();
    observeINP();
    observePaint();
    readNavigationTiming();

    // Log a snapshot 5 seconds after load
    setTimeout(() => {
      if (CONFIG.debug) console.info('[obs] snapshot', NS.snapshot());
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }