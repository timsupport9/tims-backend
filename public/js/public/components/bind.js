/* ============================================================
   ExpertHub — js/public/components/bind.js
   Global click delegation for the entire public front door.

   One listener on `document` handles BOTH:
     • [data-goto="#/..."]   — simple navigation
     • [data-action="..."]   — specific behaviours
                               (faq, chip, search-all, resource-open,
                                scroll-to, course-filter, retry, goto)

   Because delegation is at the document level, dynamically injected
   content (search results, async card lists, detail pages) is
   clickable the moment it enters the DOM — no rebinding required.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};

  /* ---- navigation helper ---- */
  P.go = function (hash) {
    if (!hash) return;
    if (String(hash).charAt(0) !== '#') hash = '#' + hash;
    if (location.hash === hash) {
      try { window.dispatchEvent(new HashChangeEvent('hashchange')); }
      catch (_) { /* very old browser — force a manual route() */ }
    } else {
      location.hash = hash;
    }
  };

  /* Kept for backward compat. Previously pages called
     `P.bindGoto(root)` after every innerHTML swap; now the
     global delegation below covers everything, so this is a
     no-op and can be safely left in place. */
  P.bindGoto = function () { /* no-op */ };

  function installGlobalHandlers() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;

      /* ---------- 1. [data-action] — specific behaviours ---------- */
      var actionEl = t.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.getAttribute('data-action');

        switch (action) {
          case 'goto':
            e.preventDefault();
            P.go(actionEl.getAttribute('data-href') ||
                 actionEl.getAttribute('data-goto'));
            return;

          case 'faq':
            e.preventDefault();
            if (actionEl.parentElement) actionEl.parentElement.classList.toggle('open');
            return;

          case 'chip': {
            e.preventDefault();
            var q = actionEl.getAttribute('data-query') || '';
            if (P.components && P.components.searchRun) P.components.searchRun(q);
            return;
          }

          case 'search-all': {
            e.preventDefault();
            var query = actionEl.getAttribute('data-query') || '';
            if (P.components && P.components.searchClose) P.components.searchClose();
            P.go('#/courses?q=' + encodeURIComponent(query));
            return;
          }

          case 'resource-open': {
            e.preventDefault();
            var url = actionEl.getAttribute('data-url');
            if (url && url !== '#') window.open(url, '_blank', 'noopener');
            else P.go('#/resources');
            return;
          }

          case 'scroll-to': {
            e.preventDefault();
            var target = actionEl.getAttribute('data-target');
            var targetEl = target && document.getElementById(target);
            if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }

          case 'course-filter': {
            e.preventDefault();
            var cat = actionEl.getAttribute('data-filter') || 'all';
            var siblings = actionEl.parentElement
              ? actionEl.parentElement.querySelectorAll('.pub-chip') : [];
            Array.prototype.forEach.call(siblings, function (s) { s.classList.remove('is-active'); });
            actionEl.classList.add('is-active');
            /* The courses page exposes `load` — call it if present. */
            if (P.pages && P.pages.courses && P.pages.courses.load) {
              var qInput = document.getElementById('pubCourseQuery');
              P.pages.courses.load({ q: qInput ? qInput.value : '', category: cat });
            }
            return;
          }

          case 'retry': {
            e.preventDefault();
            var section = actionEl.getAttribute('data-section');
            if (P.retry) P.retry(section);
            return;
          }
        }
        /* If the action wasn't recognised, fall through to data-goto. */
      }

      /* ---------- 2. [data-goto] — simple navigation ---------- */
      var gotoEl = t.closest('[data-goto]');
      if (gotoEl) {
        e.preventDefault();
        P.go(gotoEl.getAttribute('data-goto'));
        return;
      }

      /* ---------- 3. Click anywhere else → close search ---------- */
      if (!t.closest('.pub-search')) {
        if (P.components && P.components.searchClose) P.components.searchClose();
      }
    });

    /* Escape closes the search dropdown. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && P.components && P.components.searchClose) {
        P.components.searchClose();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGlobalHandlers);
  } else {
    installGlobalHandlers();
  }
})();