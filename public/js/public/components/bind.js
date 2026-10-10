/* ============================================================
   ExpertHub — js/public/components/bind.js
   ------------------------------------------------------------------
   Global delegation & interaction bus for the entire public layer.

   RESPONSIBILITIES
     • Hash navigation with same-hash re-fire support
     • Slide-down nav drawer (open/close/toggle, focus trap, scroll lock)
     • Generic modals (open/close, focus trap, backdrop dismiss)
     • Declarative click actions — 18 built-ins + pluggable registry
     • Keyboard shortcuts (Escape, ⌘K, /, Tab cycling)
     • Deferred navigation via data-confirm / data-analytics
     • Focus save/restore for any overlay
     • Auto-close drawer on breakpoint crossing / hash change

   PUBLIC API
     P.go(hash)                    — navigate, re-fires if identical
     P.bindGoto()                  — no-op (kept for legacy callers)
     P.action(name, handler)       — register a custom [data-action]
     P.action(name)                — get a registered handler
     P.actions                     — frozen snapshot of built-ins
     P.drawer.open() / .close() / .toggle() / .isOpen()
     P.modal.open(el) / .close(el) / .closeAll()
     P.installDelegates()          — idempotent installer
     P.uninstallDelegates()        — full teardown

   EVENTS (bubbled on document)
     experthub:navigate    { detail:{ hash, source } }
     experthub:drawer:open { detail:{ el } }
     experthub:drawer:close{ detail:{ el } }
     experthub:modal:open  { detail:{ el } }
     experthub:modal:close { detail:{ el } }
     experthub:action      { detail:{ action, el } }
   ------------------------------------------------------------------
   @module  PublicUI.bind — global delegation
   @version 3.0.0
   ============================================================ */
