/* ============================================================
   public/forms/public-validation.js — Public form helpers
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const PublicValidation = {
    attach(form, fields) {
      return EH.Validation.attachInline(form, fields);
    },
    showError(form, name, msg) {
      const el = form.querySelector(`[data-error-for="${name}"]`);
      if (el) el.textContent = msg;
      const input = form.querySelector(`[name="${name}"]`);
      if (input) input.classList.add('form-input-error');
    },
    clearErrors(form) {
      form.querySelectorAll('[data-error-for]').forEach(el => { el.textContent = ''; });
      form.querySelectorAll('.form-input-error').forEach(el => {
        el.classList.remove('form-input-error');
      });
    },
  };

  EH.PublicValidation = PublicValidation;
})(window);
