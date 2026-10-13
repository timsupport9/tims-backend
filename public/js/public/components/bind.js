/* ============================================================
   ExpertHub — js/public/components/bind.js
   Global click delegation for the entire public front door.

   Handles [data-goto] navigation and [data-action] behaviours:
     goto · nav-toggle · nav-close · faq · chip · search-all ·
     resource-open · scroll-to · course-filter · retry
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
      catch (_) { /* very old browser — no-op */ }
    } else {
      location.hash = hash;
    }
  };

  /* Backward-compat no-op — delegation covers everything. */
  P.bindGoto = function () { /* no-op */ };

  /* ==========================================================
     Drawer state — one function drives every visual signal
     ========================================================== */
  function setDrawer(open) {
    var nav      = document.querySelector('.pub-nav');
    var drawer   = document.getElementById('pubNavDrawer');
    var backdrop = document.querySelector('.pub-nav-backdrop');
    var toggle   = document.querySelector('[data-action="nav-toggle"]');

    if (!drawer) return;

    var next = !!open;

    drawer.setAttribute('data-open', next ? 'true' : 'false');
    if (nav)      nav.setAttribute('data-drawer', next ? 'open' : 'closed');
    if (backdrop) backdrop.setAttribute('data-open', next ? 'true' : 'false');
    if (toggle)   toggle.setAttribute('aria-expanded', next ? 'true' : 'false');

    /* Lock body scroll while the drawer is open. */
    document.body.classList.toggle('pub-nav-locked', next);
  }

  function toggleDrawer() {
    var drawer = document.getElementById('pubNavDrawer');
    if (!drawer) return;
    setDrawer(drawer.getAttribute('data-open') !== 'true');
  }

  function closeDrawer() { setDrawer(false); }

  /* ==========================================================
     Global handlers
     ========================================================== */
  function installGlobalHandlers() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;

      /* ---------- 1. [data-action] ---------- */
      var actionEl = t.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.getAttribute('data-action');

        switch (action) {
          case 'nav-toggle':
            e.preventDefault();
            toggleDrawer();
            return;

          case 'nav-close':
            e.preventDefault();
            closeDrawer();
            return;

          case 'goto':
            e.preventDefault();
            closeDrawer();
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
        /* Unrecognised action — fall through to data-goto. */
      }

      /* ---------- 2. [data-goto] ---------- */
      var gotoEl = t.closest('[data-goto]');
      if (gotoEl) {
        e.preventDefault();
        closeDrawer();
        P.go(gotoEl.getAttribute('data-goto'));
        return;
      }

      /* ---------- 3. Any other click ---------- */
      if (!t.closest('.pub-search')) {
        if (P.components && P.components.searchClose) P.components.searchClose();
      }
      if (!t.closest('.pub-nav')) {
        closeDrawer();
      }
    });

    /* Escape closes the search dropdown AND the drawer. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (P.components && P.components.searchClose) P.components.searchClose();
        closeDrawer();
      }
    });

    /* Auto-close the drawer if the viewport grows past the breakpoint. */
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (window.innerWidth > 1024) closeDrawer();
      }, 120);
    });

    /* Close the drawer if the user navigates via the browser back/forward. */
    window.addEventListener('hashchange', function () { closeDrawer(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGlobalHandlers);
  } else {
    installGlobalHandlers();
  }
})();