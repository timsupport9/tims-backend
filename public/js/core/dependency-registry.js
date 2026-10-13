/* ============================================================
   core/dependency-registry.js — Named DI container (minimal)
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const registry = new Map();

  const Registry = {
    register(name, value) {
      if (registry.has(name) && EH.Logger) {
        EH.Logger.warn(`Dependency "${name}" overwritten`);
      }
      registry.set(name, value);
      return value;
    },

    resolve(name) {
      if (!registry.has(name)) throw new Error(`Dependency "${name}" not registered`);
      return registry.get(name);
    },

    tryResolve(name, defaultValue = null) {
      return registry.has(name) ? registry.get(name) : defaultValue;
    },

    has(name) {
      return registry.has(name);
    },

    names() {
      return Array.from(registry.keys());
    },

    unregister(name) {
      registry.delete(name);
    },
  };

  EH.DI = Registry;
})(window);
