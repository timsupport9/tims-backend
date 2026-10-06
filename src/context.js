/* ============================================================
   Shared mutable singletons — avoids circular requires
   ============================================================ */
module.exports = {
  config: null,
  io: null,
  demo: null,          // populated by lib/demo-store
  dbState: {
    pool: null,
    connected: false,
    connecting: false,
    lastError: null,
    lastAttempt: null,
    lastSuccess: null,
    bootstrapped: false,
  },
  onlineUsers: new Map(),
};
