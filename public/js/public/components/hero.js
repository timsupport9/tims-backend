/* ============================================================
   ExpertHub — js/public/components/hero.js
   ------------------------------------------------------------------
   Hero section — 5 layout variants + composable subsections.
   Backward-compatible: P.components.hero() still returns HTML.
   ------------------------------------------------------------------
   Public API:
     P.components.hero()                    → default HTML string
     P.components.hero.render(opts)         → HTML string
     P.components.hero.mount(root, opts)    → attach interactivity
     P.components.hero.defaults             → frozen default options
   ------------------------------------------------------------------
   Events dispatched (bubble from root):
     experthub:hero:chip     { detail:{ query } }
     experthub:hero:cta      { detail:{ href, label, index } }
     experthub:hero:stat     { detail:{ label, value } }
   ------------------------------------------------------------------
   @module  PublicUI.components.hero
   @version 3.0.0
   ============================================================ */
(() => {
  'use strict';

  const P = (window.PublicUI = window.PublicUI || {});
  P.components = P.components || {};

  const F = P.format || {};
  const S = P.styles || {};

  /* ============================================================
     §0. Escaping & small utilities
     ============================================================ */

  /** Escape text for HTML insertion. Prefers the canonical helper. */
  const esc = F.escapeHtml || F.esc || ((s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;'));

  /** Escape for attribute values (same rules, explicit name). */
  const escAttr = esc;

  /** Safe href — allowlists protocols. */
  const safeHref = S.safeUrl || ((url) => {
    if (!url) return '#';
    const s = String(url).trim();
    return /^(?:https?:|\/|#|mailto:|tel:|\?)/i.test(s) ? s : '#';
  });

  /** Class-name joiner. */
  const cx = S.cx || ((...parts) => parts.flat().filter(Boolean).join(' '));

  /** Icon tag — prefers styles.icon, falls back inline. */
  const icon = (name, opts = {}) => {
    if (S.icon) return S.icon(name, opts);
    const cls = ['fa', name, opts.className].filter(Boolean).join(' ');
    const aria = opts.ariaLabel
      ? ` role="img" aria-label="${escAttr(opts.ariaLabel)}"`
      : ' aria-hidden="true"';
    return `<i class="${escAttr(cls)}"${aria}></i>`;
  };

  /** Coerce to array. */
  const toArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

  /** Deep-freeze helper (shallow on arrays, one-level on objects). */
  const freeze = (obj) => Object.freeze(obj);

  /* ============================================================
     §1. Defaults
     ============================================================ */

  const DEFAULT_STATS = freeze([
    { value: 2000,  suffix: '+',     label: 'Active learners',   animate: true },
    { value: 150,   suffix: '+',     label: 'Verified experts',  animate: true },
    { value: 4.9,   suffix: ' / 5',  label: 'Average rating',    decimals: 1 },
    { value: 38,    suffix: 'M+',    label: 'Minutes taught',    animate: true, compact: true },
  ]);

  const DEFAULT_CHIPS = freeze([
    'Web development',
    'Data science',
    'IELTS',
    'Business',
    'Design',
  ]);

  const DEFAULT_CTA = freeze([
    { label: 'Get started free', href: '#/register', icon: 'fa-solid fa-rocket',           variant: 'primary' },
    { label: 'I already have an account', href: '#/login', icon: 'fa-solid fa-right-to-bracket', variant: 'secondary' },
  ]);

  const DEFAULT_BADGE = freeze({
    text: 'Trusted by learners, experts and institutions',
    dot: true,
    icon: null,
  });

  const DEFAULT_TITLE = freeze({
    lead: 'Learn, consult and grow with',
    accent: 'real experts',
    trailing: '',
  });

  const DEFAULT_SUBTITLE =
    'ExpertHub combines an E-School, bootcamps, short courses, tuition, ' +
    'exam prep, 1-on-1 consultations and full corporate training in one ' +
    'modern platform.';

  const DEFAULT_CARDS = freeze([
    { icon: 'fa-solid fa-school',           tint: '',        title: 'E-School hub',           desc: 'Bootcamps, courses, tuition and exams' },
    { icon: 'fa-solid fa-comments',         tint: 'green',   title: '1-on-1 consultations',   desc: 'Chat, audio and video calls' },
    { icon: 'fa-solid fa-user-tie',         tint: 'yellow',  title: 'Verified experts',       desc: 'Approved by our admin team' },
    { icon: 'fa-solid fa-building-columns', tint: 'purple',  title: 'Corporate training',     desc: 'Programmes, cohorts, assessments and compliance' },
  ]);

  const DEFAULT_TRUST = freeze({
    text: 'Trusted by 12,000+ teams worldwide',
    avatars: ['ava-1', 'ava-2', 'ava-3', 'ava-4'],
    showAvatars: true,
  });

  /* Frozen public defaults snapshot. */
  const DEFAULTS = freeze({
    variant: 'split',
    id: 'pub-hero',
    className: '',
    ariaLabel: null,          // falls back to `title.lead`
    badge: DEFAULT_BADGE,
    title: DEFAULT_TITLE,
    subtitle: DEFAULT_SUBTITLE,
    search: {
      show: true,
      placeholder: 'Search courses, experts, events…',
      action: '#/courses',
      autofocus: false,
    },
    chips: DEFAULT_CHIPS,
    cta: DEFAULT_CTA,
    stats: DEFAULT_STATS,
    trust: DEFAULT_TRUST,
    visual: {
      type: 'cards',                     // 'cards' | 'image' | 'dashboard' | 'none'
      image: null,
      cards: DEFAULT_CARDS,
    },
    align: 'start',                      // 'start' | 'center'
    animate: true,
    tilt: true,
  });

  /* ============================================================
     §2. Option normalizer
     ============================================================ */

  /**
   * Merge caller options with defaults.
   * @param {object} [opts]
   * @returns {object}
   */
  const normalize = (opts = {}) => {
    const o = { ...DEFAULTS, ...opts };

    // badge: string | object | false
    if (typeof o.badge === 'string') o.badge = { ...DEFAULT_BADGE, text: o.badge };
    else if (o.badge === false) o.badge = null;
    else if (o.badge) o.badge = { ...DEFAULT_BADGE, ...o.badge };

    // title: string | object
    if (typeof o.title === 'string') o.title = { lead: o.title, accent: '', trailing: '' };
    else o.title = { ...DEFAULT_TITLE, ...(o.title || {}) };

    // subtitle: string | null
    if (o.subtitle === false) o.subtitle = null;

    // chips: array of strings | objects | false
    o.chips = o.chips === false ? [] : toArray(o.chips);
    o.chips = o.chips.map((c) =>
      typeof c === 'string' ? { label: c, query: c } : { query: c.label, ...c },
    );

    // cta: array of objects
    o.cta = o.cta === false ? [] : toArray(o.cta);

    // stats: array of objects
    o.stats = o.stats === false ? [] : toArray(o.stats);

    // trust: false | object
    if (o.trust === false) o.trust = null;
    else if (o.trust) o.trust = { ...DEFAULT_TRUST, ...o.trust };

    // visual: false | object
    if (o.visual === false || o.visual?.type === 'none') o.visual = null;
    else o.visual = { ...DEFAULTS.visual, ...(o.visual || {}) };

    // search
    if (o.search === false) o.search = { show: false };
    else o.search = { ...DEFAULTS.search, ...(o.search || {}) };

    return o;
  };

  /* ============================================================
     §3. Sub-renderers
     ============================================================ */

  const renderBadge = (badge) => {
    if (!badge) return '';
    const dot = badge.dot
      ? '<span class="pub-hero-badge-dot" aria-hidden="true"></span>'
      : '';
    const ic = badge.icon ? `${icon(badge.icon)} ` : '';
    return `<span class="pub-hero-badge">${dot}${ic}${esc(badge.text)}</span>`;
  };

  const renderTitle = (title, { level = 1, id } = {}) => {
    const tag = `h${Math.max(1, Math.min(6, level))}`;
    const accent = title.accent
      ? ` <span class="pub-hero-title-accent">${esc(title.accent)}</span>`
      : '';
    const trailing = title.trailing ? ` ${esc(title.trailing)}` : '';
    const idAttr = id ? ` id="${escAttr(id)}"` : '';
    return `<${tag}${idAttr} class="pub-hero-title">${esc(title.lead)}${accent}${trailing}</${tag}>`;
  };

  const renderSubtitle = (subtitle) =>
    subtitle ? `<p class="pub-hero-subtitle">${esc(subtitle)}</p>` : '';

  const renderSearch = (search) => {
    if (!search || search.show === false) return '';

    // Prefer the shared search component when available.
    if (P.components.search && typeof P.components.search === 'function') {
      try {
        return P.components.search({
          placeholder: search.placeholder,
          action: search.action,
          autofocus: search.autofocus,
          variant: 'hero',
        });
      } catch {
        /* fall through to inline search */
      }
    }

    // Inline fallback.
    return `
      <form class="pub-search" role="search" data-hero-search
            action="${escAttr(search.action)}" method="get">
        ${icon('fa-solid fa-magnifying-glass')}
        <input type="search" name="q" autocomplete="off"
               placeholder="${escAttr(search.placeholder)}"
               ${search.autofocus ? 'autofocus' : ''}
               aria-label="Search">
        <button type="submit" class="btn btn-primary">Search</button>
      </form>
    `;
  };

  const renderChips = (chips, { label = 'Suggested searches' } = {}) => {
    if (!chips.length) return '';
    const items = chips
      .map((c) =>
        `<button type="button" class="pub-chip" data-action="chip"
                 data-query="${escAttr(c.query)}">${esc(c.label)}</button>`,
      )
      .join('');
    return `
      <div class="pub-chips" role="group" aria-label="${escAttr(label)}">
        ${items}
      </div>
    `;
  };

  const renderCta = (ctas) => {
    if (!ctas.length) return '';
    const items = ctas
      .map((c, i) => {
        const href = safeHref(c.href);
        const cls = cx('btn', `btn-${c.variant || 'primary'}`, c.className);
        const ic = c.icon ? `${icon(c.icon)} ` : '';
        return `<a class="${escAttr(cls)}" href="${escAttr(href)}"
                   data-hero-cta data-cta-index="${i}"
                   data-cta-label="${escAttr(c.label)}">${ic}${esc(c.label)}</a>`;
      })
      .join('');
    return `<div class="pub-hero-cta">${items}</div>`;
  };

  /**
   * Format a stat value for display, tracking animation data.
   * Returns { display, animateTo, decimals, suffix, prefix }
   */
  const statValue = (s) => {
    const numeric = typeof s.value === 'number' && Number.isFinite(s.value);
    const prefix = s.prefix ?? '';
    const suffix = s.suffix ?? '';
    const decimals = s.decimals ?? (Number.isInteger(s.value) ? 0 : 1);

    if (!numeric) {
      return { display: `${prefix}${esc(String(s.value ?? ''))}${suffix}`, animateTo: null };
    }
    const formatted = s.compact && F.compact
      ? F.compact(s.value)
      : s.value.toFixed(decimals);
    return {
      display: `${prefix}${formatted}${suffix}`,
      animateTo: s.animate !== false ? s.value : null,
      decimals,
      prefix,
      suffix,
    };
  };

  const renderStats = (stats) => {
    if (!stats.length) return '';
    const items = stats
      .map((s, i) => {
        const v = statValue(s);
        const dataAttr = v.animateTo !== null
          ? ` data-counter-to="${v.animateTo}"
               data-counter-decimals="${v.decimals}"
               data-counter-prefix="${escAttr(v.prefix)}"
               data-counter-suffix="${escAttr(v.suffix)}"`
          : '';
        return `
          <div data-hero-stat data-stat-index="${i}">
            <div class="pub-hero-stat-value"${dataAttr}>${v.display}</div>
            <div class="pub-hero-stat-label">${esc(s.label)}</div>
          </div>
        `;
      })
      .join('');
    return `<div class="pub-hero-stats">${items}</div>`;
  };

  const renderTrust = (trust) => {
    if (!trust) return '';
    const avatarSrc = S.avatar || ((seed, size) => `https://i.pravatar.cc/${size || 64}?u=${encodeURIComponent(seed)}`);
    const avatars = trust.showAvatars
      ? `<div class="pub-hero-avatars" aria-hidden="true">
           ${trust.avatars
             .slice(0, 5)
             .map((seed) => `<img src="${escAttr(avatarSrc(seed, 64))}" alt="" loading="lazy" decoding="async" width="34" height="34">`)
             .join('')}
         </div>`
      : '';
    return `<div class="pub-hero-trust">${avatars}<span>${esc(trust.text)}</span></div>`;
  };

  const renderHeroRow = (row) => {
    const tint = row.tint ? ` is-${escAttr(row.tint)}` : '';
    const ic = row.icon ? icon(row.icon) : '';
    return `
      <div class="pub-hero-card-row">
        <div class="pub-hero-card-icon${tint}">${ic}</div>
        <div>
          <div class="pub-hero-card-title">${esc(row.title)}</div>
          <div class="pub-hero-card-desc">${esc(row.desc)}</div>
        </div>
      </div>
    `;
  };

  const renderCards = (cards) => {
    if (!cards.length) return '';
    // Group into columns of max 3 rows.
    const groups = [];
    for (let i = 0; i < cards.length; i += 3) groups.push(cards.slice(i, i + 3));
    return groups
      .map((group) => `<div class="pub-hero-card">${group.map(renderHeroRow).join('')}</div>`)
      .join('');
  };

  const renderVisual = (visual) => {
    if (!visual) return '';

    if (visual.type === 'image') {
      const src = visual.image || (S.photo ? S.photo('hero-visual', 1200, 820) : '');
      if (!src) return '';
      return `
        <div class="pub-hero-visual" data-hero-visual data-tilt>
          <img src="${escAttr(src)}" alt="" width="1200" height="820"
               loading="eager" fetchpriority="high" decoding="async">
        </div>
      `;
    }

    if (visual.type === 'dashboard') {
      return `
        <div class="pub-hero-visual pub-hero-dashboard" data-hero-visual data-tilt>
          <div class="pub-hero-dashboard-bar">
            <span class="pub-hero-dashboard-dot"></span>
            <span class="pub-hero-dashboard-dot"></span>
            <span class="pub-hero-dashboard-dot"></span>
          </div>
          <div class="pub-hero-dashboard-body">
            ${renderCards(visual.cards)}
          </div>
        </div>
      `;
    }

    // 'cards' (default)
    return `
      <div class="pub-hero-visual pub-hero-visual-cards"
           data-hero-visual ${DEFAULTS.tilt ? 'data-tilt' : ''}>
        ${renderCards(visual.cards)}
      </div>
    `;
  };

  /* ============================================================
     §4. Variant renderers
     ============================================================ */

  const wrap = (inner, { id, className, ariaLabel, align, variant }) => {
    const labelAttr = ariaLabel
      ? ` aria-label="${escAttr(ariaLabel)}"`
      : ' aria-labelledby="pub-hero-title"';
    return `
      <section id="${escAttr(id)}" class="${escAttr(cx('pub-hero', `pub-hero-${variant}`, `is-align-${align}`, className))}"
               data-hero-variant="${escAttr(variant)}"${labelAttr}>
        ${inner}
      </section>
    `;
  };

  const buildCopy = (o, titleId) => `
    ${renderBadge(o.badge)}
    ${renderTitle(o.title, { id: titleId })}
    ${renderSubtitle(o.subtitle)}
    ${renderSearch(o.search)}
    ${renderChips(o.chips)}
    ${renderCta(o.cta)}
    ${renderStats(o.stats)}
    ${renderTrust(o.trust)}
  `;

  const variantSplit = (o) => wrap(`
    <div class="pub-hero-copy">${buildCopy(o, 'pub-hero-title')}</div>
    ${renderVisual(o.visual) || ''}
  `, { ...o, variant: 'split' });

  const variantCentered = (o) => wrap(`
    <div class="pub-hero-copy">${buildCopy(o, 'pub-hero-title')}</div>
  `, { ...o, variant: 'centered' });

  const variantMinimal = (o) => wrap(`
    <div class="pub-hero-copy">
      ${renderBadge(o.badge)}
      ${renderTitle(o.title, { id: 'pub-hero-title', level: 1 })}
      ${renderSubtitle(o.subtitle)}
      ${renderSearch(o.search)}
    </div>
  `, { ...o, variant: 'minimal' });

  const variantDashboard = (o) => {
    const visual = { ...(o.visual || {}), type: 'dashboard' };
    return wrap(`
      <div class="pub-hero-copy">${buildCopy(o, 'pub-hero-title')}</div>
      ${renderVisual(visual)}
    `, { ...o, variant: 'dashboard' });
  };

  const variantFullbleed = (o) => wrap(`
    <div class="pub-hero-visual" data-hero-visual data-tilt>
      ${o.visual?.image
        ? `<img src="${escAttr(o.visual.image)}" alt="" width="1920" height="1080"
                loading="eager" fetchpriority="high" decoding="async">`
        : ''}
      <div class="pub-hero-overlay">
        <div class="pub-hero-copy">${buildCopy(o, 'pub-hero-title')}</div>
      </div>
    </div>
  `, { ...o, variant: 'fullbleed' });

  const VARIANTS = {
    split: variantSplit,
    centered: variantCentered,
    minimal: variantMinimal,
    dashboard: variantDashboard,
    fullbleed: variantFullbleed,
  };

  /* ============================================================
     §5. Main render
     ============================================================ */

  /**
   * Render the hero HTML.
   * @param {object} [opts]
   * @returns {string}
   */
  const render = (opts) => {
    const o = normalize(opts);
    const fn = VARIANTS[o.variant] || VARIANTS.split;
    return fn(o);
  };

  /* ============================================================
     §6. Mount — interactivity
     ============================================================ */

  /**
   * Attach hero interactivity to a rendered root element.
   * @param {Element} root
   * @param {object} [opts]
   * @returns {() => void} teardown
   */
  const mount = (root, opts = {}) => {
    if (!root) return () => {};
    const o = normalize(opts);
    const teardowns = [];

    /* -- 6.1 Reveal on view -- */
    if (o.animate && !P.bind?.prefersReducedMotion?.()) {
      const targets = root.querySelectorAll(
        '.pub-hero-copy, .pub-hero-visual, .pub-hero-card, .pub-hero-stat-value',
      );
      targets.forEach((el) => el.classList.add('pub-reveal'));
      requestAnimationFrame(() => root.classList.add('pub-reveal-ready'));

      if (P.bind?.onVisible) {
        P.bind.onVisible(root, () => {
          root.classList.add('pub-reveal-in');
        }, { threshold: 0.12 });
      } else {
        root.classList.add('pub-reveal-in');
      }
    }

    /* -- 6.2 Animated counters -- */
    const counters = root.querySelectorAll('[data-counter-to]');
    if (counters.length) {
      const animateOne = (el) => {
        if (el.dataset.done === '1') return;
        const to = parseFloat(el.getAttribute('data-counter-to'));
        const decimals = parseInt(el.getAttribute('data-counter-decimals') || '0', 10);
        const prefix = el.getAttribute('data-counter-prefix') || '';
        const suffix = el.getAttribute('data-counter-suffix') || '';
        if (!Number.isFinite(to)) return;
        el.dataset.done = '1';

        if (P.bind?.prefersReducedMotion?.()) {
          el.textContent = `${prefix}${to.toFixed(decimals)}${suffix}`;
          return;
        }

        const duration = 1200;
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const current = to * eased;
          el.textContent = `${prefix}${current.toFixed(decimals)}${suffix}`;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };

      if (P.bind?.onVisible) {
        counters.forEach((el) => P.bind.onVisible(el, () => animateOne(el), { threshold: 0.4 }));
      } else {
        counters.forEach(animateOne);
      }
    }

    /* -- 6.3 Parallax tilt on visual -- */
    if (o.tilt && !P.bind?.prefersReducedMotion?.() && P.bind?.raf) {
      root.querySelectorAll('[data-tilt]').forEach((el) => {
        const onMove = P.bind.raf((e) => {
          const rect = el.getBoundingClientRect();
          const cx = (e.clientX - rect.left) / rect.width - 0.5;
          const cy = (e.clientY - rect.top) / rect.height - 0.5;
          const rx = (-cy * 4).toFixed(2);
          const ry = (cx * 4).toFixed(2);
          el.style.setProperty('--tilt-x', `${ry}deg`);
          el.style.setProperty('--tilt-y', `${rx}deg`);
        });
        const onLeave = () => {
          el.style.removeProperty('--tilt-x');
          el.style.removeProperty('--tilt-y');
        };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        teardowns.push(() => {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        });
      });
    }

    /* -- 6.4 Chip clicks → dispatch + populate search -- */
    root.querySelectorAll('[data-action="chip"]').forEach((chip) => {
      const onClick = () => {
        const query = chip.getAttribute('data-query') || '';
        // Wire into the local search box if present.
        const input = root.querySelector('[data-hero-search] input[name="q"], .pub-search input[name="q"]');
        if (input) {
          input.value = query;
          input.focus();
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const form = input.closest('form');
          if (form?.requestSubmit) form.requestSubmit();
          else form?.submit?.();
        }
        root.dispatchEvent(new CustomEvent('experthub:hero:chip', {
          bubbles: true,
          detail: { query, element: chip },
        }));
      };
      chip.addEventListener('click', onClick);
      teardowns.push(() => chip.removeEventListener('click', onClick));
    });

    /* -- 6.5 CTA click → dispatch (navigation is native) -- */
    root.querySelectorAll('[data-hero-cta]').forEach((el) => {
      const onClick = () => {
        root.dispatchEvent(new CustomEvent('experthub:hero:cta', {
          bubbles: true,
          detail: {
            href: el.getAttribute('href'),
            label: el.getAttribute('data-cta-label'),
            index: parseInt(el.getAttribute('data-cta-index') || '0', 10),
          },
        }));
      };
      el.addEventListener('click', onClick);
      teardowns.push(() => el.removeEventListener('click', onClick));
    });

    /* -- 6.6 Stat click → dispatch -- */
    root.querySelectorAll('[data-hero-stat]').forEach((el) => {
      const onClick = () => {
        const idx = parseInt(el.getAttribute('data-stat-index') || '0', 10);
        const stat = (o.stats || [])[idx];
        if (!stat) return;
        root.dispatchEvent(new CustomEvent('experthub:hero:stat', {
          bubbles: true,
          detail: { index: idx, label: stat.label, value: stat.value },
        }));
      };
      el.addEventListener('click', onClick);
      teardowns.push(() => el.removeEventListener('click', onClick));
    });

    /* -- 6.7 Search submit fallback (hash-based) -- */
    const searchForm = root.querySelector('[data-hero-search]');
    if (searchForm) {
      const onSubmit = (e) => {
        e.preventDefault();
        const q = (searchForm.querySelector('input[name="q"]') || {}).value || '';
        const action = searchForm.getAttribute('action') || '#/courses';
        location.hash = action + (q ? `?q=${encodeURIComponent(q.trim())}` : '');
      };
      searchForm.addEventListener('submit', onSubmit);
      teardowns.push(() => searchForm.removeEventListener('submit', onSubmit));
    }

    return () => teardowns.forEach((fn) => { try { fn(); } catch { /* swallow */ } });
  };

  /* ============================================================
     §7. Public export (backward-compatible + extended)
     ============================================================ */

  /**
   * Public entrypoint.
   *
   * Backward-compatible: called with no arguments it returns the
   * same default hero HTML the original file produced. Pass an
   * options object to customise.
   *
   * @param {object} [opts]
   * @returns {string}
   */
  const hero = (opts) => render(opts);

  hero.render   = render;
  hero.mount    = mount;
  hero.defaults = DEFAULTS;
  hero.variants = Object.keys(VARIANTS);

  /* Auto-mount convenience: if a hero is already in the DOM with
     `[data-hero-automount]`, wire it up on DOM ready. */
  const autoMount = () => {
    document.querySelectorAll('[data-hero-automount]').forEach((el) => {
      hero.mount(el);
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  } else {
    autoMount();
  }

  P.components.hero = hero;
})();