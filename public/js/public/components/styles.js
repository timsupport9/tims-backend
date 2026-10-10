/* ============================================================
   ExpertHub — js/public/components/styles.js
   ------------------------------------------------------------------
   Injects the complete public-layer stylesheet as a single <style>
   tag. Design-token driven, dark-mode aware, a11y-first.
   ------------------------------------------------------------------
   Usage:
     window.PublicUI.ensureStyles();               // idempotent
     window.PublicUI.ensureStyles({ theme:'dark' }); // forces dark tokens
     window.PublicUI.ensureStyles({ reducedMotion:true });
   ------------------------------------------------------------------
   @module  PublicUI.styles — CSS injector
   @version 3.0.0
   ============================================================ */
(() => {
  'use strict';

  const P = (window.PublicUI = window.PublicUI || {});
  const STYLE_ID = 'public-ui-styles';
  const THEME_ATTR = 'data-theme';

  /* ============================================================
     §0. The stylesheet
     ============================================================ */

  const CSS = `
/* =================================================================
   §1. DESIGN TOKENS
   -----------------------------------------------------------------
   Every value here can be overridden by a downstream theme without
   touching component code. Colours use OKLCH (with sRGB fallbacks
   emitted via @supports for older engines).
   ================================================================= */

:root {
  /* ---- Brand palette (light) ---- */
  --pub-brand-50:  #eef2ff;
  --pub-brand-100: #e0e7ff;
  --pub-brand-200: #c7d2fe;
  --pub-brand-300: #a5b4fc;
  --pub-brand-400: #818cf8;
  --pub-brand-500: #6366f1;
  --pub-brand-600: #4f46e5;
  --pub-brand-700: #4338ca;
  --pub-brand-800: #3730a3;
  --pub-brand-900: #312e81;

  --pub-accent-500: #0ea5e9;
  --pub-accent-600: #0284c7;

  --pub-success: #10b981;
  --pub-warning: #f59e0b;
  --pub-danger:  #ef4444;
  --pub-info:    #3b82f6;

  /* ---- Neutrals ---- */
  --pub-bg:        #ffffff;
  --pub-bg-soft:   #f8fafc;
  --pub-bg-muted:  #f1f5f9;
  --pub-surface:   #ffffff;
  --pub-surface-2: #f8fafc;
  --pub-border:    rgba(15,23,42,.10);
  --pub-border-strong: rgba(15,23,42,.18);
  --pub-text:      #0f172a;
  --pub-text-soft: #334155;
  --pub-text-muted:#64748b;
  --pub-text-faint:#94a3b8;
  --pub-overlay:   rgba(15,23,42,.42);

  /* ---- Typography ---- */
  --pub-font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
                   "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --pub-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  --pub-fs-xs:   .75rem;
  --pub-fs-sm:   .8125rem;
  --pub-fs-base: .9375rem;
  --pub-fs-md:   1rem;
  --pub-fs-lg:   1.125rem;
  --pub-fs-xl:   1.25rem;
  --pub-fs-2xl:  1.5rem;
  --pub-fs-3xl:  1.875rem;
  --pub-fs-4xl:  2.25rem;
  --pub-fs-5xl:  3rem;

  --pub-lh-tight: 1.2;
  --pub-lh-snug:  1.35;
  --pub-lh-base:  1.55;
  --pub-lh-loose: 1.75;

  --pub-tracking-tight: -.02em;
  --pub-tracking-wide:  .04em;
  --pub-tracking-wider: .08em;

  /* ---- Spacing scale (4px base) ---- */
  --pub-s-1:  4px;
  --pub-s-2:  8px;
  --pub-s-3:  12px;
  --pub-s-4:  16px;
  --pub-s-5:  20px;
  --pub-s-6:  24px;
  --pub-s-8:  32px;
  --pub-s-10: 40px;
  --pub-s-12: 48px;
  --pub-s-16: 64px;
  --pub-s-20: 80px;
  --pub-s-24: 96px;

  /* ---- Radii ---- */
  --pub-r-xs:  6px;
  --pub-r-sm:  10px;
  --pub-r-md:  12px;
  --pub-r-lg:  16px;
  --pub-r-xl:  20px;
  --pub-r-2xl: 24px;
  --pub-r-full:999px;

  /* ---- Shadows ---- */
  --pub-shadow-xs: 0 1px 2px rgba(15,23,42,.06);
  --pub-shadow-sm: 0 4px 10px -4px rgba(15,23,42,.16);
  --pub-shadow-md: 0 10px 24px -12px rgba(15,23,42,.28);
  --pub-shadow-lg: 0 22px 44px -26px rgba(15,23,42,.42);
  --pub-shadow-xl: 0 32px 64px -32px rgba(15,23,42,.5);
  --pub-shadow-brand: 0 6px 16px -6px rgba(99,102,241,.55);

  /* ---- Motion ---- */
  --pub-ease-standard: cubic-bezier(.4,0,.2,1);
  --pub-ease-enter:    cubic-bezier(.16,1,.3,1);
  --pub-ease-exit:     cubic-bezier(.4,0,1,1);
  --pub-ease-spring:   cubic-bezier(.68,-.55,.27,1.55);
  --pub-dur-instant: 100ms;
  --pub-dur-quick:   180ms;
  --pub-dur-base:    260ms;
  --pub-dur-slow:    420ms;

  /* ---- Z-index scale ---- */
  --pub-z-below:    -1;
  --pub-z-base:      0;
  --pub-z-content:   1;
  --pub-z-sticky:   50;
  --pub-z-navbar:   60;
  --pub-z-drawer:   70;
  --pub-z-backdrop: 80;
  --pub-z-modal:    90;
  --pub-z-popover: 100;
  --pub-z-tooltip: 110;
  --pub-z-toast:   120;

  /* ---- Layout ---- */
  --pub-container-sm: 720px;
  --pub-container-md: 960px;
  --pub-container-lg: 1120px;
  --pub-container-xl: 1280px;
  --pub-gutter: clamp(16px, 3vw, 32px);

  /* ---- Focus ---- */
  --pub-focus-ring: 0 0 0 3px rgba(99,102,241,.35);
  --pub-focus-ring-offset: 2px;

  color-scheme: light;
}

/* ---- Dark theme (applies via class OR data-attr OR OS pref) ---- */
:where(.dark, [data-theme="dark"]) {
  --pub-bg:        #0b1220;
  --pub-bg-soft:   #0f172a;
  --pub-bg-muted:  #111827;
  --pub-surface:   #111827;
  --pub-surface-2: #1f2937;
  --pub-border:    rgba(255,255,255,.10);
  --pub-border-strong: rgba(255,255,255,.18);
  --pub-text:      #e2e8f0;
  --pub-text-soft: #cbd5e1;
  --pub-text-muted:#94a3b8;
  --pub-text-faint:#64748b;
  --pub-overlay:   rgba(0,0,0,.6);
  --pub-shadow-xs: 0 1px 2px rgba(0,0,0,.4);
  --pub-shadow-sm: 0 4px 10px -4px rgba(0,0,0,.55);
  --pub-shadow-md: 0 10px 24px -12px rgba(0,0,0,.65);
  --pub-shadow-lg: 0 22px 44px -26px rgba(0,0,0,.75);
  --pub-shadow-xl: 0 32px 64px -32px rgba(0,0,0,.85);
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :where(html:not([data-theme="light"]):not(.light)) {
    --pub-bg:        #0b1220;
    --pub-bg-soft:   #0f172a;
    --pub-bg-muted:  #111827;
    --pub-surface:   #111827;
    --pub-surface-2: #1f2937;
    --pub-border:    rgba(255,255,255,.10);
    --pub-border-strong: rgba(255,255,255,.18);
    --pub-text:      #e2e8f0;
    --pub-text-soft: #cbd5e1;
    --pub-text-muted:#94a3b8;
    --pub-text-faint:#64748b;
    --pub-overlay:   rgba(0,0,0,.6);
    color-scheme: dark;
  }
}

/* ---- OKLCH upgrade where supported (wider gamut, better mixing) ---- */
@supports (color: oklch(60% 0.2 270)) {
  :root {
    --pub-brand-500: oklch(60% 0.20 270);
    --pub-brand-600: oklch(55% 0.22 270);
    --pub-accent-500: oklch(66% 0.16 220);
    --pub-success:   oklch(72% 0.17 160);
    --pub-warning:   oklch(78% 0.16 75);
    --pub-danger:    oklch(63% 0.24 27);
  }
}

/* =================================================================
   §2. BASE / RESET (scoped to .pub-* to avoid clobbering the app)
   ================================================================= */

:where(.pub-root, .pub-page, .pub-nav, .pub-footer, .pub-cta, .pub-hero) {
  font-family: var(--pub-font-sans);
  color: var(--pub-text);
  line-height: var(--pub-lh-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-variant-ligatures: common-ligatures contextual;
  font-feature-settings: "ss01", "cv11";
}

:where(.pub-root, .pub-page) :is(h1,h2,h3,h4,h5,h6) {
  margin: 0;
  font-weight: 750;
  line-height: var(--pub-lh-tight);
  letter-spacing: var(--pub-tracking-tight);
  color: var(--pub-text);
}

:where(.pub-root, .pub-page) :is(p) { margin: 0; }
:where(.pub-root, .pub-page) :is(img, svg, video) { max-width: 100%; height: auto; display: block; }
:where(.pub-root, .pub-page) :is(a) { color: inherit; text-decoration: none; }
:where(.pub-root, .pub-page) :is(button, input, select, textarea) { font: inherit; color: inherit; }

/* Selection */
::selection { background: var(--pub-brand-200); color: var(--pub-text); }
.dark ::selection, [data-theme="dark"] ::selection { background: var(--pub-brand-700); color: #fff; }

/* Modern scrollbar (WebKit) */
.pub-root *::-webkit-scrollbar { width: 10px; height: 10px; }
.pub-root *::-webkit-scrollbar-track { background: transparent; }
.pub-root *::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--pub-text-faint) 45%, transparent);
  border-radius: var(--pub-r-full);
  border: 2px solid transparent;
  background-clip: padding-box;
}
.pub-root *::-webkit-scrollbar-thumb:hover { background-color: var(--pub-text-muted); background-clip: padding-box; }
.pub-root * { scrollbar-width: thin; scrollbar-color: var(--pub-text-faint) transparent; }

/* =================================================================
   §3. A11Y UTILITIES
   ================================================================= */

.pub-sr-only,
.pub-visually-hidden {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

.pub-skip-link {
  position: absolute; top: -100px; left: 8px;
  background: var(--pub-brand-600); color: #fff;
  padding: 10px 16px; border-radius: var(--pub-r-sm);
  z-index: var(--pub-z-toast); font-weight: 700;
  transition: top var(--pub-dur-quick) var(--pub-ease-standard);
}
.pub-skip-link:focus { top: 8px; outline: none; }

/* Global focus treatment */
:where(.pub-root, .pub-page) :is(a, button, [role="button"], input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--pub-brand-500);
  outline-offset: var(--pub-focus-ring-offset);
  border-radius: var(--pub-r-xs);
}

/* =================================================================
   §4. NAVBAR
   ================================================================= */

.pub-nav {
  position: sticky; top: 0;
  z-index: var(--pub-z-navbar);
  width: 100%;
  background: color-mix(in srgb, var(--pub-bg) 88%, transparent);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-block-end: 1px solid var(--pub-border);
  transition: box-shadow var(--pub-dur-quick) var(--pub-ease-standard),
              background var(--pub-dur-quick) var(--pub-ease-standard);
  isolation: isolate;
}
.pub-nav[data-scrolled="true"] { box-shadow: var(--pub-shadow-sm); }

.pub-nav-inner {
  max-width: var(--pub-container-xl);
  margin: 0 auto;
  padding: var(--pub-s-3) var(--pub-gutter);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--pub-s-6);
}

/* ---- brand ---- */
.pub-nav-brand {
  display: inline-flex; align-items: center; gap: 10px;
  background: none; border: 0; padding: 0; cursor: pointer;
  color: inherit; white-space: nowrap;
  border-radius: var(--pub-r-sm);
}
.pub-nav-brand:focus-visible { outline: 2px solid var(--pub-brand-500); outline-offset: 3px; }

.pub-nav-brand-mark {
  width: 36px; height: 36px; border-radius: var(--pub-r-md);
  background: linear-gradient(135deg, var(--pub-brand-500), var(--pub-brand-600));
  display: grid; place-items: center;
  color: #fff; flex: none;
  box-shadow: var(--pub-shadow-brand);
  transition: transform var(--pub-dur-base) var(--pub-ease-spring);
}
.pub-nav-brand:hover .pub-nav-brand-mark { transform: rotate(-6deg) scale(1.05); }
.pub-nav-brand-mark i { font-size: .95rem; }
.pub-nav-brand-name {
  font-size: var(--pub-fs-md); font-weight: 800;
  letter-spacing: var(--pub-tracking-tight);
}

/* ---- desktop links ---- */
.pub-nav-links {
  display: flex; align-items: center; justify-content: center;
  gap: 2px; min-width: 0;
}
.pub-nav-link {
  position: relative;
  background: none; border: 0;
  padding: 8px 14px; border-radius: var(--pub-r-sm);
  font-size: var(--pub-fs-sm); font-weight: 600;
  color: inherit; opacity: .74; cursor: pointer;
  white-space: nowrap;
  transition: opacity var(--pub-dur-quick), background var(--pub-dur-quick), color var(--pub-dur-quick);
}
.pub-nav-link:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--pub-brand-500) 9%, transparent);
  color: var(--pub-brand-600);
}
.pub-nav-link.is-active {
  opacity: 1;
  color: var(--pub-brand-600);
  background: color-mix(in srgb, var(--pub-brand-500) 12%, transparent);
}
.pub-nav-link.is-active::after {
  content: ""; position: absolute;
  left: 14px; right: 14px; bottom: -1px;
  height: 2px; border-radius: 2px;
  background: var(--pub-brand-500);
}

/* ---- actions ---- */
.pub-nav-actions { display: flex; align-items: center; gap: var(--pub-s-2); }

/* ---- hamburger (three animated lines) ---- */
.pub-nav-toggle {
  display: none;
  width: 44px; height: 44px;
  border-radius: var(--pub-r-md);
  border: 1px solid var(--pub-border);
  background: transparent; color: inherit;
  cursor: pointer; position: relative; padding: 0;
  transition: background var(--pub-dur-quick), border-color var(--pub-dur-quick);
}
.pub-nav-toggle:hover {
  background: color-mix(in srgb, var(--pub-brand-500) 8%, transparent);
  border-color: color-mix(in srgb, var(--pub-brand-500) 35%, transparent);
}
.pub-nav-toggle:focus-visible { outline: 2px solid var(--pub-brand-500); outline-offset: 2px; }
.pub-nav-toggle-line {
  position: absolute; left: 50%;
  width: 20px; height: 2px; border-radius: 2px;
  background: currentColor;
  transform: translateX(-50%);
  transition: transform var(--pub-dur-base) var(--pub-ease-spring),
              opacity var(--pub-dur-quick),
              top var(--pub-dur-base) var(--pub-ease-standard);
}
.pub-nav-toggle-line:nth-child(1) { top: 14px; }
.pub-nav-toggle-line:nth-child(2) { top: 21px; }
.pub-nav-toggle-line:nth-child(3) { top: 28px; }

.pub-nav[data-drawer="open"] .pub-nav-toggle-line:nth-child(1) { top: 21px; transform: translateX(-50%) rotate(45deg); }
.pub-nav[data-drawer="open"] .pub-nav-toggle-line:nth-child(2) { opacity: 0; transform: translateX(-50%) scaleX(.4); }
.pub-nav[data-drawer="open"] .pub-nav-toggle-line:nth-child(3) { top: 21px; transform: translateX(-50%) rotate(-45deg); }

/* ---- slide-down drawer ---- */
.pub-nav-drawer {
  overflow: hidden;
  max-height: 0; opacity: 0;
  background: inherit;
  border-block-start: 1px solid transparent;
  transition: max-height var(--pub-dur-base) var(--pub-ease-standard),
              opacity var(--pub-dur-quick) var(--pub-ease-standard);
}
.pub-nav-drawer[data-open="true"] {
  max-height: min(80vh, 640px);
  opacity: 1;
  border-block-start-color: var(--pub-border);
}
.pub-nav-drawer-inner {
  max-width: var(--pub-container-xl);
  margin: 0 auto;
  padding: var(--pub-s-2) var(--pub-gutter) var(--pub-s-5);
  display: flex; flex-direction: column; gap: 2px;
}
.pub-nav-drawer-links { display: flex; flex-direction: column; gap: 2px; }
.pub-nav-drawer .pub-nav-link { text-align: left; padding: 13px 14px; font-size: var(--pub-fs-base); }
.pub-nav-drawer-actions {
  display: flex; flex-direction: column; gap: var(--pub-s-2);
  margin-block-start: var(--pub-s-3);
  padding-block-start: var(--pub-s-4);
  border-block-start: 1px solid var(--pub-border);
}
.pub-nav-drawer-actions .btn { width: 100%; justify-content: center; }

/* ---- backdrop ---- */
.pub-nav-backdrop {
  position: fixed; inset: 0;
  background: var(--pub-overlay);
  backdrop-filter: blur(2px);
  z-index: var(--pub-z-backdrop);
  opacity: 0; pointer-events: none;
  transition: opacity var(--pub-dur-base) var(--pub-ease-standard);
}
.pub-nav-backdrop[data-open="true"] { opacity: 1; pointer-events: auto; }

body.pub-nav-locked { overflow: hidden; }

/* ---- responsive ---- */
@media (max-width: 1180px) {
  .pub-nav-inner { gap: var(--pub-s-4); }
  .pub-nav-link { padding: 8px 11px; font-size: .84rem; }
}
@media (max-width: 1024px) {
  .pub-nav-links { display: none; }
  .pub-nav-toggle { display: inline-flex; align-items: center; justify-content: center; }
  .pub-nav-inner { padding: 10px 16px; }
  .pub-nav-signin, .pub-nav-register { display: none; }
}
@media (max-width: 480px) {
  .pub-nav-inner { padding: 10px 12px; }
  .pub-nav-brand-name { font-size: var(--pub-fs-base); }
  .pub-nav-brand-mark { width: 32px; height: 32px; border-radius: var(--pub-r-sm); }
  .pub-nav-toggle { width: 40px; height: 40px; }
  .pub-nav-toggle-line { width: 18px; }
  .pub-nav-toggle-line:nth-child(1) { top: 13px; }
  .pub-nav-toggle-line:nth-child(2) { top: 19px; }
  .pub-nav-toggle-line:nth-child(3) { top: 25px; }
  .pub-nav[data-drawer="open"] .pub-nav-toggle-line:nth-child(1),
  .pub-nav[data-drawer="open"] .pub-nav-toggle-line:nth-child(3) { top: 19px; }
}

/* =================================================================
   §5. HERO
   ================================================================= */

.pub-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
  align-items: center;
  gap: clamp(32px, 5vw, 72px);
  padding: clamp(48px, 8vw, 120px) var(--pub-gutter);
  max-width: var(--pub-container-xl);
  margin: 0 auto;
}
@media (max-width: 900px) { .pub-hero { grid-template-columns: 1fr; text-align: center; } }
.pub-hero.has-photo { position: relative; }
.pub-hero.has-photo::before {
  content: ""; position: absolute; inset: 0;
  background:
    radial-gradient(60% 60% at 20% 10%, color-mix(in srgb, var(--pub-brand-500) 12%, transparent), transparent 60%),
    radial-gradient(50% 60% at 90% 90%, color-mix(in srgb, var(--pub-accent-500) 10%, transparent), transparent 60%);
  pointer-events: none; z-index: -1;
}

.pub-hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px; border-radius: var(--pub-r-full);
  background: var(--pub-surface); border: 1px solid var(--pub-border);
  font-size: var(--pub-fs-xs); font-weight: 700;
  letter-spacing: var(--pub-tracking-wide); text-transform: uppercase;
  color: var(--pub-text-soft);
  box-shadow: var(--pub-shadow-xs);
}
.pub-hero-badge-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--pub-success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pub-success) 25%, transparent);
  animation: pubPulse 2s var(--pub-ease-standard) infinite;
}
@keyframes pubPulse {
  0%,100% { opacity: 1; }
  50% { opacity: .55; }
}

.pub-hero-title {
  font-size: clamp(2rem, 5vw, var(--pub-fs-5xl));
  font-weight: 800;
  letter-spacing: -.03em;
  margin-block: var(--pub-s-5) var(--pub-s-4);
  line-height: 1.08;
}
.pub-hero-title-accent {
  background: linear-gradient(120deg, var(--pub-brand-600), var(--pub-accent-500) 60%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.pub-hero-subtitle {
  font-size: clamp(var(--pub-fs-md), 1.6vw, var(--pub-fs-lg));
  line-height: var(--pub-lh-loose);
  color: var(--pub-text-muted);
  max-width: 56ch;
  margin-block-end: var(--pub-s-6);
}
@media (max-width: 900px) { .pub-hero-subtitle { margin-inline: auto; } }

.pub-hero-cta { display: flex; gap: var(--pub-s-3); flex-wrap: wrap; margin-block-end: var(--pub-s-8); }
@media (max-width: 900px) { .pub-hero-cta { justify-content: center; } }

.pub-hero-stats {
  display: grid; grid-auto-flow: column;
  gap: clamp(24px, 4vw, 56px);
  margin-block-end: var(--pub-s-6);
}
@media (max-width: 640px) { .pub-hero-stats { grid-auto-flow: row; text-align: center; justify-content: center; } }
.pub-hero-stat-value {
  font-size: clamp(1.4rem, 2.4vw, var(--pub-fs-2xl));
  font-weight: 800;
  letter-spacing: -.02em;
}
.pub-hero-stat-label {
  font-size: var(--pub-fs-xs); font-weight: 600;
  text-transform: uppercase; letter-spacing: var(--pub-tracking-wider);
  color: var(--pub-text-muted);
}
.pub-hero-trust {
  display: flex; align-items: center; gap: var(--pub-s-4);
  font-size: var(--pub-fs-sm); color: var(--pub-text-muted);
}
@media (max-width: 900px) { .pub-hero-trust { justify-content: center; } }
.pub-hero-avatars { display: flex; }
.pub-hero-avatars img {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid var(--pub-bg);
  margin-inline-start: -10px;
  box-shadow: var(--pub-shadow-xs);
}
.pub-hero-avatars img:first-child { margin-inline-start: 0; }

.pub-hero-visual {
  position: relative;
  border-radius: var(--pub-r-2xl);
  overflow: hidden;
  box-shadow: var(--pub-shadow-xl);
  background: linear-gradient(135deg, var(--pub-brand-500), var(--pub-accent-500));
  aspect-ratio: 16/11;
}
.pub-hero-visual img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* =================================================================
   §6. UNIFIED SEARCH + AUTOCOMPLETE
   ================================================================= */

.pub-search {
  position: relative;
  display: flex; align-items: center; gap: var(--pub-s-3);
  background: var(--pub-surface);
  border: 1.5px solid var(--pub-border);
  border-radius: var(--pub-r-lg);
  padding: 6px 6px 6px 16px;
  max-width: 640px; width: 100%;
  box-shadow: var(--pub-shadow-md);
  transition: border-color var(--pub-dur-quick), box-shadow var(--pub-dur-quick);
}
.pub-search:focus-within {
  border-color: var(--pub-brand-500);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--pub-brand-500) 15%, transparent);
}
.pub-search > i { opacity: .45; flex: none; }
.pub-search input {
  flex: 1; min-width: 0;
  border: 0; outline: 0; background: transparent;
  padding: 10px 0; font-size: var(--pub-fs-base);
  color: inherit;
}
.pub-search input::placeholder { color: var(--pub-text-faint); }

.pub-search-results {
  position: absolute;
  top: calc(100% + 10px);
  left: 0; right: 0;
  background: var(--pub-surface);
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-lg);
  box-shadow: var(--pub-shadow-xl);
  max-height: 64vh;
  overflow: auto;
  z-index: var(--pub-z-popover);
  padding: var(--pub-s-2);
  animation: pubPop var(--pub-dur-quick) var(--pub-ease-enter);
}
@keyframes pubPop {
  from { opacity: 0; transform: translateY(-4px) scale(.98); }
  to   { opacity: 1; transform: none; }
}
.pub-search-group {
  padding: 8px 10px 4px;
  font-size: .7rem; font-weight: 800;
  letter-spacing: var(--pub-tracking-wider);
  text-transform: uppercase;
  color: var(--pub-text-faint);
}
.pub-search-item {
  display: flex; gap: var(--pub-s-3); align-items: center;
  width: 100%; text-align: left;
  background: none; border: 0;
  padding: 10px; border-radius: var(--pub-r-md);
  cursor: pointer;
  transition: background var(--pub-dur-instant);
}
.pub-search-item:hover, .pub-search-item[aria-selected="true"] {
  background: color-mix(in srgb, var(--pub-brand-500) 9%, transparent);
}
.pub-search-item img {
  width: 38px; height: 38px; border-radius: var(--pub-r-sm);
  object-fit: cover; flex: none;
}
.pub-search-item b {
  display: block; font-size: var(--pub-fs-sm); font-weight: 650;
  color: var(--pub-text);
}
.pub-search-item span {
  display: block; font-size: var(--pub-fs-xs);
  color: var(--pub-text-muted);
}
.pub-search-empty {
  padding: 26px 16px; text-align: center;
  color: var(--pub-text-muted); font-size: var(--pub-fs-sm);
}

/* ---- filter chips ---- */
.pub-chips {
  display: flex; gap: var(--pub-s-2); flex-wrap: wrap;
  margin-block-start: var(--pub-s-3);
}
.pub-chip {
  border: 1px solid var(--pub-border);
  background: transparent; color: inherit;
  font-size: var(--pub-fs-sm); font-weight: 600;
  padding: 6px 12px; border-radius: var(--pub-r-full);
  cursor: pointer;
  transition: all var(--pub-dur-quick);
}
.pub-chip:hover {
  border-color: var(--pub-brand-500);
  color: var(--pub-brand-600);
}
.pub-chip.is-active {
  border-color: var(--pub-brand-500);
  color: var(--pub-brand-600);
  background: color-mix(in srgb, var(--pub-brand-500) 10%, transparent);
}
.pub-chip[disabled] { opacity: .4; pointer-events: none; }

/* =================================================================
   §7. LAYOUT PRIMITIVES
   ================================================================= */

.pub-container {
  width: 100%;
  max-width: var(--pub-container-xl);
  margin-inline: auto;
  padding-inline: var(--pub-gutter);
}
.pub-container-sm { max-width: var(--pub-container-sm); }
.pub-container-md { max-width: var(--pub-container-md); }
.pub-container-lg { max-width: var(--pub-container-lg); }

.pub-section { padding-block: clamp(56px, 8vw, 96px); }
.pub-section.alt { background: var(--pub-bg-soft); }

.pub-section-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: var(--pub-s-5); flex-wrap: wrap;
  margin-block-end: var(--pub-s-6);
}
.pub-section-title {
  font-size: clamp(var(--pub-fs-xl), 2.6vw, var(--pub-fs-3xl));
  font-weight: 800; letter-spacing: -.02em;
  margin-block-end: var(--pub-s-2);
}
.pub-section-sub {
  color: var(--pub-text-muted);
  font-size: var(--pub-fs-md);
  max-width: 60ch;
}

.pub-grid { display: grid; gap: var(--pub-s-5); }
.pub-grid-2 { grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); }
.pub-grid-3 { grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
.pub-grid-4 { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.pub-grid-wide { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }

.pub-stack { display: flex; flex-direction: column; gap: var(--pub-s-4); }
.pub-row   { display: flex; align-items: center; gap: var(--pub-s-3); flex-wrap: wrap; }
.pub-row-between { justify-content: space-between; }

/* Container queries — progressive enhancement */
@supports (container-type: inline-size) {
  .pub-cq { container-type: inline-size; }
  @container (min-width: 640px) {
    .pub-cq-2col { grid-template-columns: 1fr 1fr; }
  }
}

/* =================================================================
   §8. CARDS — course / expert / event / resource / category
   ================================================================= */

/* ---- base card ---- */
.pub-card {
  display: flex; flex-direction: column;
  background: var(--pub-surface);
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-xl);
  overflow: hidden;
  transition: transform var(--pub-dur-base) var(--pub-ease-standard),
              box-shadow var(--pub-dur-base) var(--pub-ease-standard),
              border-color var(--pub-dur-base) var(--pub-ease-standard);
  will-change: transform;
}
.pub-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--pub-shadow-lg);
  border-color: color-mix(in srgb, var(--pub-brand-500) 30%, var(--pub-border));
}
.pub-card.is-interactive { cursor: pointer; }

/* ---- media ---- */
.pub-card-media {
  position: relative;
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, var(--pub-brand-500), var(--pub-accent-500));
  overflow: hidden;
}
.pub-card-media img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  transition: transform var(--pub-dur-slow) var(--pub-ease-standard);
}
.pub-card:hover .pub-card-media img { transform: scale(1.04); }
.pub-card-media.zoom img { transition-duration: 600ms; }
.pub-card:hover .pub-card-media.zoom img { transform: scale(1.06); }

/* ---- overlays on media ---- */
.pub-card-tag {
  position: absolute; top: 10px; left: 10px;
  font-size: .68rem; font-weight: 800;
  letter-spacing: var(--pub-tracking-wide); text-transform: uppercase;
  padding: 5px 10px; border-radius: var(--pub-r-full);
  background: color-mix(in srgb, var(--pub-surface) 92%, transparent);
  color: var(--pub-text);
  backdrop-filter: blur(6px);
}
.pub-card-price {
  position: absolute; top: 10px; right: 10px;
  font-size: var(--pub-fs-xs); font-weight: 800;
  padding: 5px 10px; border-radius: var(--pub-r-full);
  background: var(--pub-brand-600); color: #fff;
}
.pub-card-ribbon {
  position: absolute; top: 14px; left: -34px;
  transform: rotate(-45deg);
  background: var(--pub-warning); color: #1f2937;
  font-size: .68rem; font-weight: 800;
  padding: 4px 44px;
  letter-spacing: var(--pub-tracking-wide);
  text-transform: uppercase;
  box-shadow: var(--pub-shadow-xs);
}
.pub-card-ribbon.is-new { background: var(--pub-success); color: #fff; }

/* ---- body ---- */
.pub-card-body {
  padding: var(--pub-s-4) var(--pub-s-4) var(--pub-s-5);
  display: flex; flex-direction: column; gap: var(--pub-s-2);
  flex: 1;
}
.pub-card-title {
  font-size: var(--pub-fs-md); font-weight: 700;
  line-height: var(--pub-lh-snug);
  color: var(--pub-text);
}
.pub-card-title a { color: inherit; }
.pub-card-title a:hover { color: var(--pub-brand-600); }
.pub-card-text {
  font-size: var(--pub-fs-sm); line-height: var(--pub-lh-base);
  color: var(--pub-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pub-card-text.clamp-3 { -webkit-line-clamp: 3; }
.pub-card-meta {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-size: var(--pub-fs-xs); color: var(--pub-text-muted);
  margin-block-start: auto;
  padding-block-start: var(--pub-s-3);
}
.pub-card-footer {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--pub-s-3); margin-block-start: auto;
  padding-block-start: var(--pub-s-3);
}

/* ---- author chip ---- */
.pub-author { display: flex; align-items: center; gap: 8px; }
.pub-author img { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; flex: none; }
.pub-author-name { font-size: var(--pub-fs-xs); font-weight: 600; }
.pub-verified {
  color: var(--pub-success);
  font-size: .78rem;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--pub-success) 40%, transparent));
}

/* ---- expert card ---- */
.pub-expert {
  align-items: center; text-align: center;
  padding: var(--pub-s-6) var(--pub-s-5);
}
.pub-expert-avatar-wrap {
  position: relative;
  width: 84px; height: 84px;
  margin-block-end: var(--pub-s-3);
}
.pub-expert-avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--pub-surface);
  box-shadow: var(--pub-shadow-md);
}
.pub-expert-avatar-wrap .pub-avatar-status {
  position: absolute; bottom: 4px; right: 4px;
  width: 14px; height: 14px;
  background: var(--pub-success);
  border: 3px solid var(--pub-surface);
  border-radius: 50%;
}
.pub-expert h3 { margin: 0 0 4px; font-size: var(--pub-fs-md); }
.pub-expert-role {
  font-size: var(--pub-fs-sm); color: var(--pub-text-muted);
  margin: 0 0 var(--pub-s-2);
}
.pub-expert-rate {
  font-size: var(--pub-fs-lg); font-weight: 800;
  color: var(--pub-brand-600);
  margin-block: var(--pub-s-2) var(--pub-s-3);
}
.pub-expert-rate small {
  font-size: var(--pub-fs-xs); font-weight: 500;
  color: var(--pub-text-muted);
}

/* ---- tags ---- */
.pub-tags {
  display: flex; gap: 6px; flex-wrap: wrap;
  justify-content: center;
  margin-block-end: var(--pub-s-3);
}
.pub-tag {
  font-size: .7rem; font-weight: 600;
  padding: 4px 9px; border-radius: var(--pub-r-full);
  background: color-mix(in srgb, var(--pub-brand-500) 12%, transparent);
  color: var(--pub-brand-700);
}
.dark .pub-tag, [data-theme="dark"] .pub-tag { color: var(--pub-brand-300); }

/* ---- stars ---- */
.pub-stars {
  color: var(--pub-warning);
  font-size: var(--pub-fs-sm);
  letter-spacing: 1px;
}
.pub-stars .empty { color: var(--pub-text-faint); opacity: .4; }
.pub-stars .half { position: relative; display: inline-block; }
.pub-stars .half::after {
  content: "★"; position: absolute; left: 0; width: 50%;
  overflow: hidden;
}

/* ---- event card (row) ---- */
.pub-event-card {
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: var(--pub-s-4);
  align-items: center;
  padding: var(--pub-s-4);
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-xl);
  background: var(--pub-surface);
  transition: border-color var(--pub-dur-quick), box-shadow var(--pub-dur-quick);
}
.pub-event-card:hover { border-color: color-mix(in srgb, var(--pub-brand-500) 30%, var(--pub-border)); box-shadow: var(--pub-shadow-md); }
@media (max-width: 720px) { .pub-event-card { grid-template-columns: 1fr; } }

.pub-event-cover {
  position: relative;
  aspect-ratio: 12/5;
  border-radius: var(--pub-r-lg);
  overflow: hidden;
  background: linear-gradient(135deg, var(--pub-brand-500), var(--pub-accent-500));
}
.pub-event-cover img { width: 100%; height: 100%; object-fit: cover; }

.pub-date-chip {
  flex: none; width: 60px; height: 60px;
  border-radius: var(--pub-r-md);
  background: linear-gradient(135deg, var(--pub-brand-500), var(--pub-brand-600));
  color: #fff;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  line-height: 1.05;
  box-shadow: var(--pub-shadow-brand);
}
.pub-date-chip b { font-size: 1.15rem; font-weight: 800; }
.pub-date-chip span {
  font-size: .66rem; text-transform: uppercase;
  letter-spacing: var(--pub-tracking-wide); opacity: .9;
}

/* ---- category tile ---- */
.pub-category {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: var(--pub-s-6) var(--pub-s-4);
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-xl);
  background: var(--pub-surface);
  transition: all var(--pub-dur-base) var(--pub-ease-standard);
}
.pub-category:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--pub-brand-500) 40%, var(--pub-border));
  box-shadow: var(--pub-shadow-md);
}
.pub-category-icon {
  width: 52px; height: 52px;
  border-radius: var(--pub-r-md);
  display: grid; place-items: center;
  background: color-mix(in srgb, var(--pub-brand-500) 12%, transparent);
  color: var(--pub-brand-600);
  font-size: 1.2rem;
  margin-block-end: var(--pub-s-3);
}
.pub-category-title { font-size: var(--pub-fs-md); font-weight: 700; }
.pub-category-count { font-size: var(--pub-fs-xs); color: var(--pub-text-muted); margin-block-start: 2px; }

/* =================================================================
   §9. SKELETONS / EMPTY STATES / LOADING
   ================================================================= */

.pub-skeleton {
  border-radius: var(--pub-r-xl);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--pub-text-faint) 15%, transparent) 25%,
    color-mix(in srgb, var(--pub-text-faint) 28%, transparent) 37%,
    color-mix(in srgb, var(--pub-text-faint) 15%, transparent) 63%
  );
  background-size: 400% 100%;
  animation: pubShimmer 1.4s ease-in-out infinite;
  min-height: 220px;
  overflow: hidden;
}
.pub-skeleton-text   { min-height: 12px; border-radius: var(--pub-r-xs); }
.pub-skeleton-title  { min-height: 22px; border-radius: var(--pub-r-xs); }
.pub-skeleton-avatar { width: 44px; height: 44px; min-height: 44px; border-radius: 50%; }
.pub-skeleton-image  { min-height: 180px; }
.pub-skeleton-card   { min-height: 320px; }
@keyframes pubShimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.pub-empty {
  padding: var(--pub-s-12) var(--pub-s-5);
  text-align: center;
  border: 1px dashed var(--pub-border-strong);
  border-radius: var(--pub-r-xl);
  color: var(--pub-text-muted);
}
.pub-empty i {
  font-size: 1.8rem;
  margin-block-end: var(--pub-s-3);
  display: block;
  color: var(--pub-text-faint);
}
.pub-empty h3 {
  color: var(--pub-text);
  font-size: var(--pub-fs-lg);
  margin-block-end: var(--pub-s-2);
}

.pub-spinner {
  width: 1em; height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: pubSpin .7s linear infinite;
}
@keyframes pubSpin { to { transform: rotate(360deg); } }

/* =================================================================
   §10. FILTERS / PAGINATION / BREADCRUMBS
   ================================================================= */

.pub-filter-bar {
  display: flex; align-items: center; gap: var(--pub-s-3);
  flex-wrap: wrap;
  padding: var(--pub-s-3);
  background: var(--pub-surface);
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-lg);
  margin-block-end: var(--pub-s-6);
}
.pub-filter-bar-inner { display: flex; align-items: center; gap: var(--pub-s-2); flex-wrap: wrap; flex: 1; }
.pub-filter-select {
  padding: 8px 12px; border-radius: var(--pub-r-md);
  border: 1px solid var(--pub-border);
  background: var(--pub-surface); color: inherit;
  font-size: var(--pub-fs-sm);
}

.pub-pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; margin-block-start: var(--pub-s-8);
}
.pub-page-btn {
  min-width: 38px; height: 38px;
  border-radius: var(--pub-r-sm);
  border: 1px solid var(--pub-border);
  background: var(--pub-surface); color: inherit;
  font-size: var(--pub-fs-sm); font-weight: 600;
  cursor: pointer;
  transition: all var(--pub-dur-quick);
}
.pub-page-btn:hover:not([disabled]) { border-color: var(--pub-brand-500); color: var(--pub-brand-600); }
.pub-page-btn.is-active {
  background: var(--pub-brand-600); color: #fff;
  border-color: var(--pub-brand-600);
}
.pub-page-btn[disabled] { opacity: .4; cursor: not-allowed; }

.pub-breadcrumbs {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: var(--pub-fs-sm);
  color: var(--pub-text-muted);
  margin-block-end: var(--pub-s-5);
}
.pub-breadcrumbs span:not(:last-child)::after {
  content: "/"; margin-inline-start: 8px;
  color: var(--pub-text-faint);
}
.pub-breadcrumbs a { color: inherit; }
.pub-breadcrumbs a:hover { color: var(--pub-brand-600); }
.pub-breadcrumbs .current { color: var(--pub-text); font-weight: 600; }

/* =================================================================
   §11. DETAIL PAGES
   ================================================================= */

.pub-page {
  max-width: var(--pub-container-lg);
  margin: 0 auto;
  padding: clamp(24px, 4vw, 44px) var(--pub-gutter) clamp(48px, 8vw, 72px);
}

.pub-detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr);
  gap: clamp(24px, 4vw, 40px);
  align-items: start;
  margin-block-end: var(--pub-s-10);
}
@media (max-width: 900px) { .pub-detail-hero { grid-template-columns: 1fr; } }

.pub-detail-cover {
  border-radius: var(--pub-r-xl);
  overflow: hidden;
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, var(--pub-brand-500), var(--pub-accent-500));
  box-shadow: var(--pub-shadow-lg);
}
.pub-detail-cover img { width: 100%; height: 100%; object-fit: cover; }

.pub-side {
  position: sticky; top: 92px;
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-xl);
  padding: var(--pub-s-5);
  background: var(--pub-surface);
  display: flex; flex-direction: column; gap: var(--pub-s-4);
  box-shadow: var(--pub-shadow-sm);
}
.pub-side-price {
  font-size: clamp(1.5rem, 3vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -.02em;
}

.pub-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--pub-s-3); }
.pub-list li {
  display: flex; gap: 11px; align-items: flex-start;
  font-size: var(--pub-fs-base);
  line-height: var(--pub-lh-base);
}
.pub-list i {
  color: var(--pub-success);
  margin-block-start: 4px;
  flex: none;
}

.pub-panel {
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-xl);
  padding: var(--pub-s-5) var(--pub-s-5) var(--pub-s-4);
  background: var(--pub-surface);
  margin-block-end: var(--pub-s-5);
}
.pub-panel-title {
  font-size: var(--pub-fs-md); font-weight: 700;
  margin-block-end: var(--pub-s-3);
  padding-block-end: var(--pub-s-3);
  border-block-end: 1px solid var(--pub-border);
}

/* ---- progress / metric bar ---- */
.pub-metric-row { display: flex; flex-direction: column; gap: 6px; }
.pub-metric-row-head {
  display: flex; align-items: baseline; justify-content: space-between;
  font-size: var(--pub-fs-sm);
}
.pub-metric-row-label { color: var(--pub-text-muted); }
.pub-metric-row-value { font-weight: 700; }
.pub-metric-track {
  height: 6px; background: var(--pub-bg-muted);
  border-radius: var(--pub-r-full); overflow: hidden;
}
.pub-metric-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--pub-brand-500), var(--pub-accent-500));
  border-radius: inherit;
  transition: width var(--pub-dur-slow) var(--pub-ease-enter);
}

/* ---- reviews ---- */
.pub-review-card {
  padding: var(--pub-s-4);
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-lg);
  background: var(--pub-surface);
  margin-block-end: var(--pub-s-3);
}
.pub-review-author { font-weight: 700; font-size: var(--pub-fs-sm); }
.pub-review-body { margin-block-start: var(--pub-s-2); color: var(--pub-text-soft); line-height: var(--pub-lh-loose); }

/* =================================================================
   §12. ACCORDION / TABS / TIMELINE
   ================================================================= */

.pub-accordion {
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-lg);
  overflow: hidden;
  background: var(--pub-surface);
}
.pub-accordion-item + .pub-accordion-item { border-block-start: 1px solid var(--pub-border); }
.pub-accordion-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--pub-s-3);
  padding: var(--pub-s-4) var(--pub-s-5);
  cursor: pointer;
  font-weight: 650;
  transition: background var(--pub-dur-quick);
}
.pub-accordion-header:hover { background: var(--pub-bg-soft); }
.pub-accordion-header i {
  transition: transform var(--pub-dur-base) var(--pub-ease-standard);
  color: var(--pub-text-muted);
}
.pub-accordion-item.open .pub-accordion-header i { transform: rotate(180deg); }
.pub-accordion-body {
  max-height: 0; overflow: hidden;
  transition: max-height var(--pub-dur-base) var(--pub-ease-standard),
              padding var(--pub-dur-base) var(--pub-ease-standard);
  padding: 0 var(--pub-s-5);
  color: var(--pub-text-muted);
}
.pub-accordion-item.open .pub-accordion-body {
  max-height: 600px;
  padding: 0 var(--pub-s-5) var(--pub-s-5);
}

/* ---- tabs ---- */
.pub-tabs {
  display: flex; gap: 2px;
  border-block-end: 1px solid var(--pub-border);
  margin-block-end: var(--pub-s-5);
  overflow-x: auto;
  scrollbar-width: none;
}
.pub-tabs::-webkit-scrollbar { display: none; }
.pub-tab {
  background: none; border: 0;
  padding: 12px 16px;
  font-size: var(--pub-fs-sm); font-weight: 650;
  color: var(--pub-text-muted);
  cursor: pointer;
  border-block-end: 2px solid transparent;
  white-space: nowrap;
  transition: color var(--pub-dur-quick), border-color var(--pub-dur-quick);
}
.pub-tab:hover { color: var(--pub-text); }
.pub-tab[aria-selected="true"] {
  color: var(--pub-brand-600);
  border-block-end-color: var(--pub-brand-500);
}

/* ---- timeline ---- */
.pub-timeline { list-style: none; margin: 0; padding: 0; }
.pub-timeline-item {
  position: relative;
  padding-inline-start: 32px;
  padding-block-end: var(--pub-s-6);
}
.pub-timeline-item::before {
  content: ""; position: absolute;
  left: 10px; top: 22px; bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, var(--pub-border), transparent);
}
.pub-timeline-item:last-child::before { display: none; }
.pub-timeline-dot {
  position: absolute; left: 0; top: 4px;
  width: 22px; height: 22px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: color-mix(in srgb, var(--pub-brand-500) 15%, transparent);
  color: var(--pub-brand-600);
}
.pub-timeline-dot.success {
  background: color-mix(in srgb, var(--pub-success) 18%, transparent);
  color: var(--pub-success);
}
.pub-timeline-title { font-size: var(--pub-fs-md); font-weight: 700; margin-block-end: 4px; }
.pub-timeline-desc  { color: var(--pub-text-muted); font-size: var(--pub-fs-sm); }

/* =================================================================
   §13. FORMS
   ================================================================= */

.pub-form { display: grid; gap: var(--pub-s-4); max-width: 640px; }
.pub-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--pub-s-4); }
@media (max-width: 640px) { .pub-form-grid { grid-template-columns: 1fr; } }
.pub-form-group-full { grid-column: 1 / -1; }

.pub-field { display: flex; flex-direction: column; gap: 6px; }
.pub-field label {
  font-size: var(--pub-fs-xs); font-weight: 700;
  letter-spacing: var(--pub-tracking-wide);
  text-transform: uppercase;
  color: var(--pub-text-muted);
}
.pub-field .required { color: var(--pub-danger); }

.pub-field :is(input, textarea, select) {
  padding: 12px 14px;
  border-radius: var(--pub-r-md);
  border: 1.5px solid var(--pub-border);
  background: var(--pub-surface);
  color: inherit;
  outline: 0;
  transition: border-color var(--pub-dur-quick), box-shadow var(--pub-dur-quick);
  width: 100%;
  box-sizing: border-box;
}
.pub-field :is(input, textarea, select):focus {
  border-color: var(--pub-brand-500);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--pub-brand-500) 15%, transparent);
}
.pub-field :is(input, textarea, select):invalid:not(:placeholder-shown) {
  border-color: var(--pub-danger);
}
.pub-field .pub-help {
  font-size: var(--pub-fs-xs);
  color: var(--pub-text-muted);
}

/* =================================================================
   §14. CTA BAND
   ================================================================= */

.pub-cta {
  position: relative;
  max-width: var(--pub-container-lg);
  margin: var(--pub-s-16) auto;
  padding: clamp(36px, 6vw, 56px) clamp(24px, 5vw, 40px);
  border-radius: var(--pub-r-2xl);
  background: linear-gradient(135deg, var(--pub-brand-600), var(--pub-accent-500));
  color: #fff;
  text-align: center;
  overflow: hidden;
  box-shadow: var(--pub-shadow-xl);
}
.pub-cta::before {
  content: ""; position: absolute; inset: 0;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255,255,255,.14), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(255,255,255,.10), transparent 40%);
  pointer-events: none;
}
.pub-cta h2 {
  position: relative;
  margin: 0 0 10px;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 800;
  color: #fff;
}
.pub-cta p {
  position: relative;
  margin: 0 auto var(--pub-s-6);
  max-width: 56ch;
  opacity: .92;
}
.pub-cta-actions {
  position: relative;
  display: flex; gap: var(--pub-s-3);
  justify-content: center; flex-wrap: wrap;
}

/* =================================================================
   §15. FOOTER
   ================================================================= */

.pub-footer {
  border-block-start: 1px solid var(--pub-border);
  background: var(--pub-bg-soft);
}
.pub-footer-inner {
  max-width: var(--pub-container-xl);
  margin: 0 auto;
  padding: var(--pub-s-16) var(--pub-gutter) var(--pub-s-10);
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: var(--pub-s-8);
  font-size: var(--pub-fs-sm);
}
@media (max-width: 800px) { .pub-footer-inner { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px) { .pub-footer-inner { grid-template-columns: 1fr; } }

.pub-footer h4 {
  margin: 0 0 var(--pub-s-3);
  font-size: var(--pub-fs-xs);
  letter-spacing: var(--pub-tracking-wider);
  text-transform: uppercase;
  color: var(--pub-text-muted);
}
.pub-footer ul {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 10px;
}
.pub-footer li a, .pub-footer li button {
  background: none; border: 0; padding: 0;
  color: var(--pub-text-soft);
  cursor: pointer;
  font-size: inherit;
  text-align: start;
  transition: color var(--pub-dur-quick);
}
.pub-footer li a:hover, .pub-footer li button:hover { color: var(--pub-brand-600); }

.pub-footer-brand-desc {
  margin-block: var(--pub-s-3);
  max-width: 36ch;
  color: var(--pub-text-muted);
  line-height: var(--pub-lh-loose);
}
.pub-footer-social { display: flex; gap: var(--pub-s-2); }
.pub-footer-social a {
  width: 36px; height: 36px;
  border-radius: var(--pub-r-md);
  display: grid; place-items: center;
  background: var(--pub-surface);
  border: 1px solid var(--pub-border);
  color: var(--pub-text-muted);
  transition: all var(--pub-dur-quick);
}
.pub-footer-social a:hover {
  color: var(--pub-brand-600);
  border-color: color-mix(in srgb, var(--pub-brand-500) 40%, transparent);
  transform: translateY(-2px);
}

.pub-copy {
  grid-column: 1 / -1;
  border-block-start: 1px solid var(--pub-border);
  padding-block-start: var(--pub-s-5);
  color: var(--pub-text-muted);
  font-size: var(--pub-fs-xs);
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--pub-s-3); flex-wrap: wrap;
}
.pub-copy-links { display: flex; gap: var(--pub-s-4); }
.pub-copy-links a:hover { color: var(--pub-brand-600); }

/* =================================================================
   §16. MODAL / DRAWER / TOAST / TOOLTIP / POPOVER
   ================================================================= */

.pub-modal-backdrop {
  position: fixed; inset: 0;
  background: var(--pub-overlay);
  backdrop-filter: blur(3px);
  z-index: var(--pub-z-modal);
  display: grid; place-items: center;
  padding: var(--pub-gutter);
  animation: pubFadeIn var(--pub-dur-base) var(--pub-ease-standard);
}
@keyframes pubFadeIn { from { opacity: 0; } to { opacity: 1; } }

.pub-modal {
  background: var(--pub-surface);
  border-radius: var(--pub-r-2xl);
  box-shadow: var(--pub-shadow-xl);
  max-width: 640px; width: 100%;
  max-height: 90vh; overflow: auto;
  padding: var(--pub-s-6);
  animation: pubModalIn var(--pub-dur-base) var(--pub-ease-enter);
}
@keyframes pubModalIn {
  from { opacity: 0; transform: translateY(16px) scale(.96); }
  to   { opacity: 1; transform: none; }
}

.pub-toast-stack {
  position: fixed; bottom: 20px; right: 20px;
  z-index: var(--pub-z-toast);
  display: flex; flex-direction: column; gap: var(--pub-s-2);
  pointer-events: none;
}
.pub-toast {
  pointer-events: auto;
  background: var(--pub-surface);
  border: 1px solid var(--pub-border);
  border-radius: var(--pub-r-md);
  padding: 12px 16px;
  box-shadow: var(--pub-shadow-lg);
  font-size: var(--pub-fs-sm);
  min-width: 260px;
  animation: pubToastIn var(--pub-dur-base) var(--pub-ease-enter);
}
.pub-toast.success { border-inline-start: 3px solid var(--pub-success); }
.pub-toast.error   { border-inline-start: 3px solid var(--pub-danger); }
.pub-toast.info    { border-inline-start: 3px solid var(--pub-info); }
@keyframes pubToastIn {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: none; }
}

.pub-tooltip {
  position: absolute;
  background: var(--pub-text);
  color: var(--pub-bg);
  font-size: var(--pub-fs-xs); font-weight: 600;
  padding: 6px 10px;
  border-radius: var(--pub-r-xs);
  white-space: nowrap;
  z-index: var(--pub-z-tooltip);
  pointer-events: none;
  animation: pubPop var(--pub-dur-quick) var(--pub-ease-enter);
}

/* =================================================================
   §17. MARQUEE / LOGO STRIP
   ================================================================= */

.pub-logo-strip {
  padding-block: var(--pub-s-10);
  border-block: 1px solid var(--pub-border);
  overflow: hidden;
}
.pub-logo-strip-label {
  text-align: center;
  font-size: var(--pub-fs-xs);
  text-transform: uppercase;
  letter-spacing: var(--pub-tracking-wider);
  color: var(--pub-text-faint);
  margin-block-end: var(--pub-s-5);
}
.pub-marquee { position: relative; overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
.pub-marquee-track {
  display: flex; gap: var(--pub-s-12);
  animation: pubMarquee 40s linear infinite;
  width: max-content;
}
.pub-marquee:hover .pub-marquee-track { animation-play-state: paused; }
@keyframes pubMarquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.pub-logo-item {
  display: flex; align-items: center; gap: 10px;
  font-weight: 700; opacity: .55;
  white-space: nowrap;
  transition: opacity var(--pub-dur-quick);
}
.pub-logo-item:hover { opacity: 1; }
.pub-logo-item img { width: 28px; height: 28px; border-radius: var(--pub-r-xs); }

/* =================================================================
   §18. STATS BAND
   ================================================================= */

.pub-stat-band {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--pub-s-5);
  padding: var(--pub-s-8) var(--pub-s-6);
  border-radius: var(--pub-r-2xl);
  background: var(--pub-bg-soft);
  border: 1px solid var(--pub-border);
  text-align: center;
}
.pub-stat-band-value {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -.02em;
  background: linear-gradient(120deg, var(--pub-brand-600), var(--pub-accent-500));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.pub-stat-band-label {
  font-size: var(--pub-fs-xs);
  color: var(--pub-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--pub-tracking-wider);
  margin-block-start: 4px;
}

/* =================================================================
   §19. BADGES / CHIPS / AVATARS
   ================================================================= */

.pub-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--pub-fs-xs); font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--pub-r-full);
  background: var(--pub-bg-muted);
  color: var(--pub-text-soft);
}
.pub-badge.brand    { background: color-mix(in srgb, var(--pub-brand-500) 14%, transparent); color: var(--pub-brand-700); }
.pub-badge.success  { background: color-mix(in srgb, var(--pub-success) 14%, transparent); color: var(--pub-success); }
.pub-badge.warning  { background: color-mix(in srgb, var(--pub-warning) 20%, transparent); color: #92400e; }
.pub-badge.danger   { background: color-mix(in srgb, var(--pub-danger) 14%, transparent); color: var(--pub-danger); }

.pub-avatar {
  border-radius: 50%;
  object-fit: cover;
  background: linear-gradient(135deg, var(--pub-brand-500), var(--pub-accent-500));
  flex: none;
  display: inline-block;
}
.pub-avatar-xs { width: 24px; height: 24px; }
.pub-avatar-sm { width: 32px; height: 32px; }
.pub-avatar-md { width: 44px; height: 44px; }
.pub-avatar-lg { width: 64px; height: 64px; }
.pub-avatar-xl { width: 96px; height: 96px; }
.pub-avatar-2xl { width: 128px; height: 128px; }

.pub-avatar-wrap { position: relative; display: inline-block; }
.pub-avatar-status {
  position: absolute; bottom: 0; right: 0;
  width: 30%; height: 30%;
  min-width: 10px; min-height: 10px;
  background: var(--pub-success);
  border: 2px solid var(--pub-surface);
  border-radius: 50%;
}
.pub-avatar-status.offline { background: var(--pub-text-faint); }
.pub-avatar-status.busy    { background: var(--pub-warning); }

/* =================================================================
   §20. UTILITIES
   ================================================================= */

.pub-text-muted  { color: var(--pub-text-muted); }
.pub-text-soft   { color: var(--pub-text-soft); }
.pub-text-brand  { color: var(--pub-brand-600); }
.pub-text-success{ color: var(--pub-success); }
.pub-text-danger { color: var(--pub-danger); }

.pub-fs-xs   { font-size: var(--pub-fs-xs); }
.pub-fs-sm   { font-size: var(--pub-fs-sm); }
.pub-fs-md   { font-size: var(--pub-fs-md); }
.pub-fs-lg   { font-size: var(--pub-fs-lg); }
.pub-fs-xl   { font-size: var(--pub-fs-xl); }
.pub-fs-2xl  { font-size: var(--pub-fs-2xl); }

.pub-fw-medium   { font-weight: 500; }
.pub-fw-semibold { font-weight: 600; }
.pub-fw-bold     { font-weight: 700; }
.pub-fw-black    { font-weight: 800; }

.pub-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.pub-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pub-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pub-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }

.pub-link {
  background: none; border: 0;
  font: inherit; font-weight: 700;
  color: var(--pub-brand-600);
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 0;
  transition: gap var(--pub-dur-quick), color var(--pub-dur-quick);
}
.pub-link:hover { gap: 10px; color: var(--pub-brand-700); }

.pub-divider {
  height: 1px; background: var(--pub-border);
  border: 0; margin: var(--pub-s-6) 0;
}

.pub-noise::before {
  content: ""; position: absolute; inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.06 0 0 0 0 0.1 0 0 0 0 0.2 0 0 0 0.35 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  opacity: .35; pointer-events: none; mix-blend-mode: overlay;
}

/* =================================================================
   §21. MOTION PREFERENCES
   ================================================================= */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
  .pub-marquee-track { animation: none; }
}

@media (prefers-contrast: more) {
  :root {
    --pub-border: rgba(15,23,42,.28);
    --pub-text-muted: #475569;
  }
  .pub-nav-link.is-active { outline: 2px solid currentColor; }
}

@media (forced-colors: active) {
  .pub-card, .pub-panel, .pub-side, .pub-empty {
    border: 1px solid CanvasText;
  }
  .pub-chip.is-active { outline: 2px solid Highlight; }
}

/* =================================================================
   §22. PRINT
   ================================================================= */

@media print {
  .pub-nav, .pub-nav-drawer, .pub-nav-backdrop,
  .pub-cta, .pub-footer, .pub-toast-stack,
  .pub-search-results { display: none !important; }

  .pub-page, .pub-container { padding: 0; max-width: none; }
  .pub-card, .pub-panel, .pub-side {
    box-shadow: none; border: 1px solid #ddd;
    break-inside: avoid;
  }
  a[href]::after {
    content: " (" attr(href) ")";
    font-size: .8em; color: #666;
  }
}
`;

  /* ============================================================
     §1. Injector
     ============================================================ */

  /**
   * Inject the public stylesheet. Idempotent.
   * @param {object} [opts]
   * @param {'light'|'dark'|'auto'} [opts.theme='auto']
   * @param {HTMLElement} [opts.target=document.head]
   * @returns {HTMLStyleElement}
   */
  P.ensureStyles = function ensureStyles(opts = {}) {
    const existing = document.getElementById(STYLE_ID);
    if (existing) {
      if (opts.theme && opts.theme !== 'auto') {
        document.documentElement.setAttribute(THEME_ATTR, opts.theme);
      }
      return existing;
    }

    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.setAttribute('data-owner', 'PublicUI.styles');
    el.textContent = CSS;
    (opts.target || document.head).appendChild(el);

    if (opts.theme && opts.theme !== 'auto') {
      document.documentElement.setAttribute(THEME_ATTR, opts.theme);
    }
    return el;
  };

  /* ============================================================
     §2. Auto-boot
     ============================================================ */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => P.ensureStyles(), { once: true });
  } else {
    P.ensureStyles();
  }
})();