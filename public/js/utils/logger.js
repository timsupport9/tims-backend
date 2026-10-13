/* ============================================================
   utils/logger.js — Console logger with levels & context
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const CONFIG = EH.CONFIG || { isDevelopment: () => false };

  const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
  let currentLevel = CONFIG.isDevelopment?.() ? LEVELS.debug : LEVELS.info;

  const buffer = [];
  const MAX_BUFFER = 200;

  function record(level, args) {
    buffer.push({ level, at: Date.now(), args });
    if (buffer.length > MAX_BUFFER) buffer.shift();
  }

  function formatPrefix(level) {
    const ts = new Date().toISOString().slice(11, 23);
    return `[${ts}] [${level.toUpperCase()}]`;
  }

  const Logger = {
    setLevel(name) {
      if (LEVELS[name] !== undefined) currentLevel = LEVELS[name];
    },
    getLevel() { return currentLevel; },

    debug(...args) {
      record('debug', args);
      if (currentLevel <= LEVELS.debug) console.debug(formatPrefix('debug'), ...args);
    },
    info(...args) {
      record('info', args);
      if (currentLevel <= LEVELS.info) console.info(formatPrefix('info'), ...args);
    },
    warn(...args) {
      record('warn', args);
      if (currentLevel <= LEVELS.warn) console.warn(formatPrefix('warn'), ...args);
    },
    error(...args) {
      record('error', args);
      if (currentLevel <= LEVELS.error) console.error(formatPrefix('error'), ...args);
    },

    history() { return buffer.slice(); },
    clear() { buffer.length = 0; },
  };

  EH.Logger = Logger;
})(window);
