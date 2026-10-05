/* ============================================================
   ExpertHub 2.0 — 07-landing.js
   Public "front door" for ExpertHub.

   Responsibilities
   ----------------
   • Landing page ............ hero + unified search + live discovery
   • Discovery pages ......... courses, experts, events, resources
   • Detail pages ............ course, expert, event
   • Info pages .............. about, contact, institutions
   • Unified public search ... courses + experts + events + resources
   • Service layer ........... Course/Expert/Event/Resource/Search services

   Router wiring (add to 15-router.js)
   -----------------------------------
     const page = window.Landing && window.Landing.handleRoute(location.hash);
     if (page) return;                    // handled by the front door

   Routes owned by this file
   -------------------------
     #/                      renderLanding()
     #/courses               renderPublicCourses()
     #/courses/:id           renderCourseDetail(id)
     #/experts               renderPublicExperts()
     #/experts/:id           renderExpertDetail(id)
     #/events                renderPublicEvents()
     #/events/:id            renderEventDetail(id)
     #/resources             renderPublicResources()
     #/about                 renderAbout()
     #/contact               renderContact()
     #/institutions          renderInstitutions()

   The whole file is wrapped in an IIFE and publishes its public API on
   `window.Landing`, so it never collides with the other 14 app modules.
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     0. LOCAL UTILITIES
     ========================================================== */
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pick(obj) {
    if (!obj) return undefined;
    for (var i = 1; i < arguments.length; i++) {
      var k = arguments[i];
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return undefined;
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }

  function fmtMoney(amount, currency) {
    var n = num(amount, 0);
    if (!n) return 'Free';
    var cur = (currency || 'USD').toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency', currency: cur, maximumFractionDigits: n % 1 ? 2 : 0
      }).format(n);
    } catch (_) {
      return cur + ' ' + n.toLocaleString();
    }
  }

  function fmtDate(iso) {
    if (!iso) return 'Date TBA';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    try {
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) {
      return d.toDateString();
    }
  }

  function fmtDateTime(iso) {
    if (!iso) return 'Date TBA';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    try {
      return d.toLocaleString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (_) { return d.toString(); }
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join('') || '?';
  }

  function avatarUrl(name, bg) {
    var safe = encodeURIComponent(name || 'ExpertHub');
    var colour = (bg || '6366f1').replace('#', '');
    return 'https://ui-avatars.com/api/?background=' + colour + '&color=fff&bold=true&name=' + safe;
  }

  function safeImage(url, fallbackName) {
    if (url && /^(https?:|\/|data:)/i.test(url)) return url;
    return avatarUrl(fallbackName || 'ExpertHub');
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function cleanParams(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      if (v !== undefined && v !== null && v !== '' && v !== 'all') out[k] = v;
    });
    return out;
  }

  function setPhase(phase) {
    try { appPhase = phase; }
    catch (_) { try { window.appPhase = phase; } catch (__) {} }
  }

  function isAuthed() {
    try {
      if (window.S && (S.user || S.token || S.accessToken)) return true;
    } catch (_) {}
    try { return !!localStorage.getItem('token'); } catch (_) { return false; }
  }

  /* ==========================================================
     1. STYLES  (injected once — keeps this file drop-in safe)
     ========================================================== */
  var STYLE_ID = 'expertHub-landing-styles';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      /* nav */
      '.lp-nav{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 24px;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(15,23,42,.08)}',
      '.dark .lp-nav{background:rgba(17,24,39,.88);border-bottom-color:rgba(255,255,255,.08)}',
      '.lp-nav-links{display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
      '.lp-nav-link{background:none;border:0;cursor:pointer;font:inherit;font-size:.9rem;font-weight:600;color:inherit;opacity:.72;padding:8px 12px;border-radius:10px;transition:.18s}',
      '.lp-nav-link:hover{opacity:1;background:rgba(99,102,241,.1)}',
      '.lp-nav-link.is-active{opacity:1;color:#6366f1}',
      '@media(max-width:900px){.lp-nav-links{display:none}}',

      /* hero */
      '.lp-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:center;max-width:1200px;margin:0 auto;padding:72px 24px 48px}',
      '@media(max-width:980px){.lp-hero{grid-template-columns:1fr;gap:40px;padding-top:48px}}',
      '.lp-badge{display:inline-flex;align-items:center;gap:8px;font-size:.78rem;font-weight:700;letter-spacing:.02em;text-transform:uppercase;padding:7px 14px;border-radius:999px;background:rgba(99,102,241,.12);color:#4f46e5;margin-bottom:20px}',
      '.lp-hero-title{font-size:clamp(2.1rem,5vw,3.5rem);line-height:1.08;font-weight:800;letter-spacing:-.03em;margin:0 0 18px}',
      '.lp-accent{background:linear-gradient(120deg,#6366f1,#0ea5e9);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.lp-hero-sub{font-size:1.06rem;line-height:1.65;opacity:.72;max-width:56ch;margin:0 0 26px}',

      /* unified search */
      '.lp-search{position:relative;display:flex;align-items:center;gap:10px;background:#fff;border:1.5px solid rgba(15,23,42,.1);border-radius:16px;padding:8px 8px 8px 18px;max-width:620px;box-shadow:0 12px 32px -18px rgba(15,23,42,.35);transition:.2s}',
      '.dark .lp-search{background:#111827;border-color:rgba(255,255,255,.12)}',
      '.lp-search:focus-within{border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.14)}',
      '.lp-search>i{opacity:.45}',
      '.lp-search input{flex:1;border:0;outline:0;background:transparent;font:inherit;font-size:.98rem;padding:10px 0;color:inherit;min-width:0}',
      '.lp-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
      '.lp-chip{border:1px solid rgba(15,23,42,.12);background:transparent;color:inherit;font:inherit;font-size:.8rem;font-weight:600;padding:6px 12px;border-radius:999px;cursor:pointer;opacity:.75;transition:.18s}',
      '.lp-chip:hover{opacity:1;border-color:#6366f1;color:#6366f1}',
      '.lp-search-results{position:absolute;top:calc(100% + 10px);left:0;right:0;background:#fff;border:1px solid rgba(15,23,42,.1);border-radius:16px;box-shadow:0 24px 60px -24px rgba(15,23,42,.45);max-height:64vh;overflow:auto;z-index:60;padding:8px}',
      '.dark .lp-search-results{background:#111827;border-color:rgba(255,255,255,.12)}',
      '.lp-sr-group{padding:8px 10px 4px;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.45}',
      '.lp-sr-item{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:none;border:0;font:inherit;color:inherit;padding:10px;border-radius:12px;cursor:pointer}',
      '.lp-sr-item:hover{background:rgba(99,102,241,.09)}',
      '.lp-sr-item img{width:38px;height:38px;border-radius:10px;object-fit:cover;flex:none}',
      '.lp-sr-item b{display:block;font-size:.9rem;font-weight:650}',
      '.lp-sr-item span{display:block;font-size:.76rem;opacity:.6}',
      '.lp-sr-empty{padding:26px 16px;text-align:center;font-size:.88rem;opacity:.6}',

      /* cards / grids */
      '.lp-grid{display:grid;gap:20px}',
      '.lp-grid-3{grid-template-columns:repeat(auto-fill,minmax(290px,1fr))}',
      '.lp-grid-4{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}',
      '.lp-card{display:flex;flex-direction:column;background:var(--surface,#fff);border:1px solid rgba(15,23,42,.09);border-radius:18px;overflow:hidden;transition:transform .2s,box-shadow .2s;text-align:left}',
      '.dark .lp-card{background:#111827;border-color:rgba(255,255,255,.1)}',
      '.lp-card:hover{transform:translateY(-3px);box-shadow:0 22px 44px -26px rgba(15,23,42,.5)}',
      '.lp-card-media{position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,#6366f1,#0ea5e9);overflow:hidden}',
      '.lp-card-media img{width:100%;height:100%;object-fit:cover;display:block}',
      '.lp-card-tag{position:absolute;top:10px;left:10px;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.92);color:#111827}',
      '.lp-card-price{position:absolute;top:10px;right:10px;font-size:.75rem;font-weight:800;padding:5px 10px;border-radius:999px;background:#6366f1;color:#fff}',
      '.lp-card-body{padding:16px 16px 18px;display:flex;flex-direction:column;gap:8px;flex:1}',
      '.lp-card-title{font-size:1rem;font-weight:700;line-height:1.35;margin:0}',
      '.lp-card-text{font-size:.85rem;line-height:1.55;opacity:.66;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.lp-card-meta{display:flex;align-items:center;gap:10px;font-size:.76rem;opacity:.62;margin-top:auto;padding-top:10px;flex-wrap:wrap}',
      '.lp-card-meta i{opacity:.8}',
      '.lp-author{display:flex;align-items:center;gap:9px}',
      '.lp-author img{width:26px;height:26px;border-radius:50%;object-fit:cover}',
      '.lp-verified{color:#10b981;font-size:.78rem}',

      /* expert card */
      '.lp-expert{align-items:center;text-align:center;padding:26px 18px}',
      '.lp-expert img.lp-expert-avatar{width:78px;height:78px;border-radius:50%;object-fit:cover;margin-bottom:12px}',
      '.lp-expert h3{margin:0 0 4px;font-size:1rem}',
      '.lp-expert .lp-expert-role{font-size:.82rem;opacity:.62;margin:0 0 10px}',
      '.lp-tags{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:12px}',
      '.lp-tag{font-size:.7rem;font-weight:600;padding:4px 9px;border-radius:999px;background:rgba(99,102,241,.12);color:#4f46e5}',
      '.lp-stars{color:#f59e0b;font-size:.8rem;margin-bottom:12px}',

      /* event / resource rows */
      '.lp-row-card{display:flex;gap:16px;align-items:center;padding:16px;border-radius:16px;border:1px solid rgba(15,23,42,.09);background:var(--surface,#fff)}',
      '.dark .lp-row-card{background:#111827;border-color:rgba(255,255,255,.1)}',
      '.lp-date-chip{flex:none;width:58px;height:58px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05}',
      '.lp-date-chip b{font-size:1.15rem;font-weight:800}',
      '.lp-date-chip span{font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;opacity:.85}',

      /* skeleton + states */
      '.lp-skel{border-radius:18px;background:linear-gradient(90deg,rgba(148,163,184,.16) 25%,rgba(148,163,184,.28) 37%,rgba(148,163,184,.16) 63%);background-size:400% 100%;animation:lpShimmer 1.3s ease-in-out infinite;min-height:220px}',
      '@keyframes lpShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}',
      '.lp-empty{padding:44px 20px;text-align:center;border:1px dashed rgba(15,23,42,.18);border-radius:18px;opacity:.72}',
      '.lp-empty i{font-size:1.6rem;margin-bottom:10px;display:block;opacity:.5}',
      '.lp-notice{display:flex;align-items:center;gap:10px;font-size:.82rem;padding:10px 14px;border-radius:12px;background:rgba(245,158,11,.12);color:#b45309;margin-bottom:18px}',

      /* section helpers */
      '.lp-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:26px}',
      '.lp-link{background:none;border:0;font:inherit;font-weight:700;color:#6366f1;cursor:pointer;font-size:.9rem;display:inline-flex;align-items:center;gap:7px}',
      '.lp-link:hover{text-decoration:underline}',

      /* CTA band + footer */
      '.lp-cta{max-width:1080px;margin:0 auto;padding:48px 32px;border-radius:26px;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#fff;text-align:center}',
      '.lp-cta h2{margin:0 0 10px;font-size:clamp(1.5rem,3vw,2.2rem);font-weight:800}',
      '.lp-cta p{margin:0 auto 24px;max-width:56ch;opacity:.9}',
      '.lp-footer{max-width:1200px;margin:0 auto;padding:44px 24px 60px;display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:32px;font-size:.88rem}',
      '@media(max-width:800px){.lp-footer{grid-template-columns:1fr 1fr}}',
      '.lp-footer h4{margin:0 0 12px;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;opacity:.5}',
      '.lp-footer ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}',
      '.lp-footer button{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;opacity:.75;text-align:left}',
      '.lp-footer button:hover{opacity:1;color:#6366f1}',
      '.lp-copy{grid-column:1/-1;border-top:1px solid rgba(15,23,42,.1);padding-top:20px;opacity:.55;font-size:.82rem}',

      /* detail pages */
      '.lp-page{max-width:1120px;margin:0 auto;padding:44px 24px 72px}',
      '.lp-detail-hero{display:grid;grid-template-columns:1.2fr .8fr;gap:36px;align-items:start;margin-bottom:40px}',
      '@media(max-width:900px){.lp-detail-hero{grid-template-columns:1fr}}',
      '.lp-detail-cover{border-radius:20px;overflow:hidden;aspect-ratio:16/9;background:linear-gradient(135deg,#6366f1,#0ea5e9)}',
      '.lp-detail-cover img{width:100%;height:100%;object-fit:cover;display:block}',
      '.lp-side{position:sticky;top:92px;border:1px solid rgba(15,23,42,.1);border-radius:20px;padding:22px;background:var(--surface,#fff);display:flex;flex-direction:column;gap:14px}',
      '.dark .lp-side{background:#111827;border-color:rgba(255,255,255,.1)}',
      '.lp-side-price{font-size:1.9rem;font-weight:800}',
      '.lp-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}',
      '.lp-list li{display:flex;gap:11px;align-items:flex-start;font-size:.92rem;line-height:1.55}',
      '.lp-list i{color:#10b981;margin-top:4px}',

      /* forms */
      '.lp-form{display:grid;gap:14px;max-width:620px}',
      '.lp-field{display:flex;flex-direction:column;gap:6px}',
      '.lp-field label{font-size:.8rem;font-weight:700;opacity:.7}',
      '.lp-field input,.lp-field textarea,.lp-field select{font:inherit;padding:12px 14px;border-radius:12px;border:1.5px solid rgba(15,23,42,.12);background:var(--surface,#fff);color:inherit;outline:0;transition:.18s;width:100%;box-sizing:border-box}',
      '.dark .lp-field input,.dark .lp-field textarea,.dark .lp-field select{background:#111827;border-color:rgba(255,255,255,.14)}',
      '.lp-field input:focus,.lp-field textarea:focus,.lp-field select:focus{border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.13)}'
    ].join('\n');

    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ==========================================================
     2. SERVICE LAYER
     ----------------------------------------------------------
     landingRequest → services → render functions.
     Every service degrades gracefully to bundled demo data so the
     front door never renders an empty shell if the API is down.
     ========================================================== */
  var API_BASE = (function () {
    var c = window.CONFIG || {};
    var base = c.API_BASE || c.API_URL || c.API_BASE_URL || c.baseUrl || window.API_BASE ||
               'https://timbackend-ylc0.onrender.com/api';
    return String(base).replace(/\/+$/, '');
  })();

  function authToken() {
    try {
      if (window.S) {
        var t = S.token || S.accessToken || (S.auth && S.auth.token);
        if (t) return t;
      }
    } catch (_) {}
    try {
      return localStorage.getItem('token') || localStorage.getItem('expertHubToken') || null;
    } catch (_) { return null; }
  }

  async function landingRequest(path, opts) {
    opts = opts || {};
    var url = /^https?:\/\//i.test(path)
      ? path
      : API_BASE + (path.charAt(0) === '/' ? path : '/' + path);

    var headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
    var token = authToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    var init = { method: opts.method || 'GET', headers: headers, credentials: 'include' };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    if (opts.signal) init.signal = opts.signal;

    var res = await fetch(url, init);
    var text = await res.text();
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }

    if (!res.ok) {
      var err = new Error(
        (data && (data.message || data.error || data.detail)) || ('Request failed (' + res.status + ')')
      );
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  /** Pull an array out of whatever envelope the API uses. */
  function listOf(payload, keys) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;

    var d = payload.data !== undefined ? payload.data : payload;
    if (Array.isArray(d)) return d;

    var candidates = ['items', 'results', 'rows', 'records', 'docs'].concat(keys || []);
    for (var i = 0; i < candidates.length; i++) {
      if (d && Array.isArray(d[candidates[i]])) return d[candidates[i]];
    }
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }

  function oneOf(payload, keys) {
    if (!payload) return null;
    var d = payload.data !== undefined ? payload.data : payload;
    if (Array.isArray(d)) return d[0] || null;
    for (var i = 0; i < (keys || []).length; i++) {
      if (d && d[keys[i]]) return d[keys[i]];
    }
    return d && typeof d === 'object' ? d : null;
  }

  /* ---------- tiny TTL cache ---------- */
  var cache = new Map();

  function cached(key, ttlMs, loader) {
    var hit = cache.get(key);
    var now = Date.now();
    if (hit && now - hit.t < ttlMs) return Promise.resolve(hit.v);
    return loader().then(function (v) {
      cache.set(key, { t: now, v: v });
      return v;
    });
  }

  function invalidateCache(prefix) {
    if (!prefix) { cache.clear(); return; }
    Array.from(cache.keys()).forEach(function (k) {
      if (k.indexOf(prefix) === 0) cache.delete(k);
    });
  }

  /* ---------- normalisers ---------- */
  function normalizeExpert(raw) {
    raw = raw || {};
    var user = raw.user || raw.profile || raw.account || {};
    var name = pick(raw, 'name', 'fullName', 'displayName') ||
               pick(user, 'name', 'fullName', 'displayName') || 'ExpertHub Expert';
    return {
      id: pick(raw, 'id', '_id', 'slug', 'userId'),
      name: name,
      avatar: pick(raw, 'avatar', 'avatarUrl', 'photo', 'image') ||
              pick(user, 'avatar', 'avatarUrl', 'photo') || '',
      headline: pick(raw, 'headline', 'title', 'bio', 'tagline', 'description', 'about') || '',
      specializations: (function () {
        var s = pick(raw, 'specializations', 'specialities', 'skills', 'expertise', 'tags');
        if (Array.isArray(s)) return s.map(function (x) { return typeof x === 'string' ? x : (x.name || x.title); }).filter(Boolean);
        if (typeof s === 'string') return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        var cat = pick(raw, 'category', 'field', 'industry');
        return cat ? [cat] : [];
      })(),
      rating: num(pick(raw, 'rating', 'averageRating', 'avgRating'), 0),
      reviews: num(pick(raw, 'reviews', 'reviewsCount', 'ratingCount'), 0),
      sessions: num(pick(raw, 'sessions', 'sessionsCount', 'consultations'), 0),
      rate: num(pick(raw, 'hourlyRate', 'rate', 'price', 'consultationFee'), 0),
      currency: pick(raw, 'currency') || 'USD',
      verified: !!(pick(raw, 'verified', 'isVerified', 'approved') || raw.status === 'approved'),
      experienceYears: num(pick(raw, 'experienceYears', 'yearsOfExperience', 'experience'), 0)
    };
  }

  function normalizeCourse(raw) {
    raw = raw || {};
    var expertRaw = raw.expert || raw.instructor || raw.tutor || raw.owner || raw.teacher || {};
    var expert = normalizeExpert(expertRaw);
    return {
      id: pick(raw, 'id', '_id', 'slug'),
      title: pick(raw, 'title', 'name', 'courseName') || 'Untitled course',
      summary: pick(raw, 'summary', 'shortDescription', 'excerpt', 'description', 'overview') || '',
      thumbnail: pick(raw, 'thumbnail', 'image', 'cover', 'coverImage', 'imageUrl', 'banner') || '',
      category: pick(raw, 'category', 'categoryName', 'subject', 'field') || 'General',
      level: pick(raw, 'level', 'difficulty', 'skillLevel') || 'All levels',
      price: num(pick(raw, 'price', 'amount', 'fee', 'cost'), 0),
      currency: pick(raw, 'currency') || 'USD',
      rating: num(pick(raw, 'rating', 'averageRating', 'avgRating'), 0),
      ratingCount: num(pick(raw, 'ratingCount', 'reviewsCount', 'reviews'), 0),
      durationWeeks: num(pick(raw, 'durationWeeks', 'weeks'), 0) || null,
      durationLabel: pick(raw, 'duration', 'durationLabel') || null,
      lessons: num(pick(raw, 'lessons', 'lessonsCount', 'modules'), 0) || null,
      learners: num(pick(raw, 'learners', 'enrollments', 'studentsCount', 'students'), 0),
      expert: expert,
      type: pick(raw, 'type', 'courseType', 'format') || 'Course'
    };
  }

  function normalizeEvent(raw) {
    raw = raw || {};
    var host = normalizeExpert(raw.host || raw.organizer || raw.expert || {});
    return {
      id: pick(raw, 'id', '_id', 'slug'),
      title: pick(raw, 'title', 'name') || 'ExpertHub event',
      summary: pick(raw, 'summary', 'description', 'excerpt', 'about') || '',
      cover: pick(raw, 'cover', 'image', 'banner', 'thumbnail') || '',
      startsAt: pick(raw, 'startsAt', 'startDate', 'startTime', 'date', 'starts_at'),
      endsAt: pick(raw, 'endsAt', 'endDate', 'endTime', 'ends_at'),
      mode: (function () {
        var m = pick(raw, 'mode', 'format', 'type', 'deliveryMode');
        if (m) return String(m).toLowerCase();
        return pick(raw, 'location', 'venue') ? 'physical' : 'online';
      })(),
      location: pick(raw, 'location', 'venue', 'address', 'city') || '',
      meetingUrl: pick(raw, 'meetingUrl', 'joinUrl', 'link') || '',
      price: num(pick(raw, 'price', 'amount', 'fee'), 0),
      currency: pick(raw, 'currency') || 'USD',
      seats: num(pick(raw, 'seats', 'capacity', 'seatsTotal'), 0) || null,
      seatsLeft: num(pick(raw, 'seatsLeft', 'seatsAvailable', 'remainingSeats'), 0) || null,
      host: host
    };
  }

  function normalizeResource(raw) {
    raw = raw || {};
    return {
      id: pick(raw, 'id', '_id', 'slug'),
      title: pick(raw, 'title', 'name') || 'Resource',
      summary: pick(raw, 'summary', 'description', 'excerpt') || '',
      cover: pick(raw, 'cover', 'image', 'thumbnail') || '',
      type: (pick(raw, 'type', 'category', 'kind', 'format') || 'Article'),
      readMinutes: num(pick(raw, 'readMinutes', 'readingTime', 'minutes'), 0) || null,
      url: pick(raw, 'url', 'link', 'fileUrl', 'href') || '',
      author: pick(raw, 'author', 'authorName', 'by') || 'ExpertHub',
      publishedAt: pick(raw, 'publishedAt', 'createdAt', 'date')
    };
  }

  function normalizeTestimonial(raw) {
    raw = raw || {};
    var who = raw.user || raw.author || raw.person || {};
    var name = pick(raw, 'name', 'authorName') || pick(who, 'name', 'fullName') || 'ExpertHub member';
    return {
      quote: pick(raw, 'quote', 'text', 'content', 'message', 'body') || '',
      name: name,
      role: pick(raw, 'role', 'position', 'title', 'occupation') || pick(who, 'role') || 'Member',
      avatar: pick(raw, 'avatar', 'avatarUrl', 'photo') || pick(who, 'avatar') || '',
      rating: num(pick(raw, 'rating', 'stars'), 5)
    };
  }

  /* ---------- demo fallback data ---------- */
  var DEMO = {
    courses: [
      { id: 'demo-c1', title: 'Full-Stack Web Development Bootcamp', summary: 'From HTML to deployed APIs in 12 intensive weeks with live mentor support.', category: 'Web Development', level: 'Beginner', price: 480, currency: 'USD', rating: 4.9, ratingCount: 214, durationWeeks: 12, lessons: 86, learners: 1240, expert: { name: 'Jane Doe', verified: true } },
      { id: 'demo-c2', title: 'Data Science & Machine Learning', summary: 'Python, pandas, scikit-learn and model deployment for real business problems.', category: 'Data Science', level: 'Intermediate', price: 620, currency: 'USD', rating: 4.8, ratingCount: 168, durationWeeks: 16, lessons: 104, learners: 890, expert: { name: 'Dr. Sarah Kim', verified: true } },
      { id: 'demo-c3', title: 'IELTS & Academic English Prep', summary: 'Targeted exam preparation with weekly mock tests and 1-on-1 feedback.', category: 'Exam Prep', level: 'All levels', price: 180, currency: 'USD', rating: 4.7, ratingCount: 302, durationWeeks: 8, lessons: 40, learners: 2110, expert: { name: 'Michael Otieno', verified: true } },
      { id: 'demo-c4', title: 'Corporate Leadership Essentials', summary: 'Build high-performing teams with practical management frameworks.', category: 'Business', level: 'Advanced', price: 0, currency: 'USD', rating: 4.6, ratingCount: 74, durationWeeks: 6, lessons: 28, learners: 430, expert: { name: 'Acme Academy', verified: true } }
    ],
    experts: [
      { id: 'demo-e1', name: 'Dr. Sarah Kim', headline: 'Data scientist & former university lecturer', specializations: ['Data Science', 'Python', 'Statistics'], rating: 4.9, reviews: 142, sessions: 610, rate: 45, currency: 'USD', verified: true, experienceYears: 11 },
      { id: 'demo-e2', name: 'Jane Doe', headline: 'Senior software engineer, ex-FAANG', specializations: ['JavaScript', 'React', 'Node.js'], rating: 4.8, reviews: 98, sessions: 410, rate: 40, currency: 'USD', verified: true, experienceYears: 8 },
      { id: 'demo-e3', name: 'Michael Otieno', headline: 'IELTS examiner & academic English coach', specializations: ['IELTS', 'English', 'Study Abroad'], rating: 4.9, reviews: 221, sessions: 980, rate: 25, currency: 'USD', verified: true, experienceYears: 14 }
    ],
    events: [
      { id: 'demo-v1', title: 'Live workshop: Build your first React app', summary: 'A hands-on 90-minute session with Jane Doe. Bring a laptop.', startsAt: new Date(Date.now() + 3 * 864e5).toISOString(), mode: 'online', price: 0, currency: 'USD', host: { name: 'Jane Doe', verified: true } },
      { id: 'demo-v2', title: 'Data careers panel: breaking into analytics', summary: 'Three hiring managers answer your questions live.', startsAt: new Date(Date.now() + 9 * 864e5).toISOString(), mode: 'online', price: 10, currency: 'USD', host: { name: 'Dr. Sarah Kim', verified: true } },
      { id: 'demo-v3', title: 'Corporate training open day', summary: 'Meet our programme leads and see cohort dashboards in action.', startsAt: new Date(Date.now() + 15 * 864e5).toISOString(), mode: 'physical', location: 'Nairobi, Kenya', price: 0, currency: 'USD', host: { name: 'Acme Academy', verified: true } }
    ],
    resources: [
      { id: 'demo-r1', title: 'The 2025 tech career roadmap', summary: 'Skills, timelines and salaries across eight in-demand tracks.', type: 'Guide', readMinutes: 14, url: '#' },
      { id: 'demo-r2', title: 'How to choose the right bootcamp', summary: 'Seven questions to ask before you pay a deposit.', type: 'Article', readMinutes: 7, url: '#' },
      { id: 'demo-r3', title: 'Corporate training RFP template', summary: 'A ready-to-use template for L&D teams evaluating vendors.', type: 'Template', readMinutes: 5, url: '#' },
      { id: 'demo-r4', title: 'Revision planner for exam prep', summary: 'A weekly schedule that balances new material and past papers.', type: 'Template', readMinutes: 6, url: '#' }
    ],
    testimonials: [
      { quote: 'ExpertHub helped me switch careers in 6 months. The bootcamp was intense but amazing.', name: 'Jane D.', role: 'Software Engineer', rating: 5 },
      { quote: 'As an expert, I doubled my income in 3 months. The platform handles payments automatically.', name: 'Dr. Sarah K.', role: 'Data Science Expert', rating: 5 },
      { quote: 'We run 12 cohorts a year through ExpertHub. Trainee tracking and assessments just work.', name: 'Acme Academy', role: 'Corporate Training', rating: 5 }
    ]
  };

  /* ---------- services ---------- */
  var CourseService = {
    list: function (params) {
      var qs = new URLSearchParams(cleanParams(params || {})).toString();
      return cached('courses:' + qs, 60000, function () {
        return landingRequest('/courses' + (qs ? '?' + qs : ''))
          .then(function (raw) { return listOf(raw, ['courses']).map(normalizeCourse); })
          .catch(function () { return DEMO.courses.slice(); });
      });
    },
    get: function (id) {
      return cached('course:' + id, 60000, function () {
        return landingRequest('/courses/' + encodeURIComponent(id))
          .then(function (raw) {
            var c = oneOf(raw, ['course']);
            return c ? normalizeCourse(c) : null;
          })
          .catch(function () {
            for (var i = 0; i < DEMO.courses.length; i++) {
              if (String(DEMO.courses[i].id) === String(id)) return normalizeCourse(DEMO.courses[i]);
            }
            return null;
          });
      });
    },
    featured: function (limit) {
      return CourseService.list({ featured: true, limit: limit || 6 })
        .then(function (list) { return list.length ? list : CourseService.list({ limit: limit || 6 }); });
    }
  };

  var ExpertService = {
    list: function (params) {
      var qs = new URLSearchParams(cleanParams(params || {})).toString();
      return cached('experts:' + qs, 60000, function () {
        return landingRequest('/experts' + (qs ? '?' + qs : ''))
          .then(function (raw) { return listOf(raw, ['experts']).map(normalizeExpert); })
          .catch(function () { return DEMO.experts.slice(); });
      });
    },
    get: function (id) {
      return cached('expert:' + id, 60000, function () {
        return landingRequest('/experts/' + encodeURIComponent(id))
          .then(function (raw) {
            var e = oneOf(raw, ['expert']);
            return e ? normalizeExpert(e) : null;
          })
          .catch(function () {
            for (var i = 0; i < DEMO.experts.length; i++) {
              if (String(DEMO.experts[i].id) === String(id)) return normalizeExpert(DEMO.experts[i]);
            }
            return null;
          });
      });
    }
  };

  var EventService = {
    list: function (params) {
      var qs = new URLSearchParams(cleanParams(params || {})).toString();
      return cached('events:' + qs, 60000, function () {
        return landingRequest('/events' + (qs ? '?' + qs : ''))
          .then(function (raw) { return listOf(raw, ['events']).map(normalizeEvent); })
          .catch(function () { return DEMO.events.slice(); });
      });
    },
    get: function (id) {
      return cached('event:' + id, 60000, function () {
        return landingRequest('/events/' + encodeURIComponent(id))
          .then(function (raw) {
            var e = oneOf(raw, ['event']);
            return e ? normalizeEvent(e) : null;
          })
          .catch(function () {
            for (var i = 0; i < DEMO.events.length; i++) {
              if (String(DEMO.events[i].id) === String(id)) return normalizeEvent(DEMO.events[i]);
            }
            return null;
          });
      });
    }
  };

  var ResourceService = {
    list: function (params) {
      var qs = new URLSearchParams(cleanParams(params || {})).toString();
      return cached('resources:' + qs, 60000, function () {
        return landingRequest('/resources' + (qs ? '?' + qs : ''))
          .then(function (raw) { return listOf(raw, ['resources']).map(normalizeResource); })
          .catch(function () { return DEMO.resources.slice(); });
      });
    }
  };

  var TestimonialService = {
    list: function () {
      return cached('testimonials', 300000, function () {
        return landingRequest('/testimonials')
          .then(function (raw) { return listOf(raw, ['testimonials']).map(normalizeTestimonial); })
          .catch(function () { return DEMO.testimonials.slice(); });
      });
    }
  };

  /**
   * Unified public search.
   * One query fans out across every public collection and returns
   * grouped results — courses, experts, events, resources.
   */
  var SearchService = {
    search: async function (query, opts) {
      var q = String(query || '').trim();
      if (q.length < 2) return { query: q, courses: [], experts: [], events: [], resources: [], total: 0 };

      opts = opts || {};
      var limit = opts.limit || 4;

      /* Prefer a single backend endpoint if one exists. */
      try {
        var raw = await landingRequest('/search?q=' + encodeURIComponent(q) + '&limit=' + limit);
        var d = raw && raw.data !== undefined ? raw.data : raw;
        if (d && (d.courses || d.experts || d.events || d.resources)) {
          var groups = {
            query: q,
            courses: listOf(d.courses).map(normalizeCourse),
            experts: listOf(d.experts).map(normalizeExpert),
            events: listOf(d.events).map(normalizeEvent),
            resources: listOf(d.resources).map(normalizeResource)
          };
          groups.total = groups.courses.length + groups.experts.length +
                         groups.events.length + groups.resources.length;
          return groups;
        }
      } catch (_) { /* fall through to fan-out */ }

      /* Fan-out fallback. */
      var results = await Promise.all([
        CourseService.list({ q: q, limit: limit }).catch(function () { return []; }),
        ExpertService.list({ q: q, limit: limit }).catch(function () { return []; }),
        EventService.list({ q: q, limit: limit }).catch(function () { return []; }),
        ResourceService.list({ q: q, limit: limit }).catch(function () { return []; })
      ]);

      return {
        query: q,
        courses: results[0].slice(0, limit),
        experts: results[1].slice(0, limit),
        events: results[2].slice(0, limit),
        resources: results[3].slice(0, limit),
        total: results[0].length + results[1].length + results[2].length + results[3].length
      };
    }
  };

  /* ==========================================================
     3. ROUTES
     ========================================================== */
  var ROUTES = {
    home: '#/',
    courses: '#/courses',
    experts: '#/experts',
    events: '#/events',
    resources: '#/resources',
    about: '#/about',
    contact: '#/contact',
    institutions: '#/institutions',
    login: '#/login',
    register: '#/register'
  };

  function go(hash) {
    if (!hash) return;
    if (String(hash).charAt(0) !== '#') hash = '#' + hash;
    if (location.hash === hash) {
      /* Same route — force a re-render. */
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      location.hash = hash;
    }
  }

  function courseUrl(id) { return '#/courses/' + encodeURIComponent(id); }
  function expertUrl(id) { return '#/experts/' + encodeURIComponent(id); }
  function eventUrl(id)  { return '#/events/' + encodeURIComponent(id); }

  /* ==========================================================
     4. SHARED CHROME (nav + footer)
     ========================================================== */
  function publicNav(active) {
    var links = [
      ['courses', 'Courses', ROUTES.courses],
      ['experts', 'Experts', ROUTES.experts],
      ['events', 'Events', ROUTES.events],
      ['resources', 'Resources', ROUTES.resources],
      ['institutions', 'For institutions', ROUTES.institutions],
      ['about', 'About', ROUTES.about]
    ];

    return '' +
      '<nav class="lp-nav">' +
        '<div class="landing-brand" data-lp-action="goto" data-lp-href="' + ROUTES.home + '" style="cursor:pointer">' +
          '<div class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></div>' +
          '<span>ExpertHub</span>' +
        '</div>' +
        '<div class="lp-nav-links">' +
          links.map(function (l) {
            return '<button class="lp-nav-link' + (active === l[0] ? ' is-active' : '') +
                   '" data-lp-action="goto" data-lp-href="' + l[2] + '">' + esc(l[1]) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="landing-nav-actions">' +
          '<button class="btn btn-ghost" data-lp-action="goto" data-lp-href="' + ROUTES.login + '">' +
            '<i class="fas fa-right-to-bracket"></i> Sign in</button>' +
          '<button class="btn btn-primary" data-lp-action="goto" data-lp-href="' + ROUTES.register + '">' +
            '<i class="fas fa-user-plus"></i> Create account</button>' +
        '</div>' +
      '</nav>';
  }

  function publicFooter() {
    var cols = [
      ['Explore', [['Courses', ROUTES.courses], ['Experts', ROUTES.experts], ['Events', ROUTES.events], ['Resources', ROUTES.resources]]],
      ['Platform', [['For institutions', ROUTES.institutions], ['Pricing', ROUTES.home + '#pricing'], ['About us', ROUTES.about], ['Contact', ROUTES.contact]]],
      ['Account', [['Sign in', ROUTES.login], ['Create account', ROUTES.register]]]
    ];

    return '' +
      '<footer class="lp-footer">' +
        '<div>' +
          '<div class="landing-brand" style="margin-bottom:12px">' +
            '<div class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></div>' +
            '<span>ExpertHub</span>' +
          '</div>' +
          '<p style="opacity:.65;line-height:1.6;margin:0;max-width:34ch">' +
            'E-School, 1-on-1 expert consultations and corporate training — in one modern platform.' +
          '</p>' +
        '</div>' +
        cols.map(function (col) {
          return '<div><h4>' + esc(col[0]) + '</h4><ul>' +
            col[1].map(function (item) {
              var href = item[1];
              var isAnchor = href.indexOf('#') > 0;
              if (isAnchor) {
                return '<li><button data-lp-action="goto" data-lp-href="' + href + '">' + esc(item[0]) + '</button></li>';
              }
              return '<li><button data-lp-action="goto" data-lp-href="' + href + '">' + esc(item[0]) + '</button></li>';
            }).join('') +
          '</ul></div>';
        }).join('') +
        '<div class="lp-copy">© ' + new Date().getFullYear() +
          ' ExpertHub. E-School, Consultation and Corporate Training Platform.</div>' +
      '</footer>';
  }

  function sectionHead(title, sub, actionLabel, actionHref) {
    return '' +
      '<div class="lp-section-head">' +
        '<div>' +
          '<h2 class="section-title" style="margin:0 0 6px">' + esc(title) + '</h2>' +
          (sub ? '<p class="section-sub" style="margin:0">' + esc(sub) + '</p>' : '') +
        '</div>' +
        (actionLabel
          ? '<button class="lp-link" data-lp-action="goto" data-lp-href="' + actionHref + '">' +
              esc(actionLabel) + ' <i class="fas fa-arrow-right"></i></button>'
          : '') +
      '</div>';
  }

  /* ==========================================================
     5. CARD RENDERERS
     ========================================================== */
  function stars(rating) {
    var r = Math.round(num(rating, 0));
    var out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<i class="' + (i <= r ? 'fas' : 'far') + ' fa-star"></i>';
    }
    return out;
  }

  function courseCard(c) {
    var img = c.thumbnail
      ? '<img src="' + esc(c.thumbnail) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<img src="' + esc(avatarUrl(c.title, '4f46e5')) + '" alt="" loading="lazy">';

    return '' +
      '<article class="lp-card" data-lp-action="goto" data-lp-href="' + courseUrl(c.id) + '" style="cursor:pointer">' +
        '<div class="lp-card-media">' + img +
          '<span class="lp-card-tag">' + esc(c.category) + '</span>' +
          '<span class="lp-card-price">' + esc(fmtMoney(c.price, c.currency)) + '</span>' +
        '</div>' +
        '<div class="lp-card-body">' +
          '<h3 class="lp-card-title">' + esc(c.title) + '</h3>' +
          '<p class="lp-card-text">' + esc(c.summary) + '</p>' +
          '<div class="lp-card-meta">' +
            '<span class="lp-author">' +
              '<img src="' + esc(safeImage(c.expert.avatar, c.expert.name)) + '" alt="">' +
              esc(c.expert.name) +
              (c.expert.verified ? ' <i class="fas fa-circle-check lp-verified"></i>' : '') +
            '</span>' +
          '</div>' +
          '<div class="lp-card-meta" style="padding-top:0">' +
            (c.rating ? '<span><i class="fas fa-star" style="color:#f59e0b"></i> ' + c.rating.toFixed(1) + '</span>' : '') +
            (c.lessons ? '<span><i class="fas fa-book-open"></i> ' + c.lessons + ' lessons</span>' : '') +
            (c.durationWeeks ? '<span><i class="fas fa-clock"></i> ' + c.durationWeeks + ' weeks</span>' : '') +
            '<span><i class="fas fa-signal"></i> ' + esc(c.level) + '</span>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function expertCard(e) {
    return '' +
      '<article class="lp-card lp-expert" data-lp-action="goto" data-lp-href="' + expertUrl(e.id) + '" style="cursor:pointer">' +
        '<img class="lp-expert-avatar" src="' + esc(safeImage(e.avatar, e.name)) + '" alt="" loading="lazy">' +
        '<h3>' + esc(e.name) +
          (e.verified ? ' <i class="fas fa-circle-check lp-verified" title="Verified by ExpertHub"></i>' : '') +
        '</h3>' +
        '<p class="lp-expert-role">' + esc(e.headline || 'ExpertHub consultant') + '</p>' +
        (e.specializations.length
          ? '<div class="lp-tags">' + e.specializations.slice(0, 3).map(function (s) {
              return '<span class="lp-tag">' + esc(s) + '</span>';
            }).join('') + '</div>'
          : '') +
        '<div class="lp-stars">' + stars(e.rating) +
          ' <span style="color:inherit;opacity:.55;margin-left:4px">' +
          (e.rating ? e.rating.toFixed(1) : 'New') +
          (e.reviews ? ' · ' + e.reviews + ' reviews' : '') + '</span>' +
        '</div>' +
        '<div class="lp-card-meta" style="justify-content:center;padding-top:0">' +
          (e.rate ? '<span><b>' + esc(fmtMoney(e.rate, e.currency)) + '</b> / session</span>' : '<span>Contact for rate</span>') +
          (e.experienceYears ? '<span>· ' + e.experienceYears + ' yrs exp</span>' : '') +
        '</div>' +
      '</article>';
  }

  function eventRow(ev) {
    var d = ev.startsAt ? new Date(ev.startsAt) : null;
    var day = d && !isNaN(d) ? d.getDate() : '—';
    var mon = d && !isNaN(d) ? d.toLocaleDateString(undefined, { month: 'short' }) : '';

    return '' +
      '<article class="lp-row-card" data-lp-action="goto" data-lp-href="' + eventUrl(ev.id) + '" style="cursor:pointer">' +
        '<div class="lp-date-chip"><b>' + esc(day) + '</b><span>' + esc(mon) + '</span></div>' +
        '<div style="flex:1;min-width:0">' +
          '<h3 class="lp-card-title" style="margin-bottom:4px">' + esc(ev.title) + '</h3>' +
          '<p class="lp-card-text" style="margin-bottom:6px">' + esc(ev.summary) + '</p>' +
          '<div class="lp-card-meta" style="padding-top:0">' +
            '<span><i class="fas fa-' + (ev.mode === 'physical' ? 'location-dot' : 'video') + '"></i> ' +
              esc(ev.mode === 'physical' ? (ev.location || 'In person') : 'Online') + '</span>' +
            '<span><i class="fas fa-clock"></i> ' + esc(fmtDateTime(ev.startsAt)) + '</span>' +
            '<span><i class="fas fa-tag"></i> ' + esc(fmtMoney(ev.price, ev.currency)) + '</span>' +
          '</div>' +
        '</div>' +
        '<i class="fas fa-chevron-right" style="opacity:.35"></i>' +
      '</article>';
  }

  function resourceCard(r) {
    return '' +
      '<article class="lp-card" data-lp-action="resource-open" data-lp-url="' + esc(r.url || '') + '" style="cursor:pointer">' +
        '<div class="lp-card-media" style="aspect-ratio:16/10">' +
          (r.cover
            ? '<img src="' + esc(r.cover) + '" alt="" loading="lazy">'
            : '<img src="' + esc(avatarUrl(r.title, '0ea5e9')) + '" alt="" loading="lazy">') +
          '<span class="lp-card-tag">' + esc(r.type) + '</span>' +
        '</div>' +
        '<div class="lp-card-body">' +
          '<h3 class="lp-card-title">' + esc(r.title) + '</h3>' +
          '<p class="lp-card-text">' + esc(r.summary) + '</p>' +
          '<div class="lp-card-meta">' +
            '<span>' + esc(r.author) + '</span>' +
            (r.readMinutes ? '<span>· ' + r.readMinutes + ' min read</span>' : '') +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function skeletons(n, minH) {
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<div class="lp-skel" style="min-height:' + (minH || 220) + 'px"></div>';
    }
    return out;
  }

  function emptyState(message, actionLabel, actionAttrs) {
    return '' +
      '<div class="lp-empty">' +
        '<i class="fas fa-inbox"></i>' +
        '<p style="margin:0 0 12px">' + esc(message) + '</p>' +
        (actionLabel ? '<button class="btn btn-secondary" ' + (actionAttrs || '') + '>' + esc(actionLabel) + '</button>' : '') +
      '</div>';
  }

  /* ==========================================================
     6. LANDING PAGE
     ========================================================== */
  var runToken = 0;          /* guards against stale async writes */
  var searchAbort = null;

  function landingShell() {
    return '' +
      '<div class="landing">' +
        publicNav('home') +

        /* ---------------- HERO ---------------- */
        '<header class="lp-hero">' +
          '<div>' +
            '<span class="lp-badge"><span class="live-indicator"></span> ' +
              'Trusted by learners, experts and institutions</span>' +
            '<h1 class="lp-hero-title">Learn, consult and grow with ' +
              '<span class="lp-accent">real experts</span></h1>' +
            '<p class="lp-hero-sub">ExpertHub combines an E-School, bootcamps, short courses, ' +
              'tuition, exam prep, 1-on-1 consultations and full corporate training in one modern platform.</p>' +

            '<form class="lp-search" id="lpSearchForm" role="search" autocomplete="off">' +
              '<i class="fas fa-magnifying-glass"></i>' +
              '<input id="lpSearchInput" type="search" placeholder="Search courses, experts, events and resources…" ' +
                'aria-label="Search ExpertHub" aria-expanded="false" aria-controls="lpSearchResults">' +
              '<button class="btn btn-primary" type="submit">Search</button>' +
              '<div class="lp-search-results" id="lpSearchResults" hidden></div>' +
            '</form>' +

            '<div class="lp-chips">' +
              ['Web development', 'Data science', 'IELTS', 'Business', 'Design'].map(function (t) {
                return '<button type="button" class="lp-chip" data-lp-action="chip" ' +
                       'data-lp-query="' + esc(t) + '">' + esc(t) + '</button>';
              }).join('') +
            '</div>' +

            '<div class="lp-hero-cta" style="margin-top:26px">' +
              '<button class="btn btn-primary" data-lp-action="goto" data-lp-href="' + ROUTES.register + '">' +
                '<i class="fas fa-rocket"></i> Get started free</button>' +
              '<button class="btn btn-secondary" data-lp-action="goto" data-lp-href="' + ROUTES.login + '">' +
                '<i class="fas fa-right-to-bracket"></i> I already have an account</button>' +
            '</div>' +

            '<div class="hero-stats" style="margin-top:34px">' +
              '<div><div class="hero-stat-value">2k+</div><div class="hero-stat-label">Active learners</div></div>' +
              '<div><div class="hero-stat-value">150+</div><div class="hero-stat-label">Verified experts</div></div>' +
              '<div><div class="hero-stat-value">4.9 / 5</div><div class="hero-stat-label">Average rating</div></div>' +
            '</div>' +
          '</div>' +

          '<div class="hero-visual">' +
            '<div class="hero-card">' +
              '<div class="hero-card-row">' +
                '<div class="hero-card-icon"><i class="fas fa-school"></i></div>' +
                '<div><div class="hero-card-title">E-School hub</div>' +
                '<div class="hero-card-desc">Bootcamps, courses, tuition and exams</div></div>' +
              '</div>' +
              '<div class="hero-card-row">' +
                '<div class="hero-card-icon green"><i class="fas fa-comments"></i></div>' +
                '<div><div class="hero-card-title">1-on-1 consultations</div>' +
                '<div class="hero-card-desc">Chat, audio and video calls</div></div>' +
              '</div>' +
              '<div class="hero-card-row">' +
                '<div class="hero-card-icon yellow"><i class="fas fa-user-tie"></i></div>' +
                '<div><div class="hero-card-title">Verified experts</div>' +
                '<div class="hero-card-desc">Approved by our admin team</div></div>' +
              '</div>' +
            '</div>' +
            '<div class="hero-card">' +
              '<div class="hero-card-row">' +
                '<div class="hero-card-icon"><i class="fas fa-building-columns"></i></div>' +
                '<div><div class="hero-card-title">Corporate training</div>' +
                '<div class="hero-card-desc">Programmes, cohorts, assessments and compliance</div></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</header>' +

        /* ---------------- FEATURED COURSES ---------------- */
        '<section class="section alt" id="lp-courses-section">' +
          '<div style="max-width:1200px;margin:0 auto">' +
            sectionHead('Featured courses', 'Hand-picked programmes from our verified experts.',
                        'Browse all courses', ROUTES.courses) +
            '<div class="lp-grid lp-grid-3" id="lpCourses">' + skeletons(3, 280) + '</div>' +
          '</div>' +
        '</section>' +

        /* ---------------- EXPERTS ---------------- */
        '<section class="section" id="lp-experts-section">' +
          '<div style="max-width:1200px;margin:0 auto">' +
            sectionHead('Meet the experts', 'Verified professionals ready to help you one-on-one.',
                        'See all experts', ROUTES.experts) +
            '<div class="lp-grid lp-grid-4" id="lpExperts">' + skeletons(4, 250) + '</div>' +
          '</div>' +
        '</section>' +

        /* ---------------- EVENTS ---------------- */
        '<section class="section alt" id="lp-events-section">' +
          '<div style="max-width:1000px;margin:0 auto">' +
            sectionHead('Upcoming events', 'Workshops, webinars and open days you can join.',
                        'All events', ROUTES.events) +
            '<div class="lp-grid" id="lpEvents" style="gap:14px">' + skeletons(3, 90) + '</div>' +
          '</div>' +
        '</section>' +

        /* ---------------- RESOURCES ---------------- */
        '<section class="section" id="lp-resources-section">' +
          '<div style="max-width:1200px;margin:0 auto">' +
            sectionHead('Free resources', 'Guides, templates and articles to get you moving.',
                        'All resources', ROUTES.resources) +
            '<div class="lp-grid lp-grid-4" id="lpResources">' + skeletons(4, 240) + '</div>' +
          '</div>' +
        '</section>' +

        /* ---------------- FEATURES ---------------- */
        '<section class="section alt">' +
          '<div style="max-width:1200px;margin:0 auto">' +
            '<h2 class="section-title">Everything you need to learn, earn and train</h2>' +
            '<p class="section-sub">A complete platform for learners, experts, institutions and administrators.</p>' +
            '<div class="features-grid">' +
              feature('fa-graduation-cap', '', 'Learn anything', 'Bootcamps, short courses, tuition and exam prep curated by experts.') +
              feature('fa-user-tie', 'linear-gradient(135deg,#10b981,#059669)', 'Teach and earn', 'Experts get verified, manage consultations and withdraw earnings.') +
              feature('fa-comments', 'linear-gradient(135deg,#f59e0b,#d97706)', 'Real-time chat', 'Live messaging, attachments, typing indicator and video calls.') +
              feature('fa-building-columns', 'linear-gradient(135deg,#8b5cf6,#6d28d9)', 'Corporate training', 'Programmes, cohorts, assessments, certifications and compliance.') +
              feature('fa-shield-halved', 'linear-gradient(135deg,#ef4444,#b91c1c)', 'Admin controlled', 'Approvals, moderation, payouts and full audit logging built in.') +
              feature('fa-chart-line', 'linear-gradient(135deg,#0ea5e9,#0369a1)', 'Deep analytics', 'Track progress, scores and completion across all cohorts.') +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------------- PRICING ---------------- */
        '<section class="section" id="pricing">' +
          '<div style="max-width:1200px;margin:0 auto">' +
            '<h2 class="section-title">Simple, transparent pricing</h2>' +
            '<p class="section-sub">Choose the plan that fits your journey.</p>' +
            '<div class="pricing-grid">' +
              pricingCard('Learner', 'Free', '$0<span>/mo</span>', [
                'Browse all courses', '1 free consultation per month',
                'Community access', 'Progress tracking'
              ], 'Get started', 'btn-secondary', ROUTES.register, false) +
              pricingCard('Expert', 'Pro', '20%<span> commission</span>', [
                'Create unlimited courses', 'Accept consultations',
                'Instant payouts (7-day hold)', 'Priority support'
              ], 'Become an expert', 'btn-primary', ROUTES.register, true) +
              pricingCard('Enterprise', 'Institution', 'Let\'s talk', [
                'Team accounts and ops manager', 'Programmes, cohorts and trainees',
                'Assessments and capstone projects', 'Custom branding and SSO'
              ], 'Register institution', 'btn-secondary', ROUTES.register, false) +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------------- TESTIMONIALS ---------------- */
        '<section class="section alt">' +
          '<div style="max-width:1200px;margin:0 auto">' +
            '<h2 class="section-title">Loved by learners, experts and institutions</h2>' +
            '<p class="section-sub">Real stories from our community.</p>' +
            '<div class="testimonials-grid" id="lpTestimonials">' + skeletons(3, 170) + '</div>' +
          '</div>' +
        '</section>' +

        /* ---------------- FAQ ---------------- */
        '<section class="section">' +
          '<div style="max-width:820px;margin:0 auto">' +
            '<h2 class="section-title">Frequently asked questions</h2>' +
            '<p class="section-sub">Everything you need to know.</p>' +
            '<div class="faq-list">' +
              [
                ['How does registration work?', 'Learners are approved instantly. Experts and institutions require admin approval.'],
                ['What is the platform commission?', 'We charge a flat 20% commission on all course sales and consultations.'],
                ['How long do payouts take?', 'Withdrawals have a 7-day holding period, then process within 3 to 5 business days.'],
                ['Can I switch from learner to expert?', 'Yes. Apply to become an expert from your dashboard. Our team reviews each application.'],
                ['Do you support corporate training?', 'Yes. Institutions get programmes, cohorts, assessments, projects, certifications and compliance tracking.'],
                ['How do I contact support?', 'Use the contact page or email support@experthub.example. We reply within one business day.']
              ].map(function (qa) {
                return '<div class="faq-item">' +
                  '<div class="faq-q" data-lp-action="faq">' + esc(qa[0]) +
                    '<i class="fas fa-chevron-down"></i></div>' +
                  '<div class="faq-a">' + esc(qa[1]) + '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------------- CTA ---------------- */
        '<section class="section alt">' +
          '<div class="lp-cta">' +
            '<h2>Ready to start?</h2>' +
            '<p>Join thousands of learners, experts and institutions already growing on ExpertHub.</p>' +
            '<button class="btn btn-primary" data-lp-action="goto" data-lp-href="' + ROUTES.register + '">' +
              '<i class="fas fa-rocket"></i> Create your free account</button>' +
          '</div>' +
        '</section>' +

        publicFooter() +
      '</div>';
  }

  function feature(icon, bg, title, text) {
    return '<div class="feature-card">' +
      '<div class="feature-icon"' + (bg ? ' style="background:' + bg + '"' : '') + '>' +
        '<i class="fas ' + icon + '"></i></div>' +
      '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></div>';
  }

  function pricingCard(badge, name, price, features, cta, ctaClass, href, featured) {
    return '<div class="pricing-card' + (featured ? ' featured' : '') + '">' +
      '<span class="pricing-badge">' + esc(badge) + '</span>' +
      '<h3 style="margin:0">' + esc(name) + '</h3>' +
      '<div class="pricing-price">' + price + '</div>' +
      '<ul class="pricing-features">' +
        features.map(function (f) {
          return '<li><i class="fas fa-check"></i> ' + esc(f) + '</li>';
        }).join('') +
      '</ul>' +
      '<button class="btn ' + ctaClass + ' btn-block" data-lp-action="goto" data-lp-href="' + href + '">' +
        esc(cta) + '</button>' +
    '</div>';
  }

  /* ---------- landing render + hydration ---------- */
  function renderLanding() {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = landingShell();

    /* Bind the sections that need DOM hooks. */
    var form = $('#lpSearchForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = ($('#lpSearchInput') || {}).value || '';
        if (q.trim().length >= 2) go(ROUTES.courses + '?q=' + encodeURIComponent(q.trim()));
      });
    }

    var input = $('#lpSearchInput');
    if (input) {
      input.addEventListener('input', debounce(function () { runSearch(input.value); }, 260));
      input.addEventListener('focus', function () {
        if (input.value.trim().length >= 2) runSearch(input.value);
      });
    }

    hydrateLanding();
  }

  function hydrateLanding() {
    var token = ++runToken;
    loadCourses(token);
    loadExperts(token);
    loadEvents(token);
    loadResources(token);
    loadTestimonials(token);
  }

  async function loadCourses(token) {
    var el = document.getElementById('lpCourses');
    if (!el) return;
    try {
      var list = await CourseService.featured(6);
      if (token !== runToken || !document.body.contains(el)) return;
      el.innerHTML = list.length
        ? list.slice(0, 6).map(courseCard).join('')
        : emptyState('No courses published yet. Check back soon.',
                     'Browse courses', 'data-lp-action="goto" data-lp-href="' + ROUTES.courses + '"');
    } catch (err) {
      if (token !== runToken) return;
      el.innerHTML = emptyState('We could not load courses right now.',
                                'Retry', 'data-lp-action="retry" data-lp-section="courses"');
    }
  }

  async function loadExperts(token) {
    var el = document.getElementById('lpExperts');
    if (!el) return;
    try {
      var list = await ExpertService.list({ limit: 8, verified: true });
      if (token !== runToken || !document.body.contains(el)) return;
      el.innerHTML = list.length
        ? list.slice(0, 8).map(expertCard).join('')
        : emptyState('No experts listed yet.',
                     'Browse experts', 'data-lp-action="goto" data-lp-href="' + ROUTES.experts + '"');
    } catch (err) {
      if (token !== runToken) return;
      el.innerHTML = emptyState('We could not load experts right now.',
                                'Retry', 'data-lp-action="retry" data-lp-section="experts"');
    }
  }

  async function loadEvents(token) {
    var el = document.getElementById('lpEvents');
    if (!el) return;
    try {
      var list = await EventService.list({ upcoming: true, limit: 4 });
      if (token !== runToken || !document.body.contains(el)) return;
      el.innerHTML = list.length
        ? list.slice(0, 4).map(eventRow).join('')
        : emptyState('No upcoming events scheduled.',
                     'See all events', 'data-lp-action="goto" data-lp-href="' + ROUTES.events + '"');
    } catch (err) {
      if (token !== runToken) return;
      el.innerHTML = emptyState('We could not load events right now.',
                                'Retry', 'data-lp-action="retry" data-lp-section="events"');
    }
  }

  async function loadResources(token) {
    var el = document.getElementById('lpResources');
    if (!el) return;
    try {
      var list = await ResourceService.list({ limit: 4 });
      if (token !== runToken || !document.body.contains(el)) return;
      el.innerHTML = list.length
        ? list.slice(0, 4).map(resourceCard).join('')
        : emptyState('No public resources yet.',
                     'See resources', 'data-lp-action="goto" data-lp-href="' + ROUTES.resources + '"');
    } catch (err) {
      if (token !== runToken) return;
      el.innerHTML = emptyState('We could not load resources right now.',
                                'Retry', 'data-lp-action="retry" data-lp-section="resources"');
    }
  }

  async function loadTestimonials(token) {
    var el = document.getElementById('lpTestimonials');
    if (!el) return;
    try {
      var list = await TestimonialService.list();
      if (token !== runToken || !document.body.contains(el)) return;
      if (!list.length) { el.innerHTML = ''; return; }
      el.innerHTML = list.slice(0, 6).map(function (t) {
        return '<div class="testimonial">' +
          '<div class="lp-stars" style="margin-bottom:8px">' + stars(t.rating) + '</div>' +
          '<p class="testimonial-text">"' + esc(t.quote) + '"</p>' +
          '<div class="testimonial-author">' +
            '<img class="testimonial-avatar" src="' + esc(safeImage(t.avatar, t.name)) + '" alt="">' +
            '<div><div class="testimonial-name">' + esc(t.name) + '</div>' +
            '<div class="testimonial-role">' + esc(t.role) + '</div></div>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      if (token === runToken) el.innerHTML = '';
    }
  }

  /* ---------- unified search UI ---------- */
  function runSearch(query) {
    var box = document.getElementById('lpSearchResults');
    var input = document.getElementById('lpSearchInput');
    if (!box) return;

    var q = String(query || '').trim();
    if (q.length < 2) {
      box.hidden = true;
      box.innerHTML = '';
      if (input) input.setAttribute('aria-expanded', 'false');
      return;
    }

    box.hidden = false;
    box.innerHTML = '<div class="lp-sr-empty"><i class="fas fa-circle-notch fa-spin"></i> Searching…</div>';
    if (input) input.setAttribute('aria-expanded', 'true');

    if (searchAbort) { try { searchAbort.abort(); } catch (_) {} }
    searchAbort = (typeof AbortController !== 'undefined') ? new AbortController() : null;

    SearchService.search(q, { limit: 4 }).then(function (res) {
      if (String((document.getElementById('lpSearchInput') || {}).value || '').trim() !== q) return;
      box.innerHTML = renderSearchResults(res);
    }).catch(function () {
      box.innerHTML = '<div class="lp-sr-empty">Search is unavailable right now.</div>';
    });
  }

  function renderSearchResults(res) {
    if (!res.total) {
      return '<div class="lp-sr-empty"><i class="fas fa-magnifying-glass"></i><br>' +
             'No results for "' + esc(res.query) + '"</div>';
    }

    var html = '';

    function group(label, items, mapper) {
      if (!items.length) return '';
      return '<div class="lp-sr-group">' + esc(label) + '</div>' +
             items.map(mapper).join('');
    }

    html += group('Courses', res.courses, function (c) {
      return '<button type="button" class="lp-sr-item" data-lp-action="goto" data-lp-href="' + courseUrl(c.id) + '">' +
        '<img src="' + esc(safeImage(c.thumbnail, c.title)) + '" alt="">' +
        '<span><b>' + esc(c.title) + '</b><span>' + esc(c.category) + ' · ' +
        esc(fmtMoney(c.price, c.currency)) + '</span></span></button>';
    });

    html += group('Experts', res.experts, function (e) {
      return '<button type="button" class="lp-sr-item" data-lp-action="goto" data-lp-href="' + expertUrl(e.id) + '">' +
        '<img src="' + esc(safeImage(e.avatar, e.name)) + '" alt="">' +
        '<span><b>' + esc(e.name) + '</b><span>' + esc(e.headline || 'Expert') + '</span></span></button>';
    });

    html += group('Events', res.events, function (ev) {
      return '<button type="button" class="lp-sr-item" data-lp-action="goto" data-lp-href="' + eventUrl(ev.id) + '">' +
        '<img src="' + esc(safeImage(ev.cover, ev.title)) + '" alt="">' +
        '<span><b>' + esc(ev.title) + '</b><span>' + esc(fmtDate(ev.startsAt)) + '</span></span></button>';
    });

    html += group('Resources', res.resources, function (r) {
      return '<button type="button" class="lp-sr-item" data-lp-action="resource-open" data-lp-url="' + esc(r.url || '') + '">' +
        '<img src="' + esc(safeImage(r.cover, r.title)) + '" alt="">' +
        '<span><b>' + esc(r.title) + '</b><span>' + esc(r.type) + '</span></span></button>';
    });

    html += '<div class="lp-sr-group" style="text-align:center;padding:10px">' +
      '<button type="button" class="lp-link" data-lp-action="search-all" data-lp-query="' + esc(res.query) + '">' +
      'See all results for "' + esc(res.query) + '" <i class="fas fa-arrow-right"></i></button></div>';

    return html;
  }

  function closeSearch() {
    var box = document.getElementById('lpSearchResults');
    var input = document.getElementById('lpSearchInput');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  /* ==========================================================
     7. DISCOVERY PAGES
     ========================================================== */
  function discoveryFilters(idPrefix, filters) {
    return '<div class="lp-chips" style="margin-bottom:22px">' +
      filters.map(function (f, i) {
        return '<button class="lp-chip' + (i === 0 ? ' is-active' : '') + '" ' +
          'data-lp-action="filter" data-lp-target="' + idPrefix + '" ' +
          'data-lp-filter="' + esc(f.value) + '">' + esc(f.label) + '</button>';
      }).join('') + '</div>';
  }

  function renderPublicCourses() {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    var params = new URLSearchParams((location.hash.split('?')[1] || ''));
    var q = params.get('q') || '';

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('courses') +
        '<div class="lp-page">' +
          '<h1 class="section-title" style="margin-bottom:6px">Browse courses</h1>' +
          '<p class="section-sub">Bootcamps, short courses, tuition and exam prep from verified experts.</p>' +

          '<form class="lp-search" id="lpCourseSearch" style="margin:22px 0" autocomplete="off">' +
            '<i class="fas fa-magnifying-glass"></i>' +
            '<input type="search" id="lpCourseQuery" placeholder="Search courses…" value="' + esc(q) + '">' +
            '<button class="btn btn-primary" type="submit">Search</button>' +
          '</form>' +

          '<div class="lp-chips" id="lpCourseFilters" style="margin-bottom:24px">' +
            ['all|All', 'Web Development|Web', 'Data Science|Data', 'Business|Business', 'Exam Prep|Exam prep', 'Design|Design']
              .map(function (f, i) {
                var parts = f.split('|');
                return '<button class="lp-chip' + (i === 0 ? ' is-active' : '') + '" ' +
                  'data-lp-action="course-filter" data-lp-filter="' + esc(parts[0]) + '">' +
                  esc(parts[1]) + '</button>';
              }).join('') +
          '</div>' +

          '<div class="lp-grid lp-grid-3" id="lpCourseList">' + skeletons(6, 280) + '</div>' +
        '</div>' +
        publicFooter() +
      '</div>';

    var form = $('#lpCourseSearch');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        loadPublicCourses({ q: ($('#lpCourseQuery') || {}).value || '', category: currentCourseCategory });
      });
    }

    var token = ++runToken;
    window.__lpCourseToken = token;
    loadPublicCourses({ q: q, category: 'all' });
  }

  var currentCourseCategory = 'all';

  async function loadPublicCourses(opts) {
    var el = document.getElementById('lpCourseList');
    if (!el) return;
    el.innerHTML = skeletons(6, 280);

    currentCourseCategory = opts.category || 'all';

    try {
      var list = await CourseService.list({
        q: opts.q || undefined,
        category: currentCourseCategory === 'all' ? undefined : currentCourseCategory,
        limit: 24
      });
      if (!document.body.contains(el)) return;
      el.innerHTML = list.length
        ? list.map(courseCard).join('')
        : emptyState('No courses match your filters.', 'Clear filters',
                     'data-lp-action="course-filter" data-lp-filter="all"');
    } catch (err) {
      if (!document.body.contains(el)) return;
      el.innerHTML = emptyState('We could not load courses right now.', 'Retry',
                                'data-lp-action="retry" data-lp-section="course-list"');
    }
  }

  function renderPublicExperts() {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('experts') +
        '<div class="lp-page">' +
          '<h1 class="section-title" style="margin-bottom:6px">Find an expert</h1>' +
          '<p class="section-sub">Verified professionals for 1-on-1 consultations, coaching and mentoring.</p>' +
          '<div class="lp-search" style="margin:22px 0;max-width:520px">' +
            '<i class="fas fa-magnifying-glass"></i>' +
            '<input type="search" id="lpExpertQuery" placeholder="Search by name, skill or field…">' +
          '</div>' +
          '<div class="lp-grid lp-grid-4" id="lpExpertList">' + skeletons(8, 250) + '</div>' +
        '</div>' +
        publicFooter() +
      '</div>';

    var input = $('#lpExpertQuery');
    if (input) {
      input.addEventListener('input', debounce(function () {
        loadPublicExperts(input.value);
      }, 280));
    }

    loadPublicExperts('');
  }

  async function loadPublicExperts(q) {
    var el = document.getElementById('lpExpertList');
    if (!el) return;
    el.innerHTML = skeletons(8, 250);
    try {
      var list = await ExpertService.list({ q: q || undefined, limit: 24 });
      if (!document.body.contains(el)) return;
      el.innerHTML = list.length
        ? list.map(expertCard).join('')
        : emptyState('No experts match your search.');
    } catch (err) {
      if (!document.body.contains(el)) return;
      el.innerHTML = emptyState('We could not load experts right now.', 'Retry',
                                'data-lp-action="retry" data-lp-section="expert-list"');
    }
  }

  function renderPublicEvents() {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('events') +
        '<div class="lp-page" style="max-width:900px">' +
          '<h1 class="section-title" style="margin-bottom:6px">Events &amp; workshops</h1>' +
          '<p class="section-sub">Webinars, live workshops, open days and training sessions.</p>' +
          '<div class="lp-grid" id="lpEventList" style="gap:14px;margin-top:24px">' + skeletons(4, 90) + '</div>' +
        '</div>' +
        publicFooter() +
      '</div>';

    (async function () {
      var el = document.getElementById('lpEventList');
      try {
        var list = await EventService.list({ limit: 24 });
        if (!document.body.contains(el)) return;
        el.innerHTML = list.length
          ? list.map(eventRow).join('')
          : emptyState('No events scheduled yet. Check back soon.');
      } catch (err) {
        if (!document.body.contains(el)) return;
        el.innerHTML = emptyState('We could not load events right now.', 'Retry',
                                  'data-lp-action="retry" data-lp-section="event-list"');
      }
    })();
  }

  function renderPublicResources() {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('resources') +
        '<div class="lp-page">' +
          '<h1 class="section-title" style="margin-bottom:6px">Resources</h1>' +
          '<p class="section-sub">Free articles, guides, templates and learning materials.</p>' +
          '<div class="lp-grid lp-grid-4" id="lpResourceList" style="margin-top:24px">' + skeletons(8, 240) + '</div>' +
        '</div>' +
        publicFooter() +
      '</div>';

    (async function () {
      var el = document.getElementById('lpResourceList');
      try {
        var list = await ResourceService.list({ limit: 32 });
        if (!document.body.contains(el)) return;
        el.innerHTML = list.length
          ? list.map(resourceCard).join('')
          : emptyState('No resources published yet.');
      } catch (err) {
        if (!document.body.contains(el)) return;
        el.innerHTML = emptyState('We could not load resources right now.', 'Retry',
                                  'data-lp-action="retry" data-lp-section="resource-list"');
      }
    })();
  }

  /* ==========================================================
     8. DETAIL PAGES
     ========================================================== */
  function renderCourseDetail(id) {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('courses') +
        '<div class="lp-page" id="lpCourseDetail">' + skeletons(1, 420) + '</div>' +
        publicFooter() +
      '</div>';

    (async function () {
      var host = document.getElementById('lpCourseDetail');
      var course = await CourseService.get(id);
      if (!document.body.contains(host)) return;

      if (!course) {
        host.innerHTML = emptyState('That course could not be found.',
                                    'Back to courses', 'data-lp-action="goto" data-lp-href="' + ROUTES.courses + '"');
        return;
      }

      var enrolledHref = isAuthed() ? '#/courses' : ROUTES.register;

      host.innerHTML = '' +
        '<button class="lp-link" data-lp-action="goto" data-lp-href="' + ROUTES.courses + '" style="margin-bottom:20px">' +
          '<i class="fas fa-arrow-left"></i> All courses</button>' +

        '<div class="lp-detail-hero">' +
          '<div>' +
            '<span class="lp-tag" style="display:inline-block;margin-bottom:12px">' + esc(course.category) + '</span>' +
            '<h1 class="section-title" style="margin:0 0 12px">' + esc(course.title) + '</h1>' +
            '<p style="font-size:1.02rem;line-height:1.7;opacity:.72;margin:0 0 18px">' + esc(course.summary) + '</p>' +
            '<div class="lp-card-meta" style="padding:0;font-size:.85rem;gap:16px">' +
              (course.rating ? '<span><i class="fas fa-star" style="color:#f59e0b"></i> ' +
                course.rating.toFixed(1) + ' (' + course.ratingCount + ')</span>' : '') +
              (course.lessons ? '<span><i class="fas fa-book-open"></i> ' + course.lessons + ' lessons</span>' : '') +
              (course.durationWeeks ? '<span><i class="fas fa-clock"></i> ' + course.durationWeeks + ' weeks</span>' : '') +
              '<span><i class="fas fa-signal"></i> ' + esc(course.level) + '</span>' +
              (course.learners ? '<span><i class="fas fa-users"></i> ' + course.learners + ' learners</span>' : '') +
            '</div>' +
          '</div>' +

          '<aside class="lp-side">' +
            '<div class="lp-detail-cover" style="aspect-ratio:16/10">' +
              '<img src="' + esc(safeImage(course.thumbnail, course.title)) + '" alt="">' +
            '</div>' +
            '<div class="lp-side-price">' + esc(fmtMoney(course.price, course.currency)) + '</div>' +
            '<button class="btn btn-primary btn-block" data-lp-action="goto" data-lp-href="' + enrolledHref + '">' +
              '<i class="fas fa-graduation-cap"></i> ' +
              (isAuthed() ? 'Enrol now' : 'Create account to enrol') + '</button>' +
            '<button class="btn btn-secondary btn-block" data-lp-action="goto" data-lp-href="' + ROUTES.contact + '">' +
              '<i class="fas fa-circle-question"></i> Ask a question</button>' +
            (course.expert.id
              ? '<hr style="border:0;border-top:1px solid rgba(15,23,42,.1);margin:6px 0">' +
                '<div class="lp-author" data-lp-action="goto" data-lp-href="' + expertUrl(course.expert.id) + '" style="cursor:pointer">' +
                  '<img src="' + esc(safeImage(course.expert.avatar, course.expert.name)) + '" alt="" style="width:40px;height:40px">' +
                  '<div><b style="font-size:.9rem">' + esc(course.expert.name) + '</b>' +
                  '<div style="font-size:.76rem;opacity:.6">Course instructor</div></div>' +
                '</div>'
              : '') +
          '</aside>' +
        '</div>' +

        '<section style="margin-top:40px">' +
          '<h2 class="section-title" style="font-size:1.3rem;margin-bottom:16px">What you will learn</h2>' +
          '<ul class="lp-list">' +
            ['Master the core concepts through guided, project-based lessons.',
             'Work through real assignments with feedback from your instructor.',
             'Join live sessions and get your questions answered directly.',
             'Finish with a portfolio-ready capstone project.',
             'Earn a verifiable ExpertHub certificate on completion.'
            ].map(function (t) {
              return '<li><i class="fas fa-circle-check"></i><span>' + esc(t) + '</span></li>';
            }).join('') +
          '</ul>' +
        '</section>' +
        '<section style="margin-top:40px">' +
          '<h2 class="section-title" style="font-size:1.3rem;margin-bottom:16px">About this course</h2>' +
          '<p style="line-height:1.75;opacity:.75">' + esc(course.summary) +
            ' This programme is delivered through the ExpertHub E-School and includes ' +
            (course.lessons ? course.lessons + ' lessons' : 'structured lessons') +
            (course.durationWeeks ? ' spread across ' + course.durationWeeks + ' weeks' : '') +
            '. Enrolled learners get lifetime access to materials, cohort discussions and direct messaging with the instructor.</p>' +
        '</section>';
    })();
  }

  function renderExpertDetail(id) {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('experts') +
        '<div class="lp-page" id="lpExpertDetail">' + skeletons(1, 360) + '</div>' +
        publicFooter() +
      '</div>';

    (async function () {
      var host = document.getElementById('lpExpertDetail');
      var expert = await ExpertService.get(id);
      if (!document.body.contains(host)) return;

      if (!expert) {
        host.innerHTML = emptyState('That expert could not be found.',
                                    'Back to experts', 'data-lp-action="goto" data-lp-href="' + ROUTES.experts + '"');
        return;
      }

      host.innerHTML = '' +
        '<button class="lp-link" data-lp-action="goto" data-lp-href="' + ROUTES.experts + '" style="margin-bottom:20px">' +
          '<i class="fas fa-arrow-left"></i> All experts</button>' +

        '<div class="lp-detail-hero">' +
          '<div>' +
            '<div class="lp-author" style="margin-bottom:16px">' +
              '<img src="' + esc(safeImage(expert.avatar, expert.name)) + '" alt="" ' +
                'style="width:86px;height:86px;border-radius:50%;object-fit:cover">' +
              '<div>' +
                '<h1 class="section-title" style="margin:0 0 4px;font-size:1.7rem">' + esc(expert.name) +
                  (expert.verified ? ' <i class="fas fa-circle-check lp-verified"></i>' : '') + '</h1>' +
                '<p style="margin:0;opacity:.68">' + esc(expert.headline || 'ExpertHub consultant') + '</p>' +
              '</div>' +
            '</div>' +

            '<div class="lp-stars" style="font-size:.95rem;margin-bottom:14px">' + stars(expert.rating) +
              ' <span style="color:inherit;opacity:.6;margin-left:6px">' +
              (expert.rating ? expert.rating.toFixed(1) : 'New') +
              (expert.reviews ? ' · ' + expert.reviews + ' reviews' : '') +
              (expert.sessions ? ' · ' + expert.sessions + ' sessions' : '') + '</span>' +
            '</div>' +

            (expert.specializations.length
              ? '<div class="lp-tags" style="justify-content:flex-start;margin-bottom:20px">' +
                expert.specializations.map(function (s) {
                  return '<span class="lp-tag">' + esc(s) + '</span>';
                }).join('') + '</div>'
              : '') +

            '<p style="line-height:1.75;opacity:.76">' + esc(expert.headline) + '</p>' +
          '</div>' +

          '<aside class="lp-side">' +
            '<div class="lp-side-price">' +
              (expert.rate ? esc(fmtMoney(expert.rate, expert.currency)) : 'Contact') +
              (expert.rate ? '<span style="font-size:.82rem;font-weight:500;opacity:.6"> / session</span>' : '') +
            '</div>' +
            (expert.experienceYears
              ? '<div style="font-size:.86rem;opacity:.7"><i class="fas fa-briefcase"></i> ' +
                expert.experienceYears + ' years of experience</div>'
              : '') +
            '<button class="btn btn-primary btn-block" data-lp-action="goto" data-lp-href="' +
              (isAuthed() ? '#/messages' : ROUTES.register) + '">' +
              '<i class="fas fa-comments"></i> ' + (isAuthed() ? 'Book a consultation' : 'Sign up to book') + '</button>' +
            '<button class="btn btn-secondary btn-block" data-lp-action="goto" data-lp-href="' + ROUTES.contact + '">' +
              '<i class="fas fa-envelope"></i> Send a message</button>' +
          '</aside>' +
        '</div>';
    })();
  }

  function renderEventDetail(id) {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('events') +
        '<div class="lp-page" id="lpEventDetail" style="max-width:900px">' + skeletons(1, 360) + '</div>' +
        publicFooter() +
      '</div>';

    (async function () {
      var host = document.getElementById('lpEventDetail');
      var ev = await EventService.get(id);
      if (!document.body.contains(host)) return;

      if (!ev) {
        host.innerHTML = emptyState('That event could not be found.',
                                    'Back to events', 'data-lp-action="goto" data-lp-href="' + ROUTES.events + '"');
        return;
      }

      host.innerHTML = '' +
        '<button class="lp-link" data-lp-action="goto" data-lp-href="' + ROUTES.events + '" style="margin-bottom:20px">' +
          '<i class="fas fa-arrow-left"></i> All events</button>' +

        '<span class="lp-tag" style="display:inline-block;margin-bottom:12px">' +
          esc(ev.mode === 'physical' ? 'In person' : 'Online') + '</span>' +
        '<h1 class="section-title" style="margin:0 0 14px">' + esc(ev.title) + '</h1>' +

        '<div class="lp-detail-cover" style="margin-bottom:24px">' +
          '<img src="' + esc(safeImage(ev.cover, ev.title)) + '" alt="">' +
        '</div>' +

        '<div class="lp-grid lp-grid-3" style="margin-bottom:28px">' +
          '<div class="lp-row-card"><i class="fas fa-calendar-day" style="font-size:1.3rem;opacity:.5"></i>' +
            '<div><b style="display:block;font-size:.78rem;opacity:.55;text-transform:uppercase">Starts</b>' +
            esc(fmtDateTime(ev.startsAt)) + '</div></div>' +
          '<div class="lp-row-card"><i class="fas fa-' + (ev.mode === 'physical' ? 'location-dot' : 'video') +
            '" style="font-size:1.3rem;opacity:.5"></i>' +
            '<div><b style="display:block;font-size:.78rem;opacity:.55;text-transform:uppercase">Where</b>' +
            esc(ev.mode === 'physical' ? (ev.location || 'Venue TBA') : 'Online') + '</div></div>' +
          '<div class="lp-row-card"><i class="fas fa-tag" style="font-size:1.3rem;opacity:.5"></i>' +
            '<div><b style="display:block;font-size:.78rem;opacity:.55;text-transform:uppercase">Price</b>' +
            esc(fmtMoney(ev.price, ev.currency)) + '</div></div>' +
        '</div>' +

        '<p style="line-height:1.8;opacity:.76">' + esc(ev.summary) + '</p>' +

        '<div style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap">' +
          '<button class="btn btn-primary" data-lp-action="goto" data-lp-href="' +
            (isAuthed() ? '#/events' : ROUTES.register) + '">' +
            '<i class="fas fa-ticket"></i> ' + (isAuthed() ? 'Reserve a seat' : 'Sign up to register') + '</button>' +
          '<button class="btn btn-secondary" data-lp-action="goto" data-lp-href="' + ROUTES.contact + '">' +
            '<i class="fas fa-circle-question"></i> Ask about this event</button>' +
        '</div>';
    })();
  }

  /* ==========================================================
     9. INFO PAGES
     ========================================================== */
  function renderAbout() {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('about') +
        '<div class="lp-page" style="max-width:860px">' +
          '<span class="lp-badge">About ExpertHub</span>' +
          '<h1 class="section-title" style="margin:0 0 16px">One platform for learning, consulting and training</h1>' +
          '<p style="font-size:1.05rem;line-height:1.8;opacity:.78">' +
            'ExpertHub exists to close the gap between people who want to learn and the experts who can teach them. ' +
            'We bring an E-School, 1-on-1 consultations and corporate training into a single, accountable platform — ' +
            'so learners get real outcomes, experts get paid fairly, and institutions get measurable results.' +
          '</p>' +

          '<div class="features-grid" style="margin-top:36px">' +
            feature('fa-bullseye', '', 'Our mission', 'Make high-quality, human-guided education accessible and affordable.') +
            feature('fa-eye', 'linear-gradient(135deg,#10b981,#059669)', 'Our vision', 'A world where expertise can be found, booked and trusted in minutes.') +
            feature('fa-handshake', 'linear-gradient(135deg,#8b5cf6,#6d28d9)', 'Our promise', 'Verified experts, transparent pricing and protected payments.') +
          '</div>' +

          '<h2 class="section-title" style="font-size:1.3rem;margin:44px 0 14px">What we do</h2>' +
          '<ul class="lp-list">' +
            ['E-School — bootcamps, short courses, tuition and exam preparation.',
             'Consultations — chat, audio and video sessions with verified experts.',
             'Corporate training — programmes, cohorts, assessments and compliance tracking.',
             'Certification — verifiable certificates issued on completion.'
            ].map(function (t) { return '<li><i class="fas fa-circle-check"></i><span>' + esc(t) + '</span></li>'; }).join('') +
          '</ul>' +

          '<div class="lp-cta" style="margin-top:44px">' +
            '<h2>Join ExpertHub today</h2>' +
            '<p>Whether you want to learn, teach or train a whole organisation, it starts here.</p>' +
            '<button class="btn btn-primary" data-lp-action="goto" data-lp-href="' + ROUTES.register + '">' +
              '<i class="fas fa-rocket"></i> Create your account</button>' +
          '</div>' +
        '</div>' +
        publicFooter() +
      '</div>';
  }

  function renderContact() {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('contact') +
        '<div class="lp-page" style="max-width:760px">' +
          '<h1 class="section-title" style="margin-bottom:6px">Contact us</h1>' +
          '<p class="section-sub">Questions about courses, consultations or corporate training? We reply within one business day.</p>' +

          '<form class="lp-form" id="lpContactForm" style="margin-top:28px" novalidate>' +
            '<div class="lp-field">' +
              '<label for="lpContactName">Your name</label>' +
              '<input id="lpContactName" name="name" type="text" required placeholder="Jane Doe">' +
            '</div>' +
            '<div class="lp-field">' +
              '<label for="lpContactEmail">Email address</label>' +
              '<input id="lpContactEmail" name="email" type="email" required placeholder="jane@example.com">' +
            '</div>' +
            '<div class="lp-field">' +
              '<label for="lpContactTopic">Topic</label>' +
              '<select id="lpContactTopic" name="topic">' +
                '<option>General enquiry</option>' +
                '<option>Course support</option>' +
                '<option>Become an expert</option>' +
                '<option>Corporate training</option>' +
                '<option>Billing &amp; payments</option>' +
                '<option>Report a problem</option>' +
              '</select>' +
            '</div>' +
            '<div class="lp-field">' +
              '<label for="lpContactMessage">Message</label>' +
              '<textarea id="lpContactMessage" name="message" rows="6" required ' +
                'placeholder="Tell us how we can help…"></textarea>' +
            '</div>' +
            '<div id="lpContactStatus" style="font-size:.88rem"></div>' +
            '<button class="btn btn-primary" type="submit" style="justify-self:start">' +
              '<i class="fas fa-paper-plane"></i> Send message</button>' +
          '</form>' +

          '<div style="margin-top:36px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">' +
            contactTile('fa-envelope', 'Email', 'support@experthub.example') +
            contactTile('fa-comments', 'Live chat', 'Available in-app once signed in') +
            contactTile('fa-building-columns', 'Corporate', 'training@experthub.example') +
          '</div>' +
        '</div>' +
        publicFooter() +
      '</div>';

    var form = $('#lpContactForm');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var status = $('#lpContactStatus');
        var payload = {
          name: ($('#lpContactName') || {}).value || '',
          email: ($('#lpContactEmail') || {}).value || '',
          topic: ($('#lpContactTopic') || {}).value || '',
          message: ($('#lpContactMessage') || {}).value || '',
          source: 'public-landing'
        };

        if (!payload.name.trim() || !payload.email.trim() || !payload.message.trim()) {
          status.innerHTML = '<span style="color:#ef4444">Please fill in your name, email and message.</span>';
          return;
        }

        status.innerHTML = '<span style="opacity:.65"><i class="fas fa-circle-notch fa-spin"></i> Sending…</span>';

        try {
          await landingRequest('/contact', { method: 'POST', body: payload });
          status.innerHTML = '<span style="color:#10b981"><i class="fas fa-circle-check"></i> ' +
            'Thanks! We have received your message and will reply shortly.</span>';
          form.reset();
        } catch (err) {
          /* Never dead-end the visitor: fall back to their mail client. */
          status.innerHTML = '<span style="color:#f59e0b"><i class="fas fa-triangle-exclamation"></i> ' +
            'We could not send that automatically. ' +
            '<a href="mailto:support@experthub.example?subject=' +
            encodeURIComponent(payload.topic) + '&body=' + encodeURIComponent(payload.message) +
            '">Open your email client instead</a>.</span>';
        }
      });
    }
  }

  function contactTile(icon, label, value) {
    return '<div class="lp-row-card">' +
      '<i class="fas ' + icon + '" style="font-size:1.2rem;opacity:.5"></i>' +
      '<div><b style="display:block;font-size:.76rem;opacity:.55;text-transform:uppercase;letter-spacing:.05em">' +
        esc(label) + '</b>' + esc(value) + '</div>' +
    '</div>';
  }

  function renderInstitutions() {
    setPhase('landing');
    ensureStyles();

    var root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '' +
      '<div class="landing">' + publicNav('institutions') +
        '<div class="lp-page" style="max-width:1000px">' +
          '<span class="lp-badge">For institutions</span>' +
          '<h1 class="section-title" style="margin:0 0 16px">Corporate training that actually reports back</h1>' +
          '<p style="font-size:1.05rem;line-height:1.8;opacity:.78;max-width:70ch">' +
            'Run cohorts, assign trainers, assess trainees and prove compliance — all from one dashboard. ' +
            'ExpertHub gives L&amp;D teams the operational control of an LMS with the flexibility of a marketplace.' +
          '</p>' +

          '<div class="features-grid" style="margin-top:36px">' +
            feature('fa-users-rectangle', '', 'Programmes & cohorts', 'Build multi-week programmes and group trainees into cohorts.') +
            feature('fa-clipboard-check', 'linear-gradient(135deg,#10b981,#059669)', 'Assessments', 'Quizzes, assignments and capstone projects with automatic scoring.') +
            feature('fa-certificate', 'linear-gradient(135deg,#f59e0b,#d97706)', 'Certifications', 'Issue verifiable certificates your HR system can validate.') +
            feature('fa-chart-pie', 'linear-gradient(135deg,#8b5cf6,#6d28d9)', 'Analytics', 'Completion, scores and engagement across every cohort.') +
            feature('fa-shield-halved', 'linear-gradient(135deg,#ef4444,#b91c1c)', 'Compliance', 'Audit logs, attendance records and exportable reports.') +
            feature('fa-plug', 'linear-gradient(135deg,#0ea5e9,#0369a1)', 'Integrations', 'SSO, custom branding and API access on enterprise plans.') +
          '</div>' +

          '<h2 class="section-title" style="font-size:1.3rem;margin:48px 0 16px">How onboarding works</h2>' +
          '<ul class="lp-list">' +
            ['Register your institution and tell us about your training needs.',
             'Our team reviews and approves your account, usually within one business day.',
             'An operations manager is assigned to help you structure your first programme.',
             'Enrol trainees, assign trainers and start tracking progress immediately.'
            ].map(function (t, i) {
              return '<li><span class="lp-tag" style="flex:none">' + (i + 1) + '</span><span>' + esc(t) + '</span></li>';
            }).join('') +
          '</ul>' +

          '<div class="lp-cta" style="margin-top:44px">' +
            '<h2>Talk to our training team</h2>' +
            '<p>Tell us about your organisation and we will design a programme around your goals.</p>' +
            '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
              '<button class="btn btn-primary" data-lp-action="goto" data-lp-href="' + ROUTES.register + '">' +
                '<i class="fas fa-building-columns"></i> Register institution</button>' +
              '<button class="btn btn-secondary" data-lp-action="goto" data-lp-href="' + ROUTES.contact + '">' +
                '<i class="fas fa-comments"></i> Book a demo</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        publicFooter() +
      '</div>';
  }

  /* ==========================================================
     10. GLOBAL EVENT DELEGATION
     ----------------------------------------------------------
     One listener on `document` survives every re-render, so we
     never leak handlers when sections are replaced.
     ========================================================== */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-lp-action]') : null;
    if (!el) {
      /* Close the search dropdown when clicking outside it. */
      if (!(e.target && e.target.closest && e.target.closest('.lp-search'))) closeSearch();
      return;
    }

    var action = el.getAttribute('data-lp-action');

    switch (action) {
      case 'goto':
        e.preventDefault();
        go(el.getAttribute('data-lp-href'));
        break;

      case 'faq':
        e.preventDefault();
        if (el.parentElement) el.parentElement.classList.toggle('open');
        break;

      case 'chip': {
        e.preventDefault();
        var q = el.getAttribute('data-lp-query') || '';
        var input = document.getElementById('lpSearchInput');
        if (input) {
          input.value = q;
          input.focus();
          runSearch(q);
        } else {
          go(ROUTES.courses + '?q=' + encodeURIComponent(q));
        }
        break;
      }

      case 'search-all': {
        e.preventDefault();
        var query = el.getAttribute('data-lp-query') || '';
        closeSearch();
        go(ROUTES.courses + '?q=' + encodeURIComponent(query));
        break;
      }

      case 'course-filter': {
        e.preventDefault();
        var cat = el.getAttribute('data-lp-filter') || 'all';
        var siblings = el.parentElement ? el.parentElement.querySelectorAll('.lp-chip') : [];
        Array.prototype.forEach.call(siblings, function (s) { s.classList.remove('is-active'); });
        el.classList.add('is-active');
        var qInput = document.getElementById('lpCourseQuery');
        loadPublicCourses({ q: qInput ? qInput.value : '', category: cat });
        break;
      }

      case 'resource-open': {
        var url = el.getAttribute('data-lp-url');
        if (url && url !== '#') {
          window.open(url, '_blank', 'noopener');
        } else {
          /* No destination yet — send them to the resources index. */
          go(ROUTES.resources);
        }
        break;
      }

      case 'retry': {
        e.preventDefault();
        var section = el.getAttribute('data-lp-section');
        retrySection(section);
        break;
      }

      default:
        break;
    }
  }, false);

  /* Close the dropdown on Escape. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSearch();
  });

  function retrySection(section) {
    switch (section) {
      case 'courses':       invalidateCache('courses'); hydrateSection('lpCourses', loadCourses); break;
      case 'experts':       invalidateCache('experts'); hydrateSection('lpExperts', loadExperts); break;
      case 'events':        invalidateCache('events');  hydrateSection('lpEvents', loadEvents); break;
      case 'resources':     invalidateCache('resources'); hydrateSection('lpResources', loadResources); break;
      case 'course-list':   invalidateCache('courses'); loadPublicCourses({ q: '', category: currentCourseCategory }); break;
      case 'expert-list':   invalidateCache('experts'); loadPublicExperts(''); break;
      default:
        invalidateCache();
        hydrateLanding();
        break;
    }
  }

  function hydrateSection(elId, loader) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = skeletons(3, 240);
    loader(++runToken);
  }

  /* ==========================================================
     11. ROUTER INTEGRATION
     ========================================================== */
  /**
   * Resolve a hash / path into a public page handler.
   * Returns { fn, id } or null when the route is not ours.
   */
  function resolvePublicPage(path) {
    var raw = String(path || '').replace(/^#/, '');
    raw = raw.split('?')[0];
    var segments = raw.split('/').filter(Boolean);
    var key = segments[0] || 'home';
    var id = segments[1] ? decodeURIComponent(segments[1]) : null;

    switch (key) {
      case 'home':          return { fn: renderLanding,        id: null };
      case '':              return { fn: renderLanding,        id: null };
      case 'courses':       return id ? { fn: renderCourseDetail, id: id } : { fn: renderPublicCourses,   id: null };
      case 'experts':       return id ? { fn: renderExpertDetail, id: id } : { fn: renderPublicExperts,   id: null };
      case 'events':        return id ? { fn: renderEventDetail,  id: id } : { fn: renderPublicEvents,    id: null };
      case 'resources':     return { fn: renderPublicResources, id: null };
      case 'about':         return { fn: renderAbout,           id: null };
      case 'contact':       return { fn: renderContact,         id: null };
      case 'institutions':  return { fn: renderInstitutions,    id: null };
      default:              return null;
    }
  }

  /**
   * Router hook. Returns `true` when this module handled the route.
   *
   *   const handled = window.Landing.handleRoute(location.hash);
   *   if (handled) return;
   */
  function handleRoute(path) {
    var resolved = resolvePublicPage(path);
    if (!resolved) return false;
    runToken++;                       /* cancel in-flight section loads */
    resolved.fn(resolved.id);
    window.scrollTo({ top: 0, behavior: 'auto' });
    return true;
  }

  /* Named page map — handy if your router prefers a lookup table. */
  var PAGES = {
    '/':            renderLanding,
    '':             renderLanding,
    '/courses':     renderPublicCourses,
    '/experts':     renderPublicExperts,
    '/events':      renderPublicEvents,
    '/resources':   renderPublicResources,
    '/about':       renderAbout,
    '/contact':     renderContact,
    '/institutions': renderInstitutions
  };

  /* ==========================================================
     12. SAFETY-NET ROUTER
     ----------------------------------------------------------
     If 15-router.js has not yet been taught about the new public
     routes, this catches them: after a hash change we wait a beat
     and only act if the router left #app-root empty.
     Remove once the router is wired up — or set
     window.Landing.autoRoute = false to disable.
     ========================================================== */
  var autoRoute = true;

  window.addEventListener('hashchange', function () {
    if (!autoRoute) return;
    var hash = location.hash;
    if (!resolvePublicPage(hash)) return;

    setTimeout(function () {
      var root = document.getElementById('app-root');
      if (!root) return;
      if (root.innerHTML.trim() === '') handleRoute(hash);
    }, 60);
  });

  /* ==========================================================
     13. PUBLIC API
     ========================================================== */
  window.renderLanding        = renderLanding;
  window.renderPublicCourses  = renderPublicCourses;
  window.renderPublicExperts  = renderPublicExperts;
  window.renderPublicEvents   = renderPublicEvents;
  window.renderPublicResources = renderPublicResources;
  window.renderCourseDetail   = renderCourseDetail;
  window.renderExpertDetail   = renderExpertDetail;
  window.renderEventDetail    = renderEventDetail;
  window.renderAbout          = renderAbout;
  window.renderContact        = renderContact;
  window.renderInstitutions   = renderInstitutions;

  window.Landing = {
    routes: ROUTES,
    pages: PAGES,
    resolve: resolvePublicPage,
    handleRoute: handleRoute,
    go: go,
    invalidate: invalidateCache,
    services: {
      courses: CourseService,
      experts: ExpertService,
      events: EventService,
      resources: ResourceService,
      testimonials: TestimonialService,
      search: SearchService
    },
    get autoRoute() { return autoRoute; },
    set autoRoute(v) { autoRoute = !!v; }
  };
})();
