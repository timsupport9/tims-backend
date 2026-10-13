/* ============================================================
   utils/validation.js — Form validation helpers
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const R = EH.REGEX || {};

  const isEmail   = (v) => R.EMAIL?.test(String(v).trim()) ?? false;
  const isPhone   = (v) => R.PHONE?.test(String(v).trim()) ?? false;
  const isUrl     = (v) => R.URL?.test(String(v).trim()) ?? false;
  const isSerial  = (v) => R.SERIAL?.test(String(v).trim()) ?? false;

  const isRequired = (v) => v !== null && v !== undefined && String(v).trim().length > 0;
  const minLength  = (v, n) => String(v || '').length >= n;
  const maxLength  = (v, n) => String(v || '').length <= n;

  function passwordScore(pwd) {
    const v = String(pwd || '');
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return score;
  }

  function passwordLabel(score) {
    return ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] || '';
  }

  function validate(fields = {}) {
    const errors = {};
    Object.keys(fields).forEach(name => {
      const rule = fields[name];
      if (typeof rule === 'function') {
        const r = rule();
        if (r !== true && r !== undefined) errors[name] = r;
      }
    });
    return { valid: Object.keys(errors).length === 0, errors };
  }

  const validators = {
    required: (msg = 'This field is required') => (v) => isRequired(v) ? true : msg,
    email:    (msg = 'Enter a valid email')      => (v) => !v || isEmail(v) ? true : msg,
    phone:    (msg = 'Enter a valid phone')      => (v) => !v || isPhone(v) ? true : msg,
    url:      (msg = 'Enter a valid URL')        => (v) => !v || isUrl(v) ? true : msg,
    min:      (n, msg) => (v) => String(v || '').length >= n ? true : (msg || `At least ${n} characters`),
    max:      (n, msg) => (v) => String(v || '').length <= n ? true : (msg || `At most ${n} characters`),
    matches:  (ref, msg = 'Values do not match') => (v) => v === ref() ? true : msg,
    numeric:  (msg = 'Must be a number') => (v) => v === '' || !isNaN(Number(v)) ? true : msg,
    minValue: (n, msg) => (v) => Number(v) >= n ? true : (msg || `Must be at least ${n}`),
    maxValue: (n, msg) => (v) => Number(v) <= n ? true : (msg || `Must be at most ${n}`),
    oneOf:    (list, msg = 'Invalid option') => (v) => list.includes(v) ? true : msg,
  };

  function attachInline(form, fields) {
    if (!form) return () => {};
    const cleanups = [];
    Object.keys(fields).forEach(name => {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input) return;
      const onInput = () => {
        const rule = fields[name];
        const res = rule(input.value);
        const errEl = form.querySelector(`[data-error-for="${name}"]`);
        if (res === true) {
          input.classList.remove('form-input-error');
          if (errEl) errEl.textContent = '';
        } else {
          input.classList.add('form-input-error');
          if (errEl) errEl.textContent = res;
        }
      };
      input.addEventListener('blur', onInput);
      input.addEventListener('input', onInput);
      cleanups.push(() => {
        input.removeEventListener('blur', onInput);
        input.removeEventListener('input', onInput);
      });
    });
    return () => cleanups.forEach(fn => fn());
  }

  EH.Validation = {
    isEmail, isPhone, isUrl, isSerial, isRequired,
    minLength, maxLength, passwordScore, passwordLabel,
    validate, validators, attachInline,
  };
})(window);
