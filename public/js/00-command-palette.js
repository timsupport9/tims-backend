/* ============================================================
   ExpertHub 2.0 — 00-command-palette.js
   Cmd/Ctrl+K command palette + Vim-style `g` navigator.
   Discovers commands lazily from S, currentUser, EHFeature11.
   ============================================================ */

(function () {
  'use strict';

  const state = {
    open: false,
    query: '',
    selected: 0,
    results: [],
    mode: 'palette',   // 'palette' | 'goto'
    goTimer: null,
  };

  const TAB_LABELS = {
    'dashboard': 'Dashboard',
    'eschool': 'E-School',
    'my-learning': 'My Learning',
    'learning-paths': 'Learning Paths',
    'bundles': 'Bundles',
    'wishlist': 'Wishlist',
    'certificates': 'Certificates',
    'achievements': 'Achievements',
    'course-notes': 'My Notes',
    'events': 'Events',
    'experts': 'Find Experts',
    'consultations': 'My Consultations',
    'packages': 'Session Packages',
    'shortlist': 'Shortlist',
    'wallet': 'Wallet',
    'transactions': 'Transactions',
    'refunds': 'Refund Requests',
    'claims': 'Claims',
    'support': 'Support',
    'profile': 'Profile',
  };

  /* ---------- command discovery ---------- */

  function discoverCommands() {
    const cmds = [];

    // 1. Tab navigation
    Object.entries(TAB_LABELS).forEach(([tab, label]) => {
      cmds.push({
        id: 'nav:' + tab,
        label: label,
        group: 'Go to',
        keywords: tab,
        icon: 'fa-arrow-right',
        run: () => safeCall('switchTab', tab),
      });
    });

    // 2. Courses
    const courses = (window.S && S.courses) || [];
    courses.slice(0, 100).forEach(c => cmds.push({
      id: 'course:' + c.id,
      label: c.title || 'Untitled course',
      group: 'Courses',
      keywords: [c.category, c.course_type, c.level].filter(Boolean).join(' '),
      icon: 'fa-book',
      run: () => safeCall('openCourseDetailModal', c.id),
    }));

    // 3. Experts
    const experts = (window.S && S.experts) || [];
    experts.slice(0, 100).forEach(e => cmds.push({
      id: 'expert:' + e.id,
      label: e.name || 'Expert',
      group: 'Experts',
      keywords: e.specialization || '',
      icon: 'fa-user-tie',
      run: () => {
        safeCall('switchTab', 'experts');
      },
    }));

    // 4. Feature catalog
    if (window.EHFeature11 && Array.isArray(window.EHFeature11.catalog)) {
      window.EHFeature11.catalog.forEach(c => cmds.push({
        id: 'eh:' + c.id,
        label: c.label,
        group: 'Actions',
        keywords: (c.feature + ' ' + c.operation).toLowerCase(),
        icon: 'fa-bolt',
        run: () => {
          try { window.EHFeature11.catalogExecute(c.id, { source: 'palette' }); }
          catch (err) { safeToast(err.message, 'error'); }
        },
      }));
    }

    // 5. Global actions
    cmds.push(
      { id: 'a:intent',   label: 'Change mode (Learning/Consulting)', group: 'Actions', keywords: 'intent consult', icon: 'fa-sliders', run: () => clickAction('change-intent') },
      { id: 'a:theme',    label: 'Toggle dark mode',                  group: 'Actions', keywords: 'theme dark light', icon: 'fa-moon', run: toggleTheme },
      { id: 'a:logout',   label: 'Sign out',                          group: 'Actions', keywords: 'logout exit', icon: 'fa-sign-out-alt', run: () => safeCall('logout') },
      { id: 'a:notifs',   label: 'Open notifications',                group: 'Actions', keywords: 'bell alerts', icon: 'fa-bell', run: () => window.EHNotifications && window.EHNotifications.open() },
      { id: 'a:help',     label: 'Keyboard shortcuts',                group: 'Actions', keywords: 'help keys', icon: 'fa-keyboard', run: showShortcuts },
    );

    return cmds;
  }

  function safeCall(name, ...args) {
    if (typeof window[name] === 'function') return window[name](...args);
  }
  function safeToast(msg, type) {
    if (typeof window.showToast === 'function') window.showToast(msg, type);
  }
  function clickAction(action) {
    document.querySelector(`[data-action="${action}"]`)?.click();
  }
  function toggleTheme() {
    const root = document.documentElement;
    root.classList.toggle('dark');
    try { localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light'); } catch (_) {}
  }

  /* ---------- fuzzy matching ---------- */

  function score(needle, haystack) {
    if (!needle) return 1;
    const n = needle.toLowerCase();
    const h = haystack.toLowerCase();
    if (h.includes(n)) return 100 - h.indexOf(n);
    // subsequence
    let i = 0, s = 0;
    for (let j = 0; j < h.length && i < n.length; j++) {
      if (h[j] === n[i]) { i++; s += 1 + (h.length - j) / h.length; }
    }
    return i === n.length ? s : 0;
  }

  function filterCommands(query) {
    const all = discoverCommands();
    if (!query) return all.slice(0, 50);
    return all
      .map(c => ({ c, s: Math.max(score(query, c.label), score(query, c.keywords || '') * 0.6) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 50)
      .map(x => x.c);
  }

  /* ---------- DOM ---------- */

  function ensureRoot() {
    let root = document.getElementById('eh-cmdk');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'eh-cmdk';
    root.className = 'eh-cmdk';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="eh-cmdk__backdrop" data-cmdk-close></div>
      <div class="eh-cmdk__panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="eh-cmdk__search">
          <i class="fas fa-search"></i>
          <input id="eh-cmdk-input" class="eh-cmdk__input" placeholder="Type a command or search…"
                 autocomplete="off" spellcheck="false" />
          <kbd class="eh-cmdk__kbd">Esc</kbd>
        </div>
        <ul id="eh-cmdk-list" class="eh-cmdk__list" role="listbox"></ul>
        <div class="eh-cmdk__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> run</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>`;
    document.body.appendChild(root);
    root.querySelector('[data-cmdk-close]').addEventListener('click', close);
    root.querySelector('#eh-cmdk-input').addEventListener('input', onInput);
    return root;
  }

  function render() {
    const root = ensureRoot();
    const list = root.querySelector('#eh-cmdk-list');
    const q = state.query;
    state.results = filterCommands(q);

    if (!state.results.length) {
      list.innerHTML = `<li class="eh-cmdk__empty">No matches for "${escapeHtml(q)}"</li>`;
      return;
    }

    if (state.selected >= state.results.length) state.selected = 0;

    let lastGroup = '';
    const html = state.results.map((c, i) => {
      const header = c.group !== lastGroup
        ? (lastGroup = c.group, `<li class="eh-cmdk__group">${escapeHtml(c.group)}</li>`)
        : '';
      return header + `
        <li class="eh-cmdk__item ${i === state.selected ? 'is-active' : ''}"
            data-cmdk-index="${i}" role="option" aria-selected="${i === state.selected}">
          <i class="fas ${c.icon || 'fa-circle'}"></i>
          <span class="eh-cmdk__label">${highlight(c.label, q)}</span>
          <span class="eh-cmdk__id">${escapeHtml(c.id)}</span>
        </li>`;
    }).join('');
    list.innerHTML = html;

    list.querySelectorAll('[data-cmdk-index]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        state.selected = Number(el.dataset.cmdkIndex);
        list.querySelectorAll('.is-active').forEach(x => x.classList.remove('is-active'));
        el.classList.add('is-active');
      });
      el.addEventListener('click', () => run(Number(el.dataset.cmdkIndex)));
    });

    const active = list.querySelector('.is-active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function highlight(text, q) {
    const safe = escapeHtml(text);
    if (!q) return safe;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return safe;
    return safe.slice(0, idx)
      + '<mark>' + safe.slice(idx, idx + q.length) + '</mark>'
      + safe.slice(idx + q.length);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]
    ));
  }

  /* ---------- lifecycle ---------- */

  function open() {
    if (state.open) return;
    state.open = true;
    state.query = '';
    state.selected = 0;
    const root = ensureRoot();
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    render();
    const input = root.querySelector('#eh-cmdk-input');
    input.value = '';
    setTimeout(() => input.focus(), 10);
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    const root = document.getElementById('eh-cmdk');
    if (root) {
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
    state.selected = 0;
    state.query = '';
  }

  function onInput(e) {
    state.query = e.target.value.trim();
    state.selected = 0;
    render();
  }

  function move(delta) {
    if (!state.results.length) return;
    state.selected = (state.selected + delta + state.results.length) % state.results.length;
    const list = document.querySelector('#eh-cmdk-list');
    list.querySelectorAll('.is-active').forEach(x => x.classList.remove('is-active'));
    const el = list.querySelector(`[data-cmdk-index="${state.selected}"]`);
    if (el) { el.classList.add('is-active'); el.scrollIntoView({ block: 'nearest' }); }
  }

  function run(index) {
    const cmd = state.results[index ?? state.selected];
    if (!cmd) return;
    close();
    try { cmd.run(); } catch (err) { console.error('[cmdk]', err); safeToast(err.message, 'error'); }
  }

  function showShortcuts() {
    const rows = [
      ['⌘ K / Ctrl K', 'Open command palette'],
      ['g then d', 'Dashboard'],
      ['g then e', 'E-School'],
      ['g then l', 'My Learning'],
      ['g then c', 'Consultations'],
      ['g then x', 'Find Experts'],
      ['g then w', 'Wallet'],
      ['g then p', 'Profile'],
      ['?', 'Show this help'],
      ['Esc', 'Close dialog'],
    ];
    if (typeof window.openModal === 'function') {
      window.openModal({
        title: 'Keyboard shortcuts',
        body: `<table class="data-table"><tbody>${rows.map(r =>
          `<tr><td><kbd>${r[0]}</kbd></td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`,
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
    }
  }

  /* ---------- keyboard ---------- */

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  const GOTO_MAP = {
    d: 'dashboard', e: 'eschool', l: 'my-learning', p: 'learning-paths',
    b: 'bundles', h: 'wishlist', v: 'certificates', a: 'achievements',
    n: 'course-notes', x: 'experts', c: 'consultations', k: 'packages',
    s: 'shortlist', w: 'wallet', t: 'transactions', f: 'refunds',
    j: 'claims', u: 'support', o: 'profile', m: 'events',
  };

  document.addEventListener('keydown', e => {
    // Ignore inside inputs for most shortcuts (but not ⌘K)
    const typing = isTypingTarget(document.activeElement);

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      state.open ? close() : open();
      return;
    }

    if (state.open) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); move(-1); return; }
      if (e.key === 'Enter')     { e.preventDefault(); run(); return; }
      return;
    }

    if (typing) return;

    if (e.key === '?') { e.preventDefault(); showShortcuts(); return; }

    if (e.key === 'g') {
      state.mode = 'goto';
      clearTimeout(state.goTimer);
      state.goTimer = setTimeout(() => { state.mode = 'palette'; }, 1200);
      return;
    }

    if (state.mode === 'goto') {
      const tab = GOTO_MAP[e.key.toLowerCase()];
      state.mode = 'palette';
      clearTimeout(state.goTimer);
      if (tab) { e.preventDefault(); safeCall('switchTab', tab); }
    }
  });

  // Expose for programmatic use
  window.EHCommandPalette = { open, close, run, discover: discoverCommands };