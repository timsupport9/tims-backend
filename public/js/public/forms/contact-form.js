/* ============================================================
   public/forms/contact-form.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const ContactForm = {
    attach(root) {
      const form = root?.querySelector('#contactForm');
      if (!form) return;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = form.querySelector('#contactSubmit');
        const data = EH.DOM.serializeForm(form);
        if (!data.name || !data.email || !data.message) {
          return EH.Toast.error('Please fill required fields');
        }
        if (!EH.Validation.isEmail(data.email)) return EH.Toast.error('Enter a valid email');
        try {
          EH.Loading.button(btn, true);
          const res = await EH.PublicAPI.contact(data);
          if (res.ok === false) throw new Error(res.error || 'Failed');
          EH.Toast.success('Message sent. We\'ll respond shortly.');
          form.reset();
        } catch (ex) {
          EH.Toast.error(ex.message || 'Send failed');
        } finally {
          EH.Loading.button(btn, false);
        }
      };
    },
  };

  EH.ContactForm = ContactForm;
})(window);
