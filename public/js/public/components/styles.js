/* ============================================================
   ExpertHub — js/public/components/styles.js
   Injects extra CSS for public components (navbar, search dropdown,
   cards, skeletons, detail pages). Reuses classes from styles.css
   where possible — this only fills the gaps.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  var ID = 'public-ui-styles';

  P.ensureStyles = function () {
    if (document.getElementById(ID)) return;
    var css = [
      /* ======================================================
         PUBLIC NAVBAR
         3-column grid: brand (auto) · links (auto) · actions (auto)
         justify-content: space-between — so brand hugs the left,
         links sit next to it (or centered on wide screens), and
         actions pin to the right. Mobile collapses links into a
         slide-down drawer toggled by the hamburger.
         ====================================================== */
      '.pub-nav{position:sticky;top:0;z-index:50;width:100%;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(15,23,42,.08)}',
      '.dark .pub-nav{background:rgba(17,24,39,.9);border-bottom-color:rgba(255,255,255,.08)}',
      '.pub-nav-inner{max-width:1280px;margin:0 auto;padding:12px 24px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:24px}',

      /* brand */
      '.pub-nav-brand{display:flex;align-items:center;gap:10px;background:none;border:0;padding:0;cursor:pointer;font:inherit;color:inherit;text-decoration:none;white-space:nowrap}',
      '.pub-nav-brand-mark{width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;color:#fff;flex:none;box-shadow:0 6px 16px -6px rgba(99,102,241,.55)}',
      '.pub-nav-brand-mark i{font-size:.95rem}',
      '.pub-nav-brand-name{font-size:1.05rem;font-weight:800;letter-spacing:-.02em}',

      /* links (centre column) */
      '.pub-nav-links{display:flex;align-items:center;gap:2px;justify-content:center}',
      '.pub-nav-link{background:none;border:0;padding:8px 14px;border-radius:10px;font:inherit;font-size:.88rem;font-weight:600;color:inherit;opacity:.72;cursor:pointer;white-space:nowrap;transition:opacity .15s,background .15s,color .15s}',
      '.pub-nav-link:hover{opacity:1;background:rgba(99,102,241,.09);color:#4f46e5}',
      '.pub-nav-link.is-active{opacity:1;color:#4f46e5;background:rgba(99,102,241,.11)}',

      /* actions (right column) */
      '.pub-nav-actions{display:flex;align-items:center;gap:8px}',
      '.pub-nav-actions .btn{white-space:nowrap}',

      /* hamburger — hidden on desktop */
      '.pub-nav-toggle{display:none;width:40px;height:40px;border-radius:11px;border:1px solid rgba(15,23,42,.12);background:transparent;color:inherit;cursor:pointer;align-items:center;justify-content:center;font-size:1rem}',
      '.dark .pub-nav-toggle{border-color:rgba(255,255,255,.14)}',
      '.pub-nav-toggle:hover{background:rgba(99,102,241,.08);color:#4f46e5}',

      /* mobile drawer */
      '.pub-nav-drawer{display:none;border-top:1px solid rgba(15,23,42,.08);background:inherit}',
      '.dark .pub-nav-drawer{border-top-color:rgba(255,255,255,.08)}',
      '.pub-nav-drawer[data-open="true"]{display:block}',
      '.pub-nav-drawer-inner{max-width:1280px;margin:0 auto;padding:12px 24px 20px;display:flex;flex-direction:column;gap:4px}',
      '.pub-nav-drawer .pub-nav-link{text-align:left;padding:12px 14px;font-size:.95rem}',
      '.pub-nav-drawer-actions{display:flex;flex-direction:column;gap:8px;margin-top:12px;padding-top:14px;border-top:1px solid rgba(15,23,42,.08)}',
      '.dark .pub-nav-drawer-actions{border-top-color:rgba(255,255,255,.08)}',
      '.pub-nav-drawer-actions .btn{width:100%;justify-content:center}',

      /* responsive breakpoints */
      '@media(max-width:1024px){.pub-nav-inner{grid-template-columns:auto 1fr auto;gap:16px}}',
      '@media(max-width:900px){',
        '.pub-nav-links,.pub-nav-actions{display:none}',
        '.pub-nav-toggle{display:inline-flex}',
        '.pub-nav-inner{padding:10px 16px}',
      '}',

      /* ======================================================
         UNIFIED SEARCH
         ====================================================== */
      '.pub-search{position:relative;display:flex;align-items:center;gap:10px;background:#fff;border:1.5px solid rgba(15,23,42,.1);border-radius:16px;padding:8px 8px 8px 18px;max-width:620px;box-shadow:0 12px 32px -18px rgba(15,23,42,.35);transition:.2s}',
      '.dark .pub-search{background:#111827;border-color:rgba(255,255,255,.12)}',
      '.pub-search:focus-within{border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.14)}',
      '.pub-search>i{opacity:.45}',
      '.pub-search input{flex:1;border:0;outline:0;background:transparent;font:inherit;font-size:.98rem;padding:10px 0;color:inherit;min-width:0}',
      '.pub-search-results{position:absolute;top:calc(100% + 10px);left:0;right:0;background:#fff;border:1px solid rgba(15,23,42,.1);border-radius:16px;box-shadow:0 24px 60px -24px rgba(15,23,42,.45);max-height:64vh;overflow:auto;z-index:60;padding:8px}',
      '.dark .pub-search-results{background:#111827;border-color:rgba(255,255,255,.12)}',
      '.pub-search-group{padding:8px 10px 4px;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.45}',
      '.pub-search-item{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:none;border:0;font:inherit;color:inherit;padding:10px;border-radius:12px;cursor:pointer}',
      '.pub-search-item:hover{background:rgba(99,102,241,.09)}',
      '.pub-search-item img{width:38px;height:38px;border-radius:10px;object-fit:cover;flex:none}',
      '.pub-search-item b{display:block;font-size:.9rem;font-weight:650}',
      '.pub-search-item span{display:block;font-size:.76rem;opacity:.6}',
      '.pub-search-empty{padding:26px 16px;text-align:center;font-size:.88rem;opacity:.6}',
      '.pub-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
      '.pub-chip{border:1px solid rgba(15,23,42,.12);background:transparent;color:inherit;font:inherit;font-size:.8rem;font-weight:600;padding:6px 12px;border-radius:999px;cursor:pointer;opacity:.75;transition:.18s}',
      '.pub-chip:hover{opacity:1;border-color:#6366f1;color:#6366f1}',
      '.pub-chip.is-active{opacity:1;border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,.08)}',

      /* ======================================================
         GRIDS & CARDS
         ====================================================== */
      '.pub-grid{display:grid;gap:20px}',
      '.pub-grid-3{grid-template-columns:repeat(auto-fill,minmax(290px,1fr))}',
      '.pub-grid-4{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}',
      '.pub-card{display:flex;flex-direction:column;background:var(--surface,#fff);border:1px solid rgba(15,23,42,.09);border-radius:18px;overflow:hidden;transition:transform .2s,box-shadow .2s;text-align:left}',
      '.dark .pub-card{background:#111827;border-color:rgba(255,255,255,.1)}',
      '.pub-card:hover{transform:translateY(-3px);box-shadow:0 22px 44px -26px rgba(15,23,42,.5)}',
      '.pub-card-media{position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,#6366f1,#0ea5e9);overflow:hidden}',
      '.pub-card-media img{width:100%;height:100%;object-fit:cover;display:block}',
      '.pub-card-tag{position:absolute;top:10px;left:10px;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.92);color:#111827}',
      '.pub-card-price{position:absolute;top:10px;right:10px;font-size:.75rem;font-weight:800;padding:5px 10px;border-radius:999px;background:#6366f1;color:#fff}',
      '.pub-card-body{padding:16px 16px 18px;display:flex;flex-direction:column;gap:8px;flex:1}',
      '.pub-card-title{font-size:1rem;font-weight:700;line-height:1.35;margin:0}',
      '.pub-card-text{font-size:.85rem;line-height:1.55;opacity:.66;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.pub-card-meta{display:flex;align-items:center;gap:10px;font-size:.76rem;opacity:.62;margin-top:auto;padding-top:10px;flex-wrap:wrap}',
      '.pub-author{display:flex;align-items:center;gap:9px}',
      '.pub-author img{width:26px;height:26px;border-radius:50%;object-fit:cover}',
      '.pub-verified{color:#10b981;font-size:.78rem}',

      /* expert card */
      '.pub-expert{align-items:center;text-align:center;padding:26px 18px}',
      '.pub-expert .pub-expert-avatar{width:78px;height:78px;border-radius:50%;object-fit:cover;margin-bottom:12px}',
      '.pub-expert h3{margin:0 0 4px;font-size:1rem}',
      '.pub-expert .pub-expert-role{font-size:.82rem;opacity:.62;margin:0 0 10px}',
      '.pub-tags{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:12px}',
      '.pub-tag{font-size:.7rem;font-weight:600;padding:4px 9px;border-radius:999px;background:rgba(99,102,241,.12);color:#4f46e5}',
      '.pub-stars{color:#f59e0b;font-size:.8rem;margin-bottom:12px}',

      /* event row */
      '.pub-row-card{display:flex;gap:16px;align-items:center;padding:16px;border-radius:16px;border:1px solid rgba(15,23,42,.09);background:var(--surface,#fff)}',
      '.dark .pub-row-card{background:#111827;border-color:rgba(255,255,255,.1)}',
      '.pub-date-chip{flex:none;width:58px;height:58px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05}',
      '.pub-date-chip b{font-size:1.15rem;font-weight:800}',
      '.pub-date-chip span{font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;opacity:.85}',

      /* skeleton + empty */
      '.pub-skeleton{border-radius:18px;background:linear-gradient(90deg,rgba(148,163,184,.16) 25%,rgba(148,163,184,.28) 37%,rgba(148,163,184,.16) 63%);background-size:400% 100%;animation:pubShimmer 1.3s ease-in-out infinite;min-height:220px}',
      '@keyframes pubShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}',
      '.pub-empty{padding:44px 20px;text-align:center;border:1px dashed rgba(15,23,42,.18);border-radius:18px;opacity:.72}',
      '.pub-empty i{font-size:1.6rem;margin-bottom:10px;display:block;opacity:.5}',

      /* section head */
      '.pub-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:26px}',
      '.pub-link{background:none;border:0;font:inherit;font-weight:700;color:#6366f1;cursor:pointer;font-size:.9rem;display:inline-flex;align-items:center;gap:7px}',
      '.pub-link:hover{text-decoration:underline}',

      /* page + detail */
      '.pub-page{max-width:1120px;margin:0 auto;padding:44px 24px 72px}',
      '.pub-detail-hero{display:grid;grid-template-columns:1.2fr .8fr;gap:36px;align-items:start;margin-bottom:40px}',
      '@media(max-width:900px){.pub-detail-hero{grid-template-columns:1fr}}',
      '.pub-detail-cover{border-radius:20px;overflow:hidden;aspect-ratio:16/9;background:linear-gradient(135deg,#6366f1,#0ea5e9)}',
      '.pub-detail-cover img{width:100%;height:100%;object-fit:cover;display:block}',
      '.pub-side{position:sticky;top:92px;border:1px solid rgba(15,23,42,.1);border-radius:20px;padding:22px;background:var(--surface,#fff);display:flex;flex-direction:column;gap:14px}',
      '.dark .pub-side{background:#111827;border-color:rgba(255,255,255,.1)}',
      '.pub-side-price{font-size:1.9rem;font-weight:800}',
      '.pub-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}',
      '.pub-list li{display:flex;gap:11px;align-items:flex-start;font-size:.92rem;line-height:1.55}',
      '.pub-list i{color:#10b981;margin-top:4px}',

      /* forms */
      '.pub-form{display:grid;gap:14px;max-width:620px}',
      '.pub-field{display:flex;flex-direction:column;gap:6px}',
      '.pub-field label{font-size:.8rem;font-weight:700;opacity:.7}',
      '.pub-field input,.pub-field textarea,.pub-field select{font:inherit;padding:12px 14px;border-radius:12px;border:1.5px solid rgba(15,23,42,.12);background:var(--surface,#fff);color:inherit;outline:0;transition:.18s;width:100%;box-sizing:border-box}',
      '.dark .pub-field input,.dark .pub-field textarea,.dark .pub-field select{background:#111827;border-color:rgba(255,255,255,.14)}',
      '.pub-field input:focus,.pub-field textarea:focus,.pub-field select:focus{border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.13)}',

      /* footer grid */
      '.pub-footer{max-width:1200px;margin:0 auto;padding:44px 24px 60px;display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:32px;font-size:.88rem}',
      '@media(max-width:800px){.pub-footer{grid-template-columns:1fr 1fr}}',
      '.pub-footer h4{margin:0 0 12px;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;opacity:.5}',
      '.pub-footer ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}',
      '.pub-footer button{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;opacity:.75;text-align:left}',
      '.pub-footer button:hover{opacity:1;color:#6366f1}',
      '.pub-copy{grid-column:1/-1;border-top:1px solid rgba(15,23,42,.1);padding-top:20px;opacity:.55;font-size:.82rem}',

      /* cta band */
      '.pub-cta{max-width:1080px;margin:0 auto;padding:48px 32px;border-radius:26px;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#fff;text-align:center}',
      '.pub-cta h2{margin:0 0 10px;font-size:clamp(1.5rem,3vw,2.2rem);font-weight:800}',
      '.pub-cta p{margin:0 auto 24px;max-width:56ch;opacity:.9}'
    ].join('\n');

    var el = document.createElement('style');
    el.id = ID;
    el.textContent = css;
    document.head.appendChild(el);
  };

  /* Auto-inject on script load. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', P.ensureStyles);
  } else {
    P.ensureStyles();
  }
})();