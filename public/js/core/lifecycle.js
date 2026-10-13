/* ============================================================
   core/lifecycle.js — App lifecycle & before-unload handling
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const hooks = {
    beforeUnload: [],
    unload: [],
    visibilityChange: [],
    online: [],
    offline: [],
  };

  const Lifecycle = {
    onBeforeUnload(fn) { hooks.beforeUnload.push(fn); },
    onUnload(fn) { hooks.unload.push(fn); },
    onVisibilityChange(fn) { hooks.visibilityChange.push(fn); },
    onOnline(fn) { hooks.online.push(fn); },
    onOffline(fn) { hooks.offline.push(fn); },

    runBeforeUnload() { hooks.beforeUnload.forEach(fn => { try { fn(); } catch (_) {} }); },
    runUnload()       { hooks.unload.forEach(fn => { try { fn(); } catch (_) {} }); },
  };

  global.addEventListener('beforeunload', () => Lifecycle.runBeforeUnload());
  global.addEventListener('unload',     () => Lifecycle.runUnload());
  global.addEventListener('online',  () => {
    EH.bus?.emit('network:online');
    hooks.online.forEach(fn => { try { fn(); } catch (_) {} });
  });
  global.addEventListener('offline', () => {
    EH.bus?.emit('network:offline');
    hooks.offline.forEach(fn => { try { fn(); } catch (_) {} });
  });
  document.addEventListener('visibilitychange', () => {
    const hidden = document.hidden;
    hooks.visibilityChange.forEach(fn => { try { fn(hidden); } catch (_) {} });
  });

  EH.Lifecycle = Lifecycle;
})(window);
