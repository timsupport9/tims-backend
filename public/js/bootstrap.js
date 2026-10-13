// Client bootstrap placeholder created by Copilot
// Replace with the project's real bootstrap logic or import existing frontend files.

(function () {
  function restoreSession() {
    try {
      const savedToken = JSON.parse(localStorage.getItem('eh.auth.token') || 'null');
      const savedRefresh = JSON.parse(localStorage.getItem('eh.auth.refresh') || 'null');
      const savedUser = JSON.parse(localStorage.getItem('eh.auth.user') || 'null');

      if (savedToken) {
        authToken = savedToken;
        refreshToken = savedRefresh;
        currentUser = savedUser;
        currentUserRole = currentUser?.role || null;
        S.userIntent = currentUser?.intent || 'both';
        stateStore && stateStore.set('authenticated', true);
      }
    } catch (_) {
      console.warn('[bootstrap] Failed to restore auth session from storage');
    }
  }

  function initTheme() {
    try {
      const savedTheme = JSON.parse(localStorage.getItem('eh.ui.theme') || 'null');
      const theme = savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', theme === 'dark');
      UI.theme = theme;
      UI.resolvedTheme = theme;
    } catch (_) {
      document.documentElement.classList.remove('dark');
    }
  }

  function initApp() {
    try {
      initTheme();
      restoreSession();

      if (typeof initializeSocket === 'function' && authToken) {
        initializeSocket();
      }

      if (typeof route === 'function') {
        route();
      } else if (typeof renderLanding === 'function') {
        renderLanding();
      }
    } catch (error) {
      console.error('[bootstrap] failed to initialize app:', error);
      if (typeof renderLanding === 'function') renderLanding();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
  } else {
    initApp();
  }
})();
