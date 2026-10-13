/* ============================================================
   dashboards/institution/charts.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    if (!window.Chart) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const primary = rootStyle.getPropertyValue('--brand').trim() || '#1e3a8a';
    const accent = rootStyle.getPropertyValue('--accent').trim() || '#059669';

    const p = document.getElementById('chartInstProgress');
    if (p && !p.dataset.rendered) {
      new Chart(p, {
        type: 'line',
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
          datasets: [{
            label: 'Average Progress',
            data: [10, 25, 42, 58, 74, 88],
            borderColor: primary,
            backgroundColor: EH.Fmt.hexToRgba(primary, 0.15),
            tension: 0.3,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, max: 100 } },
        },
      });
      p.dataset.rendered = '1';
    }

    const a = document.getElementById('chartInstAssess');
    if (a && !a.dataset.rendered) {
      new Chart(a, {
        type: 'bar',
        data: {
          labels: ['0-59', '60-69', '70-79', '80-89', '90-100'],
          datasets: [{
            label: 'Trainees',
            data: [3, 7, 15, 22, 11],
            backgroundColor: accent,
            borderRadius: 6,
          }],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
      a.dataset.rendered = '1';
    }
  }

  EH.InstitutionCharts = { render };
})(window);
