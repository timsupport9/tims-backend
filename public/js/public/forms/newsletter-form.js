/* ============================================================
   public/forms/newsletter-form.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const NewsletterForm = {
    attach(root) {
      if (!root) return;
      root.querySelectorAll('form[data-newsletter]').forEach(form => {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const email = form.querySelector('input[type="email"]').value.trim();
          if (!EH.Validation.isEmail(email)) return EH.Toast.error('Enter a valid email');
          try {
            await EH.PublicAPI.newsletter(email);
            EH.Toast.success('Subscribed!');
            form.reset();
          } catch (_) {
            EH.Toast.error('Subscription failed');
          }
        };
      });
    },
  };

  EH.NewsletterForm = NewsletterForm;
})(window);
