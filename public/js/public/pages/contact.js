/* ============================================================
   public/pages/contact.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  async function render() {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <header class="public-page-header">
          <h1>Contact us</h1>
          <p>We'd love to hear from you. Reach out to the ExpertHub team.</p>
        </header>
        <section class="public-content detail-layout">
          <article class="detail-main">
            <form id="contactForm" class="contact-form" novalidate>
              <label class="form-group">
                <span class="form-label">Your name *</span>
                <input name="name" type="text" required class="form-input" />
              </label>
              <label class="form-group">
                <span class="form-label">Email *</span>
                <input name="email" type="email" required class="form-input" />
              </label>
              <label class="form-group">
                <span class="form-label">Subject</span>
                <input name="subject" type="text" class="form-input" />
              </label>
              <label class="form-group">
                <span class="form-label">Message *</span>
                <textarea name="message" rows="5" required class="form-textarea"></textarea>
              </label>
              <button type="submit" class="btn btn-primary" id="contactSubmit">
                <i class="fas fa-paper-plane"></i> Send message</button>
            </form>
          </article>
          <aside class="detail-sidebar">
            <div class="panel">
              <h3>Get in touch</h3>
              <p><i class="fas fa-envelope"></i> ${EH.PublicConfig.brand.supportEmail}</p>
              <p><i class="fas fa-phone"></i> ${EH.PublicConfig.brand.phone}</p>
              <p><i class="fas fa-clock"></i> Mon-Fri, 9am-5pm EAT</p>
            </div>
          </aside>
        </section>
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);
    EH.ContactForm.attach(root);
  }

  EH.ContactPage = { render };
})(window);
