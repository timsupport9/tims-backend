/* ============================================================
   core/event-bus.js — Pub/sub event bus for app-wide events
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  class EventBus {
    constructor() {
      this._channels = new Map();
      this._onceWrappers = new WeakMap();
    }

    on(event, handler, context = null) {
      if (typeof handler !== 'function') return () => {};
      if (!this._channels.has(event)) this._channels.set(event, new Set());
      const wrapped = context ? handler.bind(context) : handler;
      this._channels.get(event).add(wrapped);
      return () => this.off(event, wrapped);
    }

    once(event, handler, context = null) {
      const self = this;
      const wrapper = function (...args) {
        self.off(event, wrapper);
        handler.apply(context || null, args);
      };
      return this.on(event, wrapper);
    }

    off(event, handler) {
      const set = this._channels.get(event);
      if (!set) return;
      set.delete(handler);
      if (!set.size) this._channels.delete(event);
    }

    emit(event, payload) {
      const set = this._channels.get(event);
      if (!set) return;
      const snapshot = Array.from(set);
      for (const fn of snapshot) {
        try {
          fn(payload, event);
        } catch (err) {
          EH.Logger?.error?.('EventBus handler failed', { event, err: err.message });
        }
      }
    }

    clear(event) {
      if (event) this._channels.delete(event);
      else this._channels.clear();
    }

    listeners(event) {
      return this._channels.has(event) ? this._channels.get(event).size : 0;
    }
  }

  EH.bus = new EventBus();
  EH.EventBus = EventBus;
})(window);
