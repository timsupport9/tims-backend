/* ============================================================
   public/seo/metadata.js — Dynamic meta tags
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function setMeta(name, content, { property = false } = {}) {
    if (!content) return;
    const attr = property ? 'property' : 'name';
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setTitle(title) {
    document.title = title ? `${title} — ExpertHub` : 'ExpertHub — Learn, Consult, Grow';
  }

  function setForPage({ title, description, image, url } = {}) {
    setTitle(title);
    setMeta('description', description || EH.PublicConfig.brand.description);
    setMeta('og:title', title || EH.PublicConfig.brand.name, { property: true });
    setMeta('og:description', description || EH.PublicConfig.brand.description, { property: true });
    setMeta('og:type', 'website', { property: true });
    setMeta('og:url', url || location.href, { property: true });
    if (image) setMeta('og:image', image, { property: true });
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title || EH.PublicConfig.brand.name);
    setMeta('twitter:description', description || EH.PublicConfig.brand.description);
  }

  EH.Metadata = { setMeta, setTitle, setForPage };
})(window);
