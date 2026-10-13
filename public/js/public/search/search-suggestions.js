/* ============================================================
   public/search/search-suggestions.js — Autocomplete dropdown
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  let host = null;

  function attach(input, { onSelect = null, type = 'all' } = {}) {
    if (!input) return () => {};
    host = document.createElement('div');
    host.className = 'search-suggestions';
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(host);

    const run = EH.Perf.debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) { host.innerHTML = ''; host.classList.remove('open'); return; }
      const items = await EH.SearchController.fetchSuggestions(q);
      if (!items.length) { host.innerHTML = ''; host.classList.remove('open'); return; }
      host.innerHTML = items.map(s => `
        <button class="search-suggestion" type="button" data-id="${EH.Fmt.esc(s.id)}">
          <i class="fas fa-${s.kind === 'expert' ? 'user-tie' : s.kind === 'event' ? 'calendar' : 'book'}"></i>
          ${EH.Fmt.esc(s.title || s.name)}
        </button>`).join('');
      host.classList.add('open');
      host.querySelectorAll('.search-suggestion').forEach(b => {
        b.onclick = () => {
          const item = items.find(x => String(x.id) === b.dataset.id);
          host.classList.remove('open');
          if (typeof onSelect === 'function') onSelect(item);
        };
      });
    }, 250);

    input.addEventListener('input', run);
    input.addEventListener('focus', run);
    document.addEventListener('click', (e) => {
      if (!host.contains(e.target) && e.target !== input) host.classList.remove('open');
    });

    return () => { run.cancel?.(); host.remove(); };
  }

  EH.SearchSuggestions = { attach };
})(window);
