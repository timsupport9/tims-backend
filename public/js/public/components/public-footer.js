/* ============================================================
   public/components/public-footer.js — Marketing site footer
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    const groups = EH.PublicNav?.footer || {};
    const year = new Date().getFullYear();
    return `
      <footer class="landing-footer">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="landing-brand">
              <div class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></div>
              <span>ExpertHub</span>
            </div>
            <p class="footer-tagline">
              ${EH.Fmt.esc(EH.PublicConfig.brand.description)}
            </p>
            <div class="footer-social">
              <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
              <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin"></i></a>
              <a href="#" aria-label="Facebook"><i class="fab fa-facebook"></i></a>
              <a href="#" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
            </div>
          </div>

          ${Object.keys(groups).map(section => `
            <div class="footer-section">
              <h4>${EH.Fmt.esc(section)}</h4>
              <ul>
                ${groups[section].map(l => `
                  <li><a href="${l.href}">${EH.Fmt.esc(l.label)}</a></li>
                `).join('')}
              </ul>
            </div>
          `).join('')}

          <div class="footer-section footer-newsletter">
            <h4>Newsletter</h4>
            <p>Get product updates and learning tips.</p>
            <form id="footerNewsletterForm" class="footer-newsletter-form">
              <input type="email" name="email" class="form-input" placeholder="you@example.com" required />
              <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i></button>
            </form>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© ${year} ExpertHub. All rights reserved.</span>
          <span>E-School · Consultations · Corporate Training</span>
        </div>
      </footer>`;
  }

  function attach(root) {
    if (!root) return;
    const form = root.querySelector('#footerNewsletterForm');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const email = form.querySelector('input[name="email"]').value.trim();
        if (!EH.Validation.isEmail(email)) return EH.Toast.error('Enter a valid email');
        try {
          await EH.PublicAPI.newsletter(email);
          EH.Toast.success('Subscribed!');
          form.reset();
        } catch (_) {
          EH.Toast.error('Subscription failed');
        }
      };
    }
  }

  EH.PublicFooter = { render, attach };
})(window);
