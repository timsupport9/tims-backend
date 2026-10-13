/* ============================================================
   public/seo/structured-data.js — JSON-LD schema injection
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function inject(schema) {
    const id = 'structured-data-' + (schema['@type'] || 'default').toLowerCase();
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.id = id;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
  }

  function organization() {
    inject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'ExpertHub',
      url: location.origin,
      logo: location.origin + '/assets/img/logo.svg',
      description: EH.PublicConfig.brand.description,
      contactPoint: {
        '@type': 'ContactPoint',
        email: EH.PublicConfig.brand.supportEmail,
        contactType: 'Customer Support',
      },
    });
  }

  function course(course) {
    inject({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description: course.description,
      provider: { '@type': 'Organization', name: 'ExpertHub' },
      offers: {
        '@type': 'Offer',
        price: course.price || 0,
        priceCurrency: 'USD',
      },
    });
  }

  function event(ev) {
    inject({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: ev.title,
      description: ev.description,
      startDate: ev.date,
      location: { '@type': 'Place', name: 'Online' },
    });
  }

  EH.StructuredData = { inject, organization, course, event };
})(window);
