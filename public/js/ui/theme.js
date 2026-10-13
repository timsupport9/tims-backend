/* ============================================================
   ui/theme.js — Light/dark theme + brand colour injection
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { Store, bus, EVENTS, CONFIG } = EH;

  function init() {
    const saved = Store.get(CONFIG.STORAGE_KEYS.THEME) || 'light';
    apply(saved, { silent: true });
    if (global.matchMedia) {
      global.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
        if (!Store.get(CONFIG.STORAGE_KEYS.THEME)) apply(e.matches ? 'dark' : 'light', { silent: true });
      });
    }
  }

  function apply(mode, { silent = false } = {}) {
    const dark = mode === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0f172a' : '#1e3a8a');
    if (!silent) {
      Store.set(CONFIG.STORAGE_KEYS.THEME, mode);
      bus?.emit(EVENTS?.THEME_CHANGE || 'theme:change', { mode });
    }
  }

  function toggle() {
    const dark = document.documentElement.classList.toggle('dark');
    apply(dark ? 'dark' : 'light');
    return dark;
  }

  function applyBranding(branding = {}) {
    if (!branding) return;
    const root = document.documentElement;
    if (branding.primary_color) root.style.setProperty('--brand', branding.primary_color);
    if (branding.accent_color)  root.style.setProperty('--accent', branding.accent_color);
    if (branding.logo_url)      root.style.setProperty('--brand-logo', `url("${branding.logo_url}")`);
  }

  EH.Theme = { init, apply, toggle, applyBranding };
  global.toggleTheme = toggle;
})(window);
