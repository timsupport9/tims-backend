/* ============================================================
   public/components/public-search.js — Search input for public site
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render({ id = 'publicSearch', placeholder = 'Search courses, experts, events…', value = '' } = {}) {
    return `
      <div class="public-search" role="search">
        <i class="fas fa-search public-search-icon"></i>
        <input id="${id}" type="search" class="public-search-input"
               placeholder="${EH.Fmt.esc(placeholder)}"
               value="${EH.Fmt.esc(value)}" autocomplete="off" />
        <button class="public-search-clear hidden" type="button" aria-label="Clear">
          <i class="fas fa-times"></i>
        </button>
      </div>`;
  }

  function attach(root, onChange) {
    if (!root) return;
    const input = root.querySelector('.public-search-input');
    const clear = root.querySelector('.public-search-clear');
    if (!input) return;
    const handler = EH.Perf.debounce(() => {
      clear.classList.toggle('hidden', !input.value);
      if (typeof onChange === 'function') onChange(input.value.trim());
    }, 250);
    input.oninput = handler;
    if (clear) clear.onclick = () => {
      input.value = '';
      clear.classList.add('hidden');
      if (typeof onChange === 'function') onChange('');
    };
  }

  EH.PublicSearch = { render, attach };
})(window);
