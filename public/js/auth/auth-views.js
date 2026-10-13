/* ============================================================
   auth/auth-views.js — Auth view dispatcher
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const Views = {
    login:    () => EH.LoginView?.render(),
    register: () => EH.RegisterView?.render(),
    forgot:   () => EH.ForgotView?.render(),
    reset:    (token) => EH.ResetView?.render(token),
    setup:    (email, token) => EH.SetupView?.render(email, token),
    verify:   (serial) => EH.VerifyView?.render(serial),
  };

  EH.AuthViews = Views;
})(window);
