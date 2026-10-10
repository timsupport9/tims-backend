/* ============================================================
   ExpertHub — js/public/components/category-card.js
   ------------------------------------------------------------------
   Category tile / row / pill / icon / featured variants + grid.
   Backward-compatible: P.components.categoryCard(cat) still works.
   ------------------------------------------------------------------
   Public API:
     P.components.categoryCard(cat, opts?)        → HTML string
     P.components.categoryCard.render(cat, opts)  → HTML string
     P.components.categoryCard.grid(list, opts)   → HTML string
     P.components.categoryCard.masonry(list, opts)→ HTML string
     P.components.categoryCard.skeleton(count?)   → HTML string
     P.components.categoryCard.mount(root, opts)  → teardown fn
     P.components.categoryCard.defaults           → frozen defaults
     P.components.categoryCard.defaultCategories()→ demo data
     P.components.categoryCard.tints              → frozen palette
     P.components.categoryCard.variants           → ['tile', 'compact', ...]
   ------------------------------------------------------------------
   Events (bubble from the card root):
     experthub:category:click  { detail:{ slug, name, count, href } }
   ------------------------------------------------------------------
   @module  PublicUI.components.categoryCard
   @version 3.0.0
   ============================================================ */
(() => {
  'use strict';

  const P = (window.PublicUI = window.PublicUI || {});
  P.components = P.components || {};

  const F = P.format || {};
  const S = P.styles || {};

  /* ============================================================
     §0. Tiny utilities (mirror hero.js)
     ============================================================ */

  const esc = F.escapeHtml || F.esc || ((s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;'));

  const escAttr = esc;

  const safeHref = S.safeUrl || ((url) => {
    if (!url) return '#';
    const s = String(url).trim();
    return /^(?:https?:|\/|#|mailto:|tel:|\?)/i.test(s) ? s : '#';
  });

  const cx = S.cx || ((...parts) => parts.flat().filter(Boolean).join(' '));

  const icon = (name, opts = {}) => {
    if (S.icon) return S.icon(name, opts);
    const cls = ['fa', name, opts.className].filter(Boolean).join(' ');
    const aria = opts.ariaLabel
      ? ` role="img" aria-label="${escAttr(opts.ariaLabel)}"`
      : ' aria-hidden="true"';
    return `<i class="${escAttr(cls)}"${aria}></i>`;
  };

  const toArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

  const slugify = F.slugify || ((s) =>
    String(s ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

  const compact = F.compact || ((n) => String(n));
  const pluralize = F.pluralize || ((n, s, p) => (n === 1 ? s : p || `${s}s`));

  /** Build a hash route with optional params. */
  const hashRoute = S.hashRoute || ((path, params) => {
    const clean = String(path).replace(/^#?\/?/, '');
    const base = `#/${clean}`;
    if (!params) return base;
    const qs = Object.entries(params)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return qs ? `${base}?${qs}` : base;
  });

  /* ============================================================
     §1. Tint palette
     ============================================================ */

  /** Named tints → [hex, soft-bg, fg] triples. */
  const TINTS = Object.freeze({
    indigo:  { hex: '#6366f1', bg: 'rgba(99,102,241,.12)',  fg: '#4338ca' },
    sky:     { hex: '#0ea5e9', bg: 'rgba(14,165,233,.12)',  fg: '#0369a1' },
    emerald: { hex: '#10b981', bg: 'rgba(16,185,129,.14)',  fg: '#047857' },
    amber:   { hex: '#f59e0b', bg: 'rgba(245,158,11,.16)',  fg: '#b45309' },
    violet:  { hex: '#8b5cf6', bg: 'rgba(139,92,246,.12)',  fg: '#6d28d9' },
    rose:    { hex: '#ef4444', bg: 'rgba(239,68,68,.12)',   fg: '#b91c1c' },
    teal:    { hex: '#14b8a6', bg: 'rgba(20,184,166,.14)',  fg: '#0f766e' },
    cyan:    { hex: '#06b6d4', bg: 'rgba(6,182,212,.12)',   fg: '#0e7490' },
    fuchsia: { hex: '#d946ef', bg: 'rgba(217,70,239,.12)',  fg: '#a21caf' },
    lime:    { hex: '#84cc16', bg: 'rgba(132,204,22,.14)',  fg: '#4d7c0f' },
    orange:  { hex: '#f97316', bg: 'rgba(249,115,22,.14)',  fg: '#c2410c' },
    slate:   { hex: '#64748b', bg: 'rgba(100,116,139,.12)', fg: '#334155' },
  });

  const TINT_ORDER = Object.freeze(Object.keys(TINTS));

  /** Stable hash → index (djb2-ish). */
  const hashIndex = (str, len) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return Math.abs(h) % len;
  };

  /**
   * Resolve a tint (named or hex) into a `{ hex, bg, fg }` triple.
   * Deterministic fallback if tint is missing.
   */
  const resolveTint = (tint, seed = '') => {
    if (tint && typeof tint === 'object') return tint;
    if (typeof tint === 'string') {
      const key = tint.toLowerCase();
      if (TINTS[key]) return TINTS[key];
      if (/^#?[0-9a-f]{6}$/i.test(tint.replace('#', ''))) {
        const hex = tint.startsWith('#') ? tint : `#${tint}`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return {
          hex,
          bg: `rgba(${r},${g},${b},.12)`,
          fg: hex,
        };
      }
    }
    return TINTS[TINT_ORDER[hashIndex(seed || 'x', TINT_ORDER.length)]];
  };

  /** Build the inline style vars for a tint. */
  const tintVars = (t) =>
    `--cat-hex:${t.hex};--cat-bg:${t.bg};--cat-fg:${t.fg}`;

  /* ============================================================
     §2. Defaults
     ============================================================ */

  const DEFAULTS = Object.freeze({
    variant: 'tile',                 // tile | compact | row | pill | icon | featured
    href: null,                      // auto-built from slug/name
    target: null,                    // '_blank' etc.
    unit: 'course',                  // singular; pluralized automatically
    showCount: true,
    showIcon: true,
    showDescription: false,
    showArrow: false,
    trending: false,
    disabled: false,
    clickable: true,
    ariaLabel: null,
    className: '',
    index: 0,                        // for staggered animations
  });

  /* ============================================================
     §3. Normalize
     ============================================================ */

  /**
   * Normalize a category input into a full options object.
   * @param {object|string} cat
   * @param {object} [opts]
   * @returns {object}
   */
  const normalize = (cat, opts = {}) => {
    if (cat == null) return null;

    // Allow plain string
    if (typeof cat === 'string') cat = { name: cat };

    const o = { ...DEFAULTS, ...opts };

    const name = String(cat.name ?? cat.label ?? cat.title ?? '').trim();
    const slug = cat.slug || slugify(name);
    const iconClass = cat.icon || o.icon || 'fa-solid fa-graduation-cap';

    // count: number | false | null
    let count = cat.count;
    if (count === false) count = null;
    else if (count != null && !Number.isFinite(Number(count))) count = null;
    else if (count != null) count = Number(count);

    const tint = resolveTint(cat.tint ?? o.tint, slug || name);

    const href = o.href || cat.href || hashRoute('courses', { category: slug });

    const description = cat.description ?? cat.desc ?? null;
    const badge = cat.badge ?? (o.trending || cat.trending ? 'Trending' : null);

    return {
      ...o,
      name,
      slug,
      icon: iconClass,
      tint,
      count,
      href,
      description,
      badge,
      keywords: toArray(cat.keywords),
      raw: cat,
    };
  };

  /* ============================================================
     §4. Sub-renderers
     ============================================================ */

  const renderIcon = (o, extraClass = '') =>
    o.showIcon
      ? `<div class="pub-category-icon ${escAttr(extraClass)}" aria-hidden="true">${icon(o.icon)}</div>`
      : '';

  const renderCount = (o) => {
    if (!o.showCount || o.count == null) return '';
    const n = o.count;
    const display = n >= 1000 ? compact(n) : String(n);
    const word = pluralize(n, o.unit);
    return `<span class="pub-category-count">${esc(display)} ${esc(word)}</span>`;
  };

  const renderBadge = (o) =>
    o.badge
      ? `<span class="pub-category-badge">${esc(o.badge)}</span>`
      : '';

  const renderDescription = (o) =>
    o.showDescription && o.description
      ? `<span class="pub-category-desc">${esc(o.description)}</span>`
      : '';

  const renderArrow = (o) =>
    o.showArrow
      ? `<span class="pub-category-arrow" aria-hidden="true">${icon('fa-solid fa-arrow-right')}</span>`
      : '';

  /* ============================================================
     §5. Variant renderers
     ============================================================ */

  /** Default tile — vertical, centered. */
  const variantTile = (o) => `
    <a class="pub-category pub-category-tile"
       href="${escAttr(safeHref(o.href))}"
       data-cat-slug="${escAttr(o.slug)}"
       data-cat-name="${escAttr(o.name)}"
       data-cat-count="${o.count ?? ''}"
       style="${tintVars(o.tint)}"
       ${o.disabled ? 'aria-disabled="true" tabindex="-1"' : ''}
       ${o.target ? `target="${escAttr(o.target)}" rel="noopener noreferrer"` : ''}
       aria-label="${escAttr(o.ariaLabel || `Browse ${o.name}${o.count != null ? ` — ${o.count} ${pluralize(o.count, o.unit)}` : ''}`)}"
       class="${escAttr(cx('pub-category', 'pub-category-tile', o.className))}">
      ${renderIcon(o)}
      ${renderBadge(o)}
      <b class="pub-category-title">${esc(o.name)}</b>
      ${renderDescription(o)}
      ${renderCount(o)}
    </a>
  `;

  /** Compact — icon left, name + count right. */
  const variantCompact = (o) => `
    <a href="${escAttr(safeHref(o.href))}"
       data-cat-slug="${escAttr(o.slug)}"
       data-cat-name="${escAttr(o.name)}"
       data-cat-count="${o.count ?? ''}"
       style="${tintVars(o.tint)}"
       class="${escAttr(cx('pub-category', 'pub-category-compact', o.className))}"
       aria-label="${escAttr(o.ariaLabel || `Browse ${o.name}`)}"
       ${o.target ? `target="${escAttr(o.target)}" rel="noopener noreferrer"` : ''}>
      ${renderIcon(o)}
      <span class="pub-category-meta">
        <b class="pub-category-title">${esc(o.name)}</b>
        ${renderCount(o)}
      </span>
      ${renderArrow(o)}
    </a>
  `;

  /** Row — list-style, description visible. */
  const variantRow = (o) => `
    <a href="${escAttr(safeHref(o.href))}"
       data-cat-slug="${escAttr(o.slug)}"
       data-cat-name="${escAttr(o.name)}"
       data-cat-count="${o.count ?? ''}"
       style="${tintVars(o.tint)}"
       class="${escAttr(cx('pub-category', 'pub-category-row', o.className))}"
       aria-label="${escAttr(o.ariaLabel || `Browse ${o.name}`)}"
       ${o.target ? `target="${escAttr(o.target)}" rel="noopener noreferrer"` : ''}>
      ${renderIcon(o)}
      <span class="pub-category-body">
        <span class="pub-category-head">
          <b class="pub-category-title">${esc(o.name)}</b>
          ${renderBadge(o)}
        </span>
        ${o.description ? `<span class="pub-category-desc">${esc(o.description)}</span>` : ''}
      </span>
      <span class="pub-category-side">
        ${renderCount(o)}
        ${renderArrow(o) || `<span class="pub-category-arrow" aria-hidden="true">${icon('fa-solid fa-chevron-right')}</span>`}
      </span>
    </a>
  `;

  /** Pill — inline chip. */
  const variantPill = (o) => `
    <a href="${escAttr(safeHref(o.href))}"
       data-cat-slug="${escAttr(o.slug)}"
       data-cat-name="${escAttr(o.name)}"
       data-cat-count="${o.count ?? ''}"
       style="${tintVars(o.tint)}"
       class="${escAttr(cx('pub-category', 'pub-category-pill', o.className))}"
       aria-label="${escAttr(o.ariaLabel || `Browse ${o.name}`)}"
       ${o.target ? `target="${escAttr(o.target)}" rel="noopener noreferrer"` : ''}>
      ${o.showIcon ? `<span class="pub-category-pill-icon" aria-hidden="true">${icon(o.icon)}</span>` : ''}
      <span>${esc(o.name)}</span>
      ${o.count != null && o.showCount ? `<em>${esc(o.count >= 1000 ? compact(o.count) : String(o.count))}</em>` : ''}
    </a>
  `;

  /** Icon-only — square icon button. */
  const variantIcon = (o) => `
    <a href="${escAttr(safeHref(o.href))}"
       data-cat-slug="${escAttr(o.slug)}"
       data-cat-name="${escAttr(o.name)}"
       data-cat-count="${o.count ?? ''}"
       style="${tintVars(o.tint)}"
       class="${escAttr(cx('pub-category', 'pub-category-iconbtn', o.className))}"
       aria-label="${escAttr(o.ariaLabel || `Browse ${o.name}`)}"
       title="${escAttr(o.name)}"
       ${o.target ? `target="${escAttr(o.target)}" rel="noopener noreferrer"` : ''}>
      ${icon(o.icon)}
    </a>
  `;

  /** Featured — hero-style with description and bigger icon. */
  const variantFeatured = (o) => `
    <a href="${escAttr(safeHref(o.href))}"
       data-cat-slug="${escAttr(o.slug)}"
       data-cat-name="${escAttr(o.name)}"
       data-cat-count="${o.count ?? ''}"
       style="${tintVars(o.tint)}"
       class="${escAttr(cx('pub-category', 'pub-category-featured', o.className))}"
       aria-label="${escAttr(o.ariaLabel || `Browse ${o.name}`)}"
       ${o.target ? `target="${escAttr(o.target)}" rel="noopener noreferrer"` : ''}>
      ${renderIcon(o, 'pub-category-icon-lg')}
      <div class="pub-category-featured-body">
        ${renderBadge(o)}
        <b class="pub-category-title">${esc(o.name)}</b>
        ${o.description ? `<span class="pub-category-desc">${esc(o.description)}</span>` : ''}
      </div>
      <div class="pub-category-featured-side">
        ${renderCount(o)}
        ${renderArrow(o) || `<span class="pub-category-arrow" aria-hidden="true">${icon('fa-solid fa-arrow-right')}</span>`}
      </div>
    </a>
  `;

  const VARIANTS = Object.freeze({
    tile:     variantTile,
    compact:  variantCompact,
    row:      variantRow,
    pill:     variantPill,
    icon:     variantIcon,
    featured: variantFeatured,
  });

  /* ============================================================
     §6. Public render
     ============================================================ */

  /**
   * Render a single category card.
   * @param {object|string} cat
   * @param {object} [opts]
   * @returns {string}
   */
  const render = (cat, opts) => {
    const o = normalize(cat, opts);
    if (!o) return '';
    const fn = VARIANTS[o.variant] || VARIANTS.tile;
    return fn(o);
  };

  /**
   * Render a grid of categories.
   * @param {Array} list
   * @param {object} [opts]
   * @param {'3'|'4'|'wide'|'2'} [opts.columns]
   * @param {string} [opts.className]
   * @param {string} [opts.variant]
   * @returns {string}
   */
  const grid = (list, opts = {}) => {
    const items = toArray(list);
    if (!items.length) return '';
    const { columns = '3', className = '', ...rest } = opts;
    const colClass = {
      '2':    'pub-grid-2',
      '3':    'pub-grid-3',
      '4':    'pub-grid-4',
      wide:   'pub-grid-wide',
    }[columns] || 'pub-grid-3';

    const html = items.map((c, i) => render(c, { ...rest, index: i })).join('');
    return `<div class="${escAttr(cx('pub-grid', colClass, 'pub-category-grid', className))}"
                 role="list">${html}</div>`;
  };

  /**
   * Render categories in a masonry-style multi-column flow.
   * @param {Array} list
   * @param {object} [opts]
   */
  const masonry = (list, opts = {}) => {
    const items = toArray(list);
    if (!items.length) return '';
    const html = items.map((c, i) => render(c, { variant: 'featured', ...opts, index: i })).join('');
    return `<div class="pub-masonry pub-category-masonry">${html}</div>`;
  };

  /**
   * Render N skeleton placeholders.
   * @param {number} [count=6]
   * @param {object} [opts]
   * @returns {string}
   */
  const skeleton = (count = 6, opts = {}) => {
    const { variant = 'tile', className = '' } = opts;
    const cell = `
      <div class="pub-category pub-category-skeleton pub-category-${escAttr(variant)} ${escAttr(className)}"
           aria-hidden="true">
        <span class="pub-skeleton pub-skeleton-image"
              style="width:48px;height:48px;min-height:48px;border-radius:14px"></span>
        <span class="pub-skeleton pub-skeleton-title"
              style="width:70%;max-width:140px;min-height:14px;margin-top:10px"></span>
        <span class="pub-skeleton pub-skeleton-text"
              style="width:44%;max-width:80px;min-height:10px;margin-top:6px"></span>
      </div>`;
    return `<div class="pub-grid pub-grid-3 pub-category-grid" role="status" aria-label="Loading categories">
      ${Array.from({ length: Math.max(1, Math.floor(count)) }, () => cell).join('')}
    </div>`;
  };

  /* ============================================================
     §7. Mount — event dispatch & interaction
     ============================================================ */

  /**
   * Attach category click handlers to a rendered root.
   * Emits `experthub:category:click` for analytics/hook consumers.
   * @param {Element} root
   * @returns {() => void} teardown
   */
  const mount = (root) => {
    if (!root) return () => {};
    const teardowns = [];

    root.querySelectorAll('[data-cat-slug]').forEach((el) => {
      const onClick = (e) => {
        if (el.getAttribute('aria-disabled') === 'true') {
          e.preventDefault();
          return;
        }
        const detail = {
          slug: el.getAttribute('data-cat-slug'),
          name: el.getAttribute('data-cat-name'),
          count: parseInt(el.getAttribute('data-cat-count') || '0', 10) || null,
          href: el.getAttribute('href'),
        };
        root.dispatchEvent(new CustomEvent('experthub:category:click', {
          bubbles: true,
          detail,
        }));
      };
      el.addEventListener('click', onClick);
      teardowns.push(() => el.removeEventListener('click', onClick));
    });

    return () => teardowns.forEach((fn) => { try { fn(); } catch { /* swallow */ } });
  };

  /* ============================================================
     §8. Demo data
     ============================================================ */

  const defaultCategories = () => ([
    { name: 'Web Development', icon: 'fa-solid fa-code',           tint: 'indigo',  count: 320,
      description: 'React, Vue, Node, full-stack bootcamps and more.' },
    { name: 'Data Science',    icon: 'fa-solid fa-chart-line',     tint: 'sky',     count: 184,
      description: 'Python, ML, statistics and real-world projects.' },
    { name: 'Business',        icon: 'fa-solid fa-briefcase',      tint: 'emerald', count: 142,
      description: 'Strategy, marketing, finance and operations.' },
    { name: 'Exam Prep',       icon: 'fa-solid fa-book',           tint: 'amber',   count: 96,
      description: 'IELTS, TOEFL, SAT, GRE and professional certs.' },
    { name: 'Design',          icon: 'fa-solid fa-palette',        tint: 'violet',  count: 88,
      description: 'UI/UX, motion, brand and product design.' },
    { name: 'Languages',       icon: 'fa-solid fa-language',       tint: 'rose',    count: 74,
      description: 'English, Spanish, French, Mandarin and more.' },
    { name: 'Marketing',       icon: 'fa-solid fa-bullhorn',       tint: 'orange',  count: 61,
      description: 'SEO, content, paid ads and growth.' },
    { name: 'Finance',         icon: 'fa-solid fa-coins',          tint: 'lime',    count: 52,
      description: 'Personal finance, investing and accounting.' },
    { name: 'Health & Wellness', icon: 'fa-solid fa-heart-pulse',  tint: 'teal',    count: 47,
      description: 'Nutrition, mental health, fitness and yoga.' },
    { name: 'Photography',     icon: 'fa-solid fa-camera',         tint: 'fuchsia', count: 39,
      description: 'Composition, lighting, editing and storytelling.' },
    { name: 'Music',           icon: 'fa-solid fa-music',          tint: 'cyan',    count: 33,
      description: 'Theory, production, instruments and vocals.' },
    { name: 'Law & Compliance',icon: 'fa-solid fa-scale-balanced', tint: 'slate',   count: 28,
      description: 'Business law, GDPR, contracts and compliance.' },
  ]);

  /* ============================================================
     §9. Export
     ============================================================ */

  /**
   * Backward-compatible entry point.
   * `P.components.categoryCard({ name, icon, tint, count })` still
   * returns a tile, now driven by design tokens instead of inline
   * styles. Pass `opts` for variants / behavior.
   *
   * @param {object|string} cat
   * @param {object} [opts]
   * @returns {string}
   */
  const categoryCard = (cat, opts) => render(cat, opts);

  categoryCard.render      = render;
  categoryCard.grid        = grid;
  categoryCard.masonry     = masonry;
  categoryCard.skeleton    = skeleton;
  categoryCard.mount       = mount;
  categoryCard.defaults    = DEFAULTS;
  categoryCard.tints       = TINTS;
  categoryCard.variants    = Object.keys(VARIANTS);
  categoryCard.defaultCategories = defaultCategories;

  P.components.categoryCard = categoryCard;
})();