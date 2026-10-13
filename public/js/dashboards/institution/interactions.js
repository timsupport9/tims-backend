/* ============================================================
   dashboards/institution/interactions.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function attach() {
    // Skills matrix click handlers (only when the skills tab is active)
    document.querySelectorAll('.skills-cell').forEach(cell => {
      if (cell.dataset.bound) return;
      cell.dataset.bound = '1';
      cell.onclick = async () => {
        const cur = Number(cell.dataset.level);
        const next = (cur + 1) % 6;
        const colours = EH.CONFIG.SKILL_LEVEL_COLOURS;
        const levels  = EH.CONFIG.SKILL_LEVELS;
        const dot = cell.querySelector('.skill-level-dot');

        cell.dataset.level = next;
        dot.style.background = colours[next];
        dot.style.color = next >= 4 ? '#fff' : '#374151';
        dot.textContent = next;
        cell.title = levels[next];

        try {
          await EH.API.put('/api/institution/skills/assess', {
            trainee_id: Number(cell.dataset.trainee),
            skill_id: Number(cell.dataset.skill),
            level: next,
          });
        } catch (e) {
          EH.Toast.error(e.message);
          cell.dataset.level = cur;
          dot.style.background = colours[cur];
          dot.style.color = cur >= 4 ? '#fff' : '#374151';
          dot.textContent = cur;
        }
      };
    });

    // Trainee filter (only on trainees tab)
    const traineeStatus = document.getElementById('trainee-status-filter');
    if (traineeStatus && !traineeStatus.dataset.bound) {
      traineeStatus.dataset.bound = '1';
      traineeStatus.onchange = () => {
        if (typeof global.rerenderRoleContent === 'function') global.rerenderRoleContent();
      };
    }

    const traineeSearch = document.getElementById('trainee-search');
    if (traineeSearch && !traineeSearch.dataset.bound) {
      traineeSearch.dataset.bound = '1';
      traineeSearch.oninput = EH.Perf.debounce(() => {
        if (typeof global.rerenderRoleContent === 'function') global.rerenderRoleContent();
      }, 300);
    }
  }

  EH.InstitutionInteractions = { attach };
})(window);