(() => {
  'use strict';

  const P = (window.PublicUI = window.PublicUI || {});
  const F = P.format || {};

  const BREAKPOINT_DESKTOP = 1024;

  /* ============================================================
     §0. Small helpers
     ============================================================ */

  const on = (target, event, handler, opts = {}) => {
    if (!target) return () => {};
    target.addEventListener(event, handler, opts);
    return () => target.removeEventListener(event, handler, opts);
  };

  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  /** Prevent default ONLY if the user isn't using a modifier key. */
  const isModifiedClick = (e) =>
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

  /** Dispatch a bubbling CustomEvent on document. */
  const fire = (name, detail) => {
    try {
      document.dispatchEvent(new CustomEvent(`experthub:${name}`, { bubbles: true, detail }));
    } catch { /* older browsers — ignore */ }
  };

  /* ============================================================
     §1. Navigation
     ============================================================ */

  /**
   * Navigate to a hash route. If the target hash is already active,
   * dispatch a synthetic `hashchange` so listeners can re-run.
   * @param {string} hash
   * @param {object} [meta]  — optional { source } for analytics
   */
  P.go = function go(hash, meta = {}) {
    if (!hash) return;
    let h = String(hash);
    if (h.charAt(0) !== '#') h = `#${h}`;

    if (location.hash === h) {
      try {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch {
        window.dispatchEvent(new Event('hashchange'));
      }
    } else {
      location.hash = h;
    }
    fire('navigate', { hash: h, source: meta.source ?? 'P.go' });
  };

  /** Kept for backward compatibility — the delegate covers all. */
  P.bindGoto = function bindGoto() { /* no-op */ };

  /* ============================================================
     §2. Scroll-lock with scrollbar-width compensation
     ============================================================ */

  const scrollLock = (() => {
    let depth = 0;
    let savedPadding = '';

    const lock = () => {
      if (depth === 0) {
        const gap = window.innerWidth - document.documentElement.clientWidth;
        savedPadding = document.body.style.paddingRight;
        if (gap > 0) document.body.style.paddingRight = `${gap}px`;
        document.body.classList.add('pub-nav-locked');
      }
      depth++;
    };

    const unlock = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        document.body.classList.remove('pub-nav-locked');
        document.body.style.paddingRight = savedPadding;
      }
    };

    return { lock, unlock };
  })();

  /* ============================================================
     §3. Focus trap (shared by drawer + modal)
     ============================================================ */

  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]:not([contenteditable="false"])',
  ].join(',');

  const visibleFocusable = (root) =>
    qsa(FOCUSABLE_SELECTOR, root).filter((el) => {
      if (el.offsetParent === null) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

  /**
   * Trap Tab focus inside `container`. Returns a release fn.
   * Also stores the previously-focused element so the caller can
   * restore focus on close.
   */
  const trapFocus = (container) => {
    const previous = document.activeElement;

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = visibleFocusable(container);
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last  = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);

    // Move focus into the container on next frame.
    requestAnimationFrame(() => {
      const nodes = visibleFocusable(container);
      (nodes[0] || container).focus?.();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && previous.focus && document.contains(previous)) {
        try { previous.focus(); } catch { /* ignore */ }
      }
    };
  };

  /* ============================================================
     §4. Drawer manager
     ============================================================ */

  const DRAWER_SELECTORS = {
    drawer:   '#pubNavDrawer, [data-drawer-panel]',
    nav:      '.pub-nav, [data-drawer-host]',
    backdrop: '.pub-nav-backdrop, [data-drawer-backdrop]',
    toggle:   '[data-action="nav-toggle"], [data-drawer-toggle]',
  };

  const drawer = (() => {
    let releaseFocus = null;
    let isOpen = false;

    const refs = () => {
      const panel = qs(DRAWER_SELECTORS.drawer);
      return {
        panel,
        nav:      panel?.closest(DRAWER_SELECTORS.nav) || qs(DRAWER_SELECTORS.nav),
        backdrop: qs(DRAWER_SELECTORS.backdrop),
        toggle:   qs(DRAWER_SELECTORS.toggle),
      };
    };

    const open = () => {
      const { panel, nav, backdrop, toggle } = refs();
      if (!panel || isOpen) return;

      panel.setAttribute('data-open', 'true');
      panel.removeAttribute('aria-hidden');
      if (nav)      nav.setAttribute('data-drawer', 'open');
      if (backdrop) backdrop.setAttribute('data-open', 'true');
      if (toggle)   toggle.setAttribute('aria-expanded', 'true');

      scrollLock.lock();
      releaseFocus = trapFocus(panel);
      isOpen = true;

      fire('drawer:open', { el: panel });
    };

    const close = () => {
      const { panel, nav, backdrop, toggle } = refs();
      if (!panel || !isOpen) return;

      panel.setAttribute('data-open', 'false');
      panel.setAttribute('aria-hidden', 'true');
      if (nav)      nav.setAttribute('data-drawer', 'closed');
      if (backdrop) backdrop.setAttribute('data-open', 'false');
      if (toggle)   toggle.setAttribute('aria-expanded', 'false');

      scrollLock.unlock();
      if (releaseFocus) { releaseFocus(); releaseFocus = null; }
      isOpen = false;

      fire('drawer:close', { el: panel });
    };

    const toggle = () => (isOpen ? close() : open());

    return { open, close, toggle, isOpen: () => isOpen, refs };
  })();

  P.drawer = drawer;

  /* ============================================================
     §5. Modal manager
     ============================================================ */

  const modalStack = [];

  const modal = {
    /**
     * Open a modal element.
     * @param {Element|string} elOrSelector
     */
    open(elOrSelector) {
      const el = typeof elOrSelector === 'string'
        ? qs(elOrSelector)
        : elOrSelector;
      if (!el || modalStack.includes(el)) return;

      const wasHidden = el.hasAttribute('hidden');
      if (wasHidden) el.removeAttribute('hidden');
      el.setAttribute('role', el.getAttribute('role') || 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.classList.add('is-open');

      const backdrop = el.querySelector('[data-modal-backdrop]') ||
                       el.closest('[data-modal-root]');
      if (backdrop) backdrop.setAttribute('data-open', 'true');

      scrollLock.lock();
      const release = trapFocus(el);
      modalStack.push(el);
      el._releaseFocus = release;

      fire('modal:open', { el });
    },

    /** Close the topmost modal, or a specific element. */
    close(elOrSelector) {
      const el = elOrSelector
        ? (typeof elOrSelector === 'string' ? qs(elOrSelector) : elOrSelector)
        : modalStack[modalStack.length - 1];
      if (!el) return;

      el.classList.remove('is-open');
      const backdrop = el.querySelector('[data-modal-backdrop]') ||
                       el.closest('[data-modal-root]');
      if (backdrop) backdrop.setAttribute('data-open', 'false');

      if (el._releaseFocus) { el._releaseFocus(); el._releaseFocus = null; }
      scrollLock.unlock();

      const idx = modalStack.indexOf(el);
      if (idx >= 0) modalStack.splice(idx, 1);

      if (el.hasAttribute('data-modal-hide-on-close')) el.setAttribute('hidden', '');

      fire('modal:close', { el });
    },

    /** Close every open modal. */
    closeAll() {
      [...modalStack].reverse().forEach((el) => modal.close(el));
    },

    isOpen: () => modalStack.length > 0,
  };

  P.modal = modal;

  /* ============================================================
     §6. Action registry — pluggable [data-action] handlers
     ============================================================ */

  const registry = new Map();

  /**
   * Register a custom action. Handler receives (event, element, context).
   * @param {string} name
   * @param {(e: Event, el: Element, ctx: object) => void} handler
   */
  P.action = function action(name, handler) {
    if (typeof name === 'object') {
      // Bulk-register: P.action({ a: fn, b: fn })
      for (const [k, fn] of Object.entries(name)) P.action(k, fn);
      return;
    }
    if (arguments.length === 1) return registry.get(name);
    if (typeof handler === 'function') registry.set(name, handler);
  };

  /* ============================================================
     §7. Built-in actions
     ============================================================ */

  /* ---- 7.1 Drawer / nav ---- */

  P.action('nav-toggle', (e) => {
    e.preventDefault();
    drawer.toggle();
  });

  P.action('nav-open', (e) => { e.preventDefault(); drawer.open(); });
  P.action('nav-close', (e) => { e.preventDefault(); drawer.close(); });

  /* ---- 7.2 Navigation ---- */

  P.action('goto', (e, el) => {
    if (isModifiedClick(e)) return;         // let the browser handle it
    e.preventDefault();
    drawer.close();
    const href = el.getAttribute('data-href') || el.getAttribute('data-goto');
    P.go(href, { source: 'goto' });
  });

  P.action('back', (e) => {
    e.preventDefault();
    history.length > 1 ? history.back() : P.go('#/');
  });

  P.action('forward', (e) => {
    e.preventDefault();
    history.forward();
  });

  P.action('scroll-top', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  });

  P.action('scroll-to', (e, el) => {
    e.preventDefault();
    const id = el.getAttribute('data-target');
    const target = (id?.startsWith('#') ? qs(id) : document.getElementById(id));
    if (target) target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: el.getAttribute('data-block') || 'start',
    });
  });

  /* ---- 7.3 Accordion / FAQ / tabs ---- */

  P.action('faq', (e, el) => {
    e.preventDefault();
    const item = el.closest('[data-faq], .pub-accordion-item') || el.parentElement;
    if (!item) return;
    const open = item.classList.toggle('open');
    el.setAttribute('aria-expanded', open ? 'true' : 'false');
    // If `data-accordion-single` is set on the container, close siblings.
    const container = item.parentElement;
    if (container?.hasAttribute('data-accordion-single') && open) {
      qsa('[data-faq], .pub-accordion-item', container).forEach((sib) => {
        if (sib !== item) {
          sib.classList.remove('open');
          sib.querySelector('[role="button"]')?.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });

  P.action('tab', (e, el) => {
    e.preventDefault();
    const group = el.closest('[role="tablist"], [data-tabs]');
    if (!group) return;
    const tabId = el.getAttribute('data-tab') || el.getAttribute('aria-controls');
    qsa('[role="tab"], [data-action="tab"]', group).forEach((t) => {
      t.setAttribute('aria-selected', t === el ? 'true' : 'false');
      t.classList.toggle('is-active', t === el);
    });
    // Toggle panels.
    const panelsSelector = el.getAttribute('data-tab-panels');
    if (panelsSelector) {
      qsa(panelsSelector).forEach((panel) => {
        const match = panel.id === tabId ||
                      panel.getAttribute('data-tab-panel') === el.getAttribute('data-tab');
        panel.hidden = !match;
      });
    }
  });

  /* ---- 7.4 Search / chips ---- */

  P.action('chip', (e, el) => {
    e.preventDefault();
    const q = el.getAttribute('data-query') || '';
    if (P.components?.searchRun) P.components.searchRun(q);
    fire('action', { action: 'chip', el });
  });

  P.action('search-all', (e, el) => {
    e.preventDefault();
    const q = el.getAttribute('data-query') || '';
    P.components?.searchClose?.();
    P.go(`#/courses?q=${encodeURIComponent(q)}`, { source: 'search-all' });
  });

  P.action('course-filter', (e, el) => {
    e.preventDefault();
    const cat = el.getAttribute('data-filter') || 'all';
    const siblings = el.parentElement
      ? qsa('.pub-chip', el.parentElement)
      : [];
    siblings.forEach((s) => s.classList.remove('is-active'));
    el.classList.add('is-active');
    if (P.pages?.courses?.load) {
      const input = document.getElementById('pubCourseQuery');
      P.pages.courses.load({ q: input?.value ?? '', category: cat });
    }
  });

  /* ---- 7.5 Resources / external links ---- */

  P.action('resource-open', (e, el) => {
    e.preventDefault();
    const url = el.getAttribute('data-url');
    if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
    else P.go('#/resources');
  });

  P.action('external', (e, el) => {
    if (isModifiedClick(e)) return;
    const url = el.getAttribute('data-url') || el.getAttribute('href');
    if (!url) return;
    e.preventDefault();
    window.open(url, el.getAttribute('data-target') || '_blank', 'noopener,noreferrer');
  });

  /* ---- 7.6 Clipboard ---- */

  P.action('copy', async (e, el) => {
    e.preventDefault();
    const text = el.getAttribute('data-copy') || el.textContent?.trim() || '';
    try {
      await navigator.clipboard.writeText(text);
      window.UI?.toast?.('Copied to clipboard', 'success');
    } catch {
      window.UI?.toast?.('Copy failed', 'error');
    }
  });

  /* ---- 7.7 Theme toggle ---- */

  P.action('theme-toggle', (e) => {
    e.preventDefault();
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') ||
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    try { localStorage.setItem('ehub:theme', next); } catch { /* no-op */ }
    fire('action', { action: 'theme-toggle', el: null, detail: { theme: next } });
  });

  /* ---- 7.8 Password visibility ---- */

  P.action('password-toggle', (e, el) => {
    e.preventDefault();
    const input = el.closest('.pub-field')?.querySelector('input') ||
                  document.getElementById(el.getAttribute('data-target'));
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    el.setAttribute('aria-pressed', show ? 'true' : 'false');
    const ic = el.querySelector('i');
    if (ic) {
      ic.classList.toggle('fa-eye', !show);
      ic.classList.toggle('fa-eye-slash', show);
    }
  });

  /* ---- 7.9 Modals ---- */

  P.action('modal-open', (e, el) => {
    e.preventDefault();
    modal.open(el.getAttribute('data-modal') || el.getAttribute('data-target'));
  });

  P.action('modal-close', (e, el) => {
    e.preventDefault();
    modal.close(el.getAttribute('data-modal') || undefined);
  });

  /* ---- 7.10 Dismissibles ---- */

  P.action('dismiss', (e, el) => {
    e.preventDefault();
    const target = el.closest('[data-dismissible]') || el.closest('.pub-alert');
    if (!target) return;
    target.classList.add('is-leaving');
    const remove = () => target.remove();
    if (prefersReducedMotion()) remove();
    else {
      const dur = parseFloat(getComputedStyle(target).transitionDuration) * 1000 || 200;
      setTimeout(remove, dur);
    }
  });

  /* ---- 7.11 Retry / reload ---- */

  P.action('retry', (e, el) => {
    e.preventDefault();
    const section = el.getAttribute('data-section');
    if (P.retry) P.retry(section);
  });

  P.action('refresh', (e) => {
    e.preventDefault();
    location.reload();
  });

  P.action('print', (e) => {
    e.preventDefault();
    window.print();
  });

  /* ---- 7.12 Share ---- */

  P.action('share', async (e, el) => {
    e.preventDefault();
    const url = el.getAttribute('data-url') || location.href;
    const title = el.getAttribute('data-title') || document.title;
    const text = el.getAttribute('data-text') || title;
    if (navigator.share) {
      try { await navigator.share({ url, title, text }); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        window.UI?.toast?.('Link copied to clipboard', 'success');
      } catch {
        window.UI?.toast?.('Share unavailable', 'error');
      }
    }
  });

  /* ---- 7.13 Load more ---- */

  P.action('load-more', (e, el) => {
    e.preventDefault();
    const section = el.getAttribute('data-section') || 'default';
    if (P.pages?.loadMore) P.pages.loadMore(section);
    else fire('action', { action: 'load-more', el, detail: { section } });
  });

  /* ---- 7.14 Print helper (bonus, small) ---- */

  P.action('select-all', (e, el) => {
    e.preventDefault();
    const target = document.getElementById(el.getAttribute('data-target'));
    if (!target) return;
    if (target.select) target.select();
    else if (window.getSelection) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  /* Frozen snapshot of built-ins for introspection. */
  P.actions = Object.freeze(Object.fromEntries(registry.entries()));

  /* ============================================================
     §8. Click delegation
     ============================================================ */

  let uninstallClick = null;

  const handleClick = (e) => {
    const t = e.target;
    if (!t?.closest) return;

    // --- 1. [data-action] -------------------------------------
    const actionEl = t.closest('[data-action]');
    if (actionEl) {
      const name = actionEl.getAttribute('data-action');
      const handler = registry.get(name);
      if (handler) {
        // Deferred navigation: data-confirm gates the action.
        const confirmMsg = actionEl.getAttribute('data-confirm');
        if (confirmMsg && !window.confirm(confirmMsg)) {
          e.preventDefault();
          return;
        }
        // Analytics hook fires before the action runs.
        const analytics = actionEl.getAttribute('data-analytics');
        if (analytics) fire('action', { action: 'analytics', el: actionEl, detail: { name: analytics } });

        handler(e, actionEl, { drawer, modal, go: P.go });
        return;
      }
      // Fall through if no handler is registered.
    }

    // --- 2. [data-goto] as a shortcut -------------------------
    const gotoEl = t.closest('[data-goto]:not([data-action])');
    if (gotoEl && !isModifiedClick(e)) {
      e.preventDefault();
      drawer.close();
      P.go(gotoEl.getAttribute('data-goto'), { source: 'data-goto' });
      return;
    }

    // --- 3. Click-outside behaviour ---------------------------
    if (!t.closest('.pub-search')) P.components?.searchClose?.();
    if (!t.closest('.pub-nav') && !t.closest('[data-drawer-panel]')) drawer.close();
  };

  /* ============================================================
     §9. Keyboard shortcuts
     ============================================================ */

  let uninstallKey = null;

  const handleKeydown = (e) => {
    // Escape — close topmost overlay.
    if (e.key === 'Escape') {
      if (modal.isOpen()) { modal.close(); return; }
      if (drawer.isOpen()) { drawer.close(); return; }
      P.components?.searchClose?.();
      return;
    }

    // ⌘K / Ctrl+K — search focus.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      const input = qs('.pub-search input, [data-search-input]');
      if (input) {
        e.preventDefault();
        input.focus();
        input.select?.();
        fire('action', { action: 'hotkey', el: input, detail: { key: 'cmd-k' } });
      }
      return;
    }

    // `/` — focus search when not already typing.
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const active = document.activeElement;
      const typing = active &&
        (active.tagName === 'INPUT' ||
         active.tagName === 'TEXTAREA' ||
         active.isContentEditable);
      if (typing) return;
      const input = qs('.pub-search input, [data-search-input]');
      if (input) {
        e.preventDefault();
        input.focus();
      }
    }
  };

  /* ============================================================
     §10. Lifecycle listeners
     ============================================================ */

  let uninstallMisc = [];

  const installMisc = () => {
    const unbinds = [];

    // Auto-close drawer when the viewport grows past the breakpoint.
    let resizeT;
    unbinds.push(on(window, 'resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        if (window.innerWidth > BREAKPOINT_DESKTOP && drawer.isOpen()) drawer.close();
      }, 120);
    }, { passive: true }));

    // Close the drawer on hash change (after a navigation).
    unbinds.push(on(window, 'hashchange', () => drawer.close()));

    // Close the drawer on browser back/forward.
    unbinds.push(on(window, 'popstate', () => drawer.close()));

    // Backdrop click closes drawer / topmost modal.
    unbinds.push(on(document, 'click', (e) => {
      const t = e.target;
      if (t?.matches?.('[data-drawer-backdrop], .pub-nav-backdrop')) {
        drawer.close();
      }
      if (t?.matches?.('[data-modal-backdrop]')) {
        modal.close(t.closest('[role="dialog"]'));
      }
    }));

    return unbinds;
  };

  /* ============================================================
     §11. Install / uninstall
     ============================================================ */

  let installed = false;

  /** Install every global listener. Idempotent. */
  P.installDelegates = function installDelegates() {
    if (installed) return;
    installed = true;

    uninstallClick = on(document, 'click', handleClick);
    uninstallKey   = on(document, 'keydown', handleKeydown);
    uninstallMisc  = installMisc();
  };

  /** Remove every global listener. */
  P.uninstallDelegates = function uninstallDelegates() {
    if (!installed) return;
    installed = false;
    try { uninstallClick?.(); } catch { /* noop */ }
    try { uninstallKey?.(); }   catch { /* noop */ }
    uninstallMisc.forEach((fn) => { try { fn(); } catch { /* noop */ } });
    uninstallMisc = [];
    uninstallClick = uninstallKey = null;
  };

  /* ============================================================
     §12. Boot
     ============================================================ */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => P.installDelegates(), { once: true });
  } else {
    P.installDelegates();
  }

  /* Restore the persisted theme on boot (in case the toggle was used). */
  try {
    const saved = localStorage.getItem('ehub:theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch { /* no-op */ }

  /* ============================================================
     §13. Export
     ============================================================ */

  // `P.bind` is intentionally NOT overwritten — the utility bind.js
  // (Section 1) owns that namespace. This file only adds the
  // delegation surface (P.go, P.action, P.drawer, P.modal, etc.).
})();