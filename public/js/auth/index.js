/* ============================================================
   auth/index.js — Auth module aggregator
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  EH.AuthModule = {
    login:    () => EH.LoginView?.render?.(),
    register: () => EH.RegisterView?.render?.(),
    forgot:   () => EH.ForgotView?.render?.(),
    reset:    (token) => EH.ResetView?.render?.(token),
    setup:    (email, token) => EH.SetupView?.render?.(email, token),
    verify:   (serial) => EH.VerifyView?.render?.(serial),
    guard:    (role) => EH.RouteGuards?.check?.(role),
  };
})(window);
