/* ============================================================
   services/analytics-service.js — Event analytics & tracking
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { API, CONFIG, Logger } = EH;

  const queue = [];
  const FLUSH_INTERVAL = 10000;
  let flushTimer = null;

  function enqueue(event, props = {}) {
    queue.push({
      event,
      props,
      url: location.hash,
      ts: Date.now(),
      uid: EH.state?.currentUser?.id || null,
    });
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => { flush(); flushTimer = null; }, FLUSH_INTERVAL);
  }

  async function flush() {
    if (!queue.length) return;
    const batch = queue.splice(0, queue.length);
    try {
      await API.post('/api/analytics/events', { events: batch });
    } catch (err) {
      Logger?.warn?.('Analytics flush failed', err.message);
    }
  }

  const Analytics = {
    track(event, props) { enqueue(event, props); },
    page(hash)          { enqueue('page_view', { hash }); },
    flush,
    _queue() { return queue.slice(); },
  };

  global.addEventListener('beforeunload', () => { try { flush(); } catch (_) {} });
  global.addEventListener('hashchange', () => {
    if (CONFIG.FEATURE_FLAGS?.ANALYTICS) Analytics.page(location.hash);
  });

  EH.Analytics = Analytics;
  global.track = (event, props) => Analytics.track(event, props);
})(window);
