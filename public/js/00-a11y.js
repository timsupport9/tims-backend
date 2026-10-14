/* ============================================================
   ExpertHub 2.0 — 00-a11y.js
   WCAG 2.1 AA hardening: skip link, focus trap, aria-live,
   reduced motion, keyboard tab nav, dialog labelling.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHA11y = window.EHA11y || {};

  /* ---------- skip link ---------- */
  function mountSkipLink() {
    if (document.getElementById('eh-skip')) return;
    const a = document.createElement('a');
    a.id = 'eh-skip';
    a.className = 'eh-skip';
    a.href = '#app-root';
    a.textContent = 'Skip to main content';
    a.addEventListener('click', e => {
      e.preventDefault();
      const main = document.querySelector('#app-root, main, [role="main"]');
      if (!main) return;
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
      main.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
    document.body.prepend(a);
  }

  /* ---------- reduced motion ---------- */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function applyMotionClass() {
    document.documentElement.classList.toggle('eh-reduce-motion', prefersReducedMotion());
  }

  /* ---------- aria-live for toasts ---------- */
  function mountLiveRegion() {
    let region = document.getElementById('eh-live-region');
    if (region) return;
    region = document.createElement('div');
    region.id = 'eh-live-region';
    region.className = 'eh-sr-only';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
  }

  function announce(msg, level) {
    const region = document.getElementById('eh-live-region');
    if (!region) return;
    region.setAttribute('aria-live', level === 'error' ? 'assertive' : 'polite');
    region.textContent = '';
    // Force a DOM reflow so repeated identical messages announce again
    void region.offsetHeight;
    region.textContent = String(msg || '');
  }

  /* ---------- focus trap for modals ---------- */
  const FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]'
  ].join(',');

  function trapFocus(container) {
    if (!container) return () => {};
    const previouslyFocused = document.activeElement;

    function focusables() {
      return Array.from(container.querySelectorAll(FOCUSABLE))
        .filter(el => el.offsetParent !== null || el === document.activeElement);
    }

    function onKey(e) {
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) { e.preventDefault(); return; }
      const first = list[0];
      const last = list[list.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKey);

    // Focus first focusable element
    const initial = focusables()[0];
    if (initial) setTimeout(() => initial.focus(), 20);

    return () => {
      container.removeEventListener('keydown', onKey);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
  }

  /* ---------- auto-trap focus inside #modal-root dialogs ---------- */
  function watchModals() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;
    let activeRelease = null;

    const mo = new MutationObserver(() => {
      const dialog = modalRoot.querySelector('[role="dialog"], .modal, .modal-content');
      if (dialog && !activeRelease) {
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
          const title = dialog.querySelector('.modal-title, h1, h2, h3');
          if (title) {
            if (!title.id) title.id = 'eh-modal-title-' + Math.random().toString(36).slice(2, 8);
            dialog.setAttribute('aria-labelledby', title.id);
          } else {
            dialog.setAttribute('aria-label', 'Dialog');
          }
        }
        activeRelease = trapFocus(dialog);
      } else if (!dialog && activeRelease) {
        activeRelease();
        activeRelease = null;
      }
    });
    mo.observe(modalRoot, { childList: true, subtree: true });
  }

  /* ---------- keyboard nav for tabs ---------- */
  function enhanceTabBars() {
    document.querySelectorAll('.tab-bar, .tabs-course-player, [role="tablist"]').forEach(bar => {
      if (bar.dataset.ehA11yBound) return;
      bar.dataset.ehA11yBound = '1';
      bar.setAttribute('role', 'tablist');
      bar.querySelectorAll('.tab-btn, [data-eschool-tab], [data-player-tab]').forEach(btn => {
        btn.setAttribute('role', 'tab');
        btn.setAttribute('tabindex', btn.classList.contains('tab-btn-active') ? '0' : '-1');
      });
      bar.addEventListener('keydown', e => {
        const btns = Array.from(bar.querySelectorAll('[role="tab"]'));
        const idx = btns.indexOf(document.activeElement);
        if (idx < 0) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = btns[(idx + 1) % btns.length];
          next.focus(); next.click();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = btns[(idx - 1 + btns.length) % btns.length];
          prev.focus(); prev.click();
        } else if (e.key === 'Home') {
          e.preventDefault(); btns[0].focus(); btns[0].click();
        } else if (e.key === 'End') {
          e.preventDefault();
          btns[btns.length - 1].focus();
          btns[btns.length - 1].click();
        }
      });
    });
  }

  /* ---------- alt text for avatars ---------- */
  function fixAvatarAlts() {
    document.querySelectorAll('img.user-avatar, img.expert-avatar, img.profile-avatar').forEach(img => {
      if (!img.hasAttribute('alt') || img.getAttribute('alt') === '') {
        const name = img.dataset.name || img.closest('.user-name')?.textContent?.trim() || 'Avatar';
        img.alt = name;
      }
    });
  }

  /* ---------- announce toasts via live region ---------- */
  function patchToast() {
    if (typeof window.showToast !== 'function' || window.__ehToastPatched) return;
    window.__ehToastPatched = true;
    const orig = window.showToast;
    window.showToast = function (msg, type) {
      announce(msg, type);
      return orig.apply(this, arguments);
    };
  }

  /* ---------- periodic re-scan for dynamic content ---------- */
  function scheduleRescan() {
    const rescan = () => { enhanceTabBars(); fixAvatarAlts(); };
    const mo = new MutationObserver(() => {
      clearTimeout(scheduleRescan._t);
      scheduleRescan._t = setTimeout(rescan, 250);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- init ---------- */
  function init() {
    mountSkipLink();
    applyMotionClass();
    mountLiveRegion();
    watchModals();
    enhanceTabBars();
    fixAvatarAlts();
    patchToast();
    scheduleRescan();

    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener?.('change', applyMotionClass);

    // Esc closes modals if the app supports it
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && typeof window.closeModal === 'function') {
        const open = document.querySelector('#modal-root [role="dialog"]');
        if (open) window.closeModal();
      }
    });
  }

  NS.announce = announce;
  NS.trapFocus = trapFocus;
  NS.reduceMotion = prefersReducedMotion;
  NS.rescan = () => { enhanceTabBars(); fixAvatarAlts(); };
  NS.init = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }