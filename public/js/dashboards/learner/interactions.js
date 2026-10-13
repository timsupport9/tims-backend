/* ============================================================
   dashboards/learner/interactions.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function attach() {
    // E-School tab switching
    document.querySelectorAll('[data-eschool-tab]').forEach(btn => {
      btn.onclick = () => {
        EH.state.activeESchoolTab = btn.dataset.eschoolTab;
        document.querySelectorAll('[data-eschool-tab]').forEach(b =>
          b.classList.toggle('tab-btn-active', b === btn));
        const panel = document.getElementById('eschool-panel');
        if (panel) {
          panel.innerHTML = EH.LearnerESchool ? buildPanel() : '';
        }
      };
    });
  }

  function buildPanel() {
    // Re-run E-School panel only
    const panel = document.getElementById('eschool-panel');
    const host = document.getElementById('role-content');
    if (host && panel) {
      host.innerHTML = EH.LearnerESchool.render();
      const newPanel = document.getElementById('eschool-panel');
      // Rebind
      attach();
      return newPanel?.innerHTML || '';
    }
    return '';
  }

  EH.LearnerInteractions = { attach };
})(window);
