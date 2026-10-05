/* ============================================================
   ExpertHub — js/public/components/bind.js
   Global click delegation for the entire public front door.

   One listener on `document` handles:
     • [data-goto="#/..."]   — navigation
     • [data-action="..."]   — specific behaviours
       (faq, chip, search-all, resource-open, scroll-to,
        course-filter, retry, nav-toggle)
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
      catch (_) {}
    } else {
      location.hash = hash;
    }
  };

  /* Kept for backward compat — global delegation covers everything. */
  P.bindGoto = function () { /* no-op */ };

  /* ---- mobile drawer toggle ---- */
  function toggleDrawer(open) {
    var drawer = document.getElementById('pubNavDrawer');
    var toggle = document.querySelector('[data-action="nav-toggle"]');
    if (!drawer) return;
    var next = (typeof open === 'boolean') ? open : drawer.getAttribute('data-open') !== 'true';
    drawer.setAttribute('data-open', next ? 'true' : 'false');
    if (toggle) {
      toggle.setAttribute('aria-expanded', next ? 'true' : 'false');
      toggle.innerHTML = next
        ? '<i class="fas fa-xmark"></i>'
        : '<i class="fas fa-bars"></i>';
    }
  }

  /* Close the drawer automatically whenever a link inside it is clicked. */
  function closeDrawerOnNavigate() {
    var drawer = document.getElementById('pubNavDrawer');
    if (drawer && drawer.getAttribute('data-open') === 'true') toggleDrawer(false);
  }

  function installGlobalHandlers() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;

      /* ---------- 1. [data-action] ---------- */
      var actionEl = t.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.getAttribute('data-action');

        switch (action) {
          case 'goto':
            e.preventDefault();
            closeDrawerOnNavigate();
            P.go(actionEl.getAttribute('data-href') ||
                 actionEl.getAttribute('data-goto'));
            return;

          case 'nav-toggle':
            e.preventDefault();
            toggleDrawer();
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
        closeDrawerOnNavigate();
        P.go(gotoEl.getAttribute('data-goto'));
        return;
      }

      /* ---------- 3. Click anywhere else — close search + drawer ---------- */
      if (!t.closest('.pub-search')) {
        if (P.components && P.components.searchClose) P.components.searchClose();
      }
      if (!t.closest('.pub-nav')) {
        toggleDrawer(false);
      }
    });

    /* Escape closes the search dropdown AND the mobile drawer. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (P.components && P.components.searchClose) P.components.searchClose();
        toggleDrawer(false);
      }
    });

    /* Close the drawer when the viewport crosses the desktop breakpoint. */
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (window.innerWidth > 900) toggleDrawer(false);
      }, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGlobalHandlers);
  } else {
    installGlobalHandlers();
  }
})();