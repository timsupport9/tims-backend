/* ============================================================
   public/interactions/scroll-behavior.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const ScrollBehavior = {
    init() {
      // Smooth scroll for anchor links
      document.querySelectorAll('a[href^="#"]').forEach(a => {
        if (a.getAttribute('href') === '#') return;
        a.addEventListener('click', (e) => {
          const targetId = a.getAttribute('href');
          if (targetId.length > 1 && targetId.startsWith('#')) {
            const target = document.querySelector(targetId);
            if (target) {
              e.preventDefault();
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
      });

      // Reveal on scroll (lightweight)
      if (global.IntersectionObserver) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed');
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        document.querySelectorAll('.reveal, .feature-card, .program-card, .testimonial').forEach(el => {
          observer.observe(el);
        });
      }
    },
  };

  EH.ScrollBehavior = ScrollBehavior;
})(window);
